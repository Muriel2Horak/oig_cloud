#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Linter } from 'eslint';
import sonarjs from 'eslint-plugin-sonarjs';
import tseslint from 'typescript-eslint';

const require = createRequire(import.meta.url);
const sonarjsDir = path.dirname(require.resolve('eslint-plugin-sonarjs/package.json'));
const { getMainFunctionTokenLocation } = require(path.join(sonarjsDir, 'cjs/helpers/location.js'));

const FUNCTION_TYPES = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);
const FILE_GLOBS = ['**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs', '**/*.ts', '**/*.tsx', '**/*.mts', '**/*.cts'];
const SOURCE_PREFIX = 'custom_components/oig_cloud/www_v2/';
const COMPLEXITY_THRESHOLD = 15;
const MAX_PARAMETERS = 7;

// ESLint rule id -> Sonar key, how a report maps to a function, and the languages where Sonar activates it.
// S1172 (unused parameter) is inactive for both languages and is never checked.
const RULES = {
  'sonarjs/cognitive-complexity': { key: 'S3776', owner: 'anchor', langs: ['ts', 'js'] },
  'sonarjs/no-nested-conditional': { key: 'S3358', owner: 'inner', langs: ['ts', 'js'] },
  'sonarjs/no-dead-store': { key: 'S1854', owner: 'inner', langs: ['ts', 'js'] },
  'sonarjs/no-unused-vars': { key: 'S1481', owner: 'inner', langs: ['js'] },
  'sonarjs/no-duplicated-branches': { key: 'S1871', owner: 'inner', langs: ['ts', 'js'] },
  'sonarjs/no-identical-functions': { key: 'S4144', owner: 'anchor', langs: ['ts', 'js'] },
  '@typescript-eslint/no-empty-function': { key: 'S1186', owner: 'inner', langs: ['ts', 'js'] },
};
const COGNITIVE_RULE = 'sonarjs/cognitive-complexity';

export class CheckError extends Error {}

function globRegExp(pattern) {
  let result = '';
  for (let index = 0; index < pattern.length;) {
    if (pattern.startsWith('**/', index)) {
      result += '(?:.*/)?';
      index += 3;
    } else if (pattern.startsWith('**', index)) {
      result += '.*';
      index += 2;
    } else if (pattern[index] === '*') {
      result += '[^/]*';
      index += 1;
    } else if (pattern[index] === '?') {
      result += '[^/]';
      index += 1;
    } else {
      result += pattern[index].replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
      index += 1;
    }
  }
  return new RegExp(`^${result}$`);
}

function readScope(repo, revision = 'HEAD') {
  const filename = '.sonar/local.properties';
  let raw = gitAllowMissing(repo, ['show', `${revision}:${filename}`]);
  if (raw === null) {
    try {
      raw = fs.readFileSync(path.join(repo, filename), 'utf8');
    } catch (error) {
      throw new CheckError(`cannot read ${filename}: ${error.message}`);
    }
  }

  const properties = new Map();
  for (const [index, rawLine] of raw.split(/\r?\n/).entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#') || line.startsWith('!')) continue;
    const separator = line.indexOf('=');
    if (separator < 0) throw new CheckError(`${filename}:${index + 1}: expected key=value`);
    const key = line.slice(0, separator).trim();
    if (!key) throw new CheckError(`${filename}:${index + 1}: empty property name`);
    properties.set(key, line.slice(separator + 1).trim());
  }

  const values = (key, required = false) => {
    const result = (properties.get(key) ?? '').split(',').map((item) => item.trim()).filter(Boolean);
    if (required && result.length === 0) throw new CheckError(`${filename}: missing required property ${key}`);
    return result;
  };

  return {
    sources: values('sonar.sources', true),
    tests: values('sonar.tests'),
    exclusions: values('sonar.exclusions').map(globRegExp),
    testInclusions: values('sonar.test.inclusions').map(globRegExp),
    testExclusions: values('sonar.test.exclusions').map(globRegExp),
  };
}

function underRoot(filename, root) {
  const normalizedPath = filename.replaceAll('\\', '/');
  const normalizedRoot = root.replaceAll('\\', '/').replace(/\/$/, '');
  return normalizedRoot === '' || normalizedRoot === '.' || normalizedPath === normalizedRoot
    || normalizedPath.startsWith(`${normalizedRoot}/`);
}

export function isMainCodePath(filename, scope) {
  const normalizedPath = filename.replaceAll('\\', '/');
  if (!normalizedPath.startsWith(SOURCE_PREFIX) || !/\.(?:js|jsx|mjs|cjs|ts|tsx|mts|cts)$/.test(normalizedPath)) return false;
  if (!scope.sources.some((root) => underRoot(normalizedPath, root))) return false;
  if (scope.exclusions.some((pattern) => pattern.test(normalizedPath))) return false;

  if (scope.tests.some((root) => underRoot(normalizedPath, root))) {
    if (scope.testExclusions.some((pattern) => pattern.test(normalizedPath))) return false;
    if (scope.testInclusions.length === 0 || scope.testInclusions.some((pattern) => pattern.test(normalizedPath))) {
      return false;
    }
  }
  return true;
}

function git(repo, args, options = {}) {
  const result = spawnSync('git', ['-C', repo, ...args], {
    encoding: options.encoding ?? 'utf8',
    input: options.input,
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw new CheckError(`git ${args[0]} failed: ${result.error.message}`);
  if (result.status !== 0) {
    const detail = String(result.stderr ?? '').trim();
    throw new CheckError(`git ${args[0]} failed${detail ? `: ${detail}` : ''}`);
  }
  return result.stdout;
}

function gitAllowMissing(repo, args) {
  const result = spawnSync('git', ['-C', repo, ...args], { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
  if (result.error) throw new CheckError(`git ${args[0]} failed: ${result.error.message}`);
  return result.status === 0 ? result.stdout : null;
}

function ignoredPaths(repo, filenames) {
  if (filenames.length === 0) return new Set();
  const result = spawnSync('git', ['-C', repo, 'check-ignore', '--no-index', '-z', '--stdin'], {
    input: Buffer.from(`${filenames.join('\0')}\0`),
    encoding: 'buffer',
    maxBuffer: 20 * 1024 * 1024,
  });
  if (result.error) throw new CheckError(`git check-ignore failed: ${result.error.message}`);
  if (result.status !== 0 && result.status !== 1) {
    const detail = result.stderr.toString('utf8').trim();
    throw new CheckError(`git check-ignore failed${detail ? `: ${detail}` : ''}`);
  }
  return new Set(result.stdout.toString('utf8').split('\0').filter(Boolean));
}

export function listMainCodeFiles(repoPath, revision) {
  const repo = path.resolve(repoPath);
  const scope = readScope(repo, revision);
  const raw = git(repo, ['ls-tree', '-r', '--name-only', '-z', revision, '--', SOURCE_PREFIX.slice(0, -1)], { encoding: 'buffer' });
  const tracked = raw.toString('utf8').split('\0').filter((filename) => filename && isMainCodePath(filename, scope));
  const ignored = ignoredPaths(repo, tracked);
  return tracked.filter((filename) => !ignored.has(filename)).sort();
}

export function readSourceAt(repoPath, revision, filename) {
  const repo = path.resolve(repoPath);
  const object = `${revision}:${filename}`;
  const exists = gitAllowMissing(repo, ['cat-file', '-e', object]);
  if (exists === null) return null;
  return git(repo, ['show', object]);
}


function walkAst(node, visit, parent = null) {
  if (!node || typeof node.type !== 'string') return;
  if (parent && !node.parent) node.parent = parent;
  visit(node);
  for (const [key, value] of Object.entries(node)) {
    if (['parent', 'loc', 'range', 'tokens', 'comments'].includes(key)) continue;
    if (Array.isArray(value)) value.forEach((child) => walkAst(child, visit, node));
    else if (value && typeof value === 'object') walkAst(value, visit, node);
  }
}

function parentLabel(node, parent, sourceCode) {
  if (['Property', 'MethodDefinition', 'PropertyDefinition'].includes(parent.type)) {
    const kind = parent.kind && !['init', 'method', 'constructor'].includes(parent.kind) ? `${parent.kind} ` : '';
    const key = parent.computed ? `[${sourceCode.getText(parent.key)}]` : sourceCode.getText(parent.key);
    return `${kind}${key}`;
  }
  if (parent.type === 'VariableDeclarator') return sourceCode.getText(parent.id);
  if (parent.type === 'AssignmentExpression') return sourceCode.getText(parent.left);
  if (parent.type === 'AssignmentPattern') return '<default-param>';
  if (parent.type === 'CallExpression' || parent.type === 'NewExpression') {
    const argumentIndex = parent.arguments.indexOf(node);
    if (argumentIndex >= 0) return `${sourceCode.getText(parent.callee)}#callback${argumentIndex}`;
  }
  return `<${parent.type}>`;
}

// Label without any position: used for identity (kind + label) in the diff mapping.
function functionBaseLabel(node, sourceCode) {
  if (node.id?.name) return node.id.name;
  return node.parent ? parentLabel(node, node.parent, sourceCode) : `<${node.type}>`;
}

function enclosing(node, types) {
  let current = node.parent;
  while (current && !types.has(current.type)) current = current.parent;
  return current;
}

// Display label: enclosing functions and class prefix, for output only.
function functionLabel(node, sourceCode) {
  const base = functionBaseLabel(node, sourceCode);
  const outer = enclosing(node, FUNCTION_TYPES);
  if (outer) return `${functionLabel(outer, sourceCode)}.${base}`;
  const klass = enclosing(node, new Set(['ClassDeclaration', 'ClassExpression']));
  const className = klass?.id?.name
    ?? (klass?.parent?.type === 'VariableDeclarator' ? sourceCode.getText(klass.parent.id) : null);
  return className ? `${className}.${base}` : base;
}

// A method's report anchor (its key) sits outside the FunctionExpression range: extend to the owner node.
function extendedStart(node) {
  const parent = node.parent;
  if (parent?.type === 'MethodDefinition' && parent.value === node) return parent.range[0];
  if (parent?.type === 'Property' && parent.value === node && (parent.method || parent.kind !== 'init')) return parent.range[0];
  return node.range[0];
}

export function languageOf(filename) {
  return /\.(?:tsx?|mts|cts)$/.test(filename) ? 'ts' : 'js';
}

function lintConfig(language) {
  const rules = {};
  for (const [id, spec] of Object.entries(RULES)) {
    if (!spec.langs.includes(language)) continue;
    rules[id] = id === COGNITIVE_RULE ? ['error', 0]
      : id === '@typescript-eslint/no-empty-function' ? ['error', { allow: ['arrowFunctions'] }]
        : 'error';
  }
  return [{
    files: FILE_GLOBS,
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
    },
    plugins: { sonarjs, '@typescript-eslint': tseslint.plugin },
    rules,
  }];
}

function reportRange(message, sourceCode) {
  const start = sourceCode.getIndexFromLoc({ line: message.line, column: message.column - 1 });
  const end = message.endLine && message.endColumn
    ? sourceCode.getIndexFromLoc({ line: message.endLine, column: message.endColumn - 1 })
    : start;
  return { start, end };
}

function isNoSonar(message, sourceCode) {
  return sourceCode.getAllComments().some((comment) => comment.loc.start.line === message.line
    && /\bNOSONAR\b/i.test(comment.value));
}

export function analyzeFile(code, filename) {
  const language = languageOf(filename);
  const linter = new Linter({ configType: 'flat' });
  const messages = linter.verify(code, lintConfig(language), { filename: filename.replaceAll('\\', '/') });
  const parseErrors = messages.filter((message) => message.fatal);
  if (parseErrors.length) {
    const first = parseErrors[0];
    throw new CheckError(`${filename}:${first.line ?? 1}:${first.column ?? 1} parse error: ${first.message}`);
  }
  const sourceCode = linter.getSourceCode();
  if (!sourceCode?.ast) throw new CheckError(`${filename}: ESLint did not produce an AST`);

  const nodes = [];
  walkAst(sourceCode.ast, (node) => { if (FUNCTION_TYPES.has(node.type) && node.body) nodes.push(node); });
  const overloadParams = new Map();
  walkAst(sourceCode.ast, (node) => {
    let key = null;
    if (node.type === 'TSDeclareFunction' && node.id?.name) key = `function:${node.id.name}`;
    if (node.type === 'TSEmptyBodyFunctionExpression') {
      const parent = node.parent;
      if (parent?.type === 'MethodDefinition') {
        const className = parent.parent?.parent?.id?.name ?? '<anonymous-class>';
        key = `method:${className}:${parent.key?.name ?? sourceCode.getText(parent.key)}`;
      } else if (parent?.type === 'FunctionDeclaration' && parent.id?.name) {
        key = `function:${parent.id.name}`;
      }
    }
    if (!key) return;
    const count = (node.params ?? []).filter((param) => param.type !== 'TSParameterProperty'
      && !(param.type === 'Identifier' && param.name === 'this')).length;
    overloadParams.set(key, Math.max(overloadParams.get(key) ?? 0, count));
  });
  const functions = nodes.map((node) => {
    const anchor = getMainFunctionTokenLocation(node, node.parent, { sourceCode });
    if (!anchor) throw new CheckError(`${filename}: no function anchor for ${functionLabel(node, sourceCode)}`);
    const start = extendedStart(node);
    const params = node.params.filter((param) => !(param.type === 'Identifier' && param.name === 'this')).length;
    const ordinaryParams = node.params.filter((param) => param.type !== 'TSParameterProperty'
      && !(param.type === 'Identifier' && param.name === 'this')).length;
    const parent = node.parent;
    const overloadKey = node.id?.name ? `function:${node.id.name}`
      : parent?.type === 'MethodDefinition'
        ? `method:${parent.parent?.parent?.id?.name ?? '<anonymous-class>'}:${parent.key?.name ?? sourceCode.getText(parent.key)}`
        : null;
    const maxParams = Math.max(params, overloadKey ? overloadParams.get(overloadKey) ?? 0 : 0);
    const amdExempt = isAmdFactoryCallback(node);
    const parameterPropertyExempt = node.params.some((param) => param.type === 'TSParameterProperty')
      && ordinaryParams <= MAX_PARAMETERS;
    return {
      node,
      anchor,
      kind: node.type,
      idLabel: functionBaseLabel(node, sourceCode),
      label: functionLabel(node, sourceCode),
      range: [start, node.range[1]],
      startLine: sourceCode.getLocFromIndex(start).line,
      endLine: node.loc.end.line,
      params: maxParams,
      paramsSuppressed: amdExempt || parameterPropertyExempt
        || sourceCode.getAllComments().some((comment) => comment.loc.start.line === anchor.start.line
          && /\bNOSONAR\b/i.test(comment.value)),
    };
  });
  const reports = messages.filter((message) => RULES[message.ruleId]).map((message) => ({
    message,
    ...reportRange(message, sourceCode),
  }));
  // Sonar S1186 checks named declarations, methods, and variable-bound functions only.
  // Its decorator exempts onXxx/noop names; anonymous callbacks are not findings.
  for (const fn of functions) {
    const parent = fn.node.parent;
    const variable = parent?.type === 'VariableDeclarator' && parent.init === fn.node ? parent : null;
    const isEmptyArrowVariable = fn.node.type === 'ArrowFunctionExpression' && variable
      && fn.node.body.type === 'BlockStatement' && fn.node.body.body.length === 0;
    if (!isEmptyArrowVariable) continue;
    const name = variable.id.type === 'Identifier' ? variable.id.name : '';
    if (/^on[A-Z]/.test(name) || /noop/i.test(name)) continue;
    const location = sourceCode.getLocFromIndex(fn.node.body.range[0]);
    const message = {
      ruleId: '@typescript-eslint/no-empty-function',
      line: location.line,
      column: location.column + 1,
      endLine: location.line,
      endColumn: location.column + 2,
      message: 'Unexpected empty function.',
    };
    reports.push({ message, ...reportRange(message, sourceCode) });
  }
  const effectiveReports = reports.filter((report) => {
    if (report.message.ruleId !== '@typescript-eslint/no-empty-function') return true;
    const owner = resolveReportOwners(report, functions)[0];
    if (!owner) return true;
    const parent = owner.node.parent;
    const applicable = owner.node.type === 'FunctionDeclaration'
      || parent?.type === 'MethodDefinition'
      || parent?.type === 'VariableDeclarator' && parent.init === owner.node;
    return applicable && !/^on[A-Z]/.test(owner.idLabel) && !/noop/i.test(owner.idLabel);
  });
  return { sourceCode, functions, reports: effectiveReports, language };
}

function isAmdFactoryCallback(node) {
  const call = node.parent;
  if (call?.type !== 'CallExpression') return false;
  const callee = call.callee;
  const amdCall = (callee.type === 'Identifier' && ['define', 'require'].includes(callee.name))
    || (callee.type === 'MemberExpression' && callee.property.type === 'Identifier'
      && ['define', 'require'].includes(callee.property.name)
      && callee.object.type === 'MemberExpression' && callee.object.object.type === 'Identifier'
      && callee.object.object.name === 'sap' && callee.object.property.type === 'Identifier'
      && callee.object.property.name === 'ui');
  if (!amdCall) return false;
  const index = call.arguments.indexOf(node);
  const dependencies = index > 0 ? call.arguments[index - 1] : null;
  return dependencies?.type === 'ArrayExpression' && node.params.length <= dependencies.elements.length;
}

const sameAnchorStart = (fn, message) => fn.anchor.start.line === message.line
  && fn.anchor.start.column === message.column - 1;

// All functions that own `report`: anchor rules by exact anchor start, other rules by the innermost function.
export function resolveReportOwners(report, functions) {
  if (RULES[report.message.ruleId].owner === 'anchor') {
    return functions.filter((fn) => sameAnchorStart(fn, report.message));
  }
  const containing = functions.filter((fn) => fn.range[0] <= report.start && report.start < fn.range[1]);
  if (containing.length === 0) return [];
  const narrowest = Math.min(...containing.map((fn) => fn.range[1] - fn.range[0]));
  return containing.filter((fn) => fn.range[1] - fn.range[0] === narrowest);
}

function emptyMetrics(fn) {
  return { fn, complexity: 0, suppressed: false, params: fn.params, findings: new Map() };
}

function isNeverReadLocalDeclaration(report, sourceCode) {
  for (const scope of sourceCode.scopeManager.scopes) {
    const reference = scope.references.find((item) => item.identifier.range[0] === report.start);
    if (!reference || reference.identifier.parent?.type !== 'VariableDeclarator'
      || reference.identifier.parent.id !== reference.identifier) continue;
    return !reference.resolved?.references.some((item) => item.isRead());
  }
  return false;
}

// Metrics of `targets` only. A report inside a target must map to exactly one function, else fail closed.
export function collectMetrics(analysis, targets, filename = '<file>') {
  const result = new Map(targets.map((fn) => [fn, emptyMetrics(fn)]));
  for (const report of analysis.reports) {
    const { message } = report;
    if (!targets.some((fn) => fn.range[0] <= report.start && report.start < fn.range[1])) continue;
    const owners = resolveReportOwners(report, analysis.functions);
    if (owners.length !== 1) {
      const kind = owners.length === 0 ? 'zero-owner' : 'multi-owner';
      throw new CheckError(`${filename}:${message.line}:${message.column} ${kind} report for ${message.ruleId}`);
    }
    const metrics = result.get(owners[0]);
    if (!metrics) continue;
    if (message.ruleId === COGNITIVE_RULE) {
      const match = /from (\d+) to/.exec(message.message);
      if (!match) throw new CheckError(`${filename}:${message.line}: cannot read cognitive complexity from ESLint`);
      metrics.complexity = Number(match[1]);
      metrics.suppressed = isNoSonar(message, analysis.sourceCode);
    } else if (!isNoSonar(message, analysis.sourceCode)
      && !(analysis.language === 'ts' && message.ruleId === 'sonarjs/no-dead-store'
        && isNeverReadLocalDeclaration(report, analysis.sourceCode))) {
      const key = RULES[message.ruleId].key;
      const findings = metrics.findings.get(key) ?? [];
      findings.push({
        line: message.line,
        column: message.column,
        lineText: analysis.sourceCode.lines[message.line - 1] ?? '',
        start: report.start,
        end: report.end,
      });
      metrics.findings.set(key, findings);
    }
  }
  return result;
}

// Complexity of every function of a file (used by the Sonar conformance test).
export function fileComplexities(code, filename) {
  const analysis = analyzeFile(code, filename);
  const metrics = collectMetrics(analysis, analysis.functions, filename);
  return analysis.functions.map((fn) => ({ line: fn.anchor.start.line, label: fn.label, complexity: metrics.get(fn).complexity }));
}

// ---- diff mapping ----

export function parseDiff(text) {
  const files = [];
  let current = null;
  const decodePath = (value) => {
    if (!value.startsWith('"')) return value.replace(/\t.*$/, '');
    const end = value.lastIndexOf('"');
    if (end <= 0) throw new CheckError(`cannot parse quoted git path: ${value}`);
    const encoded = value.slice(1, end);
    const bytes = [];
    const escapes = { a: 7, b: 8, t: 9, n: 10, v: 11, f: 12, r: 13, '\\': 92, '"': 34 };
    for (let index = 0; index < encoded.length;) {
      if (encoded[index] !== '\\') {
        const point = encoded.codePointAt(index);
        bytes.push(...Buffer.from(String.fromCodePoint(point), 'utf8'));
        index += point > 0xffff ? 2 : 1;
        continue;
      }
      index += 1;
      if (/[0-7]/.test(encoded[index] ?? '')) {
        const digits = /^[0-7]{1,3}/.exec(encoded.slice(index))?.[0];
        if (!digits) throw new CheckError(`cannot parse quoted git path: ${value}`);
        bytes.push(Number.parseInt(digits, 8));
        index += digits.length;
      } else {
        const escaped = encoded[index++];
        if (!(escaped in escapes)) throw new CheckError(`cannot parse quoted git path: ${value}`);
        bytes.push(escapes[escaped]);
      }
    }
    return Buffer.from(bytes).toString('utf8');
  };
  const stripPath = (value, prefix) => {
    const raw = decodePath(value);
    return raw === '/dev/null' ? null : raw.startsWith(prefix) ? raw.slice(prefix.length) : raw;
  };
  for (const line of text.split('\n')) {
    if (line.startsWith('diff --git ')) {
      current = { oldPath: null, newPath: null, hunks: [] };
      files.push(current);
    } else if (!current) {
      continue;
    } else if (line.startsWith('--- ')) {
      current.oldPath = stripPath(line.slice(4), 'a/');
    } else if (line.startsWith('+++ ')) {
      current.newPath = stripPath(line.slice(4), 'b/');
    } else if (line.startsWith('@@ ')) {
      const match = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/.exec(line);
      if (!match) throw new CheckError(`cannot parse hunk header: ${line}`);
      current.hunks.push({
        oldStart: Number(match[1]),
        oldCount: match[2] === undefined ? 1 : Number(match[2]),
        newStart: Number(match[3]),
        newCount: match[4] === undefined ? 1 : Number(match[4]),
      });
    }
  }
  return files.filter((file) => file.newPath);
}

const hunkNewEnd = (hunk) => (hunk.newCount > 0 ? hunk.newStart + hunk.newCount - 1 : hunk.newStart);

function touchedBy(fn, hunks) {
  return hunks.some((hunk) => hunk.newCount > 0 && hunk.newStart <= fn.endLine && hunkNewEnd(hunk) >= fn.startLine);
}

function mapToBaseLine(line, hunks) {
  let offset = 0;
  for (const hunk of hunks) if (hunkNewEnd(hunk) < line) offset += hunk.oldCount - hunk.newCount;
  return line + offset;
}

// Base partner of a touched head function, or null (NEW). See spec "Function identity for the ratchet".
export function findPartner(fn, baseFunctions, hunks) {
  const line = fn.anchor.start.line;
  const hunk = hunks.find((item) => item.newCount > 0 && item.newStart <= line && line <= hunkNewEnd(item));
  if (!hunk) {
    const mapped = mapToBaseLine(line, hunks);
    const same = baseFunctions.filter((base) => base.anchor.start.line === mapped
      && base.kind === fn.kind && base.idLabel === fn.idLabel);
    const sameAnchor = same.filter((base) => base.anchor.start.column === fn.anchor.start.column);
    if (sameAnchor.length === 1) return sameAnchor[0];
    return same.length === 1 ? same[0] : null;
  }
  const removedEnd = hunk.oldStart + hunk.oldCount - 1;
  const candidates = baseFunctions.filter((base) => hunk.oldCount > 0
    && base.anchor.start.line >= hunk.oldStart && base.anchor.start.line <= removedEnd);
  const sameAnchor = candidates.filter((base) => base.kind === fn.kind && base.idLabel === fn.idLabel
    && base.anchor.start.column === fn.anchor.start.column);
  if (sameAnchor.length === 1) return sameAnchor[0];
  const sameLabel = candidates.filter((base) => base.kind === fn.kind && base.idLabel === fn.idLabel);
  if (sameLabel.length === 1) return sameLabel[0];
  return sameLabel.length === 0 && candidates.length === 1 ? candidates[0] : null;
}

// ---- ratchet ----

function compareFunction(head, base, hunks) {
  const out = [];
  const baseGoverns = base && !base.suppressed;
  if (!head.suppressed) {
    if (baseGoverns ? head.complexity > base.complexity : head.complexity > COMPLEXITY_THRESHOLD) {
      out.push(['S3776', baseGoverns ? base.complexity : 0, head.complexity]);
    }
  }
  const baseHasParamsFinding = base && !base.fn.paramsSuppressed;
  if (!head.fn.paramsSuppressed && (baseHasParamsFinding
    ? head.params > base.params : head.params > MAX_PARAMETERS)) {
    out.push(['S107', baseHasParamsFinding ? base.params : 0, head.params]);
  }
  for (const [key, findings] of head.findings) {
    const baseline = base?.findings.get(key) ?? [];
    const unmatched = [...baseline];
    const added = [];
    for (const finding of findings) {
      const baseLine = base && mapFindingLine(finding.line, hunks);
      const match = base && baseLine !== null
        ? unmatched.findIndex((candidate) => candidate.line === baseLine
          && candidate.column === mapFindingColumn(finding, candidate))
        : -1;
      if (match >= 0) unmatched.splice(match, 1);
      else added.push(finding);
    }
    if (added.length) out.push([key, baseline.length, findings.length]);
  }
  return out;
}

function mapFindingLine(line, hunks) {
  const hunk = hunks.find((item) => item.newCount > 0 && item.newStart <= line && line <= hunkNewEnd(item));
  if (!hunk) return mapToBaseLine(line, hunks);
  if (hunk.oldCount === 0) return null;
  const offset = line - hunk.newStart;
  return hunk.oldStart + Math.min(offset, hunk.oldCount - 1);
}

function mapFindingColumn(headFinding, baseFinding) {
  const head = headFinding.lineText;
  const base = baseFinding.lineText;
  let prefix = 0;
  while (prefix < head.length && prefix < base.length && head[prefix] === base[prefix]) prefix += 1;
  let suffix = 0;
  while (suffix < head.length - prefix && suffix < base.length - prefix
    && head[head.length - suffix - 1] === base[base.length - suffix - 1]) suffix += 1;
  const headColumn = headFinding.column - 1;
  if (headColumn <= prefix) return headColumn + 1;
  if (headColumn >= head.length - suffix) return base.length - (head.length - headColumn) + 1;
  const relative = headColumn - prefix;
  return prefix + Math.min(relative, base.length - prefix - suffix) + 1;
}

function checkFile({ filename, headSource, baseSource, hunks }) {
  const head = analyzeFile(headSource, filename);
  const touched = head.functions.filter((fn) => touchedBy(fn, hunks));
  if (touched.length === 0) return [];
  let base = null;
  if (baseSource !== null) {
    try {
      base = analyzeFile(baseSource, filename);
    } catch (error) {
      if (!(error instanceof CheckError)) throw error;
    }
  }
  const partners = new Map(touched.map((fn) => [fn, base ? findPartner(fn, base.functions, hunks) : null]));
  const headMetrics = collectMetrics(head, touched, filename);
  const baseTargets = [...partners.values()].filter(Boolean);
  const baseMetrics = base ? collectMetrics(base, baseTargets, filename) : new Map();
  const findings = [];
  for (const fn of touched) {
    const partner = partners.get(fn);
    const rows = compareFunction(headMetrics.get(fn), partner ? baseMetrics.get(partner) : null, hunks);
    for (const [rule, oldValue, newValue] of rows) {
      findings.push({ filename, line: fn.anchor.start.line, label: fn.label, rule, detail: `${oldValue}->${newValue}` });
    }
  }
  return findings;
}

export function checkDiff({ repo: repoPath = '.', base, head = 'HEAD' }) {
  if (!base) throw new CheckError(USAGE);
  const repo = path.resolve(repoPath);
  const mergeBase = git(repo, ['merge-base', base, head]).trim();
  if (!mergeBase) throw new CheckError(`no merge-base between ${base} and ${head}`);
  const scope = readScope(repo, head);
  const diff = git(repo, ['-c', 'core.quotepath=false', 'diff', '-U0', '-M', '--no-color', '--diff-filter=AMR',
    mergeBase, head, '--', SOURCE_PREFIX.slice(0, -1)]);
  const files = parseDiff(diff).filter((file) => file.hunks.length > 0 && isMainCodePath(file.newPath, scope));
  const ignored = ignoredPaths(repo, files.map((file) => file.newPath));
  const findings = [];
  for (const file of files.filter((item) => !ignored.has(item.newPath))) {
    const headSource = readSourceAt(repo, head, file.newPath);
    if (headSource === null) continue;
    const baseSource = file.oldPath === null ? null : readSourceAt(repo, mergeBase, file.oldPath);
    findings.push(...checkFile({ filename: file.newPath, headSource, baseSource, hunks: file.hunks }));
  }
  return findings.sort((a, b) => a.filename.localeCompare(b.filename)
    || a.line - b.line || a.label.localeCompare(b.label) || a.rule.localeCompare(b.rule));
}

const USAGE = 'usage: changed-functions-check.mjs --base <rev> [--head <rev>] [--repo <path>]';

function parseArgs(argv) {
  const options = { repo: '.', head: 'HEAD', base: null, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const option = argv[index];
    if (option === '--help' || option === '-h') {
      options.help = true;
      continue;
    }
    if (!['--base', '--head', '--repo'].includes(option) || !argv[index + 1] || argv[index + 1].startsWith('--')) {
      throw new CheckError(USAGE);
    }
    options[option.slice(2)] = argv[index + 1];
    index += 1;
  }
  return options;
}

export function main(argv = process.argv.slice(2)) {
  try {
    const options = parseArgs(argv);
    if (options.help) {
      console.log(`Usage: node scripts/quality/changed-functions-check.mjs --base <rev> [--head <rev>] [--repo <path>]`);
      return 0;
    }
    const findings = checkDiff(options);
    for (const finding of findings) {
      console.log(`${finding.filename}:${finding.line} ${finding.label} ${finding.rule} ${finding.detail}`);
    }
    return findings.length ? 1 : 0;
  } catch (error) {
    console.error(`changed-functions-check: ${error.message}`);
    return 2;
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === pathToFileURL(currentFile).href) {
  process.exitCode = main();
}
