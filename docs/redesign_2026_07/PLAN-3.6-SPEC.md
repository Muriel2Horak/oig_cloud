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
- Netýká se dashboardu: neúspěch **negatuje** nic (P6 SCOPE-REVISION — měkký průvodce).
- **Render aserce:** tlačítko existuje; po mocku úspěšné odpovědi je v DOM prvek s výsledkem;
  po mocku chyby je v DOM čitelná chybová hláška.

### AK-3 — Krok ③ Ceny je skutečný formulář
Uživatel vybere **distributora** a **sazbu**; formulář se **předvyplní z přibaleného datasetu**
(ERÚ, s uvedeným rokem platnosti) a uživatel hodnoty **potvrdí**.
- Dataset je bundled (SCOPE-REVISION #2) — žádný runtime fetch.
- Je-li rok datasetu < aktuální rok, uživatel vidí **varování**.
- **Render aserce:** vykreslený krok ③ má select distributora i sazby a ≥ 1 předvyplněnou cenu;
  při starším roce je v DOM varovný prvek.

### AK-4 — Průvodce si pamatuje postup
Po dokončení (nebo přeskočení) kroku se stav **zapíše** a **přežije reload**.
- `GET /onboarding` po dokončení kroku ① vrátí `steps.ai != "pending"`, vyplněný `timestamps.ai`
  a `provider` odpovídající `/ai`.
- „Dokončit" nastaví zbývající kroky na `done`/`skipped`; opětovné otevření průvodce ukáže tento stav.
- **Render aserce + API aserce:** po simulovaném dokončení kroku je stav v REST odpovědi změněn.

### AK-5 — Nic z toho nezamyká dashboard
Dashboard se renderuje vždy, i s nedokončeným průvodcem; grandfathered uživatel nevidí banner.
(Regrese na SCOPE-REVISION #6 — už platí, jen to nesmí 3.6 rozbít.)

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
- **OQ-B:** Má krok ② [Otestovat] blokovat „Další" při neúspěchu? (Návrh: **ne** — měkký průvodce,
  jen varovat.)
