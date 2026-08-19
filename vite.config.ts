import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    // Inline all real image assets as base64 data URIs into the JS bundle rather than emitting
    // separate hashed files. Keeps the game (and its single-file Artifact preview) self-contained
    // with no runtime asset fetches to manage.
    assetsInlineLimit: Number.MAX_SAFE_INTEGER,
  },
});
