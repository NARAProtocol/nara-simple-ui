/**
 * Mining Service
 * Handle mining transactions and eligibility checks
 * 
 * SECURITY: Uses production-safe logging and input validation
 */
import { ethers } from 'ethers';
import { 
  getMinerContract, 
  getMinerContractWrite, 
  getTokenContract, 
  getSigner,
  ensureCorrectNetwork 
} from './contracts';
import logger from '../utils/logger';
import { sanitizeError } from '../utils/validation';
import { MINING_LIMITS, CLAIM_LIMITS, TX_SETTINGS, ERROR_MESSAGES } from '../constants/limits';

/**
 * Check if address is eligible to mine
 * @param {string} address - Wallet address
 * @returns {Promise<boolean>}
 */
export async function checkMiningEligibility(address) {
  const token = getTokenContract();
  try {
    return await token.canMine(address);
  } catch (error) {
    logger.error('Failed to check mining eligibility', error);
    return false;
  }
}

/**
 * Get mining status (paused, seeded)
 * NOTE: The deployed NARAMiner contract does not have a pause mechanism.
 * Mining is always enabled once the contract is deployed and seeded.
 * @returns {Promise<{paused: boolean, seeded: boolean}>}
 */
export async function getMiningStatus() {
  // The NARAMiner contract doesn't have pause/seeded state variables.
  // Mining availability is determined by:
  // 1. User's canMine() eligibility (checked separately)
  // 2. Having sufficient ETH for tickets
  // 
  // Always return ready since there's no pause mechanism in the contract.
  return { paused: false, seeded: true };
}

/**
 * Get ticket price in wei
 * @returns {Promise<bigint>}
 */
export async function getTicketPrice() {
  const miner = getMinerContract();
  try {
    return await miner.unitWei();
  } catch (error) {
    logger.error('Failed to get ticket price', error);
    throw error;
  }
}

/**
 * Calculate cost for given number of tickets
 * @param {bigint} ticketCount - Number of tickets
 * @returns {Promise<{ticketCount: bigint, cost: bigint, unitWei: bigint}>}
 */
export async function calculateCost(ticketCount) {
  const miner = getMinerContract();
  const unitWei = await miner.unitWei();
  const cost = ticketCount * unitWei;
  return { ticketCount, cost, unitWei };
}

/**
 * Execute mining transaction
 * @param {bigint} ticketCount - Number of tickets
 * @param {string} expectedAddress - Optional address to verify
 * @returns {Promise<Object>} Transaction object
 */
export async function mine(ticketCount, expectedAddress) {
  logger.tx('mine:start', { tickets: ticketCount.toString() });
  
  // Validate ticket count
  if (ticketCount <= 0n) {
    throw new Error(ERROR_MESSAGES.INVALID_AMOUNT);
  }
  
  if (ticketCount > MINING_LIMITS.MAX_TICKETS) {
    throw new Error(ERROR_MESSAGES.AMOUNT_TOO_HIGH);
  }
  
  // Ensure correct network
  await ensureCorrectNetwork();
  
  // Get signer
  const signer = await getSigner();
  if (!signer) {
    throw new Error(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
  }
  
  const signerAddress = await signer.getAddress();
  
  // Verify address if provided
  if (expectedAddress) {
    if (signerAddress.toLowerCase() !== expectedAddress.toLowerCase()) {
      throw new Error('Wallet address mismatch');
    }
  }
  
  // Check eligibility
  const canMine = await checkMiningEligibility(signerAddress);
  if (!canMine) {
    throw new Error(ERROR_MESSAGES.NOT_ELIGIBLE);
  }
  
  // Check mining status
  const { paused, seeded } = await getMiningStatus();
  if (paused) throw new Error(ERROR_MESSAGES.MINING_PAUSED);
  if (!seeded) throw new Error(ERROR_MESSAGES.CONTRACT_NOT_READY);
  
  // Calculate cost
  const { cost } = await calculateCost(ticketCount);
  
  // Validate cost is within limits
  if (cost > MINING_LIMITS.MAX_WEI) {
    throw new Error(ERROR_MESSAGES.AMOUNT_TOO_HIGH);
  }
  
  logger.tx('mine:cost', { cost: ethers.formatEther(cost) });
  
  // Get miner contract with signer
  const minerWrite = await getMinerContractWrite();
  if (!minerWrite) throw new Error(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
  
  try {
    const tx = await minerWrite.requestMine(ticketCount, { value: cost });
    logger.tx('mine:sent', { hash: tx.hash.slice(0, 10) });
    return tx;
  } catch (error) {
    logger.error('Mine failed', error);
    throw new Error(sanitizeError(error));
  }
}

/**
 * Claim rewards for specific epochs
 * @param {number[]} epochs - Array of epoch numbers to claim
 * @returns {Promise<Object>} Transaction object
 */
export async function claimBatch(epochs) {
  logger.tx('claim:start', { epochCount: epochs.length });
  
  await ensureCorrectNetwork();
  
  const minerWrite = await getMinerContractWrite();
  if (!minerWrite) throw new Error(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
  
  if (epochs.length < CLAIM_LIMITS.MIN_EPOCHS) {
    throw new Error('No epochs to claim');
  }
  if (epochs.length > CLAIM_LIMITS.MAX_EPOCHS) {
    throw new Error(`Too many epochs (max ${CLAIM_LIMITS.MAX_EPOCHS})`);
  }
  
  try {
    let tx;
    if (epochs.length === 1) {
      tx = await minerWrite.claim(epochs[0], { gasLimit: TX_SETTINGS.SINGLE_CLAIM_GAS });
    } else {
      const gasLimit = TX_SETTINGS.CLAIM_BASE_GAS + (BigInt(epochs.length) * TX_SETTINGS.CLAIM_GAS_PER_EPOCH);
      tx = await minerWrite.claimBatch(epochs, { gasLimit });
    }
    
    logger.tx('claim:sent', { hash: tx.hash.slice(0, 10) });
    return tx;
  } catch (error) {
    logger.error('Claim failed', error);
    throw new Error(sanitizeError(error));
  }
}

/**
 * Finalize pending mine requests
 * CRITICAL: Must be called after requestMine for tickets to be credited
 * @param {number} count - Number of mines to finalize
 * @returns {Promise<Object>} Transaction object
 */
export async function finalizeMines(count = 10) {
  logger.tx('finalize:start', { count });
  
  await ensureCorrectNetwork();
  
  const minerWrite = await getMinerContractWrite();
  if (!minerWrite) throw new Error(ERROR_MESSAGES.WALLET_NOT_CONNECTED);
  
  try {
    const gasLimit = TX_SETTINGS.FINALIZE_BASE_GAS + (BigInt(count) * TX_SETTINGS.FINALIZE_GAS_PER_MINE);
    const tx = await minerWrite.finalizeMines(count, { gasLimit });
    logger.tx('finalize:sent', { hash: tx.hash.slice(0, 10), gasLimit: gasLimit.toString() });
    return tx;
  } catch (error) {
    logger.error('Finalize failed', error);
    throw new Error(sanitizeError(error));
  }
}

/**
 * Get pending mine count for user
 * @param {string} address - User wallet address
 * @returns {Promise<number>} Number of pending mines
 */
export async function getPendingMines(address) {
  const miner = getMinerContract();
  try {
    const [requested, claimed] = await Promise.all([
      miner.userRequestCount(address),
      miner.userClaimedCount(address),
    ]);
    return Number(requested) - Number(claimed);
  } catch (error) {
    logger.error('Failed to get pending mines', error);
    return 0;
  }
}

