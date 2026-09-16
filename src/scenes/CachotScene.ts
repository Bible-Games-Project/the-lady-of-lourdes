import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, DEPTH } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import {
  CACHOT_ROOM_KEY,
  CACHOT_FRONT_WALL_KEY,
  CACHOT_ROOM_WIDTH,
  CACHOT_ROOM_HEIGHT,
  CACHOT_FRONT_WALL_HEIGHT,
  CACHOT_FRONT_WALL_LOCAL_Y,
} from '../assets/interiors/lourdesCachotInterior';
import { Player } from '../gameplay/Player';
import { NpcActor } from '../gameplay/NpcActor';
import { MOTHER_FRAME_HEIGHT } from '../assets/npc/motherSprite';
import { TouchControls } from '../gameplay/TouchControls';
import { DialogueBox } from '../gameplay/DialogueBox';
import { TasksPanel } from '../gameplay/TasksPanel';
import { GameplayTopBar } from '../gameplay/GameplayTopBar';
import { InteractionPrompt } from '../gameplay/InteractionPrompt';
import { MissionManager } from '../gameplay/MissionManager';
import { mission01, mission01Dialogue } from '../data/missions/mission01';
import { createBlocker, depthForY, isNear } from '../gameplay/utils';
import { fadeToScene } from '../gameplay/transitions';
import { textStyle } from '../ui/text';
import { useLetterboxScale } from '../core/scaleMode';

const INTERACT_RADIUS = 26;

// The shared NPC ground shadow (`SHADOW_KEY`) is sized for the ~28px-tall procedural character
// grid (`personTemplate.ts`) every other `NpcActor` still uses. The mother's real-art frames are
// MOTHER_FRAME_HEIGHT (42px, full adult scale, same as Bernadette) tall -- scale her shadow by the
// same ratio so it keeps the same size-to-character relationship the baseline characters have.
const MOTHER_SHADOW_SCALE = MOTHER_FRAME_HEIGHT / 28;

// Where the room backdrop sits on the 480x270 logical canvas. Centered horizontally; a modest top
// margin leaves room for the narration caption above the room (see buildNarration() below).
const ROOM_OFFSET_X = Math.round((GAME_WIDTH - CACHOT_ROOM_WIDTH) / 2);
const ROOM_OFFSET_Y = 22;

/**
 * A collision/interaction rectangle measured against the room backdrop's own *native* pixel
 * coordinates (the pre-crop source, 1071x871 -- see `lourdesCachotInterior.ts`), stored here as
 * fractions of that native size so the numbers read directly off a grid-overlay crop of the
 * source art rather than needing to be pre-multiplied by hand. `toWorldRect()` below converts a
 * fraction rect to actual world pixels using the room's own *displayed* size/position, so this
 * stays correct if the display size is ever retuned.
 */
interface FracRect {
  xFrac: number;
  yFrac: number;
  wFrac: number;
  hFrac: number;
}

const NATIVE_W = 1071;
const NATIVE_H = 871;

function frac(x0: number, y0: number, x1: number, y1: number): FracRect {
  return { xFrac: x0 / NATIVE_W, yFrac: y0 / NATIVE_H, wFrac: (x1 - x0) / NATIVE_W, hFrac: (y1 - y0) / NATIVE_H };
}

/**
 * Every solid piece of furniture in the room, measured by eye against a grid-overlay crop of the
 * source art (same technique used throughout this codebase's real-art asset work -- see
 * AGENTS.md). Each becomes its own small `createBlocker()` zone rather than one room-sized box, so
 * Bernadette can walk freely through the open floor and is only actually stopped by the objects
 * themselves -- "reasonably follow the position and shape... without unnecessarily large blocked
 * areas," per the maintainer's own brief.
 */
const FURNITURE_FOOTPRINTS: FracRect[] = [
  frac(355, 225, 480, 330), // hearth/fireplace base
  frac(220, 220, 330, 300), // dresser
  frac(510, 195, 620, 295), // chest
  frac(715, 225, 905, 380), // bed
  frac(655, 295, 710, 345), // small stool, left of bed
  frac(838, 355, 905, 425), // stool/nightstand, foot of bed
  frac(378, 350, 508, 545), // dining table + both chairs (one merged cluster)
  frac(150, 325, 225, 450), // bench/bedroll under the left window
  frac(60, 495, 165, 590), // barrel
  frac(168, 535, 222, 590), // bucket
  frac(670, 495, 705, 650), // wood support pillar
  frac(735, 565, 795, 625), // stool near the pillar
  frac(765, 430, 955, 530), // stairs/railing structure
  frac(865, 465, 960, 560), // spinning wheel
  frac(862, 565, 955, 650), // basket of towels
];

/** The room's four walls -- back, left, right, and the front (with a gap left open for the door;
 * see FRONT_WALL_GAP_X below and buildFrontWallBand()). Each wall is one or two rectangles
 * following its own footprint rather than a single room-perimeter box, since (like the buildings
 * in OverworldScene.ts) the tall angled roof/upper wall above these bands should remain
 * walk-behind-only, not solid. */
const WALL_FOOTPRINTS: FracRect[] = [
  frac(175, 50, 935, 172), // back wall (behind hearth/dresser/chest/bed)
  frac(0, 50, 215, 310), // left wall, upper diagonal
  frac(0, 300, 65, 655), // left wall, lower vertical
  frac(860, 50, 1071, 310), // right wall, upper diagonal
  frac(1000, 300, 1071, 655), // right wall, lower vertical
];

// The front wall's door gap (native x 420-580) is left out of the solid colliders below so
// Bernadette can walk through it to exit -- see FRONT_WALL_GAP_X and buildFrontWallBand().
const FRONT_WALL_LEFT: FracRect = frac(0, 598, 420, 660);
const FRONT_WALL_RIGHT: FracRect = frac(580, 598, 1071, 660);

/** The exit trigger -- walking into this band (with the mother already spoken to) leaves for the
 * Overworld, same as the door zone the old procedural room used. */
const DOOR_ZONE = frac(420, 590, 580, 630);

const PLAYER_SPAWN = frac(490, 550, 510, 570); // just inside the door, facing into the room
const MOTHER_SPAWN = frac(590, 410, 610, 430); // open floor between the chest and the bed

function fracCenter(r: FracRect): { x: number; y: number } {
  return { x: ROOM_OFFSET_X + (r.xFrac + r.wFrac / 2) * CACHOT_ROOM_WIDTH, y: ROOM_OFFSET_Y + (r.yFrac + r.hFrac / 2) * CACHOT_ROOM_HEIGHT };
}

export class CachotScene extends Phaser.Scene {
  private player!: Player;
  private touch!: TouchControls;
  private dialogueBox!: DialogueBox;
  private tasksPanel!: TasksPanel;
  private topBar!: GameplayTopBar;
  private interactionPrompt!: InteractionPrompt;
  private mother!: NpcActor;
  private motherTalkedTo = false;
  private keyE!: Phaser.Input.Keyboard.Key;
  private doorZone!: Phaser.Geom.Rectangle;
  private colliderBodies: (Phaser.Types.Physics.Arcade.ImageWithStaticBody | Phaser.GameObjects.Zone)[] = [];

  constructor() {
    super(SCENE_KEYS.CACHOT);
  }

  create(): void {
    useLetterboxScale(this);
    MissionManager.startMission(mission01);
    this.motherTalkedTo = false;
    this.colliderBodies = [];
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#15110e');

    this.buildRoom();
    this.buildNarration();

    this.touch = new TouchControls(this);
    const spawn = fracCenter(PLAYER_SPAWN);
    this.player = new Player(this, spawn.x, spawn.y, this.touch);
    this.player.setDepth(depthForY(this.player.y, DEPTH.ACTORS));

    const motherPos = fracCenter(MOTHER_SPAWN);
    this.mother = new NpcActor(this, motherPos.x, motherPos.y, 'mother', 'down', MOTHER_SHADOW_SCALE);

    this.physics.add.collider(this.player, this.colliderBodies);
    // General character-vs-character collision: feet-only bodies (see NpcActor's own doc comment
    // on FEET_*_FRAC), player against every NPC and every NPC against every other NPC. Only one
    // NPC exists in this room today, so the NPC-vs-NPC pair is a no-op, but wiring it the same way
    // OverworldScene.ts does means a future second NPC in this room gets it for free. A plain
    // array, not `physics.add.group()` -- see OverworldScene.ts's own comment on why: a Group
    // silently resets each member's `immovable` flag back to false.
    const npcs = [this.mother];
    this.physics.add.collider(this.player, npcs);
    this.physics.add.collider(npcs, npcs);

    this.buildFrontWallBand();

    this.dialogueBox = new DialogueBox(this);
    this.tasksPanel = new TasksPanel(this);
    this.topBar = new GameplayTopBar(this);
    this.interactionPrompt = new InteractionPrompt(this);

    this.keyE = this.input.keyboard!.addKey('E');
    this.touch.onInteract = () => this.tryInteract();

    const doorRect = DOOR_ZONE;
    this.doorZone = new Phaser.Geom.Rectangle(
      ROOM_OFFSET_X + doorRect.xFrac * CACHOT_ROOM_WIDTH,
      ROOM_OFFSET_Y + doorRect.yFrac * CACHOT_ROOM_HEIGHT,
      doorRect.wFrac * CACHOT_ROOM_WIDTH,
      doorRect.hFrac * CACHOT_ROOM_HEIGHT,
    );
  }

  /** The maintainer's own room artwork, used as the permanent backdrop, plus invisible colliders
   * matching its actual furniture/walls -- see the FURNITURE_FOOTPRINTS/WALL_FOOTPRINTS doc
   * comments above for the full reasoning. */
  private buildRoom(): void {
    this.add.image(ROOM_OFFSET_X, ROOM_OFFSET_Y, CACHOT_ROOM_KEY).setOrigin(0, 0).setDepth(DEPTH.GROUND);

    [...FURNITURE_FOOTPRINTS, ...WALL_FOOTPRINTS, FRONT_WALL_LEFT, FRONT_WALL_RIGHT].forEach((r) => {
      const cx = ROOM_OFFSET_X + (r.xFrac + r.wFrac / 2) * CACHOT_ROOM_WIDTH;
      const cy = ROOM_OFFSET_Y + (r.yFrac + r.hFrac / 2) * CACHOT_ROOM_HEIGHT;
      this.colliderBodies.push(createBlocker(this, cx, cy, r.wFrac * CACHOT_ROOM_WIDTH, r.hFrac * CACHOT_ROOM_HEIGHT));
    });
  }

  /**
   * The "walk behind the front wall" effect: a second copy of the room's own bottom strip (low
   * stone wall, door, lantern, window -- see `lourdesCachotInterior.ts`'s doc comment), pinned
   * exactly on top of where that same strip already appears in the backdrop, given ONE fixed depth
   * from its own ground line. Bernadette's own per-frame `depthForY(this.y, DEPTH.ACTORS)` (already
   * computed every frame in `Player.ts#update()`) then naturally sorts above or below it as she
   * moves -- the exact same trick `OverworldScene.ts#addFootprintBuilding()` already uses for the
   * church/presbytery, reused here rather than inventing a new occlusion system. Since the front
   * wall colliders (`FRONT_WALL_LEFT`/`RIGHT`) sit right at this same native y (598-660), she can
   * only walk a few px north of the anchor line before hitting solid wall on either side of the
   * door -- inside the door gap itself she can keep walking south, and for those few steps this
   * copy renders in front of her, reading as her passing through the low doorway.
   *
   * Anchor: native y 610 (just past the front-wall collider's own start at y 598, same margin
   * `addFootprintBuilding()` keeps between a building's footprint and its own depth line), mapped
   * into the wall crop's local display space: `(610 - 590) / 281 * CACHOT_FRONT_WALL_HEIGHT`.
   */
  private buildFrontWallBand(): void {
    const wallX = ROOM_OFFSET_X;
    const wallY = ROOM_OFFSET_Y + CACHOT_FRONT_WALL_LOCAL_Y;
    const anchorLocalY = ((610 - 590) / 281) * CACHOT_FRONT_WALL_HEIGHT;
    this.add.image(wallX, wallY, CACHOT_FRONT_WALL_KEY).setOrigin(0, 0).setDepth(depthForY(wallY + anchorLocalY, DEPTH.ACTORS));
  }

  private buildNarration(): void {
    this.add
      .text(GAME_WIDTH / 2, ROOM_OFFSET_Y - 12, Localization.t(K.NARRATION_CACHOT_INTRO), textStyle({ fontSize: '11px', color: '#c9beac' }))
      .setOrigin(0.5)
      .setDepth(DEPTH.UI);
  }

  update(time: number): void {
    const blocked = this.dialogueBox.isActive() || this.tasksPanel.isOpen() || this.topBar.isBlocking();
    this.player.setLocked(blocked);
    this.player.update(time);

    if (blocked) {
      this.interactionPrompt.hide();
      return;
    }

    const nearMother = !this.motherTalkedTo && isNear(this.player, this.mother, INTERACT_RADIUS);
    const atDoor = this.motherTalkedTo && Phaser.Geom.Rectangle.Contains(this.doorZone, this.player.x, this.player.y);

    if (nearMother) {
      this.interactionPrompt.showAt(this.mother.x, this.mother.y - 26, Localization.t(K.INTERACT_TALK));
    } else if (atDoor) {
      this.interactionPrompt.showAt(this.player.x, this.player.y - 24, Localization.t(K.INTERACT_EXIT));
    } else {
      this.interactionPrompt.hide();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.tryInteract();
    }

    if (atDoor) {
      this.exitToOverworld();
    }
  }

  private tryInteract(): void {
    if (this.dialogueBox.isActive()) return;
    if (!this.motherTalkedTo && isNear(this.player, this.mother, INTERACT_RADIUS)) {
      this.dialogueBox.start(mission01Dialogue.motherIntro, () => {
        this.motherTalkedTo = true;
        MissionManager.advanceObjective();
        this.tasksPanel.notifyNewObjective();
      });
    }
  }

  private exitToOverworld(): void {
    fadeToScene(this, SCENE_KEYS.OVERWORLD, { fromCachot: true });
  }
}
