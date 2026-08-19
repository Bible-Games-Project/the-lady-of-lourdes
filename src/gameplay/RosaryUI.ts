import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import { ROSARY_KEYS } from '../pixelart/rosary';

const BEAD_COUNT = 10;
const CENTER_X = GAME_WIDTH / 2;
const CENTER_Y = GAME_HEIGHT / 2 - 6;
const RADIUS_X = 58;
const RADIUS_Y = 48;
// Leaves a gap at the bottom of the oval where the cross hangs, rather than closing the loop.
const GAP_DEG = 30;
const START_DEG = 90 + GAP_DEG / 2;
const SWEEP_DEG = 360 - GAP_DEG;

/**
 * A real rosary — a loose oval of ten beads with the cross hanging from the
 * bottom — held centered on screen during the first apparition. One press
 * advances one bead; pacing is left entirely to the player, which is what
 * keeps it contemplative rather than a minigame.
 */
export class RosaryUI {
  private scene: Phaser.Scene;
  private objects: Phaser.GameObjects.GameObject[] = [];
  private beads: Phaser.GameObjects.Image[] = [];
  private progress = 0;
  private onComplete: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  get totalBeads(): number {
    return BEAD_COUNT;
  }

  start(onComplete: () => void): void {
    this.onComplete = onComplete;
    this.progress = 0;
    this.beads = [];

    // A soft backdrop keeps the beads readable against any terrain behind them, while staying
    // translucent enough that the Lady is still visible around the rosary, not hidden by it.
    const backdrop = this.scene.add.ellipse(CENTER_X, CENTER_Y + 8, (RADIUS_X + 22) * 2, (RADIUS_Y + 30) * 2, 0x120d09, 0.6);
    backdrop.setScrollFactor(0);
    backdrop.setDepth(DEPTH.UI - 0.001);
    this.objects.push(backdrop);

    const cross = this.scene.add.image(CENTER_X, CENTER_Y + RADIUS_Y + 10, ROSARY_KEYS.CROSS);
    cross.setOrigin(0.5, 0);
    cross.setScrollFactor(0);
    cross.setDepth(DEPTH.UI);
    this.objects.push(cross);

    for (let i = 0; i < BEAD_COUNT; i++) {
      const deg = START_DEG + (SWEEP_DEG * i) / (BEAD_COUNT - 1);
      const rad = Phaser.Math.DegToRad(deg);
      const x = CENTER_X + RADIUS_X * Math.cos(rad);
      const y = CENTER_Y + RADIUS_Y * Math.sin(rad);
      const bead = this.scene.add.image(x, y, ROSARY_KEYS.BEAD_DIM);
      bead.setScrollFactor(0);
      bead.setDepth(DEPTH.UI);
      this.beads.push(bead);
      this.objects.push(bead);
    }

    this.highlightCurrent();
  }

  private highlightCurrent(): void {
    this.beads.forEach((bead, i) => {
      if (i < this.progress) {
        bead.setTexture(ROSARY_KEYS.BEAD_LIT);
        bead.setScale(1.1);
        bead.setAlpha(1);
      } else if (i === this.progress) {
        bead.setTexture(ROSARY_KEYS.BEAD_DIM);
        bead.setScale(1.35);
        bead.setAlpha(1);
      } else {
        bead.setTexture(ROSARY_KEYS.BEAD_DIM);
        bead.setScale(0.9);
        bead.setAlpha(0.5);
      }
    });
  }

  advance(): void {
    if (this.progress >= BEAD_COUNT) return;
    const bead = this.beads[this.progress];
    bead.setTexture(ROSARY_KEYS.BEAD_LIT);
    this.scene.tweens.add({ targets: bead, scale: 1.6, duration: 160, yoyo: true });
    this.progress++;
    this.highlightCurrent();

    if (this.progress >= BEAD_COUNT) {
      const callback = this.onComplete;
      this.onComplete = null;
      this.scene.time.delayedCall(500, () => {
        this.destroy();
        callback?.();
      });
    }
  }

  isActive(): boolean {
    return this.objects.length > 0;
  }

  destroy(): void {
    this.objects.forEach((obj) => obj.destroy());
    this.objects = [];
    this.beads = [];
  }
}
