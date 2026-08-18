<!-- BGP-ADMIN:BEGIN -->
<!-- Managed by bgp-admin (templates/agent-docs). Edits inside this block are overwritten on the next sync. Add project-specific notes below the END marker. -->

# AGENTS.md

Instructions for AI coding agents working on this repository.

This repo is a **web game**. It is published as an iOS/Android app by a separate
control plane called **bgp-admin** — see "Native boundary" below, it is the rule
that matters most here.

Read also:

- [docs/agents/working-style.md](./docs/agents/working-style.md) — how the maintainer likes to work

## Native boundary

bgp-admin owns everything native. It generates the Capacitor setup, the signing
config and the release workflows from outside this repo, without modifying it.

**Never add or edit any of the following here:**

- `capacitor.config.*`, `ios/`, `android/`
- Capacitor or native plugin dependencies in `package.json`
- `.github/workflows/deploy*.yml`, `.github/workflows/preview-deploy.yml`
- Build config (`vite.config.*`, router config, base paths) changed *for the sake
  of the mobile build*

If something only breaks inside the app shell — blank screen in the WebView,
asset paths, deep links, splash screen, versioning, signing — the fix belongs in
bgp-admin, not here. Say so instead of patching around it. A local fix will be
silently overwritten on the next sync and will hide the real bug.

Normal web work (game logic, UI, assets, web build config for web reasons) is
entirely yours.

## Language

Everything you write into the repository MUST be in English:

- Source code (variables, functions, classes, file names)
- Comments of any kind
- Documentation, README files, guides
- Commit messages, branch names, PR and issue titles and descriptions
- Log messages and error messages
- Tests (descriptions, assertions, fixtures)
- Comments inside config files (YAML, JSON, TOML)
- Database schemas and API route names

Only end-user-facing content may be localized: UI strings in i18n files, store
listings, and marketing copy.

The maintainer communicates in Spanish. You may reply in Spanish in
conversation, but anything committed to the repository stays in English.

## Keeping this file current

At the end of a working session, update `AGENTS.md` with everything important
you learned that day. Worth recording:

- Conventions and patterns of this codebase that were not obvious up front
- Commands that actually work (build, test, lint, run) and their gotchas
- Decisions the maintainer made, and the reasoning behind them
- Traps you fell into, so the next agent does not repeat them

Do not record what the code already says, one-off details of a single task, or a
changelog of what you did. This file is for what the next agent needs to know
before starting, nothing else. Keep it edited down — replace stale entries
instead of appending to them.

Write project-specific notes **below the `BGP-ADMIN:END` marker**. Anything
inside the managed block is shared across all game repos and gets overwritten on
the next sync; if a rule you are adding applies to every game, it belongs in
bgp-admin at `templates/agent-docs/`, so ask before adding it.

<!-- BGP-ADMIN:END -->

## Project-specific notes

### Stack

- Vite + TypeScript + Phaser 3 (Arcade Physics). Pinned to Phaser `^3.80` and
  TypeScript `^5.6` deliberately — `bun add phaser`/`typescript` will happily
  pull Phaser 4 / TS 7, which are newer majors with different APIs. Don't
  upgrade across those majors without deliberately re-verifying the whole
  input/physics/tilemap surface.
- `bun install`, `bun run dev` (Vite dev server), `bun run build` (runs
  `tsc --noEmit` then `vite build` to `dist/` — matches what
  `preview-deploy.yml` expects), `bun run preview`.
- All pixel art is generated procedurally at boot (`src/pixelart/`) from
  small palette-indexed grids drawn with `PixelCanvas.ts` helpers — there are
  no binary image assets in the repo. `BootScene` registers every texture
  before any other scene runs. If you add a new sprite/tile/prop, register it
  there.

### Architecture (for adding apparitions 2-18)

- `src/data/missions/` — `Mission` interface + one file per implemented
  mission (only `mission01.ts` exists) + `missionRegistry.ts` holding all 18
  slots (2-18 are typed placeholders with `implemented: false`). Dates for
  missions 4-17 were never specified in the brief (only 1, 2, 3, 18 were) —
  left `dateKey: null` rather than invented; fill in as content arrives.
  Don't invent them.
- `src/gameplay/MissionManager.ts` — singleton tracking the *live* objective
  index for whichever mission is active; only completion persists to
  `SaveData`. In-progress state resets on reload by design (missions are
  short).
- `src/core/i18n/` + `src/data/locales/` — centralized localization, 12
  languages. Only `en.ts` is fully populated; the other 11 are empty
  `PartialLocaleDict` stubs that fall back to English key-by-key. Always
  reference strings via `K.SOMETHING` from `core/i18n/keys.ts`, never inline.
- `src/data/npc/`, `src/data/world/locations.ts` — NPC and location
  registries. Locations other than `cachot`/`grotto` have
  `interactableFromMission: null` (locked placeholder — walking up shows a
  "not yet part of the story" toast via `Toast.ts`).
- `src/gameplay/DialogueBox.ts` — single-speaker portrait + typewriter
  (35ms/char), tap/click/Space/Enter to skip-then-advance. Portraits are
  cropped from the same character sprite grid, keyed
  `portrait_<characterId>_<expression>` (`portraits.ts`) — only `neutral`
  exists today; adding expressions is just adding more grids there.

### Known Phaser gotchas hit while building this

- **Static body `setSize()` + `refreshBody()` is a trap.** Calling
  `staticImage.body.setSize(w, h)` and then `staticImage.refreshBody()`
  silently *undoes* the resize — `refreshBody()` re-derives the body from the
  game object's current texture/frame, wiping out a manual `setSize`. Call
  `setSize()` and stop; don't call `refreshBody()` afterwards. (This caused
  every shrunk collider in `OverworldScene`/`MassabielleScene` to silently
  stay at full texture size, which made the player appear to "get stuck"
  short of where any collider should have been.)
- **Y-depth sorting**: every world sprite (player, NPCs, trees, buildings)
  uses `depthForY()` from `gameplay/utils.ts` with the *same* base
  (`DEPTH.ACTORS`) so depth ordering reflects vertical position consistently.
  The one deliberate exception is the Lady at the Massabielle grotto niche —
  she's pinned to `DEPTH.ACTORS + 0.5` (see `MassabielleScene.ts`) so she
  always renders in front of the grotto rock face regardless of Y-sort, since
  the niche sits visually *on* the rock, not behind it.
- Water/river tiles are not automatically solid — each scene that has a
  river adds an explicit invisible blocker (`gameplay/utils.ts#createBlocker`)
  over the water tiles. If you add a new river/water area, add its blocker
  too or the player will walk on water.
- `Phaser.Input.Keyboard.JustDown()` needs the key to still read `isDown` at
  check time — a same-tick synthetic down+up (e.g. in an automated test) is
  invisible to it. Not a game bug, just a testing footgun; hold keys down
  across at least one frame when scripting input.

### Verification

There's no automated test suite yet (`Do not overbuild` applied to tooling
too). Verify manually: `bun run build` for type-check + bundle, then
`bun run dev` and click through in a real browser. Phaser games are easy to
get into a state where physics silently no-ops (see the static body gotcha
above) without throwing — a build passing is not proof the game is playable.
