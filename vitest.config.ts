import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    css: true,
    environment: 'jsdom',
    poolOptions: {
      threads: {
        isolate: false,
      },
    },
  },
});
