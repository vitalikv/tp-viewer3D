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
      entry: path.resolve(__dirname, 'src/threeApp/worker/OffscreenCanvasWorker.ts'),
      fileName: 'worker',
      formats: ['es'],
    },
    rollupOptions: {
      external: ['three', 'three/examples/jsm/controls/ArcballControls', 'three-mesh-bvh'],
    },
    outDir: 'dist',
    emptyOutDir: false,
  },
});
