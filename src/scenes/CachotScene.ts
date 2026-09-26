import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT, DEPTH } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import { CACHOT_ROOM_KEY, CACHOT_ROOM_WIDTH, CACHOT_ROOM_HEIGHT } from '../assets/interiors/lourdesCachotInterior';
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

// Clearance above an NPC's own head (not just an arbitrary offset from her feet) before the "Talk"
// prompt's own bottom edge -- see `InteractionPrompt.ts`: its text origin is (0.5, 1), so the (x,y)
// passed in is the label's own *bottom*. The old call here used a flat `-26`, well short of Louise's
// actual MOTHER_FRAME_HEIGHT (42), so the label's bottom rendered partway down her body/face instead
// of above her head -- "the Talk box... partially covers them."
const PROMPT_CLEARANCE = 6;

// The shared NPC ground shadow (`SHADOW_KEY`) is sized for the ~28px-tall procedural character
// grid (`personTemplate.ts`) every other `NpcActor` still uses. The mother's real-art frames are
// MOTHER_FRAME_HEIGHT (42px, full adult scale, same as Bernadette) tall -- scale her shadow by the
// same ratio so it keeps the same size-to-character relationship the baseline characters have.
const MOTHER_SHADOW_SCALE = MOTHER_FRAME_HEIGHT / 28;

// Where the room backdrop sits on the 480x270 logical canvas. Centered horizontally *and*
// vertically -- the room is CACHOT_ROOM_HEIGHT (118) tall on a 270-tall canvas, so
// `(270 - 118) / 2` splits the remaining space evenly above/below it. Previously a flat `22`, which
// left only 22px above the room but 130px below it -- reported as "positioned too high... needs a
// more balanced amount of space above and below". The narration caption above the room (see
// buildNarration() below, `ROOM_OFFSET_Y - 12`) still lands comfortably below the top HUD icons at
// this larger offset.
const ROOM_OFFSET_X = Math.round((GAME_WIDTH - CACHOT_ROOM_WIDTH) / 2);
const ROOM_OFFSET_Y = Math.round((GAME_HEIGHT - CACHOT_ROOM_HEIGHT) / 2);

/**
 * A collision/interaction rectangle, stored as a fraction of the room backdrop's own *displayed*
 * size so it stays correct if that display size is ever retuned.
 *
 * Measured with `nativeFrac()` against the tight native crop of the new room art (915x1009 --
 * see `lourdesCachotInterior.ts`'s own doc comment for how that crop was derived), using a
 * grid-overlay technique (50px grid lines, close-up crops of the door/bed/table areas at 2x-2.2x
 * zoom for the fiddlier geometry) rather than guessed. All positions verified live afterward
 * (walking into every collider from a clean approach, confirming the floor/furniture depth-sorts
 * correctly, confirming the door/exit trigger) -- see AGENTS.md for the full account.
 */
interface FracRect {
  xFrac: number;
  yFrac: number;
  wFrac: number;
  hFrac: number;
}

const NATIVE_W = 915;
const NATIVE_H = 1009;

function nativeFrac(x0: number, y0: number, x1: number, y1: number): FracRect {
  return { xFrac: x0 / NATIVE_W, yFrac: y0 / NATIVE_H, wFrac: (x1 - x0) / NATIVE_W, hFrac: (y1 - y0) / NATIVE_H };
}

/** Grows a FracRect outward by `nativePx` native pixels on every side -- a small safety margin so
 * Bernadette reads as clearly stopped short of an object rather than looking like she can stand
 * exactly on its edge. Deliberately small and applied uniformly rather than re-measuring the
 * margin for every item by hand -- same convention the previous room's own colliders used. */
function grow(r: FracRect, nativePx: number): FracRect {
  const dx = nativePx / NATIVE_W;
  const dy = nativePx / NATIVE_H;
  return { xFrac: r.xFrac - dx, yFrac: r.yFrac - dy, wFrac: r.wFrac + dx * 2, hFrac: r.hFrac + dy * 2 };
}

const MARGIN = 8; // native px -- roughly the same on-screen size as the previous room's 2 world-px margin

/**
 * Every solid piece of furniture in the room. Each becomes its own small `createBlocker()` zone
 * rather than one room-sized box, so Bernadette can walk freely through the open floor and is only
 * actually stopped by the objects themselves.
 */
const FURNITURE_FOOTPRINTS: FracRect[] = [
  grow(nativeFrac(88, 213, 300, 605), MARGIN), // bed (headboard to footboard, along the left wall)
  grow(nativeFrac(128, 628, 218, 712), MARGIN), // small stool, foot of the bed
  grow(nativeFrac(72, 708, 222, 797), MARGIN), // wash-basin/towel bench, bottom-left corner
  grow(nativeFrac(598, 322, 802, 498), MARGIN), // dining table + its chair, merged (flush together,
  // same reasoning the previous room's table/chair merge used: no real walkable gap between them)
  grow(nativeFrac(688, 612, 807, 727), MARGIN), // chest, bottom-right corner
  grow(nativeFrac(628, 712, 697, 787), MARGIN), // jug beside the chest
];

/** The room's outer stone walls, each following its own footprint rather than a single
 * room-perimeter box -- the tall back wall's own upper stonework (above where it actually meets
 * the floor) is walk-behind-only in the sense that nothing needs to collide with it at all (it's
 * far above where the player's feet could ever be), so only the wall's own floor-contact band
 * needs a collider -- footprint-only collision, matching how building collision works elsewhere in
 * this game (a small collider on the solid base, not one box over the whole sprite).
 *
 * **Back wall's southern edge extended from native y218 to y256** (a real, measured re-tuning, not
 * a guessed number) -- the original y218 boundary matched the wall's own drawn floor line exactly,
 * but let Bernadette's *feet* stop close enough to the wall that her fixed-height sprite (42
 * world-px, unrelated to `CACHOT_ROOM_HEIGHT`'s own halved-last-round display size -- see
 * `CachotScene.ts`'s own doc note on this tension, also referenced in `lourdesCachotInterior.ts`)
 * still rendered with her head visibly above the room artwork's own top edge, reading as "walking
 * on/through the wall." Solved the same way `MOTHER_SPAWN` below was re-tuned, not by inventing a
 * new shape: computed exactly how far south the existing collider needs to reach so the *player's*
 * own collision-body geometry (`Player.ts`'s `body.setSize(7,11)`/`setOffset(4,30)`) stops her feet
 * at a y where her sprite's own top edge lands at/below the room's y22 top -- y256 is that solved
 * value, verified live (screenshot before/after, walking straight up from an open-floor spawn).
 * Still the same single flat band shape as before, still only covering the wall's own real
 * footprint (not a room-spanning rectangle) -- only the one boundary's own position changed. The
 * side walls' own upper-corner colliders (below) already reach y235, deep enough that this wider
 * back-wall band supersedes them in the corners too -- no separate change needed there. */
const WALL_FOOTPRINTS: FracRect[] = [
  nativeFrac(20, 15, 895, 256), // back wall (window, cross, picture, shelf all mounted on it)
  nativeFrac(15, 15, 160, 235), // left wall, upper diagonal corner
  nativeFrac(15, 235, 90, 795), // left wall, lower vertical run
  nativeFrac(755, 15, 900, 235), // right wall, upper diagonal corner
  nativeFrac(825, 235, 900, 795), // right wall, lower vertical run
];

/**
 * The front (south) wall and the door. Unlike the previous room, this door is drawn fully
 * **closed** (a solid wooden leaf with a small round window, no open gap onto visible steps --
 * confirmed against a close-up crop of the doorway, not assumed) — so there is no "walk through
 * the gap" case here at all, and no foreground beam for Bernadette to pass behind. `FRONT_WALL_*`
 * covers the plain stone either side of the door; `DOOR` is its own, taller rect (the door's own
 * opening is recessed further south than the flanking wall, matching the art) rather than being
 * merged into one flat band, so its shape still follows what's actually drawn instead of being a
 * single rectangle spanning the whole wall.
 */
const FRONT_WALL_LEFT: FracRect = nativeFrac(15, 790, 355, 855);
const FRONT_WALL_RIGHT: FracRect = nativeFrac(565, 790, 900, 855);
const DOOR: FracRect = nativeFrac(355, 790, 565, 935);

/**
 * Because `DOOR` above is solid for its *entire* depth (it's a closed door, not an open gap --
 * there is nothing to walk through), the steps visible below it in the artwork are permanently
 * unreachable from inside the room, and an exit trigger placed down there (as the previous room's
 * own SECOND_STEP_ZONE was, on its half-*open* door's visible steps) would never fire at all. The
 * exit trigger instead sits just *north* of the door, on the open floor where Bernadette actually
 * arrives when she walks up to it -- "approach the closed door to leave," not "walk through a gap
 * that doesn't exist in this art." `DOOR_STOPPER` is a defensive rect right at the room art's own
 * bottom edge (this crop's alpha bounding box ends at native y1009, confirmed via a numpy scan,
 * not guessed) -- redundant given `DOOR` already blocks all the way to y935, but kept as the same
 * belt-and-suspenders the previous room used, in case `DOOR` is ever narrowed in a future pass.
 */
const EXIT_ZONE: FracRect = nativeFrac(370, 745, 550, 788);
const DOOR_STOPPER: FracRect = nativeFrac(355, 995, 565, 1009);

const PLAYER_SPAWN = nativeFrac(450, 745, 470, 765); // just inside the door, facing into the room
// Louise (the mother): re-tuned down and left from an earlier position that put her too far
// up/right -- her feet there (native y~285) sat well above the wall's own real floor line (y218
// -> now y256, see WALL_FOOTPRINTS above), so her fixed-height 42-world-px sprite visibly floated
// over the shelf/wall art instead of standing on the floor (confirmed live via screenshot, not
// guessed). Moved to native x535-575 (left of the old x600-640, comfortably clear of the table's
// own grown collider which starts x590) and y345-375 (nudged a further +20 native px down from an
// initial y325-355 per a "still slightly too high" follow-up -- a small, deliberate adjustment, not
// a relocation; still comfortably left of the table collider regardless of x). This cuts her own
// head/wall overlap from ~8.7 world-px down to ~2.2 world-px (the same "fixed character height vs
// the room's own halved size" tension the wall-collider comment above describes -- a full
// 42-world-px character standing anywhere in this room's own top ~42px, which includes the window,
// cannot have *zero* head overlap without also standing outside the "beside the window" area
// entirely; this is the closest balance of both asks). Still clearly in the room's own upper-right,
// still beside (not overlapping) the window, still clear of every collider (table, wall).
const MOTHER_SPAWN = nativeFrac(535, 345, 575, 375);

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
  private exitZone!: Phaser.Geom.Rectangle;
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

    this.dialogueBox = new DialogueBox(this);
    this.tasksPanel = new TasksPanel(this);
    this.topBar = new GameplayTopBar(this);
    this.interactionPrompt = new InteractionPrompt(this);

    this.keyE = this.input.keyboard!.addKey('E');
    this.touch.onInteract = () => this.tryInteract();

    const exitRect = EXIT_ZONE;
    this.exitZone = new Phaser.Geom.Rectangle(
      ROOM_OFFSET_X + exitRect.xFrac * CACHOT_ROOM_WIDTH,
      ROOM_OFFSET_Y + exitRect.yFrac * CACHOT_ROOM_HEIGHT,
      exitRect.wFrac * CACHOT_ROOM_WIDTH,
      exitRect.hFrac * CACHOT_ROOM_HEIGHT,
    );
  }

  /** The maintainer's own room artwork, used as the permanent backdrop, plus invisible colliders
   * matching its actual furniture/walls -- see the FURNITURE_FOOTPRINTS/WALL_FOOTPRINTS doc
   * comments above for the full reasoning. No separate walk-behind overlay this time -- see
   * `lourdesCachotInterior.ts`'s own doc comment for why this room doesn't need one: the closed
   * door has no walkable gap to pass behind, and every other piece of furniture sits flush against
   * a wall or fully exposed on the open floor, so the backdrop's own fixed `DEPTH.GROUND` (always
   * behind the player's own always-higher depth) already guarantees the floor/furniture never
   * covers her. */
  private buildRoom(): void {
    this.add.image(ROOM_OFFSET_X, ROOM_OFFSET_Y, CACHOT_ROOM_KEY).setOrigin(0, 0).setDepth(DEPTH.GROUND);

    [...FURNITURE_FOOTPRINTS, ...WALL_FOOTPRINTS, FRONT_WALL_LEFT, FRONT_WALL_RIGHT, DOOR, DOOR_STOPPER].forEach((r) => {
      const cx = ROOM_OFFSET_X + (r.xFrac + r.wFrac / 2) * CACHOT_ROOM_WIDTH;
      const cy = ROOM_OFFSET_Y + (r.yFrac + r.hFrac / 2) * CACHOT_ROOM_HEIGHT;
      this.colliderBodies.push(createBlocker(this, cx, cy, r.wFrac * CACHOT_ROOM_WIDTH, r.hFrac * CACHOT_ROOM_HEIGHT));
    });
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
    const atExit = this.motherTalkedTo && Phaser.Geom.Rectangle.Contains(this.exitZone, this.player.x, this.player.y);

    if (nearMother) {
      // Clamped to never rise above the room's own top edge (ROOM_OFFSET_Y): Louise stands close
      // enough to that edge (see MOTHER_SPAWN's own doc comment on the room being too short for a
      // full-height character to ever have complete head clearance) that the *un*clamped "always
      // MOTHER_FRAME_HEIGHT + PROMPT_CLEARANCE above her feet" formula pushed the label up into
      // the narration caption above the room (`buildNarration()`, y=ROOM_OFFSET_Y-12) -- text
      // overlapping text, confirmed live via screenshot. The clamp trades a little of her own head
      // clearance for guaranteed clearance from the narration; her head only pokes ~2px above the
      // room to begin with, so the label still reads as "above her," just snugly.
      const promptY = Math.max(this.mother.y - MOTHER_FRAME_HEIGHT - PROMPT_CLEARANCE, ROOM_OFFSET_Y);
      this.interactionPrompt.showAt(this.mother.x, promptY, Localization.t(K.INTERACT_TALK));
    } else if (atExit) {
      this.interactionPrompt.showAt(this.player.x, this.player.y - 24, Localization.t(K.INTERACT_EXIT));
    } else {
      this.interactionPrompt.hide();
    }

    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.tryInteract();
    }

    if (atExit) {
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
