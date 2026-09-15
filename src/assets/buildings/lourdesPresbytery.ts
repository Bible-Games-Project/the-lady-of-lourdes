import Phaser from 'phaser';
import lourdesPresbyteryUrl from './lourdes_presbytery.png';

/**
 * The maintainer's own presbytery artwork, used for the "presbytery" building in
 * `SPECIAL_BUILDINGS` (`OverworldScene.ts`) in place of the old generic `PROP_KEYS.TOWN_BUILDING`
 * box it originally shared with the hospice/maisonCenac/tribunal buildings (those three still use
 * that shared procedural texture — this only replaces the presbytery's own entry).
 *
 * **Second version of this asset** — the maintainer sent a replacement PNG (a whitewashed-stone,
 * blue-roof two-story house with a front garden, tree, iron gate, and a side garden shed/plot,
 * matching the second church version's palette) asking for the sprite to be swapped in as-is,
 * fully replacing the first version's bytes (a smaller, browner-toned house) rather than editing
 * or blending with it.
 *
 * Same continuous-tone-source treatment as the grass and church assets: source cropped tight to
 * its opaque bounds (1115x888), downscaled with a single `Image.BOX` pass to 100x80
 * (`LOURDES_PRESBYTERY_WIDTH`/`HEIGHT` below — the texture's *native* pixel size, kept for
 * reference only, not the in-game display size), then color-quantized (32 colors, median-cut, no
 * dithering, alpha channel left untouched) to force flat, hard-edged color regions instead of the
 * source's soft AI-shaded gradients.
 *
 * In-game this is displayed well above that native size — see the scale/placement comment above
 * `SPECIAL_BUILDINGS` in `OverworldScene.ts` for the full math (this source draws its door small
 * relative to its own canvas, same as the first version, so a literal Bernadette-height door match
 * still isn't reachable — but this version's *building* footprint now matches the church's own
 * width, which is what actually reads as "same scale as the church" in play). Applied via
 * `addFootprintBuilding()` / `Image#setDisplaySize`, which only scales the existing texture —
 * still nearest-neighbor filtered (this key is never added to `BootScene`'s LINEAR-filter list),
 * never re-sampled or blurred.
 */
export const LOURDES_PRESBYTERY_KEY = 'lourdes_presbytery_real';
/** Native texture pixel size (post-quantization) — not the in-game display size, see above. */
export const LOURDES_PRESBYTERY_WIDTH = 100;
export const LOURDES_PRESBYTERY_HEIGHT = 80;

export function preloadLourdesPresbytery(scene: Phaser.Scene): void {
  scene.load.image(LOURDES_PRESBYTERY_KEY, lourdesPresbyteryUrl);
}
