import Phaser from 'phaser';
import { SCENE_KEYS } from '../core/constants';
import { SaveData } from '../core/SaveData';
import { Localization } from '../core/i18n/Localization';
import { AudioManager } from '../core/AudioManager';
import { detectDeviceLanguage } from '../core/i18n/languages';
import { registerCharacterTextures, registerCharacterAnimations } from '../pixelart/characters';
import { registerPortraitTextures } from '../pixelart/portraits';
import { registerTileset } from '../pixelart/tiles';
import { registerProps } from '../pixelart/props';
import { registerInteriorProps } from '../pixelart/interiorProps';
import { registerUiTextures } from '../pixelart/ui';
import { registerHomeIllustration } from '../pixelart/homeIllustration';
import { registerJourneyIcons } from '../pixelart/journeyIcons';
import { registerRosaryTextures } from '../pixelart/rosary';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
  }

  create(): void {
    registerCharacterTextures(this);
    registerCharacterAnimations(this);
    registerPortraitTextures(this);
    registerTileset(this);
    registerProps(this);
    registerInteriorProps(this);
    registerUiTextures(this);
    registerHomeIllustration(this);
    registerJourneyIcons(this);
    registerRosaryTextures(this);

    AudioManager.init(this.sound);

    // Art-direction review sandbox — see VisualTestScene.ts. Never part of the normal flow.
    // The window flag exists only so a standalone preview build can force this without a URL
    // it doesn't control (e.g. an Artifact preview page) — it is never set in the real game.
    const forceVisualTest = Boolean((window as unknown as { __FORCE_VISUALTEST__?: boolean }).__FORCE_VISUALTEST__);
    if (forceVisualTest || new URLSearchParams(window.location.search).has('visualtest')) {
      this.scene.start('VisualTestScene');
      return;
    }

    const save = SaveData.get();
    if (save.languageConfirmed) {
      Localization.setLanguage(save.language);
      this.scene.start(SCENE_KEYS.HOME);
    } else {
      // First launch: pre-select the detected device language, but let the
      // player confirm/change it before anything else happens.
      Localization.setLanguage(detectDeviceLanguage());
      this.scene.start(SCENE_KEYS.LANGUAGE_SELECT);
    }
  }
}
