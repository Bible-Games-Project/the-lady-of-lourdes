import Phaser from 'phaser';
import { textureKeyFor, walkAnimKeyFor, type FacingKey } from '../../pixelart/characters';
import idleUrl from './bernadette_idle.png';
import walkAUrl from './bernadette_walk_a.png';
import walkBUrl from './bernadette_walk_b.png';
import backIdleUrl from './bernadette_back_idle.png';
import backWalkAUrl from './bernadette_back_walk_a.png';
import backWalkBUrl from './bernadette_back_walk_b.png';

/**
 * The maintainer's own finished artwork for the gameplay player character — used directly as
 * the real source for the `down`/`left`/`right` frames, exactly the way
 * `assets/home/home_background.png` is: recovered byte-for-byte from the conversation that
 * supplied it, never redrawn/recolored/redesigned. It's a single right-facing side profile.
 *
 * `up` (facing away from the camera) has no real source art — none was supplied, and no
 * image-generation tool is available in this environment. Per the maintainer's explicit request
 * to build a genuine back view rather than reuse or mirror/rotate the front one,
 * `bernadette_back_*.png` were constructed *from her own pixels*: for each row of the source
 * image, the "back half" of her silhouette (the portion behind her own body midline — provably
 * the back of her veil/shawl/skirt in a side profile, never her face) is mirrored across a
 * center axis to build a symmetric figure, and her braid (isolated from the same source via a
 * restricted hue/saturation mask, hand-tuned against this specific image) is composited back on
 * centered. This is a same-palette, same-proportions *reconstruction*, not new invented content —
 * see the maintainer conversation this was built in for the exact reproduction steps (band
 * boundaries, mask parameters) if it ever needs redoing.
 *
 * Both sets of walk-cycle frames (`_walk_a/b.png`) are a cutout-puppet deformation — independent
 * small shifts on the *separate* left/right boot regions (so the two feet visibly swap which is
 * forward/planted vs. back/lifted, not just the whole foot cluster translating), the opposite-arm
 * counter-swing on the visible hand(s), a waist-down skirt shear, and a sub-pixel vertical bob.
 * Generated at a larger intermediate resolution than the final frame size and then downscaled
 * (LANCZOS + a mild unsharp pass) specifically so the two boots stay visually distinct after
 * scaling down — doing the deformation directly at the tiny final size (as an earlier version of
 * this file did) left too little pixel data for the feet to read as two different feet. If these
 * frames are ever regenerated, keep working at a larger intermediate size and downscale at the
 * end, not the other way around.
 */
export const BERNADETTE_FRAME_SIZE = { width: 26, height: 42 } as const;
export const BERNADETTE_BACK_FRAME_SIZE = { width: 15, height: 42 } as const;

const SIDE_FACINGS: FacingKey[] = ['down', 'side'];
const ALL_FACINGS: FacingKey[] = ['down', 'up', 'side'];
const STEPS: Array<'a' | 'b' | null> = [null, 'a', 'b'];
const SIDE_URLS: Record<'a' | 'b' | 'idle', string> = { idle: idleUrl, a: walkAUrl, b: walkBUrl };
const BACK_URLS: Record<'a' | 'b' | 'idle', string> = { idle: backIdleUrl, a: backWalkAUrl, b: backWalkBUrl };

/**
 * Loads the real art under the *exact* key strings
 * `pixelart/characters.ts#textureKeyFor('bernadette', facing, step)` would have used for the
 * procedural version — `Player.ts`, `spriteFacing.ts`, and `NpcActor.ts` all address her purely
 * through those key-generating functions, so nothing about the shared movement/animation code
 * needs to know or care that her textures now come from real images.
 *
 * `down` and `side` share the source side-profile frames (`spriteFacing.ts`'s existing `setFlipX`
 * mirrors `side` for `left`); `up` loads the separate constructed back-view frames — see the
 * file-level comment above.
 */
export function preloadBernadetteSprite(scene: Phaser.Scene): void {
  SIDE_FACINGS.forEach((facing) => {
    scene.load.image(textureKeyFor('bernadette', facing, null), SIDE_URLS.idle);
    scene.load.image(textureKeyFor('bernadette', facing, 'a'), SIDE_URLS.a);
    scene.load.image(textureKeyFor('bernadette', facing, 'b'), SIDE_URLS.b);
  });
  scene.load.image(textureKeyFor('bernadette', 'up', null), BACK_URLS.idle);
  scene.load.image(textureKeyFor('bernadette', 'up', 'a'), BACK_URLS.a);
  scene.load.image(textureKeyFor('bernadette', 'up', 'b'), BACK_URLS.b);
}

/** Sets linear filtering (this is real illustration, not the hard-edged procedural pixel grid — see the pixelArt gotcha in AGENTS.md) and registers the walk animations, once the textures above have loaded. */
export function registerBernadetteSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    STEPS.forEach((step) => {
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
