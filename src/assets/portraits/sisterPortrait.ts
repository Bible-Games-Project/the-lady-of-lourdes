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
 *   - `talk`      **not** a new shape painted over the face (a first pass that did — an open-mouth
 *                 ellipse — didn't actually land on her own lips: her real closed-lip line sits at
 *                 native y38-39, x25-31, but that first attempt painted at y43-44, inside the
 *                 jaw/chin-shadow curve well below her mouth, reading as "doesn't match her actual
 *                 lips"). Fixed by measuring her actual neutral-pose lip pixels directly (a
 *                 `V = R+G+B` per-pixel darkness scan in a tight box around the mouth only,
 *                 `V < 450` at native y38-39 — excludes y37, which is nose-shadow, and the
 *                 chin-shadow curve below y40) and darkening *only those already-existing lip
 *                 pixels* in place by a fixed 0.6x multiplier — the same "thicken/darken the real
 *                 lip line, don't paint a new one" technique `bernadettePortrait.ts`'s own talk edit
 *                 and `boyPortrait.ts`'s corrected talk edit both use.
 *   - `talkBlink` the same in-place darkening applied to `blink`'s own mouth pixels (identical to
 *                 `neutral`'s there — confirmed by diffing them before reusing this technique).
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
