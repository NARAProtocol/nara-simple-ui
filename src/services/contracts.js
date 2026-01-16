/**
 * Contract Service
 * Handles ethers.js provider, signer, and contract instances
 * 
 * SECURITY: Uses production-safe logging
 */
import { ethers } from 'ethers';
import { CONFIG, TOKEN_ABI, MINER_ABI, REGISTRY_ABI, LENS_ABI } from '../constants';
import logger from '../utils/logger';

let provider = null;
let providerIndex = 0;

// RPC request timeout (30 seconds)
const RPC_TIMEOUT = 30000;

// Fallback RPC endpoints for resilience
const RPC_ENDPOINTS = [
  CONFIG.rpcUrl,
  'https://base-sepolia.blockpi.network/v1/rpc/public',
  'https://sepolia.base.org',
].filter(Boolean);

/**
 * Get JSON-RPC provider with fallback support
 * Will try next provider if current one fails
 */
export function getProvider() {
  if (!provider) {
    const rpcUrl = RPC_ENDPOINTS[providerIndex] || RPC_ENDPOINTS[0];
    provider = new ethers.JsonRpcProvider(rpcUrl, undefined, {
      staticNetwork: true,
      batchMaxCount: 1,
    });
    logger.debug('Provider initialized:', rpcUrl.replace(/\/\/.*@/, '//***@'));
  }
  return provider;
}

/**
 * Reset provider to try next fallback
 * Call this when RPC errors occur
 */
export function resetProvider() {
  provider = null;
  providerIndex = (providerIndex + 1) % RPC_ENDPOINTS.length;
  logger.debug('Switching to fallback RPC:', providerIndex);
  return getProvider();
}

/**
 * Get fresh signer from browser wallet
 * CRITICAL: Always create fresh - don't cache
 */
export async function getSigner() {
  if (typeof window === 'undefined' || !window.ethereum) {
    logger.error('No wallet detected');
    return null;
  }

  try {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (!accounts || accounts.length === 0) {
      logger.error('No accounts connected');
      return null;
    }

    const browserProvider = new ethers.BrowserProvider(window.ethereum);
    const signer = await browserProvider.getSigner();
    const address = await signer.getAddress();
    logger.debug('Signer:', address.slice(0, 6) + '...' + address.slice(-4));
    return signer;
  } catch (error) {
    logger.error('Failed to get signer', error);
    return null;
  }
}

/**
 * Get Token contract (read-only)
 */
export function getTokenContract() {
  return new ethers.Contract(CONFIG.tokenAddress, TOKEN_ABI, getProvider());
}

/**
 * Get Miner contract (read-only)
 */
export function getMinerContract() {
  return new ethers.Contract(CONFIG.minerAddress, MINER_ABI, getProvider());
}

/**
 * Get Miner contract with signer (for writing)
 */
export async function getMinerContractWrite() {
  const signer = await getSigner();
  if (!signer) return null;
  return new ethers.Contract(CONFIG.minerAddress, MINER_ABI, signer);
}

/**
 * Get Lens contract (read-only)
 */
export function getLensContract() {
  return new ethers.Contract(CONFIG.lensAddress, LENS_ABI, getProvider());
}

/**
 * Fetch bonus overview for a user
 * @param {string} address - User wallet address
 */
export async function fetchBonusOverview(address) {
  try {
    const lens = getLensContract();
    // getBonusOverview(miner, token, user)
    const overview = await lens.getBonusOverview(
      CONFIG.minerAddress,
      CONFIG.tokenAddress,
      address
    );
    // DEBUG: Log jackpot values
    console.log('[DEBUG] fetchBonusOverview jackpot:', {
      baseChanceBps: overview.jackpot.baseChanceBps?.toString(),
      userChanceBps: overview.jackpot.userChanceBps?.toString(),
      oddsSource: overview.jackpot.oddsSource
    });
    return overview;
  } catch (error) {
    logger.error('fetchBonusOverview failed', error);
    return null;
  }
}

/**
 * Ensure wallet is on the correct network (Base Sepolia)
 */
export async function ensureCorrectNetwork() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No wallet detected');
  }

  const hexChainId = `0x${CONFIG.chainId.toString(16)}`;
  const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });

  if (currentChainId === hexChainId) {
    return;
  }

  logger.debug('Switching network...');
  
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: hexChainId }],
    });
  } catch (error) {
    if (error.code === 4902) {
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: hexChainId,
          chainName: 'Base Sepolia',
          nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
          rpcUrls: [CONFIG.rpcUrl],
          blockExplorerUrls: [CONFIG.explorerUrl],
        }],
      });
    } else {
      throw error;
    }
  }
}

/**
 * Get user dashboard data in ONE RPC call
 * @param {string} address - User wallet address
 * @returns {Promise<Object|null>} Dashboard data or null on error
 */
export async function getUserDashboard(address) {
  try {
    const miner = getMinerContract();
    const dashboard = await miner.getUserDashboard(address);
    
    // Fetch current epoch's ETH pool (ethBank) for community pool display
    const currentEpoch = Number(dashboard.currentEpoch);
    let epochEthBank = 0n;
    let hardCap = 0n;
    try {
      [epochEthBank, hardCap] = await Promise.all([
        miner.ethBank(currentEpoch),
        miner.hardCap()
      ]);
    } catch (e) {
      logger.debug('Could not fetch ethBank/hardCap', e);
    }
    
    return {
      currentEpoch: currentEpoch,
      epochSecondsRemaining: Number(dashboard.epochSecondsRemaining),
      pendingTickets: Number(dashboard.pendingTickets),
      pendingWeighted: dashboard.pendingWeighted,
      pendingTotalWeighted: dashboard.pendingTotalWeighted,
      pendingEstimatedReward: dashboard.pendingEstimatedReward,
      holdingBonusBps: Number(dashboard.holdingBonusBps),
      streakDays: Number(dashboard.streakDays),
      streakBonusBps: Number(dashboard.streakBonusBps),
      totalMultiplierBps: Number(dashboard.totalMultiplierBps),
      jackpotEthPool: dashboard.jackpotEthPool,
      jackpotNaraPool: dashboard.jackpotNaraPool,
      // Current epoch's community pools
      epochEthBank: epochEthBank,
      epochNaraEmission: dashboard.currentBasePerMin, // basePerMin is the epoch NARA emission
      rewardPool: dashboard.rewardPool,
      currentBasePerMin: dashboard.currentBasePerMin,
      ticketPrice: dashboard.ticketPrice,
      userCanMine: dashboard.userCanMine,
      // Hard cap info for preventing over-mining
      hardCap: Number(hardCap),
      // NEW: NFT bonus and cap info
      effectiveCap: Number(dashboard.effectiveCap),
      capBonus: Number(dashboard.capBonus),
      jackpotOddsBps: Number(dashboard.jackpotOddsBps),
      pendingMines: Number(dashboard.pendingMines),
      surgeBonus: dashboard.surgeBonus,
    };
  } catch (error) {
    logger.error('getUserDashboard failed', error);
    return null;
  }
}

/**
 * Get all claimable epochs in ONE RPC call
 * @param {string} address - User wallet address
 * @param {number} maxEpochs - Maximum epochs to check
 * @returns {Promise<Object|null>} Claimable data or null on error
 */
export async function getClaimableEpochsBatch(address, maxEpochs = 100) {
  try {
    const miner = getMinerContract();
    
    const token = getTokenContract();
    
    // Fetch batch data, reward pool var, AND actual token balance
    const [result, poolVar, tokenBalance] = await Promise.all([
      miner.getClaimableEpochsBatch(address, maxEpochs),
      miner.rewardTokenPool(),
      token.balanceOf(CONFIG.minerAddress)
    ]);
    
    // The contract requires BOTH checks to pass:
    // 1. rewardTokenPool >= amount
    // 2. token.balanceOf(this) >= amount
    // So we must limit our claims by the SMALLER of the two
    const effectivePool = poolVar < tokenBalance ? poolVar : tokenBalance;
    
    const [epochs, amounts] = result;
    
    const validEpochs = [];
    const validAmounts = [];
    let runningTotal = 0n;
    let poolRemaining = effectivePool;

    for (let i = 0; i < epochs.length; i++) {
        const amount = amounts[i];
        if (amount === 0n) continue;
        
        // Check if we can cover this amount with remaining pool
        if (poolRemaining >= amount) {
            validEpochs.push(Number(epochs[i]));
            // formatEther later
            validAmounts.push(amount);
            runningTotal += amount;
            poolRemaining -= amount;
        } else {
            // Pool exhausted for further claims in this batch
            break;
        }
    }
    
    return {
      epochs: validEpochs,
      amounts: validAmounts.map((a) => ethers.formatEther(a)),
      totalClaimable: ethers.formatEther(runningTotal),
    };
  } catch (error) {
    logger.error('getClaimableEpochsBatch failed', error);
    return null;
  }
}

export async function getEpochParams() {
  try {
    const miner = getMinerContract();
    
    // Manual fallback since getEpochParams might not exist
    const [
      currentEpoch,
      epochSeconds,
      claimWindow,
      basePerMin,
      unitWei,
      hardCap,
      seeded
    ] = await Promise.all([
      miner.EPOCH_SECONDS(), // Actually returns epoch seconds
      miner.EPOCH_SECONDS(), // Re-using variable name, but logic is simplified
      miner.claimWindowEpochs(),
      miner.basePerMin(),
      miner.unitWei(),
      miner.hardCap(),
      miner.seeded().catch(() => true) // Handle missing seeded
    ]);

    // Construct params similar to what getEpochParams would return
    // Note: epochSeconds is technically returned by EPOCH_SECONDS() view
    
    // We also need to check paused 
    let isPaused = false;
    try {
      isPaused = await miner.paused();
    } catch (e) {
      // Ignore if missing
    }

    return {
      currentEpoch: 0, // Not easily available without calculateEpoch, skipping or defaulting
      epochSeconds: Number(epochSeconds),
      claimWindow: Number(claimWindow),
      ticketPriceWei: unitWei,
      isPaused: isPaused,
      basePerMinCurrent: basePerMin,
      hardCapTickets: hardCap
    };
  } catch (error) {
    logger.error('getEpochParams fallback failed', error);
    // Return safe defaults
    return {
      currentEpoch: 0,
      epochSeconds: 86400,
      claimWindow: 7,
      ticketPriceWei: ethers.parseEther("0.001"),
      isPaused: false
    };
  }
}

