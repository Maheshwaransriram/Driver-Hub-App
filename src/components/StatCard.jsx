import React from 'react';
import { globalStyles } from '../theme/theme';

export default function StatCard({ theme, title, value, icon }) {
  return (
    <div style={{ 
      ...globalStyles.card, 
      backgroundColor: theme.card, 
      borderColor: theme.border, 
      padding: '16px', 
      marginBottom: 0,
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center'
    }}>
      <p style={{ color: theme.subText, fontSize: '12px', fontWeight: '700', marginBottom: '8px', margin: 0 }}>
        {icon} {title}
      </p>
      <h3 style={{ margin: 0, fontSize: '20px', color: theme.text }}>{value}</h3>
    </div>
  );
}