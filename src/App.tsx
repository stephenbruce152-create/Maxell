import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  LudoGameState,
  PlayerColor,
  PlayerType,
  ReactionPing,
  MatchTierId,
  GameMode,
  WalletState,
} from './types/ludo';
import {
  createInitialGameState,
  getValidMovesForCurrentPlayer,
  processTokenMove,
  chooseBotMove,
  getNextActiveColorIndex,
  handleMatchTimerExpired,
  handleTurnTimeout,
} from './utils/ludoEngine';
import { COLOR_HEX } from './utils/ludoCoordinates';
import { soundEngine } from './utils/audio';
import {
  loadUserWallet,
  saveUserWallet,
  deductMatchWager,
  creditWinnerPayout,
  addDepositCoins,
  generateCSPRNGDiceRoll,
} from './utils/financialSystem';
import { ThreeLudoBoard } from './components/ThreeLudoBoard';
import { MatchHeader } from './components/MatchHeader';
import { MatchupScoreboard } from './components/MatchupScoreboard';
import { WalletModal } from './components/WalletModal';
import { RoomLobbyModal } from './components/RoomLobbyModal';
import { GameOverModal } from './components/GameOverModal';
import { RulesModal } from './components/RulesModal';
import { GameFeaturesDrawer } from './components/GameFeaturesDrawer';
import { Play, Rotate3d, Compass, Wallet, Sliders, Volume2, VolumeX } from 'lucide-react';

export function App() {
  // Financial & Tier State
  const [wallet, setWallet] = useState<WalletState>(() => loadUserWallet());
  const [selectedTier, setSelectedTier] = useState<MatchTierId>('micro');
  const [selectedMode, setSelectedMode] = useState<GameMode>('points_timer');
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isLobbyOpen, setIsLobbyOpen] = useState(false);
  const [isFeaturesDrawerOpen, setIsFeaturesDrawerOpen] = useState(false);

  // Camera & Sound
  const [cameraMode, setCameraMode] = useState<'perspective' | 'topdown' | 'active_focus'>('perspective');
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Online Multiplayer State
  const [onlineRoomCode, setOnlineRoomCode] = useState<string | undefined>(undefined);
  const [localPlayerColor, setLocalPlayerColor] = useState<PlayerColor | undefined>('red');
  const [isConnecting, setIsConnecting] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const [reactions, setReactions] = useState<ReactionPing[]>([]);

  // Main Game State
  const [gameState, setGameState] = useState<LudoGameState>(() => {
    return createInitialGameState(
      'match-micro',
      'ai',
      [
        { name: 'Red (You)', color: 'red', type: 'human' },
        { name: 'Bot Orion', color: 'green', type: 'bot' },
      ],
      'points_timer',
      'micro',
      2
    );
  });

  // Keep wallet in sync with localStorage
  useEffect(() => {
    saveUserWallet(wallet);
  }, [wallet]);

  // Handle Match Payout when Game Finishes
  const hasPaidOutRef = useRef(false);
  useEffect(() => {
    if (gameState.phase === 'game_over' && !hasPaidOutRef.current) {
      hasPaidOutRef.current = true;
      const winnerColor = gameState.winnerRanking[0];
      const winnerPlayer = gameState.players.find((p) => p.color === winnerColor);

      if (winnerPlayer && winnerPlayer.type === 'human') {
        const payout = gameState.tierConfig.payoutCoins;
        setWallet((prev) => creditWinnerPayout(prev, payout));
        soundEngine.playVictory();
      }
    } else if (gameState.phase !== 'game_over') {
      hasPaidOutRef.current = false;
    }
  }, [gameState.phase, gameState.winnerRanking, gameState.tierConfig, gameState.players]);

  // Master Match Timer (5-Minute Countdown)
  useEffect(() => {
    if (gameState.phase === 'game_over') return;

    const timer = setInterval(() => {
      setGameState((prev) => {
        if (prev.phase === 'game_over') return prev;
        if (prev.matchTimeRemaining <= 1) {
          soundEngine.playCapture();
          return handleMatchTimerExpired(prev);
        }
        return {
          ...prev,
          matchTimeRemaining: prev.matchTimeRemaining - 1,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState.phase]);

  // Turn Timer (12-Second Countdown & AFK Engine)
  useEffect(() => {
    if (gameState.phase === 'game_over' || gameState.dice.isRolling) return;

    const turnTimer = setInterval(() => {
      setGameState((prev) => {
        if (prev.phase === 'game_over' || prev.dice.isRolling) return prev;
        if (prev.turnTimeRemaining <= 1) {
          const { nextState, actionTaken } = handleTurnTimeout(prev);
          if (actionTaken === 'forfeited') {
            soundEngine.playCapture();
          } else {
            soundEngine.playSkip();
          }
          return nextState;
        }
        return {
          ...prev,
          turnTimeRemaining: prev.turnTimeRemaining - 1,
        };
      });
    }, 1000);

    return () => clearInterval(turnTimer);
  }, [gameState.phase, gameState.dice.isRolling, gameState.activeColorIndex]);

  // Start / Reset New Match
  const startNewMatch = useCallback(
    (tier: MatchTierId = selectedTier, mode: GameMode = selectedMode) => {
      setSelectedTier(tier);
      setSelectedMode(mode);

      // Deduct entry fee from wallet
      const newWallet = deductMatchWager(wallet, tier);
      setWallet(newWallet);

      const playerConfigs = [
        { name: 'Red (You)', color: 'red' as PlayerColor, type: 'human' as PlayerType },
        { name: 'Bot Orion', color: 'green' as PlayerColor, type: 'bot' as PlayerType },
      ];

      const initial = createInitialGameState(
        `match-${Date.now()}`,
        'ai',
        playerConfigs,
        mode,
        tier,
        2
      );

      setGameState(initial);
      hasPaidOutRef.current = false;
      soundEngine.playClick();
    },
    [wallet, selectedTier, selectedMode]
  );

  const handleDepositCoins = (amount: number) => {
    soundEngine.playClick();
    setWallet((prev) => addDepositCoins(prev, amount));
  };

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundEngine.enabled = next;
  };

  // Determine active player & turn validity
  const activePlayer = gameState.players[gameState.activeColorIndex];
  const isLocalTurn = (() => {
    if (gameState.phase === 'game_over') return false;
    if (!activePlayer) return false;
    if (gameState.mode === 'online') {
      return activePlayer.color === localPlayerColor && activePlayer.type === 'human';
    }
    return activePlayer.type === 'human';
  })();

  const canRollDice = isLocalTurn && gameState.phase === 'rolling' && !gameState.dice.isRolling;

  // Dice Roll Execution with Hardware CSPRNG
  const executeRollSimulation = useCallback((onComplete: (roll: number) => void) => {
    setGameState((prev) => ({
      ...prev,
      dice: {
        ...prev.dice,
        isRolling: true,
        rollTriggerId: (prev.dice.rollTriggerId || 0) + 1,
      },
    }));

    soundEngine.playDiceRoll();

    // 750ms physical dice tumble
    setTimeout(() => {
      const rollResult = generateCSPRNGDiceRoll();
      onComplete(rollResult.value);
    }, 750);
  }, []);

  // Dice Roll Trigger (Human)
  const handleRollDice = useCallback(() => {
    if (!canRollDice) return;

    if (gameState.mode === 'online' && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'ROLL_DICE' }));
      return;
    }

    executeRollSimulation((roll) => {
      setGameState((prev) => {
        const pActive = prev.players[prev.activeColorIndex];
        const updatedPlayers = prev.players.map((p, idx) => {
          if (idx !== prev.activeColorIndex) return p;
          const bd = { ...p.scoreBreakdown };
          if (roll === 6) {
            bd.sixBonusPoints += 6;
            bd.totalScore += 6;
          }
          return {
            ...p,
            score: bd.totalScore,
            scoreBreakdown: bd,
          };
        });

        const validMoves = getValidMovesForCurrentPlayer({ ...prev, players: updatedPlayers }, roll);
        const consecutive = roll === 6 ? prev.dice.consecutiveSixes + 1 : 0;

        // Triple 6 penalty
        if (consecutive === 3) {
          const logs = [
            ...prev.logs,
            {
              id: `log-3six-${Date.now()}`,
              color: pActive.color,
              playerName: pActive.name,
              text: `⚠️ Three 6s rolled in a row! Turn cancelled.`,
              timestamp: Date.now(),
              type: 'skip' as const,
            },
          ];
          const nextIndex = getNextActiveColorIndex(prev, prev.activeColorIndex);
          return {
            ...prev,
            players: updatedPlayers,
            logs,
            activeColorIndex: nextIndex,
            phase: 'rolling',
            validTokenMoves: [],
            turnTimeRemaining: prev.turnDuration,
            dice: {
              value: roll,
              isRolling: false,
              rollsLeftThisTurn: 1,
              consecutiveSixes: 0,
              rollTriggerId: prev.dice.rollTriggerId,
            },
          };
        }

        if (validMoves.length === 0) {
          const logs = [
            ...prev.logs,
            {
              id: `log-skip-${Date.now()}`,
              color: pActive.color,
              playerName: pActive.name,
              text: `${pActive.name} rolled ${roll} (No legal moves).`,
              timestamp: Date.now(),
              type: 'skip' as const,
            },
          ];

          setTimeout(() => {
            setGameState((cur) => {
              const nextIndex = getNextActiveColorIndex(cur, cur.activeColorIndex);
              return {
                ...cur,
                activeColorIndex: nextIndex,
                phase: 'rolling',
                validTokenMoves: [],
                turnTimeRemaining: cur.turnDuration,
                dice: { ...cur.dice, isRolling: false, consecutiveSixes: 0 },
              };
            });
          }, 900);

          return {
            ...prev,
            players: updatedPlayers,
            logs,
            phase: 'rolling',
            validTokenMoves: [],
            dice: {
              value: roll,
              isRolling: false,
              rollsLeftThisTurn: 0,
              consecutiveSixes: 0,
              rollTriggerId: prev.dice.rollTriggerId,
            },
          };
        }

        return {
          ...prev,
          players: updatedPlayers,
          phase: 'moving',
          validTokenMoves: validMoves,
          dice: {
            value: roll,
            isRolling: false,
            rollsLeftThisTurn: 0,
            consecutiveSixes: consecutive,
            rollTriggerId: prev.dice.rollTriggerId,
          },
        };
      });
    });
  }, [canRollDice, gameState.mode, executeRollSimulation]);

  // AI Bot Turn Automation
  useEffect(() => {
    if (gameState.mode === 'online') return;
    if (gameState.phase === 'game_over') return;

    if (activePlayer && activePlayer.type === 'bot' && !activePlayer.hasWon) {
      if (gameState.phase === 'rolling' && !gameState.dice.isRolling) {
        const botTimer = setTimeout(() => {
          executeRollSimulation((roll) => {
            setGameState((prev) => {
              const pActive = prev.players[prev.activeColorIndex];
              const updatedPlayers = prev.players.map((p, idx) => {
                if (idx !== prev.activeColorIndex) return p;
                const bd = { ...p.scoreBreakdown };
                if (roll === 6) {
                  bd.sixBonusPoints += 6;
                  bd.totalScore += 6;
                }
                return {
                  ...p,
                  score: bd.totalScore,
                  scoreBreakdown: bd,
                };
              });

              const validMoves = getValidMovesForCurrentPlayer({ ...prev, players: updatedPlayers }, roll);
              const consecutive = roll === 6 ? prev.dice.consecutiveSixes + 1 : 0;

              if (consecutive === 3) {
                const logs = [
                  ...prev.logs,
                  {
                    id: `log-3six-${Date.now()}`,
                    color: pActive.color,
                    playerName: pActive.name,
                    text: `⚠️ Three 6s rolled in a row! Turn cancelled.`,
                    timestamp: Date.now(),
                    type: 'skip' as const,
                  },
                ];
                const nextIndex = getNextActiveColorIndex(prev, prev.activeColorIndex);
                return {
                  ...prev,
                  players: updatedPlayers,
                  logs,
                  activeColorIndex: nextIndex,
                  phase: 'rolling',
                  validTokenMoves: [],
                  turnTimeRemaining: prev.turnDuration,
                  dice: {
                    value: roll,
                    isRolling: false,
                    rollsLeftThisTurn: 1,
                    consecutiveSixes: 0,
                    rollTriggerId: prev.dice.rollTriggerId,
                  },
                };
              }

              if (validMoves.length === 0) {
                const logs = [
                  ...prev.logs,
                  {
                    id: `log-skip-${Date.now()}`,
                    color: pActive.color,
                    playerName: pActive.name,
                    text: `${pActive.name} rolled ${roll} (No legal moves).`,
                    timestamp: Date.now(),
                    type: 'skip' as const,
                  },
                ];

                setTimeout(() => {
                  setGameState((cur) => {
                    const nextIndex = getNextActiveColorIndex(cur, cur.activeColorIndex);
                    return {
                      ...cur,
                      activeColorIndex: nextIndex,
                      phase: 'rolling',
                      validTokenMoves: [],
                      turnTimeRemaining: cur.turnDuration,
                      dice: { ...cur.dice, isRolling: false, consecutiveSixes: 0 },
                    };
                  });
                }, 900);

                return {
                  ...prev,
                  players: updatedPlayers,
                  logs,
                  phase: 'rolling',
                  validTokenMoves: [],
                  dice: {
                    value: roll,
                    isRolling: false,
                    rollsLeftThisTurn: 0,
                    consecutiveSixes: 0,
                    rollTriggerId: prev.dice.rollTriggerId,
                  },
                };
              }

              // Bot evaluates best move
              setTimeout(() => {
                setGameState((cur) => {
                  if (cur.phase !== 'moving') return cur;
                  const chosenId = chooseBotMove(cur, validMoves);
                  if (chosenId === null) return cur;
                  const result = processTokenMove(cur, chosenId);
                  if (result.capturedToken) soundEngine.playCapture();
                  if (result.reachedHome) soundEngine.playHomeArrival();
                  return result.nextState;
                });
              }, 700);

              return {
                ...prev,
                players: updatedPlayers,
                phase: 'moving',
                validTokenMoves: validMoves,
                dice: {
                  value: roll,
                  isRolling: false,
                  rollsLeftThisTurn: 0,
                  consecutiveSixes: consecutive,
                  rollTriggerId: prev.dice.rollTriggerId,
                },
              };
            });
          });
        }, 700);

        return () => clearTimeout(botTimer);
      }
    }
  }, [gameState.phase, gameState.activeColorIndex, gameState.mode, activePlayer, executeRollSimulation]);

  // Token Selection Handler
  const handleMoveToken = useCallback((tokenId: number) => {
    if (gameState.phase !== 'moving') return;

    if (gameState.mode === 'online' && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'MOVE_TOKEN', tokenId }));
      return;
    }

    const result = processTokenMove(gameState, tokenId);
    if (result.capturedToken) {
      soundEngine.playCapture();
    }
    if (result.reachedHome) {
      soundEngine.playHomeArrival();
    }

    setGameState(result.nextState);
  }, [gameState]);

  // Reactions
  const handleSendReaction = useCallback((emoji: string) => {
    soundEngine.playClick();
    const ping: ReactionPing = {
      id: `rx-${Date.now()}-${Math.random()}`,
      color: activePlayer?.color || 'red',
      emoji,
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      timestamp: Date.now(),
    };

    setReactions((prev) => [...prev.slice(-6), ping]);

    if (gameState.mode === 'online' && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: 'SEND_REACTION', reaction: ping }));
    }
  }, [activePlayer, gameState.mode]);

  const activeHex = activePlayer ? COLOR_HEX[activePlayer.color] : COLOR_HEX.red;

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans select-none text-slate-100 flex flex-col">
      {/* 1. Header (Stakes, 5m Timer, Wallet Pill, Actions) */}
      <MatchHeader
        gameMode={gameState.gameMode}
        tierConfig={gameState.tierConfig}
        wallet={wallet}
        matchTimeRemaining={gameState.matchTimeRemaining}
        soundEnabled={soundEnabled}
        onToggleSound={toggleSound}
        onOpenWallet={() => setIsWalletOpen(true)}
        onOpenRules={() => setIsRulesOpen(true)}
        onResetMatch={() => startNewMatch()}
      />

      {/* 2. Unified Matchup Scoreboard (Zero Corner Overlaps) */}
      <MatchupScoreboard
        players={gameState.players}
        activeColorIndex={gameState.activeColorIndex}
        phase={gameState.phase}
        turnTimeRemaining={gameState.turnTimeRemaining}
        turnDuration={gameState.turnDuration}
        localPlayerColor={localPlayerColor}
        targetTokensToWin={gameState.targetTokensToWin}
      />

      {/* 3. 3D WebGL Three.js Kinetic Ludo Board (Full Unobstructed View) */}
      <div className="flex-1 relative w-full h-full">
        <ThreeLudoBoard
          gameState={gameState}
          onSelectToken={handleMoveToken}
          onRollDice={handleRollDice}
          cameraMode={cameraMode}
          isLocalTurn={isLocalTurn}
          canRollDice={canRollDice}
        />
      </div>

      {/* 4. Streamlined Floating Bottom Dock (Mobile-Friendly & Ergonomic) */}
      <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 pointer-events-auto max-w-[96vw]">
        {/* Dynamic Turn & Roll Button */}
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={isLocalTurn && canRollDice ? { scale: 0.96 } : {}}
          onClick={() => {
            if (isLocalTurn && canRollDice) {
              soundEngine.playClick();
              handleRollDice();
            }
          }}
          className={`flex items-center gap-2.5 px-3 sm:px-4 py-2 rounded-2xl border backdrop-blur-md shadow-2xl transition cursor-pointer ${
            isLocalTurn && canRollDice
              ? 'bg-slate-900/95 border-amber-400 ring-2 ring-amber-400/40'
              : 'bg-slate-900/90 border-slate-800'
          }`}
        >
          <span className="text-base animate-pulse">
            {gameState.phase === 'rolling' ? '🎲' : '🏃'}
          </span>
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-full inline-block shrink-0"
                style={{ backgroundColor: activeHex.primary }}
              />
              <span className="truncate max-w-[100px] sm:max-w-[130px]">
                {activePlayer?.name}
              </span>
              {isLocalTurn && (
                <span className="text-[8px] bg-amber-500/25 text-amber-300 font-black px-1 rounded">
                  YOU
                </span>
              )}
            </span>
            <span className="text-[10px] text-slate-300 font-medium truncate max-w-[140px] sm:max-w-[180px]">
              {gameState.phase === 'rolling'
                ? isLocalTurn
                  ? 'Tap 3D dice to roll!'
                  : 'Rolling dice...'
                : isLocalTurn
                ? `Rolled ${gameState.dice.value}! Tap your token`
                : 'Moving token...'}
            </span>
          </div>
        </motion.div>

        {/* Quick Token Move Buttons (When multiple tokens are movable) */}
        {gameState.phase === 'moving' &&
          isLocalTurn &&
          gameState.validTokenMoves.length > 0 && (
            <div className="flex items-center gap-1">
              {gameState.validTokenMoves.map((tid) => (
                <motion.button
                  key={tid}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleMoveToken(tid)}
                  className="px-2.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-black transition shadow-lg flex items-center gap-1 cursor-pointer border border-amber-300"
                  title={`Move Token #${tid + 1}`}
                >
                  <span>Token #{tid + 1}</span>
                </motion.button>
              ))}
            </div>
          )}

        {/* 2D / 3D Perspective Toggle */}
        <button
          onClick={() => setCameraMode(cameraMode === 'perspective' ? 'topdown' : 'perspective')}
          className="p-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition shadow-xl backdrop-blur-md"
          title={`Switch to ${cameraMode === 'perspective' ? '2D Top-Down' : '3D Perspective'} View`}
        >
          {cameraMode === 'perspective' ? <Rotate3d className="w-4 h-4 text-sky-400" /> : <Compass className="w-4 h-4 text-emerald-400" />}
        </button>

        {/* Casino Wallet / Stakes Quick Trigger */}
        <button
          onClick={() => setIsWalletOpen(true)}
          className="p-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-amber-300 border border-slate-800 text-xs font-bold transition shadow-xl backdrop-blur-md"
          title="Match Stakes & Wallet"
        >
          <Wallet className="w-4 h-4" />
        </button>

        {/* Drawer Trigger */}
        <button
          onClick={() => setIsFeaturesDrawerOpen(true)}
          className="p-2 rounded-2xl bg-slate-900/90 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-bold transition shadow-xl backdrop-blur-md"
          title="Reactions & Move History"
        >
          <Sliders className="w-4 h-4" />
        </button>
      </div>

      {/* 5. Modals & Drawers */}
      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        wallet={wallet}
        selectedTier={selectedTier}
        selectedMode={selectedMode}
        onSelectTierAndMode={(tier, mode) => {
          setIsWalletOpen(false);
          startNewMatch(tier, mode);
        }}
        onDepositCoins={handleDepositCoins}
      />

      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      <GameFeaturesDrawer
        isOpen={isFeaturesDrawerOpen}
        onClose={() => setIsFeaturesDrawerOpen(false)}
        gameState={gameState}
        canRollDice={canRollDice}
        isLocalTurn={isLocalTurn}
        onRollDice={handleRollDice}
        onSelectToken={handleMoveToken}
        onSendReaction={handleSendReaction}
        rulePreset={gameState.gameMode === 'quick_target' ? 'quick' : 'classic'}
        onSwitchRulePreset={(p) => startNewMatch(selectedTier, p === 'quick' ? 'quick_target' : 'points_timer')}
        cameraMode={cameraMode}
        onSetCameraMode={setCameraMode}
        isMuted={!soundEnabled}
        onToggleMute={toggleSound}
        onOpenRules={() => setIsRulesOpen(true)}
      />

      {gameState.phase === 'game_over' && (
        <GameOverModal
          gameState={gameState}
          onPlayAgain={() => startNewMatch()}
          onBackToLobby={() => setIsLobbyOpen(true)}
        />
      )}
    </div>
  );
}
export default App;
