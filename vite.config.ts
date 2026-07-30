/// <reference types="vitest/config" />
import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

/** Must match AUDIO_CACHE_NAME in src/lib/audioPack.ts. */
const AUDIO_CACHE = 'jyut-audio-v1';

// One source of truth for the shipped version: package.json, stamped at build
// time so a controlled update can be identified in a bug report.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')) as {
  version: string;
};
const BUILD_STAMP = process.env.BUILD_STAMP || new Date().toISOString().slice(0, 10);

export default defineConfig({
  base: './',
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_STAMP__: JSON.stringify(BUILD_STAMP),
  },
  plugins: [
    react(),
    VitePWA({
      // Controlled updates: the app asks before swapping the bundle so a new
      // build cannot reload the page under a learner mid-quiz.
      registerType: 'prompt',
      includeAssets: ['favicon.svg', 'icon.svg'],
      workbox: {
        // Audio is fetched on demand and cached at runtime; precaching ~700 mp3s
        // would mean a multi-megabyte download before the first lesson.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,json}'],
        globIgnores: ['**/audio/**'],
        cleanupOutdatedCaches: true,
        // Take control of the first page load so an offline download made in
        // that session is actually cached, but never activate an UPDATE without
        // asking (skipWaiting stays off; UpdatePrompt drives that).
        clientsClaim: true,
        skipWaiting: false,
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /\/audio\/.*\.mp3$/,
            handler: 'CacheFirst',
            options: {
              cacheName: AUDIO_CACHE,
              // Every shipped clip plus the male sentence set, with headroom.
              expiration: { maxEntries: 900, maxAgeSeconds: 60 * 60 * 24 * 180, purgeOnQuotaError: true },
              cacheableResponse: { statuses: [0, 200] },
              rangeRequests: true,
            },
          },
        ],
      },
      manifest: {
        name: '粵語道場 Jyut Dojo',
        short_name: '粵語道場',
        description: '學廣東話：情景對話、六聲聲調、間隔複習。',
        lang: 'zh-HK',
        theme_color: '#A9471D',
        background_color: '#FAF7F2',
        display: 'standalone',
        start_url: './',
        scope: './',
        icons: [
          { src: 'icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'any' },
          { src: 'icon.svg', sizes: '512x512', type: 'image/svg+xml', purpose: 'maskable' },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // The curriculum JSON is large and changes independently of app code;
          // its own chunk keeps route chunks small and cacheable across releases.
          curriculum: ['./src/domain/curriculum/registry.ts'],
        },
      },
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
