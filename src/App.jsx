import React, { useState, useEffect, useCallback } from "react";
import Dashboard from "./components/Dashboard";
import ShiftManagement from "./components/ShiftManagement";
import SettingsScreen from "./components/SettingsScreen";
import AddRide from "./components/NewRide";
import RateCard, { DEFAULT_RATE_CARDS, calculateFareFromRateCard } from "./components/RateCard";
import NavButton from "./components/NavButton";
import FuelTracking from "./components/FuelTracking";
import { themes, globalStyles } from "./theme/theme";
import NavigationMap from "./components/NavigationMap";
import { useGpsTracking } from "./hooks/UseGpsTracking";

const DEFAULT_SETTINGS = {
  dailyGoal:  1000,
  rideGoal:   15,
  mileage:    45,
  fuelPrice:  103,
};

const TODAY = new Date().toDateString();

export default function App() {
  const [screen,   setScreen]   = useState("dashboard");
  const [isOnline, setIsOnline] = useState(false);

  const [themeMode, setThemeMode] = useState(
    () => localStorage.getItem("dh_theme") || "dark"
  );
  const [rides, setRides] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dh_rides") || "[]"); }
    catch { return []; }
  });
  const [fuelLogs, setFuelLogs] = useState(() => {
    try { return JSON.parse(localStorage.getItem("dh_fuel") || "[]"); }
    catch { return []; }
  });
  const [settings, setSettings] = useState(() => {
    try {
      const s = localStorage.getItem("dh_settings");
      return s ? { ...DEFAULT_SETTINGS, ...JSON.parse(s) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });

  // Per-platform rate cards — deep-merged with defaults so new fields are never missing
  const [rateCards, setRateCards] = useState(() => {
    try {
      const saved = localStorage.getItem("dh_rate_cards");
      if (!saved) return DEFAULT_RATE_CARDS;
      const parsed = JSON.parse(saved);
      // Deep merge per platform — ensures new fields like govtTaxPercent
      // always have a value even if stored data pre-dates them
      const merged = {};
      for (const platform of Object.keys(DEFAULT_RATE_CARDS)) {
        merged[platform] = { ...DEFAULT_RATE_CARDS[platform], ...(parsed[platform] || {}) };
      }
      return merged;
    } catch { return DEFAULT_RATE_CARDS; }
  });

  // ── navDistance: GPS-tracked km from NavigationMap ────────────────────────
  // Loaded from localStorage so it survives app close.
  // Resets automatically each new day (NavigationMap handles the date check).
  const [navDistance, setNavDistance] = useState(() => {
    try {
      const raw = localStorage.getItem("dh_nav_state");
      if (!raw) return 0;
      const { savedDistance, date } = JSON.parse(raw);
      return date === TODAY ? (savedDistance || 0) : 0;
    } catch { return 0; }
  });

  const [lastNotifiedRange, setLastNotifiedRange] = useState(null);
  const [pendingRideDist, setPendingRideDist] = useState(0);
  const currentTheme = themes[themeMode];

  // ── GPS tracking — lives at App level so it NEVER stops on screen change ──
  const handleRideComplete = useCallback((distKm) => {
    setPendingRideDist(distKm);
    setScreen("add");
  }, []);

  const handleNavDistanceUpdate = useCallback((km) => setNavDistance(km), []);
  const handleShiftDistanceUpdate = useCallback((km) => setShiftDistance(km), []);

  // shiftDistance stored at App level for ShiftManagement screen display
  const [shiftDistance, setShiftDistance] = useState(0);

  const gps = useGpsTracking({
    isOnline,
    onDistanceUpdate:      handleNavDistanceUpdate,
    onShiftDistanceUpdate: handleShiftDistanceUpdate,
    onRideComplete:        handleRideComplete,
  });

  // ── Fuel gauge calculation ────────────────────────────────────────────────
  // navDistance (GPS) is used as the primary odometer.
  // Falls back to manual ride distances if GPS tracking hasn't been used yet.
  const calculateFuelStats = () => {
    if (fuelLogs.length === 0) return { percentage: 0, range: 0, value: 0, currentLiters: 0 };

    const totalLitersAdded = fuelLogs.reduce((acc, log) => acc + log.liters, 0);

    // Use GPS distance if available (more accurate), else fall back to ride logs
    const manualDist = rides.reduce((acc, r) => acc + (r.dist || 0), 0);
    const totalDistanceDriven = navDistance > 0 ? navDistance : manualDist;

    const consumedLiters         = totalDistanceDriven / settings.mileage;
    const currentLitersRemaining = Math.max(0, totalLitersAdded - consumedLiters);
    const remainingRange         = currentLitersRemaining * settings.mileage;

    const lastLog            = fuelLogs[0];
    const lastFillRange      = lastLog.liters * settings.mileage;
    const distBeforeLastLog  = rides
      .filter(r => r.id < lastLog.id)
      .reduce((acc, r) => acc + (r.dist || 0), 0);
    const litersBeforeLastLog = fuelLogs.slice(1).reduce((acc, l) => acc + l.liters, 0);
    const rangeBeforeLastLog  = Math.max(0,
      (litersBeforeLastLog * settings.mileage) - distBeforeLastLog
    );
    const currentMaxRange = lastFillRange + rangeBeforeLastLog;
    const percentage      = currentMaxRange > 0
      ? (remainingRange / currentMaxRange) * 100 : 0;
    const currentValue    = currentLitersRemaining * settings.fuelPrice;

    return {
      percentage:    Math.min(100, percentage),
      range:         remainingRange,
      value:         currentValue,
      currentLiters: currentLitersRemaining,
    };
  };

  const {
    percentage: fuelPercentage,
    range:      remainingRange,
    value:      fuelValue,
    currentLiters,
  } = calculateFuelStats();

  // ── Persistence ───────────────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem("dh_rides",      JSON.stringify(rides));     }, [rides]);
  useEffect(() => { localStorage.setItem("dh_fuel",       JSON.stringify(fuelLogs));  }, [fuelLogs]);
  useEffect(() => { localStorage.setItem("dh_settings",   JSON.stringify(settings));  }, [settings]);
  useEffect(() => { localStorage.setItem("dh_rate_cards", JSON.stringify(rateCards)); }, [rateCards]);
  useEffect(() => {
    localStorage.setItem("dh_theme", themeMode);
    document.body.style.backgroundColor = themeMode === 'dark' ? '#050B20' : '#E2E8F0';
  }, [themeMode]);

  // ── Fuel alert ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (fuelLogs.length === 0) return;
    const thresholds      = [15, 10, 5, 0];
    const currentThreshold = thresholds.find(t => remainingRange <= t);
    if (currentThreshold !== undefined && lastNotifiedRange !== currentThreshold) {
      if (Notification.permission === "granted") {
        new Notification("Fuel Alert", {
          body: `Range: ${remainingRange.toFixed(1)} km left. Refill soon!`,
          icon: "⛽",
        });
        setLastNotifiedRange(currentThreshold);
      }
    }
    if (remainingRange > 16) setLastNotifiedRange(null);
  }, [remainingRange, fuelLogs, lastNotifiedRange]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const addRide = (rideData) => {
    const rc       = rateCards[rideData.platform] || DEFAULT_RATE_CARDS[rideData.platform] || DEFAULT_RATE_CARDS.Rapido;
    const isNight  = (() => { const h = new Date().getHours(); return h >= 23 || h < 6; })();
    const calc     = calculateFareFromRateCard(rc, rideData.dist, rideData.timeMin || 0, isNight);
    const fuelCost     = (rideData.dist / settings.mileage) * settings.fuelPrice;
    const extraFareN   = rideData.extraFare   || 0;
    const extraDeductN = rideData.extraDeduct || 0;

    let finalFare, commAmt, govtTax, platformFee, thirdPartyFee, net;
    if (rideData.fare > 0) {
      finalFare     = rideData.fare;
      commAmt       = rc?.commissionType === 'flat'
        ? (rc?.commission || 0)
        : finalFare * (rc?.commission || 0) / 100;
      govtTax       = finalFare * (rc?.govtTaxPercent || 0) / 100;
      platformFee   = rc?.platformFee   || 0;
      thirdPartyFee = rc?.thirdPartyFee || 0;
      net = finalFare + extraFareN - commAmt - govtTax - platformFee - thirdPartyFee - extraDeductN - fuelCost;
    } else {
      finalFare     = calc.gross;
      commAmt       = calc.commission;
      govtTax       = calc.gst;
      platformFee   = rc?.platformFee   || 0;
      thirdPartyFee = rc?.thirdPartyFee || 0;
      net = calc.net + extraFareN - extraDeductN - fuelCost;
    }

    setRides(prev => [{
      ...rideData,
      id:            Date.now(),
      fare:          finalFare,
      net:           parseFloat(net.toFixed(2)),
      commAmt:       parseFloat(commAmt.toFixed(2)),
      taxAmt:        parseFloat(govtTax.toFixed(2)),
      platformFee:   parseFloat(platformFee.toFixed(2)),
      thirdPartyFee: parseFloat(thirdPartyFee.toFixed(2)),
      extraFare:     extraFareN,
      extraDeduct:   extraDeductN,
      fuelCost:      parseFloat(fuelCost.toFixed(2)),
      isNight,
      timestamp:     new Date().toISOString(),
    }, ...prev]);
    setScreen("dashboard");
  };

  const deleteRide = (id) => setRides(r => r.filter(x => x.id !== id));

  const handleSetIsOnline = (val) => {
    setIsOnline(val);
    if (!val) {
      setShiftDistance(0);
      localStorage.removeItem("dh_shift_state");
    }
  };

  const todayRides     = rides.filter(
    r => new Date(r.timestamp).toDateString() === TODAY
  );
  const todayNetProfit = todayRides.reduce((acc, r) => acc + (r.net || 0), 0);

  return (
    <div style={{ ...globalStyles.appWrapper, backgroundColor: currentTheme.bg, color: currentTheme.text }}>
      <div style={globalStyles.container}>

        {screen === "dashboard" && (
          <Dashboard
            rides={rides}
            fuelPercentage={fuelPercentage}
            remainingRange={remainingRange}
            fuelValue={fuelValue}
            currentLiters={currentLiters}
            navDistance={navDistance}
            settings={settings}
            theme={currentTheme}
            onDelete={deleteRide}
            onAddRide={() => setScreen("add")}
          />
        )}

        {screen === "shifts" && (
          <ShiftManagement
            isOnline={isOnline}
            setIsOnline={handleSetIsOnline}
            theme={currentTheme}
            shiftDistance={shiftDistance}
          />
        )}

        {screen === "add" && (
          <AddRide
            onSave={(data) => { addRide(data); setPendingRideDist(0); }}
            onBack={() => { setScreen("dashboard"); setPendingRideDist(0); }}
            theme={currentTheme}
            settings={settings}
            rateCards={rateCards}
            initialDist={pendingRideDist}
          />
        )}

        {screen === "fuel" && (
          <FuelTracking
            theme={currentTheme}
            fuelLogs={fuelLogs}
            onAddFuelLog={(log) => setFuelLogs(prev => [log, ...prev])}
            settings={settings}
            navDistance={navDistance}
            onGoToSettings={() => setScreen("settings")}
          />
        )}

        {screen === "settings" && (
          <SettingsScreen
            settings={settings}
            onSave={setSettings}
            theme={currentTheme}
            themeMode={themeMode}
            onToggleTheme={() => setThemeMode(m => m === 'light' ? 'dark' : 'light')}
            onOpenRateCard={() => setScreen("ratecard")}
          />
        )}

        {screen === "ratecard" && (
          <RateCard
            theme={currentTheme}
            rateCards={rateCards}
            onSave={(updated) => { setRateCards(updated); }}
            onBack={() => setScreen("settings")}
          />
        )}

        {screen === "navigation" && (
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
      </div>

      <nav style={{
        ...globalStyles.nav,
        backgroundColor: currentTheme.nav,
        borderTop: `1px solid ${currentTheme.border}`,
      }}>
        <NavButton active={screen === 'dashboard'}  icon="🏠" label="Home"     theme={currentTheme} onClick={() => setScreen("dashboard")} />
        <NavButton active={screen === 'shifts'}     icon="⏱️" label="Shifts"   theme={currentTheme} onClick={() => setScreen("shifts")} />
        <NavButton active={screen === 'navigation'} icon="📍" label="Map"      theme={currentTheme} onClick={() => setScreen("navigation")} />
        <NavButton active={screen === 'fuel'}       icon="⛽" label="Fuel"     theme={currentTheme} onClick={() => setScreen("fuel")} />
        <NavButton active={screen === 'settings'}   icon="⚙️" label="Settings" theme={currentTheme} onClick={() => setScreen("settings")} />
      </nav>
    </div>
  );
}