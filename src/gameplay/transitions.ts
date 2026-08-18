import Phaser from 'phaser';

export function fadeToScene(scene: Phaser.Scene, targetKey: string, data?: object, duration = 400): void {
  scene.cameras.main.fadeOut(duration, 0, 0, 0);
  scene.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
    scene.scene.start(targetKey, data);
  });
}
