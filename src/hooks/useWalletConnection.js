/**
 * useWalletConnection Hook
 * 
 * Production-ready mobile wallet connection management.
 * Handles session recovery, reconnection, and error states.
 * 
 * VERIFIED BEHAVIORS:
 * - useAccount provides isConnecting, isReconnecting states
 * - useConnect provides connect function and error handling
 * - useDisconnect clears session state
 * - useReconnect attempts to restore previous session
 */
import { useCallback, useEffect, useState } from 'react';
import { 
  useAccount, 
  useConnect, 
  useDisconnect, 
  useReconnect,
  useConnectors 
} from 'wagmi';
import logger from '../utils/logger';

// Connection states for UI
export const ConnectionState = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
  CONNECTING: 'connecting',
  RECONNECTING: 'reconnecting',
  ERROR: 'error',
};

/**
 * Custom hook for robust wallet connection management
 * @returns {Object} Connection state and actions
 */
export function useWalletConnection() {
  const { 
    address, 
    isConnected, 
    isConnecting, 
    isReconnecting,
    connector: activeConnector 
  } = useAccount();
  
  const { connect, connectors, isPending: isConnectPending, error: connectError } = useConnect();
  const { disconnect } = useDisconnect();
  const { reconnect, isPending: isReconnectPending } = useReconnect();
  const allConnectors = useConnectors();
  
  // Track connection errors
  const [lastError, setLastError] = useState(null);
  const [connectionState, setConnectionState] = useState(ConnectionState.DISCONNECTED);
  
  // Compute connection state
  useEffect(() => {
    if (isConnected && address) {
      setConnectionState(ConnectionState.CONNECTED);
      setLastError(null);
    } else if (isConnecting || isConnectPending) {
      setConnectionState(ConnectionState.CONNECTING);
    } else if (isReconnecting || isReconnectPending) {
      setConnectionState(ConnectionState.RECONNECTING);
    } else if (connectError || lastError) {
      setConnectionState(ConnectionState.ERROR);
    } else {
      setConnectionState(ConnectionState.DISCONNECTED);
    }
  }, [isConnected, address, isConnecting, isConnectPending, isReconnecting, isReconnectPending, connectError, lastError]);
  
  // Track connect errors
  useEffect(() => {
    if (connectError) {
      logger.error('[WALLET] Connection error:', connectError);
      setLastError(getUserFriendlyError(connectError));
    }
  }, [connectError]);
  
  /**
   * Attempt to reconnect with the last used connector
   */
  const handleReconnect = useCallback(async () => {
    setLastError(null);
    logger.debug('[WALLET] Attempting reconnect...');
    
    try {
      // First try wagmi's built-in reconnect
      await reconnect();
    } catch (err) {
      logger.debug('[WALLET] Reconnect failed, user may need to connect manually');
      setLastError('Could not reconnect. Please connect your wallet again.');
    }
  }, [reconnect]);
  
  /**
   * Connect with specific connector (for direct Coinbase connection)
   */
  const connectWithCoinbase = useCallback(() => {
    setLastError(null);
    
    // Find Coinbase Wallet connector
    const coinbaseConnector = allConnectors.find(
      c => c.name.toLowerCase().includes('coinbase')
    );
    
    if (coinbaseConnector) {
      logger.debug('[WALLET] Connecting with Coinbase Wallet');
      connect({ connector: coinbaseConnector });
    } else {
      // Fallback to first available connector
      const firstConnector = connectors[0];
      if (firstConnector) {
        connect({ connector: firstConnector });
      } else {
        setLastError('No wallet connectors available');
      }
    }
  }, [allConnectors, connectors, connect]);
  
  /**
   * Clear error and disconnect
   */
  const handleDisconnect = useCallback(() => {
    setLastError(null);
    disconnect();
  }, [disconnect]);
  
  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setLastError(null);
  }, []);
  
  return {
    // State
    address,
    isConnected,
    connectionState,
    error: lastError || (connectError ? getUserFriendlyError(connectError) : null),
    activeConnector,
    
    // Actions
    reconnect: handleReconnect,
    connectWithCoinbase,
    disconnect: handleDisconnect,
    clearError,
    
    // Raw wagmi states (for advanced usage)
    isConnecting,
    isReconnecting,
  };
}

/**
 * Convert technical errors to user-friendly messages
 */
function getUserFriendlyError(error) {
  if (!error) return null;
  
  const message = error.message || String(error);
  
  // User rejected
  if (message.includes('rejected') || message.includes('denied') || message.includes('cancelled')) {
    return 'Connection cancelled. Tap to try again.';
  }
  
  // Session expired
  if (message.includes('session') || message.includes('expired')) {
    return 'Session expired. Please reconnect your wallet.';
  }
  
  // No provider
  if (message.includes('provider') || message.includes('not found')) {
    return 'Wallet not found. Please install Coinbase Wallet.';
  }
  
  // Network issues
  if (message.includes('network') || message.includes('timeout')) {
    return 'Network issue. Check your connection and try again.';
  }
  
  // Generic fallback - keep it short and actionable
  return 'Connection failed. Tap to try again.';
}

export default useWalletConnection;
