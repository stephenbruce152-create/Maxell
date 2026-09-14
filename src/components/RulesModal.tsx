import React from 'react';
import { motion } from 'motion/react';
import { ShieldCheck, Award, AlertTriangle, Coins, Clock } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 flex flex-col gap-4 max-h-[88vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Casino Ludo Rules & Fair Play</h2>
              <p className="text-[11px] text-slate-400">Match mechanics, scoring & anti-fraud rules</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed">
          {/* Coin & Financial Architecture */}
          <div className="p-3 bg-amber-500/10 rounded-2xl border border-amber-500/30">
            <h3 className="font-bold text-amber-300 mb-1 flex items-center gap-1.5 text-xs">
              <Coins className="w-4 h-4 text-amber-400" />
              1. Coin & Financial System
            </h3>
            <ul className="space-y-1 text-[11px] text-slate-300 pl-2">
              <li>• <strong>Base Exchange:</strong> 100 Coins = $1.00 USD (1 Coin = $0.01).</li>
              <li>• <strong>House Rake:</strong> 15% deducted from total prize pool per match.</li>
              <li>• <strong>Min Cashout:</strong> 1,000 Coins ($10.00 USD).</li>
              <li>• <strong>1x Wagering Turnover:</strong> All deposits must be wagered 100% before withdrawal.</li>
            </ul>
          </div>

          {/* Points Ludo Scoring Table */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-sky-400 mb-1 flex items-center gap-1.5 text-xs">
              <Award className="w-4 h-4 text-sky-400" />
              2. Points Ludo Scoring Engine
            </h3>
            <div className="grid grid-cols-2 gap-2 text-[11px] mt-1.5">
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-emerald-400">+1 Point</span>
                <p className="text-slate-400 text-[10px]">Per square advanced by any coin</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-emerald-400">+50 Points</span>
                <p className="text-slate-400 text-[10px]">For eliminating an opponent's token</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-rose-400">Victim Point Loss</span>
                <p className="text-slate-400 text-[10px]">Captured token loses all earned points!</p>
              </div>
              <div className="p-2 rounded-xl bg-slate-900 border border-slate-800">
                <span className="font-bold text-amber-300">+100 Points</span>
                <p className="text-slate-400 text-[10px]">Bonus for entering Central Home Apex</p>
              </div>
            </div>
          </div>

          {/* Turn Timer & Anti-AFK Rules */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-rose-400 mb-1 flex items-center gap-1.5 text-xs">
              <Clock className="w-4 h-4 text-rose-400" />
              3. Turn Clock & Anti-AFK Engine
            </h3>
            <p className="text-[11px] text-slate-400">
              Each turn has a strict <strong>12-second countdown</strong>. If a player lets the timer expire:
            </p>
            <ul className="space-y-1 text-[11px] text-slate-300 pl-2 mt-1">
              <li>• <strong>Strike 1 & 2:</strong> Warning strike registered; turn automatically passed.</li>
              <li>• <strong>Strike 3:</strong> <strong>Immediate Forfeit!</strong> Table pot is immediately credited to opponent.</li>
            </ul>
          </div>

          {/* Provably Fair CSPRNG */}
          <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800">
            <h3 className="font-bold text-emerald-400 mb-1 text-xs">
              4. Cryptographic CSPRNG Dice
            </h3>
            <p className="text-[11px] text-slate-400">
              Dice rolls are calculated using <code>window.crypto.getRandomValues</code>, guaranteeing
              unbiased, non-deterministic 1..6 outcomes. Rolling three consecutive 6s cancels the 3rd roll
              and transfers the turn.
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition shadow-lg shadow-amber-500/20 cursor-pointer"
        >
          Got it!
        </button>
      </motion.div>
    </div>
  );
};
