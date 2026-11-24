# Changed-functions quality check (P0b, oig-cloud step)

Status: ACCEPTED. Parent design: agent-ops
`docs/superpowers/specs/2026-11-21-code-quality-prevention-design.md` (operator decisions 2026-11-20/21).

- Local SonarQube (`local:oig-cloud`) stays non-blocking: measurement and burn-down backlog only.
- A fast local check that mirrors active Sonar rules BLOCKS a PR, but only for functions the PR adds
  or modifies. Untouched functions are never checked.
- Semantics = ratchet (operator form 2026-11-21): a NEW function must pass every rule; a MODIFIED
  function must not get worse (complexity and parameter count may not rise above the merge-base value,
  and the per-function count of findings of each other rule key may not rise; a replaced finding,
  one removed and one added in the same function, passes; decided 2026-11-23).
- Thresholds equal Sonar's (profile "Sonar agentic AI"), never stricter.
- File scope for both languages comes from `.sonar/local.properties`: the check sees exactly the files
  Sonar analyzes as main code.

Python (`custom_components`, `scripts`):

- Q1 python:S3776 cognitive complexity <= 15; Q2 python:S3358 nested conditional expression;
  Q3 python:S107 parameters <= 13; Q4 python:S1172 / S1481 / S1854 unused parameter, local, dead store.
- Tool: `scripts/quality/changed-functions-check`, a vendored copy of the agent-ops tool (Python
  standard library only).

TypeScript / JavaScript (`custom_components/oig_cloud/www_v2`):

- Tool: `scripts/quality/changed-functions-check.mjs` (repo root, next to the Python tool; its
  dependencies `eslint-plugin-sonarjs` and `typescript-eslint` are root devDependencies, so the root
  `npm ci` installs everything), ESLint `Linter` API, reports mapped to functions, ratchet against the
  merge-base. Tests: root vitest, `tests/fe/unit/quality/`.
- Rule set = exactly the rules ACTIVE in the oig-cloud "Sonar agentic AI" profile per language
  (checked 2026-11-23, `api/rules/search activation=true`); a rule that is inactive in Sonar is not
  checked. Use the `eslint-plugin-sonarjs` implementation of a Sonar rule key wherever the plugin ships
  one; a generic ESLint rule only where it does not, configured with the Sonar rule's exemptions.

  | Q | Sonar key | TS | JS | parameter |
  |---|---|---|---|---|
  | Q1 | S3776 cognitive complexity | active | active | threshold 15 |
  | Q2 | S3358 nested conditional | active | active | |
  | Q3 | S107 parameters | active | active | max 7 |
  | Q4 | S1854 dead store | active | active | |
  | Q4 | S1481 unused local variable | INACTIVE | active | |
  | - | S1172 unused parameter | INACTIVE | INACTIVE | never checked |
  | Q5 | S1871 / S4144 / S1186 duplicated branch, identical function, empty function | active | active | |

  Module-level rules (e.g. S1128 unused import) are out of scope: the check is per function.

Function identity for the ratchet (design round 2, 2026-11-23). Replaces label/text identity, which
review `review-independently-review-typescript-9d2997` rejected: identical same-label callbacks
(`node.ts:1790/1794`) can never be matched by text, and one-of-N same-label callback edits failed closed.

- Touched = a head function whose line range contains an added or modified line of
  `git diff -U0 -M <merge-base> HEAD` for that file. Only touched functions are checked. Identity is
  never computed for untouched functions, so they can never fail the check, block it, or exit 2.
- Base partner of a touched function, in this order:
  1. Its first line (the line of its anchor token) is an unchanged diff line: the partner is the base
     function whose anchor sits on the mapped base line and has the same kind and label. Line shifts
     above it do not matter.
  2. Its first line is inside a hunk: the partner is the single base function of the same label whose
     anchor lies on a removed line of that same hunk; if no same-label one, the single base function
     of any label anchored there.
  3. Otherwise none: the function is NEW and must pass every rule (= Sonar's thresholds, never
     stricter). Two or more candidates in step 2 also mean NEW.
- File renames (`-M`) map to the base path, so a renamed file is not a file of new functions.
- Report ownership: a report of a function-scoped rule maps to exactly one function by its anchor
  (sonarjs `getMainFunctionTokenLocation`); zero or more than one owner for a report inside a touched
  function -> exit 2 (fail closed). Reports outside every touched function are ignored.
- Exit codes and output line as the Python tool.

<!-- fleet-spec: 2026-11-22-oig-cloud-changed-functions-check -->

### REQ 1 — Python changed-functions check for oig-cloud

Acceptance: `scripts/quality/changed-functions-check --base <rev>` checks every added or modified
Python function against the merge-base with ratchet semantics; scope from `.sonar/local.properties`;
exit 0 clean, exit 1 with one `path:line function rule old->new` line per finding, exit 2 on usage or
git error.

```fleet-req
id: 2026-11-22-oig-cloud-changed-functions-check-REQ-1
priority: P1
acceptance:
  ### integration
  - name: py-tool-tests
    cmd: python3 -m pytest -q tests/quality/test_changed_functions_check.py
    expect: 0
```

### REQ 2 — Python S3776 port matches Sonar on oig-cloud

Acceptance: the Python tool's cognitive complexity equals the value SonarQube reported for oig-cloud at
the P0 baseline (analysis `8a602342`), pinned by a committed fixture; no function Sonar flags above 15
scores 15 or less locally, and no main-code function Sonar did not flag scores above 15 locally.

```fleet-req
id: 2026-11-22-oig-cloud-changed-functions-check-REQ-2
priority: P1
acceptance:
  ### integration
  - name: py-sonar-conformance
    cmd: python3 -m pytest -q tests/quality/test_changed_functions_sonar_conformance.py
    expect: 0
```

### REQ 3 — TypeScript changed-functions check for www_v2

Acceptance: `scripts/quality/changed-functions-check.mjs --base <rev>` checks every added or modified TS/JS function
in www_v2 main code against the merge-base with ratchet semantics, the per-language active rule set and
the diff-mapped function identity above; every report inside a touched function maps to exactly one
function or the tool fails closed (exit 2); untouched functions never affect the result; exit codes as
REQ 1; its S3776 values equal the SonarQube values at the P0 baseline for every flagged TS/JS function
(committed fixture).

```fleet-req
id: 2026-11-22-oig-cloud-changed-functions-check-REQ-3
priority: P1
acceptance:
  ### integration
  - name: ts-tool-tests
    cmd: npx vitest run tests/fe/unit/quality
    expect: 0
```

### REQ 4 — Checks block in CI and are named in repo rules

Acceptance: a pull-request CI workflow (`.github/workflows/changed-functions.yml`) runs both checks against the PR base, independent of the
existing Python 3.14.3 jobs; `CLAUDE.md` names both commands so author, fix and review slices cite
their output.

```fleet-req
id: 2026-11-22-oig-cloud-changed-functions-check-REQ-4
priority: P1
acceptance:
  ### integration
  - name: ci-py-step
    cmd: grep -q 'scripts/quality/changed-functions-check' .github/workflows/changed-functions.yml
    expect: 0
  - name: ci-ts-step
    cmd: grep -q 'changed-functions-check.mjs' .github/workflows/changed-functions.yml
    expect: 0
  - name: repo-rules-name-it
    cmd: grep -q 'changed-functions-check' CLAUDE.md
    expect: 0
```
