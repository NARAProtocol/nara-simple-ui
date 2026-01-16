import NARATokenABI from './abis/NARAToken.json';
import NARAMinerABI from './abis/NARAMiner.json';
import AutoMinerRegistryABI from './abis/AutoMinerRegistry.json';
import NaraLensABI from './abis/NaraLens.json';

// Extract ABI array from artifact (handles both formats)
const getABI = (artifact) => {
  return Array.isArray(artifact) ? artifact : artifact?.abi || artifact || [];
};

export const TOKEN_ABI = getABI(NARATokenABI);
export const MINER_ABI = getABI(NARAMinerABI);
export const REGISTRY_ABI = getABI(AutoMinerRegistryABI);
export const LENS_ABI = getABI(NaraLensABI);

export { CONFIG, EPOCH_SECONDS } from './config/env';
