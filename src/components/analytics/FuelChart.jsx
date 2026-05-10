import React, { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { safeNum, TT, Card, CardTitle, EmptyState } from './analyticsHelpers';

export default function FuelChart({ fuelLogs = [], settings = {}, theme }) {
  const mileage = Math.max(1, settings.mileage || 45);

  const data = useMemo(() =>
    [...fuelLogs].sort((a, b) => a.id - b.id).map((l, i) => ({
      date:    l.date
        ? new Date(l.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
        : `Fill ${i+1}`,
      liters:  +safeNum(l.liters).toFixed(1),
      amount:  +safeNum(l.amount).toFixed(0),
      range:   +(safeNum(l.liters) * mileage).toFixed(0),
      costKm:  +(safeNum(l.amount) / (safeNum(l.liters) * mileage || 1)).toFixed(2),
    }))
  , [fuelLogs, mileage]);

  if (data.length === 0) return (
    <Card theme={theme}>
      <EmptyState theme={theme} icon="⛽" text="No fuel logs yet. Add a fill-up in the Fuel tab."/>
    </Card>
  );

  const totSpent  = data.reduce((s, l) => s + l.amount, 0);
  const totLiters = data.reduce((s, l) => s + l.liters, 0);
  const avgRange  = data.reduce((s, l) => s + l.range, 0) / data.length;
  const avgCostKm = data.reduce((s, l) => s + l.costKm, 0) / data.length;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
        {[
          ['Total fills',   data.length,            '#F59E0B'],
          ['Total spent',   `₹${totSpent.toFixed(0)}`, '#EF4444'],
          ['Total litres',  `${totLiters.toFixed(1)} L`, '#38BDF8'],
          ['Avg range',     `${avgRange.toFixed(0)} km`, '#00D27A'],
        ].map(([l, v, c]) => (
          <Card key={l} theme={theme} style={{ marginBottom: 0, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 3px', fontSize: 10, fontWeight: 700, color: theme.subText, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{l}</p>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 900, color: c, fontVariantNumeric: 'tabular-nums' }}>{v}</p>
          </Card>
        ))}
      </div>

      <Card theme={theme}>
        <CardTitle theme={theme}>Fill-up history (litres)</CardTitle>
        <ResponsiveContainer width="100%" height={170}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3" stroke={theme.border} vertical={false}/>
            <XAxis dataKey="date" stroke={theme.subText} fontSize={10}/>
            <YAxis stroke={theme.subText} fontSize={10} tickFormatter={v => `${v}L`}/>
            <Tooltip {...TT(theme)} formatter={v => [`${v} L`, 'Litres']}/>
            <Bar dataKey="liters" fill="#F59E0B" radius={[4,4,0,0]}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card theme={theme}>
        <CardTitle theme={theme}>Range per fill-up (km)</CardTitle>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3" stroke={theme.border} vertical={false}/>
            <XAxis dataKey="date" stroke={theme.subText} fontSize={10}/>
            <YAxis stroke={theme.subText} fontSize={10} tickFormatter={v => `${v}km`}/>
            <Tooltip {...TT(theme)} formatter={v => [`${v} km`, 'Range']}/>
            <Line type="monotone" dataKey="range" stroke="#00D27A" strokeWidth={2.5} dot={{ r:4, fill:'#00D27A' }}/>
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <Card theme={theme}>
        <CardTitle theme={theme}>Cost per km — ₹/km trend</CardTitle>
        <p style={{ margin: '-8px 0 12px', fontSize: 11, color: theme.subText }}>
          Avg: ₹{avgCostKm.toFixed(2)}/km — lower is better
        </p>
        <ResponsiveContainer width="100%" height={160}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3" stroke={theme.border} vertical={false}/>
            <XAxis dataKey="date" stroke={theme.subText} fontSize={10}/>
            <YAxis stroke={theme.subText} fontSize={10} tickFormatter={v => `₹${v}`}/>
            <Tooltip {...TT(theme)} formatter={v => [`₹${v}/km`, 'Cost per km']}/>
            <Line type="monotone" dataKey="costKm" stroke="#EF4444" strokeWidth={2} dot={{ r:3 }}/>
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}