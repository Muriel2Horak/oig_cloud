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

**P1 — Chování při výpadku NVIDIA/AI.**
Návrh: (a) gate je jednorázový — při onboardingu s ležícím NIM se klíč uloží, ověření jde do retry
fronty, premium se odemkne po prvním úspěšném ověření; (b) za provozu AI degraduje viditelně
(senzor `oig_ai_status`: ready/offline/no_credits, badge v UI, cache výsledků, exponenciální retry);
(c) core výpočty (planner, senzory) na AI NIKDY nezávisí — AI je asistenční vrstva.
STATUS: PROPOSED

**P2 — Uložení AI klíče do HA storage (ne options).**
Návrh: NVIDIA klíč v `.storage/oig_cloud.ai_<entry>` — přežije full-replace options bug, neexportuje
se v diagnostice, neredaktuje se do logů.
STATUS: PROPOSED

**P3 — Solár krok: postup dál jen po úspěšném testu.**
Návrh: krok solár končí tlačítkem „Otestovat" = reálné stažení předpovědi + graf zítřka; bez toho
nejde pokračovat. U Solcastu návod (odkazy, screenshoty) kde vzít API key + site ID.
STATUS: PROPOSED

**P4 — Ceníky distribuce: dvouvrstvě (dataset + AI ověření).**
Návrh: (a) kurátorovaný dataset VT/NT/poplatků per distributor+sazba v remote_config (deterministické,
roční údržba); (b) AI fetch+extract jako ověřovací/aktualizační cesta a pro neznámé sazby.
AI výstup vždy jen předvyplní → člověk potvrdí. Nikdy slepé uložení.
STATUS: PROPOSED

**P5 — Jediný registr polí v BE, FE se generuje.**
Návrh: definice všech konfiguračních polí (typ, rozsah, default, sekce, popisek) jednou v Pythonu;
REST whitelist, FE formuláře wizardu/Nastavení a validace se z něj odvozují. Oprava full-replace→merge.
STATUS: PROPOSED

**P6 — Výmaz mrtvých klíčů a stubů.**
Návrh: smazat 10 mrtvých klíčů (`notifications_scan_interval`, `tariff_weekend_same_as_weekday`,
`planning_min_percent`, `disable_planning_min_guard`, `price_hysteresis_czk`, `hw_min_hold_hours`,
`boiler_comfort_profile_mode`, `boiler_planning_horizon_hours`, `boiler_recovery_rate_c_per_hour`,
`boiler_alt_source_mode`), stub `import_yaml`, stub `enable_auto`, fantomové definice v config/schema.py,
legacy battery klíče (`min_capacity_percent`, `target_capacity_percent`, `max_ups_price_czk`,
`charge_rate_kw` alias). Migrace: tichý drop při prvním uložení.
STATUS: PROPOSED

**P7 — Okamžitá oprava BUG defaultů (nečeká na redesign).**
Návrh: hned teď (hotfix) odstranit autorovy hodnoty: GPS 50.1219800/13.9373742
(solar_forecast_sensor.py:640, validation.py:66), geometrii střechy (declination 10/azimuth 138/5.4 kWp,
solar_forecast_sensor.py:548-575), kapacitu 15.36 kWh (plan_storage_baseline.py:280),
hardcoded 1.5 Kč/2.8 kW (scenario_analysis.py:645), nezapojený cold_inlet (classifier.py:52).
Chybějící config → senzor `unavailable` + logované varování, ŽÁDNÝ tichý fallback.
STATUS: PROPOSED

**P8 — Vynesení hardcoded parametrů (EXPOSE list).**
Návrh co zpřístupnit v konfiguraci (pokročilá sekce): hw podlaha (0.20), komfortní cheap percentil
(0.30), účinnosti (0.882/0.95 — nebo napojit na měřený senzor), MODE_GUARD_MINUTES (60),
bojler: teplota „hotové vody" (40 °C), hystereze (5 °C), ztrátový koeficient (0.02), geometrie nádrže,
MIN_ELEMENT_W (1500). Zbytek heuristik → remote_config (tuning sekce), ne uživatelská volba.
STATUS: PROPOSED

**P9 — Fázování dodávky.**
Návrh: F1 = P7 hotfix + AI runtime + gate + wizard solár/ceny + P5 registr + P6 úklid + D11 banner.
F2 = battery/bojler wizard + chat asistent + P8 pokročilá sekce.
F3+ = AI predikce/ovládání boxu (mimo tento design).
STATUS: PROPOSED

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
