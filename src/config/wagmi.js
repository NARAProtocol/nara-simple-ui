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

// RPC endpoints - ONLY working ones, ordered by reliability
// NOTE: sepolia.base.org removed - returns 403 Forbidden
const rpcEndpoints = [
  http('https://base-sepolia.g.alchemy.com/v2/obPLENfqSksoovd3JTUbM'),  // Alchemy - primary
  http('https://base-sepolia-rpc.publicnode.com'),  // publicnode - reliable fallback
];

export const config = getDefaultConfig({
  appName: 'NARA Mining',
  projectId: CONFIG.rainbowProjectId,
  
  // Base Sepolia testnet only
  chains: [baseSepolia],
  
  // Fallback transport - Alchemy primary, publicnode backup
  transports: {
    [baseSepolia.id]: fallback(rpcEndpoints, {
      rank: false, // Use in order - Alchemy first
      retryCount: 2,
    }),
  },
  
  // NO CUSTOM WALLETS - let RainbowKit handle it
  ssr: false,
});

export { baseSepolia };
