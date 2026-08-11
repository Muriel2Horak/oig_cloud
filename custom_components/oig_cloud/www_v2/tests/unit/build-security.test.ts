import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
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
  mkdirSync(join(root, 'src', '__tests__'), { recursive: true });
  mkdirSync(join(root, 'public'), { recursive: true });
  writeFileSync(join(root, 'src', 'main.ts'), 'console.log("fixture");\n');
  writeFileSync(join(root, 'src', 'feature.ts'), 'export const feature = true;\n');
  writeFileSync(join(root, 'src', '__tests__', 'ignored.test.ts'), 'ignored nested test\n');
  writeFileSync(join(root, 'src', 'widget.test.ts'), 'ignored test file\n');
  writeFileSync(join(root, 'src', 'widget.spec.ts'), 'ignored spec file\n');
  writeFileSync(join(root, 'public', 'icon.svg'), '<svg></svg>\n');
  writeFileSync(join(root, 'index.html'), '<script src="/assets/index.js"></script>\n');
  writeFileSync(join(root, 'vite.config.ts'), 'export default {};\n');
  writeFileSync(join(root, 'package.json'), '{"name":"fixture"}\n');
  writeFileSync(join(root, 'package-lock.json'), '{"lockfileVersion":3}\n');
  writeFileSync(join(root, 'tsconfig.json'), '{}\n');
  symlinkSync(join(PROJECT_ROOT, 'node_modules'), join(root, 'node_modules'), 'dir');
  return root;
}

function buildableProject(): string {
  const root = temporaryDirectory('oig-buildable-fixture-');
  for (const name of [
    'src',
    'dist',
    'scripts',
    'index.html',
    'vite.config.ts',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
  ]) {
    cpSync(join(PROJECT_ROOT, name), join(root, name), { recursive: true });
  }
  symlinkSync(join(PROJECT_ROOT, 'node_modules'), join(root, 'node_modules'), 'dir');
  const built = runBuildScript(['--root', root]);
  if (built.status !== 0) throw new Error(`fixture build failed: ${built.stderr}`);
  return root;
}

function directorySnapshot(directory: string): Array<[string, string]> {
  const snapshot: Array<[string, string]> = [];
  const visit = (current: string, prefix: string) => {
    for (const name of readdirSync(current).sort()) {
      const absolute = join(current, name);
      const relative = prefix ? `${prefix}/${name}` : name;
      if (statSync(absolute).isDirectory()) visit(absolute, relative);
      else snapshot.push([relative, readFileSync(absolute).toString('base64')]);
    }
  };
  visit(directory, '');
  return snapshot;
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
  it('reports the exact sorted executable input list and excludes planned test paths', () => {
    const root = fixtureProject();

    const listed = runBuildScript(['--print-inputs', '--root', root]);

    expect(listed.status, listed.stderr).toBe(0);
    expect(JSON.parse(listed.stdout)).toEqual([
      'index.html',
      'package-lock.json',
      'package.json',
      'public/icon.svg',
      'src/feature.ts',
      'src/main.ts',
      'tsconfig.json',
      'vite.config.ts',
    ]);
  });

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

    writeFileSync(join(root, 'src', '__tests__', 'ignored.test.ts'), 'nested test change\n');
    writeFileSync(join(root, 'src', 'widget.test.ts'), 'test file change\n');
    writeFileSync(join(root, 'src', 'widget.spec.ts'), 'spec file change\n');
    expect(buildId(root).stdout.trim()).toBe(first.stdout.trim());
  });

  it('changes the ID when one executable or public input changes', () => {
    const root = fixtureProject();
    const first = buildId(root);

    writeFileSync(join(root, 'src', 'feature.ts'), 'export const feature = false;\n');
    const sourceChanged = buildId(root);

    expect(sourceChanged.status, sourceChanged.stderr).toBe(0);
    expect(sourceChanged.stdout.trim()).not.toBe(first.stdout.trim());

    writeFileSync(join(root, 'public', 'icon.svg'), '<svg>changed</svg>\n');
    const second = buildId(root);

    expect(first.status, first.stderr).toBe(0);
    expect(second.status, second.stderr).toBe(0);
    expect(second.stdout.trim()).not.toBe(first.stdout.trim());
  });

  it('rejects a symlinked root TypeScript config as input_symlink', () => {
    const root = fixtureProject();
    const external = join(temporaryDirectory('oig-tsconfig-external-'), 'outside.json');
    writeFileSync(external, '{}\n');
    rmSync(join(root, 'tsconfig.json'));
    symlinkSync(external, join(root, 'tsconfig.json'));

    const result = buildId(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('input_symlink');
  });

  it('rejects a non-regular root TypeScript config as input_type', () => {
    const root = fixtureProject();
    rmSync(join(root, 'tsconfig.json'));
    mkdirSync(join(root, 'tsconfig.json'));

    const result = buildId(root);

    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('input_type');
  });

  it.each(['changed', 'missing', 'extra'])(
    'read-only dist verification rejects a %s tracked tree without mutating it',
    (kind) => {
      const root = buildableProject();
      const trackedDist = join(root, 'dist');
      if (kind === 'changed') writeFileSync(join(trackedDist, 'index.html'), 'stale byte\n');
      if (kind === 'missing') rmSync(join(trackedDist, 'index.html'));
      if (kind === 'extra') writeFileSync(join(trackedDist, 'extra.js'), 'stale extra\n');
      const before = directorySnapshot(trackedDist);

      const result = runBuildScript([
        '--verify-dist',
        '--root',
        root,
        '--tracked-dist',
        trackedDist,
      ]);

      expect(result.status).not.toBe(0);
      expect(result.stderr).toContain('dist_mismatch');
      expect(directorySnapshot(trackedDist)).toEqual(before);
    },
  );

  it('read-only dist verification accepts matching bytes and leaves them untouched', () => {
    const root = buildableProject();
    const trackedDist = join(root, 'dist');
    const before = directorySnapshot(trackedDist);

    const result = runBuildScript([
      '--verify-dist',
      '--root',
      root,
      '--tracked-dist',
      trackedDist,
    ]);

    expect(result.status, result.stderr).toBe(0);
    expect(directorySnapshot(trackedDist)).toEqual(before);
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
