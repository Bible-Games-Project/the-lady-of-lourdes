import Phaser from 'phaser';
import { textureKeyFor, walkAnimKeyFor } from '../../pixelart/characters';
import sideIdleUrl from './jeanne_side_idle.png';
import sideWalkAUrl from './jeanne_side_walk_a.png';
import sideWalkBUrl from './jeanne_side_walk_b.png';
import backIdleUrl from './jeanne_back_idle.png';
import backWalkAUrl from './jeanne_back_walk_a.png';
import backWalkBUrl from './jeanne_back_walk_b.png';
import frontIdleUrl from './jeanne_front_idle.png';
import frontWalkAUrl from './jeanne_front_walk_a.png';
import frontWalkBUrl from './jeanne_front_walk_b.png';

/**
 * The maintainer's own artwork for Jeanne Abadie, Bernadette's friend (`CharacterId: 'friend'`),
 * recovered byte-for-byte from the conversation that supplied it — never redrawn/recolored. Same
 * side/front/back reference-sheet approach and generation pipeline as `assets/npc/sisterSprite.ts`
 * / `assets/npc/motherSprite.ts` (see `sisterSprite.ts`'s doc comment for the full deformation-
 * technique writeup — single-direction skirt shear, independent left/right boot shifts, idle =
 * direct clean resize). This `CharacterId` already existed (previously the procedural placeholder
 * from `pixelart/characters.ts#CHARACTERS.friend`) and is already placed as an `NpcActor` in
 * `OverworldScene.ts` (led via `LeaderNpc`, then wanders near the far bank post-crossing via
 * `WanderNpc`) — nothing about that placement/behavior needed to change, since both only ever
 * address her through `textureKeyFor`/`walkAnimKeyFor`/`NpcActor`'s facing-agnostic API.
 *
 * One adaptation from the sister/mother recipe, specific to this source art: **her hands hang
 * separately at her sides in the front/back panels (not clasped together)**, so front/back walk
 * frames get two independently-shifted hand regions (opposite directions, for a counter-swing),
 * the same treatment Bernadette's own front/back frames use — not the single shifting hand-clasp
 * unit sister/mother needed for their laced-fingers pose.
 *
 * **Sized at the same `BERNADETTE_FRAME_HEIGHT` (42px) as Bernadette and the mother** — she's
 * Bernadette's peer, not a younger child (that distinction is the sister's alone, at 85%).
 * `JEANNE_FRAME_HEIGHT` is its own constant (not imported from `bernadetteSprite.ts`) so this file
 * doesn't take a dependency on that module merely to reuse a number.
 */
export const JEANNE_FRAME_HEIGHT = 42;

const URLS_BY_FACING = {
  side: { idle: sideIdleUrl, a: sideWalkAUrl, b: sideWalkBUrl },
  up: { idle: backIdleUrl, a: backWalkAUrl, b: backWalkBUrl },
  down: { idle: frontIdleUrl, a: frontWalkAUrl, b: frontWalkBUrl },
} as const;
const ALL_FACINGS = ['down', 'up', 'side'] as const;

export function preloadJeanneSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    const urls = URLS_BY_FACING[facing];
    scene.load.image(textureKeyFor('friend', facing, null), urls.idle);
    scene.load.image(textureKeyFor('friend', facing, 'a'), urls.a);
    scene.load.image(textureKeyFor('friend', facing, 'b'), urls.b);
  });
}

/** Deliberately does not call `setFilter(LINEAR)` — same reasoning as `registerBernadetteSprite()`
 * / `registerSisterSprite()` / `registerMotherSprite()`: stay on Phaser's NEAREST default so she
 * reads as crisp pixel art, not a blurred silhouette, on every scale-up. */
export function registerJeanneSprite(scene: Phaser.Scene): void {
  ALL_FACINGS.forEach((facing) => {
    const animKey = walkAnimKeyFor('friend', facing);
    if (!scene.anims.exists(animKey)) {
      scene.anims.create({
        key: animKey,
        frames: [
          { key: textureKeyFor('friend', facing, 'a') },
          { key: textureKeyFor('friend', facing, null) },
          { key: textureKeyFor('friend', facing, 'b') },
          { key: textureKeyFor('friend', facing, null) },
        ],
        frameRate: 6,
        repeat: -1,
      });
    }
  });
}
