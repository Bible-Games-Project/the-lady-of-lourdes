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
 * `BERNADETTE_FRAME_HEIGHT` started at 72px display (144 actual framebuffer pixels at
 * `PIXEL_SCALE`), then became 40% of that (28.8) per an earlier explicit request. The most recent
 * request is "increase the player's CURRENT displayed size to 200% of its current size" -- "current"
 * here means exactly what was live and on-screen at the time of that request, i.e. the 40% value
 * (28.8), not the original pre-resize 72 -- so this doubles *that*, to 57.6 (which works out to 80%
 * of the very first calibrated size, not 200% of it; that's an artifact of the two requests
 * compounding, not a mistake). Expressed as a multiply against the prior constant rather than a new
 * hand-typed number so the factor stays visible at the definition and the history stays traceable.
 * Nothing else about how she's rendered changes: `Player.ts`'s `baseScale = BERNADETTE_FRAME_HEIGHT
 * / this.height` already derives her actual render scale from this one constant, so the resize
 * applies uniformly to every facing/texture that constant feeds into (and to her shadow via
 * `SHADOW_SCALE`, itself derived from this same constant) -- no source art file is touched.
 */
const BERNADETTE_DISPLAY_HEIGHT_BEFORE_THIS_RESIZE = 72 * 0.4;
export const BERNADETTE_FRAME_HEIGHT = BERNADETTE_DISPLAY_HEIGHT_BEFORE_THIS_RESIZE * 2;

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
 * procedural characters NEAREST is for) — her native panels (337-398px wide, ~861-870px tall) are
 * scaled *down* to display size at render time (`Player.ts`'s `baseScale`). At the current
 * `BERNADETTE_FRAME_HEIGHT` above, that minification ratio (native height / actual framebuffer
 * pixels she's drawn at) is back down to ~7.5x -- comfortably inside the ~8-12x range buildings/
 * trees are already proven safe at (actually slightly under it) -- so LINEAR continues to read as
 * a clean, smooth downscale here, confirmed visually, not assumed.
 */
export function registerBernadetteSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    scene.textures.get(textureKeyFor('bernadette', facing, null)).setFilter(Phaser.Textures.FilterMode.LINEAR);
  });
}
