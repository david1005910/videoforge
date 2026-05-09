import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'node:path';

export default defineConfig({
  main: {
    plugins: [
      externalizeDepsPlugin({ exclude: ['@videoforge/shared'] }), // ← exclude 추가
      tsconfigPaths(),
    ],
    build: {
      lib: {
        entry: resolve(__dirname, 'electron/main/index.ts'),
      },
      outDir: 'out/main',
      rollupOptions: {
        external: ['electron', 'fs-extra', 'pino', 'pino-pretty'],
      },
    },
    resolve: {
      alias: {
        '@videoforge/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
      },
    },
  },
  preload: {
    plugins: [
      externalizeDepsPlugin({ exclude: ['@videoforge/shared'] }), // ← exclude 추가
      tsconfigPaths(),
    ],
    build: {
      lib: {
        entry: resolve(__dirname, 'electron/preload/index.ts'),
      },
      outDir: 'out/preload',
    },
    resolve: {
      alias: {
        '@videoforge/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
      },
    },
  },
  renderer: {
    root: resolve(__dirname, '.'),
    plugins: [react(), tsconfigPaths()],
    resolve: {
      alias: {
        '@': resolve(__dirname, 'src'),
        '@videoforge/shared': resolve(__dirname, '../../packages/shared/src/index.ts'),
      },
    },
    build: {
      outDir: 'out/renderer',
      rollupOptions: {
        input: resolve(__dirname, 'index.html'),
      },
    },
    server: {
      port: 5173,
    },
  },
});
