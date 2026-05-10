// useGpsTracking.js
// Distance calculation uses GPS Doppler speed × time integration
// instead of Haversine position deltas.
//
// WHY: GPS positions have 5–50m of random jitter. Summing Haversine
// deltas between successive positions accumulates that jitter as phantom
// distance — especially at traffic lights where the phone "wanders"
// 10–20m while stationary. The result: 8km shows as 9.2km.
//
// FIX: The browser's Geolocation API exposes pos.coords.speed, which is
// computed from the GPS Doppler shift — the same method used by
// professional odometers and ride-hailing apps. It is immune to position
// jitter because it measures how fast the signal frequency changes, not
// where you are. We integrate speed × Δt (time elapsed) to get distance.
//
// Native Android path: TrackingService already runs in a foreground
// service and reports shiftDistance/rideDistance directly — we trust
// those values and do not re-calculate in JS.

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { Capacitor } from '@capacitor/core';
import { registerPlugin } from '@capacitor/core';

const TrackingPlugin = registerPlugin('TrackingPlugin');
const IS_NATIVE = Capacitor.isNativePlatform();

const TODAY = new Date().toDateString();

// ── Storage helpers ───────────────────────────────────────────────────────────
const safeNum = (v) => (typeof v === 'number' && isFinite(v) && v >= 0) ? v : 0;

const loadKey = (key) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const p = JSON.parse(raw);
    return p.date === TODAY ? p : null;
  } catch { return null; }
};

const saveNavState = (d) => {
  try {
    localStorage.setItem('dh_nav_state',
      JSON.stringify({ savedDistance: safeNum(d), date: TODAY }));
  } catch (e) { console.warn('saveNavState: storage full', e); }
};

const saveShiftState = (shift, riding, ride) => {
  try {
    localStorage.setItem('dh_shift_state',
      JSON.stringify({ shiftDistance: safeNum(shift), isRiding: riding, rideDistance: safeNum(ride), date: TODAY }));
  } catch (e) { console.warn('saveShiftState: storage full', e); }
};

// ── Speed-based distance integrator ──────────────────────────────────────────
// Returns increment in km given a Geolocation position update.
//
// Strategy (in priority order):
//   1. If Doppler speed is available and reliable → speed × Δt
//   2. If speed is 0 or unreliable → 0 (we are stopped; no phantom movement)
//   3. Haversine fallback ONLY used as last resort when speed API is absent,
//      and only after applying a strict jitter filter.
//
// Parameters:
//   coords     — GeolocationCoordinates from the browser API
//   prevCoords — previous GeolocationCoordinates (or null on first fix)
//   prevTime   — timestamp (ms) of the previous fix (or null)
//   currTime   — timestamp (ms) of the current fix
//   minSpeedMs — ignore motion below this speed (m/s). Default 0.5 m/s (1.8 km/h)
//                filters out GPS noise while stopped.
function speedBasedIncrement(coords, prevCoords, prevTime, currTime, minSpeedMs = 0.5) {
  const { latitude, longitude, speed, accuracy } = coords;

  // Reject fixes with very poor accuracy for distance purposes
  // (still update position marker on map, just don't count the distance)
  if (accuracy > 40) return 0;

  const dtSec = prevTime ? (currTime - prevTime) / 1000 : 0;

  // ── Primary: Doppler speed integration ───────────────────────────────────
  // pos.coords.speed is in m/s. A null or negative value means unavailable.
  if (speed !== null && speed >= 0) {
    // Below minSpeedMs we treat the device as stationary.
    // This eliminates all phantom drift at traffic lights.
    if (speed < minSpeedMs) return 0;

    // speed × time → metres → km
    const incM = speed * dtSec;

    // Sanity cap: reject physically impossible increments
    // (e.g. first fix with huge dt, or a GPS glitch reporting 300 km/h)
    const maxReasonableKmH = 120; // well above any bike speed
    const maxIncM = (maxReasonableKmH / 3.6) * dtSec;
    if (incM > maxIncM) return 0;

    return incM / 1000; // → km
  }

  // ── Fallback: Haversine with strict jitter filter ─────────────────────────
  // Only reached on devices/browsers where speed is unavailable.
  if (!prevCoords) return 0;

  const R = 6371;
  const dLat = (latitude  - prevCoords.latitude)  * Math.PI / 180;
  const dLon = (longitude - prevCoords.longitude) * Math.PI / 180;
  const a = Math.sin(dLat/2)**2
          + Math.cos(prevCoords.latitude * Math.PI/180)
          * Math.cos(latitude * Math.PI/180)
          * Math.sin(dLon/2)**2;
  const distKm = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

  // Min 15m to reject GPS jitter at standstill (raised from 10m).
  // Max 300m per fix to reject GPS teleport jumps.
  if (distKm < 0.015 || distKm > 0.300) return 0;

  // Derive implied speed and apply the same minimum speed filter
  const impliedSpeedMs = (distKm * 1000) / Math.max(dtSec, 1);
  if (impliedSpeedMs < minSpeedMs) return 0;

  return distKm;
}

// ─────────────────────────────────────────────────────────────────────────────
export function useGpsTracking({ isOnline, onDistanceUpdate, onShiftDistanceUpdate, onRideComplete }) {

  // Read localStorage once on mount — wrapped in useMemo with [] so it
  // never re-runs on re-renders (previously ran on every render).
  const nav   = useMemo(() => loadKey('dh_nav_state')   || {}, []);
  const shift = useMemo(() => loadKey('dh_shift_state') || {}, []);

  const [savedDistance, setSavedDistance] = useState(safeNum(nav.savedDistance));
  const [shiftDistance, setShiftDistance] = useState(safeNum(shift.shiftDistance));
  const [rideDistance,  setRideDistance]  = useState(safeNum(shift.rideDistance));
  const [isRiding,      setIsRiding]      = useState(shift.isRiding || false);
  const [speed,         setSpeed]         = useState(0);       // km/h for display
  const [lastPosition,  setLastPosition]  = useState(null);
  const [geoError,      setGeoError]      = useState(null);

  const shiftWatchRef   = useRef(null);
  const savedDistRef    = useRef(safeNum(nav.savedDistance));
  const shiftDistRef    = useRef(safeNum(shift.shiftDistance));
  const rideDistRef     = useRef(safeNum(shift.rideDistance));
  const isRidingRef     = useRef(shift.isRiding || false);
  const lastPositionRef = useRef(null);
  const pollIntervalRef = useRef(null);

  // For speed×time integration — store previous fix
  const prevCoordsRef   = useRef(null); // GeolocationCoordinates
  const prevTimeRef     = useRef(null); // ms timestamp
  const ridePathRef     = useRef([]);   // for map polyline only (not distance)
  const shiftPathRef    = useRef([]);   // for map polyline only

  useEffect(() => { savedDistRef.current = savedDistance; }, [savedDistance]);
  useEffect(() => { shiftDistRef.current = shiftDistance; }, [shiftDistance]);
  useEffect(() => { rideDistRef.current  = rideDistance;  }, [rideDistance]);
  useEffect(() => { isRidingRef.current  = isRiding;      }, [isRiding]);

  useEffect(() => {
    saveNavState(savedDistance);
    onDistanceUpdate?.(savedDistance + rideDistance);
  }, [savedDistance, rideDistance, onDistanceUpdate]);

  useEffect(() => {
    saveShiftState(shiftDistance, isRiding, rideDistance);
    onShiftDistanceUpdate?.(shiftDistance);
  }, [shiftDistance, isRiding, rideDistance, onShiftDistanceUpdate]);

  // Initial position on mount (for map centering — not counted as distance)
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

  // ── NATIVE PATH ───────────────────────────────────────────────────────────
  // TrackingService (Kotlin foreground service) runs its own odometer
  // using Android's LocationManager with GNSS — it already handles
  // speed-based filtering natively. We just poll its results.
  const startNativePolling = useCallback(() => {
    if (pollIntervalRef.current) return;
    pollIntervalRef.current = setInterval(async () => {
      try {
        const data = await TrackingPlugin.getTrackingData();
        const sd = safeNum(data.shiftDistance);
        const rd = safeNum(data.rideDistance);
        setShiftDistance(sd);
        setRideDistance(rd);
        shiftDistRef.current = sd;
        rideDistRef.current  = rd;
        if (data.lastLat && data.lastLng && data.lastLat !== 0) {
          const coord = [data.lastLat, data.lastLng];
          lastPositionRef.current = coord;
          setLastPosition(coord);
        }
      } catch (e) { console.warn('TrackingPlugin poll error:', e); }
    }, 2000);
  }, []);

  const stopNativePolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  // ── BROWSER PATH — speed × time integration ───────────────────────────────
  const startBrowserWatch = useCallback(() => {
    if (!navigator.geolocation || shiftWatchRef.current !== null) return;

    shiftWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { coords, timestamp } = pos;
        const { latitude, longitude, speed: rawSpeed } = coords;

        const currTime = timestamp; // ms
        const newCoord = [latitude, longitude];

        // Update map marker + speed display (always, even if we don't count distance)
        lastPositionRef.current = newCoord;
        setLastPosition(newCoord);
        setSpeed(rawSpeed != null && rawSpeed >= 0 ? rawSpeed * 3.6 : 0);

        // ── Distance increment using speed×time ──────────────────────────
        const inc = speedBasedIncrement(
          coords,
          prevCoordsRef.current,
          prevTimeRef.current,
          currTime,
        );

        // Update previous fix references
        prevCoordsRef.current = coords;
        prevTimeRef.current   = currTime;

        // ── Shift path (for polyline, not distance) ───────────────────────
        shiftPathRef.current.push(newCoord);
        if (shiftPathRef.current.length > 200) shiftPathRef.current = shiftPathRef.current.slice(-200);

        // ── Accumulate shift distance ─────────────────────────────────────
        if (inc > 0) {
          setShiftDistance(d => {
            const next = safeNum(d + inc);
            shiftDistRef.current = next;
            saveShiftState(next, isRidingRef.current, rideDistRef.current);
            return next;
          });
        }

        // ── Accumulate ride distance (only while riding) ──────────────────
        if (isRidingRef.current && inc > 0) {
          ridePathRef.current.push(newCoord);
          if (ridePathRef.current.length > 300) ridePathRef.current = ridePathRef.current.slice(-300);
          setRideDistance(d => {
            const next = safeNum(d + inc);
            rideDistRef.current = next;
            saveShiftState(shiftDistRef.current, true, next);
            return next;
          });
        }
      },
      (err) => {
        console.warn('GPS watch error:', err.code, err.message);
        setGeoError(err.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0, // always fresh — stale positions break speed×time
      }
    );
  }, []);

  const stopBrowserWatch = useCallback(() => {
    if (shiftWatchRef.current !== null) {
      navigator.geolocation.clearWatch(shiftWatchRef.current);
      shiftWatchRef.current = null;
    }
    shiftPathRef.current  = [];
    prevCoordsRef.current = null;
    prevTimeRef.current   = null;
  }, []);

  // Start / stop based on isOnline
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
    ridePathRef.current   = [];
    rideDistRef.current   = 0;
    isRidingRef.current   = true;
    // Reset prev fix so the first increment after ride start is clean
    prevCoordsRef.current = null;
    prevTimeRef.current   = null;
    setRideDistance(0);
    setIsRiding(true);
    setGeoError(null);
    if (IS_NATIVE) {
      TrackingPlugin.startRide().catch(console.error);
    } else {
      startBrowserWatch();
    }
  }, [startBrowserWatch]);

  const endRide = useCallback(() => {
    isRidingRef.current = false;
    setIsRiding(false);
    if (IS_NATIVE) TrackingPlugin.stopRide().catch(console.error);

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
      rideDistRef.current   = 0;
      ridePathRef.current   = [];
      prevCoordsRef.current = null;
      prevTimeRef.current   = null;
      setSpeed(0);
      onRideComplete?.(finalKm);
    });
  }, [onDistanceUpdate, onRideComplete]);

  const getRidePath = useCallback(() => [...ridePathRef.current], []);

  return {
    savedDistance, shiftDistance, rideDistance,
    isRiding, speed, lastPosition, lastPositionRef,
    geoError, setGeoError, startRide, endRide, getRidePath,
  };
}