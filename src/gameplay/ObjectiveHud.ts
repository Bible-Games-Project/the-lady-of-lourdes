import Phaser from 'phaser';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import { DEPTH, GAME_WIDTH } from '../core/constants';
import { UI_KEYS, UI_PANEL_SLICE } from '../pixelart/ui';

/** Small banner pinned to the top of the screen showing the current mission objective. */
export class ObjectiveHud {
  private container: Phaser.GameObjects.Container;
  private label: Phaser.GameObjects.Text;
  private text: Phaser.GameObjects.Text;

  constructor(scene: Phaser.Scene) {
    const width = GAME_WIDTH - 32;
    const height = 34;
    const x = GAME_WIDTH / 2;
    const y = 10 + height / 2;

    const panel = scene.add.nineslice(
      0,
      0,
      UI_KEYS.PANEL,
      undefined,
      width,
      height,
      UI_PANEL_SLICE.border,
      UI_PANEL_SLICE.border,
      UI_PANEL_SLICE.border,
      UI_PANEL_SLICE.border,
    );
    panel.setAlpha(0.92);

    this.label = scene.add.text(-width / 2 + 10, -height / 2 + 5, Localization.t(K.OBJECTIVE_LABEL).toUpperCase(), {
      fontFamily: 'Georgia, serif',
      fontSize: '9px',
      color: '#8a7a5a',
    });

    this.text = scene.add.text(-width / 2 + 10, -height / 2 + 16, '', {
      fontFamily: 'Georgia, serif',
      fontSize: '12px',
      color: '#3a3226',
    });

    this.container = scene.add.container(x, y, [panel, this.label, this.text]);
    this.container.setDepth(DEPTH.UI);
    this.container.setScrollFactor(0);
  }

  setText(text: string): void {
    this.text.setText(text);
  }

  setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  destroy(): void {
    this.container.destroy();
  }
}
