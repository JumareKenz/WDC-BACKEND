import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'vmThreads',
    exclude: ['node_modules', 'dist', '.turbo', 'e2e'],
  },
});
