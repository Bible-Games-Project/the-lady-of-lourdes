import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import { MISSIONS, getMission, getMissionState, type MissionState } from '../data/missions/missionRegistry';
import { getRouteCurvePoints, getRouteNodePoints } from '../data/journeyRoute';
import { JOURNEY_ICON_KEYS } from '../pixelart/journeyIcons';
import { JOURNEY_PALETTE } from '../pixelart/journeyPalette';
import { JOURNEY_MAP_KEY, JOURNEY_MAP_SIZE } from '../assets/journey/journeyMap';
import { HOME_FX_KEYS } from '../pixelart/homeEffects';
import { Toast } from '../gameplay/Toast';
import { textStyle } from '../ui/text';
import { useFullBleedScale } from '../core/scaleMode';

const NODE_COUNT = MISSIONS.length;

const hex = (h: string) => Phaser.Display.Color.HexStringToColor(h).color;

interface NodeVisual {
  x: number;
  y: number;
  medallion: Phaser.GameObjects.Image;
  badge: Phaser.GameObjects.Image | null;
  numberText: Phaser.GameObjects.Text;
}

interface JourneyLeaf {
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

/** The 18-apparition journey: a winding path over the maintainer's own map artwork, scrolled to pick a mission. */
export class ApparitionJourneyScene extends Phaser.Scene {
  private toast!: Toast;
  private worldScale = 1;
  private worldHeight = 0;
  private scrollTarget = 0;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private keyUp!: Phaser.Input.Keyboard.Key;
  private keyDown!: Phaser.Input.Keyboard.Key;
  private dragStartY: number | null = null;
  private dragStartScroll = 0;
  private leaves: JourneyLeaf[] = [];
  private elapsedMs = 0;

  constructor() {
    super(SCENE_KEYS.JOURNEY);
  }

  create(): void {
    useFullBleedScale(this);
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.buildBackground();
    const nodes = this.buildPath();
    this.buildHeader();
    this.buildScrollControls();
    this.buildLeaves();

    this.toast = new Toast(this);

    // Start scrolled to the current (first unlocked-but-not-completed) mission.
    const currentIndex = this.findCurrentMissionIndex();
    const node = nodes[currentIndex - 1];
    this.scrollTarget = Phaser.Math.Clamp(node.y - GAME_HEIGHT / 2, 0, Math.max(0, this.worldHeight - GAME_HEIGHT));
    this.cameras.main.scrollY = this.scrollTarget;

    this.keyEsc = this.input.keyboard!.addKey('ESC');
    this.keyUp = this.input.keyboard!.addKey('UP');
    this.keyDown = this.input.keyboard!.addKey('DOWN');

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y > 40) {
        this.dragStartY = p.y;
        this.dragStartScroll = this.cameras.main.scrollY;
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.dragStartY === null || !p.isDown) return;
      const dy = p.y - this.dragStartY;
      this.scrollTarget = Phaser.Math.Clamp(this.dragStartScroll - dy, 0, Math.max(0, this.worldHeight - GAME_HEIGHT));
      this.cameras.main.scrollY = this.scrollTarget;
    });
    this.input.on('pointerup', () => {
      this.dragStartY = null;
    });
    this.input.on('wheel', (_p: unknown, _dx: number, dy: number) => {
      this.scrollTarget = Phaser.Math.Clamp(this.cameras.main.scrollY + dy * 0.5, 0, Math.max(0, this.worldHeight - GAME_HEIGHT));
      this.cameras.main.scrollY = this.scrollTarget;
    });
  }

  update(_time: number, delta: number): void {
    if (Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
      this.scene.start(SCENE_KEYS.HOME);
      return;
    }
    const step = 6;
    if (this.keyUp.isDown) {
      this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameras.main.scrollY - step, 0, Math.max(0, this.worldHeight - GAME_HEIGHT));
    } else if (this.keyDown.isDown) {
      this.cameras.main.scrollY = Phaser.Math.Clamp(this.cameras.main.scrollY + step, 0, Math.max(0, this.worldHeight - GAME_HEIGHT));
    }
    this.elapsedMs += delta;
    this.advanceLeaves(delta / 1000);
  }

  private findCurrentMissionIndex(): number {
    for (let i = 1; i <= NODE_COUNT; i++) {
      if (getMissionState(i) !== 'completed') return i;
    }
    return NODE_COUNT;
  }

  /** Maps a pixel coordinate in the original 941x1672 map artwork to this scene's world space. */
  private toWorldXY(imgX: number, imgY: number): { x: number; y: number } {
    return { x: imgX * this.worldScale, y: imgY * this.worldScale };
  }

  /**
   * The maintainer's own map artwork, used as-is — scaled uniformly to the game's width (the
   * artwork is already portrait/vertical, meant to be scrolled top-to-bottom, so unlike Home's
   * background this needs no "cover" crop: the whole image becomes the scrollable world, and its
   * scaled height *is* the world height).
   */
  private buildBackground(): void {
    const bg = this.add.image(0, 0, JOURNEY_MAP_KEY).setOrigin(0, 0);
    this.worldScale = GAME_WIDTH / JOURNEY_MAP_SIZE.width;
    bg.setScale(this.worldScale);
    this.worldHeight = JOURNEY_MAP_SIZE.height * this.worldScale;
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, this.worldHeight);
  }

  /**
   * The route is traced against the actual map artwork (see data/journeyRoute.ts) — it follows
   * the painted trail from the bottom-left, around the lake, over both bridges, and up to the
   * Grotto, rather than a straight or sine-wave line laid arbitrarily over the art. The line
   * itself is drawn along the same dense spline the 18 node positions are sampled from, so it
   * always passes exactly through every medallion.
   */
  private buildPath(): NodeVisual[] {
    const curvePoints = getRouteCurvePoints().map((p) => this.toWorldXY(p.x, p.y));
    const line = this.add.graphics();
    line.setDepth(DEPTH.GROUND + 1);
    line.lineStyle(2, hex(JOURNEY_PALETTE.cream), 0.35);
    line.beginPath();
    line.moveTo(curvePoints[0].x, curvePoints[0].y);
    curvePoints.slice(1).forEach((p) => line.lineTo(p.x, p.y));
    line.strokePath();

    const positions = getRouteNodePoints(NODE_COUNT).map((p) => this.toWorldXY(p.x, p.y));

    const nodes: NodeVisual[] = [];
    MISSIONS.forEach((mission, i) => {
      const { x, y } = positions[i];
      const state = getMissionState(mission.index);

      const medallion = this.add.image(x, y, JOURNEY_ICON_KEYS.MEDALLION);
      medallion.setDepth(DEPTH.ACTORS);
      medallion.setInteractive({ useHandCursor: true });
      medallion.on('pointerup', () => this.onNodeTap(mission.index));

      let badge: Phaser.GameObjects.Image | null = null;
      if (state === 'locked') {
        medallion.setTint(hex(JOURNEY_PALETTE.lockedStone));
        medallion.setAlpha(0.7);
        badge = this.add.image(x + 7, y - 7, JOURNEY_ICON_KEYS.LOCK).setDepth(DEPTH.ACTORS + 1).setScale(0.85);
      } else if (state === 'completed') {
        medallion.setTint(hex(JOURNEY_PALETTE.glowGold));
        badge = this.add.image(x + 7, y - 7, JOURNEY_ICON_KEYS.CHECK).setDepth(DEPTH.ACTORS + 1).setScale(0.9);
      } else {
        // Current/unlocked-but-not-completed: a soft glowing ring, breathing gently so it draws
        // the eye without flashing — the same continuous-elapsed-time technique used on Home
        // (see HomeScene.ts), not a yoyo tween.
        const ring = this.add.circle(x, y, 14, hex(JOURNEY_PALETTE.glowGold), 0).setStrokeStyle(2, hex(JOURNEY_PALETTE.glowGold), 0.9);
        ring.setDepth(DEPTH.ACTORS - 1);
        this.tweens.add({ targets: ring, scale: 1.18, alpha: 0.4, duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      }

      const numberText = this.add
        .text(x, y, String(mission.index), textStyle({ fontSize: '12px', color: JOURNEY_PALETTE.cream, fontStyle: 'bold', stroke: JOURNEY_PALETTE.ink, strokeThickness: 3 }))
        .setOrigin(0.5)
        .setDepth(DEPTH.ACTORS + 1);

      if (mission.dateKey) {
        const dateSide = x < GAME_WIDTH / 2 ? 1 : -1;
        this.add
          .text(x + dateSide * 20, y, Localization.t(mission.dateKey), textStyle({ fontSize: '9px', color: JOURNEY_PALETTE.cream, stroke: JOURNEY_PALETTE.ink, strokeThickness: 2 }))
          .setOrigin(dateSide > 0 ? 0 : 1, 0.5)
          .setDepth(DEPTH.ACTORS);
      }

      nodes.push({ x, y, medallion, badge, numberText });
    });

    return nodes;
  }

  private buildHeader(): void {
    const title = this.add.text(
      GAME_WIDTH / 2,
      20,
      Localization.t(K.JOURNEY_TITLE),
      textStyle({ fontSize: '16px', color: JOURNEY_PALETTE.cream, fontStyle: 'bold', stroke: JOURNEY_PALETTE.ink, strokeThickness: 3 }),
    );
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(DEPTH.UI);

    // A recognizable home icon (not an ambiguous rotated arrow) — always returns to Home.
    const backBtn = this.add.image(20, 20, JOURNEY_ICON_KEYS.HOME).setScale(1.1).setInteractive({ useHandCursor: true });
    backBtn.setScrollFactor(0);
    backBtn.setDepth(DEPTH.UI);
    backBtn.on('pointerover', () => backBtn.setTint(hex(JOURNEY_PALETTE.glowGold)));
    backBtn.on('pointerout', () => backBtn.clearTint());
    backBtn.on('pointerup', () => this.scene.start(SCENE_KEYS.HOME));
  }

  private scrollButtonBackdrop(x: number, y: number): void {
    const plaque = this.add.circle(x, y, 13, hex(JOURNEY_PALETTE.ink), 0.45);
    plaque.setStrokeStyle(1, hex(JOURNEY_PALETTE.cream), 0.5);
    plaque.setScrollFactor(0);
    plaque.setDepth(DEPTH.UI - 1);
  }

  private buildScrollControls(): void {
    // Arrow texture points up by default; flip for down. (The previous version used a
    // down-pointing chevron with no flip for "up" and a flip for "down" — backwards, which is
    // exactly the bug the maintainer reported. See journeyIcons.ts#arrowIcon().)
    this.scrollButtonBackdrop(GAME_WIDTH - 20, 40);
    const upBtn = this.add.image(GAME_WIDTH - 20, 40, JOURNEY_ICON_KEYS.ARROW).setScale(1.2).setInteractive({ useHandCursor: true });
    upBtn.setScrollFactor(0);
    upBtn.setDepth(DEPTH.UI);
    upBtn.on('pointerdown', () => {
      this.scrollTarget = Phaser.Math.Clamp(this.cameras.main.scrollY - 90, 0, Math.max(0, this.worldHeight - GAME_HEIGHT));
      this.cameras.main.scrollY = this.scrollTarget;
    });

    this.scrollButtonBackdrop(GAME_WIDTH - 20, GAME_HEIGHT - 20);
    const downBtn = this.add.image(GAME_WIDTH - 20, GAME_HEIGHT - 20, JOURNEY_ICON_KEYS.ARROW).setScale(1.2).setFlipY(true).setInteractive({ useHandCursor: true });
    downBtn.setScrollFactor(0);
    downBtn.setDepth(DEPTH.UI);
    downBtn.on('pointerdown', () => {
      this.scrollTarget = Phaser.Math.Clamp(this.cameras.main.scrollY + 90, 0, Math.max(0, this.worldHeight - GAME_HEIGHT));
      this.cameras.main.scrollY = this.scrollTarget;
    });
  }

  /**
   * A handful of drifting leaves, screen-space (not tied to world scroll) so the map keeps
   * feeling alive while scrolling — same technique as Home (`HomeScene.ts#spawnDrifter()`), kept
   * intentionally small in number and low in opacity so it never competes with the route, nodes,
   * text, or buttons for attention.
   */
  private buildLeaves(): void {
    for (let i = 0; i < 4; i++) {
      this.leaves.push(this.spawnLeaf(true));
    }
  }

  private spawnLeaf(scatterOnStart: boolean): JourneyLeaf {
    const x = Phaser.Math.Between(10, GAME_WIDTH - 10);
    const y = scatterOnStart ? Phaser.Math.Between(-60, GAME_HEIGHT - 20) : Phaser.Math.Between(-60, -10);
    const texture = Phaser.Utils.Array.GetRandom(LEAF_TEXTURES);
    const sprite = this.add.image(x, y, texture);
    sprite.setScrollFactor(0);
    sprite.setDepth(DEPTH.UI - 1);
    sprite.setAlpha(Phaser.Math.FloatBetween(0.4, 0.7));
    sprite.setScale(Phaser.Math.FloatBetween(0.65, 1));
    sprite.setRotation(Phaser.Math.FloatBetween(0, Math.PI * 2));

    return {
      sprite,
      x,
      y,
      fallSpeed: Phaser.Math.FloatBetween(3, 6.5),
      windX: Phaser.Math.FloatBetween(-2, 2),
      driftAmp: Phaser.Math.FloatBetween(5, 14),
      driftFreq: Phaser.Math.FloatBetween(0.25, 0.6),
      phase: Phaser.Math.FloatBetween(0, Math.PI * 2),
      rotSpeed: Phaser.Math.FloatBetween(-0.4, 0.4),
      elapsed: Phaser.Math.FloatBetween(0, 10),
    };
  }

  private advanceLeaves(dt: number): void {
    this.leaves.forEach((leaf, i) => {
      leaf.elapsed += dt;
      leaf.x += leaf.windX * dt;
      leaf.y += leaf.fallSpeed * dt;
      leaf.x += Math.sin(leaf.elapsed * leaf.driftFreq + leaf.phase) * leaf.driftAmp * dt;
      leaf.sprite.setPosition(leaf.x, leaf.y);
      leaf.sprite.rotation += leaf.rotSpeed * dt;

      if (leaf.y > GAME_HEIGHT + 20 || leaf.x < -30 || leaf.x > GAME_WIDTH + 30) {
        this.leaves[i] = this.spawnLeaf(false);
        leaf.sprite.destroy();
      }
    });
  }

  private onNodeTap(index: number): void {
    const state: MissionState = getMissionState(index);
    if (state === 'locked') {
      this.toast.show(Localization.t(K.JOURNEY_LOCKED_NOTE));
      return;
    }
    const mission = getMission(index);
    if (!mission?.implemented) {
      this.toast.show(Localization.t(K.JOURNEY_NOT_IMPLEMENTED_NOTE));
      return;
    }
    // Only Mission 1 exists today, and it always begins inside Le Cachot.
    this.scene.start(SCENE_KEYS.CACHOT);
  }
}
