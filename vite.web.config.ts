import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import solid from 'vite-plugin-solid';
import { VitePWA } from 'vite-plugin-pwa';

// Standalone web build of the SolidJS renderer, served as an installable PWA.
// This config is Electron-free: it builds `index.html` -> `src/renderer/main.tsx`
// as a normal SPA. Run with `bun run web:dev` / `bun run web:build`.
export default defineConfig({
  base: '/',
  plugins: [
    solid(),
    VitePWA({
      // Auto-update the service worker in the background, then activate on next load.
      registerType: 'autoUpdate',
      // Inject the SW registration script into index.html for us.
      injectRegister: 'auto',
      // Precache the built assets so the app works offline.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff,woff2}'],
        // SPA fallback: unknown routes serve index.html from cache.
        navigateFallback: '/index.html',
      },
      includeAssets: [
        'favicon.ico',
        'favicon-16x16.png',
        'favicon-32x32.png',
        'apple-touch-icon.png',
      ],
      manifest: {
        name: 'Resver — A Quiet Place to Write',
        short_name: 'Resver',
        description: 'A quiet, distraction-free place to write.',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        // Warm-dark is the design's home theme; splash + toolbar match it.
        background_color: '#16150f',
        theme_color: '#16150f',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      // Enable the PWA in `vite dev` too, so you can test install/offline locally.
      devOptions: {
        enabled: true,
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
      },
    },
  },
  build: {
    outDir: 'dist-web',
    emptyOutDir: true,
  },
});
