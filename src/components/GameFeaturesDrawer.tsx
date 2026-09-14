import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LudoGameState, PlayerColor } from '../types/ludo';
import { COLOR_HEX } from '../utils/ludoCoordinates';
import { soundEngine } from '../utils/audio';

interface GameFeaturesDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  gameState: LudoGameState;
  canRollDice: boolean;
  isLocalTurn: boolean;
  onRollDice: () => void;
  onSelectToken: (tokenId: number) => void;
  onSendReaction: (emoji: string) => void;
  rulePreset: 'quick' | 'classic';
  onSwitchRulePreset: (preset: 'quick' | 'classic') => void;
  cameraMode: 'perspective' | 'topdown' | 'active_focus';
  onSetCameraMode: (mode: 'perspective' | 'topdown' | 'active_focus') => void;
  isMuted: boolean;
  onToggleMute: () => void;
  onOpenRules: () => void;
  onOpenLobby: () => void;
}

type TabType = 'controls' | 'reactions' | 'logs' | 'leaderboard';

const EMOJIS = ['🔥', '🎲', '👑', '💥', '⚡', '😭', '🎯', '🚀', '👏', '👋', '❤️', '😎'];

export const GameFeaturesDrawer: React.FC<GameFeaturesDrawerProps> = ({
  isOpen,
  onClose,
  gameState,
  canRollDice,
  isLocalTurn,
  onRollDice,
  onSelectToken,
  onSendReaction,
  rulePreset,
  onSwitchRulePreset,
  cameraMode,
  onSetCameraMode,
  isMuted,
  onToggleMute,
  onOpenRules,
  onOpenLobby,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('controls');

  const activePlayer = gameState.players[gameState.activeColorIndex];
  const hex = activePlayer ? COLOR_HEX[activePlayer.color] : COLOR_HEX.red;

  const sortedPlayers = [...gameState.players].sort(
    (a, b) => (b.score || 0) - (a.score || 0)
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop Blur Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40"
          />

          {/* 3D Motion Drawer Sheet */}
          <motion.div
            initial={{ y: '100%', opacity: 0.5, rotateX: 12 }}
            animate={{ y: 0, opacity: 1, rotateX: 0 }}
            exit={{ y: '100%', opacity: 0, rotateX: 15 }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 max-w-xl mx-auto z-50 p-4 sm:p-6 bg-slate-900/95 border-t border-slate-700/80 rounded-t-3xl shadow-2xl backdrop-blur-2xl text-slate-100 flex flex-col max-h-[82vh]"
            style={{ perspective: 1000 }}
          >
            {/* Header Handle & Close */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚡</span>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    Game Tools & Features
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Controls, Reactions, Logs & Settings
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition cursor-pointer"
                title="Close drawer"
              >
                ✕
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1.5 p-1 my-3 bg-slate-950/80 rounded-xl border border-slate-800 text-xs font-semibold overflow-x-auto">
              <button
                onClick={() => setActiveTab('controls')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'controls'
                    ? 'bg-sky-500 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>🎮</span>
                <span>Actions</span>
              </button>
              <button
                onClick={() => setActiveTab('reactions')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'reactions'
                    ? 'bg-sky-500 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>💬</span>
                <span>Reactions</span>
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'logs'
                    ? 'bg-sky-500 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>📜</span>
                <span>Logs ({gameState.logs.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('leaderboard')}
                className={`flex-1 py-1.5 px-2.5 rounded-lg transition flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  activeTab === 'leaderboard'
                    ? 'bg-sky-500 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>👑</span>
                <span>Standings</span>
              </button>
            </div>

            {/* Tab Body Content */}
            <div className="flex-1 overflow-y-auto pr-1 py-1 scrollbar-thin scrollbar-thumb-slate-700">
              {/* TAB 1: CONTROLS & ACTIONS */}
              {activeTab === 'controls' && (
                <div className="space-y-4 text-xs">
                  {/* Rule Preset Selector */}
                  <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Rules Preset
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => onSwitchRulePreset('quick')}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          rulePreset === 'quick'
                            ? 'bg-sky-500/20 border-sky-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="font-bold text-sm text-sky-400 mb-0.5">
                          ⚡ Quick Mode
                        </div>
                        <div className="text-[11px] text-slate-400">
                          1 token already active on track for immediate action!
                        </div>
                      </button>
                      <button
                        onClick={() => onSwitchRulePreset('classic')}
                        className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                          rulePreset === 'classic'
                            ? 'bg-amber-500/20 border-amber-400 text-white'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="font-bold text-sm text-amber-400 mb-0.5">
                          🎲 Classic Mode
                        </div>
                        <div className="text-[11px] text-slate-400">
                          All 4 tokens in yard, roll 6 to unlock into race!
                        </div>
                      </button>
                    </div>
                  </div>

                  {/* Fallback Direct Roll & Move Action (for button lovers) */}
                  <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      Tactile Action Helpers
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {gameState.phase === 'rolling' && (
                        <button
                          onClick={() => {
                            if (canRollDice && isLocalTurn) {
                              soundEngine.playClick();
                              onRollDice();
                              onClose();
                            }
                          }}
                          disabled={!canRollDice || !isLocalTurn}
                          className={`px-4 py-2 rounded-xl font-bold text-xs transition cursor-pointer flex items-center gap-1.5 shadow ${
                            canRollDice && isLocalTurn
                              ? 'bg-emerald-500 hover:bg-emerald-400 text-white'
                              : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                          }`}
                        >
                          <span>🎲</span>
                          <span>Roll 3D Dice Now</span>
                        </button>
                      )}

                      {gameState.phase === 'moving' &&
                        gameState.validTokenMoves.length > 0 &&
                        isLocalTurn && (
                          <div className="flex items-center gap-2 flex-wrap">
                            {gameState.validTokenMoves.map((tid) => (
                              <button
                                key={tid}
                                onClick={() => {
                                  onSelectToken(tid);
                                  onClose();
                                }}
                                className="px-3 py-1.5 rounded-xl font-bold text-xs bg-sky-500 hover:bg-sky-400 text-white transition cursor-pointer shadow flex items-center gap-1"
                              >
                                <span>🚀</span>
                                <span>Move Coin #{tid + 1}</span>
                              </button>
                            ))}
                          </div>
                        )}

                      <span className="text-[11px] text-slate-400 italic">
                        Tip: You can also tap the 3D dice or coins directly on the board anytime!
                      </span>
                    </div>
                  </div>

                  {/* Camera Perspective Angle */}
                  <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                      3D Camera Angle
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        onClick={() => onSetCameraMode('perspective')}
                        className={`py-2 px-3 rounded-xl border text-center font-semibold transition cursor-pointer ${
                          cameraMode === 'perspective'
                            ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        🎥 3D Angled
                      </button>
                      <button
                        onClick={() => onSetCameraMode('topdown')}
                        className={`py-2 px-3 rounded-xl border text-center font-semibold transition cursor-pointer ${
                          cameraMode === 'topdown'
                            ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        📐 2D Top-Down
                      </button>
                      <button
                        onClick={() => onSetCameraMode('active_focus')}
                        className={`py-2 px-3 rounded-xl border text-center font-semibold transition cursor-pointer ${
                          cameraMode === 'active_focus'
                            ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        🎯 Focus Turn
                      </button>
                    </div>
                  </div>

                  {/* Quick Settings & Audio */}
                  <div className="flex items-center justify-between p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={onToggleMute}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition cursor-pointer flex items-center gap-1.5"
                      >
                        <span>{isMuted ? '🔇' : '🔊'}</span>
                        <span>{isMuted ? 'Unmute' : 'Mute'} Audio</span>
                      </button>

                      <button
                        onClick={() => {
                          onClose();
                          onOpenRules();
                        }}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition cursor-pointer flex items-center gap-1.5"
                      >
                        <span>❓</span>
                        <span>Game Rules</span>
                      </button>
                    </div>

                    <button
                      onClick={() => {
                        onClose();
                        onOpenLobby();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-white font-semibold transition cursor-pointer flex items-center gap-1.5"
                    >
                      <span>⚙️</span>
                      <span>Lobby / Players</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: REACTIONS */}
              {activeTab === 'reactions' && (
                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                    Send Live 3D Emoji Reaction
                  </span>
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                    {EMOJIS.map((emoji) => (
                      <motion.button
                        key={emoji}
                        whileHover={{ scale: 1.2 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          soundEngine.playClick();
                          onSendReaction(emoji);
                        }}
                        className="h-14 rounded-2xl bg-slate-900 border border-slate-800 hover:border-sky-400 text-2xl flex items-center justify-center transition shadow-lg cursor-pointer"
                        title={`Send ${emoji}`}
                      >
                        {emoji}
                      </motion.button>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 3: GAME EVENT LOGS */}
              {activeTab === 'logs' && (
                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 flex flex-col h-64">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-800 mb-2">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Event Log History
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {gameState.logs.length} moves recorded
                    </span>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs scrollbar-thin scrollbar-thumb-slate-700">
                    {gameState.logs.slice().reverse().map((log) => {
                      const logHex = COLOR_HEX[log.color];
                      return (
                        <div
                          key={log.id}
                          className="p-2 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-start gap-2"
                        >
                          <span
                            className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                            style={{ backgroundColor: logHex ? logHex.primary : '#38bdf8' }}
                          />
                          <div className="flex-1 leading-snug text-slate-300">
                            {log.text}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono">
                            {new Date(log.timestamp).toLocaleTimeString([], {
                              minute: '2-digit',
                              second: '2-digit',
                            })}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 4: LEADERBOARD & STANDINGS */}
              {activeTab === 'leaderboard' && (
                <div className="p-3 bg-slate-950/60 rounded-2xl border border-slate-800 space-y-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Match Standings & Points
                  </span>
                  {sortedPlayers.map((player, idx) => {
                    const pHex = COLOR_HEX[player.color];
                    const inHome = player.tokens.filter((t) => t.step === 56).length;
                    const inYard = player.tokens.filter((t) => t.step === -1).length;
                    const onTrack = 4 - inHome - inYard;

                    return (
                      <div
                        key={player.color}
                        className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-2.5">
                          <span className="text-sm font-bold text-amber-400 w-5">
                            #{idx + 1}
                          </span>
                          <div
                            className="w-4 h-4 rounded-full shadow"
                            style={{ backgroundColor: pHex.primary }}
                          />
                          <div>
                            <div className="font-bold text-xs text-white">
                              {player.name}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span className="text-emerald-400">🏠 {inHome}/4 Home</span>
                              <span>🏃 {onTrack} Track</span>
                              {player.captures > 0 && (
                                <span className="text-red-400">⚔️ {player.captures}</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-amber-300">
                            {player.score || 0}
                          </span>
                          <span className="text-[10px] text-slate-400 ml-0.5">pts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
