import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import { SaveData } from '../core/SaveData';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '../core/i18n/languages';
import { createButton } from '../ui/Button';

/** Shown once, before the very first playthrough, so the player can confirm/change the detected language. */
export class LanguageSelectScene extends Phaser.Scene {
  private selected: LanguageCode = 'en';

  constructor() {
    super(SCENE_KEYS.LANGUAGE_SELECT);
  }

  create(): void {
    this.selected = Localization.getLanguage();
    this.redraw();
  }

  private redraw(): void {
    this.children.removeAll(true);
    this.cameras.main.setBackgroundColor('#2c2521');

    this.add
      .text(GAME_WIDTH / 2, 26, Localization.t(K.LANGUAGE_SELECT_TITLE), {
        fontFamily: 'Georgia, serif',
        fontSize: '18px',
        color: '#fffaf0',
      })
      .setOrigin(0.5);

    this.add
      .text(GAME_WIDTH / 2, 46, Localization.t(K.LANGUAGE_SELECT_SUBTITLE), {
        fontFamily: 'Georgia, serif',
        fontSize: '11px',
        color: '#c9beac',
      })
      .setOrigin(0.5);

    const cols = 3;
    const rows = Math.ceil(SUPPORTED_LANGUAGES.length / cols);
    const gridW = 420;
    const gridH = 150;
    const cellW = gridW / cols;
    const cellH = gridH / rows;
    const startX = GAME_WIDTH / 2 - gridW / 2 + cellW / 2;
    const startY = 76;

    SUPPORTED_LANGUAGES.forEach((lang, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * cellW;
      const y = startY + row * cellH;
      const button = createButton(this, x, y, cellW - 12, cellH - 10, lang.nativeName, () => {
        this.selected = lang.code;
        Localization.setLanguage(lang.code);
        this.redraw();
      });
      if (lang.code === this.selected) {
        (button.list[0] as Phaser.GameObjects.NineSlice).setTint(0xd8c9a0);
      }
    });

    createButton(this, GAME_WIDTH / 2, GAME_HEIGHT - 26, 170, 30, Localization.t(K.LANGUAGE_SELECT_CONFIRM), () => {
      SaveData.setLanguage(this.selected, true);
      this.scene.start(SCENE_KEYS.HOME);
    });
  }
}
