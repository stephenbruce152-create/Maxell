import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  LudoGameState,
  PlayerColor,
  PlayerType,
} from './src/types/ludo';
import {
  createInitialGameState,
  getValidMovesForCurrentPlayer,
  processTokenMove,
  chooseBotMove,
  getNextActiveColorIndex,
} from './src/utils/ludoEngine';

interface RoomSession {
  roomId: string;
  hostId: string;
  gameState: LudoGameState;
  clients: Map<string, { ws: WebSocket; color: PlayerColor; name: string }>;
  turnTimer: NodeJS.Timeout | null;
}

const rooms = new Map<string, RoomSession>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function broadcastRoom(room: RoomSession, message: any) {
  const data = JSON.stringify(message);
  for (const client of room.clients.values()) {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

function handleBotTurnIfActive(room: RoomSession) {
  const state = room.gameState;
  if (state.phase === 'game_over') return;

  const activePlayer = state.players[state.activeColorIndex];
  if (!activePlayer || activePlayer.type !== 'bot' || activePlayer.hasWon) return;

  if (state.phase === 'rolling') {
    // Bot rolls after slight delay
    setTimeout(() => {
      if (room.gameState.activeColorIndex !== state.activeColorIndex) return;
      const diceRoll = Math.floor(Math.random() * 6) + 1;
      const validMoves = getValidMovesForCurrentPlayer(room.gameState, diceRoll);

      room.gameState.dice = {
        value: diceRoll,
        isRolling: false,
        rollsLeftThisTurn: 0,
        consecutiveSixes: diceRoll === 6 ? room.gameState.dice.consecutiveSixes + 1 : 0,
        rollTriggerId: (room.gameState.dice.rollTriggerId || 0) + 1,
      };

      if (diceRoll === 6 && activePlayer) {
        activePlayer.scoreBreakdown.sixBonusPoints += 6;
        activePlayer.scoreBreakdown.totalScore += 6;
        activePlayer.score = activePlayer.scoreBreakdown.totalScore;
      }

      if (room.gameState.dice.consecutiveSixes === 3) {
        // 3 sixes penalty!
        room.gameState.activeColorIndex = getNextActiveColorIndex(room.gameState, room.gameState.activeColorIndex);
        room.gameState.phase = 'rolling';
        room.gameState.validTokenMoves = [];
        room.gameState.dice.consecutiveSixes = 0;
        broadcastRoom(room, { type: 'STATE_UPDATE', state: room.gameState });
        handleBotTurnIfActive(room);
        return;
      }

      if (validMoves.length === 0) {
        room.gameState.phase = 'rolling';
        room.gameState.validTokenMoves = [];
        room.gameState.activeColorIndex = getNextActiveColorIndex(room.gameState, room.gameState.activeColorIndex);
        broadcastRoom(room, { type: 'STATE_UPDATE', state: room.gameState });
        handleBotTurnIfActive(room);
      } else {
        room.gameState.phase = 'moving';
        room.gameState.validTokenMoves = validMoves;
        broadcastRoom(room, { type: 'STATE_UPDATE', state: room.gameState });

        // Bot selects move
        setTimeout(() => {
          const chosenTid = chooseBotMove(room.gameState, validMoves);
          const result = processTokenMove(room.gameState, chosenTid);
          room.gameState = result.nextState;
          broadcastRoom(room, { type: 'STATE_UPDATE', state: room.gameState });
          handleBotTurnIfActive(room);
        }, 800);
      }
    }, 900);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;
  const server = http.createServer(app);

  app.use(express.json());

  // Health and API routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  app.get('/api/rooms', (req, res) => {
    res.json({
      activeRooms: rooms.size,
      rooms: Array.from(rooms.keys()).map((code) => ({
        code,
        players: rooms.get(code)?.gameState.players.length || 0,
      })),
    });
  });

  // WebSocket Server for Real-Time Authoritative Multiplayer
  const wss = new WebSocketServer({ server });

  wss.on('connection', (ws: WebSocket) => {
    let currentRoomId: string | null = null;
    let playerId: string | null = null;

    ws.on('message', (rawData: string) => {
      try {
        const payload = JSON.parse(rawData.toString());

        switch (payload.type) {
          case 'CREATE_ROOM': {
            const code = generateRoomCode();
            currentRoomId = code;
            playerId = payload.playerId || `p_${Date.now()}`;
            const hostName = payload.name || 'Player 1';

            const initialPlayers: { name: string; color: PlayerColor; type: PlayerType }[] = [
              { name: hostName, color: 'red', type: 'human' },
              { name: 'Bot Orion', color: 'green', type: 'bot' },
              { name: 'Bot Vega', color: 'yellow', type: 'bot' },
              { name: 'Bot Nova', color: 'blue', type: 'bot' },
            ];

            const initialGameState = createInitialGameState(code, 'online', initialPlayers);
            const room: RoomSession = {
              roomId: code,
              hostId: playerId,
              gameState: initialGameState,
              clients: new Map([[playerId, { ws, color: 'red', name: hostName }]]),
              turnTimer: null,
            };

            rooms.set(code, room);
            ws.send(JSON.stringify({
              type: 'ROOM_CREATED',
              roomId: code,
              assignedColor: 'red',
              playerId,
              state: initialGameState,
            }));
            break;
          }

          case 'JOIN_ROOM': {
            const code = (payload.roomId || '').toUpperCase();
            const room = rooms.get(code);
            if (!room) {
              ws.send(JSON.stringify({ type: 'ERROR', message: 'Room not found. Check code.' }));
              return;
            }

            playerId = payload.playerId || `p_${Date.now()}`;
            currentRoomId = code;
            const playerName = payload.name || `Player ${room.clients.size + 1}`;

            // Find an available color or convert an existing bot slot
            const colors: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];
            let assignedColor: PlayerColor | null = null;

            for (const c of colors) {
              const p = room.gameState.players.find((pl) => pl.color === c);
              if (p && p.type === 'bot') {
                p.type = 'human';
                p.name = playerName;
                p.id = playerId;
                assignedColor = c;
                break;
              }
            }

            if (!assignedColor) {
              ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is full (max 4 players).' }));
              return;
            }

            room.clients.set(playerId, { ws, color: assignedColor, name: playerName });

            ws.send(JSON.stringify({
              type: 'ROOM_JOINED',
              roomId: code,
              assignedColor,
              playerId,
              state: room.gameState,
            }));

            broadcastRoom(room, {
              type: 'STATE_UPDATE',
              state: room.gameState,
              notice: `${playerName} joined as ${assignedColor.toUpperCase()}`,
            });
            break;
          }

          case 'CONFIGURE_PLAYER': {
            if (!currentRoomId) return;
            const room = rooms.get(currentRoomId);
            if (!room) return;

            const { color, type, name } = payload;
            const player = room.gameState.players.find((p) => p.color === color);
            if (player) {
              if (type) player.type = type;
              if (name) player.name = name;
              broadcastRoom(room, { type: 'STATE_UPDATE', state: room.gameState });
            }
            break;
          }

          case 'ROLL_DICE': {
            if (!currentRoomId) return;
            const room = rooms.get(currentRoomId);
            if (!room || room.gameState.phase !== 'rolling') return;

            const activePlayer = room.gameState.players[room.gameState.activeColorIndex];
            const sender = playerId ? room.clients.get(playerId) : null;

            // Enforce player turn authority if sender is human
            if (activePlayer.type === 'human' && sender && sender.color !== activePlayer.color) {
              return; // not this player's turn
            }

            const diceRoll = Math.floor(Math.random() * 6) + 1;
            const validMoves = getValidMovesForCurrentPlayer(room.gameState, diceRoll);

            room.gameState.dice = {
              value: diceRoll,
              isRolling: false,
              rollsLeftThisTurn: 0,
              consecutiveSixes: diceRoll === 6 ? room.gameState.dice.consecutiveSixes + 1 : 0,
              rollTriggerId: (room.gameState.dice.rollTriggerId || 0) + 1,
            };

            if (diceRoll === 6 && activePlayer) {
              activePlayer.scoreBreakdown.sixBonusPoints += 6;
              activePlayer.scoreBreakdown.totalScore += 6;
              activePlayer.score = activePlayer.scoreBreakdown.totalScore;
            }

            // 3 consecutive sixes forfeiture rule
            if (room.gameState.dice.consecutiveSixes === 3) {
              room.gameState.logs.push({
                id: `log-3six-${Date.now()}`,
                color: activePlayer.color,
                playerName: activePlayer.name,
                text: `⚠️ Three 6s rolled in a row! Turn forfeited.`,
                timestamp: Date.now(),
                type: 'skip',
              });
              room.gameState.activeColorIndex = getNextActiveColorIndex(room.gameState, room.gameState.activeColorIndex);
              room.gameState.phase = 'rolling';
              room.gameState.validTokenMoves = [];
              room.gameState.dice.consecutiveSixes = 0;
              broadcastRoom(room, { type: 'STATE_UPDATE', state: room.gameState });
              handleBotTurnIfActive(room);
              return;
            }

            if (validMoves.length === 0) {
              room.gameState.logs.push({
                id: `log-skip-${Date.now()}`,
                color: activePlayer.color,
                playerName: activePlayer.name,
                text: `${activePlayer.name} rolled a ${diceRoll} (No valid moves).`,
                timestamp: Date.now(),
                type: 'skip',
              });
              room.gameState.phase = 'rolling';
              room.gameState.validTokenMoves = [];
              room.gameState.activeColorIndex = getNextActiveColorIndex(room.gameState, room.gameState.activeColorIndex);
              broadcastRoom(room, { type: 'STATE_UPDATE', state: room.gameState });
              handleBotTurnIfActive(room);
            } else {
              room.gameState.phase = 'moving';
              room.gameState.validTokenMoves = validMoves;
              broadcastRoom(room, { type: 'STATE_UPDATE', state: room.gameState });
            }
            break;
          }

          case 'MOVE_TOKEN': {
            if (!currentRoomId) return;
            const room = rooms.get(currentRoomId);
            if (!room || room.gameState.phase !== 'moving') return;

            const { tokenId } = payload;
            const activePlayer = room.gameState.players[room.gameState.activeColorIndex];
            const sender = playerId ? room.clients.get(playerId) : null;

            if (activePlayer.type === 'human' && sender && sender.color !== activePlayer.color) {
              return;
            }

            if (!room.gameState.validTokenMoves.includes(tokenId)) {
              return;
            }

            const result = processTokenMove(room.gameState, tokenId);
            room.gameState = result.nextState;

            broadcastRoom(room, {
              type: 'STATE_UPDATE',
              state: room.gameState,
              capturedToken: result.capturedToken,
              reachedHome: result.reachedHome,
            });

            handleBotTurnIfActive(room);
            break;
          }

          case 'SEND_REACTION': {
            if (!currentRoomId) return;
            const room = rooms.get(currentRoomId);
            if (!room) return;

            const sender = playerId ? room.clients.get(playerId) : null;
            const color = sender ? sender.color : 'red';
            const reaction = {
              id: `rx-${Date.now()}-${Math.random()}`,
              color,
              emoji: payload.emoji || '🔥',
              x: payload.x || 0,
              y: payload.y || 0,
              timestamp: Date.now(),
            };

            broadcastRoom(room, { type: 'NEW_REACTION', reaction });
            break;
          }

          case 'RESTART_GAME': {
            if (!currentRoomId) return;
            const room = rooms.get(currentRoomId);
            if (!room) return;

            const playerConfigs = room.gameState.players.map((p) => ({
              name: p.name,
              color: p.color,
              type: p.type,
            }));
            room.gameState = createInitialGameState(currentRoomId, 'online', playerConfigs);
            broadcastRoom(room, { type: 'STATE_UPDATE', state: room.gameState });
            break;
          }
        }
      } catch (err) {
        console.error('WebSocket message parsing error:', err);
      }
    });

    ws.on('close', () => {
      if (currentRoomId && playerId) {
        const room = rooms.get(currentRoomId);
        if (room) {
          room.clients.delete(playerId);
          if (room.clients.size === 0) {
            rooms.delete(currentRoomId);
          }
        }
      }
    });
  });

  // Vite middleware integration for React client
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Ludo 3D Multiplayer server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
