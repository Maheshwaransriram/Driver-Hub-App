import React, { useState, useMemo, useCallback } from 'react';
import StatCard from './StatCard';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip
} from 'recharts';
import { globalStyles } from '../theme/theme';

export default function Dashboard({
  rides = [],
  fuelPercentage,
  remainingRange,
  fuelValue,
  currentLiters,
  settings,
  theme,
  onDelete,
  onAddRide,
  shiftHistory = [],
  onNavigate,
}) {
  const [showAllRides, setShowAllRides] = useState(false);
  const [expandedRideId, setExpandedRideId] = useState(null);
  const [fabPressed, setFabPressed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  // ── Memoized calculations ─────────────────────────────────────────────────
  const todayRides = useMemo(() => {
    const today = new Date().toDateString();
    return rides.filter(r => {
      try { return new Date(r.timestamp).toDateString() === today; }
      catch { return false; }
    });
  }, [rides]);

  const stats = useMemo(() => {
    const safeNum = (n) => isFinite(n) ? Number(n) : 0;
    return {
      net:        todayRides.reduce((acc, r) => acc + safeNum(r.net), 0),
      gross:      todayRides.reduce((acc, r) => acc + safeNum(r.fare), 0),
      totalKm:    todayRides.reduce((acc, r) => acc + safeNum(r.dist), 0),
      commission: todayRides.reduce((acc, r) => acc + safeNum(r.commAmt), 0),
      taxes:      todayRides.reduce((acc, r) => acc + safeNum(r.taxAmt), 0),
    };
  }, [todayRides]);

  const displayRides = useMemo(() =>
    showAllRides
      ? [...rides].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      : todayRides,
    [showAllRides, rides, todayRides]
  );

  const dailyGoal  = settings?.dailyGoal || 1000;
  const rideGoal   = settings?.rideGoal  || 15;
  const goalPct    = Math.min(100, (stats.net / dailyGoal) * 100);
  const ridePct    = Math.min(100, (todayRides.length / rideGoal) * 100);
  const goalReached = stats.net >= dailyGoal;
  const remaining  = Math.max(0, dailyGoal - stats.net);

  const goalStatus = goalReached         ? '🎉 Goal Reached!'  :
    goalPct >= 75  ? '🔥 Almost there!' :
    goalPct >= 50  ? '💪 Halfway there' :
    goalPct >= 25  ? '🚀 Keep going!'   : '🏁 Just started';

  const chartData = useMemo(() => {
    const days = {};
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    rides.forEach(r => {
      try {
        const date = new Date(r.timestamp);
        if (date >= oneWeekAgo) {
          const day = date.toLocaleDateString('en-IN', { weekday: 'short' });
          days[day] = (days[day] || 0) + (isFinite(r.net) ? Number(r.net) : 0);
        }
      } catch {}
    });
    return Object.entries(days)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, net]) => ({ day, net: parseFloat(net.toFixed(2)) }));
  }, [rides]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleFabClick = useCallback(() => {
    setFabPressed(true);
    setTimeout(() => { setFabPressed(false); onAddRide?.(); }, 200);
  }, [onAddRide]);

  const handleDelete = useCallback((id) => {
    try { if (!window.confirm('Delete this ride? This cannot be undone.')) return; }
    catch {}
    onDelete?.(id);
    setExpandedRideId(null);
  }, [onDelete]);

  const toggleRide = useCallback((id) => {
    setExpandedRideId(prev => prev === id ? null : id);
  }, []);

  const isLowFuel = remainingRange <= 15;

  // ── Shared card base ──────────────────────────────────────────────────────
  const card = (children, extra = {}) => (
    <div style={{
      backgroundColor: theme.card,
      border: `1px solid ${theme.border}`,
      borderRadius: 20,
      padding: '20px',
      marginBottom: 16,
      ...extra,
    }}>
      {children}
    </div>
  );

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      padding: '20px', paddingTop: '68px', paddingBottom: '110px',
      boxSizing: 'border-box', maxWidth: '600px', margin: '0 auto'
    }}>

      {/* ── Side-drawer overlay ─────────────────────────────────────────── */}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{
          position: 'fixed', inset: 0, zIndex: 999,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
        }} />
      )}
      <div style={{
        position: 'fixed', top: 0, left: menuOpen ? 0 : '-290px',
        width: '270px', height: '100vh', zIndex: 1000,
        background: theme.card, borderRight: `1px solid ${theme.border}`,
        boxShadow: menuOpen ? '12px 0 40px rgba(0,0,0,0.4)' : 'none',
        transition: 'left 0.3s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
        paddingTop: '64px', paddingBottom: '24px', overflowY: 'auto',
      }}>
        <div style={{ padding: '0 20px 20px', borderBottom: `1px solid ${theme.border}`, marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10,
              background: 'linear-gradient(135deg, #7FE832, #00D27A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
            }}>🚀</div>
            <div>
              <div style={{ fontWeight: '900', fontSize: 16, color: theme.text }}>
                Drive<span style={{ color: '#7FE832' }}>X</span> Hub
              </div>
              <div style={{ fontSize: 11, color: theme.subText }}>Driver Dashboard</div>
            </div>
          </div>
        </div>

        {[
          { icon: '🏠', label: 'Home',     screen: 'dashboard' },
          { icon: '⏱️', label: 'Shifts',   screen: 'shifts' },
          { icon: '📍', label: 'Map',      screen: 'navigation' },
          { icon: '⛽', label: 'Fuel',     screen: 'fuel' },
          { icon: '📊', label: 'Analytics',screen: 'analytics' },
          { icon: '⚙️', label: 'Settings', screen: 'settings' },
        ].map(({ icon, label, screen }) => (
          <button key={screen}
            onClick={() => { onNavigate?.(screen); setMenuOpen(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 14,
              padding: '13px 20px', border: 'none', background: 'none',
              color: theme.text, cursor: 'pointer', fontSize: 15, fontWeight: '700',
              textAlign: 'left', width: '100%', borderRadius: 10, margin: '2px 8px',
              width: 'calc(100% - 16px)',
            }}
            onMouseEnter={e => e.currentTarget.style.background = `${theme.accent}18`}
            onMouseLeave={e => e.currentTarget.style.background = 'none'}
          >
            <span style={{ fontSize: 20 }}>{icon}</span>{label}
          </button>
        ))}

        {shiftHistory.length > 0 && (
          <div style={{ margin: '12px 12px 0', padding: 12, background: theme.bg, borderRadius: 12, border: `1px solid ${theme.border}` }}>
            <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: '800', color: theme.subText, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
              Recent Shifts
            </p>
            {shiftHistory.slice(0, 5).map((s, i) => (
              <div key={i} style={{ marginBottom: 8, paddingBottom: 8, borderBottom: i < Math.min(4, shiftHistory.length - 1) ? `1px solid ${theme.border}` : 'none' }}>
                <div style={{ fontSize: 12, fontWeight: '700', color: theme.text }}>
                  {new Date(s.start).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
                </div>
                <div style={{ fontSize: 11, color: theme.subText, marginTop: 2 }}>
                  {new Date(s.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} – {s.end ? new Date(s.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                  {' • '}{Math.round(s.durationMin)} min{s.rides > 0 ? ` • ${s.rides} rides` : ''}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
          width: '44px', height: '44px', borderRadius: '12px', 
          background: 'linear-gradient(135deg, #7FE832, #00D27A)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(127, 232, 50, 0.4)'
        }}>
          🚀
          </div>
          <div>
            <h1 style={{ margin: 0, color: theme.text, fontSize: 22, fontWeight: '900', letterSpacing: '-0.02em', lineHeight: 1.1 }}>
              Drive<span style={{ color: '#7FE832' }}>X</span> Hub
            </h1>
            <p style={{ margin: '3px 0 0', fontSize: 11, color: theme.subText, fontWeight: '600' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}
            </p>
          </div>
        </div>
        {/* Quick analytics shortcut */}
        <button onClick={() => onNavigate?.('analytics')} style={{
          padding: '8px 14px', borderRadius: 12,
          border: `1px solid ${theme.border}`,
          background: theme.card, color: theme.subText,
          fontSize: 12, fontWeight: '700', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          📊 <span>Trends</span>
        </button>
      </div>

      {/* ── Net profit hero card ─────────────────────────────────────────── */}
      <div style={{
        background: goalReached
          ? 'linear-gradient(135deg, #00D27A, #059669)'
          : 'linear-gradient(135deg, #6366f1, #4f46e5)',
        borderRadius: 24, padding: '24px 24px 20px',
        marginBottom: 14,
        boxShadow: goalReached
          ? '0 12px 32px rgba(0,210,122,0.28)'
          : '0 12px 32px rgba(99,102,241,0.28)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decorative ring */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 120, height: 120, borderRadius: '50%',
          background: 'rgba(255,255,255,0.08)',
        }} />
        <div style={{
          position: 'absolute', bottom: -20, right: 20,
          width: 70, height: 70, borderRadius: '50%',
          background: 'rgba(255,255,255,0.06)',
        }} />
        <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: '800', color: 'rgba(255,255,255,0.75)', letterSpacing: '1px', textTransform: 'uppercase' }}>
          Today's Net Profit
        </p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <div style={{ fontSize: 52, fontWeight: '900', color: '#fff', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
            ₹{stats.net.toFixed(0)}
          </div>
          <div style={{ textAlign: 'right', paddingBottom: 4 }}>
            <div style={{ fontSize: 20, fontWeight: '900', color: 'rgba(255,255,255,0.9)' }}>
              {todayRides.length}
            </div>
            <div style={{ fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase' }}>
              rides
            </div>
          </div>
        </div>
        {/* Goal progress strip */}
        <div style={{ marginTop: 18 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)' }}>
            <span>{goalStatus}</span>
            <span>{goalPct.toFixed(0)}% of ₹{dailyGoal}</span>
          </div>
          <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.2)', overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${goalPct}%`,
              background: '#fff',
              transition: 'width 0.6s ease',
            }} />
          </div>
        </div>
      </div>

      {/* ── Quick stat row ───────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Gross',      value: `₹${stats.gross.toFixed(0)}`,      color: theme.text },
          { label: 'Distance',   value: `${stats.totalKm.toFixed(1)} km`,   color: '#6366f1'  },
          { label: 'Commission', value: `₹${stats.commission.toFixed(0)}`,  color: '#FF4757'  },
        ].map(({ label, value, color }) => (
          <div key={label} style={{
            backgroundColor: theme.card,
            border: `1px solid ${theme.border}`,
            borderRadius: 16, padding: '14px 12px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: 18, fontWeight: '900', color, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
            <div style={{ fontSize: 10, fontWeight: '700', color: theme.subText, marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
          </div>
        ))}
      </div>

      {/* ── Fuel status ──────────────────────────────────────────────────── */}
      {card(
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>⛽</span>
              <span style={{ fontWeight: '800', fontSize: 14, color: theme.text }}>Fuel</span>
              {isLowFuel && (
                <span style={{ fontSize: 10, fontWeight: '800', color: '#FF4757', background: 'rgba(255,71,87,0.1)', padding: '3px 8px', borderRadius: 6 }}>
                  LOW
                </span>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontWeight: '900', fontSize: 18, color: isLowFuel ? '#FF4757' : '#00D27A' }}>
                {remainingRange.toFixed(0)} km
              </span>
              <div style={{ fontSize: 11, color: theme.subText }}>
                {currentLiters.toFixed(1)} L · ₹{fuelValue.toFixed(0)}
              </div>
            </div>
          </div>
          <div style={{ height: 10, background: theme.bg, borderRadius: 5, overflow: 'hidden' }}>
            <div style={{
              width: `${Math.min(100, fuelPercentage)}%`, height: '100%', borderRadius: 5,
              background: isLowFuel
                ? 'linear-gradient(90deg, #FF4757, #FF6B6B)'
                : 'linear-gradient(90deg, #00D27A, #059669)',
              transition: 'width 0.6s ease',
            }} />
          </div>
        </>,
        { borderColor: isLowFuel ? '#FF4757' : theme.border }
      )}

      {/* ── Goal progress (rides) ────────────────────────────────────────── */}
      {card(
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>🎯</span>
              <span style={{ fontWeight: '800', fontSize: 14, color: theme.text }}>Daily Target</span>
            </div>
            <span style={{ fontSize: 12, color: theme.subText, fontWeight: '600' }}>
              {todayRides.length} / {rideGoal} rides
            </span>
          </div>
          <div style={{ height: 8, background: theme.bg, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{
              width: `${ridePct}%`, height: '100%', borderRadius: 4,
              background: ridePct >= 100 ? '#00D27A' : '#A78BFA',
              transition: 'width 0.6s ease',
            }} />
          </div>
          {!goalReached && (
            <div style={{ fontSize: 11, color: theme.subText, marginTop: 6, fontWeight: '600' }}>
              ₹{remaining.toFixed(0)} to reach ₹{dailyGoal} goal
            </div>
          )}
        </>,
        { borderColor: goalReached ? '#00D27A' : theme.border }
      )}

      {/* ── Weekly chart ─────────────────────────────────────────────────── */}
      {chartData.length > 0 && card(
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 15, color: theme.text, fontWeight: '800' }}>
              📈 7-Day Earnings
            </h3>
            <button onClick={() => onNavigate?.('analytics')} style={{
              fontSize: 11, color: theme.accent, fontWeight: '700',
              background: `${theme.accent}14`, border: `1px solid ${theme.accent}30`,
              borderRadius: 8, padding: '4px 10px', cursor: 'pointer',
            }}>
              Full view →
            </button>
          </div>
          <div style={{ minHeight: 200 }}>
            <ResponsiveContainer width="100%" height={190}>
              <LineChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={theme.border} vertical={false} />
                <XAxis dataKey="day" stroke={theme.subText} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={theme.subText} fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip
                  formatter={(v) => [`₹${Number(v).toFixed(0)}`, 'Net Earnings']}
                  contentStyle={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: 10, fontSize: 12 }}
                  labelStyle={{ color: theme.text, fontWeight: '700' }}
                  cursor={{ stroke: theme.accent, strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Line type="monotone" dataKey="net" stroke="#00D27A" strokeWidth={2.5} dot={{ r: 4, fill: '#00D27A', strokeWidth: 0 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </>
      )}

      {/* ── Rides list ───────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 120 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, color: theme.text, fontWeight: '800', margin: 0 }}>
            {showAllRides ? '📋 All Rides' : '🏍️ Today'}
          </h2>
          <div style={{ display: 'flex', gap: 1, borderRadius: 10, overflow: 'hidden', border: `1px solid ${theme.border}` }}>
            {[['Today', false], ['History', true]].map(([label, all]) => (
              <button key={label} onClick={() => setShowAllRides(all)} style={{
                padding: '7px 14px', border: 'none', cursor: 'pointer',
                fontSize: 12, fontWeight: '700',
                background: showAllRides === all ? theme.accent : theme.card,
                color: showAllRides === all ? '#fff' : theme.text,
                transition: 'all 0.2s',
              }} aria-pressed={showAllRides === all}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {displayRides.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '44px 24px',
            color: theme.subText, backgroundColor: theme.card,
            borderRadius: 20, border: `1px dashed ${theme.border}`,
          }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>
              {showAllRides ? '📭' : '🛵'}
            </div>
            <div style={{ fontSize: 15, fontWeight: '700', color: theme.text, marginBottom: 6 }}>
              {showAllRides ? 'No rides logged yet' : 'No rides today'}
            </div>
            <div style={{ fontSize: 13 }}>
              {showAllRides ? 'Get started with your first ride!' : 'Great day to start earning! 🚀'}
            </div>
          </div>
        ) : (
          displayRides.map((ride, index) => {
            const rideDate = new Date(ride.timestamp).toDateString();
            const prevDate = index > 0 ? new Date(displayRides[index - 1].timestamp).toDateString() : null;
            const showDateHeader = showAllRides && rideDate !== prevDate;
            const isToday = rideDate === new Date().toDateString();
            const isExpanded = expandedRideId === ride.id;

            return (
              <div key={ride.id}>
                {showDateHeader && (
                  <div style={{
                    fontSize: 11, fontWeight: '800', color: theme.subText,
                    letterSpacing: '1px', textTransform: 'uppercase',
                    padding: '10px 4px 8px',
                  }}>
                    {isToday ? '📅 TODAY' : `📅 ${new Date(ride.timestamp).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`}
                  </div>
                )}

                <div
                  role="button" tabIndex={0}
                  style={{
                    backgroundColor: theme.card,
                    border: `1px solid ${isExpanded ? theme.accent : theme.border}`,
                    borderRadius: 18, padding: '18px 18px',
                    marginBottom: 10, cursor: 'pointer',
                    transition: 'border-color 0.2s, transform 0.15s',
                    transform: isExpanded ? 'scale(1.005)' : 'scale(1)',
                  }}
                  onClick={() => toggleRide(ride.id)}
                  onKeyDown={e => e.key === 'Enter' && toggleRide(ride.id)}
                  aria-expanded={isExpanded}
                >
                  {/* Summary row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: '900', fontSize: 15, color: theme.accent }}>{ride.platform}</span>
                        {ride.isNight && (
                          <span style={{ fontSize: 10, background: 'rgba(167,139,250,0.18)', color: '#A78BFA', padding: '2px 7px', borderRadius: 6, fontWeight: '700' }}>🌙 Night</span>
                        )}
                        {ride.extraFare > 0 && (
                          <span style={{ fontSize: 10, background: 'rgba(0,210,122,0.18)', color: '#00D27A', padding: '2px 7px', borderRadius: 6, fontWeight: '700' }}>+Tip</span>
                        )}
                      </div>
                      <p style={{ fontSize: 12, color: theme.subText, margin: 0 }}>
                        {ride.dist?.toFixed(1)} km · {new Date(ride.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {ride.fare > 0 && ` · ₹${Number(ride.fare || 0).toFixed(0)} fare`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#00D27A', fontWeight: '900', fontSize: 22, fontVariantNumeric: 'tabular-nums' }}>
                          ₹{Number(ride.net || 0).toFixed(0)}
                        </div>
                        <div style={{ fontSize: 10, color: theme.subText }}>net</div>
                      </div>
                      <span style={{
                        color: theme.subText, fontSize: 13,
                        display: 'inline-block',
                        transition: 'transform 0.3s ease',
                        transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      }}>▼</span>
                    </div>
                  </div>

                  {/* Expanded breakdown */}
                  {isExpanded && (
                    <div style={{ marginTop: 18, paddingTop: 18, borderTop: `1px solid ${theme.border}` }}>
                      {[
                        ride.fare > 0          && ['App Fare',        `₹${Number(ride.fare||0).toFixed(2)}`,          theme.text],
                        ride.extraFare > 0     && ['Tip',             `+₹${Number(ride.extraFare||0).toFixed(2)}`,    '#00D27A'],
                        ride.commAmt > 0       && ['Commission',      `-₹${Number(ride.commAmt||0).toFixed(2)}`,      '#FF4757'],
                        ride.taxAmt > 0        && ['GST Tax',         `-₹${Number(ride.taxAmt||0).toFixed(2)}`,       '#FF7B35'],
                        ride.platformFee > 0   && ['Platform Fee',    `-₹${Number(ride.platformFee||0).toFixed(2)}`,  '#FF7B35'],
                        ride.thirdPartyFee > 0 && ['Insurance',       `-₹${Number(ride.thirdPartyFee||0).toFixed(2)}`, '#FF7B35'],
                        ride.extraDeduct > 0   && ['Deduction',       `-₹${Number(ride.extraDeduct||0).toFixed(2)}`,  '#FF4757'],
                        ride.fuelCost > 0      && ['Fuel Cost',       `-₹${Number(ride.fuelCost||0).toFixed(2)}`,     '#FCD34D'],
                      ].filter(Boolean).map(([label, value, color]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <span style={{ fontSize: 13, color: theme.subText }}>{label}</span>
                          <span style={{ fontSize: 13, fontWeight: '700', color, fontFamily: 'monospace' }}>{value}</span>
                        </div>
                      ))}

                      <div style={{ height: 1, background: theme.border, margin: '14px 0' }} />

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                        <span style={{ fontSize: 14, fontWeight: '800', color: theme.text }}>You earned</span>
                        <span style={{ fontSize: 24, fontWeight: '900', color: '#00D27A', fontFamily: 'monospace' }}>
                          ₹{Number(ride.net || 0).toFixed(2)}
                        </span>
                      </div>

                      {ride.dist > 0 && ride.net > 0 && (
                        <p style={{ fontSize: 12, color: theme.subText, textAlign: 'right', fontWeight: '700', marginBottom: 12 }}>
                          💰 ₹{(ride.net / ride.dist).toFixed(2)} per km
                        </p>
                      )}

                      {ride.notes && (
                        <p style={{ fontSize: 12, color: theme.subText, fontStyle: 'italic', marginBottom: 14, padding: '8px 12px', background: theme.bg, borderRadius: 8, border: `1px solid ${theme.border}` }}>
                          📝 {ride.notes}
                        </p>
                      )}

                      <button
                        onClick={e => { e.stopPropagation(); handleDelete(ride.id); }}
                        style={{
                          width: '100%', padding: '11px', borderRadius: 10,
                          border: '1px solid #FF4757', background: 'rgba(255,71,87,0.08)',
                          color: '#FF4757', fontWeight: '700', fontSize: 13, cursor: 'pointer',
                        }}
                        aria-label={`Delete ${ride.platform} ride`}
                      >
                        🗑️ Delete Ride
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ── FAB ──────────────────────────────────────────────────────────── */}
      <style>{`
        @keyframes fab-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(99,102,241,0.55); }
          70%  { box-shadow: 0 0 0 18px rgba(99,102,241,0); }
          100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
        }
        .fab-btn { animation: fab-pulse 2.2s ease-out infinite; }
      `}</style>
      <div style={{
        position: 'fixed', bottom: '90px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
      }}>
        <div style={{
          backgroundColor: theme.card, border: `1px solid ${theme.border}`,
          borderRadius: 20, padding: '5px 14px', fontSize: 11,
          fontWeight: '800', color: theme.subText, letterSpacing: '0.5px', whiteSpace: 'nowrap',
        }}>
          ADD RIDE
        </div>
        <button className="fab-btn" onClick={handleFabClick} style={{
          width: 64, height: 64, borderRadius: '50%', border: 'none',
          background: 'linear-gradient(135deg, #818CF8, #6366f1)',
          color: '#fff', fontSize: 30, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transform: fabPressed ? 'scale(0.9)' : 'scale(1)',
          transition: 'transform 0.15s ease', outline: 'none',
        }} aria-label="Add new ride">
          +
        </button>
      </div>
    </div>
  );
}