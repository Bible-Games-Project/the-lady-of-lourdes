import Phaser from 'phaser';
import { SCENE_KEYS, DEPTH, TILE_SIZE } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import { TILE, TILESET_KEY } from '../pixelart/tiles';
import { PROP_KEYS } from '../pixelart/props';
import { Player } from '../gameplay/Player';
import { NpcActor } from '../gameplay/NpcActor';
import { TouchControls } from '../gameplay/TouchControls';
import { DialogueBox } from '../gameplay/DialogueBox';
import { ObjectiveHud } from '../gameplay/ObjectiveHud';
import { InteractionPrompt } from '../gameplay/InteractionPrompt';
import { Toast } from '../gameplay/Toast';
import { updateFollowerPosition } from '../gameplay/Follower';
import { MissionManager } from '../gameplay/MissionManager';
import { mission01Dialogue, MISSION_01_OBJECTIVES } from '../data/missions/mission01';
import { LOCATIONS, type LocationId } from '../data/world/locations';
import { createBlocker, depthForY, isNear } from '../gameplay/utils';
import { fadeToScene } from '../gameplay/transitions';

const COLS = 30;
const ROWS = 70;
const MAP_W = COLS * TILE_SIZE;
const MAP_H = ROWS * TILE_SIZE;
const PATH_CENTER = 15;
const PATH_HALF_WIDTH = 2;

const RIVER_TOP_ROW = 9;
const RIVER_BOTTOM_ROW = 12;

const CACHOT_ROW = 63;
const CACHOT_COL = 12;

interface BuildingPlacement {
  key: string;
  col: number;
  row: number;
  widthPx: number;
  heightPx: number;
  locationId: LocationId;
}

const TOWN_BUILDINGS: BuildingPlacement[] = [
  { key: PROP_KEYS.CHURCH, col: 5, row: 42, widthPx: 64, heightPx: 64, locationId: 'church' },
  { key: PROP_KEYS.TOWN_BUILDING, col: 20, row: 44, widthPx: 48, heightPx: 40, locationId: 'hospice' },
  { key: PROP_KEYS.TOWN_BUILDING, col: 3, row: 51, widthPx: 48, heightPx: 40, locationId: 'presbytery' },
  { key: PROP_KEYS.TOWN_BUILDING, col: 21, row: 51, widthPx: 48, heightPx: 40, locationId: 'maisonCenac' },
  { key: PROP_KEYS.TOWN_BUILDING, col: 4, row: 58, widthPx: 48, heightPx: 40, locationId: 'tribunal' },
];

const DECOR: Array<{ key: string; col: number; row: number }> = [
  { key: PROP_KEYS.TREE, col: 2, row: 3 },
  { key: PROP_KEYS.TREE, col: 26, row: 4 },
  { key: PROP_KEYS.TREE, col: 3, row: 18 },
  { key: PROP_KEYS.TREE, col: 25, row: 22 },
  { key: PROP_KEYS.TREE, col: 4, row: 33 },
  { key: PROP_KEYS.TREE, col: 24, row: 36 },
  { key: PROP_KEYS.ROCK, col: 6, row: 16 },
  { key: PROP_KEYS.ROCK, col: 23, row: 30 },
  { key: PROP_KEYS.TREE, col: 12, row: 65 },
  { key: PROP_KEYS.TREE, col: 19, row: 66 },
];

const INTERACT_RADIUS = 26;

interface OverworldSceneData {
  fromCachot?: boolean;
}

export class OverworldScene extends Phaser.Scene {
  private player!: Player;
  private touch!: TouchControls;
  private dialogueBox!: DialogueBox;
  private objectiveHud!: ObjectiveHud;
  private interactionPrompt!: InteractionPrompt;
  private toast!: Toast;
  private keyE!: Phaser.Input.Keyboard.Key;

  private sister!: NpcActor;
  private friend!: NpcActor;
  private friendMet = false;

  private cachotDoorZone!: Phaser.Geom.Rectangle;
  private buildings: Array<{ placement: BuildingPlacement; doorZone: Phaser.Geom.Rectangle }> = [];
  private colliderBodies: (Phaser.Types.Physics.Arcade.ImageWithStaticBody | Phaser.GameObjects.Zone)[] = [];

  constructor() {
    super(SCENE_KEYS.OVERWORLD);
  }

  create(data: OverworldSceneData): void {
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.friendMet = MissionManager.hasReachedObjective(MISSION_01_OBJECTIVES.GO_TO_MASSABIELLE);
    this.colliderBodies = [];
    this.buildings = [];

    this.buildTerrain();

    this.touch = new TouchControls(this);

    const cachotDoorPx = this.tileToPixelCenter(CACHOT_COL + 1.5, CACHOT_ROW + 2.5);
    const startY = data.fromCachot ? cachotDoorPx.y - 20 : cachotDoorPx.y + 26;
    this.player = new Player(this, cachotDoorPx.x, startY, this.touch);

    this.buildBuildings();
    this.buildDecor();
    this.physics.add.collider(this.player, this.colliderBodies);

    this.sister = new NpcActor(this, cachotDoorPx.x - 16, cachotDoorPx.y + 22, 'sister', 'down');
    this.sister.setVisible(MissionManager.hasReachedObjective(MISSION_01_OBJECTIVES.GATHER_FIREWOOD));
    this.sister.setDepth(depthForY(this.sister.y, DEPTH.ACTORS));

    const friendPx = this.tileToPixelCenter(PATH_CENTER, 30);
    this.friend = new NpcActor(this, friendPx.x + 18, friendPx.y, 'friend', 'down');
    this.friend.setVisible(!this.friendMet);
    this.friend.setDepth(depthForY(this.friend.y, DEPTH.ACTORS));

    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.dialogueBox = new DialogueBox(this);
    this.objectiveHud = new ObjectiveHud(this);
    this.interactionPrompt = new InteractionPrompt(this);
    this.toast = new Toast(this);
    this.refreshObjectiveText();

    this.keyE = this.input.keyboard!.addKey('E');
    this.touch.onInteract = () => this.tryInteract();
  }

  private tileToPixelCenter(col: number, row: number): { x: number; y: number } {
    return { x: col * TILE_SIZE, y: row * TILE_SIZE };
  }

  private buildTerrain(): void {
    this.cameras.main.setBackgroundColor('#8fae6b');

    const data: number[][] = Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => ((r * 7 + c * 13) % 9 === 0 ? TILE.GRASS_B : TILE.GRASS_A)),
    );

    for (let r = 0; r < ROWS; r++) {
      for (let c = PATH_CENTER - PATH_HALF_WIDTH; c <= PATH_CENTER + PATH_HALF_WIDTH; c++) {
        data[r][c] = TILE.DIRT_PATH;
      }
    }

    for (let c = 0; c < COLS; c++) {
      data[RIVER_TOP_ROW - 1][c] = TILE.RIVERBANK;
      data[RIVER_BOTTOM_ROW + 1][c] = TILE.RIVERBANK;
      for (let r = RIVER_TOP_ROW; r <= RIVER_BOTTOM_ROW; r++) data[r][c] = TILE.WATER;
    }
    for (let r = RIVER_TOP_ROW - 1; r <= RIVER_BOTTOM_ROW + 1; r++) {
      for (let c = PATH_CENTER - PATH_HALF_WIDTH; c <= PATH_CENTER + PATH_HALF_WIDTH; c++) data[r][c] = TILE.STONE_PATH;
    }

    for (let r = 40; r <= 61; r++) {
      for (let c = PATH_CENTER - 6; c <= PATH_CENTER + 6; c++) data[r][c] = TILE.STONE_PATH;
    }

    const map = this.make.tilemap({ data, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage('tiles', TILESET_KEY, TILE_SIZE, TILE_SIZE, 0, 0)!;
    const layer = map.createLayer(0, tileset, 0, 0)!;
    layer.setDepth(DEPTH.GROUND);

    // The Gave de Pau is only crossable via the bridge — water itself blocks the player.
    const riverY = ((RIVER_TOP_ROW + RIVER_BOTTOM_ROW + 1) / 2) * TILE_SIZE;
    const riverHeight = (RIVER_BOTTOM_ROW - RIVER_TOP_ROW + 1) * TILE_SIZE;
    const bridgeLeft = (PATH_CENTER - PATH_HALF_WIDTH) * TILE_SIZE;
    const bridgeRight = (PATH_CENTER + PATH_HALF_WIDTH + 1) * TILE_SIZE;
    this.colliderBodies.push(createBlocker(this, bridgeLeft / 2, riverY, bridgeLeft, riverHeight));
    this.colliderBodies.push(createBlocker(this, (bridgeRight + MAP_W) / 2, riverY, MAP_W - bridgeRight, riverHeight));
  }

  private addStaticProp(key: string, x: number, y: number, width: number, height: number, colliderHeight?: number): void {
    const image = this.add.image(x, y, key).setOrigin(0.5, 1);
    image.setDepth(depthForY(y, DEPTH.ACTORS));
    const body = this.physics.add.staticImage(x, y - (colliderHeight ?? height) / 4, key);
    body.setVisible(false);
    body.body.setSize(width * 0.7, (colliderHeight ?? height) * 0.35);
    this.colliderBodies.push(body);
  }

  private buildBuildings(): void {
    const cachot = this.tileToPixelCenter(CACHOT_COL, CACHOT_ROW);
    this.addStaticProp(PROP_KEYS.CACHOT_EXTERIOR, cachot.x + 24, cachot.y + 40, 48, 40);
    this.cachotDoorZone = new Phaser.Geom.Rectangle(cachot.x + 12, cachot.y + 40, 24, 14);

    this.add
      .text(cachot.x + 24, cachot.y - 4, Localization.t(K.LOCATION_CACHOT), {
        fontFamily: 'Georgia, serif',
        fontSize: '10px',
        color: '#3a3226',
      })
      .setOrigin(0.5)
      .setDepth(DEPTH.OVERLAY_LOW);

    TOWN_BUILDINGS.forEach((placement) => {
      const px = this.tileToPixelCenter(placement.col, placement.row);
      const cx = px.x + placement.widthPx / 2;
      const cy = px.y + placement.heightPx;
      this.addStaticProp(placement.key, cx, cy, placement.widthPx, placement.heightPx);
      this.add
        .text(cx, px.y - 6, Localization.t(LOCATIONS[placement.locationId].nameKey), {
          fontFamily: 'Georgia, serif',
          fontSize: '9px',
          color: '#3a3226',
        })
        .setOrigin(0.5)
        .setDepth(DEPTH.OVERLAY_LOW);
      const doorZone = new Phaser.Geom.Rectangle(cx - 12, cy - 8, 24, 14);
      this.buildings.push({ placement, doorZone });
    });
  }

  private buildDecor(): void {
    DECOR.forEach(({ key, col, row }) => {
      const px = this.tileToPixelCenter(col, row);
      this.addStaticProp(key, px.x, px.y, TILE_SIZE, TILE_SIZE * 1.5);
    });
  }

  update(time: number): void {
    const dialogueActive = this.dialogueBox.isActive();
    this.player.setLocked(dialogueActive);
    this.player.update(time);

    updateFollowerPosition(this.sister, this.player.x - 16, this.player.y + 4, time, DEPTH.ACTORS);
    if (this.friendMet) {
      updateFollowerPosition(this.friend, this.player.x + 16, this.player.y + 4, time, DEPTH.ACTORS);
    }

    if (dialogueActive) {
      this.interactionPrompt.hide();
      return;
    }

    this.handleInteractionPrompts();

    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.tryInteract();
    }

    this.checkMassabielleTransition();
  }

  private handleInteractionPrompts(): void {
    const player = this.player;

    if (!this.friendMet && isNear(player, this.friend, INTERACT_RADIUS)) {
      this.interactionPrompt.showAt(this.friend.x, this.friend.y - 26, Localization.t(K.INTERACT_TALK));
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

    this.interactionPrompt.hide();
  }

  private tryInteract(): void {
    if (this.dialogueBox.isActive()) return;
    const player = this.player;

    if (!this.friendMet && isNear(player, this.friend, INTERACT_RADIUS)) {
      this.dialogueBox.start(mission01Dialogue.friendMeet, () => {
        this.friendMet = true;
        this.sister.setVisible(true);
        MissionManager.advanceObjective();
        this.refreshObjectiveText();
      });
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
  }

  private checkMassabielleTransition(): void {
    if (!MissionManager.hasReachedObjective(MISSION_01_OBJECTIVES.GO_TO_MASSABIELLE)) return;
    if (this.player.y <= TILE_SIZE * 2) {
      fadeToScene(this, SCENE_KEYS.MASSABIELLE);
    }
  }

  private refreshObjectiveText(): void {
    if (!MissionManager.getMission()) {
      this.objectiveHud.setVisible(false);
      return;
    }
    this.objectiveHud.setVisible(true);
    this.objectiveHud.setText(MissionManager.getObjectiveText());
  }
}
