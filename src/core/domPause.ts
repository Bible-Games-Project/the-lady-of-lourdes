import Phaser from 'phaser';

/**
 * DOM-based text (see `ui/text.ts`) lives in one shared `<div>` layer that Phaser draws over the
 * *entire* canvas, completely independent of which scene created a given element or whether that
 * scene is currently active, paused, or sleeping — unlike WebGL content, `scene.pause()` does not
 * stop a scene's own DOM elements from rendering (confirmed empirically: launching an overlay scene
 * like Settings on top of a *paused* one left the paused scene's own title/button text fully
 * visible, overlapping the overlay's own text, since neither scene's DOM elements have any
 * WebGL-depth-style relationship to the other's).
 *
 * `SettingsScene` is the one place this game overlays one scene on top of another
 * (`this.scene.launch(SCENE_KEYS.SETTINGS, ...); this.scene.pause();` in both `HomeScene.ts` and
 * `GameplayTopBar.ts`) — call `hideSceneDom()` right before pausing, and `restoreSceneDom()` when
 * resuming (see `SettingsScene.ts#close()`), so the paused scene's own DOM text visually disappears
 * along with everything else about it, exactly like an ordinary WebGL object would.
 *
 * Only elements that were actually visible at hide-time get restored — this must not blanket-show
 * every DOM element on resume, since plenty are deliberately invisible for their own independent
 * reasons at any given moment (a closed `DialogueBox`'s name/body text, an `InteractionPrompt` not
 * currently pointing at anything, a `Toast` with no active notice) and must stay that way.
 */
const hiddenByThisModule = new WeakSet<Phaser.GameObjects.DOMElement>();

function eachDomElement(scene: Phaser.Scene, fn: (el: Phaser.GameObjects.DOMElement) => void): void {
  scene.children.list.forEach((obj) => {
    if (obj.type === 'DOMElement') fn(obj as Phaser.GameObjects.DOMElement);
  });
}

export function hideSceneDom(scene: Phaser.Scene): void {
  eachDomElement(scene, (el) => {
    if (el.visible) {
      hiddenByThisModule.add(el);
      el.setVisible(false);
    }
  });
}

export function restoreSceneDom(scene: Phaser.Scene): void {
  eachDomElement(scene, (el) => {
    if (hiddenByThisModule.has(el)) {
      hiddenByThisModule.delete(el);
      el.setVisible(true);
    }
  });
}
