import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { afterEach, describe, expect, it } from 'vitest';

const PROJECT_ROOT = resolve(__dirname, '../..');
const BUILD_SCRIPT = join(PROJECT_ROOT, 'scripts/build-v2.mjs');
const tempDirectories: string[] = [];

function temporaryDirectory(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  tempDirectories.push(directory);
  return directory;
}

function fixtureProject(): string {
  const root = temporaryDirectory('oig-build-fixture-');
  mkdirSync(join(root, 'src'), { recursive: true });
  mkdirSync(join(root, 'public'), { recursive: true });
  writeFileSync(join(root, 'src', 'main.ts'), 'console.log("fixture");\n');
  writeFileSync(join(root, 'public', 'icon.svg'), '<svg></svg>\n');
  writeFileSync(join(root, 'index.html'), '<script src="/assets/index.js"></script>\n');
  writeFileSync(join(root, 'vite.config.ts'), 'export default {};\n');
  writeFileSync(join(root, 'package.json'), '{"name":"fixture"}\n');
  writeFileSync(join(root, 'package-lock.json'), '{"lockfileVersion":3}\n');
  writeFileSync(join(root, 'tsconfig.json'), '{}\n');
  return root;
}

function runBuildScript(
  args: string[],
  extraEnvironment: Record<string, string | undefined> = {},
) {
  const environment = { ...process.env } as Record<string, string | undefined>;
  // Vitest materializes this configured define in its own process. It is not
  // part of the parent environment accepted by the production build wrapper.
  delete environment.VITE_VERSION;
  for (const [name, value] of Object.entries(extraEnvironment)) {
    if (value === undefined) delete environment[name];
    else environment[name] = value;
  }
  return spawnSync(process.execPath, [BUILD_SCRIPT, ...args], {
    cwd: PROJECT_ROOT,
    env: environment as NodeJS.ProcessEnv,
    encoding: 'utf8',
  });
}

function buildId(root: string, override?: string): ReturnType<typeof runBuildScript> {
  return runBuildScript(
    ['--print-build-id', '--root', root],
    override === undefined ? { OIG_BUILD_ID: undefined } : { OIG_BUILD_ID: override },
  );
}

afterEach(() => {
  for (const directory of tempDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('secure deterministic v2 build', () => {
  it('derives a stable SHA-256 from sorted explicit inputs and ignores tests', () => {
    const root = fixtureProject();

    const first = buildId(root);
    const second = buildId(root);

    expect(first.status, first.stderr).toBe(0);
    expect(second.status, second.stderr).toBe(0);
    expect(first.stdout.trim()).toMatch(/^[a-f0-9]{64}$/);
    expect(second.stdout.trim()).toBe(first.stdout.trim());

    mkdirSync(join(root, 'tests'), { recursive: true });
    writeFileSync(join(root, 'tests', 'ignored.test.ts'), 'ignored change\n');
    expect(buildId(root).stdout.trim()).toBe(first.stdout.trim());
  });

  it('changes the ID when one executable or public input changes', () => {
    const root = fixtureProject();
    const first = buildId(root);

    writeFileSync(join(root, 'public', 'icon.svg'), '<svg>changed</svg>\n');
    const second = buildId(root);

    expect(first.status, first.stderr).toBe(0);
    expect(second.status, second.stderr).toBe(0);
    expect(second.stdout.trim()).not.toBe(first.stdout.trim());
  });

  it('accepts only absent or exact OIG_BUILD_ID overrides', () => {
    const root = fixtureProject();
    const computed = buildId(root);
    expect(computed.status, computed.stderr).toBe(0);
    const exact = computed.stdout.trim();

    expect(buildId(root, exact).status).toBe(0);
    for (const value of ['', 'not-a-sha256', 'A'.repeat(64), '0'.repeat(64)]) {
      const rejected = buildId(root, value);
      expect(rejected.status, `override ${JSON.stringify(value)}\n${rejected.stderr}`).not.toBe(0);
    }
  });

  it.each(['.env', '.env.production', '.npmrc'])(
    'rejects project %s before producing build output',
    (name) => {
      const root = fixtureProject();
      writeFileSync(join(root, name), 'VITE_SENTINEL=secret\n');

      const checked = runBuildScript(['--check-environment', '--root', root]);

      expect(checked.status).not.toBe(0);
      expect(checked.stderr).not.toContain('secret');
    },
  );

  it('rejects an ambient user npmrc before producing build output', () => {
    const root = fixtureProject();
    const parentHome = temporaryDirectory('oig-parent-home-');
    writeFileSync(join(parentHome, '.npmrc'), 'registry=https://credential.invalid/\n');

    const checked = runBuildScript(
      ['--check-environment', '--root', root],
      { HOME: parentHome },
    );

    expect(checked.status).not.toBe(0);
    expect(checked.stderr).not.toContain('credential.invalid');
  });

  it.each([
    ['VITE_SENTINEL', 'vite-secret'],
    ['NODE_OPTIONS', '--require=/credential/sentinel'],
    ['NPM_CONFIG_REGISTRY', 'https://credential.invalid/'],
    ['NPM_CONFIG_USERCONFIG', '/credential/user.npmrc'],
    ['NPM_CONFIG_GLOBALCONFIG', '/credential/global.npmrc'],
  ])('rejects ambient %s before producing build output', (name, value) => {
    const root = fixtureProject();

    const checked = runBuildScript(
      ['--check-environment', '--root', root],
      { [name]: value },
    );

    expect(checked.status).not.toBe(0);
    expect(checked.stderr).not.toContain(value);
  });

  it('creates distinct empty mode-0600 npm user and global config files', () => {
    const root = fixtureProject();
    const environmentDirectory = temporaryDirectory('oig-build-environment-');

    const described = runBuildScript([
      '--describe-environment',
      '--root',
      root,
      '--environment-dir',
      environmentDirectory,
    ]);

    expect(described.status, described.stderr).toBe(0);
    const details = JSON.parse(described.stdout) as {
      userconfig: string;
      globalconfig: string;
      cache: string;
      home: string;
    };
    expect(details.userconfig).not.toBe(details.globalconfig);
    expect(readFileSync(details.userconfig, 'utf8')).toBe('');
    expect(readFileSync(details.globalconfig, 'utf8')).toBe('');
    expect(statSync(details.userconfig).mode & 0o777).toBe(0o600);
    expect(statSync(details.globalconfig).mode & 0o777).toBe(0o600);
    expect(details.userconfig.startsWith(environmentDirectory)).toBe(true);
    expect(details.globalconfig.startsWith(environmentDirectory)).toBe(true);
    expect(details.cache.startsWith(environmentDirectory)).toBe(true);
    expect(details.home.startsWith(environmentDirectory)).toBe(true);
  });

  it('closes unrelated parent environment variation out of the build environment', () => {
    const root = fixtureProject();
    const environmentDirectory = temporaryDirectory('oig-build-environment-');
    const args = [
      '--describe-environment',
      '--root',
      root,
      '--environment-dir',
      environmentDirectory,
    ];

    const first = runBuildScript(args, { UNRELATED_SENTINEL: 'one' });
    const second = runBuildScript(args, { UNRELATED_SENTINEL: 'two' });

    expect(first.status, first.stderr).toBe(0);
    expect(second.status, second.stderr).toBe(0);
    expect(JSON.parse(second.stdout)).toEqual(JSON.parse(first.stdout));
    expect(second.stdout).not.toContain('UNRELATED_SENTINEL');
    expect(second.stdout).not.toContain('two');
  });
});
