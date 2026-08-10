import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import {
  BuildSecurityError,
  assertClosedParentEnvironment,
  createClosedBuildEnvironment,
  resolveBuildId,
} from './build-security.mjs';

const SCRIPT_DIRECTORY = dirname(fileURLToPath(import.meta.url));
const DEFAULT_PROJECT_ROOT = resolve(SCRIPT_DIRECTORY, '..');

function optionValue(argumentsList, name) {
  const index = argumentsList.indexOf(name);
  if (index < 0) return undefined;
  const value = argumentsList[index + 1];
  if (!value || value.startsWith('--')) throw new BuildSecurityError('missing_option_value');
  return value;
}

function run(command, args, options) {
  const result = spawnSync(command, args, {
    cwd: options.cwd,
    env: options.environment,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });
  if (result.error || result.status !== 0) throw new BuildSecurityError(options.code);
  return result.stdout?.trim() ?? '';
}

function verifyNpmConfiguration(projectRoot, environment, expectedUser, expectedGlobal) {
  const user = run('npm', ['config', 'get', 'userconfig'], {
    cwd: projectRoot,
    environment,
    capture: true,
    code: 'npm_userconfig_unavailable',
  });
  const global = run('npm', ['config', 'get', 'globalconfig'], {
    cwd: projectRoot,
    environment,
    capture: true,
    code: 'npm_globalconfig_unavailable',
  });
  if (resolve(user) !== expectedUser || resolve(global) !== expectedGlobal || user === global) {
    throw new BuildSecurityError('npm_config_mismatch');
  }
}

function describeEnvironment(details) {
  return JSON.stringify({
    userconfig: details.userconfig,
    globalconfig: details.globalconfig,
    cache: details.cache,
    home: details.home,
  });
}

function main() {
  const argumentsList = process.argv.slice(2);
  const projectRoot = resolve(optionValue(argumentsList, '--root') ?? DEFAULT_PROJECT_ROOT);

  if (argumentsList.includes('--print-build-id')) {
    assertClosedParentEnvironment(projectRoot, process.env);
    process.stdout.write(`${resolveBuildId(projectRoot, process.env)}\n`);
    return;
  }

  if (argumentsList.includes('--check-environment')) {
    assertClosedParentEnvironment(projectRoot, process.env);
    process.stdout.write('ok\n');
    return;
  }

  const requestedEnvironmentDirectory = optionValue(argumentsList, '--environment-dir');
  const environmentDirectory = requestedEnvironmentDirectory
    ? resolve(requestedEnvironmentDirectory)
    : mkdtempSync(join(tmpdir(), 'oig-v2-build-'));
  const removeEnvironment = !requestedEnvironmentDirectory;

  try {
    const details = createClosedBuildEnvironment(projectRoot, environmentDirectory, process.env);
    if (argumentsList.includes('--describe-environment')) {
      process.stdout.write(`${describeEnvironment(details)}\n`);
      return;
    }

    const buildId = resolveBuildId(projectRoot, process.env);
    const environment = { ...details.environment, OIG_BUILD_ID: buildId };
    verifyNpmConfiguration(projectRoot, environment, details.userconfig, details.globalconfig);

    if (argumentsList.includes('--install')) {
      run('npm', ['ci', '--include=dev'], {
        cwd: projectRoot,
        environment,
        capture: false,
        code: 'npm_install_failed',
      });
    }

    run(process.execPath, [join(projectRoot, 'node_modules', 'typescript', 'bin', 'tsc'), '--noEmit'], {
      cwd: projectRoot,
      environment,
      capture: false,
      code: 'typecheck_failed',
    });

    const viteArguments = [
      join(projectRoot, 'node_modules', 'vite', 'bin', 'vite.js'),
      'build',
      '--mode',
      'production',
    ];
    const outputDirectory = optionValue(argumentsList, '--out-dir');
    if (outputDirectory) viteArguments.push('--outDir', resolve(outputDirectory));
    run(process.execPath, viteArguments, {
      cwd: projectRoot,
      environment,
      capture: false,
      code: 'vite_build_failed',
    });
  } finally {
    if (removeEnvironment) rmSync(environmentDirectory, { recursive: true, force: true });
  }
}

try {
  main();
} catch (error) {
  const code = error instanceof BuildSecurityError ? error.code : 'unexpected_build_failure';
  process.stderr.write(`Secure build rejected: ${code}\n`);
  process.exitCode = 1;
}
