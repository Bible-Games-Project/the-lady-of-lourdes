import Phaser from 'phaser';
import grottoMassabielleUrl from './grotto_massabielle.png';
import moulinDeBolyUrl from './moulin_de_boly.png';
import leCachotExteriorUrl from './le_cachot_exterior.png';
import hospiceUrl from './hospice.png';

/**
 * Individual Lourdes building/location PNGs, supplied by the maintainer one batch at a time (see
 * `OverworldScene.ts`'s own doc comment on the town area for the running history) — each cropped
 * tight to its own alpha bounding box (verified via a numpy alpha scan) and converted straight to
 * PNG, no redraw/recolor/re-pixelation. Real painted art (soft shading, not a hard pixel grid), so
 * these need `LINEAR` filtering like the Home background/journey map/town terrain — see
 * `BootScene.ts`'s own filter list, which this file's keys must be added to.
 *
 * Each export here is a best-effort identification against the maintainer's own reference map
 * (a "Lugares de Bernadette" town map showing 7 numbered locations) — the supplied files carry no
 * descriptive names of their own (generic upload filenames), so this identification is inferred
 * from each image's own appearance against that reference, not from a filename the maintainer gave
 * explicitly. Flagged clearly to the maintainer so any misidentification can be corrected:
 *   - GROTTO_MASSABIELLE: the rock/cave structure -> reference location 1 (Gruta de Massabielle).
 *   - MOULIN_DE_BOLY: the windmill -> reference location 2 (Molino de Boly).
 *   - LE_CACHOT_EXTERIOR: the house+barn -> reference location 3 (Le Cachot) -- the more modest of
 *     the two house-like assets supplied so far.
 *   - HOSPICE: the large multi-wing building with cross/heart banners -> reference location 4
 *     (Hospicio) -- its scale and religious iconography (Sisters of Nevers ran the hospice) fit
 *     better than the Parish Church (no distinct bell tower/spire in this asset).
 *
 * Still missing (per the maintainer's own later messages, not yet accessible as files in this
 * session): the Parish Church, the Presbytery, a new river PNG, a bridge PNG, and two further
 * batches of generic secondary house/apartment buildings.
 */
export const BUILDING_KEYS = {
  GROTTO_MASSABIELLE: 'building_grotto_massabielle',
  MOULIN_DE_BOLY: 'building_moulin_de_boly',
  LE_CACHOT_EXTERIOR: 'building_le_cachot_exterior',
  HOSPICE: 'building_hospice',
} as const;

export const BUILDING_NATIVE_SIZE: Record<(typeof BUILDING_KEYS)[keyof typeof BUILDING_KEYS], { width: number; height: number }> = {
  [BUILDING_KEYS.GROTTO_MASSABIELLE]: { width: 1375, height: 981 },
  [BUILDING_KEYS.MOULIN_DE_BOLY]: { width: 922, height: 1381 },
  [BUILDING_KEYS.LE_CACHOT_EXTERIOR]: { width: 1340, height: 817 },
  [BUILDING_KEYS.HOSPICE]: { width: 1462, height: 890 },
};

export function preloadLourdesBuildings(scene: Phaser.Scene): void {
  scene.load.image(BUILDING_KEYS.GROTTO_MASSABIELLE, grottoMassabielleUrl);
  scene.load.image(BUILDING_KEYS.MOULIN_DE_BOLY, moulinDeBolyUrl);
  scene.load.image(BUILDING_KEYS.LE_CACHOT_EXTERIOR, leCachotExteriorUrl);
  scene.load.image(BUILDING_KEYS.HOSPICE, hospiceUrl);
}
