import type Phaser from 'phaser';

/**
 * Root-cause fix for blurry/pixelated UI text, take two.
 *
 * The first attempt kept text as a WebGL `Text` object (a canvas rasterized into a texture) and
 * tried to make its *downscale* smoother: supersample the glyph 4x (`TEXT_RESOLUTION`, still used
 * nowhere now — kept only as a historical constant) and force `LINEAR` filtering on its texture
 * (see `core/textRendering.ts`). That helped, but wasn't enough, and couldn't be: `pixelArt: true`
 * puts `image-rendering: pixelated` on the canvas element itself (see `index.html`), which the
 * *browser* uses to nearest-neighbor-scale the entire finished frame up to the real display size —
 * a step that happens *after* Phaser is done rendering, applies to the whole canvas uniformly, and
 * cannot be selectively disabled for one region. No amount of internal WebGL supersampling or
 * texture-filter tuning survives that final, unavoidable, whole-canvas NEAREST upscale — confirmed
 * empirically: even `resolution: 16` (4x more than the original fix) looked barely different from
 * `resolution: 4` at real display scale, because the bottleneck was never the supersampling amount.
 *
 * The only way to get text that's genuinely crisp at any zoom while sprites/tiles stay pixel-art
 * -blocky is to stop rendering text *into that canvas* at all. Every text object in this game is
 * now a real DOM element (`Phaser.GameObjects.DOMElement`, enabled via `dom.createContainer` in
 * `main.ts`), layered by Phaser directly over the WebGL canvas in a separate `<div>` that does *not*
 * carry `image-rendering: pixelated`. Phaser already positions/scales/clips this DOM layer to track
 * the canvas automatically (including through this game's own dynamic FIT/ENVELOP scale-mode
 * switching and camera scroll/scrollFactor — built-in Phaser behavior, not something this file
 * manages), via a CSS `transform: scale(...)` on the container rather than a raster resize — and a
 * CSS transform on real text forces the browser to re-rasterize its glyphs at the final on-screen
 * size using its own font engine, which is smooth by construction at any scale factor. Confirmed
 * empirically against the exact same real dialogue-sized (13px) sample text used to test the first
 * attempt: dramatically sharper, properly anti-aliased letterforms, with the pixel-art background
 * behind it completely unaffected (still hard-edged/blocky, since only text moved off the canvas).
 *
 * Every text object in the game must be built through `createText()` below so this stays consistent
 * — don't call `scene.add.text(...)` directly for new UI/dialogue text.
 */
export const TEXT_RESOLUTION = 4;

/**
 * This constant's name predates its current value (several serif families, in turn -- see
 * AGENTS.md for the full history) and is kept stable so every call site across the game doesn't
 * need touching each time the underlying font changes, the same convention `FONT_DISPLAY`/
 * `FONT_BODY` below already follow. Currently Google Fonts "Pixelify Sans" (Regular/400) -- the
 * maintainer asked for the in-game dialogue/UI font specifically ("durante el juego... la quiero
 * un poco más pixelart, que sea leible super bien, pero un poquitín más pixelart") to move toward a
 * pixel aesthetic without sacrificing legibility at small dialogue sizes, after already choosing
 * the same family for `FONT_DISPLAY`/`FONT_BODY` below. Pixelify Sans was picked over a harder
 * -edged monospace pixel font (e.g. "Silkscreen", rejected in an earlier round as a "retro-arcade"
 * clash) specifically because its letterforms stay soft/rounded and legible at body-text sizes
 * while still reading as unmistakably pixel-grid-based.
 */
export const FONT_SERIF = "'Pixelify Sans', ui-sans-serif, system-ui, sans-serif";

/**
 * Fifth take on the Home/Apparitions typography (see AGENTS.md for the full history -- a serif
 * +stroke, a blocky monospace pixel font, a no-stroke Cinzel/gold treatment, and a storybook slab
 * -serif matched to a reference image were all tried and each rejected in turn). The maintainer's
 * clearest statement of what they actually want came after seeing the storybook version in place:
 * "lo quiero un poco más pixelart, que sea leible super bien, pero un poquitín más pixelart" --
 * pixel-art in spirit, but legible and good-looking, which rules out both a harsh classic pixel
 * font (already tried, already rejected as clashing) and a non-pixel serif (tried twice, rejected
 * twice). Google Fonts "Pixelify Sans" is built specifically for this brief: a genuine pixel grid
 * under the hood, but with soft/rounded terminals and even spacing that keep it readable rather
 * than clashing with painted illustration the way a blocky monospace pixel font does -- used here
 * for both `FONT_DISPLAY` (titles, bold/700) and `FONT_BODY` (buttons, apparition numbers/dates,
 * regular/medium weight), and also now for `FONT_SERIF` above (the in-game dialogue default), so
 * the whole game reads as one consistent typographic system rather than three unrelated choices.
 */
export const FONT_DISPLAY = "'Pixelify Sans', ui-sans-serif, system-ui, sans-serif";
export const FONT_BODY = "'Pixelify Sans', ui-sans-serif, system-ui, sans-serif";

export const INK = {
  dark: '#3a3226',
  muted: '#8a7a5a',
  cream: '#fffaf0',
  parchment: '#efe6d3',
  gold: '#d8c9a0',
} as const;

/** Kept for any call site not yet migrated off `scene.add.text()` -- every new text object should
 * go through `createText()` instead, which doesn't use this at all. */
export function textStyle(overrides: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle {
  return {
    fontFamily: FONT_SERIF,
    resolution: TEXT_RESOLUTION,
    ...overrides,
  };
}

export interface CrispTextStyle {
  fontSize?: string;
  fontFamily?: string;
  color?: string;
  fontStyle?: 'bold' | 'normal';
  stroke?: string;
  strokeThickness?: number;
  wordWrap?: { width: number };
  lineSpacing?: number;
  backgroundColor?: string;
  padding?: { x?: number; y?: number };
  align?: 'left' | 'center' | 'right';
  letterSpacing?: string;
  /** Raw CSS `text-shadow` value (e.g. `'1px 2px 2px rgba(0,0,0,0.4)'`). Opt-in, unset by every
   * existing call site -- added for `HomeScene.ts#buildTitle()`'s storybook-style title, which
   * needs a soft drop shadow under its stroke+fill to match the maintainer's reference image. */
  textShadow?: string;
}

/**
 * Parses a Phaser-style `'13px'` font size string down to its bare number, for arithmetic (line
 * -height calculation below) -- CSS itself is handed the original string unchanged everywhere else.
 */
function pxNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

function buildCss(style: CrispTextStyle): string {
  const fontSize = style.fontSize ?? '14px';
  const bold = style.fontStyle === 'bold';
  const lines: string[] = [
    `font-family: ${style.fontFamily ?? FONT_SERIF}`,
    `font-size: ${fontSize}`,
    `font-weight: ${bold ? '700' : '400'}`,
    `color: ${style.color ?? INK.dark}`,
    'margin: 0',
    'padding: 0',
    'pointer-events: none',
    // A block-level `div` (the default) stretches to its parent's full width regardless of its own
    // content -- `inline-block` makes it size to content instead (so `.width`/`.height`, read from
    // `clientWidth`/`clientHeight`, reflect the actual rendered text, not the container), while
    // still respecting `max-width`/wrapping below exactly the same as a block element would.
    'display: inline-block',
    // DOM Elements are positioned by their own top-left by default, with Phaser's Origin component
    // then shifting that via a CSS transform based on the *rendered* element size -- text-align
    // only controls how lines align *within* that box (relevant once wordWrap/a fixed width is
    // set), not the box's own position, so this is safe to always set rather than only when wrapped.
    `text-align: ${style.align ?? 'left'}`,
  ];

  if (style.wordWrap) {
    // `max-width`, not `width` -- Phaser's own `wordWrap` only wraps lines that *exceed* the given
    // width, it doesn't force every text object into a fixed-size box; a `width` here would make
    // `.width`/`.height` (read from `clientWidth`/`clientHeight`, used e.g. by `Toast.ts` to size a
    // snug background) always report the wrap width instead of the actual (often narrower)
    // rendered content size.
    lines.push(`max-width: ${style.wordWrap.width}px`, 'white-space: normal', 'word-wrap: break-word');
  } else {
    // Single-line labels (buttons, prompts, names) must never wrap onto a second line just because
    // the DOM container happens to be narrower at some viewport size -- match Text's own default.
    lines.push('white-space: nowrap');
  }

  const lineHeight = pxNumber(fontSize, 14) + (style.lineSpacing ?? 0);
  lines.push(`line-height: ${lineHeight}px`);

  if (style.stroke && style.strokeThickness) {
    // `-webkit-text-stroke` (Chromium/Safari; this game's only real target, the Claude Artifact
    // iframe and any Chromium-based embed) draws the stroke *behind* the fill by default, exactly
    // matching Phaser's own canvas stroke-then-fill text rendering -- no extra paint-order hack
    // needed, confirmed visually.
    lines.push(`-webkit-text-stroke: ${style.strokeThickness}px ${style.stroke}`);
  }

  if (style.textShadow) {
    lines.push(`text-shadow: ${style.textShadow}`);
  }

  if (style.backgroundColor) {
    lines.push(`background-color: ${style.backgroundColor}`);
  }

  if (style.padding) {
    const px = style.padding.x ?? 0;
    const py = style.padding.y ?? 0;
    lines.push(`padding: ${py}px ${px}px`);
  }

  if (style.letterSpacing) {
    lines.push(`letter-spacing: ${style.letterSpacing}`);
  }

  return lines.join('; ');
}

/**
 * Creates a real DOM element positioned/scaled/clipped by Phaser as if it were a normal Game
 * Object (supports `setOrigin()`, `setPosition()`, `setDepth()`, `setScrollFactor()`,
 * `setVisible()`, `destroy()`, and camera scroll, all natively -- see this file's own header
 * comment for why this replaced `scene.add.text()`). Defaults to origin `(0, 0)` -- the same
 * default `Text` itself uses -- so existing `.setOrigin(...)` call sites need no other changes.
 */
export function createText(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string | string[],
  style: CrispTextStyle = {},
): Phaser.GameObjects.DOMElement {
  const content = Array.isArray(text) ? text.join('\n') : text;
  const dom = scene.add.dom(x, y).createElement('div', buildCss(style), content);
  dom.setOrigin(0, 0);
  // `buildCss()`'s own `pointer-events: none` only survives the *first* frame -- Phaser's
  // `DOMElement` has its own `pointerEvents` property (default `'auto'`) that its per-frame CSS
  // renderer (`DOMElementCSSRenderer.js`: `style.pointerEvents = src.pointerEvents`)
  // unconditionally writes back over whatever the element's own inline `style` attribute said,
  // every single frame after creation. Left at the default, every text object in the game was
  // silently capturing native clicks/drags on its own bounding box from the second frame onward —
  // invisible in practice almost everywhere, since text rarely sits exactly on top of something
  // else clickable, but confirmed as the real cause of an editor free-camera-pan drag silently
  // refusing to start whenever it began on a text label (e.g. the "Le Cachot" location label,
  // which happens to sit right where the player spawns). Setting the property itself (not just the
  // CSS string) makes every frame's re-sync apply 'none' too, closing this for every text object at
  // the one shared choke point, not just the ones that happened to get reported.
  dom.pointerEvents = 'none';
  return dom;
}
