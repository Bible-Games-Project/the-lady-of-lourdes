import Phaser from 'phaser';

export interface ToggleHandle {
  setValue(value: boolean): void;
  destroy(): void;
}

const ON_COLOR = 0x8fae6b;
const OFF_COLOR = 0x9a9184;

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
  const knob = scene.add.circle(x + (initialValue ? width - height / 2 : height / 2), y, height / 2 - 2, 0xfffaf0);
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
