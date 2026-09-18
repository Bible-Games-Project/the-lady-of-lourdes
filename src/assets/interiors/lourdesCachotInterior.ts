import Phaser from 'phaser';
import cachotRoomUrl from './cachot_room.png';
import cachotFrontWallUrl from './cachot_frontwall.png';

/**
 * The maintainer's own artwork for Le Cachot's interior (isometric room: hearth, bed, dining
 * table, dresser, chest, spinning wheel, front door), used as the permanent backdrop. Recovered
 * byte-for-byte from the conversation that supplied it, then only cropped and resized — never
 * redrawn, recolored, or altered — per an explicit "preserve it faithfully" ask, restored exactly
 * (the maintainer flagged a previous pass's clone-stamp patch over the upper chair as an unwanted
 * "reconstruction"; `cachot_room.png` is now byte-for-byte the original supplied image again,
 * chair included).
 *
 * **Two images, not one**, for the "walk behind the front wall" effect `CachotScene.ts` needs:
 * `CACHOT_ROOM_KEY` is the full room (used as the permanent backdrop, always behind the player),
 * and `CACHOT_FRONT_WALL_KEY` is a second copy of just the bottom strip (the low stone wall, door,
 * lantern, and wooden beam over the doorway) cropped from the *same* source pixels at the *same*
 * scale. The front-wall copy is positioned to sit exactly on top of where that same strip already
 * appears in the room backdrop, then Y-sorted against the player every frame the same way
 * `OverworldScene.ts#addFootprintBuilding()` already sorts the church/presbytery against her: one
 * depth value fixed from the wooden beam's own ground line, compared each frame against
 * `depthForY(player.y, ...)`. Since the wall copy is pixel-identical to what's already drawn
 * beneath it, there's no seam — it only adds the occlusion capability the single flat backdrop
 * can't provide on its own (she can walk through the open half of the doorway and appear behind
 * the beam as she does; she was never going to reach the solid stone either side of the door, so
 * the overlay covering that too is harmless). See `CachotScene.ts` for the actual placement/depth
 * math and for why this was deleted-then-restored: an earlier pass in this same session removed it
 * in favor of a plain solid wall, which the maintainer then asked to be reverted because it lost
 * the walk-behind-the-beam effect at the doorway.
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
export const CACHOT_FRONT_WALL_KEY = 'lourdes_cachot_front_wall';

/** Native/display pixel size of the room backdrop (pre-sized to this exact size offline, so no
 * runtime scaling is needed at all — avoids any nearest-neighbor downscale aliasing). */
export const CACHOT_ROOM_WIDTH = 290;
export const CACHOT_ROOM_HEIGHT = 236;

/** The front-wall crop's own size, and the Y (in the *room backdrop's own local coordinates*,
 * i.e. relative to the room image's top-left) where it must be placed so it lines up exactly with
 * the matching strip already drawn in the room backdrop. Crop starts at local y158 (world y180) --
 * enough headroom above the wooden beam's own anchor line for Bernadette's sprite to have real
 * pixels to visually overlap/hide against as she approaches it, while staying south of the dining
 * table's own footprint so this copy can never affect sorting anywhere else in the room. Same
 * source pixels, same scale as the room backdrop; the extra floor at the top of this crop is
 * pixel-identical to what's already drawn there in the backdrop, so there's no seam. */
export const CACHOT_FRONT_WALL_WIDTH = 290;
export const CACHOT_FRONT_WALL_HEIGHT = 78;
export const CACHOT_FRONT_WALL_LOCAL_Y = 158;

export function preloadLourdesCachotInterior(scene: Phaser.Scene): void {
  scene.load.image(CACHOT_ROOM_KEY, cachotRoomUrl);
  scene.load.image(CACHOT_FRONT_WALL_KEY, cachotFrontWallUrl);
}
