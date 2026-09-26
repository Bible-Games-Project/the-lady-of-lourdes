import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT, DEPTH, TILE_SIZE } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import { TILE, TILESET_KEY } from '../pixelart/tiles';
import { LOURDES_GRASS_KEY, LOURDES_GRASS_TILE_SIZE } from '../assets/terrain/lourdesGrass';
import { TOWN_TERRAIN_KEY, TOWN_TERRAIN_NATIVE_WIDTH, TOWN_TERRAIN_NATIVE_HEIGHT } from '../assets/terrain/lourdesTownTerrain';
import { SISTER_FRAME_HEIGHT } from '../assets/npc/sisterSprite';
import { JEANNE_FRAME_HEIGHT } from '../assets/npc/jeanneSprite';
import { BOY_FRAME_HEIGHT } from '../assets/npc/boySprite';
import { PROP_KEYS } from '../pixelart/props';
import { BUILDING_KEYS, BUILDING_NATIVE_SIZE } from '../assets/buildings/lourdesBuildings';
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

// One continuous map: the open field around the grotto sits north (low rows), the Gave de Pau
// bends from a vertical arm (east of the grotto) into a horizontal arm that forms the town's
// northern edge (crossable only via the bridge), and the town sits south of that.
//
// **The single large painted town PNG has been removed entirely** (per an explicit "I do NOT want
// to use the single large town/city PNG anymore" ask — a full reversal of that earlier approach,
// not a patch on top of it). The area south of the river is now plain open grass — the same grass
// layer built in `buildTerrain()` below, completely untouched — with no buildings, no fountain, and
// no colliders placed in it. Individual building PNGs (each with a filename that is the sole source
// of truth for what it is and where it goes — never guessed from the artwork) will be added here
// one at a time in a future pass; until then this whole band is intentionally empty.
//
// **The north cluster (path, river, grotto, ford) keeps the eastward shift (OFFSET_X_TILES) left
// over from when it was aligned under the removed town PNG's own painted path opening.** That
// cluster — and every coordinate below that adds OFFSET_X_TILES/OFFSET_X — is explicitly out of
// scope for this cleanup (the river/Massabielle/grotto system must stay untouched), so the offset
// stays exactly as-is rather than being re-tuned for a town layout that doesn't exist yet.
const OFFSET_X_TILES = 45;
const OFFSET_X = OFFSET_X_TILES * TILE_SIZE;

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

// Le Cachot's connection point to `CachotScene` — kept exactly where it was when it was still a
// placeholder (no derived building art existed yet), rather than moved to wherever the real
// exterior's own painted door happens to sit. The real `LE_CACHOT_EXTERIOR` art (see
// `buildTownBuildings()` below) is now anchored so its own door lines up with this existing zone
// instead, so the enter/exit plumbing (`buildCachotEntrance()` below, `CachotScene.ts`'s
// `fromCachot` exit) needed no changes at all.
const CACHOT_DOOR_X = PATH_CENTER * TILE_SIZE;
const CACHOT_DOOR_Y = (RIVER_H_BOTTOM + 10) * TILE_SIZE;

// Individual building placements in the town area — see `buildTownBuildings()`'s own doc comment
// for the footprint-collider convention every entry here follows, and `assets/buildings/
// lourdesBuildings.ts` for which reference-map location each key is inferred to be. Positions are
// spaced around CACHOT_DOOR_X/Y with clear gaps from each other and from the existing NPC
// wander/waypoint zones (BOY_WANDER_BOUNDS, JEANNE_SPAWN/JEANNE_WAYPOINTS below), and deliberately
// don't fill the whole town-terrain patch — plenty of open ground is left for the further building
// batches the maintainer has said are still coming.
interface TownBuildingSpec {
  key: string;
  x: number;
  y: number;
  displayWidth: number;
  displayHeight: number;
  /** Footprint collider, as fractions of the *display* size, centered on the building's own
   * horizontal center and sitting just above its bottom edge (see `buildTownBuildings()`). */
  footprintWidthFrac: number;
  footprintHeightFrac: number;
}

const LE_CACHOT_DISPLAY_H = 76;
const LE_CACHOT_DISPLAY_W = (LE_CACHOT_DISPLAY_H * BUILDING_NATIVE_SIZE[BUILDING_KEYS.LE_CACHOT_EXTERIOR].width) / BUILDING_NATIVE_SIZE[BUILDING_KEYS.LE_CACHOT_EXTERIOR].height;

const MOULIN_DISPLAY_H = 132;
const MOULIN_DISPLAY_W = (MOULIN_DISPLAY_H * BUILDING_NATIVE_SIZE[BUILDING_KEYS.MOULIN_DE_BOLY].width) / BUILDING_NATIVE_SIZE[BUILDING_KEYS.MOULIN_DE_BOLY].height;

const HOSPICE_DISPLAY_H = 104;
const HOSPICE_DISPLAY_W = (HOSPICE_DISPLAY_H * BUILDING_NATIVE_SIZE[BUILDING_KEYS.HOSPICE].width) / BUILDING_NATIVE_SIZE[BUILDING_KEYS.HOSPICE].height;

const TOWN_BUILDINGS: TownBuildingSpec[] = [
  // Anchored so the art's own door sits at the pre-existing CACHOT_DOOR_X/Y interaction zone.
  {
    key: BUILDING_KEYS.LE_CACHOT_EXTERIOR,
    x: CACHOT_DOOR_X,
    y: CACHOT_DOOR_Y + 22,
    displayWidth: LE_CACHOT_DISPLAY_W,
    displayHeight: LE_CACHOT_DISPLAY_H,
    footprintWidthFrac: 0.7,
    footprintHeightFrac: 0.16,
  },
  // West of Le Cachot, clear of BOY_WANDER_BOUNDS (CACHOT_DOOR_X-140..-40).
  {
    key: BUILDING_KEYS.MOULIN_DE_BOLY,
    x: CACHOT_DOOR_X - 230,
    y: CACHOT_DOOR_Y - 30,
    displayWidth: MOULIN_DISPLAY_W,
    displayHeight: MOULIN_DISPLAY_H,
    footprintWidthFrac: 0.38,
    footprintHeightFrac: 0.12,
  },
  // East of Le Cachot, clear of JEANNE_SPAWN (CACHOT_DOOR_X+80).
  {
    key: BUILDING_KEYS.HOSPICE,
    x: CACHOT_DOOR_X + 240,
    y: CACHOT_DOOR_Y - 10,
    displayWidth: HOSPICE_DISPLAY_W,
    displayHeight: HOSPICE_DISPLAY_H,
    footprintWidthFrac: 0.68,
    footprintHeightFrac: 0.14,
  },
];

// The new intermediate terrain layer (`assets/terrain/lourdesTownTerrain.ts`) — sits between the
// grass (base layer, untouched) and the individual building PNGs still to come, per the
// maintainer's explicit "grass -> new terrain -> buildings" layer order. Displayed at a "slight"
// enlargement (1.2x native) so the patch has real surface for most future buildings to stand on,
// still a uniform scale (never stretched). Horizontally centered on CACHOT_DOOR_X/PATH_CENTER —
// the same anchor every other town landmark in this file already uses (Jeanne's spawn, the boy's
// wander bounds), so the terrain sits under where the town's own activity is, not off to one side.
// Its own top edge is kept a clear gap below the river's southern bank (row RIVER_H_BOTTOM+1) so it
// never visually touches, let alone covers, the river — "the river must remain visually above this
// lower-town terrain area."
const TOWN_TERRAIN_SCALE = 1.2;
const TOWN_TERRAIN_DISPLAY_W = TOWN_TERRAIN_NATIVE_WIDTH * TOWN_TERRAIN_SCALE;
const TOWN_TERRAIN_DISPLAY_H = TOWN_TERRAIN_NATIVE_HEIGHT * TOWN_TERRAIN_SCALE;
const TOWN_TERRAIN_X0 = CACHOT_DOOR_X - TOWN_TERRAIN_DISPLAY_W / 2;
const TOWN_TERRAIN_Y0 = (RIVER_H_BOTTOM + 3) * TILE_SIZE;

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

  // True-float camera scroll accumulator for the hand-rolled follow in `updateCameraFollow()` --
  // see that method's own doc comment for why this can't just be `camera.startFollow()`.
  private camScrollX = 0;
  private camScrollY = 0;

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

    this.buildTownTerrain();
    this.buildTownBuildings();
    this.buildCachotEntrance();
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

    // No tile-stamped path south of the bridge: that whole band is now plain open grass (the town
    // PNG that used to occupy it has been removed entirely — see this file's header comment), with
    // no path art to place until individual building PNGs (and whatever paths their own layout
    // calls for) are added there. The organic dirt trail above is still used for the open field
    // north of the river, which is untouched.

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
   * Placeholder Le Cachot entrance: no image, no collider — just the interaction zone (and its
   * label) that keeps the enter/exit connection to `CachotScene.ts` working while no exterior
   * building art has been supplied yet (see `CACHOT_DOOR_X/Y`'s own doc comment above). Once the
   * real Le Cachot PNG is identified by filename, this should be replaced with a real per-building
   * placement (image + footprint collider + depth anchor, one collider per solid part, matching
   * whatever new buildings get built alongside it) rather than extended in place.
   */
  /**
   * The new intermediate terrain layer, sat directly on top of the grass (`buildTerrain()`,
   * `DEPTH.GROUND - 1`) and below everything else in the town area (the tile layer itself,
   * `DEPTH.GROUND`, has nothing stamped south of the river — see `buildTerrain()`'s own comment —
   * so there's no real ordering conflict there; matches the old town-PNG ground layer's own
   * convention of sitting at `DEPTH.GROUND - 0.5`). Purely decorative ground art — no collider:
   * buildings placed on top of it (once supplied) get their own footprint colliders the same way
   * every other building in this game already does, not this layer.
   */
  private buildTownTerrain(): void {
    const image = this.add.image(TOWN_TERRAIN_X0, TOWN_TERRAIN_Y0, TOWN_TERRAIN_KEY).setOrigin(0, 0);
    image.setDisplaySize(TOWN_TERRAIN_DISPLAY_W, TOWN_TERRAIN_DISPLAY_H);
    image.setDepth(DEPTH.GROUND - 0.5);
  }

  private buildCachotEntrance(): void {
    const halfWidth = 24;
    this.cachotDoorZone = new Phaser.Geom.Rectangle(CACHOT_DOOR_X - halfWidth, CACHOT_DOOR_Y - 20, halfWidth * 2, 40);
    createText(this, CACHOT_DOOR_X, CACHOT_DOOR_Y - 26, Localization.t(K.LOCATION_CACHOT), { fontSize: '9px', color: '#3a3226' })
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY_LOW);
  }

  /**
   * Places each supplied building PNG from `TOWN_BUILDINGS` (see that array's own doc comment for
   * placement/spacing rationale). Each building is: (1) a visible `Image`, bottom-center anchored
   * (`setOrigin(0.5, 1)`) so `x,y` is the building's own ground-contact point, Y-sort depth via
   * `depthForY()` so the player renders in front when below it and behind when above it -- same
   * convention as every other prop in this file (`addStaticProp`, `buildGrotto`); (2) a SEPARATE
   * invisible static-physics `Zone` (`createBlocker`) sized to a fraction of the display box and
   * centered on the building's own footprint (near its base, not the whole tall sprite) -- this is
   * the "don't use one giant rectangular collider" requirement: the collider only covers the
   * solid/base part, so the player can still walk visually behind the upper/roof portion of the art
   * while being blocked by the base, and depth/occlusion (the Image + its Y-sort) stays entirely
   * decoupled from collision (the Zone).
   */
  private buildTownBuildings(): void {
    TOWN_BUILDINGS.forEach((spec) => {
      const image = this.add.image(spec.x, spec.y, spec.key).setOrigin(0.5, 1);
      image.setDisplaySize(spec.displayWidth, spec.displayHeight);
      image.setDepth(depthForY(spec.y, DEPTH.ACTORS));

      const footprintWidth = spec.displayWidth * spec.footprintWidthFrac;
      const footprintHeight = spec.displayHeight * spec.footprintHeightFrac;
      const footprintCenterY = spec.y - footprintHeight / 2;
      this.colliderBodies.push(createBlocker(this, spec.x, footprintCenterY, footprintWidth, footprintHeight));
    });
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

  update(time: number, delta: number): void {
    const uiBlocked = this.dialogueBox.isActive() || this.tasksPanel.isOpen() || this.topBar.isBlocking();
    const exploring = this.phase === 'explore' && !uiBlocked;
    this.player.setLocked(!exploring);
    this.player.update(time);
    this.updateCameraFollow();

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
