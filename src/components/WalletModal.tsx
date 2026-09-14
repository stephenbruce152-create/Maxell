import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Wallet, ShieldCheck, ArrowUpRight, DollarSign, Award, AlertCircle, CheckCircle2 } from 'lucide-react';
import { MatchTierId, GameMode, WalletState } from '../types/ludo';
import {
  MATCH_TIERS,
  coinsToUsdFormatted,
  validateCashoutEligibility,
} from '../utils/financialSystem';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallet: WalletState;
  selectedTier: MatchTierId;
  selectedMode: GameMode;
  onSelectTierAndMode: (tier: MatchTierId, mode: GameMode) => void;
  onDepositCoins: (coins: number) => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  wallet,
  selectedTier,
  selectedMode,
  onSelectTierAndMode,
  onDepositCoins,
}) => {
  const [activeTab, setActiveTab] = useState<'tiers' | 'cashout' | 'fairness'>('tiers');
  const [cashoutNotice, setCashoutNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  const cashoutValidation = validateCashoutEligibility(wallet);

  const handleCashoutSubmit = () => {
    if (cashoutValidation.eligible) {
      setCashoutNotice(
        `✅ Cashout request of ${wallet.coins.toLocaleString()} Coins (${coinsToUsdFormatted(
          wallet.coins
        )}) submitted! In live production, payouts are transferred directly to verified bank/crypto accounts within 10 minutes.`
      );
    } else {
      setCashoutNotice(`⚠️ ${cashoutValidation.reason}`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Casino Coin & Match System</h2>
              <p className="text-xs text-slate-400">100 Coins = $1.00 USD • 15% House Commission</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Balance Card */}
        <div className="p-4 sm:p-5 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 border-b border-slate-800/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">
                Available Wallet Balance
              </span>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl sm:text-3xl font-black text-amber-300">
                  🪙 {wallet.coins.toLocaleString()}
                </span>
                <span className="text-sm font-bold text-emerald-400">
                  ({coinsToUsdFormatted(wallet.coins)})
                </span>
              </div>
            </div>

            {/* Quick Demo Deposit Button */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => onDepositCoins(1000)}
                className="px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold transition-all"
              >
                + 1,000 Coins ($10)
              </button>
              <button
                onClick={() => onDepositCoins(5000)}
                className="px-3 py-1.5 rounded-xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/40 text-amber-300 text-xs font-bold transition-all"
              >
                + 5,000 Coins ($50)
              </button>
            </div>
          </div>

          {/* 1x Turnover Wagering Requirement Bar */}
          <div className="mt-3 pt-3 border-t border-slate-800/70 flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">1x Turnover Requirement (Anti-Money Laundering):</span>
              <span className="font-mono font-bold text-slate-200">
                Wagered 🪙 {wallet.totalWagered.toLocaleString()} / {wallet.totalDeposited.toLocaleString()} (
                {cashoutValidation.turnoverPercent}%)
              </span>
            </div>
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  cashoutValidation.turnoverPercent >= 100 ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
                style={{ width: `${cashoutValidation.turnoverPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-4 bg-slate-950/40">
          <button
            onClick={() => setActiveTab('tiers')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'tiers'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Match Tiers & Modes
          </button>
          <button
            onClick={() => setActiveTab('cashout')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'cashout'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Withdraw / Cashout
          </button>
          <button
            onClick={() => setActiveTab('fairness')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-all ${
              activeTab === 'fairness'
                ? 'border-amber-400 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Fair Play & CSPRNG
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {activeTab === 'tiers' && (
            <>
              {/* Game Mode Selector */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Game Mode Preset
                </span>
                <div className="grid grid-cols-2 gap-2 mt-1.5">
                  <button
                    onClick={() => onSelectTierAndMode(selectedTier, 'points_timer')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      selectedMode === 'points_timer'
                        ? 'bg-amber-500/15 border-amber-400 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-black text-xs text-amber-300 flex items-center gap-1">
                      ⚡ Points Ludo (5-Min Timer)
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Fast 5m casino clock. 1 pt/move, +50 on capture (victim loses coin points), +100 home!
                    </p>
                  </button>

                  <button
                    onClick={() => onSelectTierAndMode(selectedTier, 'quick_target')}
                    className={`p-3 rounded-2xl border text-left transition-all ${
                      selectedMode === 'quick_target'
                        ? 'bg-amber-500/15 border-amber-400 text-white shadow-md'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-black text-xs text-emerald-400 flex items-center gap-1">
                      🎯 Quick Ludo (First to 2 Home)
                    </div>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Instant unlocked start. First player to navigate 2 tokens into Home apex takes the pot!
                    </p>
                  </button>
                </div>
              </div>

              {/* Match Tiers Table */}
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Select Table Stake Tier (2-Player Head-to-Head)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-2">
                  {(Object.keys(MATCH_TIERS) as MatchTierId[]).map((tId) => {
                    const tier = MATCH_TIERS[tId];
                    const isSelected = selectedTier === tId;
                    const canAfford = wallet.coins >= tier.entryFeeCoins;

                    return (
                      <div
                        key={tId}
                        onClick={() => {
                          if (canAfford) {
                            onSelectTierAndMode(tId, selectedMode);
                          }
                        }}
                        className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800 border-amber-400 ring-2 ring-amber-400/40 shadow-lg'
                            : canAfford
                            ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                            : 'bg-slate-950/40 border-slate-900 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-black text-sm text-white flex items-center gap-1.5">
                            <span className={`w-2.5 h-2.5 rounded-full bg-gradient-to-r ${tier.badgeColor}`} />
                            {tier.name}
                          </span>
                          <span className="text-xs font-mono font-bold text-amber-300">
                            Entry: 🪙 {tier.entryFeeCoins} (${tier.entryFeeUsd.toFixed(2)})
                          </span>
                        </div>

                        <div className="mt-2 text-[11px] grid grid-cols-2 gap-1 text-slate-400 border-t border-slate-800/80 pt-2">
                          <div>
                            Pot: <span className="font-bold text-slate-200">🪙 {tier.potCoins}</span>
                          </div>
                          <div>
                            Rake (15%): <span className="font-bold text-rose-400">🪙 {tier.rakeCoins}</span>
                          </div>
                          <div className="col-span-2 text-emerald-400 font-bold">
                            Winner Takes: 🪙 {tier.payoutCoins} (${tier.payoutUsd.toFixed(2)} USD)
                          </div>
                        </div>

                        {isSelected && (
                          <div className="mt-2.5 text-center py-1 rounded-xl bg-amber-400 text-slate-950 font-black text-xs">
                            Active Match Tier
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {activeTab === 'cashout' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
                <div className="font-bold text-white text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Instant Cashout Regulations
                </div>
                <p>
                  • <strong>Base Conversion:</strong> 100 Coins = $1.00 USD (1 Coin = $0.01).
                </p>
                <p>
                  • <strong>Minimum Cashout:</strong> 1,000 Coins ($10.00 USD minimum).
                </p>
                <p>
                  • <strong>1x Turnover Enforcement:</strong> In accordance with Anti-Money Laundering
                  (AML) compliance, all deposited coins must be wagered at least once before requesting a withdrawal.
                </p>
              </div>

              {cashoutNotice && (
                <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs leading-relaxed">
                  {cashoutNotice}
                </div>
              )}

              <button
                onClick={handleCashoutSubmit}
                disabled={!cashoutValidation.eligible}
                className={`w-full py-3 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                  cashoutValidation.eligible
                    ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
                Request Cashout ({coinsToUsdFormatted(wallet.coins)})
              </button>
            </div>
          )}

          {activeTab === 'fairness' && (
            <div className="space-y-3 text-xs text-slate-300">
              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  Cryptographic CSPRNG Dice
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Dice rolls are generated using hardware-level Cryptographically Secure Pseudo-Random Number
                  Generators (<code>window.crypto.getRandomValues</code>) with unbiased modulo reduction to
                  guarantee zero client manipulation or pattern predictability.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-400" />
                  Anti-AFK & Turn Timer Rules
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Players are given a strict 12-second turn timer. Failing to make a move within 12 seconds
                  awards an AFK Strike. If a player accumulates <strong>3 AFK strikes</strong>, they immediately
                  forfeit the match and the prize pool is awarded to the opponent.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-blue-400" />
                  Points Ludo Scoring Table
                </div>
                <ul className="text-slate-400 space-y-1 pl-3 list-disc">
                  <li>Advance Token: <strong>+1 point per square</strong></li>
                  <li>Eliminate Opponent: <strong>+50 points</strong> + opponent loses that token's points!</li>
                  <li>Reach Home Apex: <strong>+100 bonus points</strong></li>
                  <li>Roll a 6: <strong>+6 bonus points & extra turn</strong> (Triple 6 cancels 3rd roll)</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
