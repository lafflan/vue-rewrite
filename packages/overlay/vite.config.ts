import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import { resolve } from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'VueRewriteOverlay',
      formats: ['iife'],
      fileName: () => 'overlay.js',
    },
    rollupOptions: {
      // Vue is bundled into the IIFE
      external: [],
      output: {
        // Global variable name for IIFE
        globals: {
          vue: 'Vue',
        },
      },
    },
    minify: 'esbuild',
  },
});
