// EarningsChart.jsx — Earnings & Profit analytics sub-component
// Sections: daily/weekly/monthly trend, deductions breakdown, tips tracker

import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer, AreaChart, Area,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, Cell,
} from 'recharts';
import {
  safeNum, groupRides, TT, Card, CardTitle, EmptyState,
} from './analyticsHelpers';

// ── Period builder ────────────────────────────────────────────────────────────
function startOfWeek(d) {
  const c = new Date(d);
  c.setDate(c.getDate() - c.getDay());
  c.setHours(0, 0, 0, 0);
  return c;
}

function fmtDate(d, opts) {
  return d.toLocaleDateString('en-IN', opts);
}

function buildPeriods() {
  const today = new Date();
  return {
    day: Array.from({ length: 10 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      return {
        key: `day-${i}`,
        label: i === 0 ? 'Today' : i === 1 ? 'Yesterday'
          : fmtDate(d, { day: 'numeric', month: 'short' }),
        start: d,
        end: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999),
      };
    }),
    week: Array.from({ length: 8 }, (_, i) => {
      const sw = startOfWeek(today);
      sw.setDate(sw.getDate() - i * 7);
      const ew = new Date(sw);
      ew.setDate(ew.getDate() + 6);
      ew.setHours(23, 59, 59, 999);
      return {
        key: `wk-${i}`,
        label: i === 0 ? 'This week' : i === 1 ? 'Last week'
          : `${fmtDate(sw, { day: 'numeric', month: 'short' })} – ${fmtDate(ew, { day: 'numeric', month: 'short' })}`,
        start: new Date(sw),
        end: ew,
      };
    }),
    month: Array.from({ length: 6 }, (_, i) => {
      const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const end   = new Date(today.getFullYear(), today.getMonth() - i + 1, 0, 23, 59, 59, 999);
      return {
        key: `mo-${i}`,
        label: i === 0 ? 'This month' : i === 1 ? 'Last month'
          : fmtDate(start, { month: 'long', year: 'numeric' }),
        start,
        end,
      };
    }),
  };
}

// ── Period Selector component ─────────────────────────────────────────────────
function PeriodSelector({ tab, setTab, chipKey, setChipKey, periods, theme }) {
  const tabStyle = (t) => ({
    flex: 1,
    padding: '8px 0',
    fontSize: 13,
    fontWeight: 700,
    borderRadius: 10,
    cursor: 'pointer',
    textAlign: 'center',
    border: `1px solid ${theme.border}`,
    background: tab === t ? theme.card : 'transparent',
    color: tab === t ? theme.text : theme.subText,
    transition: 'all .15s',
  });

  const chipStyle = (key) => ({
    padding: '6px 13px',
    fontSize: 12,
    fontWeight: 600,
    borderRadius: 20,
    cursor: 'pointer',
    border: `1px solid ${chipKey === key ? theme.text : theme.border}`,
    background: chipKey === key ? theme.card : 'transparent',
    color: chipKey === key ? theme.text : theme.subText,
    transition: 'all .15s',
    whiteSpace: 'nowrap',
  });

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Tab row — Day / Week / Month */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {['day', 'week', 'month'].map(t => (
          <button
            key={t}
            style={tabStyle(t)}
            onClick={() => {
              setTab(t);
              setChipKey(periods[t][0].key);
            }}
          >
            {t === 'day' ? 'Day' : t === 'week' ? 'Week' : 'Month'}
          </button>
        ))}
      </div>

      {/* Chip row — specific periods */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {periods[tab].map(p => (
          <button key={p.key} style={chipStyle(p.key)} onClick={() => setChipKey(p.key)}>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Filter rides to selected period ──────────────────────────────────────────
function filterRides(rides, periods, tab, chipKey) {
  const selected = periods[tab].find(p => p.key === chipKey);
  if (!selected) return rides;
  return rides.filter(r => {
    const ts = new Date(r.timestamp);
    return ts >= selected.start && ts <= selected.end;
  });
}

// ── Group filtered rides for chart (by day/week/month within the period) ─────
function groupFiltered(rides, tab) {
  if (rides.length === 0) return [];

  const map = {};

  rides.forEach(r => {
    const d = new Date(r.timestamp);
    let key, label;

    if (tab === 'day') {
      // group by hour
      const h = d.getHours();
      key = `${h}`;
      label = `${h}:00`;
    } else if (tab === 'week') {
      // group by day of week
      key = d.toDateString();
      label = fmtDate(d, { weekday: 'short', day: 'numeric' });
    } else {
      // group by day within the month
      key = d.toDateString();
      label = fmtDate(d, { day: 'numeric', month: 'short' });
    }

    if (!map[key]) {
      map[key] = { label, net: 0, gross: 0, tips: 0, rides: 0, _sort: d.getTime() };
    }
    map[key].net   += safeNum(r.net);
    map[key].gross += safeNum(r.fare);
    map[key].tips  += safeNum(r.extraFare);
    map[key].rides += 1;
  });

  return Object.values(map)
    .sort((a, b) => a._sort - b._sort)
    .map(({ _sort, ...rest }) => ({
      ...rest,
      net:   Math.round(rest.net),
      gross: Math.round(rest.gross),
      tips:  Math.round(rest.tips),
    }));
}

// ── Tips aggregation ──────────────────────────────────────────────────────────
function tipStats(rides) {
  const tipped  = rides.filter(r => safeNum(r.extraFare) > 0);
  const total   = tipped.reduce((s, r) => s + safeNum(r.extraFare), 0);
  const avg     = tipped.length ? total / tipped.length : 0;
  const best    = tipped.reduce((m, r) => Math.max(m, safeNum(r.extraFare)), 0);
  const tipRate = rides.length ? (tipped.length / rides.length) * 100 : 0;
  const byPlat  = {};
  tipped.forEach(r => {
    byPlat[r.platform] = (byPlat[r.platform] || 0) + safeNum(r.extraFare);
  });
  const topPlat = Object.entries(byPlat).sort((a, b) => b[1] - a[1])[0];
  return { total, avg, best, tipRate, tipped: tipped.length, topPlat };
}

// ── Main component ────────────────────────────────────────────────────────────
export default function EarningsChart({ rides = [], settings = {}, theme }) {
  const periods = useMemo(() => buildPeriods(), []);

  const [tab,     setTab]     = useState('day');
  const [chipKey, setChipKey] = useState('day-0');

  const filteredRides = useMemo(
    () => filterRides(rides, periods, tab, chipKey),
    [rides, periods, tab, chipKey],
  );

  const data = useMemo(
    () => groupFiltered(filteredRides, tab),
    [filteredRides, tab],
  );

  const tips = useMemo(() => tipStats(filteredRides), [filteredRides]);

  const allTime = useMemo(() => {
    const net   = rides.reduce((s, r) => s + safeNum(r.net), 0);
    const gross = rides.reduce((s, r) => s + safeNum(r.fare), 0);
    const days  = new Set(rides.map(r => new Date(r.timestamp).toDateString())).size || 1;
    return {
      net:      Math.round(net),
      gross:    Math.round(gross),
      perDay:   Math.round(net / days),
      keepPct:  gross > 0 ? ((net / gross) * 100).toFixed(1) : '0',
    };
  }, [rides]);

  const goalLine = settings?.dailyGoal || 1000;

  const barColor = (net) =>
    net >= goalLine ? '#00D27A' : net >= goalLine * 0.7 ? '#F59E0B' : '#6366f1';

  // Label for the chart title based on current tab
  const periodLabel = tab === 'day' ? 'hour' : tab === 'week' ? 'day' : 'day';

  return (
    <div>
      {/* ── All-time summary strip ──────────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
        borderRadius: '20px', padding: '20px', marginBottom: '20px',
      }}>
        <p style={{
          margin: '0 0 12px', fontSize: 10, fontWeight: 800,
          color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '1px',
        }}>
          All-time earnings
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            ['Net profit',   `₹${allTime.net}`,      '#00D27A'],
            ['Gross earned', `₹${allTime.gross}`,    '#a5b4fc'],
            ['Keep rate',    `${allTime.keepPct}%`,  '#F59E0B'],
            ['Avg / day',    `₹${allTime.perDay}`,   '#38BDF8'],
          ].map(([l, v, c]) => (
            <div key={l} style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 12, padding: '12px 14px',
            }}>
              <p style={{
                margin: '0 0 3px', fontSize: 10, fontWeight: 700,
                color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.6px',
              }}>
                {l}
              </p>
              <p style={{
                margin: 0, fontSize: 20, fontWeight: 900, color: c,
                fontVariantNumeric: 'tabular-nums',
              }}>
                {v}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Period selector ─────────────────────────────────────────────── */}
      <PeriodSelector
        tab={tab}
        setTab={setTab}
        chipKey={chipKey}
        setChipKey={setChipKey}
        periods={periods}
        theme={theme}
      />

      {/* ── Per-period bar chart (color coded vs goal) ──────────────────── */}
      <Card theme={theme}>
        <CardTitle theme={theme}>
          Earnings per {periodLabel} vs goal
        </CardTitle>
        {data.length === 0 ? <EmptyState theme={theme} /> : (
          <>
            <ResponsiveContainer width="100%" height={190}>
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3" stroke={theme.border} vertical={false} />
                <XAxis dataKey="label" stroke={theme.subText} fontSize={10} interval="preserveStartEnd" />
                <YAxis stroke={theme.subText} fontSize={10} tickFormatter={v => `₹${v}`} />
                <Tooltip {...TT(theme)} formatter={v => [`₹${v}`, 'Net profit']} />
                <Bar dataKey="net" radius={[4, 4, 0, 0]}>
                  {data.map((d, i) => <Cell key={i} fill={barColor(d.net)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 10, fontSize: 11 }}>
              {[
                ['#00D27A', 'Goal hit'],
                ['#F59E0B', '≥70% of goal'],
                ['#6366f1', 'Below 70%'],
              ].map(([c, l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 5, color: theme.subText }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
                  {l}
                </div>
              ))}
            </div>
          </>
        )}
      </Card>

      {/* ── Earnings trend area chart ───────────────────────────────────── */}
      <Card theme={theme}>
        <CardTitle theme={theme}>Earnings trend</CardTitle>
        {data.length === 0 ? <EmptyState theme={theme} /> : (
          <>
            {/* Summary row: total net, total gross, rides count for selected period */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 14 }}>
              {[
                ['Net',   `₹${data.reduce((s, d) => s + d.net,   0)}`, '#00D27A'],
                ['Gross', `₹${data.reduce((s, d) => s + d.gross, 0)}`, '#a5b4fc'],
                ['Rides', `${data.reduce((s, d) => s + d.rides,  0)}`, '#38BDF8'],
              ].map(([l, v, c]) => (
                <div key={l} style={{
                  background: theme.bg, borderRadius: 10, padding: '10px 12px',
                  border: `1px solid ${theme.border}`,
                }}>
                  <p style={{
                    margin: '0 0 2px', fontSize: 10, fontWeight: 700,
                    color: theme.subText, textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>{l}</p>
                  <p style={{
                    margin: 0, fontSize: 17, fontWeight: 900, color: c,
                    fontVariantNumeric: 'tabular-nums',
                  }}>{v}</p>
                </div>
              ))}
            </div>

            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradNet" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#00D27A" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#00D27A" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradGross" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3" stroke={theme.border} vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke={theme.subText}
                  fontSize={10}
                  interval="preserveStartEnd"
                  tick={{ fill: theme.subText }}
                />
                <YAxis
                  stroke={theme.subText}
                  fontSize={10}
                  tickFormatter={v => `₹${v}`}
                  tick={{ fill: theme.subText }}
                  width={52}
                />
                <Tooltip
                  {...TT(theme)}
                  formatter={(v, name) => [
                    `₹${v}`,
                    name === 'net' ? 'Net profit' : 'Gross earned',
                  ]}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 11, color: theme.subText, paddingTop: 8 }}
                  formatter={name => name === 'net' ? 'Net profit' : 'Gross earned'}
                />
                <Area
                  type="monotone"
                  dataKey="gross"
                  stroke="#6366f1"
                  strokeWidth={1.5}
                  fill="url(#gradGross)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#6366f1' }}
                />
                <Area
                  type="monotone"
                  dataKey="net"
                  stroke="#00D27A"
                  strokeWidth={2}
                  fill="url(#gradNet)"
                  dot={false}
                  activeDot={{ r: 4, fill: '#00D27A' }}
                />
              </AreaChart>
            </ResponsiveContainer>

            {/* Gap between gross and net = platform cut */}
            {(() => {
              const totalNet   = data.reduce((s, d) => s + d.net,   0);
              const totalGross = data.reduce((s, d) => s + d.gross, 0);
              const cut        = totalGross - totalNet;
              const cutPct     = totalGross > 0 ? ((cut / totalGross) * 100).toFixed(1) : '0';
              return cut > 0 ? (
                <p style={{ margin: '10px 0 0', fontSize: 12, color: theme.subText, fontWeight: 600 }}>
                  Platform cut this period:{' '}
                  <span style={{ color: '#EF4444', fontWeight: 800 }}>₹{Math.round(cut)}</span>
                  {' '}({cutPct}% of gross)
                </p>
              ) : null;
            })()}
          </>
        )}
      </Card>

      {/* ── Tips tracker ────────────────────────────────────────────────── */}
      <Card theme={theme} style={{ border: `1px solid rgba(0,196,140,0.25)` }}>
        <CardTitle theme={theme}>🤑 Tips tracker</CardTitle>

        {tips.tipped === 0 ? (
          <EmptyState theme={theme} icon="🤑" text="No tips logged yet. Add tips when saving a ride." />
        ) : (
          <>
            {/* Stats grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
              {[
                ['Total tips', `₹${Math.round(tips.total)}`,         '#00D27A'],
                ['Tip rate',   `${Math.round(tips.tipRate)}%`,        '#F59E0B'],
                ['Avg tip',    `₹${Math.round(tips.avg)}`,            '#38BDF8'],
                ['Best tip',   `₹${Math.round(tips.best)}`,           '#EC4899'],
              ].map(([l, v, c]) => (
                <div key={l} style={{
                  background: theme.bg, borderRadius: 12, padding: '12px 14px',
                  border: `1px solid ${theme.border}`,
                }}>
                  <p style={{
                    margin: '0 0 3px', fontSize: 10, fontWeight: 700,
                    color: theme.subText, textTransform: 'uppercase', letterSpacing: '0.5px',
                  }}>
                    {l}
                  </p>
                  <p style={{
                    margin: 0, fontSize: 19, fontWeight: 900, color: c,
                    fontVariantNumeric: 'tabular-nums',
                  }}>
                    {v}
                  </p>
                </div>
              ))}
            </div>

            {/* Tips bar chart */}
            <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: theme.text }}>
              Tips earned per {periodLabel}
            </p>
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={data.filter(d => d.tips > 0)}>
                <CartesianGrid strokeDasharray="3" stroke={theme.border} vertical={false} />
                <XAxis dataKey="label" stroke={theme.subText} fontSize={10} />
                <YAxis stroke={theme.subText} fontSize={10} tickFormatter={v => `₹${v}`} />
                <Tooltip {...TT(theme)} formatter={v => [`₹${v}`, 'Tips']} />
                <Bar dataKey="tips" fill="#00D27A" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>

            {tips.topPlat && (
              <p style={{ margin: '10px 0 0', fontSize: 12, color: theme.subText, fontWeight: 600 }}>
                🏆 Best tipping platform:{' '}
                <span style={{ color: '#00D27A', fontWeight: 800 }}>
                  {tips.topPlat[0]}
                </span>{' '}
                — ₹{Math.round(tips.topPlat[1])} total
              </p>
            )}

            {/* Recent tipped rides */}
            <p style={{ margin: '14px 0 8px', fontSize: 13, fontWeight: 700, color: theme.text }}>
              Recent tipped rides
            </p>
            {filteredRides
              .filter(r => safeNum(r.extraFare) > 0)
              .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
              .slice(0, 5)
              .map((r, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '9px 12px', borderRadius: 10,
                  background: theme.bg, border: `1px solid ${theme.border}`,
                  marginBottom: 6,
                }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: theme.text }}>
                      {r.platform}
                    </span>
                    <span style={{ fontSize: 12, color: theme.subText, marginLeft: 8 }}>
                      {new Date(r.timestamp).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      {' · '}{r.dist?.toFixed(1)} km
                    </span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 900, color: '#00D27A' }}>
                    +₹{Math.round(safeNum(r.extraFare))}
                  </span>
                </div>
              ))
            }
          </>
        )}
      </Card>

      {/* ── Best / worst period insight ─────────────────────────────────── */}
      {data.length > 1 && (() => {
        const best  = [...data].sort((a, b) => b.net - a.net)[0];
        const worst = [...data].filter(d => d.rides > 0).sort((a, b) => a.net - b.net)[0];
        return (
          <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
            {[[best, '🏆 Best', '#00D27A'], [worst, '📉 Worst', '#EF4444']].map(([d, l, c]) => d ? (
              <Card key={l} theme={theme} style={{ flex: 1, marginBottom: 0 }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: theme.subText, fontWeight: 700 }}>{l}</p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: c }}>{d.label}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: theme.subText }}>
                  ₹{d.net} · {d.rides} rides
                </p>
              </Card>
            ) : null)}
          </div>
        );
      })()}
    </div>
  );
}