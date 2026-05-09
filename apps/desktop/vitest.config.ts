import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  resolve: {
    alias: {
      // @bbc/stt-align-node has broken main field (lib/index.js doesn't exist)
      '@bbc/stt-align-node': path.resolve(
        __dirname,
        '../../node_modules/@bbc/stt-align-node/index.js',
      ),
    },
  },
  test: {
    globals: false,
    exclude: ['e2e/**', 'node_modules/**'],
  },
});
