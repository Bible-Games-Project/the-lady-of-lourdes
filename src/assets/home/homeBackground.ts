import Phaser from 'phaser';
import homeBackgroundUrl from './home_background.png';
import bernadetteCutoutUrl from './bernadette_cutout.png';
import ladyCutoutUrl from './lady_cutout.png';

/**
 * The maintainer's own finished artwork, used directly as the Home background — not
 * regenerated, recolored, or recomposed. Recovered byte-for-byte from the conversation that
 * supplied it (see AGENTS.md). Do not replace this with a procedurally generated texture again;
 * that was tried and explicitly rejected.
 */
export const HOME_BACKGROUND_KEY = 'home_background_real';

/**
 * Bernadette and the Lady, cropped out of that same background at HOME_CUTOUT_SOURCE_RECT below
 * (Pillow: crop the box, then fade alpha to 0 from ~68% to ~105% of the elliptical radius, so
 * the edge blends into the surrounding art instead of a hard rectangle) so they can be layered
 * back on top at their exact original position/scale and given an extremely subtle breathing
 * animation — see HomeScene.ts#buildBreathingFigures(). The background underneath is untouched;
 * these are copies, not edits, and everywhere outside their soft-edged crop is fully transparent.
 */
export const HOME_BERNADETTE_CUTOUT_KEY = 'home_bernadette_cutout';
export const HOME_LADY_CUTOUT_KEY = 'home_lady_cutout';

/** Where each cutout sits in the *original* (1672x941) artwork — see HomeScene.ts#toGameXY(). */
export const HOME_CUTOUT_SOURCE_RECT = {
  bernadette: { x: 625, y: 615, width: 170, height: 253 },
  lady: { x: 1055, y: 165, width: 190, height: 395 },
} as const;

export function preloadHomeBackground(scene: Phaser.Scene): void {
  scene.load.image(HOME_BACKGROUND_KEY, homeBackgroundUrl);
  scene.load.image(HOME_BERNADETTE_CUTOUT_KEY, bernadetteCutoutUrl);
  scene.load.image(HOME_LADY_CUTOUT_KEY, ladyCutoutUrl);
}
