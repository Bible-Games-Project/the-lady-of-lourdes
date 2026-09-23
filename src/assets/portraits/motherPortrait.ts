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
 *   - `blink`     **fixed from a broken first pass.** That version only replaced 2 of the 4 rows
 *                 the left eye actually occupies (leaving the other 2 showing the original open
 *                 iris, interlaced with the "closed" rows) while the right eye's box was
 *                 measured correctly — an asymmetric, holey mask that read as "blinking looks
 *                 strange, closes from the side." Rebuilt by measuring each eye's real extent
 *                 directly (an `R − B` per-pixel scan inside a tight box per eye, since her
 *                 dark iris/sclera-shadow pixels are measurably cooler-toned than the warm skin
 *                 around them — same separation principle `bernadettePortrait.ts`'s own blink
 *                 edit uses), replacing only the pixels that scan actually finds (not a filled
 *                 rectangle — the mask follows each eye's own organic shape) with skin resampled
 *                 per-column from a row below that same eye, then a thin closed-lid line drawn
 *                 only across the columns each eye's own mask touched. Both eyes now close
 *                 fully, symmetrically, and only within their own eye pixels — nothing in the
 *                 eyebrows or hair (the temple hair strands were the main contamination risk,
 *                 explicitly excluded by keeping each scan box tight to its own eye).
 *   - `talk`      **also fixed.** The first pass painted an open-mouth ellipse one row *below*
 *                 her real closed-lip line (native y38-39 vs the actual lips at y37) — inside her
 *                 chin-shadow, not on her mouth. Fixed the same way `bernadettePortrait.ts`'s own
 *                 talk edit and the corrected `boyPortrait.ts`/`sisterPortrait.ts` ones do:
 *                 measure her real lip pixels from the *neutral* pose directly (`V = R+G+B`
 *                 darkness scan in a tight box around the mouth only) and darken those existing
 *                 pixels in place — no new shape painted, her own smile read as parted.
 *   - `talkBlink` both fixes combined — reuses the corrected `blink` frame's own mouth pixels
 *                 (confirmed identical to `neutral`'s there first) and applies the same talk-mouth
 *                 darkening to them.
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
