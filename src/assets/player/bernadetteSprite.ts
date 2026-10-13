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
 * from the conversation that supplied it for the idle poses — never redrawn/recolored/redesigned.
 *
 * `BERNADETTE_FRAME_HEIGHT` started at 72px display, became 40% of that (28.8), then 2x *that*
 * (57.6) per two separate earlier resize requests. The current request is "make Bernadette 15%
 * smaller... a scale factor of 0.85 relative to her current size" -- "current" again means exactly
 * what was live at request time (57.6), so this is `57.6 * 0.85` = 48.96, not a fresh 85% of the
 * original 72. Expressed as a multiply against the prior constant so the full history of resize
 * requests stays traceable at the definition instead of collapsing into one opaque number.
 * `Player.ts`'s `baseScale = BERNADETTE_FRAME_HEIGHT / this.height` derives her actual render scale
 * from this one constant, so the resize applies uniformly to every facing/texture/animation frame
 * (and her shadow via `SHADOW_SCALE`) -- no source art file is touched.
 *
 * Walk animation: after three earlier rounds either chased camera/movement bugs that turned out to
 * be unrelated to this art, or concluded (via direct per-pixel measurement) that this artwork has
 * no margin around the boots/hands to shift an existing patch into without touching the skirt --
 * the maintainer explicitly authorized creating new pixel content rather than only rearranging
 * existing pixels ("create suitable frames that preserve the original design instead of claiming
 * the animation is complete when it is not"). `_walk_a1`/`_walk_b1` below are generated from the
 * idle crops via the same boot-lift + hand/rosary-swing technique used throughout this file's
 * history (independent per-limb patch shift + gradient/strip fill for the vacated area), with the
 * skirt_shear() step *not* called at all -- the skirt fabric's own pixels are never read or moved.
 * Because the boot boxes sit flush against the hem with zero gap in this artwork (measured, not
 * assumed), a lifted/shifted boot's new position does occlude a small number of hem-colored pixels
 * in these two walk frames specifically (a few thousand native px out of ~170k opaque px per
 * facing, confirmed by direct pixel-diff against idle) -- that is the boot's own unmodified art
 * drawn on top of where the hem used to show through, the same category of occlusion any 2D
 * character's limb naturally produces when it moves in front of a garment, not a deformation of
 * the garment itself. The idle texture and the skirt region within these walk frames are otherwise
 * untouched. Only the smaller-magnitude pair (t = ±sin(π/4) ≈ 0.707) is used, in a plain 4-frame
 * loop (`[idle, a1, idle, b1]`) -- deliberately restrained rather than the full 8-phase cycle
 * earlier rounds tried.
 */
const BERNADETTE_DISPLAY_HEIGHT_BEFORE_THIS_RESIZE = 72 * 0.4 * 2;
export const BERNADETTE_FRAME_HEIGHT = BERNADETTE_DISPLAY_HEIGHT_BEFORE_THIS_RESIZE * 0.85;

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
 * characters NEAREST is for) — her native panels (337-398px wide, ~861-870px tall) are scaled
 * *down* to display size at render time (`Player.ts`'s `baseScale`); LINEAR is what makes that
 * downscale read as smooth/anti-aliased instead of aliased at this minification ratio, the same
 * reasoning the sister/buildings/trees already use.
 *
 * Registers one restrained walk animation per facing: `[idle, a1, idle, b1]`, 4 frames at
 * `frameRate: 6` (~0.67s per full step cycle). `Player.ts` only plays this while actually moving,
 * and stops it (back to the idle texture) the instant she stops.
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
