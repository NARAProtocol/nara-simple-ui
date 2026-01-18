/**
 * useMining Hook
 * Handles mining transactions using wagmi hooks for reliable wallet connectivity.
 * Works with all wallet types (WalletConnect, injected, smart wallet).
 */
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther } from 'viem';
import { CONFIG } from '../config/env';
import MINER_ABI from '../abis/NARAMiner.json';

// Extract just the ABI array from the artifact
const minerAbi = MINER_ABI.abi;

/**
 * Hook for mining operations using wagmi
 * @returns {Object} Mining functions and state
 */
export function useMining() {
  const { 
    writeContract, 
    writeContractAsync,
    data: hash,
    isPending,
    isError,
    error,
    reset 
  } = useWriteContract();

  const { 
    isLoading: isConfirming, 
    isSuccess: isConfirmed 
  } = useWaitForTransactionReceipt({ hash });

  /**
   * Request mining tickets
   * @param {bigint} ticketCount - Number of tickets
   * @param {bigint} costWei - Total cost in wei
   * @returns {Promise<string>} Transaction hash
   */
  const requestMine = async (ticketCount, costWei) => {
    const txHash = await writeContractAsync({
      address: CONFIG.minerAddress,
      abi: minerAbi,
      functionName: 'requestMine',
      args: [ticketCount],
      value: costWei,
    });
    return txHash;
  };

  /**
   * Finalize pending mines
   * @param {number} count - Number of mines to finalize
   * @returns {Promise<string>} Transaction hash
   */
  const finalizeMines = async (count) => {
    const txHash = await writeContractAsync({
      address: CONFIG.minerAddress,
      abi: minerAbi,
      functionName: 'finalizeMines',
      args: [count],
    });
    return txHash;
  };

  /**
   * Claim single epoch
   * @param {number} epoch - Epoch number to claim
   * @returns {Promise<string>} Transaction hash
   */
  const claim = async (epoch) => {
    const txHash = await writeContractAsync({
      address: CONFIG.minerAddress,
      abi: minerAbi,
      functionName: 'claim',
      args: [epoch],
    });
    return txHash;
  };

  /**
   * Claim multiple epochs
   * @param {number[]} epochs - Array of epoch numbers
   * @returns {Promise<string>} Transaction hash
   */
  const claimBatch = async (epochs) => {
    const txHash = await writeContractAsync({
      address: CONFIG.minerAddress,
      abi: minerAbi,
      functionName: 'claimBatch',
      args: [epochs],
    });
    return txHash;
  };

  return {
    // Actions
    requestMine,
    finalizeMines,
    claim,
    claimBatch,
    reset,
    
    // State
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    isError,
    error,
  };
}

export default useMining;
