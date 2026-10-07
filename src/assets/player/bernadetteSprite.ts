import Phaser from 'phaser';
import { textureKeyFor, walkAnimKeyFor, type FacingKey } from '../../pixelart/characters';
import sideIdleUrl from './bernadette_side_idle.png';
import sideWalkAUrl from './bernadette_side_walk_a.png';
import sideWalkBUrl from './bernadette_side_walk_b.png';
import backIdleUrl from './bernadette_back_idle.png';
import backWalkAUrl from './bernadette_back_walk_a.png';
import backWalkBUrl from './bernadette_back_walk_b.png';
import frontIdleUrl from './bernadette_front_idle.png';
import frontWalkAUrl from './bernadette_front_walk_a.png';
import frontWalkBUrl from './bernadette_front_walk_b.png';

/**
 * The maintainer's own finished artwork for the gameplay player character, recovered byte-for-byte
 * from the conversation that supplied it — never redrawn/recolored/redesigned. This is the
 * *fourth* full sprite-sheet swap (poncho, headscarf, and rosary, replacing the previous
 * blue-dress-only sheet), at full native resolution like the round before it: side 337x870,
 * front 398x868, back 379x861, each cropped with a generous 40px transparent margin on every side
 * (not just a tight 2px alpha-bbox pad like the previous round's crops were) specifically so the
 * walk-cycle deformation below has room to shift boots/hem without touching the canvas edge -- see
 * the "clipped boot" bug this avoided, documented in this repo's git history on the previous
 * sheet's own walk-cycle fix.
 *
 * `BERNADETTE_FRAME_HEIGHT` is unchanged from the previous round (72px display / 144 actual
 * framebuffer pixels at `PIXEL_SCALE`) per explicit instruction to keep her calibrated size when
 * swapping in this new sheet -- nothing about this sheet's proportions made that technically
 * necessary to revisit (native panel heights ~861-870px vs. the previous round's ~923-933px is a
 * similar order of magnitude, keeping the same LINEAR-filtering minification ratio reasoning
 * below valid). `side` is used as-is for `right` and horizontally flipped (`setFlipX`, in
 * `spriteFacing.ts`) for `left`; `back` only for `up`; `front` only for `down`.
 *
 * Every walk-cycle frame (`_walk_a/b.png`, all 3 views) is the same cutout-puppet deformation
 * family as the previous round and `sisterSprite.ts`: independent boot lifts, hand counter-swing,
 * waist-down skirt shear. Two fixes carried forward from the previous round's own walk-cycle bug
 * fix, applied here from the start rather than discovered after shipping: (1) boots only ever
 * lift *up* (never pushed down past the canvas edge, which is what clipped them last round); (2)
 * the skirt shear clamps each row's shift to what that row's own silhouette can safely take
 * instead of a flat constant. One new fix specific to this sheet: the source webp has scattered
 * near-invisible compression specks (alpha ~1/255) well outside the actual figure silhouette,
 * confirmed by inspecting the raw pixel data directly -- a bare `alpha > 0` test in the skirt
 * shear's per-row clamp picked these up as "real" silhouette content, and an occasional stray
 * speck landing near the canvas edge on one row choked that row's shift down to ~1px against its
 * neighbors' 7-8px, producing a jagged seam; fixed by thresholding at `alpha > 20`. One new
 * element specific to this sheet: one hand on each view holds a rosary that hangs well below the
 * hand itself (confirmed directly in the source art) -- that hand's shift/fill box extends down
 * to cover the full chain, so it swings rigidly with the hand instead of staying fixed in place
 * while the hand moves. Idle frames are the untouched crops, no deformation.
 */
export const BERNADETTE_FRAME_HEIGHT = 72 as const;

const URLS_BY_FACING: Record<FacingKey, Record<'a' | 'b' | 'idle', string>> = {
  side: { idle: sideIdleUrl, a: sideWalkAUrl, b: sideWalkBUrl },
  up: { idle: backIdleUrl, a: backWalkAUrl, b: backWalkBUrl },
  down: { idle: frontIdleUrl, a: frontWalkAUrl, b: frontWalkBUrl },
};
const ALL_FACINGS: FacingKey[] = ['down', 'up', 'side'];

/**
 * Loads the real art under the *exact* key strings
 * `pixelart/characters.ts#textureKeyFor('bernadette', facing, step)` would have used for the
 * procedural version — `Player.ts`, `spriteFacing.ts`, and `NpcActor.ts` all address her purely
 * through those key-generating functions, so nothing about the shared movement/animation code
 * needs to know or care that her textures now come from real images.
 */
export function preloadBernadetteSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    const urls = URLS_BY_FACING[facing];
    scene.load.image(textureKeyFor('bernadette', facing, null), urls.idle);
    scene.load.image(textureKeyFor('bernadette', facing, 'a'), urls.a);
    scene.load.image(textureKeyFor('bernadette', facing, 'b'), urls.b);
  });
}

/**
 * Registers the walk animations, once the textures above have loaded, and gives every texture
 * above `LINEAR` filtering (like the sister/buildings/trees, not the flat procedural characters
 * NEAREST is for) -- still correct with this (fourth) sheet's native panels (337-398px wide,
 * 861-870px tall) scaled *down* to display size at render time (`Player.ts`'s `targetHeight`): at
 * that real ~6x minification ratio (full native height / the actual framebuffer pixels she ends
 * up drawn at, i.e. native height / (`BERNADETTE_FRAME_HEIGHT` x `PIXEL_SCALE`)) -- comfortably
 * inside the safe range buildings/trees already use (~8-12x) -- LINEAR is what makes the downscale
 * read as smooth/anti-aliased instead of aliased, exactly the same reasoning `sisterSprite.ts`
 * documents for its own texture.
 */
export function registerBernadetteSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    [textureKeyFor('bernadette', facing, null), textureKeyFor('bernadette', facing, 'a'), textureKeyFor('bernadette', facing, 'b')].forEach((key) => {
      scene.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
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
