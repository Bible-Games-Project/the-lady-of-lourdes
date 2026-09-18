import Phaser from 'phaser';
import unit1Url from './cachot_exterior_unit1.png';
import unit2Url from './cachot_exterior_unit2.png';
import unit3Url from './cachot_exterior_unit3.png';
import unit4Url from './cachot_exterior_unit4.png';
import unit5Url from './cachot_exterior_unit5.png';

/**
 * The maintainer's own artwork for Le Cachot's map building: a 5-unit stone terrace row, with
 * Le Cachot itself as the middle (3rd) unit — its own door, sitting beside a barred ground-floor
 * window (a striking, presumably deliberate detail: Le Cachot was a former town jail cell before
 * the Soubirous family rented it). Replaces the old `PROP_KEYS.CACHOT_EXTERIOR` procedural
 * placeholder (a single 48x40 box) that `OverworldScene.ts#buildBuildings()` used to place.
 * Recovered byte-for-byte, never redrawn/recolored — only cropped and resized, same reasoning as
 * `assets/interiors/lourdesCachotInterior.ts` (full original colors kept, no quantization).
 *
 * **Sliced into 5 separate images, one per unit, not used as a single flat image.** The building
 * is wide enough (5 house-widths) that its own front wall sits at meaningfully different screen-Y
 * per unit (the whole row recedes upward toward the right in this isometric art), so a *single*
 * fixed Y-sort depth for the entire building — the same trick `OverworldScene.ts
 * #addFootprintBuilding()` already uses for the (much narrower) church/presbytery — would be
 * visibly wrong for whichever units sit far from that one anchor line. Slicing at the exact pixel
 * boundaries between units (so they still reassemble edge-to-edge with zero gap or overlap, as if
 * still one image) lets each unit get its *own* depth anchor and its own footprint colliders,
 * while reusing the exact same per-building primitives (`addStaticProp`-style image placement,
 * `createBlocker()`, `depthForY()`) OverworldScene already has — see
 * `buildCachotExterior()` in `OverworldScene.ts` for the placement/collider/depth wiring.
 *
 * Only the middle unit (`CACHOT_EXTERIOR_UNITS[2]`) is interactive: its own door is a walkable gap
 * in that unit's footprint colliders, triggering the exact same `cachotDoorZone`-driven scene
 * transition to `CachotScene` the game already had. The other 4 units are solid background
 * architecture only — footprint-collided and depth-sorted like the middle one, but no door gap, no
 * location label, no interaction — this round's brief only asked for Le Cachot's own entrance to
 * be functional.
 */
export const CACHOT_EXTERIOR_UNIT_KEYS = [
  'lourdes_cachot_ext_unit1',
  'lourdes_cachot_ext_unit2',
  'lourdes_cachot_ext_unit3',
  'lourdes_cachot_ext_unit4',
  'lourdes_cachot_ext_unit5',
] as const;

const UNIT_URLS = [unit1Url, unit2Url, unit3Url, unit4Url, unit5Url];

/** Display width of each unit, left to right — together they sum to the full building's *native*
 * pixel width (241px) with zero gap, since the slices were cut at exact pixel boundaries.
 * `CACHOT_EXTERIOR_SCALE` (below) is what actually determines the *displayed* size in
 * `OverworldScene.ts` — these stay the raw native numbers so the door-local/ground-line math there
 * has one single place to apply the scale, rather than every constant already being pre-multiplied
 * and needing to be un-multiplied whenever the native pixel geometry actually matters. */
export const CACHOT_EXTERIOR_UNIT_WIDTHS = [48, 45, 45, 48, 55] as const;
export const CACHOT_EXTERIOR_HEIGHT = 144;

/** The building is displayed at 2x its native pixel size — "the individual PNG floors/sections of
 * Le Cachot should be displayed at 2x their current visual size... the building itself should
 * become physically larger in the world," per an explicit maintainer ask, not a camera zoom (the
 * world/collision geometry actually doubles too — see `OverworldScene.ts#buildCachotExterior()`).
 * Applied via `Image#setDisplaySize`, same as the church/presbytery already do — still
 * nearest-neighbor filtered (this key is never added to `BootScene`'s LINEAR-filter list), so
 * doubling is a clean 1-source-px-to-2x2-screen-px block enlargement with no blur/resampling. */
export const CACHOT_EXTERIOR_SCALE = 2;

/** Index into `CACHOT_EXTERIOR_UNIT_KEYS` of the unit that is actually Le Cachot (the middle one). */
export const CACHOT_EXTERIOR_CACHOT_UNIT_INDEX = 2;

export function preloadLourdesCachotExterior(scene: Phaser.Scene): void {
  CACHOT_EXTERIOR_UNIT_KEYS.forEach((key, i) => scene.load.image(key, UNIT_URLS[i]));
}
