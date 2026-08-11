# Solar scheduler recovery implementation report

## Scope

- Original scheduler base: `81405e06ad606f24c659107cca5a9da530ae9b68`.
- Critic-remediation base: `a0014f1da12e38c92b3eb56ef35db3dc631738d9`.
- Branch: `codex/wizard-v2-auth-fix`.
- Original scheduler commit: `fix: schedule solar refreshes on local wall clock`.
- Remediation commit message: `fix: harden solar refresh commit ordering`.
- Execute Tasks 1-9 from `docs/superpowers/plans/2026-08-10-solar-scheduler-recovery.md`, then close the ordering, durable retry, lifecycle, real-clock, privacy, restart, and reporting gaps found by critic review.
- Preserve approved provider/authentication contracts.
- Preserve stored azimuth bytes. No migration, modulo rewrite, or ConfigFlow version change. Stored `138` remains `138`; Forecast.Solar receives `-42` only at the provider boundary.
- No frontend source or tracked distribution file changed.
- No push, PR, deploy, HP access, or remote mutation occurred.

## Final implemented contract

- Provider fetches return classified results without mutating sensor memory, coordinator state, Home Assistant state, storage, or broadcasts.
- Every accepted runtime result is wrapped in an owned snapshot plus a frozen pre-I/O context: entry ID, provider, non-secret config fingerprint, credential revision, request identity, occurrence identity/generation, lifecycle generation, and monotonic request sequence.
- Candidate commit is ordered by one commit lock and the shared per-entry solar transaction lock. It rejects raw, duplicate, older, wrong-provider/config/revision, superseded-occurrence, or obsolete-lifecycle candidates before validation/save. The same captured context is checked again before publish.
- The ordered commit validates, performs one tracked shielded Store write with captured provenance and no retry record, then publishes memory/coordinator/HA/broadcast state exactly once. A newer committed sequence prevents an older completed provider call from overwriting it.
- Schema-2 entry-specific cache envelopes retain the exact durable artifact in memory for retry-only rewrites. Setting or clearing retry recovery preserves existing cache data and provenance, including mismatched or invalid artifacts. Legacy box-only storage remains read-only and forced stale.
- An accepted retry writes the new validated snapshot and removes retry recovery in the same Store write. There is no later unshielded retry-clear write after a successful commit.
- Daily optimized mode subscribes to HA-local `06:00`, `12:00`, and `16:00`; daily mode subscribes to `06:00`. Hourly and every-four-hour modes retain interval subscriptions. Manual and secondary sensors register none.
- Registered HA time callbacks are canonicalized to the configured local scheduled instant. Delivery seconds/microseconds do not change the occurrence ID or retry baseline; non-target hours/minutes produce no catch-up.
- Scheduled occurrence identity is restart-stable from ConfigEntry ID, mode, and scheduled local ISO instant including UTC offset. Retryable outcomes run at original occurrence `+15m` and `+45m` under one 90-second lock-wait/provider deadline and one pre-dispatch occurrence claim.
- Valid persisted retry recovery takes precedence over startup refresh. Future recovery is re-armed; overdue recovery inside the original horizon runs once; unsafe, exhausted, terminal, superseded, or provenance-mismatched recovery is cleared.
- Initial, scheduled, retry, interval, manual, and publish-side `update_entity` work is lifecycle tracked. Unload invalidates lifecycle/occurrence generations, unsubscribes schedule/retry callbacks once, cancels and awaits refresh and service tasks, reconciles shielded durable writes, and prevents post-remove publish.
- Concurrent removal calls share one teardown task and one superclass removal call.
- Provider diagnostics do not log GPS coordinates, response bodies, credential-bearing URLs, response-derived malformed timestamp/sample keys, or raw provider exception text.

## TDD evidence

### Mandatory critic RED

- Before remediation production edits, the grouped critic selection produced `25 failed, 14 passed`.
- RED groups covered: out-of-order candidate commits and immutable captured context; provider/config/credential/lifecycle/occurrence invalidation; retry/cache atomicity; tracked publish tasks and concurrent removal; real HA callbacks and canonical occurrence identity; GPS/response-key privacy; restart and service E2E.
- Negative controls and already-correct restart/service behavior supplied the 14 passing tests; every missing contract failed behaviorally rather than by syntax or collection.

### Task 1: classified results

- Original RED: missing classified result type and false-positive manual success.
- Final behavior: accepted, retryable (`timeout`, `connection`, `rate_limited`, `server_error`), and terminal outcomes carry bounded safe codes and never raw provider details.
- Compatibility remains covered by `tests/test_solar_refresh_result.py` and the canonical full suite.

### Task 2: side-effect-free providers

- Original RED: `17 failed, 1 passed` because provider paths mutated state, returned ambiguous results, or accepted malformed success payloads.
- Final focused provider/privacy selection: `20 passed`.
- Forecast.Solar and Solcast return candidates without storage/state/broadcast side effects; malformed HTTP 200, missing enabled-string data, HTTP failures, transport failures, and cancellation remain classified.

### Task 3: validated, ordered atomic commit

- Original RED covered validation, storage failure, lifecycle change, cancellation, duplicate occurrence, and manual truthfulness.
- Critic RED added B-before-A commit ordering, all captured context invalidations, and replacement of the obsolete tuple-mock revision test with a real classified candidate.
- Ordering/context GREEN: `13 passed`; cache contract GREEN: `25 passed`.
- Final commit boundary uses a frozen request context, monotonic request sequence, ordered commit lock, shared entry transaction lock, pre-save validation/context guard, one shielded durable write, and pre-publish context guard.

### Task 4: provenance, cache, and durable retry recovery

- Original RED covered schema-2 provenance, legacy rollback, forced stale behavior, and restart precedence.
- Critic RED added mismatched, legacy, and invalid artifact preservation plus same-write accepted retry clearing and restart-before-publish recovery.
- Retry/cache GREEN: `45 passed` across retry atomicity, provenance, and scheduler recovery selections.
- Retry-only writes preserve the exact durable cache envelope. Successful retry writes the accepted snapshot without `retry_state` once; restart cannot replay the cleared retry.

### Task 5: real HA-local wall-clock scheduling

- Original RED: `12 failed` before wall-clock subscriptions existed.
- Critic RED required firing the actual registered callback through Home Assistant time helpers and canonicalizing callback jitter.
- Wall-clock/scheduler GREEN: `31 passed`; the real-HA file contributes `5 passed`.
- Evidence covers setup at Prague `10:42` then local noon, no catch-up, spring/fall DST dates, duplicate/jitter delivery, daily/optimized targets, interval modes, and primary-only subscription.

### Task 6: retry, deduplication, and deadline

- Original RED: `10 failed` across timing, overlap, deduplication, deadline, and persistence faults.
- Scheduler GREEN: `14 passed`; remediation compatibility keeps the exact `+15m`/`+45m`, no-fourth-attempt, terminal, timer-failure, persistence-failure, restart, request serialization, and 90-second deadline contracts green.
- Accepted retry commit clears durable recovery in the accepted snapshot write; rejected accepted candidates clear any prior recovery without publishing.

### Task 7: complete lifecycle cancellation

- Original RED exposed surviving provider/lock tasks, abandoned durable work, missing retry unsubscribe, and non-idempotent removal.
- Critic RED added publish-side service tasks and concurrent removals.
- Lifecycle GREEN: `7 passed`.
- Every task-producing path now uses the unified refresh-task tracker; concurrent removal callers await one teardown; no `update_entity` work survives removal.

### Task 8: stale recovery integration/E2E

- Original RED: `3 failed` before the guarded initial path existed.
- Critic additions cover restart between attempts, restart after durable pre-unload save, service/manual truthfulness, and teardown task assertions.
- E2E GREEN: `7 passed`.
- Covered two-day stale recovery at the next local occurrence, transient failure through `+45m` success while retaining the old card, terminal auth failure, exact retry restart without duplicate dispatch, durable-snapshot restart publish once, and truthful service errors.

### Task 9: compatibility and complete gates

- Final scheduler/cache/provider/entity/service/E2E compatibility selection: `235 passed`.
- Core post-type-fix remediation selection: `70 passed`.
- Canonical full Python environment: CPython `3.14.3`, pytest `9.0.3`, pytest-asyncio `1.4.0`, Home Assistant `2026.8.1`, HA custom-component plugin `0.13.355`.
- Canonical full suite: `5247 passed, 29 skipped, 10 warnings in 124.52s`.
- Coverage: `91.10%`, above required `80.01%`.
- A non-authoritative repository Python `3.13.4` symlink reproduced an event-loop fixture cascade after an inherited sync `asyncio.run()` test. The locked Python 3.14.3 gate completed naturally, so the 3.13 result is environment drift, not a release failure.

## Static, frontend, and security verification

- Full Flake8 over production and tests: exit `0`.
- Mypy with CI flags: `Success: no issues found in 202 source files`.
- Canonical full-tree Pylint wrapper: exit `0`, score `9.53/10`, JSON2 `E=0`, `F=0`. Existing backlog: `878` warnings, `633` conventions, `150` refactors.
- Existing frontend solar data/stale selections: `72 passed`. `flow-data.test.ts` proves `forecast_stale` propagation; `flow-solar-tile.test.ts` provides the existing string-assembly stale indicator contract. No frontend source/dist changed, and this is not claimed as a new mounted pricing-card regression.
- Bandit full production tree: `0 HIGH`, `0 MEDIUM`, `44 LOW`; no finding in either changed production file.
- Gitleaks over every modified/untracked task file: no findings.
- Trivy: v2 npm lock `0` vulnerabilities; Python lock `11 HIGH`, `2 CRITICAL`, `2 MEDIUM`, `1 LOW`.
- pip-audit with repository runtime policy: `17` advisories affecting `cryptography`, `litellm`, and `urllib3`.
- Safety with repository runtime policy: `9` found, `1` ignored.
- Dependency findings are inherited: current and remediation-base `requirements.txt` share blob `18c42aaeb2f4b2949af6001f5f0f79a6331266c5`; current and base v2 `package-lock.json` share blob `1739c5100ff236eb5a13bddf0774a6ec7a5b7623`.
- Final report-bearing pre-commit runs, `git diff --check`, and staged-scope status are recorded in the final handoff after this report is force-added.

## Residual release blockers and external verification

- Inherited dependency advisories remain release-blocking outside this scheduler remediation. Locked dependency updates require a separate reviewed change.
- Local frontend toolchain is Node `24.3.0` and npm `11.4.2`, not the exact release toolchain Node `22.17.0` and npm `10.9.2`.
- Ubuntu PEP 517/wheelhouse verification remains unexecuted locally.
- Live HP deployment and natural wall-clock observation remain unexecuted by constraint.
- Ten inherited boiler resource warnings remain visible in the otherwise green canonical full Python run.
- The remediation commit hash is reported in the external handoff because a commit cannot contain its own final hash.
