import Phaser from 'phaser';
import groundUrl from './lourdes_town_ground.png';
import millUrl from './lourdes_town_mill.png';
import presbyteryUrl from './lourdes_town_presbytery.png';
import churchAUrl from './lourdes_town_churchA.png';
import churchBUrl from './lourdes_town_churchB.png';
import manorUrl from './lourdes_town_manor.png';
import houseCUrl from './lourdes_town_houseC.png';
import houseDUrl from './lourdes_town_houseD.png';
import houseEUrl from './lourdes_town_houseE.png';
import houseFUrl from './lourdes_town_houseF.png';
import houseGUrl from './lourdes_town_houseG.png';
import houseHUrl from './lourdes_town_houseH.png';
import houseIUrl from './lourdes_town_houseI.png';
import houseJUrl from './lourdes_town_houseJ.png';
import houseKUrl from './lourdes_town_houseK.png';
import houseK2Url from './lourdes_town_houseK2.png';
import houseLUrl from './lourdes_town_houseL.png';
import houseMUrl from './lourdes_town_houseM.png';
import cachotUrl from './lourdes_town_cachot.png';

/**
 * The maintainer's own single painted town PNG, now the sole visual source of truth for
 * Lourdes' town section (replaces the individually-placed church/presbytery/town-building sprites
 * and the procedural dirt-path stamping south of the river — see `OverworldScene.ts#buildTown()`).
 *
 * **Sliced into a "ground" layer plus one crop per building**, not used as a single flat image —
 * same reasoning and technique as the old `lourdesCachotExterior.ts`'s 5-unit slicing (see that
 * file's own historical doc comment): a single fixed Y-sort depth can't be correct for a painting
 * this tall, since different buildings' own ground-contact line sits at very different screen-Y.
 * Slicing at each building's own rectangular bounding box (verified byte-for-byte reversible: ground
 * layer + every crop, pasted back at these exact rects, reconstructs the original PNG with zero
 * pixel difference — nothing redrawn, nothing lost, nothing duplicated) lets each building get its
 * own Y-sort depth anchor and its own footprint collider, exactly like every other building in this
 * file already works, while the ground layer (paths, open sand, the fountain, every building's own
 * hole cut out) renders once underneath everything at a fixed low depth.
 *
 * Native pixel rects below (`TOWN_BUILDINGS`) are measured directly against the source PNG (grid
 * -overlay crops, the same by-eye measurement technique used throughout this codebase) — the plain
 * rectangle each crop file actually contains, not a tighter building-shaped mask. `TOWN_SCALE` is
 * applied once, at the `OverworldScene.ts` placement site, exactly like `CACHOT_EXTERIOR_SCALE` used
 * to work for the old exterior — these native numbers are deliberately left unscaled here.
 */
export const TOWN_NATIVE_WIDTH = 1535;
export const TOWN_NATIVE_HEIGHT = 1024;

/** Displayed at 1.5x native size — a real world-space enlargement (`setDisplaySize`,
 * nearest-neighbor, same as every other real-art building in this game), not a camera zoom.
 * Halved from an earlier 3x per an explicit "the town PNG is too large, reduce its displayed size
 * to 50% of its current size" ask (50% of 3x is 1.5x native, not a second multiplier on top of 3x).
 * The source PNG itself (`lourdes_town_*.png`) is completely untouched either way. */
export const TOWN_SCALE = 1.5;

export const TOWN_GROUND_KEY = 'lourdes_town_ground';

export interface TownBuildingDef {
  id: string;
  key: string;
  /** Native-pixel rect within the source PNG (also this crop file's own raw dimensions). */
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Every building except Le Cachot: plain background architecture, footprint-collided and
 * depth-sorted (see `addTownBuilding()`), no door, no interior, no label. */
export const TOWN_BUILDINGS: TownBuildingDef[] = [
  { id: 'mill', key: 'lourdes_town_mill', x: 0, y: 150, w: 376, h: 280 },
  { id: 'presbytery', key: 'lourdes_town_presbytery', x: 830, y: 85, w: 380, h: 220 },
  { id: 'churchA', key: 'lourdes_town_churchA', x: 1210, y: 85, w: 80, h: 313 },
  { id: 'churchB', key: 'lourdes_town_churchB', x: 1290, y: 85, w: 232, h: 672 },
  { id: 'manor', key: 'lourdes_town_manor', x: 480, y: 335, w: 425, h: 280 },
  { id: 'houseC', key: 'lourdes_town_houseC', x: 415, y: 495, w: 65, h: 120 },
  { id: 'houseD', key: 'lourdes_town_houseD', x: 68, y: 518, w: 264, h: 144 },
  { id: 'houseE', key: 'lourdes_town_houseE', x: 933, y: 493, w: 209, h: 129 },
  { id: 'houseF', key: 'lourdes_town_houseF', x: 533, y: 618, w: 129, h: 129 },
  { id: 'houseG', key: 'lourdes_town_houseG', x: 248, y: 683, w: 179, h: 119 },
  { id: 'houseH', key: 'lourdes_town_houseH', x: 58, y: 773, w: 174, h: 169 },
  { id: 'houseI', key: 'lourdes_town_houseI', x: 428, y: 788, w: 197, h: 154 },
  { id: 'houseJ', key: 'lourdes_town_houseJ', x: 988, y: 683, w: 154, h: 119 },
  { id: 'houseK', key: 'lourdes_town_houseK', x: 1008, y: 893, w: 114, h: 129 },
  { id: 'houseK2', key: 'lourdes_town_houseK2', x: 1123, y: 815, w: 99, h: 127 },
  { id: 'houseL', key: 'lourdes_town_houseL', x: 1223, y: 770, w: 109, h: 162 },
  { id: 'houseM', key: 'lourdes_town_houseM', x: 1343, y: 788, w: 129, h: 144 },
];

/** Le Cachot: the grey-roofed house at the bottom of the town, distinct from every other
 * (blue-roofed) building in the painting — the only building with an interior/enter-exit system.
 * `doorLocalX/BottomY` are the door's own position measured within this crop, used to derive both
 * the walkable door-gap in its collider and the exact world position Bernadette lands at when she
 * exits `CachotScene` (see `OverworldScene.ts`'s `CACHOT_DOOR_X/Y`). */
export const CACHOT_BUILDING: TownBuildingDef = {
  id: 'cachot',
  key: 'lourdes_town_cachot',
  x: 705,
  y: 745,
  w: 225,
  h: 175,
};
export const CACHOT_DOOR_LOCAL_X = 140; // native px within the crop (845 - 705)
export const CACHOT_DOOR_LOCAL_BOTTOM_Y = 160; // native px within the crop (905 - 745)
export const CACHOT_DOOR_HALF_WIDTH = 22; // native px

/**
 * Every texture key this asset registers, for `BootScene.ts` to force LINEAR filtering on (see the
 * loop there, next to `HOME_BACKGROUND_KEY`/`JOURNEY_MAP_KEY`). This source PNG is a continuous
 * -tone isometric rendering (soft shading, anti-aliased roof tiles/window edges/curved chimneys),
 * not genuine pre-quantized pixel art like this game's tiles/character sprites — the same
 * distinction `BootScene.ts`'s own doc comment already draws for the Home background. Nearest
 * -neighbor (this project's default, via `pixelArt: true`) is the *wrong* filter for that kind of
 * source: at TOWN_SCALE's own fractional ratio (1.5x) it duplicates whole source pixels unevenly
 * rather than reconstructing the image's actual (already anti-aliased) curves and diagonals, which
 * is what actually produced the "excessively pixelated, chunky blocks" look, not the artwork or the
 * display size themselves. LINEAR filtering isn't a blur pass over the pixels (no Gaussian/box
 * filter is ever applied, and the source file itself is never touched) — it's the correct texture
 * -sampling mode for continuous-tone art at a mild upscale, exactly the same fix already applied to
 * `HOME_BACKGROUND_KEY`/`JOURNEY_MAP_KEY` for the identical reason. Genuine pixel-art assets
 * elsewhere in this game (tiles, character sprites, the grass texture) are correctly *not* in this
 * list — LINEAR would blur those, since they're deliberately low-res flat-color art meant to be
 * seen as blocky pixels; this PNG never was that.
 */
export const TOWN_TEXTURE_KEYS: string[] = [
  TOWN_GROUND_KEY,
  ...TOWN_BUILDINGS.map((b) => b.key),
  CACHOT_BUILDING.key,
];

export function preloadLourdesTown(scene: Phaser.Scene): void {
  scene.load.image(TOWN_GROUND_KEY, groundUrl);
  const urls: Record<string, string> = {
    lourdes_town_mill: millUrl,
    lourdes_town_presbytery: presbyteryUrl,
    lourdes_town_churchA: churchAUrl,
    lourdes_town_churchB: churchBUrl,
    lourdes_town_manor: manorUrl,
    lourdes_town_houseC: houseCUrl,
    lourdes_town_houseD: houseDUrl,
    lourdes_town_houseE: houseEUrl,
    lourdes_town_houseF: houseFUrl,
    lourdes_town_houseG: houseGUrl,
    lourdes_town_houseH: houseHUrl,
    lourdes_town_houseI: houseIUrl,
    lourdes_town_houseJ: houseJUrl,
    lourdes_town_houseK: houseKUrl,
    lourdes_town_houseK2: houseK2Url,
    lourdes_town_houseL: houseLUrl,
    lourdes_town_houseM: houseMUrl,
    lourdes_town_cachot: cachotUrl,
  };
  TOWN_BUILDINGS.forEach((b) => scene.load.image(b.key, urls[b.key]));
  scene.load.image(CACHOT_BUILDING.key, urls[CACHOT_BUILDING.key]);
}
