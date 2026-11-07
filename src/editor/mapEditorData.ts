/**
 * Persisted shape for everything the map editor places, separate from every hand-tuned constant
 * already in `OverworldScene.ts` (`TOWN_BUILDINGS`, the river/bridge band, NPC waypoints, etc.) --
 * this file/store only covers what the editor itself creates, loaded *additively* on top of the
 * existing map (see `OverworldScene.ts#loadEditorPlacedAssets()`). Nothing here can move or remove
 * anything the editor didn't itself place.
 */

export const EDITOR_LAYERS = ['ground', 'river', 'buildings', 'decorations', 'characters'] as const;
export type EditorLayerId = (typeof EDITOR_LAYERS)[number];

export const EDITOR_LAYER_LABELS: Record<EditorLayerId, string> = {
  ground: 'Ground',
  river: 'River',
  buildings: 'Buildings',
  decorations: 'Decorations',
  characters: 'Characters',
};

export type EditorZoneType = 'walkable' | 'walkBehind' | 'blocked';

export interface EditorPlacedAsset {
  id: string;
  assetId: string;
  x: number;
  y: number;
  scale: number;
  layer: EditorLayerId;
}

export interface EditorZonePoint {
  x: number;
  y: number;
}

export interface EditorZone {
  id: string;
  type: EditorZoneType;
  layer: EditorLayerId;
  /** World-space polygon vertices, in placement order. Always >= 3 points. */
  points: EditorZonePoint[];
}

export interface EditorMapData {
  version: 1;
  assets: EditorPlacedAsset[];
  zones: EditorZone[];
}

function emptyMapData(): EditorMapData {
  return { version: 1, assets: [], zones: [] };
}

const STORAGE_KEY = 'lourdes.mapEditor.overworld.v1';

export function loadEditorMapData(): EditorMapData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return emptyMapData();
    const parsed = JSON.parse(raw) as Partial<EditorMapData>;
    return {
      version: 1,
      assets: Array.isArray(parsed.assets) ? parsed.assets : [],
      zones: Array.isArray(parsed.zones) ? parsed.zones : [],
    };
  } catch {
    return emptyMapData();
  }
}

export function saveEditorMapData(data: EditorMapData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage unavailable (e.g. private browsing) -- the in-memory editor state is unaffected,
    // only persistence across a reload is lost.
  }
}

/**
 * Browser storage alone isn't something the maintainer can hand back into the repo -- this
 * triggers an actual file download of the same JSON so the saved layout can be inspected, versioned,
 * or handed back to have its contents folded into the game's own source later.
 */
export function downloadEditorMapData(data: EditorMapData): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'lourdes-overworld-map.json';
  a.click();
  URL.revokeObjectURL(url);
}

let nextId = 1;
export function generateEditorId(prefix: string): string {
  nextId += 1;
  return `${prefix}_${Date.now().toString(36)}_${nextId}`;
}
