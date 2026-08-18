import type { CharacterId } from '../pixelart/characters';
import { textureKeyFor } from '../pixelart/characters';

export type Facing = 'down' | 'up' | 'left' | 'right';

/** Picks the right texture (down/up/side, mirrored for left) from a movement vector. */
export function updateFacingTexture(
  sprite: Phaser.GameObjects.Sprite,
  id: CharacterId,
  vx: number,
  vy: number,
  lastFacing: Facing,
): Facing {
  let facing = lastFacing;
  if (Math.abs(vx) > Math.abs(vy)) {
    if (vx !== 0) facing = vx < 0 ? 'left' : 'right';
  } else if (vy !== 0) {
    facing = vy < 0 ? 'up' : 'down';
  }

  const textureFacing = facing === 'left' || facing === 'right' ? 'side' : facing;
  sprite.setTexture(textureKeyFor(id, textureFacing));
  sprite.setFlipX(facing === 'left');
  return facing;
}

/** Subtle squash/stretch while walking so movement reads without extra frame-by-frame art. */
export function applyWalkBob(sprite: Phaser.GameObjects.Sprite, moving: boolean, time: number, baseScale = 1): void {
  if (moving) {
    const t = Math.sin(time / 80);
    sprite.setScale(baseScale * (1 + t * 0.04), baseScale * (1 - t * 0.04));
  } else {
    sprite.setScale(baseScale, baseScale);
  }
}
