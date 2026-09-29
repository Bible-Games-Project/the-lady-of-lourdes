import Phaser from 'phaser';
import oakTree1Url from './oak_tree_1.png';
import oakTree2Url from './oak_tree_2.png';

/**
 * Two oak trees (robles), same treatment as `orangeTrees.ts`/`pineTrees.ts` in this same directory
 * — see `orangeTrees.ts`'s own doc comment for the full reasoning (alpha-bbox crop only, verified
 * pixel-identical to the supplied source, no LINEAR filter since this is genuine pixel art). Third
 * and last of the three ordered decoration batches.
 */
export const OAK_TREE_KEYS = {
  TREE_1: 'decor_oak_tree_1',
  TREE_2: 'decor_oak_tree_2',
} as const;

export const OAK_TREE_NATIVE_SIZE: Record<(typeof OAK_TREE_KEYS)[keyof typeof OAK_TREE_KEYS], { width: number; height: number }> = {
  [OAK_TREE_KEYS.TREE_1]: { width: 1524, height: 1024 },
  [OAK_TREE_KEYS.TREE_2]: { width: 1535, height: 1024 },
};

export function preloadOakTrees(scene: Phaser.Scene): void {
  scene.load.image(OAK_TREE_KEYS.TREE_1, oakTree1Url);
  scene.load.image(OAK_TREE_KEYS.TREE_2, oakTree2Url);
}
