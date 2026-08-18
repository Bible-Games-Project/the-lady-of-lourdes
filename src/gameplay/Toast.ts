import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../core/constants';

/** Brief centered narration/notice bubble, e.g. for locked-location notes. */
export class Toast {
  private scene: Phaser.Scene;
  private bg: Phaser.GameObjects.Rectangle;
  private text: Phaser.GameObjects.Text;
  private timer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.bg = scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT - 76, 10, 10, 0x1c1815, 0.75);
    this.text = scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 76, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#fffaf0',
      align: 'center',
      wordWrap: { width: GAME_WIDTH - 100 },
    });
    this.text.setOrigin(0.5);
    [this.bg, this.text].forEach((obj) => {
      obj.setScrollFactor(0);
      obj.setDepth(DEPTH.UI);
      obj.setVisible(false);
    });
  }

  show(message: string, duration = 2200): void {
    this.text.setText(message);
    const bounds = this.text.getBounds();
    this.bg.setSize(bounds.width + 24, bounds.height + 16);
    this.bg.setVisible(true);
    this.text.setVisible(true);
    this.timer?.remove();
    this.timer = this.scene.time.delayedCall(duration, () => {
      this.bg.setVisible(false);
      this.text.setVisible(false);
    });
  }
}
