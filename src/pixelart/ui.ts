import Phaser from 'phaser';
import { fillRect, makeGrid, registerTexture, setPixel } from './PixelCanvas';
import { HOME_PALETTE } from './homePalette';

export const UI_KEYS = {
  PANEL: 'ui_panel',
  BUTTON: 'ui_button',
  GEAR: 'ui_gear',
  CARET: 'ui_caret',
  HOME: 'ui_home',
  SCROLL: 'ui_scroll',
  // Home-screen-only variants, styled from the Home reference painting (see homePalette.ts).
  // Kept separate from the shared PANEL/BUTTON/GEAR above so redesigning the Home screen never
  // changes Settings, dialogue, or the in-gameplay top bar.
  HOME_BUTTON: 'ui_home_button',
  HOME_GEAR: 'ui_home_gear',
} as const;

export const UI_PANEL_SLICE = { size: 24, border: 6 };
export const UI_BUTTON_SLICE = { size: 20, border: 5 };
export const UI_HOME_BUTTON_SLICE = { size: 24, border: 7 };

function panelGrid(size: number, border: number, fill: string, edge: string, shadow: string) {
  const grid = makeGrid(size, size, 'F');
  fillRect(grid, 0, 0, size - 1, border - 1, 'E');
  fillRect(grid, 0, size - border, size - 1, size - 1, 'S');
  fillRect(grid, 0, 0, border - 1, size - 1, 'E');
  fillRect(grid, size - border, 0, size - 1, size - 1, 'E');
  return { grid, palette: { F: fill, E: edge, S: shadow } };
}

/**
 * A deeper-beveled stone/parchment button in the Home palette: a dark ink outline, a light
 * top/left bevel, a dark bottom/right bevel, and a warm fill — reads as a carved pixel-art
 * plaque rather than a flat HTML button.
 */
function homeButtonGrid(size: number, border: number) {
  const grid = makeGrid(size, size, 'F');
  fillRect(grid, 0, 0, size - 1, 0, 'I');
  fillRect(grid, 0, size - 1, size - 1, size - 1, 'I');
  fillRect(grid, 0, 0, 0, size - 1, 'I');
  fillRect(grid, size - 1, 0, size - 1, size - 1, 'I');
  fillRect(grid, 1, 1, size - 2, border - 2, 'H');
  fillRect(grid, 1, 1, border - 2, size - 2, 'H');
  fillRect(grid, 1, size - border + 1, size - 2, size - 2, 'S');
  fillRect(grid, size - border + 1, 1, size - 2, size - 2, 'S');
  return {
    grid,
    palette: { F: HOME_PALETTE.cream, H: HOME_PALETTE.mountainSnow, S: HOME_PALETTE.pathStoneShade, I: HOME_PALETTE.ink },
  };
}

/**
 * A proper gear/cog silhouette: a hollow-centered ring with evenly-spaced teeth, built from a
 * radius/angle test (the correct, deliberate way to construct a symmetric mechanical shape —
 * unlike organic silhouettes like trees or rocks, which must never be circles). Simple
 * directional shading (light upper-left, dark lower-right) gives it dimension.
 */
function gearGrid(size: number, colors: { base: string; highlight: string; shadow: string }) {
  const grid = makeGrid(size, size);
  const cx = (size - 1) / 2;
  const cy = (size - 1) / 2;
  const holeR = size * 0.15;
  const bodyR = size * 0.3;
  const toothR = size * 0.44;
  const teethCount = 8;
  const toothHalfArc = 14;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.hypot(dx, dy);
      if (d < holeR) continue;
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle < 0) angle += 360;
      const sector = 360 / teethCount;
      const withinSector = angle % sector;
      const distFromToothCenter = Math.min(withinSector, sector - withinSector);
      const isTooth = distFromToothCenter <= toothHalfArc;
      const maxR = isTooth ? toothR : bodyR;
      if (d > maxR) continue;
      const light = (-dx - dy) / (maxR * 1.6);
      grid[y][x] = light > 0.3 ? 'H' : light < -0.35 ? 'S' : 'C';
    }
  }
  return { grid, palette: { C: colors.base, H: colors.highlight, S: colors.shadow } };
}

export function registerUiTextures(scene: Phaser.Scene): void {
  const panel = panelGrid(UI_PANEL_SLICE.size, UI_PANEL_SLICE.border, '#efe6d3', '#7a6a52', '#5a4d3a');
  registerTexture(scene, UI_KEYS.PANEL, panel.grid, panel.palette, 1);

  const button = panelGrid(UI_BUTTON_SLICE.size, UI_BUTTON_SLICE.border, '#c9beac', '#7a6a52', '#5a4d3a');
  registerTexture(scene, UI_KEYS.BUTTON, button.grid, button.palette, 1);

  const gear = makeGrid(16, 16);
  fillRect(gear, 6, 6, 9, 9, 'C');
  const teeth: Array<[number, number]> = [
    [7, 1], [8, 1], [7, 14], [8, 14],
    [1, 7], [1, 8], [14, 7], [14, 8],
    [3, 3], [12, 3], [3, 12], [12, 12],
  ];
  teeth.forEach(([x, y]) => setPixel(gear, x, y, 'C'));
  fillRect(gear, 5, 5, 10, 10, 'C');
  setPixel(gear, 7, 7, 'H');
  setPixel(gear, 8, 7, 'H');
  setPixel(gear, 7, 8, 'H');
  setPixel(gear, 8, 8, 'H');
  registerTexture(scene, UI_KEYS.GEAR, gear, { C: '#5a4d3a', H: '#efe6d3' }, 1);

  const homeButton = homeButtonGrid(UI_HOME_BUTTON_SLICE.size, UI_HOME_BUTTON_SLICE.border);
  registerTexture(scene, UI_KEYS.HOME_BUTTON, homeButton.grid, homeButton.palette, 1);

  // Pale pastel, not the rock/shadow tones used elsewhere — the gear sits over a busy
  // illustration and needs to read as light against its darker areas.
  const homeGear = gearGrid(24, { base: HOME_PALETTE.gearLight, highlight: HOME_PALETTE.gearHighlight, shadow: HOME_PALETTE.gearShadow });
  registerTexture(scene, UI_KEYS.HOME_GEAR, homeGear.grid, homeGear.palette, 1);

  const caret = makeGrid(8, 5);
  fillRect(caret, 0, 0, 7, 0, 'C');
  fillRect(caret, 1, 1, 6, 1, 'C');
  fillRect(caret, 2, 2, 5, 2, 'C');
  fillRect(caret, 3, 3, 4, 3, 'C');
  registerTexture(scene, UI_KEYS.CARET, caret, { C: '#5a4d3a' }, 1);

  const home = makeGrid(16, 16);
  const roof: Array<[number, number, number]> = [
    [3, 7, 7],
    [4, 6, 8],
    [5, 5, 9],
    [6, 4, 10],
    [7, 3, 11],
  ];
  roof.forEach(([y, x0, x1]) => fillRect(home, x0, y, x1, y, 'C'));
  fillRect(home, 4, 8, 11, 13, 'C');
  fillRect(home, 7, 9, 8, 13, 'H');
  registerTexture(scene, UI_KEYS.HOME, home, { C: '#5a4d3a', H: '#efe6d3' }, 1);

  const scroll = makeGrid(16, 16);
  fillRect(scroll, 3, 2, 12, 13, 'C');
  fillRect(scroll, 2, 2, 13, 3, 'H');
  fillRect(scroll, 2, 12, 13, 13, 'H');
  [5, 7, 9].forEach((y) => fillRect(scroll, 5, y, 10, y, 'H'));
  registerTexture(scene, UI_KEYS.SCROLL, scroll, { C: '#efe6d3', H: '#7a6a52' }, 1);
}
