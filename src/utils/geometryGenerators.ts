import * as THREE from 'three';
import { GeometryType } from '../types';

/**
 * Generates initial 3D positions for a given geometry type
 * using deterministic or quasi-random mathematical distributions.
 */
export function generateGeometryPositions(type: GeometryType, count: number): Float32Array {
  const positions = new Float32Array(count * 3);
  const tempVec = new THREE.Vector3();

  switch (type) {
    case 'sphere': {
      // Golden spiral / Fibonacci sphere distribution for uniform dot density
      const phi = Math.PI * (Math.sqrt(5) - 1); // golden ratio angle
      const radius = 2.4;

      for (let i = 0; i < count; i++) {
        const y = 1 - (i / (count - 1)) * 2; // y goes from 1 to -1
        const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = phi * i;

        const x = Math.cos(theta) * radiusAtY;
        const z = Math.sin(theta) * radiusAtY;

        // Slight natural depth variation
        const r = radius + (Math.sin(i * 0.3) * 0.05);
        positions[i * 3] = x * r;
        positions[i * 3 + 1] = y * r;
        positions[i * 3 + 2] = z * r;
      }
      break;
    }

    case 'orbital-rings': {
      // 6 concentric tilted gyroscopic rings of circular dots
      const numRings = 7;
      const dotsPerRing = Math.floor(count / numRings);
      const ringTilts = [
        new THREE.Euler(0, 0, 0),
        new THREE.Euler(Math.PI / 4, Math.PI / 6, 0),
        new THREE.Euler(-Math.PI / 3, Math.PI / 4, Math.PI / 6),
        new THREE.Euler(Math.PI / 2.5, -Math.PI / 3, 0),
        new THREE.Euler(-Math.PI / 6, Math.PI / 3, Math.PI / 4),
        new THREE.Euler(Math.PI / 3, 0, -Math.PI / 3),
        new THREE.Euler(-Math.PI / 4, -Math.PI / 4, Math.PI / 2),
      ];

      for (let i = 0; i < count; i++) {
        const ringIdx = Math.min(Math.floor(i / dotsPerRing), numRings - 1);
        const dotInRing = i % dotsPerRing;
        const angle = (dotInRing / dotsPerRing) * Math.PI * 2;
        const ringRadius = 1.0 + ringIdx * 0.45;

        // Base ring in XZ plane
        tempVec.set(
          Math.cos(angle) * ringRadius,
          (Math.sin(angle * 3) * 0.05), // subtle wavy ring offset
          Math.sin(angle) * ringRadius
        );

        // Apply 3D tilt
        tempVec.applyEuler(ringTilts[ringIdx]);

        positions[i * 3] = tempVec.x;
        positions[i * 3 + 1] = tempVec.y;
        positions[i * 3 + 2] = tempVec.z;
      }
      break;
    }

    case 'torus': {
      // 3D Torus composed of helical dot streams
      const R = 2.0; // major radius
      const r = 0.85; // minor tube radius

      for (let i = 0; i < count; i++) {
        // Parametric coordinates u and v
        const u = (i / count) * Math.PI * 2 * 9; // helical winding
        const v = (i / count) * Math.PI * 2;

        const x = (R + r * Math.cos(u)) * Math.cos(v);
        const y = (R + r * Math.cos(u)) * Math.sin(v);
        const z = r * Math.sin(u);

        positions[i * 3] = x;
        positions[i * 3 + 1] = z; // rotate to look pleasing
        positions[i * 3 + 2] = y;
      }
      break;
    }

    case 'galaxy-spiral': {
      // Logarithmic Fibonacci spiral galaxy of dots with 4 spiral arms
      const arms = 4;
      const armOffset = (Math.PI * 2) / arms;

      for (let i = 0; i < count; i++) {
        const arm = i % arms;
        const distance = Math.pow(Math.random(), 0.6) * 3.4 + 0.2;
        const angle = distance * 2.2 + arm * armOffset;

        const spread = (Math.random() - 0.5) * (0.2 + distance * 0.15);
        const x = Math.cos(angle) * distance + spread;
        const z = Math.sin(angle) * distance + spread;
        const y = (Math.random() - 0.5) * (0.8 / (distance + 0.5)); // thinner at edges

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
      }
      break;
    }

    case 'wave-surface': {
      // Concentric circular dot grid forming an undulating circular plane
      const maxRadius = 3.2;
      for (let i = 0; i < count; i++) {
        // Distribute points radially with uniform area density
        const rNorm = Math.sqrt((i + 0.5) / count);
        const r = rNorm * maxRadius;
        const theta = i * 2.399963229728653; // Golden angle

        const x = Math.cos(theta) * r;
        const z = Math.sin(theta) * r;
        const y = Math.sin(r * 3.0) * 0.25;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
      }
      break;
    }

    case 'macro-orb': {
      // Multi-layer macro circular orb: 60% in dense luminous core, 25% in outer shell, 15% in orbital satellites
      for (let i = 0; i < count; i++) {
        const ratio = i / count;
        if (ratio < 0.55) {
          // Dense inner core
          const phi = Math.PI * (Math.sqrt(5) - 1);
          const y = 1 - (i / (count * 0.55 - 1)) * 2;
          const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
          const theta = phi * i;
          const r = 1.4;

          positions[i * 3] = Math.cos(theta) * radiusAtY * r;
          positions[i * 3 + 1] = y * r;
          positions[i * 3 + 2] = Math.sin(theta) * radiusAtY * r;
        } else if (ratio < 0.85) {
          // Outer halo shell
          const subIdx = i - count * 0.55;
          const subCount = count * 0.3;
          const phi = Math.PI * (Math.sqrt(5) - 1);
          const y = 1 - (subIdx / (subCount - 1)) * 2;
          const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
          const theta = phi * subIdx;
          const r = 2.6 + Math.sin(subIdx * 0.1) * 0.15;

          positions[i * 3] = Math.cos(theta) * radiusAtY * r;
          positions[i * 3 + 1] = y * r;
          positions[i * 3 + 2] = Math.sin(theta) * radiusAtY * r;
        } else {
          // Satellite dots orbiting around
          const subIdx = i - count * 0.85;
          const subCount = count * 0.15;
          const angle = (subIdx / subCount) * Math.PI * 2 * 3;
          const r = 3.5;
          const ringY = Math.sin(subIdx * 0.5) * 0.8;

          positions[i * 3] = Math.cos(angle) * r;
          positions[i * 3 + 1] = ringY;
          positions[i * 3 + 2] = Math.sin(angle) * r;
        }
      }
      break;
    }
  }

  return positions;
}
