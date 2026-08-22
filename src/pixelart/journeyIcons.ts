import Phaser from 'phaser';
import { fillRect, makeGrid, outlineGrid, registerTexture, setPixel } from './PixelCanvas';
import { JOURNEY_PALETTE } from './journeyPalette';

export const JOURNEY_ICON_KEYS = {
  MEDALLION: 'journey_medallion',
  LOCK: 'journey_lock',
  CHECK: 'journey_check',
  ARROW: 'journey_arrow',
  HOME: 'journey_home',
} as const;

/**
 * Round pixel-art medallion used for every apparition node — recolored per state via tint (see
 * ApparitionJourneyScene.ts). Colored from the map's own cream/gold palette (journeyPalette.ts)
 * with a dark ink rim so it reads clearly as a waypoint marker against the busy illustration
 * behind it, rather than the muddy wood tone the shared gameplay palette used before.
 */
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

  return { grid, palette: { F: JOURNEY_PALETTE.ink, H: JOURNEY_PALETTE.cream, E: JOURNEY_PALETTE.glowGold } };
}

function lockIcon() {
  const grid = makeGrid(10, 12);
  fillRect(grid, 3, 0, 6, 4, 'B');
  fillRect(grid, 4, 1, 5, 4, '.');
  fillRect(grid, 1, 4, 8, 11, 'B');
  fillRect(grid, 4, 6, 5, 8, 'D');
  return { grid, palette: { B: JOURNEY_PALETTE.ink, D: JOURNEY_PALETTE.rockDark } };
}

function checkIcon() {
  const grid = makeGrid(12, 10);
  const points: Array<[number, number]> = [
    [1, 5], [2, 6], [3, 7], [4, 8], [5, 7], [6, 6], [7, 5], [8, 4], [9, 3], [10, 2], [10, 1],
    [2, 5], [3, 6], [4, 7], [5, 6], [6, 5], [7, 4], [8, 3], [9, 2],
  ];
  points.forEach(([x, y]) => setPixel(grid, x, y, 'C'));
  return { grid, palette: { C: JOURNEY_PALETTE.pineDark } };
}

/**
 * A clean, unambiguous triangular arrow pointing *up* by default — the scroll-up/scroll-down
 * buttons in ApparitionJourneyScene use this texture as-is for "up" and `.setFlipY(true)` for
 * "down", so whichever way it's meant to point is exactly which way it visually points. (The
 * previous chevron-style caret pointed down by default with no flip applied to the up-button,
 * which is why the scroll arrows read backwards — see AGENTS.md.) Cream fill with an ink outline
 * so it stays legible over any part of the busy map artwork.
 */
function arrowIcon() {
  const size = 14;
  let grid = makeGrid(size, size);
  // A solid upward triangle, apex at the top.
  for (let y = 2; y <= 10; y++) {
    const half = y - 2;
    fillRect(grid, 7 - half, y, 6 + half, y, 'C');
  }
  fillRect(grid, 5, 11, 8, 12, 'C');
  grid = outlineGrid(grid, 'O');
  return { grid, palette: { C: JOURNEY_PALETTE.cream, O: JOURNEY_PALETTE.ink } };
}

/**
 * A simple house/home silhouette (roof + door) in the Journey palette, used for the "return to
 * Home" button — replaces the previous rotated back-caret, which read as an ambiguous arrow
 * rather than a recognizable home icon.
 */
function homeIcon() {
  let grid = makeGrid(16, 16);
  const roof: Array<[number, number, number]> = [
    [3, 7, 8],
    [4, 6, 9],
    [5, 5, 10],
    [6, 4, 11],
    [7, 3, 12],
  ];
  roof.forEach(([y, x0, x1]) => fillRect(grid, x0, y, x1, y, 'C'));
  fillRect(grid, 4, 8, 11, 13, 'C');
  fillRect(grid, 7, 9, 8, 13, 'D');
  grid = outlineGrid(grid, 'O');
  return { grid, palette: { C: JOURNEY_PALETTE.cream, D: JOURNEY_PALETTE.ink, O: JOURNEY_PALETTE.ink } };
}

export function registerJourneyIcons(scene: Phaser.Scene): void {
  const m = medallion();
  registerTexture(scene, JOURNEY_ICON_KEYS.MEDALLION, m.grid, m.palette, 1);

  const l = lockIcon();
  registerTexture(scene, JOURNEY_ICON_KEYS.LOCK, l.grid, l.palette, 1);

  const c = checkIcon();
  registerTexture(scene, JOURNEY_ICON_KEYS.CHECK, c.grid, c.palette, 1);

  const a = arrowIcon();
  registerTexture(scene, JOURNEY_ICON_KEYS.ARROW, a.grid, a.palette, 1);

  const h = homeIcon();
  registerTexture(scene, JOURNEY_ICON_KEYS.HOME, h.grid, h.palette, 1);
}
