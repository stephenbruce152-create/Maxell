import React from 'react';
import { motion } from 'motion/react';
import { Player, PlayerColor } from '../types/ludo';
import { COLOR_HEX } from '../utils/ludoCoordinates';

interface PlayerCardsHUDProps {
  players: Player[];
  activeColorIndex: number;
  localPlayerColor?: PlayerColor;
}

export const PlayerCardsHUD: React.FC<PlayerCardsHUDProps> = ({
  players,
  activeColorIndex,
  localPlayerColor,
}) => {
  const getPositionClass = (color: PlayerColor) => {
    switch (color) {
      case 'red':
        return 'top-3 left-3';
      case 'green':
        return 'top-3 right-3';
      case 'yellow':
        return 'bottom-3 right-3';
      case 'blue':
        return 'bottom-3 left-3';
    }
  };

  // Find current point leader
  const highestScore = Math.max(...players.map((p) => p.score || 0));

  return (
    <>
      {players.map((player, idx) => {
        const isActive = idx === activeColorIndex;
        const hex = COLOR_HEX[player.color];
        const isLocal = localPlayerColor === player.color;
        const posClass = getPositionClass(player.color);
        const isLeader = player.score > 0 && player.score === highestScore;

        const inHome = player.tokens.filter((t) => t.step === 56).length;

        return (
          <motion.div
            key={player.color}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`absolute ${posClass} z-20 pointer-events-auto`}
          >
            <div
              className={`relative flex items-center gap-2 sm:gap-3 p-1.5 sm:px-3 sm:py-2 rounded-2xl transition-all duration-300 backdrop-blur-md border ${
                isActive
                  ? 'bg-slate-900/95 shadow-xl ring-2'
                  : 'bg-slate-900/80 hover:opacity-100 shadow-md'
              }`}
              style={{
                borderColor: isActive ? hex.primary : '#1e293b',
                boxShadow: isActive ? `0 0 18px ${hex.primary}44` : 'none',
              }}
            >
              {/* Active kinetic dot pulse halo */}
              {isActive && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
                  className="absolute -inset-1 rounded-2xl border-2 border-dashed pointer-events-none opacity-60"
                  style={{ borderColor: hex.glow }}
                />
              )}

              {/* Color Avatar Orb */}
              <div
                className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-black text-xs sm:text-sm shadow-md shrink-0"
                style={{
                  backgroundColor: hex.primary,
                  boxShadow: `0 0 12px ${hex.primary}66`,
                }}
              >
                <span className="text-white uppercase drop-shadow">
                  {player.color.charAt(0)}
                </span>
                {/* Ranking badge if finished */}
                {player.rank && (
                  <span className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-950 text-[9px] font-black rounded-full px-1 py-0.2 shadow">
                    #{player.rank}
                  </span>
                )}
                {/* Leader crown */}
                {isLeader && !player.rank && (
                  <span
                    title="Points Leader"
                    className="absolute -top-2 -left-1 text-[11px] select-none filter drop-shadow animate-bounce"
                  >
                    👑
                  </span>
                )}
              </div>

              {/* Mini Stats on Mobile: Keeps central board 100% visible */}
              <div className="flex flex-col sm:hidden text-left pr-1">
                <span className="text-[10px] font-bold text-slate-200 truncate max-w-[60px]">
                  {player.name.split(' ')[0]}
                </span>
                <span className="text-[9px] font-black text-emerald-400">
                  🏠 {inHome}/4
                </span>
              </div>

              {/* Full Player Info & Points (Desktop) */}
              <div className="hidden sm:flex flex-col min-w-[105px]">
                <div className="flex items-center justify-between gap-1.5">
                  <span className="text-xs font-bold text-slate-100 truncate max-w-[85px]">
                    {player.name}
                  </span>
                  {isLocal && (
                    <span className="text-[9px] bg-sky-500/25 text-sky-300 font-bold px-1 py-0.2 rounded border border-sky-400/30">
                      YOU
                    </span>
                  )}
                </div>

                {/* Real Ludo Main Metric: Home Progress & Captures */}
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-black text-emerald-400 flex items-center gap-0.5">
                    <span>🏠</span>
                    <span>{inHome}/4 Home</span>
                  </span>
                  {player.captures > 0 && (
                    <span className="text-[10px] text-red-400 font-bold" title={`${player.captures} Captures`}>
                      ⚔️{player.captures}
                    </span>
                  )}
                  <span className="text-[10px] text-amber-200/60 font-normal ml-auto">
                    {player.score || 0} pts
                  </span>
                </div>

                {/* 4 Coin Progress Dots */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  {player.tokens.map((tok) => {
                    const isFinished = tok.step === 56;
                    const isYard = tok.step === -1;
                    const isRunway = tok.step >= 51 && tok.step <= 55;

                    return (
                      <div
                        key={tok.id}
                        title={`Coin ${tok.id + 1}: ${
                          isFinished
                            ? 'Home'
                            : isYard
                            ? 'In Yard'
                            : isRunway
                            ? `Runway (${tok.step - 50}/5)`
                            : `Track Step ${tok.step}`
                        }`}
                        className={`w-2 h-2 rounded-full transition-all ${
                          isFinished
                            ? 'bg-amber-400 shadow-[0_0_6px_#fbbf24] ring-1 ring-amber-300'
                            : isRunway
                            ? 'bg-white shadow-[0_0_6px_#ffffff]'
                            : !isYard
                            ? 'shadow-[0_0_4px]'
                            : 'bg-slate-700 opacity-40'
                        }`}
                        style={{
                          backgroundColor: isFinished
                            ? '#fbbf24'
                            : isRunway
                            ? '#ffffff'
                            : !isYard
                            ? hex.glow
                            : undefined,
                        }}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        );
      })}
    </>
  );
};
