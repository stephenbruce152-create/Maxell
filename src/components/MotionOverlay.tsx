import React from 'react';
import { Play, Pause, Camera, RotateCcw, Maximize2, Minimize2, Radio } from 'lucide-react';
import { ParticleStats, MotionConfig } from '../types';

interface MotionOverlayProps {
  stats: ParticleStats;
  config: MotionConfig;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onResetCamera: () => void;
  onTriggerScreenshot: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export const MotionOverlay: React.FC<MotionOverlayProps> = ({
  stats,
  config,
  isPlaying,
  onTogglePlay,
  onResetCamera,
  onTriggerScreenshot,
  isFullscreen,
  onToggleFullscreen,
}) => {
  return (
    <div className="pointer-events-none absolute inset-0 select-none overflow-hidden p-6 flex flex-col justify-between">
      {/* Top Bar: Minimalist Motion Design Header */}
      <div className="flex items-center justify-between">
        {/* Title & Status */}
        <div className="flex items-center space-x-3 pointer-events-auto">
          <div className="flex items-center space-x-2.5 bg-black/40 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg">
            <span className="relative flex h-2 w-2">
              {isPlaying && (
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              )}
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isPlaying ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              ></span>
            </span>
            <span className="text-xs font-mono font-medium tracking-wider text-slate-200 uppercase">
              3D Circular Dot Matrix
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-slate-300">
              {config.geometry.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Quick Viewport Controls */}
        <div className="flex items-center space-x-2 pointer-events-auto">
          <button
            id="btn-play-pause"
            onClick={onTogglePlay}
            title={isPlaying ? 'Pause Motion' : 'Resume Motion'}
            className="p-2.5 rounded-xl bg-black/40 hover:bg-white/15 active:scale-95 transition-all text-slate-200 border border-white/10 backdrop-blur-md shadow-sm"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 text-emerald-400" />}
          </button>

          <button
            id="btn-reset-view"
            onClick={onResetCamera}
            title="Reset Camera Angle"
            className="p-2.5 rounded-xl bg-black/40 hover:bg-white/15 active:scale-95 transition-all text-slate-200 border border-white/10 backdrop-blur-md shadow-sm"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            id="btn-screenshot"
            onClick={onTriggerScreenshot}
            title="Capture High-Res Frame"
            className="p-2.5 rounded-xl bg-black/40 hover:bg-white/15 active:scale-95 transition-all text-slate-200 border border-white/10 backdrop-blur-md shadow-sm"
          >
            <Camera className="w-4 h-4" />
          </button>

          <button
            id="btn-fullscreen"
            onClick={onToggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
            className="p-2.5 rounded-xl bg-black/40 hover:bg-white/15 active:scale-95 transition-all text-slate-200 border border-white/10 backdrop-blur-md shadow-sm"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Optical Reticle / Crosshair elements in viewport corners */}
      <div className="absolute top-6 left-6 w-4 h-4 border-t border-l border-white/20 pointer-events-none" />
      <div className="absolute top-6 right-6 w-4 h-4 border-t border-r border-white/20 pointer-events-none" />
      <div className="absolute bottom-6 left-6 w-4 h-4 border-b border-l border-white/20 pointer-events-none" />
      <div className="absolute bottom-6 right-6 w-4 h-4 border-b border-r border-white/20 pointer-events-none" />

      {/* Subtle Hint / Interaction Prompt */}
      <div className="self-center hidden sm:flex items-center space-x-2 text-[11px] font-mono tracking-wide text-slate-400/60 bg-black/25 px-3 py-1 rounded-full backdrop-blur-xs border border-white/5">
        <span>Click to trigger ripple shockwave</span>
        <span>•</span>
        <span>Drag to rotate</span>
        <span>•</span>
        <span>Scroll to zoom</span>
      </div>

      {/* Bottom Telemetry HUD */}
      <div className="flex items-end justify-between">
        {/* Real-time Performance Metrics */}
        <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2.5 flex items-center space-x-5 text-slate-300 pointer-events-auto shadow-lg">
          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Frame Rate</span>
            <span className="text-sm font-mono font-semibold text-slate-100">{stats.fps} FPS</span>
          </div>

          <div className="w-[1px] h-6 bg-white/10" />

          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">3D Dots</span>
            <span className="text-sm font-mono font-semibold text-slate-100">{stats.particles.toLocaleString()}</span>
          </div>

          <div className="w-[1px] h-6 bg-white/10" />

          <div className="flex flex-col">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Kinetic Energy</span>
            <span className="text-sm font-mono font-semibold text-slate-100">{stats.kineticEnergy} J</span>
          </div>

          {config.beatSync && (
            <>
              <div className="w-[1px] h-6 bg-white/10" />
              <div className="flex items-center space-x-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span className="text-xs font-mono font-medium text-cyan-300">{config.bpm} BPM</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
