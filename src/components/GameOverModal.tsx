import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import confetti from 'canvas-confetti';
import { LudoGameState } from '../types/ludo';
import { COLOR_HEX } from '../utils/ludoCoordinates';
import { soundEngine } from '../utils/audio';
import { coinsToUsdFormatted } from '../utils/financialSystem';
import { Award, DollarSign, ShieldAlert, Trophy } from 'lucide-react';

interface GameOverModalProps {
  gameState: LudoGameState;
  onPlayAgain: () => void;
  onBackToLobby: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  gameState,
  onPlayAgain,
  onBackToLobby,
}) => {
  const winnerColor = gameState.winnerRanking[0] || 'red';
  const winnerPlayer = gameState.players.find((p) => p.color === winnerColor);
  const hex = COLOR_HEX[winnerColor];
  const tierConfig = gameState.tierConfig;

  // Sort players by total points for leaderboard
  const sortedByPoints = [...gameState.players].sort((a, b) => (b.score || 0) - (a.score || 0));

  useEffect(() => {
    soundEngine.playVictory();

    const duration = 3.5 * 1000;
    const end = Date.now() + duration;

    const interval: any = setInterval(() => {
      if (Date.now() > end) {
        return clearInterval(interval);
      }
      confetti({
        startVelocity: 30,
        spread: 360,
        ticks: 60,
        origin: { x: Math.random(), y: Math.random() * 0.4 },
        colors: ['#ef4444', '#10b981', '#eab308', '#3b82f6', '#fbbf24', '#38bdf8'],
      });
    }, 250);

    return () => clearInterval(interval);
  }, [winnerColor]);

  // Winning Reason Description
  const getWinningReasonText = () => {
    if (gameState.gameOverReason === 'afk_forfeit') {
      const forfeited = gameState.players.find((p) => p.color === gameState.forfeitedPlayerColor);
      return `Opponent ${forfeited?.name || 'Player'} exceeded 3 AFK turn strikes and forfeited the table!`;
    }
    if (gameState.gameOverReason === 'timer_expired') {
      return `5-Minute Match Timer expired! ${winnerPlayer?.name} finished with the highest score (${winnerPlayer?.score} pts)!`;
    }
    if (gameState.gameOverReason === 'target_reached') {
      return `First to navigate ${gameState.targetTokensToWin || 2} tokens into Home apex!`;
    }
    return `All 4 tokens reached the Home apex with highest tactical precision!`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl text-slate-100 flex flex-col items-center text-center gap-4"
      >
        {/* Crown & Victory Badge */}
        <div className="relative">
          <motion.div
            animate={{ rotate: [0, 10, -10, 0], scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-16 h-16 sm:w-18 sm:h-18 rounded-3xl flex items-center justify-center text-4xl shadow-2xl"
            style={{
              backgroundColor: hex.primary,
              boxShadow: `0 0 40px ${hex.primary}88`,
            }}
          >
            👑
          </motion.div>
        </div>

        <div>
          <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
            {tierConfig.name} Completed
          </span>
          <h2 className="text-xl sm:text-2xl font-black text-white mt-0.5">
            {winnerPlayer?.name || 'Player'} Takes the Match!
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-md mx-auto leading-relaxed">
            {getWinningReasonText()}
          </p>
        </div>

        {/* Casino Pot & Payout Summary Card */}
        <div className="w-full bg-gradient-to-r from-amber-500/15 via-slate-950/80 to-amber-500/15 border border-amber-500/30 rounded-2xl p-3.5 flex items-center justify-between">
          <div className="text-left">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total Pot</span>
            <div className="text-xs font-mono font-bold text-slate-200">
              🪙 {tierConfig.potCoins.toLocaleString()} ({coinsToUsdFormatted(tierConfig.potCoins)})
            </div>
            <span className="text-[9px] text-rose-400/90 font-medium">
              15% Rake: -🪙{tierConfig.rakeCoins}
            </span>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-emerald-400 flex items-center justify-end gap-1">
              <Trophy className="w-3 h-3" />
              Winner Payout Credited
            </span>
            <div className="text-lg sm:text-xl font-black text-amber-300 font-mono">
              🪙 {tierConfig.payoutCoins.toLocaleString()}
            </div>
            <span className="text-[11px] font-bold text-emerald-400">
              {coinsToUsdFormatted(tierConfig.payoutCoins)} USD
            </span>
          </div>
        </div>

        {/* Complete Points & Leaderboard Table */}
        <div className="w-full p-3 sm:p-4 bg-slate-950/80 border border-slate-800/90 rounded-2xl flex flex-col gap-2">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">
            <span>Player & Rank</span>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline">Breakdown (Move/Cap/Home/Loss)</span>
              <span>Final Points</span>
            </div>
          </div>

          {sortedByPoints.map((p, idx) => {
            const phex = COLOR_HEX[p.color];
            const bd = p.scoreBreakdown || {
              movementPoints: 0,
              capturePoints: 0,
              homePoints: 0,
              sixBonusPoints: 0,
              penaltyPoints: 0,
              totalScore: p.score || 0,
            };

            return (
              <div
                key={p.color}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs transition ${
                  p.color === winnerColor
                    ? 'bg-amber-950/30 border-amber-500/40'
                    : 'bg-slate-900 border-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-black text-amber-400 w-4 text-center shrink-0">
                    #{idx + 1}
                  </span>
                  <span
                    className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: phex.primary }}
                  />
                  <div className="flex flex-col text-left min-w-0">
                    <span className="font-bold text-white leading-tight truncate">
                      {p.name}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {p.isForfeited
                        ? '⛔ Forfeited'
                        : `${p.tokensHome || p.tokens.filter((t) => t.step === 56).length}/${gameState.targetTokensToWin || 2} Home`}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="hidden sm:flex items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                    <span title="Movement Points">+{bd.movementPoints}</span>
                    <span title="Capture (+50 each)">⚔️+{bd.capturePoints}</span>
                    <span title="Home (+100 each)">🏠+{bd.homePoints}</span>
                    {bd.penaltyPoints > 0 && (
                      <span className="text-rose-400" title="Lost when eliminated">
                        -{bd.penaltyPoints}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 font-black text-sm text-amber-300">
                    <span>⭐</span>
                    <span>{p.score || 0}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="w-full flex gap-2.5">
          <button
            onClick={onPlayAgain}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-sm transition shadow-lg shadow-amber-500/20 cursor-pointer"
          >
            Play Next Match ({tierConfig.name})
          </button>
          <button
            onClick={onBackToLobby}
            className="px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-sm transition cursor-pointer"
          >
            Lobby
          </button>
        </div>
      </motion.div>
    </div>
  );
};
