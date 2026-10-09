import Phaser from 'phaser';
import { textureKeyFor, walkAnimKeyFor, type FacingKey } from '../../pixelart/characters';
import sideIdleUrl from './bernadette_side_idle.png';
import sideWalkA1Url from './bernadette_side_walk_a1.png';
import sideWalkA2Url from './bernadette_side_walk_a2.png';
import sideWalkB1Url from './bernadette_side_walk_b1.png';
import sideWalkB2Url from './bernadette_side_walk_b2.png';
import backIdleUrl from './bernadette_back_idle.png';
import backWalkA1Url from './bernadette_back_walk_a1.png';
import backWalkA2Url from './bernadette_back_walk_a2.png';
import backWalkB1Url from './bernadette_back_walk_b1.png';
import backWalkB2Url from './bernadette_back_walk_b2.png';
import frontIdleUrl from './bernadette_front_idle.png';
import frontWalkA1Url from './bernadette_front_walk_a1.png';
import frontWalkA2Url from './bernadette_front_walk_a2.png';
import frontWalkB1Url from './bernadette_front_walk_b1.png';
import frontWalkB2Url from './bernadette_front_walk_b2.png';

/**
 * The maintainer's own finished artwork for the gameplay player character, recovered byte-for-byte
 * from the conversation that supplied it — never redrawn/recolored/redesigned. This is the
 * *fourth* full sprite-sheet swap (poncho, headscarf, and rosary, replacing the previous
 * blue-dress-only sheet), at full native resolution like the round before it: side 337x870,
 * front 398x868, back 379x861, each cropped with a generous 40px transparent margin on every side
 * (not just a tight 2px alpha-bbox pad like the previous round's crops were) specifically so the
 * walk-cycle deformation below has room to shift boots/hem without touching the canvas edge -- see
 * the "clipped boot" bug this avoided, documented in this repo's git history on the previous
 * sheet's own walk-cycle fix.
 *
 * `BERNADETTE_FRAME_HEIGHT` is unchanged from the previous round (72px display / 144 actual
 * framebuffer pixels at `PIXEL_SCALE`) per explicit instruction to keep her calibrated size when
 * swapping in this new sheet -- nothing about this sheet's proportions made that technically
 * necessary to revisit (native panel heights ~861-870px vs. the previous round's ~923-933px is a
 * similar order of magnitude, keeping the same LINEAR-filtering minification ratio reasoning
 * below valid). `side` is used as-is for `right` and horizontally flipped (`setFlipX`, in
 * `spriteFacing.ts`) for `left`; `back` only for `up`; `front` only for `down`.
 *
 * Reported as "visibly shakes/jitters" and separately "doesn't look like real walking" -- both
 * traced to the same root cause, confirmed by measurement rather than guessed (every other
 * hypothesis -- canvas size/alignment per facing, the feet-to-canvas-bottom margin, per-facing
 * origin/anchor, animation frames moving `player.x/y`, the camera following anything but
 * `player.x/y` -- was individually checked this round and found NOT to be the issue; see this
 * repo's commit history for the measurements). The previous version played only 2 distinct
 * deformed poses (`walk_a`/`walk_b`) in a 4-frame cycle `[a, idle, b, idle]`: the alpha-weighted
 * visual centroid of the whole figure moved ~6-8 native px between idle and each extreme, and
 * ~12-14px (roughly 9% of her total width) in the single hard cut between the two extremes twice
 * per cycle, with nothing in between -- a real human stride's visible mass never jumps between two
 * maximally-different poses with zero interpolation, so that hard cut is what read as a
 * shake/wobble rather than a step.
 *
 * Fixed by generating a full 8-phase sinusoidal cycle from the same deformation primitives
 * (independent boot lift+outward shift, hand/rosary counter-swing, waist-down skirt shear) at
 * graduated magnitudes t = sin(2*pi*i/8) for i in 0..7, instead of only ever evaluating them at
 * the two extremes -- consecutive frames now differ by at most ~30% of the old single jump, and
 * the sinusoidal (not linear) spacing eases in/out at the extremes and moves fastest through the
 * middle, the same qualitative shape real limb motion has. Since sin(pi/4) == sin(3*pi/4), the
 * approaching and retreating frames on each side of the cycle are pixel-identical, so only 4 new
 * deformed images per facing are needed (`_walk_a1/a2/b1/b2`, at t = +0.707/+1/-0.707/-1) to cover
 * all 8 steps: `[idle, a1, a2, a1, idle, b1, b2, b1]`. The boots only ever lift *up* (never pushed
 * down past the canvas edge) and the skirt shear clamps each row's shift to what that row's own
 * silhouette can safely take (both carried forward from the previous round's own walk-cycle fix);
 * one hand on each view holds a rosary whose shift/fill box covers the full chain, so it swings
 * rigidly with the hand. Idle is the untouched crop, no deformation.
 */
export const BERNADETTE_FRAME_HEIGHT = 72 as const;

type WalkStep = 'idle' | 'a1' | 'a2' | 'b1' | 'b2';

const URLS_BY_FACING: Record<FacingKey, Record<WalkStep, string>> = {
  side: { idle: sideIdleUrl, a1: sideWalkA1Url, a2: sideWalkA2Url, b1: sideWalkB1Url, b2: sideWalkB2Url },
  up: { idle: backIdleUrl, a1: backWalkA1Url, a2: backWalkA2Url, b1: backWalkB1Url, b2: backWalkB2Url },
  down: { idle: frontIdleUrl, a1: frontWalkA1Url, a2: frontWalkA2Url, b1: frontWalkB1Url, b2: frontWalkB2Url },
};
const ALL_FACINGS: FacingKey[] = ['down', 'up', 'side'];

/** Walk-cycle frame keys never go through the shared `textureKeyFor()`/`StepFrame` system (that
 * type is pinned to `'a' | 'b' | null` for the generic procedural NPC roster) -- kept entirely
 * local to this file so the extra in-between frames can't affect any other character. */
function walkFrameKey(facing: FacingKey, step: Exclude<WalkStep, 'idle'>): string {
  return `${textureKeyFor('bernadette', facing, null)}_walk_${step}`;
}

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
    (['a1', 'a2', 'b1', 'b2'] as const).forEach((step) => {
      scene.load.image(walkFrameKey(facing, step), urls[step]);
    });
  });
}

/**
 * Registers the walk animations, once the textures above have loaded, and gives every texture
 * above `LINEAR` filtering (like the sister/buildings/trees, not the flat procedural characters
 * NEAREST is for) -- still correct with this (fourth) sheet's native panels (337-398px wide,
 * 861-870px tall) scaled *down* to display size at render time (`Player.ts`'s `targetHeight`): at
 * that real ~6x minification ratio (full native height / the actual framebuffer pixels she ends
 * up drawn at, i.e. native height / (`BERNADETTE_FRAME_HEIGHT` x `PIXEL_SCALE`)) -- comfortably
 * inside the safe range buildings/trees already use (~8-12x) -- LINEAR is what makes the downscale
 * read as smooth/anti-aliased instead of aliased, exactly the same reasoning `sisterSprite.ts`
 * documents for its own texture.
 *
 * 8 frames at frameRate 12 keeps the same ~0.67s-per-cycle cadence the old 4-frame/6fps animation
 * had (4/6 == 8/12) -- twice the sample density over the same real-world stride duration, not a
 * faster or slower walk.
 */
export function registerBernadetteSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    const idleKey = textureKeyFor('bernadette', facing, null);
    [idleKey, ...(['a1', 'a2', 'b1', 'b2'] as const).map((step) => walkFrameKey(facing, step))].forEach((key) => {
      scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    });

    const animKey = walkAnimKeyFor('bernadette', facing);
    if (!scene.anims.exists(animKey)) {
      const a1 = walkFrameKey(facing, 'a1');
      const a2 = walkFrameKey(facing, 'a2');
      const b1 = walkFrameKey(facing, 'b1');
      const b2 = walkFrameKey(facing, 'b2');
      scene.anims.create({
        key: animKey,
        frames: [idleKey, a1, a2, a1, idleKey, b1, b2, b1].map((key) => ({ key })),
        frameRate: 12,
        repeat: -1,
      });
    }
  });
}
