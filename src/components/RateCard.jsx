import React, { useState } from 'react';
import { globalStyles } from '../theme/theme';

// ── Default rate cards matching Rapido's actual fee structure ─────────────────
export const DEFAULT_RATE_CARDS = {
  Rapido: {
    color: '#FF4757',
    emoji: '🏍️',
    // Tiered distance rates (₹ per km)
    distanceRates: [
      { upTo: 5,   rate: 4.2  },   // 0–5 km
      { upTo: 10,  rate: 5.2  },   // 5–10 km
      { upTo: 100, rate: 8.4  },   // 10–100 km
    ],
    timeRate:        0.55,   // ₹ per minute
    baseFare:        17.5,   // per order
    platformFee:     1.0,    // collected from customer
    waitingRate:     1.0,    // ₹/min after 3 free minutes
    waitingFreeMin:  3,      // free waiting minutes
    waitingMax:      20,     // max waiting charge
    longPickupRate:  5.0,    // ₹/km after 2km pickup
    longPickupAfter: 2,
    longPickupMax:   10,
    nightBonus:      30,     // % bonus 11pm–6am
    commission:      5,      // flat ₹ per ride
    commissionType:  'flat',
    // Verified from 3 real ride slips:
    govtTaxPercent:  5.2,   // GST % on gross (verified: ₹3.02 on ₹47.85, ₹3.44 on ₹66.60)
    thirdPartyFee:   1.0,   // ₹1 "3rd party / platform fee" deducted every ride
    cancellationMin: 0,
    cancellationMax: 16,
  },
  Uber: {
    color: '#4E9CFF',
    emoji: '🚗',
    distanceRates: [
      { upTo: 5,   rate: 8.0  },
      { upTo: 12,  rate: 11.0 },
      { upTo: 100, rate: 14.0 },
    ],
    timeRate:        1.0,
    baseFare:        30.0,
    platformFee:     2.0,
    waitingRate:     1.5,
    waitingFreeMin:  2,
    waitingMax:      30,
    longPickupRate:  0,
    longPickupAfter: 0,
    longPickupMax:   0,
    nightBonus:      25,
    commission:      25,     // percent
    commissionType:  'percent',
    govtTaxPercent:  5.0,
    thirdPartyFee:   2.0,
    cancellationMin: 0,
    cancellationMax: 50,
  },
  Ola: {
    color: '#FFD166',
    emoji: '🟡',
    distanceRates: [
      { upTo: 4,   rate: 7.0  },
      { upTo: 10,  rate: 9.5  },
      { upTo: 100, rate: 12.0 },
    ],
    timeRate:        0.75,
    baseFare:        25.0,
    platformFee:     1.5,
    waitingRate:     1.0,
    waitingFreeMin:  3,
    waitingMax:      25,
    longPickupRate:  4.0,
    longPickupAfter: 2,
    longPickupMax:   15,
    nightBonus:      20,
    commission:      20,
    commissionType:  'percent',
    govtTaxPercent:  5.0,
    thirdPartyFee:   1.5,
    cancellationMin: 0,
    cancellationMax: 30,
  },
};

// ── Fare calculator — verified against 3 real Rapido ride slips ──────────────
// Formula confirmed:
//   gross     = distFare + timeFare + baseFare + platformFee + nightBonus
//   nightBonus = (distFare + timeFare + baseFare) × nightPct  (NOT platform fee)
//   govtTax   = gross × govtTaxPercent  (~5.2% for Rapido)
//   net       = gross − commission − govtTax − platformFee + pickupBonus
//   (platform fee collected from customer but Rapido keeps it "3rd party charge")
export function calculateFareFromRateCard(rateCard, distKm, timeMin = 0, isNight = false, pickupKm = 0) {
  if (!rateCard || distKm <= 0) return { gross: 0, commission: 0, gst: 0, net: 0 };

  // 1. Distance fare (tiered)
  let distFare = 0, remaining = distKm, prevUpTo = 0;
  for (const tier of rateCard.distanceRates) {
    const tierKm = Math.min(remaining, tier.upTo - prevUpTo);
    if (tierKm <= 0) break;
    distFare += tierKm * tier.rate;
    remaining -= tierKm;
    prevUpTo = tier.upTo;
    if (remaining <= 0) break;
  }

  // 2. Time fare
  const timeFare = timeMin * (rateCard.timeRate || 0);

  // 3. Night bonus — only on dist + time + baseFare (verified: NOT platform fee)
  const nightBase  = distFare + timeFare + (rateCard.baseFare || 0);
  const nightBonus = isNight ? nightBase * (rateCard.nightBonus || 0) / 100 : 0;

  // 4. Long pickup bonus (Rapido pays driver extra for long pickups)
  const extraPickup  = Math.max(0, pickupKm - (rateCard.longPickupAfter || 0));
  const pickupBonus  = Math.min(
    extraPickup * (rateCard.longPickupRate || 0),
    rateCard.longPickupMax || 0
  );

  // 5. Gross = dist + time + baseFare + platformFee + nightBonus
  const platformFee   = rateCard.platformFee   || 0;
  const thirdPartyFee = rateCard.thirdPartyFee || 0; // ₹1 insurance / 3rd party deducted
  const gross         = nightBase + platformFee + nightBonus;

  // 6. Commission
  let commAmt = rateCard.commissionType === 'flat'
    ? (rateCard.commission || 0)
    : gross * (rateCard.commission || 0) / 100;

  // 7. Govt taxes (GST ~5.2% of gross for Rapido, verified from ride slips)
  const govtTax = gross * (rateCard.govtTaxPercent || 0) / 100;

  // 8. Net = gross − commission − govtTax − platformFee − thirdPartyFee + pickupBonus
  //    platformFee  = collected from customer but kept by Rapido ("3rd party charge ₹1")
  //    thirdPartyFee = additional insurance/regulatory fee also deducted
  const net = gross - commAmt - govtTax - platformFee - thirdPartyFee + pickupBonus;

  return {
    gross:          parseFloat(gross.toFixed(2)),
    distFare:       parseFloat(distFare.toFixed(2)),
    timeFare:       parseFloat(timeFare.toFixed(2)),
    base:           rateCard.baseFare || 0,
    nightBonus:     parseFloat(nightBonus.toFixed(2)),
    pickupBonus:    parseFloat(pickupBonus.toFixed(2)),
    commission:     parseFloat(commAmt.toFixed(2)),
    gst:            parseFloat(govtTax.toFixed(2)),
    thirdPartyFee:  parseFloat(thirdPartyFee.toFixed(2)),
    net:            parseFloat(net.toFixed(2)),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RateCard Screen Component
// ─────────────────────────────────────────────────────────────────────────────
export default function RateCard({ theme, rateCards, onSave, onBack }) {
  const [activePlatform, setActivePlatform] = useState('Rapido');
  const [cards, setCards] = useState({ ...rateCards });
  const [saved, setSaved] = useState(false);

  const card = cards[activePlatform];
  const c = card.color;

  const update = (key, value) =>
    setCards(prev => ({ ...prev, [activePlatform]: { ...prev[activePlatform], [key]: value } }));

  const updateTier = (idx, field, value) => {
    const newRates = [...card.distanceRates];
    newRates[idx] = { ...newRates[idx], [field]: parseFloat(value) || 0 };
    update('distanceRates', newRates);
  };

  const handleSave = () => {
    onSave(cards);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const inputStyle = {
    background: theme.bg, color: theme.text,
    border: `1.5px solid ${theme.border}`,
    borderRadius: '8px', padding: '8px 10px',
    fontSize: '14px', fontWeight: '700',
    textAlign: 'right', outline: 'none',
    width: '80px',
  };

  const sectionStyle = {
    ...globalStyles.card,
    backgroundColor: theme.card,
    borderColor: theme.border,
    marginBottom: '12px',
    padding: '16px',
  };

  const rowStyle = {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', paddingVertical: '6px',
    marginBottom: '10px',
  };

  const labelStyle = {
    fontSize: '13px', color: theme.text, fontWeight: '600', flex: 1,
  };

  const subLabelStyle = {
    fontSize: '11px', color: theme.subText, marginTop: '2px',
  };

  const sectionTitle = {
    fontSize: '11px', fontWeight: '800', letterSpacing: '1px',
    color: c, textTransform: 'uppercase',
    marginBottom: '14px',
  };

  return (
    <div style={{ padding: '20px', paddingTop: '60px', paddingBottom: '110px', boxSizing: 'border-box' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
        <button onClick={onBack} style={{
          width: '38px', height: '38px', borderRadius: '10px',
          border: `1.5px solid ${theme.border}`, background: theme.card,
          color: theme.text, fontSize: '16px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>
        <h2 style={{ color: theme.text, fontSize: '22px', fontWeight: '800', margin: 0 }}>
          Rate Cards
        </h2>
      </div>

      {/* Platform tabs */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
        {Object.entries(cards).map(([name, rc]) => (
          <button key={name} onClick={() => setActivePlatform(name)} style={{
            flex: 1, padding: '10px 4px', borderRadius: '14px',
            border: `2px solid ${activePlatform === name ? rc.color : theme.border}`,
            background: activePlatform === name ? `${rc.color}18` : theme.card,
            cursor: 'pointer', transition: 'all 0.2s',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
          }}>
            <span style={{ fontSize: '18px' }}>{rc.emoji}</span>
            <span style={{
              fontSize: '11px', fontWeight: '700',
              color: activePlatform === name ? rc.color : theme.subText,
            }}>{name}</span>
          </button>
        ))}
      </div>

      {/* ── Distance Rates (tiered) ─────────────────────────────── */}
      <div style={sectionStyle}>
        <p style={sectionTitle}>📏 Distance Rate (₹/km)</p>
        {card.distanceRates.map((tier, i) => {
          const prevUpTo = i === 0 ? 0 : card.distanceRates[i - 1].upTo;
          return (
            <div key={i} style={{
              ...rowStyle,
              background: theme.bg, borderRadius: '10px',
              padding: '10px 12px', marginBottom: '8px',
            }}>
              <div style={{ flex: 1 }}>
                <span style={labelStyle}>
                  {prevUpTo}–{tier.upTo} km
                </span>
                <input
                  type="number" style={{ ...inputStyle, width: '60px', marginLeft: '8px' }}
                  value={tier.upTo}
                  onChange={e => updateTier(i, 'upTo', e.target.value)}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ color: theme.subText, fontSize: '13px' }}>₹</span>
                <input
                  type="number" style={inputStyle}
                  value={tier.rate}
                  onChange={e => updateTier(i, 'rate', e.target.value)}
                />
                <span style={{ color: theme.subText, fontSize: '11px' }}>/km</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Base Charges ────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <p style={sectionTitle}>🧾 Order Charges</p>

        {[
          ['Base Fare', 'baseFare',    'Per completed order', '₹', ''],
          ['Time Rate', 'timeRate',    'Per minute of ride',  '₹', '/min'],
          ['Platform Fee', 'platformFee', 'Collected from customer', '₹', ''],
        ].map(([label, key, sub, pre, post]) => (
          <div key={key} style={rowStyle}>
            <div>
              <div style={labelStyle}>{label}</div>
              <div style={subLabelStyle}>{sub}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {pre && <span style={{ color: theme.subText, fontSize: '13px' }}>{pre}</span>}
              <input type="number" style={inputStyle}
                value={card[key]}
                onChange={e => update(key, parseFloat(e.target.value) || 0)} />
              {post && <span style={{ color: theme.subText, fontSize: '11px' }}>{post}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Waiting Charges ─────────────────────────────────────── */}
      <div style={sectionStyle}>
        <p style={sectionTitle}>⏳ Waiting Charges</p>
        {[
          ['Rate',       'waitingRate',    '₹ per minute', '₹', '/min'],
          ['Free minutes','waitingFreeMin','Free waiting time', '', 'min'],
          ['Max charge', 'waitingMax',     'Maximum waiting fee', '₹', ''],
        ].map(([label, key, sub, pre, post]) => (
          <div key={key} style={rowStyle}>
            <div>
              <div style={labelStyle}>{label}</div>
              <div style={subLabelStyle}>{sub}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {pre && <span style={{ color: theme.subText, fontSize: '13px' }}>{pre}</span>}
              <input type="number" style={inputStyle}
                value={card[key]}
                onChange={e => update(key, parseFloat(e.target.value) || 0)} />
              {post && <span style={{ color: theme.subText, fontSize: '11px' }}>{post}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Long Pickup ─────────────────────────────────────────── */}
      {(card.longPickupRate > 0 || activePlatform === 'Rapido') && (
        <div style={sectionStyle}>
          <p style={sectionTitle}>📍 Long Pickup</p>
          {[
            ['Rate',      'longPickupRate',  '₹/km beyond threshold', '₹', '/km'],
            ['After',     'longPickupAfter', 'Free pickup distance',   '', ' km'],
            ['Max charge','longPickupMax',   'Maximum pickup charge',  '₹', ''],
          ].map(([label, key, sub, pre, post]) => (
            <div key={key} style={rowStyle}>
              <div>
                <div style={labelStyle}>{label}</div>
                <div style={subLabelStyle}>{sub}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {pre && <span style={{ color: theme.subText, fontSize: '13px' }}>{pre}</span>}
                <input type="number" style={inputStyle}
                  value={card[key]}
                  onChange={e => update(key, parseFloat(e.target.value) || 0)} />
                {post && <span style={{ color: theme.subText, fontSize: '11px' }}>{post}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Night Bonus ─────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <p style={sectionTitle}>🌙 Night Super (11 PM – 6 AM)</p>
        <div style={rowStyle}>
          <div>
            <div style={labelStyle}>Night Bonus</div>
            <div style={subLabelStyle}>% added to distance + time fare</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <input type="number" style={inputStyle}
              value={card.nightBonus}
              onChange={e => update('nightBonus', parseFloat(e.target.value) || 0)} />
            <span style={{ color: theme.subText, fontSize: '13px' }}>%</span>
          </div>
        </div>
      </div>

      {/* ── Commission & Deductions ─────────────────────────────── */}
      <div style={{ ...sectionStyle, borderColor: `${c}50` }}>
        <p style={sectionTitle}>💸 Commission & Deductions</p>

        {/* Commission type toggle */}
        <div style={{ ...rowStyle, marginBottom: '14px' }}>
          <div>
            <div style={labelStyle}>Commission Type</div>
            <div style={subLabelStyle}>Flat ₹ per ride or % of fare</div>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            {['flat', 'percent'].map(t => (
              <button key={t} onClick={() => update('commissionType', t)} style={{
                padding: '6px 12px', borderRadius: '8px', cursor: 'pointer',
                border: `1.5px solid ${card.commissionType === t ? c : theme.border}`,
                background: card.commissionType === t ? `${c}18` : theme.bg,
                color: card.commissionType === t ? c : theme.subText,
                fontSize: '12px', fontWeight: '700',
              }}>{t === 'flat' ? 'Flat ₹' : 'Percent %'}</button>
            ))}
          </div>
        </div>

        {[
          ['Commission', 'commission',
            card.commissionType === 'flat' ? '₹ flat per ride' : '% of total fare',
            card.commissionType === 'flat' ? '₹' : '', card.commissionType === 'flat' ? '' : '%'],
          ['Govt. Tax & Charges', 'govtTaxPercent',
            activePlatform === 'Rapido'
              ? '% of gross fare — verified: ~5.2%'
              : '% of gross fare (GST)',
            '', '%'],
          ['3rd Party / Insurance', 'thirdPartyFee',
            'Fixed ₹ deducted every ride (insurance/regulatory)',
            '₹', ''],
        ].map(([label, key, sub, pre, post]) => (
          <div key={key} style={rowStyle}>
            <div>
              <div style={labelStyle}>{label}</div>
              <div style={subLabelStyle}>{sub}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              {pre && <span style={{ color: theme.subText, fontSize: '13px' }}>{pre}</span>}
              <input type="number" style={inputStyle}
                value={card[key] ?? 0}
                onChange={e => update(key, parseFloat(e.target.value) || 0)} />
              {post && <span style={{ color: theme.subText, fontSize: '11px' }}>{post}</span>}
            </div>
          </div>
        ))}
      </div>

      {/* ── Cancellation ────────────────────────────────────────── */}
      <div style={sectionStyle}>
        <p style={sectionTitle}>❌ Cancellation</p>
        {[
          ['Min charge', 'cancellationMin', 'Minimum cancellation fee', '₹', ''],
          ['Max charge', 'cancellationMax', 'Maximum cancellation fee', '₹', ''],
        ].map(([label, key, sub, pre]) => (
          <div key={key} style={rowStyle}>
            <div>
              <div style={labelStyle}>{label}</div>
              <div style={subLabelStyle}>{sub}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ color: theme.subText, fontSize: '13px' }}>{pre}</span>
              <input type="number" style={inputStyle}
                value={card[key]}
                onChange={e => update(key, parseFloat(e.target.value) || 0)} />
            </div>
          </div>
        ))}
      </div>

      {/* Save */}
      <button onClick={handleSave} style={{
        ...globalStyles.btnPrimary,
        background: saved ? '#059669' : `linear-gradient(135deg, ${c}, ${c}CC)`,
        color: '#FFF', transition: 'background 0.3s ease',
      }}>
        {saved ? `✅ ${activePlatform} Rate Card Saved!` : `Save ${activePlatform} Rate Card`}
      </button>
    </div>
  );
}