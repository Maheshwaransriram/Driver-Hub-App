import React, { useState, useMemo } from 'react';
import { globalStyles } from '../theme/theme';
import { calculateFareFromRateCard, DEFAULT_RATE_CARDS } from './RateCard';

const PLATFORMS = [
  { id: 'Rapido', emoji: '🏍️', color: '#FF4757' },
  { id: 'Uber',   emoji: '🚗', color: '#4E9CFF' },
  { id: 'Ola',    emoji: '🟡', color: '#FFD166' },
  { id: 'Other',  emoji: '🛵', color: '#A78BFA' },
];

export default function AddRide({ onSave, onBack, theme, settings, rateCards, initialDist = 0 }) {
  const [platform,    setPlatform]    = useState('Rapido');
  const [fare,        setFare]        = useState('');
  const [dist,        setDist]        = useState(initialDist > 0 ? initialDist.toFixed(2) : '');
  const [extraFare,   setExtraFare]   = useState(''); // tip / cash top-up from customer
  const [extraDeduct, setExtraDeduct] = useState(''); // app penalty / clawback deduction
  const [notes,       setNotes]       = useState('');
  const [saving,      setSaving]      = useState(false);

  const fareN        = parseFloat(fare)        || 0;
  const distN        = parseFloat(dist)        || 0;
  const extraFareN   = parseFloat(extraFare)   || 0;
  const extraDeductN = parseFloat(extraDeduct) || 0;
  const isNight      = (() => { const h = new Date().getHours(); return h >= 23 || h < 6; })();

  // ── Full earnings preview ──────────────────────────────────────────────────
  // Formula (verified from real Rapido ride slips):
  //   gross         = appFare + extraFare
  //   commission    = flat ₹ or % of appFare (not on tips)
  //   govtTax       = appFare × govtTaxPercent (only on official fare)
  //   platformFee   = fixed ₹ (in gross but platform keeps it)
  //   thirdPartyFee = fixed ₹ insurance deduction
  //   net           = gross − commission − govtTax − platformFee − thirdPartyFee − extraDeduct − fuelCost
  const preview = useMemo(() => {
    if (!settings || distN <= 0) return null;

    const rc       = rateCards?.[platform] || DEFAULT_RATE_CARDS[platform] || DEFAULT_RATE_CARDS.Rapido;
    const fuelCost = (distN / settings.mileage) * settings.fuelPrice;

    if (rc) {
      const platformFee   = rc.platformFee   || 0;
      const thirdPartyFee = rc.thirdPartyFee || 0;

      if (fareN > 0) {
        // Manual fare entered — calculate all deductions from the actual fare
        const commAmt = rc.commissionType === 'flat'
          ? (rc.commission || 0)
          : fareN * (rc.commission || 0) / 100;
        const govtTax = fareN * (rc.govtTaxPercent || 0) / 100;
        const gross   = fareN + extraFareN;
        const net     = gross - commAmt - govtTax - platformFee - thirdPartyFee - extraDeductN - fuelCost;
        return {
          gross, appFare: fareN, extraFare: extraFareN,
          commAmt, govtTax, platformFee, thirdPartyFee,
          extraDeduct: extraDeductN, fuelCost, net,
          nightBonus: 0, usingRateCard: false,
        };
      } else {
        // No fare — use rate card estimate
        const calc  = calculateFareFromRateCard(rc, distN, 0, isNight);
        const gross = calc.gross + extraFareN;
        const net   = calc.net + extraFareN - extraDeductN - fuelCost;
        return {
          gross, appFare: calc.gross, extraFare: extraFareN,
          commAmt: calc.commission, govtTax: calc.gst,
          platformFee, thirdPartyFee,
          extraDeduct: extraDeductN, fuelCost, net,
          nightBonus: calc.nightBonus, usingRateCard: true,
        };
      }
    }

    // Other platform — no rate card, manual fare required
    if (fareN <= 0) return null;
    const commAmt = fareN * 0.20;
    const govtTax = fareN * 0.05;
    const gross   = fareN + extraFareN;
    const net     = gross - commAmt - govtTax - extraDeductN - fuelCost;
    return {
      gross, appFare: fareN, extraFare: extraFareN,
      commAmt, govtTax, platformFee: 0, thirdPartyFee: 0,
      extraDeduct: extraDeductN, fuelCost, net,
      nightBonus: 0, usingRateCard: false,
    };
  }, [fareN, distN, extraFareN, extraDeductN, platform, settings, rateCards, isNight]);

  const isValid = distN > 0;

  const handleSave = () => {
    if (!isValid) return;
    setSaving(true);
    setTimeout(() => {
      onSave({
        platform,
        fare:        fareN,
        dist:        distN,
        extraFare:   extraFareN,
        extraDeduct: extraDeductN,
        notes,
      });
    }, 350);
  };

  const inputStyle = {
    width: '100%', padding: '14px 16px',
    borderRadius: '14px',
    background: theme.bg, color: theme.text,
    border: `1.5px solid ${theme.border}`,
    boxSizing: 'border-box', fontSize: '15px',
    fontWeight: '600', outline: 'none',
  };

  const labelStyle = {
    fontSize: '11px', fontWeight: '800', letterSpacing: '1px',
    color: theme.subText, textTransform: 'uppercase',
    marginBottom: '8px', display: 'block',
  };

  const rowInput = (label, value, onChange, placeholder, prefix, suffix, color) => (
    <div style={{ flex: 1 }}>
      <label style={{ ...labelStyle, fontSize: '10px', color: color || theme.subText }}>{label}</label>
      <div style={{ position: 'relative' }}>
        {prefix && <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: theme.subText, fontSize: '14px', fontWeight: '700' }}>{prefix}</span>}
        <input
          type="number" inputMode="decimal" placeholder={placeholder}
          value={value} onChange={e => onChange(e.target.value)}
          style={{
            ...inputStyle,
            paddingLeft:  prefix ? '28px' : '14px',
            paddingRight: suffix ? '36px' : '14px',
          }}
        />
        {suffix && <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: theme.subText, fontSize: '11px', fontWeight: '700' }}>{suffix}</span>}
      </div>
    </div>
  );

  const selectedPlatform = PLATFORMS.find(p => p.id === platform);

  return (
    <div style={{ padding: '24px', paddingTop: '64px', paddingBottom: '110px', boxSizing: 'border-box', minHeight: '100vh' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
        <button onClick={onBack} style={{
          width: '40px', height: '40px', borderRadius: '12px',
          border: `1.5px solid ${theme.border}`,
          background: theme.card, color: theme.text,
          fontSize: '18px', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>←</button>
        <div>
          <h2 style={{ color: theme.text, fontSize: '22px', fontWeight: '800', margin: 0 }}>Log New Ride</h2>
          {initialDist > 0 && (
            <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#00D27A', fontWeight: '700' }}>
              📍 Distance auto-filled from GPS
            </p>
          )}
        </div>
      </div>

      {/* Platform */}
      <div style={{ ...globalStyles.card, backgroundColor: theme.card, borderColor: theme.border, marginBottom: '14px' }}>
        <label style={labelStyle}>Platform</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {PLATFORMS.map(p => {
            const active = platform === p.id;
            return (
              <button key={p.id} onClick={() => setPlatform(p.id)} style={{
                flex: 1, padding: '10px 4px', borderRadius: '12px',
                border: `2px solid ${active ? p.color : theme.border}`,
                background: active ? `${p.color}18` : theme.bg,
                cursor: 'pointer', transition: 'all 0.2s',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px',
                transform: active ? 'scale(1.05)' : 'scale(1)',
              }}>
                <span style={{ fontSize: '18px' }}>{p.emoji}</span>
                <span style={{ fontSize: '10px', fontWeight: '700', color: active ? p.color : theme.subText }}>{p.id}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fare & Distance */}
      <div style={{ ...globalStyles.card, backgroundColor: theme.card, borderColor: theme.border, marginBottom: '14px' }}>
        <label style={labelStyle}>Ride Details</label>

        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          {rowInput('App Fare (₹)', fare, setFare, '0.00', '₹', null)}
          {rowInput(
            initialDist > 0 ? 'Distance 📍 GPS' : 'Distance (km)',
            dist, setDist, '0.0', null, 'km'
          )}
        </div>

        {/* Extra fare & Extra deduct on same row */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
          {rowInput('Extra Fare (tip/cash)', extraFare, setExtraFare, '0.00', '₹', null, '#00D27A')}
          {rowInput('Extra Deduct (penalty)', extraDeduct, setExtraDeduct, '0.00', '₹', null, '#FF4757')}
        </div>

        {/* Hint text */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '14px' }}>
          <p style={{ flex: 1, margin: 0, fontSize: '10px', color: '#00D27A', fontWeight: '600' }}>
            ↑ Tip or cash given by customer on top of app fare
          </p>
          <p style={{ flex: 1, margin: 0, fontSize: '10px', color: '#FF4757', fontWeight: '600' }}>
            ↑ Any app penalty, clawback or cancellation charge
          </p>
        </div>

        <label style={{ ...labelStyle, fontSize: '10px' }}>Notes (optional)</label>
        <textarea
          placeholder="Airport drop, surge, highway, tip…"
          value={notes} onChange={e => setNotes(e.target.value)}
          rows={2}
          style={{ ...inputStyle, resize: 'none', lineHeight: '1.5', fontFamily: 'inherit' }}
        />
      </div>

      {/* Earnings preview */}
      {preview ? (
        <div style={{
          ...globalStyles.card, backgroundColor: theme.card,
          borderColor: preview.net >= 0 ? `${selectedPlatform?.color}50` : '#FF475750',
          borderWidth: '2px', marginBottom: '16px',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <label style={{ ...labelStyle, color: theme.accent, marginBottom: 0 }}>Earnings Preview</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {isNight && (
                <span style={{ fontSize: '11px', fontWeight: '800', color: '#A78BFA', background: '#A78BFA18', padding: '3px 8px', borderRadius: '6px' }}>
                  🌙 Night
                </span>
              )}
              {preview.usingRateCard && (
                <span style={{ fontSize: '10px', color: theme.subText, fontWeight: '700' }}>Est. from rate card</span>
              )}
            </div>
          </div>

          {/* Breakdown rows */}
          {[
            // Income rows (green / neutral)
            preview.appFare > 0
              ? ['App fare',       `₹${preview.appFare.toFixed(2)}`,     theme.text]
              : null,
            preview.nightBonus > 0
              ? ['Night bonus',    `+₹${preview.nightBonus.toFixed(2)}`, '#A78BFA']
              : null,
            preview.extraFare > 0
              ? ['Extra fare (tip)', `+₹${preview.extraFare.toFixed(2)}`, '#00D27A']
              : null,
            // Deduction rows (red / orange / yellow)
            preview.commAmt > 0
              ? ['Commission',         `-₹${preview.commAmt.toFixed(2)}`,      '#FF4757']
              : null,
            preview.govtTax > 0
              ? ['Govt. taxes (GST)',   `-₹${preview.govtTax.toFixed(2)}`,      '#FF7B35']
              : null,
            preview.platformFee > 0
              ? ['Platform fee',        `-₹${preview.platformFee.toFixed(2)}`,  '#FF7B35']
              : null,
            preview.thirdPartyFee > 0
              ? ['3rd party / insurance', `-₹${preview.thirdPartyFee.toFixed(2)}`, '#FF7B35']
              : null,
            preview.extraDeduct > 0
              ? ['Extra deduction',     `-₹${preview.extraDeduct.toFixed(2)}`,  '#FF4757']
              : null,
            preview.fuelCost > 0
              ? ['Fuel cost',           `-₹${preview.fuelCost.toFixed(2)}`,     '#FFD166']
              : null,
          ].filter(Boolean).map(([label, val, color]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '13px', color: theme.subText }}>{label}</span>
              <span style={{ fontSize: '13px', fontWeight: '700', color, fontFamily: 'monospace' }}>{val}</span>
            </div>
          ))}

          <div style={{ height: '1px', background: theme.border, margin: '10px 0' }} />

          {/* You earn */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '15px', fontWeight: '700', color: theme.text }}>You earn</span>
            <span style={{
              fontSize: '30px', fontWeight: '900', fontFamily: 'monospace',
              color: preview.net >= 0 ? '#00D27A' : '#FF4757',
            }}>
              ₹{preview.net.toFixed(2)}
            </span>
          </div>
          {distN > 0 && preview.net > 0 && (
            <p style={{ margin: '6px 0 0', fontSize: '11px', color: theme.subText, textAlign: 'right', fontWeight: '700' }}>
              ₹{(preview.net / distN).toFixed(2)} per km
            </p>
          )}
        </div>
      ) : (
        <div style={{ ...globalStyles.card, backgroundColor: theme.card, borderColor: theme.border, marginBottom: '16px', textAlign: 'center', padding: '20px' }}>
          <span style={{ fontSize: '28px' }}>💰</span>
          <p style={{ color: theme.subText, fontSize: '13px', margin: '8px 0 0', fontWeight: '600' }}>
            {distN > 0 ? 'Enter fare to preview earnings' : 'Enter distance to see estimate from rate card'}
          </p>
        </div>
      )}

      {/* Save */}
      <button
        onClick={handleSave}
        disabled={!isValid || saving}
        style={{
          ...globalStyles.btnPrimary,
          background: saving
            ? '#059669'
            : isValid
              ? `linear-gradient(135deg, ${selectedPlatform?.color}, ${selectedPlatform?.color}CC)`
              : theme.border,
          color: isValid ? '#fff' : theme.subText,
          opacity: saving ? 0.85 : 1,
          transform: saving ? 'scale(0.98)' : 'scale(1)',
          transition: 'all 0.25s ease',
          fontSize: '17px',
        }}
      >
        {saving ? '✅  Ride Saved!' : `Save ${platform} Ride`}
      </button>
    </div>
  );
}