import { fillRect, makeGrid, outlineGrid, setPixel, type Palette, type PixelGrid } from './PixelCanvas';
import { PALETTE } from './palette';

export type Facing = 'down' | 'up' | 'side';
export type Silhouette = 'dress' | 'trousers';
/** Walk frame: 'a'/'b' alternate which foot is forward for a real 2-frame step cycle. Omit for idle. */
export type StepFrame = 'a' | 'b' | null;

export interface PersonColors {
  skin: string;
  headwear: string;
  top: string;
  bottom: string;
  shoe: string;
  eye?: string;
  collar?: string;
  outline?: string;
  /** Waist accent line, e.g. the Lady's blue sash. Defaults to the bottom color (invisible). */
  accent?: string;
}

const W = 20;
const H = 28;

/**
 * Shared "paper doll" skeleton every character in the game is built from —
 * same 20x28 canvas, same proportions, palette-swapped per character, with
 * an auto-generated 1px outline for a consistent, readable silhouette.
 * `step` selects one of two alternating leg/arm poses for a real walk cycle;
 * leave it null for the idle/standing pose.
 */
export function buildPersonGrid(
  facing: Facing,
  silhouette: Silhouette = 'dress',
  accent = false,
  step: StepFrame = null,
): PixelGrid {
  const grid = makeGrid(W, H);

  // Veil / headwear.
  fillRect(grid, 5, 1, 14, 4, 'H');
  if (facing === 'up') {
    fillRect(grid, 4, 5, 15, 14, 'H');
  } else {
    fillRect(grid, 4, 5, 5, 14, 'H');
    fillRect(grid, 14, 5, 15, 14, 'H');
    fillRect(grid, 6, 5, 13, 13, 'S');
    if (facing === 'down') {
      setPixel(grid, 7, 8, 'E');
      setPixel(grid, 12, 8, 'E');
    } else {
      setPixel(grid, 12, 8, 'E');
    }
  }

  // Neck + bodice.
  fillRect(grid, 9, 14, 10, 14, 'S');
  fillRect(grid, 6, 15, 13, 20, 'T');
  fillRect(grid, 9, 15, 10, 15, 'C');

  // Arms/hands — swing slightly between the two step frames.
  const leftHandY = step === 'a' ? 18 : 20;
  const rightHandY = step === 'b' ? 18 : 20;
  fillRect(grid, 5, 16, 5, leftHandY - 1, 'T');
  fillRect(grid, 14, 16, 14, rightHandY - 1, 'T');
  setPixel(grid, 5, leftHandY, 'S');
  setPixel(grid, 14, rightHandY, 'S');

  if (silhouette === 'dress') {
    fillRect(grid, 6, 21, 13, 22, 'B');
    fillRect(grid, 4, 23, 15, 26, 'B');
    if (step === 'a') {
      fillRect(grid, 6, 27, 8, 27, 'O');
      fillRect(grid, 11, 26, 13, 26, 'O');
    } else if (step === 'b') {
      fillRect(grid, 6, 26, 8, 26, 'O');
      fillRect(grid, 11, 27, 13, 27, 'O');
    } else {
      fillRect(grid, 6, 27, 8, 27, 'O');
      fillRect(grid, 11, 27, 13, 27, 'O');
    }
  } else {
    fillRect(grid, 6, 21, 13, 23, 'B');
    fillRect(grid, 6, 24, 9, 26, 'B');
    fillRect(grid, 10, 24, 13, 26, 'B');
    if (step === 'a') {
      fillRect(grid, 6, 27, 9, 27, 'O');
      fillRect(grid, 10, 26, 13, 26, 'O');
    } else if (step === 'b') {
      fillRect(grid, 6, 26, 9, 26, 'O');
      fillRect(grid, 10, 27, 13, 27, 'O');
    } else {
      fillRect(grid, 6, 27, 9, 27, 'O');
      fillRect(grid, 10, 27, 13, 27, 'O');
    }
  }

  if (accent) {
    fillRect(grid, 6, 21, 13, 21, 'A');
  }

  return outlineGrid(grid, 'K');
}

export function personPalette(colors: PersonColors): Palette {
  return {
    H: colors.headwear,
    S: colors.skin,
    E: colors.eye ?? PALETTE.eyeDark,
    T: colors.top,
    B: colors.bottom,
    O: colors.shoe,
    A: colors.accent ?? colors.bottom,
    C: colors.collar ?? '#f5f1e6',
    K: colors.outline ?? '#332a22',
  };
}
