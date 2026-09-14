import React from 'react';
import { motion } from 'motion/react';
import { soundEngine } from '../utils/audio';

interface ReactionsBarProps {
  onSendReaction: (emoji: string) => void;
}

const EMOJIS = ['🔥', '🎲', '👑', '💥', '⚡', '😭', '🎯', '🚀'];

export const ReactionsBar: React.FC<ReactionsBarProps> = ({ onSendReaction }) => {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-slate-900/80 border border-slate-800/80 backdrop-blur-md shadow-lg pointer-events-auto">
      {EMOJIS.map((emoji) => (
        <motion.button
          key={emoji}
          whileHover={{ scale: 1.25, y: -2 }}
          whileTap={{ scale: 0.9 }}
          onClick={() => {
            soundEngine.playClick();
            onSendReaction(emoji);
          }}
          className="text-base p-1 rounded-full hover:bg-slate-800/60 transition cursor-pointer"
          title={`Send ${emoji}`}
        >
          {emoji}
        </motion.button>
      ))}
    </div>
  );
};
