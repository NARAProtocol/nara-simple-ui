import React, { useState, useEffect } from 'react';

/**
 * Risk Disclaimer Modal
 * Shows on first visit to inform users of risks
 * Stores acknowledgment in localStorage
 */
export default function RiskDisclaimer({ onAccept }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isAccepted, setIsAccepted] = useState(false);

  useEffect(() => {
    // Check if user has already accepted
    const hasAccepted = localStorage.getItem('nara_risk_accepted');
    if (!hasAccepted) {
      setIsVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('nara_risk_accepted', Date.now().toString());
    setIsVisible(false);
    if (onAccept) onAccept();
  };

  if (!isVisible) return null;

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>⚠️ Risk Warning</h2>
        
        <div style={styles.content}>
          <p style={styles.paragraph}>
            <strong>IMPORTANT:</strong> Please read carefully before proceeding.
          </p>
          
          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Cryptocurrency Risks</h3>
            <ul style={styles.list}>
              <li>Cryptocurrency involves substantial risk of loss</li>
              <li>Past performance does not indicate future results</li>
              <li>Never mine or stake more than you can afford to lose</li>
              <li>Prices can be extremely volatile</li>
            </ul>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Smart Contract Risks</h3>
            <ul style={styles.list}>
              <li>Smart contracts may contain bugs or vulnerabilities</li>
              <li>Transactions on blockchain are irreversible</li>
              <li>You are responsible for verifying transaction details</li>
            </ul>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Not Financial Advice</h3>
            <p style={styles.paragraph}>
              This interface is provided "as-is" for educational and experimental purposes. 
              Nothing on this site constitutes financial, investment, legal, or tax advice. 
              NARA Protocol is experimental software. Use at your own risk.
            </p>
          </div>

          <div style={styles.section}>
            <h3 style={styles.sectionTitle}>Your Responsibility</h3>
            <p style={styles.paragraph}>
              You are solely responsible for:
            </p>
            <ul style={styles.list}>
              <li>Compliance with your local laws and regulations</li>
              <li>Securing your wallet and private keys</li>
              <li>Understanding the transactions you sign</li>
              <li>Any losses incurred through use of this interface</li>
            </ul>
          </div>
        </div>

        <div style={styles.checkboxContainer}>
          <label style={styles.checkboxLabel}>
            <input 
              type="checkbox" 
              id="risk-checkbox"
              style={styles.checkbox}
              checked={isAccepted}
              onChange={(e) => setIsAccepted(e.target.checked)}
            />
            I understand and accept these risks
          </label>
        </div>

        <button 
          id="accept-btn"
          style={styles.button} 
          onClick={handleAccept}
          disabled={!isAccepted}
        >
          Continue
        </button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#151515',
    borderRadius: '12px',
    padding: '32px',
    maxWidth: '550px',
    width: '100%',
    maxHeight: '80vh',
    overflowY: 'auto',
    border: '1px solid #333',
  },
  title: {
    color: '#ff6b6b',
    fontSize: '24px',
    marginBottom: '20px',
    fontFamily: 'JetBrains Mono, monospace',
    textAlign: 'center',
  },
  content: {
    marginBottom: '24px',
  },
  section: {
    marginBottom: '20px',
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: '14px',
    marginBottom: '8px',
    fontFamily: 'JetBrains Mono, monospace',
  },
  paragraph: {
    color: '#a0aec0',
    fontSize: '13px',
    lineHeight: '1.6',
    fontFamily: 'JetBrains Mono, monospace',
    marginBottom: '12px',
  },
  list: {
    color: '#a0aec0',
    fontSize: '13px',
    lineHeight: '1.8',
    fontFamily: 'JetBrains Mono, monospace',
    paddingLeft: '20px',
    margin: 0,
  },
  checkboxContainer: {
    marginBottom: '20px',
    padding: '16px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
  },
  checkboxLabel: {
    color: '#ffffff',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
    fontFamily: 'JetBrains Mono, monospace',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    cursor: 'pointer',
  },
  button: {
    width: '100%',
    padding: '16px',
    backgroundColor: '#4a9eff',
    color: '#0a0a0a',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'JetBrains Mono, monospace',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    transition: 'all 0.2s ease',
  },
};

// Add disabled state styling
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  #accept-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: #666;
  }
  #accept-btn:not(:disabled):hover {
    background-color: #3a8eef;
    transform: translateY(-1px);
  }
`;
if (typeof document !== 'undefined') {
  document.head.appendChild(styleSheet);
}
