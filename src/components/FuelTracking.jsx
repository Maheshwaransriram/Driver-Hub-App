import React, { useState } from 'react';
import { globalStyles } from '../theme/theme';

export default function FuelTracking({ theme, fuelLogs, onAddFuelLog, settings, onGoToSettings }) {
  const [f, setF] = useState({
    date:     new Date().toISOString().split('T')[0],
    amount:   '',
    type:     'Petrol',
    location: 'Indian Oil',
  });

  // ── Price always comes from settings — no manual entry ────────────────────
  const pricePerLiter    = settings.fuelPrice;
  const amountNum        = parseFloat(f.amount) || 0;
  const calculatedLiters = amountNum > 0
    ? (amountNum / pricePerLiter).toFixed(2)
    : '0.00';

  const handleSubmit = () => {
    if (!f.amount || amountNum <= 0) return;
    onAddFuelLog({
      date:         f.date,
      amount:       amountNum,
      liters:       parseFloat(calculatedLiters),
      pricePerLiter,            // snapshot of settings price at time of fill
      type:         f.type,
      location:     f.location,
      id:           Date.now(),
    });
    setF(prev => ({ ...prev, amount: '' }));
  };

  const inputStyle = {
    width: '100%', padding: '12px', borderRadius: '8px', marginBottom: '16px',
    background: theme.bg, color: theme.text, border: `1px solid ${theme.border}`,
    boxSizing: 'border-box', fontSize: '14px', outline: 'none',
  };

  const labelStyle = {
    display: 'block', fontSize: '12px', color: theme.subText,
    marginBottom: '6px', fontWeight: 'bold',
  };

  const totalSpent  = fuelLogs.reduce((s, l) => s + l.amount, 0);
  const totalLiters = fuelLogs.reduce((s, l) => s + l.liters, 0);

  return (
    <div style={{ padding: '24px', paddingTop: '70px', paddingBottom: '100px', boxSizing: 'border-box' }}>
      <h2 style={{ margin: '0 0 4px 0', color: theme.text, fontSize: '26px' }}>Fuel Tracking</h2>
      <p style={{ color: theme.subText, fontSize: '14px', marginBottom: '24px', marginTop: 0 }}>
        Log and analyse your fuel expenses.
      </p>

      {/* ── Current Fuel Price Banner (locked from Settings) ─────────────────── */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        backgroundColor: theme.card,
        border: `1.5px solid ${theme.accent}`,
        borderRadius: '14px', padding: '14px 18px', marginBottom: '16px',
      }}>
        <div>
          <p style={{ margin: 0, fontSize: '11px', fontWeight: '800',
            color: theme.subText, letterSpacing: '0.8px' }}>
            FUEL PRICE (FROM SETTINGS)
          </p>
          <p style={{ margin: '4px 0 0', fontSize: '24px', fontWeight: '900', color: theme.accent }}>
            ₹{pricePerLiter.toFixed(2)}
            <span style={{ fontSize: '13px', fontWeight: '600', color: theme.subText }}> / L</span>
          </p>
        </div>
        <button
          onClick={onGoToSettings}
          style={{
            background: 'none', border: `1px solid ${theme.border}`,
            borderRadius: '10px', padding: '8px 14px',
            color: theme.subText, fontSize: '12px', fontWeight: '700', cursor: 'pointer',
          }}
        >
          ✏️ Edit in Settings
        </button>
      </div>

      {/* ── Log Fuel Form ─────────────────────────────────────────────────────── */}
      <div style={{ ...globalStyles.card, backgroundColor: theme.card,
        borderColor: theme.accent, borderWidth: '2px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: theme.text }}>⛽ Log New Refill</h3>

        <label style={labelStyle}>Amount Paid (₹)</label>
        <input
          type="number"
          placeholder="e.g. 500"
          style={inputStyle}
          value={f.amount}
          onChange={e => setF({ ...f, amount: e.target.value })}
        />

        {/* Auto-calculated quantity */}
        <div style={{
          background: theme.bg, padding: '12px 16px', borderRadius: '10px',
          marginBottom: '16px', border: `1px dashed ${theme.border}`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <div>
            <span style={{ fontSize: '12px', color: theme.subText }}>
              Quantity at ₹{pricePerLiter}/L
            </span>
            <p style={{ margin: '2px 0 0', fontSize: '22px', fontWeight: '900', color: theme.accent }}>
              {calculatedLiters}
              <span style={{ fontSize: '13px', fontWeight: '600', color: theme.subText }}> Litres</span>
            </p>
          </div>
          {amountNum > 0 && (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '11px', color: theme.subText }}>Range added</span>
              <p style={{ margin: '2px 0 0', fontSize: '16px', fontWeight: '800', color: theme.text }}>
                ~{(parseFloat(calculatedLiters) * settings.mileage).toFixed(0)} km
              </p>
            </div>
          )}
        </div>

        <label style={labelStyle}>Pump / Station</label>
        <select style={inputStyle} value={f.location}
          onChange={e => setF({ ...f, location: e.target.value })}>
          <option value="Indian Oil">Indian Oil</option>
          <option value="HP">HP (Hindustan Petroleum)</option>
          <option value="Bharat">Bharat Petroleum</option>
          <option value="Reliance">Reliance / Jio-bp</option>
          <option value="Nayara">Nayara Energy</option>
          <option value="Other">Other</option>
        </select>

        <label style={labelStyle}>Fuel Type</label>
        <select style={inputStyle} value={f.type}
          onChange={e => setF({ ...f, type: e.target.value })}>
          <option value="Petrol">Petrol</option>
          <option value="Diesel">Diesel</option>
          <option value="CNG">CNG</option>
        </select>

        <button
          style={{ ...globalStyles.btnPrimary, background: '#10B981', color: '#FFF' }}
          onClick={handleSubmit}
        >
          Save Fuel Log
        </button>
      </div>

      {/* ── Summary cards ─────────────────────────────────────────────────────── */}
      {fuelLogs.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
          {[
            ['Total Spent',  `₹${totalSpent.toFixed(0)}`,  '💸'],
            ['Total Filled', `${totalLiters.toFixed(1)} L`, '⛽'],
          ].map(([label, val, icon]) => (
            <div key={label} style={{
              backgroundColor: theme.card, borderRadius: '14px',
              border: `1px solid ${theme.border}`, padding: '14px',
            }}>
              <p style={{ margin: 0, fontSize: '11px', color: theme.subText, fontWeight: '700' }}>
                {icon} {label}
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '20px', fontWeight: '900', color: theme.text }}>
                {val}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── History table ──────────────────────────────────────────────────────── */}
      <div style={{ ...globalStyles.card, backgroundColor: theme.card, borderColor: theme.border }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: theme.text }}>History</h3>
        {fuelLogs.length === 0 ? (
          <p style={{ color: theme.subText, textAlign: 'center', padding: '20px 0', margin: 0 }}>
            No fuel logs yet.
          </p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ color: theme.subText, borderBottom: `1px solid ${theme.border}`, textAlign: 'left' }}>
                  <th style={{ padding: '8px' }}>Station</th>
                  <th style={{ padding: '8px' }}>₹/L</th>
                  <th style={{ padding: '8px' }}>Qty</th>
                  <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {fuelLogs.map(log => (
                  <tr key={log.id} style={{ borderBottom: `1px solid ${theme.border}`, color: theme.text }}>
                    <td style={{ padding: '12px 8px' }}>{log.location}</td>
                    {/* Show the price that was active when this log was saved */}
                    <td style={{ padding: '12px 8px', color: theme.subText, fontSize: '12px' }}>
                      ₹{log.pricePerLiter
                          ? log.pricePerLiter.toFixed(1)
                          : pricePerLiter.toFixed(1)}
                    </td>
                    <td style={{ padding: '12px 8px' }}>{log.liters} L</td>
                    <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold' }}>
                      ₹{log.amount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}