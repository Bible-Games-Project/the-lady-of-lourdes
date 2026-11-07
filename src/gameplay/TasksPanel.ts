import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import { UI_KEYS, UI_PANEL_SLICE } from '../pixelart/ui';
import { MissionManager } from './MissionManager';
import { createText, INK } from '../ui/text';

/**
 * Compact "TASKS" button + checklist panel, replacing a persistent
 * on-screen objective box. Opens/closes with a tap on the button, E, or
 * Escape — never only through the touch joystick.
 */
export class TasksPanel {
  private scene: Phaser.Scene;
  private button: Phaser.GameObjects.Container;
  private buttonLabel: Phaser.GameObjects.DOMElement;
  private notice: Phaser.GameObjects.DOMElement;
  private noticeTimer: Phaser.Time.TimerEvent | null = null;
  private panelObjects: Phaser.GameObjects.GameObject[] = [];
  private open = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const bg = scene.add.nineslice(
      0,
      0,
      UI_KEYS.BUTTON,
      undefined,
      92,
      22,
      UI_PANEL_SLICE.border,
      UI_PANEL_SLICE.border,
      UI_PANEL_SLICE.border,
      UI_PANEL_SLICE.border,
    );
    const icon = scene.add.image(-30, 0, UI_KEYS.SCROLL).setScale(0.8);

    this.button = scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT - 16, [bg, icon]);
    this.button.setSize(92, 22);
    this.button.setScrollFactor(0);
    this.button.setDepth(DEPTH.UI);
    this.button.setInteractive({ useHandCursor: true });
    this.button.on('pointerup', () => this.toggle());

    // Independent DOM element, not nested in `this.button` (see `ui/Button.ts`'s own doc comment on
    // why DOM Elements don't follow a Container's transform) -- safe here since this button's
    // position is set once above and never changes afterward.
    this.buttonLabel = createText(scene, GAME_WIDTH / 2 - 14, GAME_HEIGHT - 16, Localization.t(K.TASKS_BUTTON), {
      fontSize: '11px',
      color: INK.dark,
      fontStyle: 'bold',
    });
    this.buttonLabel.setOrigin(0, 0.5);
    this.buttonLabel.setScrollFactor(0);
    this.buttonLabel.setDepth(DEPTH.UI);

    this.notice = createText(scene, GAME_WIDTH / 2, GAME_HEIGHT - 40, '', {
      fontSize: '11px',
      color: '#fffaf0',
      backgroundColor: '#3a3226cc',
      padding: { x: 6, y: 3 },
    });
    this.notice.setOrigin(0.5);
    this.notice.setScrollFactor(0);
    this.notice.setDepth(DEPTH.UI);
    this.notice.setAlpha(0);

    scene.input.keyboard?.on('keydown-E', () => {
      if (this.open) this.close();
    });
    scene.input.keyboard?.on('keydown-ESC', () => {
      if (this.open) this.close();
    });
  }

  isOpen(): boolean {
    return this.open;
  }

  toggle(): void {
    if (this.open) this.close();
    else this.openPanel();
  }

  private openPanel(): void {
    if (this.open) return;
    this.open = true;

    const entries = MissionManager.getObjectivesWithStatus();
    const panelW = 220;
    const lineH = 16;
    const panelH = 40 + Math.max(1, entries.length) * lineH;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT - 16 - panelH / 2 - 18;

    const backdrop = this.scene.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.25);
    backdrop.setScrollFactor(0);
    backdrop.setDepth(DEPTH.DIALOGUE);
    backdrop.setInteractive();
    backdrop.on('pointerup', () => this.close());

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
    panel.setDepth(DEPTH.DIALOGUE + 1);

    const title = createText(this.scene, cx, cy - panelH / 2 + 14, Localization.t(K.TASKS_TITLE), { fontSize: '13px', color: INK.dark, fontStyle: 'bold' });
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(DEPTH.DIALOGUE + 1);

    const lines: Phaser.GameObjects.DOMElement[] = entries.map((entry, i) => {
      const mark = entry.completed ? '✓' : '□';
      const color = entry.completed ? '#5f7d45' : entry.current ? INK.dark : '#8a7a5a';
      const text = createText(this.scene, cx - panelW / 2 + 16, cy - panelH / 2 + 32 + i * lineH, `${mark} ${entry.text}`, {
        fontSize: '11px',
        color,
      });
      text.setScrollFactor(0);
      text.setDepth(DEPTH.DIALOGUE + 1);
      return text;
    });

    this.panelObjects = [backdrop, panel, title, ...lines];
  }

  private close(): void {
    if (!this.open) return;
    this.open = false;
    this.panelObjects.forEach((obj) => obj.destroy());
    this.panelObjects = [];
  }

  /** Call right after MissionManager.advanceObjective() so the player notices progress even with the panel closed. */
  notifyNewObjective(): void {
    if (this.open) {
      this.close();
      this.openPanel();
    }
    this.notice.setText(Localization.t(K.TASKS_NEW_OBJECTIVE));
    this.notice.setAlpha(1);
    this.noticeTimer?.remove();
    this.noticeTimer = this.scene.time.delayedCall(1800, () => this.notice.setAlpha(0));
  }

  destroy(): void {
    this.close();
    this.button.destroy();
    this.buttonLabel.destroy();
    this.notice.destroy();
    this.noticeTimer?.remove();
  }
}
