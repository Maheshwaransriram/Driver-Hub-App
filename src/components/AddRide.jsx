import React, { useState } from 'react';
import { globalStyles } from '../theme/theme';

export default function AddRide({ onSave, onBack, theme }) {
  const [f, setF] = useState({ platform: "Rapido", fare: "", dist: "" });

  const inputStyle = {
    width: '100%', 
    padding: '18px', 
    borderRadius: '16px', 
    marginBottom: '16px', 
    background: theme.bg, 
    color: theme.text, 
    border: `1.5px solid ${theme.border}`, 
    boxSizing: 'border-box',
    fontSize: '16px',
    outline: 'none'
  };

  return (
    <div style={{ padding: '24px', paddingTop: '70px', boxSizing: 'border-box' }}>
      <button 
        onClick={onBack} 
        style={{ background: 'none', border: 'none', color: theme.subText, marginBottom: '20px', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        ← Back to Dashboard
      </button>
      
      <h2 style={{ color: theme.text, marginBottom: '24px', fontSize: '26px' }}>Log New Ride</h2>
      
      <div style={{ ...globalStyles.card, backgroundColor: theme.card, borderColor: theme.border, padding: '24px' }}>
        <label style={{ display: 'block', color: theme.text, fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>Total Fare (₹)</label>
        <input 
          type="number" 
          placeholder="e.g. 150" 
          style={inputStyle} 
          value={f.fare}
          onChange={e => setF({...f, fare: e.target.value})} 
        />
        
        <label style={{ display: 'block', color: theme.text, fontWeight: 'bold', marginBottom: '8px', fontSize: '14px' }}>Distance (KM)</label>
        <input 
          type="number" 
          placeholder="e.g. 12.5" 
          style={inputStyle} 
          value={f.dist}
          onChange={e => setF({...f, dist: e.target.value})} 
        />
        
        <button 
          style={{ ...globalStyles.btnPrimary, background: theme.accentGradient, color: '#FFF', marginTop: '10px' }} 
          onClick={() => {
            if(f.fare && f.dist) onSave({ ...f, fare: parseFloat(f.fare), dist: parseFloat(f.dist) });
          }}
        >
          Save Ride Data
        </button>
      </div>
    </div>
  );
}