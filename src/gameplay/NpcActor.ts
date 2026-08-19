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

  constructor(scene: Phaser.Scene, x: number, y: number, id: CharacterId, facing: Facing = 'down') {
    const textureFacing = facing === 'left' || facing === 'right' ? 'side' : facing;
    super(scene, x, y, textureKeyFor(id, textureFacing, null));
    this.id = id;
    this.facing = facing;
    this.setFlipX(facing === 'left');
    this.setOrigin(0.5, 1);
    scene.add.existing(this);

    this.shadow = scene.add.image(x, y - 1, SHADOW_KEY);
    this.shadow.setOrigin(0.5, 0.5);
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
