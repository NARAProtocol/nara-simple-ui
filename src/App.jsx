import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, useBalance } from 'wagmi';
import { ethers } from 'ethers';
import { getUserDashboard, getClaimableEpochsBatch, fetchBonusOverview } from './services/contracts';
import { mine, claimBatch, getTicketPrice, finalizeMines, getPendingMines } from './services/mining';
import BonusDisplay from './components/BonusDisplay';
import TestnetFaucet from './components/TestnetFaucet';
import WalletHelp from './components/WalletHelp';
import { CONFIG, EPOCH_SECONDS } from './constants';
import { MINING_LIMITS, ERROR_MESSAGES } from './constants/limits';
import { validateEthInput, sanitizeError } from './utils/validation';
import logger from './utils/logger';
import './App.css';

export default function App() {
  const { address, isConnected } = useAccount();
  const { data: naraBalance } = useBalance({
    address: address,
    token: CONFIG.tokenAddress,
  });
  
  // Timer and epoch state
  const [timeRemaining, setTimeRemaining] = useState(180);
  const [epochCounter, setEpochCounter] = useState(0);
  
  // Dashboard data
  const [dashboard, setDashboard] = useState(null);
  const [bonusOverview, setBonusOverview] = useState(null);
  const [claimableData, setClaimableData] = useState(null);
  const [ticketPrice, setTicketPrice] = useState(null);
  const [pendingMines, setPendingMines] = useState(0);
  
  // Input state - now tracks ticket count
  const [ticketInput, setTicketInput] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const finalizingRef = useRef(false); // Synchronous debounce
  const [miningPhase, setMiningPhase] = useState(''); // '', 'preparing', 'confirming', 'waiting'
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // View state
  const [activeView, setActiveView] = useState('mine');
  
  // Claim history (persisted in localStorage)
  const [claimHistory, setClaimHistory] = useState(() => {
    try {
      // Check if we are compliant with the current contract address
      const savedVersion = localStorage.getItem('nara_miner_address');
      if (savedVersion !== CONFIG.minerAddress) {
        // Clear history for fresh contract
        logger.debug('Contract updated, clearing local history');
        localStorage.removeItem('nara_claim_history');
        localStorage.removeItem('nara_jackpot_wins');
        localStorage.setItem('nara_miner_address', CONFIG.minerAddress);
        return [];
      }
      const saved = localStorage.getItem('nara_claim_history');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });
  
  // Jackpot wins tracking
  const [jackpotWins, setJackpotWins] = useState(() => {
    try {
      const saved = localStorage.getItem('nara_jackpot_wins');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  // Load dashboard data when connected
  useEffect(() => {
    if (!isConnected || !address) {
      setDashboard(null);
      setBonusOverview(null);
      setClaimableData(null);
      setPendingMines(0);
      return;
    }

    let isValid = true;

    const loadData = async () => {
      try {
        logger.debug('Loading dashboard for', address);
        const [dashboardResult, claimableResult, priceResult, pendingResult, bonusResult] = await Promise.all([
          getUserDashboard(address),
          getClaimableEpochsBatch(address),
          getTicketPrice(),
          getPendingMines(address),
          fetchBonusOverview(address)
        ]);
        
        // Prevent race condition - don't update if address changed
        if (!isValid) return;

        setDashboard(dashboardResult);
        setClaimableData(claimableResult);
        setTicketPrice(priceResult);
        setPendingMines(pendingResult);
        setBonusOverview(bonusResult);
        
        if (dashboardResult) {
          setTimeRemaining(dashboardResult.epochSecondsRemaining);
        }
      } catch (err) {
        if (isValid) logger.error('Failed to load dashboard', err);
      }
    };

    loadData();
    const interval = setInterval(loadData, 30000);

    return () => {
      isValid = false;
      clearInterval(interval);
    };
  }, [address, isConnected]);


  // Countdown timer
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev > 0) {
          return prev - 1;
        } else {
          if (isConnected && address) {
            getUserDashboard(address).then(setDashboard);
          }
          return EPOCH_SECONDS;
        }
      });
    }, 1000);

    return () => clearInterval(timerInterval);
  }, [address, isConnected]);

  // Format time as MM:SS
  const formatTime = useCallback((seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Calculate ETH cost for tickets
  const calculateEthCost = useCallback(() => {
    if (!ticketPrice || !ticketInput) return '0';
    const tickets = parseInt(ticketInput, 10) || 0;
    if (tickets <= 0) return '0';
    const cost = BigInt(tickets) * ticketPrice;
    return ethers.formatEther(cost);
  }, [ticketPrice, ticketInput]);

  // Handle finalize action
  const handleFinalize = useCallback(async () => {
    // Synchronous debounce check using ref
    logger.debug('[DEBOUNCE] finalizingRef.current:', finalizingRef.current);
    if (pendingMines <= 0 || finalizingRef.current) {
      logger.debug('[DEBOUNCE] Blocked! Already finalizing.');
      return;
    }
    finalizingRef.current = true; // Immediately block further calls
    logger.debug('[DEBOUNCE] Set to true, proceeding...');
    
    // Also update state for UI
    setIsFinalizing(true);
    
    // Calculate max finalize based on cap
    const cap = dashboard?.effectiveCap || dashboard?.hardCap || 1;
    const used = dashboard?.pendingTickets || 0;
    const available = Math.max(0, cap - used);
    
    const countToFinalize = Math.min(pendingMines, available);
    
    logger.debug('[FINALIZE] State:', { pending: pendingMines, cap, used, available, count: countToFinalize });

    if (countToFinalize <= 0) {
      setError('Epoch cap reached for this epoch. Please wait for the next epoch to finalize remaining mines.');
      // Reset ref since we are returning early
      finalizingRef.current = false;
      setIsFinalizing(false);
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const tx = await finalizeMines(countToFinalize);
      setSuccess(`Finalize TX sent: ${tx.hash.slice(0, 10)}...`);
      
      logger.debug('[FINALIZE] Reducing pending locally by:', countToFinalize);
      // Immediately reduce pending count to prevent double-click
      setPendingMines(prev => Math.max(0, prev - countToFinalize));
      
      await tx.wait();
      setSuccess(`Finalized ${countToFinalize} mines! Tickets credited.`);
      
      // Refresh with actual on-chain data
      const [newPending, newDashboard] = await Promise.all([
        getPendingMines(address),
        getUserDashboard(address)
      ]);
      
      // RPC Lag Protection:
      // If RPC return value hasn't decreased (still >= original), it's stale.
      // Trust our optimistic calculation in that case.
      const expectedRemaining = Math.max(0, pendingMines - countToFinalize);
      if (newPending >= pendingMines) {
        logger.debug('[FINALIZE] RPC data stale (new >= old), keeping optimistic state', {
          rpc: newPending,
          old: pendingMines,
          kept: expectedRemaining
        });
        setPendingMines(expectedRemaining);
      } else {
        setPendingMines(newPending);
      }

      // Optimistic Dashboard Update:
      // Prevent "Mine" button flashing by ensuring pendingTickets (used cap)
      // reflects what we just finalized, even if RPC is stale.
      // If newDashboard.pendingTickets hasn't increased, force it.
      const oldUsed = dashboard?.pendingTickets || 0;
      const newUsed = newDashboard?.pendingTickets || 0;
      
      if (newUsed <= oldUsed) {
         // RPC stale - manually increment used tickets
         setDashboard({
            ...newDashboard,
            pendingTickets: oldUsed + countToFinalize
         });
         logger.debug('[FINALIZE] RPC stale for dashboard, optimistic update applied', {
            oldUsed,
            newUsed,
            forced: oldUsed + countToFinalize
         });
      } else {
         setDashboard(newDashboard);
      }
      
    } catch (err) {
      logger.error('Finalize failed', err);
      const msg = sanitizeError(err);
      if (msg !== ERROR_MESSAGES.TRANSACTION_REJECTED) {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
      setIsFinalizing(false);
      finalizingRef.current = false;
    }
  }, [pendingMines, address, dashboard]);

  // Handle mine action
  const handleMine = useCallback(async () => {
    const tickets = parseInt(ticketInput, 10) || 0;
    
    if (tickets <= 0) {
      setError('Enter a valid ticket amount');
      return;
    }
    if (!ticketPrice) {
      setError('Loading price...');
      return;
    }

    // Check cap - use effectiveCap (new) or fallback to hardCap (old)
    const effectiveCap = dashboard?.effectiveCap || dashboard?.hardCap || 0;
    const currentTickets = dashboard?.pendingTickets || 0;
    const pendingInQueue = pendingMines; 
    const remainingCap = effectiveCap - currentTickets - pendingInQueue;
    
    // If we have effectiveCap (new contract), we can enforce strict check
    const isPreciseCap = !!dashboard?.effectiveCap;

    if (effectiveCap > 0 && remainingCap <= 0) {
      if (isPreciseCap) {
        setError('Epoch Cap Reached. Try again next epoch.');
        return;
      } else {
        // Fallback warning for old contract
        setSuccess('Note: Base cap reached, but you may have NFT-based cap bonus.');
      }
    }

    // Check if trying to mine more than remaining
    if (isPreciseCap && tickets > remainingCap) {
        setError(`You can only mine ${remainingCap} more ticket(s) this epoch.`);
        return;
    }

    // Check max limit (convert tickets to ETH)
    const ethCost = Number(ethers.formatEther(BigInt(tickets) * ticketPrice));
    if (ethCost > MINING_LIMITS.MAX_ETH) {
      setError(`Maximum ${MINING_LIMITS.MAX_ETH} ETH per transaction`);
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');
    setMiningPhase('preparing');

    try {
      logger.tx('mine', { tickets: tickets.toString() });
      setSuccess('Preparing transaction...');
      
      const tx = await mine(BigInt(tickets), address);
      setMiningPhase('confirming');
      setSuccess(`TX sent! Waiting for confirmation...`);
      
      // Immediately show pending state (optimistic update)
      setPendingMines(prev => prev + 1);
      setIsLoading(false); // Allow user to see the pending card while waiting
      
      setMiningPhase('waiting');
      await tx.wait();
      setMiningPhase('');
      setSuccess('Mining confirmed! Click FINALIZE below.');
      
      // Refresh actual pending count from chain
      // Use Math.max to prevent stale RPC data (lag) from resetting our optimistic count
      // We know we just mined, so pending MUST be at least what it was intuitively.
      const newPending = await getPendingMines(address);
      setPendingMines(prev => Math.max(prev, newPending));
      
    } catch (err) {
      logger.error('Mining failed', err);
      const msg = sanitizeError(err);
      
      // Don't show error for user rejection
      if (msg !== ERROR_MESSAGES.TRANSACTION_REJECTED) {
        setError(msg);
      }
      
      setMiningPhase('');
      // Revert optimistic update on error
      const actualPending = await getPendingMines(address).catch(() => 0);
      setPendingMines(actualPending);
    } finally {
      setIsLoading(false);
      setMiningPhase('');
    }
  }, [ticketInput, address, ticketPrice, dashboard, pendingMines]);

  // Handle claim action
  const handleClaim = useCallback(async () => {
    if (!claimableData || claimableData.epochs.length === 0) {
      setError('Nothing to claim');
      return;
    }

    setIsLoading(true);
    setError('');
    setSuccess('');

    try {
      const epochsToClaim = [...claimableData.epochs]; // Copy before clearing
      const amountToClaim = totalClaimable;
      
      const tx = await claimBatch(epochsToClaim);
      setSuccess(`Claim TX sent: ${tx.hash.slice(0, 10)}...`);
      
      // Immediately clear claimable to prevent double-click
      setClaimableData({ epochs: [], amounts: [], totalClaimable: '0' });
      
      await tx.wait();
      setSuccess('Claimed successfully! Balance updating...');
      
      // Save to claim history
      const newHistoryEntry = {
        epochs: epochsToClaim,
        amount: amountToClaim,
        timestamp: Date.now(),
        txHash: tx.hash
      };
      const updatedHistory = [newHistoryEntry, ...claimHistory].slice(0, 10);
      setClaimHistory(updatedHistory);
      localStorage.setItem('nara_claim_history', JSON.stringify(updatedHistory));
      
      // Refresh both claimable and dashboard for balance update
      const [newClaimable, newDashboard] = await Promise.all([
        getClaimableEpochsBatch(address),
        getUserDashboard(address)
      ]);
      
      // Filter out epochs we just claimed to handle RPC lag
      // If the node is slow, it might still report them as claimable.
      if (newClaimable && newClaimable.epochs) {
        const claimedSet = new Set(epochsToClaim.map(String));
        newClaimable.epochs = newClaimable.epochs.filter(e => !claimedSet.has(String(e)));
        // Recalculate total if we filtered anything (rough approximation or zero it if all filtered)
        if (newClaimable.epochs.length === 0) {
          newClaimable.totalClaimable = '0';
          newClaimable.amounts = [];
        }
      }

      setClaimableData(newClaimable);
      setDashboard(newDashboard);
      setSuccess('Claimed successfully!');
      
    } catch (err) {
      logger.error('Claim failed', err);
      const msg = sanitizeError(err);
      if (msg !== ERROR_MESSAGES.TRANSACTION_REJECTED) {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }, [claimableData, address]);

  // Handle ticket input change
  const handleTicketChange = useCallback((e) => {
    const value = e.target.value.replace(/[^0-9]/g, '');
    setTicketInput(value);
    setError('');
  }, []);

  // Handle Enter key
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !isLoading) {
      handleMine();
    }
  }, [handleMine, isLoading]);

  // Add NARA token to wallet
  const addToWallet = useCallback(async () => {
    if (!window.ethereum) return;
    try {
      await window.ethereum.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: CONFIG.tokenAddress,
            symbol: 'NARA',
            decimals: 18,
          },
        },
      });
    } catch (err) {
      logger.error('Failed to add token', err);
    }
  }, []);

  // Compute display values - show jackpot pools (winnable ETH/NARA)
  // ETH: 30% of mining fees go to jackpot.ethPool
  // NARA: Token transfer fees go to jackpot.naraPool
  const poolETH = dashboard?.jackpotEthPool ? Number(ethers.formatEther(dashboard.jackpotEthPool)) : 0;
  const poolNARA = dashboard?.jackpotNaraPool ? Number(ethers.formatEther(dashboard.jackpotNaraPool)) : 0;
  const totalClaimable = claimableData?.totalClaimable || '0';
  const epochCount = claimableData?.epochs?.length || 0;
  const hasClaimable = claimableData && claimableData.epochs.length > 0;

  return (
    <div className="app">
      {/* Testnet Banner */}
      <div className="testnet-banner">
        BASE SEPOLIA TESTNET
      </div>

      {/* Status Bar */}
      <header className="status-bar">
        {isConnected && (
          <>
            <div className="wallet-connect">
              <ConnectButton accountStatus="address" showBalance={false} />
            </div>
            <a
              href={`https://app.uniswap.org/explore/tokens/base/${CONFIG.tokenAddress}`}
              target="_blank"
              rel="noopener noreferrer"
              className="buy-token-btn"
              title="Buy NARA on Uniswap"
            >
              BUY NARA ↗
            </a>
            <button
              onClick={addToWallet}
              className="add-token-btn"
              title="Add NARA to MetaMask"
            >
              + 🦊 NARA
            </button>
          </>
        )}
      </header>

      {/* Main Content */}
      <main className="main-content">
        {!isConnected ? (
          <div className="connect-prompt">
            <h1>NARA PROTOCOL</h1>
            <p>Connect your wallet to start mining</p>
            <ConnectButton />
            <WalletHelp />
            <TestnetFaucet />
          </div>
        ) : (
          <React.Fragment key={address || 'auth-view'}>
            {activeView === 'mine' ? (
              <div className="mine-view">
                {/* Testnet Faucet (Moved to top) */}
                <TestnetFaucet />

                {/* Epoch Timer Header */}
                <div className="epoch-header">
                  <span className="epoch-label">EPOCH ENDS IN</span>
                  <div className="epoch-timer">{formatTime(timeRemaining)}</div>
                </div>

                {/* Pool Stats - Jackpot pools that users can win */}
                <div className="pool-boxes">
                  <div className="pool-box">
                    <span className="pool-box-label">ETH POOL</span>
                    <div className="pool-box-value">
                      <span>{poolETH < 0.01 ? poolETH.toFixed(6) : poolETH.toFixed(4)}</span>
                    </div>
                  </div>
                  <div className="pool-box">
                    <span className="pool-box-label">NARA POOL</span>
                    <div className="pool-box-value">
                      <span>{poolNARA < 1 ? poolNARA.toFixed(4) : Math.floor(poolNARA).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Ticket Input */}
                <div className="ticket-input-container">
                  <div className="ticket-input-wrapper">
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*"
                      className="ticket-input"
                      value={ticketInput}
                      onChange={handleTicketChange}
                      onKeyDown={handleKeyDown}
                      disabled={isLoading}
                      placeholder="1"
                    />
                    <span className="ticket-label">ticket</span>
                  </div>
                  <div className="eth-conversion">
                    = <span className="eth-amount">{calculateEthCost()}</span> ETH
                  </div>
                  {/* Epoch Capacity Indicator */}
                  {(dashboard?.effectiveCap > 0 || dashboard?.hardCap > 0) && (
                    <div className="epoch-capacity">
                      {(() => {
                        const cap = dashboard.effectiveCap || dashboard.hardCap;
                        const remaining = cap - (dashboard.pendingTickets || 0) - pendingMines;
                        const isPrecise = !!dashboard.effectiveCap;
                        
                        if (remaining > 0) {
                           return <span className="capacity-available">{remaining} tickets remaining{!isPrecise && ' (plus NFT bonuses)'}</span>;
                        } else {
                           return <span className="capacity-full">{isPrecise ? 'Epoch Cap Reached' : 'Base Cap Reached (NFTs may add more)'}</span>;
                        }
                      })()}
                    </div>
                  )}
                </div>

                {/* Bonus Stats Bar - Compact info before action */}
                <BonusDisplay overview={bonusOverview} />

                {/* Status Messages */}
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                {/* Mine Button */}
                <button 
                  className={`action-button mine-btn ${(!dashboard?.userCanMine || (dashboard?.effectiveCap > 0 && (dashboard.effectiveCap - (dashboard.pendingTickets||0) - pendingMines) <= 0)) ? 'disabled' : ''}`}
                  onClick={handleMine}
                  disabled={
                    isLoading || 
                    miningPhase !== '' || 
                    !dashboard?.userCanMine || 
                    (dashboard?.effectiveCap > 0 && (dashboard.effectiveCap - (dashboard.pendingTickets||0) - pendingMines) <= 0)
                  }
                  title={!dashboard?.userCanMine ? 'Requirements not met' : ''}
                >
                  {miningPhase === 'preparing' ? 'PREPARING...' : 
                   miningPhase === 'confirming' ? 'CONFIRM IN WALLET...' :
                   miningPhase === 'waiting' ? 'CONFIRMING...' :
                   isLoading ? 'MINING...' : 'MINE'}
                </button>

                {/* Pending Mines Status Card - show during mining or when pending */}
                {(pendingMines > 0 || miningPhase !== '') && (
                  <div className="pending-mines-card">
                    <div className="pending-mines-header">
                      <span className="pending-dot"></span>
                      <span className="pending-title">
                        {miningPhase === 'preparing' ? 'PREPARING TRANSACTION' :
                         miningPhase === 'confirming' ? 'AWAITING WALLET' :
                         miningPhase === 'waiting' ? 'TRANSACTION PENDING' :
                         'PENDING MINES'}
                      </span>
                    </div>
                    <div className="pending-mines-info">
                      <span className="pending-count">{pendingMines || (miningPhase ? '...' : 0)}</span>
                      <span className="pending-label">
                        {miningPhase === 'preparing' ? 'checking eligibility' :
                         miningPhase === 'confirming' ? 'please confirm' :
                         miningPhase === 'waiting' ? 'confirming on chain' :
                         'waiting for blocks'}
                      </span>
                    </div>
                    {miningPhase === '' && pendingMines > 0 && (
                      <>
                        <p className="pending-help">Click FINALIZE to complete your mining and receive tickets</p>
                        <button 
                          className="action-button finalize-btn"
                          onClick={handleFinalize}
                          disabled={isLoading || isFinalizing}
                        >
                          {(() => {
                            if (isLoading) return 'FINALIZING...';
                            const cap = dashboard?.effectiveCap || dashboard?.hardCap || 1;
                            const used = dashboard?.pendingTickets || 0;
                            const available = Math.max(0, cap - used);
                            const count = Math.min(pendingMines, available);
                            
                            if (count === 0) return `WAIT FOR NEXT EPOCH (${pendingMines} PENDING)`;
                            if (count < pendingMines) return `FINALIZE ${count}/${pendingMines} MINES`;
                            return `FINALIZE ${pendingMines} MINES`;
                          })()}
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Requirements Alert */}
                {!dashboard?.userCanMine && (
                  <div className="requirements-alert">
                    <div className="alert-title">Mining Requirements</div>
                    <ul className="requirements-list">
                      <li className={naraBalance && Number(naraBalance.formatted) >= 0.1 ? 'met' : 'unmet'}>
                        Hold ≥ 0.1 NARA (You have: {naraBalance ? Number(naraBalance.formatted).toFixed(4) : '0.0000'})
                      </li>
                      <li className={dashboard?.userCanMine ? 'met' : 'unmet'}>
                        Hold for 5 minutes after purchase (Testnet)
                      </li>
                    </ul>
                      <a 
                        href={`https://app.uniswap.org/explore/tokens/base/${CONFIG.tokenAddress}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="get-nara-link"
                      >
                        GET NARA
                      </a>
                  </div>
                )}
                
                
              </div>
            ) : (
              <div className="claim-view">
                {/* Claimable Rewards Header */}
                <div className="claim-header">
                  <span className="claim-label">CLAIMABLE REWARDS</span>
                  <div className="claim-amount">{parseFloat(totalClaimable).toFixed(1)}</div>
                  <span className="claim-subtitle">NARA ({epochCount} epochs)</span>
                </div>

                {/* Status Messages */}
                {error && <div className="error-message">{error}</div>}
                {success && <div className="success-message">{success}</div>}

                {/* Claim Button */}
                <button 
                  className="action-button claim-btn"
                  onClick={handleClaim}
                  disabled={isLoading || !hasClaimable}
                >
                  {isLoading ? 'CLAIMING...' : 'CLAIM ALL'}
                </button>

                {/* Connect message */}
                {!hasClaimable && !claimHistory.length && (
                  <div className="wallet-message">
                    No rewards to claim yet
                  </div>
                )}

                {/* Claim History */}
                {claimHistory.length > 0 && (
                  <div className="claim-history">
                    <div className="history-header">
                      <span className="history-title">CLAIM HISTORY</span>
                      <span className="history-total">
                        Total: {claimHistory.reduce((sum, h) => sum + parseFloat(h.amount || 0), 0).toFixed(2)} NARA
                      </span>
                    </div>
                    <div className="history-list">
                      {claimHistory.map((item, i) => (
                        <div key={i} className="history-item">
                          <div className="history-item-left">
                            <span className="history-amount">+{parseFloat(item.amount).toFixed(2)} NARA</span>
                            <span className="history-epochs">{item.epochs?.length || 1} epoch(s)</span>
                          </div>
                          <span className="history-date">
                            {new Date(item.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Jackpot Wins */}
                {jackpotWins.length > 0 && (
                  <div className="jackpot-history">
                    <div className="history-header">
                      <span className="history-title">JACKPOT WINS</span>
                    </div>
                    <div className="history-list">
                      {jackpotWins.map((win, i) => (
                        <div key={i} className="history-item jackpot-win">
                          <div className="history-item-left">
                            <span className="history-amount">+{win.ethAmount} ETH / +{win.naraAmount} NARA</span>
                          </div>
                          <span className="history-date">
                            {new Date(win.timestamp).toLocaleDateString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Navigation */}
            <nav className="bottom-nav">
              <button
                className={`nav-btn ${activeView === 'mine' ? 'active' : ''}`}
                onClick={() => { setActiveView('mine'); setError(''); setSuccess(''); }}
              >
                MINE
              </button>
              <button
                className={`nav-btn ${activeView === 'claim' ? 'active' : ''}`}
                onClick={() => { setActiveView('claim'); setError(''); setSuccess(''); }}
              >
                CLAIM
              </button>
            </nav>
          </React.Fragment>
        )}
      </main>
    </div>
  );
}
