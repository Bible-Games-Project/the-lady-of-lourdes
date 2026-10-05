export const TILE_SIZE = 16;

// All gameplay/layout code in the rest of the codebase positions things in this "logical" 480x270
// space -- it predates PIXEL_SCALE below and must keep meaning exactly what it always has (world
// tile positions, UI margins, wordWrap widths, camera-follow half-extents, etc.) so none of that
// code needs to change. Do NOT multiply these by PIXEL_SCALE -- RENDER_WIDTH/RENDER_HEIGHT below
// are the only things that actually grow.
export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;

// How many actual framebuffer pixels back one logical GAME_WIDTH/GAME_HEIGHT unit. Raised from the
// implicit `1` every scene used to run at (canvas resolution == GAME_WIDTH/GAME_HEIGHT, main camera
// zoom == 1) specifically so real/painted-art sprites (the sister, buildings, trees) get more actual
// resolved pixels at their same on-screen size instead of being downsampled into a tiny 480x270
// frame and then blown up blocky -- see `sisterSprite.ts`'s own doc comment for the investigation
// that led here ("se ve super pixelado" could not be fixed by resizing the *source* texture, because
// the bottleneck was the 36-pixel-tall *output* resolution, not the input). `main.ts` sizes the
// actual `Phaser.Game` canvas to RENDER_WIDTH/RENDER_HEIGHT; every scene then sets its main camera's
// zoom to this same factor (`core/scaleMode.ts`'s `setScaleMode()`, the one place every scene's
// `create()` already calls) so one logical unit still maps to the same *screen* position/size as
// before -- the camera's zoom and the canvas's doubled resolution exactly cancel out for CSS-pixel
// screen placement (scrollFactor(0) UI included, since zoom scales those too), while every sprite
// drawn through that camera gets PIXEL_SCALE-times the backing framebuffer pixels. The one place
// this ISN'T free: any code that reads raw `pointer.x`/`pointer.y` (canvas-pixel space, NOT
// camera/zoom-aware -- unlike `pointer.worldX`/`worldY`) and compares/combines it with a
// GAME_WIDTH-relative ("logical") coordinate must divide by the current camera's `.zoom` first, or
// use `pointer.worldX`/`worldY` instead -- see `TouchControls.ts`, `Slider.ts`, `MapEditorPanel.ts`'s
// panel-edge check, `OverworldScene.ts`'s editor pan, and `ApparitionJourneyScene.ts`'s drag/tap for
// the handful of call sites that needed this fix.
export const PIXEL_SCALE = 2;

export const RENDER_WIDTH = GAME_WIDTH * PIXEL_SCALE;
export const RENDER_HEIGHT = GAME_HEIGHT * PIXEL_SCALE;

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
