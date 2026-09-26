import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import { SaveData } from '../core/SaveData';
import { AudioManager } from '../core/AudioManager';
import { SUPPORTED_LANGUAGES } from '../core/i18n/languages';
import { UI_KEYS, UI_PANEL_SLICE, UI_HOME_BUTTON_SLICE } from '../pixelart/ui';
import { HOME_PALETTE } from '../pixelart/homePalette';
import { createButton, type ButtonStyle } from '../ui/Button';
import { createToggle } from '../ui/Toggle';
import { createSlider } from '../ui/Slider';
import { createText } from '../ui/text';
import { restoreSceneDom } from '../core/domPause';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { useFullBleedScale, useLetterboxScale } from '../core/scaleMode';

/**
 * Settings reuses the same warm cream/stone Home palette and the Home button texture (see
 * pixelart/homePalette.ts, pixelart/ui.ts) so the screen reads as belonging to the same artwork
 * — fully opaque here (unlike Home's own translucent buttons) since Settings sits over a plain
 * dark overlay, not the illustration itself, and needs full readability.
 */
const SETTINGS_BUTTON_STYLE: ButtonStyle = {
  textureKey: UI_KEYS.HOME_BUTTON,
  border: UI_HOME_BUTTON_SLICE.border,
  textColor: HOME_PALETTE.ink,
};

/** Scenes whose own screen is full-bleed (see core/scaleMode.ts) — Settings restores to this
 *  scale mode on close if it's returning to one of them, or to the letterboxed gameplay mode
 *  otherwise, since Settings can be reached from either kind of screen. */
const FULL_BLEED_RETURN_SCENES: string[] = [SCENE_KEYS.HOME];

interface SettingsSceneData {
  returnTo?: string;
}

/** Settings overlay: launched on top of a paused scene, resumes it on close. */
export class SettingsScene extends Phaser.Scene {
  private returnTo: string = SCENE_KEYS.HOME;
  private showingLanguageList = false;
  private confirmDialog!: ConfirmDialog;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  // `redraw()` wipes the scene via `this.children.removeAll(true)`, but DOM-based text (see
  // `ui/text.ts`) lives in Phaser's separate DOM container, not `this.children` -- these are never
  // touched by that call and must be torn down manually or they'd leak/stack on every redraw.
  private domTexts: Phaser.GameObjects.DOMElement[] = [];

  constructor() {
    super(SCENE_KEYS.SETTINGS);
  }

  init(data: SettingsSceneData): void {
    this.returnTo = data.returnTo ?? SCENE_KEYS.HOME;
    this.showingLanguageList = false;
  }

  create(): void {
    useFullBleedScale(this);
    this.confirmDialog = new ConfirmDialog(this);
    this.keyEsc = this.input.keyboard!.addKey('ESC');
    this.redraw();
  }

  update(): void {
    if (Phaser.Input.Keyboard.JustDown(this.keyEsc) && !this.confirmDialog.isActive()) {
      if (this.showingLanguageList) {
        this.showingLanguageList = false;
        this.redraw();
      } else {
        this.close();
      }
    }
  }

  private close(): void {
    if (!FULL_BLEED_RETURN_SCENES.includes(this.returnTo)) {
      useLetterboxScale(this);
    }
    this.scene.stop();
    this.scene.resume(this.returnTo);
    const returning = this.scene.get(this.returnTo);
    if (returning) restoreSceneDom(returning);
  }

  private redraw(): void {
    this.children.removeAll(true);
    this.domTexts.forEach((t) => t.destroy());
    this.domTexts = [];
    const overlayColor = Phaser.Display.Color.HexStringToColor(HOME_PALETTE.ink).color;
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, overlayColor, 0.6);

    if (this.showingLanguageList) {
      this.renderLanguageList();
    } else {
      this.renderMainPanel();
    }
  }

  /** `createText()` result, tracked in `domTexts` so `redraw()` can tear it down -- see that
   * field's own doc comment. Every DOM label in this scene must go through this, not `createText`
   * directly. */
  private label(x: number, y: number, content: string, style: Parameters<typeof createText>[4]): Phaser.GameObjects.DOMElement {
    const text = createText(this, x, y, content, style);
    this.domTexts.push(text);
    return text;
  }

  private panel(cx: number, cy: number, w: number, h: number): void {
    this.add.nineslice(
      cx,
      cy,
      UI_KEYS.SETTINGS_PANEL,
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
    const panelH = 254;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.panel(cx, cy, panelW, panelH);

    this.label(cx, cy - panelH / 2 + 16, Localization.t(K.SETTINGS_TITLE), { fontSize: '16px', color: HOME_PALETTE.ink, fontStyle: 'bold' }).setOrigin(0.5);

    const rowX = cx - panelW / 2 + 20;
    let rowY = cy - panelH / 2 + 44;
    const labelStyle = { fontSize: '12px', color: HOME_PALETTE.ink };

    // Language.
    this.label(rowX, rowY, Localization.t(K.SETTINGS_LANGUAGE), labelStyle).setOrigin(0, 0.5);
    const currentLanguage = SUPPORTED_LANGUAGES.find((l) => l.code === Localization.getLanguage());
    createButton(
      this,
      cx + panelW / 2 - 76,
      rowY,
      120,
      24,
      currentLanguage?.nativeName ?? 'English',
      () => {
        this.showingLanguageList = true;
        this.redraw();
      },
      SETTINGS_BUTTON_STYLE,
    );

    rowY += 40;

    // Music.
    this.label(rowX, rowY, Localization.t(K.SETTINGS_MUSIC), labelStyle).setOrigin(0, 0.5);
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

    rowY += 34;

    // SFX.
    this.label(rowX, rowY, Localization.t(K.SETTINGS_SFX), labelStyle).setOrigin(0, 0.5);
    const sfx = SaveData.get().sfx;
    const sfxSlider = createSlider(this, rowX + 160, rowY, panelW - 210, sfx.volume, (v) => {
      SaveData.setSfxSettings({ volume: v });
    });
    sfxSlider.setEnabled(sfx.enabled);
    createToggle(this, rowX + 90, rowY, sfx.enabled, (v) => {
      SaveData.setSfxSettings({ enabled: v });
      sfxSlider.setEnabled(v);
    });

    rowY += 34;

    // Game Dev Mode.
    this.label(rowX, rowY, Localization.t(K.SETTINGS_GAME_DEV_MODE), labelStyle).setOrigin(0, 0.5);
    createToggle(this, rowX + 90, rowY, SaveData.get().gameDevMode, (v) => {
      SaveData.setGameDevMode(v);
    });

    rowY += 40;

    // Reset All Data.
    createButton(
      this,
      cx,
      rowY,
      panelW - 60,
      26,
      Localization.t(K.SETTINGS_RESET_DATA),
      () => {
        this.confirmDialog.show({
          title: Localization.t(K.RESET_CONFIRM_TITLE),
          message: Localization.t(K.RESET_CONFIRM_MESSAGE),
          confirmLabel: Localization.t(K.COMMON_RESET),
          cancelLabel: Localization.t(K.COMMON_CANCEL),
          danger: true,
          onConfirm: () => {
            SaveData.resetAll();
            window.location.reload();
          },
        });
      },
      SETTINGS_BUTTON_STYLE,
    );

    createButton(this, cx, cy + panelH / 2 - 22, 120, 26, Localization.t(K.COMMON_BACK), () => this.close(), SETTINGS_BUTTON_STYLE);
  }

  private renderLanguageList(): void {
    const panelW = 320;
    const panelH = 230;
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;
    this.panel(cx, cy, panelW, panelH);

    this.label(cx, cy - panelH / 2 + 16, Localization.t(K.SETTINGS_LANGUAGE), { fontSize: '16px', color: HOME_PALETTE.ink, fontStyle: 'bold' }).setOrigin(0.5);

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
      createButton(
        this,
        bx,
        by,
        colW - 24,
        22,
        lang.nativeName,
        () => {
          Localization.setLanguage(lang.code);
          SaveData.setLanguage(lang.code, true);
          this.showingLanguageList = false;
          this.redraw();
        },
        SETTINGS_BUTTON_STYLE,
      );
    });

    createButton(
      this,
      cx,
      cy + panelH / 2 - 20,
      100,
      24,
      Localization.t(K.COMMON_BACK),
      () => {
        this.showingLanguageList = false;
        this.redraw();
      },
      SETTINGS_BUTTON_STYLE,
    );
  }
}
