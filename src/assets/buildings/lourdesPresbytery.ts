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
 * its opaque bounds (978x817), downscaled with a single `Image.BOX` pass to 84x70
 * (`LOURDES_PRESBYTERY_WIDTH`/`HEIGHT` below — the texture's *native* pixel size, kept for
 * reference only, not the in-game display size), then color-quantized (32 colors, median-cut, no
 * dithering, alpha channel left untouched) to force flat, hard-edged color regions instead of the
 * source's soft AI-shaded gradients.
 *
 * In-game this is displayed above that native size (though less dramatically than the church —
 * this source draws its door quite small relative to its own canvas, which caps how far it can
 * scale before running out of room on the map; see the scale/placement comment above
 * `TOWN_BUILDINGS` in `OverworldScene.ts` for the full math) via
 * `addStaticProp(..., resizeVisual: true)` / `setDisplaySize`, which only scales the existing
 * texture — still nearest-neighbor filtered, never re-sampled or blurred.
 */
export const LOURDES_PRESBYTERY_KEY = 'lourdes_presbytery_real';
/** Native texture pixel size (post-quantization) — not the in-game display size, see above. */
export const LOURDES_PRESBYTERY_WIDTH = 84;
export const LOURDES_PRESBYTERY_HEIGHT = 70;

export function preloadLourdesPresbytery(scene: Phaser.Scene): void {
  scene.load.image(LOURDES_PRESBYTERY_KEY, lourdesPresbyteryUrl);
}
