import Phaser from 'phaser';
import type { CharacterId } from '../pixelart/characters';
import { textureKeyFor } from '../pixelart/characters';
import { applyWalkBob, type Facing } from './spriteFacing';

/** A simple scripted actor: stands, faces a direction, or walks to a point for a cutscene beat. */
export class NpcActor extends Phaser.GameObjects.Sprite {
  readonly id: CharacterId;
  private facing: Facing;

  constructor(scene: Phaser.Scene, x: number, y: number, id: CharacterId, facing: Facing = 'down') {
    const textureFacing = facing === 'left' || facing === 'right' ? 'side' : facing;
    super(scene, x, y, textureKeyFor(id, textureFacing));
    this.id = id;
    this.facing = facing;
    this.setFlipX(facing === 'left');
    this.setOrigin(0.5, 1);
    scene.add.existing(this);
  }

  setFacing(facing: Facing): void {
    this.facing = facing;
    const textureFacing = facing === 'left' || facing === 'right' ? 'side' : facing;
    this.setTexture(textureKeyFor(this.id, textureFacing));
    this.setFlipX(facing === 'left');
  }

  getFacing(): Facing {
    return this.facing;
  }

  walkTo(x: number, y: number, duration: number): Promise<void> {
    const dx = x - this.x;
    const dy = y - this.y;
    if (Math.abs(dx) > Math.abs(dy)) this.setFacing(dx < 0 ? 'left' : 'right');
    else if (dy !== 0) this.setFacing(dy < 0 ? 'up' : 'down');

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        x,
        y,
        duration,
        onUpdate: () => applyWalkBob(this, true, this.scene.time.now),
        onComplete: () => {
          this.setScale(1, 1);
          resolve();
        },
      });
    });
  }
}
