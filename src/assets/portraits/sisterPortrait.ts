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
 *   - `talk`      **fixed twice now.** The first pass (an open-mouth ellipse) never landed on her
 *                 lips at all (see git history). The *second* pass darkened native y38-39 in place
 *                 — technically her own closed-lip line, confirmed by direct pixel measurement —
 *                 but at this portrait's real 58x67 display size that row sits close enough to the
 *                 nostril shadow just above it (y35-36, with only one largely-untouched row, y37,
 *                 as a buffer) that darkening it read as "the mouth merged into the nose" ("talking
 *                 through her nose"), confirmed by rendering both versions at realistic display
 *                 scale side by side, not just in an exaggerated zoom. Her lips actually span a
 *                 wider native y37-42 range with **two** natural dark bands separated by a bright
 *                 highlight row (y40, the lower lip's own catch-light) — y38-39 is the closed
 *                 upper-lip seam (too close to the nose to safely darken further), y41-42 is the
 *                 lower lip's own bottom shadow/crease, comfortably 5-6 rows clear of the nostrils.
 *                 This pass leaves y38-39 completely untouched (her natural resting smile still
 *                 reads exactly as it does in `neutral`) and instead darkens the existing y41-42
 *                 pixels only (`V = R+G+B` scan, `V < 480`, native x23-32) by the same 0.6x
 *                 multiplier `bernadettePortrait.ts`'s own talk edit uses — still her own real lip
 *                 pixels, still no new shape painted, just shifted to the part of her mouth with
 *                 actual visual clearance from her nose.
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
