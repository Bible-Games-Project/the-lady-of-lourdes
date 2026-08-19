import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import { HOME_ILLUSTRATION_KEY } from '../pixelart/homeIllustration';
import { UI_KEYS } from '../pixelart/ui';
import { createButton } from '../ui/Button';
import { textStyle } from '../ui/text';

export class HomeScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.HOME);
  }

  create(): void {
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, HOME_ILLUSTRATION_KEY);
    bg.setDisplaySize(GAME_WIDTH, GAME_HEIGHT);

    this.add
      .text(
        GAME_WIDTH / 2,
        26,
        'The Lady of Lourdes',
        textStyle({ fontSize: '20px', color: '#fffaf0', stroke: '#3a3226', strokeThickness: 4 }),
      )
      .setOrigin(0.5);

    // Settings: small pixel-art gear, top-right corner, out of the way of the illustration.
    const gear = this.add
      .image(GAME_WIDTH - 24, 22, UI_KEYS.GEAR)
      .setScale(1.3)
      .setInteractive({ useHandCursor: true });
    gear.setDepth(DEPTH.UI);
    gear.on('pointerdown', () => this.openSettings());

    createButton(this, GAME_WIDTH / 2, 196, 160, 34, Localization.t(K.HOME_PLAY), () => {
      this.scene.start(SCENE_KEYS.JOURNEY);
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
