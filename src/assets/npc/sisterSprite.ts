import Phaser from 'phaser';
import { textureKeyFor, walkAnimKeyFor } from '../../pixelart/characters';
import sideIdleUrl from './sister_side_idle.png';
import sideWalkAUrl from './sister_side_walk_a.png';
import sideWalkBUrl from './sister_side_walk_b.png';
import backIdleUrl from './sister_back_idle.png';
import backWalkAUrl from './sister_back_walk_a.png';
import backWalkBUrl from './sister_back_walk_b.png';
import frontIdleUrl from './sister_front_idle.png';
import frontWalkAUrl from './sister_front_walk_a.png';
import frontWalkBUrl from './sister_front_walk_b.png';

/**
 * Second full swap of the sister's artwork (`CharacterId: 'sister'`). The first round's PNGs had
 * been cropped AND resized all the way down to their own tiny final display size (~11-18px wide,
 * 36px tall) before ever reaching the game -- which, combined with the whole-canvas NEAREST
 * upscale `pixelArt: true` applies at the browser level (see `ui/text.ts`'s own doc comment on
 * that mechanism), was the actual root cause of a later maintainer complaint that she (and the
 * other NPCs) looked "pixelado/borroso" -- not a filter-mode bug, a genuinely too-small source
 * texture. This round's source ("te paso otra vez el sprite sheet... Lo quiero con esta calidad,
 * no lo pixeles más") is cropped to each panel's own alpha bounding box, at its full native
 * resolution (side 293x925, front 350x934, back 320x927) -- no intermediate resize.
 *
 * That full-native-resolution version was tried first and genuinely shipped, but broke on the very
 * next report: "se ve con un ojo grande, el otro no está, esta borrosa" (one eye huge, the other
 * missing, blurry) -- a real WebGL rendering bug, not a figure of speech. Root cause, confirmed by
 * reading Phaser's own `WebGLTextureWrapper.js`: it only auto-generates mipmaps for a texture whose
 * width *and* height are both an exact power of two (`IsSizePowerOfTwo(width, height)`), which none
 * of these cropped panels are. Without mipmaps, `LINEAR` minification at a large ratio samples too
 * sparsely to represent fine high-frequency detail -- exactly what two small symmetric eyes are --
 * producing visibly asymmetric/corrupted results, while the dress's own large, low-frequency color
 * regions stayed fine (which is why the dress looked smooth and only the face looked broken). That
 * first attempt hit this at her then-display height of 36 *actual framebuffer* pixels (the game
 * rendered everything into a 480x270 canvas at camera zoom 1, so "36px display height" and "36
 * resolved pixels" were the same number) -- a ~25x minification ratio from her ~925px source,
 * well past the ~8-12x range buildings/trees already proved safe (native ~800-1500px downscaled to
 * ~90-130px *framebuffer* pixels). The fix shipped at the time was to resize her source down to an
 * intermediate 300px-tall PNG, bringing the ratio back into that safe range -- but that traded the
 * corruption bug for a *different* complaint ("se ve super pixelado... quiero que se vea bien
 * definido"): at only 36 real framebuffer pixels of height, even perfectly-clean LINEAR-filtered
 * downsampling of real/painted art reads as soft and underdefined compared to genuine hand-placed
 * pixel art (which Bernadette/Jeanne/the boy/the mother all are, drawn *at* their native ~34-42px
 * size) -- more *input* resolution couldn't fix that, because the bottleneck was never the input,
 * it was the ~36-pixel *output* resolution every sprite in the game was limited to.
 *
 * The actual fix for that was `PIXEL_SCALE` (`core/constants.ts`): the game's framebuffer now
 * renders at `PIXEL_SCALE`x the resolution it used to (960x540, with every camera zoomed to match,
 * so on-screen size/position is unchanged), which gives her `PIXEL_SCALE`x as many real pixels at
 * the same `SISTER_FRAME_HEIGHT` -- 72 framebuffer pixels instead of 36. That drops her full-native
 * -resolution minification ratio from the original ~25x down to ~12-13x, right at the edge of the
 * already-proven-safe 8-12x range, which is why the source PNGs here went back to full native
 * resolution instead of staying at the 300px intermediate size: `PIXEL_SCALE` fixes the actual
 * bottleneck (output resolution) directly, so the resize-down workaround is no longer needed, and
 * dropping it keeps all of her source art's real detail instead of discarding some of it up front.
 * `registerSisterSprite()` below still gives these `LINEAR` filtering (like the buildings/trees, not
 * the flat procedural pixel-art characters) for that ~12-13x downscale to come out smooth/anti
 * -aliased instead of blocky.
 *
 * **Sized at 85% of Bernadette's own height** (`SISTER_FRAME_HEIGHT` below, `round(42 * 0.85)` —
 * an explicit maintainer request: "she is her younger sister") — this is still the *display*
 * height; it no longer has to match the source panels' own native pixel height the way the old,
 * pre-shrunk pipeline required, since `NpcActor` now scales the sprite down from whatever native
 * size the texture actually is.
 *
 * Walk-cycle frames (`_walk_a/b.png`) use the same cutout-puppet deformation technique documented
 * for Bernadette (AGENTS.md), applied directly against these full-resolution crops (no resize step
 * at all now, see this file's own header comment above):
 *  - Independent left/right boot shifts (opposite vertical offsets, swapping between frames 'a'/
 *    'b') for front and back, where the art shows two separate boots; a single boot shift for the
 *    side view, which only shows one.
 *  - Front's hands are clasped/interlocked, so they move as a single unit (a small vertical shift)
 *    rather than two independent hands, matching how the art itself draws them. Back shows two
 *    separate hands hanging at the sides, so those move independently (opposite small vertical
 *    shifts). Side shows one visible hand, given a forward/back horizontal shift for an arm-swing
 *    look. Each hand region is clone-filled from a strip of unobstructed fabric just past it before
 *    the shifted hand is pasted back on top -- a hand sits in front of the dress, so simply cutting
 *    it out (the way a boot, which sits over already-transparent background, safely can) would
 *    leave a hole where dress fabric should still show through.
 *  - A single-direction waist-down skirt shear (not a mirrored per-half twist), same choice as the
 *    previous round and for the same reason: safe at any resolution, no center-seam gap risk.
 * Idle frames are the untouched crops, no deformation -- same as every previous round.
 *
 * Registered under the same `textureKeyFor('sister', facing, step)` / `walkAnimKeyFor('sister',
 * facing)` keys as before — see `registerSisterSprite()` below and `pixelart/characters.ts`'s
 * `PROCEDURAL_CHARACTER_IDS` exclusion list (mirrors how `'bernadette'` is excluded there).
 */
export const SISTER_FRAME_HEIGHT = Math.round(42 * 0.85);

const URLS_BY_FACING = {
  side: { idle: sideIdleUrl, a: sideWalkAUrl, b: sideWalkBUrl },
  up: { idle: backIdleUrl, a: backWalkAUrl, b: backWalkBUrl },
  down: { idle: frontIdleUrl, a: frontWalkAUrl, b: frontWalkBUrl },
} as const;
const ALL_FACINGS = ['down', 'up', 'side'] as const;

export function preloadSisterSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    const urls = URLS_BY_FACING[facing];
    scene.load.image(textureKeyFor('sister', facing, null), urls.idle);
    scene.load.image(textureKeyFor('sister', facing, 'a'), urls.a);
    scene.load.image(textureKeyFor('sister', facing, 'b'), urls.b);
  });
}

/** `LINEAR` filtering -- see this file's own header comment for why this reverses the previous
 * round's explicit NEAREST choice: that choice was correct for a texture already shrunk to its
 * final tiny display size, but this source is real painted/shaded art at a much larger native
 * resolution, the same category as the buildings/trees (which already use LINEAR), not the flat
 * procedural pixel-art characters NEAREST is for. */
export function registerSisterSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    [textureKeyFor('sister', facing, null), textureKeyFor('sister', facing, 'a'), textureKeyFor('sister', facing, 'b')].forEach((key) => {
      scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    });

    const animKey = walkAnimKeyFor('sister', facing);
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: [
          { key: textureKeyFor('sister', facing, 'a') },
          { key: textureKeyFor('sister', facing, null) },
          { key: textureKeyFor('sister', facing, 'b') },
          { key: textureKeyFor('sister', facing, null) },
        ],
        frameRate: 6,
        repeat: -1,
      });
    }
  });
}
