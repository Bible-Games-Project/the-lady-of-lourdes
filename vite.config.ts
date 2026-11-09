import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    // Images stay separate hashed files next to the bundle (Vite's default). Inlining them as
    // base64 made the bundle 40 MiB, over Cloudflare Pages' 25 MiB limit per file, so the
    // preview stopped deploying.
  },
});
