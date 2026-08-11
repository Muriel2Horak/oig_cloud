import { chmodSync, mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalOverride = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const temporaryDirectories: string[] = [];

function temporaryDirectory(): string {
  const directory = mkdtempSync(join(tmpdir(), 'oig-playwright-config-'));
  temporaryDirectories.push(directory);
  return directory;
}

async function loadConfig() {
  vi.resetModules();
  return (await import('../../playwright.config')).default;
}

afterEach(() => {
  if (originalOverride === undefined) delete process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  else process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE = originalOverride;
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
  vi.resetModules();
});

describe('Playwright Chromium selection', () => {
  it('uses Playwright pinned Chromium by default even when local Chrome is installed', async () => {
    delete process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;

    const config = await loadConfig();

    expect(config.use?.launchOptions?.executablePath).toBeUndefined();
  });

  it('rejects a missing explicit Chromium executable with a clear error', async () => {
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE = join(temporaryDirectory(), 'missing-chromium');

    await expect(loadConfig()).rejects.toThrow(
      'PLAYWRIGHT_CHROMIUM_EXECUTABLE does not exist',
    );
  });

  it('rejects a directory explicit override', async () => {
    const directory = join(temporaryDirectory(), 'chromium-directory');
    mkdirSync(directory);
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE = directory;

    await expect(loadConfig()).rejects.toThrow(
      'PLAYWRIGHT_CHROMIUM_EXECUTABLE must be a regular executable file',
    );
  });

  it('rejects a non-executable file explicit override', async () => {
    const executable = join(temporaryDirectory(), 'chromium-file');
    writeFileSync(executable, '#!/bin/sh\n');
    chmodSync(executable, 0o600);
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE = executable;

    await expect(loadConfig()).rejects.toThrow(
      'PLAYWRIGHT_CHROMIUM_EXECUTABLE must be a regular executable file',
    );
  });

  it('honors a valid executable only when explicitly opted in', async () => {
    const executable = join(temporaryDirectory(), 'chromium-file');
    writeFileSync(executable, '#!/bin/sh\nexit 0\n');
    chmodSync(executable, 0o700);
    process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE = executable;

    const config = await loadConfig();

    expect(config.use?.launchOptions?.executablePath).toBe(executable);
  });
});
