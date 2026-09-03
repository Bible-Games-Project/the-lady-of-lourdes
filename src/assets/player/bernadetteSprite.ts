import Phaser from 'phaser';
import { textureKeyFor, walkAnimKeyFor, type FacingKey } from '../../pixelart/characters';
import sideIdleUrl from './bernadette_side_idle.png';
import sideWalkAUrl from './bernadette_side_walk_a.png';
import sideWalkBUrl from './bernadette_side_walk_b.png';
import backIdleUrl from './bernadette_back_idle.png';
import backWalkAUrl from './bernadette_back_walk_a.png';
import backWalkBUrl from './bernadette_back_walk_b.png';
import frontIdleUrl from './bernadette_front_idle.png';
import frontWalkAUrl from './bernadette_front_walk_a.png';
import frontWalkBUrl from './bernadette_front_walk_b.png';

/**
 * The maintainer's own finished artwork for the gameplay player character, recovered byte-for-byte
 * from the conversation that supplied it (same handling as `assets/home/home_background.png`) —
 * never redrawn/recolored/redesigned. Unlike the original single-side-profile version, the source
 * here is a genuine 3-view reference sheet (side / back / front, in that order) drawn by the
 * maintainer, so every facing now uses real art directly: no reconstruction, mirroring, or
 * rotation of one pose to fake another. `side` is used as-is for `right` and horizontally flipped
 * (`setFlipX`, in `spriteFacing.ts`) for `left`; `back` is used only for `up`; `front` only for
 * `down`. All three source panels were cropped to their own precise alpha bounding box and resized
 * to the same final height so switching facing never jumps the character's apparent scale or
 * ground contact point (`Player.ts` keeps her origin at (0.5, 1), and each crop's bottom edge is
 * exactly her feet).
 *
 * Every walk-cycle frame (`_walk_a/b.png`, all 3 views) is a cutout-puppet deformation — independent
 * small shifts on the *separate* left/right boot regions (so the two feet visibly swap which is
 * forward/planted vs. back/lifted, not just the whole foot cluster translating), opposite-arm
 * counter-swing on the hand region(s) (one hand for the side view, two — independently shifted —
 * for back/front), a waist-down skirt shear (single-direction for the side view; mirrored/opposing
 * for back/front so the skirt reads as a subtle twist rather than a uniform lean), and a sub-pixel
 * vertical bob. Generated at a larger intermediate resolution (~60px tall, one clean LANCZOS
 * resize from the untouched source crop) and then downscaled to final size with a *second* single
 * clean LANCZOS resize — deforming directly at the tiny final size left too little pixel data for
 * the two boots to read as different feet, so the larger intermediate step stays necessary. An
 * earlier version of this pipeline added an `ImageFilter.UnsharpMask` pass after each of those two
 * resizes specifically to counter LANCZOS's inherent softening — that's extra, avoidable
 * resampling on top of an already-lossy resize, and was part of a reported blur regression (see
 * `registerBernadetteSprite()` below for the other, larger part: an explicit LINEAR texture filter
 * override). Idle frames need no deformation at all (breathing is a runtime `scaleY` effect in
 * `Player.ts`, never baked into the texture) and are generated with a single direct resize from the
 * source crop straight to final size. If these frames are ever regenerated, keep working at a
 * larger intermediate size before the final downscale, and don't reintroduce an unsharp pass —
 * LANCZOS alone, once, per resize is enough; sharpening on top of it just adds ringing artifacts.
 */
export const BERNADETTE_FRAME_SIZE = { width: 15, height: 42 } as const;

const URLS_BY_FACING: Record<FacingKey, Record<'a' | 'b' | 'idle', string>> = {
  side: { idle: sideIdleUrl, a: sideWalkAUrl, b: sideWalkBUrl },
  up: { idle: backIdleUrl, a: backWalkAUrl, b: backWalkBUrl },
  down: { idle: frontIdleUrl, a: frontWalkAUrl, b: frontWalkBUrl },
};
const ALL_FACINGS: FacingKey[] = ['down', 'up', 'side'];

/**
 * Loads the real art under the *exact* key strings
 * `pixelart/characters.ts#textureKeyFor('bernadette', facing, step)` would have used for the
 * procedural version — `Player.ts`, `spriteFacing.ts`, and `NpcActor.ts` all address her purely
 * through those key-generating functions, so nothing about the shared movement/animation code
 * needs to know or care that her textures now come from real images.
 */
export function preloadBernadetteSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    const urls = URLS_BY_FACING[facing];
    scene.load.image(textureKeyFor('bernadette', facing, null), urls.idle);
    scene.load.image(textureKeyFor('bernadette', facing, 'a'), urls.a);
    scene.load.image(textureKeyFor('bernadette', facing, 'b'), urls.b);
  });
}

/**
 * Registers the walk animations, once the textures above have loaded. Deliberately does *not*
 * call `setFilter(LINEAR)` the way Home's real-photo background does — unlike that full-bleed
 * background, these frames are meant to read as pixel art like every other character (the whole
 * game already runs with `pixelArt: true` in `main.ts`, which defaults every texture's sampling to
 * NEAREST/hard-edged). An earlier version of this file explicitly forced Bernadette's textures to
 * LINEAR, reasoning she was "real illustration, not the hard-edged procedural pixel grid" — that
 * was the actual cause of a reported softness/blur regression: LINEAR interpolates between texel
 * colors on every scale-up, which is exactly what smears her small 15x42 frames into a blurred
 * silhouette instead of the crisp, clearly-defined pixel edges the rest of the game has. Leaving
 * her textures on Phaser's own NEAREST default (don't reintroduce an explicit LINEAR override here)
 * is the fix — confirmed by comparing in-game screenshots before/after.
 */
export function registerBernadetteSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    const animKey = walkAnimKeyFor('bernadette', facing);
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: [
          { key: textureKeyFor('bernadette', facing, 'a') },
          { key: textureKeyFor('bernadette', facing, null) },
          { key: textureKeyFor('bernadette', facing, 'b') },
          { key: textureKeyFor('bernadette', facing, null) },
        ],
        frameRate: 6,
        repeat: -1,
      });
    }
  });
}
