import type { CharacterId } from '../pixelart/characters';
import { textureKeyFor, walkAnimKeyFor } from '../pixelart/characters';

export type Facing = 'down' | 'up' | 'left' | 'right';

/**
 * Picks the right facing (down/up/side, mirrored for left) from a movement
 * vector, and plays/stops that character's real 2-frame walk animation.
 */
export function updateFacingAnimation(
  sprite: Phaser.GameObjects.Sprite,
  id: CharacterId,
  vx: number,
  vy: number,
  lastFacing: Facing,
  moving: boolean,
): Facing {
  let facing = lastFacing;
  if (Math.abs(vx) > Math.abs(vy)) {
    if (vx !== 0) facing = vx < 0 ? 'left' : 'right';
  } else if (vy !== 0) {
    facing = vy < 0 ? 'up' : 'down';
  }

  const textureFacing = facing === 'left' || facing === 'right' ? 'side' : facing;
  sprite.setFlipX(facing === 'left');

  if (moving) {
    const animKey = walkAnimKeyFor(id, textureFacing);
    if (sprite.anims.currentAnim?.key !== animKey || !sprite.anims.isPlaying) {
      sprite.play(animKey, true);
    }
  } else {
    sprite.anims.stop();
    sprite.setTexture(textureKeyFor(id, textureFacing, null));
  }

  return facing;
}
