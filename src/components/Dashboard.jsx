import React from 'react';
import StatCard from './StatCard';
import { globalStyles } from '../theme/theme';

export default function Dashboard({ rides, settings, theme, themeMode, onDelete }) {
  const todayRides = rides.filter(r => new Date(r.timestamp).toDateString() === new Date().toDateString());
  const gross = todayRides.reduce((acc, r) => acc + (r.fare || 0), 0);
  const totalKm = todayRides.reduce((acc, r) => acc + (r.dist || 0), 0);
  const commission = todayRides.reduce((acc, r) => acc + (r.commAmt || 0), 0);
  const taxes = todayRides.reduce((acc, r) => acc + (r.taxAmt || 0), 0);
  const net = todayRides.reduce((acc, r) => acc + (r.net || 0), 0);

  const incomeProgress = Math.min((net / settings.dailyGoal) * 100, 100);

  return (
    <div style={{ padding: '24px', paddingTop: '70px', boxSizing: 'border-box' }}>
      <h2 style={{ margin: '0 0 24px 0', color: theme.text, fontSize: '26px' }}>Dashboard</h2>
      
      {/* 1. TOP STATS */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
        <div style={{ 
          flex: 1.5, 
          background: theme.profitBg, 
          padding: '24px', 
          borderRadius: '24px', 
          color: theme.profitText,
          boxShadow: `0 10px 20px ${theme.accent}40`
        }}>
          <p style={{ fontSize: '12px', fontWeight: '800', margin: 0, letterSpacing: '1px' }}>NET PROFIT</p>
          <h1 style={{ fontSize: '42px', margin: '8px 0' }}>₹{net.toFixed(0)}</h1>
          <p style={{ fontSize: '11px', fontWeight: '700', opacity: 0.9, margin: 0 }}>TAKE HOME</p>
        </div>
        
        <div style={{ 
          flex: 1, 
          backgroundColor: theme.card, 
          padding: '24px', 
          borderRadius: '24px', 
          border: `1px solid ${theme.border}`, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          textAlign: 'center' 
        }}>
          <p style={{ fontSize: '12px', color: theme.subText, fontWeight: '800', margin: 0 }}>RIDES</p>
          <h1 style={{ fontSize: '42px', margin: '8px 0', color: theme.text }}>{todayRides.length}</h1>
          <p style={{ fontSize: '11px', color: theme.accent, fontWeight: '800', margin: 0 }}>COMPLETED</p>
        </div>
      </div>

      {/* 2. INCOME PROGRESS BAR */}
      <div style={{ ...globalStyles.card, backgroundColor: theme.card, borderColor: theme.border }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
          <span style={{ fontWeight: '800', fontSize: '15px', color: theme.text }}>💰 Daily Target</span>
          <span style={{ fontWeight: '800', color: theme.accent, fontSize: '15px' }}>₹{net.toFixed(0)} / ₹{settings.dailyGoal}</span>
        </div>
        
        <div style={{ position: 'relative', width: '100%', height: '16px', background: theme.bg, borderRadius: '10px', overflow: 'hidden' }}>
          <div style={{ 
            width: `${incomeProgress}%`, height: '100%', 
            background: theme.accentGradient, borderRadius: '10px', 
            transition: 'width 1s cubic-bezier(0.4, 0, 0.2, 1)', 
          }} />
        </div>
      </div>

      {/* 3. STATS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <StatCard theme={theme} title="Gross Pay" value={`₹${gross.toFixed(0)}`} icon="💵" />
        <StatCard theme={theme} title="Distance" value={`${totalKm.toFixed(1)} km`} icon="🛣️" />
        <StatCard theme={theme} title="Platform Fee" value={`₹${commission.toFixed(0)}`} icon="🏢" />
        <StatCard theme={theme} title="Taxes" value={`₹${taxes.toFixed(0)}`} icon="🏛️" />
      </div>

      {/* 4. RECENT RIDES */}
      <h3 style={{ fontSize: '18px', marginBottom: '16px', color: theme.text, fontWeight: '800' }}>Recent Logs</h3>
      {todayRides.length === 0 ? 
        <div style={{ textAlign: 'center', padding: '30px', color: theme.subText, backgroundColor: theme.card, borderRadius: '20px', border: `1px dashed ${theme.border}` }}>
          No rides logged yet today.
        </div> : 
        todayRides.map(r => (
          <div key={r.id} style={{ ...globalStyles.card, backgroundColor: theme.card, borderColor: theme.border, padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ color: theme.accent, fontWeight: '800', fontSize: '15px' }}>{r.platform || 'Ride'}</span>
                <p style={{ fontSize: '13px', color: theme.subText, marginTop: '6px', margin: 0, fontWeight: '500' }}>
                  {r.dist} km • {new Date(r.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <span style={{ color: theme.text, fontWeight: '800', fontSize: '18px' }}>+₹{r.net.toFixed(0)}</span>
                <button onClick={() => onDelete(r.id)} style={{ background: theme.bg, border: 'none', color: '#FF4757', padding: '8px 12px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
              </div>
            </div>
          </div>
        ))
      }
    </div>
  );
}