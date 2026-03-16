import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

const NavigationMap = ({ theme, isOnline }) => {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const polylineRef = useRef(null);

  const [isTracking, setIsTracking] = useState(false);
  const [location, setLocation] = useState([12.9716, 77.5946]);
  const [path, setPath] = useState([]); // Array of [lat, lng]
  const [distance, setDistance] = useState(0); // Total km

  // Helper: Calculate distance between two points in KM
  const getDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // Radius of the earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  // 1. Initialize Map
  useEffect(() => {
    if (mapContainerRef.current && !mapRef.current) {
      mapRef.current = L.map(mapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView(location, 16);

      L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png").addTo(mapRef.current);

      // Create an empty polyline for the path
      polylineRef.current = L.polyline([], { color: '#6366f1', weight: 5, opacity: 0.7 }).addTo(mapRef.current);
    }
  }, []);

  // 2. Path Recording Engine
  useEffect(() => {
    let watchId = null;

    if (isTracking) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude } = pos.coords;
          const newCoord = [latitude, longitude];

          setPath((prevPath) => {
            const updatedPath = [...prevPath, newCoord];
            
            // Update the Polyline on the map
            if (polylineRef.current) {
              polylineRef.current.setLatLngs(updatedPath);
            }

            // Calculate Distance increment
            if (prevPath.length > 0) {
              const lastPoint = prevPath[prevPath.length - 1];
              const increment = getDistance(lastPoint[0], lastPoint[1], latitude, longitude);
              setDistance(d => d + increment);
            }

            return updatedPath;
          });

          setLocation(newCoord);
          if (mapRef.current) {
            mapRef.current.panTo(newCoord);
            if (!markerRef.current) {
              markerRef.current = L.circleMarker(newCoord, { radius: 8, fillColor: "#6366f1", color: "#fff", fillOpacity: 1 }).addTo(mapRef.current);
            } else {
              markerRef.current.setLatLng(newCoord);
            }
          }
        },
        null,
        { enableHighAccuracy: true, distanceFilter: 10 } // Only trigger every 10 meters
      );
    } else {
      // Clear path when tracking stops (Optional: You can save this to history first)
      setPath([]);
      setDistance(0);
      if (polylineRef.current) polylineRef.current.setLatLngs([]);
    }

    return () => watchId && navigator.geolocation.clearWatch(watchId);
  }, [isTracking]);

  const styles = {
    container: { position: 'relative', height: '100vh', width: '100%', overflow: 'hidden' },
    map: { position: 'absolute', top: 0, left: 0, height: '100%', width: '100%', zIndex: 1 },
    stats: {
      position: 'absolute', bottom: '20px', left: '15px', right: '15px',
      backgroundColor: 'white', borderRadius: '24px', padding: '20px',
      boxShadow: '0 -4px 20px rgba(0,0,0,0.1)', zIndex: 1000,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center'
    },
    btn: {
      width: '100%', padding: '16px', borderRadius: '14px', border: 'none',
      backgroundColor: isTracking ? '#ff4757' : '#6366f1', color: 'white',
      fontWeight: 'bold', fontSize: '16px', marginTop: '10px', cursor: 'pointer'
    }
  };

  return (
    <div style={styles.container}>
      <div ref={mapContainerRef} style={styles.map} />
      
      <div style={styles.stats}>
        <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', color: '#999', fontWeight: 'bold' }}>SESSION DISTANCE</div>
            <div style={{ fontSize: '24px', fontWeight: '900', color: '#6366f1' }}>{distance.toFixed(2)} <span style={{fontSize: '14px'}}>km</span></div>
            
            <button style={styles.btn} onClick={() => setIsTracking(!isTracking)}>
              {isTracking ? '🏁 END RIDE' : '🏍️ START RIDE'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default NavigationMap;