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
import { http } from 'wagmi';
import { CONFIG } from './env';

export const config = getDefaultConfig({
  appName: 'NARA Mining',
  projectId: CONFIG.rainbowProjectId,
  
  // Base Sepolia testnet only
  chains: [baseSepolia],
  
  // Custom transport with retry
  transports: {
    [baseSepolia.id]: http(CONFIG.rpcUrl, {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
  
  // NO CUSTOM WALLETS - let RainbowKit handle it
  // This provides best mobile compatibility
  
  ssr: false,
});

export { baseSepolia };
