import Phaser from 'phaser';
import { fillRect, makeGrid, registerTilesetTexture, setPixel } from './PixelCanvas';
import { PALETTE } from './palette';
import { TILE_SIZE } from '../core/constants';

export const TILE = {
  GRASS_A: 0,
  GRASS_B: 1,
  DIRT_PATH: 2,
  STONE_PATH: 3,
  WATER: 4,
  WOOD_FLOOR: 5,
  STONE_FLOOR: 6,
  RIVERBANK: 7,
  CAVE_FLOOR: 8,
} as const;

export const TILESET_KEY = 'tileset_main';

// Deterministic speckle offsets to break up flat fills without noise/randomness.
const SPECKLE = [
  [2, 2], [9, 3], [5, 7], [12, 9], [3, 12], [10, 13], [7, 5], [13, 14],
];

export function registerTileset(scene: Phaser.Scene): void {
  if (scene.textures.exists(TILESET_KEY)) return;

  const size = TILE_SIZE;
  const palette: Record<string, string> = {
    a: PALETTE.grassLight,
    b: PALETTE.grassDark,
    c: PALETTE.dirtLight,
    d: PALETTE.dirtDark,
    e: PALETTE.pathLight,
    f: PALETTE.waterLight,
    g: PALETTE.waterFoam,
    h: PALETTE.woodLight,
    i: PALETTE.woodDark,
    j: PALETTE.stoneLight,
    k: PALETTE.stoneDark,
    l: PALETTE.rockDark,
  };

  const grassA = makeGrid(size, size, 'a');
  SPECKLE.forEach(([x, y]) => setPixel(grassA, x, y, 'b'));

  const grassB = makeGrid(size, size, 'b');
  SPECKLE.forEach(([x, y]) => setPixel(grassB, x, y, 'a'));

  const dirt = makeGrid(size, size, 'c');
  SPECKLE.forEach(([x, y]) => setPixel(dirt, x, y, 'd'));

  const stonePath = makeGrid(size, size, 'e');
  SPECKLE.forEach(([x, y]) => setPixel(stonePath, x, y, 'd'));

  const water = makeGrid(size, size, 'f');
  fillRect(water, 0, 2, size - 1, 2, 'g');
  fillRect(water, 0, 10, size - 1, 10, 'g');

  const woodFloor = makeGrid(size, size, 'h');
  for (let x = 0; x < size; x += 4) fillRect(woodFloor, x, 0, x, size - 1, 'i');

  const stoneFloor = makeGrid(size, size, 'j');
  SPECKLE.forEach(([x, y]) => setPixel(stoneFloor, x, y, 'k'));

  const riverbank = makeGrid(size, size, 'c');
  SPECKLE.forEach(([x, y]) => setPixel(riverbank, x, y, 'f'));

  const caveFloor = makeGrid(size, size, 'l');
  SPECKLE.forEach(([x, y]) => setPixel(caveFloor, x, y, 'k'));

  const tiles = [grassA, grassB, dirt, stonePath, water, woodFloor, stoneFloor, riverbank, caveFloor];

  registerTilesetTexture(scene, TILESET_KEY, tiles, palette, size);
}
