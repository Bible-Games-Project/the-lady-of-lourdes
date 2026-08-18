import Phaser from 'phaser';
import { DEPTH } from '../core/constants';
import { textureKeyFor } from '../pixelart/characters';
import { applyWalkBob, updateFacingTexture, type Facing } from './spriteFacing';
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

  constructor(scene: Phaser.Scene, x: number, y: number, touch: TouchControls | null = null) {
    super(scene, x, y, textureKeyFor('bernadette', 'down'));
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setCollideWorldBounds(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(10, 6);
    body.setOffset(3, 18);

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

  update(time: number): void {
    this.setDepth(depthForY(this.y, DEPTH.ACTORS));
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.locked) {
      body.setVelocity(0, 0);
      applyWalkBob(this, false, time);
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
      this.facing = updateFacingTexture(this, 'bernadette', vx, vy, this.facing);
    } else {
      body.setVelocity(0, 0);
    }
    applyWalkBob(this, moving, time);
  }
}
