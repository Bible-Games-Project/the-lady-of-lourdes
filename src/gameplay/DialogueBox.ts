import Phaser from 'phaser';
import { Localization } from '../core/i18n/Localization';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import { NPCS } from '../data/npc/npcRegistry';
import type { DialogueSequence } from '../data/dialogue/types';
import { portraitKeyFor } from '../pixelart/portraits';
import { UI_KEYS, UI_PANEL_SLICE } from '../pixelart/ui';
import { textStyle } from '../ui/text';
import { PortraitAnimator } from './PortraitAnimator';

const CHAR_DELAY_MS = 35;

/**
 * Single-speaker dialogue UI: shows only the portrait of whoever is talking,
 * with a fast, skippable typewriter effect. Reused by every scene that has
 * NPCs — instantiate once per scene and call start()/advance().
 */
export class DialogueBox {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private portrait: Phaser.GameObjects.Image;
  private portraitAnimator: PortraitAnimator;
  private nameText: Phaser.GameObjects.Text;
  private bodyText: Phaser.GameObjects.Text;
  private prompt: Phaser.GameObjects.Text;

  private sequence: DialogueSequence = [];
  private lineIndex = -1;
  private fullText = '';
  private typing = false;
  private typeTimer: Phaser.Time.TimerEvent | null = null;
  private onComplete: (() => void) | null = null;
  private active = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const boxWidth = GAME_WIDTH - 24;
    const boxHeight = 76;
    const x = GAME_WIDTH / 2;
    const y = GAME_HEIGHT - boxHeight / 2 - 8;

    const panel = scene.add.nineslice(
      0,
      0,
      UI_KEYS.PANEL,
      undefined,
      boxWidth,
      boxHeight,
      UI_PANEL_SLICE.border,
      UI_PANEL_SLICE.border,
      UI_PANEL_SLICE.border,
      UI_PANEL_SLICE.border,
    );

    this.portrait = scene.add.image(-boxWidth / 2 + 40, 0, portraitKeyFor('bernadette'));
    this.portrait.setDisplaySize(58, 67);
    this.portraitAnimator = new PortraitAnimator(scene, this.portrait);

    this.nameText = scene.add.text(
      -boxWidth / 2 + 76,
      -boxHeight / 2 + 10,
      '',
      textStyle({ fontSize: '13px', color: '#5a4d3a', fontStyle: 'bold' }),
    );

    this.bodyText = scene.add.text(
      -boxWidth / 2 + 76,
      -boxHeight / 2 + 28,
      '',
      textStyle({ fontSize: '13px', color: '#3a3226', wordWrap: { width: boxWidth - 92 }, lineSpacing: 4 }),
    );

    this.prompt = scene.add.text(
      boxWidth / 2 - 18,
      boxHeight / 2 - 18,
      '▼',
      textStyle({ fontSize: '12px', color: '#5a4d3a' }),
    );
    this.prompt.setVisible(false);

    this.container = scene.add.container(x, y, [panel, this.portrait, this.nameText, this.bodyText, this.prompt]);
    this.container.setDepth(DEPTH.DIALOGUE);
    this.container.setScrollFactor(0);
    this.container.setVisible(false);

    scene.input.on('pointerdown', () => this.advance());
    scene.input.keyboard?.on('keydown-SPACE', () => this.advance());
    scene.input.keyboard?.on('keydown-ENTER', () => this.advance());
    scene.input.keyboard?.on('keydown-E', () => this.advance());
  }

  start(sequence: DialogueSequence, onComplete?: () => void): void {
    this.sequence = sequence;
    this.lineIndex = -1;
    this.onComplete = onComplete ?? null;
    this.active = true;
    this.container.setVisible(true);
    this.nextLine();
  }

  isActive(): boolean {
    return this.active;
  }

  advance(): void {
    if (!this.active) return;
    if (this.typing) {
      this.completeTyping();
    } else {
      this.nextLine();
    }
  }

  private nextLine(): void {
    this.lineIndex++;
    if (this.lineIndex >= this.sequence.length) {
      this.close();
      return;
    }
    const line = this.sequence[this.lineIndex];
    const npc = NPCS[line.speaker];
    this.portraitAnimator.setSpeaker(line.speaker);
    this.nameText.setText(npc.nameKey ? Localization.t(npc.nameKey) : '');
    this.fullText = Localization.t(line.textKey);
    this.startTyping();
  }

  private startTyping(): void {
    this.bodyText.setText('');
    this.typing = true;
    this.prompt.setVisible(false);
    this.portraitAnimator.startTalking();
    let revealed = 0;
    this.typeTimer?.remove();
    this.typeTimer = this.scene.time.addEvent({
      delay: CHAR_DELAY_MS,
      loop: true,
      callback: () => {
        revealed++;
        this.bodyText.setText(this.fullText.slice(0, revealed));
        if (revealed >= this.fullText.length) {
          this.completeTyping();
        }
      },
    });
  }

  private completeTyping(): void {
    this.typeTimer?.remove();
    this.typeTimer = null;
    this.bodyText.setText(this.fullText);
    this.typing = false;
    this.prompt.setVisible(true);
    this.portraitAnimator.stopTalking();
  }

  private close(): void {
    this.active = false;
    this.container.setVisible(false);
    this.typeTimer?.remove();
    this.typeTimer = null;
    this.portraitAnimator.destroy();
    const callback = this.onComplete;
    this.onComplete = null;
    callback?.();
  }

  destroy(): void {
    this.typeTimer?.remove();
    this.portraitAnimator.destroy();
    this.container.destroy();
  }
}
