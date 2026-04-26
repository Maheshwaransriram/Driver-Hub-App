import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart, Line,
  BarChart, Bar,
  AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  PieChart, Pie, Cell
} from 'recharts';
import { globalStyles } from '../theme/theme';

const safeNum = (n) => (isFinite(Number(n)) ? Number(n) : 0);

const COLORS = {
  net:        '#00D27A',
  gross:      '#6366f1',
  commission: '#F59E0B',
  fuel:       '#EF4444',
  rides:      '#38BDF8',
};

// ── helpers ──────────────────────────────────────────────────────────────────
function startOfWeek(date) {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

function weekLabel(date) {
  const d = new Date(date);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function monthKey(date) {
  return new Date(date).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
}

function groupBy(rides, keyFn) {
  const map = {};
  rides.forEach(r => {
    const k = keyFn(new Date(r.timestamp));
    if (!map[k]) map[k] = [];
    map[k].push(r);
  });
  return map;
}

function aggregateRides(grouped) {
  return Object.entries(grouped).map(([label, rs]) => ({
    label,
    net:        parseFloat(rs.reduce((s, r) => s + safeNum(r.net), 0).toFixed(0)),
    gross:      parseFloat(rs.reduce((s, r) => s + safeNum(r.fare), 0).toFixed(0)),
    commission: parseFloat(rs.reduce((s, r) => s + safeNum(r.commAmt), 0).toFixed(0)),
    fuel:       parseFloat(rs.reduce((s, r) => s + safeNum(r.fuelCost), 0).toFixed(0)),
    km:         parseFloat(rs.reduce((s, r) => s + safeNum(r.dist), 0).toFixed(1)),
    rides:      rs.length,
    avgFare:    parseFloat((rs.reduce((s, r) => s + safeNum(r.fare), 0) / rs.length || 0).toFixed(0)),
    avgKm:      parseFloat((rs.reduce((s, r) => s + safeNum(r.dist), 0) / rs.length || 0).toFixed(1)),
  }));
}

// ── Subcomponents ─────────────────────────────────────────────────────────────
function SummaryCard({ label, value, sub, color }) {
  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid rgba(255,255,255,0.08)`,
      borderRadius: '14px', padding: '14px 16px', flex: 1,
    }}>
      <p style={{ margin: '0 0 4px', fontSize: '11px', fontWeight: '700',
        color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: color || '#fff',
        fontVariantNumeric: 'tabular-nums' }}>
        {value}
      </p>
      {sub && <p style={{ margin: '3px 0 0', fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children, theme }) {
  return (
    <div style={{
      backgroundColor: theme.card,
      border: `1px solid ${theme.border}`,
      borderRadius: '16px', padding: '18px',
      marginBottom: '16px', minHeight: '260px'
    }}>
      <p style={{ margin: '0 0 14px', fontSize: '14px', fontWeight: '800',
        color: theme.text, letterSpacing: '0.2px' }}>
        {title}
      </p>
      {children}
    </div>
  );
}

const TOOLTIP_STYLE = (theme) => ({
  contentStyle: {
    background: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: '10px',
    fontSize: '12px',
    color: theme.text,
  },
  labelStyle: { color: theme.text, fontWeight: '700' },
});

// ─────────────────────────────────────────────────────────────────────────────
export default function Analytics({ rides = [], fuelLogs = [], settings = {}, theme, onBack, initialTab = 'earnings' }) {
  const [period, setPeriod] = useState('weekly'); // daily | weekly | monthly
  const [activeChart, setActiveChart] = useState(initialTab); // earnings | rides | platform | fuel | heatmap

  const mileage   = Math.max(1, settings.mileage   || 45);
  const fuelPrice = Math.max(1, settings.fuelPrice  || 103);

  // ── Period-bucketed ride data ────────────────────────────────────────────
  const periodData = useMemo(() => {
    const now = new Date();

    let filtered = rides;
    if (period === 'daily') {
      const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 14);
      filtered = rides.filter(r => new Date(r.timestamp) >= cutoff);
    } else if (period === 'weekly') {
      const cutoff = new Date(now); cutoff.setDate(cutoff.getDate() - 84); // 12 weeks
      filtered = rides.filter(r => new Date(r.timestamp) >= cutoff);
    } else {
      const cutoff = new Date(now); cutoff.setMonth(cutoff.getMonth() - 12);
      filtered = rides.filter(r => new Date(r.timestamp) >= cutoff);
    }

    const keyFn = period === 'daily'
      ? d => d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
      : period === 'weekly'
        ? d => weekLabel(startOfWeek(d))
        : d => monthKey(d);

    const grouped = groupBy(filtered, keyFn);
    return aggregateRides(grouped).sort((a, b) =>
      new Date(a.label) - new Date(b.label)
    );
  }, [rides, period]);

  // ── Platform breakdown ───────────────────────────────────────────────────
  const platformData = useMemo(() => {
    const map = {};
    rides.forEach(r => {
      const p = r.platform || 'Other';
      if (!map[p]) map[p] = { platform: p, rides: 0, net: 0, gross: 0, km: 0 };
      map[p].rides++;
      map[p].net   += safeNum(r.net);
      map[p].gross += safeNum(r.fare);
      map[p].km    += safeNum(r.dist);
    });
    return Object.values(map).map(p => ({
      ...p,
      net:   parseFloat(p.net.toFixed(0)),
      gross: parseFloat(p.gross.toFixed(0)),
      km:    parseFloat(p.km.toFixed(1)),
    })).sort((a, b) => b.net - a.net);
  }, [rides]);

  const PIE_COLORS = ['#6366f1', '#00D27A', '#F59E0B', '#38BDF8', '#EF4444', '#EC4899'];

  // ── Hourly heatmap ───────────────────────────────────────────────────────
  const hourlyData = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, h) => ({
      hour: h, rides: 0, net: 0,
      label: h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`
    }));
    rides.forEach(r => {
      const h = new Date(r.timestamp).getHours();
      hours[h].rides++;
      hours[h].net += safeNum(r.net);
    });
    return hours.map(h => ({ ...h, net: parseFloat(h.net.toFixed(0)) }));
  }, [rides]);

  // ── Fuel trend ───────────────────────────────────────────────────────────
  const fuelTrendData = useMemo(() => {
    if (!fuelLogs.length) return [];
    return [...fuelLogs]
      .sort((a, b) => a.id - b.id)
      .map((l, i) => ({
        fill: i + 1,
        liters: safeNum(l.liters).toFixed(1),
        amount: safeNum(l.amount).toFixed(0),
        range:  parseFloat((safeNum(l.liters) * mileage).toFixed(0)),
        costPerKm: parseFloat(((safeNum(l.amount)) / (safeNum(l.liters) * mileage) || 0).toFixed(2)),
        date: l.date
          ? new Date(l.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
          : `Fill ${i + 1}`,
      }));
  }, [fuelLogs, mileage]);

  // ── Summary metrics ──────────────────────────────────────────────────────
  const summary = useMemo(() => {
    const totalNet   = rides.reduce((s, r) => s + safeNum(r.net), 0);
    const totalGross = rides.reduce((s, r) => s + safeNum(r.fare), 0);
    const totalKm    = rides.reduce((s, r) => s + safeNum(r.dist), 0);
    const totalFuel  = rides.reduce((s, r) => s + safeNum(r.fuelCost), 0);
    const days       = new Set(rides.map(r => new Date(r.timestamp).toDateString())).size || 1;
    return {
      totalNet:   totalNet.toFixed(0),
      totalGross: totalGross.toFixed(0),
      totalKm:    totalKm.toFixed(0),
      avgPerDay:  (totalNet / days).toFixed(0),
      avgPerRide: (totalNet / (rides.length || 1)).toFixed(0),
      fuelSpend:  totalFuel.toFixed(0),
      keepRate:   totalGross > 0 ? ((totalNet / totalGross) * 100).toFixed(1) : '0',
    };
  }, [rides]);

  const cardStyle = { backgroundColor: theme.card, border: `1px solid ${theme.border}`, borderRadius: '16px', padding: '18px', marginBottom: '16px' };

  const TAB_CHARTS = [
    { id: 'earnings', label: '₹ Earnings' },
    { id: 'rides',    label: '🏍 Rides' },
    { id: 'platform', label: '🏢 Platform' },
    { id: 'heatmap',  label: '🕐 Peak Hours' },
    { id: 'fuel',     label: '⛽ Fuel' },
  ];

  const PERIOD_TABS = [
    { id: 'daily',   label: '14 Days' },
    { id: 'weekly',  label: '12 Weeks' },
    { id: 'monthly', label: '12 Months' },
  ];

  return (
    <div style={{ padding: '24px', paddingTop: '70px', paddingBottom: '110px', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={onBack} style={{
          background: 'none', border: `1px solid ${theme.border}`,
          borderRadius: '10px', padding: '8px 12px', color: theme.text,
          fontSize: '18px', cursor: 'pointer', lineHeight: 1
        }}>←</button>
        <div>
          <h1 style={{ margin: 0, fontSize: '22px', fontWeight: '900', color: theme.text }}>
            📊 Analytics
          </h1>
          <p style={{ margin: 0, fontSize: '12px', color: theme.subText }}>
            {rides.length} rides · all time
          </p>
        </div>
      </div>

      {/* Summary banner */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
        borderRadius: '20px', padding: '20px', marginBottom: '20px',
      }}>
        <p style={{ margin: '0 0 12px', fontSize: '11px', fontWeight: '800',
          color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
          All-time summary
        </p>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <SummaryCard label="Net profit"   value={`₹${summary.totalNet}`}   color="#00D27A" sub={`₹${summary.avgPerDay}/day avg`} />
          <SummaryCard label="Gross earned" value={`₹${summary.totalGross}`} color="#a5b4fc" sub={`${summary.keepRate}% keep rate`} />
        </div>
        <div style={{ display: 'flex', gap: '10px', marginTop: '10px', flexWrap: 'wrap' }}>
          <SummaryCard label="Total km"     value={`${summary.totalKm} km`}  sub={`${rides.length} rides total`} />
          <SummaryCard label="Per ride avg" value={`₹${summary.avgPerRide}`} sub={`₹${summary.fuelSpend} fuel spent`} />
        </div>
      </div>

      {/* Chart type tabs */}
      <div style={{ display: 'flex', gap: '6px', marginBottom: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
        {TAB_CHARTS.map(t => (
          <button key={t.id} onClick={() => setActiveChart(t.id)} style={{
            padding: '7px 14px', borderRadius: '20px', border: 'none', cursor: 'pointer',
            fontSize: '12px', fontWeight: '700', whiteSpace: 'nowrap', flexShrink: 0,
            background: activeChart === t.id ? theme.accent : theme.bg,
            color: activeChart === t.id ? '#fff' : theme.subText,
            transition: 'all 0.2s ease',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Period tabs — only for time-series charts */}
      {['earnings', 'rides'].includes(activeChart) && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '14px',
          background: theme.bg, borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
          {PERIOD_TABS.map(t => (
            <button key={t.id} onClick={() => setPeriod(t.id)} style={{
              padding: '6px 14px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              fontSize: '12px', fontWeight: '700',
              background: period === t.id ? theme.card : 'transparent',
              color: period === t.id ? theme.text : theme.subText,
              transition: 'all 0.15s',
            }}>
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* ── EARNINGS CHART ─────────────────────────────────────────────────── */}
      {activeChart === 'earnings' && (
        <>
          <ChartCard title="Net profit vs gross earnings" theme={theme}>
            {periodData.length === 0 ? (
              <p style={{ color: theme.subText, fontSize: '13px', textAlign: 'center', paddingTop: '40px' }}>No data yet. Start logging rides!</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={periodData}>
                  <defs>
                    <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#00D27A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#00D27A" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="grossGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3" stroke={theme.border} vertical={false} />
                  <XAxis dataKey="label" stroke={theme.subText} fontSize={10} interval="preserveStartEnd" />
                  <YAxis stroke={theme.subText} fontSize={10} tickFormatter={v => `₹${v}`} />
                  <Tooltip {...TOOLTIP_STYLE(theme)}
                    formatter={(v, name) => [`₹${v}`, name === 'net' ? 'Net profit' : 'Gross fare']} />
                  <Area type="monotone" dataKey="gross" stroke="#6366f1" fill="url(#grossGrad)" strokeWidth={2} dot={false} />
                  <Area type="monotone" dataKey="net"   stroke="#00D27A" fill="url(#netGrad)"   strokeWidth={2.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Commission & fuel deductions" theme={theme}>
            {periodData.length === 0 ? null : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={periodData}>
                  <CartesianGrid strokeDasharray="3" stroke={theme.border} vertical={false} />
                  <XAxis dataKey="label" stroke={theme.subText} fontSize={10} interval="preserveStartEnd" />
                  <YAxis stroke={theme.subText} fontSize={10} tickFormatter={v => `₹${v}`} />
                  <Tooltip {...TOOLTIP_STYLE(theme)} formatter={(v, n) => [`₹${v}`, n === 'commission' ? 'Commission' : 'Fuel cost']} />
                  <Bar dataKey="commission" stackId="a" fill={COLORS.commission} radius={[0,0,0,0]} />
                  <Bar dataKey="fuel"       stackId="a" fill={COLORS.fuel}       radius={[4,4,0,0]} />
                  <Legend formatter={v => v === 'commission' ? 'Commission' : 'Fuel'} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </>
      )}

      {/* ── RIDES CHART ────────────────────────────────────────────────────── */}
      {activeChart === 'rides' && (
        <>
          <ChartCard title="Ride count per period" theme={theme}>
            {periodData.length === 0 ? (
              <p style={{ color: theme.subText, fontSize: '13px', textAlign: 'center', paddingTop: '40px' }}>No data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={periodData}>
                  <CartesianGrid strokeDasharray="3" stroke={theme.border} vertical={false} />
                  <XAxis dataKey="label" stroke={theme.subText} fontSize={10} interval="preserveStartEnd" />
                  <YAxis stroke={theme.subText} fontSize={10} allowDecimals={false} />
                  <Tooltip {...TOOLTIP_STYLE(theme)} formatter={v => [v, 'Rides']} />
                  <Bar dataKey="rides" fill={COLORS.rides} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Distance & avg fare trend" theme={theme}>
            {periodData.length === 0 ? null : (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={periodData}>
                  <CartesianGrid strokeDasharray="3" stroke={theme.border} vertical={false} />
                  <XAxis dataKey="label" stroke={theme.subText} fontSize={10} interval="preserveStartEnd" />
                  <YAxis yAxisId="km"   stroke={theme.subText} fontSize={10} tickFormatter={v => `${v}km`} />
                  <YAxis yAxisId="fare" stroke={theme.subText} fontSize={10} orientation="right" tickFormatter={v => `₹${v}`} />
                  <Tooltip {...TOOLTIP_STYLE(theme)}
                    formatter={(v, n) => n === 'km' ? [`${v} km`, 'Distance'] : [`₹${v}`, 'Avg fare']} />
                  <Line yAxisId="km"   type="monotone" dataKey="km"      stroke="#38BDF8" strokeWidth={2} dot={false} />
                  <Line yAxisId="fare" type="monotone" dataKey="avgFare" stroke="#F59E0B" strokeWidth={2} dot={false} strokeDasharray="5 3" />
                  <Legend formatter={v => v === 'km' ? 'Total km' : 'Avg fare'} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          {/* Best/worst day insight */}
          {periodData.length > 0 && (() => {
            const best  = [...periodData].sort((a, b) => b.net - a.net)[0];
            const worst = [...periodData].filter(d => d.rides > 0).sort((a, b) => a.net - b.net)[0];
            return (
              <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
                {[
                  { label: '🏆 Best period', d: best,  color: '#00D27A' },
                  { label: '📉 Worst period', d: worst, color: '#EF4444' },
                ].map(({ label, d, color }) => d ? (
                  <div key={label} style={{ ...cardStyle, flex: 1, marginBottom: 0 }}>
                    <p style={{ margin: '0 0 4px', fontSize: '11px', color: theme.subText, fontWeight: '700' }}>{label}</p>
                    <p style={{ margin: 0, fontSize: '15px', fontWeight: '900', color }}>{d.label}</p>
                    <p style={{ margin: '3px 0 0', fontSize: '12px', color: theme.subText }}>₹{d.net} · {d.rides} rides</p>
                  </div>
                ) : null)}
              </div>
            );
          })()}
        </>
      )}

      {/* ── PLATFORM BREAKDOWN ─────────────────────────────────────────────── */}
      {activeChart === 'platform' && (
        <>
          {platformData.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '40px' }}>
              <p style={{ color: theme.subText }}>No rides logged yet.</p>
            </div>
          ) : (
            <>
              <ChartCard title="Earnings by platform" theme={theme}>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={platformData}
                      dataKey="net"
                      nameKey="platform"
                      cx="50%" cy="50%"
                      outerRadius={80}
                      label={({ platform, percent }) => `${platform} ${(percent * 100).toFixed(0)}%`}
                      labelLine={false}
                    >
                      {platformData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip {...TOOLTIP_STYLE(theme)} formatter={v => [`₹${v}`, 'Net profit']} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Platform comparison" theme={theme}>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={platformData} layout="vertical">
                    <CartesianGrid strokeDasharray="3" stroke={theme.border} horizontal={false} />
                    <XAxis type="number" stroke={theme.subText} fontSize={10} tickFormatter={v => `₹${v}`} />
                    <YAxis type="category" dataKey="platform" stroke={theme.subText} fontSize={11} width={70} />
                    <Tooltip {...TOOLTIP_STYLE(theme)} formatter={(v, n) => [`₹${v}`, n === 'net' ? 'Net' : 'Gross']} />
                    <Bar dataKey="gross" fill="#6366f140" radius={[0,4,4,0]} />
                    <Bar dataKey="net"   fill="#00D27A"   radius={[0,4,4,0]} />
                    <Legend formatter={v => v === 'net' ? 'Net profit' : 'Gross fare'} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Per-platform stat rows */}
              {platformData.map((p, i) => (
                <div key={p.platform} style={{ ...cardStyle, marginBottom: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span style={{ fontWeight: '800', fontSize: '14px', color: theme.text }}>{p.platform}</span>
                    </div>
                    <span style={{ fontSize: '16px', fontWeight: '900', color: '#00D27A' }}>₹{p.net}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '10px' }}>
                    {[
                      ['Rides', p.rides],
                      ['Gross', `₹${p.gross}`],
                      ['Avg/ride', `₹${(p.net / p.rides || 0).toFixed(0)}`],
                      ['Km', `${p.km}`],
                    ].map(([l, v]) => (
                      <div key={l}>
                        <p style={{ margin: 0, fontSize: '10px', color: theme.subText, fontWeight: '700' }}>{l}</p>
                        <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: '800', color: theme.text }}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </>
          )}
        </>
      )}

      {/* ── PEAK HOURS HEATMAP ─────────────────────────────────────────────── */}
      {activeChart === 'heatmap' && (
        <>
          <ChartCard title="Rides by hour of day" theme={theme}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3" stroke={theme.border} vertical={false} />
                <XAxis dataKey="label" stroke={theme.subText} fontSize={9} interval={2} />
                <YAxis stroke={theme.subText} fontSize={10} allowDecimals={false} />
                <Tooltip {...TOOLTIP_STYLE(theme)} formatter={(v, n) => [v, n === 'rides' ? 'Rides' : 'Net ₹']} />
                <Bar dataKey="rides" fill={COLORS.rides} radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Earnings by hour of day" theme={theme}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyData}>
                <CartesianGrid strokeDasharray="3" stroke={theme.border} vertical={false} />
                <XAxis dataKey="label" stroke={theme.subText} fontSize={9} interval={2} />
                <YAxis stroke={theme.subText} fontSize={10} tickFormatter={v => `₹${v}`} />
                <Tooltip {...TOOLTIP_STYLE(theme)} formatter={v => [`₹${v}`, 'Net earnings']} />
                <Bar dataKey="net" radius={[3,3,0,0]}>
                  {hourlyData.map((entry, i) => (
                    <Cell key={i} fill={
                      entry.net >= Math.max(...hourlyData.map(h => h.net)) * 0.75 ? '#00D27A' :
                      entry.net >= Math.max(...hourlyData.map(h => h.net)) * 0.4  ? '#F59E0B' :
                      '#6366f140'
                    } />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Peak hour insight cards */}
          {(() => {
            const withRides = hourlyData.filter(h => h.rides > 0);
            if (!withRides.length) return null;
            const peakRide = [...withRides].sort((a, b) => b.rides - a.rides)[0];
            const peakEarn = [...withRides].sort((a, b) => b.net - a.net)[0];
            const deadHour = hourlyData.filter(h => h.rides === 0 && h.hour >= 6 && h.hour <= 22)[0];
            return (
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <div style={{ ...cardStyle, flex: 1, minWidth: '140px', marginBottom: 0 }}>
                  <p style={{ margin: '0 0 4px', fontSize: '11px', color: theme.subText, fontWeight: '700' }}>🔥 Busiest hour</p>
                  <p style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#38BDF8' }}>{peakRide.label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: theme.subText }}>{peakRide.rides} rides</p>
                </div>
                <div style={{ ...cardStyle, flex: 1, minWidth: '140px', marginBottom: 0 }}>
                  <p style={{ margin: '0 0 4px', fontSize: '11px', color: theme.subText, fontWeight: '700' }}>💰 Most profitable</p>
                  <p style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#00D27A' }}>{peakEarn.label}</p>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: theme.subText }}>₹{peakEarn.net} net</p>
                </div>
                {deadHour && (
                  <div style={{ ...cardStyle, flex: 1, minWidth: '140px', marginBottom: 0 }}>
                    <p style={{ margin: '0 0 4px', fontSize: '11px', color: theme.subText, fontWeight: '700' }}>😴 Dead zone</p>
                    <p style={{ margin: 0, fontSize: '18px', fontWeight: '900', color: '#EF4444' }}>{deadHour.label}</p>
                    <p style={{ margin: '2px 0 0', fontSize: '12px', color: theme.subText }}>0 rides</p>
                  </div>
                )}
              </div>
            );
          })()}
        </>
      )}

      {/* ── FUEL ANALYTICS ─────────────────────────────────────────────────── */}
      {activeChart === 'fuel' && (
        <>
          {fuelTrendData.length === 0 ? (
            <div style={{ ...cardStyle, textAlign: 'center', padding: '40px' }}>
              <p style={{ fontSize: '32px', margin: '0 0 12px' }}>⛽</p>
              <p style={{ color: theme.subText, fontSize: '13px', margin: 0 }}>No fuel logs yet. Add your first fill-up in the Fuel tab.</p>
            </div>
          ) : (
            <>
              <ChartCard title="Fuel fill-up history (litres)" theme={theme}>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={fuelTrendData}>
                    <CartesianGrid strokeDasharray="3" stroke={theme.border} vertical={false} />
                    <XAxis dataKey="date" stroke={theme.subText} fontSize={10} />
                    <YAxis stroke={theme.subText} fontSize={10} tickFormatter={v => `${v}L`} />
                    <Tooltip {...TOOLTIP_STYLE(theme)} formatter={(v, n) => [
                      n === 'liters' ? `${v} L` : n === 'amount' ? `₹${v}` : `${v} km`,
                      n === 'liters' ? 'Litres filled' : n === 'amount' ? 'Amount paid' : 'Range'
                    ]} />
                    <Bar dataKey="liters" fill="#F59E0B" radius={[4,4,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Range per fill-up (km)" theme={theme}>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={fuelTrendData}>
                    <CartesianGrid strokeDasharray="3" stroke={theme.border} vertical={false} />
                    <XAxis dataKey="date" stroke={theme.subText} fontSize={10} />
                    <YAxis stroke={theme.subText} fontSize={10} tickFormatter={v => `${v}km`} />
                    <Tooltip {...TOOLTIP_STYLE(theme)} formatter={v => [`${v} km`, 'Range']} />
                    <Line type="monotone" dataKey="range" stroke="#00D27A" strokeWidth={2.5} dot={{ r: 4, fill: '#00D27A' }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              <ChartCard title="Cost per km trend (₹/km)" theme={theme}>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={fuelTrendData}>
                    <CartesianGrid strokeDasharray="3" stroke={theme.border} vertical={false} />
                    <XAxis dataKey="date" stroke={theme.subText} fontSize={10} />
                    <YAxis stroke={theme.subText} fontSize={10} tickFormatter={v => `₹${v}`} />
                    <Tooltip {...TOOLTIP_STYLE(theme)} formatter={v => [`₹${v}/km`, 'Fuel cost per km']} />
                    <Line type="monotone" dataKey="costPerKm" stroke="#EF4444" strokeWidth={2} dot={{ r: 3, fill: '#EF4444' }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Fuel summary stats */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                {[
                  ['Total fills', fuelTrendData.length],
                  ['Total spent', `₹${fuelTrendData.reduce((s, l) => s + Number(l.amount), 0).toFixed(0)}`],
                  ['Total litres', `${fuelTrendData.reduce((s, l) => s + Number(l.liters), 0).toFixed(1)} L`],
                  ['Avg range', `${(fuelTrendData.reduce((s, l) => s + Number(l.range), 0) / fuelTrendData.length).toFixed(0)} km`],
                ].map(([l, v]) => (
                  <div key={l} style={{ ...cardStyle, flex: 1, minWidth: '130px', marginBottom: '10px', textAlign: 'center' }}>
                    <p style={{ margin: '0 0 4px', fontSize: '11px', color: theme.subText, fontWeight: '700' }}>{l}</p>
                    <p style={{ margin: 0, fontSize: '17px', fontWeight: '900', color: theme.text }}>{v}</p>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}