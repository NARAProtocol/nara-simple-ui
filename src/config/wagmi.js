/**
 * Wagmi configuration for the NARA mining UI.
 *
 * Keep Base Sepolia as the only target chain, use reliable RPC fallback,
 * and prioritize the wallets that behave best for Base users on mobile.
 */
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
  baseAccount,
} from '@rainbow-me/rainbowkit/wallets';
import { baseSepolia } from 'wagmi/chains';
import { http, fallback } from 'wagmi';
import { CONFIG } from './env';

const rpcEndpoints = [
  http(CONFIG.rpcUrl || 'https://base-sepolia.g.alchemy.com/v2/obPLENfqSksoovd3JTUbM'),
  http('https://base-sepolia-rpc.publicnode.com'),
];

export const config = getDefaultConfig({
  appName: 'NARA Mining',
  projectId: CONFIG.rainbowProjectId,
  chains: [baseSepolia],
  transports: {
    [baseSepolia.id]: fallback(rpcEndpoints, {
      rank: false,
      retryCount: 2,
    }),
  },
  wallets: [
    {
      groupName: 'Best for Base',
      wallets: [baseAccount, metaMaskWallet, injectedWallet, coinbaseWallet],
    },
    {
      groupName: 'Other Wallets',
      wallets: [walletConnectWallet, rainbowWallet, trustWallet, safeWallet, ledgerWallet],
    },
  ],
  ssr: false,
});

export { baseSepolia };
