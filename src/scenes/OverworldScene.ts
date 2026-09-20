import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT, DEPTH, TILE_SIZE } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import { TILE, TILESET_KEY } from '../pixelart/tiles';
import { LOURDES_GRASS_KEY, LOURDES_GRASS_TILE_SIZE } from '../assets/terrain/lourdesGrass';
import {
  TOWN_NATIVE_WIDTH,
  TOWN_NATIVE_HEIGHT,
  TOWN_SCALE,
  TOWN_GROUND_KEY,
  TOWN_BUILDINGS,
  CACHOT_BUILDING,
  CACHOT_DOOR_LOCAL_X,
  CACHOT_DOOR_LOCAL_BOTTOM_Y,
  CACHOT_DOOR_HALF_WIDTH,
  type TownBuildingDef,
} from '../assets/town/lourdesTown';
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
import { textStyle } from '../ui/text';
import { useLetterboxScale } from '../core/scaleMode';

// One continuous map: the open field around the grotto sits north (low rows), the Gave de Pau
// bends from a vertical arm (east of the grotto) into a horizontal arm that forms the town's
// northern edge (crossable only via the bridge), and the town — the maintainer's own single
// painted PNG (see `assets/town/lourdesTown.ts`) — sits south of that, with Le Cachot as the
// grey-roofed house within it.
//
// **The town PNG is displayed at TOWN_SCALE (1.5x) its native size**, a real world-space
// enlargement, not a camera zoom -- halved from an earlier 3x per an explicit "too large, reduce
// to 50% of its current size" ask (i.e. 1.5x native, not 1.5x of the 3x display). The PNG's own
// pixels are completely untouched either way; only `setDisplaySize`'s target changes, still plain
// nearest-neighbor. The map is sized to fit the PNG at whatever TOWN_SCALE currently is (COLS/ROWS
// below), not the other way around -- shrinking TOWN_SCALE is why the map is smaller again too,
// not a separate map-size decision.
//
// **The whole north cluster (path, river, grotto, ford) is shifted east by OFFSET_X_TILES**, as one
// rigid block — nothing about its own internal layout changes, only its position — so the bridge
// lands under the town PNG's own painted path opening at the top of the image instead of at the
// map's old, now-mostly-empty west side. This is why every north-side X coordinate below adds
// OFFSET_X_TILES/OFFSET_X: PATH_CENTER, the river's vertical arm, the grotto/niche/firewood spots,
// the ford zone and far-bank wander box. Every Y coordinate is untouched. OFFSET_X_TILES scales
// down along with TOWN_SCALE (the bridge needs to land under the same painted path opening, which
// is now closer to the town PNG's own left edge in world space).
const OFFSET_X_TILES = 45;
const OFFSET_X = OFFSET_X_TILES * TILE_SIZE;

// World placement of the town PNG's own native top-left corner (see `assets/town/lourdesTown.ts`).
// Chosen so the painted path opening at the top of the image (native x ~750) lands almost exactly
// under the bridge once the north cluster is shifted by OFFSET_X below (1225 vs 1232 — 7px, well
// under a tile) — the two are derived from the same OFFSET_X_TILES choice, not independently tuned.
const TOWN_X0 = 100;
const TOWN_Y0 = 1050;

const COLS = 160;
const ROWS = 168;
const MAP_W = COLS * TILE_SIZE;
const MAP_H = ROWS * TILE_SIZE;

const PATH_CENTER = 32 + OFFSET_X_TILES;
const PATH_HALF_WIDTH = 1;

// Vertical arm of the river, beside the grotto. Fully blocks the player — the only crossing is
// the scripted ford cutscene, where the companions wade across and Bernadette stays behind.
const RIVER_V_START = 39 + OFFSET_X_TILES;
const RIVER_V_END = 42 + OFFSET_X_TILES;

// Horizontal arm, the town's river boundary. Only passable through the bridge at the path.
const RIVER_H_TOP = 61;
const RIVER_H_BOTTOM = 64;

const FIELD_PATH_START_ROW = 18;
const CAVE_FLOOR_COL_START = 7 + OFFSET_X_TILES;
const CAVE_FLOOR_COL_END = 13 + OFFSET_X_TILES;

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

// Jeanne starts near Le Cachot (on the open plaza between the fountain and Le Cachot's own door,
// clear of both their colliders), waits for Bernadette to meet her there, then leads her north
// through the town's own painted path — first threading west of the central manor (the only
// direction with a clear, collider-free corridor all the way up to the town's own path opening at
// the top of the PNG), then across the bridge and up to the ford, where she naturally stops well
// short of the grotto so she doesn't upstage the apparition. `LeaderNpc` walks each leg as a
// straight line with no obstacle avoidance, so every waypoint (and the straight segment leading to
// it) was chosen to stay clear of every town building's own collider footprint.
const JEANNE_SPAWN = { x: TOWN_X0 + 820 * TOWN_SCALE, y: TOWN_Y0 + 700 * TOWN_SCALE };
const JEANNE_WAYPOINTS: Point[] = [
  { x: TOWN_X0 + 480 * TOWN_SCALE, y: TOWN_Y0 + 690 * TOWN_SCALE },
  { x: TOWN_X0 + 420 * TOWN_SCALE, y: TOWN_Y0 + 400 * TOWN_SCALE },
  { x: TOWN_X0 + 700 * TOWN_SCALE, y: TOWN_Y0 + 50 * TOWN_SCALE },
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

// Wander zone for the ambient village boy — a small patch of open plaza just north of the
// fountain, clear of the fountain's own collider, Le Cachot's, and every neighboring house's
// footprint (same "pick bounds that are inherently obstacle-free" approach `FAR_BANK_WANDER_BOUNDS`
// above already uses, rather than building actual pathfinding/collision-avoidance for `WanderNpc`).
const BOY_WANDER_BOUNDS = new Phaser.Geom.Rectangle(
  TOWN_X0 + 660 * TOWN_SCALE,
  TOWN_Y0 + 700 * TOWN_SCALE,
  100 * TOWN_SCALE,
  60 * TOWN_SCALE,
);
const BOY_WANDER_SPEED = 24;

// Fountain collider — the town's only other (non-house) collidable object, per the maintainer's
// explicit "only houses and the fountain, nothing else" ask. Measured by eye against the source
// PNG as a rect closely matching the actual stone basin (not its wider decorative walkway ring,
// which stays freely walkable), native x:[705,825] y:[612,688], converted to world space and left
// in the ground layer (see `buildTown()`) rather than sliced into its own depth-sorted sprite —
// short enough that a fixed "always behind the player" rendering doesn't read as wrong.
const FOUNTAIN_COLLIDER = {
  x: TOWN_X0 + 765 * TOWN_SCALE,
  y: TOWN_Y0 + 650 * TOWN_SCALE,
  w: 120 * TOWN_SCALE,
  h: 76 * TOWN_SCALE,
};

// Every town building except Le Cachot gets the same generic footprint: a band near the bottom of
// its own bounding box (the wall base, below the tall roof/chimneys that a player should be able
// to walk behind) spanning most of its width (clear of the roof's own eaves/corners). Not one giant
// rectangle over the whole sprite -- matches the "solid lower portion blocks, upper portion is
// walk-behind" ask uniformly across all ~16 buildings without needing a hand-measured footprint
// per building the way the old church/presbytery footprints were.
const TOWN_FOOTPRINT_X_FRAC = { min: 0.15, max: 0.85 };
const TOWN_FOOTPRINT_Y_FRAC = { min: 0.7, max: 0.95 };

// Le Cachot's own door, in world space — drives the walkable door-gap in its collider (below) and
// the exact spot Bernadette lands at exiting `CachotScene`: "directly underneath the middle door,"
// not to the side or at an arbitrary position.
const CACHOT_DOOR_X = TOWN_X0 + (CACHOT_BUILDING.x + CACHOT_DOOR_LOCAL_X) * TOWN_SCALE;
const CACHOT_DOOR_Y = TOWN_Y0 + (CACHOT_BUILDING.y + CACHOT_DOOR_LOCAL_BOTTOM_Y) * TOWN_SCALE;

// Positions unrelated to the town-building relayout above; unchanged sizes. Trees removed from
// this list entirely (see `DECOR`'s own doc comment below) -- what's left is just the two rocks.
const DECOR: Array<{ key: string; col: number; row: number }> = [{ key: PROP_KEYS.ROCK, col: 12 + OFFSET_X_TILES, row: 44 }];

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

    this.buildTerrain();

    this.touch = new TouchControls(this);

    // Exiting Le Cachot (fromCachot) lands her a few px north of the door, directly under the
    // door's own horizontal center (CACHOT_DOOR_X) -- not to the side or at an arbitrary spot.
    const startY = data.fromCachot ? CACHOT_DOOR_Y - 24 : CACHOT_DOOR_Y + 30;
    this.player = new Player(this, CACHOT_DOOR_X, startY, this.touch);

    this.buildTown();
    this.buildDecor();
    this.buildGrotto();
    this.buildFirewood();
    this.physics.add.collider(this.player, this.colliderBodies);

    this.sister = new NpcActor(this, CACHOT_DOOR_X - 30, CACHOT_DOOR_Y + 26, 'sister', 'down', SISTER_SHADOW_SCALE);
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
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.dialogueBox = new DialogueBox(this);
    this.tasksPanel = new TasksPanel(this);
    this.topBar = new GameplayTopBar(this);
    this.interactionPrompt = new InteractionPrompt(this);
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

    // Organic dirt trail instead of a fixed-width rectangular strip of path tiles -- "I don't like
    // the current square path design... more natural, organic ground/path appearance." A per-row
    // half-width that wanders between 1-3 tiles (a deterministic wave, not true randomness, same
    // "no noise" convention `pixelart/tiles.ts`'s own SPECKLE table already uses for texture) gives
    // the trail an uneven, worn-footpath edge; `edgeIsWorn()` then randomly (again, deterministically)
    // thins individual tiles right at that wandering edge so it never reads as a clean rectangle at
    // any width. Still the same `TILE.DIRT_PATH`/`TILE.STONE_PATH` textures -- no new art -- just
    // applied with an irregular footprint instead of a straight-sided band.
    const organicHalfWidthAt = (along: number): number => {
      const wave = Math.sin(along * 0.31) + Math.sin(along * 0.12 + 1.6) * 0.6;
      return wave > 0.5 ? 3 : wave > -0.4 ? 2 : 1;
    };
    const edgeIsWorn = (a: number, b: number): boolean => (a * 7 + b * 13) % 5 === 0;
    const stampOrganicPathRows = (rowStart: number, rowEnd: number, center: number, tile: number): void => {
      for (let r = rowStart; r <= rowEnd; r++) {
        const halfWidth = organicHalfWidthAt(r);
        for (let c = center - halfWidth; c <= center + halfWidth; c++) {
          if (c < 0 || c >= COLS) continue;
          const atEdge = c === center - halfWidth || c === center + halfWidth;
          if (atEdge && edgeIsWorn(r, c)) continue;
          data[r][c] = tile;
        }
      }
    };

    stampOrganicPathRows(FIELD_PATH_START_ROW, RIVER_H_TOP - 2, PATH_CENTER, TILE.DIRT_PATH);

    const grottoRow = GROTTO_Y / TILE_SIZE;
    for (let r = grottoRow - 1; r <= grottoRow + 3; r++) {
      for (let c = CAVE_FLOOR_COL_START; c <= CAVE_FLOOR_COL_END; c++) data[r][c] = TILE.CAVE_FLOOR;
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
    // The bridge itself stays a plain fixed-width stone crossing (it's a built structure, not a
    // worn footpath -- an organic edge here would just look like a crumbling bridge) at the
    // original PATH_HALF_WIDTH, not the wider organic trail either side of it.
    for (let r = RIVER_H_TOP - 1; r <= RIVER_H_BOTTOM + 1; r++) {
      for (let c = PATH_CENTER - PATH_HALF_WIDTH; c <= PATH_CENTER + PATH_HALF_WIDTH; c++) data[r][c] = TILE.STONE_PATH;
    }

    // No tile-stamped path south of the bridge: the town's own painted path (part of the single
    // town PNG placed in `buildTown()`) takes over immediately south of the riverbank -- "remove
    // the square path tiles... more natural, organic ground/path appearance" is now satisfied by
    // that hand-painted artwork rather than a second, redundant tile-based path system underneath
    // it. The organic dirt trail above is still used for the open field north of the river, where
    // there's no painted art to replace it.

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
   * The town's ground layer (paths, open sand, the fountain, every building's own hole already cut
   * out — see `assets/town/lourdesTown.ts`), placed once at the town's world origin and displayed
   * at TOWN_SCALE. Sits just below `DEPTH.GROUND` (the field's tile-based terrain layer built in
   * `buildTerrain()`) and above the grass layer (`DEPTH.GROUND - 1`) -- "grass, then the town PNG,
   * then (later) the river/Massabielle/grotto PNG above that" -- so this one call is also where
   * that whole layer-order contract lives.
   */
  private buildTownGround(): void {
    const image = this.add.image(TOWN_X0, TOWN_Y0, TOWN_GROUND_KEY).setOrigin(0, 0);
    image.setDisplaySize(TOWN_NATIVE_WIDTH * TOWN_SCALE, TOWN_NATIVE_HEIGHT * TOWN_SCALE);
    image.setDepth(DEPTH.GROUND - 0.5);

    this.colliderBodies.push(
      createBlocker(this, FOUNTAIN_COLLIDER.x, FOUNTAIN_COLLIDER.y, FOUNTAIN_COLLIDER.w, FOUNTAIN_COLLIDER.h),
    );
  }

  /**
   * One generic town building (every one of `TOWN_BUILDINGS` except Le Cachot, handled separately
   * by `buildCachotHouse()` below): its own sliced crop (see `assets/town/lourdesTown.ts`), placed
   * at its native rect's world position/size, with a single footprint-band collider near its own
   * base (`TOWN_FOOTPRINT_X_FRAC`/`TOWN_FOOTPRINT_Y_FRAC`) rather than one box over the whole
   * sprite -- the tall roof/chimneys above that band have no collider, so the player can walk
   * behind them.
   *
   * Depth sorting falls out of the existing per-frame `depthForY()` call already used everywhere
   * else in this file (`Player.update()` recomputes her own depth from her live `y` every frame).
   * Setting this building's depth *once*, from its own bottom/ground-contact edge (the same anchor
   * the footprint band is measured against), is enough: whenever the player's `y` is north of that
   * edge she's standing "further up the screen" than the building's own ground line, so
   * `depthForY(player.y, ...)` computes lower and Phaser draws her behind the building; south of
   * it, the inequality flips and she draws in front.
   */
  private addTownBuilding(def: TownBuildingDef): void {
    const wx = TOWN_X0 + def.x * TOWN_SCALE;
    const wy = TOWN_Y0 + def.y * TOWN_SCALE;
    const ww = def.w * TOWN_SCALE;
    const wh = def.h * TOWN_SCALE;
    const groundY = wy + wh;

    this.add.image(wx, wy, def.key).setOrigin(0, 0).setDisplaySize(ww, wh).setDepth(depthForY(groundY, DEPTH.ACTORS));

    const fx0 = wx + TOWN_FOOTPRINT_X_FRAC.min * ww;
    const fx1 = wx + TOWN_FOOTPRINT_X_FRAC.max * ww;
    const fy0 = wy + TOWN_FOOTPRINT_Y_FRAC.min * wh;
    const fy1 = wy + TOWN_FOOTPRINT_Y_FRAC.max * wh;
    this.colliderBodies.push(createBlocker(this, (fx0 + fx1) / 2, (fy0 + fy1) / 2, fx1 - fx0, fy1 - fy0));
  }

  /**
   * Le Cachot: the grey-roofed house in the town PNG, the only building with an interior. Same
   * placement/depth as `addTownBuilding()`, but its footprint collider is split around a walkable
   * door gap (its own door, measured within the crop — see `CACHOT_DOOR_LOCAL_X/BOTTOM_Y`) instead
   * of one solid band, and it drives `this.cachotDoorZone` (unchanged downstream —
   * `handlePrompts()`/`tryInteract()` just check that one rectangle).
   */
  private buildCachotHouse(): void {
    const def = CACHOT_BUILDING;
    const wx = TOWN_X0 + def.x * TOWN_SCALE;
    const wy = TOWN_Y0 + def.y * TOWN_SCALE;
    const ww = def.w * TOWN_SCALE;
    const wh = def.h * TOWN_SCALE;
    const groundY = wy + wh;

    this.add.image(wx, wy, def.key).setOrigin(0, 0).setDisplaySize(ww, wh).setDepth(depthForY(groundY, DEPTH.ACTORS));

    const bandY0 = wy + 0.67 * wh;
    const bandY1 = wy + 0.86 * wh;
    const doorHalfWidth = CACHOT_DOOR_HALF_WIDTH * TOWN_SCALE;
    const doorLeft = CACHOT_DOOR_X - doorHalfWidth;
    const doorRight = CACHOT_DOOR_X + doorHalfWidth;
    const fx0 = wx + TOWN_FOOTPRINT_X_FRAC.min * ww;
    const fx1 = wx + TOWN_FOOTPRINT_X_FRAC.max * ww;

    if (doorLeft > fx0) {
      this.colliderBodies.push(createBlocker(this, (fx0 + doorLeft) / 2, (bandY0 + bandY1) / 2, doorLeft - fx0, bandY1 - bandY0));
    }
    if (fx1 > doorRight) {
      this.colliderBodies.push(createBlocker(this, (doorRight + fx1) / 2, (bandY0 + bandY1) / 2, fx1 - doorRight, bandY1 - bandY0));
    }

    this.cachotDoorZone = new Phaser.Geom.Rectangle(doorLeft, bandY0 - 6, doorRight - doorLeft, bandY1 - bandY0 + 30);
    this.add
      .text(CACHOT_DOOR_X, wy - 6, Localization.t(K.LOCATION_CACHOT), textStyle({ fontSize: '9px', color: '#3a3226' }))
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY_LOW);
  }

  private buildTown(): void {
    this.buildTownGround();
    TOWN_BUILDINGS.forEach((def) => this.addTownBuilding(def));
    this.buildCachotHouse();
  }

  private buildDecor(): void {
    DECOR.forEach(({ key, col, row }) => {
      const px = this.tileToPixelCenter(col, row);
      this.addStaticProp(key, px.x, px.y, TILE_SIZE, TILE_SIZE * 1.5);
    });
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
