import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["app-icon.svg"],
      manifest: {
        name: "粵語道場 Jyut Dojo",
        short_name: "粵語道場",
        description: "為普通話母語者而設嘅廣東話口語同聲調練習。",
        theme_color: "#f7fbff",
        background_color: "#f7fbff",
        display: "standalone",
        start_url: "/",
        lang: "zh-Hant",
        icons: [
          { src: "/app-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
          { src: "/app-icon.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,webp}"],
        runtimeCaching: [
          {
            urlPattern: /\/audio\//,
            handler: "CacheFirst",
            options: {
              cacheName: "jyut-dojo-audio-v1",
              expiration: { maxEntries: 300, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
