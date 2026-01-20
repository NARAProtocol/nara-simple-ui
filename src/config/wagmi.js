import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  metaMaskWallet,
  walletConnectWallet,
  coinbaseWallet,
} from '@rainbow-me/rainbowkit/wallets';
import { baseSepolia } from 'wagmi/chains';
import { http } from 'wagmi';
import { CONFIG } from './env';

/**
 * Wagmi Configuration for NARA Mining
 * 
 * MOBILE-FIRST DESIGN:
 * - Coinbase Wallet is prioritized as the primary wallet for Base chain
 * - Simple wallet list to avoid confusion on mobile
 * - WalletConnect as fallback for other mobile wallets
 * 
 * VERIFIED CONFIGURATION:
 * - getDefaultConfig handles storage/persistence automatically
 * - RainbowKit handles reconnection on page refresh
 * - projectId required for WalletConnect v2
 */
export const config = getDefaultConfig({
  appName: 'NARA Mining',
  appDescription: 'NARA Protocol Mining Interface',
  appUrl: 'https://naraprotocol.io',
  appIcon: 'https://naraprotocol.io/favicon.png',
  projectId: CONFIG.rainbowProjectId,
  
  // Base Sepolia only for testnet
  chains: [baseSepolia],
  
  // Reliable RPC with retry logic
  transports: {
    [baseSepolia.id]: http(CONFIG.rpcUrl, {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
  
  // MOBILE-OPTIMIZED WALLET LIST
  // Coinbase Wallet first - best UX for Base chain on mobile
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [
        // Coinbase Wallet - MAIN wallet for Base, works great on mobile
        (props) => coinbaseWallet({ 
          ...props, 
          appName: 'NARA Mining',
          // 'all' allows both Smart Wallet and EOA
          preference: 'all',
        }),
        // MetaMask - widely adopted, good mobile support
        metaMaskWallet,
        // Injected - for browser extensions
        injectedWallet,
      ],
    },
    {
      groupName: 'Other Wallets',
      wallets: [
        // WalletConnect - connects any mobile wallet via QR/deep link
        walletConnectWallet,
      ],
    },
  ],
  
  // No SSR for this app
  ssr: false,
});

export { baseSepolia };
