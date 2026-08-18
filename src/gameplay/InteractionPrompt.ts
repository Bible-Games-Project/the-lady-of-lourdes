import Phaser from 'phaser';
import { DEPTH } from '../core/constants';

/** Small floating label ("Talk", "Pick up firewood"...) hovering above an interactable. */
export class InteractionPrompt {
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    this.text = scene.add.text(0, 0, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '10px',
      color: '#fffaf0',
      backgroundColor: '#3a3226cc',
      padding: { x: 5, y: 2 },
    });
    this.text.setDepth(DEPTH.OVERLAY_LOW);
    this.text.setOrigin(0.5, 1);
    this.text.setVisible(false);
  }

  showAt(x: number, y: number, label: string): void {
    this.text.setText(label);
    this.text.setPosition(x, y);
    this.text.setVisible(true);
  }

  hide(): void {
    this.text.setVisible(false);
  }

  destroy(): void {
    this.text.destroy();
  }
}
