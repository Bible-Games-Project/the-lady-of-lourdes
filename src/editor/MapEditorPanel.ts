import Phaser from 'phaser';
import { DEPTH, GAME_WIDTH, GAME_HEIGHT } from '../core/constants';
import { UI_KEYS, UI_PANEL_SLICE } from '../pixelart/ui';
import { createButton } from '../ui/Button';
import { createText } from '../ui/text';
import { MAP_ASSET_CATALOG, getMapAssetDef } from './mapAssetCatalog';
import {
  type EditorAssetInstance,
  type EditorAssetRegistry,
  applyInstanceSize,
  applyInstanceDepth,
  applyInstanceCollider,
  createEditorAssetInstance,
} from './editorAssetRender';
import {
  type EditorZoneRegistry,
  type EditorZoneColliderRegistry,
  zoneBounds,
  addZoneCollider,
  removeZoneCollider,
} from './editorZoneRender';
import {
  EDITOR_LAYERS,
  EDITOR_LAYER_LABELS,
  type EditorLayerId,
  type EditorPlacedAsset,
  type EditorZone,
  type EditorZoneType,
  type EditorMapData,
  saveEditorMapData,
  downloadEditorMapData,
  generateEditorId,
} from './mapEditorData';

export type { EditorAssetInstance, EditorAssetRegistry } from './editorAssetRender';
export type { EditorZoneRegistry } from './editorZoneRender';

type ColliderBody = Phaser.Types.Physics.Arcade.ImageWithStaticBody | Phaser.GameObjects.Zone;

type Tool = 'select' | 'place' | EditorZoneType;

const ZONE_STYLE: Record<EditorZoneType, { fill: number; stroke: number; symbol: string }> = {
  walkable: { fill: 0x4caf50, stroke: 0x2e7d32, symbol: 'O' },
  walkBehind: { fill: 0xffc107, stroke: 0xb28900, symbol: '^' },
  blocked: { fill: 0xe53935, stroke: 0x8e1a15, symbol: 'X' },
};

const PANEL_WIDTH = 132;
const PANEL_LEFT = GAME_WIDTH - PANEL_WIDTH;

/**
 * Developer-only map editor overlay: lets the maintainer place real building/river PNGs and paint
 * walkable/walk-behind/blocked zones directly over the live Overworld map, then save that layout to
 * `localStorage` (+ a JSON download) so it reloads automatically next time the game starts.
 *
 * Deliberately additive, per this feature's own "do not break the existing game" requirement:
 * everything this panel places/paints lives in its own registries (`assets`, `zones`), completely
 * separate from `OverworldScene.ts`'s own hand-tuned `TOWN_BUILDINGS`/river/NPC-waypoint constants,
 * which this file never reads or modifies. A BLOCKED zone has a real runtime effect (a rectangular
 * collider over its bounding box, pushed into the scene's own live `colliderBodies` array); so does
 * every placed `buildings`/`decorations` asset, automatically, via a small base-footprint collider
 * (`editorAssetRender.ts#applyInstanceCollider()`) -- the maintainer's explicit "árboles como
 * casas... que no los pueda atravesar por la base" ask, letting the player walk behind a tree/roof
 * (still handled by the existing per-object Y-sort, `depthForY`) while its trunk/wall base genuinely
 * blocks. WALKABLE/WALK_BEHIND zones remain editor-visualization aids only (per the feature's own
 * original spec: "these symbols... do not need to appear in the actual game").
 *
 * Only ever constructed by `OverworldScene.ts` when its `editorViewMode` is set (reached
 * exclusively via `HomeScene`'s "Map Editor" button, never through normal gameplay) -- so it opens
 * itself immediately in its own constructor rather than waiting for a separate toggle button.
 */
export class MapEditorPanel {
  private scene: Phaser.Scene;
  private assets: EditorAssetRegistry;
  private colliderBodies: ColliderBody[];
  private zones: EditorZoneRegistry;
  /** Bounding-box collider for each committed BLOCKED zone, kept regardless of editor open/closed. */
  private zoneColliders: EditorZoneColliderRegistry;

  private open = false;
  private tool: Tool = 'select';
  private currentLayer: EditorLayerId = 'buildings';
  private pendingAssetId: string | null = null;
  private selectedInstanceId: string | null = null;
  private inProgressPoints: { x: number; y: number }[] = [];
  /** How many rows into the current layer's asset palette the visible window starts -- a layer can
   * hold more assets than fit in the panel's fixed vertical space (e.g. the "decorations" layer
   * with a dozen supplied trees), so the palette scrolls a fixed number of rows at a time instead
   * of overflowing past the Save/Close buttons. Reset to 0 whenever the layer changes. */
  private paletteScrollOffset = 0;

  private panelObjects: Phaser.GameObjects.GameObject[] = [];
  private zoneVisuals: Map<string, { graphics: Phaser.GameObjects.Graphics; label: Phaser.GameObjects.DOMElement }> = new Map();
  private inProgressGraphics: Phaser.GameObjects.Graphics | null = null;
  private selectionOutline: Phaser.GameObjects.Graphics | null = null;
  private inspectorObjects: Phaser.GameObjects.GameObject[] = [];
  private statusText!: Phaser.GameObjects.DOMElement;

  constructor(
    scene: Phaser.Scene,
    assets: EditorAssetRegistry,
    colliderBodies: ColliderBody[],
    zones: EditorZoneRegistry,
    zoneColliders: EditorZoneColliderRegistry,
  ) {
    this.scene = scene;
    this.assets = assets;
    this.colliderBodies = colliderBodies;
    // Both already loaded/created by `OverworldScene.ts#loadEditorZones()` before this panel is
    // ever constructed (unconditionally, regardless of DEV_MODE -- see that method's own doc
    // comment) -- this panel only adds to/removes from these same live registries from here on,
    // it never re-creates what's already there.
    this.zones = zones;
    this.zoneColliders = zoneColliders;

    this.statusText = createText(scene, PANEL_LEFT + PANEL_WIDTH / 2, GAME_HEIGHT - 10, '', {
      fontSize: '7px',
      color: '#fffaf0',
      align: 'center',
      wordWrap: { width: PANEL_WIDTH - 10 },
    });
    this.statusText.setOrigin(0.5);
    this.statusText.setScrollFactor(0);
    this.statusText.setDepth(DEPTH.DIALOGUE + 2);
    this.statusText.setVisible(false);

    scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => this.handleWorldPointerDown(pointer));

    // This panel is now only ever constructed by `OverworldScene.ts` when `editorViewMode` is
    // already true (reached exclusively via `HomeScene`'s "Map Editor" button) -- there is no more
    // in-scene toggle button to open it from, so it opens itself immediately instead.
    this.openPanel();
  }

  isOpen(): boolean {
    return this.open;
  }

  private openPanel(): void {
    if (this.open) return;
    this.open = true;
    this.tool = 'select';
    this.pendingAssetId = null;
    this.selectedInstanceId = null;
    this.inProgressPoints = [];
    this.paletteScrollOffset = 0;

    this.assets.forEach((instance) => this.enableInstanceEditing(instance));
    this.zones.forEach((zone) => this.showZoneVisual(zone));
    this.statusText.setVisible(true);
    this.setStatus('Select/Move tool. Click an asset below to place it, or paint a zone.');

    this.buildPanelUI();
  }

  private close(): void {
    if (!this.open) return;
    this.open = false;
    this.assets.forEach((instance) => instance.image.disableInteractive());
    this.clearSelection();
    this.clearInProgressShape();
    this.zoneVisuals.forEach((v) => {
      v.graphics.destroy();
      v.label.destroy();
    });
    this.zoneVisuals.clear();
    this.statusText.setVisible(false);
    this.panelObjects.forEach((obj) => obj.destroy());
    this.panelObjects = [];
  }

  private setStatus(text: string): void {
    this.statusText.setText(text);
  }

  // ---------------------------------------------------------------------------------------------
  // Toolbar UI
  // ---------------------------------------------------------------------------------------------

  private buildPanelUI(): void {
    this.panelObjects.forEach((obj) => obj.destroy());
    this.panelObjects = [];

    const centerX = PANEL_LEFT + PANEL_WIDTH / 2;
    const top = 34;
    const bottom = GAME_HEIGHT - 16;
    const panelH = bottom - top;
    const panelCenterY = top + panelH / 2;

    const bg = this.scene.add.nineslice(
      centerX,
      panelCenterY,
      UI_KEYS.PANEL,
      undefined,
      PANEL_WIDTH,
      panelH,
      UI_PANEL_SLICE.border,
      UI_PANEL_SLICE.border,
      UI_PANEL_SLICE.border,
      UI_PANEL_SLICE.border,
    );
    bg.setScrollFactor(0);
    bg.setDepth(DEPTH.DIALOGUE);
    this.panelObjects.push(bg);

    let y = top + 8;
    const rowStep = (h: number) => {
      y += h;
    };

    const title = createText(this.scene, centerX, y, 'MAP EDITOR', { fontSize: '9px', color: '#fffaf0', fontStyle: 'bold' });
    title.setOrigin(0.5);
    title.setScrollFactor(0);
    title.setDepth(DEPTH.DIALOGUE + 1);
    this.panelObjects.push(title);
    rowStep(12);

    const layerBtn = createButton(
      this.scene,
      centerX,
      y,
      PANEL_WIDTH - 10,
      13,
      `Layer: ${EDITOR_LAYER_LABELS[this.currentLayer]}`,
      () => {
        const idx = EDITOR_LAYERS.indexOf(this.currentLayer);
        this.currentLayer = EDITOR_LAYERS[(idx + 1) % EDITOR_LAYERS.length];
        this.paletteScrollOffset = 0;
        this.buildPanelUI();
      },
      { textColor: '#3a3226', fontSize: '8px' },
    );
    layerBtn.setScrollFactor(0);
    layerBtn.setDepth(DEPTH.DIALOGUE + 1);
    this.panelObjects.push(layerBtn);
    rowStep(16);

    const toolRow: { label: string; tool: Tool }[] = [
      { label: 'Select/Move', tool: 'select' },
      { label: 'O Walkable', tool: 'walkable' },
      { label: '^ Walk behind', tool: 'walkBehind' },
      { label: 'X Blocked', tool: 'blocked' },
    ];
    toolRow.forEach(({ label, tool }) => {
      const active = this.tool === tool;
      const btn = createButton(
        this.scene,
        centerX,
        y,
        PANEL_WIDTH - 10,
        13,
        active ? `> ${label}` : label,
        () => this.selectTool(tool),
        { textColor: active ? '#7a1f1f' : '#3a3226', fontSize: '8px' },
      );
      btn.setScrollFactor(0);
      btn.setDepth(DEPTH.DIALOGUE + 1);
      this.panelObjects.push(btn);
      rowStep(15);
    });

    if (this.tool !== 'select' && this.tool !== 'place') {
      const canFinish = this.inProgressPoints.length >= 3;
      const finishBtn = createButton(
        this.scene,
        centerX,
        y,
        (PANEL_WIDTH - 14) / 2,
        13,
        'Finish',
        () => this.finishZone(),
        { textColor: canFinish ? '#1f5e20' : '#8a7a5a', fontSize: '8px' },
        { x: 0, y: 0.5 },
      );
      finishBtn.setPosition(PANEL_LEFT + 5, y);
      finishBtn.setScrollFactor(0);
      finishBtn.setDepth(DEPTH.DIALOGUE + 1);
      this.panelObjects.push(finishBtn);

      const cancelBtn = createButton(
        this.scene,
        centerX,
        y,
        (PANEL_WIDTH - 14) / 2,
        13,
        'Cancel',
        () => this.clearInProgressShape(),
        { textColor: '#7a1f1f', fontSize: '8px' },
        { x: 0, y: 0.5 },
      );
      cancelBtn.setPosition(PANEL_LEFT + 5 + (PANEL_WIDTH - 14) / 2 + 4, y);
      cancelBtn.setScrollFactor(0);
      cancelBtn.setDepth(DEPTH.DIALOGUE + 1);
      this.panelObjects.push(cancelBtn);
      rowStep(17);
    }

    // The asset palette and the inspector for a selected placed asset both want the same vertical
    // space in a panel that's already tight (see PANEL_WIDTH/the 480x270 logical canvas this whole
    // toolbar has to fit in) -- shown one at a time rather than both at once, which was overflowing
    // into the fixed Save/Close buttons pinned to the bottom whenever something was selected.
    const hasSelection = !!(this.selectedInstanceId && this.assets.has(this.selectedInstanceId));

    if (!hasSelection) {
      const paletteTitle = createText(this.scene, centerX, y, `Assets (${EDITOR_LAYER_LABELS[this.currentLayer]})`, {
        fontSize: '7px',
        color: '#c9beac',
      });
      paletteTitle.setOrigin(0.5);
      paletteTitle.setScrollFactor(0);
      paletteTitle.setDepth(DEPTH.DIALOGUE + 1);
      this.panelObjects.push(paletteTitle);
      rowStep(10);

      const palette = MAP_ASSET_CATALOG.filter((a) => a.defaultLayer === this.currentLayer);
      if (palette.length === 0) {
        const none = createText(this.scene, centerX, y, '(none for this layer)', { fontSize: '7px', color: '#8a7a5a' });
        none.setOrigin(0.5);
        none.setScrollFactor(0);
        none.setDepth(DEPTH.DIALOGUE + 1);
        this.panelObjects.push(none);
        rowStep(12);
      } else {
        // A layer can hold more assets than fit in the panel's fixed vertical space (e.g.
        // "decorations" with a dozen supplied trees) -- scroll a fixed window of rows instead of
        // overflowing past the Save/Close buttons pinned to the bottom. Matches this file's own
        // Finish/Cancel row for the half-width-button layout.
        const VISIBLE_ITEM_ROWS = 4;
        const maxOffset = Math.max(0, palette.length - VISIBLE_ITEM_ROWS);
        this.paletteScrollOffset = Phaser.Math.Clamp(this.paletteScrollOffset, 0, maxOffset);

        if (palette.length > VISIBLE_ITEM_ROWS) {
          const canPrev = this.paletteScrollOffset > 0;
          const canNext = this.paletteScrollOffset < maxOffset;
          const prevBtn = createButton(
            this.scene,
            centerX,
            y,
            (PANEL_WIDTH - 14) / 2,
            13,
            '< Prev',
            () => {
              if (!canPrev) return;
              this.paletteScrollOffset -= VISIBLE_ITEM_ROWS;
              this.buildPanelUI();
            },
            { textColor: canPrev ? '#3a3226' : '#8a7a5a', fontSize: '8px' },
            { x: 0, y: 0.5 },
          );
          prevBtn.setPosition(PANEL_LEFT + 5, y);
          prevBtn.setScrollFactor(0);
          prevBtn.setDepth(DEPTH.DIALOGUE + 1);
          this.panelObjects.push(prevBtn);

          const nextBtn = createButton(
            this.scene,
            centerX,
            y,
            (PANEL_WIDTH - 14) / 2,
            13,
            'Next >',
            () => {
              if (!canNext) return;
              this.paletteScrollOffset += VISIBLE_ITEM_ROWS;
              this.buildPanelUI();
            },
            { textColor: canNext ? '#3a3226' : '#8a7a5a', fontSize: '8px' },
            { x: 0, y: 0.5 },
          );
          nextBtn.setPosition(PANEL_LEFT + 5 + (PANEL_WIDTH - 14) / 2 + 4, y);
          nextBtn.setScrollFactor(0);
          nextBtn.setDepth(DEPTH.DIALOGUE + 1);
          this.panelObjects.push(nextBtn);
          rowStep(16);
        }

        const visiblePalette = palette.slice(this.paletteScrollOffset, this.paletteScrollOffset + VISIBLE_ITEM_ROWS);
        visiblePalette.forEach((def) => {
          const active = this.tool === 'place' && this.pendingAssetId === def.id;
          const btn = createButton(
            this.scene,
            centerX,
            y,
            PANEL_WIDTH - 10,
            13,
            active ? `> ${def.label}` : def.label,
            () => {
              this.tool = 'place';
              this.pendingAssetId = def.id;
              this.clearSelection();
              this.clearInProgressShape();
              this.setStatus(`Click on the map to place "${def.label}".`);
              this.buildPanelUI();
            },
            { textColor: active ? '#1f5e20' : '#3a3226', fontSize: '8px' },
          );
          btn.setScrollFactor(0);
          btn.setDepth(DEPTH.DIALOGUE + 1);
          this.panelObjects.push(btn);
          rowStep(15);
        });
      }
    }

    // Inspector for the currently-selected placed asset, if any.
    if (hasSelection) {
      const instance = this.assets.get(this.selectedInstanceId!)!;
      const def = getMapAssetDef(instance.data.assetId);
      rowStep(4);
      const infoText = createText(this.scene, centerX, y, `Selected: ${def?.label ?? instance.data.assetId}`, {
        fontSize: '7px',
        color: '#fffaf0',
        wordWrap: { width: PANEL_WIDTH - 10 },
      });
      infoText.setOrigin(0.5);
      infoText.setScrollFactor(0);
      infoText.setDepth(DEPTH.DIALOGUE + 1);
      this.panelObjects.push(infoText);
      rowStep(12);

      const scaleMinus = createButton(
        this.scene,
        centerX,
        y,
        28,
        13,
        '-',
        () => this.adjustSelectedScale(-0.1),
        { fontSize: '8px' },
        { x: 0, y: 0.5 },
      );
      scaleMinus.setPosition(PANEL_LEFT + 5, y);
      scaleMinus.setScrollFactor(0);
      scaleMinus.setDepth(DEPTH.DIALOGUE + 1);
      this.panelObjects.push(scaleMinus);

      const scaleLabel = createText(this.scene, centerX, y, `${instance.data.scale.toFixed(1)}x`, { fontSize: '7px', color: '#fffaf0' });
      scaleLabel.setOrigin(0.5);
      scaleLabel.setScrollFactor(0);
      scaleLabel.setDepth(DEPTH.DIALOGUE + 1);
      this.panelObjects.push(scaleLabel);

      const scalePlus = createButton(
        this.scene,
        centerX,
        y,
        28,
        13,
        '+',
        () => this.adjustSelectedScale(0.1),
        { fontSize: '8px' },
        { x: 1, y: 0.5 },
      );
      scalePlus.setPosition(PANEL_LEFT + PANEL_WIDTH - 5, y);
      scalePlus.setScrollFactor(0);
      scalePlus.setDepth(DEPTH.DIALOGUE + 1);
      this.panelObjects.push(scalePlus);
      rowStep(16);

      const deleteBtn = createButton(this.scene, centerX, y, PANEL_WIDTH - 10, 13, 'Delete', () => this.deleteSelected(), {
        textColor: '#7a1f1f',
        fontSize: '8px',
      });
      deleteBtn.setScrollFactor(0);
      deleteBtn.setDepth(DEPTH.DIALOGUE + 1);
      this.panelObjects.push(deleteBtn);
      rowStep(16);
    }

    // Save/Reload/Close pinned to the bottom of the panel.
    const bottomY = bottom - 8;
    const closeBtn = createButton(this.scene, centerX, bottomY, PANEL_WIDTH - 10, 13, 'Close editor', () => this.close(), {
      fontSize: '8px',
    });
    closeBtn.setScrollFactor(0);
    closeBtn.setDepth(DEPTH.DIALOGUE + 1);
    this.panelObjects.push(closeBtn);

    const saveBtn = createButton(this.scene, centerX, bottomY - 16, PANEL_WIDTH - 10, 13, 'Save map', () => this.save(), {
      fontSize: '8px',
    });
    saveBtn.setScrollFactor(0);
    saveBtn.setDepth(DEPTH.DIALOGUE + 1);
    this.panelObjects.push(saveBtn);
  }

  private selectTool(tool: Tool): void {
    this.tool = tool;
    this.pendingAssetId = null;
    this.clearSelection();
    this.clearInProgressShape();
    if (tool === 'select') this.setStatus('Select/Move: click a placed asset to select and drag it.');
    else {
      const style = ZONE_STYLE[tool as EditorZoneType];
      this.setStatus(`Click points on the map to draw a ${style.symbol} zone, then Finish.`);
    }
    this.buildPanelUI();
  }

  // ---------------------------------------------------------------------------------------------
  // World interaction
  // ---------------------------------------------------------------------------------------------

  private isPointerOverPanel(pointer: Phaser.Input.Pointer): boolean {
    // `pointer.x`/`.y` are raw canvas-pixel coordinates, not camera/zoom-aware -- divide by the
    // camera's own zoom (== PIXEL_SCALE) to get back to the logical GAME_WIDTH-space PANEL_LEFT is
    // defined in; see `constants.ts`'s own doc comment on `PIXEL_SCALE`.
    const zoom = this.scene.cameras.main.zoom;
    return pointer.x / zoom >= PANEL_LEFT - 4 && pointer.y / zoom >= 22;
  }

  private handleWorldPointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.open) return;
    // The right mouse button drives free-camera panning instead (see
    // `OverworldScene.ts#setupEditorCameraPan()`) -- without this guard, a right-click/drag to pan
    // would *also* place the pending asset, add a zone vertex, or delete a zone under the pointer,
    // since this handler (like every other tool click below) previously fired for any button.
    if (pointer.button !== 0) return;
    if (this.isPointerOverPanel(pointer)) return;

    if (this.tool === 'place' && this.pendingAssetId) {
      this.placeAsset(this.pendingAssetId, pointer.worldX, pointer.worldY);
      return;
    }

    if (this.tool === 'walkable' || this.tool === 'walkBehind' || this.tool === 'blocked') {
      this.inProgressPoints.push({ x: Math.round(pointer.worldX), y: Math.round(pointer.worldY) });
      this.redrawInProgressShape();
      this.buildPanelUI();
      return;
    }

    // 'select' tool, and the click didn't land on a placed asset (that stops propagation in its
    // own handler and never reaches here). Deletes a painted zone if the click landed inside one
    // (this is the only way to remove a zone in this MVP -- no separate delete button, to keep the
    // panel small); otherwise just deselects.
    const hitZone = this.hitTestZone(pointer.worldX, pointer.worldY);
    if (hitZone) {
      this.deleteZone(hitZone.id);
      return;
    }
    this.clearSelection();
  }

  private hitTestZone(worldX: number, worldY: number): EditorZone | null {
    for (const zone of this.zones.values()) {
      if (pointInPolygon(worldX, worldY, zone.points)) return zone;
    }
    return null;
  }

  private deleteZone(zoneId: string): void {
    const zone = this.zones.get(zoneId);
    if (!zone) return;
    if (zone.type === 'blocked') removeZoneCollider(zoneId, this.zoneColliders, this.colliderBodies);
    const visual = this.zoneVisuals.get(zoneId);
    if (visual) {
      visual.graphics.destroy();
      visual.label.destroy();
      this.zoneVisuals.delete(zoneId);
    }
    this.zones.delete(zoneId);
    this.setStatus(`${ZONE_STYLE[zone.type].symbol} zone removed.`);
    this.buildPanelUI();
  }

  private placeAsset(assetId: string, x: number, y: number): void {
    const def = getMapAssetDef(assetId);
    if (!def) return;
    const data: EditorPlacedAsset = {
      id: generateEditorId('asset'),
      assetId,
      x: Math.round(x),
      y: Math.round(y),
      scale: 1,
      layer: this.currentLayer,
    };
    const instance = createEditorAssetInstance(this.scene, data, this.colliderBodies);
    if (!instance) return;
    this.assets.set(data.id, instance);
    this.enableInstanceEditing(instance);
    this.tool = 'select';
    this.pendingAssetId = null;
    this.selectInstance(data.id);
    this.setStatus(`Placed "${def.label}". Drag to move, or use the panel to scale/delete.`);
    this.buildPanelUI();
  }

  private enableInstanceEditing(instance: EditorAssetInstance): void {
    const { image } = instance;
    image.setInteractive({ useHandCursor: true });
    this.scene.input.setDraggable(image);
    image.off('pointerdown');
    image.off('drag');
    image.on('pointerdown', (_p: Phaser.Input.Pointer, _lx: number, _ly: number, event: Phaser.Types.Input.EventData) => {
      if (this.tool !== 'select') return;
      event.stopPropagation();
      this.selectInstance(instance.data.id);
    });
    image.on('drag', (_pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
      if (this.tool !== 'select' || this.selectedInstanceId !== instance.data.id) return;
      image.setPosition(Math.round(dragX), Math.round(dragY));
      instance.data.x = image.x;
      instance.data.y = image.y;
      applyInstanceDepth(image, instance.data.layer);
      applyInstanceCollider(this.scene, instance, this.colliderBodies);
      this.drawSelectionOutline(instance);
    });
  }

  private selectInstance(id: string): void {
    this.selectedInstanceId = id;
    const instance = this.assets.get(id);
    if (instance) this.drawSelectionOutline(instance);
    this.buildPanelUI();
  }

  private clearSelection(): void {
    this.selectedInstanceId = null;
    this.selectionOutline?.destroy();
    this.selectionOutline = null;
    this.inspectorObjects.forEach((o) => o.destroy());
    this.inspectorObjects = [];
  }

  private drawSelectionOutline(instance: EditorAssetInstance): void {
    this.selectionOutline?.destroy();
    const g = this.scene.add.graphics();
    g.setDepth(DEPTH.OVERLAY_LOW + 1);
    const b = instance.image.getBounds();
    g.lineStyle(1, 0xffffff, 0.9);
    g.strokeRect(b.x, b.y, b.width, b.height);
    this.selectionOutline = g;
  }

  private adjustSelectedScale(delta: number): void {
    if (!this.selectedInstanceId) return;
    const instance = this.assets.get(this.selectedInstanceId);
    if (!instance) return;
    instance.data.scale = Phaser.Math.Clamp(instance.data.scale + delta, 0.2, 3);
    applyInstanceSize(instance.image, instance.data.assetId, instance.data.scale);
    applyInstanceDepth(instance.image, instance.data.layer);
    applyInstanceCollider(this.scene, instance, this.colliderBodies);
    this.drawSelectionOutline(instance);
    this.buildPanelUI();
  }

  private deleteSelected(): void {
    if (!this.selectedInstanceId) return;
    const instance = this.assets.get(this.selectedInstanceId);
    if (instance) {
      if (instance.collider) {
        const idx = this.colliderBodies.indexOf(instance.collider);
        if (idx !== -1) this.colliderBodies.splice(idx, 1);
        instance.collider.destroy();
      }
      instance.image.destroy();
      this.assets.delete(this.selectedInstanceId);
    }
    this.clearSelection();
    this.buildPanelUI();
  }

  // ---------------------------------------------------------------------------------------------
  // Zone painting
  // ---------------------------------------------------------------------------------------------

  private redrawInProgressShape(): void {
    this.inProgressGraphics?.destroy();
    if (this.inProgressPoints.length === 0) {
      this.inProgressGraphics = null;
      return;
    }
    const style = ZONE_STYLE[this.tool as EditorZoneType];
    const g = this.scene.add.graphics();
    g.setDepth(DEPTH.OVERLAY_LOW + 2);
    g.lineStyle(2, style.stroke, 1);
    g.beginPath();
    g.moveTo(this.inProgressPoints[0].x, this.inProgressPoints[0].y);
    for (let i = 1; i < this.inProgressPoints.length; i++) g.lineTo(this.inProgressPoints[i].x, this.inProgressPoints[i].y);
    g.strokePath();
    this.inProgressPoints.forEach((p) => {
      g.fillStyle(style.stroke, 1);
      g.fillCircle(p.x, p.y, 2.5);
    });
    this.inProgressGraphics = g;
  }

  private clearInProgressShape(): void {
    this.inProgressPoints = [];
    this.inProgressGraphics?.destroy();
    this.inProgressGraphics = null;
  }

  private finishZone(): void {
    if (this.inProgressPoints.length < 3) return;
    const type = this.tool as EditorZoneType;
    const zone: EditorZone = {
      id: generateEditorId('zone'),
      type,
      layer: this.currentLayer,
      points: this.inProgressPoints.slice(),
    };
    this.zones.set(zone.id, zone);
    if (type === 'blocked') addZoneCollider(this.scene, zone, this.zoneColliders, this.colliderBodies);
    this.clearInProgressShape();
    this.showZoneVisual(zone);
    this.setStatus(`${ZONE_STYLE[type].symbol} zone added.`);
    this.buildPanelUI();
  }

  private showZoneVisual(zone: EditorZone): void {
    const style = ZONE_STYLE[zone.type];
    const g = this.scene.add.graphics();
    g.setDepth(DEPTH.OVERLAY_LOW);
    g.fillStyle(style.fill, 0.35);
    g.lineStyle(1.5, style.stroke, 0.9);
    g.beginPath();
    g.moveTo(zone.points[0].x, zone.points[0].y);
    for (let i = 1; i < zone.points.length; i++) g.lineTo(zone.points[i].x, zone.points[i].y);
    g.closePath();
    g.fillPath();
    g.strokePath();

    const b = zoneBounds(zone);
    const label = createText(this.scene, b.x + b.width / 2, b.y + b.height / 2, style.symbol, {
      fontSize: '10px',
      color: '#ffffff',
      fontStyle: 'bold',
    });
    label.setOrigin(0.5);
    label.setDepth(DEPTH.OVERLAY_LOW + 0.5);

    this.zoneVisuals.set(zone.id, { graphics: g, label });
  }

  // ---------------------------------------------------------------------------------------------
  // Persistence
  // ---------------------------------------------------------------------------------------------

  private save(): void {
    const data: EditorMapData = {
      version: 1,
      assets: Array.from(this.assets.values()).map((i) => i.data),
      zones: Array.from(this.zones.values()),
    };
    saveEditorMapData(data);
    downloadEditorMapData(data);
    this.setStatus('Saved. A JSON file was also downloaded.');
  }
}

/** Standard ray-casting point-in-polygon test, used to hit-test a click against a painted zone's
 * exact shape (not just its bounding box) when deciding what to delete. */
function pointInPolygon(x: number, y: number, points: { x: number; y: number }[]): boolean {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x;
    const yi = points[i].y;
    const xj = points[j].x;
    const yj = points[j].y;
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}
