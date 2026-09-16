import Phaser from 'phaser';
import type { CharacterId } from '../pixelart/characters';
import { SHADOW_KEY, textureKeyFor, walkAnimKeyFor } from '../pixelart/characters';
import type { Facing } from './spriteFacing';

/** A simple scripted actor: stands, faces a direction, or walks to a point for a cutscene beat. */
export class NpcActor extends Phaser.GameObjects.Sprite {
  readonly id: CharacterId;
  private facing: Facing;
  private moving = false;
  private shadow: Phaser.GameObjects.Image;
  private shadowScale: number;
  private breathingEnabled: boolean;
  private idle = true;

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
   */
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    id: CharacterId,
    facing: Facing = 'down',
    shadowScale = 1,
    breathingEnabled = false,
  ) {
    const textureFacing = facing === 'left' || facing === 'right' ? 'side' : facing;
    super(scene, x, y, textureKeyFor(id, textureFacing, null));
    this.id = id;
    this.facing = facing;
    this.setFlipX(facing === 'left');
    this.setOrigin(0.5, 1);
    scene.add.existing(this);

    this.shadowScale = shadowScale;
    this.breathingEnabled = breathingEnabled;
    this.shadow = scene.add.image(x, y - 1, SHADOW_KEY);
    this.shadow.setOrigin(0.5, 0.5);
    if (shadowScale !== 1) this.shadow.setScale(shadowScale);
  }

  /** Phaser calls this automatically every frame for any GameObject that overrides it — no wiring
   * needed from the owning scene's own `update()`. Must chain to `super.preUpdate()` or the sprite's
   * own walk-cycle animation frames stop advancing. */
  override preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
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
