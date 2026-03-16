import React, { useState, useEffect } from 'react';
import { globalStyles } from '../theme/theme';

export default function FuelTracking({ theme, fuelLogs, onAddFuelLog }) {
  const [f, setF] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    pricePerLiter: '',
    calculatedLiters: '0.00',
    type: 'Petrol',
    location: 'Indian Oil'
  });

  // Automatically calculate liters whenever amount or price changes
  useEffect(() => {
    const amt = parseFloat(f.amount);
    const price = parseFloat(f.pricePerLiter);
    if (amt > 0 && price > 0) {
      setF(prev => ({ ...prev, calculatedLiters: (amt / price).toFixed(2) }));
    } else {
      setF(prev => ({ ...prev, calculatedLiters: '0.00' }));
    }
  }, [f.amount, f.pricePerLiter]);

  const handleSubmit = () => {
    if (!f.amount || !f.pricePerLiter) return;
    onAddFuelLog({
      date: f.date,
      amount: parseFloat(f.amount),
      liters: parseFloat(f.calculatedLiters),
      type: f.type,
      location: f.location,
      id: Date.now()
    });
    // Reset fields
    setF({ ...f, amount: '', pricePerLiter: '', calculatedLiters: '0.00' });
  };

  const inputStyle = {
    width: '100%', padding: '12px', borderRadius: '8px', marginBottom: '16px',
    background: theme.bg, color: theme.text, border: `1px solid ${theme.border}`,
    boxSizing: 'border-box', fontSize: '14px', outline: 'none'
  };

  const labelStyle = { display: 'block', fontSize: '12px', color: theme.subText, marginBottom: '6px', fontWeight: 'bold' };

  return (
    <div style={{ padding: '24px', paddingTop: '70px', boxSizing: 'border-box' }}>
      <h2 style={{ margin: '0 0 4px 0', color: theme.text, fontSize: '26px' }}>Fuel Tracking</h2>
      <p style={{ color: theme.subText, fontSize: '14px', marginBottom: '24px', marginTop: 0 }}>Log and analyze your fuel expenses.</p>

      {/* LOG FUEL FORM */}
      <div style={{ ...globalStyles.card, backgroundColor: theme.card, borderColor: theme.accent, borderWidth: '2px' }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: theme.text }}>⛽ Log New Refill</h3>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Amount (₹)</label>
            <input 
              type="number" 
              placeholder="e.g. 500" 
              style={inputStyle} 
              value={f.amount} 
              onChange={e => setF({...f, amount: e.target.value})} 
            />
          </div>
          <div style={{ flex: 1 }}>
            <label style={labelStyle}>Price / Liter</label>
            <input 
              type="number" 
              placeholder="e.g. 103.5" 
              style={inputStyle} 
              value={f.pricePerLiter} 
              onChange={e => setF({...f, pricePerLiter: e.target.value})} 
            />
          </div>
        </div>

        {/* AUTO-CALCULATED DISPLAY */}
        <div style={{ 
          background: theme.bg, padding: '12px', borderRadius: '8px', 
          marginBottom: '16px', textAlign: 'center', border: `1px dashed ${theme.border}` 
        }}>
          <span style={{ fontSize: '12px', color: theme.subText }}>Calculated Quantity: </span>
          <span style={{ fontSize: '16px', fontWeight: 'bold', color: theme.accent }}>{f.calculatedLiters} Liters</span>
        </div>

        <label style={labelStyle}>Pump / Station Name</label>
        <select 
          style={inputStyle} 
          value={f.location} 
          onChange={e => setF({...f, location: e.target.value})}
        >
          <option value="Indian Oil">Indian Oil</option>
          <option value="HP">HP (Hindustan Petroleum)</option>
          <option value="Bharat">Bharat Petroleum</option>
          <option value="Reliance">Reliance / Jio-bp</option>
          <option value="Nayara">Nayara Energy</option>
          <option value="Other">Other</option>
        </select>

        <label style={labelStyle}>Fuel Type</label>
        <select style={inputStyle} value={f.type} onChange={e => setF({...f, type: e.target.value})}>
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

      {/* HISTORY TABLE (Visual check of calculated liters) */}
      <div style={{ ...globalStyles.card, backgroundColor: theme.card, borderColor: theme.border }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: theme.text }}>History</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
            <thead>
              <tr style={{ color: theme.subText, borderBottom: `1px solid ${theme.border}`, textAlign: 'left' }}>
                <th style={{ padding: '8px' }}>Station</th>
                <th style={{ padding: '8px' }}>Qty</th>
                <th style={{ padding: '8px', textAlign: 'right' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {fuelLogs.map(log => (
                <tr key={log.id} style={{ borderBottom: `1px solid ${theme.border}`, color: theme.text }}>
                  <td style={{ padding: '12px 8px' }}>{log.location}</td>
                  <td style={{ padding: '12px 8px' }}>{log.liters} L</td>
                  <td style={{ padding: '12px 8px', textAlign: 'right', fontWeight: 'bold' }}>₹{log.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}