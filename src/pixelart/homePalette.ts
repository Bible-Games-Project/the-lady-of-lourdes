/**
 * Palette extracted from the maintainer's Home-screen reference image (a pixel-art painting of
 * the Grotto at dusk-to-day: pale blue sky, snow-capped mountains, autumn foliage, gray grotto
 * stone, a gold-haloed Lady in a white robe with a blue sash, and a kneeling figure at a river).
 * The image itself is now the real Home background (`assets/home/homeBackground.ts`) — this
 * palette is only for the foreground UI drawn on top of it (title, buttons, gear in
 * `pixelart/ui.ts`), so they read as belonging to the same artwork. Gameplay scenes keep their
 * own palette (`pixelart/palette.ts`) untouched.
 */
export const HOME_PALETTE = {
  skyTop: '#5f93bc',
  skyMid: '#8fbdd9',
  skyHaze: '#d3e6ee',
  cloud: '#f6f1e4',
  cloudShade: '#b7c7d2',

  mountainSnow: '#eef4f8',
  mountainRock: '#8fa2b0',
  mountainShade: '#5c7383',

  pineDark: '#33452f',
  pineMid: '#48603f',
  foliageAmber: '#d98a3d',
  foliageGold: '#eab35a',
  foliageRust: '#a04f20',
  trunkDark: '#3a2a1f',

  grass: '#7c8f5c',
  grassShade: '#66774a',

  rockStone: '#948b80',
  rockShade: '#6b6258',
  rockDark: '#443e37',
  caveDark: '#1d1712',

  glowGold: '#f5c95a',
  glowGoldSoft: 'rgba(245,201,90,0.5)',

  ladyRobe: '#f7f3ea',
  ladyRobeShade: '#cbd3dd',
  ladySash: '#4f7fb0',

  riverBlue: '#7a97ab',
  riverHighlight: '#b8ccd6',
  riverDark: '#4a5f6b',

  pathStone: '#a89a86',
  pathStoneShade: '#8a7c68',

  candleFlame: '#f0a840',
  candleWax: '#e8ddc8',

  kneelRobe: '#5a2a2e',
  kneelKerchief: '#f0ece0',
  skin: '#e8c9a8',

  ink: '#2c241d',
  cream: '#f5efe0',

  // Pale pastel tones for UI that needs to read as *light* against the artwork's darker areas
  // (the settings gear) — distinct from the warm-stone `rockStone`/`rockDark` tones above, which
  // read too dark/muddy for that purpose.
  gearLight: '#f2e6c8',
  gearHighlight: '#fffdf5',
  gearShadow: '#d9c9a0',
} as const;
