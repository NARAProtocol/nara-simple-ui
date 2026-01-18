import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  metaMaskWallet,
  rainbowWallet,
  walletConnectWallet,
  trustWallet,
  ledgerWallet,
  safeWallet,
  coinbaseWallet, // Re-added for Android support
} from '@rainbow-me/rainbowkit/wallets';
// Import baseAccount - the new Coinbase/Base wallet connector
import { baseAccount } from '@rainbow-me/rainbowkit/wallets';
import { baseSepolia } from 'wagmi/chains';
import { http } from 'wagmi';
import { CONFIG } from './env';

export const config = getDefaultConfig({
  appName: 'NARA Mining',
  appDescription: 'NARA Protocol Mining Interface',
  appUrl: 'https://naraprotocol.io',
  appIcon: 'https://naraprotocol.io/favicon.png',
  projectId: CONFIG.rainbowProjectId,
  // Only Base Sepolia for testnet
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(CONFIG.rpcUrl, {
      batch: true,
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
  // Prioritize wallets with best Base Sepolia support (mobile-friendly)
  wallets: [
    {
      groupName: 'Best for Base',
      wallets: [
        baseAccount,  // Smart Wallet (Passkeys)
        coinbaseWallet({ appName: 'NARA Mining', preference: 'eoaOnly' }), // Standard Mobile App (EOA Only)
        metaMaskWallet,  // Best testnet support
        rainbowWallet,
        injectedWallet,  // Browser extension
      ],
    },
    {
      groupName: 'Other Wallets',
      wallets: [
        walletConnectWallet,
        trustWallet,
        ledgerWallet,
        safeWallet,
      ],
    },
  ],
  ssr: false,
});

export { baseSepolia };
