import Phaser from 'phaser';
import { SCENE_KEYS, GAME_WIDTH, GAME_HEIGHT, DEPTH, TILE_SIZE } from '../core/constants';
import { Localization } from '../core/i18n/Localization';
import { K } from '../core/i18n/keys';
import { TILE, TILESET_KEY } from '../pixelart/tiles';
import { INTERIOR_PROP_KEYS } from '../pixelart/interiorProps';
import { Player } from '../gameplay/Player';
import { NpcActor } from '../gameplay/NpcActor';
import { TouchControls } from '../gameplay/TouchControls';
import { DialogueBox } from '../gameplay/DialogueBox';
import { TasksPanel } from '../gameplay/TasksPanel';
import { GameplayTopBar } from '../gameplay/GameplayTopBar';
import { InteractionPrompt } from '../gameplay/InteractionPrompt';
import { MissionManager } from '../gameplay/MissionManager';
import { mission01, mission01Dialogue } from '../data/missions/mission01';
import { isNear } from '../gameplay/utils';
import { fadeToScene } from '../gameplay/transitions';
import { textStyle } from '../ui/text';
import { useLetterboxScale } from '../core/scaleMode';

const INTERACT_RADIUS = 26;

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

  constructor() {
    super(SCENE_KEYS.CACHOT);
  }

  create(): void {
    useLetterboxScale(this);
    MissionManager.startMission(mission01);
    this.motherTalkedTo = false;
    this.cameras.main.fadeIn(400, 0, 0, 0);
    this.cameras.main.setBackgroundColor('#15110e');

    const cols = 12;
    const rows = 8;
    const roomW = cols * TILE_SIZE;
    const roomH = rows * TILE_SIZE;
    const offsetX = Math.round((GAME_WIDTH - roomW) / 2);
    const offsetY = Math.round((GAME_HEIGHT - roomH) / 2);
    const wall = TILE_SIZE;

    const data = Array.from({ length: rows }, () => Array.from({ length: cols }, () => TILE.STONE_FLOOR));
    const map = this.make.tilemap({ data, tileWidth: TILE_SIZE, tileHeight: TILE_SIZE });
    const tileset = map.addTilesetImage('tiles', TILESET_KEY, TILE_SIZE, TILE_SIZE, 0, 0)!;
    const layer = map.createLayer(0, tileset, offsetX, offsetY)!;
    layer.setDepth(DEPTH.GROUND);

    const doorWidth = TILE_SIZE * 2;
    const doorX = offsetX + roomW / 2 - doorWidth / 2;

    const g = this.add.graphics();
    g.fillStyle(0x4a4038, 1);
    g.fillRect(offsetX, offsetY, roomW, wall);
    g.fillRect(offsetX, offsetY, wall, roomH);
    g.fillRect(offsetX + roomW - wall, offsetY, wall, roomH);
    g.fillRect(offsetX, offsetY + roomH - wall, doorX - offsetX, wall);
    g.fillRect(doorX + doorWidth, offsetY + roomH - wall, offsetX + roomW - (doorX + doorWidth), wall);
    g.fillStyle(0x2c2521, 1);
    g.fillRect(doorX, offsetY + roomH - wall, doorWidth, wall);
    g.setDepth(DEPTH.PROPS);

    this.physics.world.setBounds(offsetX + wall, offsetY + wall, roomW - wall * 2, roomH - wall * 2);
    this.doorZone = new Phaser.Geom.Rectangle(doorX, offsetY + roomH - wall - 12, doorWidth, 16);

    // Humble furniture: a hearth, a bed, a table with a stool. Poor and cramped, not comfortable.
    const furniture = this.physics.add.staticGroup();
    const hearth = this.add.image(offsetX + wall + 18, offsetY + wall + 16, INTERIOR_PROP_KEYS.HEARTH).setOrigin(0, 0);
    hearth.setDepth(DEPTH.PROPS);
    furniture.add(hearth);

    const bed = this.add.image(offsetX + roomW - wall - 44, offsetY + wall + 10, INTERIOR_PROP_KEYS.BED).setOrigin(0, 0);
    bed.setDepth(DEPTH.PROPS);
    furniture.add(bed);

    const table = this.add.image(offsetX + roomW / 2 - 16, offsetY + roomH - wall - 34, INTERIOR_PROP_KEYS.TABLE).setOrigin(0, 0);
    table.setDepth(DEPTH.PROPS);
    furniture.add(table);

    const stool = this.add.image(offsetX + roomW / 2 + 24, offsetY + roomH - wall - 24, INTERIOR_PROP_KEYS.STOOL).setOrigin(0, 0);
    stool.setDepth(DEPTH.PROPS);
    furniture.add(stool);

    this.touch = new TouchControls(this);
    this.player = new Player(this, offsetX + roomW / 2, offsetY + roomH / 2 + 10, this.touch);
    this.player.setDepth(DEPTH.ACTORS);
    this.physics.add.collider(this.player, furniture);

    this.mother = new NpcActor(this, offsetX + roomW / 2 + 10, offsetY + wall + 46, 'mother', 'down');
    this.mother.setDepth(DEPTH.ACTORS);

    this.dialogueBox = new DialogueBox(this);
    this.tasksPanel = new TasksPanel(this);
    this.topBar = new GameplayTopBar(this);
    this.interactionPrompt = new InteractionPrompt(this);

    this.keyE = this.input.keyboard!.addKey('E');
    this.touch.onInteract = () => this.tryInteract();

    this.add
      .text(GAME_WIDTH / 2, offsetY - 12, Localization.t(K.NARRATION_CACHOT_INTRO), textStyle({ fontSize: '11px', color: '#c9beac' }))
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
