import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import { MISSIONS, getMission, getMissionState, type MissionState } from '../data/missions/missionRegistry';
import { JOURNEY_ICON_KEYS } from '../pixelart/journeyIcons';
import { UI_KEYS } from '../pixelart/ui';
import { Toast } from '../gameplay/Toast';
import { textStyle, INK } from '../ui/text';

const NODE_COUNT = MISSIONS.length;
const NODE_SPACING_Y = 52;
const TOP_MARGIN = 60;
const BOTTOM_MARGIN = 60;
const WAVE_AMPLITUDE = 92;

interface NodeVisual {
  x: number;
  y: number;
  medallion: Phaser.GameObjects.Image;
  badge: Phaser.GameObjects.Image | null;
  numberText: Phaser.GameObjects.Text;
}

/** The 18-apparition journey: a winding pixel-art path players scroll through to pick a mission. */
export class ApparitionJourneyScene extends Phaser.Scene {
  private toast!: Toast;
  private worldHeight = 0;
  private scrollTarget = 0;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private keyUp!: Phaser.Input.Keyboard.Key;
  private keyDown!: Phaser.Input.Keyboard.Key;
  private dragStartY: number | null = null;
  private dragStartScroll = 0;

  constructor() {
    super(SCENE_KEYS.JOURNEY);
  }

  create(): void {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#2c2521');

    this.worldHeight = TOP_MARGIN + BOTTOM_MARGIN + (NODE_COUNT - 1) * NODE_SPACING_Y;
    this.cameras.main.setBounds(0, 0, GAME_WIDTH, this.worldHeight);

    const nodes = this.buildPath();
    this.buildHeader();
    this.buildScrollControls();

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

  update(): void {
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
  }

  private findCurrentMissionIndex(): number {
    for (let i = 1; i <= NODE_COUNT; i++) {
      if (getMissionState(i) !== 'completed') return i;
    }
    return NODE_COUNT;
  }

  private nodePosition(index: number): { x: number; y: number } {
    // index is 1-based; node 1 sits near the bottom, node 18 near the top.
    const i = index - 1;
    const y = this.worldHeight - BOTTOM_MARGIN - i * NODE_SPACING_Y;
    const x = GAME_WIDTH / 2 + Math.sin(i * 0.85) * WAVE_AMPLITUDE;
    return { x, y };
  }

  private buildPath(): NodeVisual[] {
    const positions = MISSIONS.map((_, i) => this.nodePosition(i + 1));

    // Dotted stepping-stone trail between consecutive nodes.
    for (let i = 0; i < positions.length - 1; i++) {
      const a = positions[i];
      const b = positions[i + 1];
      const steps = 8;
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const x = Phaser.Math.Linear(a.x, b.x, t);
        const y = Phaser.Math.Linear(a.y, b.y, t);
        const dot = this.add.rectangle(x, y, 3, 3, 0x8a7a5a, 0.8);
        dot.setDepth(DEPTH.GROUND + 1);
      }
    }

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
        medallion.setTint(0x746a5c);
        medallion.setAlpha(0.65);
        badge = this.add.image(x + 7, y - 7, JOURNEY_ICON_KEYS.LOCK).setDepth(DEPTH.ACTORS + 1).setScale(0.85);
      } else if (state === 'completed') {
        medallion.setTint(0xdcefc8);
        badge = this.add.image(x + 7, y - 7, JOURNEY_ICON_KEYS.CHECK).setDepth(DEPTH.ACTORS + 1).setScale(0.9);
      } else {
        this.add.circle(x, y, 14, 0xd8c9a0, 0).setStrokeStyle(2, 0xe8cf7a, 0.9).setDepth(DEPTH.ACTORS - 1);
      }

      const numberText = this.add
        .text(x, y, String(mission.index), textStyle({ fontSize: '12px', color: state === 'locked' ? '#3a3226' : '#3a3226', fontStyle: 'bold' }))
        .setOrigin(0.5)
        .setDepth(DEPTH.ACTORS + 1);

      if (mission.dateKey) {
        const dateSide = Math.sin(i * 0.85) >= 0 ? -1 : 1;
        this.add
          .text(x + dateSide * 30, y, Localization.t(mission.dateKey), textStyle({ fontSize: '9px', color: '#c9beac' }))
          .setOrigin(dateSide > 0 ? 0 : 1, 0.5)
          .setDepth(DEPTH.ACTORS);
      }

      nodes.push({ x, y, medallion, badge, numberText });
    });

    return nodes;
  }

  private buildHeader(): void {
    const title = this.add.text(GAME_WIDTH / 2, 20, Localization.t(K.JOURNEY_TITLE), textStyle({ fontSize: '16px', color: INK.cream, fontStyle: 'bold' }));
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(DEPTH.UI);

    const backBtn = this.add.image(20, 20, UI_KEYS.CARET).setScale(1.6).setInteractive({ useHandCursor: true });
    backBtn.setAngle(-90);
    backBtn.setScrollFactor(0);
    backBtn.setDepth(DEPTH.UI);
    backBtn.on('pointerup', () => this.scene.start(SCENE_KEYS.HOME));
  }

  private buildScrollControls(): void {
    const upBtn = this.add.image(GAME_WIDTH - 20, 40, UI_KEYS.CARET).setScale(1.6).setInteractive({ useHandCursor: true });
    upBtn.setScrollFactor(0);
    upBtn.setDepth(DEPTH.UI);
    upBtn.on('pointerdown', () => {
      this.scrollTarget = Phaser.Math.Clamp(this.cameras.main.scrollY - 90, 0, Math.max(0, this.worldHeight - GAME_HEIGHT));
      this.cameras.main.scrollY = this.scrollTarget;
    });

    const downBtn = this.add.image(GAME_WIDTH - 20, GAME_HEIGHT - 20, UI_KEYS.CARET).setScale(1.6).setFlipY(true).setInteractive({ useHandCursor: true });
    downBtn.setScrollFactor(0);
    downBtn.setDepth(DEPTH.UI);
    downBtn.on('pointerdown', () => {
      this.scrollTarget = Phaser.Math.Clamp(this.cameras.main.scrollY + 90, 0, Math.max(0, this.worldHeight - GAME_HEIGHT));
      this.cameras.main.scrollY = this.scrollTarget;
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
