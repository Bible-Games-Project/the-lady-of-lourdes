import Phaser from 'phaser';
import pineTree1Url from './pine_tree_1.png';
import pineTree2Url from './pine_tree_2.png';
import pineTree3Url from './pine_tree_3.png';
import pineTree4Url from './pine_tree_4.png';
import pineTree5Url from './pine_tree_5.png';

/**
 * Five pine trees (pinos), same treatment as `orangeTrees.ts` in this same directory — see that
 * file's own doc comment for the full reasoning (alpha-bbox crop only, verified pixel-identical to
 * the supplied source, no LINEAR filter since this is genuine pixel art). Supplied as the second of
 * three ordered decoration batches (orange trees, then these, then oak trees).
 */
export const PINE_TREE_KEYS = {
  TREE_1: 'decor_pine_tree_1',
  TREE_2: 'decor_pine_tree_2',
  TREE_3: 'decor_pine_tree_3',
  TREE_4: 'decor_pine_tree_4',
  TREE_5: 'decor_pine_tree_5',
} as const;

export const PINE_TREE_NATIVE_SIZE: Record<(typeof PINE_TREE_KEYS)[keyof typeof PINE_TREE_KEYS], { width: number; height: number }> = {
  [PINE_TREE_KEYS.TREE_1]: { width: 1010, height: 1520 },
  [PINE_TREE_KEYS.TREE_2]: { width: 994, height: 1532 },
  [PINE_TREE_KEYS.TREE_3]: { width: 965, height: 1526 },
  [PINE_TREE_KEYS.TREE_4]: { width: 1474, height: 1024 },
  [PINE_TREE_KEYS.TREE_5]: { width: 962, height: 1507 },
};

export function preloadPineTrees(scene: Phaser.Scene): void {
  scene.load.image(PINE_TREE_KEYS.TREE_1, pineTree1Url);
  scene.load.image(PINE_TREE_KEYS.TREE_2, pineTree2Url);
  scene.load.image(PINE_TREE_KEYS.TREE_3, pineTree3Url);
  scene.load.image(PINE_TREE_KEYS.TREE_4, pineTree4Url);
  scene.load.image(PINE_TREE_KEYS.TREE_5, pineTree5Url);
}
