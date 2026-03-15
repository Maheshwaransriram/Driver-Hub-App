import React, { useState, useEffect } from "react";
import Dashboard from "./components/Dashboard";
import ShiftManagement from "./components/ShiftManagement";
import AddRide from "./components/AddRide";
import NavButton from "./components/NavButton";
import { themes, globalStyles } from "./theme/theme";

export default function App() {
  const [screen, setScreen] = useState("dashboard");
  const [isOnline, setIsOnline] = useState(false);
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem("dh_theme") || "dark");
  const [rides, setRides] = useState(() => JSON.parse(localStorage.getItem("dh_rides") || "[]"));
  
  // App Settings (Could be moved to a separate settings component later)
  const [settings] = useState({ dailyGoal: 1000, rideGoal: 15, commission: 20, mileage: 45, fuelPrice: 103 });

  const currentTheme = themes[themeMode];

  useEffect(() => {
    localStorage.setItem("dh_rides", JSON.stringify(rides));
    localStorage.setItem("dh_theme", themeMode);
    // Update body background to match theme outside the wrapper
    document.body.style.backgroundColor = themeMode === 'dark' ? '#050B20' : '#E2E8F0';
    document.body.style.margin = "0";
  }, [rides, themeMode]);

  const addRide = (rideData) => {
    const commAmt = rideData.fare * (settings.commission / 100);
    const taxAmt = rideData.fare * 0.05;
    const fuelCost = (rideData.dist / settings.mileage) * settings.fuelPrice;
    const net = rideData.fare - commAmt - taxAmt - fuelCost;
    
    const newRide = { ...rideData, id: Date.now(), net, timestamp: new Date().toISOString() };
    setRides([newRide, ...rides]);
    setScreen("dashboard");
  };

  return (
    <div style={{ ...globalStyles.appWrapper, backgroundColor: currentTheme.bg, color: currentTheme.text }}>
      
      {/* Floating Theme Toggle */}
      <div style={{ position: 'absolute', top: '24px', right: '24px', zIndex: 1000 }}>
        <button 
          onClick={() => setThemeMode(themeMode === 'light' ? 'dark' : 'light')}
          style={{ 
            padding: '8px 16px', borderRadius: '30px', border: `1px solid ${currentTheme.border}`, 
            backgroundColor: currentTheme.card, color: currentTheme.text, 
            fontSize: '13px', fontWeight: 'bold', cursor: 'pointer',
            boxShadow: '0 4px 10px rgba(0,0,0,0.05)'
          }}
        >
          {themeMode === 'light' ? '🌙 Dark' : '☀️ Light'}
        </button>
      </div>

      {/* Screen Routing */}
      <div style={globalStyles.container}>
        {screen === "dashboard" && <Dashboard rides={rides} settings={settings} theme={currentTheme} themeMode={themeMode} onDelete={(id) => setRides(rides.filter(r => r.id !== id))} />}
        {screen === "shifts" && <ShiftManagement isOnline={isOnline} setIsOnline={setIsOnline} theme={currentTheme} />}
        {screen === "add" && <AddRide onSave={addRide} onBack={() => setScreen("dashboard")} theme={currentTheme} />}
      </div>
      
      {/* Bottom Navigation */}
      <nav style={{ ...globalStyles.nav, backgroundColor: currentTheme.nav, borderTopColor: currentTheme.border }}>
        <NavButton active={screen === 'dashboard'} icon="🏠" label="Home" theme={currentTheme} onClick={() => setScreen("dashboard")} />
        <NavButton active={screen === 'shifts'} icon="⏱️" label="Shifts" theme={currentTheme} onClick={() => setScreen("shifts")} />
        <NavButton active={screen === 'add'} icon="➕" label="Add" theme={currentTheme} onClick={() => setScreen("add")} />
      </nav>

    </div>
  );
}