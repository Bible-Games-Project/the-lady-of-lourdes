import Phaser from 'phaser';
import { UI_KEYS, UI_BUTTON_SLICE } from '../pixelart/ui';
import { textStyle } from './text';

export interface ButtonStyle {
  textureKey?: string;
  border?: number;
  textColor?: string;
  hoverTint?: number;
  /** Panel opacity (0-1). Defaults to fully opaque — used for buttons meant to sit lightly over artwork. */
  panelAlpha?: number;
  /** Outline around the label, for readability when the panel itself is very transparent. */
  textStroke?: { color: string; thickness: number };
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
  const text = scene.add
    .text(
      localX,
      localY,
      label,
      textStyle({
        fontSize: '14px',
        color: style.textColor ?? '#3a3226',
        fontStyle: 'bold',
        ...strokeProps,
      }),
    )
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [panel, text]);
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

  return container;
}
