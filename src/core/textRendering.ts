import Phaser from 'phaser';

/**
 * Root-cause fix for blurry/pixelated UI text, part 2 of 2 (see `ui/text.ts`'s own `TEXT_RESOLUTION`
 * for part 1).
 *
 * `ui/text.ts` already rasterizes every Text object's internal canvas at 4x its logical size
 * (`resolution: TEXT_RESOLUTION`) specifically so glyph edges are supersampled/anti-aliased instead
 * of blocky. That alone wasn't enough — text was still reported as "blurry and heavily pixelated,
 * hard to read". Traced into Phaser's own renderer (`WebGLRenderer#canvasToTexture()`): every
 * canvas-derived texture — which is exactly what `Phaser.GameObjects.Text` uses internally — gets
 * `gl.NEAREST` for both its min and mag filter *unless* `this.config.antialias` is true. This game
 * sets `pixelArt: true` in `main.ts`, which implies `antialias: false` globally (intentionally, so
 * every sprite/tile stays crisp) — so every Text object's own texture was *also* silently forced to
 * NEAREST, with no per-object override anywhere in the codebase. NEAREST-filtering the shrink from
 * a 4x-supersampled canvas back down to the glyph's logical on-screen size doesn't average/blend
 * those 4x extra samples at all — it just point-samples one of every four, discarding the
 * supersampling's entire benefit and reproducing the same jagged/aliased look `TEXT_RESOLUTION`
 * exists to prevent, which is why text still looked bad despite that fix already being in place.
 *
 * Fix: force `LINEAR` filtering specifically on each Text object's own texture, immediately after
 * it's created, by wrapping the factory function every `scene.add.text(...)` call already goes
 * through (`Phaser.GameObjects.GameObjectFactory#text`) rather than editing every individual call
 * site — this is the single choke point every Text object in the game passes through, so patching
 * it here guarantees no call site can accidentally skip the fix (unlike a discipline-only
 * convention like `textStyle()`'s own "every text object must use this helper" comment, which
 * nothing enforces if a future call site forgets it). This is scoped to `Text`'s own
 * canvas-derived texture only — the game's global `antialias`/`pixelArt` config, and therefore
 * every sprite, tile, and hand-authored pixel-art texture's own NEAREST filtering, is completely
 * untouched. Import this module once, for its side effect, before the game boots (see `main.ts`).
 */
export function installCrispTextFilter(): void {
  const factory = Phaser.GameObjects.GameObjectFactory.prototype;
  const originalText = factory.text;
  factory.text = function (
    x: number,
    y: number,
    text: string | string[],
    style?: Phaser.Types.GameObjects.Text.TextStyle,
  ): Phaser.GameObjects.Text {
    const obj = originalText.call(this, x, y, text, style);
    obj.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    return obj;
  };
}
