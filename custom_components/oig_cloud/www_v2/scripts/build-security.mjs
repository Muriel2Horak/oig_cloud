import { createHash } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';

const REQUIRED_INPUTS = [
  'index.html',
  'vite.config.ts',
  'package.json',
  'package-lock.json',
];

const EXCLUDED_DIRECTORY_NAMES = new Set(['__tests__', 'test', 'tests', 'playwright', 'coverage']);
const TEST_FILE_PATTERN = /\.(?:spec|test)\.[^/]+$/u;

export class BuildSecurityError extends Error {
  constructor(code) {
    super(code);
    this.name = 'BuildSecurityError';
    this.code = code;
  }
}

function portablePath(path) {
  return path.split(sep).join('/');
}

function collectDirectoryFiles(root, directory, output) {
  const absoluteDirectory = join(root, directory);
  if (!existsSync(absoluteDirectory)) return;

  for (const name of readdirSync(absoluteDirectory).sort()) {
    if (EXCLUDED_DIRECTORY_NAMES.has(name)) continue;
    const absolute = join(absoluteDirectory, name);
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) throw new BuildSecurityError('input_symlink');
    if (stat.isDirectory()) {
      collectDirectoryFiles(root, portablePath(relative(root, absolute)), output);
    } else if (stat.isFile()) {
      if (!TEST_FILE_PATTERN.test(name)) {
        output.push(portablePath(relative(root, absolute)));
      }
    } else {
      throw new BuildSecurityError('input_type');
    }
  }
}

export function collectBuildInputs(projectRoot) {
  const root = resolve(projectRoot);
  const inputs = [];
  for (const input of REQUIRED_INPUTS) {
    const absolute = join(root, input);
    if (!existsSync(absolute)) throw new BuildSecurityError('missing_input');
    const stat = lstatSync(absolute);
    if (stat.isSymbolicLink()) throw new BuildSecurityError('input_symlink');
    if (!stat.isFile()) throw new BuildSecurityError('input_type');
    inputs.push(input);
  }

  const typescriptConfigs = readdirSync(root)
    .filter((name) => /^tsconfig(?:\.[^.]+)?\.json$/u.test(name))
    .sort();
  if (typescriptConfigs.length === 0) throw new BuildSecurityError('missing_typescript_config');
  for (const input of typescriptConfigs) {
    const stat = lstatSync(join(root, input));
    if (stat.isSymbolicLink()) throw new BuildSecurityError('input_symlink');
    if (!stat.isFile()) throw new BuildSecurityError('input_type');
  }
  inputs.push(...typescriptConfigs);
  collectDirectoryFiles(root, 'src', inputs);
  collectDirectoryFiles(root, 'public', inputs);

  const unique = [...new Set(inputs)].sort();
  if (unique.length === 0) throw new BuildSecurityError('empty_inputs');
  return unique;
}

export function computeBuildId(projectRoot) {
  const root = resolve(projectRoot);
  const hash = createHash('sha256');
  for (const path of collectBuildInputs(root)) {
    const bytes = readFileSync(join(root, path));
    const pathBytes = Buffer.from(path, 'utf8');
    const length = Buffer.alloc(8);
    length.writeBigUInt64BE(BigInt(bytes.length));
    hash.update(pathBytes);
    hash.update(Buffer.from([0]));
    hash.update(length);
    hash.update(bytes);
  }
  return hash.digest('hex');
}

export function resolveBuildId(projectRoot, environment = process.env) {
  const computed = computeBuildId(projectRoot);
  if (!Object.prototype.hasOwnProperty.call(environment, 'OIG_BUILD_ID')) return computed;

  const override = environment.OIG_BUILD_ID;
  if (typeof override !== 'string' || !/^[a-f0-9]{64}$/u.test(override)) {
    throw new BuildSecurityError('build_id_malformed');
  }
  if (override !== computed) throw new BuildSecurityError('build_id_mismatch');
  return computed;
}

function rejectProjectConfig(projectRoot) {
  for (const name of readdirSync(projectRoot)) {
    if (name === '.npmrc' || name.startsWith('.env')) {
      throw new BuildSecurityError('project_environment_config');
    }
  }
}

export function assertClosedParentEnvironment(projectRoot, environment = process.env) {
  rejectProjectConfig(resolve(projectRoot));

  const parentHome = environment.HOME;
  if (parentHome && existsSync(join(parentHome, '.npmrc'))) {
    throw new BuildSecurityError('user_npm_config');
  }

  for (const name of Object.keys(environment)) {
    if (name === 'NODE_OPTIONS' || name.startsWith('VITE_') || name.startsWith('NPM_CONFIG_')) {
      throw new BuildSecurityError('ambient_build_environment');
    }
  }
}

function makePrivateDirectory(path) {
  mkdirSync(path, { recursive: true, mode: 0o700 });
  chmodSync(path, 0o700);
}

function makeEmptyPrivateFile(path) {
  writeFileSync(path, '', { mode: 0o600 });
  chmodSync(path, 0o600);
}

export function createClosedBuildEnvironment(
  projectRoot,
  environmentDirectory,
  parentEnvironment = process.env,
) {
  assertClosedParentEnvironment(projectRoot, parentEnvironment);
  const root = resolve(environmentDirectory);
  const home = join(root, 'home');
  const cache = join(root, 'npm-cache');
  const temporary = join(root, 'tmp');
  const userconfig = join(root, 'npm-user.npmrc');
  const globalconfig = join(root, 'npm-global.npmrc');

  makePrivateDirectory(root);
  makePrivateDirectory(home);
  makePrivateDirectory(cache);
  makePrivateDirectory(temporary);
  makeEmptyPrivateFile(userconfig);
  makeEmptyPrivateFile(globalconfig);
  if (userconfig === globalconfig) throw new BuildSecurityError('npm_config_alias');

  const environment = {
    PATH: parentEnvironment.PATH ?? '',
    HOME: home,
    TMPDIR: temporary,
    LANG: 'C.UTF-8',
    LC_ALL: 'C.UTF-8',
    TZ: 'UTC',
    CI: '1',
    NODE_ENV: 'production',
    NPM_CONFIG_CACHE: cache,
    NPM_CONFIG_USERCONFIG: userconfig,
    NPM_CONFIG_GLOBALCONFIG: globalconfig,
    NPM_CONFIG_INCLUDE: 'dev',
  };

  return { environment, home, cache, userconfig, globalconfig };
}
