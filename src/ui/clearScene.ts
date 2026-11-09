import type Phaser from 'phaser';

/**
 * Destroys everything a scene has drawn, so it can draw itself again from scratch.
 *
 * Not `scene.children.removeAll(true)`: that `true` is Phaser's `skipCallback`, so it only takes
 * the objects off the display list without destroying them. A DOM label from `createText()`
 * (every button's label included) then stays on the page, and was still showing over the Home
 * screen after the language screen closed.
 */
export function clearScene(scene: Phaser.Scene): void {
  // A copy, because destroying a button also destroys its label, which shortens the list.
  for (const obj of [...scene.children.list]) {
    obj.destroy();
  }
}
