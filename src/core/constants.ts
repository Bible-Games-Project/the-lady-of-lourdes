export const TILE_SIZE = 16;

export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

export const SAVE_KEY = 'lourdes.save.v1';

export const SCENE_KEYS = {
  BOOT: 'BootScene',
  LANGUAGE_SELECT: 'LanguageSelectScene',
  HOME: 'HomeScene',
  SETTINGS: 'SettingsScene',
  MORE_GAMES: 'MoreGamesScene',
  JOURNEY: 'ApparitionJourneyScene',
  OVERWORLD: 'OverworldScene',
  CACHOT: 'CachotScene',
  MISSION_COMPLETE: 'MissionCompleteScene',
} as const;

// Ordered bottom-to-top: world layers, then persistent UI (joystick, tasks
// button, gear/home), then modal dialogue/confirm overlays, then full-screen
// fades/cinematics — each layer must draw over everything below it.
export const DEPTH = {
  GROUND: 0,
  PROPS: 5,
  ACTORS: 10,
  OVERLAY_LOW: 100,
  UI: 200,
  DIALOGUE: 300,
  FADE: 400,
} as const;
