import React, { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import ShiftManagement from "./components/ShiftManagement";
import AddRide from "./components/AddRide";
import NavButton from "./components/NavButton";
import FuelTracking from "./components/FuelTracking";
import { themes, globalStyles } from "./theme/theme";
import NavigationMap from "./components/NavigationMap";


export default function App() {
  // --- 1. STATE ---
  const [screen, setScreen] = useState("dashboard");
  const [isOnline, setIsOnline] = useState(false);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("dh_theme") || "dark");
  const [rides, setRides] = useState(() => JSON.parse(localStorage.getItem("dh_rides") || "[]"));
  const [fuelLogs, setFuelLogs] = useState(() => JSON.parse(localStorage.getItem("dh_fuel") || "[]"));
  const [lastNotifiedRange, setLastNotifiedRange] = useState(null);

  const [settings] = useState({ 
    dailyGoal: 1000, 
    rideGoal: 15, 
    commission: 20, 
    mileage: 45, 
    fuelPrice: 103 
  });

  const currentTheme = themes[themeMode];

  // --- 2. DYNAMIC FUEL LOGIC ---
  const calculateFuelStats = () => {
    if (fuelLogs.length === 0) return { percentage: 0, range: 0, value: 0, currentLiters: 0 };

    const totalLitersAdded = fuelLogs.reduce((acc, log) => acc + log.liters, 0);
    const totalDistanceDriven = rides.reduce((acc, ride) => acc + (ride.dist || 0), 0);
    
    // Calculate current liters remaining
    const consumedLiters = totalDistanceDriven / settings.mileage;
    const currentLitersRemaining = Math.max(0, totalLitersAdded - consumedLiters);
    
    const remainingRange = currentLitersRemaining * settings.mileage;

    const lastLog = fuelLogs[0];
    const lastFillRange = lastLog.liters * settings.mileage;
    
    const distBeforeLastLog = rides
      .filter(r => r.id < lastLog.id)
      .reduce((acc, r) => acc + (r.dist || 0), 0);
    const litersBeforeLastLog = fuelLogs.slice(1).reduce((acc, l) => acc + l.liters, 0);
    const rangeBeforeLastLog = Math.max(0, (litersBeforeLastLog * settings.mileage) - distBeforeLastLog);

    const currentMaxRange = lastFillRange + rangeBeforeLastLog;
    const percentage = currentMaxRange > 0 ? (remainingRange / currentMaxRange) * 100 : 0;

    const actualPricePerLiter = lastLog.amount / lastLog.liters;
    const currentValue = currentLitersRemaining * actualPricePerLiter;

    return { 
      percentage: Math.min(100, percentage), 
      range: remainingRange,
      value: currentValue,
      currentLiters: currentLitersRemaining
    };
  };

  const { percentage: fuelPercentage, range: remainingRange, value: fuelValue, currentLiters } = calculateFuelStats();

  // --- 3. EFFECTS ---
  useEffect(() => {
    localStorage.setItem("dh_rides", JSON.stringify(rides));
    localStorage.setItem("dh_theme", themeMode);
    localStorage.setItem("dh_fuel", JSON.stringify(fuelLogs));
    document.body.style.backgroundColor = themeMode === 'dark' ? '#050B20' : '#E2E8F0';
  }, [rides, themeMode, fuelLogs]);

  useEffect(() => {
    if (fuelLogs.length === 0) return;
    const thresholds = [15, 10, 5, 0];
    const currentThreshold = thresholds.find(t => remainingRange <= t);

    if (currentThreshold !== undefined && lastNotifiedRange !== currentThreshold) {
      if (Notification.permission === "granted") {
        new Notification("Fuel Alert", {
          body: `Range: ${remainingRange.toFixed(1)} km left. Refill!`,
          icon: "⛽"
        });
        setLastNotifiedRange(currentThreshold);
      }
    }
    if (remainingRange > 16) setLastNotifiedRange(null);
  }, [remainingRange, fuelLogs, lastNotifiedRange]);

  // --- 4. HANDLERS ---
  const addRide = (rideData) => {
    const commAmt = rideData.fare * (settings.commission / 100);
    const taxAmt = rideData.fare * 0.05;
    const fuelPriceToUse = fuelLogs.length > 0 ? (fuelLogs[0].amount / fuelLogs[0].liters) : settings.fuelPrice;
    const fuelCost = (rideData.dist / settings.mileage) * fuelPriceToUse;
    const net = rideData.fare - commAmt - taxAmt - fuelCost;
    
    const newRide = { ...rideData, id: Date.now(), net, commAmt, taxAmt, timestamp: new Date().toISOString() };
    setRides([newRide, ...rides]);
    setScreen("dashboard");
  };

  const deleteRide = (id) => setRides(rides.filter(r => r.id !== id));
  const todayRides = rides.filter(r => new Date(r.timestamp).toDateString() === new Date().toDateString());
  const todayNetProfit = todayRides.reduce((acc, r) => acc + (r.net || 0), 0);

  return (
    <div style={{ ...globalStyles.appWrapper, backgroundColor: currentTheme.bg, color: currentTheme.text }}>
      <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 1000 }}>
        <button onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')} style={{ padding: '8px 16px', borderRadius: '30px', border: `1px solid ${currentTheme.border}`, backgroundColor: currentTheme.card, color: currentTheme.text, fontSize: '13px', fontWeight: 'bold' }}>
          {themeMode === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>
      <div style={globalStyles.container}>
        {screen === "dashboard" && (
          <Dashboard 
            rides={rides} 
            fuelPercentage={fuelPercentage}
            remainingRange={remainingRange}
            fuelValue={fuelValue}
            currentLiters={currentLiters}
            settings={settings} 
            theme={currentTheme} 
            onDelete={deleteRide} 
          />
        )}
        {screen === "shifts" && <ShiftManagement isOnline={isOnline} setIsOnline={setIsOnline} theme={currentTheme} />}
        {screen === "fuel" && <FuelTracking theme={currentTheme} fuelLogs={fuelLogs} onAddFuelLog={(log) => setFuelLogs([log, ...fuelLogs])} settings={settings} />}
        {screen === "add" && <AddRide onSave={addRide} onBack={() => setScreen("dashboard")} theme={currentTheme} />}
        {screen === "navigation" && (<NavigationMap theme={currentTheme} themeMode={themeMode} isOnline={isOnline} setIsOnline={setIsOnline} net={todayNetProfit} 
   />
)}
      </div>
      <nav style={{ ...globalStyles.nav, backgroundColor: currentTheme.nav, borderTopColor: currentTheme.border }}>
        <NavButton active={screen === 'dashboard'} icon="🏠" label="Home" theme={currentTheme} onClick={() => setScreen("dashboard")} />
        <NavButton active={screen === 'shifts'} icon="⏱️" label="Shifts" theme={currentTheme} onClick={() => setScreen("shifts")} />
        <NavButton active={screen === 'navigation'} icon="📍" label="Map" theme={currentTheme} onClick={() => setScreen("navigation")} />
        <NavButton active={screen === 'fuel'} icon="⛽" label="Fuel" theme={currentTheme} onClick={() => setScreen("fuel")} /> 
        <NavButton active={screen === 'add'} icon="➕" label="Add" theme={currentTheme} onClick={() => setScreen("add")} />
      </nav>
    </div>
  );
}