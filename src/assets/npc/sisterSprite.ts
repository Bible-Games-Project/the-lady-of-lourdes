import Phaser from 'phaser';
import { textureKeyFor, walkAnimKeyFor } from '../../pixelart/characters';
import sideIdleUrl from './sister_side_idle.png';
import sideWalkAUrl from './sister_side_walk_a.png';
import sideWalkBUrl from './sister_side_walk_b.png';
import backIdleUrl from './sister_back_idle.png';
import backWalkAUrl from './sister_back_walk_a.png';
import backWalkBUrl from './sister_back_walk_b.png';
import frontIdleUrl from './sister_front_idle.png';
import frontWalkAUrl from './sister_front_walk_a.png';
import frontWalkBUrl from './sister_front_walk_b.png';

/**
 * The maintainer's own artwork for Bernadette's younger sister (`CharacterId: 'sister'`), recovered
 * byte-for-byte from the conversation that supplied it — never redrawn/recolored. Same 3-panel
 * (side/front/back) reference-sheet approach as `assets/player/bernadetteSprite.ts`, and this
 * `CharacterId` already existed (previously rendering the procedural placeholder from
 * `pixelart/characters.ts#CHARACTERS.sister`) — she's placed by `OverworldScene.ts` as an
 * `NpcActor` near the Cachot door; nothing about that placement or `NpcActor`'s own
 * facing/walk-animation/shadow logic needed to change, since it already addresses characters
 * purely through `textureKeyFor`/`walkAnimKeyFor`.
 *
 * **Sized at 85% of Bernadette's own height** (`SISTER_FRAME_HEIGHT` below, `round(42 * 0.85)` —
 * an explicit maintainer request: "she is her younger sister" — Bernadette's real reference is the
 * `BERNADETTE_FRAME_HEIGHT` constant in `bernadetteSprite.ts`) rather than the shared 42px every
 * other real-art character uses. Each of the 3 source panels was cropped to its own alpha bounding
 * box and resized to this same shared height, same reasoning as Bernadette's own pipeline: keeps
 * her ground-contact point and apparent scale consistent when the facing switches.
 *
 * Walk-cycle frames (`_walk_a/b.png`) use the same cutout-puppet deformation technique documented
 * for Bernadette (AGENTS.md) — generated offline in Python at a padded ~60px-tall intermediate
 * size, then downscaled once to final size — with two adaptations made for this specific source
 * art, not deviations from the recipe out of laziness:
 *  - **Single-direction skirt shear for every view, not a mirrored per-half twist.** Mirroring the
 *    shear (as Bernadette's front/back frames do) opened a visible transparent gap at the center
 *    seam on a frame this narrow (11-13px final width) — the two half-rows didn't have enough
 *    pixels to absorb the split without a hole showing. A uniform whole-row shift reads as a clean
 *    subtle sway with no seam artifact at this pixel scale.
 *  - **The clasped-hands region shifts as a single unit**, not two independently-moving hands.
 *    This source's hands are drawn interlocked/overlapping (fingers laced together in front), not
 *    as two visually separate hand shapes the way independent per-hand movement needs — splitting
 *    them would have torn the clasped-hands shape apart. A single small shift on the whole
 *    hand-clasp region keeps the pose intact while still giving a hint of arm movement.
 *  - Boots still get independent left/right shifts (opposite vertical offsets, swapping between
 *    frames 'a'/'b'), matching Bernadette's own recipe — this part of the source art has two
 *    clearly separate boot shapes to move independently.
 * Idle frames are a single direct resize with no deformation, same as Bernadette's.
 *
 * Registered under the same `textureKeyFor('sister', facing, step)` / `walkAnimKeyFor('sister',
 * facing)` keys the procedural version used — see `registerSisterSprite()` below and
 * `pixelart/characters.ts`'s `PROCEDURAL_CHARACTER_IDS` exclusion list (mirrors how `'bernadette'`
 * is excluded there).
 */
export const SISTER_FRAME_HEIGHT = Math.round(42 * 0.85);

const URLS_BY_FACING = {
  side: { idle: sideIdleUrl, a: sideWalkAUrl, b: sideWalkBUrl },
  up: { idle: backIdleUrl, a: backWalkAUrl, b: backWalkBUrl },
  down: { idle: frontIdleUrl, a: frontWalkAUrl, b: frontWalkBUrl },
} as const;
const ALL_FACINGS = ['down', 'up', 'side'] as const;

export function preloadSisterSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    const urls = URLS_BY_FACING[facing];
    scene.load.image(textureKeyFor('sister', facing, null), urls.idle);
    scene.load.image(textureKeyFor('sister', facing, 'a'), urls.a);
    scene.load.image(textureKeyFor('sister', facing, 'b'), urls.b);
  });
}

/** Deliberately does not call `setFilter(LINEAR)` — same reasoning as `registerBernadetteSprite()`:
 * these are meant to read as pixel art like every other character, and LINEAR would smear her
 * small frames into a blurred silhouette on every scale-up. Leave textures on Phaser's NEAREST
 * default. */
export function registerSisterSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    const animKey = walkAnimKeyFor('sister', facing);
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: [
          { key: textureKeyFor('sister', facing, 'a') },
          { key: textureKeyFor('sister', facing, null) },
          { key: textureKeyFor('sister', facing, 'b') },
          { key: textureKeyFor('sister', facing, null) },
        ],
        frameRate: 6,
        repeat: -1,
      });
    }
  });
}
