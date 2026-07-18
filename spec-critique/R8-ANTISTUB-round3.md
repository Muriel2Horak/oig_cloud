# R8 anti-stub re-critique — CRITICAL: 0 | MAJOR: 0 | MINOR: 1

## 1. Prior-finding verdicts

### R2 findings

| id | verdict | evidence (`file:clause`) |
|---|---|---|
| AS-1 | CLOSED | `SCOPE-REVISION.md:R6.2` makes the generator the sole source and byte-compares its canonical output with `remote_config/data/pricelists.json`; the empty release payload is the explicit falsifier. |
| AS-2 | CLOSED | `SCOPE-REVISION.md:R6.3` requires populated Step-3 DOM, and `R8.2` requires AK-1 through AK-4 through the `oig-app` production mount and launch event. |
| AS-3 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.10` plus `IMPLEMENTATION-BRIEF-EN.md:1-152` provide an English restatement, but the Plan-4 and Plan-3.6 sections (`:116-128`) are grep-oriented checklists, not self-contained per-task handoffs with exact files and executable acceptance commands. |
| AS-4 | CLOSED | `SCOPE-REVISION.md:R7.4`; `PLAN-3.6-SPEC.md:AK-5` require the production dashboard route, `[data-testid=dashboard-primary]`, normal navigation, and no onboarding blocker. |
| AS-5 | CLOSED | `SCOPE-REVISION.md:R6.6` requires warning plus recovery action for missing GPS/capacity; `R8.3` adds the production-only `oig-app` route/selectors and rejects mock/settings-only coverage. |
| AS-6 | CLOSED | `SCOPE-REVISION.md:R6.2` requires every tariff and price field and explicitly falsifies the former empty-distributor release payload. |
| AS-7 | CLOSED | `SCOPE-REVISION.md:R8.2` names the production `oig-app` mount, banner/settings launch paths, wizard `open` transition, and the empty/settings-link falsifier. |
| AS-8 | CLOSED | `SCOPE-REVISION.md:R6.2` requires canonical generator bytes to equal the checked-in release bytes. |
| AS-9 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R5.1,R6.2` require coverage and three fixture mappings, but no complete versioned ERÚ fixture-to-every-price-field value oracle is named; a consistently wrong, fully populated generated/released file can still satisfy the stated checks. |
| AS-10 | CLOSED | `SCOPE-REVISION.md:R7.5` names `scripts/requirements-build.txt`, `scripts/requirements-build.txt.lock`, the hash policy, bootstrap command, and a lock-removal falsifier. |
| AS-11 | CLOSED | `SCOPE-REVISION.md:R8.5` names the owner role, `Task-5 warning coverage`, follow-up action, production surface, and `onboarding-warning-recovery.spec.ts`. |
| AS-12 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.5` says the endpoint triggers a real fetch, but its falsifier tests wrong credentials and repeated clicks, not a fake forecast client assertion that a successful handler invokes the provider rather than returns fixed output. |
| AS-13 | CLOSED | `SCOPE-REVISION.md:R8.1` supersedes the reversed falsifier and requires present non-secret Step-2 values after production-launch remount while secret bytes remain absent. |
| AS-14 | CLOSED | `SCOPE-REVISION.md:R8.1` requires distributor, tariff, and confirmed-price values to be present in rendered controls after Step-3 remount; missing values fail. |
| AS-15 | CLOSED | `SCOPE-REVISION.md:R8.6` explicitly supersedes the R4 stale rule and requires timezone-aware injected-clock tests for 2026/2025 snapshots. |
| AS-16 | PARTIALLY-CLOSED | Same remaining handoff gap as AS-3: `SCOPE-REVISION.md:R6.10`; `IMPLEMENTATION-BRIEF-EN.md:116-128` lacks self-contained per-task file/acceptance execution instructions. |
| AS-17 | CLOSED | `SCOPE-REVISION.md:R5.1` requires source URL/date/hash metadata; `R6.2` names and byte-checks the release path; `R6.3` binds runtime consumption. |
| AS-18 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.3,R8.1` binds rendered/persisted registry outputs, but does not define concrete pricing registry keys/types, the full confirmed-price object, or a save/load API schema for a zero-history implementer. |
| AS-19 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.5`; `PLAN-3.6-SPEC.md:AK-2` define request keys and classified failures, but omit a successful response schema for forecast value type, unit, date, and timezone. |
| AS-20 | PARTIALLY-CLOSED | `SCOPE-REVISION.md:R6.4,R8.9` define rendered control use and Step-2 failure navigation, but not a complete per-step `next`/`skip`/`finish` transition and ownership matrix. |
| AS-21 | CLOSED | `SCOPE-REVISION.md:R8.2-R8.3` name the production route, launch selectors, wizard shell, dashboard selectors, and reject mock-only coverage. |
| AS-22 | OPEN — SHIPPED-CODE routing correct | `SCOPE-REVISION.md:R8.4` explicitly routes the missing executable lint entry to `spec-critique/SHIPPED-CODE-DEFECTS.md:AS-22`. No entry point exists yet, so it is not a spec-loop closure. `R6-CLASSIFICATION.md:26` remains stale; see R8-AS-NEW-1. |

### R7 new findings

| id | verdict | evidence (`file:clause`) |
|---|---|---|
| R7-AS-NEW-1 | CLOSED | `SCOPE-REVISION.md:R8.1` replaces the reversed assertions with positive production-launch remount checks and explicit secret-absence checks. |
| R7-AS-NEW-2 | CLOSED | `SCOPE-REVISION.md:R8.2` makes `oig-app` plus the real launch event mandatory for AK-1 through AK-4 and falsifies the old empty/settings-link screen. |
| R7-AS-NEW-3 | CLOSED | `SCOPE-REVISION.md:R8.9` puts `/solar_test` in Step 2 and requires visible error plus enabled `wizard-next` and `wizard-skip` after a classified failure. |

Prior-item total: 17 CLOSED, 7 PARTIALLY-CLOSED, 1 OPEN but correctly routed to SHIPPED-CODE.

## 2. New findings

| id | severity | `file:clause` | what is wrong | falsification test that would catch it | exact spec text that would fix it |
|---|---|---|---|---|---|
| R8-AS-NEW-1 | MINOR | `spec-critique/R6-CLASSIFICATION.md:26`; `SCOPE-REVISION.md:R8.4` | AS-22 is now explicitly SHIPPED-CODE and exists in `SHIPPED-CODE-DEFECTS.md`, but the authoritative classification table still labels it `SPEC` and points to R6.10. An implementer or loop tracker can therefore keep it in the spec loop despite R8's routing. | Check that the AS-22 row in `R6-CLASSIFICATION.md` and its record in `SHIPPED-CODE-DEFECTS.md` have the same bucket. Current check fails because the former says `SPEC` and the latter is a shipped-code defect. | `In spec-critique/R6-CLASSIFICATION.md, change AS-22 bucket to SHIPPED-CODE and where fixed to spec-critique/SHIPPED-CODE-DEFECTS.md; SCOPE-REVISION.md:R8.4.` |

## 3. Not established

- No implementation, CI, slow test gate, deployment, or live UI check was run; this slice reviews only the updated documents.
- No complete versioned ERÚ fixture-to-value oracle, successful `/solar_test` response schema, or complete wizard action-transition matrix is specified; these are the reasons AS-9, AS-12, AS-18, AS-19, and AS-20 remain partial.
- The runnable `brief-lint` command cannot be established because R8.4 deliberately routes that unimplemented code/CI work to `SHIPPED-CODE-DEFECTS.md`.
