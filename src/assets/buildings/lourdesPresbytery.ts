import Phaser from 'phaser';
import lourdesPresbyteryUrl from './lourdes_presbytery.png';

/**
 * The maintainer's own presbytery artwork (two-story stone house, slate roof with two chimneys,
 * blue shutters, cross-gabled entry, garden with iron fence/gate), used for the "presbytery"
 * building in `TOWN_BUILDINGS` (`OverworldScene.ts`) in place of the old generic
 * `PROP_KEYS.TOWN_BUILDING` box it previously shared with the hospice/maisonCenac/tribunal
 * buildings (those three still use that shared procedural texture — this only replaces the
 * presbytery's own entry).
 *
 * Same continuous-tone-source treatment as the grass and church assets: source cropped tight to
 * its opaque bounds (978x817), downscaled with a single `Image.BOX` pass to 84x70, then
 * color-quantized (32 colors, median-cut, no dithering, alpha channel left untouched) to force
 * flat, hard-edged color regions instead of the source's soft AI-shaded gradients. 84x70 was
 * chosen to fit the gap directly below the church (see `assets/buildings/lourdesChurch.ts`) and
 * above the tribunal building without overlapping either — the presbytery's tile position itself
 * (col 4, row 45) is unchanged from the old placeholder's, since that spot already had enough
 * headroom for this size. Displayed at the texture's exact native size (no `setDisplaySize` call)
 * so NEAREST filtering never has to scale it.
 */
export const LOURDES_PRESBYTERY_KEY = 'lourdes_presbytery_real';
export const LOURDES_PRESBYTERY_WIDTH = 84;
export const LOURDES_PRESBYTERY_HEIGHT = 70;

export function preloadLourdesPresbytery(scene: Phaser.Scene): void {
  scene.load.image(LOURDES_PRESBYTERY_KEY, lourdesPresbyteryUrl);
}
