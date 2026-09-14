import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { MotionConfig, ParticleStats } from '../types';
import { generateGeometryPositions } from '../utils/geometryGenerators';
import { COLOR_THEMES } from '../constants/presets';

interface ThreeCanvasProps {
  config: MotionConfig;
  isPlaying: boolean;
  onStatsUpdate: (stats: ParticleStats) => void;
  screenshotTrigger: number;
}

// Vertex shader with kinetic wave mathematics and 3D pointer physics
const vertexShader = `
  uniform float uTime;
  uniform float uSpeed;
  uniform float uWaveAmp;
  uniform float uWaveFreq;
  uniform float uTwist;
  uniform float uTurbulence;
  uniform float uBeat;
  uniform float uMorphProgress;
  uniform float uBaseDotSize;
  uniform int uMotionMode;
  uniform vec3 uColorPrimary;
  uniform vec3 uColorSecondary;
  uniform vec3 uColorAccent;
  uniform vec3 uMousePos;
  uniform float uMouseActive;
  uniform float uShockwaveTime;
  uniform vec3 uShockwaveOrigin;

  attribute vec3 aTargetPosition;
  attribute float aRandomSeed;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vWaveIntensity;

  // Simple pseudo 3D sine-based noise for organic motion
  float pseudoNoise(vec3 p) {
    return sin(p.x * 2.1 + uTime * 0.8) * cos(p.y * 2.3 + uTime * 0.7) * sin(p.z * 2.5 + uTime * 0.9);
  }

  void main() {
    // 1. Morph between current position and target position
    // Ease-in-out cubic morph curve
    float t = clamp(uMorphProgress, 0.0, 1.0);
    float morphEase = t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
    vec3 basePos = mix(position, aTargetPosition, morphEase);

    vec3 animatedPos = basePos;
    float distFromCenter = length(basePos);
    float waveOffset = 0.0;

    // 2. Motion Graphics Dynamics based on selected Motion Mode
    if (uMotionMode == 0) {
      // Harmonic Wave: Spherical and radial harmonic oscillations
      float wavePhase = distFromCenter * uWaveFreq - uTime * uSpeed * 2.5;
      waveOffset = sin(wavePhase) * uWaveAmp * 0.35;
      waveOffset += cos(basePos.y * uWaveFreq * 1.5 + uTime * uSpeed) * uWaveAmp * 0.15;
      
      vec3 norm = distFromCenter > 0.001 ? normalize(basePos) : vec3(0.0, 1.0, 0.0);
      animatedPos += norm * waveOffset;

    } else if (uMotionMode == 1) {
      // Pulse Rhythm / Heartbeat: Systolic contraction & dynamic expansion
      float pulseCycle = uTime * uSpeed * 2.2;
      float heartbeat = pow(sin(pulseCycle) * 0.5 + 0.5, 6.0) * 0.35;
      heartbeat += sin(pulseCycle * 2.0) * 0.1;
      
      // Add beat impulse injection
      float totalPulse = heartbeat + uBeat * 0.35;
      animatedPos *= (1.0 + totalPulse * uWaveAmp);
      waveOffset = totalPulse;

    } else if (uMotionMode == 2) {
      // Torsional Vortex: Swirling angular rotation differential along Y
      float angle = basePos.y * uTwist * 1.2 + uTime * uSpeed * 1.8;
      float c = cos(angle);
      float s = sin(angle);
      float newX = animatedPos.x * c - animatedPos.z * s;
      float newZ = animatedPos.x * s + animatedPos.z * c;
      animatedPos.x = newX;
      animatedPos.z = newZ;
      animatedPos.y += sin(distFromCenter * 2.0 - uTime * 2.0) * uWaveAmp * 0.2;
      waveOffset = abs(sin(angle));

    } else if (uMotionMode == 3) {
      // Quantum Flux: Fluid organic turbulence & levitation
      vec3 noiseVector = vec3(
        pseudoNoise(basePos + vec3(1.0, 0.0, 0.0)),
        pseudoNoise(basePos + vec3(0.0, 2.0, 0.0)),
        pseudoNoise(basePos + vec3(0.0, 0.0, 3.0))
      );
      animatedPos += noiseVector * uTurbulence * 0.45 * (1.0 + uWaveAmp * 0.5);
      waveOffset = length(noiseVector);

    } else if (uMotionMode == 4) {
      // Disperse & Snap: Rhythmic explosion & magnetic snapping
      float cycle = mod(uTime * uSpeed * 0.65, 3.0);
      float explosion = 0.0;
      if (cycle < 1.2) {
        // Explode outward with easing
        float progress = cycle / 1.2;
        explosion = sin(progress * 3.14159) * 1.6 * uWaveAmp;
      }
      vec3 norm = distFromCenter > 0.001 ? normalize(basePos) : vec3(0.0, 1.0, 0.0);
      animatedPos += norm * explosion * (1.0 + aRandomSeed * 0.4);
      waveOffset = explosion;
    }

    // 3. Pointer Repulsion Physics
    if (uMouseActive > 0.5) {
      vec3 diff = animatedPos - uMousePos;
      float mouseDist = length(diff);
      float repulsionRadius = 1.6;
      if (mouseDist < repulsionRadius && mouseDist > 0.001) {
        float factor = (1.0 - mouseDist / repulsionRadius);
        factor = factor * factor * 0.9;
        animatedPos += normalize(diff) * factor;
      }
    }

    // 4. Click Ripple Shockwave Propagation
    if (uShockwaveTime > 0.0) {
      float shockAge = uTime - uShockwaveTime;
      if (shockAge > 0.0 && shockAge < 2.0) {
        float shockRadius = shockAge * 3.8; // wave traveling speed
        float distToOrigin = length(basePos - uShockwaveOrigin);
        float waveDiff = abs(distToOrigin - shockRadius);
        if (waveDiff < 0.6) {
          float wavePower = (1.0 - waveDiff / 0.6) * (1.0 - shockAge / 2.0);
          vec3 dir = distToOrigin > 0.001 ? normalize(basePos - uShockwaveOrigin) : vec3(0.0, 1.0, 0.0);
          animatedPos += dir * wavePower * 0.55;
          waveOffset += wavePower;
        }
      }
    }

    // 5. Dynamic Color Gradient computation
    float heightNorm = clamp((animatedPos.y + 2.5) / 5.0, 0.0, 1.0);
    float radialNorm = clamp(distFromCenter / 3.5, 0.0, 1.0);
    
    // Smooth gradient mixture: primary -> secondary with accent peaks
    vec3 grad = mix(uColorPrimary, uColorSecondary, heightNorm);
    float accentMix = clamp(waveOffset * 1.4 + uBeat * 0.3, 0.0, 1.0);
    vec3 finalColor = mix(grad, uColorAccent, accentMix * 0.6);

    vColor = finalColor;
    vAlpha = clamp(0.65 + radialNorm * 0.35, 0.3, 1.0);
    vWaveIntensity = waveOffset;

    // 6. View & Projection Transform with Size Depth Attenuation
    vec4 mvPosition = modelViewMatrix * vec4(animatedPos, 1.0);
    gl_Position = projectionMatrix * mvPosition;

    // Scale dot size inversely with camera depth for true 3D perspective
    float sizeMultiplier = 1.0 + waveOffset * 0.45 + uBeat * 0.3;
    gl_PointSize = uBaseDotSize * sizeMultiplier * (220.0 / -mvPosition.z);
    
    // Minimum clamp so dots stay crisp and visible
    gl_PointSize = max(gl_PointSize, 1.5);
  }
`;

// Fragment shader rendering mathematically perfect antialiased circular dots
const fragmentShader = `
  uniform int uDotStyle; // 0: soft-glow, 1: crisp-modern, 2: ring-dot
  uniform float uBloomIntensity;
  uniform float uDepthFading;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vWaveIntensity;

  void main() {
    // Distance from center of point sprite: [0.0 to 0.5]
    vec2 coord = gl_PointCoord - vec2(0.5);
    float dist = length(coord);

    // Hard clip outside unit circle
    if (dist > 0.5) {
      discard;
    }

    float shapeAlpha = 1.0;

    if (uDotStyle == 0) {
      // Soft Glow: smooth radial gradient with luminous core
      float edgeAlpha = 1.0 - smoothstep(0.05, 0.5, dist);
      float centerCore = pow(1.0 - dist * 2.0, 2.5) * 0.8;
      shapeAlpha = edgeAlpha + centerCore;

    } else if (uDotStyle == 1) {
      // Crisp Modern: vector antialiased circular dot
      shapeAlpha = 1.0 - smoothstep(0.42, 0.49, dist);

    } else if (uDotStyle == 2) {
      // Ring Dot: circular hollow ring contour with clean edge
      float outer = 1.0 - smoothstep(0.44, 0.49, dist);
      float inner = smoothstep(0.24, 0.29, dist);
      shapeAlpha = outer * inner * 1.2;
    }

    float finalAlpha = shapeAlpha * vAlpha;
    if (finalAlpha < 0.02) {
      discard;
    }

    // Bloom brightness boost on wave peaks
    vec3 boostedColor = vColor * (1.0 + uBloomIntensity * 0.5 + vWaveIntensity * 0.4);

    gl_FragColor = vec4(boostedColor, finalAlpha);
  }
`;

export const ThreeCanvas: React.FC<ThreeCanvasProps> = ({
  config,
  isPlaying,
  onStatsUpdate,
  screenshotTrigger,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  // Three.js instances refs
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const geometryRef = useRef<THREE.BufferGeometry | null>(null);

  // Motion dynamics state
  const timeRef = useRef<number>(0);
  const frameIdRef = useRef<number>(0);
  const prevTimeRef = useRef<number>(performance.now());
  const fpsCountRef = useRef<number>(60);
  const fpsTimerRef = useRef<number>(performance.now());
  const framesRenderedRef = useRef<number>(0);

  // Pointer & Camera drag state
  const isDraggingRef = useRef<boolean>(false);
  const prevPointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const cameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0,
    phi: Math.PI / 2.3,
    radius: 6.8,
  });
  const targetCameraAngleRef = useRef<{ theta: number; phi: number; radius: number }>({
    theta: 0,
    phi: Math.PI / 2.3,
    radius: 6.8,
  });
  const mouseProjectedRef = useRef<THREE.Vector3>(new THREE.Vector3(999, 999, 999));
  const mouseActiveRef = useRef<boolean>(false);
  const shockwaveStateRef = useRef<{ time: number; origin: THREE.Vector3 }>({
    time: -10,
    origin: new THREE.Vector3(0, 0, 0),
  });

  // Morphing tracking
  const currentGeometryTypeRef = useRef(config.geometry);
  const morphStartTimeRef = useRef<number>(0);
  const isMorphingRef = useRef<boolean>(false);
  const currentPositionsArrayRef = useRef<Float32Array | null>(null);

  // Initialize Three.js scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 2.0, 6.8);
    cameraRef.current = camera;

    // 3. Renderer with antialiasing and alpha for sleek backgrounds
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      preserveDrawingBuffer: true, // Needed for screenshot capture
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0); // transparent so CSS background glows through
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Initial Geometry & Particle Buffers
    const count = config.dotCount;
    const geometry = new THREE.BufferGeometry();
    geometryRef.current = geometry;

    const initialPositions = generateGeometryPositions(config.geometry, count);
    currentPositionsArrayRef.current = new Float32Array(initialPositions);

    const randomSeeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      randomSeeds[i] = Math.random();
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(initialPositions, 3));
    geometry.setAttribute('aTargetPosition', new THREE.BufferAttribute(new Float32Array(initialPositions), 3));
    geometry.setAttribute('aRandomSeed', new THREE.BufferAttribute(randomSeeds, 1));

    // 5. Active Theme Colors
    const theme = COLOR_THEMES.find((t) => t.id === config.themeId) || COLOR_THEMES[0];
    const colPrimary = new THREE.Color(theme.primary);
    const colSecondary = new THREE.Color(theme.secondary);
    const colAccent = new THREE.Color(theme.accent);

    // 6. Shader Material
    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uTime: { value: 0 },
        uSpeed: { value: config.speed },
        uWaveAmp: { value: config.waveAmplitude },
        uWaveFreq: { value: config.waveFrequency },
        uTwist: { value: config.twistFactor },
        uTurbulence: { value: config.noiseTurbulence },
        uBeat: { value: 0 },
        uMorphProgress: { value: 1.0 },
        uBaseDotSize: { value: config.dotSize },
        uMotionMode: {
          value: ['harmonic-wave', 'pulse-heartbeat', 'vortex-twist', 'quantum-flux', 'dispersion-snap'].indexOf(
            config.motionMode
          ),
        },
        uColorPrimary: { value: colPrimary },
        uColorSecondary: { value: colSecondary },
        uColorAccent: { value: colAccent },
        uMousePos: { value: new THREE.Vector3(999, 999, 999) },
        uMouseActive: { value: 0 },
        uShockwaveTime: { value: -10 },
        uShockwaveOrigin: { value: new THREE.Vector3(0, 0, 0) },
        uDotStyle: { value: config.dotStyle === 'soft-glow' ? 0 : config.dotStyle === 'crisp-modern' ? 1 : 2 },
        uBloomIntensity: { value: config.bloomIntensity },
        uDepthFading: { value: config.depthFading ? 1.0 : 0.0 },
      },
    });
    materialRef.current = material;

    const points = new THREE.Points(geometry, material);
    scene.add(points);
    pointsRef.current = points;

    // 7. Resize Observer
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      if (rendererRef.current && rendererRef.current.domElement) {
        container.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      geometry.dispose();
      material.dispose();
    };
  }, []); // Run once on mount

  // Handle Geometry Switch with Smooth Morph
  useEffect(() => {
    if (config.geometry === currentGeometryTypeRef.current || !geometryRef.current) return;

    const geometry = geometryRef.current;
    const count = config.dotCount;

    // The current positions in buffer become the base 'position'
    const targetPos = generateGeometryPositions(config.geometry, count);

    geometry.setAttribute('aTargetPosition', new THREE.BufferAttribute(targetPos, 3));
    geometry.attributes.aTargetPosition.needsUpdate = true;

    // Begin morph progress from 0.0 to 1.0
    currentGeometryTypeRef.current = config.geometry;
    morphStartTimeRef.current = timeRef.current;
    isMorphingRef.current = true;
  }, [config.geometry, config.dotCount]);

  // Update Uniforms when props change
  useEffect(() => {
    if (!materialRef.current) return;
    const uniforms = materialRef.current.uniforms;

    uniforms.uSpeed.value = config.speed;
    uniforms.uWaveAmp.value = config.waveAmplitude;
    uniforms.uWaveFreq.value = config.waveFrequency;
    uniforms.uTwist.value = config.twistFactor;
    uniforms.uTurbulence.value = config.noiseTurbulence;
    uniforms.uBaseDotSize.value = config.dotSize;
    uniforms.uBloomIntensity.value = config.bloomIntensity;
    uniforms.uDepthFading.value = config.depthFading ? 1.0 : 0.0;
    
    uniforms.uDotStyle.value =
      config.dotStyle === 'soft-glow' ? 0 : config.dotStyle === 'crisp-modern' ? 1 : 2;

    const modeIdx = ['harmonic-wave', 'pulse-heartbeat', 'vortex-twist', 'quantum-flux', 'dispersion-snap'].indexOf(
      config.motionMode
    );
    uniforms.uMotionMode.value = modeIdx >= 0 ? modeIdx : 0;

    const theme = COLOR_THEMES.find((t) => t.id === config.themeId) || COLOR_THEMES[0];
    uniforms.uColorPrimary.value.set(theme.primary);
    uniforms.uColorSecondary.value.set(theme.secondary);
    uniforms.uColorAccent.value.set(theme.accent);
  }, [config]);

  // Screenshot capture on trigger
  useEffect(() => {
    if (screenshotTrigger === 0 || !rendererRef.current) return;
    try {
      const dataUrl = rendererRef.current.domElement.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `3d-dot-motion-graphics-${Date.now()}.png`;
      link.href = dataUrl;
      link.click();
    } catch (e) {
      console.error('Screenshot capture failed', e);
    }
  }, [screenshotTrigger]);

  // Main Kinetic Animation & Render Loop
  useEffect(() => {
    let active = true;

    const animate = (timestamp: number) => {
      if (!active) return;

      const dt = (timestamp - prevTimeRef.current) * 0.001;
      prevTimeRef.current = timestamp;

      // Update FPS calculation
      framesRenderedRef.current++;
      if (timestamp - fpsTimerRef.current >= 500) {
        const measuredFps = Math.round((framesRenderedRef.current * 1000) / (timestamp - fpsTimerRef.current));
        fpsCountRef.current = measuredFps;
        fpsTimerRef.current = timestamp;
        framesRenderedRef.current = 0;

        onStatsUpdate({
          fps: measuredFps,
          particles: config.dotCount,
          rotationalVelocity: Number((config.autoRotate ? config.speed * 0.35 : 0).toFixed(2)),
          kineticEnergy: Number((config.waveAmplitude * config.waveFrequency * 12.5).toFixed(1)),
        });
      }

      if (isPlaying) {
        timeRef.current += dt * config.speed;
      }

      // Smooth camera interpolation (spherical coordinates)
      const target = targetCameraAngleRef.current;
      const current = cameraAngleRef.current;

      if (config.autoRotate && isPlaying) {
        target.theta += dt * 0.35 * config.speed;
      }

      // Damped interpolation for smooth cinematic camera glide
      current.theta += (target.theta - current.theta) * 0.08;
      current.phi += (target.phi - current.phi) * 0.08;
      current.radius += (target.radius - current.radius) * 0.08;

      if (cameraRef.current) {
        const x = current.radius * Math.sin(current.phi) * Math.sin(current.theta);
        const y = current.radius * Math.cos(current.phi);
        const z = current.radius * Math.sin(current.phi) * Math.cos(current.theta);
        cameraRef.current.position.set(x, y, z);
        cameraRef.current.lookAt(0, 0, 0);
      }

      // Morphing progress update
      if (materialRef.current) {
        const uniforms = materialRef.current.uniforms;
        uniforms.uTime.value = timeRef.current;

        if (isMorphingRef.current) {
          const morphElapsed = timeRef.current - morphStartTimeRef.current;
          const morphDuration = 1.4; // 1.4 seconds morph
          const progress = Math.min(morphElapsed / morphDuration, 1.0);
          uniforms.uMorphProgress.value = progress;

          if (progress >= 1.0) {
            isMorphingRef.current = false;
            // Transfer target positions to main position attribute
            if (geometryRef.current) {
              const targetAttr = geometryRef.current.getAttribute('aTargetPosition');
              geometryRef.current.setAttribute('position', targetAttr.clone());
              geometryRef.current.attributes.position.needsUpdate = true;
            }
          }
        }

        // Beat pulse calculation
        if (config.beatSync && isPlaying) {
          const bps = config.bpm / 60;
          const beatPhase = (timeRef.current * bps) % 1.0;
          // Sharp attack, exponential decay for kick feel
          const beatImpulse = Math.pow(Math.max(0, 1.0 - beatPhase * 3.5), 2.5);
          uniforms.uBeat.value = beatImpulse;
        } else {
          uniforms.uBeat.value = 0;
        }

        // Mouse uniforms
        uniforms.uMousePos.value.copy(mouseProjectedRef.current);
        uniforms.uMouseActive.value = mouseActiveRef.current && config.mouseInteraction ? 1.0 : 0.0;

        // Shockwave uniform
        uniforms.uShockwaveTime.value = shockwaveStateRef.current.time;
        uniforms.uShockwaveOrigin.value.copy(shockwaveStateRef.current.origin);
      }

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      frameIdRef.current = requestAnimationFrame(animate);
    };

    frameIdRef.current = requestAnimationFrame(animate);

    return () => {
      active = false;
      cancelAnimationFrame(frameIdRef.current);
    };
  }, [isPlaying, config, onStatsUpdate]);

  // Pointer event handlers for drag orbit, hover repulsion, and click shockwave
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    prevPointerRef.current = { x: e.clientX, y: e.clientY };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const container = mountRef.current;
    if (!container || !cameraRef.current) return;

    // Drag Orbit Camera
    if (isDraggingRef.current) {
      const deltaX = e.clientX - prevPointerRef.current.x;
      const deltaY = e.clientY - prevPointerRef.current.y;
      prevPointerRef.current = { x: e.clientX, y: e.clientY };

      const rotateSpeed = 0.006;
      targetCameraAngleRef.current.theta -= deltaX * rotateSpeed;
      targetCameraAngleRef.current.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, targetCameraAngleRef.current.phi - deltaY * rotateSpeed)
      );
    }

    // Projected pointer ray into 3D world space
    const rect = container.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), cameraRef.current);

    // Intersect plane facing camera or z=0 plane
    const planeNormal = cameraRef.current.position.clone().normalize();
    const plane = new THREE.Plane(planeNormal, 0);
    const targetPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, targetPoint);

    if (targetPoint) {
      mouseProjectedRef.current.copy(targetPoint);
      mouseActiveRef.current = true;
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handlePointerLeave = () => {
    mouseActiveRef.current = false;
    isDraggingRef.current = false;
  };

  // Click generates a 3D ripple shockwave expanding from the click origin
  const handleClick = (e: React.MouseEvent) => {
    const container = mountRef.current;
    if (!container || !cameraRef.current) return;

    const rect = container.getBoundingClientRect();
    const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), cameraRef.current);
    const plane = new THREE.Plane(cameraRef.current.position.clone().normalize(), 0);
    const targetPoint = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, targetPoint);

    if (targetPoint) {
      shockwaveStateRef.current = {
        time: timeRef.current,
        origin: targetPoint.clone(),
      };
    }
  };

  // Wheel to zoom camera
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.005;
    targetCameraAngleRef.current.radius = Math.max(
      3.0,
      Math.min(14.0, targetCameraAngleRef.current.radius + zoomDelta)
    );
  };

  return (
    <div
      ref={mountRef}
      id="three-canvas-container"
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onClick={handleClick}
      onWheel={handleWheel}
    />
  );
};
