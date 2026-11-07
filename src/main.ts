import Phaser from 'phaser';
import { RENDER_WIDTH, RENDER_HEIGHT } from './core/constants';
import { installCrispTextFilter } from './core/textRendering';
import { BootScene } from './scenes/BootScene';
import { LanguageSelectScene } from './scenes/LanguageSelectScene';
import { HomeScene } from './scenes/HomeScene';
import { SettingsScene } from './scenes/SettingsScene';
import { MoreGamesScene } from './scenes/MoreGamesScene';
import { ApparitionJourneyScene } from './scenes/ApparitionJourneyScene';
import { OverworldScene } from './scenes/OverworldScene';
import { CachotScene } from './scenes/CachotScene';
import { MissionCompleteScene } from './scenes/MissionCompleteScene';

installCrispTextFilter();

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'app',
  // The actual framebuffer resolution -- `PIXEL_SCALE`-times bigger than the logical GAME_WIDTH/
  // GAME_HEIGHT every scene still positions things in (see `constants.ts`'s own doc comment on
  // `PIXEL_SCALE` for why those two are deliberately different numbers now, and how every scene's
  // camera zoom reconciles them back to the same on-screen result).
  width: RENDER_WIDTH,
  height: RENDER_HEIGHT,
  pixelArt: true,
  backgroundColor: '#0a0a0f',
  // Every UI/dialogue text object in the game renders through a real DOM element layered over the
  // WebGL canvas (see `ui/text.ts#createText()`) rather than a WebGL Text texture, specifically so
  // text stays crisp at any zoom while sprites/tiles stay pixel-art-blocky — see that file's own
  // doc comment for why. `createContainer: true` is what makes `scene.add.dom(...)` available at
  // all; without it, DOM Elements silently fail to display.
  dom: {
    createContainer: true,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    // `fixedStep: false`: step physics once per rendered frame by that frame's real delta, instead
    // of in fixed 1/60s ticks. With fixed ticks, any display that isn't exactly 60Hz (59.94, 75,
    // 120, 144...) gets frames with zero or two physics steps in an uneven rhythm -- measured on
    // the framebuffer at 144Hz the ground moved 0,4,0,5,0,0,5,... px per frame -- which reads as
    // stutter/dizziness while walking. Speeds are low enough that per-frame steps can't tunnel
    // through any collider.
    arcade: { debug: false, fixedStep: false },
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

const game = new Phaser.Game(config);

// `pixelArt: true` also makes Phaser style the canvas `image-rendering: pixelated`, i.e. the browser
// scales the whole framebuffer to the window with nearest-neighbour. Now that the framebuffer is
// usually *larger* than what the window shows (`PIXEL_SCALE` in `constants.ts`), nearest-neighbour
// would just drop rows/columns -- uneven, and crawling while the camera scrolls -- so let the browser
// scale it smoothly instead. Sprites/tiles themselves are still crisp; that's decided per texture
// on the GPU, not by this CSS.
game.events.once(Phaser.Core.Events.READY, () => {
  game.canvas.style.imageRendering = 'auto';
});
