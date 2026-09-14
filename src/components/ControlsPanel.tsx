import React, { useState } from 'react';
import {
  Sliders,
  Palette,
  Layers,
  Activity,
  ChevronDown,
  ChevronUp,
  Sparkles,
  MousePointer,
  RotateCw,
  Shuffle,
  Music,
} from 'lucide-react';
import { MotionConfig, GeometryType, MotionMode, DotStyle } from '../types';
import { COLOR_THEMES, GEOMETRIES, MOTION_MODES } from '../constants/presets';

interface ControlsPanelProps {
  config: MotionConfig;
  onChange: (newConfig: MotionConfig) => void;
  onRandomize: () => void;
}

type TabType = 'geometry' | 'motion' | 'visuals' | 'colors';

export const ControlsPanel: React.FC<ControlsPanelProps> = ({
  config,
  onChange,
  onRandomize,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<TabType>('geometry');

  const updateConfig = <K extends keyof MotionConfig>(key: K, value: MotionConfig[K]) => {
    onChange({ ...config, [key]: value });
  };

  return (
    <div className="absolute right-6 bottom-6 z-20 w-80 sm:w-96 flex flex-col pointer-events-auto">
      <div className="bg-slate-950/85 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200 transition-all duration-300">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/5">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Sparkles className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold tracking-wide uppercase font-mono text-slate-100">
              Motion Engine
            </span>
          </div>

          <div className="flex items-center space-x-1.5">
            <button
              id="btn-randomize-motion"
              onClick={onRandomize}
              title="Surprise / Randomize Configuration"
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            >
              <Shuffle className="w-4 h-4" />
            </button>
            <button
              id="btn-collapse-panel"
              onClick={() => setIsCollapsed(!isCollapsed)}
              title={isCollapsed ? 'Expand Controls' : 'Collapse Controls'}
              className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            >
              {isCollapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {!isCollapsed && (
          <>
            {/* Tabs Row */}
            <div className="flex border-b border-white/10 bg-black/30 p-1 gap-1">
              <button
                id="tab-geometry"
                onClick={() => setActiveTab('geometry')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                  activeTab === 'geometry'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Form</span>
              </button>

              <button
                id="tab-motion"
                onClick={() => setActiveTab('motion')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                  activeTab === 'motion'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span>Kinetic</span>
              </button>

              <button
                id="tab-visuals"
                onClick={() => setActiveTab('visuals')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                  activeTab === 'visuals'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Dots</span>
              </button>

              <button
                id="tab-colors"
                onClick={() => setActiveTab('colors')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                  activeTab === 'colors'
                    ? 'bg-white/15 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Palette</span>
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-4 max-h-72 overflow-y-auto space-y-4 text-xs">
              {/* TAB 1: GEOMETRY FORMATION */}
              {activeTab === 'geometry' && (
                <div className="space-y-3">
                  <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider">
                    3D Formation Archetype
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {GEOMETRIES.map((g) => {
                      const isSelected = config.geometry === g.id;
                      return (
                        <button
                          key={g.id}
                          id={`geo-${g.id}`}
                          onClick={() => updateConfig('geometry', g.id as GeometryType)}
                          className={`p-2.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                            isSelected
                              ? 'bg-cyan-500/20 border-cyan-400/60 text-white shadow-md'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <span className="font-semibold text-xs text-slate-100">{g.label}</span>
                          <span className="text-[10px] text-slate-400 mt-1 line-clamp-1">{g.desc}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Dot Style Selector */}
                  <div className="pt-2 border-t border-white/10">
                    <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider block mb-2">
                      Circular Dot Silhouette
                    </span>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(['soft-glow', 'crisp-modern', 'ring-dot'] as DotStyle[]).map((style) => (
                        <button
                          key={style}
                          onClick={() => updateConfig('dotStyle', style)}
                          className={`py-1.5 px-2 rounded-lg border text-center font-mono capitalize transition-all ${
                            config.dotStyle === style
                              ? 'bg-white/20 border-white/40 text-white'
                              : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {style.replace('-', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: MOTION & KINETICS */}
              {activeTab === 'motion' && (
                <div className="space-y-3.5">
                  <div>
                    <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider block mb-2">
                      Motion Mode Preset
                    </span>
                    <div className="grid grid-cols-1 gap-1.5">
                      {MOTION_MODES.map((m) => (
                        <button
                          key={m.id}
                          id={`motion-${m.id}`}
                          onClick={() => updateConfig('motionMode', m.id as MotionMode)}
                          className={`px-3 py-2 rounded-xl border text-left flex items-center justify-between transition-all ${
                            config.motionMode === m.id
                              ? 'bg-cyan-500/20 border-cyan-400/60 text-white shadow-sm'
                              : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                          }`}
                        >
                          <div>
                            <div className="font-medium text-xs">{m.label}</div>
                            <div className="text-[10px] text-slate-400">{m.desc}</div>
                          </div>
                          {config.motionMode === m.id && (
                            <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0 ml-2" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Physics Sliders */}
                  <div className="space-y-3 pt-2 border-t border-white/10">
                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
                        <span>Speed</span>
                        <span className="text-slate-200">{config.speed.toFixed(1)}x</span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="2.5"
                        step="0.1"
                        value={config.speed}
                        onChange={(e) => updateConfig('speed', parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
                        <span>Wave Amplitude</span>
                        <span className="text-slate-200">{config.waveAmplitude.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="2.0"
                        step="0.1"
                        value={config.waveAmplitude}
                        onChange={(e) => updateConfig('waveAmplitude', parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
                        <span>Wave Frequency</span>
                        <span className="text-slate-200">{config.waveFrequency.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.5"
                        max="4.5"
                        step="0.1"
                        value={config.waveFrequency}
                        onChange={(e) => updateConfig('waveFrequency', parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
                        <span>Torsional Twist</span>
                        <span className="text-slate-200">{config.twistFactor.toFixed(1)}</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="2.0"
                        step="0.1"
                        value={config.twistFactor}
                        onChange={(e) => updateConfig('twistFactor', parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: VISUALS & DYNAMICS */}
              {activeTab === 'visuals' && (
                <div className="space-y-3.5">
                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
                      <span>Dot Size Scale</span>
                      <span className="text-slate-200">{config.dotSize.toFixed(1)}px</span>
                    </div>
                    <input
                      type="range"
                      min="3.0"
                      max="18.0"
                      step="0.5"
                      value={config.dotSize}
                      onChange={(e) => updateConfig('dotSize', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
                      <span>Dot Density (Particle Count)</span>
                      <span className="text-slate-200">{config.dotCount.toLocaleString()}</span>
                    </div>
                    <input
                      type="range"
                      min="3000"
                      max="14000"
                      step="1000"
                      value={config.dotCount}
                      onChange={(e) => updateConfig('dotCount', parseInt(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
                      <span>Bloom Luminescence</span>
                      <span className="text-slate-200">{config.bloomIntensity.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.0"
                      max="1.5"
                      step="0.1"
                      value={config.bloomIntensity}
                      onChange={(e) => updateConfig('bloomIntensity', parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                    />
                  </div>

                  {/* Toggles */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <label className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10">
                      <div className="flex items-center space-x-2">
                        <RotateCw className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-200">Auto Orbit Camera</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.autoRotate}
                        onChange={(e) => updateConfig('autoRotate', e.target.checked)}
                        className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
                      />
                    </label>

                    <label className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10">
                      <div className="flex items-center space-x-2">
                        <MousePointer className="w-4 h-4 text-slate-400" />
                        <span className="text-xs text-slate-200">Pointer Repulsion</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.mouseInteraction}
                        onChange={(e) => updateConfig('mouseInteraction', e.target.checked)}
                        className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              )}

              {/* TAB 4: COLOR PALETTES & BEAT */}
              {activeTab === 'colors' && (
                <div className="space-y-3.5">
                  <span className="text-[11px] font-mono uppercase text-slate-400 tracking-wider block">
                    Curated Motion Palettes
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {COLOR_THEMES.map((t) => {
                      const isSelected = config.themeId === t.id;
                      return (
                        <button
                          key={t.id}
                          id={`theme-${t.id}`}
                          onClick={() => updateConfig('themeId', t.id)}
                          className={`p-2 rounded-xl border text-left transition-all ${
                            isSelected
                              ? 'bg-white/20 border-white/40 shadow-sm'
                              : 'bg-white/5 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          <div className="flex items-center space-x-1.5 mb-1.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                              style={{ backgroundColor: t.primary }}
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                              style={{ backgroundColor: t.secondary }}
                            />
                            <span
                              className="w-3.5 h-3.5 rounded-full border border-white/20 shrink-0"
                              style={{ backgroundColor: t.accent }}
                            />
                          </div>
                          <span className="text-xs font-medium text-slate-100 block">{t.name}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Beat Sync Section */}
                  <div className="pt-2 border-t border-white/10 space-y-2">
                    <label className="flex items-center justify-between p-2 rounded-lg bg-white/5 border border-white/10 cursor-pointer hover:bg-white/10">
                      <div className="flex items-center space-x-2">
                        <Music className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs text-slate-200">Beat Pulse Sync</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={config.beatSync}
                        onChange={(e) => updateConfig('beatSync', e.target.checked)}
                        className="w-4 h-4 rounded accent-cyan-400 cursor-pointer"
                      />
                    </label>

                    {config.beatSync && (
                      <div className="pl-1 pt-1">
                        <div className="flex justify-between text-[11px] text-slate-400 font-mono mb-1">
                          <span>Tempo BPM</span>
                          <span className="text-cyan-300">{config.bpm} BPM</span>
                        </div>
                        <input
                          type="range"
                          min="70"
                          max="150"
                          step="2"
                          value={config.bpm}
                          onChange={(e) => updateConfig('bpm', parseInt(e.target.value))}
                          className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
