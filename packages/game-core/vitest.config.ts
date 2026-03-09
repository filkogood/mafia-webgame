import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      // Point to the TypeScript source so tests run without a prior build of
      // @mafia/shared (mirrors the alias in apps/client/vite.config.ts).
      '@mafia/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
});
