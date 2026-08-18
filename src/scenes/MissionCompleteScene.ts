import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import { mission01 } from '../data/missions/mission01';
import { PROP_KEYS } from '../pixelart/props';
import { createButton } from '../ui/Button';

export class MissionCompleteScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.MISSION_COMPLETE);
  }

  create(): void {
    this.cameras.main.setBackgroundColor('#2c2521');
    this.cameras.main.fadeIn(600, 0, 0, 0);

    const bead = this.add.image(GAME_WIDTH / 2, 60, PROP_KEYS.ROSARY_BEAD);
    bead.setDisplaySize(28, 28);

    this.add
      .text(GAME_WIDTH / 2, 100, Localization.t(K.MISSION_COMPLETE_TITLE), {
        fontFamily: 'Georgia, serif',
        fontSize: '22px',
        color: '#fffaf0',
      })
      .setOrigin(0.5);

    if (mission01.titleKey) {
      this.add
        .text(GAME_WIDTH / 2, 130, Localization.t(mission01.titleKey), {
          fontFamily: 'Georgia, serif',
          fontSize: '14px',
          color: '#d8c9a0',
        })
        .setOrigin(0.5);
    }

    if (mission01.dateKey) {
      this.add
        .text(GAME_WIDTH / 2, 150, Localization.t(mission01.dateKey), {
          fontFamily: 'Georgia, serif',
          fontSize: '12px',
          color: '#c9beac',
        })
        .setOrigin(0.5);
    }

    createButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 50, 200, 34, Localization.t(K.MISSION_COMPLETE_CONTINUE), () => {
      this.scene.start(SCENE_KEYS.OVERWORLD);
    });
  }
}
