import Phaser from 'phaser';
import type { CharacterId } from '../pixelart/characters';
import { portraitKeyFor, type Expression } from '../pixelart/portraits';

/**
 * Drives one dialogue portrait image through blink + talk states:
 *
 *   IDLE     -> blinks occasionally, on a randomized (non-robotic) timer
 *   TALKING  -> keeps blinking + mouth opens/closes while text is typing
 *   COMPLETE -> mouth closes, blinking continues
 *
 * One instance is reused across the whole dialogue box; call setSpeaker()
 * whenever the active character changes so the blink schedule reseeds.
 */
export class PortraitAnimator {
  private scene: Phaser.Scene;
  private image: Phaser.GameObjects.Image;
  private characterId: CharacterId | null = null;
  private eyesClosed = false;
  private mouthOpen = false;
  private blinkTimer: Phaser.Time.TimerEvent | null = null;
  private mouthTimer: Phaser.Time.TimerEvent | null = null;

  constructor(scene: Phaser.Scene, image: Phaser.GameObjects.Image) {
    this.scene = scene;
    this.image = image;
  }

  setSpeaker(characterId: CharacterId): void {
    this.characterId = characterId;
    this.eyesClosed = false;
    this.mouthOpen = false;
    this.stopMouthLoop();
    this.scheduleNextBlink(true);
    this.render();
  }

  startTalking(): void {
    this.startMouthLoop();
  }

  stopTalking(): void {
    this.stopMouthLoop();
    this.mouthOpen = false;
    this.render();
  }

  destroy(): void {
    this.blinkTimer?.remove();
    this.mouthTimer?.remove();
    this.blinkTimer = null;
    this.mouthTimer = null;
  }

  private scheduleNextBlink(first: boolean): void {
    this.blinkTimer?.remove();
    // Randomized, non-uniform interval so blinking never reads as a metronome.
    const delay = first ? Phaser.Math.Between(500, 2000) : Phaser.Math.Between(1800, 4600);
    this.blinkTimer = this.scene.time.delayedCall(delay, () => this.doBlink());
  }

  private doBlink(): void {
    this.eyesClosed = true;
    this.render();
    this.scene.time.delayedCall(110, () => {
      this.eyesClosed = false;
      this.render();
      // Occasionally perform a second blink shortly after — uncommon, not on every cycle.
      if (Math.random() < 0.16) {
        this.scene.time.delayedCall(170, () => {
          this.eyesClosed = true;
          this.render();
          this.scene.time.delayedCall(110, () => {
            this.eyesClosed = false;
            this.render();
            this.scheduleNextBlink(false);
          });
        });
      } else {
        this.scheduleNextBlink(false);
      }
    });
  }

  private startMouthLoop(): void {
    this.stopMouthLoop();
    this.mouthTimer = this.scene.time.addEvent({
      delay: 110,
      loop: true,
      callback: () => {
        this.mouthOpen = !this.mouthOpen;
        this.render();
      },
    });
  }

  private stopMouthLoop(): void {
    this.mouthTimer?.remove();
    this.mouthTimer = null;
  }

  private render(): void {
    if (!this.characterId) return;
    const expression: Expression = this.eyesClosed
      ? this.mouthOpen
        ? 'talkBlink'
        : 'blink'
      : this.mouthOpen
        ? 'talk'
        : 'neutral';
    this.image.setTexture(portraitKeyFor(this.characterId, expression));
  }
}
