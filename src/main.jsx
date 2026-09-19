import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Application Error Caught:", error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {}
    window.location.href = window.location.origin;
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          backgroundColor: '#020617',
          color: '#f8fafc',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          fontFamily: 'system-ui, sans-serif'
        }}>
          <div style={{
            backgroundColor: '#0f172a',
            border: '1px solid #1e293b',
            padding: '32px',
            borderRadius: '16px',
            maxWidth: '600px',
            width: '100%',
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
          }}>
            <h1 style={{ color: '#fbbf24', fontSize: '24px', fontWeight: 'bold', marginBottom: '12px' }}>
              SMART TECH ™ Application Recovery
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px', lineHeight: '1.5' }}>
              An unexpected display issue occurred.
            </p>

            {this.state.error && (
              <div style={{
                backgroundColor: '#1e293b',
                color: '#f87171',
                padding: '12px',
                borderRadius: '8px',
                fontSize: '12px',
                fontFamily: 'monospace',
                textAlign: 'left',
                marginBottom: '20px',
                maxHeight: '120px',
                overflowY: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}>
                {this.state.error.toString()}
              </div>
            )}

            <button
              onClick={this.handleReset}
              style={{
                backgroundColor: '#f59e0b',
                color: '#020617',
                fontWeight: 'bold',
                fontSize: '14px',
                padding: '12px 24px',
                borderRadius: '12px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.3)'
              }}
            >
              Reset & Restore SMART TECH App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
