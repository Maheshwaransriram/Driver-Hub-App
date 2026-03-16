import React from 'react';
import StatCard from './StatCard';
import { globalStyles } from '../theme/theme';

export default function Dashboard({ rides, fuelPercentage, remainingRange, fuelValue, currentLiters, settings, theme, onDelete }) {
  
  // --- CALCULATIONS ---
  const todayRides = rides.filter(r => new Date(r.timestamp).toDateString() === new Date().toDateString());
  const net = todayRides.reduce((acc, r) => acc + (r.net || 0), 0);
  const gross = todayRides.reduce((acc, r) => acc + (r.fare || 0), 0);
  const totalKm = todayRides.reduce((acc, r) => acc + (r.dist || 0), 0);
  const commission = todayRides.reduce((acc, r) => acc + (r.commAmt || 0), 0);
  const taxes = todayRides.reduce((acc, r) => acc + (r.taxAmt || 0), 0);

  const isLow = remainingRange <= 15;

  return (
    <div style={{ padding: '24px', paddingTop: '70px', boxSizing: 'border-box' }}>
      <h2 style={{ margin: '0 0 24px 0', color: theme.text, fontSize: '26px' }}>Dashboard</h2>
      
      {/* 1. FUEL MONITOR CARD */}
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
            background: isLow ? 'linear-gradient(90deg, #FF4757, #FF6B6B)' : 'linear-gradient(90deg, #00D27A, #059669)',
            borderRadius: '7px',
            transition: 'width 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
          }} />
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <p style={{ margin: 0, fontSize: '11px', color: theme.subText, fontWeight: 'bold' }}>
              VALUE: <span style={{ color: theme.text }}>₹{fuelValue.toFixed(0)}</span>
            </p>
          </div>
          {isLow && <span style={{ fontSize: '10px', color: '#FF4757', fontWeight: '900' }}>⚠️ REFILL</span>}
        </div>
      </div>

      {/* 2. PROFIT HIGHLIGHT */}
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

      {/* 3. FULL STATS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <StatCard theme={theme} title="Gross Pay" value={`₹${gross.toFixed(0)}`} icon="💵" />
        <StatCard theme={theme} title="Distance" value={`${totalKm.toFixed(1)} km`} icon="🛣️" />
        <StatCard theme={theme} title="Commission Fees" value={`₹${commission.toFixed(0)}`} icon="🏢" />
        <StatCard theme={theme} title="Taxes (5%)" value={`₹${taxes.toFixed(0)}`} icon="🏛️" />
      </div>

      {/* 4. RECENT RIDES */}
      <h3 style={{ fontSize: '18px', marginBottom: '16px', color: theme.text, fontWeight: '800' }}>Today's Rides</h3>
      {todayRides.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '30px', color: theme.subText, backgroundColor: theme.card, borderRadius: '20px' }}>
          No rides logged.
        </div>
      ) : (
        todayRides.map(r => (
          <div key={r.id} style={{ ...globalStyles.card, backgroundColor: theme.card, borderColor: theme.border, padding: '16px', marginBottom: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: theme.accent, fontWeight: '800' }}>{r.platform}</span>
                <p style={{ fontSize: '12px', color: theme.subText, margin: '4px 0 0 0' }}>{r.dist} km • {new Date(r.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ color: theme.text, fontWeight: '800', fontSize: '16px' }}>₹{r.net.toFixed(0)}</span>
                <button onClick={() => onDelete(r.id)} style={{ background: 'none', border: 'none', color: '#FF4757', fontWeight: 'bold' }}>✕</button>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}