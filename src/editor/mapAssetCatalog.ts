import { BUILDING_KEYS, BUILDING_NATIVE_SIZE } from '../assets/buildings/lourdesBuildings';
import { RIVER_KEYS, RIVER_NATIVE_SIZE, BRIDGE_NATIVE_SIZE } from '../assets/terrain/lourdesRiver';
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
  {
    id: 'le_cachot_exterior',
    label: 'Le Cachot',
    textureKey: BUILDING_KEYS.LE_CACHOT_EXTERIOR,
    nativeWidth: BUILDING_NATIVE_SIZE[BUILDING_KEYS.LE_CACHOT_EXTERIOR].width,
    nativeHeight: BUILDING_NATIVE_SIZE[BUILDING_KEYS.LE_CACHOT_EXTERIOR].height,
    defaultDisplayHeight: 76,
    defaultLayer: 'buildings',
  },
  {
    id: 'moulin_de_boly',
    label: 'Moulin de Boly',
    textureKey: BUILDING_KEYS.MOULIN_DE_BOLY,
    nativeWidth: BUILDING_NATIVE_SIZE[BUILDING_KEYS.MOULIN_DE_BOLY].width,
    nativeHeight: BUILDING_NATIVE_SIZE[BUILDING_KEYS.MOULIN_DE_BOLY].height,
    defaultDisplayHeight: 132,
    defaultLayer: 'buildings',
  },
  {
    id: 'hospice',
    label: 'Hospice',
    textureKey: BUILDING_KEYS.HOSPICE,
    nativeWidth: BUILDING_NATIVE_SIZE[BUILDING_KEYS.HOSPICE].width,
    nativeHeight: BUILDING_NATIVE_SIZE[BUILDING_KEYS.HOSPICE].height,
    defaultDisplayHeight: 104,
    defaultLayer: 'buildings',
  },
  {
    id: 'grotto_massabielle',
    label: 'Grotto',
    textureKey: BUILDING_KEYS.GROTTO_MASSABIELLE,
    nativeWidth: BUILDING_NATIVE_SIZE[BUILDING_KEYS.GROTTO_MASSABIELLE].width,
    nativeHeight: BUILDING_NATIVE_SIZE[BUILDING_KEYS.GROTTO_MASSABIELLE].height,
    defaultDisplayHeight: 110,
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
];

export function getMapAssetDef(id: string): MapAssetDef | undefined {
  return MAP_ASSET_CATALOG.find((a) => a.id === id);
}
