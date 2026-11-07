import Phaser from 'phaser';
import lourdesGroundTanUrl from './lourdes_ground_tan.png';

/**
 * A replacement ground tile the maintainer supplied to swap in for `lourdesGrass.ts`'s green grass
 * ("sustituir el lourdes grass por este... el otro no lo borres, pero cambialo por este" -- swap
 * which texture `OverworldScene.ts#buildTerrain()` actually renders, but keep the old grass asset
 * module in the codebase rather than deleting it). Supplied already at the exact same 157x157 tile
 * size and already a flat 12-color palette (confirmed via `Image.getcolors()`) -- i.e. already
 * through the same resize-then-quantize pipeline `lourdesGrass.ts`'s own doc comment describes, so
 * no reprocessing was needed here: this is the maintainer's file, used byte-for-byte.
 */
export const LOURDES_GROUND_TAN_KEY = 'lourdes_ground_tan';
export const LOURDES_GROUND_TAN_TILE_SIZE = 157;

export function preloadLourdesGroundTan(scene: Phaser.Scene): void {
  scene.load.image(LOURDES_GROUND_TAN_KEY, lourdesGroundTanUrl);
}
