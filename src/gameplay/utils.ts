import type Phaser from 'phaser';

export interface Point {
  x: number;
  y: number;
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function isNear(a: Point, b: Point, radius: number): boolean {
  return distance(a, b) <= radius;
}

/** Depth for simple Y-sorting: same base for every world sprite so ordering reflects vertical position. */
export function depthForY(y: number, base: number): number {
  return base + y / 10000;
}

/** Invisible static collider rectangle (center-based), e.g. to keep the player out of river water. */
export function createBlocker(
  scene: Phaser.Scene,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
): Phaser.GameObjects.Zone {
  const zone = scene.add.zone(centerX, centerY, width, height);
  scene.physics.add.existing(zone, true);
  return zone;
}
