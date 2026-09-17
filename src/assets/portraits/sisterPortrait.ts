import Phaser from 'phaser';
import { portraitKeyFor, type Expression } from '../../pixelart/portraits';
import neutralUrl from './sister_portrait_neutral.png';
import blinkUrl from './sister_portrait_blink.png';
import talkUrl from './sister_portrait_talk.png';
import talkBlinkUrl from './sister_portrait_talkBlink.png';

/**
 * The maintainer's own portrait artwork for young Toinette's (`CharacterId` `'sister'`)
 * dialogue-box portrait — same treatment as `boyPortrait.ts`: only one pose was supplied (neutral,
 * eyes open, mouth closed/smiling), so `blink`/`talk`/`talkBlink` are derived from it:
 *   - `neutral`   the supplied bust crop, center-cropped to the 58:67 aspect every other portrait
 *                 in this game uses (not a non-uniform stretch), resized to 58x67, otherwise
 *                 untouched.
 *   - `blink`     both eye boxes filled with skin resampled from a fixed row of clear cheek skin
 *                 just below each eye (not from within the box itself, which would read back
 *                 eye-colored pixels near its lower edge), with a thin closed-lid line drawn across
 *                 each box's own vertical center in a slightly darker skin tone.
 *   - `talk`      an open-mouth ellipse painted over the closed-mouth smile, sized and positioned
 *                 from her own mouth's measured location, dark/tall enough to still read after the
 *                 downscale to this portrait's 58x67 final size.
 *   - `talkBlink` both edits combined.
 */
const URLS: Record<Expression, string> = {
  neutral: neutralUrl,
  blink: blinkUrl,
  talk: talkUrl,
  talkBlink: talkBlinkUrl,
};

/**
 * Loads the 4 frames under the exact keys `PortraitAnimator`/`portraitKeyFor('sister', ...)`
 * expect — no separate register step needed, no `setFilter(LINEAR)` (pixel art, same as every
 * other character's portrait; the game already defaults every texture to NEAREST).
 */
export function preloadSisterPortrait(scene: Phaser.Scene): void {
  (Object.keys(URLS) as Expression[]).forEach((expression) => {
    scene.load.image(portraitKeyFor('sister', expression), URLS[expression]);
  });
}
