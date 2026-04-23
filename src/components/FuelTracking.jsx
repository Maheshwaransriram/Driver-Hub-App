import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { globalStyles } from '../theme/theme';

const TODAY = new Date().toDateString();

export default function FuelTracking({ 
  theme, 
  fuelLogs, 
  onAddFuelLog, 
  settings, 
  onGoToSettings,
  navDistance 
}) {
  const [f, setF] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    type: 'Petrol',
    location: 'Indian Oil',
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [sortDesc, setSortDesc] = useState(true);

  // ── Calculations ──────────────────────────────────────────────────────────
  const pricePerLiter = Math.max(1, settings.fuelPrice || 103);
  const amountNum = parseFloat(f.amount) || 0;
  const calculatedLiters = amountNum > 0
    ? (amountNum / pricePerLiter).toFixed(2)
    : '0.00';

  const totalSpent = fuelLogs.reduce((s, l) => s + Number(l.amount || 0), 0);
  const totalLiters = fuelLogs.reduce((s, l) => s + Number(l.liters || 0), 0);

  // ── Sorted logs ──────────────────────────────────────────────────────────
  const sortedLogs = useMemo(() => {
    return [...fuelLogs].sort((a, b) => {
      if (sortBy === 'date') {
        return sortDesc 
          ? new Date(b.date) - new Date(a.date)
          : new Date(a.date) - new Date(b.date);
      }
      if (sortBy === 'amount') {
        return sortDesc ? b.amount - a.amount : a.amount - b.amount;
      }
      return 0;
    });
  }, [fuelLogs, sortBy, sortDesc]);

  // ── Form validation ───────────────────────────────────────────────────────
  const handleSubmit = useCallback(async () => {
    setError('');
    if (!f.amount || amountNum <= 0) {
      setError('Enter amount paid (₹10 minimum)');
      return;
    }
    if (!f.location || f.location === '') {
      setError('Select fuel station');
      return;
    }

    setIsSubmitting(true);
    try {
      onAddFuelLog({
        date: f.date,
        amount: amountNum,
        liters: parseFloat(calculatedLiters),
        pricePerLiter,
        type: f.type,
        location: f.location,
        id: Date.now(),
      });
      setF(prev => ({ ...prev, amount: '' }));
    } finally {
      setIsSubmitting(false);
    }
  }, [f, amountNum, calculatedLiters, pricePerLiter, onAddFuelLog]);

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Enter' && e.ctrlKey && amountNum > 0) {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleSubmit, amountNum]);

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputStyle = {
    width: '100%', 
    padding: '18px 20px',
    borderRadius: '16px', 
    marginBottom: '20px',
    background: theme.bg, 
    color: theme.text, 
    border: `2px solid ${theme.border}`,
    boxSizing: 'borderBox', 
    fontSize: '17px',
    fontWeight: '600', 
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: 'SF Mono, monospace',
    WebkitAppearance: 'none',
  };

  const labelStyle = {
    display: 'block', 
    fontSize: '12px', 
    color: theme.subText,
    marginBottom: '8px', 
    fontWeight: '900',
    letterSpacing: '0.8px',
    textTransform: 'uppercase',
  };

  return (
    <div style={{ 
      padding: '24px', 
      paddingTop: '70px', 
      paddingBottom: '100px', 
      boxSizing: 'border-box' 
    }}>
      <h2 style={{ 
        margin: '0 0 4px 0', 
        color: theme.text, 
        fontSize: '28px',
        fontWeight: '900'
      }}>
        ⛽ Fuel Tracking
      </h2>
      <p style={{ 
        color: theme.subText, 
        fontSize: '15px', 
        marginBottom: '28px', 
        marginTop: 0 
      }}>
        Log and analyse your fuel expenses automatically.
      </p>

      {/* ── Fuel Price Banner ────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        backgroundColor: theme.card,
        border: `2px solid ${theme.accent}`,
        borderRadius: '20px', 
        padding: '20px 24px', 
        marginBottom: '24px',
        boxShadow: `0 8px 25px ${theme.accent}20`
      }}>
        <div>
          <p style={{ 
            margin: 0, 
            fontSize: '12px', 
            fontWeight: '900',
            color: theme.subText, 
            letterSpacing: '1px',
            textTransform: 'uppercase'
          }}>
            Current Fuel Price
          </p>
          <p style={{ 
            margin: '6px 0 0', 
            fontSize: '32px', 
            fontWeight: '900', 
            color: theme.accent 
          }}>
            ₹{pricePerLiter.toFixed(2)}
            <span style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: theme.subText 
            }}> / L</span>
          </p>
        </div>
        <button
          onClick={onGoToSettings}
          style={{
            background: 'none', 
            border: `2px solid ${theme.border}`,
            borderRadius: '16px', 
            padding: '12px 20px',
            color: theme.text, 
            fontSize: '14px', 
            fontWeight: '700', 
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
          aria-label="Edit fuel price in settings"
        >
          ✏️ Edit Price
        </button>
      </div>

      {/* ── Log New Refill Form ───────────────────────────────────────────────── */}
      <div style={{ 
        ...globalStyles.card, 
        backgroundColor: theme.card,
        borderColor: theme.accent, 
        borderWidth: '2px',
        marginBottom: '24px'
      }}>
        <h3 style={{ 
          margin: '0 0 24px 0', 
          fontSize: '18px', 
          color: theme.text,
          fontWeight: '800'
        }}>
          Log New Refill
        </h3>

        {/* Error display */}
        {error && (
          <div 
            role="alert" 
            id="form-error"
            style={{
              background: '#FEF2F2',
              color: '#DC2626',
              padding: '16px 20px',
              borderRadius: '16px',
              marginBottom: '20px',
              borderLeft: '4px solid #EF4444',
              fontSize: '15px',
              fontWeight: '600'
            }}
          >
            ⚠️ {error}
          </div>
        )}

        {/* Amount input */}
        <label style={labelStyle}>Amount Paid</label>
        <input
          type="number"
          inputMode="decimal"
          step="0.01"
          min="10"
          placeholder="e.g. 850"
          value={f.amount}
          onChange={e => {
            setError('');
            setF({ ...f, amount: e.target.value });
          }}
          aria-label="Amount paid in rupees"
          aria-invalid={!!error}
          aria-describedby={error ? 'form-error' : undefined}
          style={{
            ...inputStyle,
            borderColor: error ? '#EF4444' : theme.border,
            boxShadow: error ? '0 0 0 3px #EF444420' : 'none'
          }}
        />

        {/* Auto-calculated liters + range */}
        {amountNum > 0 && (
          <div style={{
            background: `${theme.bg}CC`,
            padding: '20px 24px', 
            borderRadius: '16px',
            marginBottom: '24px',
            border: `2px solid ${theme.accent}20`,
            backdropFilter: 'blur(10px)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '20px' }}>
              <div>
                <span style={{ fontSize: '13px', color: theme.subText, fontWeight: '700' }}>
                  Quantity Calculated
                </span>
                <p style={{ 
                  margin: '8px 0 0', 
                  fontSize: '36px', 
                  fontWeight: '900', 
                  color: theme.accent 
                }}>
                  {calculatedLiters} L
                </p>
                <span style={{ fontSize: '14px', color: theme.subText }}>
                  @ ₹{pricePerLiter}/L
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '13px', color: theme.subText }}>Range Added</span>
                <p style={{ 
                  margin: '8px 0 0', 
                  fontSize: '24px', 
                  fontWeight: '800', 
                  color: theme.text 
                }}>
                  {(parseFloat(calculatedLiters) * settings.mileage).toFixed(0)} km
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Station */}
        <label style={labelStyle}>Fuel Station</label>
        <select 
          value={f.location}
          onChange={e => setF({ ...f, location: e.target.value })}
          style={inputStyle}
          aria-label="Fuel station"
        >
          <option value="Indian Oil">Indian Oil</option>
          <option value="HP">HP (Hindustan Petroleum)</option>
          <option value="Bharat Petroleum">Bharat Petroleum</option>
          <option value="Reliance Jio-bp">Reliance / Jio-bp</option>
          <option value="Nayara Energy">Nayara Energy</option>
          <option value="Other">Other</option>
        </select>

        {/* Fuel Type */}
        <label style={labelStyle}>Fuel Type</label>
        <select 
          value={f.type}
          onChange={e => setF({ ...f, type: e.target.value })}
          style={inputStyle}
          aria-label="Fuel type"
        >
          <option value="Petrol">Petrol</option>
          <option value="Diesel">Diesel</option>
          <option value="CNG">CNG</option>
        </select>

        {/* Submit Button */}
        <button
          disabled={isSubmitting || amountNum <= 0}
          onClick={handleSubmit}
          style={{ 
            ...globalStyles.btnPrimary, 
            background: isSubmitting 
              ? 'linear-gradient(135deg, #059669, #047857)' 
              : amountNum > 0 
                ? 'linear-gradient(135deg, #10B981, #059669)' 
                : 'linear-gradient(135deg, #D1D5DB, #9CA3AF)',
            color: amountNum > 0 ? '#FFF' : theme.subText,
            fontSize: '17px',
            fontWeight: '900',
            padding: '20px',
            borderRadius: '20px',
            opacity: isSubmitting ? 0.9 : 1,
            cursor: amountNum > 0 && !isSubmitting ? 'pointer' : 'not-allowed',
            boxShadow: amountNum > 0 
              ? '0 12px 32px rgba(16, 185, 129, 0.4)' 
              : 'none',
            position: 'relative',
            overflow: 'hidden'
          }}
          aria-label="Save fuel log (Ctrl+Enter)"
        >
          {isSubmitting ? (
            <>
              ⏳ Saving Fuel Log...
              <div style={{
                position: 'absolute',
                top: '50%',
                right: '20px',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                border: '2px solid rgba(255,255,255,0.3)',
                borderTop: '2px solid white',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite'
              }} />
            </>
          ) : amountNum > 0 ? (
            `💾 Save Refill (${calculatedLiters} L)`
          ) : (
            'Enter Amount Above'
          )}
        </button>
        <p style={{ 
          fontSize: '12px', 
          color: theme.subText, 
          textAlign: 'center', 
          marginTop: '12px' 
        }}>
          ⌃ Ctrl + ↵ Enter to save
        </p>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────────────── */}
      {fuelLogs.length === 0 ? (
        <div style={{
          backgroundColor: theme.card,
          border: `2px dashed ${theme.border}`,
          borderRadius: '24px',
          padding: '48px 32px',
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '20px' }}>⛽</div>
          <h3 style={{ 
            color: theme.text, 
            fontSize: '22px', 
            margin: '0 0 12px',
            fontWeight: '800' 
          }}>
            No Fuel Logs Yet
          </h3>
          <p style={{ 
            color: theme.subText, 
            fontSize: '16px', 
            margin: 0,
            lineHeight: 1.5
          }}>
            Your first petrol/diesel fill-up will appear here.
          </p>
        </div>
      ) : (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '1fr 1fr', 
          gap: '16px', 
          marginBottom: '24px' 
        }}>
          {[
            { label: 'Total Spent', value: `₹${totalSpent.toLocaleString()}`, icon: '💸' },
            { label: 'Total Filled', value: `${totalLiters.toFixed(1)} L`, icon: '⛽' },
            { label: 'Avg ₹/L', value: `₹${(totalSpent / totalLiters).toFixed(1)}`, icon: '⚡' },
            { label: 'Logs', value: fuelLogs.length.toString(), icon: '📋' },
          ].map(({ label, value, icon }, i) => (
            <div key={i} style={{
              backgroundColor: theme.card,
              borderRadius: '20px',
              border: `1px solid ${theme.border}`,
              padding: '24px 20px',
              textAlign: 'center',
              transition: 'transform 0.2s'
            }} onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'} 
               onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
              <p style={{ 
                margin: 0, 
                fontSize: '12px', 
                color: theme.subText, 
                fontWeight: '800',
                letterSpacing: '0.5px'
              }}>
                {icon} {label}
              </p>
              <p style={{ 
                margin: '12px 0 0', 
                fontSize: '28px', 
                fontWeight: '900', 
                color: theme.text 
              }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* ── History Table ─────────────────────────────────────────────────────── */}
      <div style={{ 
        ...globalStyles.card, 
        backgroundColor: theme.card, 
        borderColor: theme.border 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ 
            margin: 0, 
            fontSize: '18px', 
            color: theme.text,
            fontWeight: '800' 
          }}>
            Fuel History
          </h3>
          {fuelLogs.length > 0 && (
            <button 
              onClick={() => {
                const csv = [
                  'Date,Station,Type,₹/L,Liters,Total',
                  ...sortedLogs.map(l => 
                    `${l.date},${l.location},${l.type},${l.pricePerLiter?.toFixed(1) || pricePerLiter.toFixed(1)}L,${l.liters.toFixed(1)},₹${l.amount}`
                  )
                ].join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `fuel-logs-${TODAY}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              style={{
                padding: '12px 20px',
                background: theme.accentGradient,
                color: 'white',
                border: 'none',
                borderRadius: '16px',
                fontWeight: '700',
                fontSize: '15px',
                cursor: 'pointer',
                boxShadow: `0 8px 25px ${theme.accent}40`
              }}
              aria-label="Export fuel logs as CSV"
            >
              📤 Export CSV
            </button>
          )}
        </div>

        {sortedLogs.length === 0 ? (
          <p style={{ 
            color: theme.subText, 
            textAlign: 'center', 
            padding: '40px 24px', 
            margin: 0,
            fontStyle: 'italic'
          }}>
            Fuel logs will appear here after your first entry.
          </p>
        ) : (
          <div style={{ 
            overflowX: 'auto', 
            borderRadius: '16px',
            border: `1px solid ${theme.border}`,
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            <table style={{ 
              width: '100%', 
              minWidth: '520px',
              borderCollapse: 'collapse',
              fontSize: '15px'
            }}>
              <thead>
                <tr style={{ 
                  color: theme.subText, 
                  borderBottom: `2px solid ${theme.border}`,
                  textAlign: 'left',
                  fontWeight: '800'
                }}>
                  <th 
                    onClick={() => {
                      if (sortBy === 'date') setSortDesc(!sortDesc);
                      else setSortBy('date');
                    }}
                    style={{ 
                      padding: '16px 12px', 
                      cursor: 'pointer',
                      userSelect: 'none',
                      position: 'sticky',
                      left: 0,
                      background: theme.card
                    }}
                    aria-sort={sortBy === 'date' ? (sortDesc ? 'descending' : 'ascending') : 'none'}
                  >
                    Date {sortBy === 'date' && (sortDesc ? '▼' : '▲')}
                  </th>
                  <th 
                    onClick={() => {
                      if (sortBy === 'amount') setSortDesc(!sortDesc);
                      else setSortBy('amount');
                    }}
                    style={{ padding: '16px 12px', cursor: 'pointer', userSelect: 'none' }}
                    aria-sort={sortBy === 'amount' ? (sortDesc ? 'descending' : 'ascending') : 'none'}
                  >
                    Station
                  </th>
                  <th style={{ padding: '16px 12px' }}>₹/L</th>
                  <th style={{ padding: '16px 12px' }}>Qty</th>
                  <th style={{ padding: '16px 12px', textAlign: 'right' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {sortedLogs.map(log => (
                  <tr key={log.id} style={{ 
                    borderBottom: `1px solid ${theme.border}`,
                    transition: 'background-color 0.2s'
                  }} onMouseEnter={(e) => e.currentTarget.style.background = `${theme.accent}10`}
                     onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}>
                    <td style={{ padding: '16px 12px', fontWeight: '600' }}>
                      {new Date(log.date).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '16px 12px', color: theme.text }}>
                      {log.location}
                    </td>
                    <td style={{ 
                      padding: '16px 12px', 
                      color: theme.subText,
                      fontFamily: 'monospace'
                    }}>
                      ₹{(log.pricePerLiter || pricePerLiter).toFixed(1)}
                    </td>
                    <td style={{ padding: '16px 12px', fontWeight: '700' }}>
                      {log.liters.toFixed(1)} L
                    </td>
                    <td style={{ 
                      padding: '16px 12px', 
                      textAlign: 'right', 
                      fontWeight: '900',
                      color: theme.accent,
                      fontSize: '16px'
                    }}>
                      ₹{log.amount.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}