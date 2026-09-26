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
import { createText } from '../ui/text';
import { useFullBleedScale } from '../core/scaleMode';
import { onSafeAreaChange, type SafeAreaInsets } from '../core/safeArea';

const NODE_COUNT = MISSIONS.length;
const UI_MARGIN = 20;

const hex = (h: string) => Phaser.Display.Color.HexStringToColor(h).color;

interface NodeVisual {
  x: number;
  y: number;
  medallion: Phaser.GameObjects.Image;
  badge: Phaser.GameObjects.Image | null;
  numberText: Phaser.GameObjects.DOMElement;
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
  // Live-updated by onSafeAreaChange (see core/safeArea.ts) -- non-zero under this scene's
  // full-bleed ENVELOP scale mode whenever the device aspect ratio doesn't match 16:9. Everything
  // that positions itself against a screen edge (the header/back/scroll buttons) or clamps the
  // scroll range (so a node near the world's own top/bottom edge doesn't land in the cropped,
  // invisible strip) reads this instead of raw 0/GAME_HEIGHT.
  private insets: SafeAreaInsets = { left: 0, right: 0, top: 0, bottom: 0 };
  private title!: Phaser.GameObjects.DOMElement;
  private backBtn!: Phaser.GameObjects.Image;
  private upBtn!: Phaser.GameObjects.Image;
  private upBtnBackdrop!: Phaser.GameObjects.Arc;
  private downBtn!: Phaser.GameObjects.Image;
  private downBtnBackdrop!: Phaser.GameObjects.Arc;

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

    // Start scrolled so the current (first unlocked-but-not-completed) mission's node lands in
    // the center of the *safe* (uncropped) viewport, not the nominal GAME_HEIGHT one -- see
    // `onSafeAreaChange` below and its own doc comment on `insets`. Registered before this so
    // `this.insets` already reflects the real device the very first time this runs.
    onSafeAreaChange(this, (insets) => {
      this.insets = insets;
      this.layoutSafeAreaUI();
      this.updateCameraBounds();
      this.scrollTarget = this.clampScroll(this.scrollTarget);
      this.cameras.main.scrollY = this.scrollTarget;
    });

    const currentIndex = this.findCurrentMissionIndex();
    const node = nodes[currentIndex - 1];
    const safeCenter = this.insets.top + (GAME_HEIGHT - this.insets.top - this.insets.bottom) / 2;
    this.scrollTarget = this.clampScroll(node.y - safeCenter);
    this.cameras.main.scrollY = this.scrollTarget;

    this.keyEsc = this.input.keyboard!.addKey('ESC');
    this.keyUp = this.input.keyboard!.addKey('UP');
    this.keyDown = this.input.keyboard!.addKey('DOWN');

    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (p.y > this.insets.top + 40) {
        this.dragStartY = p.y;
        this.dragStartScroll = this.cameras.main.scrollY;
      }
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (this.dragStartY === null || !p.isDown) return;
      const dy = p.y - this.dragStartY;
      this.scrollTarget = this.clampScroll(this.dragStartScroll - dy);
      this.cameras.main.scrollY = this.scrollTarget;
    });
    this.input.on('pointerup', () => {
      this.dragStartY = null;
    });
    // Phaser's own 'wheel' event signature is (pointer, currentlyOver, deltaX, deltaY, deltaZ) --
    // 5 params, not 3. The previous handler here only declared `(_p, _dx, dy)`, which meant its
    // "dy" was actually bound to Phaser's *deltaX* (horizontal wheel delta), not deltaY. A normal
    // vertical mouse wheel reports deltaX ~0, so the scroll math below was computing
    // `scrollY + 0 * 0.5` on every tick -- silently a no-op almost all the time, which is exactly
    // the "sometimes it is difficult to scroll" symptom (a trackpad's incidental horizontal jitter
    // during a vertical swipe was the only thing that ever nudged it). Reading the real deltaY
    // (5th positional param) fixes this at the source, rather than papering over it with an
    // arbitrary multiplier or offset.
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _currentlyOver: unknown, _deltaX: number, deltaY: number) => {
      this.scrollTarget = this.clampScroll(this.cameras.main.scrollY + deltaY * 0.5);
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
      this.cameras.main.scrollY = this.clampScroll(this.cameras.main.scrollY - step);
    } else if (this.keyDown.isDown) {
      this.cameras.main.scrollY = this.clampScroll(this.cameras.main.scrollY + step);
    }
    this.elapsedMs += delta;
    this.advanceLeaves(delta / 1000);
  }

  /**
   * The valid scroll range, widened on each end by however much the *current* safe area crops
   * off that edge. Under plain `FIT` (or a perfectly 16:9 device) `insets` are all `0` and this is
   * exactly the original `[0, worldHeight - GAME_HEIGHT]` range. Under `ENVELOP` on a mismatched
   * aspect ratio, scrolling into the extra `insets.top`/`insets.bottom` margin only ever reveals
   * the *cropped-off, invisible* strip beyond the safe viewport -- never anything the player can
   * actually see -- so it's free real estate that lets a node sitting close to the world's own
   * top/bottom edge (apparition 1 sits only ~19px above `worldHeight`, see journeyRoute.ts) still
   * be scrolled into the safe, visible portion of the screen instead of being permanently stuck
   * just past it. This is the fix for "the first apparition circle is outside the visible area."
   *
   * This range is only ever *reachable* if `updateCameraBounds()` has widened `camera.setBounds()`
   * to match -- Phaser's own `Camera#preRender()` re-clamps `scrollY` to the camera's bounds on
   * every single frame regardless of how `scrollY` was last set (confirmed against Phaser's own
   * source, not assumed), so extending this clamp alone, without also extending the bounds
   * `useBounds` actually checks against, would have this value silently overridden back to the
   * narrower range one frame later.
   */
  private clampScroll(y: number): number {
    const min = -this.insets.top;
    const max = Math.max(min, this.worldHeight - GAME_HEIGHT + this.insets.bottom);
    return Phaser.Math.Clamp(y, min, max);
  }

  /** Widens the camera's own scrollable bounds to match `clampScroll()`'s range -- see that
   * method's doc comment for why both are required together.
   *
   * Also anchors the camera horizontally so the map's own *left* edge (world x = 0, where the
   * route begins and apparitions 1/2/3 sit -- see `buildPath()`'s doc comment) is always the
   * left-most thing visible, instead of the plain, un-shifted `scrollX = 0` every other scene
   * uses. The map's world width is scaled to exactly `GAME_WIDTH` (`buildBackground()`), so under
   * plain `FIT` (or a 16:9 device) the camera's own `GAME_WIDTH`-wide view already shows the whole
   * map edge-to-edge and this is a no-op (`insets.left` is `0`). Under `ENVELOP` on a
   * narrower-than-16:9 device, though, `insets.left`/`insets.right` crop *symmetric* strips off
   * both edges of that same view -- with the camera un-shifted, that crop eats into the map's own
   * left edge exactly as much as its right, silently pushing node 1 (and often 2/3) into the
   * cropped-off, invisible strip with no way to scroll back to it (unlike the vertical direction,
   * which already has up/down scroll for exactly this reason). Shifting `scrollX` left by
   * `insets.left` moves the *visible* window to start at world x = 0 instead of x = insets.left,
   * so the left edge is never cropped -- the map's own right edge absorbs the *entire* crop
   * instead of splitting it, which is the explicitly correct trade-off here (the beginning of the
   * journey is the priority; the right edge extending off-screen on a narrow device is
   * acceptable). `setBounds()`'s left edge must widen to match, or `Camera#preRender()`'s own
   * per-frame bounds-clamp (see `clampScroll()`'s doc comment for why this isn't just assumed)
   * would silently snap `scrollX` straight back to 0.
   */
  private updateCameraBounds(): void {
    this.cameras.main.setBounds(-this.insets.left, -this.insets.top, GAME_WIDTH + this.insets.left, this.worldHeight + this.insets.top + this.insets.bottom);
    this.cameras.main.scrollX = -this.insets.left;
  }

  /** Repositions every screen-pinned element against the *visible* screen edges -- see `insets`'s
   * own doc comment. Same pattern as `HomeScene.ts`'s own `onSafeAreaChange` block. */
  private layoutSafeAreaUI(): void {
    const i = this.insets;
    this.title.setPosition(GAME_WIDTH / 2, i.top + UI_MARGIN);
    this.backBtn.setPosition(i.left + UI_MARGIN, i.top + UI_MARGIN);
    this.upBtn.setPosition(GAME_WIDTH - i.right - UI_MARGIN, i.top + 2 * UI_MARGIN);
    this.upBtnBackdrop.setPosition(GAME_WIDTH - i.right - UI_MARGIN, i.top + 2 * UI_MARGIN);
    this.downBtn.setPosition(GAME_WIDTH - i.right - UI_MARGIN, GAME_HEIGHT - i.bottom - UI_MARGIN);
    this.downBtnBackdrop.setPosition(GAME_WIDTH - i.right - UI_MARGIN, GAME_HEIGHT - i.bottom - UI_MARGIN);
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

      const numberText = createText(this, x, y, String(mission.index), {
        fontSize: '12px',
        color: JOURNEY_PALETTE.cream,
        fontStyle: 'bold',
        stroke: JOURNEY_PALETTE.ink,
        strokeThickness: 3,
      })
        .setOrigin(0.5)
        .setDepth(DEPTH.ACTORS + 1);

      if (mission.dateKey) {
        const dateSide = x < GAME_WIDTH / 2 ? 1 : -1;
        createText(this, x + dateSide * 20, y, Localization.t(mission.dateKey), {
          fontSize: '9px',
          color: JOURNEY_PALETTE.cream,
          stroke: JOURNEY_PALETTE.ink,
          strokeThickness: 2,
        })
          .setOrigin(dateSide > 0 ? 0 : 1, 0.5)
          .setDepth(DEPTH.ACTORS);
      }

      nodes.push({ x, y, medallion, badge, numberText });
    });

    return nodes;
  }

  /** Every screen-pinned element here is created at a placeholder (0, 0) position — `create()`
   * registers `onSafeAreaChange` right after `buildScrollControls()`, and its immediate first run
   * (see `onSafeAreaChange`'s own doc comment) calls `layoutSafeAreaUI()` before the first frame
   * ever renders, so the placeholder position is never actually visible. */
  private buildHeader(): void {
    this.title = createText(this, 0, 0, Localization.t(K.JOURNEY_TITLE), {
      fontSize: '16px',
      color: JOURNEY_PALETTE.cream,
      fontStyle: 'bold',
      stroke: JOURNEY_PALETTE.ink,
      strokeThickness: 3,
    });
    this.title.setOrigin(0.5);
    this.title.setScrollFactor(0);
    this.title.setDepth(DEPTH.UI);

    // A recognizable home icon (not an ambiguous rotated arrow) — always returns to Home.
    this.backBtn = this.add.image(0, 0, JOURNEY_ICON_KEYS.HOME).setScale(1.1).setInteractive({ useHandCursor: true });
    this.backBtn.setScrollFactor(0);
    this.backBtn.setDepth(DEPTH.UI);
    this.backBtn.on('pointerover', () => this.backBtn.setTint(hex(JOURNEY_PALETTE.glowGold)));
    this.backBtn.on('pointerout', () => this.backBtn.clearTint());
    this.backBtn.on('pointerup', () => this.scene.start(SCENE_KEYS.HOME));
  }

  private buildScrollControls(): void {
    // Arrow texture points up by default; flip for down. (The previous version used a
    // down-pointing chevron with no flip for "up" and a flip for "down" — backwards, which is
    // exactly the bug the maintainer reported. See journeyIcons.ts#arrowIcon().)
    this.upBtnBackdrop = this.add.circle(0, 0, 13, hex(JOURNEY_PALETTE.ink), 0.45);
    this.upBtnBackdrop.setStrokeStyle(1, hex(JOURNEY_PALETTE.cream), 0.5);
    this.upBtnBackdrop.setScrollFactor(0);
    this.upBtnBackdrop.setDepth(DEPTH.UI - 1);
    this.upBtn = this.add.image(0, 0, JOURNEY_ICON_KEYS.ARROW).setScale(1.2).setInteractive({ useHandCursor: true });
    this.upBtn.setScrollFactor(0);
    this.upBtn.setDepth(DEPTH.UI);
    this.upBtn.on('pointerdown', () => {
      this.scrollTarget = this.clampScroll(this.cameras.main.scrollY - 90);
      this.cameras.main.scrollY = this.scrollTarget;
    });

    this.downBtnBackdrop = this.add.circle(0, 0, 13, hex(JOURNEY_PALETTE.ink), 0.45);
    this.downBtnBackdrop.setStrokeStyle(1, hex(JOURNEY_PALETTE.cream), 0.5);
    this.downBtnBackdrop.setScrollFactor(0);
    this.downBtnBackdrop.setDepth(DEPTH.UI - 1);
    this.downBtn = this.add.image(0, 0, JOURNEY_ICON_KEYS.ARROW).setScale(1.2).setFlipY(true).setInteractive({ useHandCursor: true });
    this.downBtn.setScrollFactor(0);
    this.downBtn.setDepth(DEPTH.UI);
    this.downBtn.on('pointerdown', () => {
      this.scrollTarget = this.clampScroll(this.cameras.main.scrollY + 90);
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
