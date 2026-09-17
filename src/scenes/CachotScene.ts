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
 * A collision/interaction rectangle, stored as a fraction of the room backdrop's own *displayed*
 * size so it stays correct if that display size is ever retuned. Two ways to build one below:
 * `nativeFrac()` for rectangles measured against the source art's own pre-crop pixel coordinates
 * (1071x871), and `worldFrac()` for rectangles measured directly against the *rendered game* (a
 * screenshot taken at camera zoom 1, scroll (0,0), where screen pixels equal world pixels 1:1).
 *
 * **Why two.** The furniture/wall/door numbers below were originally all `nativeFrac()`, measured
 * by eye off grid-overlay crops of the source art. That turned out to be unreliable for tightly
 * spaced objects: the table+chairs collider undershot the actual table width, and the front-wall
 * anchor and the fireplace/north-chair boundary were each off by enough to cause visible bugs (see
 * AGENTS.md for the full account of re-measuring each one). Every rectangle below that participates
 * in one of those bugs is now `worldFrac()`, cross-checked against a live screenshot rather than
 * the source crop; the ones that were never reported wrong (the room's own four walls, the two
 * spawn points) are left as the original `nativeFrac()` values.
 */
interface FracRect {
  xFrac: number;
  yFrac: number;
  wFrac: number;
  hFrac: number;
}

const NATIVE_W = 1071;
const NATIVE_H = 871;

function nativeFrac(x0: number, y0: number, x1: number, y1: number): FracRect {
  return { xFrac: x0 / NATIVE_W, yFrac: y0 / NATIVE_H, wFrac: (x1 - x0) / NATIVE_W, hFrac: (y1 - y0) / NATIVE_H };
}

/** `x0,y0,x1,y1` here are *world* pixels (i.e. what a ruler against a screenshot of the actual
 * running game would read), not native source pixels -- see the doc comment above. */
function worldFrac(x0: number, y0: number, x1: number, y1: number): FracRect {
  return {
    xFrac: (x0 - ROOM_OFFSET_X) / CACHOT_ROOM_WIDTH,
    yFrac: (y0 - ROOM_OFFSET_Y) / CACHOT_ROOM_HEIGHT,
    wFrac: (x1 - x0) / CACHOT_ROOM_WIDTH,
    hFrac: (y1 - y0) / CACHOT_ROOM_HEIGHT,
  };
}

/** Grows a FracRect outward by `worldPx` world pixels on every side -- the "small safety margin"
 * the maintainer asked for on solid furniture, so Bernadette reads as clearly stopped short of an
 * object rather than looking like she can stand exactly on its edge. Deliberately small (the
 * maintainer was explicit that colliders don't need to be pixel-perfect, just not flush with the
 * artwork), and applied uniformly rather than re-measuring the margin for every item by hand. */
function grow(r: FracRect, worldPx: number): FracRect {
  const dx = worldPx / CACHOT_ROOM_WIDTH;
  const dy = worldPx / CACHOT_ROOM_HEIGHT;
  return { xFrac: r.xFrac - dx, yFrac: r.yFrac - dy, wFrac: r.wFrac + dx * 2, hFrac: r.hFrac + dy * 2 };
}

const MARGIN = 2;

/**
 * Every solid piece of furniture in the room. Each becomes its own small `createBlocker()` zone
 * rather than one room-sized box, so Bernadette can walk freely through the open floor and is only
 * actually stopped by the objects themselves -- "reasonably follow the position and shape...
 * without unnecessarily large blocked areas," per the maintainer's own brief. All measured with
 * `worldFrac()` against the rendered game -- see the FracRect doc comment above for why.
 */
const FURNITURE_FOOTPRINTS: FracRect[] = [
  worldFrac(186, 40, 230, 107), // hearth/fireplace -- bottom edge deliberately NOT grown; it faces
  // the north chair below and the real gap there is only ~11 world px (see NORTH_CHAIR_FOOTPRINT)
  grow(worldFrac(147, 46, 191, 103), MARGIN), // dresser
  grow(worldFrac(223, 73, 268, 109), MARGIN), // chest
  grow(worldFrac(274, 70, 349, 140), MARGIN), // bed
  grow(worldFrac(240, 97, 265, 121), MARGIN), // small stool, left of bed
  grow(worldFrac(315, 132, 348, 163), MARGIN), // stool/nightstand, foot of bed
  grow(worldFrac(191, 126, 230, 175), MARGIN), // dining table + the south (front) chair, merged
  grow(worldFrac(124, 109, 155, 153), MARGIN), // bench/bedroll under the left window
  grow(worldFrac(90, 147, 136, 186), MARGIN), // barrel
  grow(worldFrac(129, 157, 155, 188), MARGIN), // bucket
  grow(worldFrac(265, 152, 288, 201), MARGIN), // wood support pillar
  grow(worldFrac(319, 150, 346, 173), MARGIN), // stool near the pillar
  grow(worldFrac(372, 139, 433, 168), MARGIN), // stairs/railing structure
  grow(worldFrac(326, 140, 364, 197), MARGIN), // spinning wheel
  grow(worldFrac(320, 170, 359, 201), MARGIN), // basket of towels
];

/**
 * The north (upper, back) dining chair gets its own small footprint instead of being lumped into
 * the table cluster above: the maintainer specifically wants to be able to walk in the space
 * behind/above this one chair (between it and the hearth), which a big merged collider covering
 * that whole area would prevent. There genuinely is a walkable gap there in the artwork -- the
 * fireplace's own base ends at world y~107 and the chair's back doesn't start until y~118, an
 * ~11px-tall strip that the previous (native-measured) colliders had closed off entirely because
 * both were mis-measured by enough to overlap. Deliberately snug on top (not `grow()`-ed there) to
 * keep that gap open; paired with its own walk-behind visual overlay
 * (`buildNorthChairOverlay()`) rather than relying on margin alone to avoid an "on top of the
 * chair" look. */
const NORTH_CHAIR_FOOTPRINT: FracRect = worldFrac(200, 115, 225, 131);

/** The room's four walls -- back, left, right, and the front (with a gap left open for the door;
 * see FRONT_WALL_LEFT/RIGHT below and buildFrontWallBand()). Each wall is one or two rectangles
 * following its own footprint rather than a single room-perimeter box, since (like the buildings
 * in OverworldScene.ts) the tall angled roof/upper wall above these bands should remain
 * walk-behind-only, not solid. Never reported wrong, so left as the original native-measured
 * values. */
const WALL_FOOTPRINTS: FracRect[] = [
  nativeFrac(175, 50, 935, 172), // back wall (behind hearth/dresser/chest/bed)
  nativeFrac(0, 50, 215, 310), // left wall, upper diagonal
  nativeFrac(0, 300, 65, 655), // left wall, lower vertical
  nativeFrac(860, 50, 1071, 310), // right wall, upper diagonal
  nativeFrac(1000, 300, 1071, 655), // right wall, lower vertical
];

/**
 * The front (south) wall, door, and threshold -- all `worldFrac()`, measured directly off the
 * rendered game after the maintainer reported both the wall's occlusion boundary and the door's
 * black-area leak as still wrong. The wooden beam capping this low wall (the actual visual
 * boundary Bernadette should disappear behind -- see buildFrontWallBand()) sits at world y182-196;
 * the stone wall/door frame below it runs from there down to the steps at the bottom of the room's
 * own artwork, world y~240.
 */
// Solid sides flanking the door gap (world x220-243 is the walkable opening).
const FRONT_WALL_LEFT: FracRect = worldFrac(95, 182, 220, 265);
const FRONT_WALL_RIGHT: FracRect = worldFrac(243, 182, 385, 265);

/** The exit trigger -- walking into this band (with the mother already spoken to) leaves for the
 * Overworld, same as the door zone the old procedural room used. Sits right at the doorway/steps,
 * well north of DOOR_STOPPER below. */
const DOOR_ZONE = worldFrac(220, 196, 243, 210);

/** A stopper spanning the door gap itself, placed south of the steps (world y~240) rather than
 * inside DOOR_ZONE, so it never blocks the doorway/threshold or the exit trigger. Without this, the
 * gap between FRONT_WALL_LEFT/RIGHT has no collider at all, and until the mother has been spoken to
 * (the only thing that makes DOOR_ZONE actually fire exitToOverworld()), Bernadette could keep
 * walking straight through the doorway into the unused black area outside the room's own artwork --
 * see AGENTS.md. Once she's allowed to leave, she never reaches this: the exit fires the moment she
 * enters DOOR_ZONE, well north of this stopper. */
const DOOR_STOPPER: FracRect = worldFrac(220, 240, 243, 270);

const PLAYER_SPAWN = nativeFrac(490, 550, 510, 570); // just inside the door, facing into the room
const MOTHER_SPAWN = nativeFrac(590, 410, 610, 430); // open floor between the chest and the bed

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
   * **Anchor, 3rd pass (world-pixel measured).** The first two passes both measured off the
   * *native source art* and converted through a crop-relative formula -- and both were wrong, by
   * enough to make the occlusion read as the floor covering Bernadette instead of the wooden beam
   * (see AGENTS.md). This pass abandons that conversion entirely: the anchor is now the beam's own
   * verified *world*-space bottom edge, y196 (screenshotted directly off the live-rendered game at
   * camera zoom=1/scroll=(0,0), where screenshot pixels equal world pixels exactly -- see
   * `lourdesCachotInterior.ts`'s own doc comment and FRONT_WALL_LEFT/RIGHT above, which were
   * re-measured the same way and agree: the beam spans world y182-196). No crop-height math is
   * needed any more because the anchor is expressed directly in the same world-coordinate space
   * `depthForY()` already consumes -- the crop's own local geometry is irrelevant to where the
   * *comparison* happens, only to what pixels get shown once it wins.
   */
  private buildFrontWallBand(): void {
    const wallX = ROOM_OFFSET_X;
    const wallY = ROOM_OFFSET_Y + CACHOT_FRONT_WALL_LOCAL_Y;
    const beamBottomWorldY = 196;
    this.add.image(wallX, wallY, CACHOT_FRONT_WALL_KEY).setOrigin(0, 0).setDepth(depthForY(beamBottomWorldY, DEPTH.ACTORS));
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
