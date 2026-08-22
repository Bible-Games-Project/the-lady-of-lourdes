import Phaser from 'phaser';
import journeyMapUrl from './journey_map.png';

/**
 * The maintainer's own finished artwork for the Journey/Map screen — a tall (941x1672) vertical
 * illustration of the pilgrimage route from the valley up to the Grotto. Used directly as-is, the
 * same way `assets/home/home_background.png` is (see AGENTS.md): never redrawn, recolored, or
 * recomposed. Recovered byte-for-byte from the conversation that supplied it.
 */
export const JOURNEY_MAP_KEY = 'journey_map_real';

/** The image's native size, for scaling/world-height math in ApparitionJourneyScene. */
export const JOURNEY_MAP_SIZE = { width: 941, height: 1672 } as const;

export function preloadJourneyMap(scene: Phaser.Scene): void {
  scene.load.image(JOURNEY_MAP_KEY, journeyMapUrl);
}
