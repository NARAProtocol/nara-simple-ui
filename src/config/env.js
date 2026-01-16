/**
 * Environment Configuration
 * Validates and exports network/contract settings.
 */

const isDev = import.meta.env.DEV;

const REQUIRED_ENV_VARS = [
  'VITE_TOKEN_ADDRESS',
  'VITE_MINER_ADDRESS',
  'VITE_CHAIN_ID',
  'VITE_RPC_URL',
  'VITE_RAINBOW_PROJECT_ID',
];

/**
 * Validates presence of required environment variables in non-dev environments.
 */
function validateEnvironment() {
  if (!isDev) {
    const missing = REQUIRED_ENV_VARS.filter(
      (key) => !import.meta.env[key] || import.meta.env[key] === 'YOUR_PROJECT_ID_HERE'
    );
    if (missing.length > 0) {
      console.error('❌ Missing required environment variables:', missing.join(', '));
    }
  }
}

validateEnvironment();

export const CONFIG = {
  tokenAddress: import.meta.env.VITE_TOKEN_ADDRESS || '0x4b83Cdc512B1c8A0bc57e55Ec9b718498AfA8050',
  minerAddress: import.meta.env.VITE_MINER_ADDRESS || '0x314357f3c15522A4A3C5248D8D68FfA210246659',
  registryAddress: import.meta.env.VITE_REGISTRY_ADDRESS || '0xf54397D79028c4Bb617C0D688AE81b0d19119041',
  lensAddress: import.meta.env.VITE_LENS_ADDRESS || '0x689e0747B5C51c00A96feaaFA2B44B0e75e2AD90',
  chainId: Number(import.meta.env.VITE_CHAIN_ID) || 84532,
  rpcUrl: import.meta.env.VITE_RPC_URL || 'https://sepolia.base.org',
  explorerUrl: import.meta.env.VITE_EXPLORER_URL || 'https://sepolia-explorer.base.org',
  rainbowProjectId: import.meta.env.VITE_RAINBOW_PROJECT_ID || '',
};

export const EPOCH_SECONDS = 180;

if (isDev && typeof window !== 'undefined') {
  console.log('⚙️ Configuration Loaded:', {
    network: CONFIG.chainId,
    contracts: {
        token: CONFIG.tokenAddress,
        miner: CONFIG.minerAddress
    }
  });
}

