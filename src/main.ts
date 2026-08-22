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
  // Phaser renders simultaneously-active scenes in this array's order (earlier = further back),
  // regardless of which was launched more recently — `scene.launch()` activates an already
  // -registered scene in place, it does not move it to the end. SettingsScene is `launch()`ed as
  // an overlay on top of Home *and* on top of gameplay scenes (Overworld/Cachot, via the in-game
  // gear), so it must be listed after every scene it can be opened over, or it silently renders
  // *behind* them — fully present and interactive, just invisible. Keep it last.
  scene: [
    BootScene,
    LanguageSelectScene,
    HomeScene,
    MoreGamesScene,
    ApparitionJourneyScene,
    OverworldScene,
    CachotScene,
    MissionCompleteScene,
    SettingsScene,
  ],
};

new Phaser.Game(config);
