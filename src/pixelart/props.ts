import Phaser from 'phaser';
import { fillRect, makeGrid, registerTexture, setPixel, type PixelGrid } from './PixelCanvas';
import { PALETTE } from './palette';

export const PROP_KEYS = {
  TREE: 'prop_tree',
  ROCK: 'prop_rock',
  FIREWOOD: 'prop_firewood',
  GROTTO: 'prop_grotto',
  CACHOT_EXTERIOR: 'prop_building_cachot',
  CHURCH: 'prop_building_church',
  TOWN_BUILDING: 'prop_building_town',
  ROSARY_BEAD: 'prop_rosary_bead',
} as const;

function tree(): { grid: PixelGrid; palette: Record<string, string> } {
  const grid = makeGrid(16, 28);
  fillRect(grid, 6, 20, 9, 27, 'T'); // trunk
  fillRect(grid, 3, 8, 12, 20, 'L'); // canopy body
  fillRect(grid, 1, 11, 14, 17, 'L');
  fillRect(grid, 4, 3, 11, 9, 'M'); // canopy highlight top
  setPixel(grid, 3, 12, 'M');
  setPixel(grid, 12, 10, 'M');
  setPixel(grid, 5, 15, 'D');
  setPixel(grid, 10, 16, 'D');
  return {
    grid,
    palette: { T: PALETTE.woodDark, L: PALETTE.leafDark, M: PALETTE.leafLight, D: PALETTE.leafDark },
  };
}

function rock(): { grid: PixelGrid; palette: Record<string, string> } {
  const grid = makeGrid(16, 10);
  fillRect(grid, 2, 4, 13, 9, 'R');
  fillRect(grid, 4, 1, 11, 5, 'R');
  setPixel(grid, 4, 2, 'H');
  setPixel(grid, 10, 3, 'H');
  fillRect(grid, 3, 8, 12, 9, 'S');
  return { grid, palette: { R: PALETTE.rockLight, H: PALETTE.rockDark, S: PALETTE.rockDark } };
}

function firewood(): { grid: PixelGrid; palette: Record<string, string> } {
  const grid = makeGrid(12, 8);
  fillRect(grid, 0, 1, 11, 2, 'W');
  fillRect(grid, 0, 4, 11, 5, 'D');
  fillRect(grid, 1, 6, 10, 7, 'W');
  setPixel(grid, 0, 1, 'E');
  setPixel(grid, 11, 2, 'E');
  setPixel(grid, 0, 4, 'E');
  setPixel(grid, 11, 5, 'E');
  return { grid, palette: { W: PALETTE.woodLight, D: PALETTE.woodDark, E: PALETTE.roofDark } };
}

function rosaryBead(): { grid: PixelGrid; palette: Record<string, string> } {
  const grid = makeGrid(4, 4);
  fillRect(grid, 1, 0, 2, 3, 'B');
  fillRect(grid, 0, 1, 3, 2, 'B');
  return { grid, palette: { B: PALETTE.sunGlow } };
}

/** Rock face with a rounded cave mouth and a small ledge/niche above-right for the apparition. */
function grotto(): { grid: PixelGrid; palette: Record<string, string> } {
  const grid = makeGrid(96, 64, 'R');
  for (let y = 0; y < 64; y += 6) {
    for (let x = (y / 6) % 2 === 0 ? 0 : 4; x < 96; x += 8) setPixel(grid, x, y, 'H');
  }

  // Arch mouth, rounded top approximated with stepped inset rows.
  const archRows: Array<[number, number, number]> = [
    [20, 40, 40],
    [21, 39, 41],
    [22, 38, 42],
    [23, 37, 43],
    [24, 36, 44],
    [25, 35, 45],
    [26, 34, 46],
    [27, 32, 48],
    [28, 30, 50],
    [29, 28, 52],
  ];
  archRows.forEach(([y, x0, x1]) => fillRect(grid, x0, y, x1, y, 'C'));
  fillRect(grid, 28, 30, 52, 63, 'C');

  // Niche ledge for the Lady, above and to the right of the arch.
  fillRect(grid, 56, 16, 68, 22, 'N');
  fillRect(grid, 56, 22, 68, 23, 'H');

  return {
    grid,
    palette: { R: PALETTE.rockLight, H: PALETTE.rockDark, C: '#241f1c', N: '#b0a692' },
  };
}

function building(
  width: number,
  height: number,
  wall: string,
  roof: string,
  trim: string,
): { grid: PixelGrid; palette: Record<string, string> } {
  const grid = makeGrid(width, height);
  const roofHeight = Math.floor(height * 0.35);

  for (let y = 0; y < roofHeight; y++) {
    const inset = Math.floor((roofHeight - y) * 0.5);
    fillRect(grid, inset, y, width - 1 - inset, y, 'F');
  }

  fillRect(grid, 1, roofHeight, width - 2, height - 1, 'W');

  // Door
  const doorW = Math.max(4, Math.floor(width * 0.14));
  const doorX = Math.floor(width / 2 - doorW / 2);
  fillRect(grid, doorX, height - Math.floor(height * 0.28), doorX + doorW - 1, height - 1, 'D');

  // Windows
  const winY = roofHeight + Math.floor((height - roofHeight) * 0.25);
  fillRect(grid, Math.floor(width * 0.18), winY, Math.floor(width * 0.18) + 4, winY + 4, 'T');
  fillRect(grid, width - Math.floor(width * 0.18) - 5, winY, width - Math.floor(width * 0.18) - 1, winY + 4, 'T');

  fillRect(grid, 0, height - 1, width - 1, height - 1, 'B');

  return {
    grid,
    palette: { F: roof, W: wall, D: PALETTE.woodDark, T: trim, B: PALETTE.stoneDark },
  };
}

export function registerProps(scene: Phaser.Scene): void {
  const t = tree();
  registerTexture(scene, PROP_KEYS.TREE, t.grid, t.palette, 1);

  const r = rock();
  registerTexture(scene, PROP_KEYS.ROCK, r.grid, r.palette, 1);

  const f = firewood();
  registerTexture(scene, PROP_KEYS.FIREWOOD, f.grid, f.palette, 1);

  const b = rosaryBead();
  registerTexture(scene, PROP_KEYS.ROSARY_BEAD, b.grid, b.palette, 1);

  const g = grotto();
  registerTexture(scene, PROP_KEYS.GROTTO, g.grid, g.palette, 1);

  const cachot = building(48, 40, PALETTE.wallDark, PALETTE.roofDark, PALETTE.skyDusk);
  registerTexture(scene, PROP_KEYS.CACHOT_EXTERIOR, cachot.grid, cachot.palette, 1);

  const church = building(64, 64, PALETTE.wallLight, PALETTE.roofLight, PALETTE.skyDay);
  registerTexture(scene, PROP_KEYS.CHURCH, church.grid, church.palette, 1);

  const town = building(48, 40, PALETTE.wallLight, PALETTE.roofLight, PALETTE.skyDay);
  registerTexture(scene, PROP_KEYS.TOWN_BUILDING, town.grid, town.palette, 1);
}
