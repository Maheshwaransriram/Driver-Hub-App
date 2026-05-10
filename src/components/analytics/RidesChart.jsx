import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { groupRides, TT, Card, CardTitle, EmptyState, PeriodToggle } from './analyticsHelpers';

export default function RidesChart({ rides = [], theme }) {
  const [period, setPeriod] = useState('weekly');
  const data = useMemo(() => groupRides(rides, period), [rides, period]);

  return (
    <div>
      <PeriodToggle period={period} setPeriod={setPeriod} />

      <Card theme={theme}>
        <CardTitle theme={theme}>Ride count</CardTitle>
        {data.length === 0 ? <EmptyState theme={theme}/> : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3" stroke={theme.border} vertical={false}/>
              <XAxis dataKey="label" stroke={theme.subText} fontSize={10} interval="preserveStartEnd"/>
              <YAxis stroke={theme.subText} fontSize={10} allowDecimals={false}/>
              <Tooltip {...TT(theme)} formatter={v => [v, 'Rides']}/>
              <Bar dataKey="rides" fill="#38BDF8" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card theme={theme}>
        <CardTitle theme={theme}>Distance driven (km)</CardTitle>
        {data.length === 0 ? <EmptyState theme={theme}/> : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3" stroke={theme.border} vertical={false}/>
              <XAxis dataKey="label" stroke={theme.subText} fontSize={10} interval="preserveStartEnd"/>
              <YAxis stroke={theme.subText} fontSize={10} tickFormatter={v => `${v}km`}/>
              <Tooltip {...TT(theme)} formatter={v => [`${v} km`, 'Distance']}/>
              <Bar dataKey="km" fill="#6366f1" radius={[4,4,0,0]}/>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card theme={theme}>
        <CardTitle theme={theme}>Avg fare per ride</CardTitle>
        {data.length === 0 ? <EmptyState theme={theme}/> : (
          <ResponsiveContainer width="100%" height={180}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3" stroke={theme.border} vertical={false}/>
              <XAxis dataKey="label" stroke={theme.subText} fontSize={10} interval="preserveStartEnd"/>
              <YAxis stroke={theme.subText} fontSize={10} tickFormatter={v => `₹${v}`}/>
              <Tooltip {...TT(theme)} formatter={(v, n) => [
                `₹${v}`, n === 'avgFare' ? 'Avg fare' : 'Avg km'
              ]}/>
              <Line type="monotone" dataKey="avgFare" stroke="#F59E0B" strokeWidth={2.5} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        )}
      </Card>

      {data.length > 1 && (() => {
        const best  = [...data].sort((a, b) => b.rides - a.rides)[0];
        const worst = [...data].filter(d => d.rides > 0).sort((a, b) => a.rides - b.rides)[0];
        return (
          <div style={{ display: 'flex', gap: 10 }}>
            {[[best,'🏆 Busiest','#38BDF8'],[worst,'📉 Slowest','#EF4444']].map(([d,l,c]) => d ? (
              <Card key={l} theme={theme} style={{ flex: 1, marginBottom: 0 }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: theme.subText, fontWeight: 700 }}>{l}</p>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 900, color: c }}>{d.label}</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: theme.subText }}>{d.rides} rides · {d.km} km</p>
              </Card>
            ) : null)}
          </div>
        );
      })()}
    </div>
  );
}