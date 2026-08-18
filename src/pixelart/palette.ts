/**
 * Shared pixel-art palette for 1858 Lourdes: warm, muted, pastel earth tones.
 * Keeping one palette module avoids visually inconsistent colors creeping in
 * scene by scene.
 */
export const PALETTE = {
  // Sky / light
  skyDay: '#cfe3e0',
  skyDusk: '#e7c9a9',
  sunGlow: '#f6e2b3',

  // Ground
  grassLight: '#8fae6b',
  grassDark: '#719150',
  dirtLight: '#b79a72',
  dirtDark: '#96795a',
  stoneLight: '#a9a196',
  stoneDark: '#8b8377',
  pathLight: '#c2ac86',

  // Water
  waterLight: '#7fa8c9',
  waterDark: '#5f87ab',
  waterFoam: '#dff0f5',

  // Wood / stone structures
  woodLight: '#8a6a4a',
  woodDark: '#5f452e',
  roofLight: '#8f5b45',
  roofDark: '#6c4231',
  wallLight: '#d8c9a8',
  wallDark: '#b8a684',

  // Foliage / rock
  leafLight: '#5f7d45',
  leafDark: '#405c2d',
  rockLight: '#9a9184',
  rockDark: '#726a5e',

  // Characters (skin tones)
  skinLight: '#e8c39e',
  skinMid: '#d9b48f',
  skinDeep: '#c99a72',

  eyeDark: '#3a2a1a',

  // The Lady
  robeWhite: '#f7f4ec',
  robeShadow: '#e2ddce',
  sashBlue: '#7fa8c9',
  glow: '#fff6da',
} as const;
