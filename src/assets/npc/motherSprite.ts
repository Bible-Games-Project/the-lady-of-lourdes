import Phaser from 'phaser';
import { textureKeyFor, walkAnimKeyFor } from '../../pixelart/characters';
import sideIdleUrl from './mother_side_idle.png';
import sideWalkAUrl from './mother_side_walk_a.png';
import sideWalkBUrl from './mother_side_walk_b.png';
import backIdleUrl from './mother_back_idle.png';
import backWalkAUrl from './mother_back_walk_a.png';
import backWalkBUrl from './mother_back_walk_b.png';
import frontIdleUrl from './mother_front_idle.png';
import frontWalkAUrl from './mother_front_walk_a.png';
import frontWalkBUrl from './mother_front_walk_b.png';

/**
 * The maintainer's own artwork for Bernadette's mother (`CharacterId: 'mother'`), recovered
 * byte-for-byte from the conversation that supplied it — never redrawn/recolored. Same
 * side/front/back reference-sheet approach and generation pipeline as
 * `assets/npc/sisterSprite.ts` (see that file's doc comment for the full deformation-technique
 * writeup — single-direction skirt shear, hand-clasp region as one shifting unit, independent
 * left/right boot shifts, idle = direct resize). This `CharacterId` already existed (previously
 * the procedural placeholder from `pixelart/characters.ts#CHARACTERS.mother`) and is already
 * placed as an `NpcActor` in `CachotScene.ts` — nothing about that placement needed to change.
 *
 * **Sized at the same `BERNADETTE_FRAME_HEIGHT` (42px) as Bernadette herself** — unlike the
 * sister, the maintainer was explicit she should read as full adult scale, not shrunk ("do not
 * make her look like a child character"). `MOTHER_FRAME_HEIGHT` is kept as its own named constant
 * (rather than importing Bernadette's) so this file doesn't take a dependency on
 * `assets/player/bernadetteSprite.ts` merely to reuse a number — same value, separate constant.
 */
export const MOTHER_FRAME_HEIGHT = 42;

const URLS_BY_FACING = {
  side: { idle: sideIdleUrl, a: sideWalkAUrl, b: sideWalkBUrl },
  up: { idle: backIdleUrl, a: backWalkAUrl, b: backWalkBUrl },
  down: { idle: frontIdleUrl, a: frontWalkAUrl, b: frontWalkBUrl },
} as const;
const ALL_FACINGS = ['down', 'up', 'side'] as const;

export function preloadMotherSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    const urls = URLS_BY_FACING[facing];
    scene.load.image(textureKeyFor('mother', facing, null), urls.idle);
    scene.load.image(textureKeyFor('mother', facing, 'a'), urls.a);
    scene.load.image(textureKeyFor('mother', facing, 'b'), urls.b);
  });
}

/** Deliberately does not call `setFilter(LINEAR)` — same reasoning as `registerBernadetteSprite()`
 * and `registerSisterSprite()`: stay on Phaser's NEAREST default so she reads as pixel art, not a
 * blurred illustration, at any scale. */
export function registerMotherSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    const animKey = walkAnimKeyFor('mother', facing);
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: [
          { key: textureKeyFor('mother', facing, 'a') },
          { key: textureKeyFor('mother', facing, null) },
          { key: textureKeyFor('mother', facing, 'b') },
          { key: textureKeyFor('mother', facing, null) },
        ],
        frameRate: 6,
        repeat: -1,
      });
    }
  });
}
