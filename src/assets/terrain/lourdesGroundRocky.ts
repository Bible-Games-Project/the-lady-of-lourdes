import Phaser from 'phaser';
import lourdesGroundRockyUrl from './lourdes_ground_rocky.png';

/**
 * A second replacement ground tile the maintainer supplied, to compare against the tan one from the
 * previous round ("dile que le mando otro tile de terreno, que no borre los otros, pero que use
 * este para todo el mapa de lourdes, quiero ver como queda este" -- try this one as the active
 * ground, without deleting any earlier ground module). A rocky/dry-grass terrain, continuous-tone
 * source (confirmed via `Image.getcolors()` -- several thousand unique colors, not already a flat
 * palette the way the tan tile's own source happened to be) -- so unlike that one, this needed the
 * same resize-then-quantize recipe `lourdesGrass.ts`'s own doc comment documents: a single clean
 * `Image.BOX` resize down to the shared 157x157 tile size, then median-cut quantization to 12
 * colors with no dithering, which is what actually produces flat, hard-edged pixel-art color
 * regions from a soft continuous-tone source (a resize alone cannot do that).
 */
export const LOURDES_GROUND_ROCKY_KEY = 'lourdes_ground_rocky';
export const LOURDES_GROUND_ROCKY_TILE_SIZE = 157;

export function preloadLourdesGroundRocky(scene: Phaser.Scene): void {
  scene.load.image(LOURDES_GROUND_ROCKY_KEY, lourdesGroundRockyUrl);
}
