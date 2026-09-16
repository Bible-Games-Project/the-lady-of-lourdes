import Phaser from 'phaser';
import { portraitKeyFor, type Expression } from '../../pixelart/portraits';
import neutralUrl from './boy_portrait_neutral.png';
import blinkUrl from './boy_portrait_blink.png';
import talkUrl from './boy_portrait_talk.png';
import talkBlinkUrl from './boy_portrait_talkBlink.png';

/**
 * The maintainer's own portrait artwork for the village boy's (`CharacterId` `'boy'`) dialogue-box
 * portrait — same treatment as `assets/portraits/jeannePortrait.ts`: only one pose was supplied
 * (neutral, eyes open, mouth closed/smiling), so `blink`/`talk`/`talkBlink` are derived from it:
 *   - `neutral`   the supplied bust crop, resized to 58x67, untouched otherwise.
 *   - `blink`     `neutral` with both eyes closed — content-based mask (`red - blue` per pixel
 *                 cleanly separates the cool iris/sclera-shadow from warm skin here), filled with
 *                 skin resampled from a fixed row of clear cheek skin below each eye box (not from
 *                 "below the mask" within the box itself — that read back eye-colored pixels near
 *                 the box's lower edge, where the mask nearly reaches the box boundary; a fixed
 *                 external sample row avoided that), with a thin closed-lid line drawn over the
 *                 mask's own per-column vertical center in the eyebrow's own dark tone.
 *   - `talk`      a bold open-mouth ellipse painted over the closed-mouth smile, tall/dark enough
 *                 to still read after the ~18x downscale to this portrait's 58x67 final size.
 *   - `talkBlink` both edits combined.
 * Source bust crop: the supplied square reference image was center-cropped to the 58:67 aspect
 * ratio every other portrait in this game already uses (not a non-uniform stretch, which would
 * have distorted his proportions) before the final resize.
 */
const URLS: Record<Expression, string> = {
  neutral: neutralUrl,
  blink: blinkUrl,
  talk: talkUrl,
  talkBlink: talkBlinkUrl,
};

/**
 * Loads the 4 frames under the exact keys `PortraitAnimator`/`portraitKeyFor('boy', ...)` expect —
 * no separate register step needed, no `setFilter(LINEAR)` (pixel art, same as every other
 * character's portrait; the game already defaults every texture to NEAREST).
 */
export function preloadBoyPortrait(scene: Phaser.Scene): void {
  (Object.keys(URLS) as Expression[]).forEach((expression) => {
    scene.load.image(portraitKeyFor('boy', expression), URLS[expression]);
  });
}
