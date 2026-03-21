import React, { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_LOCATION = [12.9716, 77.5946];

const makeMarkerIcon = () => L.divIcon({
  className: '',
  html: `<div style="width:22px;height:22px;position:relative;display:flex;align-items:center;justify-content:center;">
    <div style="position:absolute;width:22px;height:22px;border-radius:50%;background:rgba(99,102,241,0.2);border:2px solid rgba(99,102,241,0.5);animation:gps-ring 1.8s ease-out infinite;"></div>
    <div style="width:12px;height:12px;border-radius:50%;background:#6366f1;border:2.5px solid #fff;box-shadow:0 2px 6px rgba(99,102,241,0.6);position:relative;z-index:1;"></div>
  </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

// ─────────────────────────────────────────────────────────────────────────────
// NavigationMap is a DISPLAY component only.
// All GPS tracking state lives in App.jsx via useGpsTracking hook.
// This component never unmounts tracking — it just shows the map.
// ─────────────────────────────────────────────────────────────────────────────
export default function NavigationMap({
  theme,
  // GPS state (from useGpsTracking in App)
  isOnline,
  isRiding,
  rideDistance,
  shiftDistance,
  savedDistance,
  speed,
  lastPosition,
  lastPositionRef,
  geoError,
  getRidePath,
  // Actions (from useGpsTracking in App)
  onStartRide,
  onEndRide,
}) {
  const mapContainerRef = useRef(null);
  const mapRef          = useRef(null);
  const markerRef       = useRef(null);
  const polylineRef     = useRef(null);
  const isCenteredRef   = useRef(true);
  const [isCentered, setIsCentered] = useState(true);

  const setIsCenteredBoth = useCallback((val) => {
    isCenteredRef.current = val;
    setIsCentered(val);
  }, []);

  // ── Map init ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    mapRef.current = L.map(mapContainerRef.current, {
      zoomControl: false, attributionControl: false,
    }).setView(DEFAULT_LOCATION, 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19 })
      .addTo(mapRef.current);

    polylineRef.current = L.polyline([], {
      color: '#6366f1', weight: 6, opacity: 0.9,
      lineJoin: 'round', lineCap: 'round',
    }).addTo(mapRef.current);

    mapRef.current.on('dragstart', () => setIsCenteredBoth(false));

    // Just center the map view — hook's useEffect handles marker via lastPosition prop
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => {
          mapRef.current?.setView([coords.latitude, coords.longitude], 16);
        },
        () => {},
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 10000 }
      );
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = markerRef.current = polylineRef.current = null;
      }
    };
  }, [setIsCenteredBoth]);

  // ── Sync marker position from GPS state ──────────────────────────────────
  // lastPosition updates come from useGpsTracking in App (never stops)
  useEffect(() => {
    if (!lastPosition || !mapRef.current) return;
    const coord = lastPosition;

    if (isCenteredRef.current) {
      mapRef.current.panTo(coord, { animate: true, duration: 0.5 });
    }

    if (!markerRef.current) {
      markerRef.current = L.marker(coord, { icon: makeMarkerIcon(), zIndexOffset: 1000 })
        .addTo(mapRef.current);
    } else {
      markerRef.current.setLatLng(coord);
    }
  }, [lastPosition]);

  // ── Sync polyline from ride path ──────────────────────────────────────────
  useEffect(() => {
    if (!polylineRef.current) return;
    if (isRiding && getRidePath) {
      polylineRef.current.setLatLngs(getRidePath());
    } else if (!isRiding) {
      polylineRef.current.setLatLngs([]);
    }
  }, [rideDistance, isRiding, getRidePath]); // rideDistance as proxy for path update

  const centerOnMe = useCallback(() => {
    // Priority: hook's ref (always current) → hook's state → map's own position → fallback
    const pos = lastPositionRef?.current || lastPosition || DEFAULT_LOCATION;
    if (mapRef.current) {
      mapRef.current.flyTo(pos, 16, { animate: true, duration: 0.8 });
    }
    setIsCenteredBoth(true);
  }, [lastPosition, lastPositionRef, setIsCenteredBoth]);

  const handleRideToggle = () => {
    if (isRiding) onEndRide?.(); else onStartRide?.();
  };

  const totalDistance = savedDistance + rideDistance;

  const styles = {
    container: { position: 'relative', height: 'calc(100vh - 90px)', width: '100%', overflow: 'hidden' },
    map:       { position: 'absolute', top: 0, left: 0, height: '100%', width: '100%', zIndex: 1 },
    panel: {
      position: 'absolute', bottom: '16px', left: '12px', right: '12px',
      backgroundColor: theme.card, borderRadius: '24px', padding: '20px 24px',
      boxShadow: '0 -4px 30px rgba(0,0,0,0.25)', zIndex: 1000,
      border: `1px solid ${theme.border}`,
    },
    statsRow:  { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' },
    statBox:   { textAlign: 'center' },
    statLabel: { fontSize: '10px', color: theme.subText, fontWeight: '800', letterSpacing: '0.8px' },
    statValue: { fontSize: '22px', fontWeight: '900', color: '#6366f1', lineHeight: 1.2 },
    statUnit:  { fontSize: '11px', fontWeight: '600', color: theme.subText },
    rideBtn: {
      width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
      backgroundColor: isRiding ? '#FF4757' : '#6366f1',
      color: 'white', fontWeight: '800', fontSize: '16px',
      cursor: 'pointer', transition: 'background 0.3s', letterSpacing: '0.5px',
    },
    errorBox: {
      position: 'absolute', top: '16px', left: '12px', right: '12px',
      backgroundColor: '#FF475720', border: '1px solid #FF4757',
      borderRadius: '12px', padding: '12px 16px',
      color: '#FF4757', fontSize: '13px', fontWeight: '600',
      zIndex: 1001, textAlign: 'center',
    },
    centerBtn: {
      position: 'absolute', bottom: '230px', left: '16px',
      width: '44px', height: '44px', borderRadius: '50%',
      backgroundColor: theme.card,
      border: `2px solid ${isCentered ? theme.border : '#6366f1'}`,
      boxShadow: '0 2px 12px rgba(0,0,0,0.2)',
      zIndex: 1001, cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '20px', transition: 'border-color 0.3s, transform 0.2s',
      transform: isCentered ? 'scale(1)' : 'scale(1.1)',
    },
    shiftDot: {
      width: '8px', height: '8px', borderRadius: '50%',
      backgroundColor: isOnline ? '#00D27A' : theme.subText,
      display: 'inline-block', marginRight: '6px',
      animation: isOnline ? 'pulse 1.2s infinite' : 'none',
    },
    rideDot: {
      width: '8px', height: '8px', borderRadius: '50%',
      backgroundColor: isRiding ? '#FF7B35' : theme.subText,
      display: 'inline-block', marginRight: '6px',
      animation: isRiding ? 'pulse 1.2s infinite' : 'none',
    },
  };

  return (
    <div style={styles.container}>
      <style>{`
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(1.4)} }
        @keyframes gps-ring { 0%{transform:scale(0.8);opacity:1} 100%{transform:scale(2.4);opacity:0} }
      `}</style>

      <div ref={mapContainerRef} style={styles.map} />

      {geoError && <div style={styles.errorBox}>⚠️ {geoError}</div>}

      <button style={styles.centerBtn} onClick={centerOnMe}>
        {isCentered ? '📍' : '🎯'}
      </button>

      <div style={styles.panel}>
        {/* Status */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
          <div style={{ fontSize: '11px', color: theme.subText, fontWeight: '700', display: 'flex', alignItems: 'center' }}>
            <span style={styles.shiftDot} />
            {isOnline ? 'SHIFT ACTIVE' : 'SHIFT OFFLINE'}
          </div>
          {isRiding && (
            <div style={{ fontSize: '11px', color: '#FF7B35', fontWeight: '700', display: 'flex', alignItems: 'center' }}>
              <span style={styles.rideDot} />
              RIDE IN PROGRESS
            </div>
          )}
        </div>

        {/* Stats */}
        <div style={styles.statsRow}>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>THIS RIDE</div>
            <div style={styles.statValue}>
              {(rideDistance || 0).toFixed(2)}<span style={styles.statUnit}> km</span>
            </div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>SHIFT TOTAL</div>
            <div style={styles.statValue}>
              {(shiftDistance || 0).toFixed(2)}<span style={styles.statUnit}> km</span>
            </div>
          </div>
          <div style={styles.statBox}>
            <div style={styles.statLabel}>SPEED</div>
            <div style={styles.statValue}>
              {(speed || 0).toFixed(0)}<span style={styles.statUnit}> km/h</span>
            </div>
          </div>
        </div>

        <button
          style={{
            ...styles.rideBtn,
            opacity: isOnline ? 1 : 0.5,
            cursor: isOnline ? 'pointer' : 'not-allowed',
          }}
          onClick={isOnline ? handleRideToggle : undefined}
        >
          {isRiding ? '🏁  End Ride & Log' : '🏍️  Start Ride'}
        </button>

        {!isOnline && (
          <p style={{ textAlign: 'center', fontSize: '11px', color: theme.subText, margin: '8px 0 0', fontWeight: '600' }}>
            Start your shift first to begin tracking
          </p>
        )}

        {savedDistance > 0 && !isRiding && (
          <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '11px', color: theme.subText }}>
            💾 {(savedDistance || 0).toFixed(2)} km logged today
          </div>
        )}
      </div>
    </div>
  );
}