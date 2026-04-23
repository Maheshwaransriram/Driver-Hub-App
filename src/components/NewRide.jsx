import React, { useState, useMemo, useCallback, useTransition, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { globalStyles } from '../theme/theme';
import { calculateFareFromRateCard, DEFAULT_RATE_CARDS } from './RateCard';

const PLATFORMS = [
  { id: 'Rapido', emoji: '🏍️', color: '#FF4757', primary: true },
  { id: 'Uber',   emoji: '🚗', color: '#3B82F6', primary: true },
  { id: 'Ola',    emoji: '🟡', color: '#F59E0B', primary: true },
  { id: 'BluSmart', emoji: '🚙', color: '#10B981', primary: false },
  { id: 'NammaYatri', emoji: '🚐', color: '#6366F1', primary: false },
  { id: 'Other',  emoji: '🛵', color: '#A78BFA', primary: false },
];

/**
 * AddRide - Comprehensive ride logging with real-time earnings preview
 */
export default function AddRide({ 
  onSave, 
  onBack, 
  theme, 
  settings, 
  rateCards, 
  initialDist = 0 
}) {
  const [platform, setPlatform] = useState('Rapido');
  const [fare, setFare] = useState('');
  const [dist, setDist] = useState(initialDist > 0 ? initialDist.toFixed(2) : '');
  const [extraFare, setExtraFare] = useState('');
  const [extraDeduct, setExtraDeduct] = useState('');
  const [timeMin, setTimeMin] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const formRef = useRef(null);

  // Parse safely
  const fareN = parseFloat(fare) || 0;
  const distN = parseFloat(dist) || 0;
  const extraFareN = parseFloat(extraFare) || 0;
  const extraDeductN = parseFloat(extraDeduct) || 0;
  const timeMinN = parseInt(timeMin) || 0;
  const isNight = (() => {
    const h = new Date().getHours();
    return h >= 23 || h < 6;
  })();

  // Enhanced earnings preview with validation
  const preview = useMemo(() => {
    if (!settings || distN <= 0) return null;

    const rc = rateCards?.[platform] || DEFAULT_RATE_CARDS[platform] || DEFAULT_RATE_CARDS.Rapido;
    const fuelCost = (distN / settings.mileage) * settings.fuelPrice;

    if (rc) {
      const platformFee = rc.platformFee || 0;
      const thirdPartyFee = rc.thirdPartyFee || 0;

      if (fareN > 0) {
        // Manual fare entry
        const commAmt = rc.commissionType === 'flat'
          ? (rc.commission || 0)
          : fareN * (rc.commission || 0) / 100;
        const govtTax = fareN * (rc.govtTaxPercent || 0) / 100;
        const gross = fareN + extraFareN;
        const net = gross - commAmt - govtTax - platformFee - thirdPartyFee - extraDeductN - fuelCost;
        
        return {
          gross, appFare: fareN, extraFare: extraFareN,
          commAmt, govtTax, platformFee, thirdPartyFee,
          extraDeduct: extraDeductN, fuelCost, net,
          nightBonus: 0, usingRateCard: false,
        };
      } else {
        // Rate card estimate
        const calc = calculateFareFromRateCard(rc, distN, timeMinN, isNight);
        const gross = calc.gross + extraFareN;
        const net = calc.net + extraFareN - extraDeductN - fuelCost;
        
        return {
          gross, appFare: calc.gross, extraFare: extraFareN,
          commAmt: calc.commission, govtTax: calc.gst,
          platformFee, thirdPartyFee,
          extraDeduct: extraDeductN, fuelCost, net,
          nightBonus: calc.nightBonus, usingRateCard: true,
        };
      }
    }

    // Fallback for unknown platforms
    if (fareN <= 0) return null;
    const commAmt = fareN * 0.20;
    const govtTax = fareN * 0.05;
    const gross = fareN + extraFareN;
    const net = gross - commAmt - govtTax - extraDeductN - fuelCost;
    
    return {
      gross, appFare: fareN, extraFare: extraFareN,
      commAmt, govtTax, platformFee: 0, thirdPartyFee: 0,
      extraDeduct: extraDeductN, fuelCost, net,
      nightBonus: 0, usingRateCard: false,
    };
  }, [fareN, distN, extraFareN, extraDeductN, timeMinN, platform, settings, rateCards, isNight]);

  const isValid = distN > 0 && (fareN > 0 || preview?.usingRateCard);

  // Auto-focus first field
  useEffect(() => {
    if (formRef.current) {
      const firstInput = formRef.current.querySelector('input, textarea');
      firstInput?.focus();
    }
  }, []);

  // Keyboard detection for mobile
  useEffect(() => {
    const handleResize = () => {
      setKeyboardVisible(window.innerHeight < window.screen.height * 0.9);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSave = useCallback(() => {
    if (!isValid) return;
    setSaving(true);
    
    // Simulate network delay + haptic feedback
    setTimeout(() => {
      onSave({
        platform,
        fare: fareN,
        dist: distN,
        timeMin: timeMinN,
        extraFare: extraFareN,
        extraDeduct: extraDeductN,
        notes,
      });
      setSaving(false);
      onBack(); // Auto-navigate back
    }, 600);
  }, [isValid, platform, fareN, distN, timeMinN, extraFareN, extraDeductN, notes, onSave, onBack]);

  const inputStyle = {
    width: '100%', padding: '16px 20px',
    borderRadius: '16px',
    background: theme.bg, 
    color: theme.text,
    border: `2px solid ${theme.border}`,
    boxSizing: 'border-box', 
    fontSize: '16px',
    fontWeight: '700', 
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'SF Mono, monospace',
    WebkitAppearance: 'none',
    MozAppearance: 'textfield',
  };

  const labelStyle = {
    fontSize: '11px', 
    fontWeight: '900', 
    letterSpacing: '1.2px',
    color: theme.subText, 
    textTransform: 'uppercase',
    marginBottom: '12px', 
    display: 'block',
  };

  const NumberInput = ({ label, value, onChange, placeholder, prefix, suffix, color, disabled }) => (
    <div style={{ flex: 1 }}>
      <label style={{ 
        ...labelStyle, 
        fontSize: '10px', 
        color: color || theme.subText,
        opacity: disabled ? 0.5 : 1
      }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        {prefix && (
          <span style={{ 
            position: 'absolute', 
            left: '16px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: theme.subText, 
            fontSize: '16px', 
            fontWeight: '700',
            pointerEvents: 'none'
          }}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          inputMode="decimal"
          min="0"
          step="0.01"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          style={{
            ...inputStyle,
            paddingLeft: prefix ? '44px' : '20px',
            paddingRight: suffix ? '44px' : '20px',
            background: disabled ? `${theme.bg}CC` : theme.bg,
            opacity: disabled ? 0.6 : 1,
            cursor: disabled ? 'not-allowed' : 'default',
          }}
          aria-label={label}
        />
        {suffix && (
          <span style={{ 
            position: 'absolute', 
            right: '16px', 
            top: '50%', 
            transform: 'translateY(-50%)', 
            color: theme.subText, 
            fontSize: '14px', 
            fontWeight: '700',
            pointerEvents: 'none'
          }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );

  const selectedPlatform = PLATFORMS.find(p => p.id === platform);

  return (
    <div style={{ 
      padding: '24px', 
      paddingTop: '20px', 
      paddingBottom: keyboardVisible ? '200px' : '110px', 
      boxSizing: 'border-box',
      maxWidth: '600px',
      margin: '0 auto'
    }} ref={formRef}>
      
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '16px', 
        marginBottom: '28px',
        paddingBottom: '20px',
        borderBottom: `1px solid ${theme.border}`
      }}>
        <button 
          onClick={onBack}
          style={{
            width: '48px', 
            height: '48px', 
            borderRadius: '14px',
            border: `2px solid ${theme.border}`,
            background: theme.card, 
            color: theme.text,
            fontSize: '20px', 
            cursor: 'pointer',
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            transition: 'all 0.2s',
            flexShrink: 0
          }}
          aria-label="Go back"
        >
          ←
        </button>
        <div>
          <h1 style={{ 
            color: theme.text, 
            fontSize: '28px', 
            fontWeight: '900', 
            margin: '0 0 4px 0',
            letterSpacing: '-0.02em'
          }}>
            Log New Ride
          </h1>
          {initialDist > 0 && (
            <p style={{ 
              margin: 0, 
              fontSize: '13px', 
              color: '#10B981', 
              fontWeight: '700'
            }}>
              📍 GPS distance auto-filled ({initialDist.toFixed(2)} km)
            </p>
          )}
        </div>
      </div>

      {/* Platform Selector */}
      <div style={{ 
        ...globalStyles.card, 
        backgroundColor: theme.card, 
        borderColor: theme.border, 
        marginBottom: '20px'
      }}>
        <label style={labelStyle}>Platform</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {PLATFORMS.map(p => {
            const active = platform === p.id;
            return (
              <button
                key={p.id}
                onClick={() => setPlatform(p.id)}
                style={{
                  flex: p.primary ? '1 1 48%' : '1 1 30%',
                  padding: '16px 12px',
                  borderRadius: '16px',
                  border: `3px solid ${active ? p.color : theme.border}`,
                  background: active ? `${p.color}20` : theme.bg,
                  cursor: 'pointer',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  minHeight: '72px',
                  transform: active ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: active ? `0 8px 24px ${p.color}40` : 'none'
                }}
                aria-label={`Select ${p.id} platform`}
                aria-pressed={active}
              >
                <span style={{ fontSize: '24px' }}>{p.emoji}</span>
                <span style={{ 
                  fontSize: '12px', 
                  fontWeight: '900', 
                  color: active ? 'white' : p.color,
                  textAlign: 'center'
                }}>
                  {p.id}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Ride Details Form */}
      <div style={{ 
        ...globalStyles.card, 
        backgroundColor: theme.card, 
        borderColor: theme.border, 
        marginBottom: '20px',
        padding: '24px'
      }}>
        <label style={labelStyle}>Ride Details</label>

        {/* Primary inputs */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
          <NumberInput
            label="App Fare"
            value={fare}
            onChange={setFare}
            placeholder="45.00"
            prefix="₹"
            color="#10B981"
          />
          <NumberInput
            label={initialDist > 0 ? "Distance (GPS)" : "Distance"}
            value={dist}
            onChange={setDist}
            placeholder="4.2"
            suffix="km"
            disabled={initialDist > 0}
          />
        </div>

        {/* Secondary inputs */}
        <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
          <NumberInput
            label="Trip Time"
            value={timeMin}
            onChange={setTimeMin}
            placeholder="12"
            suffix="min"
          />
          <NumberInput
            label="Extra Income"
            value={extraFare}
            onChange={setExtraFare}
            placeholder="15"
            prefix="₹"
            color="#10B981"
          />
          <NumberInput
            label="Deductions"
            value={extraDeduct}
            onChange={setExtraDeduct}
            placeholder="5"
            prefix="₹"
            color="#EF4444"
          />
        </div>

        {/* Notes */}
        <label style={{ ...labelStyle, fontSize: '10px' }}>Notes (optional)</label>
        <textarea
          placeholder="Airport, surge pricing, highway toll, good tipper, waiting time..."
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 200))}
          rows={3}
          maxLength={200}
          style={{
            ...inputStyle,
            resize: 'vertical',
            minHeight: '80px',
            lineHeight: '1.5',
            fontFamily: 'inherit',
            fontSize: '15px',
            fontWeight: '500'
          }}
          aria-label="Ride notes"
        />
        <div style={{ 
          textAlign: 'right', 
          fontSize: '11px', 
          color: theme.subText,
          marginTop: '4px'
        }}>
          {notes.length}/200
        </div>
      </div>

      {/* Earnings Preview */}
      {preview ? (
        <div style={{
          ...globalStyles.card,
          backgroundColor: theme.card,
          borderColor: preview.net >= 0 ? `${selectedPlatform?.color}60` : '#EF444440',
          borderWidth: '3px',
          marginBottom: '24px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Status badges */}
          <div style={{ 
            position: 'absolute', 
            top: '16px', 
            right: '16px',
            display: 'flex',
            gap: '8px'
          }}>
            {isNight && (
              <span style={{
                fontSize: '11px',
                fontWeight: '800',
                color: '#A78BFA',
                background: '#A78BFA20',
                padding: '4px 10px',
                borderRadius: '12px'
              }}>
                🌙 Night
              </span>
            )}
            {preview.usingRateCard && (
              <span style={{
                fontSize: '11px',
                color: '#10B981',
                background: '#10B98120',
                padding: '4px 10px',
                borderRadius: '12px',
                fontWeight: '700'
              }}>
                📊 Rate Card
              </span>
            )}
          </div>

          <label style={{ 
            ...labelStyle, 
            color: theme.accent, 
            margin: '24px 0 16px 0',
            fontSize: '12px'
          }}>
            Earnings Preview ({distN.toFixed(1)} km)
          </label>

          {/* Breakdown */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
            {[
              preview.appFare > 0 && { label: 'App Fare', value: `+₹${preview.appFare.toFixed(1)}`, color: '#10B981' },
              preview.nightBonus > 0 && { label: 'Night Bonus', value: `+₹${preview.nightBonus.toFixed(1)}`, color: '#A78BFA' },
              preview.extraFare > 0 && { label: 'Tip/Cash', value: `+₹${preview.extraFare.toFixed(1)}`, color: '#10B981' },
              preview.commAmt > 0 && { label: 'Commission', value: `-₹${preview.commAmt.toFixed(1)}`, color: '#EF4444' },
              preview.govtTax > 0 && { label: 'GST', value: `-₹${preview.govtTax.toFixed(1)}`, color: '#F59E0B' },
              preview.platformFee > 0 && { label: 'Platform Fee', value: `-₹${preview.platformFee.toFixed(1)}`, color: '#F59E0B' },
              preview.thirdPartyFee > 0 && { label: 'Insurance', value: `-₹${preview.thirdPartyFee.toFixed(1)}`, color: '#F59E0B' },
              preview.extraDeduct > 0 && { label: 'Penalty', value: `-₹${preview.extraDeduct.toFixed(1)}`, color: '#EF4444' },
              preview.fuelCost > 0 && { label: 'Fuel', value: `-₹${preview.fuelCost.toFixed(1)}`, color: '#D97706' },
            ].filter(Boolean).map(({ label, value, color }, i) => (
              <div key={i} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: i < 8 ? `1px solid ${theme.border}40` : 'none'
              }}>
                <span style={{ fontSize: '14px', color: theme.text }}>{label}</span>
                <span style={{ 
                  fontSize: '16px', 
                  fontWeight: '800', 
                  color,
                  fontFamily: 'SF Mono, monospace'
                }}>
                  {value}
                </span>
              </div>
            ))}
          </div>

          {/* Final amount */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '20px',
            background: preview.net >= 0 ? '#10B98115' : '#EF444415',
            borderRadius: '16px',
            margin: '0 -24px -24px'
          }}>
            <span style={{ 
              fontSize: '16px', 
              fontWeight: '800', 
              color: theme.text 
            }}>
              You earn
            </span>
            <span style={{
              fontSize: '36px',
              fontWeight: '900',
              color: preview.net >= 0 ? '#10B981' : '#EF4444',
              fontFamily: 'SF Mono, monospace',
              lineHeight: 1
            }}>
              ₹{Math.abs(preview.net).toFixed(0)}
            </span>
          </div>

          {distN > 0 && preview.net > 0 && (
            <p style={{ 
              textAlign: 'center',
              fontSize: '13px',
              color: '#10B981',
              fontWeight: '700',
              margin: 0
            }}>
              💰 ₹{(preview.net / distN).toFixed(1)} per km
            </p>
          )}
        </div>
      ) : (
        <div style={{ 
          ...globalStyles.card, 
          backgroundColor: theme.card, 
          borderColor: theme.border, 
          marginBottom: '24px',
          textAlign: 'center', 
          padding: '40px 24px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>💰</div>
          <p style={{ 
            color: theme.subText, 
            fontSize: '15px', 
            margin: '0 0 8px 0',
            fontWeight: '600'
          }}>
            {distN > 0 ? 'Enter fare to preview' : 'Enter distance for rate card estimate'}
          </p>
          <p style={{ 
            color: theme.subText, 
            fontSize: '13px', 
            margin: 0
          }}>
            Uses your saved platform commission rates
          </p>
        </div>
      )}

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={!isValid || saving}
        style={{
          width: '100%',
          ...globalStyles.btnPrimary,
          padding: '22px 32px',
          borderRadius: '20px',
          background: saving
            ? 'linear-gradient(135deg, #10B981, #059669)'
            : isValid
              ? `linear-gradient(135deg, ${selectedPlatform?.color || '#6366F1'}, ${selectedPlatform?.color}CC)`
              : `linear-gradient(135deg, ${theme.border}, ${theme.border})`,
          color: isValid ? '#FFF' : theme.subText,
          fontSize: '18px',
          fontWeight: '900',
          letterSpacing: '0.5px',
          opacity: saving ? 0.9 : isValid ? 1 : 0.6,
          transform: saving ? 'scale(0.98)' : 'scale(1)',
          cursor: isValid && !saving ? 'pointer' : 'not-allowed',
          boxShadow: isValid && !saving 
            ? `0 12px 32px ${selectedPlatform?.color || '#6366F1'}50` 
            : 'none',
          position: 'sticky',
          bottom: '20px'
        }}
        aria-label="Save ride to log"
      >
        {saving ? (
          <>
            ✅ Saving...
            <div style={{
              width: '20px',
              height: '20px',
              border: '2px solid rgba(255,255,255,0.3)',
              borderTop: '2px solid white',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite',
              marginLeft: '12px',
              display: 'inline-block'
            }} />
          </>
        ) : (
          `💾 Save ${selectedPlatform?.emoji || '🛵'} ${platform} Ride`
        )}
      </button>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input[type=number]::-webkit-outer-spin-button,
        input[type=number]::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
      `}</style>
    </div>
  );
}

AddRide.propTypes = {
  onSave: PropTypes.func.isRequired,
  onBack: PropTypes.func.isRequired,
  theme: PropTypes.object.isRequired,
  settings: PropTypes.object,
  rateCards: PropTypes.object,
  initialDist: PropTypes.number
};