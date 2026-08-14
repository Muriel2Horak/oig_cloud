# Quality gates and immutable HP release implementation plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make every required PR check real and blocking, raise Python/frontend coverage above 80%, and deploy only a checksum-verified reviewed artifact to HP with deterministic rollback.

**Architecture:** Repair baseline code instead of suppressing findings. GitHub Actions runs the same repository scripts developers run locally. PR CI builds one deterministic runtime-allowlist archive with commit metadata, SHA-256, and provenance attestation. Deployment consumes a verified staged release and atomically switches a host symlink; it never rebuilds source on the HP path.

**Tech Stack:** GitHub Actions, pytest/coverage, Flake8, Mypy, Pylint, pre-commit, Vitest/V8, ESLint, TypeScript, Playwright, CodeQL, Bandit, pip-audit/Safety, npm audit, Trivy, Gitleaks, Bash, tar/SHA-256.

---

## Measured starting point

- Flake8: 10 failures.
- Mypy: 32 errors in 9 files under the canonical command.
- ESLint: 2 errors and 586 `no-explicit-any` warnings; the required error-level lint command exits 1.
- Frontend unit: 1,871 pass under `TZ=UTC`; statements/lines `32,967/45,025 = 73.21%`.
- Frontend lift required at current denominator: at least 3,058 newly covered lines before the `80.01%` gate; behavior changes alter the final denominator.
- Python full suite: inherited optional-AI import failure blocks a complete coverage report.
- Pylint: malformed disable syntax plus approximately 2,000 reported messages; current workflow discards its exit status.
- Root `npm test`: echo-only no-op.
- `MNP`: no repository tool exists; treat the operator requirement as the v2 `npm` lint/typecheck/unit/build/E2E gates.

### Task 1: Remove deterministic baseline blockers

**Files:**

- Modify: `custom_components/oig_cloud/ai/backends.py`
- Modify: `custom_components/oig_cloud/ai_eval/detector.py`
- Modify: `custom_components/oig_cloud/ai_eval/ledger.py`
- Modify: `custom_components/oig_cloud/sensors/SENSOR_TYPES_AI_EVAL.py`
- Modify: `custom_components/oig_cloud/ai_eval/coordinator.py`
- Modify: `custom_components/oig_cloud/lib/oig_cloud_client/api/oig_cloud_api.py`
- Modify: `custom_components/oig_cloud/config/solar_key_store.py`
- Modify: `custom_components/oig_cloud/api/planning_api.py`
- Modify: `custom_components/oig_cloud/battery_forecast/planning/forecast_update.py`
- Modify: `custom_components/oig_cloud/services/__init__.py`
- Modify: `custom_components/oig_cloud/config/steps.py`
- Modify: `custom_components/oig_cloud/battery_forecast/sensors/ha_sensor.py`
- Modify: `custom_components/oig_cloud/api/ha_rest_api.py`
- Modify: `custom_components/oig_cloud/www_v2/src/__tests__/onboarding-quicksave.test.ts`
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/settings/index.ts`
- Modify source/test for `tests/test_ai_optional.py::test_integration_imports_without_ai_task`
- Modify: `requirements.in`, `requirements.txt`, and `requirements-dev.txt`

- [ ] Fix the ten exact Flake8 findings: unused `last_code`, detector/ledger spacing, and unused AI-eval sensor imports. Run the canonical Flake8 command; expect zero.
- [ ] Fix four branch-added AI-eval Mypy errors with `typing.Callable`, an explicit Store annotation, and a callable optional unsubscribe type.
- [ ] Fix all remaining Mypy errors with narrowing/annotations at the measured sites; do not add blanket ignores, `Any`, or `# type: ignore` unless a third-party boundary has a line-specific justification and test.
- [ ] Fix the two ESLint errors using `const` and `as const`; run `npm run lint -- --quiet`; expect zero errors.
- [ ] Fix optional AI platform discovery so blocked `ai_task` import does not leave `PLATFORMS` inconsistent; add a regression test for missing enum member and missing module.
- [ ] Align runtime/dev Home Assistant pins to the HP target `2026.8.1` from one canonical input and regenerate both lockfiles; add a CI assertion that the three declared HA versions cannot drift.
- [ ] Run full Mypy, Flake8, focused optional-AI test, frontend lint/typecheck; expect all green.
- [ ] Commit this mechanical prerequisite separately: `chore: clear branch quality blockers`.

### Task 2: Make Pylint and pre-commit enforceable

**Files:**

- Modify: `.pylintrc`
- Add: `.pre-commit-config.yaml`
- Modify: `.github/workflows/pre-commit.yml`
- Modify production files reported as Pylint error/fatal or required to reach the score gate

- [ ] Remove invalid leading hyphens from the existing intended Pylint disable list; do not add new disabled rules for this branch.
- [ ] Set Pylint score gate to at least `9.50/10` and fail on every `E`/`F`. Record the machine-readable report as an artifact while preserving the command exit code.
- [ ] Fix every Pylint `E`/`F`, including current unsubscriptable/not-callable/no-value defects, and enough real warnings to exceed 9.50. Replace raw broad catches and credential-bearing/error-body logs in changed auth/solar paths, not with disable comments.
- [ ] Add pre-commit hooks for whitespace/EOF/JSON/YAML, Flake8, Mypy, v2 ESLint error-level lint, and v2 typecheck. Use pinned hook revisions and exact repository commands.
- [ ] Update pre-commit CI to install Python plus `www_v2` lockfile dependencies and remove the swallowed failure.
- [ ] Run `pre-commit run --all-files --show-diff-on-failure` twice; second run must be clean and idempotent.

### Task 3: Raise frontend coverage above 80.01% with behavior tests

**Files:**

- Modify: `custom_components/oig_cloud/www_v2/vitest.config.ts`
- Add focused tests under `custom_components/oig_cloud/www_v2/src/__tests__/` or colocated component test paths for:
  - `src/main.ts` and `src/core/bootstrap.ts`
  - `src/ui/features/timeline/dialog.ts`
  - `src/ui/features/tiles/tile-dialog.ts`, `tile.ts`, and `icon-picker.ts`
  - `src/ui/features/flow/canvas.ts`, `connection.ts`, and `grid-charging-dialog.ts`
  - `src/ui/features/analytics/blocks.ts`
  - `src/ui/components/chart.ts`, `header.ts`, `status-badge.ts`, and `theme-provider.ts`
  - `src/ui/features/control-panel/dialog.ts`
- Modify additional production-focused tests introduced by the auth/provider plans

- [ ] Configure coverage to include executable `src/**/*.ts`, exclude tests/generated/type-only declarations, and gate statements plus lines at `80.01`. Do not exclude low-coverage production components.
- [ ] Remove the unused 150-line `src/data/api.ts` under the auth plan; deletion must be proven by call-site search, not coverage motivation.
- [ ] Add interaction/state/error/cleanup tests for the listed zero-coverage production groups. Test observable behavior rather than importing modules only.
- [ ] Prioritize timeline, tiles, flow, and analytics; together they contain enough executable lines to close the current 3,058-line deficit.
- [ ] Re-run coverage after each group. Final report must show statements and lines at least `80.01%`; branches/functions remain reported.
- [ ] Add a changed-file coverage script using V8 JSON and merge-base diff; require 100% line/branch coverage for new or modified pure auth/provider/scheduler behavior modules, with no blanket exclusions.

### Task 4: Establish and exceed Python coverage

**Files:**

- Modify: `.coveragerc`
- Modify: `.github/workflows/test.yml`
- Add tests for uncovered production paths reported after the optional-AI blocker is fixed
- Modify tests introduced by auth/provider/scheduler plans

- [ ] Set coverage precision to two decimals and `fail_under = 80.01`.
- [ ] Run the complete suite once without `--cov-fail-under` after the inherited test is fixed; save JSON and rank uncovered production files.
- [ ] Add behavior tests for the ranked modules plus every new auth/provider/scheduler branch. Do not omit production packages or use `pragma: no cover` for reachable behavior.
- [ ] Add `diff-cover coverage.xml --fail-under=100` for changed Python lines.
- [ ] Run `pytest --cov=custom_components/oig_cloud --cov-report=xml --cov-report=term-missing --cov-fail-under=80.01`; require full pass and coverage at least 80.01%.

### Task 5: Turn CI commands into blocking PR checks

**Files:**

- Modify: `.github/workflows/quality.yml`
- Modify: `.github/workflows/test.yml`
- Modify: `.github/workflows/pre-commit.yml`
- Modify: `.github/workflows/build-frontend.yml`
- Modify: root `package.json` only if retaining a non-no-op dispatcher is useful

- [ ] Python lint job: install `requirements-dev.txt`; run Flake8 and Pylint without `|| true`; upload reports under `if: always()` without masking exit.
- [ ] Mypy job: use the canonical local command and preserve exit status.
- [ ] Frontend job: set working directory to `custom_components/oig_cloud/www_v2`; run `npm ci`, lint, typecheck, `TZ=UTC` unit coverage, build, Chromium install, and the self-contained auth/solar Playwright specs.
- [ ] Python test job: enforce 80.01% and upload XML even on failure.
- [ ] Build frontend on pull requests and upload dist; remove the post-merge bot-commit dependency from release correctness. If tracked dist remains policy, verify PR-built dist rather than creating new unreviewed bytes after merge.
- [ ] Delete or replace the root echo-only `npm test`; no workflow may call a no-op gate.
- [ ] Validate workflows with actionlint and local commands.

### Task 6: Make security and OWASP-relevant checks blocking

**Files:**

- Modify: `.github/workflows/security.yml`
- Modify: `.github/workflows/secret-scanning.yml`
- Modify: `requirements-dev.txt`
- Modify dependency lockfiles only to remediate verified vulnerabilities

- [ ] Remove swallowed Bandit/Safety/Trivy/Snyk failures. Pin third-party actions to stable release tags or commit SHAs; avoid `master`.
- [ ] Build and checksum a complete Ubuntu 24.04 / Python 3.14 wheelhouse or hash-locked no-build-isolation toolchain before claiming hermetic pip installation. Task 1 target probing found `bluetooth-data-tools==1.29.21` has no usable glibc 2.39 wheel; its sdist requires `setuptools>=77.0`, `Cython`, and `poetry-core>=2.0.0`. Validate with an actual Ubuntu runner and prove no build dependency is fetched outside the locked set.
- [ ] Gate CodeQL, Bandit, pip-audit or Safety, both root/v2 `npm audit --audit-level=high`, Trivy HIGH/CRITICAL, and Gitleaks.
- [ ] Treat missing optional Snyk credentials as non-authoritative; open-source blocking scans must always run. If Snyk is a required repository check, require its token and fail when absent instead of silently skipping.
- [ ] Add/retain OWASP-relevant regression tests for authorization, SSRF/path confinement, credential redaction, unsafe replay, input validation, and secret persistence.
- [ ] Remediate actionable findings through dependency/source changes. Any unavoidable false positive requires a narrow documented rule ID, evidence, owner, and expiry; no broad scanner suppression.
- [ ] Before PR ready state, run the repository security-diff review and attach its findings/resolution to the PR.

### Task 7: Build a deterministic reviewed release artifact

**Files:**

- Add: `scripts/build_release_artifact.py`
- Add: `tests/test_release_artifact.py`
- Add: `.github/workflows/release-artifact.yml`
- Modify: `custom_components/oig_cloud/www_v2/vite.config.ts`
- Add: exact Node-version/toolchain declaration consumed by local and CI builds

- [ ] RED tests: deterministic archive for identical tree/SHA; manifest lists commit and every file SHA-256; paths remain under `custom_components/oig_cloud`; raw frontend source/tests/Playwright/node_modules/coverage/secrets are absent; runtime Python modules, manifest, strings/translations/data, full deterministic `www_v2/dist` maps, and gzip assets are present and current.
- [ ] PR workflow checks out exact `github.event.pull_request.head.sha`, asserts clean checkout and `git rev-parse HEAD` equality, and never derives release identity from the synthetic merge ref.
- [ ] Build v2 with `npm ci && npm run build`, regenerate deterministic `.gz` siblings, and package only the explicit reviewed runtime allowlist defined above.
- [ ] Compare a clean reviewed-source build with tracked served `www_v2/dist` bytes and fail on stale `index.js`/source maps or any legacy manual-token dispatch.
- [ ] Replace Vite `Date.now()` with the auth plan's deterministic `src/**` plus `public/**` input SHA-256 cache-bust ID. Build twice in isolated paths and compare every served dist byte/map; mutate one executable/public input and assert the ID/index reference changes. Test absent/exact/empty/malformed/mismatched `OIG_BUILD_ID` fail/accept behavior.
- [ ] Pin release builds to `ubuntu-24.04`, Node `22.17.0`, npm `10.9.2`, and Python `3.14.3`; use `TZ=UTC`, locale `C`, and umask `022`. CI/local release scripts reject toolchain drift and record versions in the manifest.
- [ ] Run install/build with explicit Vite production mode, clean temporary HOME, and a fail-closed environment allowlist. Reject `.env*`, project/user/global `.npmrc`, `VITE_*`, `NODE_OPTIONS`, and unapproved `NPM_CONFIG_*`; create and verify distinct empty private user/global npmrc paths; tests inject each source and prove no unchanged build ID can accompany changed bytes.
- [ ] Derive `SOURCE_DATE_EPOCH` only from `git show -s --format=%ct <PR-head-sha>`. Create sorted canonical tar entries with fixed uid/gid/names/modes/mtime and deterministic gzip with empty filename plus fixed mtime/header. RED: wall-clock, temp path, locale, umask, and input enumeration order changes do not alter archive bytes.
- [ ] Write `release-manifest.json` with schema, Git SHA, build timestamp from `SOURCE_DATE_EPOCH`, Node/Python versions, and per-file digests. Write a sibling archive SHA-256 file.
- [ ] Derive checkout ref, PR-head SHA, archive `oig-cloud-<full-sha>`, manifest commit, attested subject, digest metadata, and deploy expected commit from one immutable SHA variable; assert exact equality at every handoff.
- [ ] PR workflow runs after required build/tests, uploads archive/manifest/digest, creates GitHub build-provenance attestation for the digest, and never commits generated bytes.
- [ ] Pin the GitHub CLI/attestation verifier. Verify issuer `https://token.actions.githubusercontent.com`, exact repository and `release-artifact.yml` signer workflow identity, PR-head source ref/digest, archive subject SHA-256, manifest full SHA, and archive name before staging. Add forged bundle plus wrong issuer/repository/workflow/ref/subject fixtures.
- [ ] Restrict `workflow_dispatch` to a SHA proven through the GitHub API to be the head of an approved PR with every required check green and a recorded matching artifact/attestation. Block first HP rollout when no verified previous reviewed artifact exists.
- [ ] Rebuild twice and byte-compare archive/digest.

### Task 8: Convert deployment to verified artifact input and rollback

**Files:**

- Modify: `deploy_to_ha.sh`
- Add: `tests/test_deploy_to_ha.py`
- Modify: `.gitignore` for local release-cache/history paths if needed

- [ ] RED tests: missing artifact/digest/attestation, mismatch, manifest-SHA mismatch, traversal, unexpected file, corrupt gzip, and local-source invocation fail before mount/copy/restart.
- [ ] Reject every archive member except regular file/directory before extraction: absolute/traversal path, duplicate normalized path, symlink, hard link, device, FIFO, socket, sparse/special member, or unsafe link target fails closed.
- [ ] RED dry-run success: verified archive extracts to a fresh temporary directory, file actions derive only from manifest, and no npm/npx/vite command runs.
- [ ] Require `--artifact`, `--sha256`, and expected `--commit`; remove automatic worktree build from deploy path.
- [ ] Validate attestation and every member before extraction; verify every extracted file digest and no extras.
- [ ] Stage to `/config/custom_components/.oig_cloud_releases/<full-sha>/`, verify in place, and retain current plus previous reviewed releases. Copy/extract failure must not alter the active target.
- [ ] Immediately before every activation or rollback, re-verify the selected retained archive attestation/digest and every staged file against its manifest while holding the deploy lock. Never trust a prior verification result.
- [ ] Deploy and rollback acquire non-blocking host-local `flock` at `/config/custom_components/.oig_cloud_deploy.lock` before reading active state and hold it through staging/retention, activation, restart/health, manifest update, and compensation. Snapshot symlink target plus manifest generation and compare-and-swap before activation; concurrent runner fails without mutation.
- [ ] Activate by creating a same-directory temporary symlink and `mv -Tf` replacing `/config/custom_components/oig_cloud` after staging. Restart and health-check exact active commit/digest. On failure use the same atomic swap to previous, restart, and verify previous health.
- [ ] Write the remote manifest to a same-directory temporary file, flush/fsync it, and atomically rename only after health. Include monotonic generation, current/previous commit/digest/release target, and transaction ID; compensation restores prior symlink and manifest generation.
- [ ] First legacy-directory migration requires verified current and previous artifacts plus stopped HA. Under the same lock, atomically journal phases, rename legacy directory to a retained backup, install/rename a temporary symlink to previous, start/health-check previous, then activate current normally. On interruption recover the journal to either the original directory or verified previous symlink before starting HA.
- [ ] Test crash points before/after legacy rename, symlink install, each manifest rename, restart, and health; test two interleaved deploy/rollback processes. Every failure leaves or restores exact prior manifest/symlink/commit/digest, no mixed tree, and a recoverable retained backup.
- [ ] RED retained-target tamper: modify one staged previous-release file, substitute its archive, digest, or attestation immediately before rollback, and require failure before symlink, deployment manifest, restart, or health-call mutation.

### Task 9: Final gate matrix and HP observation

**Files:** all plans and workflow/release files

- [ ] Run Flake8, Mypy, Pylint >=9.50 with no E/F, pre-commit, full Python unit/E2E at >=80.01%, frontend lint/typecheck/unit at >=80.01%/build/Playwright, CodeQL-equivalent local checks where possible, Bandit, dependency audits, Trivy, Gitleaks, and `git diff --check`.
- [ ] Open a draft PR; wait for every blocking check and critic/security review. Do not deploy a locally built tree.
- [ ] Download PR-head artifact and its previous reviewed artifact; verify both digests locally.
- [ ] Verify PR-head checkout SHA, artifact name, manifest SHA, digest, attestation subject, and deploy expected commit are identical; reject a synthetic merge SHA.
- [ ] Run release integration in a temporary filesystem and then HP: deploy reviewed `N`, deploy reviewed `N+1`, rollback `N`; verify active manifest/digest/commit and Home Assistant health after every activation.
- [ ] Deploy PR-head artifact to HP through dry-run then verified atomic activation. Retain the printed rollback command.
- [ ] Observe for at least 48 hours, two scheduled occurrences, and one natural HA token refresh. Apply the pass/rollback thresholds from the design.
- [ ] Mark PR ready only after HP observation and every gate remains green.
- [ ] Commit quality/CI/artifact work in reviewable units, ending with `ci: enforce reviewed release gates`.
