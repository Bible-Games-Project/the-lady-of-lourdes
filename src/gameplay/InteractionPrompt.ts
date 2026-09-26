import Phaser from 'phaser';
import { DEPTH } from '../core/constants';
import { createText } from '../ui/text';

/** Small floating label ("Talk", "Pick up firewood"...) hovering above an interactable. */
export class InteractionPrompt {
  private text: Phaser.GameObjects.DOMElement;

  constructor(scene: Phaser.Scene) {
    this.text = createText(scene, 0, 0, '', {
      fontSize: '11px',
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
