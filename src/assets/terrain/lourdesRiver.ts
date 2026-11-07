import Phaser from 'phaser';
import riverUrl from './river_lourdes.png';
import bridgeUrl from './bridge_lourdes.png';

/**
 * The maintainer's own real river/bridge PNGs, replacing the old procedurally tile-stamped
 * horizontal river arm in `OverworldScene.ts#buildTerrain()` (the vertical arm beside the grotto —
 * the scripted "ford" crossing — is untouched; this pair only covers the town's river bend and its
 * road bridge). Each cropped tight to its own alpha bounding box, no redraw/recolor/re-pixelation.
 * Real painted art (soft shading), so both need `LINEAR` filtering — see `BootScene.ts`'s filter
 * list, which these keys are added to.
 *
 * BRIDGE_NATIVE_SIZE's portrait orientation (taller than wide) matches the existing crossing
 * exactly: the game's bridge already runs north-south across an east-west river, so no rotation
 * is needed.
 */
export const RIVER_KEYS = {
  RIVER: 'terrain_river_lourdes',
  BRIDGE: 'terrain_bridge_lourdes',
} as const;

export const RIVER_NATIVE_SIZE = { width: 2000, height: 382 };
export const BRIDGE_NATIVE_SIZE = { width: 532, height: 991 };

export function preloadLourdesRiver(scene: Phaser.Scene): void {
  scene.load.image(RIVER_KEYS.RIVER, riverUrl);
  scene.load.image(RIVER_KEYS.BRIDGE, bridgeUrl);
}
