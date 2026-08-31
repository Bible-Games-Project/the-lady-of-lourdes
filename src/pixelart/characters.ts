import Phaser from 'phaser';
import { fillRect, makeGrid, registerTexture } from './PixelCanvas';
import { buildPersonGrid, personPalette, type PersonColors, type Silhouette, type StepFrame } from './personTemplate';
import { PALETTE } from './palette';

export const SHADOW_KEY = 'char_shadow';

export type CharacterId =
  | 'bernadette'
  | 'mother'
  | 'sister'
  | 'friend'
  | 'lady'
  | 'villagerMale'
  | 'villagerFemale';

interface CharacterDef {
  colors: PersonColors;
  silhouette: Silhouette;
  accent?: boolean;
}

/**
 * Character art bible: every character shares the same 20x28 skeleton,
 * outline, and proportions (see personTemplate.ts) and differs only by this
 * palette — Bernadette's blue bodice / white veil / brown skirt is the
 * reference; everyone else is a harmonious variation of the same family.
 */
export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  bernadette: {
    silhouette: 'dress',
    colors: {
      skin: PALETTE.skinLight,
      headwear: '#f5f1e6',
      top: '#3a5f8a',
      bottom: '#6b5844',
      shoe: '#4a3728',
    },
  },
  mother: {
    silhouette: 'dress',
    colors: {
      skin: PALETTE.skinMid,
      headwear: '#8a8072',
      top: '#5a6b5a',
      bottom: '#443c30',
      shoe: '#4a3728',
    },
  },
  sister: {
    silhouette: 'dress',
    colors: {
      skin: PALETTE.skinLight,
      headwear: '#ece0c8',
      top: '#7a8fa0',
      bottom: '#8a7a5e',
      shoe: '#4a3728',
    },
  },
  friend: {
    silhouette: 'dress',
    colors: {
      skin: PALETTE.skinDeep,
      headwear: '#d9cbb0',
      top: '#8a5a4a',
      bottom: '#5a4a42',
      shoe: '#4a3728',
    },
  },
  villagerMale: {
    silhouette: 'trousers',
    colors: {
      skin: PALETTE.skinMid,
      headwear: '#5a5044',
      top: '#6b6050',
      bottom: '#3f382e',
      shoe: '#4a3728',
    },
  },
  villagerFemale: {
    silhouette: 'dress',
    colors: {
      skin: PALETTE.skinLight,
      headwear: '#8a7a68',
      top: '#7a8a6b',
      bottom: '#4a5a4a',
      shoe: '#4a3728',
    },
  },
  lady: {
    silhouette: 'dress',
    accent: true,
    colors: {
      skin: '#f5e6d0',
      headwear: PALETTE.robeWhite,
      top: PALETTE.robeWhite,
      bottom: PALETTE.robeWhite,
      shoe: PALETTE.robeWhite,
      accent: '#6f9fc9',
      eye: '#5a4a3a',
      outline: '#a89a7a',
    },
  },
};

const FACINGS = ['down', 'up', 'side'] as const;
export type FacingKey = (typeof FACINGS)[number];

export function textureKeyFor(id: CharacterId, facing: FacingKey, step: StepFrame = null): string {
  const suffix = step ? `_${step}` : '';
  return `char_${id}_${facing}${suffix}`;
}

export function walkAnimKeyFor(id: CharacterId, facing: FacingKey): string {
  return `walk_${id}_${facing}`;
}

function shadowGrid() {
  const grid = makeGrid(14, 6, '.');
  fillRect(grid, 2, 1, 11, 4, 'D');
  fillRect(grid, 4, 0, 9, 0, 'D');
  fillRect(grid, 4, 5, 9, 5, 'D');
  return grid;
}

export function registerShadowTexture(scene: Phaser.Scene): void {
  registerTexture(scene, SHADOW_KEY, shadowGrid(), { D: 'rgba(20,16,12,0.32)' }, 1);
}

/**
 * Bernadette's own ground shadow — an irregular hand-authored blob (wider than tall, jagged
 * edges, an asymmetric bulge rather than a symmetric ellipse) instead of the plain rounded
 * rectangle every other character uses (`shadowGrid()` above, untouched). A softer inner core
 * gives it a little depth without a blur filter (there is no such filter in this pixel-art
 * pipeline). See `Player.ts` for how its scale/alpha react (very slightly) to her breathing while
 * staying pinned to the ground.
 */
export const BERNADETTE_SHADOW_KEY = 'bernadette_shadow';

function bernadetteShadowGrid() {
  const grid = makeGrid(20, 7, '.');
  fillRect(grid, 6, 0, 13, 0, 'D');
  fillRect(grid, 3, 1, 16, 1, 'D');
  fillRect(grid, 1, 2, 17, 2, 'D');
  fillRect(grid, 0, 3, 16, 3, 'D');
  fillRect(grid, 2, 4, 17, 4, 'D');
  fillRect(grid, 4, 5, 14, 5, 'D');
  fillRect(grid, 7, 6, 11, 6, 'D');
  fillRect(grid, 5, 2, 14, 4, 'C');
  return grid;
}

export function registerBernadetteShadowTexture(scene: Phaser.Scene): void {
  registerTexture(
    scene,
    BERNADETTE_SHADOW_KEY,
    bernadetteShadowGrid(),
    { D: 'rgba(24,20,26,0.26)', C: 'rgba(24,20,26,0.34)' },
    1,
  );
}

/**
 * Bernadette (the player character) is excluded from both loops below — she now uses the
 * maintainer's own real artwork (`assets/player/bernadetteSprite.ts`), registered under these
 * same `textureKeyFor`/`walkAnimKeyFor` keys separately. Registering a procedural version here
 * too would either collide with or (depending on load order) silently pre-empt the real one,
 * since `registerTexture`/`scene.anims.create` both no-op if the key already exists. Every other
 * character (mother, sister, friend, lady, villagers) is unaffected and still procedural.
 */
const PROCEDURAL_CHARACTER_IDS = (Object.keys(CHARACTERS) as CharacterId[]).filter((id) => id !== 'bernadette');

export function registerCharacterTextures(scene: Phaser.Scene): void {
  registerShadowTexture(scene);
  PROCEDURAL_CHARACTER_IDS.forEach((id) => {
    const def = CHARACTERS[id];
    const palette = personPalette(def.colors);
    FACINGS.forEach((facing) => {
      ([null, 'a', 'b'] as StepFrame[]).forEach((step) => {
        const grid = buildPersonGrid(facing, def.silhouette, def.accent ?? false, step);
        registerTexture(scene, textureKeyFor(id, facing, step), grid, palette, 1);
      });
    });
  });
}

/** One 2-frame walk-cycle animation per character per facing direction. */
export function registerCharacterAnimations(scene: Phaser.Scene): void {
  PROCEDURAL_CHARACTER_IDS.forEach((id) => {
    FACINGS.forEach((facing) => {
      const key = walkAnimKeyFor(id, facing);
      if (scene.anims.exists(key)) return;
      scene.anims.create({
        key,
        frames: [
          { key: textureKeyFor(id, facing, 'a') },
          { key: textureKeyFor(id, facing, null) },
          { key: textureKeyFor(id, facing, 'b') },
          { key: textureKeyFor(id, facing, null) },
        ],
        frameRate: 6,
        repeat: -1,
      });
    });
  });
}
