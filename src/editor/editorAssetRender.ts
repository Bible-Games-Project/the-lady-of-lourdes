import Phaser from 'phaser';
import { DEPTH } from '../core/constants';
import { depthForY } from '../gameplay/utils';
import { createBlocker } from '../gameplay/utils';
import { getMapAssetDef } from './mapAssetCatalog';
import type { EditorLayerId, EditorPlacedAsset } from './mapEditorData';

type ColliderBody = Phaser.Types.Physics.Arcade.ImageWithStaticBody | Phaser.GameObjects.Zone;

export interface EditorAssetInstance {
  image: Phaser.GameObjects.Image;
  data: EditorPlacedAsset;
  /** The base-footprint collider this instance currently owns, if its layer is one that gets one
   * (`buildings`/`decorations` -- see `applyInstanceCollider()`) -- tracked here (not just pushed
   * into the shared `colliderBodies` array and forgotten) so it can be torn down and recreated
   * whenever the instance moves/rescales/gets deleted, the same way `EditorZoneColliderRegistry`
   * tracks one collider per zone for the same reason. */
  collider?: Phaser.GameObjects.Zone;
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

/** Fraction of the placed image's own display width/height the base-footprint collider (see
 * `applyInstanceCollider()`) covers -- a narrow band hugging the bottom edge, not the whole sprite,
 * so the Y-sort depth system (`applyInstanceDepth()` above) still reads as "walk behind the
 * canopy/roofline" while the trunk/wall base genuinely blocks the player. Same spirit as
 * `OverworldScene.ts`'s own hand-placed decor props (`addStaticProp()`: `width * 0.7`, `height *
 * 0.35`) and the feet-only colliders every character uses (`NpcActor.ts`'s `FEET_*_FRAC`) -- a
 * small physical footprint near the ground-contact point, not a bounding-box block. One shared
 * fraction for every tree/building rather than a per-asset value, matching the painted zone
 * system's own "MVP approximation: bounding box, not exact shape" trade-off (`editorZoneRender.ts`).
 */
const FOOTPRINT_WIDTH_FRAC = 0.5;
const FOOTPRINT_HEIGHT_FRAC = 0.22;

/**
 * Gives a placed tree/building instance a small static collider at its own base, so the player can
 * still walk behind it (depth-sorted, per `applyInstanceDepth()`) but not through its trunk/wall
 * footprint -- the maintainer's explicit request: "tanto en árboles como casas, le añadas colliders.
 * Que pueda caminar por detrás, pero que no los pueda atravesar por la base." Every other layer
 * (`river`, `ground`) keeps the exact behavior it always had: no automatic collider at all, only a
 * hand-painted BLOCKED zone creates real collision there, same as before this function existed.
 *
 * Always tears down and recreates the instance's existing collider (if any) first, so this is safe
 * to call repeatedly as the instance moves (drag) or rescales (+/- buttons), not just once at
 * creation -- `instance.collider` is how it finds what to tear down. Called from the one shared
 * `createEditorAssetInstance()` below (covering both `OverworldScene.ts`'s unconditional real
 * -gameplay load and `MapEditorPanel.ts`'s own `placeAsset()`), and must also be called again by
 * `MapEditorPanel.ts` itself after any drag/rescale that changes the image's position or
 * display size.
 */
export function applyInstanceCollider(scene: Phaser.Scene, instance: EditorAssetInstance, colliderBodies: ColliderBody[]): void {
  if (instance.collider) {
    const idx = colliderBodies.indexOf(instance.collider);
    if (idx !== -1) colliderBodies.splice(idx, 1);
    instance.collider.destroy();
    instance.collider = undefined;
  }

  const { layer } = instance.data;
  if (layer !== 'buildings' && layer !== 'decorations') return;

  const { image } = instance;
  const footWidth = Math.max(2, image.displayWidth * FOOTPRINT_WIDTH_FRAC);
  const footHeight = Math.max(2, image.displayHeight * FOOTPRINT_HEIGHT_FRAC);
  // Image origin is (0.5, 1) -- its own (x, y) already sits at the bottom-center "ground contact"
  // point, so the footprint just needs to sit just above that, not re-derive it.
  const collider = createBlocker(scene, image.x, image.y - footHeight / 2, footWidth, footHeight);
  colliderBodies.push(collider);
  instance.collider = collider;
}

/** Builds the visible `Image` for one saved placement. Returns `null` if its `assetId` no longer
 * matches anything in the catalog (e.g. stale saved data from a renamed/removed entry) rather than
 * throwing -- a missing asset should never crash the whole map's load. */
export function createEditorAssetInstance(scene: Phaser.Scene, data: EditorPlacedAsset, colliderBodies: ColliderBody[]): EditorAssetInstance | null {
  const def = getMapAssetDef(data.assetId);
  if (!def) return null;
  const image = scene.add.image(data.x, data.y, def.textureKey).setOrigin(0.5, 1);
  const instance: EditorAssetInstance = { image, data };
  applyInstanceSize(image, data.assetId, data.scale);
  applyInstanceDepth(image, data.layer);
  applyInstanceCollider(scene, instance, colliderBodies);
  return instance;
}
