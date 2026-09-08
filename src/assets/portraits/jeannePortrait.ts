import Phaser from 'phaser';
import { portraitKeyFor, type Expression } from '../../pixelart/portraits';
import neutralUrl from './jeanne_portrait_neutral.png';
import blinkUrl from './jeanne_portrait_blink.png';
import talkUrl from './jeanne_portrait_talk.png';
import talkBlinkUrl from './jeanne_portrait_talkBlink.png';

/**
 * The maintainer's own portrait artwork for Jeanne's (`CharacterId` `'friend'`) dialogue-box
 * portrait, replacing the procedural bust used for every other remaining character — same
 * treatment, same pipeline as `assets/portraits/bernadettePortrait.ts`, applied to a different
 * character and a different source image. Only one pose was supplied (eyes open, mouth already
 * closed/resting), so:
 *   - `neutral`   the supplied image itself, untouched.
 *   - `blink`     `neutral` with both eyes closed.
 *   - `talk`      a mouth *opened* (the source had none).
 *   - `talkBlink` `talk` with both eyes closed the same way.
 * Eye-closing uses the same content-based (not geometric) mask as Bernadette's: her irises are a
 * warm brown, not blue like Bernadette's second portrait, so plain skin-vs-eye separation is
 * tighter here — `red − blue` per pixel still cleanly separates them (skin ~78-94, eyebrow ~69-78,
 * iris/sclera ~15-40; the eyebrow/iris gap is narrower than Bernadette's blue-eyed case, so the
 * threshold sits closer to the eyebrow's low end), but the eye's own vertical extent needed
 * re-measuring by eye against *this* image rather than reusing Bernadette's box coordinates — an
 * initial box that was too shallow cut off the lower iris/lid, leaving a visible unedited sliver.
 * The isolated eye shape is filled with real skin resampled from further down the cheek, feathered
 * at the mask's own eye-shaped boundary, before the closed-lid line is drawn on top. The mouth-open
 * edit is deliberately bold/tall/dark so it survives the downscale to this portrait's 58x67 final
 * size (only ~3 pixel rows for the whole mouth) — same lesson as Bernadette's portrait.
 */
const URLS: Record<Expression, string> = {
  neutral: neutralUrl,
  blink: blinkUrl,
  talk: talkUrl,
  talkBlink: talkBlinkUrl,
};

/**
 * Loads the 4 frames under the exact keys `PortraitAnimator`/`portraitKeyFor('friend', ...)`
 * expect — no separate register step needed, no `setFilter(LINEAR)` (same reasoning as
 * Bernadette's portrait: this is meant to read as pixel art like every other character's
 * procedural portrait, and the game already defaults every texture to NEAREST).
 */
export function preloadJeannePortrait(scene: Phaser.Scene): void {
  (Object.keys(URLS) as Expression[]).forEach((expression) => {
    scene.load.image(portraitKeyFor('friend', expression), URLS[expression]);
  });
}
