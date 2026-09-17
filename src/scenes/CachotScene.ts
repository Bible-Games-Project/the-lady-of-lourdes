import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, DEPTH } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import {
  CACHOT_ROOM_KEY,
  CACHOT_FRONT_WALL_KEY,
  CACHOT_CHAIR_NORTH_KEY,
  CACHOT_ROOM_WIDTH,
  CACHOT_ROOM_HEIGHT,
  CACHOT_FRONT_WALL_HEIGHT,
  CACHOT_FRONT_WALL_LOCAL_Y,
  CACHOT_CHAIR_NORTH_HEIGHT,
  CACHOT_CHAIR_NORTH_LOCAL_X,
  CACHOT_CHAIR_NORTH_LOCAL_Y,
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

/** Grows a FracRect outward by `nativePx` native pixels on every side -- the "small safety margin"
 * the maintainer asked for on solid furniture, so Bernadette reads as clearly stopped short of an
 * object rather than looking like she can stand exactly on its edge. Deliberately small (the
 * maintainer was explicit that colliders don't need to be pixel-perfect, just not flush with the
 * artwork), and applied uniformly rather than re-measuring every item by hand. */
function grow(r: FracRect, nativePx: number): FracRect {
  const dx = nativePx / NATIVE_W;
  const dy = nativePx / NATIVE_H;
  return { xFrac: r.xFrac - dx, yFrac: r.yFrac - dy, wFrac: r.wFrac + dx * 2, hFrac: r.hFrac + dy * 2 };
}

const MARGIN = 8;

/**
 * Every solid piece of furniture in the room, measured by eye against a grid-overlay crop of the
 * source art (same technique used throughout this codebase's real-art asset work -- see
 * AGENTS.md). Each becomes its own small `createBlocker()` zone rather than one room-sized box, so
 * Bernadette can walk freely through the open floor and is only actually stopped by the objects
 * themselves -- "reasonably follow the position and shape... without unnecessarily large blocked
 * areas," per the maintainer's own brief. Re-measured against the actual rendered game (not just
 * the source art) after the maintainer reported walking onto the table and the upper chair
 * blocking a walk-behind area that should have been open -- see AGENTS.md for the full account.
 */
const FURNITURE_FOOTPRINTS: FracRect[] = [
  grow(frac(355, 225, 480, 330), MARGIN), // hearth/fireplace base
  grow(frac(220, 220, 330, 300), MARGIN), // dresser
  grow(frac(500, 185, 650, 300), MARGIN), // chest (widened -- the old box undershot its right edge)
  grow(frac(715, 225, 905, 380), MARGIN), // bed
  grow(frac(655, 295, 710, 345), MARGIN), // small stool, left of bed
  grow(frac(838, 355, 905, 425), MARGIN), // stool/nightstand, foot of bed
  frac(368, 378, 518, 545), // dining table + the south (front) chair -- solid, own margin baked in
  grow(frac(150, 325, 225, 450), MARGIN), // bench/bedroll under the left window
  grow(frac(60, 495, 165, 590), MARGIN), // barrel
  grow(frac(168, 535, 222, 590), MARGIN), // bucket
  grow(frac(670, 495, 705, 650), MARGIN), // wood support pillar
  grow(frac(735, 565, 795, 625), MARGIN), // stool near the pillar
  grow(frac(765, 430, 955, 530), MARGIN), // stairs/railing structure
  grow(frac(865, 465, 960, 560), MARGIN), // spinning wheel
  grow(frac(862, 565, 955, 650), MARGIN), // basket of towels
];

/**
 * The north (upper, back) dining chair gets its own small footprint instead of being lumped into
 * the table cluster above: the maintainer specifically wants to be able to walk in the space
 * behind/above this one chair (between it and the hearth), which a big merged collider covering
 * that whole area would prevent. Deliberately snug (not `grow()`-ed) since it's paired with its
 * own walk-behind visual overlay (`buildNorthChairOverlay()`) rather than relying on margin alone
 * to avoid an "on top of the chair" look. */
const NORTH_CHAIR_FOOTPRINT: FracRect = frac(398, 325, 485, 378);

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

/** A stopper spanning the door gap itself, placed just south of DOOR_ZONE's own bottom edge (native
 * y630) rather than inside it, so it never blocks the doorway/threshold or the exit trigger. Without
 * this, the gap between FRONT_WALL_LEFT/RIGHT has no collider at all, and until the mother has been
 * spoken to (the only thing that makes DOOR_ZONE actually fire exitToOverworld()), Bernadette could
 * keep walking straight through the doorway into the unused black area outside the room's own
 * artwork -- see AGENTS.md. Once she's allowed to leave, she never reaches this: the exit fires the
 * moment she enters DOOR_ZONE, well north of this stopper. */
const DOOR_STOPPER: FracRect = frac(420, 630, 580, 665);

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
    this.buildNorthChairOverlay();

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

    [...FURNITURE_FOOTPRINTS, NORTH_CHAIR_FOOTPRINT, ...WALL_FOOTPRINTS, FRONT_WALL_LEFT, FRONT_WALL_RIGHT, DOOR_STOPPER].forEach((r) => {
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
   * church/presbytery, reused here rather than inventing a new occlusion system.
   *
   * **Anchor, 2nd pass.** The maintainer reported the occlusion reading as tied to the floor
   * instead of the wooden beam capping the low wall. Measured directly against the *rendered game*
   * (not just the source crop -- see AGENTS.md for why that matters here): the beam sits at native
   * y~613-646, and the original anchor (native y610) was already almost exactly at the beam's own
   * top edge. The real bug was the crop itself: at the old height (76 world px, cropped from native
   * y590) there were only ~5px of crop above the anchor line, so Bernadette's 42px-tall sprite
   * almost never geometrically overlapped the wall image at all while she was north of the anchor --
   * the comparison was correct but had nothing to actually hide. `lourdesCachotInterior.ts` now
   * crops from native y550 instead (see its own doc comment), giving enough headroom for a real,
   * visible chunk of her sprite to be covered once she's behind the beam, while staying south of
   * the table/chairs so it can never affect sorting anywhere else in the room.
   *
   * Anchor: native y630 (mid-beam), mapped into the *new, taller* crop's local display space.
   */
  private buildFrontWallBand(): void {
    const wallX = ROOM_OFFSET_X;
    const wallY = ROOM_OFFSET_Y + CACHOT_FRONT_WALL_LOCAL_Y;
    const cropNativeTop = 550;
    const cropNativeHeight = NATIVE_H - cropNativeTop;
    const anchorLocalY = ((630 - cropNativeTop) / cropNativeHeight) * CACHOT_FRONT_WALL_HEIGHT;
    this.add.image(wallX, wallY, CACHOT_FRONT_WALL_KEY).setOrigin(0, 0).setDepth(depthForY(wallY + anchorLocalY, DEPTH.ACTORS));
  }

  /**
   * The same walk-behind technique as `buildFrontWallBand()` above, applied to just the north
   * (upper) dining chair: a second copy of the chair (plus a little surrounding floor) pinned on
   * top of where it's already drawn in the room backdrop, Y-sorted against the player from ONE
   * fixed depth at the chair's own base. Unlike the front wall, this is a small object entirely
   * surrounded by open, walkable floor, so its collider (`NORTH_CHAIR_FOOTPRINT`) only blocks the
   * chair itself -- walking in the space between the chair and the hearth is allowed, and this
   * overlay is what makes that read correctly (chair renders in front of her there) instead of her
   * sprite simply floating on top of the chair's own pixels, since the room backdrop is one flat
   * image always behind every actor.
   */
  private buildNorthChairOverlay(): void {
    const chairX = ROOM_OFFSET_X + CACHOT_CHAIR_NORTH_LOCAL_X;
    const chairY = ROOM_OFFSET_Y + CACHOT_CHAIR_NORTH_LOCAL_Y;
    const groundLine = chairY + CACHOT_CHAIR_NORTH_HEIGHT;
    this.add.image(chairX, chairY, CACHOT_CHAIR_NORTH_KEY).setOrigin(0, 0).setDepth(depthForY(groundLine, DEPTH.ACTORS));
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
