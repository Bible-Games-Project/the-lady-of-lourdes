import Phaser from 'phaser';
import { DEPTH } from '../core/constants';
import { depthForY } from '../gameplay/utils';
import { getMapAssetDef } from './mapAssetCatalog';
import type { EditorLayerId, EditorPlacedAsset } from './mapEditorData';

export interface EditorAssetInstance {
  image: Phaser.GameObjects.Image;
  data: EditorPlacedAsset;
}

/** Live, mutable registry shared between `OverworldScene` (which must render this regardless of
 * `DEV_MODE` -- a saved layout is part of the map, not an editor-only artifact) and `MapEditorPanel`
 * (which adds/moves/removes entries in it, only constructed when `DEV_MODE` is on). */
export type EditorAssetRegistry = Map<string, EditorAssetInstance>;

export function applyInstanceSize(image: Phaser.GameObjects.Image, assetId: string, scale: number): void {
  const def = getMapAssetDef(assetId);
  if (!def) return;
  const h = def.defaultDisplayHeight * scale;
  const w = h * (def.nativeWidth / def.nativeHeight);
  image.setDisplaySize(w, h);
}

/** Same Y-sort convention `OverworldScene.ts` already uses for every other prop/building/NPC
 * (`depthForY`); river-layer placements get a fixed depth just above the ground layer, matching the
 * real river/bridge's own convention in `OverworldScene.ts#buildRiverAndBridge()`. */
export function applyInstanceDepth(image: Phaser.GameObjects.Image, layer: EditorLayerId): void {
  if (layer === 'buildings' || layer === 'decorations' || layer === 'characters') {
    image.setDepth(depthForY(image.y, DEPTH.ACTORS));
  } else if (layer === 'river') {
    image.setDepth(DEPTH.GROUND + 1);
  } else {
    image.setDepth(DEPTH.GROUND);
  }
}

/** Builds the visible `Image` for one saved placement. Returns `null` if its `assetId` no longer
 * matches anything in the catalog (e.g. stale saved data from a renamed/removed entry) rather than
 * throwing -- a missing asset should never crash the whole map's load. */
export function createEditorAssetInstance(scene: Phaser.Scene, data: EditorPlacedAsset): EditorAssetInstance | null {
  const def = getMapAssetDef(data.assetId);
  if (!def) return null;
  const image = scene.add.image(data.x, data.y, def.textureKey).setOrigin(0.5, 1);
  applyInstanceSize(image, data.assetId, data.scale);
  applyInstanceDepth(image, data.layer);
  return { image, data };
}
