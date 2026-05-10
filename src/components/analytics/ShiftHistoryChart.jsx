import React, { useMemo } from 'react';
import { Card, CardTitle, EmptyState } from './analyticsHelpers';

export default function ShiftHistoryChart({ shiftHistory = [], theme }) {
  const stats = useMemo(() => {
    if (!shiftHistory.length) return null;
    const totalMin  = shiftHistory.reduce((s, h) => s + h.durationMin, 0);
    const totalKm   = shiftHistory.reduce((s, h) => s + (h.distanceKm || 0), 0);
    const totalRides = shiftHistory.reduce((s, h) => s + h.rides, 0);
    return {
      count:    shiftHistory.length,
      totalH:   Math.round(totalMin / 60),
      avgMin:   Math.round(totalMin / shiftHistory.length),
      totalKm:  totalKm.toFixed(0),
      avgKm:    (totalKm / shiftHistory.length).toFixed(1),
      totalRides,
      avgRides: (totalRides / shiftHistory.length).toFixed(1),
    };
  }, [shiftHistory]);

  if (!shiftHistory.length) return (
    <Card theme={theme}>
      <EmptyState theme={theme} icon="🕐" text="No shifts recorded yet. Shifts need 15+ min or 1+ ride."/>
    </Card>
  );

  const fmt = (iso) => new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const fmtDate = (iso) => new Date(iso).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          ['Total shifts',  stats.count,           '#6366f1'],
          ['Total hours',   `${stats.totalH}h`,    '#F59E0B'],
          ['Avg duration',  `${stats.avgMin} min`,  '#38BDF8'],
          ['Avg km/shift',  `${stats.avgKm} km`,   '#00D27A'],
        ].map(([l, v, c]) => (
          <Card key={l} theme={theme} style={{ marginBottom: 0, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: theme.subText, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{l}</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: c }}>{v}</p>
          </Card>
        ))}
      </div>

      <Card theme={theme}>
        <CardTitle theme={theme}>Shift log — {shiftHistory.length} recorded</CardTitle>
        {[...shiftHistory].reverse().map((s, i) => {
          const color = s.rides >= 5 ? '#00D27A' : s.rides >= 1 ? theme.accent : '#F59E0B';
          return (
            <div key={i} style={{
              padding: '13px 14px', borderRadius: 12,
              background: theme.bg, border: `1px solid ${theme.border}`,
              marginBottom: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: theme.text }}>{fmtDate(s.start)}</div>
                  <div style={{ fontSize: 12, color: theme.subText, marginTop: 2 }}>
                    {fmt(s.start)} → {s.end ? fmt(s.end) : 'Active'}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color }}>{s.rides} rides</div>
                  <div style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>{s.distanceKm || 0} km</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 9px',
                  borderRadius: 6, background: `${theme.accent}18`, color: theme.accent,
                }}>⏱ {s.durationMin} min</span>
                {s.rides > 0 && (
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 9px',
                    borderRadius: 6, background: 'rgba(0,196,140,0.12)', color: '#00D27A',
                  }}>
                    {(s.distanceKm / s.rides || 0).toFixed(1)} km/ride avg
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </Card>
    </div>
  );
}