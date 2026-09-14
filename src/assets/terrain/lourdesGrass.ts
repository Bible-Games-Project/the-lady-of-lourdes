import Phaser from 'phaser';
import lourdesGrassUrl from './lourdes_grass.png';

/**
 * The maintainer's own grass-texture artwork, used as the base ground tile for the playable
 * Lourdes Overworld scene (`OverworldScene.ts`) only — not the Journey/Map screen (its own
 * separate background image, `assets/journey/journeyMap.ts`) and not Home (its own separate
 * background, `assets/home/homeBackground.ts`).
 *
 * The maintainer's supplied source is 1254x1254 and reads as pixel art at a glance, but its pixel
 * data is actually continuous-tone (soft Perlin-noise-style shading with a light pixelation
 * *styling* overlay, not true flat-color blocks — confirmed by sampling raw adjacent-pixel values,
 * which trend smoothly rather than jumping between a small set of repeated colors). Used at that
 * native resolution, or resized with an ordinary resampling filter alone, it renders visibly soft
 * in-game — nearest-neighbor texture filtering (which this project always uses for pixel art) can
 * only prevent *new* blur from scaling; it cannot un-blur texture data that is already soft. So
 * this asset is the source resized down with a single clean `Image.BOX` pass (area-averages each
 * output pixel — appropriate for a large reduction ratio like this, unlike a big single-pixel
 * `NEAREST` decimation, which was tried and looked noisy/aliased rather than crisp) to 157x157,
 * *then* color-quantized to a small discrete palette (12 colors, median-cut, no dithering). The
 * quantization step is what actually produces flat, hard-edged color regions — a resize alone
 * cannot do that on a continuous-tone source, no matter the target size. This changes no shapes or
 * layout (every blade-tuft accent and mottled patch sits exactly where the source has it), only
 * snaps each pixel's color to the nearest of the 12 swatches, which is what makes the result read
 * as genuine flat-color pixel art instead of soft shading.
 *
 * **Rendered as a real `Tilemap` layer, not a `TileSprite`.** An earlier attempt used a
 * `TileSprite` sized to the whole map, which looked soft in-game *despite* correct NEAREST texture
 * filtering — traced to a Phaser internals gotcha: in WebGL mode, `TileSprite` composites its
 * repeating fill pattern by drawing the source frame into an internal power-of-two-sized Canvas2D
 * context (`this.fillContext`) via `ctx.drawImage(...)`, and never disables that specific
 * context's image smoothing (Phaser only ever calls `Smoothing.disable()` on its *other* internal
 * canvas, `this.context`, and only in Canvas-renderer mode) — so every `TileSprite` in a
 * WebGL + `pixelArt: true` game gets a smoothed intermediate composite no matter what the source
 * texture's own `scaleMode` is set to, with no public API to fix it. A genuine `Tilemap` layer
 * doesn't go through that Canvas2D compositing path at all — tiles render through the same
 * GPU quad/texture-batch pipeline as every other sprite in this game (already proven crisp for the
 * character sprites, portraits, and the existing procedural dirt/stone/water tiles), so it
 * honors NEAREST filtering correctly. See `OverworldScene.ts#buildTerrain()` for how this single
 * 157x157 tile is laid down, repeating, as its own `Tilemap` layer underneath the existing
 * path/water/stone/cave layer (whose cells default to Phaser's `-1` "empty" tile wherever grass
 * belongs, letting this show through).
 */
export const LOURDES_GRASS_KEY = 'lourdes_grass_real';
export const LOURDES_GRASS_TILE_SIZE = 157;

export function preloadLourdesGrass(scene: Phaser.Scene): void {
  scene.load.image(LOURDES_GRASS_KEY, lourdesGrassUrl);
}
