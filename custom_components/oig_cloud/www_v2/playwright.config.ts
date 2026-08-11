import { defineConfig } from '@playwright/test';
import { accessSync, constants, existsSync, statSync } from 'node:fs';

function chromiumExecutableOverride(): string | undefined {
  const executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  if (executablePath === undefined) return undefined;
  if (!existsSync(executablePath)) {
    throw new Error('PLAYWRIGHT_CHROMIUM_EXECUTABLE does not exist');
  }
  try {
    if (!statSync(executablePath).isFile()) throw new Error('not a file');
    accessSync(executablePath, constants.X_OK);
  } catch {
    throw new Error('PLAYWRIGHT_CHROMIUM_EXECUTABLE must be a regular executable file');
  }
  return executablePath;
}

const executablePath = chromiumExecutableOverride();

export default defineConfig({
  testDir: './playwright',
  testMatch: '**/*.spec.ts',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:4174/oig_cloud_static_v2/',
    headless: true,
    trace: 'retain-on-failure',
    launchOptions: executablePath ? { executablePath } : {},
  },
  webServer: {
    command: 'node node_modules/vite/bin/vite.js --host 127.0.0.1 --port 4174 --strictPort',
    url: 'http://127.0.0.1:4174/oig_cloud_static_v2/playwright/auth-refresh.html',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
