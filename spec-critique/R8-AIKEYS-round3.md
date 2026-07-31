# R8-AIKEYS round 3 - CRITICAL 0 / MAJOR 0 / MINOR 0

## 1. Prior-finding verdicts

Verdict scope: CLOSED means the updated documents add a binding requirement or correctly route an already-shipped defect. It does not claim shipped code is fixed. Prior defect rows closed: 17/17.

| id | CLOSED/PARTIAL/OPEN | evidence |
|---|---|---|
| AIK-1 / R2-S1 - no `AiKeyStore` delete or integration teardown cleanup | CLOSED | `SCOPE-REVISION.md:R6.7` requires delete/clear semantics and integration-removal cleanup for `oig_cloud.ai_<entry_id>` (`SCOPE-REVISION.md:210-213`). `SCOPE-REVISION.md:R8.7` now also names the exact AI store and deletion assertion (`SCOPE-REVISION.md:368-376`). SHIPPED-CODE routing confirmed: `R6-CLASSIFICATION.md:62`, `SHIPPED-CODE-DEFECTS.md:11-15`. |
| AIK-2 / R2-S2 - provider change can keep a stale AI key | CLOSED | `SCOPE-REVISION.md:R6.7` requires options flow to fail rather than silently keep a mismatched key/provider pair (`SCOPE-REVISION.md:210-213`). `SCOPE-REVISION.md:R8.7` binds provider-switch cleanup against exact stores (`SCOPE-REVISION.md:368-376`). SHIPPED-CODE routing confirmed: `R6-CLASSIFICATION.md:63`, `SHIPPED-CODE-DEFECTS.md:17-21`. |
| AIK-3 / R2-S3 - `/ai` stores replacement before verification | CLOSED | `SCOPE-REVISION.md:R6.7` requires key replacement to verify before switching the active key (`SCOPE-REVISION.md:210-213`). SHIPPED-CODE routing confirmed: `R6-CLASSIFICATION.md:64`, `SHIPPED-CODE-DEFECTS.md:23-27`. |
| AIK-4 / R2-T2 - raw verify exception detail can reach REST/UI | CLOSED | `SCOPE-REVISION.md:R6.9` bans raw key material and unredacted raw provider exceptions from `oig_ai_status` and diagnostics (`SCOPE-REVISION.md:220-222`). SHIPPED-CODE routing confirmed: `R6-CLASSIFICATION.md:65`, `SHIPPED-CODE-DEFECTS.md:29-33`. |
| AIK-5 / R2-T3 - prompt `task` is free text | CLOSED | `SCOPE-REVISION.md:R6.8` requires `task` to be enum/constant and forbids raw `task` concatenation (`SCOPE-REVISION.md:215-218`). SHIPPED-CODE routing confirmed: `R6-CLASSIFICATION.md:66`, `SHIPPED-CODE-DEFECTS.md:35-39`. |
| AIK-6 / R2-P2 - `validate_config` lacks typed anonymous collector and wire test | CLOSED | `SCOPE-REVISION.md:R6.8` requires collectors to exclude coordinates, `box_id`, `entity_id`, API keys, and PII, with a wire-payload falsifier (`SCOPE-REVISION.md:215-218`). `SCOPE-REVISION.md:R8.8` also excludes `solcast_site_id` from the AI prompt collector (`SCOPE-REVISION.md:378-383`). SPEC routing confirmed: `R6-CLASSIFICATION.md:67`. |
| AIK-7 / R2-P3 - `ai_task` delegation branch unverified | CLOSED | SHIPPED-CODE routing confirmed: `R6-CLASSIFICATION.md:68`, `SHIPPED-CODE-DEFECTS.md:41-45`. The spec-side prompt boundary is also closed by `SCOPE-REVISION.md:R6.8` (`SCOPE-REVISION.md:215-218`). |
| R2-A3 - `oig_ai_status` sensor privacy boundary | CLOSED | `SCOPE-REVISION.md:R6.9` requires `oig_ai_status` and diagnostics to avoid raw key material, secret predicates, and unredacted raw exceptions (`SCOPE-REVISION.md:220-222`). `IMPLEMENTATION-BRIEF-EN.md` carries the same diagnostic redaction rule to implementers (`docs/redesign_2026_07/IMPLEMENTATION-BRIEF-EN.md:94-97`). |
| R2 planned-risk row - cross-provider fallback consent | CLOSED | `SCOPE-REVISION.md:R7.11` requires fallback to stay within the selected provider by default, requires explicit stored consent for `ai_task` to backend and Groq to NVIDIA crossings, and requires no outbound call without consent (`SCOPE-REVISION.md:301-305`). |
| AKEY-R6-001 - `/solar_test` secrecy | CLOSED | `SCOPE-REVISION.md:R7.3` binds logs, REST payloads, diagnostics, and DOM-visible errors to classified-only output for Forecast.Solar and Solcast and bans secret text, request URLs, request bodies, and raw exceptions (`SCOPE-REVISION.md:253-257`). `SCOPE-REVISION.md:R8.8` extends the same lifecycle to `solcast_site_id` (`SCOPE-REVISION.md:378-383`). |
| AKEY-R6-002 - solar credential private storage, clear, teardown, and backup hygiene | CLOSED | `SCOPE-REVISION.md:R7.1` requires solar secret fields to live only in per-entry private stores and out of `entry.options` except `*_set` booleans (`SCOPE-REVISION.md:240-245`). `SCOPE-REVISION.md:R7.2` fail-closes backup/journal/audit/diagnostics writes containing secret keys or values (`SCOPE-REVISION.md:247-251`). `SCOPE-REVISION.md:R8.7` names `oig_cloud.solar_<entry_id>` and teardown semantics (`SCOPE-REVISION.md:368-376`). `SCOPE-REVISION.md:R8.8` classifies `solcast_site_id` as sensitive (`SCOPE-REVISION.md:378-383`). |
| AKEY-R6-003 - replacement solar key verified before activation | CLOSED | `SCOPE-REVISION.md:R7.12` requires a new solar key to pass `/solar_test` before activation, preserves the old credential on failed/skipped verification, and fails provider switches without verified replacement material (`SCOPE-REVISION.md:307-312`). `PLAN-3.6-SPEC.md` now binds AK-2 to R7.12 and fails if a replacement key is sent without successful `/solar_test` (`docs/redesign_2026_07/PLAN-3.6-SPEC.md:52-53`). |
| AKEY-R6-004 - explicit cross-provider fallback consent | CLOSED | `SCOPE-REVISION.md:R7.11` defines the consent boundary and seeded falsifier: missing consent plus `ai_task` failure must make no outbound Groq/NVIDIA call and surface a refusal code (`SCOPE-REVISION.md:301-305`). |
| AKEY-R7-001 - R7.7 secret-remount contradiction | CLOSED | `SCOPE-REVISION.md:R8.1` supersedes the reversed R7.7/R7.8 falsifiers, requires non-secret Step-2 values on remount, forbids raw solar secret fields in UI, `entry.options`, `/onboarding` request/response, and saved draft state, and allows only `*_set` booleans plus blank password controls (`SCOPE-REVISION.md:319-330`). `IMPLEMENTATION-BRIEF-EN.md` repeats the polarity override (`docs/redesign_2026_07/IMPLEMENTATION-BRIEF-EN.md:165-167`). |
| AKEY-R7-002 - exact credential store names and teardown semantics | CLOSED | `SCOPE-REVISION.md:R8.7` binds exact store names `oig_cloud.ai_<entry_id>` and `oig_cloud.solar_<entry_id>`, requires `private=True`, forbids collision with `oig_cloud.migration_backup_<entry_id>`, and requires clear/provider-switch/entry-removal deletion assertions (`SCOPE-REVISION.md:368-376`). |
| AKEY-R7-003 - `solcast_site_id` classification | CLOSED | `SCOPE-REVISION.md:R8.8` classifies `solcast_site_id` as a sensitive account/site identifier and binds it to private storage, `/solar_test` redaction, AI prompt exclusion, diagnostics/log redaction, and raw URL exclusion (`SCOPE-REVISION.md:378-383`). |
| AKEY-R7-004 - wrong AK-2 citation to R7.11 instead of R7.12 | CLOSED | `SCOPE-REVISION.md:R8.9` requires AK-2 to cite R7.3 and R7.12, and requires classified Step-2 failure not to block `wizard-next` or `wizard-skip` (`SCOPE-REVISION.md:385-390`). The edited plan cites R7.12 on the verification-before-replace line (`docs/redesign_2026_07/PLAN-3.6-SPEC.md:52-53`). |

Neutral R2 verification rows (`R2-S4`, `R2-T1`, `R2-A1`, `R2-P1`) remain non-defect observations.

## 2. New findings

No new CRITICAL, MAJOR, or MINOR findings.

| id | severity | file:clause | lifecycle step | what the spec leaves undefined | the test that would catch it | the exact spec text that would fix it |
|---|---|---|---|---|---|---|
| No rows | - | - | Full lifecycle | No new undefined step found after R8. | Existing R8 falsifiers cover entry, storage, verification, rotation, deletion, use, and observability. | No change. |

Rationale: R8 closes the remaining lifecycle gaps introduced in R7. Entry/UI echo is covered by `SCOPE-REVISION.md:R8.1`; storage/deletion exactness is covered by `R8.7`; `solcast_site_id` use/observability is covered by `R8.8`; and verification/non-blocking Step-2 behavior is covered by `R8.9` plus `PLAN-3.6-SPEC.md:52-53`.

## 3. Could not establish

- Runtime behavior for `/api/oig_cloud/{box}/solar_test`, `config_migration.py`, D8 `validate_config` task wiring, and `oig_ai_status` could not be established from shipped implementation. `rg -n "solar_test|config_migration|validate_config" /repos/wt-oig-p3impl/custom_components/oig_cloud /repos/wt-oig-p3impl/tests` returned only existing `validate_config` prompt helper/tests and no `/solar_test` endpoint or migration module.
- Runtime behavior for future AI diagnostics could not be established. `rg -n "oig_ai_status|ai_status" /repos/wt-oig-p3impl/custom_components/oig_cloud /repos/wt-oig-p3impl/tests` returned no shipped `oig_ai_status` implementation.
- No slow build or test gate was run, per brief.
