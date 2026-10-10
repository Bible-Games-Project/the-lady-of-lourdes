import Phaser from 'phaser';
import { textureKeyFor, type FacingKey } from '../../pixelart/characters';
import sideIdleUrl from './bernadette_side_idle.png';
import backIdleUrl from './bernadette_back_idle.png';
import frontIdleUrl from './bernadette_front_idle.png';

/**
 * The maintainer's own finished artwork for the gameplay player character, recovered byte-for-byte
 * from the conversation that supplied it — never redrawn/recolored/redesigned. Only the 3 original
 * static poses (front/back/side, side mirrored for left in `Player.ts`) are used; there is no
 * walk-cycle, breathing, or generated/deformed frame art anymore.
 *
 * Several rounds of walk-cycle deformation (boot lift, skirt shear, hand/rosary counter-swing) were
 * built and shipped here previously, chasing a persistent walking jitter report that survived every
 * fix to that artwork and to the camera. After the jitter was confirmed (by direct frame-by-frame
 * instrumentation) to persist even with every one of those generated frames disabled and breathing
 * disabled — i.e. with the sprite provably 100% static — the whole player movement/rendering/camera
 * system was rebuilt from scratch rather than patched further; see `Player.ts` and
 * `OverworldScene.ts#updateCameraFollow()`. This file now only loads/filters the 3 idle poses; the
 * old generated walk-frame PNGs and the animation this file used to register for them are gone.
 *
 * `BERNADETTE_FRAME_HEIGHT` (72px display / 144 actual framebuffer pixels at `PIXEL_SCALE`) is
 * unchanged from before this rebuild — this is purely a display-size calibration constant, nothing
 * about the rebuild needed to revisit it.
 */
export const BERNADETTE_FRAME_HEIGHT = 72 as const;

const IDLE_URL_BY_FACING: Record<FacingKey, string> = {
  side: sideIdleUrl,
  up: backIdleUrl,
  down: frontIdleUrl,
};
const ALL_FACINGS: FacingKey[] = ['down', 'up', 'side'];

/**
 * Loads the real art under the *exact* key strings
 * `pixelart/characters.ts#textureKeyFor('bernadette', facing, null)` would have used for the
 * procedural version — `Player.ts` addresses her purely through that key-generating function, so
 * nothing about movement/rendering needs to know or care that her textures come from real images.
 */
export function preloadBernadetteSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    scene.load.image(textureKeyFor('bernadette', facing, null), IDLE_URL_BY_FACING[facing]);
  });
}

/**
 * Gives her 3 idle textures `LINEAR` filtering (like the sister/buildings/trees, not the flat
 * procedural characters NEAREST is for) — correct for this sheet's native panels (337-398px wide,
 * ~861-870px tall) scaled *down* to display size at render time (`Player.ts`'s `baseScale`): at
 * that real ~6x minification ratio, comfortably inside the safe range buildings/trees already use
 * (~8-12x), LINEAR is what makes the downscale read as smooth/anti-aliased instead of aliased.
 */
export function registerBernadetteSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    scene.textures.get(textureKeyFor('bernadette', facing, null)).setFilter(Phaser.Textures.FilterMode.LINEAR);
  });
}
