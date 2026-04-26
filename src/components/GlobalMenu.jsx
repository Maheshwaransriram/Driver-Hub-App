import React, { useState } from 'react';

/**
 * GlobalMenu — fixed top-left hamburger menu present on every screen.
 * Renders a ☰ button + slide-in drawer with:
 *   - Analytics (sub-sections)
 *   - Fuel efficiency tips
 *   - Rate us
 *   - About
 */
export default function GlobalMenu({ theme, navigateTo, screen }) {
  const [open, setOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);

  const close = () => { setOpen(false); setAnalyticsOpen(false); };

  const go = (s, tab) => { navigateTo(s, tab); close(); };

  const menuBg   = theme.card;
  const border   = theme.border;
  const text     = theme.text;
  const subText  = theme.subText;
  const accent   = theme.accent;

  return (
    <>
      {/* ── Hamburger button — fixed top-left ─────────────────────────── */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label="Open menu"
        style={{
          position: 'fixed',
          top: 14, left: 14,
          zIndex: 1100,
          width: 40, height: 40,
          borderRadius: 10,
          background: open ? accent : menuBg,
          border: `1px solid ${border}`,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 5, cursor: 'pointer', padding: 0,
          boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
          transition: 'all 0.2s ease',
        }}
      >
        {[0, 1, 2].map(i => (
          <span key={i} style={{
            display: 'block', width: 18, height: 2,
            background: open ? '#fff' : text,
            borderRadius: 2,
            transition: 'all 0.22s ease',
            transform: open
              ? i === 0 ? 'rotate(45deg) translate(5px, 5px)'
              : i === 2 ? 'rotate(-45deg) translate(5px, -5px)'
              : 'scaleX(0)'
              : 'none',
            opacity: open && i === 1 ? 0 : 1,
          }} />
        ))}
      </button>

      {/* ── Backdrop ──────────────────────────────────────────────────── */}
      {open && (
        <div
          onClick={close}
          style={{
            position: 'fixed', inset: 0, zIndex: 1050,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(3px)',
          }}
        />
      )}

      {/* ── Drawer ────────────────────────────────────────────────────── */}
      <div style={{
        position: 'fixed',
        top: 0, left: open ? 0 : -300,
        width: 280, height: '100vh',
        zIndex: 1060,
        background: menuBg,
        borderRight: `1px solid ${border}`,
        boxShadow: open ? '20px 0 60px rgba(0,0,0,0.4)' : 'none',
        transition: 'left 0.28s cubic-bezier(0.4,0,0.2,1)',
        display: 'flex', flexDirection: 'column',
        overflowY: 'auto',
        paddingBottom: 24,
      }}>

        {/* Drawer header */}
        <div style={{
          padding: '56px 20px 16px',
          borderBottom: `1px solid ${border}`,
          marginBottom: 4,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 10, fontSize: 20,
              background: 'linear-gradient(135deg,#7FE832,#00D27A)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>🚀</div>
            <div>
              <div style={{ fontWeight: 900, fontSize: 16, color: text }}>
                Drive<span style={{ color: '#7FE832' }}>X</span> Hub
              </div>
              <div style={{ fontSize: 11, color: subText }}>
                {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' })}
              </div>
            </div>
          </div>
        </div>

        {/* ── ANALYTICS section ───────────────────────────────────────── */}
        <SectionLabel label="📊 Analytics" />

        {/* Analytics accordion toggle */}
        <MenuButton
          icon="📈" label="Analytics" accent={accent} subText={subText} text={text}
          right={<span style={{ fontSize: 12, color: subText }}>{analyticsOpen ? '▲' : '▼'}</span>}
          onClick={() => setAnalyticsOpen(o => !o)}
        />

        {/* Analytics sub-items */}
        {analyticsOpen && (
          <div style={{ marginLeft: 16, borderLeft: `2px solid ${accent}30`, paddingLeft: 4 }}>
            {[
              { icon: '💰', label: 'Earnings & Profit',    tab: 'earnings'  },
              { icon: '🏍️', label: 'Ride Trends',          tab: 'rides'     },
              { icon: '🏢', label: 'Platform Breakdown',   tab: 'platform'  },
              { icon: '🕐', label: 'Peak Hours Heatmap',   tab: 'heatmap'   },
              { icon: '⛽', label: 'Fuel Charts',          tab: 'fuel'      },
              { icon: '📋', label: 'Shift History',        tab: 'shifts'    },
            ].map(({ icon, label, tab }) => (
              <MenuButton
                key={tab} icon={icon} label={label}
                accent={accent} subText={subText} text={subText}
                small
                onClick={() => go('analytics', tab)}
              />
            ))}
          </div>
        )}

        <Divider border={border} />

        {/* ── TOOLS section ───────────────────────────────────────────── */}
        <SectionLabel label="🛠 Tools" />

        <MenuButton icon="⛽" label="Fuel Efficiency Tips" accent={accent} subText={subText} text={text}
          onClick={() => go('tips', 'fuel')} />
        <MenuButton icon="💡" label="Earnings Tips"        accent={accent} subText={subText} text={text}
          onClick={() => go('tips', 'earnings')} />

        <Divider border={border} />

        {/* ── APP section ─────────────────────────────────────────────── */}
        <SectionLabel label="⭐ App" />

        <MenuButton icon="⭐" label="Rate Us"   accent={accent} subText={subText} text={text}
          onClick={() => { close(); rateUs(); }} />
        <MenuButton icon="📤" label="Share App" accent={accent} subText={subText} text={text}
          onClick={() => { close(); shareApp(); }} />
        <MenuButton icon="ℹ️" label="About"     accent={accent} subText={subText} text={text}
          onClick={() => go('about', null)} />

      </div>
    </>
  );
}

// ── Small reusable sub-components ────────────────────────────────────────────
function SectionLabel({ label }) {
  return (
    <p style={{
      margin: '10px 20px 4px',
      fontSize: 10, fontWeight: 800,
      color: 'rgba(100,116,139,0.8)',
      textTransform: 'uppercase', letterSpacing: '0.9px',
    }}>
      {label}
    </p>
  );
}

function Divider({ border }) {
  return <div style={{ margin: '8px 20px', borderTop: `1px solid ${border}` }} />;
}

function MenuButton({ icon, label, onClick, text, subText, accent, small, right }) {
  const [hov, setHov] = React.useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: small ? '9px 20px' : '11px 20px',
        border: 'none', cursor: 'pointer', textAlign: 'left',
        width: '100%', borderRadius: 10,
        background: hov ? `${accent}18` : 'transparent',
        color: text,
        fontSize: small ? 13 : 14,
        fontWeight: small ? 500 : 600,
        transition: 'background 0.15s',
      }}
    >
      <span style={{ fontSize: small ? 15 : 18, width: 24, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {right}
    </button>
  );
}

// ── Native actions ────────────────────────────────────────────────────────────
function rateUs() {
  // Opens Play Store listing — replace com.driverhub.app with your actual package ID
  const url = 'market://details?id=com.driverhub.app';
  try { window.open(url, '_blank'); } catch { /* web fallback */ }
}

function shareApp() {
  const text = 'I use DriveX Hub to track my rides and earnings! 🚀';
  if (navigator.share) {
    navigator.share({ title: 'DriveX Hub', text, url: 'https://play.google.com/store' }).catch(() => {});
  } else {
    navigator.clipboard?.writeText(text).catch(() => {});
  }
}