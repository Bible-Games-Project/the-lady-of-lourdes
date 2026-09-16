import Phaser from 'phaser';
import { SCENE_KEYS } from '../core/constants';
import { SaveData } from '../core/SaveData';
import { Localization } from '../core/i18n/Localization';
import { AudioManager } from '../core/AudioManager';
import { detectDeviceLanguage } from '../core/i18n/languages';
import { registerCharacterTextures, registerCharacterAnimations, registerBernadetteShadowTexture } from '../pixelart/characters';
import { registerPortraitTextures } from '../pixelart/portraits';
import { registerTileset } from '../pixelart/tiles';
import { registerProps } from '../pixelart/props';
import { registerInteriorProps } from '../pixelart/interiorProps';
import { registerUiTextures } from '../pixelart/ui';
import { registerJourneyIcons } from '../pixelart/journeyIcons';
import { registerRosaryTextures } from '../pixelart/rosary';
import {
  HOME_BACKGROUND_KEY,
  HOME_BERNADETTE_TORSO_CUTOUT_KEY,
  preloadHomeBackground,
} from '../assets/home/homeBackground';
import { registerHomeEffectTextures } from '../pixelart/homeEffects';
import { JOURNEY_MAP_KEY, preloadJourneyMap } from '../assets/journey/journeyMap';
import { preloadBernadetteSprite, registerBernadetteSprite } from '../assets/player/bernadetteSprite';
import { preloadSisterSprite, registerSisterSprite } from '../assets/npc/sisterSprite';
import { preloadMotherSprite, registerMotherSprite } from '../assets/npc/motherSprite';
import { preloadJeanneSprite, registerJeanneSprite } from '../assets/npc/jeanneSprite';
import { preloadBoySprite, registerBoySprite } from '../assets/npc/boySprite';
import { preloadBernadettePortrait } from '../assets/portraits/bernadettePortrait';
import { preloadJeannePortrait } from '../assets/portraits/jeannePortrait';
import { preloadBoyPortrait } from '../assets/portraits/boyPortrait';
import { preloadLourdesGrass } from '../assets/terrain/lourdesGrass';
import { preloadLourdesChurch } from '../assets/buildings/lourdesChurch';
import { preloadLourdesPresbytery } from '../assets/buildings/lourdesPresbytery';
import { preloadLourdesCachotExterior } from '../assets/buildings/lourdesCachotExterior';
import { preloadLourdesCachotInterior } from '../assets/interiors/lourdesCachotInterior';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.BOOT);
  }

  preload(): void {
    preloadHomeBackground(this);
    preloadJourneyMap(this);
    preloadBernadetteSprite(this);
    preloadSisterSprite(this);
    preloadMotherSprite(this);
    preloadJeanneSprite(this);
    preloadBoySprite(this);
    preloadBernadettePortrait(this);
    preloadJeannePortrait(this);
    preloadBoyPortrait(this);
    preloadLourdesGrass(this);
    preloadLourdesChurch(this);
    preloadLourdesPresbytery(this);
    preloadLourdesCachotExterior(this);
    preloadLourdesCachotInterior(this);
  }

  create(): void {
    registerCharacterTextures(this);
    registerCharacterAnimations(this);
    registerBernadetteSprite(this);
    registerSisterSprite(this);
    registerMotherSprite(this);
    registerJeanneSprite(this);
    registerBoySprite(this);
    registerBernadetteShadowTexture(this);
    registerPortraitTextures(this);
    registerTileset(this);
    registerProps(this);
    registerInteriorProps(this);
    registerUiTextures(this);
    registerJourneyIcons(this);
    registerRosaryTextures(this);
    registerHomeEffectTextures(this);

    // The Home background (and the small Bernadette torso cutout taken from it) are the
    // maintainer's own finished art (soft/anti-aliased), not the procedural pixel grids the rest
    // of the game uses. The game runs with `pixelArt: true` (nearest-neighbor everywhere by
    // default) — force linear filtering on these textures so they scale smoothly instead of
    // going jagged.
    [HOME_BACKGROUND_KEY, HOME_BERNADETTE_TORSO_CUTOUT_KEY, JOURNEY_MAP_KEY].forEach((key) => {
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
