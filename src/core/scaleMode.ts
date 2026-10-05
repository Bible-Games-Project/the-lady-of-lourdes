import Phaser from 'phaser';
import { PIXEL_SCALE } from './constants';

/**
 * The game's logical resolution (see constants.ts) is ~16:9. Gameplay scenes need the *entire*
 * logical canvas visible at all times — HUD elements (gear, joystick, Tasks button) are pinned
 * close to its edges, so `Phaser.Scale.FIT` (letterboxed, nothing ever cropped) is the only safe
 * mode for them. The three static "screen" scenes (Home, Settings, the Journey map) are pure
 * full-bleed illustration + centered UI, and the maintainer explicitly wants those to fill the
 * device edge-to-edge with no letterbox bars, cropping the artwork if the device aspect ratio
 * doesn't match rather than showing bars — that's `Phaser.Scale.ENVELOP`.
 *
 * The Scale Manager is global to the `Phaser.Game` instance (one canvas), so this is switched
 * live per scene rather than set once in `main.ts`. Call the matching one of these at the top of
 * every scene's `create()` — including ones reached via `scene.launch`/`scene.resume`, like
 * Settings — so the mode is always correct for whatever's actually on screen, regardless of
 * navigation path.
 */
/**
 * Phaser only applies a scale mode's crop/letterbox *aspect behavior* to `displaySize` once, in
 * `ScaleManager#boot()` — changing `scale.scaleMode` afterwards and calling `refresh()` updates
 * the reported mode but silently has no visual effect, because `refresh()`/`updateScale()` never
 * re-call `displaySize.setAspectMode()`. Mirror what `boot()` does so a runtime mode switch
 * actually takes effect.
 */
function setScaleMode(scene: Phaser.Scene, mode: number): void {
  const scale = scene.scale;
  scale.scaleMode = mode;
  scale.displaySize.setAspectMode(mode);
  scale.refresh();
  // Every scene calls `useLetterboxScale()`/`useFullBleedScale()` as (effectively) the first thing
  // its `create()` does, so this is the single choke point that gives every scene's main camera the
  // same baseline zoom -- see `constants.ts`'s own doc comment on `PIXEL_SCALE` for why this needs
  // to happen at all. A scene that changes zoom further afterward (`OverworldScene`'s map-editor
  // wheel zoom) does so starting from this baseline, not from Phaser's own default of 1.
  scene.cameras.main.setZoom(PIXEL_SCALE);
  // Phaser's own camera default (`originX`/`originY` = 0.5, i.e. center) only matters once zoom
  // isn't 1 -- confirmed by reading Phaser's own `Camera.preRender()` source (`matrix.applyITRS(x +
  // originX, ...)` then `matrix.translate(-originX, -originY)`, where `originX = camera.width *
  // this.originX`): that's a "zoom pivots around this point" transform, and with the default 0.5 it
  // pivots around the viewport's *center*, not its top-left corner. At the old zoom-1 baseline that
  // was an invisible no-op (pivoting around the center of a 1x zoom does nothing visible), but at
  // PIXEL_SCALE's zoom of 2 it shifts everything rendered through this camera -- confirmed broken on
  // real screenshots of both Home's background and the Cachot room, each showing only a tiny
  // top-left-corner sliver of itself instead of the full centered scene. Every piece of positioning
  // code in this game (ROOM_OFFSET_X/Y, Home's `GAME_WIDTH/2`, DEPTH/UI margins, etc.) was written
  // assuming the camera's own origin is its top-left corner -- true automatically at zoom 1 only by
  // coincidence -- so pin it explicitly here. This fixes rendering for every camera alike, bounded or
  // not; see `setCameraBounds()` below for a SEPARATE Phaser quirk that only affects cameras calling
  // `setBounds()` (`OverworldScene`, `ApparitionJourneyScene`), which this origin fix does not touch.
  scene.cameras.main.setOrigin(0, 0);
}

/**
 * `camera.setBounds(x, y, width, height)` restricts scrolling to a world-space rectangle -- but
 * Phaser's own `clampX()`/`clampY()` (`BaseCamera.js`, used both by `setBounds()` itself and by
 * every subsequent frame's `preRender()` for any camera with `useBounds` on) compute their allowed
 * scroll range as `bounds.x + (displayWidth - camera.width) / 2`, where `camera.width` is the RAW
 * CANVAS-PIXEL viewport size (`RENDER_WIDTH`/`RENDER_HEIGHT`) and `displayWidth` is `camera.width /
 * zoom` (the WORLD-space extent actually visible, `GAME_WIDTH`/`GAME_HEIGHT` at `PIXEL_SCALE`).
 * Before `PIXEL_SCALE` existed, `camera.width` and `displayWidth` were the same number by
 * definition (canvas resolution == logical resolution, zoom == 1), so this term was always exactly
 * `0` -- completely invisible. Now that they're deliberately different (`RENDER_WIDTH` vs
 * `GAME_WIDTH`), this term evaluates to a constant, non-zero offset (`(RENDER_WIDTH - GAME_WIDTH) /
 * 2` == `GAME_WIDTH * (PIXEL_SCALE - 1) / 2`) that silently shifts the camera's *entire* allowed
 * scroll range away from the bounds actually passed in -- confirmed against Phaser's own source,
 * and confirmed broken on a real screenshot (`ApparitionJourneyScene`'s own `setBounds()` call,
 * before this fix, rendered only the right half of the journey map, the left half showing as plain
 * background color -- the exact shape you'd get from a camera clamped `GAME_WIDTH/2` pixels too far
 * right). Unlike the `setOrigin()` fix above (which Phaser's clamp math doesn't consult at all),
 * this one can only be fixed at the call site, by shifting the bounds rectangle itself by that same
 * offset in the opposite direction before handing it to Phaser -- which is exactly what this wraps,
 * so every `setBounds()` call in the game goes through it instead of the raw camera method.
 */
export function setCameraBounds(scene: Phaser.Scene, x: number, y: number, width: number, height: number): void {
  const cam = scene.cameras.main;
  const offsetX = (cam.width - cam.width / cam.zoom) / 2;
  const offsetY = (cam.height - cam.height / cam.zoom) / 2;
  cam.setBounds(x + offsetX, y + offsetY, width, height);
}

export function useFullBleedScale(scene: Phaser.Scene): void {
  setScaleMode(scene, Phaser.Scale.ENVELOP);
}

export function useLetterboxScale(scene: Phaser.Scene): void {
  setScaleMode(scene, Phaser.Scale.FIT);
}
