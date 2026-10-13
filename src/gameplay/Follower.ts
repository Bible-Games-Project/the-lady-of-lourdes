import type { NpcActor } from './NpcActor';
import type { Facing } from './spriteFacing';
import { depthForY } from './utils';

export interface TrailSample {
  x: number;
  y: number;
  facing: Facing;
  moving: boolean;
}

/**
 * Rebuilt from scratch (see git history for two earlier attempts at this file -- a plain per-call
 * lerp, then a time-compensated one -- each chasing the same reported shake with progressively
 * more careful *approximations* of "follow the leader," neither of which fully eliminated it).
 *
 * This version records the leader's own real position/facing/moving state once per rendered
 * frame, and a follower is simply placed at whatever state was recorded exactly `lagFrames` frames
 * ago -- a direct historical lookup, not an approximation of one.
 *
 * **Why frame-count, not elapsed time (and why a first version of this using elapsed-time lookup
 * with linear interpolation still showed a smaller residual jitter, measured directly rather than
 * assumed fixed):** measured directly (logging the leader's own raw per-frame position delta next
 * to the real elapsed time between those frames), this engine/environment's Arcade Physics body
 * advances by *exactly* one fixed physics tick's worth of distance on every single rendered frame,
 * regardless of how much real time that frame actually spanned (observed: a constant 1.167px
 * step every frame, whether the frame's own real elapsed time was 33ms or 67ms) -- the physics
 * world defers/catches-up ticks internally rather than always stepping once per elapsed-tick. That
 * makes the leader's own recorded (time, position) pairs a classic *tick-quantized* signal: each
 * frame's position step is a fixed size, but the real-time spacing between frames is irregular.
 * Linearly interpolating a tick-quantized signal against *continuous elapsed time* doesn't just
 * replay it -- it redistributes it, smoothing the irregular real-time spacing back toward a
 * continuous curve, which locally over- or under-shoots the original per-frame step size (measured:
 * a follower using that approach showed single-frame steps as small as 0 and as large as 1.75x the
 * leader's own actual per-frame step, inconsistently). A frame-count lag sidesteps this completely:
 * there is no interpolation to redistribute anything, because the lookup is a direct index into
 * history -- "exactly what frame N-lag looked like" -- which reproduces the leader's own per-frame
 * step pattern bit-for-bit, just offset by a fixed number of frames instead of a fixed duration.
 */
export class PositionTrail {
  private samples: TrailSample[] = [];
  private readonly maxSamples: number;

  constructor(maxSamples: number) {
    this.maxSamples = maxSamples;
  }

  record(x: number, y: number, facing: Facing, moving: boolean): void {
    this.samples.push({ x, y, facing, moving });
    if (this.samples.length > this.maxSamples) this.samples.shift();
  }

  /** The sample from `lagFrames` frames ago, or the oldest available sample if fewer than that
   * many frames have been recorded yet (e.g. right at scene start) -- never `null` once at least
   * one frame has been recorded. */
  sampleLagged(lagFrames: number): TrailSample | null {
    const s = this.samples;
    if (s.length === 0) return null;
    const idx = Math.max(0, s.length - 1 - lagFrames);
    return s[idx];
  }
}

/**
 * Places a follower actor directly on the leader's own recorded path, `lagFrames` frames behind,
 * offset by a fixed visual (`offsetX`, `offsetY`) so she doesn't render exactly on top of the
 * leader's own footprints. No easing, no distance threshold, no per-frame "is this close enough"
 * branching -- every frame she is simply wherever the trail says the leader was `lagFrames` frames
 * ago, which by construction reproduces the leader's own already-proven-stable per-frame motion
 * exactly, including correctly-normalized diagonals (inherited for free, since it's literally a
 * copy of positions the leader's own already-normalized movement produced).
 */
export function updateFollowerFromTrail(
  actor: NpcActor,
  trail: PositionTrail,
  lagFrames: number,
  offsetX: number,
  offsetY: number,
  depthBase: number,
): void {
  if (!actor.visible) return;
  const sample = trail.sampleLagged(lagFrames);
  if (!sample) return;

  actor.x = sample.x + offsetX;
  actor.y = sample.y + offsetY;
  actor.setFacing(sample.facing);
  actor.setMoving(sample.moving);
  actor.setDepth(depthForY(actor.y, depthBase));
  actor.syncShadow();
}
