# Solar provider contract implementation report

## Scope

- Base: `598effd82283281e7951be674a072c6cf6c58542`.
- Branch: `codex/wizard-v2-auth-fix`.
- Enclosing implementation commit: `fix: use compass azimuth at solar provider boundary`.
- Implement Tasks 1-9 from `docs/superpowers/plans/2026-08-10-solar-provider-contract.md`.
- Keep authentication behavior unchanged except for typed solar DTO integration at existing authorized call sites.
- Exclude scheduler work and repository-wide coverage uplift owned by other quality-plan tasks.

## Accepted contract

- Canonical application/UI azimuth: compass `0/360` north, `90` east, `180` south, `270` west.
- Preserve existing non-negative stored values numerically; `138` remains `138` and Forecast.Solar receives `-42`.
- Convert only at the Forecast.Solar outbound boundary. Preserve negative legacy provider values raw until explicit adoption.
- Do not bump ConfigFlow version and do not add a numeric migration. `ConfigFlow.VERSION` remains `1`.
- Solcast Rooftop Site owns GPS, tilt, and azimuth. Local enabled-string kWp remains allocation/fallback metadata and is not sent to Solcast.
- Preserve inactive non-secret geometry. Delete inactive credentials, Site ID, and candidate state only on a committed provider switch.
- Keep `/solar_test` side-effect-free. Persist and activate credentials only on explicit save.
- Use opaque five-minute single-use proofs bound to entry, provider, mode, and deterministic effective DTO; claim atomically and never restore a consumed proof during rollback.

## TDD evidence

### Tasks 1-2: helpers, DTO, registry, and generic visibility

- Task 1 RED: focused helper/provider tests produced `59 failed, 6 passed` against old modulo behavior and the missing provider contract.
- Task 2 RED: focused registry tests produced `3 failed`; frontend registry/visibility tests produced `5 failed`.
- GREEN checkpoint: helper/provider/registry Python selection `127 passed`; frontend selection `100 passed`.

### Tasks 3-4: legacy read/adoption and strict persistence

- RED: backend adoption/persistence selection `25 failed, 194 passed`; frontend adoption and warning cases failed before implementation.
- GREEN checkpoint: backend selection `242 passed`; frontend selection `49 passed`.
- Round-trip tests prove `0`, `90`, `138`, `180`, `270`, and `360` persist unchanged.
- Invalid writes and corrupt stored values fail closed without mutation or provider dispatch.
- No ConfigFlow version bump, numeric migration, modulo-wrap, or author-default rewrite was added.

### Tasks 5-6: shared provider runtime and side-effect-free candidate DTO

- RED: provider/runtime/candidate backend selection `17 failed, 69 passed`; frontend candidate-body selection `2 failed`.
- GREEN checkpoint: backend selection `111 passed`; frontend selection `23 passed`.
- Runtime and candidate paths use the same encoded provider URL builders and provider-discriminated DTO contract.
- Forecast.Solar mode/key rules match across test, save, and runtime. Solcast receives no local GPS, tilt, azimuth, or kWp.
- Success, failure, and cancellation leave key-store active/candidate bytes, options, provider, cache, and revision unchanged.

### Task 7: proof-bound atomic activation

- RED: key/draft selection `8 failed, 6 passed`; frontend proof selection `1 failed, 2 passed`; native-flow selection `2 failed`.
- GREEN checkpoint: focused main backend selection `327 passed`; isolated key-store compatibility `7 passed`; frontend proof selection `26 passed`.
- Rollback, replay, expiry, mismatch, concurrent double-save, Store/options/reload fault injection, provider switch, and previous-artifact compatibility cases execute.
- Controlled concurrency produces one verified commit, one proof rejection, and one revision increment.
- Compensating rollback restores prior options and private credentials while leaving the proof consumed.

### Task 8: copy/catalog parity and provider switching

- RED: copy/catalog backend selection `3 failed`; frontend selection `2 failed`.
- GREEN checkpoint: backend selection `9 passed`; frontend selection `47 passed`.
- English, Czech, native strings, Settings hints, onboarding hints, and enum labels use the same compass and Solcast ownership contract.

### Task 9: E2E

- Python provider-boundary E2E with `E2E_DATA_MODE=mock`: focused compass cases `2 passed`; full file `8 passed, 3 skipped`.
- The E2E retains stored `90` and `138` and proves provider URL values `-90` and `-42`.
- Playwright fixture RED exposed label/scoping and shadow-DOM selector gaps before the final mounted-app assertion.
- Playwright GREEN: `1 passed`; Solcast hides local geometry, keeps kWp, sends a geometry-free candidate body, performs no save during test, forwards the opaque proof only on save, preserves Forecast.Solar geometry on switch-back, and requires credential re-entry.

### Compatibility regression found during verification

- RED: `tests/test_solar_draft_rest.py -k legacy_option_secret` failed `1`; `tests/test_solar_test_view.py -k partial_draft_uses_legacy` failed `1` because pre-slice credentials still stored in ConfigEntry options were omitted from the new locked snapshot.
- GREEN: both regressions pass after merging legacy option credentials into the locked effective snapshot and stripping all private fields from options on committed save.
- The additive private-store format remains readable by the previous-artifact parser; `SolarKeyStore.STORAGE_VERSION` remains `1`.

## Implementation

- `config/solar_rules.py`
  - Strict compass validator, legacy read model, explicit adoption resolver, and Forecast.Solar boundary conversion.
- `forecast/provider_contract.py`
  - Pure effective DTO merge, strict provider validation, deterministic serializer, encoded Forecast.Solar and Solcast URL construction, and secret-safe provider diagnostics.
- Registry/native/web surfaces
  - Canonical `0..360` azimuth metadata, `daily` mode, generic `show_if_all`, provider-owned geometry visibility, and equal String 1/String 2 behavior.
- Runtime/candidate paths
  - Shared immutable provider DTO and revision snapshot; provider-specific mode/key rules; invalid legacy state preserves stale cache and performs zero provider calls.
- `config/solar_key_store.py` and `config/solar_transaction.py`
  - Additive credential revision/verification state, opaque proof store, shared per-entry lock, one-save activation, exact snapshot/restore, inactive-secret cleanup, and compensating transaction.
- REST/native/frontend save flows
  - Side-effect-free test endpoint; optional proof-bound save; unverified explicit save/native flow; reload/rollback under the shared transaction; legacy option-secret compatibility.
- Catalogs and tracked distribution
  - Compass, legacy-warning, provider-ownership, and credential-switch copy aligned in English and Czech; deterministic v2 distribution rebuilt.

## Verification

### Backend and frontend tests

- Final affected Python selection: `464 passed`.
- Isolated `tests/test_solar_key_store.py`: `7 passed`. Isolation preserves the existing previous-artifact import harness.
- Final focused frontend selection: `6 files, 55 passed`.
- Python E2E: `8 passed, 3 skipped` under mock data mode.
- Playwright provider contract: `1 passed` on Playwright-managed Chromium.
- Full v2 unit/coverage under `TZ=UTC`: `102 files, 2,030 passed`; statements/lines `73.19%`, branches `77.61%`, functions `72.45%`.
- The global frontend `>=80.01%` gate remains quality-plan Task 3 scope. No threshold or exclusion was weakened.
- Inherited local-timezone-only boiler test drift: isolated local timezone `9 failed, 52 passed`; the same untouched file under `TZ=UTC` is `61 passed`, and base-to-slice diff for both boiler source and test is empty. This is command-environment drift, not a solar regression.

### Static, build, and artifact gates

- Flake8: exit `0`.
- Canonical Mypy: `Success: no issues found in 200 source files`.
- Pylint `4.0.7`: exit `0`; score `9.526162202767907`; `E=0`, `F=0`.
- ESLint errors-only: exit `0`.
- TypeScript typecheck: exit `0`.
- Production build: exit `0`.
- Read-only `build:verify`: exit `0` against tracked `dist`.
- Translation JSON parsing and cross-catalog parity: pass.
- `git diff --check`: pass before final pre-commit.
- Pre-commit: two consecutive all-files runs passed all nine hooks without rewrites.
- Tracked distribution: nine files; sorted hash manifest `f46dda8789e00420204eb7eb4aa8fb14945df3347bdd50708477a5c145b324a1`.
- Build ID: `816b9c44b4ee0374cb44d3c3961c3945c52df7640e4af6d8c9c965c8b1ba1d8c`.
- `dist/index.html`: `b77f9d8a5f275e7579afe7cc168e94a6f05b512cd1a69c4950f8281a858fdf1e`.
- `dist/assets/index.js`: `256e8d586a8f9fa707a964624bb3258c6f63f89706280400494cef29aabfc91b`.
- `dist/assets/index.js.map`: `b3aa2c708f78e44e41ef98b776b5bc839eb8616a8257f72df24be1907b9ee5c4`.
- Bundle/map inspection found no synthetic secret/proof sentinels and only expected changed sources.

### Security

- Gitleaks `8.30.0`: no real introduced secret. Two generated-map `generic-api-key` matches are the `sourceKey` type/property false positive.
- Bounded Trivy secret scan of `custom_components/oig_cloud`, excluding dependency/coverage output: zero secrets.
- No dependency manifest or lockfile changed; therefore no introduced dependency High/Critical finding.
- Formal Codex Security diff scan `eeb641cc-405c-457e-9ef5-aa9c208d248d`: complete, `23/23` full-file receipts, `0` findings, no deferred work.
- One discovery candidate about non-negative legacy azimuth semantics was validated `not_applicable`: the approved contract explicitly classifies all non-negative stored values as compass and requires `138 -> -42`.
- Generated report: `/private/var/folders/vj/680smcyn26b89dfkt2hsp96m0000gn/T/codex-security-scans-w4gF6A/wizard-v2-auth-fix/598effd82283281e7951be674a072c6cf6c58542_20260811T012502Z_9u6icu37/report.md`.
- Scanner token measurement was unavailable (`scan_thread_unavailable`). Scan-goal usage: `279,605` tokens over `30m38s`.

## Residual release gates

- Inherited dependency diagnostics remain release-blocking outside this slice:
  - root npm: `15` vulnerabilities (`12 High`, `2 Critical`);
  - v2 npm: `21` vulnerabilities (`16 High`, `2 Critical`);
  - requirements/Trivy: `13` vulnerabilities (`11 High`, `2 Critical`).
- Exact release frontend toolchain remains unverified locally: this slice used Node `24.3.0` and npm `11.4.2`; Task 6 requires Node `22.17.0` and npm `10.9.2`.
- Ubuntu PEP 517/wheelhouse and live HP/natural-refresh gates remain quality-plan Task 6/final-release scope.
- No push, PR, deploy, HP access, or remote mutation occurred.

## Final critic remediation: remaining transaction gaps

### Scope and preserved decisions

- Reviewed base: `ff167429068c4e237d1f94cc7524b2aff7425b7d`.
- Preserve `ConfigFlow.VERSION == 1`, the no-migration policy, and byte-identical non-negative stored azimuth. Stored `138` remains `138`; only the Forecast.Solar provider boundary sends `-42`.
- Preserve Solcast-owned geometry and local-only enabled-string kWp metadata.
- Keep authorization, proof binding, transaction locking, and fail-closed setup behavior strict.
- Keep the confirmed scheduler startup phase-lock defect in its dedicated next slice.

### Mandatory RED evidence

- Native routing and mixed deltas: `4 failed, 49 deselected`; `section_all` short-circuited mixed saves, newly enabled solar in `section_modules` bypassed the private transaction, and legacy public credentials were neither shared consistently nor stripped after explicit save.
- Persistent bootstrap rollback: `1 failed, 2 passed`; a persistent public config-entry update fault skipped an independent pending/index compensation and left a non-retryable terminal state.
- Expired-record lifecycle: `2 failed`; abandoned pending records were not cleaned at a real integration lifecycle boundary and cleanup failure behavior was unproven.
- Wizard candidate invalidation and Settings i18n: `9 failed, 33 passed`; old success/failure/finally paths repopulated state after reset, a fresh candidate could lose to the old request, and Settings warnings remained hardcoded Czech.
- Playwright provider fidelity: `1 failed`; fake DTO reconstruction retained provider-irrelevant geometry/disabled strings instead of matching production discrimination.
- Revision capture guard: `1 failed, 53 deselected`; repeated full-flow preparation refreshed the revision baseline and could bypass the conflict guard.
- Late module-config reseed: `1 failed, 27 skipped`; an unresolved request installed `pre-reseed-proof` after a new module configuration changed the draft.
- Setup/import failures were not counted as behavioral RED.

### Implemented remediation

- Route mixed `section_all` and newly enabled solar module saves through `async_commit_solar_configuration`. Commit the non-solar and solar deltas together without boolean short-circuiting, strip legacy public secrets, increment one solar revision, and preserve the shared rollback/reload contract.
- Reuse the shared selected-provider legacy credential fallback for native validation and capture the OptionsFlow solar revision exactly once, so a later prepare cannot silently move the optimistic-concurrency baseline.
- Make pending/index/active/public compensation attempts independent. Persist a safe terminal status for an unrecoverable platform update fault without claiming atomic success or logging secret material.
- Invoke expired pending-record cleanup from config-entry setup. Preserve active/unexpired records; log cleanup failure through exception-class-only diagnostics and continue normal setup when no unusable claim is referenced.
- Guard every candidate request success, failure, and `finally` path with a monotonically increasing epoch. Discard, reopen, bootstrap, field/GPS edits, and late module-config reseeding invalidate unresolved requests; a new request after reset completes normally.
- Render Settings invalid/adoption warnings through the CS/EN catalogs with the canonical correction range `0..360`.
- Make the Playwright fake apply the same provider discrimination as production: Forecast.Solar owns local geometry, enabled-string values are transmitted, Solcast omits local geometry while retaining local kWp metadata, and disabled strings are absent.

### Focused GREEN evidence

- Complete native OptionsFlow: `54 passed`.
- Plugin-isolated pending key store, including persistent config-entry/pending/index faults and retryable terminal-state assertions: `18 passed`.
- Config-entry setup/lifecycle cleanup: `23 passed`.
- Wizard and Settings focused selection after the late-reseed fix: `43 passed`.
- Late module-config race alone: `1 passed, 27 skipped`.
- Realistic provider Playwright contract: `5 passed`.

### Full-gate evidence

- Broad affected Python selection: `491 passed`; additional setup/reload selection: `64 passed`.
- Native provider E2E: `8 passed, 3 skipped`.
- Full v2 unit suite under `TZ=UTC`: `102 files, 2,053 passed`.
- Full v2 coverage under `TZ=UTC`: statements/lines `73.24%`, branches `77.76%`, functions `72.47%`.
- TypeScript typecheck: pass.
- ESLint: exit `0`, `0` errors and `582` inherited warnings.
- Flake8 production scope: pass.
- Canonical Mypy: `Success: no issues found in 200 source files`.
- Pylint `4.0.7`: exit `0`, score `9.52/10`, `E=0`, `F=0`.
- Production build and read-only `build:verify`: pass after the final epoch invalidation; tracked distribution rebuilt.
- Translation JSON parse/copy parity: pass.
- `git diff --check`: pass.
- Final pre-commit: two consecutive all-files runs passed all nine hooks without rewrites after adding the repository Python environment to hook `PATH`.

### Security and residual release blockers

- Formal Codex Security diff scan `3dbe08e0-7d28-4fa7-ac16-be5091a79e7e`: complete and sealed, `8/8` deterministic full-file receipts, zero candidates, zero reportable findings.
- Security report: `/private/var/folders/vj/680smcyn26b89dfkt2hsp96m0000gn/T/codex-security-scans-w4gF6A/wizard-v2-auth-fix/ff167429068c4e237d1f94cc7524b2aff7425b7d_20260811T050838Z_cib8gy65/report.md`.
- Scan-goal usage: `173,324` tokens over `16m51s`; workbench token counters were unavailable (`scan_thread_unavailable`).
- Discovery suppressed the late module-config reseed as non-security because server-side DTO/proof binding remains fail closed. The race was nevertheless reproduced and remediated functionally before commit.
- Post-scan delta review covers the one-line reseed invalidation, its regression test, and regenerated distribution. It adds no source/sink and strictly narrows stale client state.
- Gitleaks source diff: clean. The full diff has exactly two generated-bundle/map `sourceKey` entropy false positives and no credential finding.
- Bounded Trivy secret scan over all `14` changed paths: zero findings. Generated distribution contains none of the test proof/error sentinels.
- Aggregate v2 statement coverage is `73.24%`, below the operator's `>80%` release criterion. No threshold or exclusion was weakened; global coverage uplift remains outside this provider remediation.
- Confirmed scheduler release blocker remains separate: startup phase `10:42` produces zero accepted wall-clock refresh hits over 96 hours.
- Previously documented dependency High/Critical findings, exact release Node/npm toolchain, Ubuntu PEP 517/wheelhouse, and live HP/natural-refresh gates remain unresolved external release obligations.
- No push, PR, deploy, HP access, or remote mutation occurred.

## Critic remediation follow-up

### Scope and preserved decisions

- Reviewed base: `9bc57881a81db2e3b555448f016e05a9598f636e`.
- Preserve the no-migration policy, `ConfigFlow.VERSION == 1`, and stored non-negative azimuth bytes. Stored `138` remains `138`; Forecast.Solar receives `-42` only at the outbound boundary.
- Preserve Solcast-owned geometry and local-only enabled-string kWp metadata.
- Keep authentication and authorization boundaries unchanged.

### Mandatory RED evidence

- Native credentials/schema: `4 failed`; blank active private credentials were lost, initial-flow credentials were not activated privately, and native Solcast still exposed local geometry.
- Runtime transaction/log safety: `2 failed, 1 passed`; stale results committed and attacker-controlled response/exception sentinels reached logs, while the current-revision control already passed.
- Wizard legacy/proof/save: `8 failed, 48 passed`; untouched legacy adoption, proof forwarding after another-field edits, failed non-field saves, and corrupt-metadata warnings reproduced.
- Copy parity: `1 failed`; native descriptions still expressed Forecast.Solar-only requirements.
- Playwright realism: `2 failed`; the fake backend did not persist/reload provider state and accepted a mismatched proof.
- Setup/import failures were not counted as behavioral RED.

### Implemented remediation

- Stage complete initial-flow credentials privately under an opaque pending token, activate them under the per-entry lock after entry creation, roll back on failure, and remove the token and all credentials from public options.
- Reopen native OptionsFlow from active private Forecast.Solar or Solcast credentials. Blank secret inputs retain active private values for validation without exposing defaults.
- Exclude latitude, longitude, tilt, and azimuth from native Solcast schema and provider validation; retain local kWp as OIG metadata only.
- Bind provider result commits to the current entry, revision, and provider under the shared lock. Stale completions cannot write cache, coordinator, sensor state, or broadcasts.
- Consume provider bodies without logging them and emit only provider-safe diagnostics plus exception class names.
- Preserve untouched legacy azimuth candidates, display `-90` as compass `90`, adopt an explicitly touched equal numeric value once, and forward the proof when another field changes before save.
- Stop the wizard on every unsuccessful section save, including non-2xx responses without `fields`; render corrupt legacy metadata warnings in Settings and Wizard.
- Use provider-neutral native English/Czech descriptions and extend catalog parity coverage.
- Make the Playwright backend persist public/private provider state across reload, model production secret schema, enforce proof mismatch/replay rejection, clean inactive credentials, preserve geometry, and drive user-facing save/finish controls.

### Focused GREEN evidence

- Native credentials/schema: `4 passed`.
- Runtime stale/current/log safety: `3 passed`; rollback and concurrency paths execute.
- Wizard legacy/proof/save selection: `56 passed`.
- Native/copy parity: `4 passed`.
- Realistic Playwright provider contract: `2 passed`.
- Final focused onboarding i18n/steps/quicksave selection: `56 passed`.
- Initial onboarding i18n full-suite regression was isolated to an existing fixture returning `null` for the prerequisite module save. The fixture now returns a successful module-save body; focused and full reruns pass without weakening production error handling.

### Regression and full-gate evidence

- Affected Python selection with the Home Assistant plugin disabled for the Python 3.14 loop-order issue: `468 passed`.
- Native provider E2E: `8 passed, 3 skipped`.
- Full v2 unit suite under `TZ=UTC`: `102 files, 2,038 passed`.
- Full v2 coverage under `TZ=UTC`: `102 files, 2,038 passed`; aggregate statements `73.22%`.
- Flake8: pass.
- Canonical Mypy: `Success: no issues found in 200 source files`.
- Pylint `4.0.7`: score `9.52/10`; all production paths have `E=0`, `F=0` after the inherited release-gate repair below.
- ESLint errors-only and TypeScript typecheck: pass.
- Production build and read-only `build:verify`: pass; tracked distribution rebuilt.
- Translation JSON parse and parity: `4 passed`; `git diff --check`: pass.
- Final pre-commit: two consecutive `pre-commit run --all-files` executions passed all nine hooks without rewrites after the inherited Pylint repair.
- Gitleaks diff scan: two generated-source-map `sourceKey` metadata false positives; no credential finding.
- Bounded Trivy secret scan: zero secrets.
- Codex Security diff scan `f44ef2ec-146c-4297-997d-076224d66cc3`: complete and sealed, `14/14` receipts, complete coverage, zero reportable findings. Scan goal usage: `195,203` tokens over `11m31s`.
- Security report: `/private/var/folders/vj/680smcyn26b89dfkt2hsp96m0000gn/T/codex-security-scans-w4gF6A/wizard-v2-auth-fix/9bc57881a81db2e3b555448f016e05a9598f636e_20260811T030244Z_1nrps8xc/report.md`.

### Systematic regression isolation

- `tests/test_entities_solar_forecast_sensor.py` no-entry control lacks required DTO geometry at both reviewed base and current tree under identical `TZ=UTC`; it is inherited fixture drift.
- `tests/test_solar_key_store.py` closes the default event loop through its first `asyncio.run` on Python 3.14 and causes later Home Assistant plugin setup errors at both reviewed base and current tree in identical order. Plugin-disabled isolated behavior is green.
- Full-repository Pylint RED reproduced inherited `E1136` at `adaptive_load_profiles_sensor.py:77`. The operator explicitly brought this release-gate failure into scope. The smallest behavior-preserving repair validates the recorder value as a non-empty list and reads its first row through iteration; focused earliest-statistics behavior is `9 passed` and canonical Pylint is exit `0`, score `9.52/10`, `E=0`, `F=0`.
- No unrelated boiler production file was edited to mask inherited timezone, event-loop, or fixture behavior.

### Residual release blockers after remediation

- Aggregate v2 statement coverage is `73.22%`, below the operator's `>80%` release criterion. No threshold or exclusion was weakened; global coverage uplift remains outside this provider remediation slice.
- Previously documented inherited dependency High/Critical findings, exact release Node/npm toolchain, Ubuntu PEP 517/wheelhouse, and live HP/natural-refresh gates remain unresolved external release obligations.
- No push, PR, deploy, HP access, or remote mutation occurred.

## Second critic remediation: setup and retry hardening

### Scope and preserved decisions

- Reviewed base: `c683fe3f9e11b357a0eb96e7953d7277a4fe630e`.
- Preserve `ConfigFlow.VERSION == 1`, the no-migration policy, and byte-identical non-negative stored azimuth. Stored `138` remains `138`; only the Forecast.Solar provider boundary sends `-42`.
- Preserve Solcast-owned geometry and local-only enabled-string kWp metadata.
- Keep authentication, authorization, proof binding, and transaction atomicity strict.
- Keep the confirmed scheduler phase-lock defect out of this provider remediation.

### Mandatory RED evidence

- Full native OptionsFlow: `4 failed`; `section_all` lost blank retained Forecast.Solar/Solcast credentials, bypassed the private solar transaction, and did not enforce the expected revision.
- Pending bootstrap record: `3 failed`; staged records lacked owner/expiry metadata and deterministic cleanup.
- Pending bootstrap concurrency: two entries racing one token returned `[True, True]` instead of exactly one success.
- Pending bootstrap validation/rollback: wrong owner claims succeeded, malformed/missing/expired records did not fail closed consistently, and removal/activation/token-strip failure could lose a retryable claim reference.
- Wizard retry/reset/i18n: `13 failed, 59 passed`; a successful solar section remained dirty after a later failure, stale candidate proof/result/error/match state survived discard/reopen, corrupt guidance advertised `-180..360`, and Wizard warnings were hardcoded Czech.
- Realistic Playwright proof behavior: `2 failed, 2 passed`; the fake accepted a real proof for a different effective DTO and rejected the production-supported proofless explicit save.
- Setup/import failures were not counted as behavioral RED.

### Implemented remediation

- Load active selected-provider credentials and the solar revision for direct solar and `section_all`. Route both through `async_commit_solar_configuration`, retaining blank secrets, stripping public credentials, enforcing one revision increment, and rolling back atomically.
- Add an explicit expected-revision conflict at the shared solar transaction boundary before proof claim or credential activation.
- Bind pending initial credentials to a stable owner digest and provider, give records a five-minute expiry, maintain a private pending index, and clean expired/abandoned records deterministically.
- Claim each pending token under one global bootstrap lock. Reject malformed, missing, expired, replayed, wrong-owner, wrong-provider, or incomplete records. Restore private state, public claim reference, pending record, and index on any activation/removal/token-strip failure.
- Fail entry setup closed when a referenced pending credential claim cannot activate; log only safe diagnostics.
- Advance the Wizard baseline after each successfully committed section. A later section failure and retry no longer repeats solar activation, revision, reload, or proof consumption; later user edits remain visible as dirty.
- Clear candidate proof/result/error/match state on discard and bootstrap, refresh legacy metadata, and prevent an old candidate result from satisfying a newly loaded draft.
- Move corrupt/adoption warning copy into CS/EN catalogs and advertise only the accepted canonical correction range `0..360`.
- Make the Playwright fake reconstruct the complete effective DTO from persisted state plus draft, bind issued proofs to it, reject a real mismatch, reject a genuinely consumed replay, and accept a proofless explicit save as unverified.

### Focused GREEN evidence

- Pending key store, including concurrency, expiry/owner/provider validation, cleanup, replay, and rollback: `15 passed` in the plugin-isolated group.
- Native OptionsFlow: `49 passed`; initial ConfigFlow/setup: `21 passed`.
- Wizard/Settings focused selection: `4 files, 72 passed`.
- Realistic Playwright provider contract: `4 passed`.
- Full frontend unit suite under `TZ=UTC`: `102 files, 2,043 passed`.

### Full-gate evidence

- Broad affected Python selection: `584 passed, 1 failed`. The sole failure is the inherited no-entry-ID solar sensor fixture described below; no changed production or test line participates.
- Native provider E2E under mock data mode: `8 passed, 3 skipped`.
- Full v2 coverage under `TZ=UTC`: statements/lines `73.23%` (`33,405/45,612`), branches `77.73%` (`4,451/5,726`), functions `72.47%` (`911/1,257`).
- Flake8: pass.
- Canonical Mypy: `Success: no issues found in 200 source files`.
- Pylint `4.0.7`: exit `0`, score `9.52/10`, `E=0`, `F=0`.
- ESLint errors-only and TypeScript typecheck: pass.
- Production build and read-only `build:verify`: pass; tracked distribution rebuilt.
- Translation JSON parse and parity: pass.
- `git diff --check`: pass.
- Final pre-commit: two consecutive `pre-commit run --all-files` executions passed all nine hooks without rewrites under the repository Python environment.
- Gitleaks diff scan: two generated-source-map `sourceKey` metadata false positives; no credential finding.
- Bounded Trivy secret scan: zero secrets.
- No dependency manifest or lockfile changed; no dependency finding was introduced by this slice.
- Codex Security diff scan `a4c909fa-117f-4d73-867f-64c0ff9ffcee`: complete and sealed, `12/12` unique full-file receipts, four complete coverage surfaces, zero candidates, and zero reportable findings.
- Security report: `/private/var/folders/vj/680smcyn26b89dfkt2hsp96m0000gn/T/codex-security-scans-w4gF6A/wizard-v2-auth-fix/c683fe3f9e11b357a0eb96e7953d7277a4fe630e_20260811T040817Z_t3eglsxt/report.md`.
- Scanner completion metadata did not expose workbench token counters. Scan-goal usage: `138,542` tokens over `15m05s`.

### Systematic regression isolation and residual blockers

- `tests/test_entities_solar_forecast_sensor_more.py::test_async_fetch_forecast_success` supplies neither an entry ID nor a valid provider DTO. The same no-entry fixture class is inherited, and the changed slice does not touch its sensor or test path; the focused provider paths and current-revision control pass.
- Confirmed scheduler release blocker remains a separate slice: a startup phase of 10:42 produces zero accepted wall-clock refresh hits over 96 hours because interval callbacks never enter the required minute/hour windows. No scheduler production change is included here.
- Aggregate v2 statement coverage is `73.23%`, below the operator's `>80%` release criterion. No threshold or exclusion was weakened; global coverage uplift remains outside this provider remediation.
- Previously documented dependency High/Critical findings, exact release Node/npm toolchain, Ubuntu PEP 517/wheelhouse, and live HP/natural-refresh gates remain unresolved external release obligations.
- No push, PR, deploy, HP access, or remote mutation occurred.
