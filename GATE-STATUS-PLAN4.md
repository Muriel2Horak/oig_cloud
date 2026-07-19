# GATE-STATUS: DEPLOY — tip b2e6f1aba

## Verdikt

- Doporučuji deploy z pohledu gate: oba předchozí blokery z commitu `08894182a` jsou vyřešené a změřené.
- Bloker 1, 2 backend failure na `5e314fe25`, byl zastaralý TESTS problém, ne produkční regres: R11.1 přidal admin gate pro `GET module_config`; dva testy stavěly request tak, že `get("hass_user")` vracel default, a gated view proto odpověděl 403.
- Fix je test-only commit `b2e6f1aba`: fake request vrací admin user pro klíč `hass_user`; změna má 4 vložené řádky.
- Backend měření: base `86ebc68ae` má `4354 passed, 28 skipped`; unpatched tip má `2 failed, 4412 passed, 28 skipped`; patched tip `b2e6f1aba` má `4414 passed, 28 skipped`; fail-set diff patched-tip vs base je prázdný.
- Bloker 2, frontend gate "not reproduced green", byl vyhodnocen jako NOT A REGRESSION. Předchozí red byl způsoben chybějícím `node_modules`, stejně chybějícím na tipu i baseline; po stejném `command npm ci` v obou worktree jsou unit testy i typecheck zelené.
- Frontend cesta ve staré gate byla chybná: `/repos/wt-p4-gate/www_v2` neexistuje; skutečný balík je `custom_components/oig_cloud/www_v2`.
- HA server nebyl kontaktován. Deploy nebyl proveden. Na `10.0.0.143` ani `ha.muriel-cz.cz` se nesahalo.

## Per-task evidence

| ukol | worker/model | commit | pushed | dukaz akceptace | skore |
|---|---|---|---|---|---|
| Task 2: transakční obnovitelná migrace | `plan-4-task-2-transactional-reco-5cae6e`/spark; fix `plan-4-task-2-fix-idempotent-mig-0c7da0`/codex; verify `plan-independent-base-vs-change-verif-0d8d76`/opus-2 | `485dfc910` | ano, v tipu `5e314fe25` | commit uvádí `private=True` Store, rollback bez zápisu při transform failu, restore při commit failu, idempotentní marker, `restore_last_backup()`; verify: base/change stejný fail-set na tehdejší bázi | run rc=0; score event nenalezen |
| Task 3: legacy/deprecation window | `plan-4-task-3-legacy-deprecation-785823`/minimax; transplant `plan-4-task-3-transplant-onto-ti-437993`/codex; bundle verify `integrate-independent-base-vs-change-verif-527750`/codex | `83e2deaa` | ano | commit uvádí `tests/test_config_deprecation.py`: base import error, change 5 passed | verifier rc=0; score event nenalezen |
| Task 4: author defaults removal, sensor-first, R5.5 warnings | `plan-4-task-4-author-defaults-re-3d2840`/minimax; transplant `plan-4-task-4-transplant-onto-ti-7d7300`/codex | `83e2deaa` | ano | commit uvádí `tests/test_author_defaults_removed.py`: base 11 failed, change 11 passed; R5.5 visible warning included | earlier R11-rest score trivial but incomplete; final row score nenalezen |
| Task 5: verified-dead-key removal | `plan-4-task-5-verified-dead-key-b75f1f`/codex | `83e2deaa` | ano | commit uvádí `tests/test_dead_keys_removed.py`: base 3 failed, change 3 passed | run rc=0; score event nenalezen |
| Task 6a: maintainer-side `build_pricelists.py` | `build-plan-4-task-6a-maintainer-side-b-55bde8`/spark | `a6b9a5f` | ano | 8 nových testů `tests/test_build_pricelists.py` fail na pre-change stromu, po změně pass; "ERU", "POZE" a "Kc/A/mesic" zachovány; `openpyxl` jen v dev requirements | run rc=0; score event nenalezen |
| Task 6b: pricing registry + `/pricelists` API | `plan-4-task-6b-6c-pricing-regist-9ee0fe`/spark; verify `plan-verify-plan-4-task-6b-6c-bundle-72be93`/opus | `485dfc910` | ano | commit uvádí distributor enum z datasetu, tariff selector, confirmed-price fields, admin-gated GET `/api/oig_cloud/{box}/pricelists`; pre-change fail: config registry AssertionError a 3 API AttributeError | score: trivial rework, grounded, in_scope, honest, complete |
| Task 6c: frontend pricing render test | `plan-4-task-6b-6c-pricing-regist-9ee0fe`/spark | `485dfc910` | ano | commit uvádí render test pro non-empty distributor/tariff, prefilled price a stale-year warning; finální frontend gate: po stejném `command npm ci` v `custom_components/oig_cloud/www_v2` prošel tip `08894182a` s `61 files / 1466 tests passed` a `npx tsc --noEmit` rc 0; baseline `86ebc68ae` prošla s `60 files / 1465 tests passed` a `npx tsc --noEmit` rc 0 | frontend gate potvrzen jako NOT A REGRESSION |
| Task 7: classified explicit migration errors | `plan-4-task-7-explicit-migration-b75cd2`/minimax; gap fix `integrate-plan-4-merge6-gap-fix-complete-t-6c5f36`/codex | `83e2deaa` | ano | commit uvádí `tests/test_config_migration_explicit_errors.py`: base import error, change 9 passed | meziverze merge6 měla score substantial, grounded=1, in_scope=1, honest=0, complete=0; finální merge8 verify rc=0 |
| Task 8: legacy shim removal from `module_config` REST path | `plan-4-task-8-legacy-shim-remova-d34d79`/minimax; merge verify `integrate-independent-base-vs-change-verif-527750`/codex | `83e2deaa` | ano | commit uvádí implementaci, ale neuvádí samostatný pre-change FAIL test pro Task 8 | nedoloženo samostatným score eventem |
| Task 9: migration e2e + anti-stub smoke | `plan-4-task-9-redo-migration-e2e-fa1695`/codex; transplant `plan-4-task-9-transplant-onto-ti-f67396`/codex | nedoloženo v `git log 86ebc68ae..HEAD` | neprokázáno | fleet říká delivered, ale v commit range není samostatný commit ani jasný changed-file podpis Task 9 | score event nenalezen |
| Task 10: full gate base-vs-change | `plan-4-task-10-full-gate-base-vs-36f39e`/codex; fix/verify `plan-4-final-gate-apply-fix-roun-984807`/gpt-5.5; frontend base worker `plan-4-final-gate-frontend-base-113888`/gpt-5.5 | nedoloženo v commit range | neprokázáno | fleet říká delivered na tipu `83e2deaa`; finální gate na `b2e6f1aba`: backend base `4354 passed, 28 skipped`, unpatched tip `2 failed, 4412 passed, 28 skipped`, patched tip `4414 passed, 28 skipped`, fail-set diff patched-tip vs base prázdný; frontend po `npm ci` zelený na tipu i baseline | score event nenalezen |
| R11.1: admin gate on GET `module_config` | `task-r11-1-module-config-admin-gate-r-767e7f`/sonnet; review `review-security-anti-stub-review-of-r11-20a087`/gpt-5.5 | `c9ffe654` | ano | commit uvádí pre-change FAIL: non-admin dostal 200 místo 403; po změně fail-closed 403 a bez GPS/site ID v těle | run rc=0; score event nenalezen |
| R11.2: `AiKeyStore` deletion | `plan-4-remaining-r11-defects-r11-f3b9d3`/gpt-5.5; R11-rest `plan-4-r11-rest-repair-module-co-c2e7eb`/minimax | `83e2deaa` | ano | commit uvádí zahrnutí R11.2, ale neuvádí samostatný pre-change FAIL důkaz pro deletion lifecycle | score: substantial rework, grounded, in_scope, honest, incomplete |
| R11.3: do not replace valid key with unverified material | `task-r11-1-module-config-admin-gate-r-767e7f`/sonnet | `c9ffe654` | ano | commit uvádí pre-change FAIL: uložený key byl přepsán kandidátem při verify failu; po změně se kandidát promotuje až po success | run rc=0; score event nenalezen |
| R11.4: provider change clears stale key state | `plan-4-remaining-r11-defects-r11-f3b9d3`/gpt-5.5 | `83e2deaa` | ano | commit uvádí zahrnutí R11.4, ale neuvádí samostatný pre-change FAIL důkaz | score: substantial rework, grounded, in_scope, honest, incomplete |
| R11.5: constrained task enum | `plan-4-remaining-r11-defects-r11-f3b9d3`/gpt-5.5 | `83e2deaa` | ano | commit uvádí zahrnutí R11.5, ale neuvádí samostatný pre-change FAIL důkaz | score: substantial rework, grounded, in_scope, honest, incomplete |
| R11.6: classified errors, no raw exception text | `plan-4-remaining-r11-defects-r11-f3b9d3`/gpt-5.5; gap fix `integrate-plan-4-merge6-gap-fix-complete-t-6c5f36`/codex | `83e2deaa` | ano | commit uvádí R11.6 a `tests/test_config_migration_explicit_errors.py`; pro `POST /ai` raw-exception případ není v commit message samostatný pre-change FAIL důkaz | score: substantial rework na meziverzi; gap fix rc=0 |
| Fix round 1: 4 review defects | `review-plan-4-fix-round-1-4-review-defe-1bb030`/gpt-5.5; transplant `review-transplant-plan-4-fix-round-1-2-e22cd9`/codex; verify `plan-independent-base-vs-change-verif-edcc5c`/codex | `5e314fe` | ano | secret stripping migration backup, admin gate on config_registry, `MigrationError` surfaced, AI verify error classified; 4 nové testy fail na unchanged tree | score: rework=none, grounded, in_scope, honest, complete |
| Fix round 2: Repairs issue mount | `plan-4-fix-round-2-mount-config-4d4c87`/codex; transplant `review-transplant-plan-4-fix-round-1-2-e22cd9`/codex; verify `plan-independent-base-vs-change-verif-edcc5c`/codex | `5e314fe` | ano | `config_migration_failed` issue mounted on Repairs surface, cs/en translations and `strings.json`; commit uvádí pre-change FAIL at `tests/test_init_extra.py:348` | score: rework=none, grounded, in_scope, honest, complete |

## Baseline vs final suite

### Backend

- Baseline commit `86ebc68ae`: `4354 passed, 28 skipped` — 0 failed.
- Unpatched tip: `2 failed, 4412 passed, 28 skipped`.
- Unpatched failing set:
  - `tests/test_boiler_f5_config_settings.py::test_module_config_boiler_get_returns_new_keys`
  - `tests/test_boiler_f5_config_settings.py::test_module_config_boiler_get_defaults_when_missing`
- Patched tip `b2e6f1aba`: `4414 passed, 28 skipped` — 0 failed.
- Fail-set diff patched-tip vs base: prázdný.
- Interpretace: dva backend failures na unpatched tipu byly zastaralé test requesty po R11.1 admin gate, ne produkční defekt; patch je pouze v testech.

### Frontend

- Stará gate použila chybnou cestu `/repos/wt-p4-gate/www_v2`; skutečný balík je `custom_components/oig_cloud/www_v2`.
- Předchozí red byl chybějící `node_modules`, absent identicky na tipu i baseline.
- Po stejném `command npm ci` v obou worktree:
  - tip `08894182a`: `npm run test:unit` exit 0, `61 files / 1466 tests passed`; `npx tsc --noEmit` exit 0.
  - base `86ebc68ae`: `npm run test:unit` exit 0, `60 files / 1465 tests passed`; `npx tsc --noEmit` exit 0.
- Interpretace: frontend gate není regrese.

## Lint a types

- `flake8 --max-line-length=120` a `mypy --ignore-missing-imports --explicit-package-bases` na souboru z test-only fixu mají identické findings před a po patchi.
- Pre-existing findings na tomto souboru zůstávají: unused imports na řádcích 19/21/22, E402 na řádcích 28/36; `_DummyEntry` missing attributes.
- Z tohoto fixu nevzniká nová lint/type finding evidence.
- Starší full-project mypy caveat zůstává z předchozí gate: absolutní mypy stav nebyl zelený, ale chyba byla inherited proti baseline.

## Pre-change FAIL evidence

| ukol | pre-change FAIL dukaz |
|---|---|
| Task 2 | doloženo: `tests/test_config_migration.py` 9 tests ImportError na missing `config_migration`; další Task 2 fail důkazy v fix roundu na `tests/test_config_migration.py:176` |
| Task 3 | doloženo: `tests/test_config_deprecation.py` base import error |
| Task 4 | doloženo: `tests/test_author_defaults_removed.py` base 11 failed |
| Task 5 | doloženo: `tests/test_dead_keys_removed.py` base 3 failed |
| Task 6a | doloženo: všech 8 `tests/test_build_pricelists.py` fail na pre-change tree, module absent |
| Task 6b | doloženo: config registry AssertionError a 3 `OIGCloudPricelistsView` AttributeError |
| Task 6c | nedoloženo pro klientský render test; commit uvádí existenci testu a tehdejší pass, ale ne jeho pre-change FAIL |
| Task 7 | doloženo: `tests/test_config_migration_explicit_errors.py` base import error |
| Task 8 | nedoloženo v commit message |
| Task 9 | nedoloženo v commit messages v rozsahu |
| Task 10 | nedoloženo v commit messages v rozsahu; final gate evidence doložena až touto opravnou gate |
| R11.1 | doloženo: assert 200 místo 403 |
| R11.2 | nedoloženo samostatně v commit message |
| R11.3 | doloženo: stored key overwritten |
| R11.4 | nedoloženo samostatně v commit message |
| R11.5 | nedoloženo samostatně v commit message |
| R11.6 | částečně doloženo pro migration explicit errors; nedoloženo samostatně pro raw `POST /ai` exception text |
| Fix round 1 | doloženo: 4 nové testy fail na unchanged tree at `tests/test_ai_rest.py:273`, `tests/test_config_migration.py:176`, `tests/test_ha_rest_api_views.py:1064`, `tests/test_init_extra.py:348` |
| Fix round 2 | doloženo jako součást stejných 4 pre-change failů; Repairs mount zejména `tests/test_init_extra.py:348` |

## Providers avoided

- Během final gate práce byli vynechaní:
  - kimi: quota exhausted; ve starší `fleet-status` evidenci 0 %, red, reset `2026-07-20T21:34:45Z`.
  - zai: quota exhausted; ve starší `fleet-status` evidenci 0 %, red, reset `2026-07-21T05:33:29Z`.
  - claude-3: quota exhausted; ve starší `fleet-status` evidenci 0 %, red, reset `2026-07-21T07:00:00Z`.
  - claude-second: near-exhausted; ve starší `fleet-status` evidenci 4 %, yellow.
  - claude: near-exhausted; ve starší `fleet-status` evidenci 16 %, yellow.
- Další starší stav: opencode-go 11.5 %, yellow; codex 67 %, green; minimax 60 %, green.
- Praktický dopad: pozdější implementační, verifikační a integrační práce byly routované mimo vyčerpané poskytovatele; gpt-5.5 potvrdil backend fix i frontend non-regression.

## Neustanoveno

- Task 6c: pre-change FAIL klientského render testu není doložen; doložené je finální zelené frontend gate měření po `npm ci`.
- Task 8: pre-change FAIL evidence není v commit message.
- Task 9: fleet delivered, ale není doložen commit v `86ebc68ae..HEAD`; acceptance a pre-change fail nejsou v commit messages.
- Task 10: původní fleet delivered evidence na `83e2deaa` zůstává commitově neprokázaná; finální gate na `b2e6f1aba` je doložená samostatně.
- R11.2, R11.4, R11.5: commit uvádí zahrnutí, ale ne samostatné pre-change FAIL důkazy.
- R11.6: samostatný raw-exception fail pro `POST /ai` není v commit message doložen.
- R12.2: per-entry backup store je částečně vyřešen, ale locking migrace/restore/dead-key strip path zůstává otevřený podle `SCOPE-REVISION.md`.
- R12.3: restore nemá explicitní confirm argument ani durable audit field podle `SCOPE-REVISION.md`.
- Mypy absolutně není zelený; známá chyba je inherited, ale stále existuje.
- HA server nebyl kontaktován a nic nebylo deploynuto; tento dokument je gate verdict, ne záznam deploye.
