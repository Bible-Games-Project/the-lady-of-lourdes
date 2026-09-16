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
  Cachot, never in the open world. **Do not touch any of this logic when
  reworking the screen's visuals** — see the Journey visuals note below for
  what changed and stayed the same.
- **Journey/Map visuals** (`ApparitionJourneyScene.ts` +
  `assets/journey/journeyMap.ts` + `data/journeyRoute.ts` +
  `pixelart/journeyIcons.ts`/`journeyPalette.ts`): same real-image approach as
  Home — `journey_map.png` (941x1672, portrait) is the maintainer's own
  finished artwork, used as-is, recovered byte-for-byte from the conversation
  that supplied it. Unlike Home it needs no "cover" crop: it's already
  portrait/scrollable, so `buildBackground()` just scales it uniformly to
  `GAME_WIDTH` and the scaled height *becomes* `worldHeight` for the existing
  camera-scroll system (drag/wheel/arrow-keys/keyboard, all unchanged).
  - `data/journeyRoute.ts#ROUTE_WAYPOINTS` is a hand-placed polyline traced
    *by eye* against this specific image (grid-overlay crops, read the pixel
    coordinates of the actual painted trail/bridges/Grotto) — it is not
    computed from anything and must be re-traced by hand if the artwork ever
    changes. A Catmull-Rom spline through those waypoints
    (`getRouteCurvePoints()`) is what both the drawn route line *and* the 18
    node positions (`getRouteNodePoints()`, evenly spaced by arc length, not
    by spline parameter) sample from — keeping them on the same function is
    what guarantees the line always passes exactly through every medallion.
    Node 1 is nearest the bottom-left, node 18 sits at the Grotto near the
    top, crossing both painted bridges in between, per the maintainer's
    explicit route description — don't replace this with a straight line or
    a sine wave (that was the old design, explicitly rejected).
  - `pixelart/journeyPalette.ts` + `journeyIcons.ts` are Journey-only,
    sampled from this map image — same reasoning as `homePalette.ts`:
    `JOURNEY_ICON_KEYS.MEDALLION`/`LOCK`/`CHECK`/`ARROW`/`HOME` are used
    *only* by this scene, so they were safe to recolor/redesign freely
    without touching the shared gameplay `pixelart/palette.ts` or
    `pixelart/ui.ts` textures other scenes rely on.
  - **`JOURNEY_ICON_KEYS.ARROW` points up by default; the scroll-down button
    applies `.setFlipY(true)`.** The previous shared `UI_KEYS.CARET` pointed
    *down* by default with no flip on the "up" button and a flip on the
    "down" button — backwards, which is exactly why the scroll arrows read
    as wrong-direction/confusing. If you touch these buttons again, keep the
    texture's default orientation and the button's semantic direction in
    sync; don't reason about it from the old caret's geometry.
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
  shared `UI_KEYS.BUTTON`/`PANEL`/`GEAR` textures, which `ConfirmDialog`,
  `TasksPanel`, `DialogueBox`, and `GameplayTopBar` still use. (`Settings`
  now has its own recolored panel too, see below — it no longer uses the
  plain shared `PANEL`.) `ui/Button.ts#createButton` takes an optional
  `ButtonStyle` (texture key, border, text color, hover tint, panel alpha,
  text stroke) for exactly this — defaults match the original shared
  button, so existing call sites are untouched.
- **`SettingsScene`'s own visual style**: reuses `UI_KEYS.HOME_BUTTON` for
  its buttons and a Settings-only `UI_KEYS.SETTINGS_PANEL` (same bevel
  structure as the shared `PANEL`, recolored with `HOME_PALETTE` —
  `pixelart/ui.ts`) for its panel background, plus `ui/Toggle.ts` and
  `ui/Slider.ts` recolored to `HOME_PALETTE` directly (both are used
  *exclusively* by `SettingsScene`, so recoloring their defaults in place
  was safe — no separate "Settings toggle" vs "shared toggle" split needed).
  This was a deliberate choice to reuse the Home palette/button texture
  rather than invent a third one, since the ask was specifically for
  Settings to "belong to the Home screen."
- **Home screen ambient effects** (`HomeScene.ts` + `pixelart/homeEffects.ts`):
  the background image itself is still never touched. Everything alive is a
  layer on top:
  - The Lady and the sky's cloud cluster are **fully static** — shown only
    via the untouched background, no cutout, no motion. This was tried the
    other way (both had a subtle breathing/drift animation) and explicitly
    reverted on maintainer request; don't reintroduce motion for either
    without being asked. The Lady's soft light rays (`buildLadyLight()`,
    see below) are a *separate* overlay and are unaffected by this — she
    keeps her gentle moving light, she just doesn't breathe/sway herself.
  - Bernadette has exactly one small animated cutout: `bernadette_torso_cutout.png`
    (`HOME_BERNADETTE_TORSO_CUTOUT_KEY`, rect in `HOME_CUTOUT_SOURCE_RECT.bernadetteTorso`)
    — a *tight* crop of only her torso/chest, deliberately excluding her
    head/kerchief and her clasped hands, feathered to transparent at the
    edges. It's laid back at its exact original position (origin `(0.5,1)`,
    anchored at the bottom so her waist — the point that must stay
    pixel-aligned with the static background — never moves; only the chest
    above it subtly rises). An earlier version animated her *entire*
    full-body cutout (bob + scale) and was explicitly rejected — it read as
    "an animated sprite," not a person quietly breathing. If you revisit
    this, keep the animated region small and anatomically specific (torso
    only), and if a tighter/cleaner cutout can't be found, **the maintainer's
    explicit fallback is to leave Bernadette fully static** — a visible
    cutout edge or a moving whole-figure is worse than no animation at all.
  - **Bernadette's breathing is driven directly by `Math.sin(elapsed)` in
    `HomeScene.update()` (see `advanceBernadetteBreathing()`), not a Phaser
    `yoyo: true, repeat: -1` tween.** A tween version shipped first (for the
    old full-cutout approach) and had a visible jerk at every loop restart;
    a plain continuous sine of elapsed time has no loop boundary to snap at
    by construction (`sin(0) === sin(2π)`, derivative too). If you add
    another slow ambient loop here, use this same pattern, not a yoyo
    tween — don't reintroduce the bug. The scale amplitude must stay well
    inside the cutout's feathered margin (see the comment on
    `HOME_CUTOUT_SOURCE_RECT` in `homeBackground.ts`) or the still,
    un-animated copy baked into the background shows through at the
    extremes.
  - `HomeScene.ts#toGameXY()` converts a pixel coordinate in the *original*
    artwork to this scene's 480x270 canvas, using the same cover-scale
    `buildBackground()` computed. Every position in this file (cutouts,
    candle glows, river glints, the Lady's light) is authored in
    original-image coordinates and converted through this — don't hardcode
    canvas-space numbers for anything meant to line up with the art.
  - The river never animates itself — a few thin highlight streaks
    (`HOME_FX_KEYS.WATER_STREAK`) drift slowly along short lanes on its
    surface instead (`buildWaterFlow()`/`advanceWaterFlow()`,
    `WATER_FLOW_LANES`). Same seamless-loop family as the breathing effect:
    position is `Phaser.Math.Linear` over a continuous `(elapsed/period) % 1`,
    and alpha tapers to 0 over the first/last quarter of the lane so the
    wrap-from-1-back-to-0 happens while invisible — don't swap this for a
    texture scroll or a yoyo tween.
  - Candle glows, river glints, and the Lady's light rays are soft
    canvas-gradient textures (`pixelart/homeEffects.ts`), not the
    hard-edged `PixelCanvas.ts` grid the rest of the game's art uses —
    intentional, since they're meant to blend into a painted illustration,
    not read as pixel-art objects themselves. Their flicker/shimmer is a
    self-rescheduling tween chain (`HomeScene.ts#flicker()`/
    `#glintCycle()`), not a fixed-period yoyo, so instances drift in and
    out of phase instead of pulsing in lockstep — and because each leg
    targets a fresh random value there's no periodic "loop point" for this
    one to snap at either, unlike the breathing/cloud case above.
  - Leaves/motes are plain per-frame physics in `HomeScene.update()`
    (fall/rise speed + wind drift + a sine wobble), not a particle emitter
    — six leaves and three motes is cheap enough that a manual loop is
    simpler than standing up `GameObjects.Particles` for it. Leaf textures
    carry a faint halo (see the comment in `homeEffects.ts#leafCanvas()`)
    because autumn-colored leaves drifting over an autumn-colored painting
    camouflage almost completely without one — don't remove it thinking
    it's unnecessary glow.
- **`src/core/scaleMode.ts`** — the game ships as a native app (see "Native
  boundary" above), so real device aspect ratios rarely match the 16:9
  logical resolution (`GAME_WIDTH`x`GAME_HEIGHT`). Gameplay scenes
  (Overworld/Cachot/MissionComplete/LanguageSelect/MoreGames) use
  `useLetterboxScale()` (`Phaser.Scale.FIT`) so the *entire* logical canvas
  is always visible — required, since their HUD (gear, joystick, Tasks
  button) is pinned close to the logical edges and would get cropped
  otherwise. Home, Settings, and the Journey map use `useFullBleedScale()`
  (`Phaser.Scale.ENVELOP`) instead, per explicit maintainer request: these
  screens must fill the device edge-to-edge with no letterbox bars, cropping
  the art on mismatched aspect ratios rather than showing bars. Call the
  right one at the top of every scene's `create()` — including ones reached
  via `scene.launch()`, like `SettingsScene`, which restores the correct
  mode on close based on `returnTo` since it can be opened from either kind
  of screen (see `FULL_BLEED_RETURN_SCENES` there). The Scale Manager is
  global to the one `Phaser.Game`/canvas, so this is a live runtime switch,
  not a per-scene setting — **you cannot just assign
  `scene.scale.scaleMode` and call `.refresh()`**: Phaser only applies a
  scale mode's aspect/crop behavior to `displaySize` once, in
  `ScaleManager#boot()`; `refresh()` never re-calls
  `displaySize.setAspectMode()`, so a bare mode change reports the new mode
  but has no visual effect. `scaleMode.ts` mirrors what `boot()` does
  (`scale.displaySize.setAspectMode(mode)` before `refresh()`) — always go
  through `useFullBleedScale()`/`useLetterboxScale()`, don't hand-roll this
  again. Pointer/click hit-testing was verified to still map correctly after
  a runtime switch (Phaser recomputes it live from the canvas rect), so no
  extra input-coordinate work is needed.
- **`src/core/safeArea.ts`** — under `useFullBleedScale()` (ENVELOP), a
  device whose aspect ratio doesn't match 16:9 crops part of the logical
  480x270 canvas off-screen (top/bottom on a wider device, left/right on a
  narrower one — see the `scaleMode.ts` bullet above). Anything positioned
  at a fixed `GAME_WIDTH`/`GAME_HEIGHT`-relative coordinate near an edge can
  end up entirely inside that cropped, invisible region — this is exactly
  what happened to Home's gear/Play/More Games buttons (they sat close
  enough to the logical top/bottom edges that wider-than-16:9 devices
  cropped them off-screen). `getSafeAreaInsets()` computes the current
  crop in logical pixels from `scale.displaySize` vs. `scale.parentSize`;
  `onSafeAreaChange(scene, layout)` calls `layout(insets)` immediately and
  again on every `Phaser.Scale.Events.RESIZE`, auto-unsubscribing on scene
  shutdown. Any element that must always be reachable near a screen edge on
  a full-bleed scene should be positioned via this, adding the scene's own
  margin *on top of* the inset (`insets.right + 24`, not just `24`) — see
  `HomeScene.ts`'s gear/Play/More Games for the pattern, including clamping
  the two bottom buttons to their own half of the screen so they can never
  cross each other on an extreme aspect ratio. **These three are anchored
  by the screen-facing *edge*, not the center**: the gear uses
  `Image#setOrigin(1, 0)` (native Phaser support) so its position *is* its
  top-right corner; Play/More Games use `createButton()`'s `origin` param
  (`{ x: 0, y: 1 }` / `{ x: 1, y: 1 }` — see the `ui/Button.ts` bullet and
  the Container hit-testing gotcha below) for the same reason on a
  `Container`, which has no native origin. Either way the safeArea math
  becomes a direct `edge ± margin`, no `± width / 2` needed — don't
  reintroduce manual half-width/height offsets here. Letterboxed (FIT) scenes
  never need this — insets are always zero there, since FIT never crops.
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

- **A Text style object with `stroke`/`strokeThickness` keys present but
  `undefined` silently breaks that Text's canvas sizing to 0x0 — the label
  never renders at all, with no error.** This is *not* the same as omitting
  the keys entirely (which works fine and is the "no stroke" default).
  `ui/Button.ts#createButton()` used to always pass both keys
  (`stroke: style.textStroke?.color, strokeThickness: style.textStroke?.thickness`),
  which meant every button *without* a custom `ButtonStyle.textStroke` —
  Settings, the language pickers, Mission Complete's continue button, i.e.
  most buttons in the game — silently rendered with completely invisible
  text (confirmed via `text.canvas.width === 0` and `text.frame.width ===
  null`, not just low contrast). Fixed by only spreading those two keys into
  the style object when `textStroke` is actually set. If you ever build a
  style object for `scene.add.text()` conditionally, spread optional keys in
  rather than assigning `possiblyUndefinedValue` directly to a key that's
  always present — reproduce with `scene.add.text(x, y, 'x', { stroke:
  undefined }).canvas.width` before trusting any "it's just low contrast"
  assumption about invisible text.
- **Scenes render in `game.scene.scenes` array order — i.e. the order given
  in `main.ts`'s `scene: [...]` config — not launch/insertion order.**
  `scene.launch()` on an already-registered scene (any scene listed in the
  initial config array, which is all of them here) activates it *in place*;
  it does not move it to the end of the render list. A scene meant to
  overlay others via `scene.launch()`
  (`SettingsScene`, opened from `HomeScene` *and* from gameplay via
  `GameplayTopBar`) must be listed **after every scene it can be launched
  over**, or it renders fully interactive but completely invisible
  underneath them — confirmed by screenshotting Settings opened from
  `CachotScene` and seeing the unpaused-looking gameplay view with no
  overlay at all. `SettingsScene` is now last in `main.ts`'s scene array
  specifically for this reason — don't reorder it earlier without re-testing
  every scene that can open it.
- **`Container`'s hit-testing always adds its own fixed `displayOrigin`
  (`width/2, height/2` from `setSize()`) on top of whatever `hitArea`
  rectangle you give it — `Container.originX`/`originY` are hardcoded
  `0.5` (read-only; unlike `Image`/`Sprite`, `Container` has no
  `setOrigin()`), and `InputManager#pointWithinHitArea()` unconditionally
  does `x += gameObject.displayOriginX` before testing the point against
  `hitArea`, regardless of where the container's children actually are.**
  `ui/Button.ts#createButton()`'s `origin` param shifts the panel/text to
  `(localX, localY)` so a non-center-anchored button's `(x, y)` lands on
  the requested edge/corner instead of its center — the hit area must be
  `new Rectangle(localX, localY, width, height)`, **not**
  `Rectangle(localX - width / 2, localY - height / 2, width, height)`.
  That extra `- width / 2, - height / 2` looks like the obvious
  "re-center the hit area on the shifted content" fix and was the first
  thing tried — it's wrong, because Phaser already applies an equivalent
  shift itself via `displayOrigin`, so doing it again silently mis-hit-tests
  everything except a perfectly center-anchored button (confirmed by
  clicking across a bottom-anchored Play button in Playwright: only
  roughly the top half of it actually registered clicks). If you ever hand
  a `Container` a custom `hitArea`, reason about it in the *same local
  space its children are placed in* — don't add a "centering" offset on
  top, Phaser's own `displayOrigin` already is one.
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
  Phaser animations (`walkAnimKeyFor`) once in `BootScene`. Portraits are a
  *separate* bigger bust grid (`portraitTemplate.ts`), not a crop of the
  body — keep both templates' proportions/palette in sync by eye when adding
  a character. Every character gets a small pixel shadow (`SHADOW_KEY`) as a
  child image synced each frame via `NpcActor#syncShadow()`. **`bernadette`
  is the one exception** — see below — every other `CharacterId` (mother,
  sister, friend, lady, villagers) still goes through this whole system
  unchanged.
- **The player character (Bernadette) is real art, not this procedural
  system** (`assets/player/bernadetteSprite.ts` +
  `characters.ts#BERNADETTE_SHADOW_KEY`/`bernadetteShadowGrid()` +
  `Player.ts`) — same reasoning as the Home background: the maintainer
  supplied her own finished illustration and it's used as-is, never
  redrawn/recolored. `characters.ts` explicitly excludes `'bernadette'` from
  `registerCharacterTextures()`/`registerCharacterAnimations()`
  (`PROCEDURAL_CHARACTER_IDS`) so the procedural paper-doll version never
  gets registered under her texture keys; `bernadetteSprite.ts` loads the
  real frames under those *exact same* `textureKeyFor`/`walkAnimKeyFor` key
  strings instead. This means `Player.ts`, `spriteFacing.ts`, and
  `NpcActor.ts` needed **no changes to their key-lookup logic** — they only
  ever address characters through those key-generating functions, so
  swapping what a key resolves to was enough. (`spriteFacing.ts` did gain one
  new opt-in parameter for the diagonal rule below — see that bullet.)
  - **All three facings (`side`/`up`/`down`) are genuine supplied art now —
    no mirroring, rotation, or reconstruction of one pose to fake another.**
    An earlier version of this file used a single right-facing side pose for
    both `down` and `side`, and a *reconstructed* back view (built by
    mirroring the side pose's own pixels — see git history if that technique
    is ever needed again for a different character) for `up`. The maintainer
    later supplied a proper 3-panel reference sheet (side / back / front, in
    that fixed order) drawn specifically for this; that reconstruction is
    obsolete and no longer used. `side` → `bernadette_side_*.png` (used as-is
    for `right`, `setFlipX`-mirrored in `spriteFacing.ts` for `left`); `up` →
    `bernadette_back_*.png`; `down` → `bernadette_front_*.png`. Each of the 3
    source panels was cropped to its own precise alpha bounding box and all
    three resized to the *same* final height so switching facing never jumps
    her apparent scale — confirmed live via `player.displayWidth` staying
    exactly `15` across every facing during Playwright testing (true for
    *that* source sheet specifically, where all 3 panels happened to have
    similar proportions; see the *second* sprite-sheet-swap bullet below for
    why width is no longer expected to be uniform).
  - **Diagonal movement uses only the vertical-axis view (back/front), never
    the side view** — an explicit maintainer requirement, since the 3-view
    set has no diagonal art and "the vertical component determines the
    sprite" regardless of how much horizontal vs. vertical motion there is.
    Implemented as an opt-in `preferVerticalOnDiagonal` parameter on
    `spriteFacing.ts#updateFacingAnimation()` (default `false`, so every
    `NpcActor` caller — mother, Jeanne, etc. — keeps the old
    dominant-axis-wins behavior unchanged); `Player.ts` passes `true` on both
    of its call sites. This has to be a real rule, not just reliance on
    keyboard ties falling through to the `else if (vy !== 0)` branch —
    `TouchControls.vector` can be an arbitrary continuous unit vector (e.g.
    `(0.6, 0.8)`), where plain `Math.abs(vx) > Math.abs(vy)` would pick
    horizontal and violate the rule.
  - **The walk-cycle frames (`bernadette_side/back/front_walk_a/b.png`) are a
    cutout-puppet deformation of the *same* pixels per view, generated
    offline in Python — not new drawn content and not a runtime effect.**
    Per-row horizontal shear below the waist (the skirt sway — a single
    direction for the side view; mirrored/opposing halves for back/front so
    it reads as a subtle twist rather than a uniform lean), a sub-pixel
    vertical bob, a small opposite shift on the hand region(s) (one hand for
    the side view, two — independently shifted — for back/front, for
    counter-swinging arms), and **independent shifts on the *left* and
    *right* boot regions separately** (one moves down/forward as "planted,"
    the other up/back as "lifted," then the roles swap in the other frame),
    instead of the whole foot cluster translating as one block. A single
    shared boot-cluster shift reads as "the sprite sliding," not "feet
    stepping" — the two feet have to move differently from each other for it
    to read as walking.
  - **Deform at a larger intermediate resolution, then downscale — not the
    other way, and not directly at the final display size either.** All
    3 views' final frames are 15x42, but the *deformation* itself is
    computed on a ~60px-tall version (with a mild unsharp-mask pass first,
    since LANCZOS downscaling alone blurred the boots past the point of
    reading as two feet) and only downscaled to final size at the very end.
    Deforming directly at the tiny final size left too few pixels for the
    two feet to read as different from each other; deforming the large
    source and downscaling after made 1-2px shifts vanish into sub-pixel
    noise. If these frames are ever regenerated, keep this two-stage
    (deform-large, then-downscale) approach, and reuse the asymmetric
    (single hand/skirt-shear direction) variant for the side view vs. the
    symmetric (mirrored hands/opposing skirt shear) variant for back/front.
  - **Idle breathing is `Math.sin(time)` on `scaleY`, not a yoyo tween** —
    same reasoning and same bug as Home's breathing effect (a yoyo tween
    has a visible jerk on every loop repeat; a continuous sine doesn't, by
    construction). `time` is the elapsed-ms value Phaser already passes into
    `update()`, so no separate accumulator was needed. Very small amplitude
    (1.5%) per "almost imperceptible" — **the maintainer has explicitly
    signed off on this exact effect twice now; don't touch `updateBreathing()`
    without being asked.**
  - **Her shadow (`BERNADETTE_SHADOW_KEY`) is a distinct, hand-authored
    irregular blob**, not the generic rounded-rectangle `SHADOW_KEY` every
    other character still uses. It reacts to the same breathing sine as she
    does, but only in `scaleX`/alpha, via `Player.ts#syncShadow()` staying
    completely separate from the scale logic — its position is set from
    `this.x`/`this.y` only, every frame, regardless of her breathing scale,
    so it can never lift off the ground.
  - **Her textures must stay on Phaser's default NEAREST sampling — do NOT
    call `setFilter(LINEAR)` on them, unlike the Home background.** An
    earlier version of this file did exactly that (copying the Home
    background's real-photo handling, reasoning she was "real illustration,
    not the hard-edged procedural pixel grid"), and it was wrong: Home's
    background is a single large image meant to read as illustration, but
    Bernadette's frames are meant to read as pixel art like every other
    character — the whole game already runs `pixelArt: true` in `main.ts`,
    which defaults every texture to NEAREST/hard-edged sampling, and her
    explicit LINEAR override was the one exception, smearing her small
    15x42 frames into a visibly blurred silhouette on every scale-up (a
    reported regression — confirmed by comparing `player.texture.source[0].scaleMode`
    live: `1`/NEAREST after the fix vs. `0`/LINEAR before, and by zoomed
    in-game screenshots showing her skirt/boot edges go from soft gradients
    to the same hard-edged blocky pixels as the grass tiles around her).
    `registerBernadetteSprite()` (`BootScene.create()`, after
    `preloadBernadetteSprite()` has finished loading in `preload()`) now
    just registers the walk animations and leaves filtering alone.
  - **The frame PNGs themselves also had one redundant resampling pass —
    removed for the same blur regression.** The generation pipeline (source
    crop → ~60px-tall intermediate → final 15x42, both described above)
    originally ran `Image.LANCZOS` *and* `ImageFilter.UnsharpMask` at each
    of those two resizes; the unsharp pass was added to counter LANCZOS's
    inherent softening but is itself extra, avoidable resampling on top of
    an already-lossy resize. Frames were regenerated from the same untouched
    alpha-cropped source panels (`bern3_side/back/front.png`, never touched
    by any resize) with a single clean `Image.LANCZOS` resize per step and
    no unsharp pass — idle frames need no deformation at all (breathing is
    a runtime `scaleY` effect, never baked into the texture) so those are
    one direct resize straight from the source crop to final size. Verified
    the regenerated walk frames against the previous (approved) ones at
    matched nearest-neighbor zoom before replacing them — same silhouette,
    same boot/hand articulation, same skirt sway, only less redundant blur.
    **Do not reintroduce an unsharp pass or raw nearest-neighbor for this
    big a downscale ratio if these frames are ever regenerated again** — raw
    nearest-neighbor at ~870px→15px was tried and tested visibly *worse*
    (noisy/aliased, not crisp) than a single clean LANCZOS pass; the crisp,
    hard-edged "pixel art" look comes from the render-time NEAREST filter
    above scaling the small-but-cleanly-resampled texture up, not from how
    the texture itself was originally downsampled.
  - Player's Arcade Body uses one fixed collider for all 3 facings
    (`body.setSize(7, 11)`, `body.setOffset(4, 30)`), sized/positioned near
    her feet against a nominal ~15px-wide frame — see the *second* sprite-
    sheet-swap bullet below for why per-facing widths are no longer uniform
    and this is now a representative approximation rather than an exact fit.
    Re-derive proportionally (`old * newDimension / oldDimension`) only if
    the shared *height* (`BERNADETTE_FRAME_HEIGHT`, currently 42) ever
    changes — width no longer drives this, don't guess from it.
  - **This is the second full gameplay-sprite-sheet swap** — the maintainer
    replaced the original 3-view reference sheet (maroon/red dress) with an
    entirely new one (blue dress); the old sheet's derived frames are gone,
    not layered underneath. Same pipeline, same file names
    (`bernadette_side/back/front_idle|walk_a|walk_b.png`), same measurement
    method (grid-overlay crops to find waist/hem/hand bands by eye) — only
    the source pixels and the measured band coordinates changed, since
    they're specific to each source image's own proportions, not reusable
    across sheets. **One real difference from the first sheet**: this
    source's three panels have genuinely different native proportions (side
    crop 276px wide vs. front 355px vs. back 390px, all at nearly the same
    ~912-919px height) — a side profile is naturally narrower than a
    front/back view of the same shoulders, so unlike the first sheet (whose
    3 panels happened to share nearly the same width and thus produced
    uniform 15px-wide final frames), this one's final frames are 13/16/18px
    wide for side/front/back respectively, all at the same 42px height. This
    is **not a bug and not something to force into uniformity** — squashing
    them to a single width would distort the source art's real proportions,
    which the maintainer explicitly required be preserved faithfully; only
    height needs to match across facings (for consistent scale/ground
    contact — see the bullet above), never width. `BERNADETTE_FRAME_SIZE`
    (a `{width, height}` constant, now inaccurate) was replaced with
    `BERNADETTE_FRAME_HEIGHT` (just the shared 42) for this reason — nothing
    else imported the old constant's `width` field, so this was a safe
    rename. Verified live: `scaleMode` stays `1`/NEAREST and `displayWidth`
    correctly reads 13/18/16 for side/up/down respectively (matching the
    source proportions, not a forced-uniform value) across all 4 cardinal
    directions and all 4 diagonals, re-run through the full Playwright
    direction/diagonal suite with breathing/shadow/facing logic untouched.
- **Her dialogue-box portrait is also real art now** (`assets/portraits/bernadettePortrait.ts`),
  same pattern as the overworld sprite: `pixelart/portraits.ts#registerPortraitTextures()`
  excludes `'bernadette'` from the procedural bust loop, and the real module preloads 4 images
  under the exact same `portraitKeyFor('bernadette', expression)` keys `PortraitAnimator` already
  addresses everyone through — no changes needed to `PortraitAnimator.ts` or `DialogueBox.ts` at
  all; that existing blink/talk state machine (random non-rhythmic blink timer with an occasional
  quick double-blink, mouth toggling only while `DialogueBox` is actively typing, independent of
  each other) is exactly what the maintainer asked for and was already built for the procedural
  portraits — it just needed a real-art `Expression → texture` mapping.
  - **This is the second portrait swap** — the maintainer replaced the first supplied image with
    a new one; the frames below are derived from that second image only, not layered on the first.
    Only one pose was supplied each time, but the pose differs: the current source already has a
    *closed*, resting mouth (the first source had it open) — so this time `neutral` is the
    untouched source and `talk` is the fabricated state, the reverse of before. Always check which
    mouth state the *current* source actually shows before deciding what needs painting; don't
    assume the previous portrait's untouched/edited split still applies.
  - **Eye-closing must be restricted to the real eye/eyelid pixels only — never a rectangular (or
    even a generic geometric) region over part of the face.** The maintainer was explicit and
    emphatic about this after reviewing the first portrait's technique description. The mask is
    now found *by color*, not by shape: her irises/sclera are a cool blue-gray while every
    surrounding pixel (skin, eyebrows, hair, kerchief) is warm-toned, so `red − blue` per pixel
    cleanly separates "eye" from everything around it (skin ~95-110, eyebrow ~45-75, iris/sclera
    ~-5 to +6 — a threshold around 55-60 lands cleanly between them). `scipy.ndimage` morphology
    (`binary_dilation` → `binary_closing` → `binary_fill_holes` → keep-largest-component) cleans up
    small anti-aliasing gaps in that raw threshold without ever growing the mask past the eye's own
    silhouette. Two earlier attempts were tried and rejected for this exact reason: a plain
    ellipse inscribed in a bounding box left real iris/lash pixels sticking out past its edge; a
    Laplacian diffusion fill (repeatedly averaging each masked pixel with its neighbors) pulled in
    dark eyebrow/crease color from just outside the mask and produced a muddy dark smudge instead
    of skin. The mask that actually worked (content-based, above) is then filled with real skin
    resampled from a patch further down the cheek, alpha-feathered at the mask's own eye-shaped
    boundary (via `scipy.ndimage.distance_transform_edt`, not a rectangle's edges) before the
    closed-lid line is drawn on top in a color sampled from her own lashes.
  - **The fabricated mouth-open state needs to be bold, tall, and dark/saturated enough to survive
    the downscale to this portrait's final 58x67 size — a subtle/thin version disappears
    completely.** At 58x67 the mouth region is only ~3 pixel rows tall; a first attempt with a
    delicate thin teeth-highlight line read as a flat gray smudge indistinguishable from a closed
    mouth once downscaled. Always render candidate expression frames down to the *actual* final
    58x67 size before judging them — softness/contrast that looks fine zoomed into the
    full-resolution working crop can vanish entirely after the downscale.
  - Bounding boxes/color thresholds above are specific pixel coordinates and color ranges for this
    exact source image — re-derive them by eye (grid-overlay crops, as used throughout this
    pipeline) against whatever image is current, never reuse old numbers verbatim.
  - **Textures are generated at exactly 58x67 — the same size `DialogueBox.ts` displays the
    portrait at (`setDisplaySize(58, 67)`)** — a single clean `Image.LANCZOS` downscale straight
    from the edited full-resolution crop, so the renderer performs *no* scaling at all.
  - **Do NOT call `setFilter(LINEAR)` on these textures** — same mistake, same fix, same reasoning
    as the overworld sprite above: this portrait is meant to read as pixel art next to every other
    character's procedural portrait, and the game already defaults every texture to NEAREST.
- **Jeanne's (`CharacterId` `'friend'`) dialogue-box portrait is real art too now**
  (`assets/portraits/jeannePortrait.ts`) — same treatment as Bernadette's, extended to a second
  character. `pixelart/portraits.ts#registerPortraitTextures()` now excludes both `'bernadette'`
  and `'friend'` (via `REAL_ART_PORTRAIT_IDS`) from the procedural bust loop; every other character
  (mother, sister, lady, villagers) is still procedural. Again, zero changes needed to
  `PortraitAnimator.ts`/`DialogueBox.ts` — only a real-art `Expression → texture` mapping preloaded
  under the same `portraitKeyFor('friend', expression)` keys.
  - Same situation as Bernadette's *second* portrait: only one pose supplied, mouth already
    closed/resting, so `neutral`/`blink` are the untouched/eyes-only-edited states and
    `talk`/`talkBlink` needed a fabricated open mouth.
  - Reused the same content-based (`red − blue`) eye-isolation technique, but **had to re-verify it
    actually discriminates for this character** rather than assume it would: Jeanne's eyes are
    brown, not the blue-gray of Bernadette's second portrait, so the iris-vs-skin gap is narrower
    (skin ~78-94, eyebrow ~69-78, iris/sclera ~15-40 here, vs. skin ~95-110/eyebrow ~45-75/iris
    ~-5 to +6 for blue eyes) — the threshold had to sit close to the eyebrow's low end instead of
    with a wide margin. It still works, but don't assume the exact threshold value transfers to a
    different character/eye color without re-checking against a visualized mask overlay first.
  - **Also hit a plain measurement bug worth flagging**: an initial eye bounding box was too
    shallow (its bottom edge cut off before the eye's actual lower edge), so part of the iris/lower
    lid fell *outside* the box entirely and was never touched by the mask logic at all — it just
    stayed as unedited dark pixels beneath the "closed" line, no matter how the color threshold was
    tuned. Symptom looked like a color-separation problem but was actually a box-geometry problem;
    if a closed eye still shows a stray dark patch after threshold tuning, check the box bounds
    against the actual image before touching the color logic again.

### Overworld base grass: real art, Tilemap layer (not TileSprite)

- `src/assets/terrain/lourdesGrass.ts` + `lourdes_grass.png` — the base
  ground texture for the playable Overworld (`OverworldScene.ts`) is the
  maintainer's own grass artwork, not the old procedural `TILE.GRASS_A`/
  `GRASS_B` tiles. Scope is deliberately narrow: **Overworld only** — the
  Journey/Map screen (`journey_map.png`) and Home (`home_background.png`)
  are separate images and were untouched.
- The supplied 1254x1254 source *looks* like pixel art but its raw pixel
  data is continuous-tone (values drift smoothly pixel-to-pixel, not
  repeated flat blocks — confirmed by direct numpy sampling). Resizing
  alone, at any target size or with any resampling filter, just produces a
  *smaller* soft image. What actually produces genuine flat-color,
  hard-edged pixel art from a source like this is `Image.BOX` downscale
  (here to 157x157) **followed by color quantization**
  (`quantize(colors=12, method=MEDIANCUT, dither=NONE)`) — quantization is
  what snaps each pixel to one of a small discrete palette, creating flat
  regions with hard boundaries; the downscale alone cannot do that. Keep
  this two-step order in mind for any future "pixel art" source image that
  turns out to be continuous-tone under inspection — it's not obvious from
  looking at a thumbnail, only from sampling raw adjacent pixel values.
- **Rendered as a real `Tilemap` + `TilemapLayer`, not a `TileSprite`.**
  This matters and is not obvious: `Phaser.GameObjects.TileSprite` builds
  its repeating fill by `drawImage`-ing the source frame into an internal
  power-of-two Canvas2D context (`this.fillContext`), and in WebGL mode
  (this game's renderer) that specific compositing path never gets
  `Smoothing.disable()` called on it — Phaser only disables smoothing on a
  *different* internal canvas, and only in Canvas-renderer mode. Net
  effect: every `TileSprite` in a WebGL + `pixelArt: true` game renders its
  fill through a smoothed intermediate composite regardless of the source
  texture's own `scaleMode`, with no public API to override it. This was
  confirmed empirically — even a genuinely flat-quantized texture still
  came out visibly blurred through `TileSprite` in Playwright screenshots.
  Switching to a real `Tilemap` layer (same GPU quad/texture-batch path as
  every other sprite/tile in the game) fixed it immediately. **If a future
  background/ground texture needs to tile across an area and must stay
  pixel-crisp, use a `Tilemap` layer, never `TileSprite`.**
  `OverworldScene.ts#buildTerrain()` lays the grass down as its own
  `Tilemap` layer at `DEPTH.GROUND - 1`; the existing path/river/stone/cave
  layer sits at `DEPTH.GROUND` on top, with its grid cells defaulting to
  Phaser's `-1` ("empty tile" sentinel — renders nothing) wherever grass
  should show through, instead of the old explicit `GRASS_A`/`GRASS_B`
  index.
- The map (416x928) is narrower than the camera's logical viewport (480
  wide) at zoom 1, so `cameras.main.setBackgroundColor(...)` shows as a
  thin strip past the map's left/right edges. Kept in sync with the new
  grass's own average color (`#38737b`) so it blends instead of reading as
  a seam — update this if the grass texture ever changes again.

### Overworld church building: real art, moved to fit

- `src/assets/buildings/lourdesChurch.ts` + `lourdes_church.png` — the "Parish Church" building in
  `TOWN_BUILDINGS` (`OverworldScene.ts`) is the maintainer's own church artwork (stone building,
  slate roof, bell tower with cross, arched door, trees around the base), replacing the old
  procedural placeholder that `pixelart/props.ts#registerProps()` used to generate under
  `PROP_KEYS.CHURCH` (that generator call and the `CHURCH` key were removed — nothing else
  referenced them). Same continuous-tone-source treatment as the grass (see above): source cropped
  tight to its opaque bounds, `Image.BOX` downscale, then color quantization (32 colors here, more
  than grass's 12, since the source has far more distinct materials — stone, slate, wood, foliage —
  and a lower color count started banding visibly) with the alpha channel left untouched by the
  quantize step. Displayed at the texture's exact native pixel size (94x118) with no
  `setDisplaySize` scaling, same reasoning as the grass tile: avoids any scaling pass that could
  blur it.
- **The building moved 4 tiles west of its old placeholder spot** (col 6 → col 2, same row 36) —
  the real art's footprint (94x118) is much bigger than the old placeholder's (64x64), and at the
  old column it would have overlapped both the town plaza path (starts at col 10) and the
  presbytery building (row 45). Moving it west keeps it in the same general position relative to
  the other landmarks — immediately south of the river crossing, grouped with the presbytery on the
  town's west side — which happens to match Saint-Pierre parish church's real-world adjacency to its
  own presbytery. Verified with Playwright screenshots at multiple zoom levels: no overlap with the
  presbytery or the path, correct "Parish Church" label position, and — since it's rendered through
  `addStaticProp()` like every other building/prop, no bespoke collision code — confirmed the player
  is blocked walking straight into it but can walk around either side normally.
- Uses the same `addStaticProp(key, x, y, width, height)` path as every other building in
  `buildBuildings()` — no new collision code was needed; that helper already generalizes to any
  texture key/size (procedural or a loaded real image), sizing the collider box as a fraction of
  the given width/height regardless of source.

### Overworld presbytery: real art, same spot as the old placeholder

- `src/assets/buildings/lourdesPresbytery.ts` + `lourdes_presbytery.png` — the "Presbytery"
  building in `TOWN_BUILDINGS` is the maintainer's own artwork (two-story stone house, slate roof
  with two chimneys, blue shutters, cross-gabled entry, garden with iron fence/gate), replacing the
  generic `PROP_KEYS.TOWN_BUILDING` box it used to share with the hospice/maisonCenac/tribunal
  entries — **those three are untouched**, still on the shared procedural texture; only the
  presbytery's own `TOWN_BUILDINGS` entry got a dedicated key.
- Same continuous-tone-source treatment as the grass/church: crop tight to opaque bounds
  (978x817), `Image.BOX` downscale, then color-quantize (32 colors, median-cut, no dithering, alpha
  untouched) to force flat pixel-art edges. Displayed at the texture's exact native size (84x70,
  no `setDisplaySize`) for the same no-scaling-blur reason as the other two.
- **Unlike the church, this one did *not* need to move** — sized to 84x70 (vs. the old
  placeholder's 48x40) specifically so it still fits in the gap between the church (added earlier,
  bottom edge at row ~43.4) and the tribunal building (row 50) without touching either, at the same
  tile position (col 4, row 45) the old placeholder used. Verified with Playwright: no overlap with
  the church or tribunal, player blocked walking straight into it (collision via the same
  `addStaticProp()` path every other building uses, no bespoke code), Journey/Home unaffected.

### Church/presbytery: current layout, footprint collision, and why the tribunal moved

This whole area went through several rounds — read this section rather than the git history for
the current state; older revisions of this section (and the two above it) describe superseded
positions/sizes. `OverworldScene.ts`'s own comment above `SPECIAL_BUILDINGS` has the authoritative
numbers; this is the summary plus the non-obvious reasoning behind them.

- **Both buildings are `SPECIAL_BUILDINGS`, not `TOWN_BUILDINGS`.** They render via
  `addFootprintBuilding()` (own method, see its doc comment in `OverworldScene.ts`), not
  `addStaticProp()` — the difference is collision: instead of one rectangle sized off the whole
  sprite, each gets several small `createBlocker()` zones matching only its actual solid footprint
  (wall/fence base + tree/shrub trunks — `CHURCH_FOOTPRINT`/`PRESBYTERY_FOOTPRINT`, fractions of
  the building's own displayed width/height, measured by eye against the texture). Depth sorting
  needs no special-casing: the building's depth is set once from `depthForY(cy, DEPTH.ACTORS)`
  (`cy` = its bottom/ground-contact edge), and the player's depth is already recomputed every frame
  the same way (`Player.update()`) — so a player north of `cy` always draws behind the building
  (lower depth) and south of it always draws in front, with no per-frame work needed on the
  building's side. This is the same trick every other static prop in the file already used for
  depth; footprint collision is what actually makes the "walk behind the roof" illusion usable,
  since the old single-box collider blocked the player from ever getting close enough to the upper
  sprite to see it happen. Verified via injected keyboard input (not manually-set velocity — see
  the note below) from all four approach directions, and by reading the actual computed depth
  values (not just eyeballing screenshots) for a player position north vs. south of `cy`.
- **The tribunal moved** from its original col 5 / row 50 (a few rows south of the church, in the
  same narrow west strip) to col 20 / row 55 (east side, south of Maison Cénac) — same 48x40
  procedural art, unchanged, just relocated. This is what actually unblocked the presbytery: its
  old ~80px-tall band (tribunal's old bottom edge to the map's bottom edge) was the thing capping
  its scale at two prior rounds' worth of tweaking (~19% of Bernadette's door height, an
  unsatisfying "still a tiny miniature" result even after repeated small adjustments). With the
  tribunal gone, the presbytery now uses the *same* ~156px-wide corridor the church itself is
  capped at by the plaza path (row 49, right below the church) — a real, satisfying jump. The
  church's own ceiling is unrelated to the tribunal and didn't move: it was always the plaza path
  (unmovable terrain) that capped its width at ~156px, not any building's position.
- Current numbers (post map-resize, see the section below): church still 156x202 (unchanged size,
  position doubled to col 0.5/row 72). Presbytery is now 312x250 — doubled *again* on top of the
  map-resize doubling, per an explicit "twice as large" ask — at col 0.2/row 99, nudged down and
  left from where a plain doubling of its prior spot would have landed (col 0.5/row 98), since the
  bigger map gave genuine room to choose a spot rather than fight a space ceiling. Its door is
  still short of a literal Bernadette-height door even at this size, because this source's door is
  drawn small relative to its own canvas (10px door in a 100px-wide native texture, vs. the
  church's ~19px in 94px) — reads as matching the church's own scale regardless.
- **Presbytery art was swapped for a second version** (same lighter whitewashed-stone-and-blue-roof
  palette as the church's own second version, now with a front garden/shed) — see
  `assets/buildings/lourdesPresbytery.ts`. Fully replaced, not edited/blended.
- **Playwright collision-test gotcha, worth not re-discovering**: setting `player.body.setVelocity(...)`
  directly in a `page.evaluate()` call and then waiting does *not* reliably test sustained movement
  against a collider — `Player.update()` re-reads keyboard state and overwrites velocity to
  whatever the (empty, in a scripted test) input state says on the very next frame, so an injected
  velocity only survives about one physics tick (~1-2px of drift) regardless of whether a collider
  is actually there. This produces deceptively similar-looking "barely moved" results for both a
  genuinely-blocked test and a broken one. Use real simulated key presses instead
  (`page.keyboard.down('ArrowLeft')` / `waitForTimeout` / `keyboard.up`) so `Player.update()`'s own
  input-reading logic drives the velocity every frame, the same as actual play. Also: read a
  `depth`/position value in a *separate* `page.evaluate()` call after a `waitForTimeout`, not
  inside the same call that just set the position — `Player.update()` (and any other per-frame
  recompute) hasn't run yet at that point, so the read reflects the *previous* frame's state.
- The door interaction zone (`buildBuildings()`'s generic `doorZone` for hospice/maisonCenac/
  tribunal) is unaffected by any of this — `addFootprintBuilding()` computes its own door zone from
  the footprint's first (wall/fence) rectangle instead of the generic proportional formula.

### Overworld map resized to 4x area (52x116 tiles) + forest border

The playable Lourdes map was widened from its prior size to 4x the area (COLS 26→52, ROWS 58→116)
to make room for future missions' locations without everything being compressed together, while
keeping every character/building's own *visual scale* and the camera's zoom completely unchanged
(`useLetterboxScale`'s logical resolution stays 480x270; nothing about `Player`/`NpcActor` sizes or
camera zoom changed).

- **The resize convention: double every position constant, leave every width/thickness constant
  unchanged.** Doubling `col`/`row`/`GROTTO_X`/`CACHOT_ROW`/etc. while the map itself exactly
  doubles in both axes preserves everything's *relative* layout (a building at 1/4 of the way down
  the old map is still at 1/4 of the way down the new one). Widths/thicknesses (building
  `widthPx`/`heightPx`, river/path tile-width constants, `FORD_ZONE`'s width) are tied to
  gameplay/visual scale, not map size, so they stay put — doubling them too would have made rivers,
  paths, and buildings look twice as *big*, not just twice as *far apart*, which is not what "same
  visual scale" means. When adding new map content, follow this same split rather than doubling
  everything uniformly.
- **Forest border is procedural, not hand-placed** (`buildForestBorder()`, called from
  `buildDecor()`): loops the four map edges in `FOREST_BORDER_SPACING_TILES`-tile steps,
  `FOREST_BORDER_DEPTH_TILES` deep, placing a tree at each cell — a hand-placed ~336-tile perimeter
  wasn't worth the entry count. `isRiverOrPathBand()` skips any cell in the river or path's own
  columns/rows (both reach the map edges by design in this layout, so a naive "edges are always
  clear ground" assumption would spawn trees in the water or blocking the road). This is what
  satisfies "the map should be surrounded by forest... do not place houses right at the outer
  edges" — the border is trees-only and generated after every other static prop, so it never
  competes with building placement.
- **`WanderNpc` bounds must be computed from the actual clear gap between the nearest river edge
  and the forest-border's inner edge**, not guessed — a rectangle that looks reasonable on paper can
  silently overlap the river's water band or extend past `MAP_W`/`MAP_H` once the map's real
  dimensions are plugged in. `FAR_BANK_WANDER_BOUNDS` was derived this way (river east edge at
  `(RIVER_V_END+1)*TILE_SIZE`, forest inner edge at `MAP_W - FOREST_BORDER_DEPTH_TILES*TILE_SIZE`)
  after a first-draft rectangle turned out to fail exactly that check.
- Zoom-math gotcha for full-map screenshots: the camera's actual logical resolution is `GAME_WIDTH`
  x `GAME_HEIGHT` (480x270 in `core/constants.ts`), not the Playwright viewport size —
  `useLetterboxScale` scales that up (2x at a 960x540 viewport, since both are 16:9). Compute
  `zoom = min(viewLogicalW / MAP_W, viewLogicalH / MAP_H)` against 480x270 for an accurate full-map
  overview shot, not against the raw viewport dimensions.

### Apparition-sequence bugs fixed: locked-idle animation, crossing facing, no-vanish wander

Three related bugs in the first-apparition sequence (river crossing → hush → apparition), all in
`OverworldScene.ts`/`Player.ts` and all now covered by the pattern below rather than one-off fixes:

- **`Player.setLocked(true)` stopped her velocity but not her walk animation.** `body.setVelocity(0,
  0)` in `Player.update()`'s locked branch stops *movement*, but Phaser's animation system keeps
  cycling whatever `walk_bernadette_*` clip was already playing at the moment she got locked (e.g.
  mid-stride) since nothing told it to stop. Fixed by calling
  `updateFacingAnimation(this, 'bernadette', 0, 0, this.facing, false, true)` every frame while
  locked (cheap and idempotent, matching how the unlocked branch already re-evaluates every frame)
  to force the idle pose/texture. If a future locked sequence (a different scripted cutscene) shows
  the same "frozen in a walk pose" symptom, check whether its own lock path calls this.
- **The sister's river-crossing walk used the wrong-direction sprite because `updateFollowerPosition`
  was still running during the scripted crossing tween.** `Follower.ts`'s per-frame follow logic
  (used while she trails the player during normal `explore` phase) recomputes her facing toward the
  player's position every frame; it wasn't gated to `explore` only (unlike `this.leader`'s own
  update, which already had this same guard for Jeanne), so during `beginRiverCrossing()`'s
  `walkTo()` tween it kept fighting the tween's own facing every frame, pointing her back toward the
  (now-locked, stationary) player instead of showing her actual direction of travel. Fixed by gating
  `updateFollowerPosition(this.sister, ...)` to `this.phase === 'explore'` in `update()`, same as the
  leader. `NpcActor.walkTo()`'s own facing calculation (dominant-axis `dx`/`dy`) was already correct
  — the bug was something else overriding it every frame, not the tween logic itself. Worth
  remembering: any new phase-scripted movement for the sister or Jeanne must go through a path this
  phase-gating already excludes, or it will hit the same fight.
- **Sister and Jeanne no longer `setVisible(false)` after crossing the river.** They now start
  wandering near the far bank via `WanderNpc` (new file, `gameplay/WanderNpc.ts`) — pick a random
  point inside a bounds rect, walk to it (same manual per-frame `actor.x/y +=` stepping and
  dominant-axis facing rule as `LeaderNpc`/`Follower.ts`, not a tween, so facing/moving/shadow stay
  in lockstep with position every frame), pause in an idle pose for a random 1.2-3.2s beat, repeat
  indefinitely. Wired from `beginRiverCrossing()` right after their crossing tweens resolve, and
  driven unconditionally in `update()` (not phase-gated) so they keep pottering around through
  hush/apparition/praying/ending rather than freezing the moment the phase changes — there's no
  scripted moment yet where the story needs them to leave. `Phaser.Geom.Rectangle.Random(rect,
  outPoint)` is the correct static API for a random point in a rect — there is no `RandomPoint`.
- **Playwright verification trick for driving straight to this sequence**: `OverworldScene`'s
  `beginRiverCrossing()` is a TS `private` method, but that's compile-time only — calling
  `scene.beginRiverCrossing()` directly from `page.evaluate()` (after grabbing the scene via
  `window.__game.scene.getScene('OverworldScene')`, which requires a temporary debug hook in
  `main.ts`, see the collision-test note above for the same pattern) skips the entire earlier
  mission — no need to drive `MissionManager` through firewood-gathering first. One catch: the
  sister's initial `setVisible()` at scene `create()` is set from
  `MissionManager.hasReachedObjective(GATHER_FIREWOOD)`, which will be `false` (mission never
  started) if you skip straight to `beginRiverCrossing()` this way — force
  `scene.sister.setVisible(true)` first so the test isolates only what the crossing/wander code
  itself does to her visibility, not an artifact of skipping the objective chain.

### Real-art secondary characters (mother, sister): same system as Bernadette

- `pixelart/characters.ts#CharacterId` already had `'sister'` and `'mother'` entries (procedural
  placeholders, already placed as `NpcActor`s — sister near the Cachot door in
  `OverworldScene.ts`, mother inside `CachotScene.ts`) before either got real art — the maintainer
  asked for their sprites "using the same character system," and that system already existed by
  construction, so integrating real art was mostly a drop-in: `assets/npc/sisterSprite.ts` and
  `assets/npc/motherSprite.ts` (new `src/assets/npc/` dir, mirroring `assets/player/`) register
  real textures under the exact same `textureKeyFor`/`walkAnimKeyFor` keys the procedural version
  used, and `PROCEDURAL_CHARACTER_IDS` now excludes both (`REAL_ART_CHARACTER_IDS = ['bernadette',
  'sister', 'mother']`) so nothing double-registers. `NpcActor`'s existing facing/walk-anim/shadow
  logic needed **zero changes** for any of this to work — it already addresses characters purely
  through those key-generating functions.
- **Sister is sized at 85% of Bernadette's height** (`SISTER_FRAME_HEIGHT = Math.round(42 * 0.85)`
  = 36px) per an explicit "she is her younger sister" ask — the *only* real-art character besides
  Bernadette herself not at the full 42px. **Mother is full 42px**, same as Bernadette, per an
  explicit "do not make her look like a child character."
  `MOTHER_FRAME_HEIGHT`/`SISTER_FRAME_HEIGHT` are each their own constant (not imported from
  Bernadette's file) so `motherSprite.ts`/`sisterSprite.ts` don't take a dependency on
  `assets/player/bernadetteSprite.ts` merely to reuse a number.
- **NpcActor's shared ground shadow (`SHADOW_KEY`) needed a new optional `shadowScale` constructor
  param** (default `1`, so every existing caller is unaffected) — that texture was sized for the
  ~28px-tall procedural character grid (`personTemplate.ts`'s `H` constant) every other `NpcActor`
  still uses, and a real-art character taller than that (36-42px vs. 28px) needs its shadow scaled
  by the same ratio to keep the same size-to-character relationship, or it reads as too small.
  `OverworldScene.ts`/`CachotScene.ts` each compute their own `..._SHADOW_SCALE = ..._FRAME_HEIGHT
  / 28` constant and pass it at the `new NpcActor(...)` call site.
- **Walk-cycle frames reuse Bernadette's cutout-puppet deformation *technique*** (per-row shear
  below the waist, independent boot shifts, generated at a padded intermediate size then
  downscaled once — see the walk-cycle bullet under "Redesign character sprite system" above) but
  with two deliberate adaptations for this source art specifically — not deviations out of
  laziness, and worth keeping if this technique is ever reused for a future character:
  - **Single-direction shear for every view, not a mirrored per-half "twist."** Mirroring (shifting
    the left and right halves of each row oppositely, as Bernadette's front/back frames do) opened
    a visible transparent gap at the center seam on a frame this narrow (11-17px final width) — not
    enough pixels in each half-row to absorb an independent split without a visible hole. A uniform
    whole-row shift reads as a clean subtle sway with no seam artifact at this pixel scale.
  - **The clasped-hands region moves as a single shifting unit, not two independent hands.** This
    source's hands are drawn interlocked/overlapping in front (fingers laced together), not as two
    separate hand shapes — independent per-hand movement needs two distinguishable shapes to shift
    apart from each other, and doing that here would have visibly torn the clasped pose apart.
  - Boots still get independent left/right shifts (opposite vertical offsets, swapping between
    frames 'a'/'b') — this source has two clearly separate boot shapes, so that part of the
    original recipe applied unchanged.
  - **Deformation needs padding around the intermediate-size array before shearing/shifting**, or
    pixels pushed past the (alpha-tight, zero-margin) crop's edge either wrap around (if using
    `np.roll`) or clip — both looked broken (a visible seam or a chunk of missing silhouette). Pad
    on all sides (`pad = max(4, intermediate_h // 10)` worked well), deform on the padded canvas,
    then crop back to the original unpadded bounds *before* the final downscale — cropping back is
    what keeps the character's feet the same distance from the frame's bottom edge as the idle
    frame, so facing switches between idle/walk don't visibly bob her.

### Apparition Journey scrollbox: the wheel-event signature bug

`ApparitionJourneyScene.ts`'s 18-mission scroll list was reported as "sometimes difficult to scroll
with the mouse wheel." The actual bug was much simpler and much worse than "sometimes": Phaser's own
`'wheel'` event signature is `(pointer, currentlyOver, deltaX, deltaY, deltaZ)` — 5 positional
params — but the handler here was written as `(_p, _dx, dy) => { ... dy * 0.5 }`, only 3 params. JS
doesn't care about the declared names; it binds positionally, so this handler's `dy` was actually
receiving Phaser's *deltaX* (horizontal wheel delta), not deltaY. A normal vertical mouse wheel
reports `deltaX ~= 0`, so the scroll math was computing `scrollY + 0 * 0.5` on almost every real
tick — a near-total no-op, not an occasional one. The "sometimes it worked a little" the report
described was really just a trackpad's incidental horizontal jitter during an otherwise-vertical
swipe gesture occasionally producing a nonzero deltaX. Fixed by reading the real 5th positional
param (`deltaY`). Confirmed via Playwright (`page.mouse.wheel(0, dy)` + polling `scrollY`) both
before (frozen at the same value across 50+ wheel events, up or down, any magnitude) and after
(smooth, monotonic, clamps correctly at both the first and last mission). If a future scroll
regression turns up on any other `this.input.on('wheel', ...)` handler in this codebase, check the
positional-argument count *first* — this exact mistake is easy to reintroduce by "simplifying" the
handler's signature.

### Overworld map: edge buffer widened, buildings pulled off the west edge

A later round asked for the same map (see "Overworld map resized to 4x area" above — that resize
itself was already live in code from the previous round, it just hadn't been rebuilt/redeployed to
what the maintainer was actually looking at when this round's brief called it "still too small")
to leave a **generous** open buffer around the edges for a future forest, with buildings
"concentrated more toward the interior" — stricter than the prior round's plain treeline ask.
Auditing actual placements found the church/presbytery (`SPECIAL_BUILDINGS`) sitting almost flush
against the map's west edge (`col 0.5`/`col 0.2`, i.e. ~3-8px from `col 0`) — a plain position-
doubling artifact from the earlier resize, never actually a problem until this stricter buffer
requirement existed. Fixed with a single `WEST_BUFFER_TILES = 7` constant added to both buildings'
`col`, preserving their prior relative offset from each other rather than an independent per-
building fudge. `FOREST_BORDER_DEPTH_TILES` was also bumped 2 -> 3 for a fuller tree line at this
map's scale. `TOWN_BUILDINGS`/`CACHOT`/the grotto were all audited too and already had comfortable
edge clearance (6-18 tiles) — only the west-edge church/presbytery needed the fix. `DECOR`'s
scattered single trees/rocks near edges were left alone on purpose: they're not "buildings" under
this rule, and a stray tree near the edge only reinforces the forest-transition feel.

### Jeanne (`friend`) and a new ambient boy NPC: real-art sprites, portraits, idle breathing

Two more `CharacterId`s went from the shared procedural paper-doll system to real art, following
the exact same pipeline as `sisterSprite.ts`/`motherSprite.ts` (see "Real-art secondary characters"
above for the full write-up of that pipeline — cutout-puppet walk-cycle deformation, alpha-bbox
source crops, idle = plain resize, NEAREST-only textures, etc.):

- **`assets/npc/jeanneSprite.ts`** replaces Jeanne's old procedural placeholder with real art, at
  the *same* `BERNADETTE_FRAME_HEIGHT`-equivalent 42px height as Bernadette/the mother (she's a
  peer, not a younger sibling — that distinction stays the sister's alone, at 85%).
- **`assets/npc/boySprite.ts`** adds a brand-new ambient `CharacterId: 'boy'` (not a previously-
  procedural placeholder being upgraded — this one never existed before), sized at 80% of
  Bernadette's height (`BOY_FRAME_HEIGHT = round(42 * 0.8)` = 34px) per an explicit "~20% smaller
  than the player" ask.
- **Both sources' hands hang separately at the sides** (not clasped/interlocked the way the
  sister's/mother's source art was), so both use two independently-shifted hand regions for the
  walk cycle's counter-swing — the same technique Bernadette's own front/back frames already use —
  rather than the sister/mother recipe's single shifting hand-clasp unit. Still single-direction
  (not mirrored) skirt/tunic shear for every view on both, same reasoning as the sister: mirrored
  shear opened a visible transparent seam at the center on a frame this narrow (10-16px final
  width) — confirmed by generating a first draft with mirrored shear and visually catching the gap
  before ever wiring it in, then regenerating with single-direction shear.
- **New generic `NpcActor` capability: opt-in idle breathing.** Neither the sister, the mother, nor
  any other `NpcActor` had ever gotten Bernadette's idle sine-wave `scaleY` breathing
  (`Player.ts#updateBreathing()`) — only Jeanne and the boy were explicitly asked for it this round.
  Rather than forking a parallel system, `NpcActor` gained an opt-in `breathingEnabled` constructor
  param (default `false`, so mother/sister/villagers are completely unaffected) driven from a new
  `override preUpdate(time, delta)` — Phaser calls this automatically every frame for any
  `GameObject` that defines it, so no wiring into the owning scene's own `update()` was needed. Must
  chain `super.preUpdate(time, delta)` first or the sprite's own walk-cycle animation stops
  advancing. Same amplitude/period/no-yoyo-tween reasoning as `Player.ts`; the shadow reacts the
  same way too (width/alpha only, via the existing `shadowScale` field, never vertical scale).
- **Portraits** (`assets/portraits/jeannePortrait.ts` had already shipped; `boyPortrait.ts` is new)
  use the same derived-from-one-pose technique as Bernadette's second portrait: only a neutral
  (eyes open, mouth closed) image was supplied, so `blink`/`talk`/`talkBlink` are generated by
  editing that source, not separately drawn. Two things worth not re-discovering if this technique
  is reused again:
  - **Sample the eye-closing skin fill from a fixed row safely *outside* the eye's bounding box**,
    never from "below the mask but still inside the box." An initial attempt sampled column-by-
    column from just below each column's own masked region *within* the eye's own box — but the
    mask blob (real iris/sclera pixels, found via the same `red - blue` content-based separation
    Jeanne's own portrait doc comment describes) reaches close to the box's bottom edge in several
    columns, so that fallback kept reading back other eye-colored pixels as if they were "skin,"
    producing a blotchy grey patch instead of a clean closed eye. Fixed by sampling a fixed row
    ~25px below the box (guaranteed clear cheek skin) for every column, independent of the mask.
  - **A square/near-square supplied reference must be center-cropped to the game's own 58:67
    portrait aspect ratio *before* the final resize**, not resized non-uniformly to fit — every
    existing portrait in this game (`bernadette_portrait_neutral.png`, `jeanne_portrait_neutral.png`)
    fills its 58x67 canvas exactly edge-to-edge with zero transparent padding, meaning their source
    crops were already shaped to that ratio. The boy's supplied portrait was a ~1:1 square; resizing
    it directly to 58x67 would have squeezed his face narrower and stretched it taller (visible
    proportion distortion). Fixed with a plain centered crop to the 58:67 ratio at full source
    resolution first, then the usual single LANCZOS resize to final size — no distortion, and the
    result now matches every other character's portrait framing convention.
- **The boy is pure ambient flavor, not mission content**: `data/dialogue/ambientDialogue.ts` holds
  his one repeatable exchange (`boyAmbientDialogue`), triggered through the *exact* same
  `DialogueBox`/`isNear`/`INTERACT_RADIUS`/E-or-tap `tryInteract()` path every other interactable
  in `OverworldScene.ts` already uses — no parallel interaction system. Deliberately makes zero
  `MissionManager` calls and sets no one-time-triggered flag on him, so talking to him is exactly as
  repeatable as walking up and pressing E again; he never leaves, never gets hidden, never gates
  anything. He wanders his own small `BOY_WANDER_BOUNDS` (a strip of open plaza grass between the
  path and the hospice/Maison Cénac/tribunal cluster) via the same `WanderNpc` the sister/Jeanne use
  post-river-crossing — bounds chosen to be inherently free of any collider (same approach
  `FAR_BANK_WANDER_BOUNDS` uses), rather than building actual pathfinding/collision-avoidance for
  `WanderNpc`. Unlike the sister/friend (whose wandering only starts once the crossing cutscene
  triggers it), his wander starts the instant the scene loads — he has no mission gate at all.
- **Playwright gotcha worth not re-discovering**: `page.keyboard.press('e')` to trigger a fresh
  E-interact can flake when the target NPC is actively wandering — by the time the synthetic
  keydown/keyup round-trip actually lands, a few hundred ms may have passed and a slow-wandering NPC
  can drift just outside `INTERACT_RADIUS` from wherever the test teleported the player. Calling the
  scene's own `tryInteract()`/`dialogueBox.advance()` methods directly via `page.evaluate()` (they're
  TS `private`, but that's compile-time only) sidesteps the timing entirely and is what actually
  confirmed this system works — don't conclude a real bug from a `keyboard.press()` timing miss
  against a moving target without corroborating via a direct method call first.

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
