import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import { HOME_ILLUSTRATION_KEY } from '../pixelart/homeIllustration';
import { UI_KEYS } from '../pixelart/ui';
import { createButton } from '../ui/Button';

export class HomeScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.HOME);
  }

  create(): void {
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, HOME_ILLUSTRATION_KEY);
    bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(GAME_WIDTH / 2, 26, 'The Lady of Lourdes', {
        fontFamily: 'Georgia, serif',
        fontSize: '20px',
        color: '#fffaf0',
        stroke: '#3a3226',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    const gear = this.add.image(28, 24, UI_KEYS.GEAR).setScale(1.4).setInteractive({ useHandCursor: true });
    gear.setDepth(DEPTH.UI);
    const settingsLabel = this.add.text(46, 24, Localization.t(K.HOME_SETTINGS), {
      fontFamily: 'Georgia, serif',
      fontSize: '11px',
      color: '#fffaf0',
      stroke: '#3a3226',
      strokeThickness: 3,
    });
    settingsLabel.setOrigin(0, 0.5);
    gear.on('pointerdown', () => this.openSettings());
    settingsLabel.setInteractive({ useHandCursor: true }).on('pointerdown', () => this.openSettings());

    createButton(this, GAME_WIDTH / 2, 196, 160, 34, Localization.t(K.HOME_PLAY), () => {
      this.scene.start(SCENE_KEYS.OVERWORLD);
    });

    createButton(this, GAME_WIDTH / 2, 236, 160, 30, Localization.t(K.HOME_MORE_GAMES), () => {
      this.scene.start(SCENE_KEYS.MORE_GAMES);
    });
  }

  private openSettings(): void {
    this.scene.launch(SCENE_KEYS.SETTINGS, { returnTo: SCENE_KEYS.HOME });
    this.scene.pause();
  }
}
