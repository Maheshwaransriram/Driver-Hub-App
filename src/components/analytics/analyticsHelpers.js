// analyticsHelpers.js — shared utilities for all Analytics sub-components

export const safeNum = (n) => (isFinite(Number(n)) ? Number(n) : 0);

export const PIE_COLORS = ['#6366f1','#00D27A','#F59E0B','#38BDF8','#EF4444','#EC4899'];

export const PERIOD_TABS = [
  { id: 'daily',   label: 'Days',   days: 14  },
  { id: 'weekly',  label: 'Weeks',  days: 84  },
  { id: 'monthly', label: 'Months', days: 365 },
];

export function periodKey(isoTs, period) {
  const d = new Date(isoTs);
  if (period === 'daily')
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (period === 'monthly')
    return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
  // weekly — Sunday-anchored
  const start = new Date(d);
  start.setDate(d.getDate() - d.getDay());
  start.setHours(0, 0, 0, 0);
  return start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export function groupRides(rides, period) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - PERIOD_TABS.find(p => p.id === period).days);
  const map = {};
  rides
    .filter(r => new Date(r.timestamp) >= cutoff)
    .forEach(r => {
      const k = periodKey(r.timestamp, period);
      if (!map[k]) map[k] = {
        label: k, ts: new Date(r.timestamp).getTime(),
        net: 0, gross: 0, commission: 0, fuel: 0,
        km: 0, rides: 0, tips: 0,
      };
      map[k].net        += safeNum(r.net);
      map[k].gross      += safeNum(r.fare);
      map[k].commission += safeNum(r.commAmt);
      map[k].fuel       += safeNum(r.fuelCost);
      map[k].km         += safeNum(r.dist);
      map[k].tips       += safeNum(r.extraFare); // tips tracked separately
      map[k].rides++;
    });
  return Object.values(map)
    .sort((a, b) => a.ts - b.ts)
    .map(d => ({
      ...d,
      net:        +d.net.toFixed(0),
      gross:      +d.gross.toFixed(0),
      commission: +d.commission.toFixed(0),
      fuel:       +d.fuel.toFixed(0),
      km:         +d.km.toFixed(1),
      tips:       +d.tips.toFixed(0),
    }));
}

// Shared chart tooltip style
export const TT = (theme) => ({
  contentStyle: {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: 10, fontSize: 12,
    color: theme.text,
  },
  labelStyle: { color: theme.text, fontWeight: 700 },
});

// Shared card wrapper
export function Card({ theme, children, style = {} }) {
  return (
    <div style={{
      background: theme.card,
      border: `1px solid ${theme.border}`,
      borderRadius: 16, padding: 18, marginBottom: 14,
      minHeight: 20,
      ...style,
    }}>
      {children}
    </div>
  );
}

export function CardTitle({ theme, children }) {
  return (
    <p style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 800, color: theme.text }}>
      {children}
    </p>
  );
}

export function EmptyState({ theme, icon = '📭', text = 'No data yet — start logging rides!' }) {
  return (
    <div style={{ textAlign: 'center', padding: '32px 0', color: theme.subText }}>
      <div style={{ fontSize: 36, marginBottom: 10 }}>{icon}</div>
      <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{text}</p>
    </div>
  );
}

export function PeriodToggle({ period, setPeriod }) {
  return (
    <div style={{
      display: 'flex', gap: 4, marginBottom: 14,
      background: 'rgba(0,0,0,0.2)', borderRadius: 10,
      padding: 4, width: 'fit-content',
    }}>
      {PERIOD_TABS.map(t => (
        <button key={t.id} onClick={() => setPeriod(t.id)} style={{
          padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
          fontSize: 12, fontWeight: 700,
          background: period === t.id ? 'rgba(255,255,255,0.12)' : 'transparent',
          color: period === t.id ? '#fff' : 'rgba(255,255,255,0.4)',
          transition: 'all 0.15s',
        }}>{t.label}</button>
      ))}
    </div>
  );
}