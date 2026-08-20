import Phaser from 'phaser';
import { UI_KEYS, UI_BUTTON_SLICE } from '../pixelart/ui';
import { textStyle } from './text';

export interface ButtonStyle {
  textureKey?: string;
  border?: number;
  textColor?: string;
  hoverTint?: number;
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
): Phaser.GameObjects.Container {
  const border = style.border ?? UI_BUTTON_SLICE.border;
  const panel = scene.add.nineslice(
    0,
    0,
    style.textureKey ?? UI_KEYS.BUTTON,
    undefined,
    width,
    height,
    border,
    border,
    border,
    border,
  );
  const text = scene.add
    .text(0, 0, label, textStyle({ fontSize: '14px', color: style.textColor ?? '#3a3226', fontStyle: 'bold' }))
    .setOrigin(0.5);

  const container = scene.add.container(x, y, [panel, text]);
  container.setSize(width, height);
  container.setInteractive({ useHandCursor: true });
  const hoverTint = style.hoverTint ?? 0xf4ecd8;
  container.on('pointerover', () => panel.setTint(hoverTint));
  container.on('pointerout', () => panel.clearTint());
  container.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
    event.stopPropagation();
    onClick();
  });

  return container;
}
