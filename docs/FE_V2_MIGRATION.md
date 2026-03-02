# OIG FE V2 HANDOFF (PARALLEL RUN, 1:1 PARITY)

Jsi nový agent v repu `oig_cloud`. Pokračuješ po předchozím agentovi.

## 1) Cíl
Připravit a implementovat FE v2 pro OIG dashboard jako „clean rewrite“, ale v release 1 zachovat 1:1 funkční a vizuální paritu vůči FE v1.

## 2) Důležité rozhodnutí (už schváleno)
- Varianta: **B (rewrite)**.
- FE v1 a FE v2 mají běžet **paralelně** a oba být viditelné v HA sidebaru.
- Priorita: stabilita v Home Assistant + HA mobilní app + efektivní data načítání.
- Neztratit flow vizualizaci, částice („kuličky“), grafy, zoom/pan interakce, design charakter.

## 3) Aktuální technický kontext
- V1 panel je registrován jako iframe v `custom_components/oig_cloud/__init__.py`.
- V1 FE je v `custom_components/oig_cloud/www/`.
- Kritické moduly: `js/features/flow.js`, `js/features/pricing.js`, `js/features/timeline.js`, `js/core/core.js`, `js/core/api.js`.
- V historii byl problém `fetchWithAuth is not defined`; při práci vždy validuj skutečně servírovaný soubor, ne jen repo.

## 4) Scope RELEASE 1 (IN)
- 1:1 přenos všech V1 funkcí do V2:
  - Toky, spojnice, particles
  - Pricing/timeline grafy + zoom/pan/reset + datalabel režimy
  - Taby, dialogy, control panel, tiles, layout edit/reset, shield queue, boiler/analytics bloky
  - Mobilní responsivita včetně HA app
- Dual-run:
  - `OIG Dashboard (V1)`
  - `OIG Dashboard V2 (BETA)`

## 5) Scope RELEASE 1 (OUT)
- Žádný redesign UX/branding.
- Žádné nové business feature.
- Žádné změny backend logiky bez explicitní potřeby.

## 6) První deliverables (povinné, před implementací)
1. ✅ **Parity Contract** (`PAR-001...`) – kompletní seznam funkcí + acceptance (Given/When/Then).
2. ✅ **Architektura V2** – bootstrap, state/data layer, rendering, lifecycle, error model.
3. ✅ **Migrační plán po vlnách** – pořadí komponent + rizika + fallback.
4. ✅ **Test plan** – unit/integration/E2E/visual + device matrix (desktop/tablet/HA mobile iOS+Android).
5. ✅ **Cutover & rollback plan** – jak přepnout default na V2 a okamžitě vrátit V1.

### 6.1) Wave 1 Progress (Infrastructure)
- ✅ package.json, tsconfig.json, vite.config.ts
- ✅ index.html s HA integration
- ✅ src/core/bootstrap.ts (shell component)
- ✅ src/core/lifecycle.ts (mount/unmount/timers)
- ✅ src/core/errors.ts (error classes, handling)
- ✅ src/core/logger.ts (structured logging)
- ✅ src/data/ha-client.ts (HASS access wrapper)
- ✅ src/data/api.ts (REST API client with dedup)
- ✅ src/data/entity-store.ts (state subscriptions)
- ✅ src/data/query-cache.ts (TTL cache)
- ✅ src/utils/*.ts (format, colors, dom, motion)
- ✅ vitest.config.ts + tests/setup.ts

## 7) Implementační pravidla
- V2 dělej modulárně, deterministický init, bez load-order hacků.
- Oddělit V1/V2:
  - asset path (`/oig_cloud_static/` vs `/oig_cloud_static_v2/`)
  - storage keys (`oig_v1_*` vs `oig_v2_*`)
  - log prefix (`[V1]` vs `[V2]`)
- Přidat post-deploy smoke check proti reálně servírovaným assetům.
- Nepoužívat tajné hodnoty v kódu; `.ha_config` neprintovat, necommitovat.

## 8) Gate / Definition of Done
- 100% PAR-ID testů green.
- 0 critical console errors v běžných scénářích.
- Vizuální parity v toleranci (screenshot diff).
- Device parity: desktop + tablet + HA mobile app.
- V1 i V2 dostupné paralelně v sidebaru.

## 9) Formát reportingu
Každý update:
- Co hotovo
- Co zbývá
- Rizika/blokery
- Důkazy (file refs + test výsledky)
- Další krok

## 10) Pokud si nejsi jistý
Nejdřív udělej read-only analýzu a navrhni 2 varianty s doporučením.

## 11) Adresářová struktura V2
```
custom_components/oig_cloud/www_v2/
├── src/
│   ├── core/           # Bootstrap, lifecycle, error handling
│   ├── data/           # HA client, API, state management
│   ├── ui/
│   │   ├── components/ # Reusable UI components
│   │   ├── features/   # Feature modules (flow, pricing, timeline, etc.)
│   │   └── layout/     # Layout system
│   ├── utils/          # Helpers, formatters
│   └── main.ts         # Entry point
├── public/
│   └── css/            # Styles (migrated from V1)
├── tests/              # V2 tests
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## 12) Reference
- V1 FE: `custom_components/oig_cloud/www/`
- Backend API: `custom_components/oig_cloud/api/ha_rest_api.py`
- Panel registration: `custom_components/oig_cloud/__init__.py`
