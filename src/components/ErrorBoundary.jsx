import React from 'react';

/**
 * Error Boundary Component
 * Catches JavaScript errors in child component tree and displays fallback UI
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // ALWAYS log to console for debugging "Something went wrong"
    console.error('🚨 ErrorBoundary caught:', error);
    console.error('Stack:', errorInfo.componentStack);
    // In production, you could send to error reporting service here
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    // Reload the page to reset state
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <h2 style={styles.title}>Something went wrong</h2>
            <p style={styles.message}>
              The application encountered an error. Please try refreshing the page.
            </p>
            <button style={styles.button} onClick={this.handleReset}>
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0a0a0a',
    padding: '20px',
  },
  card: {
    backgroundColor: '#151515',
    borderRadius: '12px',
    padding: '40px',
    textAlign: 'center',
    maxWidth: '400px',
    border: '1px solid #333',
  },
  title: {
    color: '#ffffff',
    fontSize: '24px',
    marginBottom: '16px',
    fontFamily: 'JetBrains Mono, monospace',
  },
  message: {
    color: '#888888',
    fontSize: '14px',
    marginBottom: '24px',
    lineHeight: '1.5',
    fontFamily: 'JetBrains Mono, monospace',
  },
  button: {
    backgroundColor: '#ffffff',
    color: '#0a0a0a',
    border: 'none',
    padding: '14px 28px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'JetBrains Mono, monospace',
    textTransform: 'uppercase',
    letterSpacing: '1px',
  },
};

export default ErrorBoundary;
