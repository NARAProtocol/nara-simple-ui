/**
 * Security Constants & Limits
 * Centralized configuration for input validation and security
 */
import { ethers } from 'ethers';

// Mining limits
export const MINING_LIMITS = {
  /** Minimum ETH per transaction */
  MIN_ETH: 0.00002,
  /** Maximum ETH per transaction (1 ETH) */
  MAX_ETH: 1,
  /** Minimum ETH as BigInt (wei) */
  MIN_WEI: ethers.parseEther('0.00002'),
  /** Maximum ETH as BigInt (wei) */
  MAX_WEI: ethers.parseEther('1'),
  /** Maximum tickets per transaction */
  MAX_TICKETS: 50000n, // 1 ETH / 0.00002 ETH = 50,000 tickets
};

// Input validation rules
export const VALIDATION = {
  /** Maximum decimal places for ETH input */
  MAX_DECIMALS: 18,
  /** Regex for valid ETH amount */
  ETH_PATTERN: /^\d*\.?\d*$/,
  /** Ethereum address pattern */
  ADDRESS_PATTERN: /^0x[a-fA-F0-9]{40}$/,
};

// Claim limits
export const CLAIM_LIMITS = {
  /** Maximum epochs to claim in single transaction */
  MAX_EPOCHS: 100,
  /** Minimum epochs to claim */
  MIN_EPOCHS: 1,
};

// Transaction settings
export const TX_SETTINGS = {
  /** Base gas limit for claims */
  CLAIM_BASE_GAS: 250000n,
  /** Additional gas per epoch claimed */
  CLAIM_GAS_PER_EPOCH: 80000n,
  /** Single claim gas limit */
  SINGLE_CLAIM_GAS: 500000n,
  /** Base gas for finalize */
  FINALIZE_BASE_GAS: 200000n,
  /** Gas per mine finalized */
  FINALIZE_GAS_PER_MINE: 150000n,
};

// Error messages (sanitized for display)
export const ERROR_MESSAGES = {
  WALLET_NOT_CONNECTED: 'Please connect your wallet',
  INSUFFICIENT_BALANCE: 'Insufficient ETH balance',
  AMOUNT_TOO_LOW: `Minimum amount is ${MINING_LIMITS.MIN_ETH} ETH`,
  AMOUNT_TOO_HIGH: `Maximum amount is ${MINING_LIMITS.MAX_ETH} ETH`,
  INVALID_AMOUNT: 'Please enter a valid amount',
  TRANSACTION_REJECTED: 'Transaction was rejected',
  NETWORK_ERROR: 'Network error. Please try again.',
  NOT_ELIGIBLE: 'Hold ≥ 0.1 NARA for 3 hours to mine',
  MINING_PAUSED: 'Mining is currently paused',
  CONTRACT_NOT_READY: 'Contract not initialized',
};
