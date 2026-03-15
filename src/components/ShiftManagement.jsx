import React from 'react';
import { globalStyles } from '../theme/theme';

export default function ShiftManagement({ isOnline, setIsOnline, theme }) {
  return (
    <div style={{ padding: '24px', paddingTop: '100px', boxSizing: 'border-box', height: '100%' }}>
      <div style={{ 
        ...globalStyles.card, 
        backgroundColor: theme.card, 
        borderColor: theme.border, 
        textAlign: 'center', 
        padding: '50px 24px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center'
      }}>
        <div 
          onClick={() => setIsOnline(!isOnline)}
          style={{ 
            width: '100px', height: '100px', borderRadius: '50%', 
            display: 'flex', alignItems: 'center', justifyContent: 'center', 
            margin: '0 auto 24px', fontSize: '40px', cursor: 'pointer', 
            transition: 'all 0.4s ease',
            background: isOnline ? theme.accentGradient : theme.bg, 
            color: isOnline ? '#FFF' : theme.subText,
            boxShadow: isOnline ? `0 10px 30px ${theme.accent}60` : 'none',
            border: isOnline ? 'none' : `2px solid ${theme.border}`
          }}
        >
          ⏻
        </div>
        <h2 style={{ color: theme.text, margin: '10px 0', fontSize: '28px' }}>
          {isOnline ? "You're Online" : "Offline"}
        </h2>
        <p style={{ color: theme.subText, fontSize: '15px', marginBottom: '40px' }}>
          {isOnline ? "Scanning for nearby ride requests..." : "Go online to start tracking your shift."}
        </p>
        <button 
          onClick={() => setIsOnline(!isOnline)}
          style={{ 
            ...globalStyles.btnPrimary, 
            background: isOnline ? '#FF4757' : theme.accentGradient, 
            color: '#FFF',
            maxWidth: '250px'
          }}
        >
          {isOnline ? "End Shift" : "Start Shift"}
        </button>
      </div>
    </div>
  );
}