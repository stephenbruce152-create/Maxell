import React from 'react';
import { motion } from 'motion/react';
import { DiceState, PlayerColor } from '../types/ludo';
import { COLOR_HEX } from '../utils/ludoCoordinates';
import { soundEngine } from '../utils/audio';

interface DiceRollerProps {
  dice: DiceState;
  activeColor: PlayerColor;
  activePlayerName: string;
  isLocalTurn: boolean;
  canRoll: boolean;
  onRoll: () => void;
  validTokenCount: number;
  validTokenIds?: number[];
  onSelectToken?: (tokenId: number) => void;
}

export const DiceRoller: React.FC<DiceRollerProps> = ({
  dice,
  activeColor,
  activePlayerName,
  isLocalTurn,
  canRoll,
  onRoll,
  validTokenCount,
  validTokenIds = [],
  onSelectToken,
}) => {
  const hex = COLOR_HEX[activeColor];

  const handleRollClick = () => {
    if (!canRoll || !isLocalTurn) return;
    soundEngine.playClick();
    soundEngine.playDiceRoll();
    onRoll();
  };

  // Render 1 to 6 circular dots on dice surface
  const renderDiceFaceDots = (val: number) => {
    const dotPositions: Record<number, number[][]> = {
      1: [[50, 50]],
      2: [[26, 26], [74, 74]],
      3: [[26, 26], [50, 50], [74, 74]],
      4: [[26, 26], [74, 26], [26, 74], [74, 74]],
      5: [[26, 26], [74, 26], [50, 50], [26, 74], [74, 74]],
      6: [[26, 22], [74, 22], [26, 50], [74, 50], [26, 78], [74, 78]],
    };

    const positions = dotPositions[val] || dotPositions[1];

    return (
      <div
        className="relative w-16 h-16 bg-slate-900 border-2 rounded-2xl shadow-2xl overflow-hidden transition-all duration-200"
        style={{
          borderColor: hex.primary,
          boxShadow: `0 0 26px ${hex.primary}55, inset 0 0 12px ${hex.primary}22`,
        }}
      >
        {positions.map(([x, y], idx) => (
          <motion.div
            key={idx}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 450, damping: 22 }}
            className="absolute w-3.5 h-3.5 -ml-1.5 -mt-1.5 rounded-full"
            style={{
              left: `${x}%`,
              top: `${y}%`,
              backgroundColor: hex.glow,
              boxShadow: `0 0 8px ${hex.glow}`,
            }}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col items-center gap-2">
      {/* Active turn badge */}
      <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/85 border border-slate-700/70 backdrop-blur-md shadow-lg">
        <span
          className="w-2.5 h-2.5 rounded-full animate-pulse"
          style={{ backgroundColor: hex.primary, boxShadow: `0 0 10px ${hex.primary}` }}
        />
        <span className="text-xs font-semibold text-slate-100 tracking-wide">
          {activePlayerName}'s Turn
        </span>
        {dice.value === 6 && (
          <span className="text-xs font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-600/40 animate-bounce">
            +6 Bonus Pts!
          </span>
        )}
        {dice.consecutiveSixes > 1 && (
          <span className="text-xs font-bold text-orange-400">
            {dice.consecutiveSixes}x Consecutive 6!
          </span>
        )}
      </div>

      {/* Main Dice Controller Card */}
      <div className="flex items-center gap-4 p-3 bg-slate-900/90 border border-slate-800/90 rounded-3xl shadow-2xl backdrop-blur-xl">
        {/* Kinetic 3D Tumbling Visual */}
        <motion.div
          animate={
            dice.isRolling
              ? {
                  rotateX: [0, 180, 360, 540],
                  rotateY: [0, 90, 270, 360],
                  scale: [1, 1.2, 0.9, 1.1, 1],
                  y: [-2, -18, 4, -8, 0],
                }
              : { scale: 1, rotateX: 0, rotateY: 0, y: 0 }
          }
          transition={{
            duration: dice.isRolling ? 0.7 : 0.2,
            ease: 'easeInOut',
          }}
          className={`cursor-pointer transition-transform ${
            canRoll && isLocalTurn ? 'hover:scale-105 active:scale-95' : ''
          }`}
          onClick={canRoll ? handleRollClick : undefined}
          title={canRoll && isLocalTurn ? 'Click to roll 3D dice' : undefined}
        >
          {renderDiceFaceDots(dice.value)}
        </motion.div>

        {/* Action Button & Context */}
        <div className="flex flex-col justify-center gap-1 min-w-[140px]">
          {canRoll ? (
            <motion.button
              whileHover={isLocalTurn ? { scale: 1.04 } : {}}
              whileTap={isLocalTurn ? { scale: 0.96 } : {}}
              onClick={handleRollClick}
              disabled={!isLocalTurn}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center justify-center gap-2 ${
                isLocalTurn
                  ? 'text-white cursor-pointer'
                  : 'bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
              style={
                isLocalTurn
                  ? {
                      backgroundColor: hex.primary,
                      boxShadow: `0 4px 20px ${hex.primary}66`,
                    }
                  : {}
              }
            >
              <svg className="w-4 h-4 animate-spin-slow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {isLocalTurn ? 'Roll Dice' : 'Waiting...'}
            </motion.button>
          ) : (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-slate-400 font-medium">
                  Rolled <strong className="text-white text-sm">+{dice.value}</strong>
                </span>
                {validTokenCount > 0 && (
                  <span className="text-[11px] font-bold text-emerald-400">
                    {validTokenCount} movable {validTokenCount === 1 ? 'coin' : 'coins'}
                  </span>
                )}
              </div>

              {validTokenCount > 0 && isLocalTurn && onSelectToken ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  {validTokenIds.map((tid) => (
                    <motion.button
                      key={tid}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => onSelectToken(tid)}
                      className="px-2.5 py-1 rounded-lg text-xs font-bold text-slate-950 bg-emerald-400 hover:bg-emerald-300 shadow-md transition cursor-pointer flex items-center gap-1"
                    >
                      <span>🚀 Move #{tid + 1}</span>
                    </motion.button>
                  ))}
                </div>
              ) : (
                <span className="text-xs font-semibold text-emerald-400">
                  {validTokenCount > 0
                    ? 'Selecting best move...'
                    : 'No valid moves (Passed)'}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
