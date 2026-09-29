import Phaser from 'phaser';
import orangeTree1Url from './orange_tree_1.png';
import orangeTree2Url from './orange_tree_2.png';
import orangeTree3Url from './orange_tree_3.png';
import orangeTree4Url from './orange_tree_4.png';
import orangeTree5Url from './orange_tree_5.png';

/**
 * Five orange trees (naranjos), supplied by the maintainer for manual placement through the map
 * editor's Decorations layer — each cropped tight to its own alpha bounding box (no other change;
 * verified pixel-identical to the supplied source within that box) and used exactly as supplied,
 * same "no redraw/recolor/re-pixelation" convention as every other real-art asset in this repo.
 *
 * Genuine pixel art (a discrete flat-color palette, hard block edges), unlike the buildings/river
 * /town-terrain assets — so these deliberately do NOT go into `BootScene.ts`'s `LINEAR`-filter
 * list. They stay on Phaser's default `pixelArt: true` NEAREST filtering, per the maintainer's own
 * explicit "nearest-neighbor/point filtering, no smoothing" requirement for pixel-art sprites.
 */
export const ORANGE_TREE_KEYS = {
  TREE_1: 'decor_orange_tree_1',
  TREE_2: 'decor_orange_tree_2',
  TREE_3: 'decor_orange_tree_3',
  TREE_4: 'decor_orange_tree_4',
  TREE_5: 'decor_orange_tree_5',
} as const;

export const ORANGE_TREE_NATIVE_SIZE: Record<(typeof ORANGE_TREE_KEYS)[keyof typeof ORANGE_TREE_KEYS], { width: number; height: number }> = {
  [ORANGE_TREE_KEYS.TREE_1]: { width: 1220, height: 1239 },
  [ORANGE_TREE_KEYS.TREE_2]: { width: 1297, height: 1200 },
  [ORANGE_TREE_KEYS.TREE_3]: { width: 1023, height: 1533 },
  [ORANGE_TREE_KEYS.TREE_4]: { width: 971, height: 1499 },
  [ORANGE_TREE_KEYS.TREE_5]: { width: 1492, height: 1005 },
};

export function preloadOrangeTrees(scene: Phaser.Scene): void {
  scene.load.image(ORANGE_TREE_KEYS.TREE_1, orangeTree1Url);
  scene.load.image(ORANGE_TREE_KEYS.TREE_2, orangeTree2Url);
  scene.load.image(ORANGE_TREE_KEYS.TREE_3, orangeTree3Url);
  scene.load.image(ORANGE_TREE_KEYS.TREE_4, orangeTree4Url);
  scene.load.image(ORANGE_TREE_KEYS.TREE_5, orangeTree5Url);
}
