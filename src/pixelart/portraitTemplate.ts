import { fillRect, makeGrid, outlineGrid, setPixel, type Palette, type PixelGrid } from './PixelCanvas';
import type { PersonColors } from './personTemplate';

export const PORTRAIT_W = 26;
export const PORTRAIT_H = 30;

export interface PortraitState {
  eyesClosed: boolean;
  mouthOpen: boolean;
}

/**
 * Dedicated bust portrait — not a crop of the tiny overworld sprite — built
 * from the same character palette so the dialogue box and the world stay in
 * one visual family. Eyes and mouth are separate regions so blink/talk
 * states can be generated as plain palette-swapped variants of one grid.
 */
export function buildPortraitGrid(state: PortraitState): PixelGrid {
  const grid = makeGrid(PORTRAIT_W, PORTRAIT_H);

  // Veil / headwear framing the face.
  fillRect(grid, 4, 0, 21, 3, 'H');
  fillRect(grid, 3, 4, 5, 23, 'H');
  fillRect(grid, 20, 4, 22, 23, 'H');

  // Face.
  fillRect(grid, 6, 4, 19, 18, 'S');

  // Eyebrows.
  fillRect(grid, 8, 6, 10, 6, 'B');
  fillRect(grid, 15, 6, 17, 6, 'B');

  // Eyes (3x3 regions).
  drawEye(grid, 8, 8, state.eyesClosed);
  drawEye(grid, 15, 8, state.eyesClosed);

  // A soft cheek accent for warmth.
  setPixel(grid, 7, 13, 'R');
  setPixel(grid, 18, 13, 'R');

  // Mouth.
  if (state.mouthOpen) {
    fillRect(grid, 11, 15, 13, 16, 'M');
  } else {
    fillRect(grid, 11, 16, 13, 16, 'M');
  }

  // Neck + shoulders/bodice.
  fillRect(grid, 10, 19, 15, 20, 'S');
  fillRect(grid, 3, 21, 22, 29, 'T');
  fillRect(grid, 10, 21, 15, 21, 'C');

  return outlineGrid(grid, 'K');
}

function drawEye(grid: PixelGrid, x: number, y: number, closed: boolean): void {
  if (closed) {
    fillRect(grid, x, y + 1, x + 2, y + 1, 'B');
  } else {
    fillRect(grid, x, y, x + 2, y + 2, 'P');
    setPixel(grid, x + 1, y + 1, 'W');
  }
}

export function portraitPalette(colors: PersonColors): Palette {
  return {
    H: colors.headwear,
    S: colors.skin,
    T: colors.top,
    C: colors.collar ?? '#f5f1e6',
    B: '#3a2c1e',
    P: colors.eye ?? '#3a2c1e',
    W: '#fdf8ec',
    M: '#8a4a42',
    R: 'rgba(200,120,110,0.35)',
    K: colors.outline ?? '#332a22',
  };
}
