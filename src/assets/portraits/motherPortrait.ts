import Phaser from 'phaser';
import { portraitKeyFor, type Expression } from '../../pixelart/portraits';
import neutralUrl from './mother_portrait_neutral.png';
import blinkUrl from './mother_portrait_blink.png';
import talkUrl from './mother_portrait_talk.png';
import talkBlinkUrl from './mother_portrait_talkBlink.png';

/**
 * The maintainer's own portrait artwork for Bernadette's mother Louise's (`CharacterId` `'mother'`)
 * dialogue-box portrait — same treatment as `boyPortrait.ts`/`sisterPortrait.ts`: only one pose was
 * supplied (neutral, eyes open, mouth closed/smiling), so `blink`/`talk`/`talkBlink` are derived
 * from it:
 *   - `neutral`   the supplied bust crop, center-cropped to the 58:67 aspect every other portrait
 *                 in this game uses (not a non-uniform stretch), resized to 58x67, otherwise
 *                 untouched.
 *   - `blink`     both eye boxes filled with skin resampled from a fixed row of clear cheek skin
 *                 just below each eye, with a thin closed-lid line drawn across each box's own
 *                 vertical center in a slightly darker skin tone.
 *   - `talk`      an open-mouth ellipse painted over the closed-mouth smile, sized and positioned
 *                 from her own mouth's measured location.
 *   - `talkBlink` both edits combined.
 */
const URLS: Record<Expression, string> = {
  neutral: neutralUrl,
  blink: blinkUrl,
  talk: talkUrl,
  talkBlink: talkBlinkUrl,
};

/**
 * Loads the 4 frames under the exact keys `PortraitAnimator`/`portraitKeyFor('mother', ...)`
 * expect — no separate register step needed, no `setFilter(LINEAR)` (pixel art, same as every
 * other character's portrait; the game already defaults every texture to NEAREST).
 */
export function preloadMotherPortrait(scene: Phaser.Scene): void {
  (Object.keys(URLS) as Expression[]).forEach((expression) => {
    scene.load.image(portraitKeyFor('mother', expression), URLS[expression]);
  });
}
