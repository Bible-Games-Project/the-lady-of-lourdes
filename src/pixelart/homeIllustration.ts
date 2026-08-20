import Phaser from 'phaser';
import { fillRect, makeGrid, registerTexture, setPixel } from './PixelCanvas';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { HOME_PALETTE as P } from './homePalette';

export const HOME_ILLUSTRATION_KEY = 'home_illustration';

const UNIT = 3; // each grid cell becomes a UNIT x UNIT block => 160x90 grid fills the 480x270 canvas.
const W = GAME_WIDTH / UNIT;
const H = GAME_HEIGHT / UNIT;

/**
 * Title-screen illustration: Bernadette kneeling in prayer before the Lady at the Grotto of
 * Massabielle, mountains and autumn trees behind. Recolored/extended to match the maintainer's
 * reference painting — see homePalette.ts. Composed as a low-resolution pixel-art scene (not
 * gameplay), rendered chunky and warm rather than photorealistic.
 */
export function registerHomeIllustration(scene: Phaser.Scene): void {
  if (scene.textures.exists(HOME_ILLUSTRATION_KEY)) return;

  const grid = makeGrid(W, H);

  // Sky: cool pale blue, deeper at the top, hazing pale near the mountains.
  fillRect(grid, 0, 0, W - 1, 3, 'skyTop');
  fillRect(grid, 0, 4, W - 1, 8, 'skyMid');
  fillRect(grid, 0, 9, W - 1, 13, 'skyHaze');
  fillRect(grid, 0, 14, W - 1, 17, 'skyHaze');

  // Base hillside fill across the full width, BEFORE the mountain ranges/treeline are drawn on
  // top at the sides — otherwise the gap between them (the middle, behind the grotto) is left
  // transparent and the game's near-black clear color shows through as a solid bar.
  fillRect(grid, 0, 16, W - 1, 19, 'grassShade');

  // Soft clouds.
  [[6, 3, 20, 5], [110, 2, 128, 4], [88, 5, 100, 6]].forEach(([x0, y0, x1, y1]) => fillRect(grid, x0, y0, x1, y1, 'cloud'));
  [[6, 5, 20, 5], [110, 4, 128, 4]].forEach(([x0, y0, x1, y1]) => fillRect(grid, x0, y0, x1, y1, 'cloudShade'));

  // Snow-capped mountains, jagged silhouette rather than a flat block. Two separate ranges,
  // left and right of the grotto — they must not connect across that gap.
  const drawRange = (peaks: Array<[number, number]>): void => {
    for (let i = 0; i < peaks.length - 1; i++) {
      const [x0, y0] = peaks[i];
      const [x1, y1] = peaks[i + 1];
      const steps = x1 - x0;
      for (let sx = 0; sx <= steps; sx++) {
        const t = sx / steps;
        const y = Math.round(y0 + (y1 - y0) * t);
        fillRect(grid, x0 + sx, y, x0 + sx, 21, 'mountainRock');
        fillRect(grid, x0 + sx, y, x0 + sx, y + 2, 'mountainSnow');
      }
    }
  };
  drawRange([[4, 14], [14, 10], [24, 15], [34, 9], [44, 16]]);
  drawRange([[96, 15], [106, 9], [116, 14], [126, 11], [136, 16]]);
  fillRect(grid, 0, 18, 45, 22, 'mountainShade');
  fillRect(grid, 95, 18, W - 1, 22, 'mountainShade');

  // Distant pine treeline at the mountains' feet.
  for (let x = 0; x < 46; x += 3) fillRect(grid, x, 19, x + 1, 22, x % 6 === 0 ? 'pineDark' : 'pineMid');
  for (let x = 96; x < W; x += 3) fillRect(grid, x, 19, x + 1, 22, x % 6 === 0 ? 'pineDark' : 'pineMid');

  fillRect(grid, 0, 20, W - 1, 25, 'grassShade');

  // Grass covers everything below the hills; the grotto and figures sit on top of it.
  fillRect(grid, 0, 22, W - 1, H - 1, 'grass');

  // Autumn trees flanking the scene, irregular clustered canopies (not circles).
  const autumnTree = (x: number, y: number, w: number): void => {
    fillRect(grid, x, y, x + w, y + 5, 'foliageAmber');
    fillRect(grid, x + 1, y - 2, x + w - 1, y + 1, 'foliageGold');
    fillRect(grid, x, y + 3, x + Math.floor(w / 2), y + 6, 'foliageRust');
    fillRect(grid, x + Math.floor(w / 2) - 1, y + 6, x + Math.floor(w / 2) + 1, y + 12, 'trunkDark');
  };
  autumnTree(2, 12, 10);
  autumnTree(16, 16, 8);
  autumnTree(132, 13, 11);
  autumnTree(120, 18, 7);

  // Grotto rock mass, with a stepped, irregular silhouette rather than a flat block.
  fillRect(grid, 48, 26, 114, 50, 'rockStone');
  fillRect(grid, 54, 22, 108, 26, 'rockStone');
  fillRect(grid, 62, 20, 100, 22, 'rockStone');
  fillRect(grid, 48, 26, 58, 46, 'rockShade');
  fillRect(grid, 104, 26, 114, 46, 'rockShade');
  const speckle: Array<[number, number]> = [
    [52, 30], [60, 34], [70, 24], [90, 28], [100, 32], [110, 38], [56, 42], [98, 44],
  ];
  speckle.forEach(([x, y]) => setPixel(grid, x, y, 'rockDark'));

  // Cave arch (rounded via stepped inset).
  const arch: Array<[number, number, number]> = [
    [27, 79, 79],
    [28, 77, 81],
    [29, 75, 83],
    [30, 74, 84],
    [31, 72, 86],
    [32, 71, 87],
  ];
  arch.forEach(([y, x0, x1]) => fillRect(grid, x0, y, x1, y, 'caveDark'));
  fillRect(grid, 71, 33, 87, 50, 'caveDark');

  // Warm golden glow inside the cave, behind the Lady.
  fillRect(grid, 72, 34, 86, 48, 'glowGoldSoft');
  fillRect(grid, 75, 36, 83, 46, 'glowGold');

  // The Lady: soft white silhouette standing within the niche, blue sash.
  fillRect(grid, 75, 36, 83, 39, 'ladyRobeShade');
  fillRect(grid, 73, 40, 85, 48, 'ladyRobe');
  fillRect(grid, 74, 43, 76, 48, 'ladyRobeShade');
  fillRect(grid, 77, 43, 81, 47, 'ladySash');

  // A low stone bridge crossing the river in the distance.
  fillRect(grid, 118, 74, 138, 76, 'pathStoneShade');
  fillRect(grid, 120, 71, 122, 74, 'pathStone');
  fillRect(grid, 134, 71, 136, 74, 'pathStone');

  // River in the foreground, reflecting the sky.
  fillRect(grid, 0, 78, W - 1, H - 1, 'riverBlue');
  fillRect(grid, 0, 78, W - 1, 79, 'riverHighlight');
  for (let x = 2; x < W; x += 6) setPixel(grid, x, 84, 'riverDark');
  for (let x = 4; x < W; x += 9) setPixel(grid, x, 88, 'riverHighlight');

  // Bernadette, kneeling in prayer just in front of the grotto, facing the Lady.
  fillRect(grid, 56, 42, 62, 44, 'kneelKerchief');
  fillRect(grid, 57, 39, 61, 42, 'trunkDark');
  fillRect(grid, 55, 44, 63, 51, 'kneelRobe');
  fillRect(grid, 53, 49, 65, 54, 'kneelRobe');
  fillRect(grid, 53, 53, 57, 55, 'rockDark');
  fillRect(grid, 61, 53, 65, 55, 'rockDark');

  // Candles at the grotto steps.
  [[68, 51], [90, 52], [94, 53]].forEach(([x, y]) => {
    fillRect(grid, x, y, x + 1, y + 3, 'candleWax');
    setPixel(grid, x, y - 1, 'candleFlame');
  });

  registerTexture(scene, HOME_ILLUSTRATION_KEY, grid, P, UNIT);
}
