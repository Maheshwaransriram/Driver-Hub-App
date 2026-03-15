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
  // Acts as a mobile simulator on desktop
  appWrapper: {
    maxWidth: '480px',
    margin: '0 auto',
    minHeight: '100vh',
    position: 'relative',
    boxShadow: '0 0 40px rgba(0,0,0,0.1)',
    fontFamily: "'Inter', sans-serif",
    transition: 'all 0.3s ease',
    overflowX: 'hidden',
  },
  container: {
    paddingBottom: '100px',
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
    position: 'absolute',
    bottom: 0,
    width: '100%',
    display: 'flex',
    height: '75px',
    borderTop: '1px solid',
    zIndex: 100,
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
  }
};