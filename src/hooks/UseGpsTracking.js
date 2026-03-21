// useGpsTracking.js
// Lives in App.jsx context — GPS watches survive screen navigation
// NavigationMap just reads from this hook via props

import { useEffect, useRef, useState, useCallback } from 'react';

const TODAY = new Date().toDateString();

// ── Helpers ───────────────────────────────────────────────────────────────────
const getDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
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

  // ── Restore persisted state ───────────────────────────────────────────────
  const nav   = loadKey('dh_nav_state')   || {};
  const shift = loadKey('dh_shift_state') || {};

  const [savedDistance,  setSavedDistance]  = useState(safeNum(nav.savedDistance));
  const [shiftDistance,  setShiftDistance]  = useState(safeNum(shift.shiftDistance));
  const [rideDistance,   setRideDistance]   = useState(safeNum(shift.rideDistance));
  const [isRiding,       setIsRiding]       = useState(shift.isRiding || false);
  const [speed,          setSpeed]          = useState(0);
  const [lastPosition,   setLastPosition]   = useState(null);
  const [geoError,       setGeoError]       = useState(null);

  // Refs — always current inside async callbacks
  const shiftWatchRef    = useRef(null);
  const rideWatchRef     = useRef(null);
  const shiftPathRef     = useRef([]);
  const ridePathRef      = useRef([]);
  const savedDistRef     = useRef(safeNum(nav.savedDistance));
  const shiftDistRef     = useRef(safeNum(shift.shiftDistance));
  const rideDistRef      = useRef(safeNum(shift.rideDistance));
  const isRidingRef      = useRef(shift.isRiding || false);
  const lastPositionRef  = useRef(null);

  // Keep refs in sync with state
  useEffect(() => { savedDistRef.current  = savedDistance; }, [savedDistance]);
  useEffect(() => { shiftDistRef.current  = shiftDistance; }, [shiftDistance]);
  useEffect(() => { rideDistRef.current   = rideDistance;  }, [rideDistance]);
  useEffect(() => { isRidingRef.current   = isRiding;      }, [isRiding]);

  // Persist + notify whenever distances change
  useEffect(() => {
    saveNavState(savedDistance);
    onDistanceUpdate?.(savedDistance + rideDistance);
  }, [savedDistance, rideDistance, onDistanceUpdate]);

  useEffect(() => {
    saveShiftState(shiftDistance, isRiding, rideDistance);
    onShiftDistanceUpdate?.(shiftDistance);
  }, [shiftDistance, isRiding, rideDistance, onShiftDistanceUpdate]);

  // ── Get initial position immediately on mount so Center Me works right away ─
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
  }, []); // runs once on mount
  const startShiftWatch = useCallback(() => {
    if (!navigator.geolocation || shiftWatchRef.current !== null) return;
    shiftWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, speed: spd, accuracy } = pos.coords;
        if (accuracy > 80) return;

        const newCoord = [latitude, longitude];
        lastPositionRef.current = newCoord;
        setLastPosition(newCoord);
        setSpeed(spd ? spd * 3.6 : 0);

        // Shift distance
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

        // Ride distance (only when isRiding flag is on)
        if (isRidingRef.current) {
          if (ridePathRef.current.length > 0) {
            const prev = ridePathRef.current[ridePathRef.current.length - 1];
            const inc  = getDistance(prev[0], prev[1], latitude, longitude);
            if (isFinite(inc) && inc > 0.020 && inc < 0.5 && (spd ? spd * 3.6 : 0) > 2) {
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
      () => {},
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 2000 }
    );
  }, []);

  const stopShiftWatch = useCallback(() => {
    if (shiftWatchRef.current !== null) {
      navigator.geolocation.clearWatch(shiftWatchRef.current);
      shiftWatchRef.current = null;
    }
    shiftPathRef.current = [];
    setShiftDistance(0);
    shiftDistRef.current = 0;
    localStorage.removeItem('dh_shift_state');
  }, []);

  // Start/stop shift watch based on isOnline
  useEffect(() => {
    if (isOnline) {
      startShiftWatch();
    } else {
      stopShiftWatch();
    }
    return () => {
      // Don't stop on re-render — only stop when explicitly going offline
    };
  }, [isOnline, startShiftWatch, stopShiftWatch]);

  // Cleanup on app unmount
  useEffect(() => {
    return () => {
      if (shiftWatchRef.current !== null) navigator.geolocation.clearWatch(shiftWatchRef.current);
      if (rideWatchRef.current  !== null) navigator.geolocation.clearWatch(rideWatchRef.current);
    };
  }, []);

  // ── Ride start / end ──────────────────────────────────────────────────────
  const startRide = useCallback(() => {
    ridePathRef.current  = [];
    rideDistRef.current  = 0;
    isRidingRef.current  = true;
    setRideDistance(0);
    setIsRiding(true);
    setGeoError(null);
    // Ensure shift watch is running (covers case where user starts ride before shift)
    startShiftWatch();
  }, [startShiftWatch]);

  const endRide = useCallback(() => {
    isRidingRef.current = false;
    setIsRiding(false);

    const finalKm = safeNum(rideDistRef.current);

    // Add ride distance into total saved nav distance
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

    // Always open NewRide screen — even if 0km (user can manually enter distance)
    onRideComplete?.(finalKm);
  }, [onDistanceUpdate, onRideComplete]);

  // Get current path for polyline display
  const getRidePath = useCallback(() => [...ridePathRef.current], []);

  return {
    // State for display
    savedDistance,
    shiftDistance,
    rideDistance,
    isRiding,
    speed,
    lastPosition,
    lastPositionRef,
    geoError,
    setGeoError,
    // Actions
    startRide,
    endRide,
    getRidePath,
  };
}