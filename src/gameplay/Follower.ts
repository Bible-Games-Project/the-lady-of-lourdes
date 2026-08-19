import type { NpcActor } from './NpcActor';
import { depthForY } from './utils';

/** Eases a companion NPC toward a target point behind the player, with facing + a real walk animation. */
export function updateFollowerPosition(actor: NpcActor, targetX: number, targetY: number, _time: number, depthBase: number): void {
  if (!actor.visible) return;

  const dx = targetX - actor.x;
  const dy = targetY - actor.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 2) {
    actor.x += dx * 0.06;
    actor.y += dy * 0.06;
    if (Math.abs(dx) > Math.abs(dy)) actor.setFacing(dx < 0 ? 'left' : 'right');
    else if (Math.abs(dy) > 1) actor.setFacing(dy < 0 ? 'up' : 'down');
  }

  actor.setDepth(depthForY(actor.y, depthBase));
  actor.setMoving(dist > 4);
  actor.syncShadow();
}
