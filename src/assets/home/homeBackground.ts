import Phaser from 'phaser';
import homeBackgroundUrl from './home_background.png';

/**
 * The maintainer's own finished artwork, used directly as the Home background — not
 * regenerated, recolored, or recomposed. Recovered byte-for-byte from the conversation that
 * supplied it (see AGENTS.md). Do not replace this with a procedurally generated texture again;
 * that was tried and explicitly rejected.
 */
export const HOME_BACKGROUND_KEY = 'home_background_real';

export function preloadHomeBackground(scene: Phaser.Scene): void {
  scene.load.image(HOME_BACKGROUND_KEY, homeBackgroundUrl);
}
