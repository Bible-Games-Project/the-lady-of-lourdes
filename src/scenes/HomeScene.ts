import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import {
  HOME_BACKGROUND_KEY,
  HOME_BERNADETTE_CUTOUT_KEY,
  HOME_LADY_CUTOUT_KEY,
  HOME_CUTOUT_SOURCE_RECT,
} from '../assets/home/homeBackground';
import { HOME_PALETTE } from '../pixelart/homePalette';
import { HOME_FX_KEYS } from '../pixelart/homeEffects';
import { UI_KEYS, UI_HOME_BUTTON_SLICE } from '../pixelart/ui';
import { createButton } from '../ui/Button';
import { textStyle } from '../ui/text';

/** Candle positions in the *original* (1672x941) artwork — see toGameXY(). */
const CANDLE_SOURCE_POINTS: Array<{ x: number; y: number }> = [
  { x: 870, y: 672 },
  { x: 1040, y: 600 },
  { x: 1080, y: 605 },
];

/** The Lady's halo center in the original artwork, for the soft light-ray layer. */
const LADY_LIGHT_SOURCE_POINT = { x: 1152, y: 300 };

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

  constructor() {
    super(SCENE_KEYS.HOME);
  }

  create(): void {
    this.buildBackground();
    this.buildLadyLight();
    this.buildBreathingFigures();
    this.buildCandleLight();
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
      panelAlpha: 0.2,
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
    this.advanceDrift(this.leaves, dt, true);
    this.advanceDrift(this.motes, dt, false);
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
   * Bernadette and the Lady are baked into the flat background image. Their cutouts (see
   * assets/home/homeBackground.ts) are laid exactly back over their original position/scale —
   * invisible when still — and given a barely-there breathing tween. Anchored at the
   * bottom-center of each cutout (their base on the ground) so it's the upper body that
   * rises/falls, not the whole figure floating; that also keeps the one point that must align
   * pixel-perfectly with the static background — where they meet the ground — fixed at all times.
   */
  private buildBreathingFigures(): void {
    const bRect = HOME_CUTOUT_SOURCE_RECT.bernadette;
    const bBase = this.toGameXY(bRect.x + bRect.width / 2, bRect.y + bRect.height);
    const bernadette = this.add.image(bBase.x, bBase.y, HOME_BERNADETTE_CUTOUT_KEY);
    bernadette.setOrigin(0.5, 1);
    bernadette.setScale(this.bgScale);
    bernadette.setDepth(2);
    this.tweens.add({
      targets: bernadette,
      scaleY: this.bgScale * 1.012,
      duration: 2100,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const lRect = HOME_CUTOUT_SOURCE_RECT.lady;
    const lBase = this.toGameXY(lRect.x + lRect.width / 2, lRect.y + lRect.height);
    const lady = this.add.image(lBase.x, lBase.y, HOME_LADY_CUTOUT_KEY);
    lady.setOrigin(0.5, 1);
    lady.setScale(this.bgScale);
    lady.setDepth(2);
    this.tweens.add({
      // The Lady should feel almost statuesque — a small fraction of Bernadette's movement.
      targets: lady,
      scaleY: this.bgScale * 1.003,
      duration: 3400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
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
