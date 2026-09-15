import Phaser from 'phaser';
import lourdesChurchUrl from './lourdes_church.png';

/**
 * The maintainer's own church artwork (stone parish church, slate roof, bell tower with cross,
 * arched door, trees around the base), used for the "church" building in the playable Lourdes
 * Overworld (`OverworldScene.ts`) in place of the old procedural placeholder box that
 * `pixelart/props.ts#registerProps()` used to generate for `PROP_KEYS.CHURCH`.
 *
 * **Second version of this asset** — the maintainer sent a replacement PNG (same subject/style,
 * a lighter whitewashed-stone-and-blue-roof palette rather than the first version's tan/dark-slate
 * one) asking for the sprite itself to be swapped in as-is; the first version's `lourdes_church.png`
 * bytes were fully replaced, nothing about the first version was edited or blended in.
 *
 * Same continuous-tone-source situation as `assets/terrain/lourdesGrass.ts` and the first version
 * of this asset: the supplied PNG (1536x1024, transparent background) reads as pixel art but its
 * raw pixel data is not genuinely flat-block — confirmed by run-length sampling, most runs of
 * identical adjacent pixels were only 1px long. So this asset is the source cropped tightly to its
 * opaque content (767x994), downscaled with a single `Image.BOX` pass to 94x122
 * (`LOURDES_CHURCH_WIDTH`/`HEIGHT` below — this is the texture's *native* pixel size, kept purely
 * for reference/documentation, not the in-game display size), then color-quantized (32 colors,
 * median-cut, no dithering, alpha channel preserved untouched) to force flat, hard-edged color
 * regions.
 *
 * In-game this is displayed well above that native size — see the scale/placement comment above
 * `SPECIAL_BUILDINGS` in `OverworldScene.ts` for the human-scale-vs-Bernadette math and the
 * resulting position. `addFootprintBuilding()` does that resize via
 * `Phaser.GameObjects.Image#setDisplaySize`, which only scales the existing texture (still
 * nearest-neighbor filtered, since this key is never added to `BootScene`'s LINEAR-filter list) —
 * it never re-samples or blurs the source pixels themselves, so edges stay hard at any size. That
 * same function also gives the building a footprint-shaped collider (wall base + tree trunks) and
 * proper Y-sort depth instead of one big rectangle — see its own doc comment in OverworldScene.ts.
 */
export const LOURDES_CHURCH_KEY = 'lourdes_church_real';
/** Native texture pixel size (post-quantization) — not the in-game display size, see above. */
export const LOURDES_CHURCH_WIDTH = 94;
export const LOURDES_CHURCH_HEIGHT = 122;

export function preloadLourdesChurch(scene: Phaser.Scene): void {
  scene.load.image(LOURDES_CHURCH_KEY, lourdesChurchUrl);
}
