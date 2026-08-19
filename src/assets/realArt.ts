import bernadetteFull from './characters/bernadette_full.png';
import bernadetteFace from './characters/bernadette_face.png';
import ladyOfLourdes from './characters/lady_of_lourdes.png';

/**
 * Real illustrated image assets — the maintainer's own reference art, used unmodified (no
 * pixel-art conversion, no redrawing). This is a *separate* pipeline from `src/pixelart/`
 * (procedural, palette-grid generated); see AGENTS.md before touching either one.
 *
 * Everything not listed here (NPCs besides Bernadette, environment, props) has no matching art
 * yet — VisualTestScene renders those as plainly-labeled gray-box placeholders. Do not fill
 * those gaps with generated/coded approximations; wait for real assets in this same style.
 */
export const REAL_ART_KEYS = {
  BERNADETTE_FULL: 'real_bernadette_full',
  BERNADETTE_FACE: 'real_bernadette_face',
  LADY_OF_LOURDES: 'real_lady_of_lourdes',
} as const;

export function preloadRealArt(scene: Phaser.Scene): void {
  scene.load.image(REAL_ART_KEYS.BERNADETTE_FULL, bernadetteFull);
  scene.load.image(REAL_ART_KEYS.BERNADETTE_FACE, bernadetteFace);
  scene.load.image(REAL_ART_KEYS.LADY_OF_LOURDES, ladyOfLourdes);
}
