import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './constants';

export interface SafeAreaInsets {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/**
 * How much of the logical GAME_WIDTHxGAME_HEIGHT canvas is currently cropped off-screen on each
 * edge. Always (0,0,0,0) under the letterboxed `Phaser.Scale.FIT` mode (nothing is ever cropped
 * there — see `core/scaleMode.ts`), but non-zero under the full-bleed `ENVELOP` mode Home,
 * Settings, and the Journey map use, whenever the device's aspect ratio doesn't match the game's
 * 16:9 logical resolution: ENVELOP scales the canvas to *cover* the viewport, so a
 * wider-than-16:9 device crops the top/bottom, and a narrower one crops the left/right.
 *
 * Anything meant to always stay visible/reachable near an edge — corner buttons, etc. — must be
 * positioned using these insets instead of raw `0`/`GAME_WIDTH`/`GAME_HEIGHT`, or it can end up
 * entirely in the cropped, invisible region on some devices. This was the exact bug reported for
 * Home's gear/Play/More Games buttons: they sat close enough to the logical edges that wider
 * aspect ratios cropped them off-screen. Add the scene's own margin *on top of* these insets, not
 * instead of them.
 */
export function getSafeAreaInsets(scene: Phaser.Scene): SafeAreaInsets {
  const scale = scene.scale;
  const displayW = scale.displaySize.width;
  const displayH = scale.displaySize.height;
  const parentW = scale.parentSize.width;
  const parentH = scale.parentSize.height;

  if (displayW <= 0 || displayH <= 0 || parentW <= 0 || parentH <= 0) {
    return { left: 0, right: 0, top: 0, bottom: 0 };
  }

  const scaleX = displayW / GAME_WIDTH;
  const scaleY = displayH / GAME_HEIGHT;

  const cropXCss = Math.max(0, (displayW - parentW) / 2);
  const cropYCss = Math.max(0, (displayH - parentH) / 2);

  const insetX = cropXCss / scaleX;
  const insetY = cropYCss / scaleY;

  return { left: insetX, right: insetX, top: insetY, bottom: insetY };
}

/**
 * Registers `layout` to run once now and again every time the visible safe area changes (window
 * resize, device rotation, etc.), and unregisters it automatically when the scene shuts down.
 * Use this for any element anchored to a screen edge/corner under the full-bleed scale mode.
 */
export function onSafeAreaChange(scene: Phaser.Scene, layout: (insets: SafeAreaInsets) => void): void {
  const run = () => layout(getSafeAreaInsets(scene));
  run();
  scene.scale.on(Phaser.Scale.Events.RESIZE, run);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, run));
}
