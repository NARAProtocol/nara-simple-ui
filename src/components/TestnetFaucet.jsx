/**
 * Testnet Faucet Component
 * Allows users to claim 0.11 NARA for testing
 * TEMPORARY - Remove before mainnet
 */
import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { ethers } from 'ethers';
import { CONFIG, TOKEN_ABI } from '../constants';

// Faucet configuration - UPDATE THESE
const FAUCET_AMOUNT = '0.11'; // NARA amount to claim
const FAUCET_PRIVATE_KEY = import.meta.env.VITE_FAUCET_PRIVATE_KEY || '';
const COOLDOWN_HOURS = 24;

export default function TestnetFaucet() {
  const { address, isConnected } = useAccount();
  const [isClaiming, setIsClaiming] = useState(false);
  const [message, setMessage] = useState('');
  const [canClaim, setCanClaim] = useState(true);

  // Check cooldown from localStorage
  useEffect(() => {
    if (!address) return;
    const lastClaim = localStorage.getItem(`nara_faucet_${address}`);
    if (lastClaim) {
      const elapsed = Date.now() - parseInt(lastClaim);
      const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
      if (elapsed < cooldownMs) {
        setCanClaim(false);
        const remaining = Math.ceil((cooldownMs - elapsed) / (60 * 60 * 1000));
        setMessage(`Wait ${remaining}h to claim again`);
      } else {
        setCanClaim(true);
        setMessage('');
      }
    }
  }, [address]);

  const handleClaim = async () => {
    if (!address || !FAUCET_PRIVATE_KEY) {
      setMessage('Faucet not configured');
      return;
    }

    setIsClaiming(true);
    setMessage('Sending NARA...');

    try {
      // Create provider and faucet wallet
      const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
      const faucetWallet = new ethers.Wallet(FAUCET_PRIVATE_KEY, provider);
      
      // Create token contract with faucet signer
      const token = new ethers.Contract(CONFIG.tokenAddress, TOKEN_ABI, faucetWallet);
      
      // Check faucet balance
      const faucetBalance = await token.balanceOf(faucetWallet.address);
      const amountWei = ethers.parseEther(FAUCET_AMOUNT);
      
      if (faucetBalance < amountWei) {
        setMessage('Faucet empty - please try later');
        setIsClaiming(false);
        return;
      }

      // Send tokens
      const tx = await token.transfer(address, amountWei);
      await tx.wait();

      // Save claim timestamp
      localStorage.setItem(`nara_faucet_${address}`, Date.now().toString());
      setCanClaim(false);
      setMessage(`Claimed ${FAUCET_AMOUNT} NARA!`);

    } catch (err) {
      console.error('Faucet error:', err);
      setMessage('Claim failed - try again');
    } finally {
      setIsClaiming(false);
    }
  };

  if (!isConnected) return null;

  // Don't render if faucet not configured
  if (!FAUCET_PRIVATE_KEY) {
    return (
      <div className="faucet-container">
        <button className="faucet-btn disabled" disabled>
          FAUCET OFFLINE
        </button>
      </div>
    );
  }

  return (
    <div className="faucet-container">
      <button
        className={`faucet-btn ${!canClaim ? 'disabled' : ''}`}
        onClick={handleClaim}
        disabled={isClaiming || !canClaim}
      >
        {isClaiming ? 'CLAIMING...' : `GET ${FAUCET_AMOUNT} TEST NARA`}
      </button>
      {message && <span className="faucet-message">{message}</span>}
    </div>
  );
}
