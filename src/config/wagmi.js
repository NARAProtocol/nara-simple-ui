import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  injectedWallet,
  rainbowWallet,
  walletConnectWallet,
  trustWallet,
  ledgerWallet,
  metaMaskWallet,
  coinbaseWallet,
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
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: http(CONFIG.rpcUrl),
  },
  wallets: [
    {
      groupName: 'Recommended',
      wallets: [
        injectedWallet,
        rainbowWallet,
        walletConnectWallet,
        metaMaskWallet,
        coinbaseWallet,
        trustWallet,
        safeWallet,
      ],
    },
    {
      groupName: 'Others',
      wallets: [
        ledgerWallet,
      ],
    },
  ],
  ssr: false,
});

export { baseSepolia };
