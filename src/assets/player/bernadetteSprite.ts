import Phaser from 'phaser';
import { textureKeyFor, walkAnimKeyFor, type FacingKey } from '../../pixelart/characters';
import idleUrl from './bernadette_idle.png';
import walkAUrl from './bernadette_walk_a.png';
import walkBUrl from './bernadette_walk_b.png';

/**
 * The maintainer's own finished artwork for the gameplay player character — used directly as
 * the real source, exactly the way `assets/home/home_background.png` is: recovered byte-for-byte
 * from the conversation that supplied it, never redrawn/recolored/redesigned. It's a single
 * right-facing side profile; there is no separate front/back art, and none is invented here (see
 * the note on `registerBernadetteSprite` below).
 *
 * These three frames were pre-generated *offline* (not at runtime) from that one source pose:
 * `bernadette_idle.png` is the source itself, uniformly downscaled to the sprite's actual
 * in-game display size (21x34) with high-quality resampling; `bernadette_walk_a/b.png` are the
 * same downscaled image with a small per-row horizontal shear applied below the waist (a
 * trapezoid: 0px at the waist, increasing toward the hem) plus a matching shift on the
 * boots/feet and a 1px vertical bob — i.e. a cutout-puppet deformation of the *same* pixels, not
 * new drawn content. This only reads as a walk cycle because it was done at the sprite's actual
 * tiny display resolution, where a 1-2px shift is a large fraction of the frame; the same
 * deformation applied to the giant source image and then downscaled would have vanished into
 * sub-pixel noise. If these frames ever need regenerating (e.g. a new source pose), work at this
 * final display size, not the source's native resolution.
 */
export const BERNADETTE_FRAME_SIZE = { width: 21, height: 34 } as const;

const BERNADETTE_FACINGS: FacingKey[] = ['down', 'up', 'side'];
const BERNADETTE_STEPS: Array<'a' | 'b' | null> = [null, 'a', 'b'];
const BERNADETTE_URLS: Record<'a' | 'b' | 'idle', string> = { idle: idleUrl, a: walkAUrl, b: walkBUrl };

/**
 * Loads the real art under the *exact* key strings
 * `pixelart/characters.ts#textureKeyFor('bernadette', facing, step)` would have used for the
 * procedural version — `Player.ts`, `spriteFacing.ts`, and `NpcActor.ts` all address her purely
 * through those key-generating functions, so nothing about the shared movement/animation code
 * needs to know or care that her textures now come from a real image.
 *
 * There is only one real pose (a right-facing side view), so `down`/`up`/`side` all load the
 * identical three frames under their own keys; `spriteFacing.ts`'s existing `setFlipX` already
 * mirrors it for `left`. A true front view (`down`) and back view (`up`) would need
 * actually-different source art this project doesn't have, and no image-generation tool is
 * available to create one — reusing the side view for all facings was judged less wrong than
 * inventing new angles of her, per the maintainer's explicit "do not create a different
 * Bernadette."
 */
export function preloadBernadetteSprite(scene: Phaser.Scene): void {
  BERNADETTE_FACINGS.forEach((facing) => {
    scene.load.image(textureKeyFor('bernadette', facing, null), BERNADETTE_URLS.idle);
    scene.load.image(textureKeyFor('bernadette', facing, 'a'), BERNADETTE_URLS.a);
    scene.load.image(textureKeyFor('bernadette', facing, 'b'), BERNADETTE_URLS.b);
  });
}

/** Sets linear filtering (this is a real illustration, not the hard-edged procedural pixel grid — see the pixelArt gotcha in AGENTS.md) and registers the walk animations, once the textures above have loaded. */
export function registerBernadetteSprite(scene: Phaser.Scene): void {
  BERNADETTE_FACINGS.forEach((facing) => {
    BERNADETTE_STEPS.forEach((step) => {
      scene.textures.get(textureKeyFor('bernadette', facing, step)).setFilter(Phaser.Textures.FilterMode.LINEAR);
    });

    const animKey = walkAnimKeyFor('bernadette', facing);
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: [
          { key: textureKeyFor('bernadette', facing, 'a') },
          { key: textureKeyFor('bernadette', facing, null) },
          { key: textureKeyFor('bernadette', facing, 'b') },
          { key: textureKeyFor('bernadette', facing, null) },
        ],
        frameRate: 6,
        repeat: -1,
      });
    }
  });
}
