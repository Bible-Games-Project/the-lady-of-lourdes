import Phaser from 'phaser';
import { DEPTH } from '../core/constants';
import { SHADOW_KEY, textureKeyFor } from '../pixelart/characters';
import { updateFacingAnimation, type Facing } from './spriteFacing';
import { depthForY } from './utils';
import type { TouchControls } from './TouchControls';

const SPEED = 70;

export class Player extends Phaser.Physics.Arcade.Sprite {
  private facing: Facing = 'down';
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW: Phaser.Input.Keyboard.Key;
  private keyA: Phaser.Input.Keyboard.Key;
  private keyS: Phaser.Input.Keyboard.Key;
  private keyD: Phaser.Input.Keyboard.Key;
  private touch: TouchControls | null;
  private locked = false;
  private shadow: Phaser.GameObjects.Image;
  private breathTween: Phaser.Tweens.Tween | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, touch: TouchControls | null = null) {
    super(scene, x, y, textureKeyFor('bernadette', 'down'));
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setCollideWorldBounds(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 7);
    body.setOffset(5, 20);

    this.shadow = scene.add.image(x, y - 1, SHADOW_KEY);
    this.shadow.setOrigin(0.5, 0.5);

    const keyboard = scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.keyW = keyboard.addKey('W');
    this.keyA = keyboard.addKey('A');
    this.keyS = keyboard.addKey('S');
    this.keyD = keyboard.addKey('D');
    this.touch = touch;
  }

  setLocked(locked: boolean): void {
    this.locked = locked;
    if (locked) (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  isLocked(): boolean {
    return this.locked;
  }

  update(_time: number): void {
    const depth = depthForY(this.y, DEPTH.ACTORS);
    this.setDepth(depth);
    this.shadow.setPosition(this.x, this.y - 1);
    this.shadow.setDepth(depth - 0.0005);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.locked) {
      body.setVelocity(0, 0);
      this.updateBreathing(false);
      return;
    }

    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown || this.keyA.isDown) vx = -1;
    else if (this.cursors.right.isDown || this.keyD.isDown) vx = 1;
    if (this.cursors.up.isDown || this.keyW.isDown) vy = -1;
    else if (this.cursors.down.isDown || this.keyS.isDown) vy = 1;

    if (vx === 0 && vy === 0 && this.touch) {
      vx = this.touch.vector.x;
      vy = this.touch.vector.y;
    }

    const moving = vx !== 0 || vy !== 0;
    if (moving) {
      const len = Math.hypot(vx, vy) || 1;
      body.setVelocity((vx / len) * SPEED, (vy / len) * SPEED);
      this.facing = updateFacingAnimation(this, 'bernadette', vx, vy, this.facing, true);
    } else {
      body.setVelocity(0, 0);
      updateFacingAnimation(this, 'bernadette', 0, 0, this.facing, false);
    }
    this.updateBreathing(!moving);
  }

  private updateBreathing(idle: boolean): void {
    if (idle) {
      if (this.breathTween) return;
      this.setScale(1, 1);
      this.breathTween = this.scene.tweens.add({
        targets: this,
        scaleY: 1.03,
        duration: 1500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut',
      });
    } else if (this.breathTween) {
      this.breathTween.stop();
      this.breathTween = null;
      this.setScale(1, 1);
    }
  }

  destroy(fromScene?: boolean): void {
    this.breathTween?.stop();
    this.shadow.destroy();
    super.destroy(fromScene);
  }
}
