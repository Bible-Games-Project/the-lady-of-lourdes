import Phaser from 'phaser';
import { registerTexture, subGrid } from './PixelCanvas';
import { buildPersonGrid, personPalette } from './personTemplate';
import { CHARACTERS, type CharacterId } from './characters';

/**
 * Portraits are cropped from the same paper-doll head used in the overworld,
 * scaled up. Keyed as `portrait_<id>_<expression>` so more expressions can be
 * added later without changing how the dialogue UI looks them up.
 */
export type Expression = 'neutral';

export function portraitKeyFor(id: CharacterId, expression: Expression = 'neutral'): string {
  return `portrait_${id}_${expression}`;
}

export function registerPortraitTextures(scene: Phaser.Scene): void {
  (Object.keys(CHARACTERS) as CharacterId[]).forEach((id) => {
    const def = CHARACTERS[id];
    const palette = personPalette(def.colors);
    const full = buildPersonGrid('down', def.silhouette, def.accent ?? false);
    const bust = subGrid(full, 2, 0, 13, 9);
    registerTexture(scene, portraitKeyFor(id, 'neutral'), bust, palette, 8);
  });
}
