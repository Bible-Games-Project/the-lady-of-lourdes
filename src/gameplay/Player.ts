import Phaser from 'phaser';
import { DEPTH } from '../core/constants';
import { BERNADETTE_SHADOW_KEY, textureKeyFor } from '../pixelart/characters';
import { BERNADETTE_FRAME_HEIGHT } from '../assets/player/bernadetteSprite';
import { updateFacingAnimation, type Facing } from './spriteFacing';
import { depthForY } from './utils';
import type { TouchControls } from './TouchControls';

const SPEED = 70;

// DIAGNOSTIC ONLY -- temporarily forces the idle pose/texture even while walking, so NONE of the
// generated walk frames (skirt shear, boot lift, hand/rosary swing) ever get displayed, to isolate
// whether the reported shake comes from that artwork/deformation or from something else entirely
// (movement coordinates, rendering, scaling, camera). Does not touch spriteFacing.ts (shared with
// every NpcActor), does not delete any animation code or assets, and does not change velocity/
// movement -- she still physically walks at the same speed, she just always *displays* as the
// stationary pose for her current facing while doing so. Flip back to `false` to restore the real
// walk animation once the diagnostic is done.
const DIAGNOSTIC_DISABLE_WALK_ANIMATION = true;

// DIAGNOSTIC ONLY -- skips updateBreathing() entirely (idle AND moving), so nothing ever touches
// scaleX/scaleY after construction. Added specifically to test the hypothesis "breathing is still
// running while walking" directly rather than assuming the existing `updateBreathing(!moving,
// time)` early-return (see that method below) already prevents it. Flip back to `false` to restore
// breathing once the diagnostic is done.
const DIAGNOSTIC_DISABLE_BREATHING = true;

// Feet-box proportions, as fractions of her own frame height -- same values `NpcActor.ts`'s own
// FEET_*_FRAC constants were originally derived from (this file's old fixed `body.setSize(7, 11);
// body.setOffset(4, 30)` on her old 42px-tall frame: 7/42, 11/42, 30/42). Kept as fractions
// (rather than the old fixed pixel numbers) now that her frame's native size is no longer the
// same as her display size -- see `bernadetteSprite.ts`'s own doc comment on `BERNADETTE_FRAME_HEIGHT`.
const FEET_WIDTH_FRAC = 7 / 42;
const FEET_HEIGHT_FRAC = 11 / 42;
const FEET_OFFSET_Y_FRAC = 30 / 42;

// Her shadow (`BERNADETTE_SHADOW_KEY`) is a hand-authored texture sized 1:1 for her old 42px-tall
// frame. Scale it by the same ratio her own display height grew by, so it keeps the same
// size-to-character relationship instead of reading as too small underneath her now-larger sprite
// -- same reasoning `OverworldScene.ts`'s SISTER_SHADOW_SCALE/etc. already use for every other
// real-art character's shadow.
const SHADOW_SCALE = BERNADETTE_FRAME_HEIGHT / 42;

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
  // Her resting scale, derived from `BERNADETTE_FRAME_HEIGHT` vs. whatever the source texture's
  // own native resolution actually is -- see `bernadetteSprite.ts`'s own doc comment. Breathing
  // (`updateBreathing()` below) must scale relative to *this*, never hardcode `1`, or it silently
  // stomps her display size back to native-texture size every idle frame (the same bug class
  // `NpcActor.ts`'s own `baseScale` field exists to avoid).
  private baseScale: number;

  constructor(scene: Phaser.Scene, x: number, y: number, touch: TouchControls | null = null) {
    super(scene, x, y, textureKeyFor('bernadette', 'down'));
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setCollideWorldBounds(true);

    // `this.height` here is the texture's native (unscaled) pixel height -- scaling her down to
    // BERNADETTE_FRAME_HEIGHT is what actually preserves her source art's full resolution instead
    // of relying on a pre-shrunk file; see that constant's own doc comment for the full history.
    this.baseScale = BERNADETTE_FRAME_HEIGHT / this.height;
    this.setScale(this.baseScale);

    const body = this.body as Phaser.Physics.Arcade.Body;
    // Feet-only collider (see FEET_*_FRAC above), sized from her own *native* frame dimensions --
    // `body.setSize()` bakes in the GameObject's current scale (already set above) at call time,
    // so this comes out proportional to her actual on-screen size automatically. One fixed box
    // used for all 3 facings, near her feet, same as before this change -- collision precision
    // here has never needed to track her visual width exactly.
    const feetWidth = Math.max(1, Math.round(this.height * FEET_WIDTH_FRAC));
    const feetHeight = Math.max(1, Math.round(this.height * FEET_HEIGHT_FRAC));
    body.setSize(feetWidth, feetHeight);
    body.setOffset(Math.round((this.width - feetWidth) / 2), Math.round(this.height * FEET_OFFSET_Y_FRAC));
    // Forces the body's cached world-space size to sync with the scale set above immediately,
    // rather than leaving it to the body's own next `preUpdate()` -- cheap, and removes any doubt
    // for a body left enabled (unlike the sister's, which is permanently disabled and so *needs*
    // this call; see `NpcActor.ts`'s own doc comment on `targetHeight`).
    body.updateFromGameObject();

    this.shadow = scene.add.image(x, y - 1, BERNADETTE_SHADOW_KEY);
    this.shadow.setOrigin(0.5, 0.5);
    this.shadow.setScale(SHADOW_SCALE);

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
      // Force the idle pose/texture and stop any walk-cycle animation that was still playing at
      // the moment she got locked (e.g. mid-stride when the apparition sequence takes over) --
      // without this, `setVelocity(0, 0)` above stops her *moving* but Phaser's own animation
      // system keeps cycling whatever walk_bernadette_* animation was already playing, since
      // nothing else here ever tells it to stop. Every frame while locked is fine (cheap,
      // idempotent) rather than only once, matching how the unlocked branch below re-evaluates
      // moving/not-moving every frame too.
      updateFacingAnimation(this, 'bernadette', 0, 0, this.facing, false, true);
      if (!DIAGNOSTIC_DISABLE_BREATHING) this.updateBreathing(true, time);
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
      this.facing = updateFacingAnimation(this, 'bernadette', vx, vy, this.facing, !DIAGNOSTIC_DISABLE_WALK_ANIMATION, true);
    } else {
      body.setVelocity(0, 0);
      updateFacingAnimation(this, 'bernadette', 0, 0, this.facing, false, true);
    }
    if (!DIAGNOSTIC_DISABLE_BREATHING) this.updateBreathing(!moving, time);
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
      this.setScale(this.baseScale, this.baseScale);
      this.shadow.setScale(SHADOW_SCALE, SHADOW_SCALE);
      this.shadow.setAlpha(1);
      return;
    }
    this.idle = true;
    const periodMs = 4200;
    const amplitude = 0.015;
    const wave = Math.sin((time / periodMs) * Math.PI * 2);
    this.setScale(this.baseScale, this.baseScale * (1 + wave * amplitude));
    // The shadow reacts to the same breath, but only in width/opacity — it must stay flat on the
    // ground, never lifting or scaling vertically with her.
    this.shadow.setScale(SHADOW_SCALE * (1 + wave * 0.02), SHADOW_SCALE);
    this.shadow.setAlpha(0.92 - wave * 0.08);
  }

  destroy(fromScene?: boolean): void {
    this.shadow.destroy();
    super.destroy(fromScene);
  }
}
