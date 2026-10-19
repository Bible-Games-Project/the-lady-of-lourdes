import Phaser from 'phaser';
import { DEPTH, PIXEL_SCALE } from '../core/constants';
import { BERNADETTE_SHADOW_KEY, textureKeyFor } from '../pixelart/characters';
import { BERNADETTE_FRAME_HEIGHT } from '../assets/player/bernadetteSprite';
import { updateFacingAnimation, type Facing } from './spriteFacing';
import { depthForY } from './utils';
import type { TouchControls } from './TouchControls';

const SPEED = 70;

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
// size-to-character relationship instead of reading as too small underneath her now-larger sprite.
const SHADOW_SCALE = BERNADETTE_FRAME_HEIGHT / 42;

/**
 * Bernadette's player avatar. Movement/rendering/camera were rebuilt from scratch in an earlier
 * round (see git history) after a persistent walking jitter was finally traced to
 * `OverworldScene.ts#updateCameraFollow()` reading a one-physics-tick-stale position -- nothing in
 * this file's architecture was ever the cause, and that architecture is unchanged here:
 *
 * - Movement: velocity set directly from input direction each frame, normalized so diagonal speed
 *   equals cardinal speed. No separate position bookkeeping -- `this.x`/`this.y` (via the physics
 *   body) is the one and only source of truth every other system (camera, depth sorting, shadow,
 *   collisions, scripted sequences) reads from. `update()`'s movement block below is untouched
 *   from the stable rebuild.
 * - Rendering: facing/texture/animation selection is delegated to the same shared
 *   `updateFacingAnimation()` every procedural NPC already uses (`spriteFacing.ts`) -- it only ever
 *   sets `texture`/`flipX`/the current animation frame, never `x`/`y`/`scale`, so reusing it here
 *   carries no risk to the position stability above. See `bernadetteSprite.ts` for what the walk
 *   animation it plays actually looks like (feet/hands only, no skirt deformation) and why.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  private facing: Facing = 'down';
  private moving = false;
  private cursors: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyW: Phaser.Input.Keyboard.Key;
  private keyA: Phaser.Input.Keyboard.Key;
  private keyS: Phaser.Input.Keyboard.Key;
  private keyD: Phaser.Input.Keyboard.Key;
  private touch: TouchControls | null;
  private locked = false;
  private shadow: Phaser.GameObjects.Image;
  private lastDiagonal: string | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, touch: TouchControls | null = null) {
    super(scene, x, y, textureKeyFor('bernadette', 'down'));
    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setOrigin(0.5, 1);
    this.setCollideWorldBounds(true);

    // `this.height` here is the texture's native (unscaled) pixel height -- scaling her down to
    // BERNADETTE_FRAME_HEIGHT is what actually preserves her source art's full resolution instead
    // of relying on a pre-shrunk file.
    const baseScale = BERNADETTE_FRAME_HEIGHT / this.height;
    this.setScale(baseScale);

    const body = this.body as Phaser.Physics.Arcade.Body;
    // Feet-only collider (see FEET_*_FRAC above), sized from her own *native* frame dimensions --
    // `body.setSize()` bakes in the GameObject's current scale (already set above) at call time,
    // so this comes out proportional to her actual on-screen size automatically. One fixed box
    // used for all facings -- collision precision here has never needed to track her visual width.
    const feetWidth = Math.max(1, Math.round(this.height * FEET_WIDTH_FRAC));
    const feetHeight = Math.max(1, Math.round(this.height * FEET_HEIGHT_FRAC));
    body.setSize(feetWidth, feetHeight);
    body.setOffset(Math.round((this.width - feetWidth) / 2), Math.round(this.height * FEET_OFFSET_Y_FRAC));
    body.updateFromGameObject();

    this.shadow = scene.add.image(x, y - 1, BERNADETTE_SHADOW_KEY);
    this.shadow.setOrigin(0.5, 0.5);
    this.shadow.setScale(SHADOW_SCALE);
    // Arcade only writes this frame's movement into x/y on POST_UPDATE (see
    // `OverworldScene.ts#updateCameraFollow()`), so syncing from `update()` alone left the shadow
    // one frame behind her feet while walking.
    scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.syncShadow, this);

    const keyboard = scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.keyW = keyboard.addKey('W');
    this.keyA = keyboard.addKey('A');
    this.keyS = keyboard.addKey('S');
    this.keyD = keyboard.addKey('D');
    this.touch = touch;

    updateFacingAnimation(this, 'bernadette', 0, 0, this.facing, false, true);
  }

  setLocked(locked: boolean): void {
    this.locked = locked;
    if (locked) (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  isLocked(): boolean {
    return this.locked;
  }

  /** Read-only accessors for `Follower.ts`'s position-trail recorder (`OverworldScene.ts`) -- it
   * needs her own authoritative facing/moving state alongside her x/y so a follower can later
   * replay "what she was actually doing" at a past instant, not just "where she was." Neither
   * accessor is written to by anything outside this class's own `update()` below. */
  getFacing(): Facing {
    return this.facing;
  }

  isMoving(): boolean {
    return this.moving;
  }

  update(): void {
    const depth = depthForY(this.y, DEPTH.ACTORS);
    this.setDepth(depth);
    this.shadow.setDepth(depth - 0.0005);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.locked) {
      body.setVelocity(0, 0);
      this.moving = false;
      updateFacingAnimation(this, 'bernadette', 0, 0, this.facing, false, true);
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

    this.moving = vx !== 0 || vy !== 0;
    this.syncDiagonalPhase(vx, vy);
    if (this.moving) {
      // Normalize so diagonal movement isn't faster than a single cardinal direction.
      const len = Math.hypot(vx, vy) || 1;
      body.setVelocity((vx / len) * SPEED, (vy / len) * SPEED);
    } else {
      body.setVelocity(0, 0);
    }
    // Only ever sets texture/flipX/the current animation frame -- never `x`/`y`/`scale` -- so this
    // cannot affect the world position or camera above, regardless of whether she's animating.
    this.facing = updateFacingAnimation(this, 'bernadette', vx, vy, this.facing, this.moving, true);
    this.syncShadow();
  }

  /**
   * On an exact diagonal (keyboard: |vx| == |vy|) the camera scrolls the same distance on both
   * axes every frame, but the ground can only land on whole framebuffer pixels -- and if her x and
   * y sit at different sub-pixel phases, the x and y one-pixel steps happen on *different* frames,
   * so the ground wobbles sideways around the direction of travel ("marea", worst on diagonals).
   * When a diagonal starts, nudge y by under one framebuffer pixel (1/PIXEL_SCALE of a world pixel
   * -- invisible, the camera follows her exactly) so both axes share one phase and step together.
   * Measured against a sharp test grid on the framebuffer, all four diagonals: without this the
   * axes were out of step on 11-18 of 23 frames, with it on none once the diagonal is under way.
   * Done once per diagonal, never per frame, so sliding along a wall can't turn it into a
   * back-and-forth.
   */
  private syncDiagonalPhase(vx: number, vy: number): void {
    const diagonal = vx !== 0 && Math.abs(vx) === Math.abs(vy) ? `${Math.sign(vx)},${Math.sign(vy)}` : null;
    if (diagonal && diagonal !== this.lastDiagonal) {
      const frac = (v: number) => v * PIXEL_SCALE - Math.floor(v * PIXEL_SCALE);
      const fx = frac(this.x);
      // Same direction on both axes -> same phase; opposite directions -> mirrored phase.
      const target = Math.sign(vx) === Math.sign(vy) ? fx : (1 - fx) % 1;
      let dy = target - frac(this.y);
      if (dy > 0.5) dy -= 1;
      if (dy < -0.5) dy += 1;
      this.y += dy / PIXEL_SCALE;
    }
    this.lastDiagonal = diagonal;
  }

  /** The shadow tracks her x/y (ground position) only. */
  private syncShadow(): void {
    this.shadow.setPosition(this.x, this.y - 1);
  }

  destroy(fromScene?: boolean): void {
    this.scene?.events.off(Phaser.Scenes.Events.POST_UPDATE, this.syncShadow, this);
    this.shadow.destroy();
    super.destroy(fromScene);
  }
}
