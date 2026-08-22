import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import {
  HOME_BACKGROUND_KEY,
  HOME_BERNADETTE_TORSO_CUTOUT_KEY,
  HOME_CUTOUT_SOURCE_RECT,
} from '../assets/home/homeBackground';
import { HOME_PALETTE } from '../pixelart/homePalette';
import { HOME_FX_KEYS } from '../pixelart/homeEffects';
import { UI_KEYS, UI_HOME_BUTTON_SLICE } from '../pixelart/ui';
import { createButton } from '../ui/Button';
import { textStyle } from '../ui/text';
import { useFullBleedScale } from '../core/scaleMode';

/** Candle positions in the *original* (1672x941) artwork — see toGameXY(). */
const CANDLE_SOURCE_POINTS: Array<{ x: number; y: number }> = [
  { x: 870, y: 672 },
  { x: 1040, y: 600 },
  { x: 1080, y: 605 },
];

/** The Lady's halo center in the original artwork, for the soft light-ray layer. */
const LADY_LIGHT_SOURCE_POINT = { x: 1152, y: 300 };

/** A handful of points along the river's brightest ripples, in the original artwork. */
const RIVER_GLINT_SOURCE_POINTS: Array<{ x: number; y: number }> = [
  { x: 60, y: 680 },
  { x: 150, y: 700 },
  { x: 230, y: 690 },
  { x: 100, y: 750 },
  { x: 280, y: 660 },
];

/**
 * Short lanes along the river's surface (in the *original* artwork), each just a small local
 * segment following the water's downstream-left drift rather than a full traversal of the river
 * — the streaks are meant to read as "light glinting off water that is moving", not as objects
 * traveling any real distance. See `buildWaterFlow()`.
 */
const WATER_FLOW_LANES: Array<{ x0: number; y0: number; x1: number; y1: number; periodMs: number }> = [
  { x0: 78, y0: 668, x1: 42, y1: 694, periodMs: 8200 },
  { x0: 168, y0: 688, x1: 128, y1: 714, periodMs: 9400 },
  { x0: 246, y0: 678, x1: 208, y1: 702, periodMs: 7600 },
  { x0: 118, y0: 738, x1: 78, y1: 762, periodMs: 8800 },
  { x0: 296, y0: 648, x1: 258, y1: 672, periodMs: 9000 },
];

interface WaterStreak {
  sprite: Phaser.GameObjects.Image;
  lane: (typeof WATER_FLOW_LANES)[number];
  phase: number;
}

interface DriftingSprite {
  sprite: Phaser.GameObjects.Image;
  x: number;
  y: number;
  fallSpeed: number;
  windX: number;
  driftAmp: number;
  driftFreq: number;
  phase: number;
  rotSpeed: number;
  elapsed: number;
}

const LEAF_TEXTURES = [HOME_FX_KEYS.LEAF_AMBER, HOME_FX_KEYS.LEAF_GOLD, HOME_FX_KEYS.LEAF_RUST];

export class HomeScene extends Phaser.Scene {
  private bgScale = 1;
  private bgOffsetX = 0;
  private bgOffsetY = 0;
  private leaves: DriftingSprite[] = [];
  private motes: DriftingSprite[] = [];
  private bernadetteTorso: Phaser.GameObjects.Image | null = null;
  private bernadetteBaseScaleY = 1;
  private waterStreaks: WaterStreak[] = [];
  private elapsedMs = 0;

  constructor() {
    super(SCENE_KEYS.HOME);
  }

  create(): void {
    useFullBleedScale(this);
    this.buildBackground();
    this.buildLadyLight();
    this.buildBreathingFigure();
    this.buildCandleLight();
    this.buildRiverGlints();
    this.buildWaterFlow();
    this.buildTitle();
    this.buildLeaves();
    this.buildMotes();

    // Settings: pixel-art gear, top-right corner, out of the way of the illustration.
    const gear = this.add
      .image(GAME_WIDTH - 24, 22, UI_KEYS.HOME_GEAR)
      .setScale(1.2)
      .setInteractive({ useHandCursor: true });
    gear.setDepth(DEPTH.UI);
    gear.on('pointerover', () => gear.setTint(0xfffdf5));
    gear.on('pointerout', () => gear.clearTint());
    gear.on('pointerdown', () => this.openSettings());

    // Small, mostly-transparent, and pushed into the bottom corners so the central artwork —
    // Bernadette especially — stays unobstructed.
    const buttonWidth = 112;
    const buttonHeight = 26;
    const marginX = 16;
    const marginY = 16;

    const buttonStyle = {
      textureKey: UI_KEYS.HOME_BUTTON,
      border: UI_HOME_BUTTON_SLICE.border,
      textColor: HOME_PALETTE.cream,
      hoverTint: 0xfff8e8,
      panelAlpha: 0.34,
      textStroke: { color: HOME_PALETTE.ink, thickness: 3 },
    };

    createButton(
      this,
      marginX + buttonWidth / 2,
      GAME_HEIGHT - marginY - buttonHeight / 2,
      buttonWidth,
      buttonHeight,
      Localization.t(K.HOME_PLAY),
      () => {
        this.scene.start(SCENE_KEYS.JOURNEY);
      },
      buttonStyle,
    );

    createButton(
      this,
      GAME_WIDTH - marginX - buttonWidth / 2,
      GAME_HEIGHT - marginY - buttonHeight / 2,
      buttonWidth,
      buttonHeight,
      Localization.t(K.HOME_MORE_GAMES),
      () => {
        this.scene.start(SCENE_KEYS.MORE_GAMES);
      },
      buttonStyle,
    );
  }

  update(_time: number, delta: number): void {
    const dt = delta / 1000;
    this.elapsedMs += delta;
    this.advanceDrift(this.leaves, dt, true);
    this.advanceDrift(this.motes, dt, false);
    this.advanceBernadetteBreathing();
    this.advanceWaterFlow();
  }

  /**
   * The maintainer's own artwork, used as-is — no crop/recompose, just a uniform "cover" scale
   * (never a non-uniform stretch, which would distort it) so it fills the frame edge-to-edge.
   * The source is already 16:9, so in practice this is an exact fit with no visible crop.
   */
  private buildBackground(): void {
    const bg = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT / 2, HOME_BACKGROUND_KEY);
    this.bgScale = Math.max(GAME_WIDTH / bg.width, GAME_HEIGHT / bg.height);
    bg.setScale(this.bgScale);
    this.bgOffsetX = GAME_WIDTH / 2 - (bg.width * this.bgScale) / 2;
    this.bgOffsetY = GAME_HEIGHT / 2 - (bg.height * this.bgScale) / 2;
  }

  /** Maps a pixel coordinate in the original 1672x941 artwork to this scene's 480x270 canvas. */
  private toGameXY(imgX: number, imgY: number): { x: number; y: number } {
    return { x: imgX * this.bgScale + this.bgOffsetX, y: imgY * this.bgScale + this.bgOffsetY };
  }

  /**
   * The Lady and the sky's cloud are baked into the flat background and are left completely
   * static — no cutout, no motion — on explicit request. Bernadette gets one small, tightly
   * scoped effect: a tiny cutout of *only* her torso/chest (not her head, hands, or skirt — see
   * assets/home/homeBackground.ts for exactly where it's cropped) is laid back over that same
   * spot on the static background, invisible when still, and given a barely-there breathing
   * scale anchored at its bottom edge (her waist, which must stay visually fixed) so only the
   * chest above it subtly rises. The amplitude is kept far inside the cutout's feathered margin
   * so the identical, still copy baked into the background is never uncovered.
   *
   * Driven directly by `Math.sin(elapsed)` in `advanceBernadetteBreathing()` rather than a Phaser
   * `yoyo + repeat` tween: a plain continuous sine of elapsed time is seamless *by construction*
   * (sin(0) === sin(2π) and its derivative matches too), so there is no loop boundary to snap at.
   * Don't go back to a tween for this — that was tried first and had a visible jerk on repeat.
   */
  private buildBreathingFigure(): void {
    const rect = HOME_CUTOUT_SOURCE_RECT.bernadetteTorso;
    const base = this.toGameXY(rect.x + rect.width / 2, rect.y + rect.height);
    const torso = this.add.image(base.x, base.y, HOME_BERNADETTE_TORSO_CUTOUT_KEY);
    torso.setOrigin(0.5, 1);
    torso.setScale(this.bgScale);
    torso.setDepth(2);
    this.bernadetteTorso = torso;
    this.bernadetteBaseScaleY = this.bgScale;
  }

  private advanceBernadetteBreathing(): void {
    if (!this.bernadetteTorso) return;
    const periodMs = 5000;
    const amplitude = this.bernadetteBaseScaleY * 0.01;
    const angle = (this.elapsedMs / periodMs) * Math.PI * 2;
    this.bernadetteTorso.scaleY = this.bernadetteBaseScaleY + Math.sin(angle) * amplitude;
  }

  /** Faint, intermittent glints of light on the river's ripples — never a moving texture. */
  private buildRiverGlints(): void {
    RIVER_GLINT_SOURCE_POINTS.forEach(({ x, y }, i) => {
      const pos = this.toGameXY(x, y);
      const glint = this.add.image(pos.x, pos.y, HOME_FX_KEYS.WATER_GLINT);
      glint.setBlendMode(Phaser.BlendModes.ADD);
      glint.setDepth(0.6);
      glint.setScale(Phaser.Math.FloatBetween(0.6, 1));
      glint.setAlpha(0);
      // Stagger the first appearance so all five don't shimmer in lockstep.
      this.time.delayedCall(i * 700, () => this.glintCycle(glint));
    });
  }

  private glintCycle(target: Phaser.GameObjects.Image): void {
    const peakAlpha = Phaser.Math.FloatBetween(0.25, 0.45);
    this.tweens.add({
      targets: target,
      alpha: peakAlpha,
      duration: Phaser.Math.Between(1400, 2400),
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (!target.active) return;
        this.tweens.add({
          targets: target,
          alpha: 0,
          duration: Phaser.Math.Between(1400, 2400),
          ease: 'Sine.easeInOut',
          onComplete: () => {
            if (!target.active) return;
            this.time.delayedCall(Phaser.Math.Between(800, 2600), () => this.glintCycle(target));
          },
        });
      },
    });
  }

  /**
   * The river itself never moves — these are a handful of thin light streaks drifting slowly
   * along short lanes on its surface (see `WATER_FLOW_LANES`) to give the impression the water is
   * flowing, without animating the painted water texture itself. Two streaks per lane, half a
   * cycle out of phase, so one is always fading in as the other fades out — combined with a
   * continuous `Math.sin`/modulo position (the same seamless-loop technique as the breathing
   * effect) and an alpha that tapers to 0 at both ends of the lane, the "reset" from end back to
   * start is invisible (it happens while fully transparent). Don't swap this for a texture-scroll
   * or a yoyo tween — see AGENTS.md on why continuous elapsed-time math is required here.
   */
  private buildWaterFlow(): void {
    WATER_FLOW_LANES.forEach((lane) => {
      [0, 0.5].forEach((phaseOffset) => {
        const sprite = this.add.image(0, 0, HOME_FX_KEYS.WATER_STREAK);
        sprite.setBlendMode(Phaser.BlendModes.ADD);
        sprite.setDepth(0.6);
        sprite.setScale(Phaser.Math.FloatBetween(0.8, 1.1));
        this.waterStreaks.push({ sprite, lane, phase: phaseOffset });
      });
    });
  }

  private advanceWaterFlow(): void {
    this.waterStreaks.forEach(({ sprite, lane, phase }) => {
      const t = ((this.elapsedMs / lane.periodMs + phase) % 1 + 1) % 1;
      const imgX = Phaser.Math.Linear(lane.x0, lane.x1, t);
      const imgY = Phaser.Math.Linear(lane.y0, lane.y1, t);
      const pos = this.toGameXY(imgX, imgY);
      sprite.setPosition(pos.x, pos.y);
      // Fade in over the first quarter of the lane, fade out over the last quarter, so the
      // wrap-around from t=1 back to t=0 happens while fully invisible.
      const fadeIn = Phaser.Math.Clamp(t / 0.25, 0, 1);
      const fadeOut = Phaser.Math.Clamp((1 - t) / 0.25, 0, 1);
      sprite.setAlpha(Math.min(fadeIn, fadeOut) * 0.5);
    });
  }

  /** Warm, irregularly-pulsing glow at each candle — never a hard flash. */
  private buildCandleLight(): void {
    CANDLE_SOURCE_POINTS.forEach(({ x, y }) => {
      const pos = this.toGameXY(x, y);
      const glow = this.add.image(pos.x, pos.y - 2, HOME_FX_KEYS.GLOW);
      glow.setBlendMode(Phaser.BlendModes.ADD);
      glow.setDepth(3);
      const baseScale = 0.34;
      const baseAlpha = 0.4;
      glow.setScale(baseScale);
      glow.setAlpha(baseAlpha);
      this.flicker(glow, baseAlpha, baseScale);
    });
  }

  private flicker(target: Phaser.GameObjects.Image, baseAlpha: number, baseScale: number): void {
    const nextAlpha = Phaser.Math.FloatBetween(baseAlpha * 0.65, baseAlpha * 1.3);
    const nextScale = Phaser.Math.FloatBetween(baseScale * 0.88, baseScale * 1.15);
    const duration = Phaser.Math.Between(650, 1500);
    this.tweens.add({
      targets: target,
      alpha: nextAlpha,
      scale: nextScale,
      duration,
      ease: 'Sine.easeInOut',
      onComplete: () => {
        if (target.active) this.flicker(target, baseAlpha, baseScale);
      },
    });
  }

  /** Soft, slowly-rotating light around the Lady — sunlight through the grotto, not a magic glow. */
  private buildLadyLight(): void {
    const pos = this.toGameXY(LADY_LIGHT_SOURCE_POINT.x, LADY_LIGHT_SOURCE_POINT.y);
    const container = this.add.container(pos.x, pos.y);
    container.setDepth(1);
    container.setAlpha(0.16);
    container.setBlendMode(Phaser.BlendModes.ADD);

    const glow = this.add.image(0, 0, HOME_FX_KEYS.GLOW).setScale(1.4);
    container.add(glow);

    const rayCount = 3;
    for (let i = 0; i < rayCount; i++) {
      const ray = this.add.image(0, 0, HOME_FX_KEYS.RAY);
      ray.setOrigin(0.5, 1);
      ray.setScale(0.6, 0.55);
      ray.setRotation((Math.PI * 2 * i) / rayCount);
      ray.setAlpha(0.7);
      container.add(ray);
    }

    this.tweens.add({
      targets: container,
      rotation: Math.PI * 2,
      duration: 90000,
      repeat: -1,
    });
    this.tweens.add({
      targets: container,
      alpha: 0.22,
      duration: 5200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private buildLeaves(): void {
    for (let i = 0; i < 6; i++) {
      this.leaves.push(this.spawnDrifter(true, true));
    }
  }

  private buildMotes(): void {
    for (let i = 0; i < 3; i++) {
      this.motes.push(this.spawnDrifter(false, false));
    }
  }

  /**
   * `scatterOnStart` places the drifter anywhere along its path (so the scene doesn't open with
   * every leaf bunched at the top edge); every respawn after that re-enters from the natural
   * edge — top for falling leaves, bottom for rising motes — like the previous one just did.
   */
  private spawnDrifter(scatterOnStart: boolean, isLeaf: boolean): DriftingSprite {
    const x = Phaser.Math.Between(10, GAME_WIDTH - 10);
    let y: number;
    if (isLeaf) {
      y = scatterOnStart ? Phaser.Math.Between(-60, GAME_HEIGHT - 20) : Phaser.Math.Between(-60, -10);
    } else {
      y = scatterOnStart ? Phaser.Math.Between(GAME_HEIGHT * 0.3, GAME_HEIGHT + 20) : Phaser.Math.Between(GAME_HEIGHT + 5, GAME_HEIGHT + 20);
    }
    const texture = isLeaf ? Phaser.Utils.Array.GetRandom(LEAF_TEXTURES) : HOME_FX_KEYS.MOTE;
    const sprite = this.add.image(x, y, texture);
    sprite.setDepth(isLeaf ? 5 : 4);
    sprite.setBlendMode(isLeaf ? Phaser.BlendModes.NORMAL : Phaser.BlendModes.ADD);
    sprite.setAlpha(isLeaf ? Phaser.Math.FloatBetween(0.55, 0.9) : Phaser.Math.FloatBetween(0.15, 0.32));
    sprite.setScale(isLeaf ? Phaser.Math.FloatBetween(0.7, 1.15) : Phaser.Math.FloatBetween(0.6, 1.1));
    sprite.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));

    return {
      sprite,
      x,
      y,
      fallSpeed: isLeaf ? Phaser.Math.FloatBetween(3.5, 8) : Phaser.Math.FloatBetween(-3, -1),
      windX: isLeaf ? Phaser.Math.FloatBetween(-2.5, 2.5) : Phaser.Math.FloatBetween(-0.6, 0.6),
      driftAmp: isLeaf ? Phaser.Math.FloatBetween(6, 18) : Phaser.Math.FloatBetween(2, 6),
      driftFreq: Phaser.Math.FloatBetween(0.25, 0.65),
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      rotSpeed: isLeaf ? Phaser.Math.FloatBetween(-0.5, 0.5) : 0,
      elapsed: Phaser.Math.FloatBetween(0, 10),
    };
  }

  private advanceDrift(list: DriftingSprite[], dt: number, isLeaf: boolean): void {
    list.forEach((d, i) => {
      d.elapsed += dt;
      d.x += d.windX * dt;
      d.y += d.fallSpeed * dt;
      const wobble = Math.sin(d.elapsed * d.driftFreq + d.phase) * d.driftAmp * dt;
      d.x += wobble;
      d.sprite.setPosition(d.x, d.y);
      d.sprite.rotation += d.rotSpeed * dt;

      const offScreen = isLeaf ? d.y > GAME_HEIGHT + 20 : d.y < -20;
      if (offScreen || d.x < -30 || d.x > GAME_WIDTH + 30) {
        list[i] = this.spawnDrifter(false, isLeaf);
        d.sprite.destroy();
      }
    });
  }

  /**
   * Same design as before — cream fill, hard-edge pixel shadow, gold rule — but with a full
   * dark outline added around the fill this time. A single offset shadow only helps where the
   * shadow itself lands on something lighter; over a busy photo (bright sky at the top here)
   * that leaves some of the letterforms with too little contrast. An all-around stroke holds up
   * regardless of what's behind it.
   */
  private buildTitle(): void {
    const style = textStyle({
      fontSize: '20px',
      color: HOME_PALETTE.cream,
      fontStyle: 'bold',
      stroke: HOME_PALETTE.ink,
      strokeThickness: 4,
    });
    const shadowStyle = textStyle({ fontSize: '20px', color: HOME_PALETTE.ink, fontStyle: 'bold' });

    this.add.text(GAME_WIDTH / 2 + 2, 28, 'The Lady of Lourdes', shadowStyle).setOrigin(0.5).setDepth(6);
    this.add.text(GAME_WIDTH / 2, 26, 'The Lady of Lourdes', style).setOrigin(0.5).setDepth(6);

    const ruleY = 40;
    const ruleHalfWidth = 60;
    const rule = this.add.graphics();
    rule.setDepth(6);
    rule.fillStyle(Phaser.Display.Color.HexStringToColor(HOME_PALETTE.glowGold).color, 0.9);
    rule.fillRect(GAME_WIDTH / 2 - ruleHalfWidth, ruleY, ruleHalfWidth - 6, 1);
    rule.fillRect(GAME_WIDTH / 2 + 6, ruleY, ruleHalfWidth - 6, 1);
    rule.fillRect(GAME_WIDTH / 2 - 2, ruleY - 2, 4, 4);
  }

  private openSettings(): void {
    this.scene.launch(SCENE_KEYS.SETTINGS, { returnTo: SCENE_KEYS.HOME });
    this.scene.pause();
  }
}
