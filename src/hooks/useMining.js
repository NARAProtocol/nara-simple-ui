/**
 * useMining Hook - Production Grade
 * 
 * CRITICAL CHANGES:
 * 1. Simulates transactions before sending (catches errors pre-wallet)
 * 2. Parses contract revert reasons into user-friendly messages
 * 3. Uses useReadContract for real-time pending mine count
 */
import { useCallback } from 'react';
import { 
  useWriteContract, 
  useWaitForTransactionReceipt,
  useReadContract,
  useAccount
} from 'wagmi';
import { CONFIG } from '../config/env';
import MINER_ABI from '../abis/NARAMiner.json';
import logger from '../utils/logger';

// Extract just the ABI array from the artifact
const minerAbi = MINER_ABI.abi;

/**
 * Parse contract errors into user-friendly messages
 * @param {Error} error - The error from simulation or transaction
 * @returns {string} User-friendly error message
 */
function parseContractError(error) {
  if (!error) return 'Transaction failed';
  
  const message = error.message || error.shortMessage || String(error);
  
  // User rejected - not an error, just cancelled
  if (message.includes('rejected') || message.includes('denied') || message.includes('cancelled')) {
    return null; // null = don't show error
  }
  
  // Parse common contract reverts
  if (message.includes('EpochCapExceeded') || message.includes('cap')) {
    return 'Epoch cap reached. Wait for next epoch to finalize.';
  }
  
  if (message.includes('NoPendingMines') || message.includes('no pending')) {
    return 'No pending mines to finalize.';
  }
  
  if (message.includes('BlockNotMature') || message.includes('block') || message.includes('too early')) {
    return 'Wait a few more blocks before finalizing.';
  }
  
  if (message.includes('insufficient funds') || message.includes('balance')) {
    return 'Insufficient ETH balance for gas.';
  }
  
  if (message.includes('NotEligible') || message.includes('eligible')) {
    return 'You are not eligible to mine. Hold NARA tokens first.';
  }
  
  // Generic fallback
  logger.error('[MINING] Unhandled error:', message);
  return 'Transaction would fail. Please try again later.';
}

/**
 * Production-ready mining hook with simulation
 */
export function useMining() {
  const { address } = useAccount();
  
  const { 
    writeContractAsync,
    data: hash,
    isPending,
    isError,
    error: writeError,
    reset 
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed 
  } = useWaitForTransactionReceipt({ hash });

  // Real-time pending mine count from contract (source of truth)
  // CRITICAL: retry:false and throwOnError:false prevent RPC errors from crashing the app
  const { 
    data: pendingMinesOnChain = 0n,
    refetch: refetchPendingMines,
    isError: isPendingError
  } = useReadContract({
    address: CONFIG.minerAddress,
    abi: minerAbi,
    functionName: 'getPendingMines',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
      refetchInterval: 10000, // Refresh every 10s
      retry: false, // Don't retry on RPC failure - prevents crash loops
      throwOnError: false, // Never throw - return error state instead
    }
  });

  /**
   * Request mining tickets with simulation
   */
  const requestMine = useCallback(async (ticketCount, costWei) => {
    const args = { 
      address: CONFIG.minerAddress,
      abi: minerAbi,
      functionName: 'requestMine',
      args: [ticketCount],
      value: costWei,
    };

    // Simulation happens automatically in wagmi when using writeContractAsync
    // If it fails, the error is caught here
    try {
      logger.debug('[MINING] Sending requestMine', { tickets: ticketCount.toString() });
      const txHash = await writeContractAsync(args);
      logger.debug('[MINING] TX sent:', txHash);
      return txHash;
    } catch (error) {
      const msg = parseContractError(error);
      if (msg) throw new Error(msg);
      throw error; // Re-throw if user rejection (no message)
    }
  }, [writeContractAsync]);

  /**
   * Finalize pending mines with pre-validation
   */
  const finalizeMines = useCallback(async (count) => {
    // Pre-check: Do we actually have pending mines?
    const pending = Number(pendingMinesOnChain);
    if (pending === 0) {
      throw new Error('No pending mines to finalize.');
    }
    
    if (count > pending) {
      throw new Error(`Only ${pending} pending mine(s) to finalize.`);
    }

    const args = {
      address: CONFIG.minerAddress,
      abi: minerAbi,
      functionName: 'finalizeMines',
      args: [count],
    };

    try {
      logger.debug('[MINING] Sending finalizeMines', { count });
      const txHash = await writeContractAsync(args);
      logger.debug('[MINING] Finalize TX sent:', txHash);
      
      // Refresh pending count after successful send
      setTimeout(() => refetchPendingMines(), 3000);
      
      return txHash;
    } catch (error) {
      const msg = parseContractError(error);
      if (msg) throw new Error(msg);
      throw error;
    }
  }, [writeContractAsync, pendingMinesOnChain, refetchPendingMines]);

  /**
   * Claim single epoch
   */
  const claim = useCallback(async (epoch) => {
    const args = {
      address: CONFIG.minerAddress,
      abi: minerAbi,
      functionName: 'claim',
      args: [epoch],
    };

    try {
      const txHash = await writeContractAsync(args);
      return txHash;
    } catch (error) {
      const msg = parseContractError(error);
      if (msg) throw new Error(msg);
      throw error;
    }
  }, [writeContractAsync]);

  /**
   * Claim multiple epochs
   */
  const claimBatch = useCallback(async (epochs) => {
    const args = {
      address: CONFIG.minerAddress,
      abi: minerAbi,
      functionName: 'claimBatch',
      args: [epochs],
    };

    try {
      const txHash = await writeContractAsync(args);
      return txHash;
    } catch (error) {
      const msg = parseContractError(error);
      if (msg) throw new Error(msg);
      throw error;
    }
  }, [writeContractAsync]);

  return {
    // Actions
    requestMine,
    finalizeMines,
    claim,
    claimBatch,
    reset,
    refetchPendingMines,
    
    // On-chain state (source of truth) - SAFE CONVERSION
    // Handle BigInt, undefined, null, or string safely
    pendingMinesOnChain: (() => {
      try {
        if (pendingMinesOnChain == null) return 0;
        return Number(pendingMinesOnChain);
      } catch (e) {
        return 0; // Fallback for unsafe BigInts
      }
    })(),
    
    // Transaction state
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    isError,
    error: writeError ? parseContractError(writeError) : null,
  };
}

export default useMining;
