import Phaser from 'phaser';
import lourdesChurchUrl from './lourdes_church.png';

/**
 * The maintainer's own church artwork (stone parish church, slate roof, bell tower with cross,
 * arched door, trees around the base), used for the "church" building in the playable Lourdes
 * Overworld (`OverworldScene.ts`) in place of the old procedural placeholder box that
 * `pixelart/props.ts#registerProps()` used to generate for `PROP_KEYS.CHURCH`.
 *
 * Same continuous-tone-source situation as `assets/terrain/lourdesGrass.ts`: the supplied PNG
 * (1536x1024, transparent background) reads as pixel art but its raw pixel data is not genuinely
 * flat-block — confirmed by run-length sampling, most runs of identical adjacent pixels were only
 * 1px long. So this asset is the source cropped tightly to its opaque content (749x943), downscaled
 * with a single `Image.BOX` pass to 94x118 (chosen to fit the gap between the river and the
 * existing presbytery building without overlap — see the placement comment in
 * `OverworldScene.ts`'s `TOWN_BUILDINGS`), then color-quantized (32 colors, median-cut, no
 * dithering, alpha channel preserved untouched) to force flat, hard-edged color regions. The
 * displayed in-game size is intentionally this texture's exact native size (no further
 * scaling/`setDisplaySize` call) so Phaser's NEAREST texture filtering never has to scale it,
 * keeping every edge pixel-perfect.
 */
export const LOURDES_CHURCH_KEY = 'lourdes_church_real';
export const LOURDES_CHURCH_WIDTH = 94;
export const LOURDES_CHURCH_HEIGHT = 118;

export function preloadLourdesChurch(scene: Phaser.Scene): void {
  scene.load.image(LOURDES_CHURCH_KEY, lourdesChurchUrl);
}
