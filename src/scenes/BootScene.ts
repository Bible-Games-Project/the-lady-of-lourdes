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
import {
  HOME_BACKGROUND_KEY,
  HOME_BERNADETTE_CUTOUT_KEY,
  HOME_LADY_CUTOUT_KEY,
  HOME_CLOUD_CUTOUT_KEY,
  preloadHomeBackground,
} from '../assets/home/homeBackground';
import { registerHomeEffectTextures } from '../pixelart/homeEffects';

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
    registerHomeEffectTextures(this);

    // The Home background (and the Bernadette/Lady cutouts taken from it) are the maintainer's
    // own finished art (soft/anti-aliased), not the procedural pixel grids the rest of the game
    // uses. The game runs with `pixelArt: true` (nearest-neighbor everywhere by default) — force
    // linear filtering on these textures so they scale smoothly instead of going jagged.
    [HOME_BACKGROUND_KEY, HOME_BERNADETTE_CUTOUT_KEY, HOME_LADY_CUTOUT_KEY, HOME_CLOUD_CUTOUT_KEY].forEach((key) => {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    });

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
