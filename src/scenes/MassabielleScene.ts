import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT, DEPTH, TILE_SIZE } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import { TILE, TILESET_KEY } from '../pixelart/tiles';
import { PROP_KEYS } from '../pixelart/props';
import { Player } from '../gameplay/Player';
import { NpcActor } from '../gameplay/NpcActor';
import { TouchControls } from '../gameplay/TouchControls';
import { ObjectiveHud } from '../gameplay/ObjectiveHud';
import { InteractionPrompt } from '../gameplay/InteractionPrompt';
import { Caption } from '../gameplay/Caption';
import { MissionManager } from '../gameplay/MissionManager';
import { MISSION_01_FIREWOOD_TARGET, MISSION_01_OBJECTIVES } from '../data/missions/mission01';
import { createBlocker, depthForY, isNear } from '../gameplay/utils';
import { updateFollowerPosition } from '../gameplay/Follower';
import { wait, tweenPromise } from '../gameplay/async';

const COLS = 26;
const ROWS = 30;
const MAP_W = COLS * TILE_SIZE;
const MAP_H = ROWS * TILE_SIZE;

const PATH_COL_START = 15;
const PATH_COL_END = 17;
const RIVER_COL_START = 19;
const RIVER_COL_END = 22;

// Kept well clear of the map's north edge so the screen-pinned Objective HUD never covers it.
const GROTTO_X = 128;
const GROTTO_Y = 144;
const NICHE_X = GROTTO_X + 62;
const NICHE_Y = GROTTO_Y + 19;

const FIREWOOD_SPOTS = [
  { x: 96, y: 320 },
  { x: 176, y: 384 },
  { x: 256, y: 288 },
];

const PLAYER_START = { x: 256, y: 432 };
const FORD_ZONE = new Phaser.Geom.Rectangle(240, 136, RIVER_COL_START * TILE_SIZE - 240, 140);
const FAR_BANK = { sisterX: RIVER_COL_END * TILE_SIZE + 24, friendX: RIVER_COL_END * TILE_SIZE + 44, y: 272 };

const INTERACT_RADIUS = 26;
const ROSARY_BEADS = 5;

type Phase = 'explore' | 'crossing' | 'hush' | 'apparition' | 'praying' | 'ending';

export class MassabielleScene extends Phaser.Scene {
  private player!: Player;
  private touch!: TouchControls;
  private objectiveHud!: ObjectiveHud;
  private interactionPrompt!: InteractionPrompt;
  private keyE!: Phaser.Input.Keyboard.Key;

  private sister!: NpcActor;
  private friend!: NpcActor;
  private lady!: NpcActor;
  private ladyGlow!: Phaser.GameObjects.Arc;

  private firewoodSprites: Phaser.GameObjects.Image[] = [];
  private colliderBodies: (Phaser.Types.Physics.Arcade.ImageWithStaticBody | Phaser.GameObjects.Zone)[] = [];

  private phase: Phase = 'explore';
  private rosaryBeads: Phaser.GameObjects.Image[] = [];
  private rosaryProgress = 0;

  constructor() {
    super(SCENE_KEYS.MASSABIELLE);
  }

  create(): void {
    if (MissionManager.getCurrentObjective()?.id === MISSION_01_OBJECTIVES.GO_TO_MASSABIELLE) {
      MissionManager.advanceObjective();
    }
    this.phase = 'explore';
    this.colliderBodies = [];
    this.firewoodSprites = [];
    this.rosaryBeads = [];
    this.rosaryProgress = 0;

    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#7d9a5c');

    this.buildTerrain();

    this.touch = new TouchControls(this);
    this.player = new Player(this, PLAYER_START.x, PLAYER_START.y, this.touch);

    this.buildGrotto();
    this.buildFirewood();
    this.physics.add.collider(this.player, this.colliderBodies);

    this.sister = new NpcActor(this, PLAYER_START.x - 16, PLAYER_START.y + 4, 'sister', 'down');
    this.friend = new NpcActor(this, PLAYER_START.x + 16, PLAYER_START.y + 4, 'friend', 'down');
    [this.sister, this.friend].forEach((a) => a.setDepth(depthForY(a.y, DEPTH.ACTORS)));

    // The niche sits on the grotto's rock face, so the Lady must always render above it
    // regardless of Y-sort — she is not "behind" the rock at any point in the scene.
    const ladyDepth = DEPTH.ACTORS + 0.5;
    this.lady = new NpcActor(this, NICHE_X, NICHE_Y, 'lady', 'down');
    this.lady.setDepth(ladyDepth);
    this.lady.setAlpha(0);
    this.ladyGlow = this.add.circle(NICHE_X, NICHE_Y - 8, 22, 0xfff3cf, 0.28);
    this.ladyGlow.setDepth(ladyDepth - 0.001);
    this.ladyGlow.setAlpha(0);

    this.cameras.main.setBounds(0, 0, MAP_W, MAP_H);
    this.physics.world.setBounds(0, 0, MAP_W, MAP_H);
    this.cameras.main.startFollow(this.player, true, 0.12, 0.12);

    this.objectiveHud = new ObjectiveHud(this);
    this.interactionPrompt = new InteractionPrompt(this);
    this.objectiveHud.setText(MissionManager.getObjectiveText());

    this.keyE = this.input.keyboard!.addKey('E');
    this.touch.onInteract = () => this.tryInteract();
  }

  private buildTerrain(): void {
    const data: number[][] = Array.from({ length: ROWS }, (_, r) =>
      Array.from({ length: COLS }, (_, c) => ((r * 5 + c * 11) % 9 === 0 ? TILE.GRASS_B : TILE.GRASS_A)),
    );

    for (let r = 9; r < ROWS; r++) {
      for (let c = PATH_COL_START; c <= PATH_COL_END; c++) data[r][c] = TILE.DIRT_PATH;
    }

    for (let c = RIVER_COL_START; c <= RIVER_COL_END; c++) {
      for (let r = 0; r < ROWS; r++) data[r][c] = TILE.WATER;
    }
    for (let r = 0; r < ROWS; r++) {
      data[r][RIVER_COL_START - 1] = TILE.RIVERBANK;
      data[r][RIVER_COL_END + 1] = TILE.RIVERBANK;
    }

    const grottoRow = GROTTO_Y / TILE_SIZE;
    for (let r = grottoRow - 1; r <= grottoRow + 3; r++) {
      for (let c = 7; c <= 13; c++) data[r][c] = TILE.CAVE_FLOOR;
    }

    const map = this.make.tilemap({ data, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage('tiles', TILESET_KEY, TILE_SIZE, TILE_SIZE, 0, 0)!;
    const layer = map.createLayer(0, tileset, 0, 0)!;
    layer.setDepth(DEPTH.GROUND);

    const riverX = ((RIVER_COL_START + RIVER_COL_END + 1) / 2) * TILE_SIZE;
    const riverWidth = (RIVER_COL_END - RIVER_COL_START + 1) * TILE_SIZE;
    this.colliderBodies.push(createBlocker(this, riverX, MAP_H / 2, riverWidth, MAP_H));

    [{ key: PROP_KEYS.TREE, x: 40, y: 60 }, { key: PROP_KEYS.TREE, x: 380, y: 90 }, { key: PROP_KEYS.TREE, x: 392, y: 220 },
      { key: PROP_KEYS.ROCK, x: 60, y: 260 }, { key: PROP_KEYS.ROCK, x: 200, y: 320 },
    ].forEach(({ key, x, y }) => {
      const image = this.add.image(x, y, key).setOrigin(0.5, 1);
      image.setDepth(depthForY(y, DEPTH.ACTORS));
      const body = this.physics.add.staticImage(x, y - 6, key);
      body.setVisible(false);
      body.body.setSize(10, 8);
      this.colliderBodies.push(body);
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

  update(time: number): void {
    const exploring = this.phase === 'explore';
    this.player.setLocked(!exploring);
    this.player.update(time);

    updateFollowerPosition(this.sister, this.player.x - 16, this.player.y + 4, time, DEPTH.ACTORS);
    updateFollowerPosition(this.friend, this.player.x + 16, this.player.y + 4, time, DEPTH.ACTORS);

    this.handlePrompts();

    if (Phaser.Input.Keyboard.JustDown(this.keyE)) {
      this.tryInteract();
    }

    if (
      exploring &&
      MissionManager.hasReachedObjective(MISSION_01_OBJECTIVES.REACH_RIVER) &&
      Phaser.Geom.Rectangle.Contains(FORD_ZONE, this.player.x, this.player.y)
    ) {
      this.beginRiverCrossing();
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
    if (MissionManager.getCurrentObjective()?.id === MISSION_01_OBJECTIVES.COLLECT_FIREWOOD) {
      for (const sprite of this.firewoodSprites) {
        if (sprite.active && isNear(this.player, sprite, INTERACT_RADIUS)) {
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
      this.advanceRosary();
      return;
    }
    if (this.phase !== 'explore') return;
    if (MissionManager.getCurrentObjective()?.id !== MISSION_01_OBJECTIVES.COLLECT_FIREWOOD) return;

    for (const sprite of this.firewoodSprites) {
      if (sprite.active && isNear(this.player, sprite, INTERACT_RADIUS)) {
        sprite.setActive(false);
        sprite.destroy();
        const collected = MissionManager.addFirewood();
        this.objectiveHud.setText(MissionManager.getObjectiveText());
        if (collected >= MISSION_01_FIREWOOD_TARGET) {
          MissionManager.advanceObjective();
          this.objectiveHud.setText(MissionManager.getObjectiveText());
        }
        return;
      }
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
    this.sister.setVisible(false);
    this.friend.setVisible(false);

    MissionManager.advanceObjective();
    this.objectiveHud.setText(MissionManager.getObjectiveText());

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

    const startX = GAME_WIDTH / 2 - ((ROSARY_BEADS - 1) * 18) / 2;
    const y = GAME_HEIGHT - 26;
    for (let i = 0; i < ROSARY_BEADS; i++) {
      const bead = this.add.image(startX + i * 18, y, PROP_KEYS.ROSARY_BEAD);
      bead.setScrollFactor(0);
      bead.setDepth(DEPTH.UI);
      bead.setDisplaySize(10, 10);
      bead.setAlpha(0.35);
      this.rosaryBeads.push(bead);
    }
  }

  private advanceRosary(): void {
    if (this.rosaryProgress >= this.rosaryBeads.length) return;
    const bead = this.rosaryBeads[this.rosaryProgress];
    bead.setAlpha(1);
    this.tweens.add({ targets: bead, scale: 1.4, duration: 120, yoyo: true });
    this.rosaryProgress++;

    if (this.rosaryProgress >= ROSARY_BEADS) {
      this.endApparition();
    }
  }

  private async endApparition(): Promise<void> {
    this.phase = 'ending';
    this.objectiveHud.setVisible(false);
    this.rosaryBeads.forEach((bead) => bead.destroy());
    this.rosaryBeads = [];

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
      DEPTH.UI,
    );
    const titleCaption = new Caption(
      this,
      GAME_HEIGHT / 2 + 14,
      { fontFamily: 'Georgia, serif', fontSize: '13px', color: '#c9beac', align: 'center' },
      DEPTH.UI,
    );

    await dateCaption.show(Localization.t(K.APPARITION_DATE_CARD), 2000, 700);
    await titleCaption.show(Localization.t(K.APPARITION_TITLE_CARD), 2200, 700);

    MissionManager.completeMission();
    this.scene.start(SCENE_KEYS.MISSION_COMPLETE);
  }
}
