import { BUILDING_KEYS, BUILDING_NATIVE_SIZE } from '../assets/buildings/lourdesBuildings';
import { RIVER_KEYS, RIVER_NATIVE_SIZE, BRIDGE_NATIVE_SIZE } from '../assets/terrain/lourdesRiver';
import { ORANGE_TREE_KEYS, ORANGE_TREE_NATIVE_SIZE } from '../assets/decorations/orangeTrees';
import { PINE_TREE_KEYS, PINE_TREE_NATIVE_SIZE } from '../assets/decorations/pineTrees';
import { OAK_TREE_KEYS, OAK_TREE_NATIVE_SIZE } from '../assets/decorations/oakTrees';
import type { EditorLayerId } from './mapEditorData';

/**
 * The real PNG assets the map editor can place. Every entry here points at a texture the game
 * already preloads (`BootScene.ts`) -- the editor never generates, redraws, or placeholders
 * artwork, only offers what's genuinely available. Add a new entry here (not a new placeholder)
 * once a new building's real PNG is actually loaded as a texture.
 */
export interface MapAssetDef {
  id: string;
  label: string;
  textureKey: string;
  nativeWidth: number;
  nativeHeight: number;
  /** Reasonable default on-screen height (px) when first placed; width follows the native aspect. */
  defaultDisplayHeight: number;
  defaultLayer: EditorLayerId;
}

export const MAP_ASSET_CATALOG: MapAssetDef[] = [
  // Second full batch for the buildings layer -- replaces the previous location-specific set
  // (Le Cachot/Moulin de Boly/Hospice/Grotto) entirely, per the maintainer's "borra los edificios
  // que te pasé en otro momento, y cambialos por estos". See `lourdesBuildings.ts`'s own doc
  // comment for the full reasoning and per-building identification.
  {
    id: 'cottage_row',
    label: 'Cottage Row',
    textureKey: BUILDING_KEYS.COTTAGE_ROW,
    nativeWidth: BUILDING_NATIVE_SIZE[BUILDING_KEYS.COTTAGE_ROW].width,
    nativeHeight: BUILDING_NATIVE_SIZE[BUILDING_KEYS.COTTAGE_ROW].height,
    defaultDisplayHeight: 96,
    defaultLayer: 'buildings',
  },
  {
    id: 'cottage_corner',
    label: 'Cottage (corner)',
    textureKey: BUILDING_KEYS.COTTAGE_CORNER,
    nativeWidth: BUILDING_NATIVE_SIZE[BUILDING_KEYS.COTTAGE_CORNER].width,
    nativeHeight: BUILDING_NATIVE_SIZE[BUILDING_KEYS.COTTAGE_CORNER].height,
    defaultDisplayHeight: 96,
    defaultLayer: 'buildings',
  },
  {
    id: 'cottage_row_curved',
    label: 'Cottage Row (curved)',
    textureKey: BUILDING_KEYS.COTTAGE_ROW_CURVED,
    nativeWidth: BUILDING_NATIVE_SIZE[BUILDING_KEYS.COTTAGE_ROW_CURVED].width,
    nativeHeight: BUILDING_NATIVE_SIZE[BUILDING_KEYS.COTTAGE_ROW_CURVED].height,
    defaultDisplayHeight: 96,
    defaultLayer: 'buildings',
  },
  {
    id: 'townhouse',
    label: 'Townhouse',
    textureKey: BUILDING_KEYS.TOWNHOUSE,
    nativeWidth: BUILDING_NATIVE_SIZE[BUILDING_KEYS.TOWNHOUSE].width,
    nativeHeight: BUILDING_NATIVE_SIZE[BUILDING_KEYS.TOWNHOUSE].height,
    defaultDisplayHeight: 130,
    defaultLayer: 'buildings',
  },
  {
    id: 'bridge',
    label: 'Bridge',
    textureKey: RIVER_KEYS.BRIDGE,
    nativeWidth: BRIDGE_NATIVE_SIZE.width,
    nativeHeight: BRIDGE_NATIVE_SIZE.height,
    defaultDisplayHeight: 96,
    defaultLayer: 'river',
  },
  {
    id: 'river_segment',
    label: 'River (segment)',
    textureKey: RIVER_KEYS.RIVER,
    nativeWidth: RIVER_NATIVE_SIZE.width,
    nativeHeight: RIVER_NATIVE_SIZE.height,
    defaultDisplayHeight: 96,
    defaultLayer: 'river',
  },
  // Five orange trees (naranjos), supplied for manual placement only -- see
  // `assets/decorations/orangeTrees.ts`'s own doc comment. Never auto-placed anywhere on the map;
  // they only exist here in the palette for the maintainer to place by hand.
  {
    id: 'orange_tree_1',
    label: 'Orange Tree 1',
    textureKey: ORANGE_TREE_KEYS.TREE_1,
    nativeWidth: ORANGE_TREE_NATIVE_SIZE[ORANGE_TREE_KEYS.TREE_1].width,
    nativeHeight: ORANGE_TREE_NATIVE_SIZE[ORANGE_TREE_KEYS.TREE_1].height,
    defaultDisplayHeight: 90,
    defaultLayer: 'decorations',
  },
  {
    id: 'orange_tree_2',
    label: 'Orange Tree 2',
    textureKey: ORANGE_TREE_KEYS.TREE_2,
    nativeWidth: ORANGE_TREE_NATIVE_SIZE[ORANGE_TREE_KEYS.TREE_2].width,
    nativeHeight: ORANGE_TREE_NATIVE_SIZE[ORANGE_TREE_KEYS.TREE_2].height,
    defaultDisplayHeight: 90,
    defaultLayer: 'decorations',
  },
  {
    id: 'orange_tree_3',
    label: 'Orange Tree 3',
    textureKey: ORANGE_TREE_KEYS.TREE_3,
    nativeWidth: ORANGE_TREE_NATIVE_SIZE[ORANGE_TREE_KEYS.TREE_3].width,
    nativeHeight: ORANGE_TREE_NATIVE_SIZE[ORANGE_TREE_KEYS.TREE_3].height,
    defaultDisplayHeight: 90,
    defaultLayer: 'decorations',
  },
  {
    id: 'orange_tree_4',
    label: 'Orange Tree 4',
    textureKey: ORANGE_TREE_KEYS.TREE_4,
    nativeWidth: ORANGE_TREE_NATIVE_SIZE[ORANGE_TREE_KEYS.TREE_4].width,
    nativeHeight: ORANGE_TREE_NATIVE_SIZE[ORANGE_TREE_KEYS.TREE_4].height,
    defaultDisplayHeight: 90,
    defaultLayer: 'decorations',
  },
  {
    id: 'orange_tree_5',
    label: 'Orange Tree 5',
    textureKey: ORANGE_TREE_KEYS.TREE_5,
    nativeWidth: ORANGE_TREE_NATIVE_SIZE[ORANGE_TREE_KEYS.TREE_5].width,
    nativeHeight: ORANGE_TREE_NATIVE_SIZE[ORANGE_TREE_KEYS.TREE_5].height,
    defaultDisplayHeight: 90,
    defaultLayer: 'decorations',
  },
  // Five pine trees (pinos), second of three ordered decoration batches -- same "manual placement
  // only" treatment as the orange trees above. A taller default height than the orange trees since
  // pines are naturally tall/narrow in the supplied art.
  {
    id: 'pine_tree_1',
    label: 'Pine Tree 1',
    textureKey: PINE_TREE_KEYS.TREE_1,
    nativeWidth: PINE_TREE_NATIVE_SIZE[PINE_TREE_KEYS.TREE_1].width,
    nativeHeight: PINE_TREE_NATIVE_SIZE[PINE_TREE_KEYS.TREE_1].height,
    defaultDisplayHeight: 110,
    defaultLayer: 'decorations',
  },
  {
    id: 'pine_tree_2',
    label: 'Pine Tree 2',
    textureKey: PINE_TREE_KEYS.TREE_2,
    nativeWidth: PINE_TREE_NATIVE_SIZE[PINE_TREE_KEYS.TREE_2].width,
    nativeHeight: PINE_TREE_NATIVE_SIZE[PINE_TREE_KEYS.TREE_2].height,
    defaultDisplayHeight: 110,
    defaultLayer: 'decorations',
  },
  {
    id: 'pine_tree_3',
    label: 'Pine Tree 3',
    textureKey: PINE_TREE_KEYS.TREE_3,
    nativeWidth: PINE_TREE_NATIVE_SIZE[PINE_TREE_KEYS.TREE_3].width,
    nativeHeight: PINE_TREE_NATIVE_SIZE[PINE_TREE_KEYS.TREE_3].height,
    defaultDisplayHeight: 110,
    defaultLayer: 'decorations',
  },
  {
    id: 'pine_tree_4',
    label: 'Pine Tree 4',
    textureKey: PINE_TREE_KEYS.TREE_4,
    nativeWidth: PINE_TREE_NATIVE_SIZE[PINE_TREE_KEYS.TREE_4].width,
    nativeHeight: PINE_TREE_NATIVE_SIZE[PINE_TREE_KEYS.TREE_4].height,
    defaultDisplayHeight: 110,
    defaultLayer: 'decorations',
  },
  {
    id: 'pine_tree_5',
    label: 'Pine Tree 5',
    textureKey: PINE_TREE_KEYS.TREE_5,
    nativeWidth: PINE_TREE_NATIVE_SIZE[PINE_TREE_KEYS.TREE_5].width,
    nativeHeight: PINE_TREE_NATIVE_SIZE[PINE_TREE_KEYS.TREE_5].height,
    defaultDisplayHeight: 110,
    defaultLayer: 'decorations',
  },
  // Two oak trees (robles), third and last of the ordered decoration batches -- same manual
  // -placement-only treatment. Wide, rounded canopies (both supplied images are landscape
  // orientation) -- a shorter default height than the pines reads more naturally for that shape.
  {
    id: 'oak_tree_1',
    label: 'Oak Tree 1',
    textureKey: OAK_TREE_KEYS.TREE_1,
    nativeWidth: OAK_TREE_NATIVE_SIZE[OAK_TREE_KEYS.TREE_1].width,
    nativeHeight: OAK_TREE_NATIVE_SIZE[OAK_TREE_KEYS.TREE_1].height,
    defaultDisplayHeight: 100,
    defaultLayer: 'decorations',
  },
  {
    id: 'oak_tree_2',
    label: 'Oak Tree 2',
    textureKey: OAK_TREE_KEYS.TREE_2,
    nativeWidth: OAK_TREE_NATIVE_SIZE[OAK_TREE_KEYS.TREE_2].width,
    nativeHeight: OAK_TREE_NATIVE_SIZE[OAK_TREE_KEYS.TREE_2].height,
    defaultDisplayHeight: 100,
    defaultLayer: 'decorations',
  },
];

export function getMapAssetDef(id: string): MapAssetDef | undefined {
  return MAP_ASSET_CATALOG.find((a) => a.id === id);
}
