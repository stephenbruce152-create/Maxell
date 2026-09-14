import React, { useState } from 'react';
import { motion } from 'motion/react';
import { PlayerColor, PlayerType } from '../types/ludo';
import { COLOR_HEX } from '../utils/ludoCoordinates';
import { soundEngine } from '../utils/audio';

interface RoomLobbyModalProps {
  isOpen: boolean;
  onClose?: () => void;
  onStartSinglePlayer: (playerName: string) => void;
  onStartLocalPassAndPlay: (configs: { name: string; color: PlayerColor; type: PlayerType }[]) => void;
  onCreateOnlineRoom: (playerName: string) => void;
  onJoinOnlineRoom: (roomId: string, playerName: string) => void;
  onlineRoomCode?: string;
  isConnecting?: boolean;
}

export const RoomLobbyModal: React.FC<RoomLobbyModalProps> = ({
  isOpen,
  onClose,
  onStartSinglePlayer,
  onStartLocalPassAndPlay,
  onCreateOnlineRoom,
  onJoinOnlineRoom,
  onlineRoomCode,
  isConnecting,
}) => {
  const [tab, setTab] = useState<'quick' | 'online' | 'local'>('quick');
  const [playerName, setPlayerName] = useState('Player 1');
  const [joinCode, setJoinCode] = useState('');
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(4);

  const [localNames, setLocalNames] = useState<Record<PlayerColor, string>>({
    red: 'Red Chief',
    green: 'Green Ranger',
    yellow: 'Yellow Flash',
    blue: 'Blue Voyager',
  });

  const [localTypes, setLocalTypes] = useState<Record<PlayerColor, PlayerType>>({
    red: 'human',
    green: 'human',
    yellow: 'bot',
    blue: 'bot',
  });

  if (!isOpen) return null;

  const handleStartLocal = () => {
    soundEngine.playClick();
    const colors: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];
    const selectedColors = colors.slice(0, playerCount);
    const configs = selectedColors.map((color) => ({
      name: localNames[color] || color.toUpperCase(),
      color,
      type: localTypes[color],
    }));
    onStartLocalPassAndPlay(configs);
  };

  const handleStartSingle = () => {
    soundEngine.playClick();
    onStartSinglePlayer(playerName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl text-slate-100 flex flex-col gap-5 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 flex items-center justify-center border border-sky-500/40">
              <span className="text-base">🎲</span>
            </div>
            <div>
              <h2 className="text-lg font-bold tracking-tight text-white">
                3D Kinetic Ludo
              </h2>
              <p className="text-xs text-slate-400">
                Circular Dot Motion Graphics Multiplayer
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              ✕
            </button>
          )}
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-950/70 rounded-2xl border border-slate-800/80">
          <button
            onClick={() => setTab('quick')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold transition ${
              tab === 'quick'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Solo vs AI
          </button>
          <button
            onClick={() => setTab('online')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold transition ${
              tab === 'online'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Online Room
          </button>
          <button
            onClick={() => setTab('local')}
            className={`py-2 px-3 rounded-xl text-xs font-semibold transition ${
              tab === 'local'
                ? 'bg-sky-500 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Pass & Play
          </button>
        </div>

        {/* Player Name Input */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-medium text-slate-400">Your Nickname</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            maxLength={18}
            placeholder="Enter nickname"
            className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-sm focus:outline-none focus:border-sky-500 text-white"
          />
        </div>

        {/* Tab 1: Solo vs AI */}
        {tab === 'quick' && (
          <div className="flex flex-col gap-4 py-2">
            <div className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                <span className="text-slate-300">You (Red Chief)</span>
              </div>
              <span className="text-slate-400 font-mono">VS 3 AI Bots</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Instant match with 3 intelligent computer bots equipped with tactical capture heuristics and circular dot motion dynamics.
            </p>

            <button
              onClick={handleStartSingle}
              className="w-full py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm transition shadow-lg shadow-sky-500/30 cursor-pointer"
            >
              Start Game Now
            </button>
          </div>
        )}

        {/* Tab 2: Online Multiplayer Room */}
        {tab === 'online' && (
          <div className="flex flex-col gap-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Create Room */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Create Room</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Host a real-time room and invite friends via 6-digit code.
                  </p>
                </div>
                <button
                  onClick={() => onCreateOnlineRoom(playerName)}
                  disabled={isConnecting}
                  className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition shadow cursor-pointer disabled:opacity-50"
                >
                  {isConnecting ? 'Connecting...' : 'Host New Room'}
                </button>
              </div>

              {/* Join Room */}
              <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex flex-col justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">Join Room</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Enter code from host.
                  </p>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    placeholder="CODE"
                    className="w-20 px-2 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-center font-mono font-bold tracking-widest text-sky-400 uppercase"
                  />
                  <button
                    onClick={() => onJoinOnlineRoom(joinCode, playerName)}
                    disabled={joinCode.length < 4 || isConnecting}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition cursor-pointer disabled:opacity-40"
                  >
                    Join
                  </button>
                </div>
              </div>
            </div>

            {onlineRoomCode && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
                <span className="text-emerald-300">Room Created:</span>
                <span className="font-mono font-bold text-emerald-400 tracking-wider">
                  {onlineRoomCode}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Local Pass & Play */}
        {tab === 'local' && (
          <div className="flex flex-col gap-4 py-1">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-slate-400">Number of Players</label>
              <div className="flex gap-2">
                {([2, 3, 4] as const).map((cnt) => (
                  <button
                    key={cnt}
                    onClick={() => setPlayerCount(cnt)}
                    className={`w-8 h-8 rounded-lg text-xs font-bold transition ${
                      playerCount === cnt
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cnt}
                  </button>
                ))}
              </div>
            </div>

            {/* Customise each slot */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {(['red', 'green', 'yellow', 'blue'] as PlayerColor[])
                .slice(0, playerCount)
                .map((color) => {
                  const hex = COLOR_HEX[color];
                  return (
                    <div
                      key={color}
                      className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: hex.primary }}
                        />
                        <input
                          type="text"
                          value={localNames[color]}
                          onChange={(e) =>
                            setLocalNames({ ...localNames, [color]: e.target.value })
                          }
                          className="w-24 text-xs font-semibold bg-transparent text-white focus:outline-none"
                        />
                      </div>

                      <button
                        onClick={() =>
                          setLocalTypes({
                            ...localTypes,
                            [color]: localTypes[color] === 'human' ? 'bot' : 'human',
                          })
                        }
                        className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                          localTypes[color] === 'human'
                            ? 'bg-sky-500/20 text-sky-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {localTypes[color] === 'human' ? '👤 Human' : '🤖 Bot'}
                      </button>
                    </div>
                  );
                })}
            </div>

            <button
              onClick={handleStartLocal}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm transition shadow-lg shadow-sky-500/30 cursor-pointer"
            >
              Start Pass & Play Match
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
