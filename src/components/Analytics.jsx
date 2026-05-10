// Analytics.jsx — orchestrator only. All chart logic lives in sub-components.
import React, { useState } from 'react';
import EarningsChart     from './analytics/EarningsChart';
import RidesChart        from './analytics/RidesChart';
import PlatformChart     from './analytics/PlatformChart';
import HeatmapChart      from './analytics/HeatmapChart';
import FuelChart         from './analytics/FuelChart';
import ShiftHistoryChart from './analytics/ShiftHistoryChart';

const TABS = [
  { id: 'earnings', label: '💰 Earnings'  },
  { id: 'rides',    label: '🏍 Rides'     },
  { id: 'platform', label: '🏢 Platform'  },
  { id: 'heatmap',  label: '🕐 Peak Hrs'  },
  { id: 'fuel',     label: '⛽ Fuel'      },
  { id: 'shifts',   label: '📋 Shifts'    },
];

export default function Analytics({
  rides = [],
  fuelLogs = [],
  shiftHistory = [],
  settings = {},
  theme,
  onBack,
  initialTab = 'earnings',
}) {
  const [tab, setTab] = useState(initialTab);

  return (
    <div style={{ padding: '16px 18px', paddingTop: 68, paddingBottom: 110, boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <button onClick={onBack} style={{
          background: 'none', border: `1px solid ${theme.border}`,
          borderRadius: 10, padding: '8px 12px',
          color: theme.text, fontSize: 18, cursor: 'pointer', lineHeight: 1,
        }}>←</button>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: theme.text }}>
            📊 Analytics
          </h1>
          <p style={{ margin: 0, fontSize: 11, color: theme.subText }}>
            {rides.length} rides · {fuelLogs.length} fuel logs · {shiftHistory.length} shifts
          </p>
        </div>
      </div>

      {/* Tab bar — horizontally scrollable */}
      <div style={{
        display: 'flex', gap: 6, overflowX: 'auto',
        paddingBottom: 6, marginBottom: 18,
        scrollbarWidth: 'none',
      }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)} style={{
            padding: '8px 16px', borderRadius: 20, border: 'none',
            cursor: 'pointer', fontSize: 12, fontWeight: 700,
            whiteSpace: 'nowrap', flexShrink: 0,
            background: tab === t.id ? theme.accent : theme.bg,
            color:      tab === t.id ? '#fff'        : theme.subText,
            transition: 'all 0.18s ease',
            boxShadow:  tab === t.id ? `0 4px 12px ${theme.accent}40` : 'none',
          }}>{t.label}</button>
        ))}
      </div>

      {/* Sub-components — only the active one renders */}
      {tab === 'earnings' && (
        <EarningsChart rides={rides} settings={settings} theme={theme}/>
      )}
      {tab === 'rides' && (
        <RidesChart rides={rides} theme={theme}/>
      )}
      {tab === 'platform' && (
        <PlatformChart rides={rides} theme={theme}/>
      )}
      {tab === 'heatmap' && (
        <HeatmapChart rides={rides} theme={theme}/>
      )}
      {tab === 'fuel' && (
        <FuelChart fuelLogs={fuelLogs} settings={settings} theme={theme}/>
      )}
      {tab === 'shifts' && (
        <ShiftHistoryChart shiftHistory={shiftHistory} theme={theme}/>
      )}
    </div>
  );
}