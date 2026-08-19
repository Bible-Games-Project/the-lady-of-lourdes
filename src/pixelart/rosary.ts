import Phaser from 'phaser';
import { fillRect, makeGrid, registerTexture, setPixel } from './PixelCanvas';

export const ROSARY_KEYS = {
  CROSS: 'rosary_cross',
  BEAD_DIM: 'rosary_bead_dim',
  BEAD_LIT: 'rosary_bead_lit',
} as const;

function cross() {
  const grid = makeGrid(10, 14);
  fillRect(grid, 4, 0, 5, 13, 'W');
  fillRect(grid, 1, 4, 8, 5, 'W');
  fillRect(grid, 4, 0, 5, 13, 'H');
  fillRect(grid, 5, 0, 5, 13, 'S');
  return { grid, palette: { W: '#c9a24a', H: '#e8cf7a', S: '#8a6a2a' } };
}

function bead(lit: boolean) {
  const grid = makeGrid(8, 8);
  fillRect(grid, 2, 0, 5, 0, 'B');
  fillRect(grid, 1, 1, 6, 1, 'B');
  fillRect(grid, 0, 2, 7, 5, 'B');
  fillRect(grid, 1, 6, 6, 6, 'B');
  fillRect(grid, 2, 7, 5, 7, 'B');
  setPixel(grid, 2, 2, 'H');
  setPixel(grid, 3, 2, 'H');
  const base = lit ? '#c9a24a' : '#9c8158';
  const hi = lit ? '#f2e0a0' : '#c1a578';
  return { grid, palette: { B: base, H: hi } };
}

export function registerRosaryTextures(scene: Phaser.Scene): void {
  const c = cross();
  registerTexture(scene, ROSARY_KEYS.CROSS, c.grid, c.palette, 1);

  const dim = bead(false);
  registerTexture(scene, ROSARY_KEYS.BEAD_DIM, dim.grid, dim.palette, 1);

  const lit = bead(true);
  registerTexture(scene, ROSARY_KEYS.BEAD_LIT, lit.grid, lit.palette, 1);
}
