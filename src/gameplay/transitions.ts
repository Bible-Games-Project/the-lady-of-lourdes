import Phaser from 'phaser';

/**
 * `Camera.fadeOut()` always force-restarts the effect, even if one is already running — so a
 * caller invoked every frame a trigger condition holds (e.g. "player standing in a door zone")
 * would perpetually reset the fade to 0% and it would never complete. Guard against that here
 * rather than at every call site.
 */
export function fadeToScene(scene: Phaser.Scene, targetKey: string, data?: object, duration = 400): void {
  if (scene.cameras.main.fadeEffect.isRunning) return;
  scene.cameras.main.fadeOut(duration, 0, 0, 0);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    scene.scene.start(targetKey, data);
  });
}
