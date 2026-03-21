import React from 'react';
import { globalStyles } from '../theme/theme';

export default function ShiftManagement({ isOnline, setIsOnline, theme, shiftDistance = 0 }) {
  const hours = Math.floor((shiftDistance / 25) * 60); // rough time estimate at ~25km/h avg

  return (
    <div style={{ padding: '24px', paddingTop: '100px', paddingBottom: '100px', boxSizing: 'border-box' }}>
      <h2 style={{ margin: '0 0 24px 0', color: theme.text, fontSize: '26px', fontWeight: '800' }}>
        Shift Management
      </h2>

      {/* Online toggle card */}
      <div style={{
        ...globalStyles.card,
        backgroundColor: theme.card,
        borderColor: isOnline ? theme.accent : theme.border,
        borderWidth: isOnline ? '2px' : '1px',
        textAlign: 'center',
        padding: '40px 24px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        {/* Power button */}
        <div
          onClick={() => setIsOnline(!isOnline)}
          style={{
            width: '100px', height: '100px', borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px', fontSize: '40px', cursor: 'pointer',
            transition: 'all 0.4s ease',
            background: isOnline ? theme.accentGradient : theme.bg,
            color: isOnline ? '#FFF' : theme.subText,
            boxShadow: isOnline ? `0 10px 30px ${theme.accent}60` : 'none',
            border: isOnline ? 'none' : `2px solid ${theme.border}`,
          }}
        >
          ⏻
        </div>

        <h2 style={{ color: theme.text, margin: '0 0 8px', fontSize: '28px', fontWeight: '800' }}>
          {isOnline ? "Shift Active" : "Offline"}
        </h2>
        <p style={{ color: theme.subText, fontSize: '14px', marginBottom: '32px' }}>
          {isOnline
            ? "GPS is tracking your shift. Go to Map to log rides."
            : "Start your shift to begin GPS tracking."}
        </p>

        {/* Shift stats — shown while online */}
        {isOnline && (
          <div style={{
            display: 'flex', gap: '16px', marginBottom: '32px', width: '100%',
          }}>
            {[
              ['SHIFT DISTANCE', `${shiftDistance.toFixed(2)} km`, theme.accent],
              ['GPS STATUS', 'TRACKING', '#00D27A'],
            ].map(([label, value, color]) => (
              <div key={label} style={{
                flex: 1, backgroundColor: theme.bg, borderRadius: '14px',
                padding: '14px', border: `1px solid ${theme.border}`,
              }}>
                <p style={{ margin: 0, fontSize: '10px', color: theme.subText, fontWeight: '800', letterSpacing: '0.8px' }}>
                  {label}
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '18px', fontWeight: '900', color, fontFamily: 'monospace' }}>
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
            color: '#FFF',
            maxWidth: '250px',
          }}
        >
          {isOnline ? "End Shift" : "Start Shift"}
        </button>

        {isOnline && (
          <p style={{ fontSize: '11px', color: theme.subText, marginTop: '12px', fontWeight: '600' }}>
            ⚠️ Ending shift will stop GPS tracking
          </p>
        )}
      </div>
    </div>
  );
}