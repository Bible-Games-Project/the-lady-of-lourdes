import Phaser from 'phaser';
import { idleAnimKeyFor, textureKeyFor, walkAnimKeyFor, type FacingKey } from '../../pixelart/characters';
import sideIdleUrl from './bernadette_side_idle.png';
import sideWalkA1Url from './bernadette_side_walk_a1.png';
import sideWalkA2Url from './bernadette_side_walk_a2.png';
import sideWalkB1Url from './bernadette_side_walk_b1.png';
import sideWalkB2Url from './bernadette_side_walk_b2.png';
import sideBreath1Url from './bernadette_side_breath_1.png';
import sideBreath2Url from './bernadette_side_breath_2.png';
import backIdleUrl from './bernadette_back_idle.png';
import backWalkA1Url from './bernadette_back_walk_a1.png';
import backWalkA2Url from './bernadette_back_walk_a2.png';
import backWalkB1Url from './bernadette_back_walk_b1.png';
import backWalkB2Url from './bernadette_back_walk_b2.png';
import backBreath1Url from './bernadette_back_breath_1.png';
import backBreath2Url from './bernadette_back_breath_2.png';
import frontIdleUrl from './bernadette_front_idle.png';
import frontWalkA1Url from './bernadette_front_walk_a1.png';
import frontWalkA2Url from './bernadette_front_walk_a2.png';
import frontWalkB1Url from './bernadette_front_walk_b1.png';
import frontWalkB2Url from './bernadette_front_walk_b2.png';
import frontBreath1Url from './bernadette_front_breath_1.png';
import frontBreath2Url from './bernadette_front_breath_2.png';

/**
 * The maintainer's own finished artwork for the gameplay player character (second version of the
 * sheet: side, front, back). Each idle image is that figure cut straight out of the sheet --
 * never redrawn, recolored or resampled -- and placed on one common 312x805 canvas shared by every
 * facing and every frame (feet on the bottom row, horizontally centred on the hem), so switching
 * facing or frame never changes her size or anchor. The only change to the source pixels is alpha
 * cleanup of the lossy-WebP export: near-invisible background noise (alpha <= 8) became fully
 * transparent and the near-opaque body (alpha ~253) became fully opaque.
 *
 * `BERNADETTE_FRAME_HEIGHT` started at 72px display, became 40% of that (28.8), then 2x *that*
 * (57.6), then 85% of that (48.96), per successive explicit resize requests, each relative to her
 * size at the time. Expressed as a chain of multiplies so that history stays traceable.
 * `Player.ts`'s `baseScale = BERNADETTE_FRAME_HEIGHT / this.height` derives her render scale from
 * this one constant, so it applies uniformly to every facing/texture/animation frame (and her
 * shadow via `SHADOW_SCALE`).
 *
 * Walk frames (`_walk_a1/a2/b1/b2`): each idle image splits cleanly at a measured `feet_top` row
 * (side 760, front 758, back 764) below which there is nothing but boots. Every pixel above that
 * row -- head, veil, cape, hands, rosary and the entire habit -- is copied verbatim into every walk
 * frame (verified identical to idle, frame by frame). Only the boots below it are recomposed, by
 * pure integer translation of the original boot pixels, and whatever a raised foot would push
 * above `feet_top` is clipped away: the foot disappears *behind* the hem rather than over it.
 *  - Front/back: the stepping foot rises behind the hem (half, then full lift) while the other
 *    stays planted; `a*` lifts the left foot, `b*` the right.
 *  - Side: idle is the passing pose; stride frames spread the near foot forward and a slightly
 *    darkened copy of it (the far foot) back with its heel raised, `a*` near-foot-forward,
 *    `b*` far-foot-forward.
 * In every frame the planted foot keeps the idle pose's exact lowest row, so the ground-contact
 * line and the canvas/origin never move.
 *
 * Breathing frames (`_breath_1/2`): everything above a seam row low in the skirt sinks by 5 / 10
 * native px (about half / one framebuffer pixel at her display size), by dropping that many rows
 * of the plain vertically-striped skirt at the seam -- whole rows of the original pixels, no
 * resampling. Below the seam (hem and boots) nothing changes. The seam row was picked per facing
 * where dropping rows is least visible (side 662, front 631, back 701).
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
const BREATH_URLS_BY_FACING: Record<FacingKey, [string, string]> = {
  side: [sideBreath1Url, sideBreath2Url],
  up: [backBreath1Url, backBreath2Url],
  down: [frontBreath1Url, frontBreath2Url],
};
const ALL_FACINGS: FacingKey[] = ['down', 'up', 'side'];

/** Walk-cycle frame keys never go through the shared `textureKeyFor()`/`StepFrame` system (that
 * type is pinned to `'a' | 'b' | null` for the generic procedural NPC roster) -- kept entirely
 * local to this file so these extra frames can't affect any other character. */
function walkFrameKey(facing: FacingKey, step: WalkStep): string {
  return `${textureKeyFor('bernadette', facing, null)}_walk_${step}`;
}

function breathFrameKey(facing: FacingKey, n: 1 | 2): string {
  return `${textureKeyFor('bernadette', facing, null)}_breath_${n}`;
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
    scene.load.image(breathFrameKey(facing, 1), BREATH_URLS_BY_FACING[facing][0]);
    scene.load.image(breathFrameKey(facing, 2), BREATH_URLS_BY_FACING[facing][1]);
  });
}

/**
 * Gives her textures `LINEAR` filtering (like the sister/buildings/trees, not the flat procedural
 * characters NEAREST is for) — her native panels are scaled *down* to display size at render time,
 * and LINEAR is what makes that downscale read smooth instead of aliased.
 *
 * One walk animation per facing, 8 frames at 12fps (~0.67s per full two-step cycle):
 * `[idle, a1, a2, a1, idle, b1, b2, b1]` -- each foot eases up and back down rather than snapping.
 * `Player.ts` only plays this while actually moving.
 *
 * One idle (breathing) animation per facing, played whenever she stands still (including while
 * locked for dialogue): rest -> half -> full exhale -> half, about 2.4s per breath. It starts on
 * the rest pose, so stopping never jumps.
 */
export function registerBernadetteSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    const idleKey = textureKeyFor('bernadette', facing, null);
    const key = (step: WalkStep) => walkFrameKey(facing, step);
    const breath1 = breathFrameKey(facing, 1);
    const breath2 = breathFrameKey(facing, 2);
    [idleKey, ...WALK_STEPS.map(key), breath1, breath2].forEach((k) => {
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

    const idleAnimKey = idleAnimKeyFor('bernadette', facing);
    if (!scene.anims.exists(idleAnimKey)) {
      scene.anims.create({
        key: idleAnimKey,
        frames: [
          { key: idleKey, duration: 900 },
          { key: breath1, duration: 300 },
          { key: breath2, duration: 900 },
          { key: breath1, duration: 300 },
        ],
        repeat: -1,
      });
    }
  });
}
