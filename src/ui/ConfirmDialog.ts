import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import { UI_KEYS, UI_PANEL_SLICE } from '../pixelart/ui';
import { createButton } from './Button';
import { textStyle, INK } from './text';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel?: () => void;
  /** Tints the title/confirm button to read as a destructive action. */
  danger?: boolean;
}

/**
 * Reusable pixel-art confirm/cancel modal, drawn directly into whichever
 * scene calls show() (no scene launch/pause dance needed). Escape and
 * tapping outside the panel always cancel; E/Enter/tap-Confirm confirm.
 */
export class ConfirmDialog {
  private scene: Phaser.Scene;
  private active = false;
  private cleanup: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  isActive(): boolean {
    return this.active;
  }

  show(options: ConfirmOptions): void {
    if (this.active) return;
    this.active = true;

    const panelW = 300;
    const panelH = 140;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const backdrop = this.scene.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.6);
    backdrop.setScrollFactor(0);
    backdrop.setDepth(DEPTH.DIALOGUE + 9);
    backdrop.setInteractive();

    const panel = this.scene.add.nineslice(
      cx,
      cy,
      UI_KEYS.PANEL,
      undefined,
      panelW,
      panelH,
      UI_PANEL_SLICE.border,
      UI_PANEL_SLICE.border,
      UI_PANEL_SLICE.border,
      UI_PANEL_SLICE.border,
    );
    panel.setScrollFactor(0);
    panel.setDepth(DEPTH.DIALOGUE + 10);

    const titleText = this.scene.add
      .text(
        cx,
        cy - panelH / 2 + 26,
        options.title,
        textStyle({ fontSize: '15px', color: options.danger ? '#8a3a2a' : INK.dark, fontStyle: 'bold' }),
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.DIALOGUE + 10);

    const messageText = this.scene.add
      .text(
        cx,
        cy - 4,
        options.message,
        textStyle({ fontSize: '12px', color: INK.dark, align: 'center', wordWrap: { width: panelW - 44 } }),
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(DEPTH.DIALOGUE + 10);

    const finish = (action: (() => void) | undefined): void => {
      this.close();
      action?.();
    };

    const cancelBtn = createButton(this.scene, cx - 74, cy + panelH / 2 - 24, 110, 26, options.cancelLabel, () =>
      finish(options.onCancel),
    );
    const confirmBtn = createButton(this.scene, cx + 74, cy + panelH / 2 - 24, 110, 26, options.confirmLabel, () =>
      finish(options.onConfirm),
    );
    [cancelBtn, confirmBtn].forEach((btn) => {
      btn.setScrollFactor(0);
      btn.setDepth(DEPTH.DIALOGUE + 10);
    });

    backdrop.on('pointerdown', () => finish(options.onCancel));

    const keyboard = this.scene.input.keyboard;
    const onEsc = () => finish(options.onCancel);
    const onConfirmKey = () => finish(options.onConfirm);
    keyboard?.on('keydown-ESC', onEsc);
    keyboard?.on('keydown-E', onConfirmKey);
    keyboard?.on('keydown-ENTER', onConfirmKey);

    this.cleanup = () => {
      keyboard?.off('keydown-ESC', onEsc);
      keyboard?.off('keydown-E', onConfirmKey);
      keyboard?.off('keydown-ENTER', onConfirmKey);
      [backdrop, panel, titleText, messageText, cancelBtn, confirmBtn].forEach((obj) => obj.destroy());
    };
  }

  private close(): void {
    this.active = false;
    this.cleanup?.();
    this.cleanup = null;
  }
}
