import Phaser from 'phaser';
import { textureKeyFor, walkAnimKeyFor, type FacingKey } from '../../pixelart/characters';
import sideIdleUrl from './bernadette_side_idle.png';
import sideWalkA1Url from './bernadette_side_walk_a1.png';
import sideWalkB1Url from './bernadette_side_walk_b1.png';
import backIdleUrl from './bernadette_back_idle.png';
import backWalkA1Url from './bernadette_back_walk_a1.png';
import backWalkB1Url from './bernadette_back_walk_b1.png';
import frontIdleUrl from './bernadette_front_idle.png';
import frontWalkA1Url from './bernadette_front_walk_a1.png';
import frontWalkB1Url from './bernadette_front_walk_b1.png';

/**
 * The maintainer's own finished artwork for the gameplay player character, recovered byte-for-byte
 * from the conversation that supplied it — never redrawn/recolored/redesigned.
 *
 * History: several rounds of walk-cycle deformation (boot lift, skirt shear, hand/rosary
 * counter-swing) were built here chasing a persistent walking jitter report that survived every
 * fix to that artwork. The jitter was eventually confirmed (by direct frame-by-frame
 * instrumentation) to persist even with every generated frame disabled — i.e. with the sprite
 * provably 100% static — so movement/rendering/camera were rebuilt from scratch, and this file was
 * trimmed to just the 3 idle poses while that rebuild was verified stable. The *actual* root cause
 * turned out to be unrelated to this artwork entirely: `OverworldScene.ts#updateCameraFollow()`'s
 * own doc comment has the full story (a one-physics-tick-stale read of the player's position).
 *
 * Now that the camera is confirmed stable, a restrained walk cycle has been reintroduced: only the
 * smaller-magnitude half of the old deformation set (`_walk_a1`/`_walk_b1`, each ~71% of the old
 * cycle's full extreme) is used, in a plain 4-frame loop (`[idle, a1, idle, b1]`) instead of the
 * previous full 8-phase one -- deliberately less motion and fewer frames than before, not just a
 * restoration of it. Before reusing these specific PNGs, they were re-inspected pixel-by-pixel
 * (not assumed correct): every one of `a1`/`b1`, for all 3 facings, has the exact same canvas
 * dimensions as its facing's idle image, and its lowest opaque row is byte-identical to idle's --
 * zero pixel drift below her feet, confirming the two real bugs that previously caused the resting
 * boot to shift (`skirt_shear` bleeding past the hem into the boot region, `strip_fill` overfilling
 * transparent corners -- see git history on this file for that investigation) are still fixed in
 * these files. `a2`/`b2` (the old cycle's full-extreme pair) are deliberately NOT brought back --
 * only the milder pair, for a visibly more restrained motion.
 *
 * `BERNADETTE_FRAME_HEIGHT` (72px display / 144 actual framebuffer pixels at `PIXEL_SCALE`) is
 * unchanged — purely a display-size calibration constant, nothing about any of this needed to
 * revisit it.
 */
export const BERNADETTE_FRAME_HEIGHT = 72 as const;

type WalkStep = 'a1' | 'b1';

const IDLE_URL_BY_FACING: Record<FacingKey, string> = {
  side: sideIdleUrl,
  up: backIdleUrl,
  down: frontIdleUrl,
};
const WALK_URLS_BY_FACING: Record<FacingKey, Record<WalkStep, string>> = {
  side: { a1: sideWalkA1Url, b1: sideWalkB1Url },
  up: { a1: backWalkA1Url, b1: backWalkB1Url },
  down: { a1: frontWalkA1Url, b1: frontWalkB1Url },
};
const ALL_FACINGS: FacingKey[] = ['down', 'up', 'side'];

/** Walk-cycle frame keys never go through the shared `textureKeyFor()`/`StepFrame` system (that
 * type is pinned to `'a' | 'b' | null` for the generic procedural NPC roster) -- kept entirely
 * local to this file so these extra frames can't affect any other character. */
function walkFrameKey(facing: FacingKey, step: WalkStep): string {
  return `${textureKeyFor('bernadette', facing, null)}_walk_${step}`;
}

/**
 * Loads the real art under the *exact* key strings
 * `pixelart/characters.ts#textureKeyFor('bernadette', facing, null)` would have used for the
 * procedural version — `Player.ts` addresses her purely through that key-generating function, so
 * nothing about movement/rendering needs to know or care that her textures come from real images.
 */
export function preloadBernadetteSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    scene.load.image(textureKeyFor('bernadette', facing, null), IDLE_URL_BY_FACING[facing]);
    (['a1', 'b1'] as const).forEach((step) => {
      scene.load.image(walkFrameKey(facing, step), WALK_URLS_BY_FACING[facing][step]);
    });
  });
}

/**
 * Gives her textures `LINEAR` filtering (like the sister/buildings/trees, not the flat procedural
 * characters NEAREST is for) — correct for this sheet's native panels (337-398px wide, ~861-870px
 * tall) scaled *down* to display size at render time (`Player.ts`'s `baseScale`): at that real ~6x
 * minification ratio, comfortably inside the safe range buildings/trees already use (~8-12x),
 * LINEAR is what makes the downscale read as smooth/anti-aliased instead of aliased.
 *
 * Registers one restrained walk animation per facing: `[idle, a1, idle, b1]`, 4 frames at
 * `frameRate: 6` -- the same per-frame duration (1000/6 ≈ 167ms) the walk cycle had before any of
 * the later 8-phase/jitter work, i.e. a deliberately unhurried, restrained cadence (~0.67s per full
 * step cycle), not tuned up for the smaller motion. `Player.ts` only ever plays this while actually
 * moving, and stops it (back to the plain idle texture) the instant she stops -- this file has no
 * opinion on when it plays, only what it looks like.
 */
export function registerBernadetteSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    const idleKey = textureKeyFor('bernadette', facing, null);
    const a1 = walkFrameKey(facing, 'a1');
    const b1 = walkFrameKey(facing, 'b1');
    [idleKey, a1, b1].forEach((key) => {
      scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    });

    const animKey = walkAnimKeyFor('bernadette', facing);
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: [idleKey, a1, idleKey, b1].map((key) => ({ key })),
        frameRate: 6,
        repeat: -1,
      });
    }
  });
}
