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
