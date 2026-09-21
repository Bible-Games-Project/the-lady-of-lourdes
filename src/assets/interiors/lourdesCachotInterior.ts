import Phaser from 'phaser';
import cachotRoomUrl from './cachot_room.png';

/**
 * The maintainer's own second-pass artwork for Le Cachot's interior (isometric jail-cell room:
 * barred window, cross and framed picture on the back wall, a shelf, the bed along the left wall,
 * a wash basin/towel bench, the dining table and chair, a chest and jug, a woven rug under the
 * window's light beam, and a closed wooden door at the south wall), used as the permanent
 * backdrop. This **fully replaces** the previous room artwork per an explicit "completely replace
 * the current interior artwork" ask — not a patch, not a recolor, not blended with the old image.
 *
 * The supplied source arrived as a lossy WebP (360138-byte precedent: this is the same situation
 * `assets/town/lourdesTown.ts` documents for the town PNG — the only copy available, already
 * through one lossy encoding step before it ever reached this codebase, so "preserve exactly as
 * provided" means preserving *this* file's own pixels, not chasing a losslessness the source
 * never had). Converted straight to PNG, cropped tight to its own real content (the transparent
 * margin around the isometric room shape — verified via an alpha-channel bounding-box scan, not
 * eyeballed, native crop 915x1009), then given a single quality (`Image.LANCZOS`) downscale
 * straight to final display size (214x236) — the same "resize once offline with a quality filter,
 * never touch it again at runtime" rule every character sprite and the previous room art already
 * followed. No recolor, no redraw, no patch, no added detail.
 *
 * **A single flat backdrop image, no separate front-wall overlay this time.** The previous room's
 * `CACHOT_FRONT_WALL_KEY` duplicate existed for exactly one reason: that art's door was drawn
 * half-open, with a genuine walkable gap onto visible steps, and Bernadette needed to visually
 * disappear behind the wooden beam capping that gap as she walked through it. This new door is
 * drawn fully closed (a solid door leaf, not an open gap — see `CachotScene.ts`'s own door
 * measurements) with no walkable space behind any part of it, and nothing else in this room (no
 * freestanding pillar, rail, or mid-room overhang) has a foreground element Bernadette could ever
 * pass behind either — every piece of furniture sits flush against a wall or fully exposed on the
 * open floor. The one‑depth-per-object rule this game already uses everywhere (the room backdrop
 * fixed at `DEPTH.GROUND`, always behind the player's own always-higher `DEPTH.ACTORS`-based
 * depth) already guarantees "the floor never covers her" on its own here, with nothing left for a
 * second overlay layer to add. See `CachotScene.ts` for the full collider rebuild and this
 * decision's own verification.
 */
export const CACHOT_ROOM_KEY = 'lourdes_cachot_room';

/** Native/display pixel size of the room backdrop (pre-sized to this exact size offline, so no
 * runtime scaling is needed at all — avoids any nearest-neighbor downscale aliasing). */
export const CACHOT_ROOM_WIDTH = 214;
export const CACHOT_ROOM_HEIGHT = 236;

export function preloadLourdesCachotInterior(scene: Phaser.Scene): void {
  scene.load.image(CACHOT_ROOM_KEY, cachotRoomUrl);
}
