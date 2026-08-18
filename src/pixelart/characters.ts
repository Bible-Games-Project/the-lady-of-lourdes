import Phaser from 'phaser';
import { registerTexture } from './PixelCanvas';
import { buildPersonGrid, personPalette, type PersonColors, type Silhouette } from './personTemplate';
import { PALETTE } from './palette';

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

export const CHARACTERS: Record<CharacterId, CharacterDef> = {
  bernadette: {
    silhouette: 'dress',
    colors: {
      skin: PALETTE.skinLight,
      headwear: '#7a6a52',
      top: '#cdbfa5',
      bottom: '#5b6b7a',
      shoe: PALETTE.woodDark,
    },
  },
  mother: {
    silhouette: 'dress',
    colors: {
      skin: PALETTE.skinMid,
      headwear: '#4a4038',
      top: '#8a7a6a',
      bottom: '#3f4a52',
      shoe: PALETTE.woodDark,
    },
  },
  sister: {
    silhouette: 'dress',
    colors: {
      skin: PALETTE.skinLight,
      headwear: '#a68a64',
      top: '#cdbfa5',
      bottom: '#7a8a6b',
      shoe: PALETTE.woodDark,
    },
  },
  friend: {
    silhouette: 'dress',
    colors: {
      skin: PALETTE.skinDeep,
      headwear: '#6b5344',
      top: '#b8a88a',
      bottom: '#6b4a52',
      shoe: PALETTE.woodDark,
    },
  },
  villagerMale: {
    silhouette: 'trousers',
    colors: {
      skin: PALETTE.skinMid,
      headwear: '#5a5044',
      top: '#7a6a54',
      bottom: '#4a4038',
      shoe: PALETTE.woodDark,
    },
  },
  villagerFemale: {
    silhouette: 'dress',
    colors: {
      skin: PALETTE.skinLight,
      headwear: '#6b5b4a',
      top: '#a8987c',
      bottom: '#5a6b5a',
      shoe: PALETTE.woodDark,
    },
  },
  lady: {
    silhouette: 'dress',
    accent: true,
    colors: {
      skin: '#f2e0c9',
      headwear: PALETTE.robeWhite,
      top: PALETTE.robeWhite,
      bottom: PALETTE.robeWhite,
      shoe: PALETTE.robeWhite,
      accent: PALETTE.sashBlue,
      eye: '#5a4a3a',
    },
  },
};

export function textureKeyFor(id: CharacterId, facing: 'down' | 'up' | 'side'): string {
  return `char_${id}_${facing}`;
}

export function registerCharacterTextures(scene: Phaser.Scene): void {
  (Object.keys(CHARACTERS) as CharacterId[]).forEach((id) => {
    const def = CHARACTERS[id];
    const palette = personPalette(def.colors);
    (['down', 'up', 'side'] as const).forEach((facing) => {
      const grid = buildPersonGrid(facing, def.silhouette, def.accent ?? false);
      registerTexture(scene, textureKeyFor(id, facing), grid, palette, 1);
    });
  });
}
