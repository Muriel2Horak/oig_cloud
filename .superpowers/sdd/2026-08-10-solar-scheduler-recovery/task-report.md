# Solar scheduler recovery implementation report

## Scope

- Base: `81405e06ad606f24c659107cca5a9da530ae9b68`.
- Branch: `codex/wizard-v2-auth-fix`.
- Commit message: `fix: schedule solar refreshes on local wall clock`.
- Execute Tasks 1-9 from `docs/superpowers/plans/2026-08-10-solar-scheduler-recovery.md`.
- Preserve the approved provider/authentication contracts from the preceding slices.
- Preserve stored azimuth bytes. No migration, modulo rewrite, or ConfigFlow version change. Stored `138` remains `138`; Forecast.Solar receives `-42` at the existing provider boundary.
- No frontend or tracked distribution file changed.
- No push, PR, deploy, HP access, or remote mutation occurred.

## Implemented contract

- Forecast.Solar and Solcast fetch paths return immutable, classified, secret-safe candidates. Provider I/O cannot mutate sensor memory, coordinator state, HA state, storage, or broadcasts.
- Candidate validation rejects malformed, partial, non-finite, negative, date-incomplete, error-bearing, or provider-inconsistent snapshots before persistence.
- One atomic commit boundary validates, persists with a tracked shielded Store task, reconciles caller cancellation, then publishes exactly once if the lifecycle generation is still current.
- Schema-2 entry-specific cache envelopes include non-secret provider/config provenance and credential revision. Legacy box-only storage remains read-only and is never migrated or rewritten.
- Daily optimized mode subscribes to HA-local `06:00`, `12:00`, and `16:00`; daily mode subscribes to `06:00`. Hourly and every-four-hour modes retain true interval subscriptions. Manual and secondary sensors register none.
- Scheduled occurrence identity is restart-stable from ConfigEntry ID, mode, and scheduled local ISO instant including offset.
- Retryable outcomes run at original occurrence `+15m` and `+45m`, with one total 90-second lock-wait/provider deadline, one refresh lock, pre-dispatch deduplication, persisted recovery before timer registration, and no fourth attempt.
- Valid persisted retry recovery takes precedence over startup cache refresh. Future recovery is re-armed; overdue recovery inside the original horizon runs once; unsafe, terminal, exhausted, superseded, or provenance-mismatched recovery is cleared.
- Initial, scheduled, retry, interval, and manual work is tracked. Unload marks the entity removed first, invalidates lifecycle/occurrence generations, unsubscribes schedule and retry callbacks, cancels and awaits refresh tasks, reconciles durable writes, and blocks post-remove publish.
- A rejected accepted-candidate commit during retry clears durable recovery instead of replaying it after restart.

## TDD evidence

### Task 1: classified results

- RED: missing `refresh_result` module; manual provider result without an accepted candidate incorrectly returned success.
- GREEN: `65 passed`.
- Covered accepted, retryable (`timeout`, `connection`, `rate_limited`, `server_error`), terminal, immutability, candidate presence, and safe-code invariants.

### Task 2: side-effect-free providers

- RED: `17 failed, 1 passed`; provider fetches mutated storage/state, returned `None`, leaked raw transport behavior, and accepted malformed HTTP 200 payloads.
- GREEN: `18 passed` for the new provider contract; compatibility selection reached `150 passed` with one inherited invalid test fixture.
- The inherited Forecast.Solar success fixture was corrected to provide a valid DTO and assert candidate return without commit side effects.

### Task 3: validation and atomic commit

- RED: missing cache contract, then seven missing atomic-commit cases and two manual truthfulness failures.
- GREEN: Tasks 1-3 selection `73 passed`.
- Covered storage failure, generation change, unload before publish, duplicate occurrence, Store cancellation, caller cancellation around the durable boundary, and manual truthfulness.

### Task 4: provenance, cache, and restart recovery

- RED: helper imports missing; integration then had four missing cache behaviors. Restart precedence additionally lost a valid retry when the cached forecast was expired.
- GREEN: Task 3-4 selection `51 passed`.
- Final RED/GREEN addition proved a recent provenance mismatch forces startup refresh while a matching recent schema-2 cache skips it.
- Covered provider/mode/string/kWp/GPS/tilt/raw-azimuth fingerprints, credential revision, reused box IDs, legacy rollback artifact behavior, stable occurrence IDs, future/overdue retry restore, and invalid retry clearing.

### Task 5: HA-local wall-clock scheduling

- RED: `12 failed` because no wall-clock event seam existed.
- GREEN: `12 passed`.
- Covered startup at Europe/Prague `10:42`, local `06:00/12:00/16:00`, daily `06:00`, spring/fall DST dates, interval modes, manual mode, and secondary sensors.

### Task 6: retry, deduplication, and deadline

- RED: `10 failed` across retry timing, deduplication, deadline, and persistence behavior.
- GREEN: initial scheduler selection `12 passed`; final scheduler file `14 passed`.
- Additional RED/GREEN proved interval callbacks use the validated atomic commit boundary and a rejected retry commit clears persisted recovery.

### Task 7: complete unload

- RED: `4 failed, 3 teardown errors`; active provider and lock waiter survived, durable save was abandoned, retry unsubscribe was missing, and removal was not idempotent.
- GREEN: initial unload selection `4 passed` under `--timeout=3`; final unload file `5 passed`.
- Additional RED/GREEN proved unload cancels in-flight setup before it can register new schedule or initial work.

### Task 8: stale recovery integration/E2E

- RED: `3 failed` because the guarded initial refresh path was missing.
- GREEN: `3 passed`.
- Covered two-day stale recovery on the next local occurrence, 429 then timeout then `+45m` success while retaining the old card, and terminal authentication failure with no retry and truthful manual failure.

### Task 9: compatibility and complete gates

- Focused scheduler/provider/cache/service/E2E selection: `268 passed`, then `275 passed`, and final comprehensive solar/key-store/provider/service/E2E selection `390 passed` after lifecycle hardening.
- First full coverage run: `5215 passed, 29 skipped, 1 failed`; coverage `91.03%`. The sole failure expected a forbidden rewrite of legacy box-only storage.
- Legacy rollback test corrected to assert read-only fallback; focused correction `1 passed`.
- Intermediate full rerun: `5216 passed, 29 skipped`; coverage `90.55%`.
- Final definitive full run: `5218 passed, 29 skipped`; coverage `91.03%`, above required `80.01%`.
- Ten inherited boiler-test resource warnings remain; no solar pending-task warning occurred.

## Static, frontend, and security verification

- Flake8 over production and tests: exit `0`.
- Mypy: `Success: no issues found in 202 source files`.
- Canonical full-tree Pylint wrapper: exit `0`, score `9.54/10`, JSON2 `E=0`, `F=0`. Allowed backlog: `881` warnings, `633` conventions, `128` refactors.
- Frontend ESLint errors-only: pass through pre-commit.
- Frontend TypeScript typecheck: pass through pre-commit.
- No frontend source/dist changed; frontend build or distribution verification was not required for this slice.
- `git diff --check`: pass.
- Two consecutive all-files pre-commit runs passed all nine hooks without rewrites before this durable report was added. Two final report-bearing runs are recorded in the handoff after force-add.
- Bandit full production tree: `0 HIGH`, `0 MEDIUM`, `44 LOW`; no finding in any changed scheduler/cache/result file.
- Gitleaks over every modified/untracked task file: no findings.
- Trivy: v2 npm lock `0` vulnerabilities; Python lock `11 HIGH`, `2 CRITICAL`.
- pip-audit with the repository runtime policy: `17` current advisories after policy, affecting `cryptography`, `litellm`, and `urllib3`.
- Safety with the repository runtime policy: `9` found, `1` ignored.
- Dependency findings are inherited: current and base `requirements.txt` are the identical blob `18c42aaeb2f4b2949af6001f5f0f79a6331266c5`; current and base v2 `package-lock.json` are the identical blob `1739c5100ff236eb5a13bddf0774a6ec7a5b7623`.
- Safe-log audit found no provider response body, credential-bearing URL, API key, Site ID, or raw exception text introduced by this slice.

## Residual release blockers

- Dependency advisories remain release-blocking outside this scheduler slice. Updating locked dependencies requires a separate reviewed dependency change.
- Local frontend toolchain is Node `24.3.0` and npm `11.4.2`, not the exact release toolchain Node `22.17.0` and npm `10.9.2`.
- Ubuntu PEP 517/wheelhouse verification remains unexecuted locally.
- Live HP deployment and natural wall-clock observation remain unexecuted by constraint.
- Ten inherited boiler resource warnings remain visible in the otherwise green full Python run.
- Commit identity is reported in the external handoff because a commit cannot contain its own final hash.
