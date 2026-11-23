// @vitest-environment node

import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  analyzeFile,
  collectMetrics,
  fileComplexities,
  listMainCodeFiles,
  readSourceAt,
  resolveReportOwners,
} from '../../../../scripts/quality/changed-functions-check.mjs';

const REPO_ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../../../..');
const TOOL = path.join(REPO_ROOT, 'scripts/quality/changed-functions-check.mjs');
const SOURCE = 'custom_components/oig_cloud/www_v2/src';
const PROPERTIES = [
  'sonar.sources=custom_components,scripts',
  'sonar.tests=tests,custom_components/oig_cloud/www_v2/playwright,custom_components/oig_cloud/www_v2/tests,custom_components/oig_cloud/www_v2/src',
  'sonar.test.inclusions=tests/**,custom_components/oig_cloud/www_v2/playwright/**,custom_components/oig_cloud/www_v2/tests/**,custom_components/oig_cloud/www_v2/src/**/__tests__/**,custom_components/oig_cloud/www_v2/src/**/*.test.ts,custom_components/oig_cloud/www_v2/src/**/*.test.tsx',
  'sonar.exclusions=custom_components/oig_cloud/www_v2/dist/**',
].join('\n') + '\n';

// Each case spawns the checker (ESLint + typescript-eslint cold start): allow for a busy CI runner.
vi.setConfig({ testTimeout: 120_000 });

const temporaryRepos = [];

function git(repo, ...args) {
  return execFileSync('git', ['-C', repo, ...args], { encoding: 'utf8' }).trim();
}

function sourcePath(name = 'probe.ts') {
  return `${SOURCE}/${name}`;
}

function createRepo(files = {}, { properties = PROPERTIES, gitignore = '', force = [] } = {}) {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'changed-functions-check-'));
  temporaryRepos.push(repo);
  git(repo, 'init', '-q');
  git(repo, 'config', 'user.name', 'Changed functions tests');
  git(repo, 'config', 'user.email', 'changed-functions@example.invalid');
  if (properties !== null) {
    fs.mkdirSync(path.join(repo, '.sonar'), { recursive: true });
    fs.writeFileSync(path.join(repo, '.sonar/local.properties'), properties);
  }
  fs.writeFileSync(path.join(repo, '.gitignore'), gitignore);
  for (const [filename, content] of Object.entries(files)) {
    const absolute = path.join(repo, filename);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content);
  }
  const staged = ['.gitignore', ...Object.keys(files).filter((filename) => !force.includes(filename))];
  if (properties !== null) staged.push('.sonar/local.properties');
  git(repo, 'add', '--', ...staged);
  for (const filename of force) git(repo, 'add', '-f', '--', filename);
  git(repo, 'commit', '-m', 'baseline');
  return { repo, base: git(repo, 'rev-parse', 'HEAD') };
}

function commitFiles(repo, files, message = 'change', force = []) {
  for (const [filename, content] of Object.entries(files)) {
    const absolute = path.join(repo, filename);
    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, content);
    git(repo, 'add', ...(force.includes(filename) ? ['-f'] : []), '--', filename);
  }
  git(repo, 'commit', '-m', message);
}

function runCheck(repo, base) {
  return spawnSync(process.execPath, [TOOL, '--repo', repo, '--base', base, '--head', 'HEAD'], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
  });
}

// Run base -> head and return the CLI result.
function ratchet(baseFiles, headFiles, options) {
  const { repo, base } = createRepo(baseFiles, options);
  commitFiles(repo, headFiles);
  return runCheck(repo, base);
}

function complexityFunction(name, count) {
  const branches = Array.from({ length: count }, (_, index) => `  if (value > ${index}) value += 1;`).join('\n');
  return `function ${name}(value) {\n${branches}\n  return value;\n}\n`;
}

const callbacks = (body = 'if (a) { if (b) { work(a); } }') => `items.forEach((item) => {\n  ${body}\n});\n`;

afterEach(() => {
  for (const repo of temporaryRepos.splice(0)) fs.rmSync(repo, { recursive: true, force: true });
});

describe('ratchet semantics', () => {
  it('rejects a new function above the Sonar complexity threshold', () => {
    const result = ratchet({ [sourcePath()]: '' }, { [sourcePath()]: complexityFunction('hot', 16) });
    expect(result.status).toBe(1);
    expect(result.stdout).toBe(`${sourcePath()}:1 hot S3776 0->16\n`);
  });

  it('accepts a new function at the threshold', () => {
    const result = ratchet({ [sourcePath()]: '' }, { [sourcePath()]: complexityFunction('ok', 15) });
    expect(result.status).toBe(0);
  });

  it('rejects a modified function whose complexity rises, even below 15', () => {
    const result = ratchet({ [sourcePath()]: complexityFunction('f', 3) }, { [sourcePath()]: complexityFunction('f', 4) });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('f S3776 3->4');
  });

  it('rejects a new parameter above 7 and a rising count on a modified function', () => {
    const many = (n) => `function f(${Array.from({ length: n }, (_, i) => `p${i}`).join(', ')}) { return [${Array.from({ length: n }, (_, i) => `p${i}`).join(', ')}]; }\n`;
    expect(ratchet({ [sourcePath()]: '' }, { [sourcePath()]: many(8) }).stdout).toContain('f S107 0->8');
    expect(ratchet({ [sourcePath()]: many(8) }, { [sourcePath()]: many(9) }).stdout).toContain('f S107 8->9');
    expect(ratchet({ [sourcePath()]: many(8) }, { [sourcePath()]: many(8).replace('{ return', '{ /* c */ return') }).status).toBe(0);
  });

  it('does not recheck an untouched over-threshold function in a changed file', () => {
    const base = `${complexityFunction('legacy', 20)}${complexityFunction('small', 1)}`;
    const head = `${complexityFunction('legacy', 20)}${complexityFunction('small', 1).replace('value += 1', 'value += 2')}`;
    expect(ratchet({ [sourcePath()]: base }, { [sourcePath()]: head }).status).toBe(0);
  });

  it('line shift above a touched function does not make it NEW', () => {
    const base = complexityFunction('legacy', 20);
    const head = `// one\n// two\n${complexityFunction('legacy', 20).replace('value += 1', 'value += 2').replace('> 0)', '> 0 )')}`;
    const result = ratchet({ [sourcePath()]: base }, { [sourcePath()]: head });
    expect(result.status).toBe(0);
  });

  it('legacy over-threshold function with an edited signature line is not worse', () => {
    const base = complexityFunction('legacy', 20);
    const head = base.replace('legacy(value)', 'legacy(input)').replaceAll('value', 'input');
    const result = ratchet({ [sourcePath()]: base }, { [sourcePath()]: head });
    expect(result.status).toBe(0);
  });

  it('edited signature line that also raises complexity is worse than its base', () => {
    const base = complexityFunction('legacy', 20);
    const head = complexityFunction('legacyRenamed', 21);
    const result = ratchet({ [sourcePath()]: base }, { [sourcePath()]: head });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('legacyRenamed S3776 20->21');
  });

  it('a renamed function whose anchor sits in a hunk uses the single removed function as base', () => {
    const base = complexityFunction('before', 20);
    const head = complexityFunction('after', 20);
    expect(ratchet({ [sourcePath()]: base }, { [sourcePath()]: head }).status).toBe(0);
  });

  it('ambiguous hunk (several same-label functions removed) is NEW', () => {
    const base = `${complexityFunction('dup', 20)}${complexityFunction('dup', 20).replaceAll('value', 'other')}`;
    const rewritten = `function dup(a) {\n${Array.from({ length: 20 }, (_, i) => `  if (a === ${i + 100}) a -= 1;`).join('\n')}\n  return a;\n}\n`;
    const result = ratchet({ [sourcePath()]: base }, { [sourcePath()]: rewritten });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('dup S3776 0->20');
  });
});

describe('identical same-label callbacks', () => {
  const two = (first, second) => `export function wire(items, a, b) {\n  ${first}\n  ${second}\n}\n`;
  const body = (inner) => `items.forEach((item) => { ${inner} });`;
  const plain = body('if (a) { work(item); }');

  it('untouched identical callbacks with an edit elsewhere -> 0', () => {
    const base = `${two(plain, plain)}${complexityFunction('other', 1)}`;
    const head = `${two(plain, plain)}${complexityFunction('other', 1).replace('value += 1', 'value += 2')}`;
    expect(ratchet({ [sourcePath()]: base }, { [sourcePath()]: head }).status).toBe(0);
  });

  it('editing one identical callback without raising complexity -> 0', () => {
    const base = two(plain, plain);
    const head = two(body('if (a) { work(item, 1); }'), plain);
    expect(ratchet({ [sourcePath()]: base }, { [sourcePath()]: head }).status).toBe(0);
  });

  it('editing one identical callback to raise complexity -> 1 against its own base', () => {
    const base = two(plain, plain);
    const head = two(plain, body('if (a) { if (b) { work(item); } }'));
    const result = ratchet({ [sourcePath()]: base }, { [sourcePath()]: head });
    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(/items\.forEach#callback0 S3776 1->3\n$/);
    expect(result.stdout.trim().split('\n')).toHaveLength(1);
  });

  it('maps a touched same-line sibling by its unchanged anchor column', () => {
    const first = 'items.forEach((v) => { use(v); });';
    const second = `items.forEach((v) => {\n${Array.from({ length: 20 }, (_, i) => `  if (v > ${i}) use(v);`).join('\n')}\n});`;
    const base = `${first} ${second}\n`;
    const edited = base.replace('if (v > 0) use(v);', 'if (v > 0) use(v + 1);');
    expect(ratchet({ [sourcePath()]: base }, { [sourcePath()]: edited }).status).toBe(0);

    const worse = edited.replace('if (v > 0) use(v + 1);', 'if (v > 0) use(v + 1);\n  if (v > 20) use(v);');
    const result = ratchet({ [sourcePath()]: base }, { [sourcePath()]: worse });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('S3776 20->21');
    expect(result.stdout).not.toContain('S3776 0->');
  });

  it('a new callback inserted among same-label siblings is NEW', () => {
    const hot = body(Array.from({ length: 16 }, (_, i) => `if (a > ${i}) { work(item); }`).join(' '));
    const base = two(plain, plain);
    const head = `export function wire(items, a, b) {\n  ${plain}\n  ${hot}\n  ${plain}\n}\n`;
    const result = ratchet({ [sourcePath()]: base }, { [sourcePath()]: head });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('S3776 0->16');
  });

  it('real www_v2 node.ts: editing another function ignores the identical callbacks', () => {
    const file = `${SOURCE}/ui/features/flow/node.ts`;
    const original = readSourceAt(REPO_ROOT, 'HEAD', `custom_components/oig_cloud/www_v2/${file.slice(`custom_components/oig_cloud/www_v2/`.length)}`);
    expect(original).toContain('this.updateComplete.then(() => this.applyCustomPositions());');
    const edited = original.replace('    let changed = false;\n    const dims', '    let changed = false; // edited\n    const dims');
    expect(edited).not.toBe(original);
    const result = ratchet({ [file]: original }, { [file]: edited });
    expect(result.stderr).toBe('');
    expect(result.status).toBe(0);
  }, 60_000);
});

describe('file renames', () => {
  it('only the edited function of a renamed file is checked, against its base path', () => {
    const filler = Array.from({ length: 12 }, (_, i) => `export const k${i} = ${i};\n`).join('');
    const base = `${filler}${complexityFunction('legacy', 20)}${complexityFunction('edited', 2)}`;
    const { repo, base: baseRev } = createRepo({ [sourcePath('old.ts')]: base });
    git(repo, 'mv', sourcePath('old.ts'), sourcePath('new.ts'));
    fs.writeFileSync(path.join(repo, sourcePath('new.ts')), base.replace(complexityFunction('edited', 2), complexityFunction('edited', 3)));
    git(repo, 'add', '--', sourcePath('new.ts'));
    git(repo, 'commit', '-m', 'rename and edit');
    const result = runCheck(repo, baseRev);
    expect(result.status).toBe(1);
    expect(result.stdout).toMatch(new RegExp(`^${sourcePath('new.ts')}:\\d+ edited S3776 2->3\\n$`));
  });

  it('a renamed file with a not-worse edit passes', () => {
    const filler = Array.from({ length: 12 }, (_, i) => `export const k${i} = ${i};\n`).join('');
    const base = `${filler}${complexityFunction('legacy', 20)}${complexityFunction('edited', 2)}`;
    const { repo, base: baseRev } = createRepo({ [sourcePath('old.ts')]: base });
    git(repo, 'mv', sourcePath('old.ts'), sourcePath('new.ts'));
    fs.writeFileSync(path.join(repo, sourcePath('new.ts')), base.replace('value += 1', 'value += 5'));
    git(repo, 'add', '--', sourcePath('new.ts'));
    git(repo, 'commit', '-m', 'rename and edit');
    expect(runCheck(repo, baseRev).status).toBe(0);
  });
});

describe('active rules per language', () => {
  const unusedImport = `import { unused } from './x';\nexport const keep = 1;\n`;

  it('ignores module-level reports such as an unused import', () => {
    const result = ratchet({ [sourcePath()]: 'export const keep = 1;\n' }, { [sourcePath()]: unusedImport });
    expect(result.status).toBe(0);
  });

  it('S1172 is never checked: unused callback parameter passes TS and JS', () => {
    const code = 'export class Box {\n  close() { this.closed = true; }\n  wire(el) {\n    el.addEventListener("x", (e) => this.close());\n  }\n}\n';
    for (const name of ['probe.ts', 'probe.js']) {
      const result = ratchet({ [sourcePath(name)]: '' }, { [sourcePath(name)]: name.endsWith('.ts') ? code.replace('close() { this.closed = true; }', 'closed = false;\n  close(): void { this.closed = true; }').replace('wire(el)', 'wire(el: any): void') : code });
      expect(result.status, `${name}: ${result.stdout}${result.stderr}`).toBe(0);
    }
  });

  it('S1481 unused local: passes TS, fails JS', () => {
    const code = 'export function f(a) {\n  const unusedLocal = a + 1;\n  return a;\n}\n';
    expect(ratchet({ [sourcePath('probe.ts')]: '' }, { [sourcePath('probe.ts')]: code.replace('(a)', '(a: number)') }).status).toBe(0);
    const js = ratchet({ [sourcePath('probe.js')]: '' }, { [sourcePath('probe.js')]: code });
    expect(js.status).toBe(1);
    expect(js.stdout).toContain('S1481 0->1');
  });

  it('S1854 catches never-read overwritten TypeScript writes without enabling S1481', () => {
    const deadStore = 'export function f(a: number) {\n  let total = 0;\n  total = a * 2;\n  total = a * 3;\n  return a;\n}\n';
    const ts = ratchet({ [sourcePath()]: '' }, { [sourcePath()]: deadStore });
    expect(ts.status).toBe(1);
    expect(ts.stdout).toContain('f S1854 0->2');

    const js = ratchet({ [sourcePath('probe.js')]: '' }, { [sourcePath('probe.js')]: deadStore.replace('a: number', 'a') });
    expect(js.status).toBe(1);
    expect(js.stdout).toContain('S1854 0->2');
  });

  it('S107 mirrors parameter-property, AMD factory, overload, and NOSONAR exemptions', () => {
    const properties = `export class Bag {\n  constructor(${Array.from({ length: 8 }, (_, i) => `public v${i}: number`).join(', ')}) { console.log(this.v0); }\n}\n`;
    expect(ratchet({ [sourcePath()]: '' }, { [sourcePath()]: properties }).status).toBe(0);

    const ordinary = `export function f(${Array.from({ length: 8 }, (_, i) => `p${i}: number`).join(', ')}) { return p0; }\n`;
    const tooMany = ratchet({ [sourcePath()]: '' }, { [sourcePath()]: ordinary });
    expect(tooMany.status).toBe(1);
    expect(tooMany.stdout).toContain('f S107 0->8');

    const amd = `define(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], function (a, b, c, d, e, f, g, h) { use(a); });\n`;
    expect(ratchet({ [sourcePath()]: '' }, { [sourcePath()]: amd }).status).toBe(0);

    const overload = `export class Bag {\n  method(a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number): void;\n  method(...args: any[]) { use(args); }\n}\n`;
    const overloaded = ratchet({ [sourcePath()]: '' }, { [sourcePath()]: overload });
    expect(overloaded.status).toBe(1);
    expect(overloaded.stdout).toContain('Bag.method S107 0->8');

    const sonar = `export function f(a, b, c, d, e, f, g, h) { return 0; } // NOSONAR\n`;
    expect(ratchet({ [sourcePath('probe.js')]: '' }, { [sourcePath('probe.js')]: sonar }).status).toBe(0);
  });

  it('S1854 dead store fails TS and JS', () => {
    const code = 'export function f(a) {\n  let total = 0;\n  total = a * 2;\n  total = a * 3;\n  return total;\n}\n';
    for (const name of ['probe.ts', 'probe.js']) {
      const result = ratchet({ [sourcePath(name)]: '' }, { [sourcePath(name)]: name.endsWith('.ts') ? code.replace('(a)', '(a: number)') : code });
      expect(result.status, name).toBe(1);
      expect(result.stdout).toContain('S1854 0->1');
    }
  });

  it('S3358 nested conditional and non-exempt S1186 empty function are checked', () => {
    const nested = 'export function f(a, b) {\n  return a ? (b ? 1 : 2) : 3;\n}\n';
    expect(ratchet({ [sourcePath()]: '' }, { [sourcePath()]: nested.replace('(a, b)', '(a: boolean, b: boolean)') }).stdout).toContain('S3358 0->1');
    const empty = 'export function unimplemented() {}\n';
    expect(ratchet({ [sourcePath()]: '' }, { [sourcePath()]: empty }).stdout).toContain('S1186 0->1');
    const exemptions = 'export function onDismiss() {}\nexport const noop = () => {};\nsetTimeout(() => {}, 0);\n';
    expect(ratchet({ [sourcePath()]: '' }, { [sourcePath()]: exemptions }).status).toBe(0);
  });

  it('S3358 cannot trade an old issue in one expression for a new issue in another', () => {
    const base = 'export function f(a: boolean, b: boolean) {\n  const first = a ? (b ? 1 : 2) : 3;\n  const second = a ? 4 : 5;\n  return first + second;\n}\n';
    const head = 'export function f(a: boolean, b: boolean) {\n  const first = a ? 1 : 3;\n  const second = a ? (b ? 4 : 6) : 5;\n  return first + second;\n}\n';
    const result = ratchet({ [sourcePath()]: base }, { [sourcePath()]: head });
    expect(result.status).toBe(1);
    expect(result.stdout).toContain('f S3358 1->1');
  });

  it('an existing finding in a modified function is not worse', () => {
    const base = 'export function f(a: boolean, b: boolean) {\n  return a ? (b ? 1 : 2) : 3;\n}\n';
    const head = base.replace('? 1 : 2', '? 5 : 2');
    expect(ratchet({ [sourcePath()]: base }, { [sourcePath()]: head }).status).toBe(0);
  });

  it('honors NOSONAR on the issue line', () => {
    const code = 'export function f(a: boolean, b: boolean) {\n  return a ? (b ? 1 : 2) : 3; // NOSONAR\n}\n';
    expect(ratchet({ [sourcePath()]: '' }, { [sourcePath()]: code }).status).toBe(0);
  });
});

describe('scope and errors', () => {
  const hot = complexityFunction('hot', 20);

  it('ignores test, excluded and gitignored paths', () => {
    const files = {
      [sourcePath('probe.test.ts')]: hot,
      [`${SOURCE}/__tests__/probe.ts`]: hot,
      'custom_components/oig_cloud/www_v2/dist/bundle.js': hot,
      [sourcePath('ignored.ts')]: hot,
    };
    const empty = Object.fromEntries(Object.keys(files).map((name) => [name, '']));
    const { repo, base } = createRepo(empty, { gitignore: 'ignored.ts\n', force: [sourcePath('ignored.ts')] });
    commitFiles(repo, files, 'change', [sourcePath('ignored.ts')]);
    expect(runCheck(repo, base).status).toBe(0);
    const control = ratchet({ [sourcePath()]: '' }, { [sourcePath()]: hot });
    expect(control.status).toBe(1);
  });

  it('checks .mts, .cts, and C-quoted filenames without losing rename mapping', () => {
    for (const name of ['probe.mts', 'probe.cts', 'quote".ts']) {
      const result = ratchet({ [sourcePath(name)]: '' }, { [sourcePath(name)]: complexityFunction('hot', 16) });
      expect(result.status, name).toBe(1);
      expect(result.stdout).toContain('hot S3776 0->16');
    }

    const oldName = sourcePath('old".ts');
    const newName = sourcePath('new".ts');
    const baseCode = `${complexityFunction('legacy', 20)}${complexityFunction('edited', 2)}`;
    const { repo, base } = createRepo({ [oldName]: baseCode });
    git(repo, 'mv', oldName, newName);
    fs.writeFileSync(path.join(repo, newName), baseCode.replace('value += 1', 'value += 2'));
    git(repo, 'add', '--', newName);
    git(repo, 'commit', '-m', 'rename quoted file and edit');
    expect(runCheck(repo, base).status).toBe(0);
  });

  it('exit 2 for an unresolved base revision', () => {
    const { repo } = createRepo({ [sourcePath()]: '' });
    expect(runCheck(repo, 'does-not-exist').status).toBe(2);
  });

  it('exit 2 when .sonar/local.properties is missing', () => {
    const { repo, base } = createRepo({ [sourcePath()]: '' }, { properties: null });
    commitFiles(repo, { [sourcePath()]: hot });
    expect(runCheck(repo, base).status).toBe(2);
  });

  it('exit 2 on a parse error in a touched file', () => {
    const result = ratchet({ [sourcePath()]: '' }, { [sourcePath()]: 'function (' });
    expect(result.status).toBe(2);
  });

  it('exit 2 on usage errors, 0 for help', () => {
    expect(spawnSync(process.execPath, [TOOL], { encoding: 'utf8' }).status).toBe(2);
    expect(spawnSync(process.execPath, [TOOL, '--help'], { encoding: 'utf8' }).status).toBe(0);
  });
});

describe('report ownership fails closed', () => {
  const code = 'export function outer(a: boolean, b: boolean) {\n  return a ? (b ? 1 : 2) : 3;\n}\n\nexport function hot(v: number) {\n  if (v) { if (v > 1) { if (v > 2) { return 1; } } }\n  return 0;\n}\n';

  it('zero owners for an anchor report inside a touched function throws', () => {
    const analysis = analyzeFile(code, sourcePath());
    const broken = { ...analysis, functions: analysis.functions.map((fn) => ({ ...fn, anchor: { start: { line: 99, column: 0 }, end: { line: 99, column: 1 } } })) };
    expect(() => collectMetrics(broken, analysis.functions)).toThrow(/zero-owner/);
  });

  it('multiple owners for a report inside a touched function throws', () => {
    const analysis = analyzeFile(code, sourcePath());
    const hotFn = analysis.functions.find((fn) => fn.label === 'hot');
    const twin = { ...hotFn, node: { ...hotFn.node } };
    const doubled = { ...analysis, functions: [...analysis.functions, twin] };
    expect(() => collectMetrics(doubled, [hotFn])).toThrow(/multi-owner/);
  });

  it('reports outside every target function are ignored', () => {
    const analysis = analyzeFile(code, sourcePath());
    const outer = analysis.functions.find((fn) => fn.label === 'outer');
    const metrics = collectMetrics(analysis, [outer]);
    expect(metrics.get(outer).complexity).toBe(3);
    expect(metrics.get(outer).findings.get('S3358')).toHaveLength(1);
    const owners = resolveReportOwners(analysis.reports.find((r) => r.message.ruleId === 'sonarjs/cognitive-complexity'), analysis.functions);
    expect(owners).toHaveLength(1);
  });
});

describe('Sonar S3776 baseline conformance', () => {
  it('matches every flagged score and has no unflagged main-code function over 15', () => {
    const fixturePath = path.join(path.dirname(new URL(import.meta.url).pathname), 'fixtures/sonar-s3776-baseline.json');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const files = listMainCodeFiles(REPO_ROOT, fixture.revision);
    const flagged = [];
    for (const filename of files) {
      const source = readSourceAt(REPO_ROOT, fixture.revision, filename);
      for (const fn of fileComplexities(source, filename)) {
        if (fn.complexity > 15) flagged.push({ path: filename, line: fn.line, complexity: fn.complexity });
      }
    }
    expect(files).toHaveLength(fixture.mainCodeFiles);
    expect(flagged).toEqual(fixture.functions.map(({ path: filename, line, complexity }) => ({ path: filename, line, complexity })));
    expect(fixture.unflaggedMainCodeFunctionsOver15).toBe(0);
    expect(fs.statSync(fixturePath).size).toBeLessThan(300 * 1024);
  }, 120_000);
});
