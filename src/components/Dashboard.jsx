import React, { useState } from 'react';
import StatCard from './StatCard';
import { globalStyles } from '../theme/theme';

export default function Dashboard({ rides, fuelPercentage, remainingRange, fuelValue, currentLiters, settings, theme, onDelete, onAddRide }) {
  
  const [showAllRides,  setShowAllRides]  = useState(false);
  const [expandedRideId, setExpandedRideId] = useState(null);

  // --- CALCULATIONS ---
  const todayRides = rides.filter(r => new Date(r.timestamp).toDateString() === new Date().toDateString());
  const net        = todayRides.reduce((acc, r) => acc + Number(r.net || 0), 0);
  const gross      = todayRides.reduce((acc, r) => acc + Number(r.fare || 0), 0);
  const totalKm    = todayRides.reduce((acc, r) => acc + Number(r.dist || 0), 0);
  const commission = todayRides.reduce((acc, r) => acc + Number(r.commAmt || 0), 0);
  const taxes      = todayRides.reduce((acc, r) => acc + Number(r.taxAmt || 0), 0);

  // All rides sorted newest first for history view
  const displayRides = showAllRides ? [...rides] : todayRides;

  // --- GOAL TRACKING ---
  const dailyGoal      = settings.dailyGoal || 1000;
  const rideGoal       = settings.rideGoal  || 15;
  const goalPct        = Math.min(100, (net / dailyGoal) * 100);
  const ridePct        = Math.min(100, (todayRides.length / rideGoal) * 100);
  const goalReached    = net >= dailyGoal;
  const remaining      = Math.max(0, dailyGoal - net);

  // Pick a label based on how close you are
  const goalStatus = goalReached
    ? '🎉 Goal Reached!'
    : goalPct >= 75 ? '🔥 Almost there!'
    : goalPct >= 50 ? '💪 Halfway there'
    : goalPct >= 25 ? '🚀 Keep going!'
    : '🏁 Just started';

  const isLow = remainingRange <= 15;
  const [fabPressed, setFabPressed] = useState(false);

  const handleFabClick = () => {
    setFabPressed(true);
    setTimeout(() => { setFabPressed(false); onAddRide?.(); }, 200);
  };

  return (
    <div style={{ padding: '24px', paddingTop: '70px', boxSizing: 'border-box' }}>
      <h2 style={{ margin: '0 0 24px 0', color: theme.text, fontSize: '26px' }}>Dashboard</h2>
      
      {/* ── 2. FUEL MONITOR CARD ───────────────────────────────────────────── */}
      <div style={{ 
        ...globalStyles.card, 
        backgroundColor: theme.card, 
        borderColor: isLow ? '#FF4757' : theme.border,
        borderWidth: isLow ? '2px' : '1px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px' }}>⛽</span>
            <span style={{ fontWeight: '800', fontSize: '14px', color: theme.text }}>Fuel Remaining</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontWeight: '900', color: isLow ? '#FF4757' : '#00D27A', fontSize: '16px', display: 'block' }}>
              {remainingRange.toFixed(1)} KM
            </span>
            <span style={{ fontSize: '11px', color: theme.subText, fontWeight: '700' }}>
              {currentLiters.toFixed(2)} Liters
            </span>
          </div>
        </div>

        <div style={{ width: '100%', height: '14px', background: theme.bg, borderRadius: '7px', overflow: 'hidden', marginBottom: '12px' }}>
          <div style={{ 
            width: `${fuelPercentage}%`, 
            height: '100%', 
            background: isLow
              ? 'linear-gradient(90deg, #FF4757, #FF6B6B)'
              : 'linear-gradient(90deg, #00D27A, #059669)',
            borderRadius: '7px',
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ margin: 0, fontSize: '11px', color: theme.subText, fontWeight: 'bold' }}>
            VALUE: <span style={{ color: theme.text }}>₹{fuelValue.toFixed(0)}</span>
          </p>
          {isLow && <span style={{ fontSize: '10px', color: '#FF4757', fontWeight: '900' }}>⚠️ REFILL</span>}
        </div>
      </div>

      {/* ── 3. PROFIT HIGHLIGHT ────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <div style={{ flex: 1.5, background: theme.profitBg, padding: '24px', borderRadius: '24px', color: theme.profitText }}>
          <p style={{ fontSize: '12px', fontWeight: '800', margin: 0 }}>NET PROFIT</p>
          <h1 style={{ fontSize: '42px', margin: '8px 0' }}>₹{net.toFixed(0)}</h1>
        </div>
        <div style={{ flex: 1, backgroundColor: theme.card, padding: '24px', borderRadius: '24px', border: `1px solid ${theme.border}`, textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: theme.subText, fontWeight: '800', margin: 0 }}>RIDES</p>
          <h1 style={{ fontSize: '42px', margin: '8px 0', color: theme.text }}>{todayRides.length}</h1>
        </div>
      </div>

      {/* ── 4. STATS GRID ──────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <StatCard theme={theme} title="Gross Pay"       value={`₹${gross.toFixed(0)}`}        icon="💵" />
        <StatCard theme={theme} title="Distance"        value={`${totalKm.toFixed(1)} km`}     icon="🛣️" />
        <StatCard theme={theme} title="Commission Fees" value={`₹${commission.toFixed(0)}`}    icon="🏢" />
        <StatCard theme={theme} title="Taxes (5%)"      value={`₹${taxes.toFixed(0)}`}         icon="🏛️" />
      </div>

      {/* ── 1. GOAL TRACKING CARD ──────────────────────────────────────────── */}
      <div style={{
        ...globalStyles.card,
        backgroundColor: theme.card,
        borderColor: goalReached ? '#00D27A' : theme.border,
        borderWidth: goalReached ? '2px' : '1px',
        marginBottom: '20px',
      }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '14px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '18px' }}>🎯</span>
              <span style={{ fontWeight: '800', fontSize: '14px', color: theme.text }}>Daily Goal</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: theme.subText, fontWeight: '600' }}>
              {goalStatus}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{
              fontWeight: '900', fontSize: '16px', display: 'block',
              color: goalReached ? '#00D27A' : theme.text,
            }}>
              ₹{net.toFixed(0)}
              <span style={{ fontSize: '12px', color: theme.subText, fontWeight: '600' }}>
                {' '}/ ₹{dailyGoal}
              </span>
            </span>
            {!goalReached && (
              <span style={{ fontSize: '11px', color: theme.subText, fontWeight: '700' }}>
                ₹{remaining.toFixed(0)} to go
              </span>
            )}
          </div>
        </div>

        {/* Earnings progress bar */}
        <div style={{ marginBottom: '14px' }}>
          <div style={{ width: '100%', height: '14px', background: theme.bg, borderRadius: '7px', overflow: 'hidden' }}>
            <div style={{
              width: `${goalPct}%`,
              height: '100%',
              background: goalReached
                ? 'linear-gradient(90deg, #00D27A, #059669)'
                : goalPct >= 75
                  ? 'linear-gradient(90deg, #FFD166, #F4A261)'
                  : 'linear-gradient(90deg, #4E9CFF, #6366f1)',
              borderRadius: '7px',
              transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
            }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
            <span style={{ fontSize: '10px', color: theme.subText, fontWeight: '700' }}>₹0</span>
            <span style={{ fontSize: '10px', color: theme.subText, fontWeight: '700' }}>
              {goalPct.toFixed(0)}%
            </span>
            <span style={{ fontSize: '10px', color: theme.subText, fontWeight: '700' }}>₹{dailyGoal}</span>
          </div>
        </div>

        {/* Ride count progress bar */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: '8px',
        }}>
          <span style={{ fontSize: '12px', color: theme.subText, fontWeight: '700' }}>
            🏍️ Rides
          </span>
          <span style={{ fontSize: '12px', color: theme.text, fontWeight: '800' }}>
            {todayRides.length}
            <span style={{ color: theme.subText, fontWeight: '600' }}> / {rideGoal}</span>
          </span>
        </div>
        <div style={{ width: '100%', height: '8px', background: theme.bg, borderRadius: '4px', overflow: 'hidden' }}>
          <div style={{
            width: `${ridePct}%`,
            height: '100%',
            background: ridePct >= 100
              ? 'linear-gradient(90deg, #00D27A, #059669)'
              : 'linear-gradient(90deg, #A78BFA, #7C3AED)',
            borderRadius: '4px',
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
          }} />
        </div>
      </div>

      {/* ── 5. TODAY'S RIDES / HISTORY ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', color: theme.text, fontWeight: '800', margin: 0 }}>
          {showAllRides ? 'Ride History' : "Today's Rides"}
        </h3>
        <div style={{ display: 'flex', gap: '0px', borderRadius: '10px', overflow: 'hidden', border: `1px solid ${theme.border}` }}>
          {[['Today', false], ['All', true]].map(([label, val]) => (
            <button
              key={label}
              onClick={() => setShowAllRides(val)}
              style={{
                padding: '6px 14px', border: 'none', cursor: 'pointer',
                fontSize: '12px', fontWeight: '700',
                background: showAllRides === val ? theme.accent : theme.card,
                color: showAllRides === val ? '#fff' : theme.subText,
                transition: 'all 0.2s',
              }}
            >{label}</button>
          ))}
        </div>
      </div>

      {displayRides.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: theme.subText, backgroundColor: theme.card, borderRadius: '20px', marginBottom: '100px' }}>
          {showAllRides ? 'No rides logged yet.' : 'No rides logged today.'}
        </div>
      ) : (
        <div style={{ marginBottom: '100px' }}>
          {displayRides.map((r, i) => {
            // Show date header when showing all rides and date changes
            const rDate = new Date(r.timestamp).toDateString();
            const prevDate = i > 0 ? new Date(displayRides[i - 1].timestamp).toDateString() : null;
            const showDateHeader = showAllRides && rDate !== prevDate;
            const isToday = rDate === new Date().toDateString();

            return (
              <div key={r.id}>
                {showDateHeader && (
                  <div style={{ fontSize: '11px', fontWeight: '800', color: theme.subText, letterSpacing: '0.8px', textTransform: 'uppercase', padding: '8px 4px 6px' }}>
                    {isToday ? '📅 TODAY' : `📅 ${new Date(r.timestamp).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}`}
                  </div>
                )}
                <div
                  style={{ ...globalStyles.card, backgroundColor: theme.card, borderColor: expandedRideId === r.id ? theme.accent : theme.border, padding: '16px', marginBottom: '10px', cursor: 'pointer', transition: 'border-color 0.2s' }}
                  onClick={() => setExpandedRideId(expandedRideId === r.id ? null : r.id)}
                >
                  {/* Summary row — always visible */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ color: theme.accent, fontWeight: '800' }}>{r.platform}</span>
                        {r.isNight && <span style={{ fontSize: '10px', background: '#A78BFA20', color: '#A78BFA', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>🌙</span>}
                        {r.extraFare > 0 && <span style={{ fontSize: '10px', background: '#00D27A20', color: '#00D27A', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>+tip</span>}
                      </div>
                      <p style={{ fontSize: '12px', color: theme.subText, margin: '4px 0 0 0' }}>
                        {r.dist} km • {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {r.fare > 0 && <span style={{ marginLeft: '6px' }}>· ₹{Number(r.fare || 0).toFixed(0)} fare</span>}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ color: '#00D27A', fontWeight: '900', fontSize: '18px' }}>₹{Number(r.net || 0).toFixed(0)}</div>
                        <div style={{ fontSize: '10px', color: theme.subText }}>net</div>
                      </div>
                      <span style={{ color: theme.subText, fontSize: '11px', transition: 'transform 0.25s', display: 'inline-block', transform: expandedRideId === r.id ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                    </div>
                  </div>

                  {/* Expandable breakdown — tap to reveal */}
                  {expandedRideId === r.id && (
                    <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${theme.border}` }}>
                      {[
                        r.fare > 0            ? ['App Fare',               `₹${Number(r.fare||0).toFixed(2)}`,          theme.text]    : null,
                        r.extraFare > 0       ? ['Extra Fare (tip)',        `+₹${Number(r.extraFare||0).toFixed(2)}`,    '#00D27A']     : null,
                        r.commAmt > 0         ? ['Commission',              `-₹${Number(r.commAmt||0).toFixed(2)}`,      '#FF4757']     : null,
                        r.taxAmt > 0          ? ['Govt. Taxes (GST)',       `-₹${Number(r.taxAmt||0).toFixed(2)}`,       '#FF7B35']     : null,
                        r.platformFee > 0     ? ['Platform Fee',            `-₹${Number(r.platformFee||0).toFixed(2)}`,  '#FF7B35']     : null,
                        r.thirdPartyFee > 0   ? ['3rd Party / Insurance',   `-₹${Number(r.thirdPartyFee||0).toFixed(2)}`,'#FF7B35']    : null,
                        r.extraDeduct > 0     ? ['Extra Deduction',         `-₹${Number(r.extraDeduct||0).toFixed(2)}`,  '#FF4757']     : null,
                        r.fuelCost > 0        ? ['Fuel Cost',               `-₹${Number(r.fuelCost||0).toFixed(2)}`,     '#FFD166']     : null,
                      ].filter(Boolean).map(([label, val, color]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                          <span style={{ fontSize: '12px', color: theme.subText }}>{label}</span>
                          <span style={{ fontSize: '12px', fontWeight: '700', color, fontFamily: 'monospace' }}>{val}</span>
                        </div>
                      ))}
                      <div style={{ height: '1px', background: theme.border, margin: '10px 0' }} />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '14px', fontWeight: '800', color: theme.text }}>You earned</span>
                        <span style={{ fontSize: '22px', fontWeight: '900', color: '#00D27A', fontFamily: 'monospace' }}>₹{Number(r.net||0).toFixed(2)}</span>
                      </div>
                      {r.dist > 0 && r.net > 0 && (
                        <p style={{ fontSize: '11px', color: theme.subText, margin: '4px 0 10px', textAlign: 'right', fontWeight: '600' }}>
                          ₹{(r.net / r.dist).toFixed(2)} per km
                        </p>
                      )}
                      {r.notes ? <p style={{ fontSize: '11px', color: theme.subText, fontStyle: 'italic', marginBottom: '10px' }}>📝 {r.notes}</p> : null}
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(r.id); }}
                        style={{ width: '100%', padding: '8px', borderRadius: '8px', border: '1px solid #FF4757', background: '#FF475710', color: '#FF4757', fontWeight: '700', fontSize: '12px', cursor: 'pointer' }}
                      >
                        🗑️ Delete Ride
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {/* ── FAB: Add Ride ─────────────────────────────────────────── */}
      <style>{`
        @keyframes fab-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(99,102,241,0.55); }
          70%  { box-shadow: 0 0 0 18px rgba(99,102,241,0); }
          100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
        }
        @keyframes fab-pop {
          0%   { transform: scale(1); }
          40%  { transform: scale(0.88); }
          100% { transform: scale(1); }
        }
        .fab-btn {
          animation: fab-pulse 2.2s ease-out infinite;
        }
        .fab-btn:active {
          animation: fab-pop 0.2s ease forwards;
        }
      `}</style>

      {/* Fixed FAB — sits above bottom nav */}
      <div style={{
        position: 'fixed',
        bottom: '90px',        /* clears the 75px nav + gap */
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 500,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '6px',
      }}>
        {/* Label bubble */}
        <div style={{
          backgroundColor: theme.card,
          border: `1px solid ${theme.border}`,
          borderRadius: '20px',
          padding: '4px 12px',
          fontSize: '11px',
          fontWeight: '800',
          color: theme.subText,
          letterSpacing: '0.5px',
          whiteSpace: 'nowrap',
        }}>
          LOG RIDE
        </div>

        {/* The FAB circle */}
        <button
          className="fab-btn"
          onClick={handleFabClick}
          style={{
            width: '62px', height: '62px',
            borderRadius: '50%', border: 'none',
            background: 'linear-gradient(135deg, #818CF8, #6366f1)',
            color: '#fff',
            fontSize: '28px',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transform: fabPressed ? 'scale(0.88)' : 'scale(1)',
            transition: 'transform 0.15s ease',
          }}
        >
          ＋
        </button>
      </div>
    </div>
  );
}