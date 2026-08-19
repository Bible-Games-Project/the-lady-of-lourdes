import Phaser from 'phaser';
import { DEPTH, GAME_HEIGHT, GAME_WIDTH } from '../core/constants';
import { ROSARY_KEYS } from '../pixelart/rosary';

const BEAD_COUNT = 10;
const BEAD_SPACING = 13;

/**
 * A real rosary — a cross followed by ten beads — hung along the right edge
 * of the screen during the first apparition. One press advances one bead;
 * pacing is left entirely to the player, which is what keeps it
 * contemplative rather than a minigame.
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

    const x = GAME_WIDTH - 26;
    let y = GAME_HEIGHT - 196;

    const cross = this.scene.add.image(x, y, ROSARY_KEYS.CROSS);
    cross.setScrollFactor(0);
    cross.setDepth(DEPTH.UI);
    this.objects.push(cross);

    y += 18;
    for (let i = 0; i < BEAD_COUNT; i++) {
      const bead = this.scene.add.image(x, y, ROSARY_KEYS.BEAD_DIM);
      bead.setScrollFactor(0);
      bead.setDepth(DEPTH.UI);
      this.beads.push(bead);
      this.objects.push(bead);
      y += BEAD_SPACING;
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
