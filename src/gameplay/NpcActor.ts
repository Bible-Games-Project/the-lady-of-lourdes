import Phaser from 'phaser';
import { DEPTH } from '../core/constants';
import type { CharacterId } from '../pixelart/characters';
import { SHADOW_KEY, textureKeyFor, walkAnimKeyFor } from '../pixelart/characters';
import type { Facing } from './spriteFacing';
import { depthForY } from './utils';

/**
 * Feet-box proportions every `NpcActor` derives its physical collider from, as fractions of the
 * character's own frame height — mirrors `Player.ts`'s own hand-tuned Bernadette collider
 * (`body.setSize(7, 11); body.setOffset(4, 30)` on her 42px-tall frame: 7/42, 11/42, 30/42) so
 * every character in the game — Bernadette included — collides through a small box near the
 * feet/legs only, never the head/torso, letting characters visually overlap vertically the way a
 * top-down game expects (see the "character collision" rule in AGENTS.md). Horizontal centering
 * uses `(this.width - bodyWidth) / 2` instead of Bernadette's own fixed `offsetX = 4`, since an
 * `NpcActor`'s frame *width* genuinely varies by facing (side views are narrower than front/back)
 * and centering per-instance at construction time is more correct than one fixed offset — though
 * per `Player.ts`'s own comment, this precision has never actually mattered for gameplay feel.
 */
const FEET_WIDTH_FRAC = 7 / 42;
const FEET_HEIGHT_FRAC = 11 / 42;
const FEET_OFFSET_Y_FRAC = 30 / 42;

/** A simple scripted actor: stands, faces a direction, or walks to a point for a cutscene beat. */
export class NpcActor extends Phaser.Physics.Arcade.Sprite {
  readonly id: CharacterId;
  private facing: Facing;
  private moving = false;
  private shadow: Phaser.GameObjects.Image;
  private shadowScale: number;
  private breathingEnabled: boolean;
  private idle = true;
  private depthBase: number;
  private autoDepthEnabled: boolean;

  /**
   * `shadowScale` lets a real-art character's shadow track its own height instead of always
   * rendering at the shared `SHADOW_KEY` texture's native size. That texture was sized for the
   * ~28px-tall procedural character grid (`personTemplate.ts`) every other `NpcActor` still uses;
   * a real-art character taller or shorter than that (the mother at 42px, the sister at ~36px —
   * see `assets/npc/motherSprite.ts`/`sisterSprite.ts`) needs the shadow scaled by the same ratio
   * to keep the same size-to-character relationship ("size logic") the baseline characters have,
   * rather than a shadow that reads as too small (or too large) for its owner. Defaults to `1`
   * (no scaling) so every existing caller (mother/sister/friend/villagers at their original
   * procedural size) is completely unaffected.
   *
   * `breathingEnabled` opts an individual actor into the same idle sine-wave `scaleY` breathing
   * `Player.ts` uses for Bernadette (see `updateBreathing()` there) — small amplitude, continuous
   * `Math.sin(time)` rather than a yoyo tween (no loop-boundary jerk), off whenever `moving` is
   * true. Defaults to `false` so every existing `NpcActor` (mother, sister, villagers) keeps its
   * exact prior behavior; only Jeanne (`friend`) opts in, per an explicit "same breathing pattern
   * as Bernadette" ask for her specifically. Driven from `preUpdate()` below rather than needing
   * the owning scene to call an `update()` method every frame, since nothing else currently does.
   *
   * `depthBase` is the Y-sort base every `NpcActor` now recomputes its own depth from, every
   * frame, in `preUpdate()` below — see that method's own comment for why this needed to become
   * automatic rather than left to whichever mover (`WanderNpc`/`LeaderNpc`/`Follower`) happens to
   * be driving a given instance. Defaults to `DEPTH.ACTORS`, the same base `Player.ts` already
   * uses for its own per-frame `depthForY()` call, so a `NpcActor` and the player sort correctly
   * against each other without either side needing to know about the other.
   *
   * `autoDepthEnabled` is the escape hatch from that same automatic Y-sorting, for the one
   * character in this game that must *not* spatially sort against the player: `OverworldScene.ts`'s
   * `lady` (the apparition) is deliberately given a fixed depth just above `DEPTH.ACTORS` so she
   * always renders in front of Bernadette regardless of either one's position — she's a vision, not
   * a physically-present character standing "behind" or "in front of" anyone. Defaults to `true` so
   * every other `NpcActor` gets the normal dynamic behavior; `OverworldScene.ts` passes `false` for
   * her alone and manages her depth itself, exactly as before this system existed.
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    id: CharacterId,
    facing: Facing = 'down',
    shadowScale = 1,
    breathingEnabled = false,
    depthBase: number = DEPTH.ACTORS,
    autoDepthEnabled = true,
  ) {
    const textureFacing = facing === 'left' || facing === 'right' ? 'side' : facing;
    super(scene, x, y, textureKeyFor(id, textureFacing, null));
    this.id = id;
    this.facing = facing;
    this.setFlipX(facing === 'left');
    this.setOrigin(0.5, 1);
    scene.add.existing(this);
    scene.physics.add.existing(this);

    // Feet-only collider (see FEET_*_FRAC above) sized from this instance's own initial frame —
    // every real-art character is pre-sized to a stable height across all its own facings (the
    // whole point of the "crop each panel to the same final height" pipeline every sprite in this
    // game already follows), so computing this once here, rather than re-deriving it on every
    // `setTexture()` facing swap, is safe.
    const body = this.body as Phaser.Physics.Arcade.Body;
    const feetWidth = Math.max(1, Math.round(this.height * FEET_WIDTH_FRAC));
    const feetHeight = Math.max(1, Math.round(this.height * FEET_HEIGHT_FRAC));
    body.setSize(feetWidth, feetHeight);
    body.setOffset(Math.round((this.width - feetWidth) / 2), Math.round(this.height * FEET_OFFSET_Y_FRAC));
    // Immovable: the player (and any other NpcActor) colliding with this one gets stopped/pushed
    // back, but this actor itself never gets shoved aside — walking into an NPC should feel like
    // meeting something solid, not gently nudging it out of the way. (Two immovable NpcActors
    // colliding with each other simply don't separate on overlap, but in practice NPCs in this
    // game keep to their own separate wander zones, so that almost never comes up.)
    body.setImmovable(true);

    this.shadowScale = shadowScale;
    this.breathingEnabled = breathingEnabled;
    this.depthBase = depthBase;
    this.autoDepthEnabled = autoDepthEnabled;
    this.shadow = scene.add.image(x, y - 1, SHADOW_KEY);
    this.shadow.setOrigin(0.5, 0.5);
    if (shadowScale !== 1) this.shadow.setScale(shadowScale);
  }

  /** Phaser calls this automatically every frame for any GameObject that overrides it — no wiring
   * needed from the owning scene's own `update()`. Must chain to `super.preUpdate()` or the
   * sprite's own walk-cycle animation frames (and the physics body's position sync) stop advancing.
   *
   * Y-sort depth used to be the responsibility of whichever mover was driving a given instance —
   * `WanderNpc.update()`/`LeaderNpc.update()`/`Follower.updateFollowerPosition()` each called
   * `actor.setDepth(depthForY(actor.y, ...))` themselves after moving it. That left a gap: an
   * `NpcActor` with no mover at all (a scene just standing one somewhere, e.g. `CachotScene`'s
   * mother) never got a *dynamic* depth — `CachotScene.ts` set hers to one fixed `DEPTH.ACTORS`
   * value and never touched it again, so she could never correctly sort against a player who
   * walked below her. Recomputing depth here instead, unconditionally, every frame, for every
   * `NpcActor` regardless of what (if anything) is moving it, closes that gap generically — the
   * "general character-system rule" the maintainer asked for — without needing every current and
   * future mover to remember to do it themselves. Those movers' own `setDepth()` calls are now
   * redundant but harmless (same value, computed twice); left in place rather than churning three
   * other files to delete them.
   */
  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    if (this.autoDepthEnabled) this.setDepth(depthForY(this.y, this.depthBase));

    if (!this.breathingEnabled) return;

    if (this.moving) {
      if (!this.idle) return;
      this.idle = false;
      this.setScale(1, 1);
      this.shadow.setScale(this.shadowScale, this.shadowScale);
      this.shadow.setAlpha(1);
      return;
    }
    this.idle = true;
    const periodMs = 4200;
    const amplitude = 0.015;
    const wave = Math.sin((time / periodMs) * Math.PI * 2);
    this.setScale(1, 1 + wave * amplitude);
    // Shadow reacts to the same breath, but only in width/opacity, same as Player.ts's — it must
    // stay flat on the ground, never lifting or scaling vertically with her.
    this.shadow.setScale(this.shadowScale * (1 + wave * 0.02), this.shadowScale);
    this.shadow.setAlpha(0.92 - wave * 0.08);
  }

  private currentTextureFacing(): 'down' | 'up' | 'side' {
    return this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing;
  }

  private applyAnimState(): void {
    this.setFlipX(this.facing === 'left');
    if (this.moving) {
      const key = walkAnimKeyFor(this.id, this.currentTextureFacing());
      if (this.anims.currentAnim?.key !== key || !this.anims.isPlaying) this.play(key, true);
    } else {
      this.anims.stop();
      this.setTexture(textureKeyFor(this.id, this.currentTextureFacing(), null));
    }
  }

  setFacing(facing: Facing): void {
    this.facing = facing;
    this.applyAnimState();
  }

  setMoving(moving: boolean): void {
    if (this.moving === moving) return;
    this.moving = moving;
    this.applyAnimState();
  }

  getFacing(): Facing {
    return this.facing;
  }

  /** Call after moving the actor (tween/follow logic) to keep the shadow attached to its feet. */
  syncShadow(): void {
    this.shadow.setPosition(this.x, this.y - 1);
    this.shadow.setDepth(this.depth - 0.0005);
  }

  walkTo(x: number, y: number, duration: number): Promise<void> {
    const dx = x - this.x;
    const dy = y - this.y;
    if (Math.abs(dx) > Math.abs(dy)) this.setFacing(dx < 0 ? 'left' : 'right');
    else if (dy !== 0) this.setFacing(dy < 0 ? 'up' : 'down');
    this.setMoving(true);

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        x,
        y,
        duration,
        onUpdate: () => this.syncShadow(),
        onComplete: () => {
          this.setMoving(false);
          this.syncShadow();
          resolve();
        },
      });
    });
  }

  override setVisible(value: boolean): this {
    super.setVisible(value);
    this.shadow?.setVisible(value);
    return this;
  }

  override destroy(fromScene?: boolean): void {
    this.shadow.destroy();
    super.destroy(fromScene);
  }
}
