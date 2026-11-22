# Changed-functions quality check (P0b, oig-cloud step)

Status: ACCEPTED. Parent design: agent-ops
`docs/superpowers/specs/2026-11-21-code-quality-prevention-design.md` (operator decisions 2026-11-20/21).

- Local SonarQube (`local:oig-cloud`) stays non-blocking: measurement and burn-down backlog only.
- A fast local check that mirrors active Sonar rules BLOCKS a PR, but only for functions the PR adds
  or modifies. Untouched functions are never checked.
- Semantics = ratchet (operator form 2026-11-21): a NEW function must pass every rule; a MODIFIED
  function must not get worse (complexity and parameter count may not rise above the merge-base value,
  no new finding of the other rules inside it).
- Thresholds equal Sonar's (profile "Sonar agentic AI"), never stricter.
- File scope for both languages comes from `.sonar/local.properties`: the check sees exactly the files
  Sonar analyzes as main code.

Python (`custom_components`, `scripts`):

- Q1 python:S3776 cognitive complexity <= 15; Q2 python:S3358 nested conditional expression;
  Q3 python:S107 parameters <= 13; Q4 python:S1172 / S1481 / S1854 unused parameter, local, dead store.
- Tool: `scripts/quality/changed-functions-check`, a vendored copy of the agent-ops tool (Python
  standard library only).

TypeScript / JavaScript (`custom_components/oig_cloud/www_v2`):

- Q1 S3776 `sonarjs/cognitive-complexity` 15; Q2 S3358 `sonarjs/no-nested-conditional`;
  Q3 S107 max 7 parameters; Q4 unused variables; Q5 S1871 / S4144 / S1186 duplicated branch,
  identical function, empty function.
- Tool: `custom_components/oig_cloud/www_v2/scripts/quality/changed-functions-check.mjs`, ESLint with
  `eslint-plugin-sonarjs`, reports mapped to functions, ratchet against the merge-base.

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

Acceptance: `changed-functions-check.mjs --base <rev>` checks every added or modified TS/JS function
in www_v2 main code against the merge-base with ratchet semantics (Q1-Q5); every ESLint report maps to
exactly one function or the tool fails closed (exit 2); exit codes as REQ 1; its S3776 values equal the
SonarQube values at the P0 baseline for every flagged TS/JS function (committed fixture).

```fleet-req
id: 2026-11-22-oig-cloud-changed-functions-check-REQ-3
priority: P1
acceptance:
  ### integration
  - name: ts-deps
    cmd: npm --prefix custom_components/oig_cloud/www_v2 ci --ignore-scripts --no-audit --no-fund
    expect: 0
  - name: ts-tool-tests
    cmd: pnpm -C custom_components/oig_cloud/www_v2 vitest run tests/unit/quality
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
