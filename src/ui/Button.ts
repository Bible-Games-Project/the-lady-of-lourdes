import Phaser from 'phaser';
import { UI_KEYS, UI_BUTTON_SLICE } from '../pixelart/ui';
import { createText } from './text';

export interface ButtonStyle {
  textureKey?: string;
  border?: number;
  textColor?: string;
  hoverTint?: number;
  /** Panel opacity (0-1). Defaults to fully opaque — used for buttons meant to sit lightly over artwork. */
  panelAlpha?: number;
  /** Outline around the label, for readability when the panel itself is very transparent. */
  textStroke?: { color: string; thickness: number };
  /** Label font size. Defaults to '14px', matching every existing call site's own buttons. */
  fontSize?: string;
}

/**
 * Where `(x, y)` sits on the button, as a fraction of its size — `(0, 0)` is the top-left corner,
 * `(1, 1)` the bottom-right, `(0.5, 0.5)` (the default, matching every existing call site) the
 * center. Mirrors `Image#setOrigin()`'s convention, since `Container` (what a button actually is)
 * has no such concept natively — its `(x, y)` is always its local coordinate origin, which is
 * wherever its children happen to be placed relative to it. Passing e.g. `{ x: 0, y: 1 }` lets a
 * caller anchor a button by its bottom-left *edge* directly (`x = leftEdge`, `y = bottomEdge`)
 * instead of computing `leftEdge + width / 2` by hand — see `HomeScene.ts` for the pattern.
 */
export interface ButtonOrigin {
  x: number;
  y: number;
}

export function createButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  height: number,
  label: string,
  onClick: () => void,
  style: ButtonStyle = {},
  origin: ButtonOrigin = { x: 0.5, y: 0.5 },
): Phaser.GameObjects.Container {
  // Children are authored around local (0,0) as if origin were centered, then shifted so that
  // (0,0) in the container's local space — where `(x, y)` places it in the world — actually sits
  // at the requested fraction of the button's own footprint.
  const localX = (0.5 - origin.x) * width;
  const localY = (0.5 - origin.y) * height;

  const border = style.border ?? UI_BUTTON_SLICE.border;
  const panel = scene.add.nineslice(
    localX,
    localY,
    style.textureKey ?? UI_KEYS.BUTTON,
    undefined,
    width,
    height,
    border,
    border,
    border,
    border,
  );
  panel.setAlpha(style.panelAlpha ?? 1);
  // Only include `stroke`/`strokeThickness` when actually requested — Phaser's Text canvas
  // sizing silently breaks (ends up 0x0, so the label never renders at all) if these keys are
  // present with an `undefined` value, even though that's semantically "no stroke" and should be
  // identical to omitting them. See AGENTS.md for the reproduction; don't reintroduce this by
  // always passing both keys unconditionally.
  const strokeProps = style.textStroke
    ? { stroke: style.textStroke.color, strokeThickness: style.textStroke.thickness }
    : {};
  // DOM-based text (see `ui/text.ts`) can't be nested inside this `Container` the way `panel` is --
  // confirmed empirically that a DOMElement added as a Container child never gets positioned at all
  // (its transform sync relies on machinery the Container's own render path doesn't invoke). Kept
  // independent instead, with the container's own `setPosition()` overridden below to move the
  // label in step -- this button's container is the one Game Object in the codebase that gets
  // repositioned *after* creation (see `HomeScene.ts`'s safe-area layout), so this can't be a
  // one-time absolute-position computation the way `DialogueBox.ts`'s static panel is.
  const text = createText(scene, x + localX, y + localY, label, {
    fontSize: style.fontSize ?? '14px',
    color: style.textColor ?? '#3a3226',
    fontStyle: 'bold',
    ...strokeProps,
  });
  text.setOrigin(0.5);

  const container = scene.add.container(x, y, [panel]);
  container.setSize(width, height);
  // Phaser's Container *always* offsets hit-testing by its own fixed displayOrigin
  // (`width/2, height/2` — Container's `originX`/`originY` are read-only 0.5, unlike
  // Image/Sprite, and this offset is applied unconditionally in
  // InputManager#pointWithinHitArea before the hitArea check runs). That offset already
  // "re-centers" a hit area given in the same local space the panel/text were placed in
  // (`localX, localY`), so the hit area below must be `(localX, localY, width, height)` — *not*
  // shifted by an extra `-width / 2, -height / 2` on top, which would double-compensate and
  // silently mis-hit-test everything except a center-anchored button (confirmed by clicking
  // every few pixels across a bottom-anchored button in Playwright: only roughly the top half
  // registered before this fix).
  container.setInteractive({
    hitArea: new Phaser.Geom.Rectangle(localX, localY, width, height),
    hitAreaCallback: Phaser.Geom.Rectangle.Contains,
    useHandCursor: true,
  });
  const hoverTint = style.hoverTint ?? 0xf4ecd8;
  container.on('pointerover', () => panel.setTint(hoverTint));
  container.on('pointerout', () => panel.clearTint());
  container.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
    event.stopPropagation();
    onClick();
  });

  // Keep the independent label in step with the container -- `text` isn't a child of `container`
  // (see this function's own doc comment above on why), so every mutator a call site actually uses
  // on the returned button needs its own override here, or the label silently drifts out of sync
  // with the container it's supposed to belong to.
  const originalSetPosition = container.setPosition.bind(container);
  container.setPosition = ((...args: Parameters<typeof originalSetPosition>) => {
    originalSetPosition(...args);
    text.setPosition(container.x + localX, container.y + localY);
    return container;
  }) as typeof container.setPosition;
  // Same reasoning as `setPosition` above: `text` isn't a child of `container`, so a plain
  // `btn.setScrollFactor(0)` at a call site (every existing one does this, to pin a button to the
  // screen in a scrolling scene) only affects the container's own panel graphic — the independent
  // label keeps its default `scrollFactor = 1` and drifts in world space as the camera scrolls,
  // landing far off-screen the moment the player has moved. Mirror the override so both move
  // together, the same way `setPosition` already does.
  const originalSetScrollFactor = container.setScrollFactor.bind(container);
  container.setScrollFactor = ((...args: Parameters<typeof originalSetScrollFactor>) => {
    originalSetScrollFactor(...args);
    // DOMElement's own setScrollFactor only takes (x, y) -- Container's 3rd `updateChildren`
    // param doesn't apply to `text` (it isn't a child of `container` at all).
    text.setScrollFactor(args[0], args[1]);
    return container;
  }) as typeof container.setScrollFactor;
  const originalSetVisible = container.setVisible.bind(container);
  container.setVisible = ((...args: Parameters<typeof originalSetVisible>) => {
    originalSetVisible(...args);
    text.setVisible(args[0]);
    return container;
  }) as typeof container.setVisible;
  container.once(Phaser.GameObjects.Events.DESTROY, () => text.destroy());

  return container;
}
