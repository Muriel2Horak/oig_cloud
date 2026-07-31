CRITICAL: 1 | MAJOR: 1 | MINOR: 0

## 1. Prior-finding verdicts

| id | verdict | evidence |
|---|---|---|
| C-1 | CLOSED | `SCOPE-REVISION.md:179-182` requires private migration backups, secret removal, and seeded secret absence; `SCOPE-REVISION.md:247-251` derives the secret set from `FIELD_REGISTRY(secret=True)` plus aliases and makes every `config_migration` Store private. |
| C-2 / SEC-2 | CLOSED | Correctly routed as shipped code: `spec-critique/SHIPPED-CODE-DEFECTS.md:5-9` records current `module_config` GET non-admin access and fix; spec also requires non-admin refusal on `/module_config` in `SCOPE-REVISION.md:295-299`. |
| M-1 | CLOSED | `SCOPE-REVISION.md:200-203` requires `/solar_test` admin auth, timeout, rate limit, classified errors, and repeated-click testing; `SCOPE-REVISION.md:253-257` forbids secrets, key prefixes, raw URLs, raw request bodies, and raw upstream exceptions in `/solar_test` logs/REST/diagnostics/DOM; `docs/redesign_2026_07/PLAN-3.6-SPEC.md:44-53` binds the closed request schema and `additionalProperties=false`. |
| M-2 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:295-299` adds a `/pricelists` auth decision and non-admin refusal test, but `SCOPE-REVISION.md:296` still permits an "explicitly documented public route" while `SCOPE-REVISION.md:297-299` requires non-admin refusal. See R8-SEC-2. |
| M-3 | CLOSED | `codex/f1-spec-complete:docs/redesign_2026_07/plans/2026-07-17-f1-plan4-cleanup-migration-dataset.md:202-209` requires restore to clear `_migration`; `codex/f1-spec-complete:docs/redesign_2026_07/plans/2026-07-17-f1-plan4-cleanup-migration-dataset.md:252-258` requires wholesale replace rather than merge; `SCOPE-REVISION.md:229-232` keeps migration restore/strip bounded and testable. |
| M-4 | PARTIALLY-CLOSED | Secret leakage through the shared migration/dead-key backup path is closed by `SCOPE-REVISION.md:247-251`; credential-store collision is closed by `SCOPE-REVISION.md:368-375`. The dead-key backup coupling itself is not explicitly locked or separated. |
| M-5 | CLOSED | `SCOPE-REVISION.md:240-245` requires every registry secret to persist only in per-entry private Store, `entry.options` to hold only metadata/`*_set` booleans, provider switch to fail or clear inactive secrets, and integration removal to clear credential stores and backup copies; `SCOPE-REVISION.md:368-375` adds exact store names and clear/switch/remove deletion tests. |
| M-6 | CLOSED | `SCOPE-REVISION.md:220-222` forbids key material, secret predicates, and raw provider exceptions in status/diagnostics; `SCOPE-REVISION.md:247-257` extends this to migration failures and `/solar_test`; `SCOPE-REVISION.md:378-382` classifies `solcast_site_id` as sensitive and excludes it from diagnostics/logs/prompts/user-facing payloads. |
| m-1 | CLOSED | `SCOPE-REVISION.md:184-188` requires byte-equivalent CI comparison between `scripts/build_pricelists.py` output and release bytes and fails the empty-stub attack. |
| m-2 | CLOSED | `SCOPE-REVISION.md:265-269` names `scripts/requirements-build.txt` and `scripts/requirements-build.txt.lock`, pinned hashes, bootstrap command, and lock-divergence failure. |
| m-3 | CLOSED | `SCOPE-REVISION.md:240-251` forbids option-secret persistence and fail-closes secret-bearing backup/journal/audit/diagnostics writes; `SCOPE-REVISION.md:368-375` requires clear/switch/remove deletion and no migration-backup collision. |
| m-4 | PARTIALLY-CLOSED | `codex/f1-spec-complete:docs/redesign_2026_07/plans/2026-07-17-f1-plan4-cleanup-migration-dataset.md:380-397` registers an admin restore service and `SCOPE-REVISION.md:247-251` constrains audit writes to be secret-safe. No binding confirm parameter or durable audit field set is present. |
| m-5 / AIK-7 | CLOSED | Correctly routed as shipped code: `spec-critique/SHIPPED-CODE-DEFECTS.md:41-45` records the unverified host `ai_task` branch and required runtime verification matrix. |
| R6-SEC-1 | CLOSED | `SCOPE-REVISION.md:240-245` closes private-only solar credential persistence and provider-switch safety; `SCOPE-REVISION.md:317-330` supersedes R7 remount wording and forbids raw solar secrets in DOM, `entry.options`, `/onboarding` request/response, and draft state; `SCOPE-REVISION.md:368-375` requires clear/switch/remove store deletion. |
| R6-SEC-2 | CLOSED | `SCOPE-REVISION.md:247-251` requires registry-derived secret inventory, pre-write serialization checks for backup/journal/audit/diagnostics, fail-closed behavior on secret key/value presence, and private config-migration stores. |
| R6-SEC-3 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:295-299` requires non-admin refusal tests for `/module_config`, `/config_registry`, `/pricelists`, and `/solar_test`. `/pricelists` still has a conflicting public-route escape at `SCOPE-REVISION.md:296`. See R8-SEC-2. |
| R6-SEC-4 | CLOSED | `docs/redesign_2026_07/PLAN-3.6-SPEC.md:44-53` requires `/solar_test` to send only provider-specific keys, reject `entity_id`, `box_id`, `base_url`, and unknown keys before outbound calls, and fail if raw body is forwarded. |

Prior verdict count: 13 CLOSED, 4 PARTIALLY-CLOSED, 0 OPEN.

## 2. New findings

| id | severity | file:clause | what is wrong | falsification test | exact spec text that would fix it |
|---|---|---|---|---|---|
| R8-SEC-1 | CRITICAL | `SCOPE-REVISION.md:324`, `SCOPE-REVISION.md:327`, `docs/redesign_2026_07/PLAN-3.6-SPEC.md:66-70`, `SCOPE-REVISION.md:295-299` | R8.1 expands `/api/oig_cloud/{box}/onboarding` into a payload carrying required status/timestamps plus non-secret Step-2/Step-3 fields, and AK-4 tests `GET /onboarding`, but the binding auth matrix names only `/module_config`, `/config_registry`, `/pricelists`, and `/solar_test`. A future implementer can satisfy the current spec while exposing onboarding draft/config state to authenticated non-admins. Current shipped code appears admin-only at `custom_components/oig_cloud/api/ha_rest_api.py:1427-1453`, so this is a SPEC hole, not a shipped-code fix request. | Seed onboarding Step-2 with latitude/longitude, provider, and pricing fields plus secret sentinels; as an authenticated non-admin, call `GET` and `POST /api/oig_cloud/{box}/onboarding`; assert 403 before any body with step status, GPS, provider, pricing, or `*_set` fields is returned or accepted; assert unsupported methods are 405 and non-admin responses do not distinguish existing vs missing box. | Add to R7.10/R8.1: `/onboarding` GET and POST are admin-only. `/onboarding` is included in the endpoint auth matrix with authenticated non-admin refusal tests, unsupported-method tests, and response-consistency tests. `/onboarding` may return only non-secret setup state to admins and must never return raw credentials. |
| R8-SEC-2 | MAJOR | `SCOPE-REVISION.md:296-299`, `docs/redesign_2026_07/IMPLEMENTATION-BRIEF-EN.md:169` | R7.10 says `/pricelists` is admin-only for GET "or explicitly documented public route", while the same clause and implementation brief require non-admin refusal and say non-admins cannot access priced data. That leaves an implementer-visible escape hatch for the exact auth ambiguity M-2/R6-SEC-3 was supposed to close. | Implement `/api/oig_cloud/{box}/pricelists` as a documented public authenticated route and run the required non-admin refusal test from `SCOPE-REVISION.md:297-299`; the test must fail. Also fuzz guessed box IDs as non-admin and assert no successful priced-data response exists. | Replace `SCOPE-REVISION.md:296` with: `/pricelists` GET is admin-only on the box-scoped route. If a future public pricelist endpoint is required, it must be a separate boxless route with no entry identifier and its own explicit scope; it does not satisfy `/api/oig_cloud/{box}/pricelists`. |

## 3. Bucket routing

| bucket | findings |
|---|---|
| SPEC | C-1, M-1, M-2, M-3, M-4, M-5, M-6, m-1, m-2, m-3, m-4, R6-SEC-1, R6-SEC-2, R6-SEC-3, R6-SEC-4, R8-SEC-1, R8-SEC-2 |
| SHIPPED-CODE | C-2 / SEC-2 (`spec-critique/SHIPPED-CODE-DEFECTS.md:5-9`), m-5 / AIK-7 (`spec-critique/SHIPPED-CODE-DEFECTS.md:41-45`) |

No new SHIPPED-CODE finding is introduced by this R8 security pass.

## 4. What I could not establish

- No build or test suite was run, per slice instruction. Evidence is document review, `git show` for the referenced Plan 4 source, and targeted code inspection only.
- R8 closeout text appeared as uncommitted worktree changes while this review was running. I reviewed the current on-disk text and did not edit those scope/spec files.
- I did not verify live Home Assistant behavior. Current code was inspected only to route R8-SEC-1 away from SHIPPED-CODE because `OIGCloudOnboardingView` is admin-gated in this worktree.
