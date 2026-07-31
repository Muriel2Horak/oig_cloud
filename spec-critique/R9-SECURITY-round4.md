CRITICAL: 0 | MAJOR: 0 | MINOR: 0

## 1. Prior-finding verdicts

| id | CLOSED/PARTIALLY-CLOSED/OPEN | evidence `file:clause` |
|---|---|---|
| C-1 | CLOSED | `SCOPE-REVISION.md:179-182` requires migration backups to use `Store(..., private=True)`, strip option secrets, and fail closed; `SCOPE-REVISION.md:247-251` extends the secret inventory to `FIELD_REGISTRY(secret=True)` plus aliases and forbids secret-bearing backup/journal/audit/diagnostics writes. |
| C-2 / SEC-2 | CLOSED | Correctly routed as shipped code at `spec-critique/SHIPPED-CODE-DEFECTS.md:5-9`; spec now also requires `/module_config` non-admin refusal in the closed matrix at `SCOPE-REVISION.md:397-410`. |
| M-1 | CLOSED | `/solar_test` is admin-authenticated, bounded, rate-limited, and classified-safe at `SCOPE-REVISION.md:200-203`; raw secrets, URLs, bodies, headers, and upstream exceptions are banned at `SCOPE-REVISION.md:253-257`; R9 adds numeric timeout/rate limits at `SCOPE-REVISION.md:416-417`. |
| M-2 | CLOSED | `SCOPE-REVISION.md:397-413` supersedes the public-route escape and makes box-scoped `/pricelists` admin-only with no public exception; `docs/redesign_2026_07/IMPLEMENTATION-BRIEF-EN.md:176-192` repeats the closed matrix for implementers. |
| M-3 | CLOSED | `SCOPE-REVISION.md:229-232` keeps migration restore/strip bounded and explicitly testable when already complete; R9 adds a no-full-rewrite timing check at `SCOPE-REVISION.md:419`. |
| M-4 | PARTIALLY-CLOSED | Secret leakage in the shared migration/dead-key backup path is closed by `SCOPE-REVISION.md:247-251`, and credential-store collision is closed by `SCOPE-REVISION.md:368-375`; the original shared-store coupling/locking concern from `spec-critique/R2-SECURITY-sec.md:61-64` is still not explicitly separated or locked. |
| M-5 | CLOSED | Registry secrets must live only in per-entry private Stores, with only metadata and `*_set` booleans in options, at `SCOPE-REVISION.md:240-245`; exact store names and clear/provider-switch/remove deletion are bound at `SCOPE-REVISION.md:368-375`. |
| M-6 | CLOSED | Status and diagnostics must avoid raw key material, secret predicates, and raw provider exceptions at `SCOPE-REVISION.md:220-222`; migration and `/solar_test` redaction extend this at `SCOPE-REVISION.md:247-257`; `solcast_site_id` is treated as sensitive at `SCOPE-REVISION.md:378-382`. |
| m-1 | CLOSED | Mandatory detached release signing is not required; the accepted closure is byte-equivalent CI comparison and empty-stub failure at `SCOPE-REVISION.md:184-188`. |
| m-2 | CLOSED | Build dependency path and lock policy are now explicit at `SCOPE-REVISION.md:265-269`. |
| m-3 | CLOSED | Secret pre-seed/cleanup leakage is closed by private-only registry-secret persistence at `SCOPE-REVISION.md:240-245` plus fail-closed secret-bearing write checks at `SCOPE-REVISION.md:247-251`. |
| m-4 | PARTIALLY-CLOSED | Restore/admin audit writes are secret-safe under `SCOPE-REVISION.md:247-251`, but the prior confirm/audit-field request at `spec-critique/R2-SECURITY-sec.md:90-92` still has no binding confirm parameter or durable audit field set in the R6-R9 text. |
| m-5 / AIK-7 | CLOSED | Correctly routed as shipped code at `spec-critique/SHIPPED-CODE-DEFECTS.md:41-45`; spec-side prompt boundaries are closed at `SCOPE-REVISION.md:215-218`. |
| R6-SEC-1 | CLOSED | Solar credential private-only persistence, provider-switch safety, and teardown are bound at `SCOPE-REVISION.md:240-245`; R8 remount secret-absence is bound at `SCOPE-REVISION.md:319-330`; exact store deletion is bound at `SCOPE-REVISION.md:368-375`. |
| R6-SEC-2 | CLOSED | Registry-derived secret inventory, fail-closed serialized write checks, and private `config_migration` Stores are required at `SCOPE-REVISION.md:247-251`. |
| R6-SEC-3 | CLOSED | The endpoint auth matrix is now closed for `/module_config`, `/config_registry`, `/pricelists`, `/solar_test`, and `/onboarding` at `SCOPE-REVISION.md:397-410`; the implementation brief repeats it at `docs/redesign_2026_07/IMPLEMENTATION-BRIEF-EN.md:176-190`. |
| R6-SEC-4 | CLOSED | `/solar_test` request shape is allow-listed and rejects unknown keys before outbound calls at `docs/redesign_2026_07/PLAN-3.6-SPEC.md:44-53`; R7.3 forbids forwarding raw bodies/log details at `SCOPE-REVISION.md:253-257`. |
| R8-SEC-1 | CLOSED | `/onboarding` GET/POST is in the closed admin-only matrix at `SCOPE-REVISION.md:397-407`; non-admin 403, unsupported methods, consistency, and secret/data absence tests are bound at `SCOPE-REVISION.md:409-411`; admin positive secret-absence testing is bound at `SCOPE-REVISION.md:412`. |
| R8-SEC-2 | CLOSED | `SCOPE-REVISION.md:398` removes the box-scoped `/pricelists` public-route exception; `SCOPE-REVISION.md:405` requires non-admin 403 with no priced data; `SCOPE-REVISION.md:413` requires any future public pricelist route to be boxless with its own matrix row. |

Prior verdict count: 17 CLOSED, 2 PARTIALLY-CLOSED, 0 OPEN.

## 2. New findings

| id | severity | `file:clause` | what is wrong | the falsification test that would catch it | the exact spec text that would fix it |
|---|---|---|---|---|---|
| No rows | - | `SCOPE-REVISION.md:397-413`; `docs/redesign_2026_07/IMPLEMENTATION-BRIEF-EN.md:176-192`; `docs/redesign_2026_07/PLAN-3.6-SPEC.md:121-129` | No new R9 security hole found. The R8 `/onboarding` auth gap is closed; `/pricelists` no longer has a public-route escape; the implementation brief carries the closed matrix. | Existing R9 tests cover authenticated non-admin refusal, unsupported methods, existing-vs-missing box consistency, secret sentinels, and admin positive remount state. | No security spec text needed in this round. |

## 3. Bucket routing

| bucket | findings |
|---|---|
| SPEC | C-1, M-1, M-2, M-3, M-4, M-5, M-6, m-1, m-2, m-3, m-4, R6-SEC-1, R6-SEC-2, R6-SEC-3, R6-SEC-4, R8-SEC-1, R8-SEC-2 |
| SHIPPED-CODE | C-2 / SEC-2 (`spec-critique/SHIPPED-CODE-DEFECTS.md:5-9`), m-5 / AIK-7 (`spec-critique/SHIPPED-CODE-DEFECTS.md:41-45`) |

No new SHIPPED-CODE finding is introduced by this R9 security pass.

## 4. What I could not establish

- No build, test suite, HA server check, or live UI verification was run, per slice instruction. This is a document/spec review.
- CLOSED on shipped-code rows means correctly routed to `spec-critique/SHIPPED-CODE-DEFECTS.md`; it does not claim the live code is fixed.
- M-4 and m-4 remain PARTIALLY-CLOSED because the secret-leak parts are closed, but no R9 text adds explicit shared-backup locking/separation or restore confirm/audit-field requirements.
