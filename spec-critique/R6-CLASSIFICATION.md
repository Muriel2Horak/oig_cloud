# R6 finding classification

| finding id | lens | severity | bucket | rationale | where fixed |
|---|---|---|---|---|---|
| AS-1 | anti-stub | CRITICAL | SPEC | R5 only checks shape, not release origin; a handcrafted file can still pass old task tests. | SCOPE-REVISION.md: R6.2 |
| AS-2 | anti-stub | MAJOR | SPEC | Plan 3.6 task 3 still relies on generated runtime data assumptions without enforcing full step-2/3 UI proof. | SCOPE-REVISION.md: R6.3 |
| AS-3 | anti-stub | CRITICAL | SPEC | R5.6 is not yet reflected in an English implementation brief for the remaining tasks. | SCOPE-REVISION.md: R6.10 |
| AS-4 | anti-stub | MAJOR | SPEC | Dashboard non-completion visibility was still only stated textually; no mandatory render assertion existed. | SCOPE-REVISION.md: R6.4 |
| AS-5 | anti-stub | MAJOR | SPEC | Plan 4 task 4 defines warning behavior as abstract and can be tested against logs only. | SCOPE-REVISION.md: R6.6 |
| AS-6 | anti-stub | MAJOR | SPEC | Plan 4 task 6 test can still pass for empty distributor objects. | SCOPE-REVISION.md: R6.2 |
| AS-7 | anti-stub | MAJOR | SPEC | Frontend contract can be validated only via isolated reader tests and misses production wizard mount. | SCOPE-REVISION.md: R6.4 |
| AS-8 | anti-stub | CRITICAL | SPEC | Script output and shipped release can diverge and still pass current checks. | SCOPE-REVISION.md: R6.2 |
| AS-9 | anti-stub | CRITICAL | SPEC | Wrong prices or missing tariff/value can slip in without explicit snapshot/value assertions. | SCOPE-REVISION.md: R6.3 |
| AS-10 | anti-stub | MINOR | SPEC | Build-only dependency policy lacks positive build file path and lock semantics. | SCOPE-REVISION.md: R6.3 |
| AS-11 | anti-stub | MINOR | SPEC | Task-5 cleanup follow-up is not assigned and can stall warning coverage. | SCOPE-REVISION.md: R6.11 |
| AS-12 | anti-stub | MAJOR | SPEC | Solar test can remain mocked and bypass real forecast provider fetch. | SCOPE-REVISION.md: R6.5 |
| AS-13 | anti-stub | MAJOR | SPEC | Step 2/3 values are not guaranteed to be saved to onboarding entry before finish. | SCOPE-REVISION.md: R6.7 |
| AS-14 | anti-stub | MAJOR | SPEC | `pricing` values are not guaranteed to flow into persisted settings. | SCOPE-REVISION.md: R6.7 |
| AS-15 | anti-stub | MAJOR | SPEC | Snapshot selection (`platí_od`) and stale warning rule are inconsistent, so UI and stored state can diverge. | SCOPE-REVISION.md: R6.3, R6.7 |
| AS-16 | anti-stub | MAJOR | SPEC | R5.6 brief language and implementation restatements are still missing in scope. | SCOPE-REVISION.md: R6.10 |
| AS-17 | anti-stub | CRITICAL | SPEC | Pricelist schema lacks required source metadata and expected-file path assertions. | SCOPE-REVISION.md: R6.2, R6.3 |
| AS-18 | anti-stub | MAJOR | SPEC | Distributor enum/fields/price model is underspecified for registry and persistence. | SCOPE-REVISION.md: R6.4 |
| AS-19 | anti-stub | MAJOR | SPEC | `POST /solar_test` has no structured payload contract or timezone/type guarantees. | SCOPE-REVISION.md: R6.5 |
| AS-20 | anti-stub | MAJOR | SPEC | Step state machine lacks explicit action matrix and transition ownership per step. | SCOPE-REVISION.md: R6.6 |
| AS-21 | anti-stub | MAJOR | SPEC | Missing-config warning target surface is still undefined in Plan 4 acceptance. | SCOPE-REVISION.md: R6.6 |
| AS-22 | anti-stub | MINOR | SPEC | `brief-lint` invocation/path is missing, so lint coverage is non-enforceable. | SCOPE-REVISION.md: R6.10 |
| SEC-1 | security | CRITICAL | SPEC | Migration backup Store is not required to be `private=True` with secret filtering. | SCOPE-REVISION.md: R6.1 |
| SEC-2 | security | CRITICAL | SHIPPED-CODE | `module_config` GET is currently non-admin-gated in shipped code, while POST is admin-only. | SHIPPED-CODE-DEFECTS.md |
| SEC-3 | security | MAJOR | SPEC | `/solar_test` auth and request-control behavior (rate-limit/error-disclosure) is underspecified. | SCOPE-REVISION.md: R6.5, R6.11 |
| SEC-4 | security | MAJOR | SPEC | `/pricelists` authz semantics are underspecified in current plan text. | SCOPE-REVISION.md: R6.3 |
| SEC-5 | security | MAJOR | SPEC | Merge/write invariants do not guarantee wholesale rollback semantics after partial migration. | SCOPE-REVISION.md: R6.1, R6.11 |
| SEC-6 | security | MAJOR | SPEC | Dead-key + migration backup share path risks overwrite and cross-feature coupling. | SCOPE-REVISION.md: R6.1 |
| SEC-7 | security | MAJOR | SPEC | Key-preserving path during task-5 cleanup can persist secrets in snapshot history. | SCOPE-REVISION.md: R6.1 |
| SEC-8 | security | MAJOR | SPEC | Diagnostics path can carry exposed secrets if not redacted. | SCOPE-REVISION.md: R6.9 |
| SEC-9 | security | MINOR | SPEC | Release artifact signature requirement is not scoped into deployment checks. | SCOPE-REVISION.md: R6.2 |
| SEC-10 | security | MINOR | SPEC | Build dependency file path for `openpyxl` pipeline is missing and not enforced. | SCOPE-REVISION.md: R6.3 |
| SEC-11 | security | MAJOR | SPEC | Pre-seed cleanup path can accidentally re-introduce or persist secret defaults. | SCOPE-REVISION.md: R6.1 |
| SEC-12 | security | MAJOR | SPEC | Restore service lacks explicit confirm/audit behavior and traceability fields. | SCOPE-REVISION.md: R6.11 |
| SEC-13 | security | MAJOR | SPEC | `ai_task` delegation verification path is incomplete and can return opaque failure class. | SCOPE-REVISION.md: R6.9, R6.12 |
| PERF-1 | perf | MINOR | SPEC | `load_pricelists` has no in-process cache plan and can parse every call. | SCOPE-REVISION.md: R6.11 |
| PERF-2 | perf | MINOR | SPEC | Pricelist size budget is missing. | SCOPE-REVISION.md: R6.3 |
| PERF-3 | perf | MINOR | SPEC | No loop-blocking timer test for JSON parse/load is defined. | SCOPE-REVISION.md: R6.11 |
| PERF-4 | perf | MINOR | SPEC | Build requirements path is underspecified in one explicit file contract. | SCOPE-REVISION.md: R6.3 |
| PERF-5 | perf | MINOR | SPEC | No CI gate verifies `openpyxl` is not pulled into runtime dependency surface. | SCOPE-REVISION.md: R6.3 |
| PERF-6 | perf | MINOR | SPEC | `/pricelists` endpoint lacks cache/ETag contract for immutable release data. | SCOPE-REVISION.md: R6.3, R6.11 |
| PERF-7 | perf | MINOR | SPEC | Immutable read policy for dataset is not tied to cache lifetime. | SCOPE-REVISION.md: R6.3 |
| PERF-8 | perf | MAJOR | SPEC | `/solar_test` path has no explicit timeout contract in current spec. | SCOPE-REVISION.md: R6.5 |
| PERF-9 | perf | MINOR | SPEC | Session lifecycle for outbound forecast calls is not specified. | SCOPE-REVISION.md: R6.5 |
| PERF-10 | perf | MINOR | SPEC | Repeated click behavior needs explicit throttle/failure contract. | SCOPE-REVISION.md: R6.5 |
| PERF-11 | perf | MINOR | SPEC | `/config_registry` is not defined as ETag-aware and can re-fetch noisily. | SCOPE-REVISION.md: R6.11 |
| PERF-12 | perf | MINOR | SPEC | Startup/home open still does extra `/module_config` fetches that should be bounded by cache policy. | SCOPE-REVISION.md: R6.11 |
| PERF-13 | perf | MINOR | SPEC | Pricing rendering remains in main bundle and can inflate cold-load cost. | SCOPE-REVISION.md: R6.12 |
| PERF-14 | perf | MINOR | SPEC | No chunk boundary for heavy pricing form path. | SCOPE-REVISION.md: R6.12 |
| PERF-15 | perf | MINOR | SPEC | Duplicate call path in cold open may increase latency without bounded dedupe proof. | SCOPE-REVISION.md: R6.11 |
| PERF-16 | perf | MINOR | SPEC | Registry field list generation is rebuilt every render without memoization proof. | SCOPE-REVISION.md: R6.12 |
| PERF-17 | perf | MAJOR | SPEC | Setup adds multiple synchronous Store writes and can add startup latency. | SCOPE-REVISION.md: R6.11 |
| PERF-18 | perf | MAJOR | SPEC | Transform execution path can become blocking despite setup-time run. | SCOPE-REVISION.md: R6.11 |
| PERF-19 | perf | MINOR | SPEC | Idempotent migration path still performs unnecessary I/O and journal writes. | SCOPE-REVISION.md: R6.11 |
| PERF-20 | perf | MINOR | SPEC | Build requirements file path and lock file are underspecified. | SCOPE-REVISION.md: R6.3 |
| PERF-21 | perf | MINOR | SPEC | There is no explicit release check that runtime manifest path excludes openpyxl. | SCOPE-REVISION.md: R6.3 |
| PERF-22 | perf | MINOR | SPEC | Output size floor/ceiling for JSON artifact is missing, so payload drift can be unnoticed. | SCOPE-REVISION.md: R6.2 |
| AIK-1 | aikeys | MAJOR | SHIPPED-CODE | No public `AiKeyStore` delete/clear API, so keys cannot be removed from store. | SHIPPED-CODE-DEFECTS.md |
| AIK-2 | aikeys | MAJOR | SHIPPED-CODE | Provider changes can keep stale keys in options via current flow. | SHIPPED-CODE-DEFECTS.md |
| AIK-3 | aikeys | MAJOR | SHIPPED-CODE | `/ai` stores key before verification, allowing unverified replacement. | SHIPPED-CODE-DEFECTS.md |
| AIK-4 | aikeys | MINOR | SHIPPED-CODE | Exception detail can be returned directly and risk key exposure in future regressions. | SHIPPED-CODE-DEFECTS.md |
| AIK-5 | aikeys | MAJOR | SHIPPED-CODE | `task` payload in `AiBackend` prompt assembly is free text. | SHIPPED-CODE-DEFECTS.md |
| AIK-6 | aikeys | MAJOR | SPEC | `validate_config` and D8 collector path lacks typed anonymized field collection + wire test. | SCOPE-REVISION.md: R6.8, R6.9 |
| AIK-7 | aikeys | MAJOR | SHIPPED-CODE | `ai_task` delegation branch is not verified and currently depends on uncertain runtime behavior. | SHIPPED-CODE-DEFECTS.md |
