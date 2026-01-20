/**
 * ConnectionStatus Component
 * 
 * Shows connection state and provides recovery actions for mobile users.
 * Displays when connection issues occur, with clear "Reconnect" button.
 */
import React from 'react';
import { useWalletConnection, ConnectionState } from '../hooks/useWalletConnection';

export default function ConnectionStatus() {
  const { 
    connectionState, 
    error, 
    reconnect, 
    connectWithCoinbase,
    clearError 
  } = useWalletConnection();
  
  // Only show when there's an issue
  if (connectionState === ConnectionState.CONNECTED) {
    return null;
  }
  
  // Reconnecting state
  if (connectionState === ConnectionState.RECONNECTING) {
    return (
      <div className="connection-status reconnecting">
        <span className="status-dot pulsing"></span>
        <span className="status-text">Reconnecting to wallet...</span>
      </div>
    );
  }
  
  // Connecting state  
  if (connectionState === ConnectionState.CONNECTING) {
    return (
      <div className="connection-status connecting">
        <span className="status-dot pulsing"></span>
        <span className="status-text">Connecting... Check your wallet app</span>
      </div>
    );
  }
  
  // Error state with recovery action
  if (connectionState === ConnectionState.ERROR || error) {
    return (
      <div className="connection-status error">
        <div className="status-content">
          <span className="status-icon">⚠️</span>
          <span className="status-text">{error || 'Connection lost'}</span>
        </div>
        <div className="status-actions">
          <button 
            className="reconnect-btn"
            onClick={connectWithCoinbase}
          >
            Reconnect
          </button>
          <button 
            className="dismiss-btn"
            onClick={clearError}
          >
            ✕
          </button>
        </div>
      </div>
    );
  }
  
  // Don't show anything for normal disconnected state
  // (RainbowKit's ConnectButton handles that)
  return null;
}
