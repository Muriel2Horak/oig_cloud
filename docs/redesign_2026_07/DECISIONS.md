# DECISIONS — Config UX redesign 2026-07 (wizard + AI onboarding)

Decision board pro celkovou přestavbu konfigurace (config flow → dashboard wizard + AI).
Pravidla: každé velké rozhodnutí = jeden záznam. Status: **APPROVED** (Martin rozhodl, nerozporovat),
**PROPOSED** (návrh čeká na Martina), **OPEN** (potřebuje průzkum/diskuzi). Projednává se bod po bodu.

Podklady: audit config flow + audit hardcoded parametrů (agenti 2026-07-09, výsledky v sekci Podklady dole).

---

## APPROVED (z brainstormu 2026-07-09)

**D1 — Rozsah: celá konfigurace, ne jen solár.** Redesign pokrývá solár, ceny, battery/plánovač,
bojler i forecast. *(Martin: „netýká se to jenom soláru… nastavení cen je peklo stejně jako nabíjení a forecastu")*

**D2 — Diagnóza problému: A+C+D.** Lidi (A) nevědí KDE vzít hodnoty (klíče, ceníky),
(C) nemají zpětnou vazbu jestli config funguje, (D) defaulty (autorovy hodnoty) maskují nedokončený setup.

**D3 — Řešení: wizard + AI (hybrid).** Deterministický průvodce jako páteř, AI aktivně zapojená.

**D4 — AI backend: HA `ai_task` → NVIDIA NIM, conversation agenty NEpodporujeme.**
Discovery: má uživatel `ai_task`? použij. Nemá? veď ho registrací NVIDIA (build.nvidia.com, zdarma)
a ulož klíč. Chat-only conversation agenty negarantují strukturovaný výstup → nepodporované.

**D5 — AI je POVINNÁ podmínka premium dashboardu.** Bez funkční AI se premium funkce neodemknou.
Důvod (Martin): míň supportu, a AI se časem zapojí do predikce, chování a ovládání boxu.
Základní integrace (senzory) funguje i bez AI a bez premium.

**D6 — Výběr modelu: kurátorovaný registry z GitHubu.** `remote_config.json` v muriel repu,
pořadí defaultů: **Kimi K2 → GLM → Mistral Large** + fallbacky. Živá kontrola přes `/v1/models`,
schéma-test úlohy; selhání → další model v pořadí. Cache + bundlovaná záloha v release.

**D7 — Fáze 1 = solár + ceny (+ úklid defaultů). Battery/plánovač wizard = fáze 2.**

**D8 — AI UX: úlohy za tlačítky ve wizardu (ne chat).** „🔍 Načíst ceník", „Ověřit klíč a stáhnout
předpověď" — AI dělá konkrétní úlohy s JSON schématem, předvyplní, člověk potvrdí. Volný chat = fáze 2+.

**D9 — Config flow (HA) se zeštíhlí na základ; složité moduly = jen premium wizard.**
Config flow nechává: přihlášení+box, intervaly, zdroj dat (cloud/local), extended senzory, statistiky,
ČHMÚ, checkbox „Premium dashboard (AI)". Solár/ceny/battery/bojler konfigurace se stěhuje výhradně
do dashboard wizardu → vyžadují premium. Ruší se trojí údržba definic polí.

**D10 — Onboarding gate.** Premium checkbox → dashboard se registruje, ale renderuje onboarding
obrazovku (① AI ② Solár ③ Ceny), dokud není setup dokončen. Gate hlídá výsledek: AI ověřená,
solár otestovaný (reálně stažená předpověď), ceny potvrzené.

**D11 — Migrace stávajících uživatelů: banner, ne gate.** Kdo už config má, nic neztratí a dashboard
mu jede; dostane banner „Projdi konfigurací pro validaci s AI". Gate platí jen pro nové/nedokončené.

---

## PROPOSED (projednává se bod po bodu)

**P1 — Chování při výpadku NVIDIA/AI: fallback chain přes CELÝ ověřený žebříček. — APPROVED (Martin 2026-07-09/10)**
Živý test všech 83 chat modelů NIM katalogu (Martinův klíč, úloha: český ceník → JSON):
**32 OK / 51 mrtvých (61 % katalogu!)** — pády jsou per-model a trvalé (Kimi 404/410 ve všech
9 variantách názvů, qwen 100% timeout, deepseek-flash bliká 503↔OK). Martin: NVIDIA jako celek
neleží, padají modely → fallback chain, a do fallbacku jde CELÝ žebříček funkčních.
Řazení: flagship tier napřed (glm-5.2 → mistral-large-3-675b → minimax-m3 → nemotron-3-super-120b
→ mistral-medium-3.5 → gpt-oss-120b), pak zbylých 26 dle latence. kimi-k2.6 v registru
`enabled:false` (zapnout až ho NVIDIA nasadí — bez release).
Algoritmus: chyba/timeout(30s)/nevalidní JSON → další; poslední funkční model cache (TTL 1h);
periodická re-sonda (deepseek-flash case). Onboarding s ležícím NIM: klíč uložit, retry fronta,
premium po prvním úspěšném ověření. Za provozu: `oig_ai_status` senzor + badge, cache, backoff.
Core výpočty (planner/senzory) na AI NIKDY nezávisí. Kompletní výsledky: scratchpad
nim_all_results.json (test 2026-07-09).

**P2 — Uložení AI klíče do HA storage (ne options). — APPROVED (Martin 2026-07-10)**
NVIDIA klíč v `.storage/oig_cloud.ai_<entry>` — přežije full-replace options bug, není
v diagnostickém exportu, do logů jen otisk (`nvapi-…xxxx`), REST vrací pouze `key_set: true/false`.

**P3 — Solár krok: postup dál jen po úspěšném testu. — APPROVED (Martin 2026-07-10)**
Krok solár končí tlačítkem „Otestovat" = reálné stažení předpovědi + graf zítřka; bez úspěchu
nejde pokračovat. Chybové stavy srozumitelně (špatný klíč / site ID / server). U Solcastu
krok-za-krokem návod s odkazy; GPS předvyplněná z HA.

**P4 — Ceníky distribuce: dataset + souřadnicová extrakce + LLM interpretace + cross-check.**
EMPIRICKY OVĚŘENO (2026-07-09/10, EG.D brožura 2026, 9 stran, 10 D-sazeb):
- LLM na SUROVÉM textu PDF selhává u tabulek: pypdf rozsype sloupce → GLM 6/10, Mistral 8/10
  (VT hodnoty D25d/D26d/D27d/D35d zpřeházené — z textu mapování určit NEŠLO).
- Křížová kontrola 2 modelů chytá přesně chybná pole: 4 neshody = přesně 4 chyby; kde shoda (6), tam pravda.
- Pipeline se souřadnicovou extrakcí (pdfplumber, čísla → nejbližší hlavička dle x): **oba modely 10/10**,
  robustní i vůči šumu ve vstupu (duplicitní částečné tabulky modely správně ignorovaly).
Finální pipeline „Načíst ceník": (1) backend stáhne PDF, (2) pdfplumber souřadnicová extrakce →
strukturované řádky, (3) LLM jen interpretuje/normalizuje (JSON schéma), (4) 2 modely křížem:
shoda = předvyplnit ✅, neshoda = pole „zkontroluj ručně" ⚠️, (5) uživatel VŽDY potvrzuje.
Plus (a) kurátorovaný dataset per distributor+sazba v remote_config jako deterministická vrstva 0;
AI fetch = aktualizace/ověření datasetu a neznámé sazby.
STATUS: APPROVED (Martin 2026-07-10)

**P5 — Jediný registr polí v BE, FE se generuje. — APPROVED (Martin 2026-07-10)**
Definice všech konfiguračních polí (typ, rozsah, default, sekce, český popisek/hint) JEDNOU
v Pythonu; FE si definice tahá z API (wizard i Nastavení se vykreslují z registru), REST validace
i options flow čtou tentýž registr. Ukládání VŽDY merge, nikdy full-replace — konec tichého mazání
hodnot nastavených v dashboardu.

**P6 — Výmaz mrtvých klíčů a stubů. — APPROVED (Martin 2026-07-10)**
Smazat: 10 mrtvých klíčů (`notifications_scan_interval`, `tariff_weekend_same_as_weekday`,
`planning_min_percent`, `disable_planning_min_guard`, `price_hysteresis_czk`, `hw_min_hold_hours`,
`boiler_comfort_profile_mode`, `boiler_planning_horizon_hours`, `boiler_recovery_rate_c_per_hour`,
`boiler_alt_source_mode`), stub `import_yaml`, stub `enable_auto`, fantomové definice
v config/schema.py, legacy battery klíče (`min_capacity_percent`, `target_capacity_percent`,
`max_ups_price_czk`, `charge_rate_kw` alias), mrtvé dataclasses v battery_forecast/config.py.
Migrace: tichý drop při prvním uložení; nic funkčního se nemění.

**P7 — Oprava BUG defaultů (autorovy hodnoty) — SOUČÁST JEDNOHO RELEASE. — APPROVED (Martin 2026-07-10)**
Odstranit autorovy hodnoty: GPS 50.1219800/13.9373742 (solar_forecast_sensor.py:640,
validation.py:66), geometrii střechy (declination 10/azimuth 138/5.4 kWp,
solar_forecast_sensor.py:548-575), kapacitu 15.36 kWh (plan_storage_baseline.py:280),
hardcoded 1.5 Kč/2.8 kW (scenario_analysis.py:645), zapojit cold_inlet option (classifier.py:52),
kapacitu baterie číst z reálných dat boxu kde to jde.
Chybějící config → senzor `unavailable` + logované varování, ŽÁDNÝ tichý fallback.
Martin: NEvydávat jako samostatný hotfix — celý redesign jde ven JAKO JEDEN RELEASE.

**P8 — ŽÁDNÝ hardcoded parametr. Priorita: senzor → konfigurace → remote_config. — APPROVED (Martin 2026-07-10)**
Martinovo pravidlo (závazné, „hrozný nešvar a pořád to tam někdo hardcoduje"):
1. **Senzor/box first** — co box reálně hlásí, se čte ze senzorů (kapacita baterie, bat_min/limit
   z cloudu — `tbl_batt_prms_*`, měřená účinnost, instalovaný výkon patrony…). Kód NIKDY nesmí
   mít vlastní číslo tam, kde existuje živé číslo z boxu.
2. **Uživatelská konfigurace** (registr P5, sekce Pokročilé) — co je preference/instalace
   (komfortní percentil, mode guard, teplota „hotové vody", hystereze, geometrie nádrže…).
3. **remote_config** — ladicí heuristiky, které vlastníme my (drift dead-bandy, boost cap,
   holding threshold, cooldowny, clampy, session TTL…), měnitelné bez release.
Hardcoded konstanta v kódu = bug. Duplikáty zkonsolidovat (hw_min ×3, MODE_GUARD ×2,
COMMAND_ON_W ×3, cycle cost ×2). Do CLAUDE.md přidat trvalé pravidlo pro budoucí vývoj.

**P9 — Rozsah: VŠECHNY 3 fáze; každá fáze má vlastní spec. — APPROVED (Martin 2026-07-10)**
Martin: děláme všechny 3 fáze (ne jen F1). Fáze 1 jde ven jako JEDEN release (viz P7).
- **F1** (spec = tento board + design doc): AI runtime (discovery, fallback chain, remote_config,
  oig_ai_status) + premium gate + wizard ①AI ②Solár ③Ceny + P5 registr/merge + P6 úklid +
  P7 defaulty + P8 de-hardcode + zeštíhlený config flow + banner pro stávající.
  Battery/plánovač ve F1: rozumné defaulty + stávající karta (bez wizardu).
- **F2** (SPEC CHYBÍ → samostatný design/brainstorm): wizard battery/bojler, „Poradit se" chat,
  pokročilá sekce z P8.
- **F3** (SPEC CHYBÍ → samostatný design/brainstorm, zásadní bezpečnostní otázky): AI zapojená
  do predikce, chování a OVLÁDÁNÍ boxu (guardrails, co smí AI přepnout, audit trail).
Pořadí specifikací: F1 design doc hned; F2/F3 brainstorm následně (mohou vznikat souběžně
s implementací F1).

---

## OPEN (vyžadují průzkum před návrhem)

**O1 — Které HA verze podporují `ai_task` a jak přesně detekovat + zavolat `generate_data` se schématem.**
**O2 — NVIDIA NIM free tier: přesné limity (kreditů/RPM), registrace bez kreditky?, ToS pro tento use-case.**
**O3 — Formát ceníků ČEZ Distribuce / PRE / EG.D (PDF vs web) a stabilita URL pro fetch.**

---

## Podklady (audity 2026-07-09)

### Audit A — config flow (souhrn)
- ~110 klíčů zapisovaných při každém uložení; plný inventář viz zpráva agenta (session 2026-07-09).
- 10 mrtvých klíčů (zapisují se, nečtou), ~20 fantomových v config/schema.py, stuby import_yaml/enable_auto.
- 16 sirotků čtených v kódu ale nenastavitelných (balancing_soc_threshold, blackout_*, weather_*, startup_grace_seconds…).
- Duplikace definic polí ×4 (steps.py, FE settings, REST whitelist, boiler api_views).
- KRITICKÉ: options flow save = full replace; dashboard REST = merge → hodnoty nastavené jen v dashboardu
  se tiše mažou při uložení HA options (vysvětluje „mizející konfiguraci").

### Audit B — hardcoded parametry (souhrn)
- BUG (autorovy hodnoty): GPS, geometrie střechy, 15.36 kWh, 1.5 Kč/2.8 kW scenario, cold_inlet nezapojený.
- EXPOSE kandidáti: hw_min 0.20 (3 kopie!), comfort percentil, účinnosti, mode guard 60 min,
  bojler ready 40 °C / hystereze / ztráty / geometrie / min element.
- REMOTE kandidáti (~17 heuristik): BOX_FLOOR_SAFETY_MARGIN_PCT, drift dead-bandy, boost cap okna,
  _HOLDING_SOC_THRESHOLD, balancing cooldowny, min-useful-charge, auto-switch 30 min, draw detection prahy,
  heating estimator clampy, classifier trendy, session TTL.
- Duplikáty ke konsolidaci: hw_min ×3, MODE_GUARD_MINUTES ×2, COMMAND_ON_W ×3, cycle cost ×2.
- battery_forecast/config.py dataclasses = mrtvý kód s autorovými hodnotami → smazat/zapojit.
