import type { NpcActor } from './NpcActor';
import { depthForY } from './utils';

// Below this many px of movement along an axis, that axis reads as "not really moving there" --
// dx/dy are the raw distance-to-target on each axis and are essentially never exactly 0 (floating
// -point easing), so a strict `!== 0` check would treat almost every frame as "diagonal." Matches
// the threshold this function's own old `Math.abs(dy) > 1` check already used for the same purpose.
const AXIS_MOVE_THRESHOLD = 1;

/**
 * Eases a companion NPC toward a target point behind the player, with facing + a real walk
 * animation.
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
export function updateFollowerPosition(actor: NpcActor, targetX: number, targetY: number, _time: number, depthBase: number): void {
  if (!actor.visible) return;

  const dx = targetX - actor.x;
  const dy = targetY - actor.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 2) {
    actor.x += dx * 0.06;
    actor.y += dy * 0.06;
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
