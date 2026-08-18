import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import { SaveData } from '../core/SaveData';
import { AudioManager } from '../core/AudioManager';
import { SUPPORTED_LANGUAGES } from '../core/i18n/languages';
import { UI_KEYS, UI_PANEL_SLICE } from '../pixelart/ui';
import { createButton } from '../ui/Button';
import { createToggle } from '../ui/Toggle';
import { createSlider } from '../ui/Slider';

interface SettingsSceneData {
  returnTo?: string;
}

/** Settings overlay: launched on top of a paused scene, resumes it on close. */
export class SettingsScene extends Phaser.Scene {
  private returnTo: string = SCENE_KEYS.HOME;
  private showingLanguageList = false;

  constructor() {
    super(SCENE_KEYS.SETTINGS);
  }

  init(data: SettingsSceneData): void {
    this.returnTo = data.returnTo ?? SCENE_KEYS.HOME;
    this.showingLanguageList = false;
  }

  create(): void {
    this.redraw();
  }

  private redraw(): void {
    this.children.removeAll(true);
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.55);

    if (this.showingLanguageList) {
      this.renderLanguageList();
    } else {
      this.renderMainPanel();
    }
  }

  private panel(cx: number, cy: number, w: number, h: number): void {
    this.add.nineslice(
      cx,
      cy,
      UI_KEYS.PANEL,
      undefined,
      w,
      h,
      UI_PANEL_SLICE.border,
      UI_PANEL_SLICE.border,
      UI_PANEL_SLICE.border,
      UI_PANEL_SLICE.border,
    );
  }

  private renderMainPanel(): void {
    const panelW = 380;
    const panelH = 190;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.panel(cx, cy, panelW, panelH);

    this.add
      .text(cx, cy - panelH / 2 + 16, Localization.t(K.SETTINGS_TITLE), {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: '#3a3226',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const rowX = cx - panelW / 2 + 20;
    let rowY = cy - panelH / 2 + 46;
    const labelStyle = { fontFamily: 'Georgia, serif', fontSize: '12px', color: '#3a3226' };

    // Language.
    this.add.text(rowX, rowY, Localization.t(K.SETTINGS_LANGUAGE), labelStyle).setOrigin(0, 0.5);
    const currentLanguage = SUPPORTED_LANGUAGES.find((l) => l.code === Localization.getLanguage());
    createButton(this, cx + panelW / 2 - 76, rowY, 120, 24, currentLanguage?.nativeName ?? 'English', () => {
      this.showingLanguageList = true;
      this.redraw();
    });

    rowY += 44;

    // Music.
    this.add.text(rowX, rowY, Localization.t(K.SETTINGS_MUSIC), labelStyle).setOrigin(0, 0.5);
    const music = SaveData.get().music;
    const musicSlider = createSlider(this, rowX + 160, rowY, panelW - 210, music.volume, (v) => {
      SaveData.setMusicSettings({ volume: v });
      AudioManager.refresh();
    });
    musicSlider.setEnabled(music.enabled);
    createToggle(this, rowX + 90, rowY, music.enabled, (v) => {
      SaveData.setMusicSettings({ enabled: v });
      musicSlider.setEnabled(v);
      AudioManager.refresh();
    });

    rowY += 36;

    // SFX.
    this.add.text(rowX, rowY, Localization.t(K.SETTINGS_SFX), labelStyle).setOrigin(0, 0.5);
    const sfx = SaveData.get().sfx;
    const sfxSlider = createSlider(this, rowX + 160, rowY, panelW - 210, sfx.volume, (v) => {
      SaveData.setSfxSettings({ volume: v });
    });
    sfxSlider.setEnabled(sfx.enabled);
    createToggle(this, rowX + 90, rowY, sfx.enabled, (v) => {
      SaveData.setSfxSettings({ enabled: v });
      sfxSlider.setEnabled(v);
    });

    createButton(this, cx, cy + panelH / 2 - 22, 120, 26, Localization.t(K.COMMON_BACK), () => {
      this.scene.stop();
      this.scene.resume(this.returnTo);
    });
  }

  private renderLanguageList(): void {
    const panelW = 320;
    const panelH = 230;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.panel(cx, cy, panelW, panelH);

    this.add
      .text(cx, cy - panelH / 2 + 16, Localization.t(K.SETTINGS_LANGUAGE), {
        fontFamily: 'Georgia, serif',
        fontSize: '16px',
        color: '#3a3226',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    const rows = Math.ceil(SUPPORTED_LANGUAGES.length / 2);
    const colW = panelW / 2;
    const startX = cx - panelW / 2 + colW / 2;
    const startY = cy - panelH / 2 + 40;
    const rowH = 26;

    SUPPORTED_LANGUAGES.forEach((lang, i) => {
      const col = Math.floor(i / rows);
      const row = i % rows;
      const bx = startX + col * colW;
      const by = startY + row * rowH;
      createButton(this, bx, by, colW - 24, 22, lang.nativeName, () => {
        Localization.setLanguage(lang.code);
        SaveData.setLanguage(lang.code, true);
        this.showingLanguageList = false;
        this.redraw();
      });
    });

    createButton(this, cx, cy + panelH / 2 - 20, 100, 24, Localization.t(K.COMMON_BACK), () => {
      this.showingLanguageList = false;
      this.redraw();
    });
  }
}
