import React from 'react';
import { motion } from 'motion/react';
import { Player, PlayerColor, GamePhase } from '../types/ludo';
import { COLOR_HEX } from '../utils/ludoCoordinates';
import { AlertTriangle, Clock } from 'lucide-react';

interface MatchupScoreboardProps {
  players: Player[];
  activeColorIndex: number;
  phase: GamePhase;
  turnTimeRemaining: number;
  turnDuration: number;
  localPlayerColor?: PlayerColor;
  targetTokensToWin?: number;
}

export const MatchupScoreboard: React.FC<MatchupScoreboardProps> = ({
  players,
  activeColorIndex,
  phase,
  turnTimeRemaining,
  turnDuration,
  localPlayerColor = 'red',
  targetTokensToWin = 2,
}) => {
  const isTurnTimerCritical = turnTimeRemaining <= 3;
  const timerPercent = Math.max(0, Math.min(100, (turnTimeRemaining / turnDuration) * 100));

  return (
    <div className="w-full max-w-2xl mx-auto px-2 pt-2 z-20 pointer-events-none">
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-1.5 sm:p-2 shadow-xl flex items-center justify-between gap-1 sm:gap-2">
        {players.map((player, idx) => {
          const isActive = idx === activeColorIndex;
          const hex = COLOR_HEX[player.color];
          const isLocal = player.color === localPlayerColor;
          const homeTokens = player.tokensHome || player.tokens.filter((t) => t.step === 56).length;

          return (
            <div
              key={player.color}
              className={`flex-1 relative rounded-xl p-1.5 sm:p-2 transition-all duration-200 border ${
                isActive
                  ? 'bg-slate-800/95 border-amber-400/80 shadow-md ring-1 ring-amber-400/40'
                  : 'bg-slate-950/60 border-slate-800/80 opacity-85'
              }`}
            >
              {/* Turn Countdown Bar under active player */}
              {isActive && phase !== 'game_over' && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-slate-800 rounded-t-xl overflow-hidden">
                  <div
                    className={`h-full transition-all duration-1000 linear ${
                      isTurnTimerCritical ? 'bg-rose-500 animate-pulse' : 'bg-amber-400'
                    }`}
                    style={{ width: `${timerPercent}%` }}
                  />
                </div>
              )}

              <div className="flex items-center justify-between gap-1">
                {/* Avatar & Name */}
                <div className="flex items-center gap-1.5 min-w-0">
                  <div
                    className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg flex items-center justify-center font-black text-[11px] text-white shrink-0 shadow"
                    style={{ backgroundColor: hex.primary }}
                  >
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-[11px] sm:text-xs font-black text-white truncate flex items-center gap-1">
                      {player.name}
                      {isLocal && (
                        <span className="text-[8px] bg-slate-700 text-slate-300 px-1 rounded font-normal">
                          YOU
                        </span>
                      )}
                    </span>
                    {/* AFK Strikes indicator */}
                    <div className="flex items-center gap-0.5" title={`${player.afkStrikes || 0} AFK Strikes`}>
                      <span className="text-[8px] text-slate-400">AFK:</span>
                      {[0, 1, 2].map((strikeIdx) => {
                        const hasStrike = (player.afkStrikes || 0) > strikeIdx;
                        return (
                          <span
                            key={strikeIdx}
                            className={`w-1.5 h-1.5 rounded-full ${
                              hasStrike ? 'bg-rose-500' : 'bg-slate-700'
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Score & Turn Clock / Target */}
                <div className="flex flex-col items-end shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] sm:text-xs font-black text-amber-300">
                      ⭐ {player.score || 0}
                    </span>
                    <span className="text-[9px] text-slate-400 hidden sm:inline">pts</span>
                  </div>

                  {isActive && phase !== 'game_over' ? (
                    <span
                      className={`text-[9px] font-mono font-black flex items-center gap-0.5 ${
                        isTurnTimerCritical ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                      }`}
                    >
                      <Clock className="w-2.5 h-2.5" />
                      {turnTimeRemaining}s
                    </span>
                  ) : (
                    <span className="text-[9px] text-emerald-400 font-bold">
                      🏠 {homeTokens}/{targetTokensToWin}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
