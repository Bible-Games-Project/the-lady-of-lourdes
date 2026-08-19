import Phaser from 'phaser';
import { DEPTH, GAME_WIDTH, SCENE_KEYS } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import { UI_KEYS } from '../pixelart/ui';
import { ConfirmDialog } from '../ui/ConfirmDialog';

/**
 * Top-right in-gameplay controls: a settings gear and a home button. Home
 * always confirms before leaving — completed-mission progress is already
 * saved as it happens, so leaving mid-mission never loses it.
 */
export class GameplayTopBar {
  private confirmDialog: ConfirmDialog;

  constructor(scene: Phaser.Scene) {
    this.confirmDialog = new ConfirmDialog(scene);

    const gear = scene.add.image(GAME_WIDTH - 44, 20, UI_KEYS.GEAR).setScale(1.2).setInteractive({ useHandCursor: true });
    gear.setScrollFactor(0);
    gear.setDepth(DEPTH.UI);
    gear.on('pointerup', () => {
      scene.scene.launch(SCENE_KEYS.SETTINGS, { returnTo: scene.scene.key });
      scene.scene.pause();
    });

    const home = scene.add.image(GAME_WIDTH - 20, 20, UI_KEYS.HOME).setScale(1.2).setInteractive({ useHandCursor: true });
    home.setScrollFactor(0);
    home.setDepth(DEPTH.UI);
    home.on('pointerup', () => {
      this.confirmDialog.show({
        title: Localization.t(K.HOME_CONFIRM_TITLE),
        message: Localization.t(K.HOME_CONFIRM_MESSAGE),
        confirmLabel: Localization.t(K.COMMON_HOME),
        cancelLabel: Localization.t(K.COMMON_CANCEL),
        onConfirm: () => scene.scene.start(SCENE_KEYS.HOME),
      });
    });
  }

  /** True while the home confirmation is open — gate gameplay input/movement on this. */
  isBlocking(): boolean {
    return this.confirmDialog.isActive();
  }
}
