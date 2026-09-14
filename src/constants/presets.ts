import { ColorTheme, GeometryType, MotionConfig, MotionMode } from '../types';

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'cyber-neon',
    name: 'Cyber Neon',
    primary: '#00f2fe',
    secondary: '#4facfe',
    accent: '#ff0844',
    background: '#060913',
    ambientLight: '#0d1b2a',
  },
  {
    id: 'deep-aurora',
    name: 'Deep Aurora',
    primary: '#10b981',
    secondary: '#06b6d4',
    accent: '#8b5cf6',
    background: '#040d12',
    ambientLight: '#183b4e',
  },
  {
    id: 'solar-flare',
    name: 'Solar Flare',
    primary: '#ff8008',
    secondary: '#ffc837',
    accent: '#ff3366',
    background: '#120707',
    ambientLight: '#30130d',
  },
  {
    id: 'quantum-violet',
    name: 'Quantum Violet',
    primary: '#c084fc',
    secondary: '#f43f5e',
    accent: '#38bdf8',
    background: '#0b0614',
    ambientLight: '#24123a',
  },
  {
    id: 'monochrome-platinum',
    name: 'Monochrome Luxe',
    primary: '#ffffff',
    secondary: '#94a3b8',
    accent: '#64748b',
    background: '#090a0f',
    ambientLight: '#1e293b',
  },
  {
    id: 'emerald-matrix',
    name: 'Emerald Matrix',
    primary: '#22c55e',
    secondary: '#a3e635',
    accent: '#34d399',
    background: '#03120a',
    ambientLight: '#064e3b',
  },
];

export const GEOMETRIES: { id: GeometryType; label: string; iconName: string; desc: string }[] = [
  { id: 'sphere', label: 'Dot Sphere', iconName: 'CircleDot', desc: 'True 3D spherical particle dot matrix' },
  { id: 'orbital-rings', label: 'Orbital Rings', iconName: 'Disc', desc: 'Concentric 3D kinetic spinning rings' },
  { id: 'torus', label: 'Torus Loop', iconName: 'Donut', desc: 'Hypnotic helical toroidal dot ribbon' },
  { id: 'galaxy-spiral', label: 'Vortex Spiral', iconName: 'Loader', desc: 'Fibonacci spiral logarithmic galaxy' },
  { id: 'wave-surface', label: 'Wave Field', iconName: 'Waves', desc: 'Radial circular undulating dot plane' },
  { id: 'macro-orb', label: 'Core Orb', iconName: 'Atom', desc: 'Multi-layer dense core with energetic halo' },
];

export const MOTION_MODES: { id: MotionMode; label: string; desc: string }[] = [
  { id: 'harmonic-wave', label: 'Harmonic Wave', desc: 'Multi-frequency rhythmic undulating ripples' },
  { id: 'pulse-heartbeat', label: 'Pulse Rhythm', desc: 'Cardioid expansion with kinetic shockwaves' },
  { id: 'vortex-twist', label: 'Torsional Vortex', desc: 'Twisting angular velocity along coordinate axes' },
  { id: 'quantum-flux', label: 'Quantum Flux', desc: 'Organic turbulence and magnetic levitation' },
  { id: 'dispersion-snap', label: 'Disperse & Snap', desc: 'Periodic spatial dispersion and magnetic collapse' },
];

export const DEFAULT_CONFIG: MotionConfig = {
  geometry: 'sphere',
  motionMode: 'harmonic-wave',
  dotStyle: 'soft-glow',
  themeId: 'cyber-neon',
  customPrimaryColor: '#00f2fe',
  customSecondaryColor: '#ff0844',
  
  speed: 1.0,
  waveAmplitude: 0.8,
  waveFrequency: 2.2,
  twistFactor: 0.6,
  noiseTurbulence: 0.5,
  
  dotSize: 7.5,
  dotCount: 8000,
  bloomIntensity: 0.8,
  depthFading: true,
  
  beatSync: true,
  bpm: 110,
  mouseInteraction: true,
  autoRotate: true,
  wireframeConnections: false,
};
