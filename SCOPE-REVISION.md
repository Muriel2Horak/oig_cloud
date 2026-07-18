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
