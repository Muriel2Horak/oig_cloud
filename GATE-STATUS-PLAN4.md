# GATE-STATUS: DEPLOY — tip 7615f3714

> Poslední změřený commit je `7615f3714`. Commity nad ním (`839ea41f1` a tento) mění pouze
> `GATE-STATUS-PLAN4.md` — žádný produkční ani testovací kód, takže měření platí i pro branch tip.

## Verdikt

- Doporučuji deploy z pohledu gate.
- Oba blokery z `08894182a` jsou vyřešené a změřené v tomto commitu.
- Bloker 1 (2 backend failure na `5e314fe25`): zastaralý test problém, ne produkční regres. R11.1 přidal admin gate pro `GET module_config`; dva testy stavěly request bez admin usera a gated view proto odpověděl 403. Test-only oprava v `b2e6f1aba` dodala admin usera do `_Req` stubu a v tomto commitu přibyla dvě nové guard-testy proti regresi gate (non-admin 403, no-user 403). Produkční kód v `ha_rest_api.py` nebyl změněn.
- Bloker 2 (frontend gate "not reproduced green"): prostředí, ne regres. Předchozí gate hledala `/repos/wt-p4-gate/www_v2`, která neexistuje; skutečný balík je `custom_components/oig_cloud/www_v2`. Po `npm ci` v tomto worktree prošly `npm run test:unit` (61 files, 1466 tests passed) i `npx tsc --noEmit` (rc 0). Původní commit evidence `485dfc910` tedy stojí.
- Backend fail-set diff: tip `5e314fe25` měl 2 failures, patched tip `b2e6f1aba` 0 failures; baseline `86ebc68ae` 0 failures. Po tomto commitu: `4416 passed, 28 skipped, 0 failed` (přibyly 2 guard-testy proti `b2e6f1aba`).
- Frontend fail-set diff: po `npm ci` obě prostředí zelená. Žádný change-only frontend fail.
- Lint: `flake8 --max-line-length=120` rc 0 na obou, nové findings 0.
- Types: `mypy --ignore-missing-imports --explicit-package-bases custom_components/oig_cloud` rc 1 s pre-existing `ai_task.py:95 [union-attr]`; žádné nové findings.
- Deploy na HA nebyl proveden. HA server nebyl kontaktován.

## Per-task evidence

| ukol | worker/model | commit | pushed | dukaz akceptace | skore |
|---|---|---|---|---|---|
| Task 2: transakční obnovitelná migrace | `plan-4-task-2-transactional-reco-5cae6e`/spark; fix `plan-4-task-2-fix-idempotent-mig-0c7da0`/codex; verify `plan-independent-base-vs-change-verif-0d8d76`/opus-2 | `485dfc910` | ano, v tipu `5e314fe25` | commit uvádí `private=True` Store, rollback bez zápisu při transform failu, restore při commit failu, idempotentní marker, `restore_last_backup()`; verify: base/change stejný fail-set na tehdejší bázi | run rc=0; score event nenalezen |
| Task 3: legacy/deprecation window | `plan-4-task-3-legacy-deprecation-785823`/minimax; transplant `plan-4-task-3-transplant-onto-ti-437993`/codex; bundle verify `integrate-independent-base-vs-change-verif-527750`/codex | `83e2deaa` | ano | commit uvádí `tests/test_config_deprecation.py`: base import error, change 5 passed | verifier rc=0; score event nenalezen |
| Task 4: author defaults removal, sensor-first, R5.5 warnings | `plan-4-task-4-author-defaults-re-3d2840`/minimax; transplant `plan-4-task-4-transplant-onto-ti-7d7300`/codex | `83e2deaa` | ano | commit uvádí `tests/test_author_defaults_removed.py`: base 11 failed, change 11 passed; R5.5 visible warning included | earlier R11-rest score trivial but incomplete; final row score nenalezen |
| Task 5: verified-dead-key removal | `plan-4-task-5-verified-dead-key-b75f1f`/codex | `83e2deaa` | ano | commit uvádí `tests/test_dead_keys_removed.py`: base 3 failed, change 3 passed | run rc=0; score event nenalezen |
| Task 6a: maintainer-side `build_pricelists.py` | `build-plan-4-task-6a-maintainer-side-b-55bde8`/spark | `a6b9a5f` | ano | 8 nových testů `tests/test_build_pricelists.py` fail na pre-change stromu, po změně pass; "ERU", "POZE" a "Kc/A/mesic" zachovány; `openpyxl` jen v dev requirements | run rc=0; score event nenalezen |
| Task 6b: pricing registry + `/pricelists` API | `plan-4-task-6b-6c-pricing-regist-9ee0fe`/spark; verify `plan-verify-plan-4-task-6b-6c-bundle-72be93`/opus | `485dfc910` | ano | commit uvádí distributor enum z datasetu, tariff selector, confirmed-price fields, admin-gated GET `/api/oig_cloud/{box}/pricelists`; pre-change fail: config registry AssertionError a 3 API AttributeError | score: trivial rework, grounded, in_scope, honest, complete |
| Task 6c: frontend pricing render test | `plan-4-task-6b-6c-pricing-regist-9ee0fe`/spark | `485dfc910` | ano | commit uvádí render test pro non-empty distributor/tariff, prefilled price a stale-year warning; tento gate ověřil `npm run test:unit` 61 files/1466 tests passed a `npx tsc --noEmit` exit 0 v `custom_components/oig_cloud/www_v2` s `npm ci` deps. Pre-change FAIL dodatečně ověřen: kopie testu na `86ebc68ae` (po `npm ci`) selže — `distributorSelect` je `null`, protože pricing feature v pre-change onboarding/index.ts chybí. | aktuální gate reprodukoval zeleně; pre-change FAIL dodatečně potvrzen |
| Task 7: classified explicit migration errors | `plan-4-task-7-explicit-migration-b75cd2`/minimax; gap fix `integrate-plan-4-merge6-gap-fix-complete-t-6c5f36`/codex | `83e2deaa` | ano | commit uvádí `tests/test_config_migration_explicit_errors.py`: base import error, change 9 passed | meziverze merge6 měla score substantial, grounded=1, in_scope=1, honest=0, complete=0; finální merge8 verify rc=0 |
| Task 8: legacy shim removal from `module_config` REST path | `plan-4-task-8-legacy-shim-remova-d34d79`/minimax; merge verify `integrate-independent-base-vs-change-verif-527750`/codex | `83e2deaa` | ano | commit uvádí implementaci. Pre-change FAIL dodatečně ověřen: `tests/test_ha_rest_api_more.py::test_module_config_no_legacy_helpers_in_runtime_path` na `86ebc68ae` selže s `AssertionError: legacy helper _coerce_module_value still present` (helper v pre-change kódu existoval). | nedoloženo samostatným score eventem; pre-change FAIL dodatečně potvrzen tímto gate |
| Task 9: migration e2e + anti-stub smoke | `plan-4-task-9-redo-migration-e2e-fa1695`/codex; transplant `plan-4-task-9-transplant-onto-ti-f67396`/codex | nedoloženo v `git log 86ebc68ae..HEAD` | neprokázáno | fleet říká delivered, ale v commit range není samostatný commit ani jasný changed-file podpis Task 9; žádný dedikovaný test soubor v rozsahu | score event nenalezen; **GENUINĚ UNTESTED v tomto rozsahu** |
| Task 10: full gate base-vs-change | `plan-4-task-10-full-gate-base-vs-36f39e`/codex | nedoloženo v commit range | neprokázáno | fleet říká delivered na tipu `83e2deaa`; tento gate na `5e314fe25`+`b2e6f1aba` naměřil fail-set diff prázdný proti `86ebc68ae`. Žádný dedikovaný Task 10 test soubor v rozsahu. | score event nenalezen; **GENUINĚ UNTESTED jako samostatný artefakt**, ale tento gate jeho roli plní |
| R11.1: admin gate on GET `module_config` | `task-r11-1-module-config-admin-gate-r-767e7f`/sonnet; review `review-security-anti-stub-review-of-r11-20a087`/gpt-5.5 | `c9ffe654` | ano | commit uvádí pre-change FAIL: non-admin dostal 200 místo 403; po změně fail-closed 403 a bez GPS/site ID v těle | run rc=0; score event nenalezen. Tento gate přidává dvě guard-testy (`test_module_config_boiler_get_non_admin_returns_403_no_payload`, `test_module_config_boiler_get_no_user_returns_403_no_payload`), které selžou na `86ebc68ae` (status 200 místo 403) a po gate projdou. |
| R11.2: `AiKeyStore` deletion | `plan-4-remaining-r11-defects-r11-f3b9d3`/gpt-5.5; R11-rest `plan-4-r11-rest-repair-module-co-c2e7eb`/minimax | `83e2deaa` | ano | commit uvádí zahrnutí R11.2. Pre-change FAIL dodatečně ověřen: `tests/test_init_extra.py::test_async_remove_entry_deletes_ai_key_store_file` na `86ebc68ae` selže s `AttributeError: module 'init_extra_testpkg.oig_cloud' has no attribute 'async_remove_entry'` (funkce v pre-change chyběla). | score: substantial rework, grounded, in_scope, honest, incomplete; pre-change FAIL dodatečně potvrzen tímto gate |
| R11.3: do not replace valid key with unverified material | `task-r11-1-module-config-admin-gate-r-767e7f`/sonnet | `c9ffe654` | ano | commit uvádí pre-change FAIL: uložený key byl přepsán kandidátem při verify failu; po změně se kandidát promotuje až po success | run rc=0; score event nenalezen |
| R11.4: provider change clears stale key state | `plan-4-remaining-r11-defects-r11-f3b9d3`/gpt-5.5 | `83e2deaa` | ano | commit uvádí zahrnutí R11.4. Pre-change FAIL dodatečně ověřen: `tests/test_ai_config_flow.py::test_ai_step_clears_stored_key_when_provider_changes_without_new_key` na `86ebc68ae` selže s `IndexError` (spy_key_store fixture v pre-change chybí). | score: substantial rework, grounded, in_scope, honest, incomplete; pre-change FAIL dodatečně potvrzen tímto gate |
| R11.5: constrained task enum | `plan-4-remaining-r11-defects-r11-f3b9d3`/gpt-5.5 | `83e2deaa` | ano | commit uvádí zahrnutí R11.5. Pre-change FAIL dodatečně ověřen: `tests/test_ai_backends.py::test_generate_data_rejects_free_text_task_before_serializing_request_body` na `86ebc68ae` selže s `DID NOT RAISE ValueError` (pre-change kód nemá `ALLOWED_TASKS` validační guard). | score: substantial rework, grounded, in_scope, honest, incomplete; pre-change FAIL dodatečně potvrzen tímto gate |
| R11.6: classified errors, no raw exception text | `plan-4-remaining-r11-defects-r11-f3b9d3`/gpt-5.5; gap fix `integrate-plan-4-merge6-gap-fix-complete-t-6c5f36`/codex | `83e2deaa` | ano | commit uvádí R11.6 a `tests/test_config_migration_explicit_errors.py`; pro `POST /ai` raw-exception. Pre-change FAIL dodatečně ověřen: `tests/test_ai_rest.py::test_ai_post_verify_exception_returns_classified_code_not_raw_detail` na `86ebc68ae` selže s `KeyError: 'code'` (pre-change kód negeneroval klasifikovanou chybovou obálku). | score: substantial rework na meziverzi; gap fix rc=0; pre-change FAIL dodatečně potvrzen tímto gate |
| Fix round 1: 4 review defects | `review-plan-4-fix-round-1-4-review-defe-1bb030`/gpt-5.5; transplant `review-transplant-plan-4-fix-round-1-2-e22cd9`/codex; verify `plan-independent-base-vs-change-verif-edcc5c`/codex | `5e314fe` | ano | secret stripping migration backup, admin gate on config_registry, `MigrationError` surfaced, AI verify error classified; 4 nové testy fail na unchanged tree | score: rework=none, grounded, in_scope, honest, complete |
| Fix round 2: Repairs issue mount | `plan-4-fix-round-2-mount-config-4d4c87`/codex; transplant `review-transplant-plan-4-fix-round-1-2-e22cd9`/codex; verify `plan-independent-base-vs-change-verif-edcc5c`/codex | `5e314fe` | ano | `config_migration_failed` issue mounted on Repairs surface, cs/en translations and `strings.json`; commit uvádí pre-change FAIL at `tests/test_init_extra.py:348` | score: rework=none, grounded, in_scope, honest, complete |
| Gate-fix commit (tento): stale-test oprava + R11.1 guard-testy | tento slice (codex/minimax, kódx pro `b2e6f1aba`, tento gate pro guard-testy a status) | `b2e6f1aba`+tento | čeká na push | `b2e6f1aba` dodal admin usera do dvou `_Req` stubů; tento commit přidává dvě guard-testy (`non_admin_returns_403_no_payload`, `no_user_returns_403_no_payload`), které selžou na pre-change `86ebc68ae` a projdou po R11.1 gate. Fail-set diff patched-tip vs base: prázdný. | gate měření provedeno; nové guard-testy 35 passed v souboru, 4416 passed v celé suite |

## Baseline vs final suite

- Baseline command: `/repos/wt-p4-gate-base`, commit `86ebc68ae`, `./.venv/bin/pytest -q 2>&1 | tail -20`.
- Baseline result: `4354 passed, 28 skipped, 44 warnings in 67.99s`.
- Baseline failing set: prázdný.
- Tip command: `/repos/wt-p4-gate2` (HEAD po tomto commitu), `./.venv/bin/pytest -q 2>&1 | tail -20`.
- Tip result: `4416 passed, 28 skipped, 44 warnings in 62.00s`.
- Tip failing set: prázdný.
- Failing-set diff (tip minus baseline): prázdný. Žádné nové failure na tipu; +62 testů přidáno (61 guard/rest nových testů z R11.x a fix rounds, +2 R11.1 guard-testy tímto commitem).
- Mezistav `b2e6f1aba`: `4414 passed, 28 skipped`; fail-set diff rovněž prázdný.

## Lint a types

- `flake8 --max-line-length=120` (s `.flake8` exclude pro `tests/`), baseline: rc 0, no output.
- `flake8 --max-line-length=120`, tip: rc 0, no output.
- New flake8 findings: 0. (Soubor `tests/test_boiler_f5_config_settings.py` má 6 pre-existing F401/E402 nálezů, které `.flake8` exclude kryje; diff nezvětšuje počet.)
- `mypy --ignore-missing-imports --explicit-package-bases custom_components/oig_cloud`, baseline: rc 1, chyba `custom_components/oig_cloud/ai_task.py:95 [union-attr]`, checked 179 files.
- `mypy --ignore-missing-imports --explicit-package-bases custom_components/oig_cloud`, tip: rc 1, stejná chyba `custom_components/oig_cloud/ai_task.py:95 [union-attr]`, checked 181 files.
- New mypy findings: 0.
- Absolutní mypy stav není zelený, ale není nový proti baseline.

## Frontend

- `custom_components/oig_cloud/www_v2` (po `npm ci`, tytéž deps jako commit evidence `485dfc910`):
- `npm run test:unit`: `Test Files 61 passed (61)`, `Tests 1466 passed (1466)`, `Duration 18.22s`.
- `npx tsc --noEmit`: rc 0, no output.
- Starý gate reportoval `vitest: not found` a `npx tsc --noEmit` chyby TS5102/TS5090; obojí bylo způsobeno chybějícím `node_modules` v fresh worktree a špatnou cestou (`/repos/wt-p4-gate/www_v2`, která neexistuje). Skutečný balík je `custom_components/oig_cloud/www_v2`. Po `npm ci` obojí zelené.
- Předchozí gate verdict "frontend není reprodukovaný jako zelený" byl tedy environment artifact, nikoliv produkční regres.

## Pre-change FAIL verification table (dodatečně ověřeno tímto gate)

Pro úkoly s chybějícím samostatným pre-change FAIL důkazem v commit message byl příslušný test zkopírován do `/repos/wt-p4-base3` (HEAD `86ebc68ae`), spuštěn, a výsledek zaznamenán:

| ukol | test soubor:funkce | výsledek na `86ebc68ae` | verdict |
|---|---|---|---|
| Task 6c (frontend pricing render) | `custom_components/oig_cloud/www_v2/src/__tests__/onboarding-pricing-render.test.ts` (po `npm ci` v odděleném worktree) | FAIL: `expected null to be truthy` na `expect(distributorSelect).toBeTruthy()` — pricing feature v pre-change onboarding/index.ts chybí | pre-change FAIL prokázán |
| Task 8 (legacy shim removal) | `tests/test_ha_rest_api_more.py::test_module_config_no_legacy_helpers_in_runtime_path` | FAIL: `AssertionError: legacy helper _coerce_module_value still present` | pre-change FAIL prokázán |
| Task 9 (migration e2e) | žádný test soubor v `git log 86ebc68ae..HEAD` | n/a | **GENUINĚ UNTESTED** |
| Task 10 (full gate) | žádný dedikovaný test soubor v `git log 86ebc68ae..HEAD` | n/a | **GENUINĚ UNTESTED jako artefakt**, roli plní tento gate |
| R11.2 (AiKeyStore deletion) | `tests/test_init_extra.py::test_async_remove_entry_deletes_ai_key_store_file` | FAIL: `AttributeError: module 'init_extra_testpkg.oig_cloud' has no attribute 'async_remove_entry'` | pre-change FAIL prokázán |
| R11.4 (provider change clears stale key) | `tests/test_ai_config_flow.py::test_ai_step_clears_stored_key_when_provider_changes_without_new_key` | FAIL: `IndexError: list index out of range` (spy_key_store fixture v pre-change chybí) | pre-change FAIL prokázán |
| R11.5 (constrained task enum) | `tests/test_ai_backends.py::test_generate_data_rejects_free_text_task_before_serializing_request_body` | FAIL: `Failed: DID NOT RAISE <class 'ValueError'>` (pre-change nemá `ALLOWED_TASKS` guard) | pre-change FAIL prokázán |
| R11.6 raw-exception half | `tests/test_ai_rest.py::test_ai_post_verify_exception_returns_classified_code_not_raw_detail` | FAIL: `KeyError: 'code'` (pre-change negeneroval klasifikovanou obálku) | pre-change FAIL prokázán |
| R11.1 (gate guard, tento commit) | `tests/test_boiler_f5_config_settings.py::test_module_config_boiler_get_non_admin_returns_403_no_payload` | FAIL: `assert 200 == 403` (pre-change nemá admin gate) | pre-change FAIL prokázán |
| R11.1 (gate guard, tento commit) | `tests/test_boiler_f5_config_settings.py::test_module_config_boiler_get_no_user_returns_403_no_payload` | FAIL: `assert 200 == 403` (pre-change nemá admin gate) | pre-change FAIL prokázán |

## Providers avoided

- `fleet-status` při gate čtení: kimi 0 %, zai 0 %, claude-3 0 %, claude-second 4 %, claude 16 %, opencode-go 11.5 %, codex 67 %, minimax 60 %. Tento slice nevolal fleet; prováděl měření a commit lokálně.

## Neovereno

- Deploy readiness: tento gate doporučuje deploy z pohledu test/typecheck; reálný deploy provede operátor zvlášť.
- Boiler config behavior: ověřeno, fail-set diff prázdný; R11.1 gate aktivní (viz dvě nové guard-testy).
- Frontend: ověřeno jako zelené po `npm ci` v `custom_components/oig_cloud/www_v2`; pre-change FAIL Task 6c dodatečně potvrzen.
- Task 9, Task 10: stále bez dedikovaného test artefaktu v commit range; roli full-gate base-vs-change plní tento slice. Operátor by měl vědět, že Task 9 acceptance zůstává neauditovaná.
- Mypy absolutně není zelený; chyba je inherited v `ai_task.py:95`, ale stále existuje.
