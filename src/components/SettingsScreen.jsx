import React, { useState } from 'react';
import { globalStyles } from '../theme/theme';

export default function SettingsScreen({ settings, onSave, theme, themeMode, onToggleTheme, onOpenRateCard }) {
  const [form,  setForm]  = useState({ ...settings });
  const [saved, setSaved] = useState(false);

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const handleSave = () => {
    const validated = {
      dailyGoal:  Math.max(1,   parseFloat(form.dailyGoal)  || settings.dailyGoal),
      rideGoal:   Math.max(1,   parseInt(form.rideGoal)     || settings.rideGoal),
      mileage:    Math.max(1,   parseFloat(form.mileage)    || settings.mileage),
      fuelPrice:  Math.max(1,   parseFloat(form.fuelPrice)  || settings.fuelPrice),
    };
    onSave(validated);
    setForm(validated);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputStyle = {
    background: theme.bg, color: theme.text,
    border: `1.5px solid ${theme.border}`,
    borderRadius: '10px', padding: '10px 14px',
    fontSize: '15px', fontWeight: '700',
    width: '110px', textAlign: 'right', outline: 'none',
  };

  const rowStyle = {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    paddingBottom: '16px', marginBottom: '16px',
    borderBottom: `1px solid ${theme.border}`,
  };

  const lastRowStyle = { ...rowStyle, borderBottom: 'none', paddingBottom: 0, marginBottom: 0 };

  const sectionTitle = {
    fontSize: '11px', fontWeight: '800', letterSpacing: '1px',
    color: theme.subText, textTransform: 'uppercase',
    marginBottom: '14px', marginTop: '4px',
  };

  const fieldLabel = (title, sub) => (
    <div>
      <span style={{ fontSize: '14px', color: theme.text, fontWeight: '700' }}>{title}</span>
      {sub && <p style={{ fontSize: '12px', color: theme.subText, margin: '3px 0 0' }}>{sub}</p>}
    </div>
  );

  return (
    <div style={{ padding: '24px', paddingTop: '60px', paddingBottom: '100px', boxSizing: 'border-box' }}>
      <h2 style={{ color: theme.text, fontSize: '26px', fontWeight: '800', marginBottom: '24px' }}>
        ⚙️ Settings
      </h2>

      {/* ── Earnings Goals ─────────────────────────────────────── */}
      <div style={{ ...globalStyles.card, backgroundColor: theme.card, borderColor: theme.border }}>
        <p style={sectionTitle}>Earnings Goals</p>
        <div style={rowStyle}>
          {fieldLabel('Daily Earnings Goal', 'Target net profit per day')}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: theme.subText }}>₹</span>
            <input type="number" value={form.dailyGoal}
              onChange={e => update('dailyGoal', e.target.value)} style={inputStyle} />
          </div>
        </div>
        <div style={lastRowStyle}>
          {fieldLabel('Daily Ride Goal', 'Number of rides per day')}
          <input type="number" value={form.rideGoal}
            onChange={e => update('rideGoal', e.target.value)} style={inputStyle} />
        </div>
      </div>

      {/* ── Rate Cards ─────────────────────────────────────────── */}
      <div style={{ ...globalStyles.card, backgroundColor: theme.card, borderColor: theme.border }}>
        <p style={sectionTitle}>Platform Rate Cards</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            {fieldLabel('Rapido · Uber · Ola', 'Tiered fares, commission, GST')}
            <p style={{ fontSize: '11px', color: theme.accent, margin: '4px 0 0', fontWeight: '700' }}>
              ⚡ Used to calculate your net earnings
            </p>
          </div>
          <button onClick={onOpenRateCard} style={{
            padding: '10px 16px', borderRadius: '12px', cursor: 'pointer',
            border: `1.5px solid ${theme.accent}`,
            background: `${theme.accent}18`,
            color: theme.accent, fontSize: '13px', fontWeight: '700',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            Edit →
          </button>
        </div>

        {/* Preview chips */}
        <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
          {[['🏍️ Rapido', '#FF4757'], ['🚗 Uber', '#4E9CFF'], ['🟡 Ola', '#FFD166']].map(([name, color]) => (
            <div key={name} style={{
              flex: 1, textAlign: 'center', padding: '6px 4px',
              borderRadius: '8px', background: `${color}12`,
              border: `1px solid ${color}30`,
            }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color }}>{name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Fuel & Bike ────────────────────────────────────────── */}
      <div style={{ ...globalStyles.card, backgroundColor: theme.card, borderColor: theme.border }}>
        <p style={sectionTitle}>Fuel & Bike</p>

        {/* Fuel price — changing this instantly updates FuelTracking calculations */}
        <div style={rowStyle}>
          <div>
            {fieldLabel('Fuel Price', 'Current price per litre')}
            <p style={{ fontSize: '11px', color: theme.accent, margin: '4px 0 0', fontWeight: '700' }}>
              ⚡ Updates Fuel Tracking automatically
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ color: theme.subText }}>₹</span>
            <input type="number" value={form.fuelPrice}
              onChange={e => update('fuelPrice', e.target.value)} style={inputStyle} />
          </div>
        </div>

        <div style={lastRowStyle}>
          {fieldLabel('Bike Mileage', 'Kilometres per litre')}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <input type="number" value={form.mileage}
              onChange={e => update('mileage', e.target.value)} style={inputStyle} />
            <span style={{ color: theme.subText, fontSize: '13px' }}>km/L</span>
          </div>
        </div>
      </div>

      {/* ── Appearance ─────────────────────────────────────────── */}
      <div style={{ ...globalStyles.card, backgroundColor: theme.card, borderColor: theme.border }}>
        <p style={sectionTitle}>Appearance</p>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {fieldLabel('Theme', `Currently ${themeMode === 'dark' ? 'Dark' : 'Light'} mode`)}
          <button
            onClick={onToggleTheme}
            style={{
              padding: '10px 20px', borderRadius: '20px',
              border: `1.5px solid ${theme.border}`,
              backgroundColor: theme.bg, color: theme.text,
              fontSize: '14px', fontWeight: '700', cursor: 'pointer',
            }}
          >
            {themeMode === 'dark' ? '☀️ Light' : '🌙 Dark'}
          </button>
        </div>
      </div>

      {/* ── Save ───────────────────────────────────────────────── */}
      <button
        onClick={handleSave}
        style={{
          ...globalStyles.btnPrimary,
          background: saved ? '#059669' : theme.accentGradient,
          color: '#FFF', transition: 'background 0.3s ease',
        }}
      >
        {saved ? '✅ Settings Saved!' : 'Save Settings'}
      </button>
    </div>
  );
}