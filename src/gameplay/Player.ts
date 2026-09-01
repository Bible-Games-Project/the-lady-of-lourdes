import Phaser from 'phaser';
import { DEPTH } from '../core/constants';
import { BERNADETTE_SHADOW_KEY, textureKeyFor } from '../pixelart/characters';
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
  private idle = true;

  constructor(scene: Phaser.Scene, x: number, y: number, touch: TouchControls | null = null) {
    super(scene, x, y, textureKeyFor('bernadette', 'down'));
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setCollideWorldBounds(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    // Sized/offset for the real-art frame (26x42 — see assets/player/bernadetteSprite.ts, sized
    // up from an earlier 21x34 pass so the walk cycle's feet have enough pixels to read as two
    // distinct feet), scaled proportionally from the original 20x28 procedural frame's (10,7)/(5,20).
    body.setSize(12, 11);
    body.setOffset(6, 30);

    this.shadow = scene.add.image(x, y - 1, BERNADETTE_SHADOW_KEY);
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

  update(time: number): void {
    const depth = depthForY(this.y, DEPTH.ACTORS);
    this.setDepth(depth);
    this.shadow.setDepth(depth - 0.0005);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.locked) {
      body.setVelocity(0, 0);
      this.updateBreathing(true, time);
      this.syncShadow();
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
    this.updateBreathing(!moving, time);
    this.syncShadow();
  }

  /** The shadow tracks her x/y (ground position) only — never her breathing scale, which must not lift it off the ground. */
  private syncShadow(): void {
    this.shadow.setPosition(this.x, this.y - 1);
  }

  /**
   * Driven directly by `Math.sin(time)` rather than a Phaser `yoyo: true, repeat: -1` tween — a
   * plain continuous sine of elapsed time has no loop boundary to snap at by construction
   * (`sin(0) === sin(2π)`, derivative too), unlike a yoyo tween, which had a visible jerk on
   * every repeat when this same technique was tried on the Home screen (see AGENTS.md). `time` is
   * Phaser's own running elapsed-ms clock, so no extra accumulator is needed. Very small amplitude
   * (1.5%) and a slow ~4.2s cycle — "almost imperceptible", per the maintainer.
   */
  private updateBreathing(idle: boolean, time: number): void {
    if (!idle) {
      if (!this.idle) return;
      this.idle = false;
      this.setScale(1, 1);
      this.shadow.setScale(1, 1);
      this.shadow.setAlpha(1);
      return;
    }
    this.idle = true;
    const periodMs = 4200;
    const amplitude = 0.015;
    const wave = Math.sin((time / periodMs) * Math.PI * 2);
    this.setScale(1, 1 + wave * amplitude);
    // The shadow reacts to the same breath, but only in width/opacity — it must stay flat on the
    // ground, never lifting or scaling vertically with her.
    this.shadow.setScale(1 + wave * 0.02, 1);
    this.shadow.setAlpha(0.92 - wave * 0.08);
  }

  destroy(fromScene?: boolean): void {
    this.shadow.destroy();
    super.destroy(fromScene);
  }
}
