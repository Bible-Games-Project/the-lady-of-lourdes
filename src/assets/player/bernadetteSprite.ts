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
 * The maintainer's own finished artwork for the gameplay player character. The idle crops are
 * byte-identical to the spritesheet the maintainer supplied (re-verified against a fresh copy of
 * that sheet, pixel for pixel, in all three facings) — never redrawn/recolored/redesigned.
 *
 * `BERNADETTE_FRAME_HEIGHT` started at 72px display, became 40% of that (28.8), then 2x *that*
 * (57.6), then 85% of that (48.96), per successive explicit resize requests, each relative to her
 * size at the time. Expressed as a chain of multiplies so that history stays traceable.
 * `Player.ts`'s `baseScale = BERNADETTE_FRAME_HEIGHT / this.height` derives her render scale from
 * this one constant, so it applies uniformly to every facing/texture/animation frame (and her
 * shadow via `SHADOW_SCALE`).
 *
 * Walk frames (`_walk_a1/a2/b1/b2`): each idle image splits cleanly at a measured `feet_top` row
 * (front 762, back 761, side 776) below which there is nothing but legs and boots. Every pixel
 * above that row -- head, torso, poncho, hands, rosary and the entire skirt -- is copied verbatim
 * into every walk frame (verified identical to idle, frame by frame). Only the legs/boots below it
 * are recomposed, by pure integer translation of the original leg/boot pixels (no resampling, no
 * blending of new colors), and whatever a raised foot would push above `feet_top` is clipped away:
 * the leg disappears *behind* the hem rather than being painted over it.
 *  - Front/back: the stepping foot rises behind the hem (half, then full lift) while the other
 *    stays planted; `a*` lifts the left foot, `b*` the right.
 *  - Side: idle is the passing pose; stride frames spread the near leg forward and a slightly
 *    darkened copy of the same leg (the far leg) back with its heel raised, `a*` near-foot-forward,
 *    `b*` far-foot-forward.
 * In every frame the planted foot keeps the idle pose's exact lowest row, so the ground-contact
 * line and the canvas/origin never move. Hands stay still: moving them would mean painting over
 * the skirt or inventing what's behind them.
 */
const BERNADETTE_DISPLAY_HEIGHT_BEFORE_THIS_RESIZE = 72 * 0.4 * 2;
export const BERNADETTE_FRAME_HEIGHT = BERNADETTE_DISPLAY_HEIGHT_BEFORE_THIS_RESIZE * 0.85;

const WALK_STEPS = ['a1', 'a2', 'b1', 'b2'] as const;
type WalkStep = (typeof WALK_STEPS)[number];

const IDLE_URL_BY_FACING: Record<FacingKey, string> = {
  side: sideIdleUrl,
  up: backIdleUrl,
  down: frontIdleUrl,
};
const WALK_URLS_BY_FACING: Record<FacingKey, Record<WalkStep, string>> = {
  side: { a1: sideWalkA1Url, a2: sideWalkA2Url, b1: sideWalkB1Url, b2: sideWalkB2Url },
  up: { a1: backWalkA1Url, a2: backWalkA2Url, b1: backWalkB1Url, b2: backWalkB2Url },
  down: { a1: frontWalkA1Url, a2: frontWalkA2Url, b1: frontWalkB1Url, b2: frontWalkB2Url },
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
    WALK_STEPS.forEach((step) => {
      scene.load.image(walkFrameKey(facing, step), WALK_URLS_BY_FACING[facing][step]);
    });
  });
}

/**
 * Gives her textures `LINEAR` filtering (like the sister/buildings/trees, not the flat procedural
 * characters NEAREST is for) — her native panels are scaled *down* to display size at render time,
 * and LINEAR is what makes that downscale read smooth instead of aliased.
 *
 * One walk animation per facing, 8 frames at 12fps (~0.67s per full two-step cycle):
 * `[idle, a1, a2, a1, idle, b1, b2, b1]` -- each foot eases up and back down rather than snapping.
 * `Player.ts` only plays this while actually moving and returns to the idle texture the instant she
 * stops.
 */
export function registerBernadetteSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    const idleKey = textureKeyFor('bernadette', facing, null);
    const key = (step: WalkStep) => walkFrameKey(facing, step);
    [idleKey, ...WALK_STEPS.map(key)].forEach((k) => {
      scene.textures.get(k).setFilter(Phaser.Textures.FilterMode.LINEAR);
    });

    const animKey = walkAnimKeyFor('bernadette', facing);
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: [idleKey, key('a1'), key('a2'), key('a1'), idleKey, key('b1'), key('b2'), key('b1')].map((k) => ({ key: k })),
        frameRate: 12,
        repeat: -1,
      });
    }
  });
}
