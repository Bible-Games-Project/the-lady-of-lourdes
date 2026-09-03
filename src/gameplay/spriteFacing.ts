import type { CharacterId } from '../pixelart/characters';
import { textureKeyFor, walkAnimKeyFor } from '../pixelart/characters';

export type Facing = 'down' | 'up' | 'left' | 'right';

/**
 * Picks the right facing (down/up/side, mirrored for left) from a movement
 * vector, and plays/stops that character's real 2-frame walk animation.
 *
 * `preferVerticalOnDiagonal` (default off, so every existing `NpcActor` caller — mother, Jeanne,
 * etc. — keeps its old dominant-axis-wins behavior) makes any diagonal (both `vx` and `vy`
 * nonzero) resolve to the vertical facing unconditionally, not just on an exact tie. Bernadette's
 * 3-view sprite set has no diagonal art — only side/back/front — and the maintainer's explicit
 * rule is "the vertical component determines the sprite" for *any* diagonal, regardless of how
 * much horizontal vs. vertical motion there is (this matters for touch/joystick input, whose
 * vector can be e.g. (0.6, 0.5) — `Math.abs(vx) > Math.abs(vy)` alone would pick horizontal there,
 * which keyboard input's exact ±1/±1 diagonals never would). `Player.ts` passes `true`; nothing
 * else does.
 */
export function updateFacingAnimation(
  sprite: Phaser.GameObjects.Sprite,
  id: CharacterId,
  vx: number,
  vy: number,
  lastFacing: Facing,
  moving: boolean,
  preferVerticalOnDiagonal = false,
): Facing {
  let facing = lastFacing;
  if (preferVerticalOnDiagonal && vx !== 0 && vy !== 0) {
    facing = vy < 0 ? 'up' : 'down';
  } else if (Math.abs(vx) > Math.abs(vy)) {
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
