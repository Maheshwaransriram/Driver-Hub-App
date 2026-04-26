import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './ErrorBoundary';

/**
 * ErrorBoundary wraps App here — at the ROOT level — so it catches errors thrown
 * by App itself (e.g. localStorage quota crash, GPS notification exception).
 * Previously the boundary lived inside App's return(), where it could only catch
 * errors in App's children, not in App itself — causing blank screens.
 */
const root = createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);