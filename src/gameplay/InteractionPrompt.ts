import Phaser from 'phaser';
import { DEPTH } from '../core/constants';
import { UI_KEYS, UI_BUTTON_SLICE } from '../pixelart/ui';
import { createText } from '../ui/text';

/**
 * Small floating label ("Talk", "Pick up firewood"...) hovering above an interactable.
 *
 * Two fixes in this round, both from the same maintainer report:
 *
 * 1. **Restyled to match the game's own UI chrome** ("lo quiero que encaje mas con el estilo y
 *    paleta del juego") -- was a flat CSS `backgroundColor` rectangle (dark translucent box, light
 *    text), the inverse of every other panel in the game. Now a real `UI_KEYS.BUTTON` nineslice
 *    (the same bevelled parchment/stone panel `DialogueBox`'s and `TasksPanel`'s own UI already
 *    use) sized to fit the label, with dark ink text on the light panel -- same visual language as
 *    everywhere else, not a bespoke box. Font is whatever `createText()` defaults to
 *    (`FONT_SERIF`, now Pixelify Sans -- see `ui/text.ts`), already covering the maintainer's "la
 *    fuente de letra que sea la misma que pongas pixelart para el resto del juego" ask with no
 *    extra style needed here.
 *
 * 2. **A real position bug, not just a style complaint**: "primero aparece a un lado del npc y
 *    hace como un bug y luego aparece arriba" (it first appears beside the NPC, glitches, then
 *    appears above). Root cause: `showAt()` used to call `this.text.setVisible(false)` to hide the
 *    prompt between interactions, which Phaser's own `DOMElementCSSRenderer` turns into real CSS
 *    `display: none` on the underlying node. A `display: none` element reports `clientWidth`/
 *    `clientHeight` as 0 -- a standard browser behavior, not a bug in this codebase -- so the very
 *    next `setText()` call (which Phaser's own `DOMElement.setText()` uses to remeasure the node's
 *    size for the origin-based centering math in `DOMElementCSSRenderer`) measured a *stale,
 *    zero* width/height for exactly one frame, before the box had been flipped back to
 *    `display: block`. With a zero-width box, Phaser's origin-0.5 centering offset collapses to 0,
 *    so that one frame rendered the label with its left edge (not its center) at the target x --
 *    reads as "appears beside the NPC" -- before the next `setText()`/render pass (triggered the
 *    next frame this method runs again) measured the real width and snapped it to the correct
 *    centered position. Same root category of bug as the `pointerEvents` per-frame-resync issue
 *    documented in `ui/text.ts` -- a Phaser `DOMElement` internal that resets state this class
 *    doesn't own.
 *
 *    Fixed by never letting Phaser's own visibility system touch `display` for this element at
 *    all: the underlying DOM node's `visibility` CSS property (which Phaser's renderer never
 *    touches -- confirmed by reading `DOMElementCSSRenderer.js`, which only ever sets `display`,
 *    `opacity`, `zIndex`, `pointerEvents`, `mixBlendMode`, `transform`, `transformOrigin`) is
 *    toggled directly instead. The Phaser object itself stays permanently `visible` (so Phaser
 *    keeps `display: block` the whole time, keeping `clientWidth`/`clientHeight` always accurate),
 *    while `node.style.visibility` actually controls whether it's seen -- an element with
 *    `visibility: hidden` still participates in layout and reports its real size, unlike
 *    `display: none`.
 */
export class InteractionPrompt {
  private panel: Phaser.GameObjects.NineSlice;
  private text: Phaser.GameObjects.DOMElement;

  constructor(scene: Phaser.Scene) {
    this.panel = scene.add.nineslice(
      0,
      0,
      UI_KEYS.BUTTON,
      undefined,
      UI_BUTTON_SLICE.size,
      UI_BUTTON_SLICE.size,
      UI_BUTTON_SLICE.border,
      UI_BUTTON_SLICE.border,
      UI_BUTTON_SLICE.border,
      UI_BUTTON_SLICE.border,
    );
    this.panel.setOrigin(0.5, 1);
    this.panel.setDepth(DEPTH.OVERLAY_LOW);
    this.panel.setVisible(false);

    this.text = createText(scene, 0, 0, '', {
      fontSize: '11px',
      color: '#3a3226',
      fontStyle: 'bold',
      padding: { x: 7, y: 4 },
    });
    this.text.setDepth(DEPTH.OVERLAY_LOW + 1);
    this.text.setOrigin(0.5, 1);
    // Stays Phaser-`visible` forever -- see this class's own doc comment above for why. `hide()`
    // sets the native CSS property directly for the actual on/off state.
    (this.text.node as HTMLElement).style.visibility = 'hidden';
  }

  showAt(x: number, y: number, label: string): void {
    this.text.setText(label);
    this.text.setPosition(x, y);
    (this.text.node as HTMLElement).style.visibility = 'visible';

    // `this.text.width`/`height` were just remeasured by `setText()` above (accurate -- the node
    // was never `display: none`, see this class's own doc comment), so the panel can size itself
    // to the label's real rendered footprint, padding included, every time it changes. `setSlices()`
    // (not `setDisplaySize()`, which would stretch the whole nineslice non-uniformly, corners and
    // all, as if it were a plain Image) resizes a nineslice correctly -- the bordered corners stay
    // fixed-size and only the middle stretches.
    this.panel.setSlices(
      this.text.width,
      this.text.height,
      UI_BUTTON_SLICE.border,
      UI_BUTTON_SLICE.border,
      UI_BUTTON_SLICE.border,
      UI_BUTTON_SLICE.border,
    );
    this.panel.setPosition(x, y);
    this.panel.setVisible(true);
  }

  hide(): void {
    this.panel.setVisible(false);
    (this.text.node as HTMLElement).style.visibility = 'hidden';
  }

  destroy(): void {
    this.panel.destroy();
    this.text.destroy();
  }
}
