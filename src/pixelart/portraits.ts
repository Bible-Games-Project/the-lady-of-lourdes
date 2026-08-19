import Phaser from 'phaser';
import { registerTexture } from './PixelCanvas';
import { buildPortraitGrid, portraitPalette } from './portraitTemplate';
import { CHARACTERS, type CharacterId } from './characters';

/**
 * Portrait expression states, generated as plain palette-swapped variants of
 * one shared bust grid (see portraitTemplate.ts). `neutral`/`blink` are used
 * while a character is silent; `talk`/`talkBlink` while their line is typing.
 */
export type Expression = 'neutral' | 'blink' | 'talk' | 'talkBlink';

const STATES: Record<Expression, { eyesClosed: boolean; mouthOpen: boolean }> = {
  neutral: { eyesClosed: false, mouthOpen: false },
  blink: { eyesClosed: true, mouthOpen: false },
  talk: { eyesClosed: false, mouthOpen: true },
  talkBlink: { eyesClosed: true, mouthOpen: true },
};

export function portraitKeyFor(id: CharacterId, expression: Expression = 'neutral'): string {
  return `portrait_${id}_${expression}`;
}

export function registerPortraitTextures(scene: Phaser.Scene): void {
  (Object.keys(CHARACTERS) as CharacterId[]).forEach((id) => {
    const def = CHARACTERS[id];
    const palette = portraitPalette(def.colors);
    (Object.keys(STATES) as Expression[]).forEach((expression) => {
      const grid = buildPortraitGrid(STATES[expression]);
      registerTexture(scene, portraitKeyFor(id, expression), grid, palette, 5);
    });
  });
}
