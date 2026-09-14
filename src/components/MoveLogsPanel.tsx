import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MoveLogItem } from '../types/ludo';
import { COLOR_HEX } from '../utils/ludoCoordinates';

interface MoveLogsPanelProps {
  logs: MoveLogItem[];
}

export const MoveLogsPanel: React.FC<MoveLogsPanelProps> = ({ logs }) => {
  const [isOpen, setIsOpen] = useState(false);

  const lastLog = logs[logs.length - 1];

  return (
    <div className="flex flex-col items-start pointer-events-auto">
      {/* Mini Ticker when closed */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 backdrop-blur-md text-xs text-slate-300 transition shadow-lg cursor-pointer max-w-xs truncate"
      >
        <span className="text-sky-400">📜</span>
        <span className="truncate">
          {lastLog ? lastLog.text : 'Game started'}
        </span>
        <span className="text-[10px] text-slate-500 font-mono">
          {isOpen ? '▲' : '▼'}
        </span>
      </button>

      {/* Expanded Logs Drawer */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: 5 }}
            animate={{ opacity: 1, height: 220, y: 0 }}
            exit={{ opacity: 0, height: 0, y: 5 }}
            className="w-72 mt-2 p-3 bg-slate-900/95 border border-slate-800 rounded-2xl shadow-2xl backdrop-blur-lg overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-2">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Event Log
              </span>
              <span className="text-[10px] text-slate-500">
                {logs.length} actions
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 text-xs scrollbar-thin scrollbar-thumb-slate-700">
              {logs.slice().reverse().map((log) => {
                const hex = COLOR_HEX[log.color];
                return (
                  <div
                    key={log.id}
                    className="p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/60 flex items-start gap-2"
                  >
                    <span
                      className="w-2 h-2 rounded-full mt-1 shrink-0"
                      style={{ backgroundColor: hex ? hex.primary : '#38bdf8' }}
                    />
                    <div className="flex-1 leading-tight text-slate-300">
                      {log.text}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
