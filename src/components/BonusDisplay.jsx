import React from 'react';
import './BonusDisplay.css';

export default function BonusDisplay({ overview }) {
  if (!overview) return null;

  const formatBps = (bps) => `${(Number(bps) / 100).toFixed(1)}%`;
  const formatMult = (bps) => `${(Number(bps) / 10000).toFixed(2)}x`;

  return (
    <div className="bonus-bar">
      <div className="bonus-stat">
        <span className="stat-label">Power</span>
        <span className="stat-value">{formatMult(overview.multipliers.totalEffectiveBps)}</span>
      </div>
      <div className="bonus-stat">
        <span className="stat-label">Streak</span>
        <span className="stat-value">{Number(overview.streak.daysCount)}d</span>
      </div>
      <div className="bonus-stat">
        <span className="stat-label">Holding</span>
        <span className="stat-value">+{formatBps(overview.multipliers.holdingBonusBps)}</span>
      </div>
      <div className="bonus-stat">
        <span className="stat-label">Jackpot</span>
        <span className="stat-value">{formatBps(overview.jackpot.userChanceBps)}</span>
      </div>
      {Number(overview.cap.capBonus) > 0 && (
        <div className="bonus-stat cap-bonus">
          <span className="stat-label">Cap+</span>
          <span className="stat-value">+{Number(overview.cap.capBonus)}</span>
        </div>
      )}
    </div>
  );
}
