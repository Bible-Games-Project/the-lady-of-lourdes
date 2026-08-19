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

export function registerCharacterTextures(scene: Phaser.Scene): void {
  registerShadowTexture(scene);
  (Object.keys(CHARACTERS) as CharacterId[]).forEach((id) => {
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
  (Object.keys(CHARACTERS) as CharacterId[]).forEach((id) => {
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
