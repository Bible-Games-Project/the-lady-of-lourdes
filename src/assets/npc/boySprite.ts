import Phaser from 'phaser';
import { textureKeyFor, walkAnimKeyFor } from '../../pixelart/characters';
import sideIdleUrl from './boy_side_idle.png';
import sideWalkAUrl from './boy_side_walk_a.png';
import sideWalkBUrl from './boy_side_walk_b.png';
import backIdleUrl from './boy_back_idle.png';
import backWalkAUrl from './boy_back_walk_a.png';
import backWalkBUrl from './boy_back_walk_b.png';
import frontIdleUrl from './boy_front_idle.png';
import frontWalkAUrl from './boy_front_walk_a.png';
import frontWalkBUrl from './boy_front_walk_b.png';

/**
 * The maintainer's own artwork for a random village boy NPC (`CharacterId: 'boy'`), recovered
 * byte-for-byte from the conversation that supplied it — never redrawn/recolored. Same side/front/
 * back reference-sheet approach and generation pipeline as `assets/npc/jeanneSprite.ts` (single-
 * direction skirt/tunic shear, two independently-shifted hand regions since this source's hands
 * hang separately at his sides rather than clasped, independent left/right boot shifts, idle =
 * direct clean resize — see that file's doc comment for the full writeup).
 *
 * **Sized at 80% of Bernadette's own height** (`BOY_FRAME_HEIGHT` below, `round(42 * 0.8)` = 34px)
 * per an explicit "about 20% smaller than Bernadette/the player" ask — he's a younger child, not a
 * peer like Jeanne. Own named constant (not imported from `bernadetteSprite.ts`) for the same
 * reason `SISTER_FRAME_HEIGHT`/`JEANNE_FRAME_HEIGHT` are each their own constant: no dependency on
 * that module merely to reuse a number.
 *
 * This is a brand-new `CharacterId` (not a previously-procedural placeholder like friend/sister/
 * mother were) — added directly as real art, registered in `REAL_ART_CHARACTER_IDS`
 * (`pixelart/characters.ts`) so the procedural paper-doll loop never runs for him.
 */
export const BOY_FRAME_HEIGHT = Math.round(42 * 0.8);

const URLS_BY_FACING = {
  side: { idle: sideIdleUrl, a: sideWalkAUrl, b: sideWalkBUrl },
  up: { idle: backIdleUrl, a: backWalkAUrl, b: backWalkBUrl },
  down: { idle: frontIdleUrl, a: frontWalkAUrl, b: frontWalkBUrl },
} as const;
const ALL_FACINGS = ['down', 'up', 'side'] as const;

export function preloadBoySprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    const urls = URLS_BY_FACING[facing];
    scene.load.image(textureKeyFor('boy', facing, null), urls.idle);
    scene.load.image(textureKeyFor('boy', facing, 'a'), urls.a);
    scene.load.image(textureKeyFor('boy', facing, 'b'), urls.b);
  });
}

/** Deliberately does not call `setFilter(LINEAR)` — same reasoning as every other real-art
 * character: stay on Phaser's NEAREST default so he reads as crisp pixel art, not a blurred
 * silhouette, on every scale-up. */
export function registerBoySprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    const animKey = walkAnimKeyFor('boy', facing);
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: [
          { key: textureKeyFor('boy', facing, 'a') },
          { key: textureKeyFor('boy', facing, null) },
          { key: textureKeyFor('boy', facing, 'b') },
          { key: textureKeyFor('boy', facing, null) },
        ],
        frameRate: 6,
        repeat: -1,
      });
    }
  });
}
