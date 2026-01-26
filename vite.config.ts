import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  publicDir: false,
  build: {
    lib: {
      entry: path.resolve(__dirname, 'src/index.ts'),
      fileName: 'index',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['three', 'three/examples/jsm/controls/ArcballControls', 'three-mesh-bvh', 'stats.js'],
    },
    outDir: 'dist',
    emptyOutDir: true,
  },
});

