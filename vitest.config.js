import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/fe/unit/**/*.test.js'],
    exclude: ['tests/fe/specs/**', 'tests/e2e/**']
  },
  coverage: {
    provider: 'v8'
  }
});
