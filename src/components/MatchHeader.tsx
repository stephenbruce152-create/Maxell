import React from 'react';
import { Volume2, VolumeX, ShieldCheck, Wallet, RotateCcw, Award } from 'lucide-react';
import { MatchTierConfig, GameMode, WalletState } from '../types/ludo';
import { coinsToUsdFormatted } from '../utils/financialSystem';

interface MatchHeaderProps {
  gameMode: GameMode;
  tierConfig: MatchTierConfig;
  wallet: WalletState;
  matchTimeRemaining: number;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onOpenWallet: () => void;
  onOpenRules: () => void;
  onResetMatch: () => void;
}

export const MatchHeader: React.FC<MatchHeaderProps> = ({
  gameMode,
  tierConfig,
  wallet,
  matchTimeRemaining,
  soundEnabled,
  onToggleSound,
  onOpenWallet,
  onOpenRules,
  onResetMatch,
}) => {
  const minutes = Math.floor(matchTimeRemaining / 60);
  const seconds = matchTimeRemaining % 60;
  const timeFormatted = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  const isTimeLow = matchTimeRemaining <= 60 && matchTimeRemaining > 0;

  return (
    <header className="w-full bg-slate-950/80 backdrop-blur-md border-b border-slate-800/80 px-2 sm:px-4 py-2 flex items-center justify-between gap-2 z-30 shrink-0">
      {/* Table Tier Badge & Mode */}
      <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
        <button
          onClick={onOpenWallet}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700/70 transition-all text-left group"
        >
          <div className={`w-2 h-2 rounded-full bg-gradient-to-r ${tierConfig.badgeColor}`} />
          <div className="flex flex-col">
            <span className="text-[11px] font-black text-white group-hover:text-amber-300 leading-tight">
              {tierConfig.name}
            </span>
            <span className="text-[9px] text-slate-400 font-semibold leading-tight">
              Pot: 🪙 {tierConfig.potCoins.toLocaleString()} ({tierConfig.payoutUsd ? `$${(tierConfig.potCoins / 100).toFixed(2)}` : '$0'})
            </span>
          </div>
        </button>

        <span className="hidden md:inline-flex text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-300 border border-amber-500/30">
          {gameMode === 'points_timer' ? '⚡ Points (5m)' : gameMode === 'quick_target' ? '🎯 Quick Ludo' : 'Classic'}
        </span>
      </div>

      {/* Center: Match Countdown Clock */}
      <div
        className={`flex items-center gap-1.5 px-3 py-1 rounded-xl border transition-all ${
          isTimeLow
            ? 'bg-rose-950/70 border-rose-500 text-rose-300 animate-pulse ring-2 ring-rose-500/40'
            : 'bg-slate-900/90 border-slate-800 text-amber-300'
        }`}
      >
        <span className="text-xs">⏱️</span>
        <span className="text-xs sm:text-sm font-black tracking-wider font-mono">
          {timeFormatted}
        </span>
        <span className="text-[9px] uppercase font-bold text-slate-400 hidden sm:inline">Left</span>
      </div>

      {/* Right: Wallet Balance & Quick Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Wallet Balance Pill */}
        <button
          onClick={onOpenWallet}
          id="btn-wallet-header"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 transition-all group"
          title="Open Casino Wallet & Stakes"
        >
          <Wallet className="w-3.5 h-3.5 text-amber-400 group-hover:scale-110 transition-transform" />
          <div className="flex flex-col text-right">
            <span className="text-[11px] font-black leading-tight text-white group-hover:text-amber-300">
              🪙 {wallet.coins.toLocaleString()}
            </span>
            <span className="text-[9px] text-amber-400/90 font-bold leading-tight">
              {coinsToUsdFormatted(wallet.coins)}
            </span>
          </div>
        </button>

        {/* Sound Toggle */}
        <button
          onClick={onToggleSound}
          id="btn-sound-toggle"
          className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-center transition-colors"
          title={soundEnabled ? 'Mute Audio' : 'Unmute Audio'}
        >
          {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5 text-rose-400" />}
        </button>

        {/* Provably Fair / Rules */}
        <button
          onClick={onOpenRules}
          id="btn-rules-header"
          className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-center transition-colors"
          title="Rules & Fair Play"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        </button>

        {/* New Match / Reset */}
        <button
          onClick={onResetMatch}
          id="btn-reset-header"
          className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-center transition-colors"
          title="Restart Match"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
