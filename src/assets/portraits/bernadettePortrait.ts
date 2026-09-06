import Phaser from 'phaser';
import { portraitKeyFor, type Expression } from '../../pixelart/portraits';
import neutralUrl from './bernadette_portrait_neutral.png';
import blinkUrl from './bernadette_portrait_blink.png';
import talkUrl from './bernadette_portrait_talk.png';
import talkBlinkUrl from './bernadette_portrait_talkBlink.png';

/**
 * The maintainer's own portrait artwork for Bernadette's dialogue-box portrait, replacing the
 * procedural bust used for every other character — same reasoning as her overworld sprite
 * (`assets/player/bernadetteSprite.ts`): this is real, finished art, used as-is, never
 * redrawn/recolored. Only one pose was supplied (eyes open, mouth open/smiling), so the other 3
 * `Expression` states needed for `PortraitAnimator`'s existing blink/talk logic were derived from
 * it by direct pixel editing rather than fabricated from scratch:
 *   - `talk`      the supplied image itself, untouched.
 *   - `neutral`   the mouth closed (a resting smile line painted over the open mouth/teeth).
 *   - `blink`     `neutral` with both eyes closed (a downward eyelid-crease line painted over
 *                 each eye).
 *   - `talkBlink` `talk` with both eyes closed the same way.
 * Both edits erase the source region by resampling real nearby skin pixels (feathered into place,
 * not a flat paint bucket) so the result reads as skin rather than a visible patch, then draw the
 * new line on top in a color sampled from her own lips/lashes. Do this again from the *_full-res
 * working crop if this ever needs redoing — the 58x67 keys below are the final downscale only.
 */
const URLS: Record<Expression, string> = {
  neutral: neutralUrl,
  blink: blinkUrl,
  talk: talkUrl,
  talkBlink: talkBlinkUrl,
};

/**
 * Loads the 4 frames under the exact keys `PortraitAnimator`/`portraitKeyFor('bernadette', ...)`
 * expect — no separate register step needed (unlike her overworld sprite, there's no Phaser
 * animation to create; `PortraitAnimator` just swaps textures directly). Deliberately does *not*
 * call `setFilter(LINEAR)` the way the Home background/journey map do: those are large, full-bleed
 * illustrations meant to read as smooth artwork, while this portrait — like Bernadette's overworld
 * sprite — is meant to read as pixel art alongside every other character's procedural portrait, and
 * the whole game already defaults every texture to NEAREST (`pixelArt: true` in `main.ts`). Forcing
 * LINEAR here would reproduce the exact blur regression that had to be fixed on her overworld
 * sprite — see AGENTS.md.
 */
export function preloadBernadettePortrait(scene: Phaser.Scene): void {
  (Object.keys(URLS) as Expression[]).forEach((expression) => {
    scene.load.image(portraitKeyFor('bernadette', expression), URLS[expression]);
  });
}
