import { fillRect, makeGrid, setPixel, type Palette, type PixelGrid } from './PixelCanvas';
import { PALETTE } from './palette';

export type Facing = 'down' | 'up' | 'side';
export type Silhouette = 'dress' | 'trousers';

export interface PersonColors {
  skin: string;
  headwear: string;
  top: string;
  bottom: string;
  shoe: string;
  eye?: string;
  /** Waist accent line, e.g. the Lady's blue sash. Defaults to the bottom color (invisible). */
  accent?: string;
}

/**
 * One shared 16x24 "paper doll" skeleton, palette-swapped per character.
 * Keeps every actor in the game at an identical, consistent pixel scale.
 */
export function buildPersonGrid(facing: Facing, silhouette: Silhouette = 'dress', accent = false): PixelGrid {
  const grid = makeGrid(16, 24);

  fillRect(grid, 4, 0, 11, 1, 'H');

  if (facing === 'up') {
    fillRect(grid, 4, 2, 11, 6, 'H');
  } else {
    fillRect(grid, 4, 2, 4, 6, 'H');
    fillRect(grid, 11, 2, 11, 6, 'H');
    fillRect(grid, 5, 2, 10, 6, 'S');
    if (facing === 'down') {
      setPixel(grid, 6, 4, 'E');
      setPixel(grid, 9, 4, 'E');
    } else {
      setPixel(grid, 9, 4, 'E');
    }
  }

  fillRect(grid, 6, 7, 9, 7, 'S');

  fillRect(grid, 3, 8, 12, 13, 'T');
  setPixel(grid, 3, 13, 'S');
  setPixel(grid, 12, 13, 'S');

  if (silhouette === 'dress') {
    fillRect(grid, 3, 14, 12, 15, 'B');
    fillRect(grid, 2, 16, 13, 20, 'B');
    fillRect(grid, 4, 21, 6, 23, 'O');
    fillRect(grid, 9, 21, 11, 23, 'O');
  } else {
    fillRect(grid, 3, 14, 12, 16, 'B');
    fillRect(grid, 4, 17, 7, 21, 'B');
    fillRect(grid, 8, 17, 11, 21, 'B');
    fillRect(grid, 4, 22, 7, 23, 'O');
    fillRect(grid, 8, 22, 11, 23, 'O');
  }

  if (accent) {
    fillRect(grid, 3, 14, 12, 14, 'A');
  }

  return grid;
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
  };
}
