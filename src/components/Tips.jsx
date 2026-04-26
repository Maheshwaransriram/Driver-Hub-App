import React, { useState } from 'react';

const FUEL_TIPS = [
  { icon: '🌅', title: 'Ride in the morning', body: 'Cold engines consume more fuel. Short trips under 5 km in the evening after a full day are the most fuel-inefficient. Try to batch short rides.' },
  { icon: '🚦', title: 'Avoid hard braking', body: 'Aggressive braking wastes up to 30% more fuel. Anticipate traffic signals and coast to a stop instead of braking at the last moment.' },
  { icon: '💨', title: 'Maintain 40–55 km/h', body: 'This is the sweet spot for fuel efficiency on a bike. Riding at 60+ km/h can reduce mileage by 15–20% due to wind resistance.' },
  { icon: '🔧', title: 'Check tyre pressure weekly', body: 'Under-inflated tyres increase rolling resistance. A 10% drop in tyre pressure reduces mileage by 5%. Check every Sunday morning.' },
  { icon: '🛢️', title: 'Use the right engine oil', body: 'Synthetic 10W-30 reduces engine friction significantly vs mineral oil. Change every 3,000 km for peak efficiency.' },
  { icon: '⛽', title: 'Fill up in the morning', body: 'Petrol is denser at lower temperatures. Filling up early morning means you get slightly more fuel for the same rupee compared to afternoon.' },
  { icon: '🚗', title: 'Reduce idling', body: 'Idling for over 2 minutes burns fuel equivalent to driving 1–2 km. Turn off the engine if waiting more than 2 minutes.' },
  { icon: '🏋️', title: 'Reduce dead weight', body: 'Every 10 kg of extra weight reduces fuel efficiency by ~1%. Clean out your bag, remove unused accessories from the bike.' },
  { icon: '🔄', title: 'Service air filter monthly', body: 'A clogged air filter forces the engine to work harder. Clean or replace your air filter every month for city riding.' },
  { icon: '📉', title: 'Track your cost/km', body: 'Use the Fuel Analysis chart in Analytics to watch your ₹/km trend. If it rises 2 weeks in a row, it\'s a service signal.' },
];

const EARNINGS_TIPS = [
  { icon: '🕐', title: 'Work peak hours', body: 'Use the Peak Hours Heatmap in Analytics to find your busiest hours. Most drivers see 2–3x more ride requests between 8–10am and 6–9pm.' },
  { icon: '🗺️', title: 'Position near demand zones', body: 'Airports, tech parks, malls, and railway stations generate consistent demand. Spend idle time parked near these, not randomly.' },
  { icon: '⭐', title: 'Maintain a 4.8+ rating', body: 'Platforms prioritise high-rated drivers for surge pricing and premium rides. One bad rating takes 5 five-stars to recover.' },
  { icon: '🏍️', title: 'Accept short rides at peak time', body: 'A ₹40 ride that takes 4 min is ₹600/hr efficiency. A ₹200 ride that takes 40 min is only ₹300/hr. Speed matters more than fare size.' },
  { icon: '📱', title: 'Use multiple platforms', body: 'Keep Rapido, Uber, and Ola all open. When one is slow, switch. Drivers on 2+ platforms earn 25–40% more on average.' },
  { icon: '🌧️', title: 'Ride in bad weather', body: 'Demand surges 2–5x during rain while supply drops. Keep a rain cover on your bike and work the first 30 min of rain for best surge earnings.' },
  { icon: '🎯', title: 'Set a daily ride goal', body: 'Drivers with a daily target complete 18% more rides than those without. Use Settings to set your ride goal and track it on the Dashboard.' },
  { icon: '💰', title: 'Track net, not gross', body: 'Commission + GST + fuel can eat 40–50% of your gross fare. Your Dashboard shows net profit — always optimise for that number, not the app fare.' },
  { icon: '🔁', title: 'End rides near demand zones', body: 'When ending a ride, ask yourself "where is the next hotspot?" Positioning yourself there before opening the app reduces wait time.' },
  { icon: '📊', title: 'Review weekly trends', body: 'Check your Earnings Trend chart every Sunday. If your per-ride average is dropping, it could mean longer rides at lower rates — adjust your area.' },
];

export default function Tips({ theme, onBack, initialTab = 'fuel' }) {
  const [tab, setTab] = useState(initialTab);
  const [expanded, setExpanded] = useState(null);

  const tips = tab === 'fuel' ? FUEL_TIPS : EARNINGS_TIPS;

  const cardStyle = {
    background: theme.card, border: `1px solid ${theme.border}`,
    borderRadius: 14, marginBottom: 10, overflow: 'hidden',
    transition: 'all 0.2s',
  };

  return (
    <div style={{ padding: '24px', paddingTop: 72, paddingBottom: 110, boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={onBack} style={{
          background: 'none', border: `1px solid ${theme.border}`, borderRadius: 10,
          padding: '8px 12px', color: theme.text, fontSize: 18, cursor: 'pointer', lineHeight: 1,
        }}>←</button>
        <div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: theme.text }}>
            {tab === 'fuel' ? '⛽ Fuel Efficiency Tips' : '💡 Earnings Tips'}
          </h1>
          <p style={{ margin: 0, fontSize: 11, color: theme.subText }}>{tips.length} tips · tap to expand</p>
        </div>
      </div>

      {/* Tab toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: theme.bg, borderRadius: 10, padding: 4, width: 'fit-content' }}>
        {[['fuel','⛽ Fuel'],['earnings','💡 Earnings']].map(([id, label]) => (
          <button key={id} onClick={() => { setTab(id); setExpanded(null); }} style={{
            padding: '7px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
            background: tab === id ? theme.card : 'transparent',
            color:      tab === id ? theme.text  : theme.subText,
            transition: 'all 0.15s',
          }}>{label}</button>
        ))}
      </div>

      {/* Tips list */}
      {tips.map((tip, i) => (
        <div key={i} style={cardStyle}>
          <button
            onClick={() => setExpanded(expanded === i ? null : i)}
            style={{
              display: 'flex', alignItems: 'center', gap: 12,
              width: '100%', padding: '14px 16px',
              background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left',
            }}
          >
            <span style={{ fontSize: 24, flexShrink: 0 }}>{tip.icon}</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: theme.text }}>{tip.title}</span>
            <span style={{ fontSize: 12, color: theme.subText, flexShrink: 0 }}>
              {expanded === i ? '▲' : '▼'}
            </span>
          </button>
          {expanded === i && (
            <div style={{ padding: '0 16px 16px 52px' }}>
              <p style={{ margin: 0, fontSize: 13, color: theme.subText, lineHeight: 1.7 }}>{tip.body}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}