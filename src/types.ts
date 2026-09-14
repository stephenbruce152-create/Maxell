export type GeometryType = 
  | 'sphere' 
  | 'orbital-rings' 
  | 'torus' 
  | 'galaxy-spiral' 
  | 'wave-surface' 
  | 'macro-orb';

export type MotionMode = 
  | 'harmonic-wave' 
  | 'pulse-heartbeat' 
  | 'vortex-twist' 
  | 'quantum-flux' 
  | 'dispersion-snap';

export type DotStyle = 'soft-glow' | 'crisp-modern' | 'ring-dot';

export interface ColorTheme {
  id: string;
  name: string;
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  ambientLight: string;
}

export interface MotionConfig {
  geometry: GeometryType;
  motionMode: MotionMode;
  dotStyle: DotStyle;
  themeId: string;
  customPrimaryColor: string;
  customSecondaryColor: string;
  
  // Motion physics
  speed: number;            // 0.1 to 3.0
  waveAmplitude: number;    // 0 to 2.0
  waveFrequency: number;    // 0.5 to 5.0
  twistFactor: number;      // 0 to 2.0
  noiseTurbulence: number;  // 0 to 1.5
  
  // Visuals
  dotSize: number;          // 2 to 24
  dotCount: number;         // 2000 to 18000
  bloomIntensity: number;   // 0 to 1.5
  depthFading: boolean;
  
  // Motion Graphic dynamics
  beatSync: boolean;
  bpm: number;              // 60 to 160
  mouseInteraction: boolean;
  autoRotate: boolean;
  wireframeConnections: boolean;
}

export interface ParticleStats {
  fps: number;
  particles: number;
  rotationalVelocity: number;
  kineticEnergy: number;
}
