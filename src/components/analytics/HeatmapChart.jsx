import React, { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { safeNum, TT, Card, CardTitle, EmptyState } from './analyticsHelpers';

export default function HeatmapChart({ rides = [], theme }) {
  const data = useMemo(() => {
    const h = Array.from({ length: 24 }, (_, i) => ({
      hour: i, rides: 0, net: 0,
      label: i === 0 ? '12am' : i < 12 ? `${i}am` : i === 12 ? '12pm' : `${i-12}pm`,
    }));
    rides.forEach(r => {
      const i = new Date(r.timestamp).getHours();
      h[i].rides++;
      h[i].net += safeNum(r.net);
    });
    const maxNet = Math.max(...h.map(x => x.net), 1);
    return h.map(x => ({ ...x, net: +x.net.toFixed(0), intensity: x.net / maxNet }));
  }, [rides]);

  const withRides = data.filter(h => h.rides > 0);
  const peakRide  = [...withRides].sort((a, b) => b.rides - a.rides)[0];
  const peakEarn  = [...withRides].sort((a, b) => b.net   - a.net)[0];
  const deadHour  = data.find(h => h.rides === 0 && h.hour >= 6 && h.hour <= 22);

  return (
    <div>
      <Card theme={theme}>
        <CardTitle theme={theme}>Rides by hour of day</CardTitle>
        {rides.length === 0 ? <EmptyState theme={theme}/> : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3" stroke={theme.border} vertical={false}/>
              <XAxis dataKey="label" stroke={theme.subText} fontSize={9} interval={2}/>
              <YAxis stroke={theme.subText} fontSize={10} allowDecimals={false}/>
              <Tooltip {...TT(theme)} formatter={v => [v, 'Rides']}/>
              <Bar dataKey="rides" radius={[3,3,0,0]}>
                {data.map((h, i) => <Cell key={i} fill={h.intensity > 0.7 ? '#00D27A' : h.intensity > 0.3 ? '#F59E0B' : '#38BDF840'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      <Card theme={theme}>
        <CardTitle theme={theme}>Earnings by hour of day</CardTitle>
        {rides.length === 0 ? <EmptyState theme={theme}/> : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3" stroke={theme.border} vertical={false}/>
              <XAxis dataKey="label" stroke={theme.subText} fontSize={9} interval={2}/>
              <YAxis stroke={theme.subText} fontSize={10} tickFormatter={v => `₹${v}`}/>
              <Tooltip {...TT(theme)} formatter={v => [`₹${v}`, 'Net earnings']}/>
              <Bar dataKey="net" radius={[3,3,0,0]}>
                {data.map((h, i) => <Cell key={i} fill={h.intensity > 0.7 ? '#00D27A' : h.intensity > 0.3 ? '#F59E0B' : '#6366f140'}/>)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </Card>

      {withRides.length > 0 && (
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[
            [peakRide, '🔥 Busiest hour',     `${peakRide?.rides} rides`, '#38BDF8'],
            [peakEarn, '💰 Most profitable',  `₹${peakEarn?.net} net`,   '#00D27A'],
            [deadHour, '😴 Daytime dead zone', '0 rides',                 '#EF4444'],
          ].filter(([d]) => d).map(([d, l, s, c]) => (
            <Card key={l} theme={theme} style={{ flex: 1, minWidth: 130, marginBottom: 10 }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, color: theme.subText, fontWeight: 700 }}>{l}</p>
              <p style={{ margin: 0, fontSize: 18, fontWeight: 900, color: c }}>{d.label}</p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: theme.subText }}>{s}</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}