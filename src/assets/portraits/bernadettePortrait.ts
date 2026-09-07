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
 * redrawn/recolored. This is the *second* portrait swap; the maintainer replaced the first
 * supplied image with this one (same treatment, same pipeline, different source pixels — the
 * first image's derived frames are gone, not layered underneath). Only one pose was supplied
 * (eyes open, mouth already closed/resting — the opposite of the first portrait, which had the
 * mouth open), so the other 3 `Expression` states were derived from it by direct pixel editing,
 * not fabricated from scratch or reused from the previous portrait's frames:
 *   - `neutral`   the supplied image itself, untouched.
 *   - `blink`     `neutral` with both eyes closed.
 *   - `talk`      a mouth *opened* (the source had none) — an eye edit was not needed here.
 *   - `talkBlink` `talk` with both eyes closed the same way.
 * **Eye-closing is restricted to the actual eye pixels, not a rectangular region**: the mask is
 * found by hue, not shape — her irises/sclera are a cool blue-gray while every surrounding pixel
 * (skin, eyebrows, hair) is warm-toned, so `red − blue` per pixel cleanly separates "eye" from
 * "everything around it" (see `eye_content_mask`-equivalent logic if regenerating; the working
 * script lives only in the conversation that produced these files, not checked into the repo).
 * The isolated eye shape is then filled with real skin resampled from a patch further down the
 * cheek (feathered at the mask's own eye-shaped boundary, not a rectangle) before drawing the
 * closed-lid line on top — this was iterated on: a generic ellipse and a plain rectangular donor
 * patch were both tried first and rejected because they visibly bled into/clipped against the
 * eyebrows or left an obviously-shaped patch of mismatched skin tone. The mouth-open edit erases
 * the closed-lip line (this source's only mouth state) and paints a deliberately bold, tall, dark
 * cavity — a thin/subtle version disappeared entirely once downscaled to this portrait's tiny
 * 58x67 final size (only ~3 pixel rows tall), so "readable at the actual display size" mattered
 * more than fine detail here. If this ever needs redoing, verify at the *final* 58x67 size, not
 * just at the full-resolution working crop — softness/contrast that looks fine zoomed in can
 * vanish completely after the downscale.
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
