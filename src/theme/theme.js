export const themes = {
  light: {
    bg: '#F4F7FE',
    card: '#FFFFFF',
    text: '#1A1C1E',
    subText: '#A3AED0',
    accent: '#FF6B35',
    accentGradient: 'linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%)',
    border: '#E9EDF7',
    nav: 'rgba(255, 255, 255, 0.9)',
    goalBg: '#FFFFFF',
    profitBg: 'linear-gradient(135deg, #FF6B35 0%, #E85D04 100%)',
    profitText: '#FFFFFF',
  },
  dark: {
    bg: '#0B1437',
    card: '#111C44',
    text: '#FFFFFF',
    subText: '#A3AED0',
    accent: '#00D27A',
    accentGradient: 'linear-gradient(135deg, #00D27A 0%, #00A35F 100%)',
    border: '#1B254B',
    nav: 'rgba(17, 28, 68, 0.9)',
    goalBg: '#0B1437',
    profitBg: 'linear-gradient(135deg, #00D27A 0%, #00A35F 100%)',
    profitText: '#061810',
  }
};

export const globalStyles = {
  // Full-screen app view — no desktop simulator frame
  appWrapper: {
    width: '100%',
    minHeight: '100vh',
    position: 'relative',
    fontFamily: "'Inter', sans-serif",
    transition: 'background 0.3s ease',
    overflowX: 'hidden',
  },
  container: {
    paddingBottom: '90px',   // clears the 75px fixed nav + breathing room
    minHeight: '100vh',
  },
  card: {
    borderRadius: '20px',
    padding: '20px',
    marginBottom: '16px',
    border: '1px solid',
    boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
  },
  nav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    height: '75px',
    zIndex: 2000,          // sits above Leaflet map tiles (z-index 400)
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
  },
  btnPrimary: {
    border: 'none',
    padding: '16px',
    borderRadius: '16px',
    fontWeight: '800',
    width: '100%',
    cursor: 'pointer',
    fontSize: '16px',
    transition: 'transform 0.2s ease',
  },
};