# Plán 3.6 — dokončení onboarding wizardu (SPEC k připomínkování)

**Stav:** návrh, PŘED implementací. Podléhá `VERIFICATION-STANDARD.md` (šest pravidel).
**Větev:** codex/f1-plan3-impl (tip b761c1b4), nasazeno na živém HA.

## Proč vzniká

Plán 3 dodal wizard, jehož kroky ② a ③ jsou prázdné obrazovky. Ověřeno naživo 2026-07-18 přes
Chrome MCP na nasazené instanci:

| Krok | Skutečnost na živém boxu |
|---|---|
| ① AI | ✅ funkční — odkazy, návody, maskovaná pole; klíč uložen a **ověřen** (`provider: nvidia, key_set: true, verified: true`) |
| ② Solar | ❌ 0 vstupních polí, text „Solar settings … najdete v Nastavení" |
| ③ Ceny | ❌ 0 vstupních polí, text „Tarify … najdete v Nastavení → Tarify" |
| „Dokončit" | ❌ nezapíše nic — stav zůstává `steps: {ai/solar/pricing: pending}`, `provider: null` |

Datová vrstva (`STEP_SOLAR.fields()`, `visibleFields()`) je přitom hotová a správná — jen ji nikdo
nevykresluje. To je přesně ten defekt, kvůli kterému vznikl verifikační standard.

---

## Akceptační kritéria (pozorovatelný výsledek uživatele — Pravidlo 1)

Formulováno tak, jak to uvidí/udělá uživatel. Každé musí být ověřitelné render asercí (P3)
a nakonec i mým průchodem UI na nasazené instanci (P4/P5).

### AK-1 — Krok ② Solar je skutečný formulář
Uživatel v kroku ② **vidí a může vyplnit**: poskytovatel (select), API klíč / site ID podle
zvoleného poskytovatele, zeměpisná šířka/délka, a pro každý aktivní string kWp / sklon / azimut.
- Pole se odvozují **z registru** (`fieldsFromRegistry(reg,'solar')`) — jeden zdroj definic, žádný
  druhý seznam. **A vykreslí se jako `<input>`/`<select>`.**
- Přepnutí poskytovatele **skryje/odkryje** správné pole klíče (stejný predikát jako v Nastavení).
- **Render aserce:** vykreslený krok ② má ≥ 6 interaktivních prvků; po přepnutí na `solcast` je
  přítomné `solcast_api_key` a nepřítomné `solar_forecast_api_key`.

### AK-2 — [Otestovat] stáhne reálnou předpověď
V kroku ② je tlačítko **[Otestovat]**. Po stisku se zavolá skutečná předpověď a uživatel uvidí
buď **graf/číslo výroby na zítřek**, nebo **lidsky formulovanou chybu** (špatný klíč / site ID /
nedostupný server).
- Netýká se dashboardu: krok ② může selhat, ale nesmí zablokovat průchod průvodcem (P6 SCOPE-REVISION — měkký průvodce).
- **Render aserce:** tlačítko existuje; po mocku úspěšné odpovědi je v DOM prvek s výsledkem;
  po mocku chyby je v DOM čitelná chybová hláška.
- **Contract:** `[Otestovat]` MUST call `POST /api/oig_cloud/{box}/solar_test` from the rendered wizard step with a provider-specific request body that contains exactly these keys:
  - `provider`
  - selected provider credential or site id
  - `latitude`
  - `longitude`
  - active string values used by the selected model (`solar_panel_power_kwp`, `solar_panel_tilt`, `solar_panel_azimuth`)

  Unknown keys (`entity_id`, `box_id`, `base_url`, etc.) must be rejected before outbound calls (`additionalProperties=false`).
- **Contract binding:** UI-to-endpoint, classified error code shape, and verification-before-replace rules in `SCOPE-REVISION.md: R7.3` and `SCOPE-REVISION.md: R7.12`.
- **Falsification:** if the handler sends any endpoint other than `POST /api/oig_cloud/{box}/solar_test`, sends unknown fields, forwards raw body, or sends a replacement key without successful `/solar_test`, the acceptance test fails.

### AK-3 — Krok ③ Ceny je skutečný formulář
Uživatel vybere **distributora** a **sazbu**; formulář se **předvyplní z přibaleného datasetu**
(ERÚ, s uvedeným rokem platnosti) a uživatel hodnoty **potvrdí**.
- Dataset je bundled (SCOPE-REVISION #2) — žádný runtime fetch.
- Je-li vybraný přiložený snapshot starší než aktuální rok (`snapshot.valid_from.year < current_year`), uživatel vidí **varování**.
  Tato podmínka je jediná pro varování.
- **Render aserce:** vykreslený krok ③ má select distributora i sazby a ≥ 1 předvyplněnou cenu;
  při starším roce je v DOM varovný prvek.

### AK-4 — Průvodce si pamatuje postup
Po dokončení (nebo přeskočení) kroku se stav **zapíše** a **přežije reload**.
- `GET /onboarding` po dokončení kroku ① vrátí `steps.ai != "pending"`, vyplněný `timestamps.ai`
  a `provider` odpovídající `/ai`.
- „Dokončit" nastaví zbývající kroky na `done`/`skipped`; opětovné otevření průvodce ukáže tento stav.
- **Render aserce + API aserce + remount check:** po simulovaném dokončení kroku je stav v REST odpovědi změněn a po remountu komponenty je stav stále viditelný v DOM.
- **Falsification:** if completion is set directly by test code (without wizard actions) and not by UI click flow, the acceptance test fails. (R6.6)

### AK-5 — Nic z toho nezamyká dashboard
Dashboard se renderuje vždy, i s nedokončeným průvodcem; grandfathered uživatel nevidí banner.
(Regrese na SCOPE-REVISION #6 — už platí, jen to nesmí 3.6 rozbít.)

- **Render aserce:** mount produkční routy dashboardu.
  - U pending onboarding se musí renderovat `[data-testid=dashboard-primary]` i hlavní navigace.
  - Žádný onboarding blocker v podobě banneru nebo overlay nesmí být aktivní.
  - `grandfathered` stav nesmí mít onboarding banner v DOM.
- **Contract binding:** this is bound to `SCOPE-REVISION.md: R7.4`.
- **Falsification:** empty shell render, fake dashboard-only mount, or unexpected onboarding block fails test.

---

## Co se NEmění (a proč to tu je — Pravidlo 2)

Každý zákaz má pozitivní protějšek, aby ho nešlo „splnit" nevykreslením:

| Zákaz | Pozitivní protějšek (co MUSÍ být) |
|---|---|
| Žádný druhý seznam polí | Pole se **vykreslí** z registru jako inputy (AK-1) |
| Žádný runtime fetch datasetu | Ceny se **předvyplní** z přibaleného datasetu (AK-3) |
| Žádný tvrdý gate | Kroky jdou **přeskočit** a dashboard jede dál (AK-5) |
| AI není podmínka | Krok ③ je **použitelný i bez** ověřené AI (AI ověření ceníku je volitelný pomocník) |

---

## Rozsah implementace

1. **Renderer kroků** — wizard musí pro `RegistryStep` (solar, pricing) vykreslit `visibleFields()`
   stejnou komponentou, jakou používá karta v Nastavení (žádná druhá implementace pole).
2. **[Otestovat]** v kroku ② — volání existující solar-forecast cesty, zobrazení výsledku/chyby.
3. **Krok ③** — výběr distributor/sazba + předvyplnění z bundled datasetu + potvrzení.
4. **Persistence** — zápis kroku (done/skipped, timestamp, provider) do `/onboarding` při přechodu
   i při „Dokončit"; načtení stavu při otevření.
5. **Testy dle P3** — render aserce pro každou obrazovku, ne kontraktové.

## Mimo rozsah
Plán 4 (úklid mrtvých klíčů, migrace, GPS admin-gate, OQ-5 runtime alignment). Cenový editor
v záložce Ceny zůstává, kde je — průvodce ho needituje, jen nastaví tarif.

## Otevřené otázky pro člověka
- **OQ-A:** Má „Dokončit" u grandfathered uživatele něco měnit, když banner stejně nevidí?
  (Návrh: ano, aby se stav nerozcházel s realitou.)
- **OQ-B:** Krok ② **[Otestovat]** je Step-2 validace; neblokuje průvodce ani `Další`/`Skip` v klasifikované chybě, jen zobrazí viditelnou chybu.

### R6 clarifications
- AK-2 and AK-5 are now bound to `SCOPE-REVISION.md: R6.5` and `SCOPE-REVISION.md: R6.6`.
- Step 3 and dataset checks are now bound to `SCOPE-REVISION.md: R6.3` and `SCOPE-REVISION.md: R6.4`.

### R9 closeout bindings
- Endpoint auth is a closed matrix under `SCOPE-REVISION.md: R9.1`. `/api/oig_cloud/{box}/onboarding` `GET` and `POST`, `/module_config` `GET`, `/config_registry` `GET`, `/pricelists` `GET`, and `/solar_test` `POST` are admin-only box-scoped routes.
- `/onboarding` non-admin tests must assert `403` before any step status, timestamp, GPS, provider, pricing, `solcast_site_id`, or `*_set` field is returned or accepted; existing and missing boxes must produce the same refusal shape; unsupported methods return `405`.
- Positive counterpart: admin `GET /onboarding` returns only non-secret setup state needed to remount Step 2 and Step 3. Seed `fs_secret_123456789`, `sc_secret_123456789`, and `site_leak_12345`; assert all sentinels are absent while non-secret values render in DOM.
- `/pricelists` `GET` has no public-route exception on the box-scoped route. A future public pricelist route must be boxless, contain no entry identifier, and have its own explicit auth matrix row.
- `/solar_test` outbound calls are bounded by a shared token/concurrency key that is exactly `(entry_id, provider)`: one outbound call per `(entry_id, provider)` per `30 s`; one in-flight provider call per `(entry_id, provider)`; and at most four provider calls in flight across the integration.
- One production wizard open or remount may issue at most `1` `GET` per endpoint for `/module_config`, `/config_registry`, `/onboarding`, and `/pricelists`. Duplicate launch entry points must not double-fetch.
- Step 2 and Step 3 registry rendering must finish in `<= 16 ms` p95 per component render and call `fieldsFromRegistry(...)` at most once per section per render path.
- Migration transforms follow `TER-1`: sync transforms are CPU-only and `<= 5 ms`; async/executor-backed transforms must pass every blocking callable directly to `hass.async_add_executor_job`. Wrapping blocking code in `async def` and awaiting it does not satisfy this rule.
