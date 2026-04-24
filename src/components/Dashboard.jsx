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
  onAddRide 
}) {
  // NOTE: rides come from App.jsx (already persisted there via dh_rides).
  // Dashboard is a pure display component — it does NOT maintain its own
  // rides state or localStorage. Doing so caused a split-brain bug where
  // App and Dashboard held different ride lists after the first render.
  const [showAllRides, setShowAllRides] = useState(false);
  const [expandedRideId, setExpandedRideId] = useState(null);
  const [fabPressed, setFabPressed] = useState(false);

  // Memoized calculations - prevents recalc on every render
  const todayRides = useMemo(() => {
    const today = new Date().toDateString();
    return rides.filter(r => {
      try {
        return new Date(r.timestamp).toDateString() === today;
      } catch {
        return false;
      }
    });
  }, [rides]);

  const stats = useMemo(() => {
    const safeNum = (n) => isFinite(n) ? Number(n) : 0;
    return {
      net: todayRides.reduce((acc, r) => acc + safeNum(r.net), 0),
      gross: todayRides.reduce((acc, r) => acc + safeNum(r.fare), 0),
      totalKm: todayRides.reduce((acc, r) => acc + safeNum(r.dist), 0),
      commission: todayRides.reduce((acc, r) => acc + safeNum(r.commAmt), 0),
      taxes: todayRides.reduce((acc, r) => acc + safeNum(r.taxAmt), 0),
    };
  }, [todayRides]);

  const displayRides = useMemo(() => 
    showAllRides ? [...rides].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)) : todayRides,
    [showAllRides, rides, todayRides]
  );

  // Goal tracking
  const dailyGoal = settings?.dailyGoal || 1000;
  const rideGoal = settings?.rideGoal || 15;
  const goalPct = Math.min(100, (stats.net / dailyGoal) * 100);
  const ridePct = Math.min(100, (todayRides.length / rideGoal) * 100);
  const goalReached = stats.net >= dailyGoal;
  const remaining = Math.max(0, dailyGoal - stats.net);

  const goalStatus = goalReached ? '🎉 Goal Reached!' :
    goalPct >= 75 ? '🔥 Almost there!' :
    goalPct >= 50 ? '💪 Halfway there' :
    goalPct >= 25 ? '🚀 Keep going!' : '🏁 Just started';

  // Charts data (last 7 days) — uses all rides, NOT displayRides
  // so the chart doesn't change when user toggles Today/History
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
      } catch { /* skip corrupt timestamp */ }
    });

    return Object.entries(days)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, net]) => ({ day, net: parseFloat(net.toFixed(2)) }));
  }, [rides]); // FIX: was [displayRides] — recalculated every time toggle changed

  // Event handlers with useCallback
  const handleFabClick = useCallback(() => {
    setFabPressed(true);
    setTimeout(() => {
      setFabPressed(false);
      onAddRide?.();
    }, 200);
  }, [onAddRide]);

  const handleDelete = useCallback((id) => {
    // window.confirm works in browser dev; on Android WebView it returns true
    // without showing (silently). We guard with a try/catch and always delegate
    // the actual state update to App via onDelete — Dashboard never mutates rides.
    try {
      if (!window.confirm('Delete this ride? This cannot be undone.')) return;
    } catch {
      // WebView blocked confirm — proceed without confirmation
    }
    onDelete?.(id);
    setExpandedRideId(null); // close expanded card after delete
  }, [onDelete]);

  const toggleRide = useCallback((id) => {
    setExpandedRideId(expandedRideId === id ? null : id);
  }, [expandedRideId]);

  const isLowFuel = remainingRange <= 15;

  // Styles (extracted for reuse)
  const cardStyle = {
    backgroundColor: theme.card,
    border: `1px solid ${theme.border}`,
    borderRadius: '16px',
    padding: '20px',
    marginBottom: '20px',
  };

  return (
    <div style={{ padding: '24px', paddingTop: '70px', paddingBottom: '100px', boxSizing: 'border-box', maxWidth: '800px', margin: '0 auto' }}>
      
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <div style={{
          width: '44px', height: '44px', borderRadius: '12px', 
          background: 'linear-gradient(135deg, #7FE832, #00D27A)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(127, 232, 50, 0.4)'
        }}>
          🚀
        </div>
        <div>
          <h1 style={{ 
            margin: 0, color: theme.text, fontSize: '28px', fontWeight: '900', 
            lineHeight: 1.1, letterSpacing: '-0.02em'
          }}>
            Drive<span style={{ color: '#7FE832' }}>X</span> Hub
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '13px', color: theme.subText, fontWeight: '600' }}>
            {new Date().toLocaleDateString('en-IN', { 
              weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' 
            })}
          </p>
        </div>
      </div>

      {/* Fuel Monitor */}
      <div style={{ 
        ...cardStyle, 
        borderColor: isLowFuel ? '#FF4757' : theme.accent,
        borderWidth: isLowFuel ? '2px' : '1px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>⛽</span>
            <span style={{ fontWeight: '800', fontSize: '15px', color: theme.text }}>Fuel Status</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ 
              fontWeight: '900', fontSize: '20px', 
              color: isLowFuel ? '#FF4757' : '#00D27A' 
            }}>
              {remainingRange.toFixed(1)} km
            </div>
            <div style={{ fontSize: '12px', color: theme.subText }}>
              {currentLiters.toFixed(2)} L • ₹{fuelValue.toFixed(0)}
            </div>
          </div>
        </div>
        <div style={{ 
          width: '100%', height: '12px', background: theme.bg, 
          borderRadius: '6px', overflow: 'hidden' 
        }}>
          <div style={{ 
            width: `${fuelPercentage}%`, height: '100%',
            background: isLowFuel 
              ? 'linear-gradient(90deg, #FF4757, #FF6B6B)' 
              : 'linear-gradient(90deg, #00D27A, #059669)',
            borderRadius: '6px', transition: 'width 0.6s ease'
          }} />
        </div>
        {isLowFuel && (
          <div style={{ 
            textAlign: 'center', marginTop: '12px', 
            padding: '8px', background: 'rgba(255,71,87,0.1)', 
            borderRadius: '8px', fontSize: '12px', fontWeight: '700', color: '#FF4757'
          }}>
            ⚠️ Low fuel - time to refill!
          </div>
        )}
      </div>

      {/* Profit & Rides Highlight */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ 
          background: 'linear-gradient(135deg, #00D27A, #059669)', 
          padding: '28px', borderRadius: '20px', color: 'white',
          boxShadow: '0 10px 30px rgba(0,210,122,0.3)'
        }}>
          <p style={{ fontSize: '13px', fontWeight: '800', margin: 0, opacity: 0.9 }}>TODAY'S NET PROFIT</p>
          <div style={{ fontSize: '48px', fontWeight: '900', margin: '12px 0 0 0' }}>
            ₹{stats.net.toFixed(0)}
          </div>
        </div>
        <div style={{ 
          ...cardStyle, textAlign: 'center', padding: '28px 20px',
          borderColor: theme.accent
        }}>
          <p style={{ fontSize: '13px', color: theme.subText, fontWeight: '800', margin: 0 }}>COMPLETED</p>
          <div style={{ fontSize: '48px', fontWeight: '900', color: theme.text, margin: '8px 0 0 0' }}>
            {todayRides.length}
          </div>
        </div>
      </div>

      {/* Goal Tracker */}
      <div style={{ 
        ...cardStyle, 
        borderColor: goalReached ? '#00D27A' : theme.border,
        marginBottom: '24px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🎯</span>
              <span style={{ fontWeight: '800', fontSize: '15px', color: theme.text }}>Daily Target</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: goalReached ? '#00D27A' : theme.subText }}>
              {goalStatus}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', fontWeight: '900', color: goalReached ? '#00D27A' : theme.text }}>
              ₹{stats.net.toFixed(0)} / ₹{dailyGoal}
            </div>
            {!goalReached && (
              <div style={{ fontSize: '12px', color: theme.subText }}>
                ₹{remaining.toFixed(0)} remaining
              </div>
            )}
          </div>
        </div>
        
        {/* Earnings Progress */}
        <div style={{ marginBottom: '16px' }}>
          <div style={{ height: '12px', background: theme.bg, borderRadius: '6px', overflow: 'hidden' }}>
            <div style={{
              width: `${goalPct}%`, height: '100%',
              background: goalReached 
                ? 'linear-gradient(90deg, #00D27A, #059669)' 
                : goalPct >= 75 
                  ? 'linear-gradient(90deg, #FCD34D, #F59E0B)' 
                  : 'linear-gradient(90deg, #3B82F6, #6366F1)',
              borderRadius: '6px', transition: 'width 0.6s ease'
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', marginTop: '6px' }}>
            <span style={{ color: theme.subText }}>₹0</span>
            <span style={{ color: theme.text, fontWeight: '700' }}>{goalPct.toFixed(0)}%</span>
            <span style={{ color: theme.subText }}>₹{dailyGoal}</span>
          </div>
        </div>

        {/* Rides Progress */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: theme.subText }}>🏍️ Rides</span>
          <span style={{ fontSize: '13px', fontWeight: '800', color: theme.text }}>
            {todayRides.length} / {rideGoal}
          </span>
        </div>
        <div style={{ height: '8px', background: theme.bg, borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            width: `${ridePct}%`, height: '100%',
            background: ridePct >= 100 ? '#00D27A' : '#A78BFA',
            borderRadius: '4px', transition: 'width 0.6s ease'
          }} />
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <StatCard theme={theme} title="Gross Earnings" value={`₹${stats.gross.toFixed(0)}`} icon="💵" />
        <StatCard theme={theme} title="Total Distance" value={`${stats.totalKm.toFixed(1)} km`} icon="🛣️" />
        <StatCard theme={theme} title="Commission" value={`₹${stats.commission.toFixed(0)}`} icon="🏢" />
        <StatCard theme={theme} title="Taxes" value={`₹${stats.taxes.toFixed(0)}`} icon="🏛️" />
      </div>

      {/* Weekly Earnings Chart */}
      {chartData.length > 0 && (
        <div style={{ ...cardStyle, marginBottom: '24px' }}>
          <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: theme.text, fontWeight: '700' }}>
            📈 Weekly Earnings Trend
          </h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3" stroke={theme.border} vertical={false} />
              <XAxis dataKey="day" stroke={theme.text} fontSize={12} />
              <YAxis stroke={theme.text} fontSize={12} />
              <Tooltip
                formatter={(value) => [`₹${Number(value).toFixed(0)}`, 'Net Earnings']}
                contentStyle={{ background: theme.card, border: `1px solid ${theme.border}`, borderRadius: '10px' }}
                labelStyle={{ color: theme.text, fontWeight: '700' }}
              />
              <Line type="monotone" dataKey="net" stroke="#00D27A" strokeWidth={3} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Rides List */}
      <div style={{ marginBottom: '120px' }}>
        <div style={{ 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
          marginBottom: '20px' 
        }}>
          <h2 style={{ fontSize: '20px', color: theme.text, fontWeight: '800', margin: 0 }}>
            {showAllRides ? '📋 Ride History' : '🏍️ Today’s Rides'}
          </h2>
          <div style={{ display: 'flex', gap: '1px', borderRadius: '10px', overflow: 'hidden' }}>
            {[['Today', false], ['History', true]].map(([label, all]) => (
              <button
                key={label}
                onClick={() => setShowAllRides(all)}
                style={{
                  padding: '8px 16px', border: 'none', cursor: 'pointer',
                  fontSize: '13px', fontWeight: '700',
                  background: showAllRides === all ? theme.accent : theme.bg,
                  color: showAllRides === all ? 'white' : theme.text,
                  transition: 'all 0.2s ease',
                }}
                aria-pressed={showAllRides === all}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {displayRides.length === 0 ? (
          <div style={{ 
            textAlign: 'center', padding: '40px 20px', 
            color: theme.subText, backgroundColor: theme.card, 
            borderRadius: '20px', border: `1px solid ${theme.border}`
          }}>
            {showAllRides ? 'No rides logged yet. Get started!' : "Great day to make some money! 🚀"}
          </div>
        ) : (
          displayRides.map((ride, index) => {
            const rideDate = new Date(ride.timestamp).toDateString();
            const prevDate = index > 0 ? new Date(displayRides[index - 1].timestamp).toDateString() : null;
            const showDateHeader = showAllRides && rideDate !== prevDate;
            const isToday = rideDate === new Date().toDateString();

            return (
              <div key={ride.id}>
                {showDateHeader && (
                  <div style={{ 
                    fontSize: '12px', fontWeight: '800', color: theme.subText, 
                    letterSpacing: '1px', textTransform: 'uppercase', 
                    padding: '12px 8px 8px', borderBottom: `1px solid ${theme.border}`
                  }}>
                    {isToday ? '📅 TODAY' : `📅 ${new Date(ride.timestamp).toLocaleDateString('en-IN', { 
                      weekday: 'short', day: 'numeric', month: 'short' 
                    })}`}
                  </div>
                )}
                <div
                  role="button"
                  tabIndex={0}
                  style={{ 
                    ...cardStyle, 
                    borderColor: expandedRideId === ride.id ? theme.accent : theme.border,
                    cursor: 'pointer',
                    padding: '20px',
                    marginBottom: '12px'
                  }}
                  onClick={() => toggleRide(ride.id)}
                  onKeyDown={(e) => e.key === 'Enter' && toggleRide(ride.id)}
                  aria-expanded={expandedRideId === ride.id}
                  aria-label={`Toggle details for ${ride.platform} ride`}
                >
                  {/* Ride Summary */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ color: theme.accent, fontWeight: '800', fontSize: '15px' }}>
                          {ride.platform}
                        </span>
                        {ride.isNight && (
                          <span style={{ 
                            fontSize: '11px', background: 'rgba(167,139,250,0.2)', 
                            color: '#A78BFA', padding: '3px 8px', borderRadius: '6px', 
                            fontWeight: '700' 
                          }}>🌙 Night</span>
                        )}
                        {ride.extraFare > 0 && (
                          <span style={{ 
                            fontSize: '11px', background: 'rgba(0,210,122,0.2)', 
                            color: '#00D27A', padding: '3px 8px', borderRadius: '6px', 
                            fontWeight: '700' 
                          }}>+Tip</span>
                        )}
                      </div>
                      <p style={{ fontSize: '13px', color: theme.subText, margin: 0 }}>
                        {ride.dist?.toFixed(1)} km •{' '}
                        {new Date(ride.timestamp).toLocaleTimeString([], { 
                          hour: '2-digit', minute: '2-digit' 
                        })}
                        {ride.fare > 0 && ` • ₹${Number(ride.fare || 0).toFixed(0)} fare`}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ 
                          color: '#00D27A', fontWeight: '900', fontSize: '22px' 
                        }}>
                          ₹{Number(ride.net || 0).toFixed(0)}
                        </div>
                        <div style={{ fontSize: '11px', color: theme.subText }}>net</div>
                      </div>
                      <span 
                        style={{ 
                          color: theme.subText, fontSize: '14px', 
                          transition: 'transform 0.3s ease',
                          display: 'inline-block',
                          transform: expandedRideId === ride.id ? 'rotate(180deg)' : 'rotate(0deg)'
                        }} 
                        aria-hidden="true"
                      >
                        ▼
                      </span>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {expandedRideId === ride.id && (
                    <div style={{ 
                      marginTop: '20px', paddingTop: '20px', 
                      borderTop: `1px solid ${theme.border}` 
                    }}>
                      {[
                        ride.fare > 0 && ['App Fare', `₹${Number(ride.fare||0).toFixed(2)}`, theme.text],
                        ride.extraFare > 0 && ['Tip', `+₹${Number(ride.extraFare||0).toFixed(2)}`, '#00D27A'],
                        ride.commAmt > 0 && ['Commission', `-₹${Number(ride.commAmt||0).toFixed(2)}`, '#FF4757'],
                        ride.taxAmt > 0 && ['GST Tax', `-₹${Number(ride.taxAmt||0).toFixed(2)}`, '#FF7B35'],
                        ride.platformFee > 0 && ['Platform Fee', `-₹${Number(ride.platformFee||0).toFixed(2)}`, '#FF7B35'],
                        ride.thirdPartyFee > 0 && ['Insurance', `-₹${Number(ride.thirdPartyFee||0).toFixed(2)}`, '#FF7B35'],
                        ride.extraDeduct > 0 && ['Other Deduction', `-₹${Number(ride.extraDeduct||0).toFixed(2)}`, '#FF4757'],
                        ride.fuelCost > 0 && ['Fuel Cost', `-₹${Number(ride.fuelCost||0).toFixed(2)}`, '#FCD34D'],
                      ].filter(Boolean).map(([label, value, color]) => (
                        <div key={label} style={{ 
                          display: 'flex', justifyContent: 'space-between', 
                          marginBottom: '8px', padding: '4px 0' 
                        }}>
                          <span style={{ fontSize: '13px', color: theme.subText }}>{label}</span>
                          <span style={{ 
                            fontSize: '13px', fontWeight: '700', color, 
                            fontFamily: 'monospace' 
                          }}>
                            {value}
                          </span>
                        </div>
                      ))}
                      <div style={{ height: '1px', background: theme.border, margin: '16px 0' }} />
                      <div style={{ 
                        display: 'flex', justifyContent: 'space-between', 
                        alignItems: 'center', marginBottom: '12px' 
                      }}>
                        <span style={{ fontSize: '15px', fontWeight: '800', color: theme.text }}>
                          You earned
                        </span>
                        <span style={{ 
                          fontSize: '26px', fontWeight: '900', 
                          color: '#00D27A', fontFamily: 'monospace' 
                        }}>
                          ₹{Number(ride.net||0).toFixed(2)}
                        </span>
                      </div>
                      {ride.dist > 0 && ride.net > 0 && (
                        <p style={{ 
                          fontSize: '12px', color: theme.subText, 
                          textAlign: 'right', fontWeight: '700', marginBottom: '12px' 
                        }}>
                          💰 ₹{(ride.net / ride.dist).toFixed(2)} per km
                        </p>
                      )}
                      {ride.notes && (
                        <p style={{ 
                          fontSize: '12px', color: theme.subText, 
                          fontStyle: 'italic', marginBottom: '16px', padding: '8px 12px',
                          background: theme.bg, borderRadius: '8px',
                          border: `1px solid ${theme.border}`
                        }}>
                          📝 {ride.notes}
                        </p>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(ride.id); }}
                        style={{
                          width: '100%', padding: '12px', borderRadius: '10px',
                          border: '1px solid #FF4757', background: 'rgba(255,71,87,0.1)',
                          color: '#FF4757', fontWeight: '700', fontSize: '14px',
                          cursor: 'pointer', transition: 'all 0.2s'
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

      {/* FAB */}
      <style>{`
        @keyframes fab-pulse {
          0% { box-shadow: 0 0 0 0 rgba(99,102,241,0.6); }
          70% { box-shadow: 0 0 0 20px rgba(99,102,241,0); }
          100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
        }
        @keyframes fab-pop {
          0% { transform: scale(1); }
          50% { transform: scale(0.9); }
          100% { transform: scale(1); }
        }
        .fab-btn {
          animation: fab-pulse 2s ease-out infinite;
        }
        .fab-btn:active {
          animation: fab-pop 0.2s ease;
        }
      `}</style>
      <div style={{
        position: 'fixed', bottom: '95px', left: '50%', transform: 'translateX(-50%)',
        zIndex: 1000, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px'
      }}>
        <div style={{
          backgroundColor: theme.card, border: `1px solid ${theme.border}`,
          borderRadius: '20px', padding: '6px 16px', fontSize: '12px',
          fontWeight: '800', color: theme.text, letterSpacing: '0.5px'
        }}>
          ADD RIDE
        </div>
        <button
          className="fab-btn"
          onClick={handleFabClick}
          style={{
            width: '68px', height: '68px', borderRadius: '50%', border: 'none',
            background: 'linear-gradient(135deg, #818CF8, #6366f1)', color: '#fff',
            fontSize: '32px', cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', boxShadow: '0 8px 25px rgba(99,102,241,0.4)',
            transition: 'all 0.2s ease', outline: 'none'
          }}
          aria-label="Add new ride"
        >
          +
        </button>
      </div>
    </div>
  );
}