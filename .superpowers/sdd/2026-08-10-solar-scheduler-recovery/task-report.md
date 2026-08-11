# Solar scheduler recovery implementation report

## Scope

- Original scheduler base: `81405e06ad606f24c659107cca5a9da530ae9b68`.
- Critic-remediation base: `a0014f1da12e38c92b3eb56ef35db3dc631738d9`.
- Second critic-remediation base: `0d1722732addf67eba00cefeab92b1a3b1bd2866`.
- Third critic-remediation base: `6f0fb6b54b32d9635dc35c3bbb97ba8deb10890d`.
- Branch: `codex/wizard-v2-auth-fix`.
- Original scheduler commit: `fix: schedule solar refreshes on local wall clock`.
- Remediation commit message: `fix: harden solar refresh commit ordering`.
- Second remediation commit message: `fix: unify solar cache write transactions`.
- Third remediation commit message: `fix: preserve solar recovery through cancellation`.
- Execute Tasks 1-9 from `docs/superpowers/plans/2026-08-10-solar-scheduler-recovery.md`, then close the ordering, durable retry, lifecycle, real-clock, privacy, restart, and reporting gaps found by critic review.
- Preserve approved provider/authentication contracts.
- Preserve stored azimuth bytes. No migration, modulo rewrite, or ConfigFlow version change. Stored `138` remains `138`; Forecast.Solar receives `-42` only at the provider boundary.
- No frontend source or tracked distribution file changed.
- No push, PR, deploy, HP access, or remote mutation occurred.

## Final implemented contract

- Provider fetches return classified results without mutating sensor memory, coordinator state, Home Assistant state, storage, or broadcasts.
- Provider DTO and secret-free full effective options are captured together under the shared entry transaction lock. The strict provider-discriminated DTO drives I/O; the full options drive provenance, including intentionally retained defaults for disabled strings.
- Every scheduled attempt synchronously captures a frozen, non-secret source identity from setup-validated provenance before any blocking context lookup: entry ID, provider, config fingerprint, credential revision, request identity, occurrence identity/generation, lifecycle generation, and monotonic request sequence. Provider results normally carry the stronger transaction-confirmed context; a context-capture timeout intentionally keeps `context=None` and retains only the pre-wait source identity. Accepted results additionally own a deep-copied snapshot.
- Candidate commit is ordered by one commit lock and the shared per-entry solar transaction lock. It rejects raw, duplicate, older, wrong-provider/config/revision, superseded-occurrence, or obsolete-lifecycle candidates before validation/save. The same captured context is checked again before publish.
- The ordered commit validates, performs one tracked shielded Store write with captured provenance and no retry record, then rechecks context before adopting any cache/forecast memory or publishing coordinator/HA/broadcast state. A newer durable sequence prevents an older completed provider call from overwriting it.
- Accepted snapshots and retry set/clear writes use the same lock order: sensor candidate lock, then shared entry transaction lock. Retry writes re-read Store only after both locks, validate failed-attempt request/occurrence/sequence context, and use tracked shielded Store tasks with caller-cancellation reconciliation.
- Durable Store task ownership is independent of its caller. Retry and accepted writes stay tracked through arbitrary repeated caller cancellation, retain both ordered locks until Store completion, reconcile memory only after the durable outcome is known, and then preserve caller cancellation semantics. Unload waits for the same task-owned boundary; a newer write cannot pass an older blocked write and therefore wins last.
- Schema-2 entry-specific retry rewrites preserve existing cache data and provenance, including mismatched or invalid artifacts. Legacy box-only storage remains read-only and forced stale. An executable reader copied from the pre-scheduler artifact proves the previous release ignores entry-specific schema 2 and continues reading the untouched box key.
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

### Mandatory second-critic RED

- Before second-remediation production edits, the grouped selection collected `91` tests and produced `22 failed, 69 passed`.
- Production-path RED proved real Forecast.Solar and Solcast accepted candidates were rejected because the strict provider DTO omitted disabled-string defaults later included by the full-options commit check.
- Retry atomicity RED proved blocked retry set and clear writes could both overwrite a newer accepted snapshot, obsolete failed-attempt context was not accepted by the API, caller cancellation lost an in-flight retry write, and unload lost durable retry recovery.
- Additional bounded REDs proved the request-context capture sat outside the 90-second attempt deadline, pre-publish Store completion already mutated `_durable_cache_envelope`, and an older retry sequence could replace newer recovery.
- Positive controls proved the executable previous-release reader and Store-complete unload/restart path were otherwise reproducible before their stricter assertions.

### Mandatory third-critic RED

- Before third-remediation production edits, the canonical CPython 3.14.3 grouped selection collected `6` tests and produced `4 failed, 2 passed`.
- Context identity RED failed because `SolarFetchResult` had no pre-wait source identity; the executable scheduled regression then failed because the claimed occurrence persisted no `retry_state` and armed no timer after context capture timed out.
- Repeated-cancellation RED failed on both retry and accepted Store paths: both caller tasks became cancelled while Store remained blocked, proving that caller-owned cleanup had dropped durable tracking and released transaction locks early.
- The two passing controls showed that one cancellation source was already reconciled; the defect required repeated cancellation. Final tests add two explicit cancellations plus unload, and a blocked older write followed by a newer accepted write, for both retry and accepted paths.

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
- Ordering/context GREEN: `16 passed`; cache contract GREEN: `25 passed`.
- Final commit boundary uses the full-config context captured beside the provider DTO, monotonic durable request sequence, ordered candidate lock, shared entry transaction lock, pre-save validation/context guard, one shielded durable write, and a pre-publish context guard before any memory adoption.

### Task 4: provenance, cache, and durable retry recovery

- Original RED covered schema-2 provenance, legacy rollback, forced stale behavior, and restart precedence.
- Critic RED added mismatched, legacy, and invalid artifact preservation plus same-write accepted retry clearing and restart-before-publish recovery.
- Current retry atomicity GREEN: `17 passed`; provenance GREEN: `27 passed`.
- Retry set/clear re-read the current durable envelope under the same two locks as accepted commit, reject stale request/occurrence/sequence sources, and reconcile shielded Store completion across cancellation/unload. Successful retry writes the accepted snapshot without `retry_state` once; restart cannot replay the cleared retry.

### Task 5: real HA-local wall-clock scheduling

- Original RED: `12 failed` before wall-clock subscriptions existed.
- Critic RED required firing the actual registered callback through Home Assistant time helpers and canonicalizing callback jitter.
- Wall-clock/scheduler GREEN: `31 passed`; the real-HA file contributes `5 passed`.
- Evidence covers setup at Prague `10:42` then local noon, no catch-up, spring/fall DST dates, duplicate/jitter delivery, daily/optimized targets, interval modes, and primary-only subscription.

### Task 6: retry, deduplication, and deadline

- Original RED: `10 failed` across timing, overlap, deduplication, deadline, and persistence faults.
- Scheduler GREEN: `15 passed`; remediation compatibility keeps the exact `+15m`/`+45m`, no-fourth-attempt, terminal, timer-failure, persistence-failure, restart, request serialization, and 90-second deadline contracts green. The deadline includes request-context capture as well as lock wait and provider I/O.
- A context-capture timeout after occurrence claim now persists exactly one `+15m` recovery record and arms one timer from the immutable pre-wait identity. Duplicate or jittered callback delivery remains inert. If options, lifecycle, occurrence, entry, or loaded provenance changes before persistence, the timeout identity is rejected and never stamped with current provenance.
- Accepted retry commit clears durable recovery in the accepted snapshot write; rejected accepted candidates clear any prior recovery without publishing.

### Task 7: complete lifecycle cancellation

- Original RED exposed surviving provider/lock tasks, abandoned durable work, missing retry unsubscribe, and non-idempotent removal.
- Critic RED added publish-side service tasks and concurrent removals.
- Lifecycle GREEN: `7 passed`.
- Every task-producing path now uses the unified refresh-task tracker; concurrent removal callers await one teardown; no `update_entity` work survives removal.
- Repeated cancellation during either retry or accepted Store save no longer removes the durable task early. Unload stays pending until Store completes, removed entities publish nothing, both ordered locks remain held, and a follow-on newer snapshot persists last.

### Task 8: stale recovery integration/E2E

- Original RED: `3 failed` before the guarded initial path existed.
- Critic additions cover restart between attempts, restart after durable pre-unload save, service/manual truthfulness, and teardown task assertions.
- E2E GREEN: `7 passed`.
- Covered two-day stale recovery at the next local occurrence, transient failure through `+45m` success while retaining the old card, terminal auth failure, exact retry restart without duplicate dispatch, Store-complete unload before any sensor/coordinator/HA/broadcast memory publication, replacement publish once, and truthful service errors.

### Task 9: compatibility and complete gates

- Final scheduler/cache/provider/entity/service/E2E compatibility selection: `481 passed`.
- Final second-remediation concurrency/context/E2E selection: `49 passed`.
- Canonical full Python environment: CPython `3.14.3`, pytest `9.0.3`, pytest-asyncio `1.4.0`, Home Assistant `2026.8.1`, HA custom-component plugin `0.13.355`.
- Canonical full suite: `5266 passed, 29 skipped, 10 warnings in 126.54s`.
- Coverage: `33,062/36,300` lines, `91.08%`, above required `80.01%`.
- A non-authoritative repository Python `3.13.4` symlink reproduced an event-loop fixture cascade after an inherited sync `asyncio.run()` test. The locked Python 3.14.3 gate completed naturally, so the 3.13 result is environment drift, not a release failure.

## Static, frontend, and security verification

- Full Flake8 over production and tests: exit `0`.
- Mypy with CI flags: `Success: no issues found in 202 source files`.
- Canonical full-tree Pylint wrapper: exit `0`, score `9.54/10`, JSON2 `E=0`, `F=0`. Existing backlog: `880` warnings, `633` conventions, `128` refactors.
- Existing frontend solar data/stale selections: `77 passed` across three files. `flow-data.test.ts` proves `forecast_stale` propagation; `flow-solar-tile.test.ts` provides the existing string-assembly stale indicator contract. No frontend source/dist changed, and this is not claimed as a new mounted pricing-card regression.
- Bandit full production tree: `0 HIGH`, `0 MEDIUM`, `44 LOW`; no finding in either changed production file.
- Gitleaks over every modified/untracked task file: no findings. The public numeric legacy storage fixture ID has a documented inline scanner allow.
- Trivy: v2 npm lock `0` vulnerabilities; Python lock `11 HIGH`, `2 CRITICAL`, `2 MEDIUM`, `1 LOW`.
- pip-audit with repository runtime policy: `17` advisories affecting `cryptography`, `litellm`, and `urllib3`.
- Safety with repository runtime policy: `9` found, `1` ignored.
- Dependency findings are inherited: current and remediation-base `requirements.txt` share blob `18c42aaeb2f4b2949af6001f5f0f79a6331266c5`; current and base v2 `package-lock.json` share blob `1739c5100ff236eb5a13bddf0774a6ec7a5b7623`.
- The two report-bearing pre-commit runs, `git diff --check`, lifecycle/cancellation audit, and staged-scope status are recorded in the external final handoff after this report is force-added; the report intentionally does not make a self-referential pre-commit claim.

## Residual release blockers and external verification

- Inherited dependency advisories remain release-blocking outside this scheduler remediation. Locked dependency updates require a separate reviewed change.
- Local frontend toolchain is Node `24.3.0` and npm `11.4.2`, not the exact release toolchain Node `22.17.0` and npm `10.9.2`.
- Ubuntu PEP 517/wheelhouse verification remains unexecuted locally.
- Live HP deployment and natural wall-clock observation remain unexecuted by constraint.
- Ten inherited boiler resource warnings remain visible in the otherwise green canonical full Python run.
- The remediation commit hash is reported in the external handoff because a commit cannot contain its own final hash.
