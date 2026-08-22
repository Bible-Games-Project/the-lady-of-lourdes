/**
 * Palette sampled from the maintainer's Journey/Map reference image (a tall autumn valley
 * illustration: pale blue sky, snow peaks, gold/rust foliage, a blue river with two stone
 * bridges, tan dirt paths, and the Grotto niche at the top). Used only for the Journey screen's
 * own foreground UI (route line, apparition medallions, scroll/home buttons, labels in
 * `pixelart/journeyIcons.ts` and `scenes/ApparitionJourneyScene.ts`) so it reads as belonging to
 * that artwork — mirrors how `homePalette.ts` serves the Home screen. Gameplay scenes keep their
 * own palette (`pixelart/palette.ts`) untouched.
 */
export const JOURNEY_PALETTE = {
  skyTop: '#9cc6f5',
  mountainSnow: '#f2f6fa',

  foliageGold: '#e8b25a',
  foliageAmber: '#d98f3d',
  foliageRust: '#b8632f',
  pineDark: '#38453a',

  riverBlue: '#5f8fc0',
  riverHighlight: '#cfe6f5',

  pathStone: '#c2a878',
  pathStoneShade: '#9c8760',

  rockGrey: '#9a9490',
  rockDark: '#5c564f',
  grottoDark: '#141428',

  cream: '#f2ead8',
  ink: '#241f1a',

  glowGold: '#f0c05a',
  glowGoldSoft: 'rgba(240,192,90,0.5)',

  lockedStone: '#8a8078',
} as const;
