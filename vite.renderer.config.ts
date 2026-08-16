import { defineConfig } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import solid from 'vite-plugin-solid';

// https://vitejs.dev/config
export default defineConfig({
  plugins: [solid()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        loadPaths: [fileURLToPath(new URL('./src/renderer/styles', import.meta.url))],
      },
    },
  },
});
