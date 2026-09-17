import Phaser from 'phaser';
import cachotRoomUrl from './cachot_room.png';

/**
 * The maintainer's own artwork for Le Cachot's interior (isometric room: hearth, bed, dining
 * table, dresser, chest, spinning wheel, front door), used as the permanent backdrop.
 * Recovered byte-for-byte from the conversation that supplied it, then only cropped and
 * resized — never redrawn, recolored, or altered — per an explicit "preserve it faithfully" ask.
 * The one exception is the small patch over the upper dining chair (see `CachotScene.ts`'s own
 * doc comment on chair removal for why and how), still done as a pixel clone from this same
 * artwork's own floor rather than a redraw.
 *
 * **No longer two images.** This used to also ship `CACHOT_FRONT_WALL_KEY`/`CACHOT_CHAIR_NORTH_KEY`,
 * second copies of the lower wall and the north chair Y-sorted against the player every frame to
 * let her walk visually "behind" them. The maintainer asked to remove that entirely: the lower
 * wall is now a plain solid collider (see `CachotScene.ts`), and the chair itself is gone from the
 * art, so neither walk-behind copy has anything left to do. Deleted rather than left unused.
 *
 * **Why not color-quantized like `lourdesChurch.ts`/`lourdesPresbytery.ts`**: those assets
 * deliberately quantize to a small flat-color palette because they're small map-scale sprites
 * meant to read as pixel art at building scale. This room is the explicit subject of a "do not
 * change the colors... preserve the original pixel-art style" instruction, and quantizing would
 * measurably alter its colors — so this asset keeps its full original color range. The one
 * offline step taken is a single quality (`Image.LANCZOS`) resize straight to final display size,
 * matching the same "resize once with a quality filter, then never touch it again at runtime"
 * rule every character sprite in this game already follows — see `registerLourdesCachotInterior()`
 * below for why no `setFilter(LINEAR)` call happens either.
 */
export const CACHOT_ROOM_KEY = 'lourdes_cachot_room';

/** Native/display pixel size of the room backdrop (pre-sized to this exact size offline, so no
 * runtime scaling is needed at all — avoids any nearest-neighbor downscale aliasing). */
export const CACHOT_ROOM_WIDTH = 290;
export const CACHOT_ROOM_HEIGHT = 236;

export function preloadLourdesCachotInterior(scene: Phaser.Scene): void {
  scene.load.image(CACHOT_ROOM_KEY, cachotRoomUrl);
}
