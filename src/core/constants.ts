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
  OVERWORLD: 'OverworldScene',
  CACHOT: 'CachotScene',
  MASSABIELLE: 'MassabielleScene',
  MISSION_COMPLETE: 'MissionCompleteScene',
} as const;

export const DEPTH = {
  GROUND: 0,
  PROPS: 5,
  ACTORS: 10,
  OVERLAY_LOW: 100,
  DIALOGUE: 200,
  FADE: 300,
  UI: 400,
} as const;
