import Phaser from 'phaser';

/** A mutable grid of palette-character codes. '.' means transparent. */
export type PixelGrid = string[][];
export type Palette = Record<string, string>;

export function makeGrid(width: number, height: number, fill = '.'): PixelGrid {
  return Array.from({ length: height }, () => Array.from({ length: width }, () => fill));
}

export function fillRect(
  grid: PixelGrid,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  ch: string,
): void {
  for (let y = y0; y <= y1; y++) {
    if (!grid[y]) continue;
    for (let x = x0; x <= x1; x++) {
      if (x >= 0 && x < grid[y].length) grid[y][x] = ch;
    }
  }
}

export function setPixel(grid: PixelGrid, x: number, y: number, ch: string): void {
  if (grid[y] && x >= 0 && x < grid[y].length) grid[y][x] = ch;
}

export function cloneGrid(grid: PixelGrid): PixelGrid {
  return grid.map((row) => [...row]);
}

export function subGrid(grid: PixelGrid, x0: number, y0: number, x1: number, y1: number): PixelGrid {
  const out: PixelGrid = [];
  for (let y = y0; y <= y1; y++) {
    const row = grid[y] ?? [];
    out.push(row.slice(x0, x1 + 1));
  }
  return out;
}

/** Mirrors a grid horizontally (used to derive a left-facing sprite from a right-facing one). */
export function mirrorGrid(grid: PixelGrid): PixelGrid {
  return grid.map((row) => [...row].reverse());
}

function rasterize(grid: PixelGrid, palette: Palette, pixelSize: number): HTMLCanvasElement {
  const height = grid.length;
  const width = grid[0]?.length ?? 0;
  const canvas = document.createElement('canvas');
  canvas.width = width * pixelSize;
  canvas.height = height * pixelSize;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const ch = grid[y][x];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
    }
  }
  return canvas;
}

/** Registers a single-frame texture from a pixel grid. No-op if the key already exists. */
export function registerTexture(
  scene: Phaser.Scene,
  key: string,
  grid: PixelGrid,
  palette: Palette,
  pixelSize = 1,
): void {
  if (scene.textures.exists(key)) return;
  const canvas = rasterize(grid, palette, pixelSize);
  scene.textures.addCanvas(key, canvas);
}

/**
 * Registers a horizontal strip of same-size tiles as a single image texture,
 * suitable for `Tilemap.addTilesetImage(name, key, tileSize, tileSize)`.
 */
export function registerTilesetTexture(
  scene: Phaser.Scene,
  key: string,
  tiles: PixelGrid[],
  palette: Palette,
  tileSize: number,
): void {
  if (scene.textures.exists(key)) return;
  const canvas = document.createElement('canvas');
  canvas.width = tileSize * tiles.length;
  canvas.height = tileSize;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  tiles.forEach((tile, i) => {
    for (let y = 0; y < tileSize; y++) {
      for (let x = 0; x < tileSize; x++) {
        const ch = tile[y]?.[x];
        if (!ch || ch === '.' || ch === ' ') continue;
        const color = palette[ch];
        if (!color) continue;
        ctx.fillStyle = color;
        ctx.fillRect(i * tileSize + x, y, 1, 1);
      }
    }
  });
  scene.textures.addCanvas(key, canvas);
}
