import React, { useState, useEffect, useRef } from 'react';
import { globalStyles } from '../theme/theme';

const HISTORY_KEY = 'dh_shift_history';

const loadHistory = () => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
  } catch { return []; }
};

const saveHistory = (h) => {
  try {
    // Keep last 90 shifts only
    localStorage.setItem(HISTORY_KEY, JSON.stringify(h.slice(-90)));
  } catch { /* quota guard */ }
};

export default function ShiftManagement({ isOnline, setIsOnline, theme, shiftDistance = 0, todayRideCount = 0, onHistoryUpdate }) {
  const estimatedMinutes = Math.round((shiftDistance / 25) * 60);

  const [history, setHistory] = useState(loadHistory);
  const [showHistory, setShowHistory] = useState(false);
  const [discardWarning, setDiscardWarning] = useState(false);

  // Track when current shift started
  const shiftStartRef = useRef(null);
  const prevOnline = useRef(isOnline);

  // When shift goes ONLINE — record start time
  useEffect(() => {
    if (isOnline && !prevOnline.current) {
      shiftStartRef.current = new Date().toISOString();
    }

    // When shift goes OFFLINE — decide whether to record it
    if (!isOnline && prevOnline.current && shiftStartRef.current) {
      const start = new Date(shiftStartRef.current);
      const end = new Date();
      const durationMin = (end - start) / 60000;

      const qualifies = durationMin >= 15 || todayRideCount >= 1;

      if (qualifies) {
        const entry = {
          start: shiftStartRef.current,
          end: end.toISOString(),
          durationMin: Math.round(durationMin),
          rides: todayRideCount,
          distanceKm: parseFloat(shiftDistance.toFixed(2)),
        };
        const updated = [...history, entry];
        setHistory(updated);
        saveHistory(updated);
        onHistoryUpdate?.(updated);
      } else {
        // Show discard warning briefly
        setDiscardWarning(true);
        setTimeout(() => setDiscardWarning(false), 4000);
      }
      shiftStartRef.current = null;
    }

    prevOnline.current = isOnline;
  }, [isOnline]); // eslint-disable-line

  // Expose history to App so Dashboard can show it in menu
  useEffect(() => {
    onHistoryUpdate?.(history);
  }, []); // eslint-disable-line

  const formatDuration = (min) => {
    if (min < 60) return `${min} min`;
    return `${Math.floor(min / 60)}h ${min % 60}m`;
  };

  const formatDate = (iso) => new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short'
  });

  const formatTime = (iso) => new Date(iso).toLocaleTimeString([], {
    hour: '2-digit', minute: '2-digit'
  });

  return (
    <div style={{ padding: '24px', paddingTop: '100px', paddingBottom: '100px', boxSizing: 'border-box' }}>

      {/* Page header with hamburger space */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <h2 style={{ margin: 0, color: theme.text, fontSize: '24px', fontWeight: '800' }}>
          ⏱️ Shift Management
        </h2>
        <button
          onClick={() => setShowHistory(h => !h)}
          style={{
            padding: '8px 14px', borderRadius: '10px', border: `1px solid ${theme.border}`,
            background: showHistory ? theme.accent : theme.bg,
            color: showHistory ? '#fff' : theme.text,
            fontSize: '12px', fontWeight: '700', cursor: 'pointer'
          }}
        >
          {showHistory ? 'Hide Log' : '📋 Shift Log'}
        </button>
      </div>

      {/* Discard warning */}
      {discardWarning && (
        <div style={{
          background: 'rgba(245,158,11,0.15)', border: '1px solid #F59E0B',
          borderRadius: '12px', padding: '12px 16px', marginBottom: '16px',
          fontSize: '13px', color: '#F59E0B', fontWeight: '600', lineHeight: 1.5
        }}>
          ⚠️ Shift too short — not recorded. A shift needs at least <strong>15 minutes</strong> online or <strong>1 completed ride</strong> to be saved.
        </div>
      )}

      {/* Online Toggle Card */}
      <div style={{
        ...globalStyles.card,
        backgroundColor: theme.card,
        borderColor: isOnline ? theme.accent : theme.border,
        borderWidth: isOnline ? '2px' : '1px',
        textAlign: 'center',
        padding: '36px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        marginBottom: '20px',
      }}>
        <div
          onClick={() => setIsOnline(!isOnline)}
          style={{
            width: '90px', height: '90px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px', fontSize: '36px', cursor: 'pointer',
            transition: 'all 0.4s ease',
            background: isOnline ? theme.accentGradient : theme.bg,
            color: isOnline ? '#FFF' : theme.subText,
            boxShadow: isOnline ? `0 10px 30px ${theme.accent}60` : 'none',
            border: isOnline ? 'none' : `2px solid ${theme.border}`,
          }}
        >
          ⏻
        </div>

        <h2 style={{ color: theme.text, margin: '0 0 8px', fontSize: '26px', fontWeight: '800' }}>
          {isOnline ? 'Shift Active' : 'Offline'}
        </h2>
        <p style={{ color: theme.subText, fontSize: '13px', marginBottom: '28px' }}>
          {isOnline
            ? 'GPS is tracking your shift. Go to Map to log rides.'
            : 'Start your shift to begin GPS tracking.'}
        </p>

        {isOnline && (
          <div style={{ display: 'flex', gap: '10px', marginBottom: '28px', width: '100%' }}>
            {[
              ['DISTANCE', `${shiftDistance.toFixed(1)} km`, theme.accent],
              ['EST. TIME', formatDuration(estimatedMinutes), '#F59E0B'],
              ['GPS', 'LIVE', '#00D27A'],
            ].map(([label, value, color]) => (
              <div key={label} style={{
                flex: 1, backgroundColor: theme.bg, borderRadius: '12px',
                padding: '12px 8px', border: `1px solid ${theme.border}`,
              }}>
                <p style={{ margin: 0, fontSize: '9px', color: theme.subText, fontWeight: '800', letterSpacing: '0.8px' }}>
                  {label}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '16px', fontWeight: '900', color, fontFamily: 'monospace' }}>
                  {value}
                </p>
              </div>
            ))}
          </div>
        )}

        <button
          onClick={() => setIsOnline(!isOnline)}
          style={{
            ...globalStyles.btnPrimary,
            background: isOnline ? '#FF4757' : theme.accentGradient,
            color: '#FFF', maxWidth: '240px',
          }}
        >
          {isOnline ? '🔴 End Shift' : '🟢 Start Shift'}
        </button>

        {isOnline && (
          <p style={{ fontSize: '11px', color: theme.subText, marginTop: '10px', fontWeight: '600' }}>
            ⚠️ Shifts under 15 min with 0 rides are not recorded
          </p>
        )}
      </div>

      {/* Shift History Log */}
      {showHistory && (
        <div style={{
          ...globalStyles.card,
          backgroundColor: theme.card,
          borderColor: theme.border,
          padding: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: theme.text }}>
              📋 Shift History
            </h3>
            {history.length > 0 && (
              <button
                onClick={() => {
                  if (window.confirm?.('Clear all shift history?') ?? true) {
                    setHistory([]);
                    saveHistory([]);
                    onHistoryUpdate?.([]);
                  }
                }}
                style={{
                  fontSize: '11px', color: '#FF4757', background: 'rgba(255,71,87,0.1)',
                  border: '1px solid rgba(255,71,87,0.3)', borderRadius: '8px',
                  padding: '4px 10px', cursor: 'pointer', fontWeight: '700'
                }}
              >
                Clear All
              </button>
            )}
          </div>

          {history.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 20px', color: theme.subText }}>
              <div style={{ fontSize: '32px', marginBottom: '10px' }}>🕐</div>
              <p style={{ margin: 0, fontSize: '14px', fontWeight: '600' }}>No shifts recorded yet</p>
              <p style={{ margin: '6px 0 0', fontSize: '12px' }}>
                Shifts need 15+ min online or 1+ ride to be saved
              </p>
            </div>
          ) : (
            [...history].reverse().map((s, i) => {
              const qualityColor = s.rides >= 5 ? '#00D27A' : s.rides >= 1 ? theme.accent : '#F59E0B';
              return (
                <div key={i} style={{
                  padding: '14px', borderRadius: '12px',
                  background: theme.bg, border: `1px solid ${theme.border}`,
                  marginBottom: '10px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: theme.text }}>
                        {formatDate(s.start)}
                      </div>
                      <div style={{ fontSize: '12px', color: theme.subText, marginTop: '3px' }}>
                        {formatTime(s.start)} → {s.end ? formatTime(s.end) : 'Active'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '13px', fontWeight: '800', color: qualityColor }}>
                        {s.rides} ride{s.rides !== 1 ? 's' : ''}
                      </div>
                      <div style={{ fontSize: '11px', color: theme.subText, marginTop: '2px' }}>
                        {s.distanceKm} km
                      </div>
                    </div>
                  </div>
                  <div style={{
                    marginTop: '10px', display: 'flex', gap: '8px'
                  }}>
                    <span style={{
                      fontSize: '11px', fontWeight: '700', padding: '3px 8px',
                      borderRadius: '6px', background: `${theme.accent}18`, color: theme.accent
                    }}>
                      ⏱️ {formatDuration(s.durationMin)}
                    </span>
                    {s.rides > 0 && (
                      <span style={{
                        fontSize: '11px', fontWeight: '700', padding: '3px 8px',
                        borderRadius: '6px', background: 'rgba(0,210,122,0.15)', color: '#00D27A'
                      }}>
                        ₹/ride ~{s.distanceKm > 0 ? (s.distanceKm / s.rides).toFixed(1) : '—'} km avg
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}