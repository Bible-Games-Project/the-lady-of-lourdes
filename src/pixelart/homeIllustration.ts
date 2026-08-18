import Phaser from 'phaser';
import { fillRect, makeGrid, registerTexture, setPixel } from './PixelCanvas';
import { GAME_WIDTH, GAME_HEIGHT } from '../core/constants';

export const HOME_ILLUSTRATION_KEY = 'home_illustration';

const UNIT = 3; // each grid cell becomes a UNIT x UNIT block => 160x90 grid fills the 480x270 canvas.
const W = GAME_WIDTH / UNIT;
const H = GAME_HEIGHT / UNIT;

/**
 * Title-screen illustration: Bernadette kneeling in prayer before the Lady at
 * the Grotto of Massabielle. Composed as a low-resolution pixel-art scene
 * (not gameplay), rendered chunky and warm rather than photorealistic.
 */
export function registerHomeIllustration(scene: Phaser.Scene): void {
  if (scene.textures.exists(HOME_ILLUSTRATION_KEY)) return;

  const grid = makeGrid(W, H);

  // Sky: soft pastel dusk gradient.
  fillRect(grid, 0, 0, W - 1, 4, 'sky1');
  fillRect(grid, 0, 5, W - 1, 9, 'sky2');
  fillRect(grid, 0, 10, W - 1, 14, 'sky3');
  fillRect(grid, 0, 15, W - 1, 19, 'sky4');

  // Distant hills.
  fillRect(grid, 0, 12, 45, 21, 'hillFar');
  fillRect(grid, 95, 10, W - 1, 21, 'hillFar');
  fillRect(grid, 0, 16, W - 1, 24, 'hillNear');

  // Grass covers everything below the hills; the grotto and figures sit on top of it.
  fillRect(grid, 0, 18, W - 1, H - 1, 'grass');

  // Grotto rock mass, with a stepped, irregular silhouette rather than a flat block.
  fillRect(grid, 48, 26, 114, 50, 'rock');
  fillRect(grid, 54, 22, 108, 26, 'rock');
  fillRect(grid, 62, 20, 100, 22, 'rock');
  fillRect(grid, 48, 26, 58, 46, 'rockShade');
  fillRect(grid, 104, 26, 114, 46, 'rockShade');
  const speckle: Array<[number, number]> = [
    [52, 30], [60, 34], [70, 24], [90, 28], [100, 32], [110, 38], [56, 42], [98, 44],
  ];
  speckle.forEach(([x, y]) => setPixel(grid, x, y, 'rockShade'));

  // Cave arch (rounded via stepped inset).
  const arch: Array<[number, number, number]> = [
    [27, 79, 79],
    [28, 77, 81],
    [29, 75, 83],
    [30, 74, 84],
    [31, 72, 86],
    [32, 71, 87],
  ];
  arch.forEach(([y, x0, x1]) => fillRect(grid, x0, y, x1, y, 'cave'));
  fillRect(grid, 71, 33, 87, 50, 'cave');

  // Warm glow inside the cave, behind the Lady.
  fillRect(grid, 72, 34, 86, 48, 'glow2');
  fillRect(grid, 75, 36, 83, 46, 'glow1');

  // The Lady: soft white silhouette standing within the niche.
  fillRect(grid, 75, 36, 83, 39, 'ladyHead');
  fillRect(grid, 73, 40, 85, 48, 'ladyRobe');
  fillRect(grid, 77, 43, 81, 44, 'sash');

  // River in the foreground, reflecting the sky.
  fillRect(grid, 0, 78, W - 1, H - 1, 'water');
  for (let x = 2; x < W; x += 6) setPixel(grid, x, 82, 'foam');

  // Bernadette, kneeling in prayer just in front of the grotto, facing the Lady.
  fillRect(grid, 56, 42, 62, 44, 'scarf');
  fillRect(grid, 57, 39, 61, 42, 'hair');
  fillRect(grid, 55, 44, 63, 51, 'dress');
  fillRect(grid, 53, 49, 65, 54, 'dress');
  fillRect(grid, 53, 53, 57, 55, 'shoe');
  fillRect(grid, 61, 53, 65, 55, 'shoe');

  const palette: Record<string, string> = {
    sky1: '#f3e3c2',
    sky2: '#eccfa8',
    sky3: '#e0b98f',
    sky4: '#cfa27f',
    glow1: '#fff3cf',
    glow2: 'rgba(255,240,200,0.55)',
    hillFar: '#a98f78',
    hillNear: '#8c7a5e',
    rock: '#9a9184',
    rockShade: '#726a5e',
    cave: '#2c2521',
    ladyHead: '#f2e0c9',
    ladyRobe: '#f7f4ec',
    sash: '#7fa8c9',
    grass: '#7d9a5c',
    water: '#6f9bbd',
    foam: '#dff0f5',
    scarf: '#7a6a52',
    hair: '#5a4a3a',
    dress: '#5b6b7a',
    shoe: '#4a3728',
  };

  registerTexture(scene, HOME_ILLUSTRATION_KEY, grid, palette, UNIT);
}
