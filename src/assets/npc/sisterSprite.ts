import Phaser from 'phaser';
import { textureKeyFor, walkAnimKeyFor } from '../../pixelart/characters';
import sideIdleUrl from './sister_side_idle.png';
import backIdleUrl from './sister_back_idle.png';
import frontIdleUrl from './sister_front_idle.png';

/**
 * Third full swap of the sister's artwork (`CharacterId: 'sister'`) — same character, same story
 * role/dialogue/follow behavior, only the art changed, per explicit request ("I don't like the
 * current artwork... use Bernadette's spritesheet as the direct visual reference").
 *
 * Derived directly from Bernadette's own front/back/side idle PNGs (`assets/player/bernadette_
 * *_idle.png`) via a per-pixel HSV recolor, not freehand redrawing: every opaque pixel is first
 * classified into one of her garment materials (headwear / poncho-cloak / skirt) by nearest-color
 * match against reference swatches sampled from Bernadette's own art, gated by rough head/torso/
 * lower vertical bands per facing so a cool-toned shadow on the headwear can't get pulled all the
 * way to the skirt label just because its raw color happens to sit closer to a skirt swatch (this
 * happened on the first attempt -- the artist renders shadow on both the cream hood and the blue
 * skirt in similar cool blue-greys, confirmed by sampling, so color alone isn't always enough to
 * tell them apart). Each material then has its hue+saturation replaced by a new target while its
 * original value/lightness is preserved (stretched into a lighter range for the two materials
 * recolored toward white) -- so every existing shading band, fold, and fabric-texture variation in
 * Bernadette's own linework survives untouched, just recolored; this is a deterministic per-pixel
 * lookup on the same pixel grid, not a resample -- no blur, no new linework, no proportion changes.
 * Skin, boots, and outline/shadow pixels are left as Bernadette's own original pixels throughout.
 *
 * Result: headwear -> a crisp white coif/veil, poncho/cloak -> a light grey mantle (its original
 * woven-stripe pattern survives as visible fabric texture/trim, not removed), skirt -> a near
 * -black habit skirt -- a plausible 19th-century French religious sister's habit (the Sisters of
 * Nevers, the congregation Bernadette herself later joined, wore almost exactly this black-habit/
 * white-coif combination), and reads as clearly distinct from Bernadette's blue dress/brown poncho
 * at a glance while being unmistakably "the same game's art."
 *
 * No walk-cycle deformation: because this art is geometrically identical to Bernadette's own idle
 * poses (only recolored, no silhouette change), the same measured limitation applies here that
 * applies to her -- there is no usable pixel margin around the boots or hands in this artwork to
 * shift a patch into without overlapping real habit/cloak fabric (see `Player.ts`'s own git history
 * for that measurement). `registerSisterSprite()` below registers a single-frame "walk" animation
 * (just the idle texture) purely so `NpcActor.ts`'s shared `applyAnimState()` -- which unconditionally
 * calls `this.play(walkAnimKeyFor(...))` while any NPC is moving, mother/friend/boy included -- has
 * a valid animation key to play; visually she simply keeps her idle pose while walking, exactly
 * like Bernadette, for the same reason.
 */
export const SISTER_FRAME_HEIGHT = Math.round(42 * 0.85);

const URLS_BY_FACING = {
  side: sideIdleUrl,
  up: backIdleUrl,
  down: frontIdleUrl,
} as const;
const ALL_FACINGS = ['down', 'up', 'side'] as const;

export function preloadSisterSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    scene.load.image(textureKeyFor('sister', facing, null), URLS_BY_FACING[facing]);
  });
}

/** `LINEAR` filtering -- real painted/shaded art at a large native resolution downscaled to
 * display size, same category as Bernadette/buildings/trees, not the flat procedural characters
 * NEAREST is for. */
export function registerSisterSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    const idleKey = textureKeyFor('sister', facing, null);
    scene.textures.get(idleKey).setFilter(Phaser.Textures.FilterMode.LINEAR);

    const animKey = walkAnimKeyFor('sister', facing);
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: [{ key: idleKey }],
        frameRate: 1,
        repeat: -1,
      });
    }
  });
}
