import { BoardCellCoord, PlayerColor } from '../types/ludo';

export const CELL_SIZE = 0.85;

// Convert 15x15 grid coordinates to centered 3D world space
export function gridToWorld(col: number, row: number): { x: number; z: number } {
  return {
    x: (col - 7) * CELL_SIZE,
    z: (row - 7) * CELL_SIZE,
  };
}

// 52 Main Clockwise Track Tiles
export const TRACK_CELLS: { col: number; row: number }[] = [
  // Red side arm (0..4)
  { col: 1, row: 6 }, // 0: Red Start (SAFE)
  { col: 2, row: 6 }, // 1
  { col: 3, row: 6 }, // 2
  { col: 4, row: 6 }, // 3
  { col: 5, row: 6 }, // 4
  // Going up into Top/Green side arm (5..10)
  { col: 6, row: 5 }, // 5
  { col: 6, row: 4 }, // 6
  { col: 6, row: 3 }, // 7
  { col: 6, row: 2 }, // 8: SAFE STAR
  { col: 6, row: 1 }, // 9
  { col: 6, row: 0 }, // 10
  { col: 7, row: 0 }, // 11: Top apex
  { col: 8, row: 0 }, // 12
  // Down from top (13..17)
  { col: 8, row: 1 }, // 13: Green Start (SAFE)
  { col: 8, row: 2 }, // 14
  { col: 8, row: 3 }, // 15
  { col: 8, row: 4 }, // 16
  { col: 8, row: 5 }, // 17
  // Into Right/Yellow arm (18..23)
  { col: 9, row: 6 }, // 18
  { col: 10, row: 6 }, // 19
  { col: 11, row: 6 }, // 20
  { col: 12, row: 6 }, // 21: SAFE STAR
  { col: 13, row: 6 }, // 22
  { col: 14, row: 6 }, // 23
  { col: 14, row: 7 }, // 24: Right apex
  { col: 14, row: 8 }, // 25
  // Back left from right (26..30)
  { col: 13, row: 8 }, // 26: Yellow Start (SAFE)
  { col: 12, row: 8 }, // 27
  { col: 11, row: 8 }, // 28
  { col: 10, row: 8 }, // 29
  { col: 9, row: 8 }, // 30
  // Down into Bottom/Blue arm (31..36)
  { col: 8, row: 9 }, // 31
  { col: 8, row: 10 }, // 32
  { col: 8, row: 11 }, // 33
  { col: 8, row: 12 }, // 34: SAFE STAR
  { col: 8, row: 13 }, // 35
  { col: 8, row: 14 }, // 36
  { col: 7, row: 14 }, // 37: Bottom apex
  { col: 6, row: 14 }, // 38
  // Up from bottom (39..43)
  { col: 6, row: 13 }, // 39: Blue Start (SAFE)
  { col: 6, row: 12 }, // 40
  { col: 6, row: 11 }, // 41
  { col: 6, row: 10 }, // 42
  { col: 6, row: 9 }, // 43
  // Left into Left/Red return arm (44..49)
  { col: 5, row: 8 }, // 44
  { col: 4, row: 8 }, // 45
  { col: 3, row: 8 }, // 46
  { col: 2, row: 8 }, // 47: SAFE STAR
  { col: 1, row: 8 }, // 48
  { col: 0, row: 8 }, // 49
  { col: 0, row: 7 }, // 50: Left apex
  { col: 0, row: 6 }, // 51: Final cell before Red runway
];

export const SAFE_TRACK_INDICES = [0, 8, 13, 21, 26, 34, 39, 47];

export const PLAYER_START_TRACK_INDICES: Record<PlayerColor, number> = {
  red: 0,
  green: 13,
  yellow: 26,
  blue: 39,
};

// 5 Runway Cells leading to home apex
export const HOME_RUNWAYS: Record<PlayerColor, { col: number; row: number }[]> = {
  red: [
    { col: 1, row: 7 },
    { col: 2, row: 7 },
    { col: 3, row: 7 },
    { col: 4, row: 7 },
    { col: 5, row: 7 },
  ],
  green: [
    { col: 7, row: 1 },
    { col: 7, row: 2 },
    { col: 7, row: 3 },
    { col: 7, row: 4 },
    { col: 7, row: 5 },
  ],
  yellow: [
    { col: 13, row: 7 },
    { col: 12, row: 7 },
    { col: 11, row: 7 },
    { col: 10, row: 7 },
    { col: 9, row: 7 },
  ],
  blue: [
    { col: 7, row: 13 },
    { col: 7, row: 12 },
    { col: 7, row: 11 },
    { col: 7, row: 10 },
    { col: 7, row: 9 },
  ],
};

// Central Home Apex position for each player
export const HOME_APEX_COORDS: Record<PlayerColor, { col: number; row: number }> = {
  red: { col: 6.2, row: 7.0 },
  green: { col: 7.0, row: 6.2 },
  yellow: { col: 7.8, row: 7.0 },
  blue: { col: 7.0, row: 7.8 },
};

// 4 Yard Pedestals for each color base
export const YARD_PEDESTALS: Record<PlayerColor, { col: number; row: number }[]> = {
  red: [
    { col: 1.6, row: 1.6 },
    { col: 3.4, row: 1.6 },
    { col: 1.6, row: 3.4 },
    { col: 3.4, row: 3.4 },
  ],
  green: [
    { col: 10.6, row: 1.6 },
    { col: 12.4, row: 1.6 },
    { col: 10.6, row: 3.4 },
    { col: 12.4, row: 3.4 },
  ],
  yellow: [
    { col: 10.6, row: 10.6 },
    { col: 12.4, row: 10.6 },
    { col: 10.6, row: 12.4 },
    { col: 12.4, row: 12.4 },
  ],
  blue: [
    { col: 1.6, row: 10.6 },
    { col: 3.4, row: 10.6 },
    { col: 1.6, row: 12.4 },
    { col: 3.4, row: 12.4 },
  ],
};

export const COLOR_HEX: Record<PlayerColor, { primary: string; secondary: string; glow: string }> = {
  red: { primary: '#ef4444', secondary: '#b91c1c', glow: '#ff6b6b' },
  green: { primary: '#10b981', secondary: '#047857', glow: '#34d399' },
  yellow: { primary: '#eab308', secondary: '#a16207', glow: '#fde047' },
  blue: { primary: '#3b82f6', secondary: '#1d4ed8', glow: '#60a5fa' },
};

/**
 * Maps a token's color and step (from -1 up to 56) to its 3D world position,
 * with intelligent cluster offsets when multiple tokens share the same square.
 */
export function getTokenWorldPosition(
  color: PlayerColor,
  tokenId: number,
  step: number,
  clusterIndex: number = 0,
  clusterTotal: number = 1
): { x: number; y: number; z: number } {
  if (step === -1) {
    // In Base Yard: sits firmly on top of the circular pedestal (y = 0.10)
    const yardPedestal = YARD_PEDESTALS[color][tokenId] || YARD_PEDESTALS[color][0];
    const { x, z } = gridToWorld(yardPedestal.col, yardPedestal.row);
    return { x, y: 0.10, z };
  }

  // Calculate cluster offset if multiple coins are on the exact same tile
  let ox = 0;
  let oz = 0;
  if (clusterTotal > 1) {
    const angle = (clusterIndex / clusterTotal) * Math.PI * 2;
    const radius = clusterTotal === 2 ? 0.14 : 0.18;
    ox = Math.cos(angle) * radius;
    oz = Math.sin(angle) * radius;
  }

  if (step >= 0 && step <= 50) {
    // On the 52-tile track (sits on the track circular dot)
    const startIdx = PLAYER_START_TRACK_INDICES[color];
    const trackIdx = (startIdx + step) % 52;
    const cell = TRACK_CELLS[trackIdx];
    const { x, z } = gridToWorld(cell.col, cell.row);
    return { x: x + ox, y: 0.025, z: z + oz };
  }

  if (step >= 51 && step <= 55) {
    // In Home Runway (steps 51..55 correspond to runway index 0..4)
    const runwayIdx = step - 51;
    const cell = HOME_RUNWAYS[color][runwayIdx];
    const { x, z } = gridToWorld(cell.col, cell.row);
    return { x: x + ox, y: 0.025, z: z + oz };
  }

  // Home Apex (step === 56)
  const apex = HOME_APEX_COORDS[color];
  const { x, z } = gridToWorld(apex.col, apex.row);
  const angle = (tokenId / 4) * Math.PI * 2;
  return {
    x: x + Math.cos(angle) * 0.22,
    y: 0.035,
    z: z + Math.sin(angle) * 0.22,
  };
}

/**
 * Returns true if the token at this step is in a safe zone (cannot be captured).
 */
export function isTokenInSafeZone(color: PlayerColor, step: number): boolean {
  if (step < 0 || step > 50) return true; // Yards, runways and apex are always immune
  const startIdx = PLAYER_START_TRACK_INDICES[color];
  const trackIdx = (startIdx + step) % 52;
  return SAFE_TRACK_INDICES.includes(trackIdx);
}

/**
 * Computes track index for step 0..50
 */
export function getTrackIndexForToken(color: PlayerColor, step: number): number | null {
  if (step < 0 || step > 50) return null;
  return (PLAYER_START_TRACK_INDICES[color] + step) % 52;
}
