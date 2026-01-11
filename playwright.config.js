import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/fe/specs',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: 'http://localhost:8124',
    viewport: { width: 1280, height: 800 }
  },
  projects: [
    { name: 'cloud', metadata: { mode: 'cloud' } },
    { name: 'local', metadata: { mode: 'local' } },
    { name: 'proxy', metadata: { mode: 'proxy' } },
    {
      name: 'cloud-mobile',
      metadata: { mode: 'cloud' },
      use: { ...devices['iPhone 14'] }
    },
    {
      name: 'cloud-tablet',
      metadata: { mode: 'cloud' },
      use: { ...devices['iPad (gen 7)'] }
    },
    {
      name: 'cloud-nest',
      metadata: { mode: 'cloud' },
      use: { viewport: { width: 1024, height: 600 } }
    }
  ],
  reporter: 'list'
});
