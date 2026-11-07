import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/tokens.css';
import App from './App.jsx';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { runPendingMigrations } from './services/storage/migrations/migrationRunner.js';

// Execute pending storage schema migrations before components mount
try {
  runPendingMigrations();
} catch (err) {
  console.error('[App] Storage migration failed at startup:', err);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
