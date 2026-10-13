import type { NpcActor } from './NpcActor';
import { depthForY } from './utils';

// Below this many px of movement along an axis, that axis reads as "not really moving there" --
// dx/dy are the raw distance-to-target on each axis and are essentially never exactly 0 (floating
// -point easing), so a strict `!== 0` check would treat almost every frame as "diagonal." Matches
// the threshold this function's own old `Math.abs(dy) > 1` check already used for the same purpose.
const AXIS_MOVE_THRESHOLD = 1;

// Reference frame duration the lerp factor below was tuned against (60fps) -- see this function's
// own doc comment for why `delta` has to scale it.
const REF_FRAME_MS = 1000 / 60;
const LERP = 0.06;

/**
 * Eases a companion NPC toward a target point behind the player, with facing + a real walk
 * animation.
 *
 * **Time-compensated lerp** (root-caused and fixed the same way `OverworldScene.ts#
 * updateCameraFollow()`'s own doc comment documents for the camera's own near-identical bug,
 * confirmed here by the same measurement technique rather than assumed to be the same bug just
 * because it looked similar): this used to do `actor.x += dx * 0.06` once per call to this
 * function, i.e. once per rendered frame, never scaled by how much real time that frame actually
 * covered (`_time` was accepted but never used). Measured directly (logging the continuous
 * target-minus-actor gap every frame during a sustained diagonal walk, under this environment's
 * own irregular frame timing -- delta observed ranging ~17-42ms, not a steady 16.7ms): the gap
 * never settled to a constant the way a correctly time-compensated exponential filter's lag
 * should under constant-velocity following. Instead it crept further behind on larger-delta
 * frames (since only 6% of whatever the *current* gap happened to be was closed, regardless of
 * how much extra ground the player covered that frame), and her on-screen position advanced by a
 * different pixel count essentially every single frame instead of a smooth, consistent amount --
 * the visible "shake" being reported. Fixed with the identical time-compensated-exponential-
 * smoothing formula the camera already uses: `factor = 1 - (1 - lerp) ** (delta / refMs)`, which
 * reduces back to the original `0.06` at exactly 60fps (preserving the existing follow feel at
 * steady frame rate) and scales correctly when it isn't steady.
 *
 * **Facing follows the same "prefer vertical on any diagonal" rule `Player.ts` uses for Bernadette
 * herself** (via `spriteFacing.ts`'s own `preferVerticalOnDiagonal` flag) -- moving purely left or
 * right uses the side pose, purely up or down uses back/front, and *any* diagonal (both axes moving
 * at once) always uses back (up-left/up-right) or front (down-left/down-right), never the side
 * pose. The previous logic (`if (abs(dx) > abs(dy)) side else vertical`) picked whichever axis's
 * raw distance-to-target happened to be larger that single frame -- during genuinely diagonal
 * following, that comparison flips essentially at random frame-to-frame (the easing target rarely
 * sits at a clean 45°), so she'd visibly flicker into the side pose mid-diagonal-walk. This
 * function doesn't share `spriteFacing.ts`'s own helper (that one drives a `Sprite`'s texture/anim
 * directly; `NpcActor.setFacing()` is `Follower`'s own actor's equivalent), so the same rule is
 * reimplemented here directly rather than reachable through it.
 */
export function updateFollowerPosition(actor: NpcActor, targetX: number, targetY: number, delta: number, depthBase: number): void {
  if (!actor.visible) return;

  const dx = targetX - actor.x;
  const dy = targetY - actor.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 2) {
    const factor = 1 - Math.pow(1 - LERP, delta / REF_FRAME_MS);
    actor.x += dx * factor;
    actor.y += dy * factor;
    const movingX = Math.abs(dx) > AXIS_MOVE_THRESHOLD;
    const movingY = Math.abs(dy) > AXIS_MOVE_THRESHOLD;
    if (movingX && movingY) actor.setFacing(dy < 0 ? 'up' : 'down');
    else if (movingX) actor.setFacing(dx < 0 ? 'left' : 'right');
    else if (movingY) actor.setFacing(dy < 0 ? 'up' : 'down');
  }

  actor.setDepth(depthForY(actor.y, depthBase));
  actor.setMoving(dist > 4);
  actor.syncShadow();
}
