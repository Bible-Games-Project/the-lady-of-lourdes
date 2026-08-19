import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../core/constants';
import { REAL_ART_KEYS, preloadRealArt } from '../assets/realArt';
import { textStyle } from '../ui/text';

/**
 * A sandbox for evaluating the new "real illustrated art" direction, isolated from every
 * production scene. Reached only via `?visualtest` in the URL (see main.ts) — normal gameplay
 * never touches this file. Do not wire this into the real scene flow until the direction is
 * approved; see AGENTS.md.
 *
 * Only Bernadette, her dialogue portrait, and the Lady use real art (the maintainer's own
 * reference images, unmodified). Everything else the world will eventually need — Jeanne, the
 * sister, trees, grass, path, rocks, river, a house, the grotto shell — has no matching art yet,
 * so it is drawn as a plain, unmistakably-placeholder gray box with a label. That is deliberate:
 * do not "improve" these into coded pixel/vector approximations, that is the exact look this
 * pass is moving away from. Replace a box only when real art for that piece exists.
 */

const GROUND_COLOR = 0xc7c2b4; // neutral, not "grass" — a blockout tone, not art
const PLACEHOLDER_FILL = 0xffffff;
const PLACEHOLDER_FILL_ALPHA = 0.12;
const PLACEHOLDER_STROKE = 0x777268;

const PLAYER_SPEED = 60;
const BERNADETTE_DISPLAY_HEIGHT = 46;

interface PlaceholderSpec {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
}

const PLACEHOLDERS: PlaceholderSpec[] = [
  { x: 40, y: 40, w: 20, h: 26, label: 'Tree' },
  { x: 90, y: 30, w: 20, h: 26, label: 'Tree' },
  { x: 250, y: 34, w: 18, h: 22, label: 'Tree' },
  { x: 150, y: 60, w: 22, h: 14, label: 'Rock' },
  { x: 60, y: 150, w: 56, h: 42, label: 'House' },
  { x: 330, y: 150, w: 26, h: 26, label: 'Jeanne' },
  { x: 300, y: 180, w: 22, h: 22, label: 'Sister' },
];

// A wide band standing in for the river, and a rounded shell standing in for the grotto rock —
// both plain placeholders, not attempts at the final look.
const RIVER = { x: 200, y: 0, w: 56, h: GAME_HEIGHT, label: 'River' };
const GROTTO = { x: 300, y: 40, w: 130, h: 110, label: 'Grotto (rock shell)' };
const PATH_STRIP = { x: 130, y: 0, w: 40, h: GAME_HEIGHT };

export class VisualTestScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private playerShadow!: Phaser.GameObjects.Ellipse;
  private lady!: Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keyE!: Phaser.Input.Keyboard.Key;
  private keyEnter!: Phaser.Input.Keyboard.Key;
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private facing: 'left' | 'right' = 'right';
  private dialogueGroup: Phaser.GameObjects.GameObject[] = [];
  private dialogueOpen = false;

  constructor() {
    super('VisualTestScene');
  }

  preload(): void {
    preloadRealArt(this);
  }

  create(): void {
    this.cameras.main.setBackgroundColor(GROUND_COLOR);

    // The game runs with `pixelArt: true` (nearest-neighbor filtering everywhere, correct for
    // the procedural pixel-grid textures). These illustrated images are anti-aliased/soft by
    // design — force linear filtering on them specifically so they scale smoothly instead of
    // going jagged.
    [REAL_ART_KEYS.BERNADETTE_FULL, REAL_ART_KEYS.BERNADETTE_FACE, REAL_ART_KEYS.LADY_OF_LOURDES].forEach((key) => {
      this.textures.get(key).setFilter(Phaser.Textures.FilterMode.LINEAR);
    });

    this.add
      .text(GAME_WIDTH / 2, 8, 'VISUAL DIRECTION TEST — gray boxes are placeholders, not final art', textStyle({ fontSize: '8px', color: '#4a453c' }))
      .setOrigin(0.5, 0)
      .setDepth(DEPTH.UI);

    // Path + river blockout bands (flat, unstyled).
    this.add.rectangle(PATH_STRIP.x + PATH_STRIP.w / 2, PATH_STRIP.y + PATH_STRIP.h / 2, PATH_STRIP.w, PATH_STRIP.h, 0xb9ab8e, 0.6).setDepth(DEPTH.GROUND);
    this.add.rectangle(RIVER.x + RIVER.w / 2, RIVER.y + RIVER.h / 2, RIVER.w, RIVER.h, 0x8fa8c2, 0.6).setDepth(DEPTH.GROUND);
    this.labelPlaceholder(RIVER.x + RIVER.w / 2, RIVER.y + 10, RIVER.label);

    // Grotto shell placeholder, with the Lady's real image standing in the niche.
    this.drawPlaceholderBox(GROTTO.x, GROTTO.y, GROTTO.w, GROTTO.h, GROTTO.label);

    this.lady = this.add.image(GROTTO.x + GROTTO.w * 0.62, GROTTO.y + GROTTO.h * 0.58, REAL_ART_KEYS.LADY_OF_LOURDES);
    this.lady.setOrigin(0.5, 1);
    const ladyScale = 40 / this.lady.height;
    this.lady.setScale(ladyScale);
    this.lady.setDepth(DEPTH.ACTORS);

    PLACEHOLDERS.forEach((p) => this.drawPlaceholderBox(p.x, p.y, p.w, p.h, p.label));

    // Bernadette — the real reference image, used as-is. Origin at her feet so depth/shadow
    // placement behaves like every other actor in the game.
    this.player = this.add.image(GAME_WIDTH / 2, GAME_HEIGHT - 60, REAL_ART_KEYS.BERNADETTE_FULL);
    this.player.setOrigin(0.5, 1);
    const scale = BERNADETTE_DISPLAY_HEIGHT / this.player.height;
    this.player.setScale(scale);
    this.player.setDepth(DEPTH.ACTORS);

    this.playerShadow = this.add.ellipse(this.player.x, this.player.y, BERNADETTE_DISPLAY_HEIGHT * 0.5, BERNADETTE_DISPLAY_HEIGHT * 0.16, 0x000000, 0.25);
    this.playerShadow.setDepth(DEPTH.ACTORS - 0.001);

    this.tweens.add({
      targets: this.player,
      scaleY: scale * 1.02,
      duration: 1400,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const keyboard = this.input.keyboard!;
    this.cursors = keyboard.createCursorKeys();
    this.keyE = keyboard.addKey('E');
    this.keyEnter = keyboard.addKey('ENTER');
    this.keyEsc = keyboard.addKey('ESC');

    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 10, 'Arrows/WASD to move · E near Bernadette to preview her dialogue portrait', textStyle({ fontSize: '7px', color: '#4a453c' }))
      .setOrigin(0.5, 1)
      .setDepth(DEPTH.UI);
  }

  update(): void {
    if (this.dialogueOpen) {
      if (Phaser.Input.Keyboard.JustDown(this.keyE) || Phaser.Input.Keyboard.JustDown(this.keyEnter) || Phaser.Input.Keyboard.JustDown(this.keyEsc)) {
        this.closeDialogue();
      }
      return;
    }

    let vx = 0;
    let vy = 0;
    if (this.cursors.left.isDown) vx = -1;
    else if (this.cursors.right.isDown) vx = 1;
    if (this.cursors.up.isDown) vy = -1;
    else if (this.cursors.down.isDown) vy = 1;

    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy) || 1;
      this.player.x += (vx / len) * PLAYER_SPEED * (1 / 60);
      this.player.y += (vy / len) * PLAYER_SPEED * (1 / 60);
      this.player.x = Phaser.Math.Clamp(this.player.x, 20, GAME_WIDTH - 20);
      this.player.y = Phaser.Math.Clamp(this.player.y, 40, GAME_HEIGHT - 20);
      if (vx < 0) this.facing = 'left';
      else if (vx > 0) this.facing = 'right';
      this.player.setFlipX(this.facing === 'left');
    }

    this.playerShadow.setPosition(this.player.x, this.player.y);

    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.openDialogue();
    }
  }

  private drawPlaceholderBox(x: number, y: number, w: number, h: number, label: string): void {
    const rect = this.add.rectangle(x + w / 2, y + h / 2, w, h, PLACEHOLDER_FILL, PLACEHOLDER_FILL_ALPHA);
    rect.setStrokeStyle(1, PLACEHOLDER_STROKE, 0.9);
    rect.setDepth(DEPTH.PROPS);
    this.labelPlaceholder(x + w / 2, y + h / 2, label);
  }

  private labelPlaceholder(x: number, y: number, label: string): void {
    this.add
      .text(x, y, label, textStyle({ fontSize: '6px', color: '#4a453c', align: 'center' }))
      .setOrigin(0.5)
      .setDepth(DEPTH.PROPS + 0.001);
  }

  private openDialogue(): void {
    this.dialogueOpen = true;

    const boxH = 70;
    const boxY = GAME_HEIGHT - boxH;
    const panel = this.add.rectangle(GAME_WIDTH / 2, boxY + boxH / 2, GAME_WIDTH - 8, boxH, 0x1a1610, 0.92);
    panel.setStrokeStyle(1, 0xd8c9a0, 0.6);
    panel.setDepth(DEPTH.DIALOGUE);
    panel.setScrollFactor(0);

    const portrait = this.add.image(30, boxY + boxH / 2, REAL_ART_KEYS.BERNADETTE_FACE);
    portrait.setScale(56 / portrait.height);
    portrait.setDepth(DEPTH.DIALOGUE + 0.001);
    portrait.setScrollFactor(0);

    const name = this.add
      .text(62, boxY + 10, 'Bernadette', textStyle({ fontSize: '9px', color: '#d8c9a0' }))
      .setDepth(DEPTH.DIALOGUE + 0.001)
      .setScrollFactor(0);

    const line = this.add
      .text(62, boxY + 26, 'This is her supplied face image, used directly as the dialogue portrait — no redrawing.', {
        ...textStyle({ fontSize: '9px', color: '#fffaf0' }),
        wordWrap: { width: GAME_WIDTH - 90 },
      })
      .setDepth(DEPTH.DIALOGUE + 0.001)
      .setScrollFactor(0);

    this.dialogueGroup = [panel, portrait, name, line];
  }

  private closeDialogue(): void {
    this.dialogueGroup.forEach((obj) => obj.destroy());
    this.dialogueGroup = [];
    this.dialogueOpen = false;
  }
}
