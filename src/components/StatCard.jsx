import React from 'react';
import { globalStyles } from '../theme/theme';

/**
 * StatCard — upgraded reusable metric tile
 *
 * New props vs old version:
 *   color     — value text color (e.g. '#10B981' for green, '#EF4444' for red)
 *   trend     — 'up' | 'down' | 'neutral' — shows an arrow indicator
 *   goal      — number — if set, shows a progress bar (value / goal)
 *   subtitle  — small text below the value (e.g. "of ₹1,000 goal")
 */
export default function StatCard({ theme, title, value, icon, color, trend, goal, subtitle }) {
  // Parse numeric value for goal progress bar
  const numericValue = parseFloat(String(value).replace(/[^0-9.]/g, '')) || 0;
  const progress = goal > 0 ? Math.min(numericValue / goal, 1) : null;

  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : null;
  const trendColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : theme.subText;

  return (
    <div style={{
      ...globalStyles.card,
      backgroundColor: theme.card,
      borderColor: theme.border,
      padding: '16px',
      marginBottom: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 0,
    }}>
      {/* Label row */}
      <p style={{
        color: theme.subText,
        fontSize: '11px',
        fontWeight: '700',
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        margin: '0 0 6px',
      }}>
        {icon} {title}
      </p>

      {/* Value + trend arrow */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
        <h3 style={{
          margin: 0,
          fontSize: '20px',
          fontWeight: '800',
          color: color || theme.text,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {value}
        </h3>
        {trendIcon && (
          <span style={{ fontSize: '14px', fontWeight: '700', color: trendColor }}>
            {trendIcon}
          </span>
        )}
      </div>

      {/* Subtitle */}
      {subtitle && (
        <p style={{ margin: '3px 0 0', fontSize: '11px', color: theme.subText, fontWeight: '600' }}>
          {subtitle}
        </p>
      )}

      {/* Goal progress bar */}
      {progress !== null && (
        <div style={{
          marginTop: '8px',
          height: '4px',
          borderRadius: '2px',
          background: `${theme.border}80`,
          overflow: 'hidden',
        }}>
          <div style={{
            height: '100%',
            width: `${(progress * 100).toFixed(1)}%`,
            borderRadius: '2px',
            background: progress >= 1
              ? '#10B981'
              : progress >= 0.6
                ? '#F59E0B'
                : '#6366f1',
            transition: 'width 0.4s ease',
          }} />
        </div>
      )}
    </div>
  );
}