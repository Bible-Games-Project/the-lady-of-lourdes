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
 * *third* full sprite-sheet swap, and the first at full native resolution: every earlier round
 * (the maroon-dress sheet, then this same blue-dress sheet) cropped each panel to its own alpha
 * bounding box and then **resized it down** to a fixed final height (34px, then 42px) before the
 * file ever reached the game -- the exact same anti-pattern `sisterSprite.ts` documents for its
 * own first round, and the direct answer to "why is every NPC pixelated" investigated and
 * confirmed in-session: `scaleX`/`scaleY` were both exactly `1` for every real-art character
 * (Bernadette included) because there was nothing left for Phaser to scale -- the detail loss had
 * already happened permanently inside the PNG.
 *
 * Also confirmed in that same investigation: the 42px figure itself was never chosen for how the
 * art should look. It traces back through git history to a walk-cycle animation fix (`Frame size
 * increased from 21x34 to 26x42 ... to give the walk cycle enough resolution to animate the feet
 * independently`) and was then propagated by convention into every other character's own frame
 * height as a flat percentage of it (sister 85%, the boy 80%, Jeanne/the mother 100%) -- a
 * completely different kind of number (an animation-engineering minimum) being reused as if it
 * were a deliberate display-size decision.
 *
 * This round instead keeps these source panels at their full native resolution (side 315x923,
 * front 353x933, back 327x924) and lets `Player.ts` scale them down at *render* time via the same
 * `targetHeight` technique `NpcActor.ts` already uses for the sister/mother/Jeanne/the boy --
 * `BERNADETTE_FRAME_HEIGHT` below is now a *display* height, decoupled from whatever resolution
 * the source panels actually are, not a size baked into the files. The actual display height
 * (72px, up from 42) was determined empirically, not guessed: the same source art was rendered at
 * several sizes (28x72 through 90x288 framebuffer pixels, at `PIXEL_SCALE`'s 2x zoom) and compared
 * directly against screenshots of this exact sheet -- 72px display height (144 actual framebuffer
 * pixels) was the smallest size at which her face/hair/dress read as cleanly defined as the source
 * art itself, with only diminishing returns beyond it. `side` is used as-is for `right` and
 * horizontally flipped (`setFlipX`, in `spriteFacing.ts`) for `left`; `back` only for `up`; `front`
 * only for `down`.
 *
 * Every walk-cycle frame (`_walk_a/b.png`, all 3 views) is a cutout-puppet deformation applied
 * directly to these full-resolution crops (no intermediate resize at all now, unlike the old
 * pipeline's "deform at ~60px tall, then downscale" two-step): independent shifts on the separate
 * left/right boot regions, opposite-arm counter-swing on the hand region(s), and a waist-down
 * skirt shear, same family of technique as `sisterSprite.ts`. Two refinements specific to this
 * sheet's own art, found by inspecting the actual deformed output rather than assumed: (1) the
 * dress has a genuine vertical shading gradient, so the flat tiled clone-fill behind a moved hand
 * (sister's own technique) left a visible seam here -- fixed with a gradient-aware fill that
 * blends between a reference strip sampled just above and just below the hole, tracking the
 * fabric's own shading instead of fighting it; (2) a boot sitting at the hem (not bare over
 * background, unlike the sister's) needs the *same* hole-fill before the shifted copy is pasted
 * back on top, or the vacated box shows as a transparent notch cut into the dress hem. The back
 * view's hands, by contrast, genuinely do hang past the dress's own side silhouette over bare
 * background (confirmed by inspecting the source art directly) and use a plain clear, same as the
 * sister's boots. Idle frames are the untouched crops, no deformation.
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
 * NEAREST is for). An earlier round of this file explicitly rejected LINEAR here, and that
 * rejection was correct *for the sprites that existed at the time*: those PNGs had already been
 * resized down to her tiny final display size (13-18px wide, 42px tall) before ever reaching the
 * game, so LINEAR was interpolating between a source that was already final-size -- smearing an
 * already-crisp image for no benefit. That reasoning no longer applies now that the source panels
 * are kept at full native resolution (315-353px wide, 923-933px tall) and scaled *down* to display
 * size at render time (`Player.ts`'s `targetHeight`): at that real ~6.4x minification ratio (full
 * native height / the actual framebuffer pixels she ends up drawn at, i.e. native height /
 * (`BERNADETTE_FRAME_HEIGHT` x `PIXEL_SCALE`)) -- comfortably inside the safe range
 * buildings/trees already use (~8-12x) -- LINEAR is what makes the downscale read as smooth/anti
 * -aliased instead of aliased, exactly the same reasoning `sisterSprite.ts` documents for its own
 * texture.
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
