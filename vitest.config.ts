import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/core/**'],
    },
  },
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, './src/core'),
      '@app': path.resolve(__dirname, './src/application'),
      '@infra': path.resolve(__dirname, './src/infrastructure'),
      '@config': path.resolve(__dirname, './src/config'),
    },
  },
});
