import Phaser from 'phaser';
import { fillRect, makeGrid, registerTexture, setPixel } from './PixelCanvas';
import { PALETTE } from './palette';

export const JOURNEY_ICON_KEYS = {
  MEDALLION: 'journey_medallion',
  LOCK: 'journey_lock',
  CHECK: 'journey_check',
} as const;

/** Round stone medallion used for every apparition node; recolored per state via tint. */
function medallion() {
  const size = 22;
  const grid = makeGrid(size, size);
  const rows: Array<[number, number, number]> = [
    [3, 7, 14],
    [4, 5, 16],
    [5, 4, 17],
    [6, 3, 18],
    [7, 2, 19],
    [14, 2, 19],
    [15, 3, 18],
    [16, 4, 17],
    [17, 5, 16],
    [18, 7, 14],
  ];
  fillRect(grid, 2, 8, 19, 13, 'F');
  rows.forEach(([y, x0, x1]) => fillRect(grid, x0, y, x1, y, 'F'));

  fillRect(grid, 4, 9, 17, 12, 'H');
  const shade: Array<[number, number]> = [
    [4, 9], [5, 8], [6, 7], [7, 6], [8, 5], [9, 4], [10, 4], [11, 4],
  ];
  shade.forEach(([x, y]) => setPixel(grid, x, y, 'E'));

  return { grid, palette: { F: PALETTE.woodDark, H: PALETTE.wallLight, E: '#e8dcc0' } };
}

function lockIcon() {
  const grid = makeGrid(10, 12);
  fillRect(grid, 3, 0, 6, 4, 'B');
  fillRect(grid, 4, 1, 5, 4, '.');
  fillRect(grid, 1, 4, 8, 11, 'B');
  fillRect(grid, 4, 6, 5, 8, 'D');
  return { grid, palette: { B: '#5a4d3a', D: '#2c2521' } };
}

function checkIcon() {
  const grid = makeGrid(12, 10);
  const points: Array<[number, number]> = [
    [1, 5], [2, 6], [3, 7], [4, 8], [5, 7], [6, 6], [7, 5], [8, 4], [9, 3], [10, 2], [10, 1],
    [2, 5], [3, 6], [4, 7], [5, 6], [6, 5], [7, 4], [8, 3], [9, 2],
  ];
  points.forEach(([x, y]) => setPixel(grid, x, y, 'C'));
  return { grid, palette: { C: '#3f6b3a' } };
}

export function registerJourneyIcons(scene: Phaser.Scene): void {
  const m = medallion();
  registerTexture(scene, JOURNEY_ICON_KEYS.MEDALLION, m.grid, m.palette, 1);

  const l = lockIcon();
  registerTexture(scene, JOURNEY_ICON_KEYS.LOCK, l.grid, l.palette, 1);

  const c = checkIcon();
  registerTexture(scene, JOURNEY_ICON_KEYS.CHECK, c.grid, c.palette, 1);
}
