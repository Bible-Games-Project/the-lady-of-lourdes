import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import { textStyle } from '../ui/text';

/** On-screen virtual joystick + interact button for touch devices (mobile app builds). */
export class TouchControls {
  readonly vector = { x: 0, y: 0 };
  onInteract: (() => void) | null = null;

  private baseX: number;
  private baseY: number;
  private radius = 24;
  private pointerId: number | null = null;
  private knob: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene) {
    this.baseX = 42;
    this.baseY = GAME_HEIGHT - 42;

    const base = scene.add.circle(this.baseX, this.baseY, this.radius, 0x3a3226, 0.2);
    this.knob = scene.add.circle(this.baseX, this.baseY, 11, 0xfffaf0, 0.55);
    [base, this.knob].forEach((shape) => {
      shape.setScrollFactor(0);
      shape.setDepth(DEPTH.UI);
    });

    const interactButton = scene.add.circle(GAME_WIDTH - 40, GAME_HEIGHT - 42, 20, 0xfffaf0, 0.4);
    const interactLabel = scene.add
      .text(GAME_WIDTH - 40, GAME_HEIGHT - 42, '●', textStyle({ fontSize: '14px', color: '#3a3226' }))
      .setOrigin(0.5);
    [interactButton, interactLabel].forEach((shape) => {
      shape.setScrollFactor(0);
      shape.setDepth(DEPTH.UI);
    });
    interactButton.setInteractive({ useHandCursor: false });
    interactButton.on('pointerdown', () => this.onInteract?.());

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      const distance = Phaser.Math.Distance.Between(pointer.x, pointer.y, this.baseX, this.baseY);
      if (distance < this.radius + 20 && this.pointerId === null) {
        this.pointerId = pointer.id;
      }
    });

    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.pointerId !== pointer.id) return;
      const dx = pointer.x - this.baseX;
      const dy = pointer.y - this.baseY;
      const length = Math.hypot(dx, dy) || 1;
      const clamped = Math.min(length, this.radius);
      this.knob.setPosition(this.baseX + (dx / length) * clamped, this.baseY + (dy / length) * clamped);
      this.vector.x = length > 4 ? dx / length : 0;
      this.vector.y = length > 4 ? dy / length : 0;
    });

    scene.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.pointerId !== pointer.id) return;
      this.pointerId = null;
      this.vector.x = 0;
      this.vector.y = 0;
      this.knob.setPosition(this.baseX, this.baseY);
    });
  }
}
