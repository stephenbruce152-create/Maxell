import {
  LudoGameState,
  Player,
  PlayerColor,
  TokenState,
  DiceState,
  MoveLogItem,
  PlayerScoreBreakdown,
  GameMode,
  MatchTierId,
} from '../types/ludo';
import {
  getTrackIndexForToken,
  isTokenInSafeZone,
} from './ludoCoordinates';
import { getTierConfig } from './financialSystem';

export const PLAYER_COLORS_ORDER: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];

export function createInitialScoreBreakdown(): PlayerScoreBreakdown {
  return {
    movementPoints: 0,
    capturePoints: 0,
    homePoints: 0,
    sixBonusPoints: 0,
    penaltyPoints: 0,
    totalScore: 0,
  };
}

export function createInitialGameState(
  roomId: string,
  mode: 'online' | 'local' | 'ai',
  playerConfigs: { name: string; color: PlayerColor; type: 'human' | 'bot' | 'remote' }[],
  gameMode: GameMode = 'points_timer',
  tier: MatchTierId = 'micro',
  playerCount: 2 | 4 = 2
): LudoGameState {
  const tierConfig = getTierConfig(tier, playerCount);

  // In casino speed formats, deploy starting token so action begins on Turn 1!
  const isQuick = gameMode === 'quick_target';
  const isPoints = gameMode === 'points_timer';

  const players: Player[] = playerConfigs.slice(0, playerCount).map((cfg, idx) => ({
    id: `player-${idx}-${Date.now()}`,
    name: cfg.name,
    color: cfg.color,
    type: cfg.type,
    hasWon: false,
    rank: null,
    isConnected: true,
    avatarSeed: cfg.name,
    score: 0,
    captures: 0,
    tokensHome: 0,
    afkStrikes: 0,
    scoreBreakdown: createInitialScoreBreakdown(),
    tokens: [
      { id: 0, color: cfg.color, step: isQuick || isPoints ? 0 : -1, earnedPoints: 0 },
      { id: 1, color: cfg.color, step: isQuick ? 0 : -1, earnedPoints: 0 },
      { id: 2, color: cfg.color, step: -1, earnedPoints: 0 },
      { id: 3, color: cfg.color, step: -1, earnedPoints: 0 },
    ],
  }));

  const initialLog: MoveLogItem = {
    id: `log-init`,
    color: players[0].color,
    playerName: players[0].name,
    text: `Table opened (${tierConfig.name} • Pot: ${tierConfig.potCoins} Coins). ${players[0].name} rolls first!`,
    timestamp: Date.now(),
    type: 'move',
  };

  return {
    roomId,
    mode,
    gameMode,
    tier,
    tierConfig,
    playerCount,
    players,
    activeColorIndex: 0,
    phase: 'rolling',
    dice: {
      value: 1,
      isRolling: false,
      rollsLeftThisTurn: 1,
      consecutiveSixes: 0,
      rollTriggerId: 0,
    },
    selectedTokenId: null,
    validTokenMoves: [],
    winnerRanking: [],
    logs: [initialLog],
    reactions: [],
    lastMoveTimestamp: Date.now(),
    matchDuration: 300, // 5 minutes standard timer
    matchTimeRemaining: 300,
    turnDuration: 12, // 12 seconds per turn
    turnTimeRemaining: 12,
    targetTokensToWin: gameMode === 'quick_target' ? 2 : 4,
  };
}

/**
 * Returns array of token IDs that can legally move given the current state and dice value.
 */
export function getValidMovesForCurrentPlayer(state: LudoGameState, diceValue: number): number[] {
  const activePlayer = state.players[state.activeColorIndex];
  if (!activePlayer || activePlayer.hasWon || activePlayer.isForfeited) return [];

  const validIds: number[] = [];

  for (const token of activePlayer.tokens) {
    if (token.step === 56) {
      continue; // Already home
    }

    if (token.step === -1) {
      // In base yard: requires 6 to enter track
      if (diceValue === 6) {
        validIds.push(token.id);
      }
    } else {
      // On track: must not overshoot home apex 56
      if (token.step + diceValue <= 56) {
        validIds.push(token.id);
      }
    }
  }

  return validIds;
}

/**
 * Advances the active player to the next un-finished, un-forfeited player.
 */
export function getNextActiveColorIndex(state: LudoGameState, currentIndex: number): number {
  const count = state.players.length;
  let next = (currentIndex + 1) % count;
  let attempts = 0;

  while (attempts < count) {
    const p = state.players[next];
    if (!p.hasWon && !p.isForfeited) {
      return next;
    }
    next = (next + 1) % count;
    attempts++;
  }

  return currentIndex;
}

/**
 * Recalculate total score for a player based on breakdown.
 */
function refreshPlayerScore(player: Player): void {
  const bd = player.scoreBreakdown;
  bd.totalScore = Math.max(
    0,
    bd.movementPoints + bd.capturePoints + bd.homePoints + bd.sixBonusPoints - bd.penaltyPoints
  );
  player.score = bd.totalScore;
}

/**
 * Process token move, scoring, captures, home arrivals, and turn transition.
 */
export function processTokenMove(
  state: LudoGameState,
  tokenId: number
): {
  nextState: LudoGameState;
  capturedToken: TokenState | null;
  reachedHome: boolean;
  awardedBonusTurn: boolean;
  isGameOver: boolean;
} {
  const nextPlayers = state.players.map((p) => ({
    ...p,
    tokens: p.tokens.map((t) => ({ ...t })),
    scoreBreakdown: { ...p.scoreBreakdown },
  }));

  const activePlayer = nextPlayers[state.activeColorIndex];
  const token = activePlayer.tokens.find((t) => t.id === tokenId);
  if (!token) {
    return {
      nextState: state,
      capturedToken: null,
      reachedHome: false,
      awardedBonusTurn: false,
      isGameOver: false,
    };
  }

  const diceVal = state.dice.value;
  const oldStep = token.step;
  const newStep = oldStep === -1 ? 0 : oldStep + diceVal;
  token.step = newStep;

  // Step points: 1 point per square moved (+1 when deploying from base)
  const stepsMoved = oldStep === -1 ? 1 : diceVal;
  token.earnedPoints = (token.earnedPoints || 0) + stepsMoved;
  activePlayer.scoreBreakdown.movementPoints += stepsMoved;
  refreshPlayerScore(activePlayer);

  let capturedToken: TokenState | null = null;
  let reachedHome = false;
  let awardedBonusTurn = false;
  const logs: MoveLogItem[] = [...state.logs];

  // 1. Check Home Arrival (step 56)
  if (newStep === 56) {
    reachedHome = true;
    awardedBonusTurn = true;
    activePlayer.tokensHome = (activePlayer.tokensHome || 0) + 1;

    // Reaching Home: +100 bonus points
    activePlayer.scoreBreakdown.homePoints += 100;
    token.earnedPoints += 100;
    refreshPlayerScore(activePlayer);

    logs.push({
      id: `log-${Date.now()}-${Math.random()}`,
      color: activePlayer.color,
      playerName: activePlayer.name,
      text: `🏠 ${activePlayer.name}'s token entered Home! (+100 pts & Bonus Roll)`,
      timestamp: Date.now(),
      type: 'home',
    });

    // Check Win Condition: Quick target (2 home) or Classic (4 home)
    const target = state.targetTokensToWin || 2;
    const reachedTarget = activePlayer.tokensHome >= target;

    if (reachedTarget && !activePlayer.hasWon) {
      activePlayer.hasWon = true;
      const rank = state.winnerRanking.length + 1;
      activePlayer.rank = rank;
      const updatedRanking = [...state.winnerRanking, activePlayer.color];

      logs.push({
        id: `log-win-${Date.now()}`,
        color: activePlayer.color,
        playerName: activePlayer.name,
        text: `🏆 ${activePlayer.name} reached ${target} Home Tokens! Winner of ${state.tierConfig.payoutCoins} Coins!`,
        timestamp: Date.now(),
        type: 'win',
      });

      return {
        nextState: {
          ...state,
          players: nextPlayers,
          winnerRanking: updatedRanking,
          logs,
          phase: 'game_over',
          gameOverReason: 'target_reached',
          dice: { ...state.dice, isRolling: false, consecutiveSixes: 0 },
          validTokenMoves: [],
          selectedTokenId: null,
          lastMoveTimestamp: Date.now(),
        },
        capturedToken: null,
        reachedHome: true,
        awardedBonusTurn: false,
        isGameOver: true,
      };
    }
  } else if (newStep >= 0 && newStep <= 50) {
    // 2. Check Capture on main track
    const landTrackIdx = getTrackIndexForToken(activePlayer.color, newStep);
    const isSafe = isTokenInSafeZone(activePlayer.color, newStep);

    if (landTrackIdx !== null && !isSafe) {
      for (const opponent of nextPlayers) {
        if (opponent.color === activePlayer.color || opponent.hasWon || opponent.isForfeited) continue;

        for (const oppToken of opponent.tokens) {
          if (oppToken.step >= 0 && oppToken.step <= 50) {
            const oppTrackIdx = getTrackIndexForToken(opponent.color, oppToken.step);
            if (oppTrackIdx === landTrackIdx) {
              // Capture occurred!
              capturedToken = { ...oppToken };
              oppToken.step = -1;
              awardedBonusTurn = true;
              activePlayer.captures += 1;

              // Rule: Attacker earns +50 points
              activePlayer.scoreBreakdown.capturePoints += 50;
              refreshPlayerScore(activePlayer);

              // Rule: Victim loses all points earned by this specific token!
              const pointsLost = oppToken.earnedPoints || 0;
              oppToken.earnedPoints = 0;
              opponent.scoreBreakdown.penaltyPoints += pointsLost;
              refreshPlayerScore(opponent);

              logs.push({
                id: `log-cap-${Date.now()}`,
                color: activePlayer.color,
                playerName: activePlayer.name,
                text: `💥 ${activePlayer.name} eliminated ${opponent.name}'s token! (+50 pts. ${opponent.name} lost ${pointsLost} pts!)`,
                timestamp: Date.now(),
                type: 'capture',
              });
              break;
            }
          }
        }
        if (capturedToken) break;
      }
    }
  }

  // 3. Rolling a 6 also awards bonus roll + 6 bonus points
  if (diceVal === 6) {
    awardedBonusTurn = true;
    activePlayer.scoreBreakdown.sixBonusPoints += 6;
    refreshPlayerScore(activePlayer);
  }

  // 4. Decide next turn
  let nextActiveIndex = state.activeColorIndex;
  let nextConsecutiveSixes = state.dice.consecutiveSixes;

  if (!awardedBonusTurn) {
    nextActiveIndex = getNextActiveColorIndex({ ...state, players: nextPlayers }, state.activeColorIndex);
    nextConsecutiveSixes = 0;
  }

  const nextState: LudoGameState = {
    ...state,
    players: nextPlayers,
    activeColorIndex: nextActiveIndex,
    phase: 'rolling',
    dice: {
      value: diceVal,
      isRolling: false,
      rollsLeftThisTurn: 1,
      consecutiveSixes: nextConsecutiveSixes,
      rollTriggerId: state.dice.rollTriggerId,
    },
    validTokenMoves: [],
    selectedTokenId: null,
    turnTimeRemaining: state.turnDuration, // Reset turn timer to 12s
    lastMoveTimestamp: Date.now(),
    logs,
  };

  return {
    nextState,
    capturedToken,
    reachedHome,
    awardedBonusTurn,
    isGameOver: false,
  };
}

/**
 * Bot AI Decision Engine: Evaluates legal moves and chooses optimal tactical action.
 */
export function chooseBotMove(state: LudoGameState, validMoves: number[]): number | null {
  if (!validMoves || validMoves.length === 0) return null;
  if (validMoves.length === 1) return validMoves[0];

  const activePlayer = state.players[state.activeColorIndex];
  if (!activePlayer) return validMoves[0];

  const diceVal = state.dice.value;
  let bestScore = -Infinity;
  let bestTokenId = validMoves[0];

  for (const tokenId of validMoves) {
    const token = activePlayer.tokens.find((t) => t.id === tokenId);
    if (!token) continue;

    let score = 0;
    const oldStep = token.step;
    const newStep = oldStep === -1 ? 0 : oldStep + diceVal;

    // 1. Highest Priority: Entering Home (step 56) -> +1000
    if (newStep === 56) {
      score += 1000;
    }

    // 2. High Priority: Eliminating opponent token -> +500
    if (newStep >= 0 && newStep <= 50) {
      const landTrack = getTrackIndexForToken(activePlayer.color, newStep);
      const isSafe = isTokenInSafeZone(activePlayer.color, newStep);
      if (landTrack !== null && !isSafe) {
        for (const opp of state.players) {
          if (opp.color === activePlayer.color || opp.hasWon) continue;
          for (const oppTok of opp.tokens) {
            if (oppTok.step >= 0 && oppTok.step <= 50) {
              const oppTrack = getTrackIndexForToken(opp.color, oppTok.step);
              if (oppTrack === landTrack) {
                score += 500 + (oppTok.earnedPoints || 0) * 2;
              }
            }
          }
        }
      }

      // 3. Safe Zone landing -> +150
      if (isSafe) {
        score += 150;
      }
    }

    // 4. Entering Runway safely -> +100
    if (newStep >= 51 && newStep <= 55) {
      score += 100 + newStep;
    }

    // 5. Deploying from Base yard -> +80
    if (oldStep === -1 && newStep === 0) {
      score += 80;
    }

    // 6. Advancement preference (tokens further along have higher score value)
    score += newStep * 2;

    if (score > bestScore) {
      bestScore = score;
      bestTokenId = tokenId;
    }
  }

  return bestTokenId;
}

/**
 * Handles Match Timer Expiration: Declares highest scorer as match winner.
 */
export function handleMatchTimerExpired(state: LudoGameState): LudoGameState {
  if (state.phase === 'game_over') return state;

  const activePlayers = state.players.filter((p) => !p.isForfeited);
  const sorted = [...activePlayers].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  const updatedPlayers = state.players.map((p) => {
    if (winner && p.color === winner.color) {
      return { ...p, hasWon: true, rank: 1 };
    }
    return p;
  });

  const logs: MoveLogItem[] = [
    ...state.logs,
    {
      id: `log-time-${Date.now()}`,
      color: winner?.color || 'red',
      playerName: winner?.name || 'Player',
      text: `⏱️ 5-Minute Timer Expired! ${winner?.name} wins with highest score (${winner?.score} pts)!`,
      timestamp: Date.now(),
      type: 'win',
    },
  ];

  return {
    ...state,
    phase: 'game_over',
    gameOverReason: 'timer_expired',
    players: updatedPlayers,
    winnerRanking: winner ? [winner.color] : [],
    logs,
  };
}

/**
 * Handles Turn Timeout & Anti-AFK Strike:
 * Strike 1 & 2: auto-action. Strike 3: Immediate Forfeit.
 */
export function handleTurnTimeout(state: LudoGameState): {
  nextState: LudoGameState;
  actionTaken: 'auto_rolled' | 'auto_moved' | 'skipped' | 'forfeited';
} {
  const activePlayer = state.players[state.activeColorIndex];
  if (!activePlayer || state.phase === 'game_over') {
    return { nextState: state, actionTaken: 'skipped' };
  }

  const newStrikes = (activePlayer.afkStrikes || 0) + 1;
  const logs: MoveLogItem[] = [...state.logs];

  // Strike 3: IMMEDIATE FORFEIT!
  if (newStrikes >= 3) {
    const updatedPlayers = state.players.map((p, idx) => {
      if (idx === state.activeColorIndex) {
        return { ...p, afkStrikes: 3, isForfeited: true };
      }
      return p;
    });

    const nonForfeited = updatedPlayers.filter((p) => !p.isForfeited);
    const winner = nonForfeited[0];
    if (winner) {
      winner.hasWon = true;
      winner.rank = 1;
    }

    logs.push({
      id: `log-afk-forfeit-${Date.now()}`,
      color: activePlayer.color,
      playerName: activePlayer.name,
      text: `⛔ ${activePlayer.name} accumulated 3 AFK strikes and forfeited the match!`,
      timestamp: Date.now(),
      type: 'afk',
    });

    return {
      nextState: {
        ...state,
        players: updatedPlayers,
        phase: 'game_over',
        gameOverReason: 'afk_forfeit',
        forfeitedPlayerColor: activePlayer.color,
        winnerRanking: winner ? [winner.color] : [],
        logs,
      },
      actionTaken: 'forfeited',
    };
  }

  // Strike 1 or 2: Log warning
  logs.push({
    id: `log-afk-strike-${Date.now()}`,
    color: activePlayer.color,
    playerName: activePlayer.name,
    text: `⚠️ Turn Timer Expired: ${activePlayer.name} received AFK Strike ${newStrikes}/3.`,
    timestamp: Date.now(),
    type: 'afk',
  });

  const updatedPlayers = state.players.map((p, idx) => {
    if (idx === state.activeColorIndex) {
      return { ...p, afkStrikes: newStrikes };
    }
    return p;
  });

  // If in rolling phase, auto-pass or transition
  const nextActiveIndex = getNextActiveColorIndex(
    { ...state, players: updatedPlayers },
    state.activeColorIndex
  );

  return {
    nextState: {
      ...state,
      players: updatedPlayers,
      activeColorIndex: nextActiveIndex,
      phase: 'rolling',
      dice: { ...state.dice, isRolling: false, consecutiveSixes: 0 },
      validTokenMoves: [],
      selectedTokenId: null,
      turnTimeRemaining: state.turnDuration,
      lastMoveTimestamp: Date.now(),
      logs,
    },
    actionTaken: 'skipped',
  };
}
