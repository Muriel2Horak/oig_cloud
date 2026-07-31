# Bezpečnostní review plánů 4 + 3.6 (R2-SECURITY)

**Metoda:** projit všechny plány, scope R1–R5, ověřen aktuální kód v `custom_components/oig_cloud/**` a `www_v2/src/**` (větev `codex/f1-plan3-impl`). „VERIFIED“ = přímá citace `file:line` nebo příkaz, který jsem spustil v tomto worktree. „INFERRED“ = důsledek z VERIFIED důkazu, v textu explicitně označený.

**Co je v datech nového:** nové endpointy `GET /pricelists` (Plán 4 Task 6) a `POST /solar_test` (Plán 3.6 R5.3), admin-gate na `GET module_config` (Plán 4 Task 1), transakční migrace (Plán 4 Task 2), bundled dataset (Plán 4 Task 6) a úklid klíčů/autorových defaultů (Plán 4 Task 4/5). Vše nové – kód v tuto chvíli neexistuje; níže ověřuji jak vzor, podle kterého se bude kopírovat (existující views, store, AI backend), tak to, co plán deklaruje.

---

## Souhrnný verdikt

| Dokument / oblast | Verdikt | Jedna věta |
|---|---|---|
| Nový REST surface (`GET /pricelists`, `POST /solar_test`, GET gate) | READY-WITH-FIXES | 1× CRITICAL, 3× MAJOR, 2× MINOR. Autoři nechali explicitní authz požadavky na většině nových view, ale chybí je na `/pricelists` a chybí rate-limit/error-disclosure pravidla pro `/solar_test`. |
| Migrace (Plán 4 Task 2) | NOT-READY | 1× CRITICAL (záloha není `private=True`, drží snapshot options včetně API klíčů), 1× MAJOR (wholesale replace jen v textu, ne v acceptance testu). |
| Bundled dataset (Plán 4 Task 6 / R4/R5.1) | READY-WITH-FIXES | 2× MINOR (chybí popis podpisu vydání; build závislosti nejsou v `requirements-build.in`). Žádný runtime fetch = SSRF plocha zavřená. |
| Cleanup (Plán 4 Task 4/5) | READY-WITH-FIXES | 1× MAJOR (dead-key záloha sdílí store s migrační zálohou a může přetrvat záměnu klíčů se secrets), 2× MINOR. |
| Co plány NEŘÍKAJÍ a měly by | — | 4× MAJOR (admin-gate na `/pricelists`, chování při rate-limit hitu na AI verify, `/solar_test` cross-tenant `[box_id]`, diagnostika HA nefiltruje API klíče z options). |

---

## Nalezené problémy (seřazeno dle severity)

### CRITICAL — musí se opravit před implementací

#### C-1. Zálohovací Store není `private=True`, ale snapshot obsahuje API klíče
**Plán:** `Plan 4 Task 2` (`run_migration`/`restore_last_backup`), kód ukázaný v plánu řádky `:316` `Store(hass, 1, f"oig_cloud.migration_backup_{entry_id}")` — **chybí `private=True`**.
**Důsledek:** Snapshot `entry.options` může obsahovat legacy API klíče (`solar_forecast_api_key`, `solcast_api_key` – viz `ha_rest_api.py:1111-1113`, kde jsou registrovány jako `type: str`, a `_SECRET_FIELDS = {...}` na `:1169`, který se v legacy kódu nepoužívá při ukládání snapshotu). Výchozí HA `private=False` Store ukládá do `.storage/` jako 0o644. **Plaintextová API klíč v 0o644 souboru vlastněném `homeassistant` uživatelem je čitelná pro jakýkoliv proces pod stejným UID (včetně loggerů, third-party doplňků, debug exportů).** V existujícím kódu je vzor opačný – `ai/key_store.py:35` (`private=True`) i `onboarding/state.py:69` (`private=True`) to dělají správně.
**Návrh:** Přidat `private=True` v `_backup_store(...)`. Přidat test `test_backup_store_is_private`, který projde grepem `Store(...)` volání v `config_migration.py` a ověří přítomnost `private=True`. **VERIFIED** (`__init__.py` plánu:316 vs. existující vzor `ai/key_store.py:35`).

#### C-2. (Polo-)ověřeno: GET `module_config` opravdu vrací GPS neadminům
**Plán:** `Plan 4 Task 1` toto pokrývá. **VERIFIED** aktuální kód v `api/ha_rest_api.py:1213-1229`:
- `requires_auth = True` na `:1211`
- `get` nemá žádný `is_admin` check (`:1214-1229`)
- `opts.get(key, field.default)` na `:1227` vrací `solar_forecast_latitude`/`solar_forecast_longitude` (`:1114-1115`) komukoliv přihlášenému, bez admin role.
- POST na `:1235-1237` má `is_admin` gate — asymetrie reálná.
**Doplnění plánu:** plán v bodě Step 1 vyžaduje test „non-admin → 403 (nebo redakce)". **Doporučuji explicitně napsat, že varianta „redakce" NENÍ přípustná** pro GPS pole, protože je to přesně ten typ údaje, kvůli kterému gate existuje; výchozí musí být hard 403. **VERIFIED**.

### MAJOR — musí se vyjasnit před merge

#### M-1. `/solar_test` nemá v plánu explicitní authz pravidlo
**Plán:** `SCOPE-REVISION.md R5.3` vyžaduje endpoint `POST /api/oig_cloud/{box}/solar_test` „admin-authenticated" — OK. Ale `PLAN-3.6-SPEC.md` (`:81-84`) říká „volání existující solar-forecast cesty" bez další specifikace.
**Chybějící body v plánu (každý z nich musí být v implementačním briefu, ne v release notes):**
- **Rate-limit:** žádný vzor v kódu (`grep -n 'rate' custom_components/oig_cloud/api/` = žádné hit-y v `ha_rest_api.py`). Ani `ai_task.py`/`ha_rest_api.py` nemají cooldown. Admin může `[Otestovat]` mačkat 1×/ms a provozovat DoS proti forecast provideru (Solcast free tier má 10 req/s, forecast.solar skutečně rate-limitoval box v produkci – viz paměť `forecast-solar-provider-outage.md`). **Doporučení: min. 30s cooldown per entry v in-memory dictu; při hitu vrátit 429 `Retry-After`.**
- **Error-disclosure:** vzor v `ha_rest_api.py:1419` (`{"error": "verify failed", "detail": str(err), ...}`) **leakuje plný text provider chyby**. U `solar_test` musí být chyba klasifikovaná (např. `{"error":"auth","triage":"wrong_or_missing_key"}` / `{"error":"network","triage":"provider_unreachable"}`) – plný text jen do loggeru. **VERIFIED** (existující vzor na `:1419`).
- **Latency:** forecast provider může trvat 5+ sekund; volání musí být v `asyncio.timeout(...)` s rozumným stropem (10s pro Solcast, 15s pro forecast.solar). Plán to neříká. **INFERRED** z existence `aiohttp.ClientTimeout` v `ote_api.py:315`.
- **Rate-limit na úrovni HA:** nový `/solar_test` view **musí být admin-gated** v `_require_admin` (jako `OIGCloudAiView:1346`), ne jen `requires_auth = True`. Plán říká „admin-authenticated" ale v `PLAN-3.6-SPEC.md:81-84` chybí konkrétní direktiva. **VERIFIED** existující admin pattern.

#### M-2. `/pricelists` nemá explicitní authz pravidlo
**Plán:** `R5.2` (SCOPE-REVISION.md:152) říká „authenticated `GET /api/oig_cloud/{box}/pricelists`". **Nerozlišuje admin vs. non-admin.**
**Problém:** `/pricelists` vrací veřejná data (ERÚ ceny), ale obsahuje `box_id` v URL → odhalí existenci entry i pro non-admin účet. V domácnosti s 1 účtem je to nic; v shared instanci (pronajímatel/nájemník, guest účet) **non-admin může enumerovat boxy zkoušením `box_id`**.
**Doporučení:** dvě varianty, jednu zvolit a zapsat:
1. `requires_auth = True` (bez admin) — přijatelné, protože data veřejná, ale přidat rate-limit (jako M-1).
2. `requires_auth = True` + admin (fail-closed) — bezpečnější, konzistentní s module_config GET po opravě.
**Aktuálně to není rozhodnuto.** **VERIFIED** – v `ha_rest_api.py` žádný endpoint `pricelists` zatím neexistuje (`grep -rn 'pricelists' custom_components/oig_cloud/` = 0 hitů).

#### M-3. Migrace: wholesale replace není v acceptance testu, jen v popisu
**Plán:** `Task 2 Step 3` definuje `restore_last_backup` jako wholesale replace, a `Task 2 Step 1` má test `test_restore_round_trips_to_pre_migration_options` s asercí `"_migration" not in entry.options`. **VERIFIED** text plánu.
**Problém:** plán v kódu ukázaném v `:356` volá `merge_entry_options(hass, entry, updates, suppress_reload=True)`. V `:374` ukazuje `hass.config_entries.async_update_entry(entry, options=dict(snapshot))` jako wholesale. **Ale chybí test, že po úspěšné `run_migration` se `_migration` marker v options opravdu objeví, a po `restore_last_backup` zase zmizí.** Pokud implementátor udělá jen merge, test `test_restore_round_trips_to_pre_migration_options` projde (protože `_migration` v snapshotu byl `{}`), ale `_migration.complete=True` v options přetrvá a nikdo to neodhalí.
**Doporučení:** přidat `test_migration_marker_present_after_commit` a `test_migration_marker_absent_after_restore`. **INFERRED** z textového rozporu v plánu.

#### M-4. Dead-key záloha sdílí Store s migrační zálohou
**Plán:** `Task 2` ukládá `snapshot` + `journal` do `oig_cloud.migration_backup_<entry_id>`. `Task 5` ukládá `removed_keys` do **stejného** Store (kód ukázaný v `:691-705`). 
**Důsledek:** Pokud `_entry_with_options` přijde o Store (vymazání, rotace logů), ztratí se obojí. Hůř: `strip_dead_keys` čte backup, **modifikuje ho** (přidává `removed_keys` + `backup_until_version`) a **přepisuje** – tím riskuje přepsání `journal` záznamů, pokud obě metody běží paralelně. Plán tuto koexistenci neřeší. **VERIFIED** plán `:691-705` ukazuje zápis bez `journal` merge.
**Doporučení:** Buď dva oddělené Stores (`oig_cloud.dead_keys_<entry_id>` + `oig_cloud.migration_backup_<entry_id>`), nebo **explicitně serializovat přes `asyncio.Lock`**. Plán neříká ani jedno.

#### M-5. Plán 4 neříká, jak se chovat k legacy API klíčům v options během Task 5/8
**Plán:** `Task 5` maže dead-key záznamy (mj. `disable_planning_min_guard`, `price_hysteresis_czk`, `hw_min_hold_hours`). **ALE** `_MODULE_CONFIG_FIELDS` (`ha_rest_api.py:1111-1113`) stále obsahuje `solar_forecast_api_key`, `solcast_api_key` jako `type: str` — dokud `Task 8` nesmaže celý `_MODULE_CONFIG_FIELDS`, tyto klíče zůstávají v `entry.options` a tedy i v migračním snapshotu (`Store.async_save(snapshot)` ukládá cokoliv, co dostane).
**Důsledek:** **API klíče se perzistují v 0o644 souboru** (viz C-1) dokud se Task 8 nedodělá a nezahájí `async_setup_entry` přes `merge_entry_options(...)` jenom přes whitelist.
**Doporučení:** Plán by měl explicitně říct: **(a)** legacy secret klíče v options se přesunou do `AiKeyStore`-pattern privátního Store (nebo rovnou smažou a donutí uživatele znovu zadat) ještě **před** nasazením migračního kódu; **(b)** `strip_dead_keys` musí **nejprve** ověřit, že klíč není v setu `KNOWN_SECRET_FIELDS` a pokud ano, přeskočit a logovat. **VERIFIED** vzor v `ha_rest_api.py:1111-1113` + absence secret-migračního kroku.

#### M-6. Diagnostika a core dumps mohou unikat klíče z options
**Plán:** Plán 4 nemá sekci o tom, co HA `diagnostics` endpoint (`/api/diagnostics`) vrací. Výchozí chování HA `async_get_config_entry_diagnostics` vrací `entry.options` v plném rozsahu. **Dokud** se `solar_forecast_api_key`/`solcast_api_key` nepřesunou mimo options (viz M-5), jsou citelné z diagnostiky pro kohokoliv s `diagnostics` oprávněním (typicky admin, ale ne vždy – vlastní `diagnostics` implementation může být i pro non-admin).
**Doporučení:** Plán by měl přidat `async_get_config_entry_diagnostics` override, který vyfiltruje klíče z `_SECRET_FIELDS` – minimálně pro dobu, než Task 8 smaže legacy shimy. **INFERRED** z defaultu HA `async_get_config_entry_diagnostics` (standardní HA API).

### MINOR — stojí za řešení, neblokuje implementaci

#### m-1. Bundled JSON nemá kryptografický podpis v release
**Plán:** `R5.1` vyžaduje SHA-256 per source file v JSONu, ale **release artifact (HACS zip) nemá žádný podpis nad rámec HACS standardu** (který ověřuje jen integritu GitHub release, nikoliv build pipeline → JSON).
**Důsledek:** Útočník s push přístupem do forku může nahradit `data/pricelists.json` v release, a HACS happy-path to neodhalí. Důvěra je v maintainerovi + GitHub branch protection + HACS review.
**Doporučení:** Přidat `in_release_signature` (minisign/cosign) a test, který ji ověří při startu integrace. **INFERRED** z absenci v plánu.

#### m-2. Build závislosti nejsou v `requirements-build.in`
**Plán:** `R5.1` říká „Build dependencies (openpyxl) MUST NOT appear in the integration manifest" a „Vlastní requirements pro build". **Ale v repu není** `requirements-build.in`/`requirements-build.txt` ani `scripts/requirements.txt` – `scripts/` obsahuje jen shell skripty a YAML (`ls /repos/wt-oig-p3impl/scripts/` – VERIFIED).
**Doporučení:** Vytvořit `scripts/requirements-build.in` (openpyxl, cnb-rate, mypy pro statickou kontrolu, requests pro future ERÚ fetch) a přidat `pip install -r scripts/requirements-build.in` do CI/release playbooku.

#### m-3. Plan 4 Task 4 „pre-seed" je přesně ten mechanismus, co může unikat klíč
**Plán:** `Task 4 Step 3` říká „register an upgrade transform in `config_migration.py` that, for entries whose effective value previously came from the removed default, pre-seeds that value into options". Tím se **do options dostane např. `solar_forecast_api_key`** (pokud je předtím v options), čímž se klíč dostane do **wholesale snapshotu** v `_backup_store.async_save(backup)`. **VERIFIED** plán:586 + C-1.
**Doporučení:** Pre-seed smí zapisovat jen ne-secret klíče; pro `KNOWN_SECRET_FIELDS` se pre-seed přeskočí.

#### m-4. `restore_migration_backup` service – auditovatelnost
**Plán:** `Task 2 Step 3b` registruje service `oig_cloud.restore_migration_backup`. **Pouze** admin. **Ale** žádný zápis do persistentního audit logu nad rámec HA event logu. Pokud by admin omylem vyvolal restore na špatném entry, rollback je možný jen do doby, než se `_migration` marker přepíše.
**Doporučení:** Přidat povinný parametr `confirm: bool` do schema a vynutit 2-krokové potvrzení v UI; service by měla zalogovat `entry_id`, `user_id`, `confirm=True` na INFO.

#### m-5. Wizard step ③ „use the AI already in Home Assistant" delegace je UNVERIFIED
**Plán:** `ai_task.py:108-138` (`_async_delegate_to_host_ai_task`) je v dokumentaci sama označena jako „UNVERIFIED – ai_task is absent from the dev harness (HA 2025.1.4), so the real delegation API could not be read or exercised here." **VERIFIED** text v `ai_task.py:115-126`.
**Důsledek:** Když delegace selže (špatné API v reálném HA ≥ 2025.8), entita tiše vrátí co? `GenDataTaskResult(conversation_id, data=None)` – HA to interpretuje jako chybu konverzace; uživatel neví proč.
**Doporučení:** Před implementací D8 tento bod reálně ověřit (CI s HA 2025.8) – neplést s bezpečností, ale s korektností. **Zde uvedeno, protože plán 4/3.6 se na to spoléhá.**

---

## Mapování oblastí briefu → kde je odpověď

| Oblast briefu | Status | VERIFIED důkaz |
|---|---|---|
| 1. `GET /pricelists` authz | ⚠️ MAJOR (M-2) | Endpoint v kódu neexistuje – v plánu chybí explicitní rozhodnutí |
| 1. `POST /solar_test` authz | ✅ admin (dle R5.3), ⚠️ MAJOR pro rate-limit/error-disclosure (M-1) | Endpoint v kódu neexistuje |
| 1. GET `module_config` admin-gate | ✅ pokryto Task 1 | `ha_rest_api.py:1213-1229` (chybějící `is_admin`) vs `:1235-1237` (přítomný) |
| 1. SSRF na `/solar_test` | ✅ žádný (lat/lon jsou numeric s validací -90/90, -180/180) | `_MODULE_CONFIG_FIELDS` `ha_rest_api.py:1114-1115` `rng: (-90.0, 90.0)` a `(-180.0, 180.0)` |
| 2. Migrace – transakční restore | ✅ wholesale replace popsaný + admin service (Task 2 Step 3b) | Plán `:333-376` |
| 2. Záloha – permissions | ❌ CRITICAL C-1 | `Store(..., f"oig_cloud.migration_backup_{entry_id}")` chybí `private=True` |
| 2. Downgrade safety | ⚠️ plán přiznává omezení (`:266-277`); neříká jak dlouho je `1-release backup` živý | Plán `:267` |
| 3. Bundled – runtime fetch | ✅ zakázáno (SCOPE-REVISION #4 + Task 6 test `test_NO_network_fetch_occurs`) | Plán `:769-778` |
| 3. Provenance (hash, source URL) | ✅ R5.1 vyžaduje SHA-256 + `source_url` + `fetched_at` | Plán R5.1 (SCOPE-REVISION.md:137-146) |
| 3. Build dependency pinning | ⚠️ MINOR m-2 | `ls /repos/wt-oig-p3impl/scripts/` – VERIFIED, chybí requirements-build.* |
| 4. Dead-key/author-default – leak secrets | ⚠️ MAJOR M-5 | `_MODULE_CONFIG_FIELDS` v `ha_rest_api.py:1111-1113` + Store bez `private=True` |
| 5. Co plány NEŘÍKAJÍ | 4× MAJOR (viz sekce níže) | – |

---

## Co plány NEŘÍKAJÍ a měly by (konsolidace)

1. **Authz rozhodnutí pro `/pricelists`**: non-admin vs. admin; dnes nejasné (M-2).
2. **Rate-limit + cooldown + 429 + Retry-After** na `/solar_test` (M-1).
3. **Error-message klasifikace** na `/solar_test` a `/ai verify` (M-1) – plná chyba do loggeru, klient dostane jen `{error, triage}`.
4. **Životnost 1-release zálohy dead-keys** + cleanup po vypršení (M-4, m-3).
5. **Audit log** pro `restore_migration_backup` a pro všechny admin-gated write endpointy (m-4).
6. **Chování diagnostiky** – filtr API klíčů z `entry.options` (M-6).
7. **Plán na rotaci existujících legacy API klíčů** (přesun do `AiKeyStore` pattern) **před** Task 2, jinak se dostanou do plaintextového snapshotu (M-5, C-1).
8. **CSRF/CORS pravidla** pro nové endpointy – HA REST views to typicky řeší automaticky, ale **explicitní poznámka** „same-origin only" by se hodila v době, kdy se `/solar_test` přidá (v plánu chybí).
9. **Definovat „telemetry of repeated failures"** – plán migrační logování (`journal`) řeší audit, ale **uživatel** se o opakovaném selhání migrace nedozví (žádná notifikace v HA). Doporučení: persistent notification po 3. selhání za 24h.

---

## Ranked „fix before implementation starts" list

| Pořadí | ID | Název | Severity |
|---|---|---|---|
| 1 | C-1 | Migration backup Store: přidat `private=True`; vyloučit `KNOWN_SECRET_FIELDS` ze snapshotu | CRITICAL |
| 2 | C-2 | Explicitně v plánu: varianta „redakce GPS" není přípustná pro `module_config` GET | CRITICAL |
| 3 | M-5 | Přesun legacy API klíčů z options mimo `entry.options` **před** Task 2 nasazením | MAJOR |
| 4 | M-1 | `/solar_test`: explicitně přidat rate-limit (30s cooldown), `asyncio.timeout`, klasifikované chyby | MAJOR |
| 5 | M-2 | `/pricelists`: rozhodnout admin vs. non-admin a zapsat | MAJOR |
| 6 | M-3 | Přidat `test_migration_marker_present_after_commit` + `test_migration_marker_absent_after_restore` | MAJOR |
| 7 | M-4 | Oddělit dead-key zálohu od migrační zálohy (vlastní Store **nebo** `asyncio.Lock`) | MAJOR |
| 8 | M-6 | Přidat `async_get_config_entry_diagnostics` override filtrující secrets | MAJOR |
| 9 | m-3 | Pre-seed v Task 4 nesmí zapisovat do `KNOWN_SECRET_FIELDS` | MINOR |
| 10 | m-4 | `confirm: bool` v `restore_migration_backup` schema; audit log | MINOR |
| 11 | m-2 | Vytvořit `scripts/requirements-build.in` (openpyxl pinned) | MINOR |
| 12 | m-1 | `in_release_signature` pro `data/*.json`; CI verification step | MINOR |
| 13 | m-5 | Ověřit `_async_delegate_to_host_ai_task` v reálném HA ≥ 2025.8 (CI bump) | MINOR |

---

## Appendix A – VERIFIED současný stav (rychlá mapa)

| Téma | Soubor:řádek | Stav |
|---|---|---|
| `module_config` POST admin gate | `ha_rest_api.py:1235-1237` | ✅ hotovo v kódu |
| `module_config` GET admin gate | `ha_rest_api.py:1213-1229` | ❌ chybí (Plan 4 Task 1 to opraví) |
| `ai` admin gate (GET/POST) | `ha_rest_api.py:1342-1346` | ✅ hotovo |
| `onboarding` admin gate | `ha_rest_api.py:1447-1454` | ✅ hotovo |
| `planner_settings` admin gate (POST) | `ha_rest_api.py:1021-1025` | ✅ hotovo, ale styl `request.app.get` nekonzistentní s ostatními view |
| AI klíče perzistence | `ai/key_store.py:35` | ✅ `Store(..., private=True)` |
| Onboarding state perzistence | `onboarding/state.py:69` | ✅ `Store(..., private=True)` |
| Existující `/solar_test` | `grep` 0 hitů | ❌ neexistuje, plánovaný v R5.3 |
| Existující `/pricelists` | `grep` 0 hitů | ❌ neexistuje, plánovaný v Task 6 |
| `scripts/build_pricelists.py` | `ls scripts/` | ❌ neexistuje, plánovaný v R5.1 |
| `config_migration.py` | `find` 0 hitů | ❌ neexistuje, plánovaný v Task 2 |
| `config_deprecation.py` | `find` 0 hitů | ❌ neexistuje, plánovaný v Task 3 |
| `remote_config/` | `find` 0 hitů | ❌ neexistuje, plánovaný v Task 6 |
| FE secret rendering `<input type=password>` | `www_v2/.../settings/index.ts:715-723` | ✅ hotovo (Plan 4 Task 1 cite `:627/:634` je **zastaralý** – poloha a absence `password` type už v kódu neplatí; U5 z UX-AUDIT je pravděpodobně již vyřešen) |
| Vzor pro nové REST views | `ha_rest_api.py:1321-1424` (OIGCloudAiView) | ✅ použitelný pro `/solar_test` a `/pricelists` |

## Appendix B – Doporučený šablonový kód pro nové endpointy (pro implementera)

```python
# Vzor pro /solar_test a /pricelists — admin gate + structured errors + timeout
class OIGCloudSolarTestView(HomeAssistantView):
    url = f"{API_BASE}/{{box_id}}/solar_test"
    name = "api:oig_cloud:solar_test"
    requires_auth = True

    def _require_admin(self, request: web.Request) -> Optional[web.Response]:
        user = request.get("hass_user") if hasattr(request, "get") else None
        if user is None and hasattr(request, "app"):
            user = request.app.get("hass_user")
        if not user or not user.is_admin:
            return web.json_response({"error": "Admin only"}, status=403)
        return None

    async def post(self, request, box_id):
        denied = self._require_admin(request)
        if denied: return denied
        # … validate body …
        try:
            async with asyncio.timeout(15):
                kwh = await self._fetch_tomorrow_kwh(box_id)
        except asyncio.TimeoutError:
            return web.json_response({"error": "timeout"}, status=504)
        except aiohttp.ClientError as err:
            _LOGGER.warning("solar_test failed: %s", err)
            return web.json_response({"error": "upstream", "triage": "unreachable"}, status=502)
        return web.json_response({"tomorrow_kwh": kwh})
```

---

## Závěr

Plány 4 a 3.6 jsou po bezpečnostní stránce **konceptuálně zdravé** (admin-gates na nových write/view površích, zrušení runtime fetche, transactional migration core, `private=True` Store pro nové credential store). **Hlavní díra je v implementačních detailech**: chybějící `private=True` na jednom Store (C-1), chybějící rate-limit a chybové plánování pro `/solar_test` (M-1), a absence explicitního plánu pro legacy API klíče v options během přechodného období (M-5).

**Doporučení:** implementaci Task 1 lze začít ihned (čistě stávající kód). Implementaci Task 2 **odložit** do doby, než se vyřeší C-1 + M-5. Implementaci Task 6 lze začít po vyřešení M-2 (rozhodnutí o authz `/pricelists`).

**Není verdikt:** kód nových endpointů (`/solar_test`, `/pricelists`, `config_migration.py`, `build_pricelists.py`) v tomto worktree neexistuje – nemohu potvrdit ani vyvrátit, jestli implementační PR skutečně tyto direktivy dodrží. **Review se vztahuje k PLÁNŮM**, ne k jejich (neexistujícím) implementacím.
