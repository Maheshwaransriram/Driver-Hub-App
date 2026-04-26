import React, { useState, useEffect, useCallback, useTransition, Suspense, useMemo } from "react";
import Dashboard from "./components/Dashboard";
import ShiftManagement from "./components/ShiftManagement";
import SettingsScreen from "./components/SettingsScreen";
import AddRide from "./components/NewRide";
import RateCard, { DEFAULT_RATE_CARDS, calculateFareFromRateCard } from "./components/RateCard";
import NavButton from "./components/NavButton";
import FuelTracking from "./components/FuelTracking";
import NavigationMap from "./components/NavigationMap";
import { themes, globalStyles } from "./theme/theme";
import GlobalMenu from "./components/GlobalMenu";
import Analytics from "./components/Analytics";
import Tips from "./components/Tips";
import { useGpsTracking } from "./hooks/UseGpsTracking";

const DEFAULT_SETTINGS = {
  dailyGoal:  1000,
  rideGoal:   15,
  mileage:    45,
  fuelPrice:  103,
};

const TODAY = new Date().toDateString();

// ── Error boundary — prevents white screen of death ──────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('App crash:', error, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '40px', textAlign: 'center', background: '#fef3c7', minHeight: '100vh', fontFamily: 'system-ui' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: '#92400e', margin: '0 0 12px' }}>Something went wrong</h2>
          <p style={{ color: '#92400e', fontSize: '14px', margin: '0 0 24px' }}>Your ride data is safe.</p>
          <button onClick={() => window.location.reload()}
            style={{ padding: '12px 28px', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: '10px', fontWeight: '700', fontSize: '15px', cursor: 'pointer' }}>
            🔄 Restart App
          </button>
          <details style={{ marginTop: '20px', fontSize: '12px', color: '#78350f' }}>
            <summary style={{ cursor: 'pointer' }}>Error details</summary>
            <pre style={{ textAlign: 'left', padding: '12px', background: '#fef9c3', borderRadius: '8px', marginTop: '8px', overflow: 'auto' }}>
              {this.state.error?.toString()}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Safe number helper ────────────────────────────────────────────────────────
const safeFloat = (v, fallback = 0) => {
  const n = parseFloat(v);
  return (isFinite(n) && n >= 0) ? n : fallback;
};

// ── Safe localStorage with quota guard ───────────────────────────────────────
const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    // QuotaExceededError — prune rides and retry once
    if (key === 'dh_rides') {
      try {
        const trimmed = (Array.isArray(value) ? value : []).slice(0, 90);
        localStorage.setItem(key, JSON.stringify(trimmed));
      } catch { /* give up silently */ }
    }
  }
};

// ── Load from localStorage with date‐aware migration ─────────────────────────
const loadState = () => {
  const load = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  };

  // Validate ride entries — corrupt entries crash render
  const rawRides = load('dh_rides', []);
  const rides = Array.isArray(rawRides) ? rawRides.filter(r =>
    r && typeof r === 'object' &&
    typeof r.id        === 'number' &&
    typeof r.net       === 'number' && isFinite(r.net) &&
    typeof r.fare      === 'number' && isFinite(r.fare) &&
    typeof r.dist      === 'number' && isFinite(r.dist) &&
    typeof r.timestamp === 'string' &&
    typeof r.platform  === 'string'
  ) : [];

  // Validate fuel logs
  const rawFuel = load('dh_fuel', []);
  const fuelLogs = Array.isArray(rawFuel) ? rawFuel.filter(l =>
    l && typeof l === 'object' &&
    typeof l.id     === 'number' &&
    typeof l.liters === 'number' && isFinite(l.liters) && l.liters > 0 &&
    typeof l.amount === 'number' && isFinite(l.amount) && l.amount > 0
  ) : [];

  // Deep merge rate cards so new fields always have defaults
  const savedCards = load('dh_rate_cards', {});
  const rateCards = {};
  for (const platform of Object.keys(DEFAULT_RATE_CARDS)) {
    rateCards[platform] = { ...DEFAULT_RATE_CARDS[platform], ...(savedCards[platform] || {}) };
  }

  // navDistance — daily reset
  const navRaw = load('dh_nav_state', null);
  const navDistance = (navRaw && navRaw.date === TODAY) ? safeFloat(navRaw.savedDistance) : 0;

  // isOnline — restore if today's shift was active
  const onlineRaw = load('dh_shift_online', null);
  const isOnline = onlineRaw?.date === TODAY ? !!onlineRaw.online : false;

  return {
    rides,
    fuelLogs,
    settings: { ...DEFAULT_SETTINGS, ...load('dh_settings', {}) },
    rateCards,
    navDistance,
    isOnline,
    themeMode: localStorage.getItem('dh_theme') || 'dark',
  };
};

// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const [isPending, startTransition] = useTransition();
  const [screen, setScreen] = useState('dashboard');

  // Load persisted state once on mount
  const initial = useMemo(() => loadState(), []); // eslint-disable-line

  const [isOnline,      setIsOnline]      = useState(initial.isOnline);
  const [rides,         setRides]         = useState(initial.rides);
  const [fuelLogs,      setFuelLogs]      = useState(initial.fuelLogs);
  const [settings,      setSettings]      = useState(initial.settings);
  const [rateCards,     setRateCards]     = useState(initial.rateCards);
  const [navDistance,   setNavDistance]   = useState(initial.navDistance);
  const [shiftDistance, setShiftDistance] = useState(0);
  const [pendingDist,   setPendingDist]   = useState(0);
  const [themeMode,     setThemeMode]     = useState(initial.themeMode);
  const [analyticsTab,  setAnalyticsTab]  = useState('earnings');
  const [tipsTab,       setTipsTab]       = useState('fuel');
  const [shiftHistory,  setShiftHistory]  = useState(() => {
    try { return JSON.parse(localStorage.getItem('dh_shift_history') || '[]'); }
    catch { return []; }
  });

  // ── Persistence ─────────────────────────────────────────────────────────
  useEffect(() => { safeSet('dh_rides',      rides);      }, [rides]);
  useEffect(() => { safeSet('dh_fuel',       fuelLogs);   }, [fuelLogs]);
  useEffect(() => { safeSet('dh_settings',   settings);   }, [settings]);
  useEffect(() => { safeSet('dh_rate_cards', rateCards);  }, [rateCards]);
  useEffect(() => {
    localStorage.setItem('dh_theme', themeMode);
    document.body.style.backgroundColor = themeMode === 'dark' ? '#0B1437' : '#F4F7FE';
  }, [themeMode]);
  useEffect(() => {
    localStorage.setItem('dh_shift_online', JSON.stringify({ online: isOnline, date: TODAY }));
  }, [isOnline]);
  useEffect(() => {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}, []);

  // ── GPS hook — lives at App level, never stops on screen change ───────────
  const handleRideComplete = useCallback((distKm) => {
    setPendingDist(distKm);
    startTransition(() => setScreen('add'));
  }, []);

  const gps = useGpsTracking({
    isOnline,
    onDistanceUpdate:      useCallback((km) => setNavDistance(km), []),
    onShiftDistanceUpdate: useCallback((km) => setShiftDistance(km), []),
    onRideComplete:        handleRideComplete,
  });

  // ── Theme ────────────────────────────────────────────────────────────────
  const currentTheme = themes[themeMode] || themes.dark;

  // ── Fuel gauge calculation ───────────────────────────────────────────────
  const fuelStats = useMemo(() => {
    if (!fuelLogs.length) return { percentage: 0, range: 0, value: 0, currentLiters: 0 };

    const mileage   = Math.max(1, settings.mileage   || 45);
    const fuelPrice = Math.max(1, settings.fuelPrice  || 103);
    const totalLiters    = fuelLogs.reduce((s, l) => s + safeFloat(l.liters), 0);
    const totalDist      = navDistance > 0
      ? navDistance
      : rides.reduce((s, r) => s + safeFloat(r.dist), 0);
    const consumed           = totalDist / mileage;
    const remainingLiters    = Math.max(0, totalLiters - consumed);

    const lastLog         = fuelLogs[0];
    const lastFillRange   = safeFloat(lastLog.liters) * mileage;
    const distBeforeLast  = rides
      .filter(r => r.id < lastLog.id)
      .reduce((s, r) => s + safeFloat(r.dist), 0);
    const prevLiters      = fuelLogs.slice(1).reduce((s, l) => s + safeFloat(l.liters), 0);
    const rangeBeforeLast = Math.max(0, prevLiters * mileage - distBeforeLast);
    const maxRange        = lastFillRange + rangeBeforeLast;
    const percentage      = maxRange > 0 ? (remainingLiters * mileage / maxRange) * 100 : 0;

    return {
      percentage:    Math.min(100, Math.max(0, percentage)),
      range:         Math.max(0, remainingLiters * mileage),
      value:         Math.max(0, remainingLiters * fuelPrice),
      currentLiters: Math.max(0, remainingLiters),
    };
  }, [fuelLogs, navDistance, rides, settings]);

  // ── Fuel alert ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!fuelLogs.length || fuelStats.range > 16) return;
    if (typeof Notification === 'undefined') return;   // guard: Android WebView
    if (Notification.permission !== 'granted') return; // only fire when permitted
    try {
      new Notification('⛽ Low Fuel', {
        body: `Only ${fuelStats.range.toFixed(1)} km remaining. Refill soon!`,
      });
    } catch { /* swallow any remaining platform exceptions */ }
  }, [fuelStats.range, fuelLogs.length]);

  // ── addRide — full fare calculation ──────────────────────────────────────
  // FIX: was just storing raw onSave data without calculating deductions
  const addRide = useCallback((rideData) => {
    const rc       = rateCards[rideData.platform] || DEFAULT_RATE_CARDS[rideData.platform] || DEFAULT_RATE_CARDS.Rapido;
    const isNight  = (() => { const h = new Date().getHours(); return h >= 23 || h < 6; })();
    const calc     = calculateFareFromRateCard(rc, rideData.dist, rideData.timeMin || 0, isNight);
    const fuelCost      = (safeFloat(rideData.dist) / Math.max(1, settings.mileage)) * settings.fuelPrice;
    const extraFareN    = safeFloat(rideData.extraFare);
    const extraDeductN  = safeFloat(rideData.extraDeduct);

    let finalFare, commAmt, govtTax, platformFee, thirdPartyFee, net;

    if (rideData.fare > 0) {
      finalFare     = safeFloat(rideData.fare);
      commAmt       = rc?.commissionType === 'flat'
        ? safeFloat(rc?.commission)
        : finalFare * safeFloat(rc?.commission) / 100;
      govtTax       = finalFare * safeFloat(rc?.govtTaxPercent) / 100;
      platformFee   = safeFloat(rc?.platformFee);
      thirdPartyFee = safeFloat(rc?.thirdPartyFee);
      net = finalFare + extraFareN - commAmt - govtTax - platformFee - thirdPartyFee - extraDeductN - fuelCost;
    } else {
      finalFare     = calc.gross;
      commAmt       = calc.commission;
      govtTax       = calc.gst;
      platformFee   = safeFloat(rc?.platformFee);
      thirdPartyFee = safeFloat(rc?.thirdPartyFee);
      net = calc.net + extraFareN - extraDeductN - fuelCost;
    }

    const ride = {
      ...rideData,
      id:            Date.now(),
      fare:          parseFloat((finalFare     || 0).toFixed(2)),
      net:           parseFloat((net           || 0).toFixed(2)),
      commAmt:       parseFloat((commAmt       || 0).toFixed(2)),
      taxAmt:        parseFloat((govtTax       || 0).toFixed(2)),
      platformFee:   parseFloat((platformFee   || 0).toFixed(2)),
      thirdPartyFee: parseFloat((thirdPartyFee || 0).toFixed(2)),
      extraFare:     parseFloat((extraFareN    || 0).toFixed(2)),
      extraDeduct:   parseFloat((extraDeductN  || 0).toFixed(2)),
      fuelCost:      parseFloat((fuelCost      || 0).toFixed(2)),
      dist:          parseFloat((safeFloat(rideData.dist)).toFixed(3)),
      isNight,
      timestamp: new Date().toISOString(),
    };

    setRides(prev => [ride, ...prev]);
    setPendingDist(0);
    startTransition(() => setScreen('dashboard'));
  }, [rateCards, settings]);

  // ── Shift end ────────────────────────────────────────────────────────────
  const handleSetIsOnline = useCallback((val) => {
    setIsOnline(val);
    if (!val) {
      setShiftDistance(0);
      localStorage.removeItem('dh_shift_state');
      localStorage.removeItem('dh_shift_online');
    }
  }, []);

  // ── Navigation helper ────────────────────────────────────────────────────
  const navigateTo = useCallback((s, tab) => {
    startTransition(() => {
      setScreen(s);
      if (s === 'analytics' && tab) setAnalyticsTab(tab);
      if (s === 'tips'      && tab) setTipsTab(tab);
    });
  }, []);

  const todayRides     = rides.filter(r => new Date(r.timestamp).toDateString() === TODAY);
  const todayNetProfit = todayRides.reduce((s, r) => s + safeFloat(r.net), 0);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <div style={{ ...globalStyles.appWrapper, backgroundColor: currentTheme.bg, color: currentTheme.text }}>

        {/* Global hamburger menu — present on every screen */}
        <GlobalMenu
          theme={currentTheme}
          navigateTo={navigateTo}
          screen={screen}
        />

        {/* NavigationMap renders OUTSIDE the container — it manages its own
            full-bleed fixed layout to avoid the paddingBottom:90px constraint */}
        {screen === 'navigation' && (
          <NavigationMap
            theme={currentTheme}
            isOnline={isOnline}
            isRiding={gps.isRiding}
            rideDistance={gps.rideDistance}
            shiftDistance={gps.shiftDistance}
            savedDistance={gps.savedDistance}
            speed={gps.speed}
            lastPosition={gps.lastPosition}
            lastPositionRef={gps.lastPositionRef}
            geoError={gps.geoError}
            getRidePath={gps.getRidePath}
            onStartRide={gps.startRide}
            onEndRide={gps.endRide}
          />
        )}

        <div style={globalStyles.container}>

          {/* Loading overlay during screen transitions */}
          {isPending && (
            <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '3px', zIndex: 9999, background: currentTheme.accent, animation: 'progress 0.4s ease' }} />
          )}

          <Suspense fallback={null}>

            {screen === 'dashboard' && (
              <Dashboard
                rides={rides}
                fuelPercentage={fuelStats.percentage}
                remainingRange={fuelStats.range}
                fuelValue={fuelStats.value}
                currentLiters={fuelStats.currentLiters}
                navDistance={navDistance}
                settings={settings}
                theme={currentTheme}
                onDelete={(id) => setRides(prev => prev.filter(r => r.id !== id))}
                onAddRide={() => navigateTo('add')}
              />
            )}

            {screen === 'shifts' && (
              <ShiftManagement
                isOnline={isOnline}
                setIsOnline={handleSetIsOnline}
                theme={currentTheme}
                shiftDistance={shiftDistance}
                todayRideCount={todayRides.length}
                onHistoryUpdate={setShiftHistory}
              />
            )}

            {screen === 'fuel' && (
              <FuelTracking
                theme={currentTheme}
                fuelLogs={fuelLogs}
                // FIX: was onAddLog — FuelTracking.jsx expects onAddFuelLog
                onAddFuelLog={(log) => setFuelLogs(prev => [log, ...prev])}
                settings={settings}
                navDistance={navDistance}
                onGoToSettings={() => navigateTo('settings')}
              />
            )}

            {screen === 'add' && (
              <AddRide
                onSave={addRide}
                onBack={() => { navigateTo('dashboard'); setPendingDist(0); }}
                theme={currentTheme}
                settings={settings}
                rateCards={rateCards}
                initialDist={pendingDist}
              />
            )}

            {screen === 'settings' && (
              <SettingsScreen
                settings={settings}
                onSave={setSettings}
                theme={currentTheme}
                themeMode={themeMode}
                onToggleTheme={() => setThemeMode(m => m === 'light' ? 'dark' : 'light')}
                onOpenRateCard={() => navigateTo('ratecard')}
              />
            )}

            {/* FIX: RateCard screen was completely missing — caused blank screen on Edit Rate Card */}
            {screen === 'ratecard' && (
              <RateCard
                theme={currentTheme}
                rateCards={rateCards}
                onSave={(updated) => setRateCards(updated)}
                onBack={() => navigateTo('settings')}
              />
            )}

            {screen === 'analytics' && (
              <Analytics
                rides={rides}
                fuelLogs={fuelLogs}
                shiftHistory={shiftHistory}
                settings={settings}
                theme={currentTheme}
                initialTab={analyticsTab}
                onBack={() => navigateTo('dashboard')}
              />
            )}

            {screen === 'tips' && (
              <Tips
                theme={currentTheme}
                initialTab={tipsTab}
                onBack={() => navigateTo('dashboard')}
              />
            )}

          </Suspense>
        </div>

        {/* Bottom navigation */}
        <nav style={{
          ...globalStyles.nav,
          backgroundColor: currentTheme.nav,
          borderTop: `1px solid ${currentTheme.border}`,
        }}>
          <NavButton active={screen === 'dashboard'}  icon="🏠" label="Home"     theme={currentTheme} onClick={() => navigateTo('dashboard')} />
          <NavButton active={screen === 'shifts'}     icon="⏱️" label="Shifts"   theme={currentTheme} onClick={() => navigateTo('shifts')} />
          <NavButton active={screen === 'navigation'} icon="📍" label="Map"      theme={currentTheme} onClick={() => navigateTo('navigation')} />
          <NavButton active={screen === 'fuel'}       icon="⛽" label="Fuel"     theme={currentTheme} onClick={() => navigateTo('fuel')} />
          <NavButton active={screen === 'settings'}   icon="⚙️" label="Settings" theme={currentTheme} onClick={() => navigateTo('settings')} />
        </nav>

        <style>{`@keyframes progress { from { width: 0 } to { width: 100% } }`}</style>


      </div>
    </ErrorBoundary>
  );
}