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
import { registerJourneyIcons } from '../pixelart/journeyIcons';
import { registerRosaryTextures } from '../pixelart/rosary';
import { HOME_BACKGROUND_KEY, preloadHomeBackground } from '../assets/home/homeBackground';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
  }

  preload(): void {
    preloadHomeBackground(this);
  }

  create(): void {
    registerCharacterTextures(this);
    registerCharacterAnimations(this);
    registerPortraitTextures(this);
    registerTileset(this);
    registerProps(this);
    registerInteriorProps(this);
    registerUiTextures(this);
    registerJourneyIcons(this);
    registerRosaryTextures(this);

    // The Home background is the maintainer's own finished art (soft/anti-aliased), not the
    // procedural pixel grids the rest of the game uses. The game runs with `pixelArt: true`
    // (nearest-neighbor everywhere by default) — force linear filtering on this one texture so
    // it scales smoothly instead of going jagged.
    this.textures.get(HOME_BACKGROUND_KEY).setFilter(Phaser.Textures.FilterMode.LINEAR);

    AudioManager.init(this.sound);

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
