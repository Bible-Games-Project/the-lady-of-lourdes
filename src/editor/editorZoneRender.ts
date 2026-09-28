import Phaser from 'phaser';
import { createBlocker } from '../gameplay/utils';
import type { EditorZone } from './mapEditorData';

type ColliderBody = Phaser.Types.Physics.Arcade.ImageWithStaticBody | Phaser.GameObjects.Zone;

/** Live registries shared between `OverworldScene` (which must load saved zones regardless of
 * `DEV_MODE` -- a saved BLOCKED area is part of the map's real collision, not an editor-only
 * artifact) and `MapEditorPanel` (which adds/removes entries in it, only constructed when
 * `DEV_MODE` is on). `EditorZoneColliderRegistry` tracks the one collider each BLOCKED zone owns,
 * so it can be removed again if that zone is deleted. */
export type EditorZoneRegistry = Map<string, EditorZone>;
export type EditorZoneColliderRegistry = Map<string, Phaser.GameObjects.Zone>;

export function zoneBounds(zone: EditorZone): { x: number; y: number; width: number; height: number } {
  const xs = zone.points.map((p) => p.x);
  const ys = zone.points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { x: minX, y: minY, width: Math.max(1, maxX - minX), height: Math.max(1, maxY - minY) };
}

/**
 * MVP approximation: a painted zone's real runtime footprint (currently only meaningful for
 * `blocked`) is its axis-aligned bounding box, not the exact polygon -- Arcade Physics (what the
 * rest of this game's collision already runs on, see `gameplay/utils.ts#createBlocker`) has no
 * native arbitrary-polygon body, and adding one (e.g. switching to Matter) is well outside a
 * focused MVP. The polygon itself is still stored/drawn exactly as painted for visual fidelity and
 * future refinement (e.g. decomposing it into several smaller rectangles for a tighter fit).
 *
 * Called both unconditionally on scene load (`OverworldScene.ts#loadEditorZones()` -- a saved
 * blocked area must keep blocking players regardless of `DEV_MODE`) and live from
 * `MapEditorPanel.ts` when a new zone is painted.
 */
export function createZoneCollider(scene: Phaser.Scene, zone: EditorZone): Phaser.GameObjects.Zone {
  const b = zoneBounds(zone);
  return createBlocker(scene, b.x + b.width / 2, b.y + b.height / 2, b.width, b.height);
}

export function addZoneCollider(
  scene: Phaser.Scene,
  zone: EditorZone,
  zoneColliders: EditorZoneColliderRegistry,
  colliderBodies: ColliderBody[],
): void {
  const collider = createZoneCollider(scene, zone);
  zoneColliders.set(zone.id, collider);
  colliderBodies.push(collider);
}

export function removeZoneCollider(zoneId: string, zoneColliders: EditorZoneColliderRegistry, colliderBodies: ColliderBody[]): void {
  const collider = zoneColliders.get(zoneId);
  if (!collider) return;
  const idx = colliderBodies.indexOf(collider);
  if (idx !== -1) colliderBodies.splice(idx, 1);
  collider.destroy();
  zoneColliders.delete(zoneId);
}
