# F1 DESIGN — Config UX redesign: wizard + AI onboarding (jeden release)

Zdroj pravdy rozhodnutí: `DECISIONS.md` (D1–D11, P1–P10, O1–O3). Tento dokument je převádí
na implementovatelný návrh F1. F2 (battery/bojler wizard, chat) a F3 (AI ovládání boxu) mají
vlastní budoucí spec (P9).

## 1. Cíl a rozsah

**Problém:** uživatelé nezvládají konfiguraci složitých modulů (solár, ceny), defaulty s autorovými
hodnotami maskují nedokončený setup, hodnoty z dashboardu se tiše mažou (full-replace bug),
definice polí jsou na 4 místech.

**F1 dodává (jeden release):**
1. AI runtime (ai_task → Groq → NVIDIA, fallback chainy, remote_config, `oig_ai_status`)
2. Premium gate + onboarding wizard ① AI ② Solár ③ Ceny
3. Jediný registr konfiguračních polí (BE) + FE generované formuláře + merge ukládání
4. Zeštíhlený HA config flow; složité moduly výhradně v dashboardu (premium)
5. Úklid: mrtvé klíče, stuby, autorovy defaulty, de-hardcode (senzor → config → remote_config)
6. Migrace stávajících uživatelů (banner, nic se nerozbije)

**F1 nemění:** planner/bojler logiku, battery wizard (F2), chat (F2), AI predikci (F3).

## 2. Architektura — komponenty

```
custom_components/oig_cloud/
├── ai/                        # NOVÉ — AI runtime
│   ├── runtime.py             # AiRuntime: generate(task) → dict; výběr backendu
│   ├── backends.py            # AiTaskBackend (HA helper) | OpenAiCompatBackend (Groq/NVIDIA)
│   ├── tasks.py               # definice úloh: 1 interní schéma → převod na selectory/JSON schema
│   ├── key_store.py           # Store .storage/oig_cloud.ai_<entry> (klíč, provider, ověření)
│   └── status.py              # senzor oig_ai_status (ready/offline/no_credits/unverified)
├── remote_config/             # NOVÉ
│   ├── loader.py              # fetch GitHub raw JSON, cache 24h, bundled fallback, schema_version
│   └── bundled_remote_config.json
├── config_registry.py         # NOVÉ — P5: jediný registr všech polí
├── api/ha_rest_api.py         # rozšíření: /config_registry, /onboarding, /ai/*, MERGE save
├── config/steps.py            # ZEŠTÍHLENÍ: jen basic kroky + premium checkbox
└── www_v2/src/
    ├── ui/features/onboarding/  # NOVÉ — gate + wizard (3 kroky)
    └── ui/features/settings/    # PŘEPIS: formuláře generované z registru
```

## 3. AI runtime (D4, D5, P1, P2, P10, O1, O2)

**Pořadí backendů:** 1) `ai_task` (HA ≥ 2025.8, `has_service("ai_task","generate_data")`,
`entity_id=None` → preferovaná entita uživatele), 2) OpenAI-kompatibilní klient s klíčem
uživatele — provider **Groq (default)** nebo **NVIDIA** (volba ve wizardu).

**Úlohy (`tasks.py`):** každá úloha = `{name, instructions_cs, fields}` s JEDNÍM interním popisem
polí; převodníky `to_ha_selectors()` (ai_task) a `to_json_schema()` (OpenAI-compat). F1 úlohy:
`extract_pricelist` (interpretace strukturovaných řádků ceníku), `validate_config`
(sanity-check konfigurace: „sedí GPS s časovou zónou? kWp vs kapacita?").

**Fallback chain:** per provider v remote_configu. Volání: model N → HTTP chyba / timeout 30 s /
nevalidní JSON dle schématu → model N+1. Poslední funkční model se cachuje (TTL 1 h). 429 → backoff,
nepřeskakuje se hned. ai_task selhání (HomeAssistantError) → přechod na klíčový backend, pokud je.

**Klíč (P2):** `.storage/oig_cloud.ai_<entry_id>` = `{provider, api_key, verified_at, last_ok_model}`.
Nikdy v options, nikdy v logu (jen `nvapi-…xxxx`), REST vrací jen `{provider, key_set, verified}`.

**Stav:** senzor `sensor.oig_<box>_ai_status`: `ready | offline | no_credits | unverified | disabled`.
Badge v dashboardu při ne-ready. Ověření klíče: `GET /v1/models` + mini completion (1 token).

**Soukromí (O2, závazné):** prompty obsahují VÝHRADNĚ anonymní čísla/řady (žádné jméno, e-mail,
adresa, souřadnice, box ID). Wizard zobrazí per-provider disclosure (P10.4).

## 4. remote_config (D6, P1, P10, P8)

GitHub raw: `https://raw.githubusercontent.com/Muriel2Horak/oig_cloud/main/remote_config.json`.
```json
{
  "schema_version": 1,
  "ai_models": {
    "groq":   [{"id":"llama-3.3-70b-versatile"},{"id":"qwen3-32b"},{"id":"llama-3.1-8b-instant"}],
    "nvidia": [{"id":"z-ai/glm-5.2"},{"id":"mistralai/mistral-large-3-675b-instruct-2512"},
               {"id":"minimaxai/minimax-m3"},{"id":"nvidia/nemotron-3-super-120b-a12b"},
               {"id":"mistralai/mistral-medium-3.5-128b"},{"id":"openai/gpt-oss-120b"},
               "… + zbylých 26 v pořadí dle nim-model-test-2026-07-09.json (P1) …",
               {"id":"moonshotai/kimi-k2.6","enabled":false}]
  },
  "tuning": { "box_floor_safety_margin_pct": 2.0, "holding_soc_threshold": 97.0, "…": "P8 heuristiky" },
  "pricelists": {
    "year": 2026, "source": "ERÚ 14/2025 (věstník 18/2025)",
    "distributors": {
      "cez": {"D25d": {"vt_mwh": 2252.45, "nt_mwh": 116.50, "jistic": {"3x25": 269.0, "…": 0}}, "…": {}},
      "egd": {"…": {}}, "pre": {"…": {}}
    }
  }
}
```
Loader: fetch při startu + 1×/24 h; cache do `.storage`; při nedostupnosti bundled kopie z release.
Dataset ceníků se generuje ročně z ERÚ XLSX (`ceny-nn26*.xlsx`) skriptem v repu (O3).

## 5. Onboarding gate + wizard (D5, D9, D10, P3, P4)

**Gate:** `enable_dashboard=true` a `onboarding.complete=false` (Store
`.storage/oig_cloud.onboarding_<entry>`) → panel renderuje POUZE onboarding UI. Stav kroků
`{ai: done|pending, solar: …, pricing: …}` přes `GET/POST /api/oig_cloud/<box>/onboarding`.

**Krok ① AI (povinný, D5):**
- detekce ai_task → „Našli jsme tvou AI v HA — použít?" [Použít] / [Radši vlastní klíč]
- bez ai_task: volba Groq (doporučeno) / NVIDIA, krokový návod s odkazy (console.groq.com /
  build.nvidia.com → účet → API key → vlož), disclosure, [Ověřit klíč] → uloží + ověří.
- NIM/Groq zrovna leží → klíč uložen, `unverified`, retry fronta; krok se dokončí po prvním
  úspěšném ověření (P1). Dál se pustí až po ověření (gate hlídá výsledek).

**Krok ② Solár (P3):** provider → klíče/site ID s návodem → GPS (z HA, mapa) → stringy
(kWp/sklon/azimut s obrázkem) → [Otestovat] = reálné stažení předpovědi → graf zítřka → teprve
pak [Pokračovat]. Chyby lidsky (špatný klíč / site ID / server).

**Krok ③ Ceny (P4, O3):** distributor (ČEZ/PRE/EG.D) + sazba → předvyplnění z `pricelists`
datasetu (vrstva 0) → volitelně [Ověřit proti aktuálnímu ceníku] = PDF fetch → pdfplumber
souřadnicová extrakce → AI interpretace → 2 modely křížem (shoda ✅ předvyplnit / neshoda ⚠️
ručně) → uživatel potvrdí. Pak obchodník: spot/fix model importu+exportu s náhledem výsledné
ceny dneška (graf). Bez potvrzení cen se nejde dál.

**Dokončení:** `complete=true` → dashboard se odemkne. Wizard lze kdykoli znovu spustit
z Nastavení (per krok).

## 6. Registr polí + merge (P5)

`config_registry.py`: `FIELD_REGISTRY: dict[str, Field]`, kde
`Field = {key, type, default, min/max/step/enum, section, label_cs, hint_cs, scope}`.
`scope ∈ {basic (HA config flow), premium (wizard/Nastavení), advanced}`.
- REST `GET /api/oig_cloud/<box>/config_registry` → FE si stáhne definice a vykreslí formuláře
  (wizard i Nastavení) — FE nezná žádné pevné seznamy polí.
- REST POST validuje proti registru a **MERGUJE** do options (`{**entry.options, **updates}`).
- Options flow (zbytkový basic) čte tentýž registr; `_build_options_payload` full-replace SE RUŠÍ.
- Boiler api_views + `_MODULE_CONFIG_FIELDS` + FE `*_FIELDS` se mažou ve prospěch registru.

## 7. Config flow zeštíhlení (D9) + úklid (P6, P7, P8)

**Config flow nechává:** credentials+box, intervaly, data_source_mode (+local proxy params),
enable_extended_sensors, enable_statistics, enable_chmu_warnings, checkbox
`enable_dashboard` („Premium dashboard — vyžaduje AI"). Vše ostatní z kroků/menu MIZÍ
(wizard_solar/battery/pricing/boiler kroky, section_* menu položky kromě basic).

**Maže se (P6):** 10 mrtvých klíčů, `import_yaml`, `enable_auto`, schema.py fantomy, legacy
battery klíče, mrtvé dataclasses (battery_forecast/config.py). Migrace: při async_setup_entry
se mrtvé klíče odfiltrují (jednorázově, log info).

**Autorovy defaulty pryč (P7):** solar_forecast_sensor.py:548–575+640, validation.py:66,
plan_storage_baseline.py:280, scenario_analysis.py:645 (číst threshold_cheap/home_charge_rate
z options), classifier.py:52 (zapojit CONF_BOILER_COLD_INLET_TEMP_C). Chybějící config →
`unavailable` + warning log, žádný fallback.

**De-hardcode (P8):** senzor-first (kapacita z boxu, bat_min z `tbl_batt_prms_*`, účinnost
z měřeného senzoru) → registr (preference) → remote_config tuning (heuristiky). Konsolidace
duplikátů (hw_min ×3, MODE_GUARD ×2, COMMAND_ON_W ×3, cycle cost ×2). Pravidlo do CLAUDE.md.

## 8. Migrace stávajících uživatelů (D11)

Detekce při upgradu: entry má už nakonfigurovaný solár/ceny (klíče existují) → `onboarding.complete=true`
(grandfathered) + banner v dashboardu „🔍 Projdi ověření konfigurace s AI" (spustí wizard v režimu
review: předvyplněno současnými hodnotami, AI validace, nic se nemaže bez potvrzení).
Upřesnění k D5: grandfathered uživatel NENÍ gate-ován (dashboard mu jede dál), ale **AI funkce
(ověření ceníku, validace) zůstávají vypnuté, dokud nedokončí krok ① AI** — banner ho k tomu vede.
Uživatel bez dashboardu: žádná změna chování (senzory jedou dál).

## 9. Chybové stavy

| Situace | Chování |
|---|---|
| GitHub remote_config nedostupný | bundled kopie + poslední cache; log info |
| ai_task entita zmizí | fallback na klíčový provider; ai_status přechod |
| Groq/NVIDIA 429 | backoff (ne skok na další model hned) |
| Model 404/410 (deprecated) | další v chainu; telemetrie do logu (kandidát na remote_config update) |
| Ceník PDF nedostupný/změněný formát | dataset vrstva 0 zůstává; tlačítko ověření hlásí „nedostupné" |
| Extrakce: modely se neshodnou | pole ⚠️ k ruční kontrole (nikdy tiché uložení) |
| HA < 2025.8 | ai_task cesta skryta, rovnou klíčový provider |

## 10. Testy (gate na release)

- **ai/**: unit — chain fallback (mock HTTP: 404/410/429/timeout/bad-JSON), key_store round-trip,
  převodníky schémat (selector/JSON), prompt-anonymita (žádný zakázaný token v promptu).
- **remote_config**: cache/expiry/bundled fallback/schema_version mismatch.
- **registry**: každé pole má label_cs+section+typ; REST merge nezničí cizí klíče (regres na
  full-replace bug!); options flow konzistence.
- **onboarding**: stavový automat kroků; gate render; grandfathering stávajících entry.
- **cenik pipeline**: golden test na EG.D 2026 PDF (10/10 sazeb) + ERÚ XLSX parser.
- **úklid**: mrtvé klíče se odfiltrují; žádný výskyt autorových hodnot v kódu (grep gate v CI:
  `50.1219800|13.9373742|15\.36|azimuth.*138` mimo testy).
- FE: vitest na generované formuláře + wizard kroky; Playwright smoke onboarding flow.
- Plný stávající gate (flake8/mypy/bandit/pytest/tsc/eslint/vitest/build) zůstává.

## 11. Mimo rozsah F1 (připomenutí)

Battery/bojler wizard, chat asistent, pokročilá sekce UI pro všechny P8 parametry (F1 je vynese
do registru, UI „Pokročilé" může být minimální), AI predikce/ovládání (F3), thermal arbitrage.
