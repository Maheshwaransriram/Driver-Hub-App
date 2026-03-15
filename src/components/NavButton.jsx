import React from 'react';

export default function NavButton({ active, icon, label, theme, onClick }) {
  return (
    <button 
      onClick={onClick} 
      style={{ 
        flex: 1, 
        background: 'none', 
        border: 'none', 
        color: active ? theme.accent : theme.subText, 
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'color 0.3s'
      }}
    >
      <span style={{ fontSize: '22px', marginBottom: '4px', transform: active ? 'scale(1.1)' : 'scale(1)', transition: 'transform 0.2s' }}>
        {icon}
      </span>
      <span style={{ fontSize: '11px', fontWeight: '700' }}>{label}</span>
    </button>
  );
}