import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './core/constants';
import { BootScene } from './scenes/BootScene';
import { LanguageSelectScene } from './scenes/LanguageSelectScene';
import { HomeScene } from './scenes/HomeScene';
import { SettingsScene } from './scenes/SettingsScene';
import { MoreGamesScene } from './scenes/MoreGamesScene';
import { ApparitionJourneyScene } from './scenes/ApparitionJourneyScene';
import { OverworldScene } from './scenes/OverworldScene';
import { CachotScene } from './scenes/CachotScene';
import { MassabielleScene } from './scenes/MassabielleScene';
import { MissionCompleteScene } from './scenes/MissionCompleteScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  width: GAME_WIDTH,
  height: GAME_HEIGHT,
  pixelArt: true,
  backgroundColor: '#0a0a0f',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: { debug: false },
  },
  scene: [
    BootScene,
    LanguageSelectScene,
    HomeScene,
    SettingsScene,
    MoreGamesScene,
    ApparitionJourneyScene,
    OverworldScene,
    CachotScene,
    MassabielleScene,
    MissionCompleteScene,
  ],
};

new Phaser.Game(config);
