import Phaser from 'phaser';
import { fillRect, makeGrid, registerTexture, setPixel } from './PixelCanvas';

export const UI_KEYS = {
  PANEL: 'ui_panel',
  BUTTON: 'ui_button',
  GEAR: 'ui_gear',
  CARET: 'ui_caret',
} as const;

export const UI_PANEL_SLICE = { size: 24, border: 6 };
export const UI_BUTTON_SLICE = { size: 20, border: 5 };

function panelGrid(size: number, border: number, fill: string, edge: string, shadow: string) {
  const grid = makeGrid(size, size, 'F');
  fillRect(grid, 0, 0, size - 1, border - 1, 'E');
  fillRect(grid, 0, size - border, size - 1, size - 1, 'S');
  fillRect(grid, 0, 0, border - 1, size - 1, 'E');
  fillRect(grid, size - border, 0, size - 1, size - 1, 'E');
  return { grid, palette: { F: fill, E: edge, S: shadow } };
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

  const caret = makeGrid(8, 5);
  fillRect(caret, 0, 0, 7, 0, 'C');
  fillRect(caret, 1, 1, 6, 1, 'C');
  fillRect(caret, 2, 2, 5, 2, 'C');
  fillRect(caret, 3, 3, 4, 3, 'C');
  registerTexture(scene, UI_KEYS.CARET, caret, { C: '#5a4d3a' }, 1);
}
