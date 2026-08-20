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
  (35ms/char), tap/click/Space/Enter/E to skip-then-advance. Portraits are
  **dedicated bust art** (`portraitTemplate.ts`), not crops of the overworld
  sprite — keyed `portrait_<characterId>_<expression>`, with four expression
  states (`neutral`/`blink`/`talk`/`talkBlink`) driven by
  `gameplay/PortraitAnimator.ts` (randomized blink timer + occasional double
  blink, mouth animates only while the line is typing). One animator instance
  is reused per `DialogueBox`; `setSpeaker()` reseeds it on every line.
- `src/scenes/ApparitionJourneyScene.ts` — the 18-mission path screen shown
  after Home → Play. Progression state comes from
  `missionRegistry.ts#getMissionState()` (locked/unlocked/completed), gated
  by mission completion unless `SaveData.get().gameDevMode` is on (Settings
  toggle, lets QA jump to any mission). Selecting an unlocked+implemented
  mission goes straight to `CachotScene` — Mission 1 always starts inside Le
  Cachot, never in the open world.
- `src/assets/home/homeBackground.ts` + `home_background.png` — the Home
  screen background is the maintainer's own finished artwork, loaded as a
  real image and used exactly as supplied (recovered byte-for-byte from the
  conversation that provided it — verified pixel-identical, see git history
  around the commit that added it). **There is no procedural Home
  background any more** — an earlier pass built one from a palette inferred
  off this same reference image, and the maintainer explicitly rejected
  that as a misunderstanding: they wanted the actual image, not a
  recreation of its style. Don't regenerate one; if the background ever
  needs to change, get a new real image. `HomeScene.ts#buildBackground()`
  scales it uniformly ("cover", never a non-uniform stretch) — the source
  is already 16:9 so in practice nothing is visibly cropped. Needs
  `setFilter(LINEAR)` like any other real-photo/illustrated texture (see
  the pixelArt gotcha below); set once in `BootScene.create()`.
- `src/pixelart/homePalette.ts` — a palette extracted from that same
  reference image, used only for the Home title/buttons/gear so they read
  as belonging to the background (`UI_KEYS.HOME_BUTTON`/`HOME_GEAR` in
  `pixelart/ui.ts`). Deliberately separate from every other screen's
  palette/textures — when the maintainer asks for one screen's visuals to
  match a reference, make new keys/files for it rather than editing the
  shared `UI_KEYS.BUTTON`/`PANEL`/`GEAR` textures, which `Settings`,
  `ConfirmDialog`, `TasksPanel`, `DialogueBox`, and `GameplayTopBar` all
  still use. `ui/Button.ts#createButton` takes an optional `ButtonStyle`
  (texture key, border, text color, hover tint) for exactly this — defaults
  match the original shared button, so existing call sites are untouched.
- `src/gameplay/TasksPanel.ts` / `GameplayTopBar.ts` / `ui/ConfirmDialog.ts` —
  the compact objective checklist, the in-gameplay gear/home buttons, and the
  reusable confirm/cancel modal. All three are instantiated per-scene (not
  global) and every scene's `update()` must gate movement/interaction on
  `tasksPanel.isOpen() || topBar.isBlocking() || dialogueBox.isActive()` —
  copy that pattern exactly when adding a new gameplay scene, don't
  reinvent it.
- `src/scenes/OverworldScene.ts` is the **entire** outdoor world: Le Cachot's
  exterior, the town, the Gave de Pau (an L-shaped river — a horizontal arm
  forms the town boundary with a bridge, a vertical arm beside the grotto is
  never crossable on foot), the open field, the grotto, and the first
  apparition's whole phase machine (`'explore'|'crossing'|'hush'|'apparition'
  |'praying'|'ending'`), all as one continuous scene with zero internal scene
  transitions. There is deliberately no separate "Massabielle" scene — the
  player walks there. Only Le Cachot's *interior* (`CachotScene`) is a
  separate scene, entered/exited via its door. Keep it this way; a second
  outdoor scene has been explicitly rejected twice.
- `src/gameplay/LeaderNpc.ts` drives an NPC that leads the player along fixed
  waypoints (used for Jeanne after the "meet Jeanne" dialogue in
  `OverworldScene`), as opposed to `gameplay/Follower.ts` which trails behind
  the player (used for the younger sister, and for Jeanne again once the
  scripted river-crossing cutscene takes over). `LeaderNpc` stops and waits
  when the player falls past `maxDistance`, resumes once the player is back
  within `resumeDistance`, and stops for good on its last waypoint — don't
  merge this back into `Follower.ts`, the two have opposite semantics (led
  vs. trailed) and reuse would need constant mode-branching.
- `src/gameplay/RosaryUI.ts` lays the ten beads out on a circular/oval
  parametric curve (`Math.cos`/`sin` around a center point) with a gap at the
  bottom where the cross hangs, screen-fixed and centered — not a straight
  line. It draws a translucent dark backdrop ellipse behind the beads first;
  without it the dim (unprayed) bead color is nearly invisible against
  light terrain (grass/dirt), since pixel-art bead sprites have no outline of
  their own at that size.

### Known Phaser gotchas hit while building this

- **Static body `setSize()` + `refreshBody()` is a trap.** Calling
  `staticImage.body.setSize(w, h)` and then `staticImage.refreshBody()`
  silently *undoes* the resize — `refreshBody()` re-derives the body from the
  game object's current texture/frame, wiping out a manual `setSize`. Call
  `setSize()` and stop; don't call `refreshBody()` afterwards. (This caused
  every shrunk collider in `OverworldScene` to silently stay at full texture
  size, which made the player appear to "get stuck" short of where any
  collider should have been.)
- **`Camera.fadeOut()`/`fadeIn()` always force-restart the effect**, even if
  one is already running (it's documented behavior — "forces the fade to
  start, regardless of existing fades"). A door/trigger check that calls
  `fadeToScene()` from every frame the player stands in a trigger zone (the
  natural way to write it) will therefore reset the fade to 0% every frame
  and it will *never* complete — the player gets stuck unable to leave.
  `gameplay/transitions.ts#fadeToScene()` now guards against this itself
  (`if (cameras.main.fadeEffect.isRunning) return;`) — call sites don't need
  to add their own one-shot flag, but don't reintroduce a raw
  `camera.fadeOut()` call elsewhere without the same guard.
- **Y-depth sorting**: every world sprite (player, NPCs, trees, buildings)
  uses `depthForY()` from `gameplay/utils.ts` with the *same* base
  (`DEPTH.ACTORS`) so depth ordering reflects vertical position consistently.
  The one deliberate exception is the Lady at the grotto niche — she's pinned
  to `DEPTH.ACTORS + 0.5` (see `OverworldScene.ts`) so she always renders in
  front of the grotto rock face regardless of Y-sort, since the niche sits
  visually *on* the rock, not behind it.
- Water/river tiles are not automatically solid — each scene that has a
  river adds an explicit invisible blocker (`gameplay/utils.ts#createBlocker`)
  over the water tiles. If you add a new river/water area, add its blocker
  too or the player will walk on water.
- `Phaser.Input.Keyboard.JustDown()` needs the key to still read `isDown` at
  check time — a same-tick synthetic down+up (e.g. in an automated test) is
  invisible to it. Not a game bug, just a testing footgun; hold keys down
  across at least one frame when scripting input.
- **Depth layering is a strict stack, defined once in `core/constants.ts`**:
  `GROUND < PROPS < ACTORS < OVERLAY_LOW < UI < DIALOGUE < FADE`. Persistent
  gameplay chrome (joystick, Tasks button, gear/home) sits at `UI`; any modal
  (`DialogueBox`, `ConfirmDialog`, `TasksPanel`'s popup) must sit at
  `DIALOGUE` or above or it renders *underneath* the joystick/HUD — this
  exact bug happened once (dialogue portrait hidden behind the touch
  joystick) and was the reason for this ordering. A full-screen cinematic
  fade/blackout (see `OverworldScene`'s apparition ending) must use `FADE`
  and put its own captions at `FADE + 1`, not `UI` — otherwise the HUD shows
  through the "blackout."
- **Blurry text root cause**: the game renders at a small logical resolution
  (480x270) that gets scaled up to fill the real viewport; canvas-rendered
  text is anti-aliased at any size, and nearest-neighbor-upscaling an
  anti-aliased texture looks blocky-mushy (sprites don't have this problem
  because they're authored low-res on purpose). Fixed by giving every
  `Phaser.GameObjects.Text` a higher internal `resolution` (supersampling) via
  `ui/text.ts#textStyle()` — **always build text through that helper**, never
  call `scene.add.text(...)` with a raw style object, or the text will be
  blurry again.
- **Character art bible** (`pixelart/personTemplate.ts` +
  `pixelart/characters.ts`): one shared 20x28 "paper doll" skeleton, palette
  per character, auto-outlined via `PixelCanvas.ts#outlineGrid()` (draws a
  1px border into transparent cells touching the silhouette — leave a
  transparent margin around any new silhouette or edge pixels clip). Walking
  uses real 2-frame leg/arm animation (`step: 'a' | 'b'`), registered as
  Phaser animations (`walkAnimKeyFor`) once in `BootScene`; idle is a gentle
  `scaleY` breathing tween (see `Player.ts#updateBreathing`), not a texture.
  Portraits are a *separate* bigger bust grid (`portraitTemplate.ts`), not a
  crop of the body — keep both templates' proportions/palette in sync by eye
  when adding a character. Every character gets a small pixel shadow
  (`SHADOW_KEY`) as a child image synced each frame via
  `NpcActor#syncShadow()` / done inline in `Player.ts`.

### Art direction: history and current constraint

The maintainer rejected the original procedural pixel-art look
(`src/pixelart/`, still the live art for the real game — do not port
production scenes away from it until a replacement is explicitly approved).

Attempt 1 was a soft illustrated/chibi style built directly from three
reference images the maintainer supplied (Bernadette, her face, the Lady of
Lourdes), plumbed through a real-image pipeline (`Phaser.Scene#load.image()`
+ Vite `assetsInlineLimit` so binary assets inline as base64 — see
`vite.config.ts` and `src/vite-env.d.ts`, both still present and reusable).
**Rejected** — the maintainer wants pixel art, not illustration. That
pipeline's specific content (`VisualTestScene.ts`,
`src/assets/characters/*.png`, `src/assets/realArt.ts`) was deleted; don't
resurrect it without being asked.

Attempt 2 (current) targets handcrafted, pastel, "Cast N Chill"-quality
pixel art — explicitly *not* a filter over the old procedural grids, not
generic RPG tiles, and (per the maintainer) not gray-box placeholders
either. **No image-generation tool is available in this environment**
(checked via ToolSearch and SearchMcpRegistry, both times this has come up)
— that ceiling doesn't go away just because the requested style changed.
Check recent commits / ask the maintainer for the current state of this
attempt before assuming either direction is settled.

### Verification

There's no automated test suite yet (`Do not overbuild` applied to tooling
too). Verify manually: `bun run build` for type-check + bundle, then
`bun run dev` and click through in a real browser. Phaser games are easy to
get into a state where physics silently no-ops (see the static body gotcha
above) without throwing — a build passing is not proof the game is playable.
