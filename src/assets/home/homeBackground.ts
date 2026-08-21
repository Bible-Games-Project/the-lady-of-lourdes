import Phaser from 'phaser';
import homeBackgroundUrl from './home_background.png';
import bernadetteTorsoCutoutUrl from './bernadette_torso_cutout.png';

/**
 * The maintainer's own finished artwork, used directly as the Home background — not
 * regenerated, recolored, or recomposed. Recovered byte-for-byte from the conversation that
 * supplied it (see AGENTS.md). Do not replace this with a procedurally generated texture again;
 * that was tried and explicitly rejected.
 */
export const HOME_BACKGROUND_KEY = 'home_background_real';

/**
 * A small crop of Bernadette's torso/chest — *only* that region, not her head, hands, or skirt —
 * cropped out of the background at HOME_CUTOUT_SOURCE_RECT.bernadetteTorso below (Pillow: crop
 * the box, then fade alpha to 0 from ~70% to ~103% of the elliptical radius, so the edge blends
 * into the surrounding dark robe/forest instead of a hard rectangle) so it can be layered back on
 * top at its exact original position and given a barely-there breathing scale — see
 * HomeScene.ts#buildBreathingFigure(). The background underneath is untouched; this is a copy,
 * not an edit, and everywhere outside its soft-edged crop is fully transparent. The Lady and the
 * sky's cloud cluster are NOT cut out — both are shown only via the untouched background and are
 * fully static; do not reintroduce cutouts/animation for either (see AGENTS.md).
 */
export const HOME_BERNADETTE_TORSO_CUTOUT_KEY = 'home_bernadette_torso_cutout';

/** Where the torso cutout sits in the *original* (1672x941) artwork — see HomeScene.ts#toGameXY(). */
export const HOME_CUTOUT_SOURCE_RECT = {
  bernadetteTorso: { x: 685, y: 733, width: 68, height: 55 },
} as const;

export function preloadHomeBackground(scene: Phaser.Scene): void {
  scene.load.image(HOME_BACKGROUND_KEY, homeBackgroundUrl);
  scene.load.image(HOME_BERNADETTE_TORSO_CUTOUT_KEY, bernadetteTorsoCutoutUrl);
}
