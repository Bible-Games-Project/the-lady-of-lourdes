import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT, DEPTH, TILE_SIZE } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import { TILE, TILESET_KEY } from '../pixelart/tiles';
import { LOURDES_GRASS_KEY, LOURDES_GRASS_TILE_SIZE } from '../assets/terrain/lourdesGrass';
import { LOURDES_CHURCH_KEY } from '../assets/buildings/lourdesChurch';
import { LOURDES_PRESBYTERY_KEY } from '../assets/buildings/lourdesPresbytery';
import {
  CACHOT_EXTERIOR_UNIT_KEYS,
  CACHOT_EXTERIOR_UNIT_WIDTHS,
  CACHOT_EXTERIOR_CACHOT_UNIT_INDEX,
} from '../assets/buildings/lourdesCachotExterior';
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
import { Toast } from '../gameplay/Toast';
import { Caption } from '../gameplay/Caption';
import { RosaryUI } from '../gameplay/RosaryUI';
import { updateFollowerPosition } from '../gameplay/Follower';
import { LeaderNpc, type Point } from '../gameplay/LeaderNpc';
import { WanderNpc } from '../gameplay/WanderNpc';
import { MissionManager } from '../gameplay/MissionManager';
import { mission01Dialogue, MISSION_01_FIREWOOD_TARGET, MISSION_01_OBJECTIVES } from '../data/missions/mission01';
import { boyAmbientDialogue } from '../data/dialogue/ambientDialogue';
import { LOCATIONS, type LocationId } from '../data/world/locations';
import { createBlocker, depthForY, isNear } from '../gameplay/utils';
import { fadeToScene } from '../gameplay/transitions';
import { wait, tweenPromise } from '../gameplay/async';
import { textStyle } from '../ui/text';
import { useLetterboxScale } from '../core/scaleMode';

// One continuous map: the open field around the grotto sits north (low rows), the Gave de Pau
// bends from a vertical arm (east of the grotto) into a horizontal arm that forms the town's
// northern edge (crossable only via the bridge), and Le Cachot + the town sit south of that.
//
// **4x the area of the original map** (COLS/ROWS both doubled — 26x58 -> 52x116), per an explicit
// maintainer request for more breathing room: "not simply zoom the camera out... keep the current
// visual scale of the characters and environment... do not simply stretch the existing map."
// `TILE_SIZE` and every character's own display size are untouched, so this is purely more world
// to walk around in, not a rescale. The transformation used throughout this file, consistently:
// every POSITION constant (where a road/river/building/landmark sits) is doubled, which — because
// the map's own dimensions are also exactly doubled — exactly preserves each feature's fractional
// position on the map (its relative layout), satisfying "preserve current relative positions of
// landmarks." Every WIDTH/THICKNESS constant (path width, river width, building footprint sizes)
// is deliberately left unchanged, not doubled — those are visual/gameplay-scale properties tied to
// character size, not to overall map size, so doubling them too would make paths and rivers look
// oversized relative to Bernadette rather than just giving the town more room to breathe. The net
// effect is exactly what was asked for: the same relative town layout, the same-sized roads/river/
// buildings, just with much more open ground between and around everything.
const COLS = 52;
const ROWS = 116;
const MAP_W = COLS * TILE_SIZE;
const MAP_H = ROWS * TILE_SIZE;

const PATH_CENTER = 32;
const PATH_HALF_WIDTH = 1;

// Vertical arm of the river, beside the grotto. Fully blocks the player — the only crossing is
// the scripted ford cutscene, where the companions wade across and Bernadette stays behind.
// Width kept at 4 tiles (unchanged from the original map) — only its center moved (doubled) to
// keep the same relative position; see the file-level comment above for why width doesn't scale.
const RIVER_V_START = 39;
const RIVER_V_END = 42;

// Horizontal arm, the town's river boundary. Only passable through the bridge at the path. Same
// width-unchanged, center-doubled treatment as the vertical arm above.
const RIVER_H_TOP = 61;
const RIVER_H_BOTTOM = 64;

const FIELD_PATH_START_ROW = 18;
const TOWN_PLAZA_ROW_START = 72;

// Still used for the stone-plaza patch `buildTerrain()` draws (rows TOWN_PLAZA_ROW_START to
// CACHOT_ROW-2) — a town-square paving area, independent of exactly where the Cachot building
// itself sits. The building's own placement is CACHOT_BUILDING_LEFT_X/TOP_Y below, not this.
const CACHOT_ROW = 108;

// The Cachot exterior building's own placement (see `assets/buildings/lourdesCachotExterior.ts`).
// Deliberately *not* derived from CACHOT_ROW above: the old 48x40 placeholder sat right
// at presbytery's own south-east corner (barely clipping it, invisible at that tiny scale) — the
// real 5-unit terrace (241x144, roughly 5x wider) needs far more clear width than that spot has
// available between the presbytery/path/forest border. Placed instead in the open ground between
// the river's southern bank and the hospice, east of the path — the widest genuinely clear gap
// left on the map at this building's scale. `CACHOT_DOOR_X/Y` (Le Cachot's own door, the middle
// unit) is what actually drives the player-spawn/sister-spawn reference point and the walkable
// door zone below, replacing the old `cachotDoorPx` derived from CACHOT_ROW/COL.
const CACHOT_BUILDING_LEFT_X = 545;
const CACHOT_BUILDING_TOP_Y = 1060;
// Le Cachot's own door sits within the middle unit (index CACHOT_EXTERIOR_CACHOT_UNIT_INDEX),
// measured by eye against a grid-overlay crop of the source art (same technique as every other
// footprint in this file) — local to that unit's own top-left, then offset by the cumulative width
// of the units before it and CACHOT_BUILDING_LEFT_X/TOP_Y to land in world space.
const CACHOT_DOOR_LOCAL_X = 40; // within the middle unit's own 45px width
const CACHOT_DOOR_LOCAL_Y = 101; // within the building's shared 144px height
const CACHOT_DOOR_X =
  CACHOT_BUILDING_LEFT_X +
  CACHOT_EXTERIOR_UNIT_WIDTHS.slice(0, CACHOT_EXTERIOR_CACHOT_UNIT_INDEX).reduce((a, b) => a + b, 0) +
  CACHOT_DOOR_LOCAL_X;
const CACHOT_DOOR_Y = CACHOT_BUILDING_TOP_Y + CACHOT_DOOR_LOCAL_Y;

// Kept well clear of the map edges (now with a full forest border beyond them too — see
// `buildForestBorder()`) so the screen-pinned HUD never covers it.
const GROTTO_X = 256;
const GROTTO_Y = 288;
const NICHE_X = GROTTO_X + 62;
const NICHE_Y = GROTTO_Y + 19;

const FIREWOOD_SPOTS = [
  { x: 192, y: 640 },
  { x: 352, y: 768 },
  { x: 512, y: 576 },
];

// Width (4 tiles) and the GROTTO_Y-relative anchor are unchanged from the original map's own
// proportions — only repositioned to track the doubled RIVER_V_START/GROTTO_Y.
const FORD_ZONE = new Phaser.Geom.Rectangle((RIVER_V_START - 4) * TILE_SIZE, GROTTO_Y - 8, 4 * TILE_SIZE, 280);
const FAR_BANK = { sisterX: RIVER_V_END * TILE_SIZE + 24, friendX: RIVER_V_END * TILE_SIZE + 44, y: 544 };

// Jeanne leads Bernadette from the town, across the bridge, and up to the ford — where she
// naturally stops, well short of the grotto so she doesn't upstage the apparition.
const JEANNE_WAYPOINTS: Point[] = [
  { x: PATH_CENTER * TILE_SIZE, y: 88 * TILE_SIZE },
  { x: PATH_CENTER * TILE_SIZE, y: (RIVER_H_BOTTOM + 1) * TILE_SIZE + 8 },
  { x: PATH_CENTER * TILE_SIZE, y: (RIVER_H_TOP - 1) * TILE_SIZE - 8 },
  { x: PATH_CENTER * TILE_SIZE, y: 400 },
  { x: 500, y: 300 },
];
// Speed and distance thresholds are gameplay feel, not spatial layout -- deliberately left
// unchanged (she still walks at the same visual pace; the bigger map just means a longer walk).
const JEANNE_SPEED = 48;
const JEANNE_MAX_DISTANCE = 110;
const JEANNE_RESUME_DISTANCE = 55;

// Bounded area where the sister and Jeanne wander (`WanderNpc`) once they've crossed the river
// during Mission 1, "searching for firewood" instead of vanishing -- a rectangle on the far
// (east) bank, not tied to any specific spot from the original map (this behavior is new). Sized
// to the actual clear gap here: the river's east edge sits at (RIVER_V_END+1)*TILE_SIZE = 688, and
// the forest border's inner edge is FOREST_BORDER_DEPTH_TILES (3) tiles in from the map's own
// right edge (832) = 784, so there's ~96px of open field between them -- this box (700-770) sits
// within that gap with a margin on both sides, keeping the pair visibly close to the crossing
// point/Massabielle without risking wandering into the water or the tree line.
const FAR_BANK_WANDER_BOUNDS = new Phaser.Geom.Rectangle(700, FAR_BANK.y - 60, 70, 120);
const COMPANION_WANDER_SPEED = 28;

// Wander zone for the ambient village boy (`BOY_WANDER_BOUNDS`) -- a stretch of open plaza grass
// between the path (cols 31-33) and the hospice/Maison Cénac/tribunal cluster (col 40+), well
// south of the church/river/field, so he never needs to path around any collider (same "pick
// bounds that are inherently obstacle-free" approach `FAR_BANK_WANDER_BOUNDS` above already uses,
// rather than building actual pathfinding/collision-avoidance for `WanderNpc`).
const BOY_WANDER_BOUNDS = new Phaser.Geom.Rectangle(34 * TILE_SIZE, 80 * TILE_SIZE, 6 * TILE_SIZE, 20 * TILE_SIZE);
const BOY_WANDER_SPEED = 24;

interface BuildingPlacement {
  key: string;
  col: number;
  row: number;
  widthPx: number;
  heightPx: number;
  locationId: LocationId;
}

// Positions doubled along with the rest of the map (see the file-level comment above) to keep
// the same relative layout -- sizes (48x40, the shared procedural TOWN_BUILDING box) intentionally
// unchanged. The tribunal previously moved from col 5 / row 50 to here (east side, south of Maison
// Cénac) to free room for the presbytery below the church; that reasoning is unaffected by the map
// resize, so it kept the same relative spot, just doubled like everything else.
const TOWN_BUILDINGS: BuildingPlacement[] = [
  { key: PROP_KEYS.TOWN_BUILDING, col: 42, row: 76, widthPx: 48, heightPx: 40, locationId: 'hospice' },
  { key: PROP_KEYS.TOWN_BUILDING, col: 44, row: 90, widthPx: 48, heightPx: 40, locationId: 'maisonCenac' },
  { key: PROP_KEYS.TOWN_BUILDING, col: 40, row: 110, widthPx: 48, heightPx: 40, locationId: 'tribunal' },
];

/**
 * A collision rectangle as a fraction of a `SpecialBuilding`'s own displayed width/height,
 * measured by eye against the building's texture (grid-overlay crops, same technique used
 * throughout this file's asset work) -- so it automatically scales and repositions correctly
 * whenever the building's own `widthPx`/`heightPx`/`col`/`row` change, instead of needing to be
 * re-measured in absolute pixels every time the building is resized.
 */
interface FootprintRect {
  xFrac: number;
  yFrac: number;
  wFrac: number;
  hFrac: number;
}

interface SpecialBuilding {
  key: string;
  col: number;
  row: number;
  widthPx: number;
  heightPx: number;
  locationId: LocationId;
  /** Small rectangles matching the building's actual solid footprint (wall base, tree/shrub
   * trunks) -- NOT one big box over the whole sprite. Anything above/behind this footprint (the
   * roof, upper stories, tree canopies) is walkable-through for Y-sort purposes: the player only
   * visually renders behind the building while north of `col`/`row`'s own y (see
   * `addFootprintBuilding()`), and only actually collides once they reach one of these rects. */
  footprint: FootprintRect[];
}

// Church footprint (measured on the 94x122 native texture, see lourdesChurch.ts): the stone
// wall + low fence the entrance sits behind, plus the two flanking trees' trunk/base areas.
// Excludes the roof, bell tower, and tree canopies entirely -- those are tall enough in the
// sprite that a player standing "in" them (north of the building's own row) should render behind
// the building, not collide with it.
const CHURCH_FOOTPRINT: FootprintRect[] = [
  { xFrac: 0.17, yFrac: 0.754, wFrac: 0.702, hFrac: 0.213 }, // wall + fence base
  { xFrac: 0.128, yFrac: 0.779, wFrac: 0.149, hFrac: 0.123 }, // left tree trunk/base
  { xFrac: 0.723, yFrac: 0.754, wFrac: 0.234, hFrac: 0.148 }, // right tree/bush base
];

// Presbytery footprint (measured on the 100x80 native texture, see lourdesPresbytery.ts): the
// low fence/gate along the front, plus the tree cluster on the left and the tree/garden-shed
// cluster on the right.
const PRESBYTERY_FOOTPRINT: FootprintRect[] = [
  { xFrac: 0.12, yFrac: 0.75, wFrac: 0.76, hFrac: 0.2 }, // fence + gate base
  { xFrac: 0.02, yFrac: 0.625, wFrac: 0.14, hFrac: 0.2 }, // left tree cluster
  { xFrac: 0.74, yFrac: 0.5, wFrac: 0.22, hFrac: 0.325 }, // right tree/shed cluster
];

// A plain doubling of the church/presbytery's prior positions (col 0.5/0.2) would have landed them
// flush against the map's own west edge (col 0) — fine on the old 26-wide map where nothing was
// ever meant to have a forest border, but wrong on this one: "do not place houses/buildings at the
// outer edges... leave a generous empty/natural area around the edges... concentrate buildings
// more toward the interior." `WEST_BUFFER_TILES` pushes both buildings inward by the same amount so
// they keep their prior relative spacing from each other, opening up a genuine countryside gap
// between them and the forest border (`buildForestBorder()`) instead of a two-tile treeline being
// the *only* thing separating a building wall from the map edge.
const WEST_BUFFER_TILES = 7;

// The church's own position doubled like everything else (col 0.25/row 36 -> col 0.5/row 72), then
// shifted right by WEST_BUFFER_TILES per the edge-buffer reasoning above. Size unchanged (156x202,
// ~75% of Bernadette's door height, per the maintainer's prior sign-off that this was the practical
// ceiling for this art at this scale) — this round's brief didn't ask to touch the church itself.
//
// The presbytery is a deliberate exception to "keep current visual scale": doubled *again* on top
// of the map-resize doubling (156x125 -> 312x250, i.e. 2x its current size, per an explicit
// "twice as large" ask), then nudged further down from that doubled-and-enlarged spot — the map
// resize alone would have put it at col 0.5/row 98 (mirroring the church's own doubling); shifted
// to row 99 instead, and given the same WEST_BUFFER_TILES shift as the church (keeping its prior
// -0.3 relative offset from the church's own column). There's abundant room in this corridor (the
// plaza path doesn't start until col 26, and the buffer still leaves ~15 tiles of clearance before
// it), so unlike every prior presbytery change, this is just a placement choice, not another fight
// against a hard space ceiling.
const SPECIAL_BUILDINGS: SpecialBuilding[] = [
  {
    key: LOURDES_CHURCH_KEY,
    col: 0.5 + WEST_BUFFER_TILES,
    row: 72,
    widthPx: 156,
    heightPx: 202,
    locationId: 'church',
    footprint: CHURCH_FOOTPRINT,
  },
  {
    key: LOURDES_PRESBYTERY_KEY,
    col: 0.2 + WEST_BUFFER_TILES,
    row: 99,
    widthPx: 312,
    heightPx: 250,
    locationId: 'presbytery',
    footprint: PRESBYTERY_FOOTPRINT,
  },
];

// Positions doubled with the rest of the map; unchanged sizes (see the file-level comment above).
const DECOR: Array<{ key: string; col: number; row: number }> = [
  { key: PROP_KEYS.TREE, col: 4, row: 6 },
  { key: PROP_KEYS.TREE, col: 48, row: 12 },
  { key: PROP_KEYS.ROCK, col: 12, row: 44 },
  { key: PROP_KEYS.TREE, col: 6, row: 80 },
  { key: PROP_KEYS.ROCK, col: 46, row: 84 },
  { key: PROP_KEYS.TREE, col: 20, row: 112 },
];

// A ring of trees a few tiles deep around all four map edges, so the town never backs directly
// onto empty air — "the map should be surrounded by forest... the outermost areas should feel
// like the countryside/forest surrounding Lourdes." Generated (not hand-placed) since a solid
// 336-tile perimeter would mean hundreds of individual entries; spaced (not a solid wall) for a
// natural tree-line look rather than a fence, and skips any cell that would land on the river or
// the path (both of which do reach the map edges) so trees never spawn in water or on the road.
const FOREST_BORDER_DEPTH_TILES = 3;
const FOREST_BORDER_SPACING_TILES = 3;

const INTERACT_RADIUS = 26;

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
}

export class OverworldScene extends Phaser.Scene {
  private player!: Player;
  private touch!: TouchControls;
  private dialogueBox!: DialogueBox;
  private tasksPanel!: TasksPanel;
  private topBar!: GameplayTopBar;
  private interactionPrompt!: InteractionPrompt;
  private toast!: Toast;
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

  private lady!: NpcActor;
  private ladyGlow!: Phaser.GameObjects.Arc;
  private firewoodSprites: Phaser.GameObjects.Image[] = [];

  private cachotDoorZone!: Phaser.Geom.Rectangle;
  private buildings: Array<{ placement: BuildingPlacement; doorZone: Phaser.Geom.Rectangle }> = [];
  private colliderBodies: (Phaser.Types.Physics.Arcade.ImageWithStaticBody | Phaser.GameObjects.Zone)[] = [];

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
    this.colliderBodies = [];
    this.buildings = [];
    this.firewoodSprites = [];

    this.buildTerrain();

    this.touch = new TouchControls(this);

    const cachotDoorPx = { x: CACHOT_DOOR_X, y: CACHOT_DOOR_Y };
    const startY = data.fromCachot ? cachotDoorPx.y - 20 : cachotDoorPx.y + 26;
    this.player = new Player(this, cachotDoorPx.x, startY, this.touch);

    this.buildBuildings();
    this.buildDecor();
    this.buildGrotto();
    this.buildFirewood();
    this.physics.add.collider(this.player, this.colliderBodies);

    this.sister = new NpcActor(this, cachotDoorPx.x - 16, cachotDoorPx.y + 22, 'sister', 'down', SISTER_SHADOW_SCALE);
    this.sister.setVisible(MissionManager.hasReachedObjective(MISSION_01_OBJECTIVES.GATHER_FIREWOOD));
    this.sister.setDepth(depthForY(this.sister.y, DEPTH.ACTORS));

    this.friend = new NpcActor(this, PATH_CENTER * TILE_SIZE + 18, 44 * TILE_SIZE, 'friend', 'down', FRIEND_SHADOW_SCALE, true);
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

    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.dialogueBox = new DialogueBox(this);
    this.tasksPanel = new TasksPanel(this);
    this.topBar = new GameplayTopBar(this);
    this.interactionPrompt = new InteractionPrompt(this);
    this.toast = new Toast(this);
    this.rosary = new RosaryUI(this);

    this.keyE = this.input.keyboard!.addKey('E');
    this.touch.onInteract = () => this.tryInteract();
  }

  private tileToPixelCenter(col: number, row: number): { x: number; y: number } {
    return { x: col * TILE_SIZE, y: row * TILE_SIZE };
  }

  private buildTerrain(): void {
    // The map (416x928) is narrower than the camera's logical viewport (480 wide) at zoom 1, so
    // this color shows as a thin strip past the map's left/right edges whenever the camera is
    // horizontally centered or further — sampled as the new grass texture's own average color
    // (was '#8fae6b', matching the old olive-green procedural grass) so that strip blends in
    // instead of reading as a visible seam next to the new artwork.
    this.cameras.main.setBackgroundColor('#38737b');

    // The maintainer's own real grass artwork (see assets/terrain/lourdesGrass.ts) is its own
    // Tilemap layer covering the whole map, laid down *underneath* the tilemap layer built below
    // (a real Tilemap, not a TileSprite — see that file's comment for why TileSprite renders this
    // visibly soft in WebGL mode regardless of texture filtering). Every cell in the layer built
    // below defaults to `-1` (Phaser's "empty" tile — renders nothing, lets this show through)
    // unless explicitly overwritten with a path/water/stone/cave tile further down, which is how
    // grass now differs from every other terrain type: it's a base layer of its own, not a tile
    // placed per-cell like `TILE.GRASS_A`/`GRASS_B` used to be.
    const grassCols = Math.ceil(MAP_W / LOURDES_GRASS_TILE_SIZE);
    const grassRows = Math.ceil(MAP_H / LOURDES_GRASS_TILE_SIZE);
    const grassData: number[][] = Array.from({ length: grassRows }, () => Array.from({ length: grassCols }, () => 0));
    const grassMap = this.make.tilemap({
      data: grassData,
      tileWidth: LOURDES_GRASS_TILE_SIZE,
      tileHeight: LOURDES_GRASS_TILE_SIZE,
    });
    const grassTileset = grassMap.addTilesetImage(
      'lourdesGrassTile',
      LOURDES_GRASS_KEY,
      LOURDES_GRASS_TILE_SIZE,
      LOURDES_GRASS_TILE_SIZE,
      0,
      0,
    )!;
    const grassLayer = grassMap.createLayer(0, grassTileset, 0, 0)!;
    grassLayer.setDepth(DEPTH.GROUND - 1);

    const data: number[][] = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => -1));

    for (let r = FIELD_PATH_START_ROW; r < RIVER_H_TOP - 1; r++) {
      for (let c = PATH_CENTER - PATH_HALF_WIDTH; c <= PATH_CENTER + PATH_HALF_WIDTH; c++) data[r][c] = TILE.DIRT_PATH;
    }

    const grottoRow = GROTTO_Y / TILE_SIZE;
    for (let r = grottoRow - 1; r <= grottoRow + 3; r++) {
      for (let c = 7; c <= 13; c++) data[r][c] = TILE.CAVE_FLOOR;
    }

    // Vertical arm, beside the grotto — spans the whole field down to where it joins the bend.
    for (let r = 0; r < RIVER_H_BOTTOM + 2; r++) {
      data[r][RIVER_V_START - 1] = TILE.RIVERBANK;
      data[r][RIVER_V_END + 1] = TILE.RIVERBANK;
      for (let c = RIVER_V_START; c <= RIVER_V_END; c++) data[r][c] = TILE.WATER;
    }

    // Horizontal arm — the river bends to form the town's northern edge.
    for (let c = 0; c < COLS; c++) {
      data[RIVER_H_TOP - 1][c] = TILE.RIVERBANK;
      data[RIVER_H_BOTTOM + 1][c] = TILE.RIVERBANK;
      for (let r = RIVER_H_TOP; r <= RIVER_H_BOTTOM; r++) data[r][c] = TILE.WATER;
    }
    for (let r = RIVER_H_TOP - 1; r <= RIVER_H_BOTTOM + 1; r++) {
      for (let c = PATH_CENTER - PATH_HALF_WIDTH; c <= PATH_CENTER + PATH_HALF_WIDTH; c++) data[r][c] = TILE.STONE_PATH;
    }

    for (let r = RIVER_H_BOTTOM + 2; r < ROWS; r++) {
      for (let c = PATH_CENTER - PATH_HALF_WIDTH; c <= PATH_CENTER + PATH_HALF_WIDTH; c++) data[r][c] = TILE.DIRT_PATH;
    }

    for (let r = TOWN_PLAZA_ROW_START; r <= CACHOT_ROW - 2; r++) {
      for (let c = PATH_CENTER - 6; c <= PATH_CENTER + 6; c++) data[r][c] = TILE.STONE_PATH;
    }

    const map = this.make.tilemap({ data, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage('tiles', TILESET_KEY, TILE_SIZE, TILE_SIZE, 0, 0)!;
    const layer = map.createLayer(0, tileset, 0, 0)!;
    layer.setDepth(DEPTH.GROUND);

    // The vertical arm is never crossable on foot — only the scripted ford cutscene crosses it.
    const vRiverX = ((RIVER_V_START + RIVER_V_END + 1) / 2) * TILE_SIZE;
    const vRiverHeight = (RIVER_H_BOTTOM + 2) * TILE_SIZE;
    this.colliderBodies.push(
      createBlocker(this, vRiverX, vRiverHeight / 2, (RIVER_V_END - RIVER_V_START + 1) * TILE_SIZE, vRiverHeight),
    );

    // The horizontal arm is only crossable through the bridge gap at the path.
    const hRiverY = ((RIVER_H_TOP + RIVER_H_BOTTOM + 1) / 2) * TILE_SIZE;
    const hRiverHeight = (RIVER_H_BOTTOM - RIVER_H_TOP + 1) * TILE_SIZE;
    const bridgeLeft = (PATH_CENTER - PATH_HALF_WIDTH) * TILE_SIZE;
    const bridgeRight = (PATH_CENTER + PATH_HALF_WIDTH + 1) * TILE_SIZE;
    this.colliderBodies.push(createBlocker(this, bridgeLeft / 2, hRiverY, bridgeLeft, hRiverHeight));
    this.colliderBodies.push(createBlocker(this, (bridgeRight + MAP_W) / 2, hRiverY, MAP_W - bridgeRight, hRiverHeight));
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
   * Church/presbytery only: renders the building at its full displayed size (unlike
   * `addStaticProp()`, there's no single collider box scaled off that size) and instead gives it
   * one small static collider per `footprint` rectangle, so only the building's actual solid
   * base/trees block movement -- the tall roof/upper-story/canopy area above the footprint has no
   * collider at all.
   *
   * Depth sorting falls out of the existing per-frame `depthForY()` call already used everywhere
   * else in this file (`Player.update()` recomputes her own depth from her live `y` every frame;
   * `NpcActor` does the same for the shadow). Setting this building's depth *once*, from `cy` (its
   * bottom/ground-contact edge, the same anchor the footprint rects are measured against), is
   * enough: whenever the player's `y` is north of `cy` she's standing "further up the screen" than
   * the building's own ground line, so `depthForY(player.y, ...)` computes lower than
   * `depthForY(cy, ...)` and Phaser draws her behind the building; south of `cy`, the inequality
   * flips and she draws in front. No per-frame work needed on the building's side, and no special
   * case in Player.ts -- this is the same trick every other static prop in this file already uses
   * (`addStaticProp()`'s `image.setDepth(depthForY(y, DEPTH.ACTORS))`), just paired with a
   * footprint-shaped collider instead of one box so the behind/in-front illusion actually has room
   * to read: the player can get close enough to the upper part of the sprite (roof, tower, tree
   * canopies) to visually go behind it before hitting anything solid.
   */
  private addFootprintBuilding(building: SpecialBuilding): void {
    const px = this.tileToPixelCenter(building.col, building.row);
    const cx = px.x + building.widthPx / 2;
    const cy = px.y + building.heightPx;

    const image = this.add.image(cx, cy, building.key).setOrigin(0.5, 1);
    image.setDisplaySize(building.widthPx, building.heightPx);
    image.setDepth(depthForY(cy, DEPTH.ACTORS));

    building.footprint.forEach((r) => {
      const rw = r.wFrac * building.widthPx;
      const rh = r.hFrac * building.heightPx;
      const rx = px.x + r.xFrac * building.widthPx + rw / 2;
      const ry = px.y + r.yFrac * building.heightPx + rh / 2;
      this.colliderBodies.push(createBlocker(this, rx, ry, rw, rh));
    });

    this.add
      .text(cx, px.y - 6, Localization.t(LOCATIONS[building.locationId].nameKey), textStyle({ fontSize: '9px', color: '#3a3226' }))
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY_LOW);

    // Door zone centered on the footprint's main wall/fence rect (the first entry) rather than the
    // generic proportional formula `addStaticProp()`'s callers use -- that formula assumes the
    // door sits near the bottom-center of the whole sprite, which is no longer a safe assumption
    // now the collision footprint (and the real door within it) can sit anywhere in the frame.
    const doorRect = building.footprint[0];
    const doorZone = new Phaser.Geom.Rectangle(
      px.x + doorRect.xFrac * building.widthPx,
      px.y + doorRect.yFrac * building.heightPx,
      doorRect.wFrac * building.widthPx,
      doorRect.hFrac * building.heightPx,
    );
    this.buildings.push({ placement: building, doorZone });
  }

  /**
   * Le Cachot's map building: 5 separate images (one per row-house unit, see
   * `assets/buildings/lourdesCachotExterior.ts`'s own doc comment for why it's sliced rather than
   * one image), placed edge-to-edge so they read as a single terrace row. Each unit gets its own
   * Y-sort depth (their own wall/ground line sits at meaningfully different screen-Y per unit, this
   * being a much wider building than church/presbytery) and its own footprint colliders, following
   * the same `depthForY(groundLine, DEPTH.ACTORS)` + `createBlocker()` pattern
   * `addFootprintBuilding()` uses for those, just applied per-unit instead of once for the whole
   * building. Only the middle unit is Le Cachot: its own footprint gets a gap at the door (so it's
   * walkable) and drives `this.cachotDoorZone` (unchanged downstream — `update()`/`tryInteract()`
   * still just check that one rectangle, exactly as before this building was replaced). The other 4
   * units are solid background architecture only: footprint-collided and depth-sorted like the
   * middle one, but no label, no door gap, no interaction.
   */
  private buildCachotExterior(): void {
    // Each unit's own wall/ground line, measured by eye against the source art (a grid-overlay
    // crop, same technique as every other footprint in this file) -- the whole row recedes upward
    // in screen-Y from left to right in this isometric art, so this can't be one shared value the
    // way it can for the much-narrower church/presbytery.
    const groundLineY = [98, 90, 82, 73, 65];
    const bandHalfHeight = 7;

    let cumulativeX = CACHOT_BUILDING_LEFT_X;
    CACHOT_EXTERIOR_UNIT_KEYS.forEach((key, i) => {
      const unitW = CACHOT_EXTERIOR_UNIT_WIDTHS[i];
      const unitX = cumulativeX;
      const unitY = CACHOT_BUILDING_TOP_Y;
      const groundY = unitY + groundLineY[i];

      this.add.image(unitX, unitY, key).setOrigin(0, 0).setDepth(depthForY(groundY, DEPTH.ACTORS));

      if (i === CACHOT_EXTERIOR_CACHOT_UNIT_INDEX) {
        // Split the wall collider around the door gap instead of one solid band across the unit.
        const doorLeft = unitX + CACHOT_DOOR_LOCAL_X - 4;
        const doorRight = unitX + CACHOT_DOOR_LOCAL_X + 4;
        if (doorLeft > unitX) {
          const w = doorLeft - unitX;
          this.colliderBodies.push(createBlocker(this, unitX + w / 2, groundY, w, bandHalfHeight * 2));
        }
        if (unitX + unitW > doorRight) {
          const w = unitX + unitW - doorRight;
          this.colliderBodies.push(createBlocker(this, doorRight + w / 2, groundY, w, bandHalfHeight * 2));
        }

        this.cachotDoorZone = new Phaser.Geom.Rectangle(doorLeft, groundY - bandHalfHeight, doorRight - doorLeft, bandHalfHeight * 2 + 20);
        this.add
          .text(unitX + unitW / 2, unitY - 6, Localization.t(K.LOCATION_CACHOT), textStyle({ fontSize: '9px', color: '#3a3226' }))
          .setOrigin(0.5)
          .setDepth(DEPTH.OVERLAY_LOW);
      } else {
        this.colliderBodies.push(createBlocker(this, unitX + unitW / 2, groundY, unitW, bandHalfHeight * 2));
      }

      cumulativeX += unitW;
    });
  }

  private buildBuildings(): void {
    this.buildCachotExterior();

    SPECIAL_BUILDINGS.forEach((building) => this.addFootprintBuilding(building));

    // Hospice, Maison Cénac, and the tribunal -- still the shared procedural TOWN_BUILDING box at
    // its native 48x40 size, one big collider each via addStaticProp() as before. Only the church
    // and presbytery (now in SPECIAL_BUILDINGS above) needed the bigger real-art display size and
    // the footprint-shaped collision.
    TOWN_BUILDINGS.forEach((placement) => {
      const px = this.tileToPixelCenter(placement.col, placement.row);
      const cx = px.x + placement.widthPx / 2;
      const cy = px.y + placement.heightPx;
      this.addStaticProp(placement.key, cx, cy, placement.widthPx, placement.heightPx);
      this.add
        .text(cx, px.y - 6, Localization.t(LOCATIONS[placement.locationId].nameKey), textStyle({ fontSize: '9px', color: '#3a3226' }))
        .setOrigin(0.5)
        .setDepth(DEPTH.OVERLAY_LOW);
      const doorZoneWidth = placement.widthPx * 0.5;
      const doorZoneHeight = placement.heightPx * 0.35;
      const doorZoneOffsetY = placement.heightPx * 0.2;
      const doorZone = new Phaser.Geom.Rectangle(
        cx - doorZoneWidth / 2,
        cy - doorZoneOffsetY,
        doorZoneWidth,
        doorZoneHeight,
      );
      this.buildings.push({ placement, doorZone });
    });
  }

  private buildDecor(): void {
    DECOR.forEach(({ key, col, row }) => {
      const px = this.tileToPixelCenter(col, row);
      this.addStaticProp(key, px.x, px.y, TILE_SIZE, TILE_SIZE * 1.5);
    });
    this.buildForestBorder();
  }

  /** A cell counts as "river or path" for forest-border purposes if it falls in the river's own
   * column band (the vertical arm), the river's own row band (the horizontal arm — which, like
   * the vertical arm, reaches every map edge), or the path's column band (which also reaches the
   * top and bottom edges) — each with a 1-tile buffer so trees don't spawn touching the water/road
   * either. Deliberately approximate (matches the *bands* these features occupy, not their exact
   * cell-by-cell shape) since this only needs to keep decor off the water/road, not be pixel-exact. */
  private isRiverOrPathBand(col: number, row: number): boolean {
    const inVerticalRiver = col >= RIVER_V_START - 1 && col <= RIVER_V_END + 1;
    const inHorizontalRiver = row >= RIVER_H_TOP - 1 && row <= RIVER_H_BOTTOM + 1;
    const inPathColumn = col >= PATH_CENTER - PATH_HALF_WIDTH - 1 && col <= PATH_CENTER + PATH_HALF_WIDTH + 1;
    return inVerticalRiver || inHorizontalRiver || inPathColumn;
  }

  private buildForestBorder(): void {
    const placed = new Set<string>();
    const tryPlace = (col: number, row: number) => {
      if (col < 0 || col >= COLS || row < 0 || row >= ROWS) return;
      const key = `${col},${row}`;
      if (placed.has(key) || this.isRiverOrPathBand(col, row)) return;
      placed.add(key);
      const px = this.tileToPixelCenter(col, row);
      this.addStaticProp(PROP_KEYS.TREE, px.x, px.y, TILE_SIZE, TILE_SIZE * 1.5);
    };

    for (let c = 0; c < COLS; c += FOREST_BORDER_SPACING_TILES) {
      for (let d = 0; d < FOREST_BORDER_DEPTH_TILES; d++) {
        tryPlace(c, d);
        tryPlace(c, ROWS - 1 - d);
      }
    }
    for (let r = 0; r < ROWS; r += FOREST_BORDER_SPACING_TILES) {
      for (let d = 0; d < FOREST_BORDER_DEPTH_TILES; d++) {
        tryPlace(d, r);
        tryPlace(COLS - 1 - d, r);
      }
    }
  }

  private buildGrotto(): void {
    const image = this.add.image(GROTTO_X, GROTTO_Y, PROP_KEYS.GROTTO).setOrigin(0, 0);
    image.setDepth(depthForY(GROTTO_Y + 64, DEPTH.ACTORS));
    const body = this.physics.add.staticImage(GROTTO_X + 48, GROTTO_Y + 40, PROP_KEYS.GROTTO);
    body.setVisible(false);
    body.body.setSize(90, 50);
    this.colliderBodies.push(body);
  }

  private buildFirewood(): void {
    FIREWOOD_SPOTS.forEach(({ x, y }) => {
      const sprite = this.add.image(x, y, PROP_KEYS.FIREWOOD).setOrigin(0.5, 1);
      sprite.setDepth(depthForY(y, DEPTH.ACTORS));
      this.firewoodSprites.push(sprite);
    });
  }

  update(time: number, delta: number): void {
    const uiBlocked = this.dialogueBox.isActive() || this.tasksPanel.isOpen() || this.topBar.isBlocking();
    const exploring = this.phase === 'explore' && !uiBlocked;
    this.player.setLocked(!exploring);
    this.player.update(time);

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
    this.sisterWander?.update(delta, DEPTH.ACTORS);
    this.friendWander?.update(delta, DEPTH.ACTORS);
    this.boyWander?.update(delta, DEPTH.ACTORS);

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
      this.interactionPrompt.showAt(this.friend.x, this.friend.y - 26, Localization.t(K.INTERACT_TALK));
      return;
    }

    // Ambient chat, always available (no mission gating, no one-time flag) -- checked ahead of the
    // Cachot door/building prompts below only because it's the more specific/closer target when both
    // happen to be in range at once; in practice the two are far enough apart that this rarely matters.
    if (isNear(player, this.boy, INTERACT_RADIUS)) {
      this.interactionPrompt.showAt(this.boy.x, this.boy.y - 20, Localization.t(K.INTERACT_TALK));
      return;
    }

    if (Phaser.Geom.Rectangle.Contains(this.cachotDoorZone, player.x, player.y)) {
      this.interactionPrompt.showAt(player.x, player.y - 24, Localization.t(K.INTERACT_TALK));
      return;
    }

    for (const building of this.buildings) {
      if (Phaser.Geom.Rectangle.Contains(building.doorZone, player.x, player.y)) {
        this.interactionPrompt.showAt(player.x, player.y - 24, Localization.t(K.COMMON_INTERACT));
        return;
      }
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
      // (he stays put, keeps wandering once the box closes). Repeatable on every interaction.
      this.dialogueBox.start(boyAmbientDialogue);
      return;
    }

    if (Phaser.Geom.Rectangle.Contains(this.cachotDoorZone, player.x, player.y)) {
      fadeToScene(this, SCENE_KEYS.CACHOT);
      return;
    }

    for (const building of this.buildings) {
      if (Phaser.Geom.Rectangle.Contains(building.doorZone, player.x, player.y)) {
        this.toast.show(Localization.t(K.LOCATION_LOCKED_NOTE));
        return;
      }
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
      fontFamily: 'Georgia, serif',
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
      { fontFamily: 'Georgia, serif', fontSize: '16px', color: '#fffaf0', align: 'center' },
      DEPTH.FADE + 1,
    );
    const titleCaption = new Caption(
      this,
      GAME_HEIGHT / 2 + 14,
      { fontFamily: 'Georgia, serif', fontSize: '13px', color: '#c9beac', align: 'center' },
      DEPTH.FADE + 1,
    );

    await dateCaption.show(Localization.t(K.APPARITION_DATE_CARD), 2000, 700);
    await titleCaption.show(Localization.t(K.APPARITION_TITLE_CARD), 2200, 700);

    MissionManager.completeMission();
    this.scene.start(SCENE_KEYS.MISSION_COMPLETE);
  }
}
