import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { LudoGameState, PlayerColor, Player } from '../types/ludo';
import {
  COLOR_HEX,
  gridToWorld,
  TRACK_CELLS,
  SAFE_TRACK_INDICES,
  PLAYER_START_TRACK_INDICES,
  HOME_RUNWAYS,
  YARD_PEDESTALS,
  getTokenWorldPosition,
  getTrackIndexForToken,
} from '../utils/ludoCoordinates';
import { soundEngine } from '../utils/audio';

interface ThreeLudoBoardProps {
  gameState: LudoGameState;
  onSelectToken: (tokenId: number) => void;
  onRollDice: () => void;
  cameraMode: 'perspective' | 'topdown' | 'active_focus';
  isLocalTurn: boolean;
  canRollDice: boolean;
}

interface Token3D {
  group: THREE.Group;
  color: PlayerColor;
  tokenId: number;
  currentPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  halo: THREE.Mesh;
  beam: THREE.Mesh;
  pointerArrow: THREE.Mesh;
  shadowDisc: THREE.Mesh;
  lastStep: number;
  // Waypoint multi-hop animation
  waypoints: THREE.Vector3[];
  waypointIndex: number;
  hopProgress: number;
  isHopping: boolean;
}

export const ThreeLudoBoard: React.FC<ThreeLudoBoardProps> = ({
  gameState,
  onSelectToken,
  onRollDice,
  cameraMode,
  isLocalTurn,
  canRollDice,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);

  // Groups
  const boardGroupRef = useRef<THREE.Group | null>(null);
  const tokensGroupRef = useRef<THREE.Group | null>(null);
  const effectsGroupRef = useRef<THREE.Group | null>(null);
  const diceGroupRef = useRef<THREE.Group | null>(null);
  const diceIndicatorRingRef = useRef<THREE.Mesh | null>(null);

  // Tokens 3D Map
  const tokenMeshesRef = useRef<Map<string, Token3D>>(new Map());
  const hoveredTokenKeyRef = useRef<string | null>(null);

  // Active particle shockwaves
  const activeShockwavesRef = useRef<
    { mesh: THREE.Mesh; maxRadius: number; age: number; maxAge: number }[]
  >([]);

  // Camera Orbit Spherical Coords
  const cameraSphericalRef = useRef({ theta: 0.8, phi: 0.85, radius: 18.0 });
  const targetCameraSphericalRef = useRef({ theta: 0.8, phi: 0.85, radius: 18.0 });
  const isDraggingRef = useRef(false);
  const prevPointerRef = useRef({ x: 0, y: 0 });
  const pointerStartRef = useRef({ x: 0, y: 0 });
  const lastInteractionTimeRef = useRef(0);

  // Raycasting
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseNdcRef = useRef(new THREE.Vector2());

  // 3D Dice Physical Tumbling State
  const dicePhysRef = useRef({
    isTumbling: false,
    elapsed: 0,
    duration: 0.80,
    startPos: new THREE.Vector3(0, 2.6, 0),
    targetPos: new THREE.Vector3(0, 0.38, 0),
    angularVelocity: new THREE.Vector3(25, 30, 20),
    targetEuler: new THREE.Euler(0, 0, 0),
    lastTriggerId: 0,
  });

  // INITIALIZE THREE.JS SCENE
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;
    const aspect = width / height;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    // 2. Camera with adaptive radius to guarantee full board visibility
    const defaultRadius = aspect < 1.0 ? Math.max(18.5, Math.min(25.0, 14.5 / aspect)) : 17.5;
    cameraSphericalRef.current.radius = defaultRadius;
    targetCameraSphericalRef.current.radius = defaultRadius;

    const camera = new THREE.PerspectiveCamera(40, aspect, 0.1, 100);
    camera.position.set(0, 14, 14);
    cameraRef.current = camera;

    // 3. Renderer with high performance & soft shadows
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lighting: Crisp key light + warm rim + ambient
    const ambientLight = new THREE.AmbientLight(0x0f172a, 2.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.6);
    dirLight.position.set(12, 22, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 40;
    dirLight.shadow.camera.left = -11;
    dirLight.shadow.camera.right = 11;
    dirLight.shadow.camera.top = 11;
    dirLight.shadow.camera.bottom = -11;
    dirLight.shadow.bias = -0.0005;
    scene.add(dirLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.3);
    rimLight.position.set(-12, 16, -12);
    scene.add(rimLight);

    const centerLight = new THREE.PointLight(0xffffff, 1.4, 20);
    centerLight.position.set(0, 4, 0);
    scene.add(centerLight);

    // 5. Hierarchy Groups
    const boardGroup = new THREE.Group();
    scene.add(boardGroup);
    boardGroupRef.current = boardGroup;

    const tokensGroup = new THREE.Group();
    scene.add(tokensGroup);
    tokensGroupRef.current = tokensGroup;

    const effectsGroup = new THREE.Group();
    scene.add(effectsGroup);
    effectsGroupRef.current = effectsGroup;

    // BUILD 3D BOARD (Flush center victory plaza, circular dot tracks, and yard pedestals)
    build3DCircularDotBoard(boardGroup);

    // BUILD 3D PHYSICAL ROLLING DICE
    const diceGroup = build3DPhysicalDice();
    diceGroup.position.set(0, 0.38, 0);
    scene.add(diceGroup);
    diceGroupRef.current = diceGroup;

    // Pulsing "Roll" indicator ring around the dice
    const indRingGeo = new THREE.RingGeometry(0.55, 0.72, 32);
    const indRingMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const indRing = new THREE.Mesh(indRingGeo, indRingMat);
    indRing.rotation.x = -Math.PI / 2;
    indRing.position.set(0, 0.04, 0);
    indRing.visible = false;
    scene.add(indRing);
    diceIndicatorRingRef.current = indRing;

    // IMMEDIATE TOKEN SYNC: Guarantee all 16 realistic 3D coins exist and are added to scene immediately
    syncTokens(tokensGroup, gameState, isLocalTurn, canRollDice);

    // Resize Handler
    const handleResize = () => {
      if (!container || !rendererRef.current || !cameraRef.current) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const asp = w / h;
      cameraRef.current.aspect = asp;
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
      tokenMeshesRef.current.clear();
      tokensGroupRef.current = null;
      boardGroupRef.current = null;
      diceGroupRef.current = null;
      effectsGroupRef.current = null;
    };
  }, []);

  // Check when a new physical dice roll is triggered
  useEffect(() => {
    const triggerId = gameState.dice.rollTriggerId || 0;
    if (triggerId > 0 && triggerId !== dicePhysRef.current.lastTriggerId) {
      dicePhysRef.current.lastTriggerId = triggerId;
      triggerPhysicalDiceRoll(gameState.dice.value);
    }
  }, [gameState.dice.rollTriggerId, gameState.dice.value]);

  const triggerPhysicalDiceRoll = (targetValue: number) => {
    const phys = dicePhysRef.current;
    phys.isTumbling = true;
    phys.elapsed = 0;
    phys.duration = 0.80;

    phys.startPos.set((Math.random() - 0.5) * 1.5, 2.8, (Math.random() - 0.5) * 1.5);
    phys.targetPos.set((Math.random() - 0.5) * 0.4, 0.38, (Math.random() - 0.5) * 0.4);

    phys.angularVelocity.set(
      (Math.random() > 0.5 ? 1 : -1) * (26 + Math.random() * 20),
      (Math.random() > 0.5 ? 1 : -1) * (30 + Math.random() * 20),
      (Math.random() > 0.5 ? 1 : -1) * (24 + Math.random() * 20)
    );

    phys.targetEuler = getDiceFaceEuler(targetValue);
    soundEngine.playDiceRoll();
  };

  // Camera presets
  useEffect(() => {
    const container = mountRef.current;
    const aspect = container ? container.clientWidth / container.clientHeight : 1.0;
    const defaultRadius = aspect < 1.0 ? Math.max(22.0, 19.0 / aspect) : 17.5;

    if (cameraMode === 'topdown') {
      targetCameraSphericalRef.current = {
        theta: 0,
        phi: 0.05,
        radius: defaultRadius - 1.0,
      };
    } else if (cameraMode === 'perspective') {
      targetCameraSphericalRef.current = {
        theta: 0.8,
        phi: 0.85,
        radius: defaultRadius,
      };
    } else if (cameraMode === 'active_focus') {
      const angles: Record<PlayerColor, number> = {
        red: -Math.PI * 0.75,
        green: -Math.PI * 0.25,
        yellow: Math.PI * 0.25,
        blue: Math.PI * 0.75,
      };
      const activeColor = gameState.players[gameState.activeColorIndex]?.color || 'red';
      targetCameraSphericalRef.current = {
        theta: angles[activeColor],
        phi: 0.75,
        radius: defaultRadius - 2.5,
      };
    }
  }, [cameraMode, gameState.activeColorIndex]);

  // Synchronize 3D tokens with game state: create, reposition, and highlight valid moves
  const syncTokens = (
    tokensGroup: THREE.Group,
    state: LudoGameState,
    isLocal: boolean,
    canRoll: boolean
  ) => {
    // Group occupants by track index to calculate neat clustering offsets
    const trackOccupants = new Map<number, { color: PlayerColor; tokenId: number }[]>();
    state.players.forEach((player) => {
      player.tokens.forEach((token) => {
        if (token.step >= 0 && token.step <= 50) {
          const trackIdx = getTrackIndexForToken(player.color, token.step);
          if (trackIdx !== null) {
            const list = trackOccupants.get(trackIdx) || [];
            list.push({ color: player.color, tokenId: token.id });
            trackOccupants.set(trackIdx, list);
          }
        }
      });
    });

    state.players.forEach((player) => {
      player.tokens.forEach((token) => {
        const key = `${player.color}-${token.id}`;
        let tokenObj = tokenMeshesRef.current.get(key);

        let clusterIdx = 0;
        let clusterTotal = 1;
        if (token.step >= 0 && token.step <= 50) {
          const trackIdx = getTrackIndexForToken(player.color, token.step);
          if (trackIdx !== null) {
            const occupants = trackOccupants.get(trackIdx) || [];
            clusterTotal = occupants.length;
            clusterIdx = occupants.findIndex(
              (o) => o.color === player.color && o.tokenId === token.id
            );
            if (clusterIdx === -1) clusterIdx = 0;
          }
        }

        const targetPos = getTokenWorldPosition(
          player.color,
          token.id,
          token.step,
          clusterIdx,
          clusterTotal
        );

        if (!tokenObj) {
          tokenObj = createProperCoinMesh(player.color, token.id);
          tokenObj.currentPos.set(targetPos.x, targetPos.y, targetPos.z);
          tokenObj.targetPos.set(targetPos.x, targetPos.y, targetPos.z);
          tokenObj.group.position.copy(tokenObj.currentPos);
          tokenObj.lastStep = token.step;

          tokenMeshesRef.current.set(key, tokenObj);
        }

        // CRITICAL GUARANTEE: Ensure token group is ALWAYS an active child of current tokensGroup!
        if (tokenObj.group.parent !== tokensGroup) {
          tokensGroup.add(tokenObj.group);
        }

        // Multi-hop tactile movement animation when step changes
        if (token.step !== tokenObj.lastStep) {
          const waypoints: THREE.Vector3[] = [];

          if (tokenObj.lastStep === -1) {
            // Exiting yard to starting tile
            waypoints.push(new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z));
          } else if (token.step === -1) {
            // Captured and sent back to base pedestal
            waypoints.push(new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z));
          } else if (token.step > tokenObj.lastStep) {
            // Hop sequentially tile-by-tile
            for (let s = tokenObj.lastStep + 1; s <= token.step; s++) {
              const stepPos = getTokenWorldPosition(
                player.color,
                token.id,
                s,
                s === token.step ? clusterIdx : 0,
                s === token.step ? clusterTotal : 1
              );
              waypoints.push(new THREE.Vector3(stepPos.x, stepPos.y, stepPos.z));
            }
          } else {
            waypoints.push(new THREE.Vector3(targetPos.x, targetPos.y, targetPos.z));
          }

          tokenObj.waypoints = waypoints;
          tokenObj.waypointIndex = 0;
          tokenObj.hopProgress = 0;
          tokenObj.isHopping = waypoints.length > 0;
          tokenObj.lastStep = token.step;
        }

        tokenObj.targetPos.set(targetPos.x, targetPos.y, targetPos.z);

        // Highlight selectable/movable coins
        const isSelectable =
          isLocal &&
          state.phase === 'moving' &&
          state.players[state.activeColorIndex]?.color === player.color &&
          state.validTokenMoves.includes(token.id);

        tokenObj.halo.visible = isSelectable;
        tokenObj.beam.visible = isSelectable;
        tokenObj.pointerArrow.visible = isSelectable;
      });
    });

    // Dice indicator visibility
    if (diceIndicatorRingRef.current) {
      diceIndicatorRingRef.current.visible = canRoll && state.phase === 'rolling';
    }
  };

  // Synchronize coins & indicators whenever gameState or turn phase updates
  useEffect(() => {
    if (!tokensGroupRef.current) return;
    syncTokens(tokensGroupRef.current, gameState, isLocalTurn, canRollDice);
  }, [gameState, isLocalTurn, canRollDice]);

  // MAIN THREE.JS ANIMATION RENDER LOOP
  useEffect(() => {
    let animId: number;
    const clock = new THREE.Clock();

    const render = () => {
      const delta = clock.getDelta();
      const time = clock.getElapsedTime();

      // 1. Smooth Camera Orbit
      const currentCam = cameraSphericalRef.current;
      const targetCam = targetCameraSphericalRef.current;
      currentCam.theta += (targetCam.theta - currentCam.theta) * 0.08;
      currentCam.phi += (targetCam.phi - currentCam.phi) * 0.08;
      currentCam.radius += (targetCam.radius - currentCam.radius) * 0.08;

      if (cameraRef.current) {
        const x = currentCam.radius * Math.sin(currentCam.phi) * Math.sin(currentCam.theta);
        const y = currentCam.radius * Math.cos(currentCam.phi);
        const z = currentCam.radius * Math.sin(currentCam.phi) * Math.cos(currentCam.theta);
        cameraRef.current.position.set(x, y, z);
        cameraRef.current.lookAt(0, 0.2, 0);
      }

      // 2. Coin Movements & Tactile Step-by-Step Hopping
      tokenMeshesRef.current.forEach((t, key) => {
        const isHovered = hoveredTokenKeyRef.current === key;

        if (t.isHopping && t.waypoints.length > 0) {
          t.hopProgress += delta * 7.5; // ~0.13s per tile hop!
          const currentWaypoint = t.waypoints[t.waypointIndex];
          const prevPos =
            t.waypointIndex === 0
              ? t.currentPos
              : t.waypoints[t.waypointIndex - 1];

          const p = Math.min(t.hopProgress, 1.0);
          const x = THREE.MathUtils.lerp(prevPos.x, currentWaypoint.x, p);
          const z = THREE.MathUtils.lerp(prevPos.z, currentWaypoint.z, p);
          const hopHeight = Math.sin(p * Math.PI) * 0.45;
          const y = THREE.MathUtils.lerp(prevPos.y, currentWaypoint.y, p) + hopHeight;

          t.group.position.set(x, y, z);

          if (t.hopProgress >= 1.0) {
            t.hopProgress = 0;
            t.waypointIndex++;
            soundEngine.playTokenHop(t.waypointIndex);

            if (t.waypointIndex >= t.waypoints.length) {
              t.isHopping = false;
              t.currentPos.copy(currentWaypoint);
              t.group.position.copy(t.currentPos);
              spawnShockwave(t.currentPos.x, t.currentPos.z, 0.9, COLOR_HEX[t.color].primary);
              soundEngine.playDiceLand(false);
            }
          }
        } else {
          // Stationary or hovering
          t.currentPos.copy(t.targetPos);
          const liftY = isHovered && t.halo.visible ? 0.22 : 0;
          const bob = t.halo.visible ? Math.sin(time * 6 + t.tokenId) * 0.06 + 0.06 : 0;

          t.group.position.set(t.currentPos.x, t.currentPos.y + bob + liftY, t.currentPos.z);

          // Pointer scale & rotation
          const targetScale = isHovered && t.halo.visible ? 1.15 : 1.0;
          t.group.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.2);

          if (t.halo.visible) {
            t.halo.rotation.z += delta * 2.5;
            t.pointerArrow.position.y = 1.25 + Math.sin(time * 8 + t.tokenId) * 0.10;
            t.pointerArrow.rotation.y += delta * 3;
          }
        }
      });

      // 5. 3D Dice Physical Tumbling
      const phys = dicePhysRef.current;
      if (diceGroupRef.current) {
        const diceGroup = diceGroupRef.current;

        if (phys.isTumbling) {
          phys.elapsed += delta;
          const progress = Math.min(phys.elapsed / phys.duration, 1.0);

          let currentY = phys.targetPos.y;
          if (progress < 0.45) {
            const p1 = progress / 0.45;
            currentY = phys.targetPos.y + Math.sin(p1 * Math.PI) * 2.0;
          } else if (progress < 0.75) {
            const p2 = (progress - 0.45) / 0.30;
            currentY = phys.targetPos.y + Math.sin(p2 * Math.PI) * 0.75;
          } else {
            const p3 = (progress - 0.75) / 0.25;
            currentY = phys.targetPos.y + Math.sin(p3 * Math.PI) * 0.25;
          }

          const currentX = THREE.MathUtils.lerp(phys.startPos.x, phys.targetPos.x, progress);
          const currentZ = THREE.MathUtils.lerp(phys.startPos.z, phys.targetPos.z, progress);
          diceGroup.position.set(currentX, currentY, currentZ);

          const decay = Math.pow(1 - progress, 2);
          diceGroup.rotation.x += phys.angularVelocity.x * delta * decay;
          diceGroup.rotation.y += phys.angularVelocity.y * delta * decay;
          diceGroup.rotation.z += phys.angularVelocity.z * delta * decay;

          if (progress > 0.6) {
            const blend = (progress - 0.6) / 0.4;
            diceGroup.rotation.x = THREE.MathUtils.lerp(
              diceGroup.rotation.x,
              phys.targetEuler.x,
              blend * 0.25
            );
            diceGroup.rotation.y = THREE.MathUtils.lerp(
              diceGroup.rotation.y,
              phys.targetEuler.y,
              blend * 0.25
            );
            diceGroup.rotation.z = THREE.MathUtils.lerp(
              diceGroup.rotation.z,
              phys.targetEuler.z,
              blend * 0.25
            );
          }

          if (progress >= 1.0) {
            phys.isTumbling = false;
            diceGroup.position.copy(phys.targetPos);
            diceGroup.rotation.copy(phys.targetEuler);
            spawnShockwave(phys.targetPos.x, phys.targetPos.z, 1.2, 0x38bdf8);
            soundEngine.playDiceLand(gameState.dice.value === 6);
          }
        } else {
          orientDiceFace(diceGroup, gameState.dice.value);
          diceGroup.position.set(0, 0.38, 0);

          if (diceIndicatorRingRef.current && diceIndicatorRingRef.current.visible) {
            const scale = 1.0 + Math.sin(time * 5) * 0.12;
            diceIndicatorRingRef.current.scale.set(scale, scale, scale);
            diceIndicatorRingRef.current.rotation.z += delta * 1.5;
          }
        }
      }

      // 6. Animate Expanding Circular Shockwaves
      if (effectsGroupRef.current) {
        for (let i = activeShockwavesRef.current.length - 1; i >= 0; i--) {
          const sw = activeShockwavesRef.current[i];
          sw.age += delta;
          const progress = sw.age / sw.maxAge;
          if (progress >= 1.0) {
            effectsGroupRef.current.remove(sw.mesh);
            sw.mesh.geometry.dispose();
            (sw.mesh.material as THREE.Material).dispose();
            activeShockwavesRef.current.splice(i, 1);
          } else {
            const scale = progress * sw.maxRadius;
            sw.mesh.scale.set(scale, scale, scale);
            (sw.mesh.material as THREE.MeshBasicMaterial).opacity = (1.0 - progress) * 0.8;
          }
        }
      }

      // 7. Render
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [gameState]);

  // Spawn circular landing ripple
  const spawnShockwave = (x: number, z: number, maxRadius: number, color: number | string) => {
    if (!effectsGroupRef.current) return;
    const ringGeo = new THREE.RingGeometry(0.1, 0.22, 28);
    const ringMat = new THREE.MeshBasicMaterial({
      color: typeof color === 'string' ? new THREE.Color(color) : color,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8,
    });
    const mesh = new THREE.Mesh(ringGeo, ringMat);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.05, z);
    effectsGroupRef.current.add(mesh);
    activeShockwavesRef.current.push({ mesh, maxRadius, age: 0, maxAge: 0.45 });
  };

  // Helper to execute raycast touch / click interaction on 3D Dice and 3D Coins
  const triggerRaycastInteraction = (clientX: number, clientY: number) => {
    const container = mountRef.current;
    if (!container || !cameraRef.current || !sceneRef.current) return;

    lastInteractionTimeRef.current = Date.now();

    const rect = container.getBoundingClientRect();
    mouseNdcRef.current.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    mouseNdcRef.current.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera(mouseNdcRef.current, cameraRef.current);

    // 1. Direct Touch on 3D Physical Dice
    if (diceGroupRef.current && canRollDice && gameState.phase === 'rolling') {
      const diceIntersects = raycasterRef.current.intersectObjects(
        [diceGroupRef.current],
        true
      );
      if (diceIntersects.length > 0) {
        soundEngine.playClick();
        onRollDice();
        return;
      }
    }

    // 2. Direct Touch on 3D Coins (Both in Rolling and Moving phases)
    const activePlayer = gameState.players[gameState.activeColorIndex];
    if (!activePlayer || !isLocalTurn) return;

    // Collect all tokens in scene for raycasting
    const allTokenGroups: THREE.Object3D[] = [];
    tokenMeshesRef.current.forEach((t) => {
      allTokenGroups.push(t.group);
    });

    const tokenHits = raycasterRef.current.intersectObjects(allTokenGroups, true);
    if (tokenHits.length > 0) {
      let hitGroup: THREE.Object3D | null = tokenHits[0].object;
      while (hitGroup && !hitGroup.userData?.isTokenRoot && hitGroup.parent) {
        hitGroup = hitGroup.parent;
      }

      if (hitGroup && hitGroup.userData?.tokenId !== undefined) {
        const clickedTokenId = hitGroup.userData.tokenId as number;
        const clickedColor = hitGroup.userData.color as PlayerColor;

        // If active player's coin was tapped during rolling phase -> roll dice!
        if (gameState.phase === 'rolling' && canRollDice && clickedColor === activePlayer.color) {
          soundEngine.playClick();
          onRollDice();
          return;
        }

        // If coin was tapped during moving phase
        if (gameState.phase === 'moving' && clickedColor === activePlayer.color) {
          const isValid = gameState.validTokenMoves.includes(clickedTokenId);
          if (isValid) {
            soundEngine.playTokenHop(0);
            onSelectToken(clickedTokenId);
            return;
          } else {
            soundEngine.playClick();
            const key = `${clickedColor}-${clickedTokenId}`;
            const tObj = tokenMeshesRef.current.get(key);
            const wx = tObj ? tObj.currentPos.x : hitGroup.position.x;
            const wz = tObj ? tObj.currentPos.z : hitGroup.position.z;
            spawnShockwave(wx, wz, 0.8, 0xf59e0b);
            return;
          }
        }
      }
    }

    // 3. Direct Tap on Central Plaza in rolling phase
    if (gameState.phase === 'rolling' && canRollDice) {
      const distToCenter = Math.hypot(mouseNdcRef.current.x, mouseNdcRef.current.y);
      if (distToCenter < 0.38) {
        soundEngine.playClick();
        onRollDice();
        return;
      }
    }
  };

  // Pointer Click & Hover Interactions
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    prevPointerRef.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const container = mountRef.current;
    if (!container || !cameraRef.current) return;

    const totalDist = Math.hypot(
      e.clientX - pointerStartRef.current.x,
      e.clientY - pointerStartRef.current.y
    );

    if (totalDist > 7) {
      isDraggingRef.current = true;
    }

    if (isDraggingRef.current) {
      const dx = e.clientX - prevPointerRef.current.x;
      const dy = e.clientY - prevPointerRef.current.y;
      prevPointerRef.current = { x: e.clientX, y: e.clientY };

      const rotSpeed = 0.006;
      targetCameraSphericalRef.current.theta -= dx * rotSpeed;
      targetCameraSphericalRef.current.phi = Math.max(
        0.15,
        Math.min(Math.PI / 2 - 0.05, targetCameraSphericalRef.current.phi - dy * rotSpeed)
      );
      return;
    }

    // Hover Raycasting Check for Tactile Touch Response
    const rect = container.getBoundingClientRect();
    mouseNdcRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouseNdcRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycasterRef.current.setFromCamera(mouseNdcRef.current, cameraRef.current);

    let isOverInteractive = false;
    let hoveredKey: string | null = null;

    if (diceGroupRef.current && canRollDice) {
      const diceHits = raycasterRef.current.intersectObjects([diceGroupRef.current], true);
      if (diceHits.length > 0) {
        isOverInteractive = true;
      }
    }

    if (!isOverInteractive && gameState.phase === 'moving' && isLocalTurn) {
      const activeColor = gameState.players[gameState.activeColorIndex]?.color;
      const validIds = gameState.validTokenMoves;
      const candidateMeshes: THREE.Object3D[] = [];

      validIds.forEach((tid) => {
        const key = `${activeColor}-${tid}`;
        const tObj = tokenMeshesRef.current.get(key);
        if (tObj) candidateMeshes.push(tObj.group);
      });

      const hits = raycasterRef.current.intersectObjects(candidateMeshes, true);
      if (hits.length > 0) {
        isOverInteractive = true;
        let hitGroup: THREE.Object3D | null = hits[0].object;
        while (hitGroup && !hitGroup.userData?.isTokenRoot && hitGroup.parent) {
          hitGroup = hitGroup.parent;
        }
        if (hitGroup && hitGroup.userData?.tokenId !== undefined) {
          hoveredKey = `${hitGroup.userData.color}-${hitGroup.userData.tokenId}`;
        }
      }
    }

    container.style.cursor = isOverInteractive ? 'pointer' : 'grab';
    hoveredTokenKeyRef.current = hoveredKey;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) {
      triggerRaycastInteraction(e.clientX, e.clientY);
    }
    isDraggingRef.current = false;
  };

  const handleClick = (e: React.MouseEvent) => {
    // If pointerUp already handled within 300ms, prevent duplicate trigger
    if (Date.now() - lastInteractionTimeRef.current < 300) return;
    triggerRaycastInteraction(e.clientX, e.clientY);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomDelta = e.deltaY * 0.01;
    targetCameraSphericalRef.current.radius = Math.max(
      9.0,
      Math.min(28.0, targetCameraSphericalRef.current.radius + zoomDelta)
    );
  };

  return (
    <div
      ref={mountRef}
      id="three-ludo-canvas-container"
      className="absolute inset-0 w-full h-full cursor-grab active:cursor-grabbing touch-none select-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onClick={handleClick}
      onWheel={handleWheel}
    />
  );
};

// -------------------------------------------------------------
// 3D PROCEDURAL LUDO BOARD BUILDER
// -------------------------------------------------------------
function build3DCircularDotBoard(group: THREE.Group) {
  // 1. Sleek Matte Obsidian Base Board
  const baseGeo = new THREE.BoxGeometry(13.8, 0.4, 13.8);
  const baseMat = new THREE.MeshStandardMaterial({
    color: 0x070b14,
    roughness: 0.4,
    metalness: 0.6,
  });
  const baseMesh = new THREE.Mesh(baseGeo, baseMat);
  baseMesh.position.y = -0.2;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // Border Rim Frame
  const borderGeo = new THREE.BoxGeometry(14.2, 0.5, 14.2);
  const borderMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.5,
    metalness: 0.8,
  });
  const borderMesh = new THREE.Mesh(borderGeo, borderMat);
  borderMesh.position.y = -0.26;
  group.add(borderMesh);

  // 2. 52 Circular Dot Track Cells
  TRACK_CELLS.forEach((cell, idx) => {
    const { x, z } = gridToWorld(cell.col, cell.row);
    const isSafe = SAFE_TRACK_INDICES.includes(idx);

    let colorKey: PlayerColor | null = null;
    if (idx === PLAYER_START_TRACK_INDICES.red) colorKey = 'red';
    else if (idx === PLAYER_START_TRACK_INDICES.green) colorKey = 'green';
    else if (idx === PLAYER_START_TRACK_INDICES.yellow) colorKey = 'yellow';
    else if (idx === PLAYER_START_TRACK_INDICES.blue) colorKey = 'blue';

    const cellGroup = createTrackDotCell(x, z, isSafe, colorKey);
    group.add(cellGroup);
  });

  // 3. 4 Home Runways (5 circular dots each)
  const colors: PlayerColor[] = ['red', 'green', 'yellow', 'blue'];
  colors.forEach((c) => {
    const runway = HOME_RUNWAYS[c];
    runway.forEach((cell, idx) => {
      const { x, z } = gridToWorld(cell.col, cell.row);
      const runwayDot = createRunwayDotCell(x, z, c, idx);
      group.add(runwayDot);
    });
  });

  // 4. FLUSH CENTRAL HOME VICTORY PLAZA (REMOVED UGLY SPIKY CONES!)
  const centralPlaza = createCentralHomePlaza();
  group.add(centralPlaza);

  // 5. 4 Corner Yard Base Platforms with Stanchions
  colors.forEach((c) => {
    const yard = createYardPlatform(c);
    group.add(yard);
  });
}

// Helper to generate 2D star shapes for flat painted board decals (No 3D stones!)
function createStarShape(points: number, outerRadius: number, innerRadius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const step = Math.PI / points;
  for (let i = 0; i < 2 * points; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = i * step - Math.PI / 2;
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

// Track Dot Cell
function createTrackDotCell(
  x: number,
  z: number,
  isSafe: boolean,
  colorKey: PlayerColor | null
): THREE.Group {
  const cellGroup = new THREE.Group();
  cellGroup.position.set(x, 0.02, z);

  const outerRingGeo = new THREE.RingGeometry(0.25, 0.35, 24);
  const outerRingMat = new THREE.MeshBasicMaterial({
    color: colorKey ? COLOR_HEX[colorKey].primary : isSafe ? 0xf59e0b : 0x334155,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: colorKey || isSafe ? 0.9 : 0.45,
  });
  const outerRing = new THREE.Mesh(outerRingGeo, outerRingMat);
  outerRing.rotation.x = -Math.PI / 2;
  cellGroup.add(outerRing);

  const centerGeo = new THREE.CircleGeometry(0.18, 24);
  const centerMat = new THREE.MeshStandardMaterial({
    color: colorKey ? COLOR_HEX[colorKey].primary : isSafe ? 0xfbbf24 : 0x1e293b,
    roughness: 0.3,
    metalness: 0.5,
  });
  const centerMesh = new THREE.Mesh(centerGeo, centerMat);
  centerMesh.rotation.x = -Math.PI / 2;
  centerMesh.position.y = 0.005;
  cellGroup.add(centerMesh);

  // Flat, authentic printed 5-pointed star emblem flush on safe tile (NO 3D stone/rock)
  if (isSafe) {
    const starShape = createStarShape(5, 0.15, 0.065);
    const starGeo = new THREE.ShapeGeometry(starShape);
    const starMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24,
      emissive: 0xd97706,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.9,
      side: THREE.DoubleSide,
    });
    const starMesh = new THREE.Mesh(starGeo, starMat);
    starMesh.rotation.x = -Math.PI / 2;
    starMesh.position.y = 0.012; // Flush on circular dot surface
    cellGroup.add(starMesh);
  }

  return cellGroup;
}

// Runway Dot Cell
function createRunwayDotCell(
  x: number,
  z: number,
  color: PlayerColor,
  stepIdx: number
): THREE.Group {
  const cellGroup = new THREE.Group();
  cellGroup.position.set(x, 0.025, z);
  const hex = COLOR_HEX[color];

  const ringGeo = new THREE.RingGeometry(0.24, 0.36, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: hex.primary,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.75 + stepIdx * 0.05,
  });
  const ringMesh = new THREE.Mesh(ringGeo, ringMat);
  ringMesh.rotation.x = -Math.PI / 2;
  cellGroup.add(ringMesh);

  const dotGeo = new THREE.CircleGeometry(0.16, 20);
  const dotMat = new THREE.MeshBasicMaterial({
    color: hex.glow,
    transparent: true,
    opacity: 0.85,
  });
  const dotMesh = new THREE.Mesh(dotGeo, dotMat);
  dotMesh.rotation.x = -Math.PI / 2;
  dotMesh.position.y = 0.005;
  cellGroup.add(dotMesh);

  return cellGroup;
}

// -------------------------------------------------------------
// TOURNAMENT-GRADE FLUSH CENTRAL HOME PLAZA
// (REPLACED THE AWKWARD VERTICAL SPIKY CONES)
// -------------------------------------------------------------
function createCentralHomePlaza(): THREE.Group {
  const group = new THREE.Group();
  group.position.set(0, 0.015, 0);

  // 1. Sleek Central Ground Base Plate
  const centerBaseGeo = new THREE.BoxGeometry(2.55, 0.018, 2.55);
  const centerBaseMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    roughness: 0.3,
    metalness: 0.7,
  });
  const centerBase = new THREE.Mesh(centerBaseGeo, centerBaseMat);
  centerBase.position.y = 0.005;
  group.add(centerBase);

  // 2. 4 Flat Triangular Quadrants meeting flush in the center
  const quadrants: { color: PlayerColor; pts: [number, number, number][] }[] = [
    {
      color: 'red',
      pts: [
        [-1.25, 0, -1.25],
        [-1.25, 0, 1.25],
        [0, 0, 0],
      ],
    },
    {
      color: 'green',
      pts: [
        [-1.25, 0, -1.25],
        [1.25, 0, -1.25],
        [0, 0, 0],
      ],
    },
    {
      color: 'yellow',
      pts: [
        [1.25, 0, -1.25],
        [1.25, 0, 1.25],
        [0, 0, 0],
      ],
    },
    {
      color: 'blue',
      pts: [
        [-1.25, 0, 1.25],
        [1.25, 0, 1.25],
        [0, 0, 0],
      ],
    },
  ];

  quadrants.forEach(({ color, pts }) => {
    const geo = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      pts[0][0], 0.016, pts[0][2],
      pts[1][0], 0.016, pts[1][2],
      pts[2][0], 0.016, pts[2][2],
    ]);
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: COLOR_HEX[color].primary,
      roughness: 0.25,
      metalness: 0.5,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    group.add(mesh);
  });

  // 3. Central Golden Brass Medallion Ring
  const ringGeo = new THREE.RingGeometry(0.38, 0.52, 32);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.2,
    metalness: 0.9,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.022;
  group.add(ring);

  // 4. Flat 8-Point Golden Star Medal
  const starShape = createStarShape(8, 0.32, 0.16);
  const starGeo = new THREE.ShapeGeometry(starShape);
  const starMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 0.5,
    roughness: 0.2,
    metalness: 0.95,
    side: THREE.DoubleSide,
  });
  const starMesh = new THREE.Mesh(starGeo, starMat);
  starMesh.rotation.x = -Math.PI / 2;
  starMesh.position.y = 0.024;
  group.add(starMesh);

  return group;
}

// Player Yard Base Platform
function createYardPlatform(color: PlayerColor): THREE.Group {
  const yardGroup = new THREE.Group();
  const hex = COLOR_HEX[color];

  const yardCenters: Record<PlayerColor, { col: number; row: number }> = {
    red: { col: 2.5, row: 2.5 },
    green: { col: 11.5, row: 2.5 },
    yellow: { col: 11.5, row: 11.5 },
    blue: { col: 2.5, row: 11.5 },
  };

  const center = yardCenters[color];
  const worldPos = gridToWorld(center.col, center.row);
  yardGroup.position.set(worldPos.x, 0.02, worldPos.z);

  const bigRing = new THREE.Mesh(
    new THREE.RingGeometry(1.9, 2.15, 48),
    new THREE.MeshBasicMaterial({
      color: hex.primary,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.45,
    })
  );
  bigRing.rotation.x = -Math.PI / 2;
  yardGroup.add(bigRing);

  const floorDisc = new THREE.Mesh(
    new THREE.CircleGeometry(1.85, 36),
    new THREE.MeshStandardMaterial({
      color: 0x0a1122,
      roughness: 0.6,
      metalness: 0.4,
    })
  );
  floorDisc.rotation.x = -Math.PI / 2;
  floorDisc.position.y = 0.005;
  yardGroup.add(floorDisc);

  // 4 Raised Circular Pedestals where coins rest in Yard
  const pedestals = YARD_PEDESTALS[color];
  pedestals.forEach((p) => {
    const pw = gridToWorld(p.col, p.row);
    const rx = pw.x - worldPos.x;
    const rz = pw.z - worldPos.z;

    const pedGeo = new THREE.CylinderGeometry(0.38, 0.42, 0.08, 24);
    const pedMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.3,
      metalness: 0.7,
    });
    const pedMesh = new THREE.Mesh(pedGeo, pedMat);
    pedMesh.position.set(rx, 0.04, rz);
    yardGroup.add(pedMesh);

    const pedRing = new THREE.Mesh(
      new THREE.RingGeometry(0.26, 0.36, 20),
      new THREE.MeshBasicMaterial({
        color: hex.primary,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.7,
      })
    );
    pedRing.rotation.x = -Math.PI / 2;
    pedRing.position.set(rx, 0.082, rz);
    yardGroup.add(pedRing);
  });

  return yardGroup;
}

// -------------------------------------------------------------
// PROPER AUTHENTIC 3D LUDO COIN (PAWN / GOTI) BUILDER
// -------------------------------------------------------------
function createProperCoinMesh(color: PlayerColor, tokenId: number): Token3D {
  const group = new THREE.Group();
  group.userData = { isTokenRoot: true, tokenId, color };

  const hex = COLOR_HEX[color];

  // High gloss tournament lacquer material
  const coinBodyMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(hex.primary),
    emissive: new THREE.Color(hex.secondary),
    emissiveIntensity: 0.40,
    roughness: 0.15,
    metalness: 0.28,
  });

  // Polished golden metallic accents
  const goldAccentMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.18,
    metalness: 0.95,
  });

  // 1. Soft Circular Drop-Shadow Disc Underneath
  const shadowGeo = new THREE.CircleGeometry(0.36, 24);
  const shadowMat = new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.50,
  });
  const shadowDisc = new THREE.Mesh(shadowGeo, shadowMat);
  shadowDisc.rotation.x = -Math.PI / 2;
  shadowDisc.position.y = 0.006;
  group.add(shadowDisc);

  // 2. Wide Weighted Circular Base (radius 0.33, height 0.10)
  const baseGeo = new THREE.CylinderGeometry(0.28, 0.33, 0.10, 32);
  const baseMesh = new THREE.Mesh(baseGeo, coinBodyMat);
  baseMesh.position.y = 0.05;
  baseMesh.castShadow = true;
  baseMesh.receiveShadow = true;
  group.add(baseMesh);

  // 3. Base Golden Accent Trim Ring
  const rimGeo = new THREE.CylinderGeometry(0.26, 0.28, 0.04, 32);
  const rimMesh = new THREE.Mesh(rimGeo, goldAccentMat);
  rimMesh.position.y = 0.115;
  group.add(rimMesh);

  // 4. Gracefully Tapered Sculpted Waist
  const waistGeo = new THREE.CylinderGeometry(0.16, 0.25, 0.30, 32);
  const waistMesh = new THREE.Mesh(waistGeo, coinBodyMat);
  waistMesh.position.y = 0.27;
  waistMesh.castShadow = true;
  group.add(waistMesh);

  // 5. Golden Collar Ring around Neck
  const collarGeo = new THREE.TorusGeometry(0.16, 0.032, 16, 32);
  const collarMesh = new THREE.Mesh(collarGeo, goldAccentMat);
  collarMesh.position.y = 0.42;
  collarMesh.rotation.x = Math.PI / 2;
  group.add(collarMesh);

  // 6. Spherical Head / Crown
  const headGeo = new THREE.SphereGeometry(0.19, 24, 24);
  const headMesh = new THREE.Mesh(headGeo, coinBodyMat);
  headMesh.position.y = 0.61;
  headMesh.castShadow = true;
  group.add(headMesh);

  // 7. Golden Crown Finial Pip on Top
  const pipGeo = new THREE.SphereGeometry(0.06, 16, 16);
  const pipMesh = new THREE.Mesh(pipGeo, goldAccentMat);
  pipMesh.position.y = 0.80;
  group.add(pipMesh);

  // 8. Floating Holographic Halo Ring for Selection
  const haloGeo = new THREE.TorusGeometry(0.42, 0.03, 12, 32);
  const haloMat = new THREE.MeshBasicMaterial({
    color: hex.glow,
    transparent: true,
    opacity: 0.95,
  });
  const haloMesh = new THREE.Mesh(haloGeo, haloMat);
  haloMesh.position.y = 0.45;
  haloMesh.rotation.x = Math.PI / 2;
  haloMesh.visible = false;
  group.add(haloMesh);

  // 9. Ground Circular Highlight Beam
  const beamGeo = new THREE.RingGeometry(0.18, 0.55, 32);
  const beamMat = new THREE.MeshBasicMaterial({
    color: hex.glow,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.85,
  });
  const beamMesh = new THREE.Mesh(beamGeo, beamMat);
  beamMesh.position.y = 0.012;
  beamMesh.rotation.x = -Math.PI / 2;
  beamMesh.visible = false;
  group.add(beamMesh);

  // 10. Downward Bouncing Neon 3D Pointer Arrow
  const arrowGeo = new THREE.ConeGeometry(0.13, 0.25, 16);
  const arrowMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: 0xeab308,
    emissiveIntensity: 0.95,
    metalness: 0.9,
  });
  const arrowMesh = new THREE.Mesh(arrowGeo, arrowMat);
  arrowMesh.rotation.x = Math.PI;
  arrowMesh.position.y = 1.25;
  arrowMesh.visible = false;
  group.add(arrowMesh);

  // 11. Large Touch/Click Hit Collider (transparent: true, opacity: 0.001 for 100% reliable raycasting)
  const hitGeo = new THREE.CylinderGeometry(0.60, 0.60, 1.4, 16);
  const hitMat = new THREE.MeshBasicMaterial({
    transparent: true,
    opacity: 0.001,
    depthWrite: false,
  });
  const hitMesh = new THREE.Mesh(hitGeo, hitMat);
  hitMesh.position.y = 0.65;
  hitMesh.userData = { isTokenRoot: true, tokenId, color };
  group.add(hitMesh);

  return {
    group,
    targetPos: new THREE.Vector3(0, 0, 0),
    currentPos: new THREE.Vector3(0, 0, 0),
    color,
    tokenId,
    halo: haloMesh,
    beam: beamMesh,
    pointerArrow: arrowMesh,
    shadowDisc,
    lastStep: -1,
    waypoints: [],
    waypointIndex: 0,
    hopProgress: 0,
    isHopping: false,
  };
}

// -------------------------------------------------------------
// 3D PHYSICAL DICE BUILDER & FACE TEXTURES
// -------------------------------------------------------------
function build3DPhysicalDice(): THREE.Group {
  const group = new THREE.Group();
  group.userData = { isDice: true };

  const cubeGeo = new THREE.BoxGeometry(0.68, 0.68, 0.68);
  const materials: THREE.MeshStandardMaterial[] = [
    createDiceFaceMaterial(1),
    createDiceFaceMaterial(6),
    createDiceFaceMaterial(2),
    createDiceFaceMaterial(5),
    createDiceFaceMaterial(3),
    createDiceFaceMaterial(4),
  ];

  const mesh = new THREE.Mesh(cubeGeo, materials);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  return group;
}

function createDiceFaceMaterial(pips: number): THREE.MeshStandardMaterial {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.MeshStandardMaterial({ color: 0xffffff });

  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(0, 0, 128, 128);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, 122, 122);

  const drawPip = (x: number, y: number, color: string = '#0f172a') => {
    ctx.beginPath();
    ctx.arc(x, y, 11, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - 3, y - 3, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  };

  const c = 64;
  const l = 34;
  const r = 94;
  const pipCol = pips === 1 || pips === 6 ? '#ef4444' : '#0f172a';

  if (pips === 1) {
    drawPip(c, c, '#ef4444');
  } else if (pips === 2) {
    drawPip(l, l, pipCol);
    drawPip(r, r, pipCol);
  } else if (pips === 3) {
    drawPip(l, l, pipCol);
    drawPip(c, c, pipCol);
    drawPip(r, r, pipCol);
  } else if (pips === 4) {
    drawPip(l, l, pipCol);
    drawPip(r, l, pipCol);
    drawPip(l, r, pipCol);
    drawPip(r, r, pipCol);
  } else if (pips === 5) {
    drawPip(l, l, pipCol);
    drawPip(r, l, pipCol);
    drawPip(c, c, '#ef4444');
    drawPip(l, r, pipCol);
    drawPip(r, r, pipCol);
  } else if (pips === 6) {
    drawPip(l, 28, '#ef4444');
    drawPip(r, 28, '#ef4444');
    drawPip(l, c, '#ef4444');
    drawPip(r, c, '#ef4444');
    drawPip(l, 100, '#ef4444');
    drawPip(r, 100, '#ef4444');
  }

  const texture = new THREE.CanvasTexture(canvas);
  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.15,
    metalness: 0.1,
  });
}

function getDiceFaceEuler(value: number): THREE.Euler {
  switch (value) {
    case 1:
      return new THREE.Euler(0, 0, -Math.PI / 2);
    case 6:
      return new THREE.Euler(0, 0, Math.PI / 2);
    case 2:
      return new THREE.Euler(0, 0, 0);
    case 5:
      return new THREE.Euler(Math.PI, 0, 0);
    case 3:
      return new THREE.Euler(Math.PI / 2, 0, 0);
    case 4:
      return new THREE.Euler(-Math.PI / 2, 0, 0);
    default:
      return new THREE.Euler(0, 0, 0);
  }
}

function orientDiceFace(diceGroup: THREE.Group, value: number) {
  diceGroup.rotation.copy(getDiceFaceEuler(value));
}
