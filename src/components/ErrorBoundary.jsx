import React from 'react';
import { exportAllData } from '../data/courseStore.js';
import './ErrorBoundary.css';

/**
 * Enterprise Error Boundary
 * Catches JavaScript errors anywhere in child component tree,
 * logs errors, and displays a graceful fallback UI with recovery tools.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // In production, send to telemetry/logging service
    if (typeof console !== 'undefined' && console.error) {
      console.error('ErrorBoundary caught an unhandled render error:', error, errorInfo);
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  handleExportEmergencyBackup = () => {
    try {
      const backup = exportAllData();
      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `emergency-recovery-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Could not export emergency backup: ' + (err.message || 'unknown error'));
    }
  };

  handleResetState = () => {
    if (window.confirm('Are you sure you want to reset local application state? This will clear locally cached progress and restore default courses.')) {
      try {
        localStorage.clear();
      } catch {}
      window.location.href = window.location.pathname;
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="eb-container">
          <div className="eb-card">
            <div className="eb-badge">Application Safeguard</div>
            <h1 className="eb-title">Something went wrong</h1>
            <p className="eb-desc">
              The application encountered an unexpected state. Your progress is safe in local storage.
              You can reload the page or download an emergency backup of your data.
            </p>

            {this.state.error && (
              <details className="eb-details">
                <summary>Technical Details</summary>
                <pre className="eb-pre">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className="eb-actions">
              <button className="eb-btn eb-btn--primary" onClick={this.handleReload}>
                Reload Application
              </button>
              <button className="eb-btn eb-btn--secondary" onClick={this.handleExportEmergencyBackup}>
                Export Recovery Backup
              </button>
              <button className="eb-btn eb-btn--danger" onClick={this.handleResetState}>
                Reset Cache
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
