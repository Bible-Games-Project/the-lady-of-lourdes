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
 * no lo pixeles más") is used at its own native resolution instead: each of the 3 panels (side
 * 293x925, front 350x934, back 320x927) is cropped to its own alpha bounding box and used
 * byte-for-byte beyond that crop -- no resize, no requantization, nothing that would soften or
 * degrade it further. `registerSisterSprite()` below gives these `LINEAR` filtering (like the
 * buildings/trees, not the flat procedural pixel-art characters) so the large downscale to her
 * actual on-screen size (`SISTER_FRAME_HEIGHT`, via `NpcActor`'s own `targetHeight` param -- see
 * that file's doc comment) comes out smooth/anti-aliased instead of blocky, the same supersample
 * -then-LINEAR-downscale technique already used for `lourdesGrass.ts` and the journey medallion
 * icons, just with a real photographed/painted source here instead of a procedural one.
 *
 * **Sized at 85% of Bernadette's own height** (`SISTER_FRAME_HEIGHT` below, `round(42 * 0.85)` —
 * an explicit maintainer request: "she is her younger sister") — this is still the *display*
 * height; it no longer has to match the source panels' own native pixel height the way the old,
 * pre-shrunk pipeline required, since `NpcActor` now scales the sprite down from whatever native
 * size the texture actually is.
 *
 * Walk-cycle frames (`_walk_a/b.png`) use the same cutout-puppet deformation technique documented
 * for Bernadette (AGENTS.md), regenerated from scratch against this new source at its own full
 * resolution (not a padded intermediate size downscaled afterward -- unnecessary now, since there's
 * no final shrink step to protect against losing detail to):
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
