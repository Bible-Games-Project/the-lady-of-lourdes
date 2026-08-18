import Phaser from 'phaser';
import { fillRect, makeGrid, registerTexture, setPixel, type PixelGrid } from './PixelCanvas';
import { PALETTE } from './palette';

export const INTERIOR_PROP_KEYS = {
  BED: 'interior_bed',
  HEARTH: 'interior_hearth',
  TABLE: 'interior_table',
  STOOL: 'interior_stool',
} as const;

function bed(): { grid: PixelGrid; palette: Record<string, string> } {
  const grid = makeGrid(40, 22);
  fillRect(grid, 0, 0, 39, 21, 'F'); // frame
  fillRect(grid, 2, 2, 37, 19, 'B'); // blanket
  fillRect(grid, 2, 2, 37, 6, 'P'); // pillow area
  return { grid, palette: { F: PALETTE.woodDark, B: '#8a97a3', P: '#e8dfc9' } };
}

function hearth(): { grid: PixelGrid; palette: Record<string, string> } {
  const grid = makeGrid(28, 24);
  fillRect(grid, 0, 0, 27, 23, 'S'); // stone surround
  fillRect(grid, 3, 6, 24, 23, 'D'); // dark interior
  fillRect(grid, 9, 14, 18, 21, 'E1'); // ember glow base
  setPixel(grid, 11, 12, 'E2');
  setPixel(grid, 15, 10, 'E2');
  setPixel(grid, 13, 13, 'E2');
  return {
    grid,
    palette: { S: PALETTE.stoneDark, D: '#1c1815', E1: '#7a3a20', E2: '#e0925a' },
  };
}

function table(): { grid: PixelGrid; palette: Record<string, string> } {
  const grid = makeGrid(32, 18);
  fillRect(grid, 0, 0, 31, 5, 'T');
  fillRect(grid, 2, 6, 5, 17, 'L');
  fillRect(grid, 26, 6, 29, 17, 'L');
  return { grid, palette: { T: PALETTE.woodLight, L: PALETTE.woodDark } };
}

function stool(): { grid: PixelGrid; palette: Record<string, string> } {
  const grid = makeGrid(14, 12);
  fillRect(grid, 0, 0, 13, 3, 'T');
  fillRect(grid, 1, 4, 3, 11, 'L');
  fillRect(grid, 10, 4, 12, 11, 'L');
  return { grid, palette: { T: PALETTE.woodLight, L: PALETTE.woodDark } };
}

export function registerInteriorProps(scene: Phaser.Scene): void {
  const b = bed();
  registerTexture(scene, INTERIOR_PROP_KEYS.BED, b.grid, b.palette, 1);
  const h = hearth();
  registerTexture(scene, INTERIOR_PROP_KEYS.HEARTH, h.grid, h.palette, 1);
  const t = table();
  registerTexture(scene, INTERIOR_PROP_KEYS.TABLE, t.grid, t.palette, 1);
  const s = stool();
  registerTexture(scene, INTERIOR_PROP_KEYS.STOOL, s.grid, s.palette, 1);
}
