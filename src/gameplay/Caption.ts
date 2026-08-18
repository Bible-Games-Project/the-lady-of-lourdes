import Phaser from 'phaser';
import { DEPTH, GAME_WIDTH } from '../core/constants';
import { tweenPromise, wait } from './async';

/** A centered fade-in/fade-out caption line, used for narration beats and title cards. */
export class Caption {
  private scene: Phaser.Scene;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene, y: number, style: Phaser.Types.GameObjects.Text.TextStyle, depth = DEPTH.UI) {
    this.scene = scene;
    this.text = scene.add.text(GAME_WIDTH / 2, y, '', style);
    this.text.setOrigin(0.5);
    this.text.setScrollFactor(0);
    this.text.setDepth(depth);
    this.text.setAlpha(0);
  }

  async show(message: string, holdMs = 1800, fadeMs = 500): Promise<void> {
    this.text.setText(message);
    this.text.setAlpha(0);
    await tweenPromise(this.scene, { targets: this.text, alpha: 1, duration: fadeMs });
    await wait(this.scene, holdMs);
    await tweenPromise(this.scene, { targets: this.text, alpha: 0, duration: fadeMs });
  }
}
