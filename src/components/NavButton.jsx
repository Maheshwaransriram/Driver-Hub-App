import React from 'react';
import PropTypes from 'prop-types';

/**
 * NavButton - Accessible navigation button for bottom nav bars
 * @param {boolean} active - Is this nav item currently selected
 * @param {string} icon - Emoji or icon character (e.g., '🏠', '📊')
 * @param {string} label - Button label for screen readers and display
 * @param {Object} theme - Theme colors object
 * @param {Function} onClick - Click handler
 */
import PropTypes from 'prop-types';

/**
 * NavButton - Accessible navigation button for bottom nav bars
 * @param {boolean} active - Is this nav item currently selected
 * @param {string} icon - Emoji or icon character (e.g., '🏠', '📊')
 * @param {string} label - Button label for screen readers and display
 * @param {Object} theme - Theme colors object
 * @param {Function} onClick - Click handler
 */
export default function NavButton({ active, icon, label, theme, onClick }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      role="tab"
      onClick={onClick}
      style={{
        flex: 1,
        background: 'none',
        border: 'none',
        color: active ? theme.accent : theme.subText,
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      role="tab"
      onClick={onClick}
      style={{
        flex: 1,
        background: 'none',
        border: 'none',
        color: active ? theme.accent : theme.subText,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px 8px',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        outline: 'none',
        position: 'relative',
        // Active state background
        backgroundColor: active ? 'rgba(16, 185, 129, 0.1)' : 'transparent',
        borderRadius: '12px',
        // ':hover' keys in inline styles are silently ignored by React.
        // Hover is handled via onMouseEnter/onMouseLeave below.
      }}
      // Keyboard accessibility
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = active
          ? 'rgba(16, 185, 129, 0.15)'
          : 'rgba(0, 0, 0, 0.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = active
          ? 'rgba(16, 185, 129, 0.1)'
          : 'transparent';
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Icon with improved animations */}
      <span 
        style={{
          fontSize: '24px', // Slightly larger for better touch targets
          marginBottom: '6px',
          transform: active ? 'scale(1.15) translateY(-2px)' : 'scale(1)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          filter: active ? 'brightness(1.1) drop-shadow(0 2px 4px rgba(16,185,129,0.3))' : 'none'
        }}
        aria-hidden="true"
      >
        {icon}
      </span>
      
      {/* Label with improved typography */}
      <span 
        style={{
          fontSize: '12px',
          fontWeight: active ? '800' : '600',
          letterSpacing: active ? '0.5px' : '0.2px',
          textTransform: 'uppercase',
          opacity: active ? 1 : 0.8,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {label}
      </span>

      {/* Active indicator (subtle top bar) */}
      {active && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '28px',
            height: '3px',
            background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent}cc)`,
            borderRadius: '2px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          aria-hidden="true"
        />
      )}
      
      {/* Label with improved typography */}
      <span 
        style={{
          fontSize: '12px',
          fontWeight: active ? '800' : '600',
          letterSpacing: active ? '0.5px' : '0.2px',
          textTransform: 'uppercase',
          opacity: active ? 1 : 0.8,
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
      >
        {label}
      </span>

      {/* Active indicator (subtle top bar) */}
      {active && (
        <span
          style={{
            position: 'absolute',
            bottom: 0,
            left: '50%',
            transform: 'translateX(-50%)',
            width: '28px',
            height: '3px',
            background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent}cc)`,
            borderRadius: '2px',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
          aria-hidden="true"
        />
      )}
    </button>
  );
}

// TypeScript PropTypes (or use TypeScript interfaces)
NavButton.propTypes = {
  active: PropTypes.bool,
  icon: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  theme: PropTypes.shape({
    accent: PropTypes.string,
    subText: PropTypes.string
  }).isRequired,
  onClick: PropTypes.func
};

NavButton.defaultProps = {
  active: false,
  onClick: undefined
};

// CSS-in-JS equivalent styles for better hover support (if using styled-components/emotion)
const styles = {
  button: {
    '&:hover': {
      backgroundColor: (props) => props.active 
        ? 'rgba(16, 185, 129, 0.15)' 
        : 'rgba(0, 0, 0, 0.05)'
    },
    '&:focus-visible': {
      boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.3)',
      borderRadius: '12px'
    },
    '&:active': {
      transform: 'scale(0.98)'
    }
  }
};

/* Usage Example:
<NavButton
  active={currentTab === 'home'}
  icon="🏠"
  label="Home"
  theme={theme}
  onClick={() => setCurrentTab('home')}
/>
*/

// TypeScript PropTypes (or use TypeScript interfaces)
NavButton.propTypes = {
  active: PropTypes.bool,
  icon: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  theme: PropTypes.shape({
    accent: PropTypes.string,
    subText: PropTypes.string
  }).isRequired,
  onClick: PropTypes.func
};

NavButton.defaultProps = {
  active: false,
  onClick: undefined
};

// CSS-in-JS equivalent styles for better hover support (if using styled-components/emotion)
const styles = {
  button: {
    '&:hover': {
      backgroundColor: (props) => props.active 
        ? 'rgba(16, 185, 129, 0.15)' 
        : 'rgba(0, 0, 0, 0.05)'
    },
    '&:focus-visible': {
      boxShadow: '0 0 0 3px rgba(16, 185, 129, 0.3)',
      borderRadius: '12px'
    },
    '&:active': {
      transform: 'scale(0.98)'
    }
  }
};

/* Usage Example:
<NavButton
  active={currentTab === 'home'}
  icon="🏠"
  label="Home"
  theme={theme}
  onClick={() => setCurrentTab('home')}
/>
*/