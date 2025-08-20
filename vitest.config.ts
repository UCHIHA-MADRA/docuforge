import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'url';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': resolve(fileURLToPath(new URL('.', import.meta.url)), 'src'),
    },
  },
  css: {
    postcss: { plugins: [] },
  },
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
    pool: 'forks',
    hookTimeout: 30000,
    testTimeout: 30000,
    include: ['src/**/*.test.{ts,tsx}'],
  },
});


