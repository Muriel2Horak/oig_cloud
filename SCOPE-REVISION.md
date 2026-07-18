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
