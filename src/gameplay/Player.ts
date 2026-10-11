import Phaser from 'phaser';
import { DEPTH } from '../core/constants';
import { BERNADETTE_SHADOW_KEY, textureKeyFor } from '../pixelart/characters';
import { BERNADETTE_FRAME_HEIGHT } from '../assets/player/bernadetteSprite';
import { depthForY } from './utils';
import type { TouchControls } from './TouchControls';

const SPEED = 70;

export type Facing = 'down' | 'up' | 'left' | 'right';

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
 * Deliberately picks only between the 3 static directional poses that exist as real art (front,
 * back, side -- mirrored for right) -- no walk cycle, no breathing, no generated/deformed frames.
 * Vertical wins on any diagonal (there is no separate diagonal pose to pick), matching the
 * previous shared `spriteFacing.ts` behavior Bernadette used to go through (`preferVerticalOnDiagonal:
 * true`) -- kept here as a tiny Bernadette-only function instead, since that shared file still
 * drives every procedural NPC's real walk-cycle animation and must not be touched for this rebuild.
 */
function facingFromVector(vx: number, vy: number, lastFacing: Facing): Facing {
  if (vy !== 0) return vy < 0 ? 'up' : 'down';
  if (vx !== 0) return vx < 0 ? 'left' : 'right';
  return lastFacing;
}

/**
 * Bernadette's player avatar, rebuilt from scratch (see git history for the previous, much more
 * complex version chasing a persistent walking jitter across many rounds of fixes that never
 * fully resolved it). This version is deliberately as simple as possible:
 *
 * - Rendering: exactly 3 static textures (front/back/side, side mirrored via `setFlipX` for
 *   left), swapped only when `facing` actually changes direction -- never a per-frame texture
 *   reassignment, never a scale change, never an animation. The sprite's `x`/`y` (the single
 *   authoritative world position, owned entirely by the Arcade Physics body) is never touched by
 *   anything in this file related to rendering/texture selection.
 * - Movement: velocity set directly from input direction each frame, normalized so diagonal speed
 *   equals cardinal speed. No separate position bookkeeping -- `this.x`/`this.y` (via the physics
 *   body) is the one and only source of truth every other system (camera, depth sorting, shadow,
 *   collisions, scripted sequences) reads from.
 *
 * See `OverworldScene.ts#updateCameraFollow()` for the matching camera-side rebuild.
 */
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

    const keyboard = scene.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.keyW = keyboard.addKey('W');
    this.keyA = keyboard.addKey('A');
    this.keyS = keyboard.addKey('S');
    this.keyD = keyboard.addKey('D');
    this.touch = touch;

    this.applyFacingTexture();
  }

  setLocked(locked: boolean): void {
    this.locked = locked;
    if (locked) (this.body as Phaser.Physics.Arcade.Body).setVelocity(0, 0);
  }

  isLocked(): boolean {
    return this.locked;
  }

  update(): void {
    const depth = depthForY(this.y, DEPTH.ACTORS);
    this.setDepth(depth);
    this.shadow.setDepth(depth - 0.0005);

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (this.locked) {
      body.setVelocity(0, 0);
      this.applyFacingTexture();
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

    if (vx !== 0 || vy !== 0) {
      // Normalize so diagonal movement isn't faster than a single cardinal direction.
      const len = Math.hypot(vx, vy) || 1;
      body.setVelocity((vx / len) * SPEED, (vy / len) * SPEED);
      this.facing = facingFromVector(vx, vy, this.facing);
    } else {
      body.setVelocity(0, 0);
    }
    this.applyFacingTexture();
    this.syncShadow();
  }

  /**
   * Only ever sets `texture`/`flipX` -- never touches `x`/`y`/`scale`, and only actually does
   * anything when `facing` changed since the last call (the common case, every frame while
   * walking in a straight line or standing still, is a no-op check and nothing else).
   */
  private applyFacingTexture(): void {
    const textureFacing = this.facing === 'left' || this.facing === 'right' ? 'side' : this.facing;
    const key = textureKeyFor('bernadette', textureFacing);
    const flipX = this.facing === 'left';
    if (this.texture.key !== key) this.setTexture(key);
    if (this.flipX !== flipX) this.setFlipX(flipX);
  }

  /** The shadow tracks her x/y (ground position) only. */
  private syncShadow(): void {
    this.shadow.setPosition(this.x, this.y - 1);
  }

  destroy(fromScene?: boolean): void {
    this.shadow.destroy();
    super.destroy(fromScene);
  }
}
