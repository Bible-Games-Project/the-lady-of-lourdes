import Phaser from 'phaser';
import cottageRowUrl from './cottage_row.png';
import cottageCornerUrl from './cottage_corner.png';
import cottageRowCurvedUrl from './cottage_row_curved.png';
import townhouseUrl from './townhouse.png';

/**
 * Individual Lourdes building PNGs, supplied by the maintainer one batch at a time (see
 * `OverworldScene.ts`'s own doc comment on the town area for the running history) — each cropped
 * tight to its own alpha bounding box (verified via a numpy alpha scan) and converted straight to
 * PNG, no redraw/recolor/re-pixelation. Real painted art (soft shading, not a hard pixel grid), so
 * these need `LINEAR` filtering like the Home background/journey map/town terrain — see
 * `BootScene.ts`'s own filter list, which this file's keys must be added to.
 *
 * This is the *second* full set for this module: the maintainer replaced the first batch
 * (location-specific buildings — Grotto, Moulin de Boly, Le Cachot, Hospice) with these four
 * generic town buildings instead ("borra los edificios que te pasé en otro momento, y cambialos por
 * estos") — the old batch's files/entries are gone rather than layered underneath, same as every
 * other full-sheet-swap in this codebase (e.g. Bernadette's dress-color change in
 * `assets/player/bernadetteSprite.ts`). These aren't tied to specific story locations, so they're
 * named for what they visually are rather than identified against the reference town map:
 *   - COTTAGE_ROW: a straight row of three attached cottages, front view.
 *   - COTTAGE_CORNER: a single cottage, three-quarter/isometric angle.
 *   - COTTAGE_ROW_CURVED: three attached cottages again, this time following a curved street line.
 *   - TOWNHOUSE: a taller three-story townhouse/tenement building with balconies.
 */
export const BUILDING_KEYS = {
  COTTAGE_ROW: 'building_cottage_row',
  COTTAGE_CORNER: 'building_cottage_corner',
  COTTAGE_ROW_CURVED: 'building_cottage_row_curved',
  TOWNHOUSE: 'building_townhouse',
} as const;

export const BUILDING_NATIVE_SIZE: Record<(typeof BUILDING_KEYS)[keyof typeof BUILDING_KEYS], { width: number; height: number }> = {
  [BUILDING_KEYS.COTTAGE_ROW]: { width: 1518, height: 1003 },
  [BUILDING_KEYS.COTTAGE_CORNER]: { width: 1457, height: 1005 },
  [BUILDING_KEYS.COTTAGE_ROW_CURVED]: { width: 1534, height: 1015 },
  [BUILDING_KEYS.TOWNHOUSE]: { width: 1524, height: 1016 },
};

export function preloadLourdesBuildings(scene: Phaser.Scene): void {
  scene.load.image(BUILDING_KEYS.COTTAGE_ROW, cottageRowUrl);
  scene.load.image(BUILDING_KEYS.COTTAGE_CORNER, cottageCornerUrl);
  scene.load.image(BUILDING_KEYS.COTTAGE_ROW_CURVED, cottageRowCurvedUrl);
  scene.load.image(BUILDING_KEYS.TOWNHOUSE, townhouseUrl);
}
