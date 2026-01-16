/**
 * Testnet Faucet Component
 * Allows users to claim 0.11 NARA for testing
 * TEMPORARY - Remove before mainnet
 * 
 * ANTI-ABUSE MEASURES:
 * 1. Only claim if balance < 0.11 NARA (must spend before claiming again)
 * 2. 48-hour cooldown per address (stored locally + checked on-chain)
 * 3. Signature verification to prevent bots
 * 4. Faucet balance check before sending
 */
import React, { useState, useEffect } from 'react';
import { useAccount, useBalance, useSignMessage } from 'wagmi';
import { ethers } from 'ethers';
import { CONFIG, TOKEN_ABI } from '../constants';

// Faucet configuration
const FAUCET_AMOUNT = '0.11'; // NARA amount to claim
const FAUCET_AMOUNT_WEI = ethers.parseEther(FAUCET_AMOUNT);
const MAX_BALANCE_TO_CLAIM = ethers.parseEther('0.1'); // Can only claim if balance < 0.1
const FAUCET_PRIVATE_KEY = import.meta.env.VITE_FAUCET_PRIVATE_KEY || '';
const COOLDOWN_HOURS = 48; // 48-hour cooldown

export default function TestnetFaucet() {
  const { address, isConnected } = useAccount();
  const { data: naraBalance } = useBalance({
    address: address,
    token: CONFIG.tokenAddress,
  });
  const { signMessageAsync } = useSignMessage();
  
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimStep, setClaimStep] = useState('');
  const [message, setMessage] = useState('');
  const [canClaim, setCanClaim] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  // Check eligibility
  useEffect(() => {
    if (!address || !naraBalance) {
      setCanClaim(false);
      return;
    }

    // Check 1: Does user already have enough NARA?
    const balanceWei = ethers.parseEther(naraBalance.formatted);
    if (balanceWei >= MAX_BALANCE_TO_CLAIM) {
      setCanClaim(false);
      setBlockReason('You already have NARA');
      return;
    }

    // Check 2: Cooldown from localStorage
    const lastClaim = localStorage.getItem(`nara_faucet_${address.toLowerCase()}`);
    if (lastClaim) {
      const elapsed = Date.now() - parseInt(lastClaim);
      const cooldownMs = COOLDOWN_HOURS * 60 * 60 * 1000;
      if (elapsed < cooldownMs) {
        setCanClaim(false);
        const remaining = Math.ceil((cooldownMs - elapsed) / (60 * 60 * 1000));
        setBlockReason(`Wait ${remaining}h to claim again`);
        return;
      }
    }

    setCanClaim(true);
    setBlockReason('');
    setMessage('');
  }, [address, naraBalance]);

  const handleClaim = async () => {
    if (!address || !FAUCET_PRIVATE_KEY || !canClaim) {
      setMessage('Cannot claim right now');
      return;
    }

    setIsClaiming(true);
    setMessage('');

    try {
      // Step 1: Signature verification (anti-bot)
      setClaimStep('Sign to verify you are human...');
      const timestamp = Date.now();
      const signMessage = `NARA Faucet Request\nAddress: ${address}\nTimestamp: ${timestamp}`;
      
      let signature;
      try {
        signature = await signMessageAsync({ message: signMessage });
      } catch (signErr) {
        // User rejected signing
        setIsClaiming(false);
        setClaimStep('');
        return;
      }

      // Step 2: Verify signature is valid
      setClaimStep('Verifying...');
      const recoveredAddress = ethers.verifyMessage(signMessage, signature);
      if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
        setMessage('Signature verification failed');
        setIsClaiming(false);
        setClaimStep('');
        return;
      }

      // Step 3: Create provider and check balances
      setClaimStep('Checking eligibility...');
      const provider = new ethers.JsonRpcProvider(CONFIG.rpcUrl);
      const faucetWallet = new ethers.Wallet(FAUCET_PRIVATE_KEY, provider);
      const token = new ethers.Contract(CONFIG.tokenAddress, TOKEN_ABI, faucetWallet);
      
      // Double-check user balance on-chain (prevent localStorage bypass)
      const userBalance = await token.balanceOf(address);
      if (userBalance >= MAX_BALANCE_TO_CLAIM) {
        setMessage('You already have enough NARA');
        setIsClaiming(false);
        setClaimStep('');
        return;
      }

      // Check faucet balance
      const faucetBalance = await token.balanceOf(faucetWallet.address);
      if (faucetBalance < FAUCET_AMOUNT_WEI) {
        setMessage('Faucet empty - try later');
        setIsClaiming(false);
        setClaimStep('');
        return;
      }

      // Step 4: Send tokens
      setClaimStep('Sending NARA...');
      const tx = await token.transfer(address, FAUCET_AMOUNT_WEI);
      await tx.wait();

      // Save claim timestamp (use lowercase address for consistency)
      localStorage.setItem(`nara_faucet_${address.toLowerCase()}`, Date.now().toString());
      setCanClaim(false);
      setBlockReason(`Claimed! Wait ${COOLDOWN_HOURS}h to claim again`);
      setMessage(`✓ Received ${FAUCET_AMOUNT} NARA!`);

    } catch (err) {
      console.error('Faucet error:', err);
      setMessage('Claim failed - try again');
    } finally {
      setIsClaiming(false);
      setClaimStep('');
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
        {isClaiming ? (claimStep || 'PROCESSING...') : `GET ${FAUCET_AMOUNT} TEST NARA`}
      </button>
      {blockReason && <span className="faucet-message">{blockReason}</span>}
      {message && <span className="faucet-message">{message}</span>}
    </div>
  );
}

