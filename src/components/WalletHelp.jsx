/**
 * WalletHelp Component
 * 
 * Shows helpful guidance for mobile users who may encounter
 * wallet connection issues with certain wallets on testnets.
 */
import React, { useState } from 'react';

export default function WalletHelp() {
  const [isOpen, setIsOpen] = useState(false);
  
  return (
    <div className="wallet-help">
      <button 
        className="wallet-help-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? 'Hide wallet tips ▲' : 'Having trouble connecting? ▼'}
      </button>
      
      {isOpen && (
        <div className="wallet-help-content">
          <h4>Best Wallets for Base Sepolia Testnet</h4>
          
          <div className="wallet-recommendation">
            <div className="wallet-item recommended">
              <span className="wallet-name">Coinbase Wallet</span>
              <span className="wallet-status">✓ Best for Base</span>
            </div>
            <p className="wallet-note">
              Made by the same team as Base. Works perfectly on mobile.
            </p>
          </div>
          
          <div className="wallet-recommendation">
            <div className="wallet-item recommended">
              <span className="wallet-name">MetaMask</span>
              <span className="wallet-status">✓ Great testnet support</span>
            </div>
            <p className="wallet-note">
              Works on all networks including testnets.
            </p>
          </div>
          
          <div className="wallet-recommendation">
            <div className="wallet-item caution">
              <span className="wallet-name">Rainbow / Trust / Others</span>
              <span className="wallet-status">⚠ May have issues</span>
            </div>
            <p className="wallet-note">
              Some wallets don't fully support Base Sepolia testnet yet.
              If connection fails, try Coinbase Wallet or MetaMask instead.
            </p>
          </div>
          
          <div className="wallet-download-links">
            <a 
              href="https://www.coinbase.com/wallet" 
              target="_blank" 
              rel="noopener noreferrer"
              className="download-link coinbase"
            >
              Get Coinbase Wallet
            </a>
            <a 
              href="https://metamask.io/download/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="download-link metamask"
            >
              Get MetaMask
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
