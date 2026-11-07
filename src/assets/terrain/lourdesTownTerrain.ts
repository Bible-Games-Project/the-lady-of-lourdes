import Phaser from 'phaser';
import lourdesTownTerrainUrl from './lourdes_town_terrain.png';

/**
 * The maintainer's own new intermediate ground/terrain layer for the town area south of the
 * river — an organic dirt/clearing patch, meant to sit **between** the existing grass
 * (`lourdesGrass.ts`, untouched) and the individual building PNGs still to come:
 *
 *   grass (base layer, untouched)
 *     -> this terrain patch
 *       -> individual building PNGs (not yet supplied — see `OverworldScene.ts`'s own doc
 *          comment on the town area for the current state of that)
 *
 * Supplied as a WebP with real alpha transparency (a single organic blob shape, not a rectangle),
 * cropped tight to its own alpha bounding box (native 1536x1024 -> 1518x1004, verified via a numpy
 * alpha scan, not eyeballed) and converted straight to PNG — no redraw, no recolor, no artificial
 * pixelation. This is continuous-tone painted art (soft airbrushed edges, color-noise speckle
 * texture), the same category as the former town PNG and the Home background, so it needs LINEAR
 * filtering, not this project's pixel-art default — see `BootScene.ts`'s own filter list.
 *
 * Displayed at `TOWN_TERRAIN_SCALE` (see `OverworldScene.ts#buildTownTerrain()`), a real
 * world-space enlargement (not a camera zoom) — "slightly" scaled up per an explicit ask, so the
 * patch has enough surface for most future buildings to sit on, without being distorted
 * (uniform scale, both axes together, never stretched).
 */
export const TOWN_TERRAIN_KEY = 'lourdes_town_terrain';
export const TOWN_TERRAIN_NATIVE_WIDTH = 1518;
export const TOWN_TERRAIN_NATIVE_HEIGHT = 1004;

export function preloadLourdesTownTerrain(scene: Phaser.Scene): void {
  scene.load.image(TOWN_TERRAIN_KEY, lourdesTownTerrainUrl);
}
