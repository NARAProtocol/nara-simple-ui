/**
 * Input Validation Utilities
 * Sanitization and validation for user inputs
 */
import { ethers } from 'ethers';
import { MINING_LIMITS, VALIDATION, ERROR_MESSAGES } from '../constants/limits';

/**
 * Validate and sanitize ETH amount input
 * @param {string} input - Raw user input
 * @returns {{ valid: boolean, value: string, error?: string }}
 */
export function validateEthInput(input) {
  // Remove any non-numeric characters except decimal point
  const sanitized = input.replace(/[^0-9.]/g, '');
  
  // Handle multiple decimal points
  const parts = sanitized.split('.');
  let value = parts[0] || '0';
  if (parts.length > 1) {
    value += '.' + parts.slice(1).join('');
  }

  // Empty or just decimal
  if (!value || value === '.') {
    return { valid: false, value: '', error: undefined };
  }

  // Parse as number for validation
  const numValue = parseFloat(value);

  // Check if it's a valid number
  if (isNaN(numValue)) {
    return { valid: false, value: '', error: ERROR_MESSAGES.INVALID_AMOUNT };
  }

  // Check minimum
  if (numValue > 0 && numValue < MINING_LIMITS.MIN_ETH) {
    return { valid: false, value, error: ERROR_MESSAGES.AMOUNT_TOO_LOW };
  }

  // Check maximum
  if (numValue > MINING_LIMITS.MAX_ETH) {
    return { valid: false, value, error: ERROR_MESSAGES.AMOUNT_TOO_HIGH };
  }

  return { valid: numValue > 0, value, error: undefined };
}

/**
 * Parse ETH string to wei (bigint), with validation
 * @param {string} ethAmount - ETH amount as string
 * @returns {{ success: boolean, wei?: bigint, error?: string }}
 */
export function parseEthToWei(ethAmount) {
  try {
    const validation = validateEthInput(ethAmount);
    if (!validation.valid && validation.error) {
      return { success: false, error: validation.error };
    }

    if (!validation.value || parseFloat(validation.value) <= 0) {
      return { success: false, error: ERROR_MESSAGES.INVALID_AMOUNT };
    }

    const wei = ethers.parseEther(validation.value);

    // Double-check bounds
    if (wei < MINING_LIMITS.MIN_WEI) {
      return { success: false, error: ERROR_MESSAGES.AMOUNT_TOO_LOW };
    }
    if (wei > MINING_LIMITS.MAX_WEI) {
      return { success: false, error: ERROR_MESSAGES.AMOUNT_TOO_HIGH };
    }

    return { success: true, wei };
  } catch (error) {
    return { success: false, error: ERROR_MESSAGES.INVALID_AMOUNT };
  }
}

/**
 * Validate Ethereum address
 * @param {string} address 
 * @returns {boolean}
 */
export function isValidAddress(address) {
  if (!address || typeof address !== 'string') return false;
  return VALIDATION.ADDRESS_PATTERN.test(address);
}

/**
 * Sanitize error message for display
 * Removes sensitive information from error messages
 * @param {Error|string} error 
 * @returns {string}
 */
export function sanitizeError(error) {
  if (!error) return ERROR_MESSAGES.NETWORK_ERROR;

  const message = typeof error === 'string' ? error : error.message || '';

  // User rejection
  if (message.includes('user rejected') || message.includes('User denied')) {
    return ERROR_MESSAGES.TRANSACTION_REJECTED;
  }

  // Insufficient funds
  if (message.includes('insufficient') || message.includes('INSUFFICIENT_FUNDS')) {
    return ERROR_MESSAGES.INSUFFICIENT_BALANCE;
  }

  // Not eligible
  if (message.includes('not eligible') || message.includes('canMine')) {
    return ERROR_MESSAGES.NOT_ELIGIBLE;
  }

  // Contract paused
  if (message.includes('paused')) {
    return ERROR_MESSAGES.MINING_PAUSED;
  }

  // Generic network error - don't expose internals
  if (message.includes('network') || message.includes('RPC') || message.includes('timeout')) {
    return ERROR_MESSAGES.NETWORK_ERROR;
  }

  // If the message seems safe (no stack traces, addresses), return it
  if (message.length < 100 && !message.includes('0x') && !message.includes('at ')) {
    return message;
  }

  // Default safe message
  return ERROR_MESSAGES.NETWORK_ERROR;
}

/**
 * Format ETH amount for display (max 6 decimals, no trailing zeros)
 * @param {string|number} eth 
 * @returns {string}
 */
export function formatEthDisplay(eth) {
  const num = typeof eth === 'string' ? parseFloat(eth) : eth;
  if (isNaN(num)) return '0';
  
  // Use up to 6 decimal places, remove trailing zeros
  return parseFloat(num.toFixed(6)).toString();
}
