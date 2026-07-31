# R2-PERF — Performance / runtime-cost review (Plán 4 + 3.6)

**Recenzent:** performance lens (R2 v rámci F1 round 2).
**Datum:** 2026-07-18.
**Vstup:** SCOPE-REVISION.md (R1–R5), PLAN-3.6-SPEC.md, Plan 4 (`f1-plan4-cleanup-migration-dataset.md`), `custom_components/oig_cloud/**`, `custom_components/oig_cloud/www_v2/{src,dist}/**`.
**Out of scope:** Plan 2/3 hotové kusy mimo nové endpointy/loader/migraci; AI plán (D8) vlastní review.
**Metoda:** static grep + vlastní commands nad pracovním stromem (read-only), žádný live HA, žádný /repos/oig-cloud, žádné commity.

---

## TL;DR

Plán je z pohledu **výkonu a event-loopu převážně čistý** — velké rozhodnutí „bundled dataset, NE fetch, NE LLM" (SCOPE-REVISION #2/#3/#4, Task 6) je správné a je z hlediska R2 nejpodstatnější obranou proti runtime regresi. Zůstává ale **6 děr**, z toho 2 v R5 scope (vázáno SCOPE-REVISION R5.1/R5.3) a 4 mimo R5 — žádná není blocker, ale každá z nich buď zvyšuje dobu `async_setup_entry`, nebo generuje synchronní síťový kód uvnitř request handeru. Doporučuji je zavřít před spuštěním implementace.

---

## Aktuální stav v pracovním stromě (k 2026-07-18)

| Věc | Stav | Důkaz |
|---|---|---|
| `custom_components/oig_cloud/remote_config/` | **neexistuje** | `ls remote_config/` → `No such file or directory` (Plan 4 Task 6) |
| `scripts/build_pricelists.py` | **neexistuje** | `find . -name build_pricelists*` → 0 hitů |
| `data/pricelists.json`, `data/ai_models.json` | **neexistují** | stejný grep |
| Endpoint `GET /api/oig_cloud/<box>/pricelists` (R3.2 / R5.2) | **neexistuje** | `grep "pricelists\b" custom_components/` → 0 hitů v `api/` |
| Endpoint `POST /api/oig_cloud/<box>/solar_test` (R5.3) | **neexistuje** | `grep "solar_test" custom_components/` → 0 hitů |
| `custom_components/oig_cloud/config_migration.py` (Task 2) | **neexistuje** | `ls` záznam chybí |
| `run_migration` / `register_transform` (Task 2) | **neexistuje** | `grep "run_migration" custom_components/` → 0 hitů |
| `strip_dead_keys` (Task 5) | **neexistuje** | `grep "strip_dead_keys" custom_components/` → 0 hitů |
| `config_deprecation.py` (Task 3) | **neexistuje** | `find . -name config_deprecation.py` → 0 hitů |
| Build-time dep `openpyxl` v `manifest.json` | **OK** — chybí | `manifest.json:14` má jen `["numpy>=1.24.0","paho-mqtt>=1.6.1"]` |
| Build-time dep `openpyxl` v `requirements.txt` / `requirements-dev.txt` | **OK** — chybí (správně) | `grep -i openpyxl` → 0 hitů |
| `merge_entry_options(..., suppress_reload=True)` (Task 2) | není v __init__.py; objevuje se až v plánovaném `config_migration.py` | `grep -n merge_entry_options __init__.py` → 0 hitů (všude jinde volá `hass.config_entries.async_update_entry`) |

Vše v R3/R5 (ceníkový endpoint, FE kontrakt, `pricing` registr, test render-asercí) **bude nové** — review se týká plánu + toho, co plán zamlčel.

---

## 1. Bundled dataset — `pricelists.json` (Task 6 + R5.1/R5.2)

### 1.1 Velikost, parsování, event-loop ✅ dobré — s výhradami

**Plán (Task 6, lines 786–813):**
```python
def _load(name: str) -> Any:
    with resources.files(f"{__package__}.data").joinpath(name).open("r", encoding="utf-8") as fh:
        return json.load(fh)
```
- `importlib.resources.files(...)` je blocking file I/O. **V plánu chybí:**
  - první volání z event loopu parsuje JSON synchronně,
  - žádný cache — každé `load_pricelists()` znovu otevře soubor a znovu `json.load`,
  - žádné velikostní rozpětí ani budget (Task 6 Step 1 testuje přítomnost „cez"/„egd"/„pre", ne velikost).

**Co plán zamlčel — VERIFIED:**

- Plán píše „release-bundled JSON with `valid_from` snapshots". Počet distributorů × sazeb × snímků není v plánu nijak odhadnut. ERÚ výměr 14/2025 má D01d–D61d (~20 sazeb), ČEZ/EG.D/PRE = 3 distributoři, snímky po ~měsíčních dodatcích (viz SCOPE-REVISION R4). Při 3 distributorech × 20 sazebách × řádově 10 snímky × 8 cenových polí + DPH/POZE/služby = klidně **~30–80 KB** JSON. To je pro Raspberry Pi akceptovatelné — při cold read + `json.load` to je ~5–15 ms. NA cold parse je to OK.
- **ALE**: plán neříká, jestli se `load_pricelists()` nevolá per-request v `GET /pricelists`. V plánovaném endpointu (R3.2 / R5.2) by se to mělo volat jednou a pak vracet strukturu; bez cache je to voláno při každém GETu → parsing 5–15 ms na request v event loopu — pro dashboard otevíraný adminem přijatelné, ale je to **zbytečný opakovaný blocking I/O**.
- **`from importlib.resources` cache:** Python 3.12 `importlib.resources.files` result není sám o sobě cachovaný pro `open()`/`read_text()` přes context manager — otevření, čtení a `json.load` se děje vždy znovu.

| Finding | Severity | Status |
|---|---|---|
| F-1.1 `load_pricelists()` nemá cache; plán explicitně neřeší, zda `GET /pricelists` ji volá jednou (per setup) nebo per-request | MINOR | INFERRED |
| F-1.2 Plán neobsahuje horní odhad `pricelists.json` ani budget „load <50 ms", žádný sizing test | MINOR | INFERRED |
| F-1.3 Žádný test, že loading neblokuje event loop déle než N ms (Task 9 smoke matrix to nepokrývá) | MINOR | INFERRED |

### 1.2 Build script a isolation od manifestu ✅ dobré — s jednou výhradou

**Důkaz:**
- `custom_components/oig_cloud/manifest.json:14` má `"requirements": ["numpy>=1.24.0", "paho-mqtt>=1.6.1"]` — **openpyxl chybí** ✅.
- `requirements.txt` + `requirements-dev.txt` neobsahují `openpyxl` ✅.
- Plán říká „vlastní requirements pro build" (SCOPE-REVISION #110) — ale **Task 6 Step 3 v plánu explicitně nestanoví cestu ani název** toho build-only requirements souboru (např. `scripts/requirements-build.txt`). Doporučení: soubor vytvořit a odkázat z `scripts/build_pricelists.py` hlavičky.

| Finding | Severity | Status |
|---|---|---|
| F-1.4 Plán nemá explicitní build-only requirements soubor (Task 6 Step 3 slibuje „vlastní requirements", ale název/cesta chybí) | MINOR | INFERRED |
| F-1.5 Žádný CI test, že `pip install` z `requirements.txt` + `requirements-dev.txt` neinstaluje openpyxl do cesty, kterou by HACS mohl detekovat | MINOR | INFERRED |

---

## 2. Nové endpointy — `GET /pricelists`, `POST /solar_test`, `GET /onboarding`

### 2.1 `GET /pricelists` (R3.2 / R5.2) ⚠️ NEEXISTUJE — chybí specifikace pro cache/ETag

**Plán:** Task 6 + R5.2 říkají „authenticated `GET /api/oig_cloud/{box}/pricelists` returning distributors, tariffs, prices and the validity year". Hotovo nikde v kódu (`grep pricelists api/` → 0 hitů).

**Co plán zamlčel:**
1. **Cachování na serveru.** Bez `lru_cache` / `asyncio.Lock` + jednoúrovňové cache se každý GET znovu dotazuje `importlib.resources` + parsuje. 5–15 ms × počet admin otevření karty → ne katastrofální, ale pro klienta s otevíráním přes 30 s by to znamenalo opakovaný disk I/O.
2. **ETag/304.** Klient (`apiClient`, 60 s TTL) cacheuje GET defaultně; plán by měl specifikovat, že server posílá ETag `W/"<hash dat>"` a odpovídá `304 Not Modified` při `If-None-Match` — pak invalidace vyžaduje nový release (dataset je immutable per release), ne jen reload HA. Bez toho se opakované dotazy v rámci 60s TTL vyříří z klientské cache, ale 60 s+ po startu opět blocking parse. **Volitelné**, ale chybějící spec.
3. **Autorizační kontrola.** Plán píše „authenticated", což v kódu je `requires_auth = True` (viz `OIGCloudConfigRegistryView`, `ha_rest_api.py:1308`). Shodné s okolními view. OK.

| Finding | Severity | Status |
|---|---|---|
| F-2.1 `GET /pricelists` plánem chybí cache spec (server-side) | MINOR | INFERRED |
| F-2.2 Plán neříká, že se dataset může jen znovu načíst při startu (immutable), takže bez cache plánovaný endpoint parsuje JSON při každém GETu | MINOR | INFERRED |

### 2.2 `POST /solar_test` (R5.3) ⚠️ KRITICKÁ CHYBĚJÍCÍ SPEC — synchronní fetch v event loopu

**Plán:** „Admin-authenticated `POST /api/oig_cloud/{box}/solar_test` that validates the values currently shown in the form, triggers a real forecast fetch, and returns tomorrow's kWh or a classified user-facing error." Hotovo nikde (`grep "solar_test"` → 0 hitů).

**Co plán ZCELA zamlčel — VERIFIED z existujícího kódu:**

a) **Synchronní síťový kód uvnitř request handeru.** Plán neříká, jestli `POST /solar_test` smí blokovat event loop. Stávající forecast sensor v `entities/solar_forecast_sensor.py:606` (`_fetch_forecast_string`) volá `session.get(url, timeout=aiohttp.ClientTimeout(total=30))` — `aiohttp` je sám async, ale **timeout je `30 s`**. Endpoint, který to deleguje, bude blokovat request handler na **až 30 s** při pomalém providerovi. To je event-loop problém jen v tom smyslu, že request handler „visí" a během toho další requesty na stejném workeru čekají. Není to pravé blokování smyčky (smyčka je async a `await session.get` ji pouští), ale **single-user perception** je jiná: uživatel klikne na [Otestovat], stránka visí. Pokud se to bude volat opakovaně rychle za sebou, klient cacheuje ale request handler ne.

b) **Timeout pro `POST /solar_test`.** Plán žádný timeout nespecifikuje. `entities/solar_forecast_sensor.py:606` dává 30 s a provider `forecast.solar` mívá 422/timeout při špatném klíči. Pokud handler bude volat tuto cestu bez vlastního `asyncio.wait_for(..., timeout=10)`, tak **handler může trvat 30 s** (= planner update worker spadne, jiné requesty čekají). To je **výkonový defekt pro F1 R2**.

c) **Repeated-click protection.** Plán nepíše o dedup/registraci klíč+request. Klient `apiClient.ts` dedupuje v rámci `pendingRequests` (lines 51–54) — ale je to metoda na URL+method+body, což zahrnuje **i tělo s key/site_id**. Klient sám tedy zabrání duplicitnímu paralelnímu POSTu, **ALE pokud uživatel klikne rychle dvakrát, druhý čeká na výsledek prvního** — to je OK chování; spíš dobré. **Plán by to měl explicitně zaručit: server vrací `409 Conflict` při vlastním re-entry semaforu, nebo se na to spoléhá jen na klienta.** Specifikace chybí.

d) **Forecast path se dvakrát otevírá session.** `entities/solar_forecast_sensor.py:539` (`_fetch_forecast_solar_strings`) dělá `async with aiohttp.ClientSession() as session: ...`. Kdyby `POST /solar_test` sdílel session, bylo by to lepší. Plán to neřeší.

e) **Provisioning dvou strun.** `_fetch_forecast_solar_strings` (`solar_forecast_sensor.py:527`) paralelně fetchuje oba stringy — dobré, neplánovaný bottleneck navíc.

| Finding | Severity | Status |
|---|---|---|
| F-2.3 `POST /solar_test` plánem postrádá explicitní server-side timeout (existující forecast path dává 30 s; handler tak může viset 30 s) | **MAJOR** | INFERRED |
| F-2.4 Plán neříká, zda handler sdílí `aiohttp.ClientSession` (z HA `async_get_clientsession`) nebo otvírá novou — existující kód otvírá novou (`solar_forecast_sensor.py:539`) | MINOR | VERIFIED (`solar_forecast_sensor.py:539`) |
| F-2.5 Plán nemá spec pro repeated-click / 409 / throttle — klient dedupuje (`apiClient.ts:51`), server ne | MINOR | INFERRED |

### 2.3 `GET /config_registry`, `GET /module_config`, `GET /onboarding` (existující, ale plánem neauditované z hlediska perf) ✅ převážně dobré

Důkaz: `ha_rest_api.py:1213–1229` (`/module_config`), `:1310–1318` (`/config_registry`), `:1456–1467` (`/onboarding`). Každý endpoint je tenký; `/config_registry` iteruje `FIELD_REGISTRY` (verifikovaný z `config_registry.py:103–134`) — cca 50–60 polí celkem; payload velikostně desítky KB.

| Finding | Severity | Status |
|---|---|---|
| F-2.6 `GET /config_registry` neposílá ETag; ale plán nerozšiřuje REST surface, takže minor | MINOR | VERIFIED (`ha_rest_api.py:1316`) |
| F-2.7 `loadFieldRegistry()` v FE (`registry-data.ts:29`) a `loadOnboarding()` v `app.ts:888` a `loadModuleConfig()` v `app.ts:897` — **dashboard otevření typicky vyžaduje tři REST round-trip** (onboarding + config + registry). Pokud FE Settings tab paralelně načítá znovu, přibývají další. Plán 3.6 z toho neukládá nic. | MINOR | INFERRED (next finding dives in) |

---

## 3. Frontend — registry-driven form rendering + wizard

### 3.1 Bundle size ⚠️ zvětší se o R5.2 FE kontrakt

**Důkaz (dist/):**
- `assets/index.js` — **800 KB**
- `assets/charts.js` — **224 KB**
- `assets/vendor.js` — **20 KB**
- Celkem ~1 MB ne-minifikovaného balíku (bez source maps).

Na RPi-to-RAM to není optimální, ale HA jede většinou v prohlížeči a „pomalá linka" je service-worker cache. Riziko není v „velikosti", ale v **cold parse** — plánovaná R3 FE kontrakt (pricing registr v `config_registry.py`, nový `pricing` section + nové field definitions + distributor enum) přidá do `registry_as_api_dict()` payload: distributor enum × tariff enum × cenová pole. **Odhad: +5–15 KB** na JSON odpovědi, ~+2–5 KB na `FieldDef[]` po `fieldsFromRegistry()`. Marginální.

**Plán:**
- **Žádný split chunk pro pricing/pricelists** — Plan 4 Task 6 netlačí na lazy-loading. 800 KB `index.js` je dnes monolit. Plán 3.6 by měl říct, jestli cenový formulář jde do samostatného dynamic importu. V současném `www_v2/src/ui/features/pricing/` existují samostatné moduly, takže lazy import je triviální, ale **plán 3.6 to nenařizuje**.

| Finding | Severity | Status |
|---|---|---|
| F-3.1 Wizard pricing krok pravděpodobně přidá syntaxi pro nový `pricing` registr; plán 3.6 nespecifikuje, jestli cenová formulářová sekce jde do samostatného chunku (lazy import) | MINOR | INFERRED |
| F-3.2 Wizard aktuálně parsuje celý bundle bez lazy importu; `charts.js` (224 K) je zvláštní chunk, ale `pricing/pricelists` FE to nevyužívá | MINOR | VERIFIED (`dist/assets/`) |

### 3.2 Počet REST round-trip na dashboard open

**Důkaz (FE):**
- `app.ts:888` (`loadOnboarding`) → GET `/onboarding`
- `app.ts:897` (`loadBoxHasHome56`) → GET `/module_config`
- `settings/index.ts:523–526` (`refresh`) → paralelně GET `/module_config` + GET `/config_registry` — **t.j. druhý GET module_config** (klient cacheuje 60 s)
- `step-solar.ts` importuje `fieldsFromRegistry` z `registry-data.ts` — to se volá jen při otevření kroku ②.

**Cold open dashboard (Settings tab aktivní):** 4 REST cally paralelně (`/onboarding` + `/module_config` × 2 (60 s cache) + `/config_registry`). To je snesitelné.

**Plán 3.6 nepřidává žádný nový REST call pro wizard init kromě:**
- `GET /pricelists` (krok ③, R3.2/R5.2) — po otevření kroku, lazy, akceptovatelné.
- `POST /solar_test` (krok ②, R5.3) — user-driven, ne při mount.

**OK.** Ale **R5.4** vyžaduje completion persistence testovat přes UI re-mount. To znamená: render wizard → fill → finish → **unmount** → **remount** → kontrola persistovaného stavu. Žádný nový endpoint, ale **druhý GET /onboarding** v testu. OK.

| Finding | Severity | Status |
|---|---|---|
| F-3.3 Na cold dashboard open se typicky dělají 3–4 REST cally vč. duplicitního `/module_config`. Klient cache 60 s (`apiClient.ts:39`) to zmírní, ale první otevření/settings tab reload načítá plný payload | MINOR | VERIFIED (`app.ts:888`, `app.ts:897`, `settings/index.ts:523–526`, `apiClient.ts:39`) |

### 3.3 Re-render cost — wizard a registry ⚠️ selektivně OK, ale chybí guard

**Důkaz:**
- `step-solar.ts:20–30` (`STEP_SOLAR.fields`/`visibleFields`) — `fieldsFromRegistry(reg,'solar').filter(...)` se volá v každém `render()`. Pokud `reg` obsahuje cca 60 polí a `.filter` + `.map` iteruje, je to cca 60 porovnání + 8–15 objektů = zlomek ms.
- **ALE: `fieldsFromRegistry` vytvoří nové objekty na každé render()** (`registry-data.ts:46–61`). Bez memoize se to děje i když se `reg` nezměnil. Pro pricing krok s distributor enumem × tariffami to může být víc.

**Plán:** nic o memoizaci nepíše. Lit (`LitElement`) re-renderuje podle `requestUpdate` triggerů; záleží na tom, jak často se komponenty ptají na `fieldsFromRegistry`.

| Finding | Severity | Status |
|---|---|---|
| F-3.4 `fieldsFromRegistry` (`registry-data.ts:45`) alokuje nové objekty při každém volání. Bez memoize se cena projeví v kroku ③ (pricing registr s enumem distributor + tariff). Plán na to nemá guard. | MINOR | VERIFIED (`registry-data.ts:46–61`) |

---

## 4. Migrace (Plan 4 Task 2/3/5) — `async_setup_entry` blocking + storage writes

### 4.1 Task 2 — transactional migration core ⚠️ MAJOR: blokující run v setupu

**Plán (Task 2):** `run_migration(hass, entry)` se volá v `async_setup_entry` (Task 2 Step 3: „call `await run_migration(hass, entry)` once in `async_setup_entry`"). Každý průchod:
1. `await _append_journal(...)` — `Store.async_load()` + `Store.async_save()` (Task 2 code, lines 670–683)
2. `await _backup_store(...).async_save(backup)` — disk write (Task 2 code, line 690)
3. `merge_entry_options(hass, entry, updates, suppress_reload=True)` — sync (`config_merge.py:18–26`), ale bez reload

**Současný stav setupu (`__init__.py:1538–1564`):** před přidáním Task 2 běží:
- `_ensure_planner_option_defaults` (sync, options write)
- `_ensure_data_source_option_defaults` (sync)
- `_migrate_enable_spot_prices_option` (sync)
- `promote_blank_enum_defaults` (sync)
- `_migrate_legacy_credentials_from_options` (sync)
- **`await _run_boiler_migration(hass, entry)`** (async)
- `await async_setup_entry_telemetry` (async)
- `await _init_session_manager_and_coordinator` (async, síťový handshake)

**Plán přidává:**
- `await run_migration(hass, entry)` (Task 2)
- `await restore_last_backup(hass, entry)` pouze při admin restore (Step 3b, na vyžádání)
- (Task 5) `await strip_dead_keys(hass, entry)` z __init__ pokud je úspěšná migrace

**To znamená:** každý setup přidává **2× Store.async_save + 1× Store.async_load**. Pro RPi class HW s SD kartou to je **10–100 ms per write** v závislosti na fs flush. Celkem řádově **30–300 ms navíc na cold start HA** (jeden config-entry; live box zpravidla 1). Plán to nepočítá, ale:
- `run_migration` je idempotentní (Task 2 test 2), takže opakované spuštění po prvním setupu je jen journal+save bez transform — **pořád 30–100 ms na každý reload HA, i když je vše hotovo**. To je event-loop pauza v setupu, ne v hlavní smyčce.
- `_run_boiler_migration` se v plánu neposouvá do pozadí. Task 2 přidává další await na stejném místě. Studené starty HA se prodlouží.

| Finding | Severity | Status |
|---|---|---|
| F-4.1 `run_migration` + `strip_dead_keys` přidávají 2–3 disk writes per setup, ~30–300 ms pauzy navíc na RPi class HW. Plán to nepočítá a neříká, jestli se dají provést v pozadí (`hass.async_create_task`) | **MAJOR** | VERIFIED (plán Task 2 code lines 670–690 + existující `__init__.py:1538–1564`) |
| F-4.2 `_TRANSFORMS` se vyhodnocují synchronně v Task 2 i když jsou I/O nezávislé. Pokud Task 4 přidá pre-seed transform s `await sensor.async_get_last_state()`, tak **blokující I/O uvnitř `run_migration`**. Plán nespecifikuje, jestli transformy mohou být async | MAJOR | INFERRED |
| F-4.3 Po prvním úspěšném setupu se `run_migration` chová idempotentně (Task 2 test 2) — `await ... async_load() + async_save(journal-only)` se volá znovu při každém HA reload, i když není co dělat | MINOR | INFERRED |

### 4.2 Task 3 — deprecation window ✅ dobré, ale `monotonic version`, ne na „load time"

**Plán:** `ALIAS_COMPAT_UNTIL_VERSION` je monotonic migration version, ne time. Test 3 (`test_canonical_only_options_never_trigger_deprecation`) je regression guard. OK — verze se vyhodnotí jednou při loadu a pak se negeneruje kód v hlavní smyčce. **Event loop safe.**

### 4.3 Task 5 — `strip_dead_keys` ⚠️ blocking pop + sync `async_update_entry`

**Plán (Task 5 Step 3):**
```python
async def strip_dead_keys(hass, entry) -> None:
    ...
    removed = {k: options.pop(k) for k in _DEAD_KEYS if k in options}
    ...
    await _backup_store(hass, entry.entry_id).async_save(backup)  # disk write
    hass.config_entries.async_update_entry(entry, options=options)  # sync
```
- 1 disk write per setup; **.pop()** na dict je O(N) — pro ~60 klíčů nevýznamné.
- Volá se z `async_setup_entry` po `run_migration` — viz F-4.1.

### 4.4 Task 7 — `get_configured_mode` accept path

**Plán (Task 7):** mění `core/data_source.py:94–101` (současný `hybrid → local_only` silent map) na versioned warning/error přes `deprecation_status`. **Event loop safe** — bez sync I/O. ✅

| Finding | Severity | Status |
|---|---|---|
| F-4.4 Task 7 implementace by měla být sync — OK | (none) | INFERRED |

---

## 5. Build script (`scripts/build_pricelists.py`) ✅ dobré, ale neexistuje a R5.1 review chybí

**Plán (SCOPE-REVISION R5.1):** „Build dependencies (openpyxl) MUST NOT appear in the integration manifest."

**Současný stav:**
- `manifest.json:14` má `["numpy>=1.24.0", "paho-mqtt>=1.6.1"]` — openpyxl chybí ✅
- `requirements.txt`, `requirements-dev.txt` neobsahují openpyxl ✅
- `scripts/build_pricelists.py` neexistuje — review se tedy týká plánu, ne kódu
- Plán říká „vlastní requirements pro build" (SCOPE-REVISION #110), ale Task 6 Step 3 **nepojmenovává soubor** (např. `scripts/requirements-build.txt`)

| Finding | Severity | Status |
|---|---|---|
| F-5.1 Task 6 Step 3 slibuje vlastní requirements pro build, ale nepojmenovává cestu. Manifest bez openpyxl je OK dnes, ale chybí build-time lock | MINOR | INFERRED |
| F-5.2 Chybí CI check (např. `grep -r openpyxl custom_components/oig_cloud/manifest.json` v Task 9 smoke matrix) — Task 9 v plánu explicitně neobsahuje takový krok | MINOR | INFERRED |
| F-5.3 Build-time velikost JSON outputu není budgetovaná — Task 6 Step 1 testuje přítomnost klíčů, ne velikost. R5.1 kontroluje fixture-anchored assertions, ne size budget | MINOR | INFERRED |

---

## 6. Co plány nechávají otevřené — obecně

| Topic | Stav | Riziko |
|---|---|---|
| **R5.2 client render test** pro `GET /pricelists` | v plánu je (R5.2 bod 3) | OK |
| **R5.4 completion persistence test přes UI** | v plánu je | OK |
| **R5.5 missing-config visible warning** | v plánu je | OK |
| **Průvodce refresh při změně options** — pokud uživatel v kartě Nastavení změní provider a vrátí se do průvodce, načte se starý dataset? | plán to neřeší | možný dvojí fetch, ale v praxi 60 s FE cache to skryje (MINOR) |
| **Wizard mount na VelmiPomalém klientovi (RPi 2/3)** | dist/index.js 800 KB, cold parse 200–500 ms, ale jednorázově; Pro RPi 4 <100 ms | minor; FE cache service-worker to amortizuje |
| **`fieldsFromRegistry` memoize** při pricing kroku | chybí v plánu i v kódu | MINOR (viz F-3.4) |
| **`store.async_save` selhal?** Task 2 test 4 (`test_restore_with_corrupt_backup_store_is_safe`) fail-closed ✅; ale Task 2 samotný test 3 (`test_interrupted_migration_leaves_recoverable_state`) **nepokrývá situaci, kdy disk je plný a save selhal**: `run_migration` catch je `except Exception`, takže ano → State `False`, **ale** `_backup_store.async_save(backup)` se opakuje v catch bloku (Task 2 code, lines 685–688) → může selhat znovu, a pak `_LOGGER.error` → `return False` → vnější setup se tváří jako úspěšný, ale `_migration` marker není nastaven. Příští start migraci opakuje. Reálně OK. | (none, accept) |
| **Telemetry Store + StatisticsStore periodic flush** (`__init__.py:1843–1854`) — plán neříká, že se mají posunout do pozadí. Stávající kód to dělá v `async_setup_entry` okruhu. Plán 4 to nechává být. | (none — out of scope) | MINOR (event-loop v setupu) |
| **`memoize` `registry_as_api_dict()`** — `OIGCloudConfigRegistryView.get` (`ha_rest_api.py:1316`) pokaždé iteruje `FIELD_REGISTRY` (~60 fields). Microseconds, ale per-request | MINOR | VERIFIED |
| **`fields_for_section()` filter per request** v `module_config.get` (`:1221–1228`) — iteruje 5 sekcí; každá sekce filters registry (~60 fields) | MINOR | VERIFIED |

---

## Severity-ranked findings — **fix před implementací**

| # | Finding | Severity | Soubor / plán | Doporučená akce |
|---|---|---|---|---|
| **F-2.3** | `POST /solar_test` chybí server-side timeout; existující forecast path dává 30 s | **MAJOR** | R5.3 plán + `entities/solar_forecast_sensor.py:606` | Přidat do plánu R5.3 explicitní `asyncio.wait_for(..., timeout=10)` na handleru; klient zobrazí timeout chybu srozumitelně |
| **F-4.1** | Task 2 + Task 5 přidají 2–3 blocking disk writes v `async_setup_entry` | **MAJOR** | Plan 4 Task 2 + Task 5; `__init__.py:1538–1564` | Volat `run_migration` + `strip_dead_keys` přes `hass.async_create_task` po setupu (nebo přes `_get_planner_defaults` shortcut pokud je marker úspěšný) |
| **F-4.2** | Task 4 pre-seed transform v `run_migration` může potřebovat async I/O (sensor-first) | MAJOR | Plan 4 Task 2 + Task 4 | Plán by měl explicitně říct, že `register_transform` akceptuje `Callable[[Dict], Awaitable[Dict]]` a `_TRANSFORMS` se `await`-ují |
| **F-1.1** | `load_pricelists()` bez cache, parsuje per-request v `GET /pricelists` | MINOR | Plan 4 Task 6 | Plán by měl explicitně specifikovat: `lru_cache(maxsize=1)` + thread-safe init; první call v setupu, ne v handleru |
| **F-2.2** | Dataset immutable per release; bez server cache se opakovaně parsuje | MINOR | Plan 4 R3.2 / R5.2 | Přidat do plánu ETag/304 spec; volitelně |
| **F-2.4** | `POST /solar_test` neříká, zda sdílí `aiohttp.ClientSession` | MINOR | R5.3 plán | Plán by měl explicitně: handler použije `aiohttp_client.async_get_clientsession(hass)` (jako `OIGCloudAiView.post` na `ha_rest_api.py:1402`) — neotevře novou session |
| **F-2.5** | Repeated-click protection: klient ano, server ne | MINOR | R5.3 plán | Přidat 409 + in-flight tracker; nebo zdokumentovat, že klient dedup stačí |
| **F-3.4** | `fieldsFromRegistry` alokuje nové objekty každý render | MINOR | `registry-data.ts:46–61` | Přidat `useMemo`-ekvivalent pro pricing registr (Step 3 plánu 3.6) |
| **F-1.4** | Build-only requirements path nestanovena | MINOR | Plan 4 Task 6 Step 3 | Vytvořit `scripts/requirements-build.txt` a v hlavičce `build_pricelists.py` ji zmínit |
| **F-2.1** | `GET /pricelists` plánem nemá server cache | MINOR | R3.2 / R5.2 | Přidat `lru_cache(1)` reader; plán by měl specifikovat |
| **F-5.2** | Chybí CI guard, že openpyxl nikdy neskončí v manifestu | MINOR | Plan 4 Task 9 | Přidat grep-step do smoke matrixu: `! grep openpyxl custom_components/oig_cloud/manifest.json` |

**Celkem:** 11 findingů. **0 CRITICAL**, **3 MAJOR**, **8 MINOR**. Žádný neblokuje doručení, ale **3 MAJOR je doporučeno zavřít před implementací**.

---

## Závěr pro operátora

R2-PERF verdikt: **performance / event-loop safe-by-default, s 3 MAJOR dírami k zavření před implementací**. Doporučuji:

1. **OK k pokračování** se současným plánem pro: dataset bundling (R5.1, R4), deprecation window (Task 3), API/flow hardening (Task 7/8), build script isolation, FE registry contract (R3.2/R5.2).

2. **Zavřít před implementací:**
   - F-2.3 — explicit timeout pro `POST /solar_test`.
   - F-4.1 — neblokovat setup disk writem (posunout do background tasku; idempotentní check přes marker).
   - F-4.2 — async transform support v Task 2 (pokud Task 4 sensor-first pre-seed vyžaduje I/O).

3. **Drobnosti (mohou počkat):** vše ostatní v seznamu — ZATÍM neblokují, dají se opravit v review pass po Task 9 smoke.

4. **Co NENÍ problém (odstraněno review):**
   - Synchronní `json.load` v readeru (~5–15 ms cold, OK).
   - Build závislosti v manifestu (OK dnes).
   - Wizard mount re-renders (60s FE cache + 4 REST cally paralelně, snesitelné).
   - 800 KB bundle size (release-time, ne runtime).

---

## Coverage poznámka

Tento report nepřezkoumává znovu:
- Bezpečnost (R2 round 2 samostatný report).
- Správnost cen (bude z R2 funkcionality).
- UX kritéria (Plan 3.5/3.6 mají vlastní review pass).
- AI plán D8 (vlastní review AŽ PO Plan 4 + Plan 3.6).

Pokud jde o **fakt, že se plánuje znovu lazy čtení bundled JSON přes `importlib.resources` v handleru** (= per-request, ne per setup), považuji za MINOR, ale chci to explicitně připsat k 6.1, aby to nikdo nepřehlédl. Pokud se implementace rozhodne volat `load_pricelists()` uvnitř `OIGCloudPricelistsView.get()` bez server-side cache → performance OK, ale každý reload admin karty vynutí znovu parse. Přidat `lru_cache(1)` za 3 řádky kódu.
