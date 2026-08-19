import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import { createButton } from '../ui/Button';
import { textStyle } from '../ui/text';

/** Placeholder for the cross-promotion screen showing the studio's other games. */
export class MoreGamesScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.MORE_GAMES);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#2c2521');

    this.add
      .text(GAME_WIDTH / 2, 90, Localization.t(K.MORE_GAMES_TITLE), textStyle({ fontSize: '20px', color: '#fffaf0' }))
      .setOrigin(0.5);

    this.add
      .text(
        GAME_WIDTH / 2,
        130,
        Localization.t(K.MORE_GAMES_COMING_SOON),
        textStyle({ fontSize: '13px', color: '#c9beac', align: 'center', wordWrap: { width: GAME_WIDTH - 80 } }),
      )
      .setOrigin(0.5);

    createButton(this, GAME_WIDTH / 2, 200, 120, 30, Localization.t(K.COMMON_BACK), () => {
      this.scene.start(SCENE_KEYS.HOME);
    });
  }
}
