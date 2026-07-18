# R2 anti-stub re-review po R5

## Verdikt

| Otázka | Verdikt | Důkaz |
|---|---|---|
| R5 zavírá původní prázdný JSON / prázdné selecty | ČÁSTEČNĚ ANO | R5.1 vyžaduje všechny DSO a tarify; R5.2 vyžaduje nenulový počet distributorů, tarifů a alespoň jednu předvyplněnou cenu. `SCOPE-REVISION.md:137-154` |
| R5 brání chybnému release JSONu | NE | Není požadavek, aby release soubor vznikl z výstupu skriptu ani aby se oba bajtově/sémanticky porovnaly. Plan 4 Task 6 stále testuje jen `year` a tři klíče DSO. `SCOPE-REVISION.md:137-146`; Plan 4:757-778 |
| R5 dává agentovi s nulovou historií vykonatelný brief | NE | R5.6 vyžaduje anglické restatementy, ale obě implementační specifikace jsou česky a žádný anglický task brief zde není. `SCOPE-REVISION.md:172-175`; `PLAN-3.6-SPEC.md:1-97` |

Nálezy: **2 CRITICAL, 8 MAJOR, 2 MINOR**. Opakované řádky v A2A tabulce jsou důkaz/rozpad stejných nálezů, ne další započtení.

## 1. Prázdný výstup: co R5 skutečně zavřel

| Uživatelský výstup / kritérium | Projde prázdná implementace? | Stav | Důkaz |
|---|---:|---|---|
| 3.6 AK-1: krok Solar | Ne | VERIFIED | AK vyžaduje `input`/`select`, alespoň 6 interaktivních prvků a konkrétní podmíněná pole. `PLAN-3.6-SPEC.md:28-35` |
| 3.6 AK-2: Solar test | Ne pro prázdné tlačítko či výsledek | VERIFIED | AK vyžaduje tlačítko a DOM výsledek/chybu; R5.3 navíc POST s aktuálními hodnotami. `PLAN-3.6-SPEC.md:37-43`; `SCOPE-REVISION.md:156-161` |
| 3.6 AK-3: krok Ceny | Ne | VERIFIED | AK vyžaduje oba selecty, předvyplněnou cenu a varování; R5.2 vyžaduje klientský render test nad endpointem. `PLAN-3.6-SPEC.md:45-51`; `SCOPE-REVISION.md:148-154` |
| 3.6 AK-4: dokončení a remount | Ne | VERIFIED | R5.4 vyžaduje reálný wizard, vyplnění, kliknutí a DOM stav po remountu; přímý POST testem je zakázán. `SCOPE-REVISION.md:163-166` |
| 3.6 AK-5: dashboard při nedokončeném wizardu | **Ano** | VERIFIED — MAJOR | Text pouze říká „Dashboard se renderuje vždy“, bez závazné DOM aserce na jeho obsah. `PLAN-3.6-SPEC.md:60-62`. Současný test sice hledá `oig-tabs`/`.tab-content`, ale plán ho neuvádí jako akceptaci: `www_v2/src/__tests__/onboarding-soft-gate.test.ts:84-95`. Prázdný dashboard tedy může projít nově napsanými 3.6 testy. |
| Plan 4 Task 4: chybějící GPS/kapacita | Ne, pouze pokud test skutečně mountuje produkční plochu | VERIFIED — MAJOR | R5.5 správně zakazuje log-only test a vyžaduje viditelné varování i recovery action. Není však uvedena konkrétní plocha/komponenta, proto lze test omylem napsat proti testovacímu či nepoužitému rendereru. `SCOPE-REVISION.md:168-170`; Plan 4:547-577 |
| Plan 4 Task 6: prázdný ceníkový dataset | Ne při doslovném vynucení R5 | VERIFIED | R5.1 vyžaduje kompletní tarify/ceny a R5.2 non-empty selecty + cenu. Původní test by ale prázdné objekty pustil: `assert {cez, egd, pre} <= ...`. `SCOPE-REVISION.md:137-154`; Plan 4:757-761 |
| Plan 4 Task 6: „frontend contract" mimo skutečný wizard | Ano pro Plan 4 samotný | VERIFIED — MAJOR | R5.2 neříká, že render test mountuje krok `oig-onboarding-wizard` ani že je testovaná komponenta zapojená do produkční cesty. Současný wizard dál renderuje pouze odkaz do Nastavení/Ceny. `SCOPE-REVISION.md:148-154`; `www_v2/src/ui/features/onboarding/index.ts:473-507` |

## 2. R5.1: malicious-but-passing release

| Varianta | Proč projde definovanými testy | Proč je škodlivá | Stav / závažnost |
|---|---|---|---|
| Skript korektně zpracuje ERÚ fixture do dočasného výstupu v testu, ale release `remote_config/data/pricelists.json` je ručně zapsán jako rok 2026, tři neprázdná DSO, jeden falešný tarif na DSO a cena `0.01`. | R5.1 nevyžaduje, aby výstup skriptu byl tentýž soubor, který se balí. R5.2 kontroluje pouze neprázdné selecty, alespoň jednu cenu a větev stale-warning; původní Task 6 kontroluje jen rok a klíče DSO. | Uživatel dostane falešné předvyplnění ceny; bundle může být green, přestože fixture-ověřený generátor existuje bokem. | VERIFIED — **CRITICAL**. `SCOPE-REVISION.md:137-154`; Plan 4:739-741,757-778,815-820 |
| Generátor vytvoří všechny klíče tarifů, ale pro všechny kromě jedné fixture-asertované buňky zapíše špatné ceny. | „Kompletní“ nemá normativní JSON Schema, seznam očekávaných tarifů/price fields ani úplný fixture-to-output oracle. Uvedeny jsou jen tři příklady mapování buněk/jednotky. | Formálně neprázdný dataset, ale nesprávné ceny v plánovači. | VERIFIED — **CRITICAL**. `SCOPE-REVISION.md:137-146`; R4 popisuje více cenových složek, ale ne jejich serializaci: `SCOPE-REVISION.md:93-125` |

**Nutná uzávěra R5.1:** commitovat versioned ERÚ fixture + canonical expected JSON; test musí spustit `scripts/build_pricelists.py` do přesně pojmenovaného release path, porovnat celý normalizovaný obsah s expected JSON a ověřit, že právě tento soubor se načte přes `importlib.resources`. Test musí mít explicitní seznam DSO, tarifů, každého price field a jejich fixture cell/value; nestačí existence klíčů.

## 3. Čistě negativní požadavky bez dostatečného pozitivního protějšku

| Nález | Stav / závažnost | Důkaz | Potřebný pozitivní protějšek |
|---|---|---|---|
| „openpyxl nesmí být v integračním manifestu“ lze splnit tím, že není deklarován nikde; čisté maintainer prostředí pak build nespustí. | VERIFIED — MINOR | `SCOPE-REVISION.md:145-146`; R4 pouze neurčitě říká „vlastní requirements pro build“. `SCOPE-REVISION.md:109-111` | Konkrétní `scripts/requirements-pricelists.txt` nebo ekvivalent, pinned dependency a CI test instalace + spuštění skriptu. |
| Task 5 zakazuje sahat na čtyři P6 plochy, ale Plan 4 jim nedává vlastníka ani následný pozitivní výsledek. | VERIFIED — MINOR | Plan 4:710-714; odklad je potvrzen na Plan 4:1144-1147. | Pojmenovaný follow-up plan/issue s ownerem a akceptací, nebo záměrně ponechat jako explicitně podporované živé klíče. |

Ostatní podstatné zákazy mají protějšek: bundled reader pro no-fetch, `unavailable` + warning pro no-fallback a reálný UI flow pro no-direct-POST. `SCOPE-REVISION.md:148-170`; Plan 4:784-816.

## 4. Render pokrytí skutečného DOM

| Plocha | Závazná DOM aserce v dokumentech po R5 | Mezery |
|---|---|---|
| Wizard krok ② Solar | Ano | R5.3 stále nepožaduje backendový test, že POST skutečně zavolá forecast provider. |
| Wizard krok ③ Ceny | Ano pro 3.6 AK-3 | R5.2 pro Plan 4 nemá vazbu na `oig-onboarding-wizard`; izolovaný komponentní test nestačí pro kompozici. |
| Dokončení/remount wizardu | Ano | Chybí přesné mapování kliknutí na `complete_step`/`skip` pro všechny tři kroky. |
| Dashboard za soft guide | **Ne v plánu** | AK-5 nemá minimální produkční DOM ani pojmenovaný test. |
| Missing-config warning Tasku 4 | Nedostatečně určeno | R5.5 říká mountovat „affected surface“, ale neidentifikuje produkční komponentu, selector ani recovery action. |

## 5. Další anti-stub mezery

| Nález | Stav / závažnost | Důkaz | Oprava před implementací |
|---|---|---|---|
| Solar POST může přijmout hodnoty a vrátit pevné/mockované `tomorrow_kwh`, aniž by zavolal skutečný forecast klient. R5.3 vyžaduje FE spy na endpoint, nikoli server-side spy na fetch. | VERIFIED — MAJOR | R5.3: `SCOPE-REVISION.md:156-161`; v aktuálním API žádná `solar_test` cesta není: `rg -n "solar_test" custom_components/oig_cloud/api` → 0; současný `module_config` již poskytuje validaci a zápis: `api/ha_rest_api.py:1200-1300`. | Definovat request/response/error schema a backend test s fake forecast clientem, který asertuje volání s aktuálními hodnotami a mapování výsledku/chyby. |
| 3.6 požaduje, aby uživatel Solar/Ceny vyplnil a potvrdil, ale nepředepisuje zápis těchto hodnot. R5.4 persistuje pouze onboarding stav. Po reloadu mohou být kroky done a konfigurace prázdná. | VERIFIED — MAJOR | `PLAN-3.6-SPEC.md:28-58,81-86`; R5.4: `SCOPE-REVISION.md:163-166`. Existující `POST module_config` očekává `{section, values}`: `api/ha_rest_api.py:1200-1300`; wizard dnes při Dokončit jen zavře: `www_v2/src/ui/features/onboarding/index.ts:412-420,573-579`. | Vyžadovat UI test: vyplnit Solar/Pricing, uložit do konkrétních endpointů, remount/reload načte stejné hodnoty; před `complete_step` musí uložené hodnoty projít validací. |
| Přidání `pricing` sekce není dotaženo do existující konfigurace: backend GET iteruje natvrdo pouze `basic/modules/battery/solar/boiler`, TS `SettingsSection` nezná pricing. | VERIFIED — MAJOR | `api/ha_rest_api.py:1220-1229`; `www_v2/src/data/settings-data.ts:92-99`; R5.2: `SCOPE-REVISION.md:148-153` | Specifikovat field keys, typy, units, save/load API, update hard-coded section list a test perzistence po reloadu. |
| Volba snapshotu a stale warning jsou rozporné/neurčité: R4 vybírá poslední `platí_od <= dnes` a stárnutí > 1 rok, AK-3 varuje již při `year < current year`, R5.2 jen říká stale-year. | VERIFIED — MAJOR | `SCOPE-REVISION.md:100-107`; `PLAN-3.6-SPEC.md:46-51`; `SCOPE-REVISION.md:151-153` | Jedno pravidlo s injected clock, timezone a boundary testy; endpoint musí vracet vybraný snapshot i `valid_from`/stale boolean. |

## 6. A2A: předpoklady skryté před implementerem s nulovou historií

| Chybějící informace / neakční zkratka | Stav / závažnost | Důkaz | Co musí být v anglickém task briefu |
|---|---|---|---|
| R5.6 je porušeno přímo: žádný anglický restatement R5.1–R5.5, file list ani test command pro 3.6. | VERIFIED — MAJOR | `SCOPE-REVISION.md:172-175`; `PLAN-3.6-SPEC.md:79-87` | Samostatný English brief pro Task 6 a 3.6, s precedence „R5 overrides weaker plan text“, exact files, commands a acceptance. |
| JSON kontrakt neexistuje: Plan 4 očekává top-level `year`/`distributors`, R5 vyžaduje `valid_from` snapshots + metadata per source. Není path vstupů, CLI, expected output ani packaging check. | VERIFIED — CRITICAL | Plan 4:757-761,797-815; `SCOPE-REVISION.md:137-146` | Versioned JSON Schema, fixture paths/ERÚ URLs, CLI, canonical expected output, source metadata placement, current/future snapshot policy a release-file equality test. |
| „distributor enum derives from bundled dataset“, „tariff selector“ a „confirmed-price fields“ nemají field keys, price model, jednotky ani persistence. | VERIFIED — MAJOR | `SCOPE-REVISION.md:148-153`; `config_registry.py:15-39,99-134` | Konkrétní registry entries, dynamic enum mechanism, POST body, reload semantics a fields returned by `GET /pricelists`. |
| `POST /solar_test` nemá payload, validaci tajných polí, provider adapter, error classification ani response schema; „tomorrow“ nemá timezone. | VERIFIED — MAJOR | `SCOPE-REVISION.md:156-161`; absence endpointu ověřena příkazem výše | Pojmenovaný handler/service, `{values}` schema, auth, error codes/text keys, `{tomorrow_kwh, unit, date}` schema a fake-client integration test. |
| Completion není operationalizováno: co provede Next, Skip a Finish pro každý krok a kdy se po save posílá `complete_step`? | VERIFIED — MAJOR | `PLAN-3.6-SPEC.md:53-58,81-86`; `www_v2/src/ui/features/onboarding/onboarding-data.ts:99-131` | Stavový přechodový diagram/tabulka a UI test pro každý action/status, včetně failure/retry soft-guide chování. |
| „Affected surface“ a „recovery action“ u R5.5 jsou anonymní; implementer neví, zda jde o entity card, dashboard Flow, Settings nebo HA notice. | VERIFIED — MAJOR | `SCOPE-REVISION.md:168-170`; Plan 4 Task 4 má jen backend test outline s logem: Plan 4:567-570 | Exact component/path, DOM selector, konkrétní text/i18n key a klikací recovery action. |
| Deklarované vynucení `brief-lint` nemá path ani invocation; v review prostředí `brief-lint --help` skončilo `command not found`. | VERIFIED — MINOR | Zadání R5.6; příkaz proveden 2026-07-18 | Umístit/odkázat linter, jeho config a povinný CI command; neprohlašovat enforcement bez něj. |

### Neocitované české termíny, které brief musí zachovat v uvozovkách a vysvětlit anglicky

| Kategorie | Termíny, jež implementer musí použít / namapovat | Důkaz |
|---|---|---|
| UI | „Nastavení“, „Ceny“, „Tarify“, „Otestovat“, „Dokončit“, „Přeskočit“, „poskytovatel“, „sazba“ | `PLAN-3.6-SPEC.md:28-58`; současný hard-coded wizard: `www_v2/src/ui/features/onboarding/index.ts:244-248,473-507,558-579` |
| Regulatorní data | „ERÚ“, „cenový výměr“, „D-sazby“, „D01d–D61d“, „DPH“, „POZE“, „Kč/A/měsíc“, „platí_od“, „ČEZ“, „EG.D“, „PRE“ | `SCOPE-REVISION.md:88-125,137-145`; Plan 4:739 |

## Fix before implementation starts

1. **CRITICAL:** Založit anglické, self-contained briefy pro Plan 4 Task 6 a Plan 3.6; vložit complete JSON/API/UI contracts a R5 precedence.
2. **CRITICAL:** Navázat build fixture → canonical expected JSON → skutečný bundled release file; kontrolovat všechny value/cell mappings, ne jen keys/selecty.
3. **MAJOR:** Definovat a otestovat persistence Solar/Pricing přes konkrétní save endpoint před onboarding completion; rozšířit load path o `pricing`.
4. **MAJOR:** Specifikovat `solar_test` a testovat skutečné provider invocation, klasifikované chyby a timezone/date output.
5. **MAJOR:** Pojmenovat produkční DOM mounty/selectory pro pricing contract, missing-config warning a dashboard; testovat je přes skutečný wizard/app, ne izolovaný objekt.
6. **MAJOR:** Sjednotit `valid_from`/„platí_od“ snapshot selection a stale rule.
7. **MINOR:** Dodat maintainer dependency manifest + CI command pro build script a dostupný `brief-lint` command/config.
