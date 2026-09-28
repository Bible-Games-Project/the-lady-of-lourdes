/**
 * Single switch for every developer-only tool in the game (currently just the in-game map editor,
 * see `editor/MapEditorPanel.ts`). Flip to `false` before publishing — every editor button, panel,
 * and input hook is gated behind this constant (never rendered/constructed at all when it's
 * `false`, not just hidden), so normal players never see or reach it.
 *
 * Deliberately a separate, compile-time flag from `SaveData`'s own `gameDevMode` (a *player-facing*
 * runtime toggle used by the Apparition Journey screen to unlock mission selection) -- unrelated
 * purpose, unrelated audience, not to be merged with this one.
 */
export const DEV_MODE = true;
