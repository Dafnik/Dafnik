import {fileURLToPath, URL} from 'node:url';
import {defineConfig} from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./screenshot-editor/src/', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./screenshot-editor/src/test/setup.ts'],
    include: ['screenshot-editor/src/**/*.test.ts', 'screenshot-editor/src/**/*.test.tsx'],
  },
});
