/**
 * Wagmi Configuration - Official RainbowKit Pattern
 * 
 * CRITICAL: Use getDefaultConfig WITHOUT custom wallets array.
 * RainbowKit automatically provides the best wallet list including
 * Coinbase, MetaMask, Rainbow, WalletConnect, etc.
 * 
 * Custom wallet arrays can cause connection issues on mobile.
 */
import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { baseSepolia } from 'wagmi/chains';
import { http, fallback } from 'wagmi';
import { CONFIG } from './env';

// Multiple RPC endpoints for resilience
const rpcEndpoints = [
  http(CONFIG.rpcUrl),
  http('https://base-sepolia-rpc.publicnode.com'),
  http('https://base-sepolia.blockpi.network/v1/rpc/public'),
  http('https://sepolia.base.org'),
];

export const config = getDefaultConfig({
  appName: 'NARA Mining',
  projectId: CONFIG.rainbowProjectId,
  
  // Base Sepolia testnet only
  chains: [baseSepolia],
  
  // Fallback transport with multiple RPC endpoints
  transports: {
    [baseSepolia.id]: fallback(rpcEndpoints, {
      rank: true, // Automatically rank by latency
      retryCount: 2,
    }),
  },
  
  // NO CUSTOM WALLETS - let RainbowKit handle it
  // This provides best mobile compatibility
  
  ssr: false,
});

export { baseSepolia };
