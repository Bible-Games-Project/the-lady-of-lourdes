import Phaser from 'phaser';
import homeBackgroundUrl from './home_background.png';
import bernadetteCutoutUrl from './bernadette_cutout.png';
import ladyCutoutUrl from './lady_cutout.png';
import cloudCutoutUrl from './cloud_cutout.png';

/**
 * The maintainer's own finished artwork, used directly as the Home background — not
 * regenerated, recolored, or recomposed. Recovered byte-for-byte from the conversation that
 * supplied it (see AGENTS.md). Do not replace this with a procedurally generated texture again;
 * that was tried and explicitly rejected.
 */
export const HOME_BACKGROUND_KEY = 'home_background_real';

/**
 * Bernadette, the Lady, and the sky's one cloud cluster, cropped out of that same background at
 * HOME_CUTOUT_SOURCE_RECT below (Pillow: crop the box, then fade alpha to 0 from ~68-72% to
 * ~102-105% of the elliptical radius, so the edge blends into the surrounding art instead of a
 * hard rectangle) so each can be layered back on top at its exact original position/scale and
 * given a small, seamless animation — see HomeScene.ts#buildBreathingFigures()/#buildClouds().
 * The background underneath is untouched; these are copies, not edits, and everywhere outside
 * their soft-edged crop is fully transparent. Any drift/oscillation applied to one of these must
 * stay well within its feather margin, or the *original*, still, un-animated copy baked into the
 * background will show through at the extremes.
 */
export const HOME_BERNADETTE_CUTOUT_KEY = 'home_bernadette_cutout';
export const HOME_LADY_CUTOUT_KEY = 'home_lady_cutout';
export const HOME_CLOUD_CUTOUT_KEY = 'home_cloud_cutout';

/** Where each cutout sits in the *original* (1672x941) artwork — see HomeScene.ts#toGameXY(). */
export const HOME_CUTOUT_SOURCE_RECT = {
  bernadette: { x: 625, y: 615, width: 170, height: 253 },
  lady: { x: 1055, y: 165, width: 190, height: 395 },
  cloud: { x: 545, y: 0, width: 225, height: 235 },
} as const;

export function preloadHomeBackground(scene: Phaser.Scene): void {
  scene.load.image(HOME_BACKGROUND_KEY, homeBackgroundUrl);
  scene.load.image(HOME_BERNADETTE_CUTOUT_KEY, bernadetteCutoutUrl);
  scene.load.image(HOME_LADY_CUTOUT_KEY, ladyCutoutUrl);
  scene.load.image(HOME_CLOUD_CUTOUT_KEY, cloudCutoutUrl);
}
