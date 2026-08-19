import type { NpcActor } from './NpcActor';
import { depthForY } from './utils';

export interface Point {
  x: number;
  y: number;
}

/**
 * Drives an NPC that leads the player toward a scripted destination, one waypoint at a time,
 * instead of trailing behind them. Each frame it checks its distance to the player: if the
 * player falls behind maxDistance it stops and waits, and only resumes once the player has
 * caught up within resumeDistance. It stops for good on reaching its final waypoint.
 */
export class LeaderNpc {
  private waypoints: Point[];
  private index = 0;
  private waiting = false;
  private arrived = false;

  constructor(
    private actor: NpcActor,
    waypoints: Point[],
    private speed: number,
    private maxDistance: number,
    private resumeDistance: number,
  ) {
    this.waypoints = waypoints;
  }

  isWaiting(): boolean {
    return this.waiting;
  }

  hasArrived(): boolean {
    return this.arrived;
  }

  update(player: Point, deltaMs: number, depthBase: number): void {
    if (this.arrived) return;

    const distToPlayer = Math.hypot(player.x - this.actor.x, player.y - this.actor.y);
    if (this.waiting) {
      if (distToPlayer <= this.resumeDistance) this.waiting = false;
    } else if (distToPlayer > this.maxDistance) {
      this.waiting = true;
    }

    if (this.waiting) {
      this.actor.setMoving(false);
      this.actor.syncShadow();
      return;
    }

    const target = this.waypoints[this.index];
    const dx = target.x - this.actor.x;
    const dy = target.y - this.actor.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 3) {
      this.index++;
      if (this.index >= this.waypoints.length) {
        this.arrived = true;
        this.actor.setMoving(false);
        this.actor.setDepth(depthForY(this.actor.y, depthBase));
        this.actor.syncShadow();
        return;
      }
    }

    const step = this.speed * (deltaMs / 1000);
    const nx = dist > 0 ? dx / dist : 0;
    const ny = dist > 0 ? dy / dist : 0;
    this.actor.x += nx * step;
    this.actor.y += ny * step;

    if (Math.abs(nx) > Math.abs(ny)) this.actor.setFacing(nx < 0 ? 'left' : 'right');
    else if (Math.abs(ny) > 0.01) this.actor.setFacing(ny < 0 ? 'up' : 'down');

    this.actor.setMoving(true);
    this.actor.setDepth(depthForY(this.actor.y, depthBase));
    this.actor.syncShadow();
  }
}
