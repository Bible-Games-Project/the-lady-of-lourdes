import type Phaser from 'phaser';

/**
 * Root-cause fix for blurry UI text: the game renders at a small logical
 * resolution (see core/constants.ts) that gets scaled up (often several
 * times, more on high-DPI screens) to fill the real viewport. Sprites are
 * hand-authored low-res pixel art, so nearest-neighbor upscaling keeps them
 * crisp — but canvas-rendered text is anti-aliased at any size, and
 * nearest-neighbor blowing up already-anti-aliased glyph edges produces
 * blocky mush.
 *
 * Phaser's Text objects support a `resolution` style property that
 * rasterizes the text into a higher-density internal texture regardless of
 * the game's base resolution (see Phaser.GameObjects.Text#setResolution).
 * Supersampling text this way, then letting the same nearest-neighbor
 * upscale apply to that much finer source, keeps glyph edges clean instead
 * of blocky. Every text object in the game must be built through this
 * helper so the fix is applied consistently.
 */
export const TEXT_RESOLUTION = 4;

export const FONT_SERIF = 'Georgia, "Iowan Old Style", "Palatino Linotype", serif';

export const INK = {
  dark: '#3a3226',
  muted: '#8a7a5a',
  cream: '#fffaf0',
  parchment: '#efe6d3',
  gold: '#d8c9a0',
} as const;

export function textStyle(overrides: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_SERIF,
    resolution: TEXT_RESOLUTION,
    ...overrides,
  };
}
