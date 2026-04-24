import React, { useEffect, useRef, useState, useCallback, useTransition, useMemo } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const DEFAULT_LOCATION = [12.9716, 77.5946];

const makeMarkerIcon = () => L.divIcon({
  className: 'gps-marker',
  html: `<div style="
    width:24px;height:24px;position:relative;display:flex;
    align-items:center;justify-content:center;
  ">
    <div style="
      position:absolute;width:24px;height:24px;border-radius:50%;
      background:linear-gradient(135deg,rgba(99,102,241,0.3),rgba(99,102,241,0.15));
      border:2px solid rgba(99,102,241,0.7);animation:gps-ring 2s ease-out infinite;
    "></div>
    <div style="
      width:14px;height:14px;border-radius:50%;background:#6366f1;
      border:3px solid #fff;box-shadow:0 0 16px rgba(99,102,241,0.8);
      position:relative;z-index:2;animation:gps-pulse 1.5s infinite;
    "></div>
  </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
  shadowSize: [0, 0]
});

export default function NavigationMap({
  theme = {},
  isOnline = false,
  isRiding = false,
  rideDistance = 0,
  shiftDistance = 0,
  savedDistance = 0,
  speed = 0,
  lastPosition,
  lastPositionRef,
  geoError,
  getRidePath,
  onStartRide,
  onEndRide,
}) {
  const [isPending, startTransition] = useTransition();
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const polylineRef = useRef(null);
  const isCenteredRef = useRef(true);
  const [isCentered, setIsCentered] = useState(true);

  // 🔧 Optimized centering
  const setIsCenteredBoth = useCallback((centered) => {
    isCenteredRef.current = centered;
    setIsCentered(centered);
  }, []);

  // 🗺️ Memoized styles (prevents recalc)
  const styles = useMemo(() => ({
    container: {
      position: 'relative',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)'
    },
    map: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1 },
    panel: {
      position: 'absolute',
      bottom: 20,
      left: 16,
      right: 16,
      backgroundColor: theme.card || 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(24px) saturate(180%)',
      borderRadius: 24,
      padding: '24px',
      boxShadow: '0 -12px 48px rgba(0,0,0,0.3)',
      border: `1px solid ${theme.border || 'rgba(0,0,0,0.08)'}`,
      zIndex: 400,
      maxWidth: '420px',
      fontFamily: 'system-ui, -apple-system, sans-serif'
    },
    header: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 16,
      paddingBottom: 12,
      borderBottom: `1px solid ${theme.border || 'rgba(0,0,0,0.08)'}`,
      fontSize: '13px',
      fontWeight: 700
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: '1fr 1fr 1fr',
      gap: 16,
      marginBottom: 20
    },
    statCard: {
      textAlign: 'center',
      padding: 16,
      borderRadius: 16,
      backgroundColor: theme.bg || 'rgba(255,255,255,0.7)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${theme.border || 'rgba(0,0,0,0.05)'}`,
      transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
      cursor: 'pointer',
      ':hover': { transform: 'translateY(-2px)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }
    },
    statLabel: {
      fontSize: '11px',
      color: theme.subText || '#64748b',
      fontWeight: 800,
      letterSpacing: '1.2px',
      textTransform: 'uppercase',
      marginBottom: 4
    },
    statValue: {
      fontSize: '26px',
      fontWeight: 900,
      lineHeight: 1,
      color: theme.text || '#0f172a',
      fontVariantNumeric: 'tabular-nums'
    },
    statUnit: {
      fontSize: '12px',
      color: theme.subText || '#64748b',
      fontWeight: 600,
      marginTop: 2
    },
    rideButton: {
      width: '100%',
      padding: '20px 24px',
      borderRadius: 20,
      border: 'none',
      background: isRiding 
        ? 'linear-gradient(135deg, #EF4444, #DC2626)' 
        : 'linear-gradient(135deg, #6366f1, #4f46e5)',
      color: 'white',
      fontSize: '16px',
      fontWeight: 800,
      letterSpacing: '0.5px',
      cursor: isOnline && !isPending ? 'pointer' : 'not-allowed',
      transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
      boxShadow: isOnline && !isPending 
        ? '0 12px 32px rgba(99,102,241,0.4)' 
        : '0 4px 12px rgba(0,0,0,0.15)',
      opacity: isOnline && !isPending ? 1 : 0.6
    },
    centerButton: {
      position: 'absolute',
      bottom: 280,
      left: 20,
      width: 56,
      height: 56,
      borderRadius: '50%',
      backgroundColor: theme.card || '#ffffff',
      border: `3px solid ${isCentered ? (theme.border || 'rgba(0,0,0,0.1)') : '#6366f1'}`,
      boxShadow: '0 12px 32px rgba(0,0,0,0.25), 0 0 0 4px rgba(255,255,255,0.9)',
      zIndex: 401,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '22px',
      transition: 'all 0.4s cubic-bezier(0.4,0,0.2,1)',
      transform: isCentered ? 'scale(1) rotate(0deg)' : 'scale(1.15) rotate(15deg)'
    },
    errorBanner: {
      position: 'absolute',
      top: 20,
      left: 16,
      right: 16,
      background: 'linear-gradient(135deg, rgba(239,68,68,0.95), rgba(220,38,38,0.9))',
      backdropFilter: 'blur(12px)',
      borderRadius: 20,
      padding: '18px 24px',
      color: 'white',
      fontSize: '14px',
      fontWeight: 600,
      zIndex: 402,
      textAlign: 'center',
      boxShadow: '0 12px 40px rgba(239,68,68,0.4)',
      lineHeight: 1.4
    }
  }), [theme, isRiding, isOnline, isPending, isCentered]);

  // 🗺️ Map Initialization (optimized)
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      zoomControl: false,
      attributionControl: false,
      zoomAnimation: true,
      fadeAnimation: true,
      markerZoomAnimation: true,
      preferCanvas: true // 2x faster rendering
    }).setView(DEFAULT_LOCATION, 16);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors',
      detectRetina: true
    }).addTo(map);

    polylineRef.current = L.polyline([], {
      color: '#6366f1',
      weight: 8,
      opacity: 0.9,
      lineJoin: 'round',
      lineCap: 'round',
      smoothFactor: 1,
      dashArray: '8, 4' // Subtle dash for better visibility
    }).addTo(map);

    // Interactions
    map.on('dragstart zoomstart', () => setIsCenteredBoth(false));

    // Initial GPS with better UX
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const pos = [coords.latitude, coords.longitude];
        map.flyTo(pos, 16, { duration: 1.2, paddingBottomRight: [0, 280] });
      },
      undefined,
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
      polylineRef.current = null;
    };
  }, [setIsCenteredBoth]);

  // 🔵 GPS MARKER - Production optimized
  useEffect(() => {
    if (!mapRef.current) return;

    const coord = lastPosition || DEFAULT_LOCATION;
    
    // Smart auto-center (only when tracking)
    if (isCenteredRef.current && isOnline) {
      mapRef.current.panTo(coord, { 
        animate: true, 
        duration: 0.8,
        easeLinearity: 0.3 
      });
    }

    // Always show marker
    if (!markerRef.current) {
      markerRef.current = L.marker(coord, {
        icon: makeMarkerIcon(),
        zIndexOffset: 1000
      }).addTo(mapRef.current);
    } else {
      markerRef.current.setLatLng(coord);
    }
  }, [lastPosition, isOnline]);

  // 🛤️ Ride Path - Optimized
  useEffect(() => {
    if (!polylineRef.current || !getRidePath) return;
    
    const path = isRiding && rideDistance > 0 ? getRidePath() : [];
    polylineRef.current.setLatLngs(path);
  }, [isRiding, rideDistance, getRidePath]);

  // 🎯 Center Button - Enhanced
  const centerOnMe = useCallback(() => {
    const pos = lastPositionRef?.current || 
               lastPosition || 
               (mapRef.current?.getCenter() || DEFAULT_LOCATION);
    
    if (mapRef.current) {
      mapRef.current.flyTo(pos, 16, { 
        animate: true, 
        duration: 1.2,
        paddingTopLeft: [20, 20],
        paddingBottomRight: [20, 300]
      });
    }
    setIsCenteredBoth(true);
  }, [lastPosition, lastPositionRef, setIsCenteredBoth]);

  const handleRideToggle = useCallback(() => {
    if (!isOnline) return;
    startTransition(() => {
      if (isRiding) onEndRide?.();
      else onStartRide?.();
    });
  }, [isRiding, isOnline, onStartRide, onEndRide, startTransition]);

  // 🧮 Speed visualization
  const speedColor = speed > 80 ? '#EF4444' : 
                    speed > 50 ? '#F59E0B' : 
                    speed > 20 ? '#FBBF24' : '#10B981';

  return (
    <>
      <style>{`
        @keyframes gps-pulse {
          0%,100%{opacity:1;transform:scale(1)}
          50%{opacity:0.4;transform:scale(1.4)}
        }
        @keyframes gps-ring {
          0%{transform:scale(0.8);opacity:1;box-shadow:0 0 0 0 rgba(99,102,241,0.7)}
          70%{transform:scale(1.8);opacity:0.3}
          100%{transform:scale(2.5);opacity:0;box-shadow:0 0 0 20px rgba(99,102,241,0)}
        }
        @keyframes spin{to{transform:rotate(360deg)}}
        .gps-marker{transform:translate(-50%,-50%)!important}
        .leaflet-container{font:600 16px system-ui,-apple-system,sans-serif}
        .leaflet-pane{z-index:1!important}
        .leaflet-marker-pane{z-index:700!important}
        .leaflet-overlay-pane{z-index:800!important}
      `}</style>

      <div style={styles.container}>
        <div ref={mapContainerRef} style={styles.map} aria-label="Live GPS tracking map" />

        {geoError && (
          <div style={styles.errorBanner} role="alert" aria-live="assertive">
            📍 GPS Unavailable
            <br />
            <small>Using estimated location</small>
          </div>
        )}

        <button
          onClick={centerOnMe}
          style={styles.centerButton}
          aria-label={isCentered ? "Map centered on location" : "Recenter map"}
          title="Recenter on GPS"
        >
          {isCentered ? '📍' : '🎯'}
        </button>

        <div style={styles.panel} role="complementary" aria-label="Ride controls">
          {/* Status Header */}
          <div style={styles.header}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              fontSize: 13, fontWeight: 800,
              color: isOnline ? '#059669' : (theme?.subText || '#94a3b8'),
              textTransform: 'uppercase', letterSpacing: '0.5px'
            }}>
              <div style={{
                width: 12, height: 12, borderRadius: '50%',
                background: isOnline ? '#059669' : (theme?.subText || '#94a3b8'),
                boxShadow: isOnline ? '0 0 20px rgba(5,150,105,0.6)' : 'none',
                animation: isOnline ? 'gps-pulse 1.5s infinite' : 'none'
              }} />
              {isOnline ? 'LIVE SHIFT' : 'SHIFT OFFLINE'}
            </div>
            {isRiding && (
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10,
                fontSize: 13, fontWeight: 800,
                color: '#D97706', textTransform: 'uppercase', letterSpacing: '0.5px'
              }}>
                <div style={{
                  width: 12, height: 12, borderRadius: '50%',
                  background: '#D97706',
                  boxShadow: '0 0 20px rgba(217,119,6,0.6)',
                  animation: 'gps-pulse 1.5s infinite'
                }} />
                RIDE ACTIVE
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Current Ride</div>
              <div style={styles.statValue}>{(rideDistance || 0).toFixed(1)}</div>
              <div style={styles.statUnit}>km</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Shift Total</div>
              <div style={styles.statValue}>{(shiftDistance || 0).toFixed(1)}</div>
              <div style={styles.statUnit}>km</div>
            </div>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Live Speed</div>
              <div style={{...styles.statValue, color: speedColor}}>
                {Math.round(speed || 0)}
              </div>
              <div style={styles.statUnit}>km/h</div>
            </div>
          </div>

          {/* Main Action */}
          <button
            onClick={handleRideToggle}
            disabled={!isOnline || isPending}
            style={styles.rideButton}
            aria-label={isRiding ? "End ride and log earnings" : "Start new ride"}
            aria-pressed={isRiding}
          >
            {isPending ? (
              <>
                <div style={{
                  width: 20, height: 20,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTop: '2px solid white',
                  borderRadius: '50%',
                  animation: 'spin 0.8s linear infinite',
                  display: 'inline-block', marginRight: 10
                }} />
                Saving...
              </>
            ) : isRiding ? (
              '🏁 End Ride & Save'
            ) : (
              '🏍️ Start Ride'
            )}
          </button>

          {/* Helper text */}
          {!isOnline && (
            <p style={{
              textAlign: 'center', fontSize: 13,
              color: theme?.subText || '#94a3b8',
              marginTop: 16, fontWeight: 600, lineHeight: 1.4
            }}>
              👆 Start shift to enable tracking
            </p>
          )}

          {savedDistance > 0 && !isRiding && (
            <p style={{
              textAlign: 'center', marginTop: 12,
              fontSize: 13, color: '#059669', fontWeight: 800
            }}>
              💾 {savedDistance.toFixed(1)}km saved today
            </p>
          )}
        </div>
      </div>
    </>
  );
}