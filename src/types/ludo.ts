export type PlayerColor = 'red' | 'green' | 'yellow' | 'blue';

export type PlayerType = 'human' | 'bot' | 'remote';

export type GameMode = 'points_timer' | 'quick_target' | 'classic';

export type MatchTierId = 'micro' | 'low' | 'mid' | 'high';

export interface MatchTierConfig {
  id: MatchTierId;
  name: string;
  entryFeeCoins: number; // e.g. 100
  entryFeeUsd: number;   // e.g. $1.00
  potCoins: number;       // e.g. 200 (for 2 players)
  rakePercent: number;    // e.g. 15%
  rakeCoins: number;      // e.g. 30
  payoutCoins: number;    // e.g. 170
  payoutUsd: number;      // e.g. $1.70
  badgeColor: string;
}

export interface WalletState {
  coins: number;           // 100 coins = $1.00 USD
  totalDeposited: number;  // For 1x turnover requirement
  totalWagered: number;    // Must equal or exceed totalDeposited before cashout
  totalWon: number;
  transactionCount: number;
}

export interface TokenState {
  id: number; // 0, 1, 2, 3
  color: PlayerColor;
  step: number; // -1: Base yard, 0..50: Track, 51..55: Home Runway, 56: Finished Home
  earnedPoints: number; // Tracked individually: points earned by this token (lost if eliminated)
}

export interface PlayerScoreBreakdown {
  movementPoints: number; // 1 point per step advanced
  capturePoints: number;  // 50 points per opponent coin captured
  homePoints: number;     // 100 points per coin reaching home apex
  sixBonusPoints: number; // 6 points for each 6 rolled
  penaltyPoints: number;  // Points lost when tokens were captured
  totalScore: number;
}

export interface Player {
  id: string;
  name: string;
  color: PlayerColor;
  type: PlayerType;
  tokens: TokenState[];
  hasWon: boolean;
  rank: number | null; // 1st, 2nd, 3rd, 4th
  isConnected: boolean;
  avatarSeed: string;
  score: number;
  scoreBreakdown: PlayerScoreBreakdown;
  captures: number;
  tokensHome: number;
  afkStrikes: number;    // 0, 1, 2. 3 = immediate forfeit!
  isForfeited?: boolean;
}

export type GamePhase = 'lobby' | 'rolling' | 'moving' | 'game_over';

export interface DiceState {
  value: number;
  isRolling: boolean;
  rollsLeftThisTurn: number;
  consecutiveSixes: number;
  rollTriggerId?: number; // Unique incremental ID per roll to trigger physical 3D throw
  rollHash?: string;      // CSPRNG verification hash
}

export interface MoveLogItem {
  id: string;
  color: PlayerColor;
  playerName: string;
  text: string;
  timestamp: number;
  type: 'roll' | 'move' | 'capture' | 'home' | 'skip' | 'win' | 'afk' | 'payout';
}

export interface ReactionPing {
  id: string;
  color: PlayerColor;
  emoji: string;
  x: number;
  y: number;
  timestamp: number;
}

export interface LudoGameState {
  roomId: string;
  mode: 'online' | 'local' | 'ai';
  gameMode: GameMode;
  tier: MatchTierId;
  tierConfig: MatchTierConfig;
  playerCount: 2 | 4;
  players: Player[];
  activeColorIndex: number;
  phase: GamePhase;
  dice: DiceState;
  selectedTokenId: number | null;
  validTokenMoves: number[];
  winnerRanking: PlayerColor[];
  logs: MoveLogItem[];
  reactions: ReactionPing[];
  lastMoveTimestamp: number;

  // Match & Turn Clock Engines
  matchTimeRemaining: number; // in seconds, e.g. 300 (5 minutes)
  matchDuration: number;      // total seconds (300)
  turnTimeRemaining: number;  // in seconds, e.g. 12s per turn
  turnDuration: number;       // 12s

  // Winning Condition State
  targetTokensToWin: number; // 2 in Quick Ludo, 4 in Classic
  gameOverReason?: 'timer_expired' | 'target_reached' | 'afk_forfeit' | 'classic_complete';
  forfeitedPlayerColor?: PlayerColor;
}

export interface BoardCellCoord {
  gridX: number; // 0 to 14
  gridY: number; // 0 to 14
  worldX: number; // 3D coordinates
  worldZ: number;
  isSafe: boolean;
  color?: PlayerColor;
  type: 'track' | 'runway' | 'base' | 'home';
}

