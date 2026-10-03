import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT, DEPTH, TILE_SIZE } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import { LOURDES_GROUND_TAN_KEY, LOURDES_GROUND_TAN_TILE_SIZE } from '../assets/terrain/lourdesGroundTan';
import { SISTER_FRAME_HEIGHT } from '../assets/npc/sisterSprite';
import { JEANNE_FRAME_HEIGHT } from '../assets/npc/jeanneSprite';
import { BOY_FRAME_HEIGHT } from '../assets/npc/boySprite';
import { PROP_KEYS } from '../pixelart/props';
import { Player } from '../gameplay/Player';
import { NpcActor } from '../gameplay/NpcActor';
import { TouchControls } from '../gameplay/TouchControls';
import { DialogueBox } from '../gameplay/DialogueBox';
import { TasksPanel } from '../gameplay/TasksPanel';
import { GameplayTopBar } from '../gameplay/GameplayTopBar';
import { InteractionPrompt } from '../gameplay/InteractionPrompt';
import { Caption } from '../gameplay/Caption';
import { RosaryUI } from '../gameplay/RosaryUI';
import { updateFollowerPosition } from '../gameplay/Follower';
import { LeaderNpc, type Point } from '../gameplay/LeaderNpc';
import { WanderNpc } from '../gameplay/WanderNpc';
import { MissionManager } from '../gameplay/MissionManager';
import { mission01Dialogue, MISSION_01_FIREWOOD_TARGET, MISSION_01_OBJECTIVES } from '../data/missions/mission01';
import { boyAmbientDialogue } from '../data/dialogue/ambientDialogue';
import { createBlocker, depthForY, isNear } from '../gameplay/utils';
import { fadeToScene } from '../gameplay/transitions';
import { wait, tweenPromise } from '../gameplay/async';
import { createText } from '../ui/text';
import { useLetterboxScale } from '../core/scaleMode';
import { DEV_MODE } from '../core/devMode';
import { MapEditorPanel } from '../editor/MapEditorPanel';
import { createEditorAssetInstance, type EditorAssetRegistry } from '../editor/editorAssetRender';
import {
  type EditorZoneRegistry,
  type EditorZoneColliderRegistry,
  addZoneCollider as addEditorZoneCollider,
} from '../editor/editorZoneRender';
import { loadEditorMapData } from '../editor/mapEditorData';

// One continuous map: the open field around the grotto sits north (low rows), the Gave de Pau
// bends from a vertical arm (east of the grotto) into a horizontal arm that forms the town's
// northern edge (crossable only via the bridge), and the town sits south of that.
//
// **The map starts with only base ground/terrain -- no hand-placed buildings, river, bridge, or
// grotto PNGs.** All of those (the single large town PNG, then later the individual building PNGs,
// the real river+bridge art, and the grotto rock) were tried and then explicitly removed at the
// maintainer's request so the in-game map editor (DEV_MODE-only, see `core/devMode.ts`) is the one
// place everything gets placed from now on. The area south of the river is plain open grass — the
// same grass layer built in `buildTerrain()` below — with no buildings and no colliders placed in
// it; the vertical river arm beside the grotto (tile-stamped, part of `buildTerrain()`) stays, since
// it's core map/ground geometry the scripted ford-crossing mission beat depends on, not a
// hand-placed asset.
//
// **The north cluster's eastward shift (OFFSET_X_TILES) is unrelated to any of the above removals**
// and is explicitly out of scope here (the river/Massabielle/grotto *position* system must stay
// untouched) — every coordinate below that adds OFFSET_X_TILES/OFFSET_X keeps this offset exactly
// as-is.
const OFFSET_X_TILES = 45;
const OFFSET_X = OFFSET_X_TILES * TILE_SIZE;

const COLS = 160;
const ROWS = 168;
const MAP_W = COLS * TILE_SIZE;
const MAP_H = ROWS * TILE_SIZE;

/**
 * How far out the map editor's mouse-wheel zoom (`setupEditorCameraPan()`) can go — the zoom level
 * at which the *shorter* logical-viewport axis exactly matches the map's own corresponding axis, so
 * the whole map (both its width and height) fits inside the camera's view at once, with a small 10%
 * margin so the map's own edges don't sit flush against the screen edge. Derived from the map's
 * actual size rather than a hardcoded number, so this keeps working correctly if `COLS`/`ROWS` ever
 * change.
 */
const EDITOR_MIN_ZOOM = Math.min(GAME_WIDTH / MAP_W, GAME_HEIGHT / MAP_H) * 0.9;

const PATH_CENTER = 32 + OFFSET_X_TILES;

// Vertical arm of the river, beside the grotto. Fully blocks the player — the only crossing is
// the scripted ford cutscene, where the companions wade across and Bernadette stays behind.
const RIVER_V_START = 39 + OFFSET_X_TILES;
const RIVER_V_END = 42 + OFFSET_X_TILES;

// Horizontal arm, the town's river boundary. Only passable through the bridge at the path.
const RIVER_H_TOP = 61;
const RIVER_H_BOTTOM = 64;

// Kept well clear of the map edges so the screen-pinned HUD never covers it.
const GROTTO_X = 256 + OFFSET_X;
const GROTTO_Y = 288;
const NICHE_X = GROTTO_X + 62;
const NICHE_Y = GROTTO_Y + 19;

const FIREWOOD_SPOTS = [
  { x: 192 + OFFSET_X, y: 640 },
  { x: 352 + OFFSET_X, y: 768 },
  { x: 512 + OFFSET_X, y: 576 },
];

// Width (4 tiles) and the GROTTO_Y-relative anchor are unchanged from the original map's own
// proportions — only repositioned to track the shifted RIVER_V_START/GROTTO_Y.
const FORD_ZONE = new Phaser.Geom.Rectangle((RIVER_V_START - 4) * TILE_SIZE, GROTTO_Y - 8, 4 * TILE_SIZE, 280);
const FAR_BANK = { sisterX: RIVER_V_END * TILE_SIZE + 24, friendX: RIVER_V_END * TILE_SIZE + 44, y: 544 };

// Le Cachot's connection point to `CachotScene` — independent of whatever building art (if any)
// the map editor currently has placed over it, so the enter/exit plumbing
// (`buildCachotEntrance()` below, `CachotScene.ts`'s `fromCachot` exit) never needs to change no
// matter what's visually standing here.
const CACHOT_DOOR_X = PATH_CENTER * TILE_SIZE;
const CACHOT_DOOR_Y = (RIVER_H_BOTTOM + 10) * TILE_SIZE;

// Jeanne starts on the open grass near Le Cachot's placeholder entrance, waits for Bernadette to
// meet her there, then leads her north up to the bridge and across to the ford, where she naturally
// stops well short of the grotto so she doesn't upstage the apparition. `LeaderNpc` walks each leg
// as a straight line with no obstacle avoidance; with no buildings currently placed south of the
// river there is nothing for these waypoints to route around, but they're kept simple and central
// rather than assuming any future building layout.
const JEANNE_SPAWN = { x: CACHOT_DOOR_X + 80, y: CACHOT_DOOR_Y + 60 };
const JEANNE_WAYPOINTS: Point[] = [
  { x: CACHOT_DOOR_X + 20, y: CACHOT_DOOR_Y + 30 },
  { x: PATH_CENTER * TILE_SIZE, y: (RIVER_H_BOTTOM + 1) * TILE_SIZE + 8 },
  { x: PATH_CENTER * TILE_SIZE, y: (RIVER_H_TOP - 1) * TILE_SIZE - 8 },
  { x: PATH_CENTER * TILE_SIZE, y: 400 },
  { x: 500 + OFFSET_X, y: 300 },
];
// Speed and distance thresholds are gameplay feel, not spatial layout -- deliberately left
// unchanged (she still walks at the same visual pace; the bigger map just means a longer walk).
const JEANNE_SPEED = 48;
const JEANNE_MAX_DISTANCE = 110;
const JEANNE_RESUME_DISTANCE = 55;

// Bounded area where the sister and Jeanne wander (`WanderNpc`) once they've crossed the river
// during Mission 1, "searching for firewood" instead of vanishing -- a rectangle on the far
// (east) bank, not tied to any specific spot from the original map (this behavior is new). Sized
// to the actual clear gap here: the river's east edge sits at (RIVER_V_END+1)*TILE_SIZE, well
// short of this box, keeping the pair visibly close to the crossing point/Massabielle without
// risking wandering into the water.
const FAR_BANK_WANDER_BOUNDS = new Phaser.Geom.Rectangle(700 + OFFSET_X, FAR_BANK.y - 60, 70, 120);
const COMPANION_WANDER_SPEED = 28;

// Wander zone for the ambient village boy — a small patch of open grass near Le Cachot's
// placeholder entrance. No building footprints exist yet to stay clear of; this will likely need
// re-checking against real building colliders once they're placed.
const BOY_WANDER_BOUNDS = new Phaser.Geom.Rectangle(CACHOT_DOOR_X - 140, CACHOT_DOOR_Y + 20, 100, 60);
const BOY_WANDER_SPEED = 24;

// Positions unrelated to the town-building relayout above; unchanged sizes. Trees removed from
// this list entirely (see `DECOR`'s own doc comment below) -- what's left is just the two rocks.
const DECOR: Array<{ key: string; col: number; row: number }> = [{ key: PROP_KEYS.ROCK, col: 12 + OFFSET_X_TILES, row: 44 }];

const INTERACT_RADIUS = 26;

// Clearance above an NPC's own head (not just an arbitrary offset from her feet) before the "Talk"
// prompt's own bottom edge -- see `InteractionPrompt.ts`: its text origin is (0.5, 1), so the (x,y)
// passed in is the label's own *bottom*. The old calls below used flat offsets (-26 for Jeanne,
// -20 for the boy) well short of their real frame heights, so the label's bottom rendered partway
// down their bodies instead of above their heads -- "the Talk box... partially covers them."
const PROMPT_CLEARANCE = 6;

// The shared NPC ground shadow (`SHADOW_KEY`) is sized for the ~28px-tall procedural character
// grid (`personTemplate.ts`) every other NpcActor still uses. The sister's real-art frames are
// SISTER_FRAME_HEIGHT (~36px, 85% of Bernadette's own 42px) tall -- scale her shadow by the same
// ratio so it keeps the same size-to-character relationship the baseline characters have, instead
// of reading as too small for her.
const SISTER_SHADOW_SCALE = SISTER_FRAME_HEIGHT / 28;

// Same reasoning as SISTER_SHADOW_SCALE above, for Jeanne's real-art frames (JEANNE_FRAME_HEIGHT
// = 42px, full adult scale like Bernadette/the mother -- she's Bernadette's peer, not a younger
// sibling, so no shrink).
const FRIEND_SHADOW_SCALE = JEANNE_FRAME_HEIGHT / 28;

// Same reasoning again, for the boy's real-art frames (BOY_FRAME_HEIGHT = 80% of Bernadette).
const BOY_SHADOW_SCALE = BOY_FRAME_HEIGHT / 28;

type Phase = 'explore' | 'crossing' | 'hush' | 'apparition' | 'praying' | 'ending';

interface OverworldSceneData {
  fromCachot?: boolean;
  /** Entered from `HomeScene`'s "Map Editor" button (DEV_MODE-only) rather than real gameplay --
   * see `editorViewMode`'s own doc comment below for what this changes. */
  editorMode?: boolean;
}

export class OverworldScene extends Phaser.Scene {
  private player!: Player;
  private touch!: TouchControls;
  private dialogueBox!: DialogueBox;
  private tasksPanel!: TasksPanel;
  private topBar!: GameplayTopBar;
  private interactionPrompt!: InteractionPrompt;
  private rosary!: RosaryUI;
  private keyE!: Phaser.Input.Keyboard.Key;

  private sister!: NpcActor;
  private friend!: NpcActor;
  private friendMet = false;
  private leader: LeaderNpc | null = null;
  private fieldEntered = false;
  private sisterWander: WanderNpc | null = null;
  private friendWander: WanderNpc | null = null;

  private boy!: NpcActor;
  private boyWander: WanderNpc | null = null;
  private boyDialogueJustClosed = false;

  private lady!: NpcActor;
  private ladyGlow!: Phaser.GameObjects.Arc;
  private firewoodSprites: Phaser.GameObjects.Image[] = [];

  private cachotDoorZone!: Phaser.Geom.Rectangle;
  private colliderBodies: (Phaser.Types.Physics.Arcade.ImageWithStaticBody | Phaser.GameObjects.Zone)[] = [];

  // Whatever the map editor (dev-mode-only, see `core/devMode.ts`) has saved -- loaded here
  // unconditionally (a saved layout, including a BLOCKED zone's real collision, is part of the map
  // every player sees/is bound by, not an editor-only artifact) and additive only: none of this
  // reads or touches the river/NPC waypoints above. The editing UI/input itself (`MapEditorPanel`,
  // constructed below -- not kept as a field, since nothing here needs to call back into it once
  // built; it owns its own lifetime via the scene's input listeners) is the only piece actually
  // gated by DEV_MODE.
  private editorAssets: EditorAssetRegistry = new Map();
  private editorZones: EditorZoneRegistry = new Map();
  private editorZoneColliders: EditorZoneColliderRegistry = new Map();

  /**
   * True only when this scene was entered via `HomeScene`'s "Map Editor" button (`data.editorMode`,
   * itself only ever offered when `DEV_MODE` is on). Unlike the editor panel's own open/closed state
   * -- which toggles off the moment the maintainer hits "Close editor" to get an unobstructed look
   * at the map -- this stays true for the rest of the scene's lifetime once set, so free-look
   * pan/zoom and "no player control" don't silently revert just because the side panel itself is
   * hidden. The
   * normal-gameplay path (reached via Le Cachot's door, `fromCachot`) never sets this, so none of
   * the behavior gated on it changes anything about real play.
   */
  private editorViewMode = false;

  // True-float camera scroll accumulator for the hand-rolled follow in `updateCameraFollow()` --
  // see that method's own doc comment for why this can't just be `camera.startFollow()`.
  private camScrollX = 0;
  private camScrollY = 0;

  // Free-look camera panning, map-editor-only (see `setupEditorCameraPan()`) -- right-mouse-button
  // drag, tracked as the pointer position and camera scroll at drag-start so pan math is a plain
  // delta regardless of how long the drag has been going. `null` whenever no such drag is active.
  private editorPanStart: { pointerX: number; pointerY: number; scrollX: number; scrollY: number } | null = null;

  private phase: Phase = 'explore';

  constructor() {
    super(SCENE_KEYS.OVERWORLD);
  }

  create(data: OverworldSceneData): void {
    useLetterboxScale(this);
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.phase = 'explore';
    this.friendMet = false;
    this.fieldEntered = false;
    this.leader = null;
    this.sisterWander = null;
    this.friendWander = null;
    this.boyWander = null;
    this.boyDialogueJustClosed = false;
    this.colliderBodies = [];
    this.firewoodSprites = [];
    this.editorAssets = new Map();
    this.editorZones = new Map();
    this.editorZoneColliders = new Map();
    this.editorPanStart = null;
    this.editorViewMode = DEV_MODE && !!data.editorMode;

    this.buildTerrain();

    this.touch = new TouchControls(this);

    // Exiting Le Cachot (fromCachot) lands her a few px north of the door, directly under the
    // door's own horizontal center (CACHOT_DOOR_X) -- not to the side or at an arbitrary spot.
    const startY = data.fromCachot ? CACHOT_DOOR_Y - 24 : CACHOT_DOOR_Y + 30;
    this.player = new Player(this, CACHOT_DOOR_X, startY, this.touch);

    // Every previously hand-placed building/river/bridge/grotto PNG has been removed on purpose
    // (see git history around this comment) -- the map now starts as clean ground/terrain only, so
    // the map editor (DEV_MODE-only, below) is the sole way anything gets placed on it from here.
    // The door interaction zone (buildCachotEntrance()) and the mission-critical ford river tiles
    // (buildTerrain()) are unrelated to those removed PNGs and stay untouched.
    this.buildCachotEntrance();
    this.buildDecor();
    this.buildFirewood();
    this.loadEditorPlacedAssets();
    this.loadEditorZones();
    // The editor's own UI/input is the only DEV_MODE-gated piece here -- the assets/zones it has
    // already saved were just loaded above unconditionally (see loadEditorPlacedAssets()/
    // loadEditorZones()'s own doc comments) and stay in effect for every player regardless of this
    // flag; only the ability to add/move/paint more of them is gated. Only constructed (and
    // auto-opened) in `editorViewMode` now -- reached exclusively via `HomeScene`'s "Map Editor"
    // button, never from the normal Le Cachot gameplay entrance -- since there is no longer any
    // in-scene toggle button to open it from the real-gameplay path.
    if (this.editorViewMode) {
      new MapEditorPanel(this, this.editorAssets, this.colliderBodies, this.editorZones, this.editorZoneColliders);
    }
    this.physics.add.collider(this.player, this.colliderBodies);

    // `breathingEnabled: true` and `targetHeight: SISTER_FRAME_HEIGHT` are both new here: her
    // sprite sheet was swapped for a second, much-higher-resolution supply ("hazle la animacion de
    // respirar") -- see `sisterSprite.ts`'s own doc comment and `NpcActor`'s `targetHeight` param
    // for why the sprite needs to be told how tall to actually render at now.
    this.sister = new NpcActor(
      this,
      CACHOT_DOOR_X - 30,
      CACHOT_DOOR_Y + 26,
      'sister',
      'down',
      SISTER_SHADOW_SCALE,
      true,
      DEPTH.ACTORS,
      true,
      SISTER_FRAME_HEIGHT,
    );
    this.sister.setVisible(MissionManager.hasReachedObjective(MISSION_01_OBJECTIVES.GATHER_FIREWOOD));
    this.sister.setDepth(depthForY(this.sister.y, DEPTH.ACTORS));
    // Permanently non-colliding: the maintainer reported physically bumping into her while she
    // trails behind Bernadette (before the river crossing, she's following close; after, she's
    // wandering the far bank -- either way, standing in Bernadette's way is just an annoyance, not
    // gameplay). She still moves, follows, wanders, and can be talked to exactly as before -- this
    // only turns off her own physics body's participation in collision checks (see
    // `NpcActor.setCollisionEnabled()`), which has no effect on any of that. Every other NPC's own
    // collider is untouched.
    this.sister.setCollisionEnabled(false);

    this.friend = new NpcActor(this, JEANNE_SPAWN.x, JEANNE_SPAWN.y, 'friend', 'down', FRIEND_SHADOW_SCALE, true);
    this.friend.setDepth(depthForY(this.friend.y, DEPTH.ACTORS));

    const boyStart = Phaser.Geom.Rectangle.Random(BOY_WANDER_BOUNDS, new Phaser.Geom.Point());
    this.boy = new NpcActor(this, boyStart.x, boyStart.y, 'boy', 'down', BOY_SHADOW_SCALE, true);
    this.boy.setDepth(depthForY(this.boy.y, DEPTH.ACTORS));
    // Unlike the sister/friend (whose wandering only starts once the river-crossing cutscene
    // triggers it), the boy is pure ambient flavor with no mission tie-in at all -- he wanders from
    // the moment the scene loads.
    this.boyWander = new WanderNpc(this.boy, BOY_WANDER_BOUNDS, BOY_WANDER_SPEED);

    const ladyDepth = DEPTH.ACTORS + 0.5;
    // autoDepthEnabled=false: she's a vision, not a physically-present character subject to normal
    // spatial Y-sorting -- always renders in front of Bernadette regardless of either one's
    // position (see NpcActor's own doc comment on autoDepthEnabled). Also deliberately left out of
    // the physics collision group below -- nothing about approaching/standing near her should be
    // physically blocked.
    this.lady = new NpcActor(this, NICHE_X, NICHE_Y, 'lady', 'down', 1, false, DEPTH.ACTORS, false);
    this.lady.setDepth(ladyDepth);
    this.lady.setAlpha(0);
    this.ladyGlow = this.add.circle(NICHE_X, NICHE_Y - 8, 22, 0xfff3cf, 0.28);
    this.ladyGlow.setDepth(ladyDepth - 0.001);
    this.ladyGlow.setAlpha(0);

    // General character-vs-character collision: feet-only bodies (see NpcActor's own doc comment
    // on FEET_*_FRAC), player against every NPC and every NPC against every other NPC -- so
    // Bernadette can't walk through Jeanne/the sister/the boy, and they can't walk through each
    // other, while still visually overlapping vertically the normal top-down way. The lady is
    // deliberately left out (see her own creation comment above).
    // A plain array, not `physics.add.group()` -- a Group re-applies its own default body config
    // (including `immovable: false`) to every member it's given, silently undoing the
    // `body.setImmovable(true)` each NpcActor already set on itself in its own constructor.
    // `collider()` accepts arrays directly and colliding an array against itself still does
    // correct pairwise (not self-vs-self) checks, so no Group is needed here at all.
    const npcs = [this.sister, this.friend, this.boy];
    this.physics.add.collider(this.player, npcs);
    this.physics.add.collider(npcs, npcs);
    // Houses (and the fountain) block NPCs too, not just the player -- "the house collision should
    // apply to NPCs as well where appropriate." Every scripted waypoint/wander bound in this file
    // was chosen to stay clear of every collider's footprint (see their own doc comments), so this
    // never leaves an NPC stuck against a wall it can't route around.
    this.physics.add.collider(npcs, this.colliderBodies);

    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);
    // Hand-rolled follow (`updateCameraFollow()`, ticked from `update()`) instead of
    // `camera.startFollow(this.player, true, 0.12, 0.12)` -- see that method's own doc comment for
    // the real bugs this works around (diagonal-movement camera shake, and player-vs-world relative
    // jitter). Seed the accumulator here so the very first frame doesn't lerp in from scroll (0,0);
    // the gap is exactly width/2 at this instant, so the round-trip through updateCameraFollow()'s
    // own formula is exact here too, not just an approximation.
    this.camScrollX = this.player.x - this.cameras.main.width / 2;
    this.camScrollY = this.player.y - this.cameras.main.height / 2;
    this.cameras.main.scrollX = Math.floor(this.player.x) - Math.round(this.player.x - this.camScrollX);
    this.cameras.main.scrollY = Math.floor(this.player.y) - Math.round(this.player.y - this.camScrollY);

    this.dialogueBox = new DialogueBox(this);
    this.tasksPanel = new TasksPanel(this);
    this.topBar = new GameplayTopBar(this);
    this.interactionPrompt = new InteractionPrompt(this);
    this.rosary = new RosaryUI(this);

    this.keyE = this.input.keyboard!.addKey('E');
    this.touch.onInteract = () => this.tryInteract();

    this.setupEditorCameraPan();
  }

  private tileToPixelCenter(col: number, row: number): { x: number; y: number } {
    return { x: col * TILE_SIZE, y: row * TILE_SIZE };
  }

  /**
   * The whole map is ONE continuous ground layer, tiled edge-to-edge, and nothing else -- no dirt
   * path, no cave floor, no water/riverbank tiles. All of that (the organic dirt trail, the
   * grotto's cave-floor patch, the vertical river arm's WATER/RIVERBANK tiles) was explicitly
   * removed at the maintainer's request: "the desired starting map should be extremely simple: one
   * continuous grass/ground layer covering the entire map, nothing else" -- everything else gets
   * placed by hand through the map editor from here on, the same as the buildings/horizontal-river
   * /bridge/grotto PNGs removed in an earlier pass (see this file's own header comment).
   *
   * The active tile is `lourdesGroundTan.ts` (a tan/terracotta ground texture), not the original
   * green grass (`lourdesGrass.ts`) -- the maintainer asked to swap which one renders here
   * ("sustituir el lourdes grass por este... el otro no lo borres, pero cambialo por este") while
   * explicitly keeping the old grass asset module in the codebase rather than deleting it, in case
   * it's wanted again later. If swapping back, change only the import/key/tile-size above and the
   * `addTilesetImage()`/background-color calls below -- nothing else about this method depends on
   * which ground texture is active.
   *
   * The scripted river-crossing mission beat (`FORD_ZONE`, `checkFordZone()`/
   * `beginRiverCrossing()`) still depends on the vertical arm being physically impassable except
   * via that cutscene -- that is gameplay/mission logic, not terrain art, and the maintainer was
   * explicit that gameplay/mission logic must stay untouched. So the invisible blocking collider
   * over that same rectangle stays exactly where it was; only its visible WATER/RIVERBANK tile
   * graphics are gone. The area now just looks like the active ground tile, the same as everywhere
   * else, until the maintainer places a river there again through the editor.
   */
  private buildTerrain(): void {
    // The map (416x928) is narrower than the camera's logical viewport (480 wide) at zoom 1, so
    // this color shows as a thin strip past the map's left/right edges whenever the camera is
    // horizontally centered or further — sampled as the active ground texture's own average color
    // (`Image.mean()` over `lourdes_ground_tan.png`) so that strip blends in instead of reading as
    // a visible seam next to the artwork.
    this.cameras.main.setBackgroundColor('#b98d74');

    const grassCols = Math.ceil(MAP_W / LOURDES_GROUND_TAN_TILE_SIZE);
    const grassRows = Math.ceil(MAP_H / LOURDES_GROUND_TAN_TILE_SIZE);
    const grassData: number[][] = Array.from({ length: grassRows }, () => Array.from({ length: grassCols }, () => 0));
    const grassMap = this.make.tilemap({
      data: grassData,
      tileWidth: LOURDES_GROUND_TAN_TILE_SIZE,
      tileHeight: LOURDES_GROUND_TAN_TILE_SIZE,
    });
    const grassTileset = grassMap.addTilesetImage(
      'lourdesGroundTile',
      LOURDES_GROUND_TAN_KEY,
      LOURDES_GROUND_TAN_TILE_SIZE,
      LOURDES_GROUND_TAN_TILE_SIZE,
      0,
      0,
    )!;
    const grassLayer = grassMap.createLayer(0, grassTileset, 0, 0)!;
    grassLayer.setDepth(DEPTH.GROUND - 1);

    // The vertical arm beside the grotto is never crossable on foot -- only the scripted ford
    // cutscene crosses it (see this method's own doc comment above for why the collider stays even
    // though the water tiles that used to mark it visually are gone).
    const vRiverX = ((RIVER_V_START + RIVER_V_END + 1) / 2) * TILE_SIZE;
    const vRiverHeight = (RIVER_H_BOTTOM + 2) * TILE_SIZE;
    this.colliderBodies.push(
      createBlocker(this, vRiverX, vRiverHeight / 2, (RIVER_V_END - RIVER_V_START + 1) * TILE_SIZE, vRiverHeight),
    );
  }

  private addStaticProp(key: string, x: number, y: number, width: number, height: number, colliderHeight?: number): void {
    const image = this.add.image(x, y, key).setOrigin(0.5, 1);
    image.setDepth(depthForY(y, DEPTH.ACTORS));
    const body = this.physics.add.staticImage(x, y - (colliderHeight ?? height) / 4, key);
    body.setVisible(false);
    body.body.setSize(width * 0.7, (colliderHeight ?? height) * 0.35);
    this.colliderBodies.push(body);
  }

  /**
   * Placeholder Le Cachot entrance: no image, no collider — just the interaction zone (and its
   * label) that keeps the enter/exit connection to `CachotScene.ts` working regardless of whatever
   * exterior building art the map editor does or doesn't currently have placed over it (see
   * `CACHOT_DOOR_X/Y`'s own doc comment above) -- this zone is deliberately independent of any
   * visual building asset.
   */
  private buildCachotEntrance(): void {
    const halfWidth = 24;
    this.cachotDoorZone = new Phaser.Geom.Rectangle(CACHOT_DOOR_X - halfWidth, CACHOT_DOOR_Y - 20, halfWidth * 2, 40);
    createText(this, CACHOT_DOOR_X, CACHOT_DOOR_Y - 26, Localization.t(K.LOCATION_CACHOT), { fontSize: '9px', color: '#3a3226' })
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY_LOW);
  }

  private buildDecor(): void {
    DECOR.forEach(({ key, col, row }) => {
      const px = this.tileToPixelCenter(col, row);
      this.addStaticProp(key, px.x, px.y, TILE_SIZE, TILE_SIZE * 1.5);
    });
  }

  private buildFirewood(): void {
    FIREWOOD_SPOTS.forEach(({ x, y }) => {
      const sprite = this.add.image(x, y, PROP_KEYS.FIREWOOD).setOrigin(0.5, 1);
      sprite.setDepth(depthForY(y, DEPTH.ACTORS));
      this.firewoodSprites.push(sprite);
    });
  }

  /**
   * Renders whatever the map editor (`editor/MapEditorPanel.ts`, DEV_MODE-only) has saved to
   * `localStorage` -- called unconditionally, regardless of `DEV_MODE`, since a saved layout is part
   * of the map every player should see, not an editor-only artifact. Purely additive: this reads
   * `editor/mapEditorData.ts`'s own storage key and only ever adds new `Image`s into `editorAssets`.
   * Buildings and decorations (trees) also get a small base-footprint collider automatically, via
   * `createEditorAssetInstance()` -> `applyInstanceCollider()` (`editorAssetRender.ts`) -- a hand
   * -painted BLOCKED zone is still the only way to block any *other* layer (ground/river).
   */
  private loadEditorPlacedAssets(): void {
    const saved = loadEditorMapData();
    saved.assets.forEach((data) => {
      const instance = createEditorAssetInstance(this, data, this.colliderBodies);
      if (instance) this.editorAssets.set(data.id, instance);
    });
  }

  /**
   * Loads whatever zones the map editor has saved, into `editorZones` -- called unconditionally,
   * regardless of `DEV_MODE`, same reasoning as `loadEditorPlacedAssets()` above. This one matters
   * even more to get right: a saved BLOCKED zone's collider is real gameplay collision (the only
   * thing stopping a player from walking through it), not just a visual, so it must exist whether or
   * not `MapEditorPanel` itself was ever constructed this session. WALKABLE/WALK_BEHIND zones are
   * loaded into the registry too (so `MapEditorPanel`, if it exists, has the full saved set to work
   * with) but get no collider -- see `MapEditorPanel.ts`'s own doc comment on why those two are
   * editor-visualization-only.
   */
  private loadEditorZones(): void {
    const saved = loadEditorMapData();
    saved.zones.forEach((zone) => {
      this.editorZones.set(zone.id, zone);
      if (zone.type === 'blocked') addEditorZoneCollider(this, zone, this.editorZoneColliders, this.colliderBodies);
    });
  }

  /**
   * Replaces `camera.startFollow(this.player, true, 0.12, 0.12)`. That built-in combination has a
   * real bug, traced into Phaser's own `Camera.preRender()` source: every frame it lerps
   * `scrollX`/`scrollY` toward the player, floors the result for crisp pixel-art rendering, then
   * **writes that floored value back into `this.scrollX`/`scrollY`** — so next frame's lerp starts
   * from an already-truncated base, not the true continuous position, instead of only rounding for
   * that one frame's render. Fixed by keeping our own float accumulator (`camScrollX`/`camScrollY`)
   * that Phaser's floored value never gets written back into — lerp *that*, never the corrupted copy.
   *
   * **A second rounding issue was fixed after that** (reported as "horizontal movement still looks
   * slightly stuttery"): `camera.roundPixels` makes Phaser's render pipeline floor the player
   * sprite's own `x` (`MultiPipeline.js`: `gx = Math.floor(gameObject.x)`) independently of whatever
   * this method assigns to `camera.scrollX` — and `floor(a) - floor(b)` can differ from the
   * mathematically "correct" `round(a - b)` by a full pixel depending on how `a` and `b`'s own
   * fractional parts happen to line up that frame, which read as the player twitching by a pixel
   * relative to the world. That round was fixed by deriving scroll from `Math.floor(player.x) -
   * Math.round(player.x - camScrollX)`, making the player's on-screen position exactly a single
   * rounding of the smooth lerped gap — no second, independently-phased rounding left to disagree
   * with it.
   *
   * **A diagonal-specific desync was suspected and ruled out here** (investigated after a report of
   * "the character looks like it is slightly flickering/jittering/shaking from frame to frame" during
   * diagonal walking only): the theory was that `camScrollX`/`camScrollY` are two independent lerp
   * filters that can carry different residual lag from movement *before* a diagonal stroke began, so
   * `round(player.x - camScrollX)` and `round(player.y - camScrollY)` might tick on different frames
   * even during perfectly-locked-step diagonal motion. Tried replacing this method with
   * `cam.scrollX = Math.round(camScrollX)` (rounding the accumulator directly, sidestepping the gap
   * entirely) and measured both formulas from *inside* `updateCameraFollow()` itself (the only
   * reliable technique — external probes read stale/torn state, see AGENTS.md) across a genuine
   * constant-velocity **steady state** (the regime that matters — a sustained walk, not the brief
   * transient right after a turn). Result: the *existing* formula below settles to **zero** further
   * on-screen ticks once steady state is reached — mathematically inevitable, since for constant
   * velocity input an exponential lerp filter's lag converges to an exact constant, making
   * `player.pos - camScrollAxis` an exact constant too, so its rounding never changes again; the
   * player sits rock-solid on screen while the world scrolls under her, which *is* the correct look
   * for a camera locked onto constant-speed motion. The alternative (`round(camScrollX)` directly)
   * re-introduced steady-state ticking instead (confirmed empirically, dozens of extra ticks over the
   * same window) by recombining `Math.floor(player.x)` with an independently-rounded `camScrollX` —
   * the exact class of bug the *previous* fix (below) exists to prevent. So the formula below is the
   * more correct one; it was left unchanged. (The real cause of the diagonal-only flicker report
   * turned out to be elsewhere — see `bernadetteSprite.ts`'s walk-frame alignment fix.)
   *
   * `camera.roundPixels` stays on globally (from `pixelArt: true`) throughout, so every sprite/tile
   * still renders pixel-snapped exactly as before. `camera.setBounds()`'s own edge clamping still
   * applies for free: Phaser's `preRender()` always runs `clampX`/`clampY` on `this.scrollX`/
   * `scrollY` after this method sets them, follow or not.
   */
  private updateCameraFollow(): void {
    const cam = this.cameras.main;
    const lerp = 0.12;
    const targetX = this.player.x - cam.width / 2;
    const targetY = this.player.y - cam.height / 2;
    this.camScrollX = Phaser.Math.Linear(this.camScrollX, targetX, lerp);
    this.camScrollY = Phaser.Math.Linear(this.camScrollY, targetY, lerp);
    cam.scrollX = Math.floor(this.player.x) - Math.round(this.player.x - this.camScrollX);
    cam.scrollY = Math.floor(this.player.y) - Math.round(this.player.y - this.camScrollY);
  }

  /**
   * Free-look camera panning and mouse-wheel zoom for the map editor view only (`editorViewMode`,
   * reached exclusively via `HomeScene`'s "Map Editor" button) — lets the maintainer inspect/edit
   * any part of the map without walking Bernadette there first. Pan is right-mouse-button drag,
   * deliberately: every existing editor interaction (placing an asset, painting a walkable/walk
   * -behind/blocked zone, selecting/dragging a placed instance — see `MapEditorPanel.ts`) is
   * left-click-based, so panning on the *other* button can never conflict with any of that click
   * routing, and needs no changes to the panel itself. Wired up unconditionally here (not gated on
   * DEV_MODE at the listener level) since `editorViewMode` is always `false` outside DEV_MODE (see
   * its own doc comment above), making every handler below a no-op automatically.
   *
   * Gated on `editorViewMode` itself, not `mapEditorPanel?.isOpen()` -- the maintainer can hit
   * "Close editor" to hide the side panel and see the full map unobstructed while keeping free-look
   * pan/zoom and "no player control" exactly as they were; see `editorViewMode`'s own doc comment
   * for why that distinction matters.
   *
   * `update()`'s own `updateCameraFollow()` call is skipped for the rest of the scene's life once
   * `editorViewMode` is set (see below) so this manual scroll/zoom isn't fought/overwritten every
   * frame by the player-follow lerp — the player is never controllable in this mode (`uiBlocked`),
   * so there is no "current" player position this pan would ever need to catch up to.
   */
  private setupEditorCameraPan(): void {
    this.input.mouse?.disableContextMenu();

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (!this.editorViewMode || !pointer.rightButtonDown()) return;
      this.editorPanStart = {
        pointerX: pointer.x,
        pointerY: pointer.y,
        scrollX: this.cameras.main.scrollX,
        scrollY: this.cameras.main.scrollY,
      };
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (!this.editorPanStart) return;
      if (!this.editorViewMode || !pointer.rightButtonDown()) {
        this.editorPanStart = null;
        return;
      }
      const dx = pointer.x - this.editorPanStart.pointerX;
      const dy = pointer.y - this.editorPanStart.pointerY;
      // Phaser's own `Camera#preRender()` clamps this to `setBounds()` every frame regardless of
      // how scroll got set (see `updateCameraFollow()`'s own doc comment above) -- panning past the
      // map edge is automatically clamped back, no manual bounds math needed here.
      this.cameras.main.scrollX = this.editorPanStart.scrollX - dx;
      this.cameras.main.scrollY = this.editorPanStart.scrollY - dy;
    });

    this.input.on('pointerup', () => {
      this.editorPanStart = null;
    });

    // Mouse-wheel zoom, centered on the camera's own current center (not the cursor) -- simplest
    // behavior that satisfies "con la ruleta haga zoom in y out", and consistent with the plain
    // drag-pan above rather than adding cursor-relative re-centering math. Same (pointer,
    // currentlyOver, deltaX, deltaY, deltaZ) 5-param signature as `ApparitionJourneyScene.ts`'s own
    // wheel handler -- see that file's doc comment for why deltaY (not deltaX) is the 4th param.
    // Lower bound is `EDITOR_MIN_ZOOM` (fits the *entire* map in view, per the maintainer's explicit
    // "que pueda llegar a ver todo el mapa") rather than an arbitrary fixed floor like the original
    // 0.5 -- that earlier value only ever showed a small fraction of the 2560x2688 map at once.
    this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _currentlyOver: unknown, _deltaX: number, deltaY: number) => {
      if (!this.editorViewMode) return;
      const zoomStep = deltaY > 0 ? -0.1 : 0.1;
      this.cameras.main.zoom = Phaser.Math.Clamp(this.cameras.main.zoom + zoomStep, EDITOR_MIN_ZOOM, 3);
    });
  }

  update(time: number, delta: number): void {
    // The `MapEditorPanel` (see `create()`) is only ever constructed when `editorViewMode` is
    // already true, so that first clause alone already covers every case its own `isOpen()` used
    // to need to be checked for separately here.
    const uiBlocked = this.editorViewMode || this.dialogueBox.isActive() || this.tasksPanel.isOpen() || this.topBar.isBlocking();
    const exploring = this.phase === 'explore' && !uiBlocked;
    this.player.setLocked(!exploring);
    this.player.update(time);
    // Free-look editor panning/zoom (see `setupEditorCameraPan()`) owns the camera for the rest of
    // this scene's life once `editorViewMode` is set -- the normal player-follow lerp would
    // otherwise fight it every frame, including after "Close editor" hides the side panel.
    if (!this.editorViewMode) {
      this.updateCameraFollow();
    }

    // Gated to 'explore' only -- this used to run every frame regardless of phase, which meant it
    // kept easing the sister toward the (now-locked) player position and re-setting her facing
    // *during* the scripted river-crossing tween below, fighting that tween's own position/facing
    // every frame and producing the wrong-direction walk animation the crossing was supposed to
    // show. `this.leader` (Jeanne's own leader-follow logic) already had this same guard; the
    // sister's follower update just hadn't been given it.
    if (this.phase === 'explore') {
      updateFollowerPosition(this.sister, this.player.x - 16, this.player.y + 4, time, DEPTH.ACTORS);
    }
    if (this.friendMet && this.phase === 'explore' && this.leader) {
      this.leader.update(this.player, delta, DEPTH.ACTORS);
    }
    // Runs regardless of phase (unlike the follower/leader above) -- once the sister and Jeanne
    // start wandering near the far riverbank after the crossing, they should keep pottering around
    // through the hush/apparition/praying/ending phases too, not freeze the moment the phase changes.
    // Paused specifically while a dialogue is on screen, though: an NPC mid-conversation with
    // Bernadette (the boy's ambient chat is the reachable case today, but this covers any future
    // wander-driven NPC the same way) shouldn't keep ambling off and playing its walk animation
    // behind the dialogue box. `setMoving(false)` is called every blocked frame rather than once,
    // so an NPC that was mid-stride the instant dialogue opened drops into its idle pose immediately
    // instead of finishing that step; `WanderNpc` itself is simply not ticked, so its own idle/walk
    // timer and target are exactly where they left off once the dialogue closes and updates resume.
    if (uiBlocked) {
      this.sister.setMoving(false);
      this.friend.setMoving(false);
      this.boy.setMoving(false);
    } else {
      this.sisterWander?.update(delta, DEPTH.ACTORS);
      this.friendWander?.update(delta, DEPTH.ACTORS);
      this.boyWander?.update(delta, DEPTH.ACTORS);
    }

    if (uiBlocked) {
      this.interactionPrompt.hide();
      return;
    }

    this.handlePrompts();

    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.tryInteract();
    }

    if (exploring) {
      this.checkFieldEntry();
      this.checkFordZone();
    }
  }

  private handlePrompts(): void {
    if (this.phase === 'apparition') {
      this.interactionPrompt.showAt(this.player.x, this.player.y - 24, Localization.t(K.INTERACT_PRAY));
      return;
    }
    if (this.phase !== 'explore') {
      this.interactionPrompt.hide();
      return;
    }

    const player = this.player;

    if (!this.friendMet && isNear(player, this.friend, INTERACT_RADIUS)) {
      this.interactionPrompt.showAt(this.friend.x, this.friend.y - JEANNE_FRAME_HEIGHT - PROMPT_CLEARANCE, Localization.t(K.INTERACT_TALK));
      return;
    }

    // Ambient chat, always available (no mission gating, no one-time flag) -- checked ahead of the
    // Cachot door/building prompts below only because it's the more specific/closer target when both
    // happen to be in range at once; in practice the two are far enough apart that this rarely matters.
    if (isNear(player, this.boy, INTERACT_RADIUS)) {
      this.interactionPrompt.showAt(this.boy.x, this.boy.y - BOY_FRAME_HEIGHT - PROMPT_CLEARANCE, Localization.t(K.INTERACT_TALK));
      return;
    }

    if (Phaser.Geom.Rectangle.Contains(this.cachotDoorZone, player.x, player.y)) {
      this.interactionPrompt.showAt(player.x, player.y - 24, Localization.t(K.INTERACT_TALK));
      return;
    }

    if (MissionManager.getCurrentObjective()?.id === MISSION_01_OBJECTIVES.COLLECT_FIREWOOD) {
      for (const sprite of this.firewoodSprites) {
        if (sprite.active && isNear(player, sprite, INTERACT_RADIUS)) {
          this.interactionPrompt.showAt(sprite.x, sprite.y - 14, Localization.t(K.INTERACT_FIREWOOD));
          return;
        }
      }
    }

    this.interactionPrompt.hide();
  }

  private tryInteract(): void {
    if (this.phase === 'apparition') {
      this.beginPrayer();
      return;
    }
    if (this.phase === 'praying') {
      this.rosary.advance();
      return;
    }
    // DialogueBox binds its own permanent 'keydown-E' listener (to advance/close the box) *in
    // addition* to this scene's own JustDown(keyE) polling below (to *open* an interaction). Both
    // fire off the same physical keypress: on the line that closes a dialogue, DialogueBox's own
    // listener runs first (synchronously, as part of Phaser's input-event dispatch) and closes the
    // box, then this same frame's update() sees dialogueBox.isActive() already false and would
    // immediately reopen it if the player is still standing in range -- an infinite same-key
    // close/reopen loop. The mother/friend dialogues below are accidentally immune (their
    // one-time flags are set inside that same synchronous close(), so the guard just above already
    // blocks the reopen), but the boy's flagless, deliberately-repeatable ambient chat has no such
    // flag, so it needs one for exactly one frame after it closes.
    if (this.boyDialogueJustClosed) {
      this.boyDialogueJustClosed = false;
      return;
    }
    if (this.phase !== 'explore' || this.dialogueBox.isActive()) return;

    const player = this.player;

    if (!this.friendMet && isNear(player, this.friend, INTERACT_RADIUS)) {
      this.dialogueBox.start(mission01Dialogue.friendMeet, () => {
        this.friendMet = true;
        this.sister.setVisible(true);
        this.leader = new LeaderNpc(this.friend, JEANNE_WAYPOINTS, JEANNE_SPEED, JEANNE_MAX_DISTANCE, JEANNE_RESUME_DISTANCE);
        MissionManager.advanceObjective();
        this.tasksPanel.notifyNewObjective();
      });
      return;
    }

    if (isNear(player, this.boy, INTERACT_RADIUS)) {
      // Purely ambient -- no MissionManager call, no one-time flag, no side effect on him at all
      // (he stays put, keeps wandering once the box closes). Repeatable on every interaction. The
      // onComplete here only sets the one-frame close guard above -- see its comment.
      this.dialogueBox.start(boyAmbientDialogue, () => {
        this.boyDialogueJustClosed = true;
      });
      return;
    }

    if (Phaser.Geom.Rectangle.Contains(this.cachotDoorZone, player.x, player.y)) {
      fadeToScene(this, SCENE_KEYS.CACHOT);
      return;
    }

    if (MissionManager.getCurrentObjective()?.id === MISSION_01_OBJECTIVES.COLLECT_FIREWOOD) {
      for (const sprite of this.firewoodSprites) {
        if (sprite.active && isNear(player, sprite, INTERACT_RADIUS)) {
          sprite.setActive(false);
          sprite.destroy();
          const collected = MissionManager.addFirewood();
          if (collected >= MISSION_01_FIREWOOD_TARGET) {
            MissionManager.advanceObjective();
            this.tasksPanel.notifyNewObjective();
          }
          return;
        }
      }
    }
  }

  /** First time the player crosses the bridge into the field north of the river. */
  private checkFieldEntry(): void {
    if (this.fieldEntered) return;
    if (MissionManager.getCurrentObjective()?.id !== MISSION_01_OBJECTIVES.GO_TO_MASSABIELLE) return;
    if (this.player.y < (RIVER_H_TOP - 1) * TILE_SIZE) {
      this.fieldEntered = true;
      MissionManager.advanceObjective();
      this.tasksPanel.notifyNewObjective();
    }
  }

  private checkFordZone(): void {
    if (!MissionManager.hasReachedObjective(MISSION_01_OBJECTIVES.REACH_RIVER)) return;
    if (MissionManager.getCurrentObjective()?.id !== MISSION_01_OBJECTIVES.REACH_RIVER) return;
    if (Phaser.Geom.Rectangle.Contains(FORD_ZONE, this.player.x, this.player.y)) {
      this.beginRiverCrossing();
    }
  }

  private async beginRiverCrossing(): Promise<void> {
    this.phase = 'crossing';
    this.player.setLocked(true);
    this.interactionPrompt.hide();

    await Promise.all([
      this.friend.walkTo(FAR_BANK.friendX, FAR_BANK.y, 1600),
      wait(this, 250).then(() => this.sister.walkTo(FAR_BANK.sisterX, FAR_BANK.y, 1600)),
    ]);
    // They stay visible and start ambling around the far bank "searching for firewood" instead of
    // vanishing (`setVisible(false)`, the old behavior) -- see WanderNpc's own doc comment. Kept
    // running for the rest of the sequence (`update()` drives these unconditionally, not gated by
    // phase) since there's no scripted moment yet where the story needs them to leave.
    this.sisterWander = new WanderNpc(this.sister, FAR_BANK_WANDER_BOUNDS, COMPANION_WANDER_SPEED);
    this.friendWander = new WanderNpc(this.friend, FAR_BANK_WANDER_BOUNDS, COMPANION_WANDER_SPEED);

    MissionManager.advanceObjective();
    this.tasksPanel.notifyNewObjective();

    this.phase = 'hush';
    await this.runHushSequence();
  }

  private async runHushSequence(): Promise<void> {
    const narration = new Caption(this, 40, {
      fontSize: '13px',
      color: '#fffaf0',
      align: 'center',
      wordWrap: { width: GAME_WIDTH - 80 },
    });

    await narration.show(Localization.t(K.NARRATION_RIVER_STAY_BEHIND), 2200);
    await wait(this, 400);
    await narration.show(Localization.t(K.NARRATION_ALONE), 1600);
    await narration.show(Localization.t(K.NARRATION_SOMETHING_UNUSUAL), 1800);

    await this.revealLady();
  }

  private async revealLady(): Promise<void> {
    this.lady.setVisible(true);
    this.ladyGlow.setVisible(true);
    await Promise.all([
      tweenPromise(this, { targets: this.lady, alpha: 1, duration: 2000 }),
      tweenPromise(this, { targets: this.ladyGlow, alpha: 0.28, duration: 2000 }),
    ]);
    this.tweens.add({ targets: this.ladyGlow, alpha: 0.14, duration: 1400, yoyo: true, repeat: -1 });

    this.phase = 'apparition';
  }

  private beginPrayer(): void {
    this.phase = 'praying';
    this.interactionPrompt.hide();
    this.rosary.start(() => this.endApparition());
  }

  private async endApparition(): Promise<void> {
    this.phase = 'ending';
    this.tasksPanel.destroy();

    await tweenPromise(this, { targets: [this.lady, this.ladyGlow], alpha: 0, duration: 1400 });

    const blackout = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 1);
    blackout.setScrollFactor(0);
    blackout.setDepth(DEPTH.FADE);
    blackout.setAlpha(0);
    await tweenPromise(this, { targets: blackout, alpha: 1, duration: 900 });

    const dateCaption = new Caption(
      this,
      GAME_HEIGHT / 2 - 12,
      { fontSize: '16px', color: '#fffaf0', align: 'center' },
      DEPTH.FADE + 1,
    );
    const titleCaption = new Caption(
      this,
      GAME_HEIGHT / 2 + 14,
      { fontSize: '13px', color: '#c9beac', align: 'center' },
      DEPTH.FADE + 1,
    );

    await dateCaption.show(Localization.t(K.APPARITION_DATE_CARD), 2000, 700);
    await titleCaption.show(Localization.t(K.APPARITION_TITLE_CARD), 2200, 700);

    MissionManager.completeMission();
    this.scene.start(SCENE_KEYS.MISSION_COMPLETE);
  }
}
