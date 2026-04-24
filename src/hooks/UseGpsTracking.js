// useGpsTracking.js
// On Android (Capacitor): uses TrackingService (foreground service — survives app close)
// In browser (dev): uses navigator.geolocation.watchPosition (standard behaviour)

import { useEffect, useRef, useState, useCallback } from 'react';
import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';

// Register our custom native plugin
const TrackingPlugin = registerPlugin('TrackingPlugin');
const IS_NATIVE = Capacitor.isNativePlatform();

const TODAY = new Date().toDateString();

// ── Helpers ───────────────────────────────────────────────────────────────────
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2
          + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};

const safeNum = (v) => (typeof v === 'number' && isFinite(v) && v >= 0) ? v : 0;

const loadKey = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p.date === TODAY ? p : null;
  } catch { return null; }
};

const saveNavState   = (d) => localStorage.setItem('dh_nav_state',
  JSON.stringify({ savedDistance: safeNum(d), date: TODAY }));

const saveShiftState = (shift, riding, ride) => localStorage.setItem('dh_shift_state',
  JSON.stringify({ shiftDistance: safeNum(shift), isRiding: riding, rideDistance: safeNum(ride), date: TODAY }));

// ─────────────────────────────────────────────────────────────────────────────
export function useGpsTracking({ isOnline, onDistanceUpdate, onShiftDistanceUpdate, onRideComplete }) {

  const nav   = loadKey('dh_nav_state')   || {};
  const shift = loadKey('dh_shift_state') || {};

  const [savedDistance,  setSavedDistance]  = useState(safeNum(nav.savedDistance));
  const [shiftDistance,  setShiftDistance]  = useState(safeNum(shift.shiftDistance));
  const [rideDistance,   setRideDistance]   = useState(safeNum(shift.rideDistance));
  const [isRiding,       setIsRiding]       = useState(shift.isRiding || false);
  const [speed,          setSpeed]          = useState(0);
  const [lastPosition,   setLastPosition]   = useState(null);
  const [geoError,       setGeoError]       = useState(null);

  const shiftWatchRef   = useRef(null);
  const shiftPathRef    = useRef([]);
  const ridePathRef     = useRef([]);
  const savedDistRef    = useRef(safeNum(nav.savedDistance));
  const shiftDistRef    = useRef(safeNum(shift.shiftDistance));
  const rideDistRef     = useRef(safeNum(shift.rideDistance));
  const isRidingRef     = useRef(shift.isRiding || false);
  const lastPositionRef = useRef(null);
  const pollIntervalRef = useRef(null); // for native data polling

  useEffect(() => { savedDistRef.current  = savedDistance; }, [savedDistance]);
  useEffect(() => { shiftDistRef.current  = shiftDistance; }, [shiftDistance]);
  useEffect(() => { rideDistRef.current   = rideDistance;  }, [rideDistance]);
  useEffect(() => { isRidingRef.current   = isRiding;      }, [isRiding]);

  useEffect(() => {
    saveNavState(savedDistance);
    onDistanceUpdate?.(savedDistance + rideDistance);
  }, [savedDistance, rideDistance, onDistanceUpdate]);

  useEffect(() => {
    saveShiftState(shiftDistance, isRiding, rideDistance);
    onShiftDistanceUpdate?.(shiftDistance);
  }, [shiftDistance, isRiding, rideDistance, onShiftDistanceUpdate]);

  // ── Get initial position on mount ────────────────────────────────────────
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const coord = [coords.latitude, coords.longitude];
        lastPositionRef.current = coord;
        setLastPosition(coord);
      },
      () => {},
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
    );
  }, []);

  // ── NATIVE PATH: poll TrackingService via plugin ──────────────────────────
  const startNativePolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    // Poll native SharedPreferences every 2 seconds to sync into React state
    pollIntervalRef.current = setInterval(async () => {
      try {
        const data = await TrackingPlugin.getTrackingData();
        const sd = safeNum(data.shiftDistance);
        const rd = safeNum(data.rideDistance);
        const lat = data.lastLat;
        const lng = data.lastLng;

        setShiftDistance(sd);
        setRideDistance(rd);
        shiftDistRef.current = sd;
        rideDistRef.current  = rd;

        if (lat && lng && lat !== 0) {
          const coord = [lat, lng];
          lastPositionRef.current = coord;
          setLastPosition(coord);
        }
      } catch (e) {
        console.warn('TrackingPlugin poll error:', e);
      }
    }, 2000);
  }, []);

  const stopNativePolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // ── BROWSER PATH: standard watchPosition ─────────────────────────────────
  const startBrowserWatch = useCallback(() => {
    if (!navigator.geolocation || shiftWatchRef.current !== null) return;
    shiftWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed: spd, accuracy } = pos.coords;

        // ── Accuracy filter ───────────────────────────────────────────────
        // 50m for ride (tight — better accuracy), 80m for shift (relaxed)
        // OLD code used 80m for both — too loose, included bad city readings
        const rideAccuracyOk  = accuracy <= 50;
        const shiftAccuracyOk = accuracy <= 80;
        if (!shiftAccuracyOk) return; // reject truly bad readings for both

        const newCoord = [latitude, longitude];
        lastPositionRef.current = newCoord;
        setLastPosition(newCoord);
        setSpeed(spd ? spd * 3.6 : 0);

        // ── Shift distance ────────────────────────────────────────────────
        // 30m threshold + no speed filter (shift tracks total odometer km)
        if (shiftPathRef.current.length > 0) {
          const prev = shiftPathRef.current[shiftPathRef.current.length - 1];
          const inc  = getDistance(prev[0], prev[1], latitude, longitude);
          if (isFinite(inc) && inc > 0.030 && inc < 1.0) {
            shiftPathRef.current.push(newCoord);
            if (shiftPathRef.current.length > 200) shiftPathRef.current = shiftPathRef.current.slice(-200);
            setShiftDistance(d => {
              const next = safeNum(d + inc);
              shiftDistRef.current = next;
              saveShiftState(next, isRidingRef.current, rideDistRef.current);
              return next;
            });
          }
        } else {
          shiftPathRef.current = [newCoord];
        }

        // ── Ride distance ─────────────────────────────────────────────────
        // KEY FIXES vs old code:
        //   1. REMOVED speed > 2 km/h filter — this was silently dropping ALL
        //      readings at traffic lights. In Indian city driving ~25% of time
        //      is spent stopped, causing 8km to show as 6.5km.
        //   2. Accuracy threshold tightened to 50m for ride (was 80m)
        //   3. maximumAge: 0 (was 2000ms) — forces fresh GPS, no stale cache
        //   4. Min distance lowered to 10m (was 20m) — catches slow crawl
        //   5. Max spike guard kept at 500m to reject teleport jumps
        if (isRidingRef.current && rideAccuracyOk) {
          if (ridePathRef.current.length > 0) {
            const prev = ridePathRef.current[ridePathRef.current.length - 1];
            const inc  = getDistance(prev[0], prev[1], latitude, longitude);
            // 10m min (catches slow traffic), 500m max (rejects GPS teleport)
            if (isFinite(inc) && inc > 0.010 && inc < 0.500) {
              ridePathRef.current.push(newCoord);
              if (ridePathRef.current.length > 300) ridePathRef.current = ridePathRef.current.slice(-300);
              setRideDistance(d => {
                const next = safeNum(d + inc);
                rideDistRef.current = next;
                saveShiftState(shiftDistRef.current, true, next);
                return next;
              });
            }
          } else {
            ridePathRef.current = [newCoord];
          }
        }
      },
      (err) => { console.warn('GPS watch error:', err.code, err.message); },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0,  // FIXED: was 2000 — stale cached positions caused phantom distance increments
      }
    );
  }, []);

  const stopBrowserWatch = useCallback(() => {
    if (shiftWatchRef.current !== null) {
      navigator.geolocation.clearWatch(shiftWatchRef.current);
      shiftWatchRef.current = null;
    }
    shiftPathRef.current = [];
  }, []);

  // ── Start / stop based on isOnline ────────────────────────────────────────
  useEffect(() => {
    if (isOnline) {
      if (IS_NATIVE) {
        TrackingPlugin.startShift().catch(console.error);
        startNativePolling();
      } else {
        startBrowserWatch();
      }
    } else {
      if (IS_NATIVE) {
        TrackingPlugin.stopShift().catch(console.error);
        stopNativePolling();
      } else {
        stopBrowserWatch();
      }
      // Reset shift data
      setShiftDistance(0);
      shiftDistRef.current = 0;
      localStorage.removeItem('dh_shift_state');
    }
  }, [isOnline, startNativePolling, stopNativePolling, startBrowserWatch, stopBrowserWatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (shiftWatchRef.current !== null) navigator.geolocation.clearWatch(shiftWatchRef.current);
      stopNativePolling();
    };
  }, [stopNativePolling]);

  // ── Ride start / end ──────────────────────────────────────────────────────
  const startRide = useCallback(() => {
    ridePathRef.current = [];
    rideDistRef.current = 0;
    isRidingRef.current = true;
    setRideDistance(0);
    setIsRiding(true);
    setGeoError(null);

    if (IS_NATIVE) {
      TrackingPlugin.startRide().catch(console.error);
    } else {
      startBrowserWatch(); // ensure watch is running
    }
  }, [startBrowserWatch]);

  const endRide = useCallback(() => {
    isRidingRef.current = false;
    setIsRiding(false);

    if (IS_NATIVE) {
      TrackingPlugin.stopRide().catch(console.error);
    }

    // Read final distance — from native or from ref
    const getFinalKm = async () => {
      if (IS_NATIVE) {
        try {
          const data = await TrackingPlugin.getTrackingData();
          return safeNum(data.rideDistance);
        } catch { return safeNum(rideDistRef.current); }
      }
      return safeNum(rideDistRef.current);
    };

    getFinalKm().then(finalKm => {
      setSavedDistance(prev => {
        const next = safeNum(prev + finalKm);
        savedDistRef.current = next;
        saveNavState(next);
        onDistanceUpdate?.(next);
        return next;
      });
      setRideDistance(0);
      rideDistRef.current = 0;
      ridePathRef.current = [];
      setSpeed(0);
      onRideComplete?.(finalKm);
    });
  }, [onDistanceUpdate, onRideComplete]);

  const getRidePath = useCallback(() => [...ridePathRef.current], []);

  return {
    savedDistance,
    shiftDistance,
    rideDistance,
    isRiding,
    speed,
    lastPosition,
    lastPositionRef,
    geoError,
    setGeoError,
    startRide,
    endRide,
    getRidePath,
  };
}