import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import { HOME_BACKGROUND_KEY } from '../assets/home/homeBackground';
import { HOME_PALETTE } from '../pixelart/homePalette';
import { UI_KEYS, UI_HOME_BUTTON_SLICE } from '../pixelart/ui';
import { createButton } from '../ui/Button';
import { textStyle } from '../ui/text';

export class HomeScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.HOME);
  }

  create(): void {
    this.buildBackground();
    this.buildTitle();

    // Settings: pixel-art gear, top-right corner, out of the way of the illustration.
    const gear = this.add
      .image(GAME_WIDTH - 24, 22, UI_KEYS.HOME_GEAR)
      .setScale(1.2)
      .setInteractive({ useHandCursor: true });
    gear.setDepth(DEPTH.UI);
    gear.on('pointerover', () => gear.setTint(0xfffdf5));
    gear.on('pointerout', () => gear.clearTint());
    gear.on('pointerdown', () => this.openSettings());

    // Small, mostly-transparent, and pushed into the bottom corners so the central artwork —
    // Bernadette especially — stays unobstructed.
    const buttonWidth = 112;
    const buttonHeight = 26;
    const marginX = 16;
    const marginY = 16;

    const buttonStyle = {
      textureKey: UI_KEYS.HOME_BUTTON,
      border: UI_HOME_BUTTON_SLICE.border,
      textColor: HOME_PALETTE.cream,
      hoverTint: 0xfff8e8,
      panelAlpha: 0.2,
      textStroke: { color: HOME_PALETTE.ink, thickness: 3 },
    };

    createButton(
      this,
      marginX + buttonWidth / 2,
      GAME_HEIGHT - marginY - buttonHeight / 2,
      buttonWidth,
      buttonHeight,
      Localization.t(K.HOME_PLAY),
      () => {
        this.scene.start(SCENE_KEYS.JOURNEY);
      },
      buttonStyle,
    );

    createButton(
      this,
      GAME_WIDTH - marginX - buttonWidth / 2,
      GAME_HEIGHT - marginY - buttonHeight / 2,
      buttonWidth,
      buttonHeight,
      Localization.t(K.HOME_MORE_GAMES),
      () => {
        this.scene.start(SCENE_KEYS.MORE_GAMES);
      },
      buttonStyle,
    );
  }

  /**
   * The maintainer's own artwork, used as-is — no crop/recompose, just a uniform "cover" scale
   * (never a non-uniform stretch, which would distort it) so it fills the frame edge-to-edge.
   * The source is already 16:9, so in practice this is an exact fit with no visible crop.
   */
  private buildBackground(): void {
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, HOME_BACKGROUND_KEY);
    const scale = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
    bg.setScale(scale);
  }

  /**
   * Same design as before — cream fill, hard-edge pixel shadow, gold rule — but with a full
   * dark outline added around the fill this time. A single offset shadow only helps where the
   * shadow itself lands on something lighter; over a busy photo (bright sky at the top here)
   * that leaves some of the letterforms with too little contrast. An all-around stroke holds up
   * regardless of what's behind it.
   */
  private buildTitle(): void {
    const style = textStyle({
      fontSize: '20px',
      color: HOME_PALETTE.cream,
      fontStyle: 'bold',
      stroke: HOME_PALETTE.ink,
      strokeThickness: 4,
    });
    const shadowStyle = textStyle({ fontSize: '20px', color: HOME_PALETTE.ink, fontStyle: 'bold' });

    this.add.text(GAME_WIDTH / 2 + 2, 28, 'The Lady of Lourdes', shadowStyle).setOrigin(0.5);
    this.add.text(GAME_WIDTH / 2, 26, 'The Lady of Lourdes', style).setOrigin(0.5);

    const ruleY = 40;
    const ruleHalfWidth = 60;
    const rule = this.add.graphics();
    rule.fillStyle(Phaser.Display.Color.HexStringToColor(HOME_PALETTE.glowGold).color, 0.9);
    rule.fillRect(GAME_WIDTH / 2 - ruleHalfWidth, ruleY, ruleHalfWidth - 6, 1);
    rule.fillRect(GAME_WIDTH / 2 + 6, ruleY, ruleHalfWidth - 6, 1);
    rule.fillRect(GAME_WIDTH / 2 - 2, ruleY - 2, 4, 4);
  }

  private openSettings(): void {
    this.scene.launch(SCENE_KEYS.SETTINGS, { returnTo: SCENE_KEYS.HOME });
    this.scene.pause();
  }
}
