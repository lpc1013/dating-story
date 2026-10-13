import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: false,
    setupFiles: ['./tools/vitest.setup.mjs'],
    include: ['tools/__tests__/**/*.test.js']
  }
});
