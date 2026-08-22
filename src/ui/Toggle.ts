import Phaser from 'phaser';
import { HOME_PALETTE } from '../pixelart/homePalette';

export interface ToggleHandle {
  setValue(value: boolean): void;
  destroy(): void;
}

// Only ever used on the Settings screen — colored from the Home palette (warm gold for on,
// muted stone for off) so it reads as the same artwork's UI rather than a generic HTML toggle.
const ON_COLOR = Phaser.Display.Color.HexStringToColor(HOME_PALETTE.glowGold).color;
const OFF_COLOR = Phaser.Display.Color.HexStringToColor(HOME_PALETTE.pathStoneShade).color;
const KNOB_COLOR = Phaser.Display.Color.HexStringToColor(HOME_PALETTE.cream).color;

export function createToggle(
  scene: Phaser.Scene,
  x: number,
  y: number,
  initialValue: boolean,
  onChange: (value: boolean) => void,
): ToggleHandle {
  const width = 40;
  const height = 20;

  const bg = scene.add.rectangle(x, y, width, height, initialValue ? ON_COLOR : OFF_COLOR).setOrigin(0, 0.5);
  const knob = scene.add.circle(x + (initialValue ? width - height / 2 : height / 2), y, height / 2 - 2, KNOB_COLOR);
  const hit = scene.add.zone(x + width / 2, y, width, height).setInteractive({ useHandCursor: true });

  let value = initialValue;

  hit.on('pointerdown', () => {
    value = !value;
    bg.setFillStyle(value ? ON_COLOR : OFF_COLOR);
    knob.x = x + (value ? width - height / 2 : height / 2);
    onChange(value);
  });

  return {
    setValue(next: boolean) {
      value = next;
      bg.setFillStyle(next ? ON_COLOR : OFF_COLOR);
      knob.x = x + (next ? width - height / 2 : height / 2);
    },
    destroy() {
      bg.destroy();
      knob.destroy();
      hit.destroy();
    },
  };
}
