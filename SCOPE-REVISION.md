# F1 Scope Revision — 2026-07-17 (rozhodnuto s Martinem) — FINÁLNÍ, všechny body uzavřeny

Kontext: review F1-DESIGN. Martin zpochybnil "vzdálenou správu". Rozebráno, rozsah upřesněn a UZAVŘEN.

## ROZHODNUTO (autoritativní pro plány 3/4 + revizi F1-DESIGN)
1. **`tuning` na dálku → ZAHODIT.** Heuristiky baterie/bojleru zůstávají lokálně v kódu.
2. **`pricelists` (ČEZ/EG.D/PRE z ERÚ) → PŘIBALENÝ soubor v každém release.** Žádný runtime fetch.
3. **`ai_models` (seznam + fallback pořadí) → PŘIBALENÝ v release.** Fallback chain zůstává.
4. **`remote_config/loader.py` runtime fetch = ZRUŠEN.** remote_config = bundled dataset. Mizí
   signature/MITM/cache/rollback/expiry + jejich testy + §9 řádek "GitHub nedostupný". Ruší CRITICAL #1.
5. **AI = PONECHÁNO jako dobrovolný pomocník** (ne podmínka běhu dashboardu): extract_pricelist
   (ověření ceníku 2 modely křížem) + validate_config (číselné vztahy, BEZ lokace). Prompty anonymní.
6. **GATE = MĚKKÝ PRŮVODCE.** Žádný tvrdý zámek dashboardu ani pro nové instalace. Onboarding =
   dobrovolný guided flow spustitelný z Nastavení + banner pro nedokončený setup. K1 gate se ruší.
7. **AI onboarding krok ① MUSÍ mít přímý registrační odkaz + očíslovaný postup ke klíči.** Ověřeno:
   - Groq: console.groq.com → registrace (email/Google/GitHub, bez karty) → console.groq.com/keys →
     [Create API Key] → zkopíruj (jen jednou). Klíč prefix `gsk_`. Free: 30k TPM / 30 RPM / 14400 RPD.
   - NVIDIA: build.nvidia.com → registrace (bez karty) → build.nvidia.com/settings/api-keys →
     [Generate API Key]. Klíč prefix `nvapi-`. Free: 1000 kreditů (až 5000 na požádání), 40 RPM.
   Pole na vložení + [Ověřit].
8. **Provider = ROVNOCENNÁ volba (Groq / NVIDIA / uživatelův HA ai_task), NE "Groq doporučeno".**
   Důvod: Groq omezil i Martinův legitimní účet (ToS restriction) — hard-default na Groq je křehký.
9. **AI backend = VLASTNÍ v OIG (rozhodnuto po deep-research wf_4cc8c9c5-e88).** OIG dodá vlastní
   `AITaskEntity` (feature `GENERATE_DATA`, metoda `_async_generate_data(...) -> GenDataTaskResult`)
   + `OpenAiCompatBackend` volající Groq/NVIDIA přímo s klíčem uživatele. ŽÁDNÁ závislost na HACS
   pluginu (žádný z existujících neumí AI Task + custom endpoint spolehlivě; jediný kandidát
   skye-harris/hass_local_openai_llm je single-maintainer a na Groq/NVIDIA netestován). ai_task se
   nedá instalovat samostatně → OIG musí entitu dodat tak jako tak. Jedna instalace pro uživatele.
   Martinův HA má ai_task službu ale žádný LLM za ní → primární cesta = přímý klíč.

## VŠE UZAVŘENO — žádné otevřené body.

## DŮSLEDKY PRO PLÁNY (přeškálovat)
- Plan 3: MĚKKÝ onboarding wizard (3 kroky) + registry-driven formuláře + AITaskEntity/OpenAiCompatBackend
  (Groq/NVIDIA přímo) + provider rovnocenná volba + registrační odkazy/postup ke klíči v kroku ① +
  UX díry (dropdown transparency, provider→klíč conditional visibility/validace).
- Plan 4: cleanup (mrtvé klíče, autorovy defaulty, de-hardcode senzor-first — ale heuristiky LOKÁLNĚ,
  ne remote tuning) + migrace + bundled dataset (pricelists+models, žádný fetch).
- Plan 2 (basic fields) beze změny.
- Malý samostatný fix: GET module_config → admin-gate (nebo redakce GPS pro ne-adminy). Schváleno.
- F1-DESIGN.md revidovat: §2 AI runtime (bundled models, ne remote), §3 remote_config→bundled dataset,
  §4 remote_config loader ZRUŠIT, §5 gate→měkký, doplnit registrační postup + provider rovnocennost.

---

## Rozhodnutí 2026-07-18 (po autoritativním průzkumu — viz docs/redesign_2026_07/F1-STATUS-MAP.md)

Kontext: mapa stavu ukázala 2 rozhodnutí HOTOVO, 5 NAHRAZENO, 16 ČÁSTEČNĚ, 8 CHYBÍ — a že ze
9 věcí, které F1 dluží, 4 nemá v žádném plánu vlastníka.

**R1 — Pořadí: Plán 4 PRVNÍ, pak celý wizard.** Ceníkový dataset (ERÚ) zůstává Plánu 4. Plán 3.6
se odkládá až za něj a pak dodělá OBA kroky ②③ najednou nad hotovým datasetem. Ruší se tím spor
mezi SCOPE-REVISION a AK-3 v PLAN-3.6-SPEC.

**R2 — AI úlohy D8 se DODĚLAJÍ, dostanou vlastní plán.** \"Načíst ceník\" (extract_pricelist) a
\"Ověřit klíč a stáhnout předpověď\" — dnes neexistují (ai/tasks.py chybí), takže AI v F1 nemá
uživatelskou funkci. Plán vznikne AŽ PO Plánu 4 (\"Načíst ceník\" potřebuje dataset). Do jeho
rozsahu patří i fallback chain (P1, bundled seznam modelů) a senzor oig_ai_status (F1-DESIGN §3).

**Výsledná sekvence F1:** Plán 4 → Plán 3.6 (wizard celý) → nový plán D8 (AI úlohy).
Chat \"Poradit se\" zůstává F2 (nikdy nebyl v F1), aktivní řízení F3.

**R2-OPRAVA (2026-07-18, Martin) — ceny NEJSOU z AI.** Původní znění R2 přebíralo formulaci D8
\"Načíst ceník\" z brainstormu 2026-07-09, tedy PŘED tím, než ji **O3 (2026-07-10) zrušilo**:
ERÚ publikuje strojově čitelný XLSX se všemi D-sazbami → dataset vrstva 0 se generuje
**maintainer-side jednou ročně** (DECISIONS.md O3 \"zjednodušení P4!\"). F1-DESIGN krok 3 to
potvrzuje: distributor + sazba → předvyplnění z pricelists datasetu → uživatel potvrdí, a
[Ověřit proti aktuálnímu ceníku] je **samostatné volitelné AI tlačítko**, ne zdroj cen.

Důsledky:
- **Krok 3 Ceny nemá ŽÁDNOU závislost na AI.** Kritická cesta: bundled dataset → sekce pricing
  v registru → REST → předvyplnění formuláře → potvrzení uživatelem.
- **Nový AI plán je MIMO kritickou cestu** a zmenšuje se na: validate_config, VOLITELNÉ ověření
  ceníku křížem, fallback chain (P1, bundled ai_models), senzor oig_ai_status.
- \"Načíst ceník\" jako AI úloha se **NEIMPLEMENTUJE** — nahrazeno O3.

**R3 — Plán 4 se rozšiřuje o FE kontrakt datasetu.** Task 6 dnes dodává jen serverovou stranu
(bundled soubory + Python reader). Doplnit, jinak zůstane krok 3 zablokovaný i po Plánu 4:
1. sekce pricing v config_registry.py (distributor jako enum z datasetu, sazba, potvrzovaná
   cenová pole),
2. REST GET /api/oig_cloud/BOX/pricelists — distributoři, sazby, ceny + rok platnosti
   (kvůli varování u zastaralého datasetu),
3. render/klientské důkazy dle VERIFICATION-STANDARD (endpoint vrací použitelná data, sekce
   v registru existuje) — ne jen kontraktový test readeru.

**R4 — Architektura cenového datasetu (rozhodnuto 2026-07-18 po 2 průzkumech).**

*Zdroj:* **ERÚ cenový výměr**, ne ČEZ. Ověřeno: ČEZ sice publikuje ceny pro všechna 3 distribuční
území a shodují se s ERÚ na haléř, ALE (a) podmínky užití cez.cz/cezdistribuce.cz **výslovně
zakazují automatizované vytěžování**, (b) je to jen přetisk ERÚ, (c) reaguje na dodatky se
zpožděním ~2 dny a URL schéma je mezi roky nestabilní. ČEZ = pouze ruční křížová kontrola.

*Dva výměry, ne jeden:* 14/2025 (distribuce NN, sazby D01d–D61d) + 13/2025 (systémové služby,
POZE, OTE/ERÚ). **Dodatky visí na 13/2025** (13 → 15/2025 → 1/2026, tam je vynulování POZE od
1.1.2026); na 14/2025 nesahá nic. Sledovat jen 14/2025 = ceny o ~15 % mimo.

*Distribuce k uživateli:* **JSON přibalený v release, ŽÁDNÉ stahování za běhu.** HACS distribuci
řeší. Ruší se dřívější úvaha o runtime fetchi z našeho GitHubu.

*Platnost místo dodatkových řetězů:* JSON obsahuje pole období, každé s \`platí_od\` a KOMPLETNÍ
sadou hodnot — build skript **rozpustí dodatky do hotových snímků**. Aplikace vezme poslední
snímek, kde \`platí_od <= dnes\`. Umožňuje **vydat verzi v předstihu** (ERÚ vydá v listopadu →
release v prosinci → integrace přepne sama 1.1.). Aplikace neskládá dodatky.

*Zastarání:* je-li nejnovější snímek starší než rok, integrace to uživateli oznámí (\"ceník je
z roku X, zkontroluj aktualizaci\"). Bez sítě to líp nejde a je to přijatelné — ceny jsou pro
plánovač orientační a uživatel je v průvodci potvrzuje.

*Nástroj:* \`scripts/build_pricelists.py\` v tomto repu — **maintainer-side, NE runtime**. Jeho
závislosti (openpyxl) nesmí skončit v manifestu integrace. Vlastní requirements pro build.
Použitelný i cizími vývojáři: čisté CLI, popsaný formát JSON, poznámka o původu dat.

*ŽÁDNÉ LLM v pipeline.* XLSX je strojově čitelná mřížka → openpyxl, deterministicky, testovatelně,
zdarma v CI. Dřívější zjištění \"na ceníky je potřeba LLM křížem\" platilo pro **PDF** (pypdf
rozhází sloupce) — my PDF neparsujeme. AI je tím mimo kritickou cestu úplně.

*Požadavky na skript:* hledat podle textu (názvy listů/sloupců), NIKDY natvrdo pozice řádků —
formát se mezi roky mění (2024/2025 .xls, 2026 .xlsx, jiné názvy a pořadí listů). Při driftu
**spadnout nahlas**, nikdy nevydat data potichu. Kontrolní testy: známé hodnoty, přítomnost všech
DSO a sazeb, alarm při skoku > 30 %. Zapsat původ (URL, datum, hash).

*Dvě pasti do implementace (z průzkumu):* (1) **DPH** — v ceníku je tučně hodnota S DPH, v závorce
BEZ DPH; záměna = 21% chyba. (2) **POZE** u domácností je **Kč/A/měsíc**, ne Kč/MWh (495 Kč/MWh je
zákonný strop, ne řádek sazby). Navíc: 12,87 Kč/měsíc nesíťová infrastruktura NENÍ \"4 Kč ERÚ +
zbytek OTE\" — je to 1,61 + 1,38 operátor trhu, 5,88 Elektroenergetické datové centrum, 4,00 ERÚ.

---

## R5 — Binding acceptance criteria added after pre-production review (2026-07-18)

Two independent critics found that Plan 4 as written would ship **another stub**: Task 6's test
passes on `{"year": 2026, "distributors": {"cez": {}, "egd": {}, "pre": {}}}` — empty dicts, no
tariff, no price. Three acceptance blocks would pass against the current stub. These criteria are
**binding on the implementation of Plan 4 Task 6 and Plan 3.6** and override any weaker wording in
the plan documents.

**R5.1 — Build script `scripts/build_pricelists.py` (maintainer-side, NOT a runtime dependency).**
Given versioned XLSX fixtures from the regulator "ERÚ", the script MUST emit the documented JSON
schema containing complete `valid_from` snapshots with every DSO and every tariff, plus
`source_url`, `fetched_at` and a SHA-256 per source file. It MUST exit non-zero and write NO JSON
when: a required sheet or column is missing or renamed, the schema does not match, tariff coverage
is incomplete, or any price moves more than 30 % against the previous snapshot without an explicit
override flag. Fixture-anchored assertions are required: a bold cell maps to `price_incl_vat`, a
parenthesised cell to `price_excl_vat`; "POZE" is stored with unit "Kč/A/měsíc", never "Kč/MWh".
Sheets and columns MUST be located by text match, never by fixed row or column offsets. Build
dependencies (openpyxl) MUST NOT appear in the integration manifest.

**R5.2 — Task 6 also delivers the frontend contract (this is R3, which the plan omits).**
(1) a `pricing` section in `config_registry.py` whose distributor enum derives from the bundled
dataset, plus tariff selector and confirmed-price fields; (2) an authenticated
`GET /api/oig_cloud/{box}/pricelists` returning distributors, tariffs, prices and the validity
year; (3) a **client render test** that fetches that endpoint and asserts non-empty distributor and
tariff selects, at least one prefilled price, and the stale-year warning element. A Python-side
reader test alone does NOT satisfy Task 6.

**R5.3 — Wizard step 2 solar test needs a real endpoint, named here.** No browser-callable forecast
path exists today. Plan 3.6 MUST specify and deliver an admin-authenticated
`POST /api/oig_cloud/{box}/solar_test` that validates the values currently shown in the form,
triggers a real forecast fetch, and returns tomorrow's kWh or a classified user-facing error. The
test MUST assert that clicking the test button invokes that endpoint with the current wizard
values — a mocked result alone is insufficient.

**R5.4 — Completion persistence must be proven through the UI, not by test code.** The test MUST
render the real wizard, fill the steps, click the finish control, and assert the UI itself issued
`complete_step`; it MUST fail if completion is posted directly by the test. After remount, the
persisted done/skipped state must be visible.

**R5.5 — Missing-configuration warnings must be visible, not log-only.** Plan 4 Task 4's acceptance
MUST mount the affected surface with missing GPS/capacity and assert a visible warning with a
recovery action alongside the `unavailable` state. A log line does not satisfy it.

**R5.6 — English for delegated artifacts.** `VERIFICATION-STANDARD.md` and this scope document are
authored in Czech for the operator. Implementer agents have zero conversation history, so each
implementation brief MUST carry an English restatement of the rules it depends on; national terms
stay in the original, in quotes (enforced by `brief-lint`).

## R6 — Round-1 closure requirements for remaining hard findings (2026-07-18)

**R6.1 — Migration backups must be private and must never persist option secrets.**
- During Plan 4 migration, any backup payload written by `config_migration` MUST be stored with `private=True` and MUST remove keys in `_SECRET_FIELDS` before write.
- It must fail closed if a backup write attempt includes an API key or other secret field, with no plaintext fallback to `entry.options`.
- Falsification test: seed options with `solar_forecast_api_key`, run `run_migration`, and then verify the backup payload loaded from `Store(..., private=True)` does not include `solar_forecast_api_key`.

**R6.2 — Released pricelist JSON must be a byte-equivalent build artifact, not a manual stub.**
- `scripts/build_pricelists.py` output must be the only source of truth for `remote_config/data/pricelists.json`; CI must compare canonical byte output to checked-in release bytes and fail on any mismatch.
- The same script must export `year`, all required `distributors`, every required tariff, and all required `price_fields` in every snapshot; any missing distributor/tariff/value is a hard failure.
- Numeric floors and drift checks must be enforced: if price coverage drops below minimum row counts or a field changes >30% without explicit override, test must fail.
- Falsification test: replace the released file with `{"year":2026,"distributors":{"cez":{},"egd":{},"pre":{}}}` and assert CI fails before merge.

**R6.3 — Pricelist runtime consumption must match the released schema exactly.**
- `GET /api/oig_cloud/{box}/pricelists` must return bundled snapshot data from `remote_config/data/pricelists.json` only, including `distributors`, `tariffs`, confirmed price fields, `unit`, and `valid_from`/`stale_warning` state.
- `Plan 3.6` must use this endpoint in step 3 with real DOM assertions (distributor select count > 0, tariff select count > 0, at least one prefilled price input, stale-year warning element when year < current year).
- Falsification test: remove one tariff from the release or drop a `Kč/A/měsíc` POZE unit and assert step 3 render test fails before test suite passes.

**R6.4 — Plan 3.6 completion and persistence is observable in UI, not only REST contracts.**
- Step 2 and Step 3 must only change state via actual wizard controls: user clicks `next`, `skip`, `complete_step`, and `finish` in the rendered component, and the component writes `done/skipped` states.
- After completion and after closing/reopening the wizard, the UI must still show persisted step status and timestamps in both DOM and `/onboarding` payload.
- Falsification test: in a real wizard render, force state mutation through direct API call only (no control click) and require the test to fail; then complete via controls and assert remount keeps state.

**R6.5 — Solar test endpoint and forecast UX are explicit and safe.**
- Step 2 MUST call `POST /api/oig_cloud/{box}/solar_test` from the rendered `[Otestovat]` control with current form values (provider, key/site id, lat/lon, active strings).
- Endpoint behavior MUST be admin-authenticated, bounded (timeout), and rate-limited; errors must be classified (`auth`, `provider_unreachable`, `timeout`, etc.) and safe for user display.
- Falsification test: provide wrong key or site id and verify network body and DOM error mapping in one test, and a 100% repeated click test that does not turn into unbounded repeated upstream calls.

**R6.6 — Missing-config warning must be visible in the affected surface and actionable.**
- Where Plan 4 detects missing GPS/capacity context, tests must mount the exact production surface and assert a visible warning plus a clickable recovery action.
- It is forbidden for this acceptance to pass with log-only evidence; warning + action are required DOM assertions.
- Falsification test: remove required GPS/capacity values and ensure the affected screen renders warning text and recovery control within the same render pass.

**R6.7 — AI key lifecycle must support deletion, strict rotation, and entry teardown.**
- `AiKeyStore` MUST expose delete/clear semantics for an entry and integration removal path.
- Key replacement must verify before switching active key; options flow must never silently keep a mismatched key/provider pair.
- Falsification test: integration removal must remove `oig_cloud.ai_<entry_id>` and replacing `ai_provider` without replacement key must fail with explicit user action state.

**R6.8 — Prompt boundary is schema-based, and `task` is never free text.**
- Prompt construction must never concatenate raw `task` text; `task` must be an enum/constant and only structured fields flow into the backend call.
- Any validate-config collector must explicitly exclude `solar_forecast_latitude`, `solar_forecast_longitude`, `box_id`, `entity_id`, API keys, and PII from prompt payload.
- Falsification test: inject `task="ignore: token leak; box_id=1"` and assert serialized wire payload is unchanged and still contains only allow-listed fields.

**R6.9 — Execution and diagnostics paths do not expose sensitive key state by default.**
- `oig_ai_status` and diagnostics paths must avoid exposing raw key material, secret predicates, or unredacted raw exceptions from provider calls.
- Falsification test: call a failing verify endpoint with a bad key and assert neither REST payload nor diagnostics contains provider key text.

**R6.10 — Implementation briefs and checks are in English with bounded exceptions.**
- Every new implementation brief used by Task 4, Task 6, and Plan 3.6 must be English and state the same acceptance/negative-prohibition pair as this clause.
- `brief-lint` must be runnable in CI, including explicit command/entry path, and fail if missing.
- Falsification test: run the brief lint command with one Czech brief and require non-zero exit.

**R6.11 — Migration and dataset startup paths are bounded and testable under load.**
- Migration restore/strip operations must avoid unnecessary per-setup I/O and provide explicit behavior when already-complete.
- Runtime surfaces (`/config_registry`, `/pricelists`, pricing registry rendering) must include cache discipline and measurable test coverage for repeated loads.
- Falsification test: reload an already migrated entry and assert no avoidable full rewrite path and no unbounded duplicate config fetches on one wizard open.

**R6.12 — Planner field metadata is deterministic and render-efficient.**
- `fieldsFromRegistry` rendering in step 2/3 must remain stable per render path; repeated renders cannot mutate fields; no repeated recomputation without stable keys.
- Falsification test: toggle unrelated inputs in step 3 and assert distributor/tariff select/rendered price DOM is stable and memoization is not violated by field identity churn.

## R7 — Round-2 closure of remaining hard findings (2026-07-18)

### R7.1 — Close R6-SEC-1: private-only solar credential persistence and provider-switch safety
- **Binding requirement:** All registry fields with `secret=True` (`solar_forecast_api_key`, `solcast_api_key`, and any `FIELD_REGISTRY` secret alias) MUST be persisted only in per-entry `Store(..., private=True)`. `entry.options` MUST hold only non-secret metadata and `*_set` booleans.
- Provider switch without replacement key MUST either fail with explicit user-action state or clear the inactive provider secret.
- Integration removal MUST clear every per-entry credential store copy **and** the migration backup copy for secret fields.
- **Observable user outcome:** after switching provider without replacement secret, and after integration removal, no secret keys are visible in `entry.options`, and no active forecast call uses an inactive secret.
- **Falsifier (seeded):** create entry with `solar_forecast_api_key=leak-me`, switch provider to solcast without replacement key, then remove integration; assert `entry.options`, migration backup JSON, and diagnostic logs contain no `leak-me`; active forecast status remains valid or is explicitly non-admin.

### R7.2 — Close R6-SEC-2: fail-closed secret writes in migration and diagnostics paths
- **Binding requirement:** migration-secret inventory is derived from `FIELD_REGISTRY` entries with `secret=True` plus legacy aliases, not only `_SECRET_FIELDS`. Before every backup, journal, audit, and diagnostics write, the implementation serializes payload and fails closed if any secret key or secret value is present.
- **Binding requirement:** every `config_migration` store construction is `Store(..., private=True)`.
- **Observable user outcome:** migration failures cannot leak secret text into backup/journal/audit payloads or logs.
- **Falsifier (seeded):** force a transform failure whose serialized exception includes `leak-me`; assert migration backup + journal + audit + diagnostics have no `solar_forecast_api_key`, `solcast_api_key`, or `leak-me`.

### R7.3 — Close AKEY-R6-001: `/solar_test` secrecy is classified-only
- **Binding requirement:** Logs, REST payloads, diagnostics, and DOM-visible errors for `/solar_test` MUST carry only classified error codes and redacted provider names. They MUST NOT carry any solar credential, key prefix, provider request URL, `Authorization` header, request body, or raw upstream exception string.
- **Binding requirement:** this applies to both Forecast.Solar and Solcast paths.
- **Observable user outcome:** failing `/solar_test` displays user-level code and hides full secret/URL/error details while still surfacing actionable reason.
- **Falsifier (seeded):** inject failing Forecast.Solar and Solcast responses with `solar_forecast_api_key="fs_secret_123456789"` and `solcast_api_key="sc_secret_123456789"` plus verbose exception text; assert logs, REST body, diagnostics, and DOM contain none of the secret text, full URL, or raw exception.

### R7.4 — Close R6 anti-stub CRITICAL in section-2: production dashboard must be proven in production DOM
- **Binding requirement (AK-5):** production dashboard render requires both primary dashboard content and navigation presence in DOM; `grandfathered` view MUST NOT show onboarding blocker.
- **Binding requirement (AK-5):** pending onboarding must not block core dashboard rendering.
- **Observable user outcome:** the dashboard test mount shows `[data-testid=dashboard-primary]` and normal nav, with no onboarding blocker for grandfathered user state.
- **Falsifier (seeded):** mounting the production dashboard with pending onboarding while replacing content with an empty shell or showing unexpected onboarding blocker fails the route-level assertion.

### R7.5 — Close AS-10: explicit build environment and lock policy for pricing dataset
- **Binding requirement:** `scripts/build_pricelists.py` uses the explicit build requirement files `scripts/requirements-build.txt` and `scripts/requirements-build.txt.lock`, and build execution uses pinned hashes from the lock file.
- **Binding requirement:** build bootstrap command is explicit (`python -m pip install --require-hashes -r scripts/requirements-build.txt`) and must be documented alongside failure rule when locks diverge.
- **Observable user outcome:** release-maintainer pipeline fails if hashes/files in lock contract are not satisfied before build output is generated.
- **Falsifier (seeded):** remove one locked hash or pin entry and assert build verification fails before runtime validation.

### R7.6 — Close AS-15: unify stale-warning snapshot rule
- **Binding requirement:** one rule only: select the newest bundled snapshot by `valid_from <= now`, and show warning iff `snapshot.valid_from.year < current_year`.
- **Binding requirement:** this exact rule is referenced once in `R6`-scope and `PLAN-3.6-SPEC.md:AK-3`, and only this rule drives stale behavior.
- **Observable user outcome:** opening wizard with snapshot year `2026` in 2026 shows no stale warning; opening with `2025` snapshot in 2026 shows the warning consistently in UI and API.
- **Falsifier (seeded):** fixture with latest snapshot year `current_year` must not render stale warning; fixture with previous-year snapshot must always render it.

### R7.7 — Close AS-13: save and reload Solar step state before completion
- **Binding requirement:** before `complete_step` or `finish`, Step-2 save request MUST include and persist all solar form keys from `fieldsFromRegistry(registry,'solar')` (provider, credential field, site-id, latitude, longitude, and active-string kWp/tilt/azimuth fields).
- **Binding requirement:** Step-2 values MUST be restored from persisted config on remount before wizard completion.
- **Observable user outcome:** user can set solar form fields, leave the step, remount wizard, and continue with pre-filled Step-2 values.
- **Falsifier (seeded):** set solar `latitude` and `solar_forecast_api_key`, close wizard, remount, and assert both values are absent.

### R7.8 — Close AS-14: save and reload pricing fields before completion
- **Binding requirement:** before `complete_step` or `finish`, Step-3 save request MUST include and persist all pricing keys from `fieldsFromRegistry(registry,'pricing')` (distributor, tariff, confirmed price fields).
- **Binding requirement:** Step-3 form values MUST be restored from persisted config on remount before completion.
- **Observable user outcome:** chosen distributor/tariff and prefilled price remain visible after close/remount before finish.
- **Falsifier (seeded):** select a distributor/tariff and prefill at least one confirmed price, then remount without finish and assert persisted values are missing.

### R7.9 — Close AS-11: bind Task-5 warning follow-up ownership and acceptance
- **Binding requirement:** `Task-5 warning coverage` has explicit owner and follow-up plan, with named task, owner, and acceptance test for warning coverage and recovery action.
- **Binding requirement:** deferred coverage is explicit in this scope branch and cannot be silently closed in the current round.
- **Observable user outcome:** a concrete acceptance test name exists for Task-5 warning coverage with owner before completion.
- **Falsifier:** if Task-5 warning coverage is unowned or has no acceptance test, scope review fails.

### R7.10 — Close M-2: decide and test `/pricelists` auth with non-admin refusal
- **Binding requirement:** `/pricelists` is admin-only for `GET` (or explicitly documented public route), and endpoint auth matrix is explicit.
- **Binding requirement:** implementer test for authenticated non-admin refusal on `/module_config`, `/config_registry`, `/pricelists`, and `/solar_test`, with unsupported-method assertions and non-admin response consistency.
- **Observable user outcome:** non-admin user cannot access priced data and receives uniform refusal behavior.
- **Falsifier (seeded):** fuzz GET calls for four routes as non-admin and assert no success path exists.

### R7.11 — Close AKEY-R6-004: explicit cross-provider fallback consent
- **Binding requirement:** fallback is within user-selected provider by default. `ai_task` ↔ backend fallback and Groq ↔ NVIDIA cross-provider fallback require an explicit stored consent flag and user-visible disclosure.
- **Binding requirement:** `docs/redesign_2026_07/F1-DESIGN.md:57-59` fallback behavior is overridden and superseded by this explicit boundary.
- **Observable user outcome:** provider failure without consent returns classified fallback refusal and sends no prompt to other provider backends.
- **Falsifier (seeded):** set provider to `ai_task` and force failure plus missing consent; assert no outbound call to Groq/NVIDIA and a refusal code is surfaced.

### R7.12 — Close AKEY-R6-003: replacement solar key is verified before activation
- **Binding requirement:** a newly submitted solar key must pass `/solar_test` successfully before becoming active.
- **Binding requirement:** failed or skipped verification leaves previous active credential untouched.
- **Binding requirement:** provider switches requiring different credential material fail unless replacement credential is present and verified in flow.
- **Observable user outcome:** replacing active key with invalid candidate preserves previous forecast status, and user receives explicit action-required state.
- **Falsifier (seeded):** with known-good active key, submit bad replacement and assert old active key remains; `/onboarding` and forecast status do not change.

### R7 rejected findings
- **No findings rejected in this round.**

## R8 — Round-3 closeout (2026-07-18)

### R8.1 — Replace reversed Step-2/Step-3 falsifiers (replaces R7.7/R7.8; closes R7-AS-NEW-1, AS-13, AS-14, AKEY-R7-001)
- **Supersession statement:** `R8.1` replaces both falsifiers in `R7.7` and `R7.8` with positive remount assertions.
- **Binding requirement (R7.7):** on remount, Step-2 persistence MUST include non-secret solar fields from `fieldsFromRegistry(registry, 'solar')` (`solar_forecast_provider`, `solar_forecast_mode`, `solar_forecast_latitude`, `solar_forecast_longitude`, active-string keys, and `solcast_*` conditional fields where applicable). Secret fields MUST NOT be returned or prefilled in UI.
- **Binding requirement (secret remount behavior):** remount may expose only `*_set` booleans for credential fields and blank password controls with a `"configured"` placeholder; raw secret text must not be rendered.
- **Binding requirement (R7.8):** on remount, Step-3 persistence MUST include `fieldsFromRegistry(registry, 'pricing')` outputs (distributor, tariff, confirmed-price family) and remain visible in rendered controls.
- **Binding requirement:** after successful Step-2 and Step-3 save, `/api/oig_cloud/{box}/onboarding` payload must include required status/timestamps + non-secret payload fields and must exclude raw `solar_forecast_api_key` and `solcast_api_key`.
- **Observable user outcome:** a user can save Step-2/Step-3 values in production onboarding, reopen through the live launch action, and continue with pre-filled non-secret values present.
- **Falsifier (seeded, must fail on stub implementation):**
  - seed `solar_forecast_api_key="fs_secret_123456789"`, `solcast_api_key="sc_secret_123456789"`, plus non-secret Step-2 values, save Step-2, remount via launch path, and assert the secret strings are absent from DOM, `entry.options`, `/onboarding` request/response, and saved draft state; seeded non-secret values are present.
  - seed pricing fields plus distributor + tariff, save Step-3, remount via launch path, and assert seeded pricing values are present; missing values fail the clause.
  - assert the first occurrence of any secret value in rendered `<oig-onboarding-wizard>` content triggers a failure.
- **Binding point:** `custom_components/oig_cloud/www_v2/src/ui/app.ts` (`<oig-app>` route mount), `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/index.ts` (`<oig-onboarding-wizard>`, `[data-testid="wizard-steps"]`, `button[data-step="solar"]`, `button[data-step="pricing"]`, `[data-testid="wizard-content"]`), `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/onboarding-data.ts` (`/onboarding` GET/POST).

### R8.2 — Production onboarding launch is mandatory (closes CRITICAL 2, AS-7, AS-21, AS-5)
- **Binding requirement:** AK-1 through AK-4 must be tested only through `oig-app` production mount + real launch event, not via isolated fixture.
- **Binding requirement:** launch entry points are: `<oig-onboarding-banner>` in `oig-app` or `<oig-settings>` button `[data-testid="launch-onboarding"]`, and route assertion must require `<oig-onboarding-wizard>` with `open` transition in the same production DOM.
- **Observable user outcome:** replacing launch implementation with a static settings-link/empty screen leaves the clause failing because `<oig-onboarding-wizard>` is not mounted and Step-2/Step-3 controls are not reachable via wizard nav.
- **Falsification:** assert `<oig-onboarding-banner>` is absent only for grandfathered users; for pending state users, dispatching `launch-onboarding` must open `<oig-onboarding-wizard>` and expose wizard step nav + `[data-testid="wizard-content"]`.
- **Binding point:** `custom_components/oig_cloud/www_v2/src/ui/app.ts` (mount route), `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/index.ts` (wizard shell), `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/banner.ts` (banner trigger path).

### R8.3 — Warning surface and route selector are explicitly production-only
- **Binding requirement:** AK-4 and AS-5 assertions must reference production selectors in `oig-app`: `oig-onboarding-banner`, `oig-tabs` presence, and open dashboard content under `<main>`.
- **Observable user outcome:** a test cannot claim warning coverage without validating visibility and recovery action on a real dashboard route (or explicit grandfathered exception).
- **Falsification:** if warning coverage is asserted only from mock component paths or settings-only cards, clause fails.
- **Binding point:** `custom_components/oig_cloud/www_v2/src/ui/app.ts` + `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/banner.ts`.

### R8.4 — Brief-lint command/path is explicit (closes AS-22 via SHIPPED-CODE)
- **Route:** routed to `spec-critique/SHIPPED-CODE-DEFECTS.md` for implementation (no runnable entry point exists in this round).
- **Owner:** `operator / merge-guard maintainer`.
- **Binding requirement:** CI/verification command and path are required in one place and must fail if the brief language rule is violated.
- **Fallback action:** this round records `AS-22` as SHIPPED-CODE with a hard requirement to add a runnable lint step and CI call.

### R8.5 — Task-5 warning follow-up ownership closes AS-11
- **Binding requirement:** `Task-5 warning coverage` has explicit owner, follow-up plan, acceptance-test name, and production surface.
- **Required fields to bind:**
  - Owner: `Round-3 implementation lead`
  - Task: `Task-5 warning coverage`
  - Follow-up plan: add/repair warning recovery-path production test and link to AK-5
  - Acceptance test name: `onboarding-warning-recovery.spec.ts`
- **Observable user outcome:** task has owner and acceptance name in docs before merge; missing values fail clause.
- **Binding point:** `docs/redesign_2026_07/IMPLEMENTATION-BRIEF-EN.md` §7 (R7 mapping) and `SCOPE-REVISION.md` lines naming this task.

### R8.6 — Stale rule precedence and deterministic clock injection (closes AS-15)
- **Binding requirement:** `R4` "newest snapshot older than one year" text is superseded for onboarding warning by `R7.6` + `snapshot.valid_from.year < current_year`.
- **Binding requirement:** tests must inject clock via explicit override path (timezone-aware now provider) and assert determinism for 2026 vs 2025 snapshots.
- **Observable user outcome:** one-year boundary behavior is stable regardless of locale offset, and no contradictory year checks remain.
- **Falsification:** with fixed clock `2026-06-15T00:00:00Z`, fixture with `valid_from=2026-01-01` must hide stale warning and fixture `2025-12-01` must show it.
- **Binding point:** `SCOPE-REVISION.md:R7.6`, `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/index.ts` warning/step rendering path.

### R8.7 — Exact credential store names and teardown semantics (closes AKEY-R7-002)
- **Binding requirement:** solar AI and solar credential stores MUST be exact:
  - `oig_cloud.ai_<entry_id>` for AI store
  - `oig_cloud.solar_<entry_id>` for solar store
  and both MUST be created with `private=True`.
- **Binding requirement:** clear, provider-switch, and entry removal MUST delete both stores; neither store may collide with `oig_cloud.migration_backup_<entry_id>`.
- **Observable user outcome:** stale credentials cannot be recovered from backup/collision paths after clear/switch/remove.
- **Falsification:** monkeypatch store construction for both stores, seed keys in each, call clear/provider-switch/remove, then assert exact private store keys are deleted and migration backup key-space has no secret.
- **Binding point:** backend Store construction paths in `custom_components/oig_cloud/ai/key_store.py`, `custom_components/oig_cloud/config/steps.py`, `custom_components/oig_cloud/onboarding/state.py`.

### R8.8 — `solcast_site_id` classification is fixed (closes AKEY-R7-003)
- **Binding requirement:** `solcast_site_id` is classified as sensitive account/site identifier.
- **Binding requirement:** it follows the same secrecy lifecycle as solar secret fields (`private=True` storage, redact in `/solar_test` user-facing payloads, exclusion from AI prompt collector, diagnostics, logs, and raw request URLs).
- **Observable user outcome:** no user-facing UI text, prompt collector payload, diagnostics artifact, or network URL includes raw `solcast_site_id`.
- **Falsification:** seed `solcast_site_id="site_leak_12345"` and fail `/solar_test`; assert absence in all non-secrecy-excepted channels and storage states outside allowed private store.
- **Binding point:** `custom_components/oig_cloud/config_registry.py` (FIELD_REGISTRY), `custom_components/oig_cloud/config/steps.py`, `custom_components/oig_cloud/api/ha_rest_api.py`, `custom_components/oig_cloud/ai/backends.py`.

### R8.9 — Step-2 failure is non-blocking and cite-correct (closes AKEY-R7-004, R7-AS-NEW-3)
- **Binding requirement:** `PLAN-3.6-SPEC.md` AK-2 citation is to `SCOPE-REVISION.md: R7.3` and `SCOPE-REVISION.md: R7.12`.
- **Binding requirement:** on classified `/solar_test` failure in Step-2, wizard must keep `[data-testid="wizard-next"]` and `[data-testid="wizard-skip"]` enabled and render visible error; user may continue to Step-3.
- **Observable user outcome:** soft guide behavior remains unblocked, with visible forecast failure context and preserved progress.
- **Falsification:** force classified Step-2 failure; clause fails if wizard blocks completion path, hides error, or prevents advancing to Step-3.
- **Binding point:** `docs/redesign_2026_07/PLAN-3.6-SPEC.md`, `docs/redesign_2026_07/IMPLEMENTATION-BRIEF-EN.md`, `custom_components/oig_cloud/www_v2/src/ui/features/onboarding/index.ts` (`[data-testid="wizard-next"]`, `[data-testid="wizard-skip"]`).

### R8.10 — Rejected findings in this round
- **No findings rejected.**

## R9 — Round-4 closeout (2026-07-18)

### R9.1 — Closed endpoint auth matrix (closes R8-SEC-1 CRITICAL and R8-SEC-2 MAJOR)
- **Supersession statement:** `R9.1` supersedes the `R7.10` parenthetical escape "or explicitly documented public route". The box-scoped `/api/oig_cloud/{box}/pricelists` route is admin-only and has no public-route exception.
- **Binding requirement:** the `/api/oig_cloud/**` endpoint auth matrix is CLOSED. Every shipped endpoint under this prefix MUST appear in this matrix with allowed methods, admin outcome, authenticated non-admin refusal outcome, unsupported-method outcome, and a non-admin refusal test before the endpoint may ship.

| Route | Allowed method(s) | Admin outcome | Authenticated non-admin outcome |
|---|---|---|---|
| `/api/oig_cloud/{box}/module_config` | `GET` | Returns admin-visible module config only. | `403` with the same safe refusal shape for existing and missing boxes. |
| `/api/oig_cloud/{box}/config_registry` | `GET` | Returns registry metadata needed to render allowed controls. | `403` with no registry payload and the same safe refusal shape for existing and missing boxes. |
| `/api/oig_cloud/{box}/pricelists` | `GET` | Returns bundled distributor, tariff, confirmed-price, unit, validity, and stale-warning data from release assets. | `403` with no priced data and the same safe refusal shape for existing and missing boxes. |
| `/api/oig_cloud/{box}/ai` | `GET`, `POST` | `GET` returns sanitized provider/key/status state; `POST` verifies and stores a provider key. | `403` with the same safe refusal shape for existing and missing boxes. |
| `/api/oig_cloud/{box}/ai/validate_config` | `POST` | Runs `validate_config` against the entry's allow-listed numeric config and returns structured findings. | `403` before any config field is read, with the same safe refusal shape for existing and missing boxes. |
| `/api/oig_cloud/{box}/solar_test` | `POST` | Runs the bounded provider check and returns tomorrow forecast data or classified error. | `403` before request values are accepted and before any outbound provider call. |
| `/api/oig_cloud/{box}/onboarding` | `GET`, `POST` | `GET` returns only non-secret setup state; `POST` accepts only non-secret draft/status updates. | `403` before any body carrying step status, timestamps, GPS, provider, pricing, `solcast_site_id`, or `*_set` fields is returned or accepted. |

- **Unsupported methods:** for every matrix route, any method outside the allowed method set MUST return `405` and MUST NOT return route data, accept a body, mutate state, or make an outbound provider call.
- **Non-admin consistency test:** seed one existing box and fuzz one missing/guessed box as an authenticated non-admin. For each matrix route and method, assert the same status, content type, top-level error code, and absence of route data for both boxes. The response MUST NOT let the caller distinguish whether the box exists.
- **Onboarding refusal test:** seed Step-2 with latitude, longitude, provider, pricing fields, `*_set` booleans, `solar_forecast_api_key="fs_secret_123456789"`, `solcast_api_key="sc_secret_123456789"`, and `solcast_site_id="site_leak_12345"`. As an authenticated non-admin, call `GET` and `POST /api/oig_cloud/{box}/onboarding`; assert `403` and assert no step status, timestamp, GPS, provider, pricing, `solcast_site_id`, `*_set`, or secret sentinel appears in response, stored draft, logs, diagnostics, or outbound request.
- **Positive admin counterpart:** as admin, `GET /api/oig_cloud/{box}/onboarding` MUST return enough non-secret setup state to remount Step-2 and Step-3: step status, timestamps, provider enum, non-secret solar fields, pricing fields, and credential `*_set` booleans. It MUST NOT return raw credential or account identifier values. The positive test seeds `fs_secret_123456789`, `sc_secret_123456789`, and `site_leak_12345`, then asserts all sentinels are absent while non-secret values remain visible in the response and rendered DOM.
- **Public pricelist future route rule:** if a future public pricelist endpoint is needed, it MUST be a separate boxless route with no entry identifier, no per-box pricing state, and its own explicit matrix row plus non-admin/public-scope tests. That future route does not satisfy `/api/oig_cloud/{box}/pricelists`.

### R9.2 — Numeric perf budgets and transform executability (closes R8 perf MAJOR)
- **R6.5 outbound timeout:** `/solar_test` provider calls MUST use the Home Assistant shared aiohttp session and a server-side hard timeout of `10 s`. Test: a provider stub that sleeps longer than `10 s` returns classified `timeout` and keeps `[data-testid="wizard-next"]` plus `[data-testid="wizard-skip"]` enabled with no raw exception in DOM, REST, logs, or diagnostics. Justification: `10 s` allows slow provider/TLS behavior while bounding the user-visible wait and event-loop exposure.
- **R6.5 / R7.12 / R8.9 shared rate limit:** all `/solar_test` triggers, including manual `[Otestovat]` and system verify-before-replace, share one token bucket of `<= 1 outbound call per (entry_id, provider) per 30 s sliding window`, with one in-flight request per bucket. This is superseded by `R10.3` for the exact concurrency and body-hash rule. Test: trigger replacement verification, then manual `[Otestovat]` within `5 s`; assert the upstream stub was called exactly once and the second response is classified `rate_limited` with no outbound call. Justification: one call per 30 seconds blocks duplicate provider consumption during key rotation while still allowing a user correction after a short wait.
- **R6.11 wizard fetch budget:** one production wizard open or remount may issue at most `1` `GET` per endpoint for `/module_config`, `/config_registry`, `/onboarding`, and `/pricelists`; step changes and duplicate launch entry points MUST NOT repeat unchanged fetches in the same open. Test: route-intercept the production `oig-app` launch path, open Step-2, Step-3, close, and remount; assert per-open counts are `<= 1` per endpoint and that simultaneous banner/settings launch wiring cannot double-fetch. Justification: one fetch per endpoint gives fresh data for the user-visible open while catching the empty-screen class of duplicate composition bugs.
- **R6.11 already-complete migration budget:** an already-complete migration/setup path MUST finish its no-op restore/strip check in `<= 50 ms` on the CI runner and MUST perform no full rewrite. Test: seed a completed marker, reload the entry, measure `time.monotonic()` around setup, and assert `<= 50 ms` plus no avoidable `Store.async_save()` call. Justification: completed startup must remain below a perceptible setup delay and below normal HA integration setup jitter.
- **R6.12 render budget:** Step-2 and Step-3 registry-driven field rendering MUST complete in `<= 16 ms` per render at p95 in the component test fixture, and `fieldsFromRegistry(...)` may be invoked at most `1` time per section per render path with stable field identity. Test: render the solar and pricing steps, toggle unrelated input, measure `performance.now()` deltas, count calls, and assert DOM controls remain present with unchanged keys. Justification: `16 ms` is one 60 Hz frame and catches field-list recomputation that can drop or churn visible controls.
- **Named transform-executability rule:** `TER-1 Transform Executability Rule`. Every registered migration transform MUST be either (a) synchronous, CPU-only, no disk/network/HA state access, and `<= 5 ms` on the CI fixture, or (b) declared async/executor-backed and invoked through `hass.async_add_executor_job` outside the event-loop hot path. This is superseded by `R10.1`. Test: register a transform fixture that attempts blocking I/O or returns an awaitable from the sync registry; the migration test must fail unless the transform is routed through the async/executor path. Justification: this closes the R2/R6/R7/R8 open risk where a sync `register_transform(fn)` can silently become blocking under `async_setup_entry`.

### R9.3 — Remaining MINOR findings
- **R8-AS-NEW-1 anti-stub classification mismatch — REJECTED for this allowed-file slice:** the requested edit is to `spec-critique/R6-CLASSIFICATION.md`, which is outside the allowed touch list for R9. The binding source text already routes AS-22 to SHIPPED-CODE in `SCOPE-REVISION.md:R8.4` and names `spec-critique/SHIPPED-CODE-DEFECTS.md`; no allowed file can make the stale classification table row agree. Follow-up outside this slice: change the AS-22 row bucket to SHIPPED-CODE when `spec-critique/R6-CLASSIFICATION.md` is editable.
- **PERF-NEW-R8-B remount/launch CI budget — CLOSED:** the combined production launch, Step-2 remount, Step-3 remount, and production dashboard DOM falsifier suite MUST complete in `<= 30 s` wall time at p95 over the last 50 PRs; each individual R8.1 remount test MUST complete in `<= 10 s` wall time. Test wrappers measure `performance.now()` around each falsifier; any retry consumes the same `10 s` budget and cannot hide a `> 10 s` first attempt.
- **PERF-NEW-R8-C credential teardown budget — CLOSED:** entry removal, clear, and provider-switch teardown of `oig_cloud.ai_<entry_id>` plus `oig_cloud.solar_<entry_id>` MUST delete both private stores in `<= 200 ms` aggregate wall time averaged across 5 CI runs. Test: seed both stores, call clear/provider-switch/remove, assert both store files are gone, migration backup key-space has no secret, no exception is raised, and the measured aggregate is `<= 200 ms`.
- **PERF-NEW-R8-D deterministic clock guardrail — CLOSED:** stale-warning clock override MUST be a parameter on the snapshot-selection function or a dedicated test-helper export, never a module-level production global or production branch. Test: `rg -n "WINDOW|DEBUG_CLOCK|TEST_CLOCK" custom_components/oig_cloud/` returns 0 for production code paths, and a micro-benchmark of snapshot selection with a fixed clock argument has p99 `< 5 us` over 10,000 invocations. Positive counterpart: production calls use the real timezone-aware clock; tests pass an explicit fixed `now` provider for 2026/2025 fixtures.

### R9.4 — Rejected findings in this round
- **Rejected:** `R8-AS-NEW-1` only for the file-scope reason stated in `R9.3`.

## R10 — round-5 closeout (performance)

### R10.1 — PERF-NEW-R9-A (CRITICAL)
- **Supersession statement:** `SCOPE-REVISION.md:R9.2` `TER-1` in the named transform executability clause.
- **Binding requirement:** replace `TER-1` branch (b) with exact text: “An async transform MUST call only natively non-blocking async/HA APIs. It MUST NOT call synchronous file, network, subprocess, sleep, crypto, or HA-state APIs on the event-loop thread. Every blocking callable MUST be passed directly to `hass.async_add_executor_job`; wrapping blocking code in `async def` and awaiting it does not satisfy this rule. Tests patch `open`, `Path.read_text/read_bytes`, `requests`, `subprocess`, `time.sleep`, and synchronous crypto entry points and assert execution occurs off the HA event-loop thread.”
- **Observable outcome:** transforms that perform blocking file/network/subprocess/sleep/crypto/HA-state work only execute on the executor path, while non-blocking async transforms remain directly awaitable.
- **Falsification:** Register `async def transform(payload): time.sleep(0.2); return payload` and variants using `Path.read_bytes()`, `requests.get()`, and a synchronous crypto KDF. Await each through the async registry. The clause must fail every variant and HA's blocking-call detector must emit no event-loop warning only after executor routing.

### R10.2 — PERF-NEW-R9-B (CRITICAL)
- **Supersession statement:** `SCOPE-REVISION.md:R9.2` R6.11 wizard fetch budget; `SCOPE-REVISION.md:R9.3` PERF-NEW-R8-B; `PLAN-3.6-SPEC.md:R9 closeout bindings`.
- **Binding requirement:** add to `R9.2`: “Wizard bootstrap uses one `AbortController` per open. Each GET to `/module_config`, `/config_registry`, `/onboarding`, and `/pricelists` MUST settle or be aborted within `3 s`; the shared bootstrap deadline is `5 s`. On deadline, abort pending requests, render a classified retry state in the affected step, and keep wizard close, skip, and dashboard navigation usable. Production launch must render the wizard shell within `100 ms` p95 and either interactive fields or the classified retry state within `5 s`. A never-resolving route-intercept test enforces these deadlines.”
- **Observable outcome:** wizard bootstrap is interactive by `100 ms` p95 and always leaves users with either interactive fields or classified retry state by `5 s`, with close/skip/dashboard controls still usable when a fetch hangs.
- **Falsification:** Through the production `oig-app` launch path, let each endpoint in turn return a promise that never settles. Advance a monotonic real clock. The wizard must stop waiting at the specified deadline, abort the request, render a classified retry state, keep close/skip/dashboard navigation usable, and leave no pending spinner or request.

### R10.3 — PERF-NEW-R9-C (MAJOR)
- **Supersession statement:** `SCOPE-REVISION.md:R9.2` R6.5/R7.12/R8.9 shared rate limit; `PLAN-3.6-SPEC.md:R9 closeout bindings`.
- **Binding requirement:** replace the bucket key rule with exact text: “The provider-consumption and concurrency bucket key is exactly normalized `(entry_id, provider)`; request-body hashes may be used only for response deduplication and MUST NOT create independent rate or concurrency buckets. Permit at most one provider call in flight per `(entry_id, provider)`, at most four provider calls in flight across the integration, and at most one outbound call per `(entry_id, provider)` per `30 s`. Reject excess work as classified `rate_limited` before calling the shared aiohttp session. Bucket state is bounded to active entries and declared providers.”
- **Observable outcome:** a single entry/provider pair cannot be driven beyond one concurrent provider call by crafted body variations, and total integration concurrency is bounded to four provider calls in flight.
- **Falsification:** Send 100 valid but distinct request bodies for one entry/provider in one second, then repeat across both providers. Assert maximum provider concurrency is one per entry/provider, total integration provider concurrency is at most four, excess requests are classified before any shared-session call, and bucket state has bounded cardinality.

### R10.4 — PERF-NEW-R9-D (MINOR)
- **Supersession statement:** `SCOPE-REVISION.md:R9.3` PERF-NEW-R8-B.
- **Binding requirement:** add to `R9.3`: “CI writes one non-retry duration artifact per PR for the combined falsifier suite, retains the latest 50 successful PR artifacts, and computes nearest-rank p95 through `scripts/check_onboarding_perf_history.py`. The merge gate fails when p95 exceeds `30 s`. Until 50 artifacts exist, every observed run MUST be `<= 30 s`. Retry time is added to the same PR duration and never replaces the first-attempt duration.”
- **Observable outcome:** merge gating uses a deterministic artifact-backed 50-sample `p95` stream with explicit retention and no hidden retry-skipping behavior.
- **Falsification:** Remove all historical timing artifacts and run the stated wrapper once. The gate must fail closed or apply an explicit bootstrap rule; it must not report a 50-PR p95 from one sample.

---

## R11 — Shipped-code defects assigned to Plan 4 (2026-07-18)

The R6–R10 hardening loop produced `spec-critique/SHIPPED-CODE-DEFECTS.md`: seven defects in code
**already deployed to the operator's live box**. They are not spec problems and were correctly kept
out of the spec loop. They are now **assigned to Plan 4**, which ships first — they must not wait for
the later AI plan, because they affect a running installation today.

Each acceptance criterion below must **fail against the current code**. A test that passes on today's
tree proves nothing.

**R11.1 — `GET module_config` admin gate (SEC-2, CRITICAL).** Already Plan 4 Task 1; keep it, and
extend acceptance: a non-admin authenticated request MUST receive 403 and MUST NOT receive
`solar_forecast_latitude` / `solar_forecast_longitude` / site identifiers in any response body.
Regression test asserts both the status code and the absence of those keys.
Location: `custom_components/oig_cloud/api/ha_rest_api.py:1213-1229`.

**R11.2 — `AiKeyStore` must support deletion (AIK-1, MAJOR).** Add `async_clear()` and call it from
the integration-removal lifecycle. Acceptance: after removing the config entry, the store file for
that entry no longer exists; a test asserts the file is gone, not merely that the API returns
`key_set: false`. Location: `ai/key_store.py:43-67`, `__init__.py:1932`.

**R11.3 — Never replace a valid key with unverified material (AIK-3, MAJOR).** `POST /ai` currently
writes the key before the verification result is known, so a provider outage can overwrite a working
key. Acceptance: with a stored verified key, a POST carrying a new key whose verification FAILS must
leave the previously stored key intact and still marked verified; the candidate is only promoted on
success. Location: `api/ha_rest_api.py:1394-1424`.

**R11.4 — Provider change must not leave stale key state (AIK-2, MAJOR).** Changing `ai_provider`
without supplying a new key, or submitting a blank key, must not leave a key belonging to the
previous provider. Acceptance: a test switches provider with no new key and asserts the stored state
is cleared, not silently mismatched. Location: `config/steps.py:3599-3612`.

**R11.5 — `task` must be a constrained enum, not free text (AIK-5, MAJOR).** The prompt anonymity
boundary allow-lists structured `install` data, but `task` is concatenated as raw text and bypasses
it. Acceptance: the backend accepts only known task identifiers; an unknown or free-text task is
rejected before any outbound call, and a test asserts a crafted `task` string containing an address
or coordinates never reaches the serialized request body.
Location: `ai/backends.py:60-72`.

**R11.6 — Classified errors, not raw exceptions (AIK-4, MINOR).** `POST /ai` returns
`detail: str(err)`. Acceptance: the response carries a classified error code; the raw exception text
appears only in the log. Location: `api/ha_rest_api.py:1411-1420`.

**Ordering.** R11.1 and R11.3 are the two the operator is exposed to right now (home coordinates
readable by any authenticated household account; a provider outage can destroy a working key) — they
lead Plan 4. The rest follow in the same plan.

**Correction (2026-07-19).** An earlier draft of this section claimed the loop produced "~13 vague
PARTIALLY-CLOSED performance items" that were loop artefacts and should be pruned. That claim was
wrong and is withdrawn. On inspection there are **19** PARTIALLY-CLOSED entries, **two of them are
security, not performance**, and the vagueness lives in the `spec-critique/LOOP-STATUS.md`
restatements, NOT in the findings. The underlying entries in `spec-critique/R2-PERF-perf.md` are
concrete and carry `file:line` evidence. Pruning them would have discarded one MAJOR. Resolution:
the vague restatements were removed from `LOOP-STATUS.md`, which now points at the originals;
`R2-PERF-perf.md` is unchanged; and the items that need binding action are promoted below.

## R12 — items promoted out of the PARTIALLY-CLOSED backlog (2026-07-19)

**R12.1 — `POST /solar_test` needs a server-side timeout (F-2.3, MAJOR).** Source
`spec-critique/R2-PERF-perf.md:F-2.3`. The endpoint does not exist yet — it is authored in Plan 3.6 —
so this is a requirement on code about to be written, not a retrofit. Without an explicit
server-side timeout the handler inherits the existing forecast path's 30 s and can hang that long.
**Assigned to Plan 3.6**, recorded in `docs/redesign_2026_07/PLAN-3.6-SPEC.md`.

**R12.2 — Migration backup store needs locking (M-4, MAJOR).** Source
`spec-critique/R10-SECURITY-round5.md:M-4`. Verified 2026-07-19 against the delivered Task 2
(`485dfc910`): the store IS per-entry (`config_migration.py:198` `_backup_store(hass, entry_id)`), so
the shared-store collision half of M-4 is closed by construction. The concurrency half is NOT:
migrate, `restore_last_backup()` and the dead-key strip path all read/write the same per-entry store
with no lock. Two concurrent option flows can interleave. **Assigned to Plan 4** if it is still open
at the gate; otherwise to the follow-up.

**R12.3 — Restore needs a confirm parameter and a durable audit field (m-4, MINOR).** Source
`spec-critique/R10-SECURITY-round5.md:m-4`, originally `spec-critique/R2-SECURITY-sec.md:90-92`.
Verified 2026-07-19: `restore_last_backup(hass, entry)` (`config_migration.py:451`) is admin-gated
and secret-safe, but takes no explicit confirm argument and writes no durable audit record of who
restored what and when. A destructive, admin-triggered rollback of a user's whole options payload
must be both deliberate and traceable. **Assigned to Plan 4** if still open at the gate.

**Not promoted, deliberately:** F-1.1, F-1.2, F-1.4, F-1.5, F-2.1, F-2.2, F-2.5, F-2.6, F-2.7, F-3.1,
F-3.2 remain MINOR observations in `R2-PERF-perf.md`. They are real and evidenced, they simply do not
justify scope now. They are not deleted.
