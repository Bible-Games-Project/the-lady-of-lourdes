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
 * Third take on this medallion (see AGENTS.md): the previous version was a flat-shaded, hard
 * -cornered octagon-ish badge with a thick black outline — functional, but the maintainer called
 * it out by name ("las redondas... es todo un estilo muy feo. No encaja con estilo de fondo") next
 * to this screen's own soft, painted map illustration. A flat pixel-art badge was always going to
 * clash with that regardless of its exact colors, so this redraws it as an actual round medal:
 * built from real circle/angle math (not hand-placed rows) at `GRID_SIZE` (4x the ~22px it's
 * actually displayed at — see `applyMedallionFilter()`), with the rim lit from the upper-left in
 * four gradient bands (the map's own gold/amber/rust autumn palette) so it reads as a lit, carved
 * gold disc rather than a flat-tinted shape. Displayed scaled *down* from this native resolution
 * with `LINEAR` filtering (added to `BootScene.ts`'s filter list alongside the real painted art),
 * which is what actually produces the smooth, anti-aliased circular edge — supersampling first and
 * downscaling after is the same technique this codebase already uses for `lourdesGrass.ts`'s own
 * continuous-tone source, just applied here to procedural art instead of a photo.
 *
 * The cream face still fills nearly the whole disc (only a slim rim is the gold gradient), for the
 * same reason established in the previous round: the apparition-number text needs a consistently
 * light field to sit on in one flat color, not a stroke around the number itself.
 */
const MEDALLION_GRID_SIZE = 88;
export const MEDALLION_DISPLAY_SIZE = 22;

function medallion() {
  const size = MEDALLION_GRID_SIZE;
  const grid = makeGrid(size, size);
  const center = size / 2;
  const outerR = size / 2 - 2;
  const rimInnerR = outerR * 0.78;
  const faceGrooveR = rimInnerR * 0.92;
  // Light from the upper-left, matching every other "lit from above" effect in this game (Home's
  // candle glow, the Lady's own light rays) rather than an arbitrary direction.
  const lightX = -0.6;
  const lightY = -0.78;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - center;
      const dy = y + 0.5 - center;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > outerR) continue;
      if (dist > outerR - 1.6) {
        grid[y][x] = 'K'; // thin ink edge -- definition against the busy map, not a thick outline
        continue;
      }
      if (dist > rimInnerR) {
        const t = (dx * lightX + dy * lightY) / dist; // -1 (shadow side) .. 1 (lit side)
        grid[y][x] = t > 0.55 ? 'F' : t > 0.05 ? 'G' : t > -0.45 ? 'A' : 'R';
        continue;
      }
      grid[y][x] = dist > faceGrooveR ? 'S' : 'H';
    }
  }

  return {
    grid,
    palette: {
      K: JOURNEY_PALETTE.ink,
      F: JOURNEY_PALETTE.glowGold,
      G: JOURNEY_PALETTE.foliageGold,
      A: JOURNEY_PALETTE.foliageAmber,
      R: JOURNEY_PALETTE.foliageRust,
      S: JOURNEY_PALETTE.pathStoneShade,
      H: JOURNEY_PALETTE.cream,
    },
  };
}

/**
 * Same reasoning and technique as `medallion()` above: real arc/rect math at a finer native
 * resolution, downscaled with `LINEAR` filtering for a smooth rounded shackle instead of a blocky
 * one, and the same gold gradient bands so the lock reads as part of the same gilded-medal object
 * language rather than a separately-styled flat badge. Body stays a light "metal" fill (the
 * keyhole is the one dark accent) — a wholesale dark shape was tried first and rejected as reading
 * like a smudge at this size (see AGENTS.md).
 */
const LOCK_GRID_SIZE_W = 40;
const LOCK_GRID_SIZE_H = 48;
export const LOCK_DISPLAY_W = 10;
export const LOCK_DISPLAY_H = 12;

function lockIcon() {
  const w = LOCK_GRID_SIZE_W;
  const h = LOCK_GRID_SIZE_H;
  const grid = makeGrid(w, h);
  const lightX = -0.6;
  const lightY = -0.78;
  const bandOf = (dx: number, dy: number, dist: number): string => {
    const t = (dx * lightX + dy * lightY) / dist;
    return t > 0.55 ? 'F' : t > 0.05 ? 'G' : t > -0.45 ? 'A' : 'R';
  };

  // Shackle: a true semicircular arc (ring band), centered above the body, legs running straight
  // down into it.
  const shackleCx = w / 2;
  const shackleCy = h * 0.34;
  const shackleOuterR = w * 0.3;
  const shackleInnerR = shackleOuterR - w * 0.16;
  for (let y = 0; y < shackleCy + 2; y++) {
    for (let x = 0; x < w; x++) {
      const dx = x + 0.5 - shackleCx;
      const dy = y + 0.5 - shackleCy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > shackleOuterR || dist < shackleInnerR) continue;
      if (dy > 0 && Math.abs(dx) > shackleInnerR - 1) continue; // only the arc + two straight legs
      grid[y][x] = bandOf(dx, dy, Math.max(dist, 0.001));
    }
  }
  // Legs continuing down to meet the body.
  const legW = w * 0.16;
  fillRect(grid, Math.round(shackleCx - shackleOuterR), Math.round(shackleCy), Math.round(shackleCx - shackleOuterR + legW), h * 0.42, 'G');
  fillRect(grid, Math.round(shackleCx + shackleOuterR - legW), Math.round(shackleCy), Math.round(shackleCx + shackleOuterR), h * 0.42, 'G');

  // Body: a rounded rectangle (corner-clipped via a small radius test), same gradient family.
  const bodyTop = h * 0.4;
  const bodyBottom = h - 2;
  const bodyLeft = w * 0.08;
  const bodyRight = w - w * 0.08;
  const cornerR = w * 0.14;
  const bodyCx = (bodyLeft + bodyRight) / 2;
  const bodyCy = bodyTop;
  for (let y = Math.floor(bodyTop); y < bodyBottom; y++) {
    for (let x = Math.floor(bodyLeft); x < bodyRight; x++) {
      const nearTop = y < bodyTop + cornerR;
      const nearLeft = x < bodyLeft + cornerR;
      const nearRight = x > bodyRight - cornerR;
      if (nearTop && nearLeft) {
        const d = Math.hypot(x - (bodyLeft + cornerR), y - (bodyTop + cornerR));
        if (d > cornerR) continue;
      } else if (nearTop && nearRight) {
        const d = Math.hypot(x - (bodyRight - cornerR), y - (bodyTop + cornerR));
        if (d > cornerR) continue;
      }
      const dx = x + 0.5 - bodyCx;
      const dy = y + 0.5 - bodyCy;
      grid[y][x] = bandOf(dx, dy, Math.max(Math.hypot(dx, dy), 0.001));
    }
  }

  // Keyhole: the one dark accent, centered in the body.
  const keyCx = Math.round(bodyCx);
  const keyTopY = Math.round(bodyTop + (bodyBottom - bodyTop) * 0.32);
  fillRect(grid, keyCx - 2, keyTopY, keyCx + 2, keyTopY + 4, 'D');
  fillRect(grid, keyCx - 1, keyTopY + 4, keyCx + 1, keyTopY + 9, 'D');

  return {
    grid,
    palette: {
      F: JOURNEY_PALETTE.glowGold,
      G: JOURNEY_PALETTE.foliageGold,
      A: JOURNEY_PALETTE.foliageAmber,
      R: JOURNEY_PALETTE.foliageRust,
      D: JOURNEY_PALETTE.ink,
    },
  };
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
