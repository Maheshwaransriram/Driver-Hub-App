import React, { useMemo } from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { safeNum, PIE_COLORS, TT, Card, CardTitle, EmptyState } from './analyticsHelpers';

export default function PlatformChart({ rides = [], theme }) {
  const data = useMemo(() => {
    const map = {};
    rides.forEach(r => {
      const p = r.platform || 'Other';
      if (!map[p]) map[p] = { platform: p, rides: 0, net: 0, gross: 0, km: 0, tips: 0 };
      map[p].rides++;
      map[p].net   += safeNum(r.net);
      map[p].gross += safeNum(r.fare);
      map[p].km    += safeNum(r.dist);
      map[p].tips  += safeNum(r.extraFare);
    });
    return Object.values(map)
      .map(p => ({
        ...p,
        net:   +p.net.toFixed(0),
        gross: +p.gross.toFixed(0),
        km:    +p.km.toFixed(1),
        tips:  +p.tips.toFixed(0),
        avgRide: +(p.net / p.rides).toFixed(0),
      }))
      .sort((a, b) => b.net - a.net);
  }, [rides]);

  if (data.length === 0) return <Card theme={theme}><EmptyState theme={theme}/></Card>;

  return (
    <div>
      <Card theme={theme}>
        <CardTitle theme={theme}>Net profit by platform</CardTitle>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie data={data} dataKey="net" nameKey="platform"
              cx="50%" cy="50%" outerRadius={78}
              label={({ platform, percent }) => `${platform} ${(percent*100).toFixed(0)}%`}
              labelLine={false}>
              {data.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>)}
            </Pie>
            <Tooltip {...TT(theme)} formatter={v => [`₹${v}`, 'Net profit']}/>
          </PieChart>
        </ResponsiveContainer>
      </Card>

      <Card theme={theme}>
        <CardTitle theme={theme}>Gross vs Net by platform</CardTitle>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={data} layout="vertical">
            <CartesianGrid strokeDasharray="3" stroke={theme.border} horizontal={false}/>
            <XAxis type="number" stroke={theme.subText} fontSize={10} tickFormatter={v => `₹${v}`}/>
            <YAxis type="category" dataKey="platform" stroke={theme.subText} fontSize={11} width={72}/>
            <Tooltip {...TT(theme)} formatter={(v, n) => [`₹${v}`, n === 'net' ? 'Net' : 'Gross']}/>
            <Bar dataKey="gross" fill="#6366f140" radius={[0,4,4,0]}/>
            <Bar dataKey="net"   fill="#00D27A"   radius={[0,4,4,0]}/>
            <Legend formatter={v => v === 'net' ? 'Net profit' : 'Gross fare'}/>
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {data.map((p, i) => (
        <Card key={p.platform} theme={theme} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length] }}/>
              <span style={{ fontSize: 14, fontWeight: 800, color: theme.text }}>{p.platform}</span>
            </div>
            <span style={{ fontSize: 18, fontWeight: 900, color: '#00D27A' }}>₹{p.net}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
            {[['Rides',p.rides],['Gross',`₹${p.gross}`],['Avg/ride',`₹${p.avgRide}`],['Tips',`₹${p.tips}`]].map(([l,v]) => (
              <div key={l} style={{ background: theme.bg, borderRadius: 10, padding: '8px 10px', border: `1px solid ${theme.border}` }}>
                <p style={{ margin: '0 0 2px', fontSize: 9, color: theme.subText, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{l}</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: theme.text }}>{v}</p>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}