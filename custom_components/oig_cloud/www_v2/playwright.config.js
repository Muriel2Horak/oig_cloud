import { defineConfig } from '@playwright/test';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  testDir: resolve(__dirname, '../../../tests/fe/specs/v2'),
  timeout: 60_000,
  expect: { timeout: 15_000 },
  workers: 1,
  use: {
    baseURL: 'http://localhost:4173',
    viewport: { width: 1280, height: 800 },
    screenshot: 'on',
    video: 'off',
    trace: 'off',
    launchOptions: {
      executablePath: '/usr/bin/chromium',
      args: ['--no-sandbox', '--disable-dev-shm-usage']
    }
  },
  projects: [
    { name: 'v2-chromium' }
  ],
  reporter: [['list'], ['html', { open: 'never', outputFolder: resolve(__dirname, '../../../tests/fe/reports/v2') }]]
});
