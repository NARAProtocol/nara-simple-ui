import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  metaMaskWallet,
  coinbaseWallet,
  walletConnectWallet,
  rainbowWallet,
  trustWallet,
  ledgerWallet,
  safeWallet,
} from '@rainbow-me/rainbowkit/wallets';
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
    [baseSepolia.id]: http(CONFIG.rpcUrl),
  },
  // Prioritize wallets with best Base Sepolia support (mobile-friendly)
  wallets: [
    {
      groupName: 'Best for Base',
      wallets: [
        coinbaseWallet,  // Best Base support - owned by same company
        metaMaskWallet,  // Best testnet support
        injectedWallet,  // Browser extension
      ],
    },
    {
      groupName: 'Other Wallets',
      wallets: [
        walletConnectWallet,
        rainbowWallet,
        trustWallet,
        safeWallet,
        ledgerWallet,
      ],
    },
  ],
  ssr: false,
});

export { baseSepolia };
