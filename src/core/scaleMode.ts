import Phaser from 'phaser';

/**
 * The game's logical resolution (see constants.ts) is ~16:9. Gameplay scenes need the *entire*
 * logical canvas visible at all times — HUD elements (gear, joystick, Tasks button) are pinned
 * close to its edges, so `Phaser.Scale.FIT` (letterboxed, nothing ever cropped) is the only safe
 * mode for them. The three static "screen" scenes (Home, Settings, the Journey map) are pure
 * full-bleed illustration + centered UI, and the maintainer explicitly wants those to fill the
 * device edge-to-edge with no letterbox bars, cropping the artwork if the device aspect ratio
 * doesn't match rather than showing bars — that's `Phaser.Scale.ENVELOP`.
 *
 * The Scale Manager is global to the `Phaser.Game` instance (one canvas), so this is switched
 * live per scene rather than set once in `main.ts`. Call the matching one of these at the top of
 * every scene's `create()` — including ones reached via `scene.launch`/`scene.resume`, like
 * Settings — so the mode is always correct for whatever's actually on screen, regardless of
 * navigation path.
 */
/**
 * Phaser only applies a scale mode's crop/letterbox *aspect behavior* to `displaySize` once, in
 * `ScaleManager#boot()` — changing `scale.scaleMode` afterwards and calling `refresh()` updates
 * the reported mode but silently has no visual effect, because `refresh()`/`updateScale()` never
 * re-call `displaySize.setAspectMode()`. Mirror what `boot()` does so a runtime mode switch
 * actually takes effect.
 */
function setScaleMode(scene: Phaser.Scene, mode: number): void {
  const scale = scene.scale;
  scale.scaleMode = mode;
  scale.displaySize.setAspectMode(mode);
  scale.refresh();
}

export function useFullBleedScale(scene: Phaser.Scene): void {
  setScaleMode(scene, Phaser.Scale.ENVELOP);
}

export function useLetterboxScale(scene: Phaser.Scene): void {
  setScaleMode(scene, Phaser.Scale.FIT);
}
