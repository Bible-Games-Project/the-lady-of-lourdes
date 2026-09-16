import Phaser from 'phaser';
import type { NpcActor } from './NpcActor';
import { depthForY } from './utils';
import type { Point } from './LeaderNpc';

/**
 * Drives an NPC ambling around a bounded rectangle indefinitely -- picking a random point inside
 * `bounds`, walking to it, pausing (idle pose) for a random beat, then picking another. Used for
 * the sister and Jeanne "searching for firewood" near the far riverbank once they've crossed
 * during Mission 1, replacing the old `setVisible(false)` disappearance: they now stay visible and
 * keep pottering around until the scene ends, rather than standing frozen in one spot (which would
 * read as a stand-in, not a character absorbed in a task) or patrolling a fixed route (too
 * mechanical for "searching").
 *
 * Same manual per-frame `actor.x/y +=` stepping as `LeaderNpc`/`Follower.ts` (not a Phaser tween)
 * so `setFacing()`/`setMoving()`/`syncShadow()` stay in lockstep with actual position every frame,
 * and the same dominant-axis facing rule those two already use (`Math.abs(dx) > Math.abs(dy)` picks
 * horizontal, otherwise vertical) for a consistent movement feel across every NPC-follows-a-point
 * system in this file.
 */
export class WanderNpc {
  private target: Point;
  private walking = false;
  private stateTimer = 0;
  private stateDuration = 0;

  constructor(
    private actor: NpcActor,
    private bounds: Phaser.Geom.Rectangle,
    private speed: number,
  ) {
    this.target = { x: actor.x, y: actor.y };
    this.startIdle();
  }

  private startIdle(): void {
    this.walking = false;
    this.stateTimer = 0;
    this.stateDuration = Phaser.Math.Between(1200, 3200);
    this.actor.setMoving(false);
  }

  private startWalking(): void {
    const point = Phaser.Geom.Rectangle.Random(this.bounds, new Phaser.Geom.Point());
    this.target = { x: point.x, y: point.y };
    this.walking = true;
    this.stateTimer = 0;
    // A generous cap, not a real deadline -- normally she arrives (dist < 3) well before this;
    // it only guards against never quite reaching the target (e.g. a target right at her own
    // position rounding to a near-zero step) so she can't get stuck "walking" forever in place.
    this.stateDuration = 6000;
  }

  update(deltaMs: number, depthBase: number): void {
    this.stateTimer += deltaMs;

    if (!this.walking) {
      if (this.stateTimer >= this.stateDuration) this.startWalking();
      this.actor.syncShadow();
      return;
    }

    const dx = this.target.x - this.actor.x;
    const dy = this.target.y - this.actor.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 3 || this.stateTimer >= this.stateDuration) {
      this.startIdle();
      this.actor.syncShadow();
      return;
    }

    const step = this.speed * (deltaMs / 1000);
    const nx = dx / dist;
    const ny = dy / dist;
    this.actor.x += nx * step;
    this.actor.y += ny * step;

    if (Math.abs(nx) > Math.abs(ny)) this.actor.setFacing(nx < 0 ? 'left' : 'right');
    else if (Math.abs(ny) > 0.01) this.actor.setFacing(ny < 0 ? 'up' : 'down');

    this.actor.setMoving(true);
    this.actor.setDepth(depthForY(this.actor.y, depthBase));
    this.actor.syncShadow();
  }
}
