import Phaser from 'phaser';

export interface SliderHandle {
  setValue(v: number): void;
  setEnabled(enabled: boolean): void;
  destroy(): void;
}

/** A simple 0..1 horizontal slider in absolute scene coordinates (kept out of containers to avoid drag-space ambiguity). */
export function createSlider(
  scene: Phaser.Scene,
  x: number,
  y: number,
  width: number,
  initialValue: number,
  onChange: (value: number) => void,
): SliderHandle {
  const trackHeight = 4;
  const track = scene.add.rectangle(x, y, width, trackHeight, 0x7a6a52).setOrigin(0, 0.5);
  const fill = scene.add.rectangle(x, y, Math.max(1, width * initialValue), trackHeight, 0xc9a84a).setOrigin(0, 0.5);
  const handle = scene.add.circle(x + width * initialValue, y, 7, 0xfffaf0);
  handle.setStrokeStyle(2, 0x5a4d3a);

  let enabled = true;

  function setFromSceneX(sceneX: number): void {
    const clamped = Phaser.Math.Clamp(sceneX - x, 0, width);
    handle.x = x + clamped;
    fill.width = Math.max(1, clamped);
    onChange(clamped / width);
  }

  handle.setInteractive({ useHandCursor: true, draggable: true });
  handle.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number) => {
    if (!enabled) return;
    setFromSceneX(dragX);
  });

  track.setInteractive({ useHandCursor: true });
  track.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
    if (!enabled) return;
    setFromSceneX(pointer.x);
  });

  return {
    setValue(value: number) {
      const clamped = Phaser.Math.Clamp(value, 0, 1) * width;
      handle.x = x + clamped;
      fill.width = Math.max(1, clamped);
    },
    setEnabled(next: boolean) {
      enabled = next;
      const alpha = next ? 1 : 0.4;
      track.setAlpha(alpha);
      fill.setAlpha(alpha);
      handle.setAlpha(alpha);
      handle.input!.draggable = next;
    },
    destroy() {
      track.destroy();
      fill.destroy();
      handle.destroy();
    },
  };
}
