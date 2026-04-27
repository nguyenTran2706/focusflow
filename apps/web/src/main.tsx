import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './i18n'
import App from './App'
import { ErrorBoundary } from './components/ErrorBoundary'
import { applyTheme, type ThemeMode } from './lib/theme-store'

applyTheme((localStorage.getItem('focusflow-theme') as ThemeMode) ?? 'dark');

window.onerror = (_msg, _source, _lineno, _colno, error) => {
  console.error('Uncaught error:', error);
};

window.onunhandledrejection = (event: PromiseRejectionEvent) => {
  console.error('Unhandled rejection:', event.reason);
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
