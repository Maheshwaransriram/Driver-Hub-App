import React from 'react';

/**
 * ErrorBoundary — extracted to its own file so it can wrap <App /> in main.jsx/index.js.
 *
 * CRITICAL: An ErrorBoundary can only catch errors thrown by components BELOW it in
 * the tree. When it lived inside App.jsx's return(), errors thrown by App itself
 * (e.g. localStorage QuotaExceededError in useGpsTracking, or a Notification crash)
 * bypassed it entirely, causing a blank screen.
 *
 * Usage in main.jsx / index.js:
 *   import ErrorBoundary from './ErrorBoundary';
 *   root.render(<ErrorBoundary><App /></ErrorBoundary>);
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('App crash caught by ErrorBoundary:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '40px', textAlign: 'center',
          background: '#fef3c7', minHeight: '100vh', fontFamily: 'system-ui'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>⚠️</div>
          <h2 style={{ color: '#92400e', margin: '0 0 12px' }}>Something went wrong</h2>
          <p style={{ color: '#92400e', fontSize: '14px', margin: '0 0 24px' }}>
            Your ride data is safe.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '12px 28px', background: '#f59e0b', color: '#fff',
              border: 'none', borderRadius: '10px',
              fontWeight: '700', fontSize: '15px', cursor: 'pointer'
            }}
          >
            🔄 Restart App
          </button>
          <details style={{ marginTop: '20px', fontSize: '12px', color: '#78350f' }}>
            <summary style={{ cursor: 'pointer' }}>Error details</summary>
            <pre style={{
              textAlign: 'left', padding: '12px',
              background: '#fef9c3', borderRadius: '8px',
              marginTop: '8px', overflow: 'auto'
            }}>
              {this.state.error?.toString()}
            </pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}