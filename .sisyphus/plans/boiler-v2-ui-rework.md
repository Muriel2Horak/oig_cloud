# Boiler V2 UI Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-implement the V2 boiler UI so that all 5 sections (status panel, plan timeline, source explanation, override panel, unavailable state) render the full canonical DTO contract promised by Task 11 of `boiler-module-redesign.md` — with EN/CS translations, explicit missing-data states, and unit + Playwright tests.

**Architecture:** Five Lit custom elements consume the existing `BoilerV2*` types from `types.ts`. Strings are pulled from a tiny new i18n map (`src/i18n/boiler.ts`) keyed by `hass.locale.language` with `cs` fallback. No fabricated values: every empty/null DTO field renders an explicit `--` or translated unavailable label. Existing tests in `boiler-v2-ui.test.ts` are extended; a new Playwright spec asserts the section selectors and field text against fixture DTOs.

**Tech Stack:** Lit 3 + TypeScript (existing V2 stack), Vitest for unit tests, Playwright (Node) + headless Chromium for browser smoke, Vite build, deploy via `deploy_to_ha.sh --ssh`.

---

## Reference Inputs

- Plan that owns this rework: `.sisyphus/plans/boiler-module-redesign.md` lines 1236–1306 (Task 11 acceptance criteria)
- Existing DTO: `custom_components/oig_cloud/www_v2/src/ui/features/boiler/types.ts`
- Existing components to overhaul: `custom_components/oig_cloud/www_v2/src/ui/features/boiler/components.ts`
- Mounting site: `custom_components/oig_cloud/www_v2/src/ui/app.ts:941–982`
- Existing unit tests to extend: `custom_components/oig_cloud/www_v2/src/__tests__/boiler-v2-ui.test.ts`
- Canonical reason codes: `boiler-module-redesign.md` lines 157–188 (Reason Code Appendix) — UI must label these in CS/EN, never hide raw codes.
- Notepad context: `.sisyphus/notepads/boiler-module-redesign/issues.md` Task 11 entries (capability gating, fake-value removal, lint regression — keep all those fixes intact).

## File Structure

- Create: `custom_components/oig_cloud/www_v2/src/i18n/boiler.ts` — boiler-only i18n map and `t(key, lang)` helper.
- Create: `custom_components/oig_cloud/www_v2/src/ui/features/boiler/format.ts` — pure formatters (number, temperature, kWh, currency, percent, source, reason code).
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/boiler/components.ts` — replace minimalist render functions of the 5 V2 components with full DTO-driven views; remove all hardcoded CS strings in those 5 components, route through `t()`.
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/boiler/types.ts` — only if a missing field is needed (none expected; DTO already covers all acceptance criteria).
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/boiler/index.ts` — re-export `t` and formatters if other features need them (only if needed).
- Modify: `custom_components/oig_cloud/www_v2/src/ui/app.ts` — pass `hass.locale.language` (or `hass.language`) into the boiler section so every component can read it; ensure setup guide stays untouched.
- Modify: `custom_components/oig_cloud/www_v2/src/__tests__/boiler-v2-ui.test.ts` — extend with field-presence assertions for status, timeline, explanation; lang switch test.
- Create: `custom_components/oig_cloud/www_v2/src/__tests__/boiler-i18n.test.ts` — unit tests for `t()` (cs default, en path, missing key fallback).
- Create: `custom_components/oig_cloud/www_v2/src/__tests__/boiler-format.test.ts` — formatter unit tests.
- Create: `custom_components/oig_cloud/www_v2/playwright/boiler-v2-smoke.mjs` — Playwright Node script (mirroring `/tmp/v2-screenshot.mjs`) that loads the deployed bundle against a stubbed `hass`, switches to the Boiler tab, asserts every required `data-testid`, and saves a screenshot.

## Translation Strategy

- Lightweight: a `Record<Lang, Record<Key, string>>` map for `cs` and `en`. No external library.
- Lang resolution helper: `resolveLang(hass): 'cs' | 'en'` — reads `hass.locale?.language ?? hass.language ?? 'cs'`, lowercases, returns `'en'` only for `en*`, otherwise `'cs'`.
- All keys live under namespace `boiler.*`. Keys are stable and snake-cased (`boiler.status.heating`, `boiler.status.idle`, `boiler.timeline.empty`, `boiler.explanation.fresh`, etc.).
- Reason codes from the appendix get a 1:1 translation map (`boiler.reason.comfort_satisfied`, …). Unknown reason codes render as the raw code (no fabrication).

---

### Task 1: Add i18n helper and reason-code map

**Files:**
- Create: `custom_components/oig_cloud/www_v2/src/i18n/boiler.ts`
- Create: `custom_components/oig_cloud/www_v2/src/__tests__/boiler-i18n.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/boiler-i18n.test.ts
import { describe, it, expect } from 'vitest';
import { resolveLang, t } from '@/i18n/boiler';

describe('boiler i18n', () => {
  it('resolves cs by default', () => {
    expect(resolveLang(undefined as any)).toBe('cs');
    expect(resolveLang({ locale: { language: 'cs' } } as any)).toBe('cs');
  });
  it('resolves en when hass language starts with en', () => {
    expect(resolveLang({ language: 'en' } as any)).toBe('en');
    expect(resolveLang({ locale: { language: 'en-US' } } as any)).toBe('en');
  });
  it('returns cs string for known key', () => {
    expect(t('boiler.status.heating', 'cs')).toBe('Ohřev');
  });
  it('returns en string for known key', () => {
    expect(t('boiler.status.heating', 'en')).toBe('Heating');
  });
  it('returns key when missing', () => {
    expect(t('boiler.unknown.key' as any, 'cs')).toBe('boiler.unknown.key');
  });
  it('translates known reason codes', () => {
    expect(t('boiler.reason.comfort_satisfied', 'cs')).toContain('Komfort splněn');
    expect(t('boiler.reason.comfort_satisfied', 'en')).toContain('Comfort satisfied');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd custom_components/oig_cloud/www_v2 && npx vitest run src/__tests__/boiler-i18n.test.ts`
Expected: FAIL with module-not-found for `@/i18n/boiler`.

- [ ] **Step 3: Implement i18n module**

Create `src/i18n/boiler.ts` with:

```ts
export type Lang = 'cs' | 'en';

export function resolveLang(hass: any): Lang {
  const raw = (hass?.locale?.language ?? hass?.language ?? 'cs') as string;
  return /^en/i.test(raw) ? 'en' : 'cs';
}

const STRINGS: Record<Lang, Record<string, string>> = {
  cs: {
    'boiler.status.heading': 'Stav bojleru',
    'boiler.status.heating': 'Ohřev',
    'boiler.status.idle': 'Nečinný',
    'boiler.status.unknown': 'Neznámý',
    'boiler.status.selected_source': 'Vybraný zdroj',
    'boiler.status.actuated_source': 'Aktivní zdroj',
    'boiler.status.temp_top': 'Teplota nahoře',
    'boiler.status.temp_bottom': 'Teplota dole',
    'boiler.status.energy_needed': 'Zbývající energie',
    'boiler.status.last_update': 'Poslední aktualizace',
    'boiler.status.degraded': 'Degradováno',
    'boiler.status.comfort_satisfied': 'Komfort splněn',
    'boiler.status.comfort_unsatisfied': 'Komfort nesplněn',
    'boiler.status.comfort_unknown': 'Komfort neznámý',

    'boiler.timeline.heading': 'Plán nabíjení (15 min sloty)',
    'boiler.timeline.empty': 'Plán bojleru zatím není k dispozici.',
    'boiler.timeline.col_time': 'Čas',
    'boiler.timeline.col_source': 'Zdroj',
    'boiler.timeline.col_temp': 'Teplota',
    'boiler.timeline.col_kwh': 'Energie',
    'boiler.timeline.col_cost': 'Cena',
    'boiler.timeline.col_pv': 'FVE podíl',
    'boiler.timeline.comfort_ok': 'Komfort OK',
    'boiler.timeline.comfort_gap': 'Komfort nesplněn',

    'boiler.explanation.heading': 'Vysvětlení',
    'boiler.explanation.empty': 'Žádné vysvětlení od plánovače.',
    'boiler.explanation.plan_created': 'Plán vytvořen',
    'boiler.explanation.plan_valid_until': 'Plán platí do',
    'boiler.explanation.data_age': 'Stáří dat',
    'boiler.explanation.freshness_heading': 'Čerstvost vstupů',
    'boiler.explanation.freshness_fresh': 'vstupy aktuální',
    'boiler.explanation.degraded_heading': 'Degradované stavy',
    'boiler.explanation.unsatisfied_gap': 'Komfortní mezera',
    'boiler.explanation.temp_at_deadline': 'Předpokládaná teplota na deadline',

    'boiler.override.heading': 'Ruční přepis (sekundární)',
    'boiler.override.subtitle': 'Automatický plán je primární — přepis použijte jen výjimečně.',
    'boiler.override.ttl_label': 'Délka přepisu (minuty)',
    'boiler.override.reason_label': 'Důvod přepisu',
    'boiler.override.submit': 'Aktivovat přepis',
    'boiler.override.identity_unavailable': 'Nedostupné – identita bojleru není rozpoznána.',
    'boiler.override.capability_unavailable': 'Aktuátor neumožňuje ruční přepis.',
    'boiler.override.active': 'Přepis aktivní',
    'boiler.override.ttl_remaining_min': 'Zbývá',

    'boiler.unavailable.loading': 'Načítání dat bojleru…',
    'boiler.unavailable.error': 'Chyba při načítání bojleru',
    'boiler.unavailable.degraded': 'Bojler v degradovaném režimu',
    'boiler.unavailable.unavailable': 'Data bojleru nejsou k dispozici',

    'boiler.source.fve': 'FVE',
    'boiler.source.grid': 'Síť',
    'boiler.source.alternative': 'Alternativa',
    'boiler.source.none': '—',

    'boiler.reason.comfort_satisfied': 'Komfort splněn',
    'boiler.reason.comfort_unsatisfied': 'Komfort nelze splnit',
    'boiler.reason.no_feasible_plan': 'Žádný proveditelný plán',
    'boiler.reason.bootstrap_profile': 'Učící režim profilu (málo dat)',
    'boiler.reason.history_profile_low_confidence': 'Profil s nízkou důvěrou',
    'boiler.reason.input_stale_price': 'Ceny nejsou aktuální',
    'boiler.reason.input_stale_pv': 'FVE predikce není aktuální',
    'boiler.reason.input_missing_recorder': 'Chybí historie z recorderu',
    'boiler.reason.input_adapter_error': 'Chyba vstupního adapteru',
    'boiler.reason.input_stale_temperature': 'Teplota není aktuální',
    'boiler.reason.top_sensor_unavailable': 'Horní teploměr není dostupný',
    'boiler.reason.bottom_sensor_unavailable_top_only_degraded': 'Dolní teploměr není dostupný (top-only režim)',
    'boiler.reason.primary_actuator_unavailable': 'Hlavní topný aktuátor není dostupný',
    'boiler.reason.alternative_actuator_unavailable_benchmark_only': 'Alternativní zdroj jen jako benchmark',
    'boiler.reason.circulation_pump_unavailable': 'Cirkulační čerpadlo není dostupné',
    'boiler.reason.actuator_rate_limited': 'Aktuátor omezen rychlostním limitem',
    'boiler.reason.actuator_serializer_error': 'Chyba serializéru aktuátoru',
    'boiler.reason.override_active': 'Ruční přepis aktivní',
    'boiler.reason.override_expired': 'Ruční přepis vypršel',
    'boiler.reason.planner_timeout': 'Plánovač překročil časový limit',
    'boiler.reason.replan_coalesced': 'Přeplánování sloučeno',
    'boiler.reason.source_selected_grid': 'Vybrán zdroj: síť',
    'boiler.reason.source_selected_pv': 'Vybrán zdroj: FVE',
    'boiler.reason.source_selected_alternative': 'Vybrán zdroj: alternativa',
    'boiler.reason.source_benchmark_only': 'Alternativa pouze jako srovnání',
    'boiler.reason.setup_incomplete': 'Konfigurace bojleru není dokončena',
    'boiler.reason.migration_required': 'Vyžaduje se migrace bojleru',
    'boiler.reason.api_repair_required': 'Vyžaduje se oprava API',
    'boiler.reason.storage_write_failed': 'Selhalo uložení stavu bojleru',
  },
  en: {
    'boiler.status.heading': 'Boiler status',
    'boiler.status.heating': 'Heating',
    'boiler.status.idle': 'Idle',
    'boiler.status.unknown': 'Unknown',
    'boiler.status.selected_source': 'Selected source',
    'boiler.status.actuated_source': 'Actuated source',
    'boiler.status.temp_top': 'Top temperature',
    'boiler.status.temp_bottom': 'Bottom temperature',
    'boiler.status.energy_needed': 'Energy needed',
    'boiler.status.last_update': 'Last update',
    'boiler.status.degraded': 'Degraded',
    'boiler.status.comfort_satisfied': 'Comfort satisfied',
    'boiler.status.comfort_unsatisfied': 'Comfort not satisfied',
    'boiler.status.comfort_unknown': 'Comfort unknown',

    'boiler.timeline.heading': 'Heating plan (15 min slots)',
    'boiler.timeline.empty': 'No boiler plan available yet.',
    'boiler.timeline.col_time': 'Time',
    'boiler.timeline.col_source': 'Source',
    'boiler.timeline.col_temp': 'Temp',
    'boiler.timeline.col_kwh': 'Energy',
    'boiler.timeline.col_cost': 'Cost',
    'boiler.timeline.col_pv': 'PV share',
    'boiler.timeline.comfort_ok': 'Comfort OK',
    'boiler.timeline.comfort_gap': 'Comfort gap',

    'boiler.explanation.heading': 'Explanation',
    'boiler.explanation.empty': 'No planner explanation yet.',
    'boiler.explanation.plan_created': 'Plan created',
    'boiler.explanation.plan_valid_until': 'Plan valid until',
    'boiler.explanation.data_age': 'Data age',
    'boiler.explanation.freshness_heading': 'Input freshness',
    'boiler.explanation.freshness_fresh': 'inputs fresh',
    'boiler.explanation.degraded_heading': 'Degraded state',
    'boiler.explanation.unsatisfied_gap': 'Comfort gap',
    'boiler.explanation.temp_at_deadline': 'Predicted deadline temperature',

    'boiler.override.heading': 'Manual override (secondary)',
    'boiler.override.subtitle': 'Automatic plan is primary — use override only when necessary.',
    'boiler.override.ttl_label': 'Override duration (minutes)',
    'boiler.override.reason_label': 'Override reason',
    'boiler.override.submit': 'Activate override',
    'boiler.override.identity_unavailable': 'Unavailable – boiler identity is not resolved.',
    'boiler.override.capability_unavailable': 'Actuator does not support manual override.',
    'boiler.override.active': 'Override active',
    'boiler.override.ttl_remaining_min': 'remaining',

    'boiler.unavailable.loading': 'Loading boiler data…',
    'boiler.unavailable.error': 'Failed to load boiler data',
    'boiler.unavailable.degraded': 'Boiler in degraded mode',
    'boiler.unavailable.unavailable': 'Boiler data unavailable',

    'boiler.source.fve': 'PV',
    'boiler.source.grid': 'Grid',
    'boiler.source.alternative': 'Alternative',
    'boiler.source.none': '—',

    'boiler.reason.comfort_satisfied': 'Comfort satisfied',
    'boiler.reason.comfort_unsatisfied': 'Comfort cannot be met',
    'boiler.reason.no_feasible_plan': 'No feasible plan',
    'boiler.reason.bootstrap_profile': 'Bootstrap profile (low data)',
    'boiler.reason.history_profile_low_confidence': 'Low-confidence profile',
    'boiler.reason.input_stale_price': 'Spot prices are stale',
    'boiler.reason.input_stale_pv': 'PV forecast is stale',
    'boiler.reason.input_missing_recorder': 'Recorder history missing',
    'boiler.reason.input_adapter_error': 'Input adapter error',
    'boiler.reason.input_stale_temperature': 'Temperature reading stale',
    'boiler.reason.top_sensor_unavailable': 'Top sensor unavailable',
    'boiler.reason.bottom_sensor_unavailable_top_only_degraded': 'Bottom sensor unavailable (top-only mode)',
    'boiler.reason.primary_actuator_unavailable': 'Primary heating actuator unavailable',
    'boiler.reason.alternative_actuator_unavailable_benchmark_only': 'Alternative source benchmark only',
    'boiler.reason.circulation_pump_unavailable': 'Circulation pump unavailable',
    'boiler.reason.actuator_rate_limited': 'Actuator rate limited',
    'boiler.reason.actuator_serializer_error': 'Actuator serializer error',
    'boiler.reason.override_active': 'Manual override active',
    'boiler.reason.override_expired': 'Manual override expired',
    'boiler.reason.planner_timeout': 'Planner timeout',
    'boiler.reason.replan_coalesced': 'Replan coalesced',
    'boiler.reason.source_selected_grid': 'Source selected: grid',
    'boiler.reason.source_selected_pv': 'Source selected: PV',
    'boiler.reason.source_selected_alternative': 'Source selected: alternative',
    'boiler.reason.source_benchmark_only': 'Alternative is benchmark only',
    'boiler.reason.setup_incomplete': 'Boiler setup incomplete',
    'boiler.reason.migration_required': 'Boiler migration required',
    'boiler.reason.api_repair_required': 'API repair required',
    'boiler.reason.storage_write_failed': 'Failed to persist boiler state',
  },
};

export type Key = keyof typeof STRINGS['cs'];

export function t(key: Key | string, lang: Lang): string {
  const table = STRINGS[lang] ?? STRINGS.cs;
  if (key in table) return table[key as Key];
  // fallback to cs
  if (key in STRINGS.cs) return STRINGS.cs[key as Key];
  return key as string;
}

export function reasonLabel(code: string, lang: Lang): string {
  const key = `boiler.reason.${code}`;
  if ((STRINGS[lang] as any)[key]) return (STRINGS[lang] as any)[key];
  if ((STRINGS.cs as any)[key]) return (STRINGS.cs as any)[key];
  return code;
}

export function sourceLabel(source: string | null | undefined, lang: Lang): string {
  if (!source) return t('boiler.source.none', lang);
  const key = `boiler.source.${source}` as const;
  if ((STRINGS[lang] as any)[key]) return (STRINGS[lang] as any)[key];
  if ((STRINGS.cs as any)[key]) return (STRINGS.cs as any)[key];
  return source;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd custom_components/oig_cloud/www_v2 && npx vitest run src/__tests__/boiler-i18n.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add custom_components/oig_cloud/www_v2/src/i18n/boiler.ts custom_components/oig_cloud/www_v2/src/__tests__/boiler-i18n.test.ts
git commit -m "feat(boiler-ui): add i18n helper and reason-code translation map"
```

---

### Task 2: Add formatter helpers

**Files:**
- Create: `custom_components/oig_cloud/www_v2/src/ui/features/boiler/format.ts`
- Create: `custom_components/oig_cloud/www_v2/src/__tests__/boiler-format.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/__tests__/boiler-format.test.ts
import { describe, it, expect } from 'vitest';
import {
  formatTempC,
  formatKwh,
  formatCzk,
  formatPercent,
  formatTimeRange,
  formatDataAge,
} from '@/ui/features/boiler/format';

describe('boiler formatters', () => {
  it('formats temperature with 1 decimal and unit', () => {
    expect(formatTempC(45)).toBe('45.0 °C');
    expect(formatTempC(45.27)).toBe('45.3 °C');
    expect(formatTempC(null)).toBe('—');
  });
  it('formats kWh with 2 decimals', () => {
    expect(formatKwh(1.5)).toBe('1.50 kWh');
    expect(formatKwh(null)).toBe('—');
  });
  it('formats CZK with 2 decimals', () => {
    expect(formatCzk(2.123)).toBe('2.12 Kč');
    expect(formatCzk(null)).toBe('—');
  });
  it('formats percent with 0 decimals', () => {
    expect(formatPercent(0.42)).toBe('42 %');
    expect(formatPercent(null)).toBe('—');
  });
  it('formats time range hh:mm – hh:mm', () => {
    expect(formatTimeRange('2026-04-26T14:00:00Z', '2026-04-26T14:15:00Z')).toMatch(/\d{2}:\d{2}\s*–\s*\d{2}:\d{2}/);
  });
  it('formats data age in human form', () => {
    expect(formatDataAge(45)).toBe('45 s');
    expect(formatDataAge(125)).toBe('2 min');
    expect(formatDataAge(7200)).toBe('2 h');
    expect(formatDataAge(null)).toBe('—');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd custom_components/oig_cloud/www_v2 && npx vitest run src/__tests__/boiler-format.test.ts`
Expected: FAIL with module-not-found.

- [ ] **Step 3: Implement formatters**

```ts
// src/ui/features/boiler/format.ts
const DASH = '—';

export function formatTempC(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return DASH;
  return `${v.toFixed(1)} °C`;
}
export function formatKwh(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return DASH;
  return `${v.toFixed(2)} kWh`;
}
export function formatCzk(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return DASH;
  return `${v.toFixed(2)} Kč`;
}
export function formatPercent(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return DASH;
  return `${Math.round(v * 100)} %`;
}
export function formatTimeRange(startIso: string, endIso: string): string {
  const fmt = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };
  return `${fmt(startIso)} – ${fmt(endIso)}`;
}
export function formatDataAge(secs: number | null | undefined): string {
  if (secs == null || !Number.isFinite(secs)) return DASH;
  if (secs < 60) return `${Math.round(secs)} s`;
  if (secs < 3600) return `${Math.round(secs / 60)} min`;
  return `${Math.round(secs / 3600)} h`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd custom_components/oig_cloud/www_v2 && npx vitest run src/__tests__/boiler-format.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add custom_components/oig_cloud/www_v2/src/ui/features/boiler/format.ts custom_components/oig_cloud/www_v2/src/__tests__/boiler-format.test.ts
git commit -m "feat(boiler-ui): add deterministic formatters for boiler V2 sections"
```

---

### Task 3: Rebuild OigBoilerStatusPanel with full DTO coverage

**Files:**
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/boiler/components.ts` (the `OigBoilerStatusPanel` class only)
- Modify: `custom_components/oig_cloud/www_v2/src/__tests__/boiler-v2-ui.test.ts`

Acceptance fields the panel MUST render: `current_state`, `comfort_status` (from `comfortStatusCode` + `comfortSatisfied`), `selected_source`, `actuated_source`, every entry in `degraded_flags`, and the existing `temperatureTop`/`temperatureBottom`/`heating`/`energyNeededKwh`/`lastUpdate` fields.

Acceptance: every visible label is i18n-routed; all numeric fields use `format.ts`; null fields render the en-dash; `data-testid="boiler-status-panel"` stays; new sub-selectors `boiler-status-current-state`, `boiler-status-selected-source`, `boiler-status-actuated-source`, `boiler-status-comfort`, `boiler-status-degraded-flags` exist.

- [ ] **Step 1: Write the failing test (extend existing file)**

Append to `boiler-v2-ui.test.ts`:

```ts
describe('OigBoilerStatusPanel — full DTO coverage', () => {
  it('renders current_state, both sources, comfort and every degraded flag', async () => {
    const el = document.createElement('oig-boiler-status-panel') as any;
    el.lang = 'cs';
    el.data = {
      currentState: 'heating',
      comfortSatisfied: false,
      comfortStatusCode: 'comfort_unsatisfied',
      selectedSource: 'fve',
      actuatedSource: 'grid',
      temperatureTop: 45.2,
      temperatureBottom: 38.0,
      energyNeededKwh: 1.234,
      heating: true,
      lastUpdate: '2026-04-26T14:00:00Z',
      degraded: true,
      degradedFlags: ['input_stale_pv', 'top_sensor_unavailable'],
    };
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('boiler-status-current-state');
    expect(html).toContain('Ohřev');
    expect(html).toContain('boiler-status-selected-source');
    expect(html).toContain('FVE');
    expect(html).toContain('boiler-status-actuated-source');
    expect(html).toContain('Síť');
    expect(html).toContain('boiler-status-comfort');
    expect(html).toContain('Komfort nesplněn');
    expect(html).toContain('boiler-status-degraded-flags');
    expect(html).toContain('FVE predikce není aktuální');
    expect(html).toContain('Horní teploměr není dostupný');
    expect(html).toContain('45.2 °C');
    expect(html).toContain('38.0 °C');
    expect(html).toContain('1.23 kWh');
  });
  it('renders en strings when lang=en', async () => {
    const el = document.createElement('oig-boiler-status-panel') as any;
    el.lang = 'en';
    el.data = {
      currentState: 'idle',
      comfortSatisfied: true,
      comfortStatusCode: 'comfort_satisfied',
      selectedSource: 'grid',
      actuatedSource: 'grid',
      temperatureTop: 50,
      temperatureBottom: null,
      energyNeededKwh: 0,
      heating: false,
      lastUpdate: null,
      degraded: false,
      degradedFlags: [],
    };
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('Idle');
    expect(html).toContain('Comfort satisfied');
    expect(html).toContain('Grid');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd custom_components/oig_cloud/www_v2 && npx vitest run src/__tests__/boiler-v2-ui.test.ts -t "full DTO coverage"`
Expected: FAIL — current panel does not contain those selectors/strings.

- [ ] **Step 3: Replace the component implementation**

Locate `@customElement('oig-boiler-status-panel')` in `components.ts` (around line 1331) and replace its full class body with:

```ts
@customElement('oig-boiler-status-panel')
export class OigBoilerStatusPanel extends LitElement {
  @property({ attribute: false }) data: BoilerV2Status | null = null;
  @property({ type: String }) lang: 'cs' | 'en' = 'cs';

  static styles = css`
    :host { display: block; }
    .panel { display: grid; gap: 12px; padding: 16px; border-radius: 12px; background: var(--card-background-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .heading { font-size: 1.05rem; font-weight: 600; color: var(--primary-text-color, #222); }
    .pill { padding: 2px 10px; border-radius: 999px; font-size: 0.85rem; font-weight: 600; }
    .pill.heating { background: rgba(255,152,0,0.15); color: #b75d00; }
    .pill.idle { background: rgba(76,175,80,0.15); color: #2e7d32; }
    .pill.unknown { background: rgba(120,120,120,0.15); color: #555; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
    .field { display: flex; flex-direction: column; gap: 2px; }
    .field label { font-size: 0.75rem; color: var(--secondary-text-color, #666); text-transform: uppercase; letter-spacing: 0.04em; }
    .field span { font-size: 1.05rem; color: var(--primary-text-color, #111); font-variant-numeric: tabular-nums; }
    .comfort { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
    .comfort.ok { color: #2e7d32; }
    .comfort.bad { color: #c62828; }
    .comfort.unknown { color: #777; }
    .degraded-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .degraded-tag { padding: 2px 8px; border-radius: 6px; background: rgba(244,67,54,0.12); color: #b71c1c; font-size: 0.8rem; }
    .degraded-banner { padding: 6px 10px; border-radius: 8px; background: rgba(244,67,54,0.15); color: #b71c1c; font-weight: 600; font-size: 0.85rem; }
  `;

  render() {
    const d = this.data;
    const lang = this.lang;
    const stateKey = (d?.currentState ?? 'unknown') as 'heating' | 'idle' | 'unknown';
    const stateLabel = t(`boiler.status.${stateKey}` as any, lang);
    const comfortLabel = d?.comfortSatisfied === true
      ? t('boiler.status.comfort_satisfied', lang)
      : d?.comfortSatisfied === false
        ? t('boiler.status.comfort_unsatisfied', lang)
        : t('boiler.status.comfort_unknown', lang);
    const comfortClass = d?.comfortSatisfied === true ? 'ok' : d?.comfortSatisfied === false ? 'bad' : 'unknown';
    const flags = d?.degradedFlags ?? [];

    return html`
      <div data-testid="boiler-status-panel" class="panel">
        <div class="row">
          <div class="heading">${t('boiler.status.heading', lang)}</div>
          <span data-testid="boiler-status-current-state" class="pill ${stateKey}">${stateLabel}</span>
        </div>
        ${d?.degraded ? html`<div class="degraded-banner">${t('boiler.status.degraded', lang)}</div>` : ''}
        <div class="grid">
          <div class="field"><label>${t('boiler.status.temp_top', lang)}</label><span>${formatTempC(d?.temperatureTop ?? null)}</span></div>
          <div class="field"><label>${t('boiler.status.temp_bottom', lang)}</label><span>${formatTempC(d?.temperatureBottom ?? null)}</span></div>
          <div class="field"><label>${t('boiler.status.selected_source', lang)}</label><span data-testid="boiler-status-selected-source">${sourceLabel(d?.selectedSource ?? null, lang)}</span></div>
          <div class="field"><label>${t('boiler.status.actuated_source', lang)}</label><span data-testid="boiler-status-actuated-source">${sourceLabel(d?.actuatedSource ?? null, lang)}</span></div>
          <div class="field"><label>${t('boiler.status.energy_needed', lang)}</label><span>${formatKwh(d?.energyNeededKwh ?? null)}</span></div>
          <div class="field"><label>${t('boiler.status.last_update', lang)}</label><span>${d?.lastUpdate ?? '—'}</span></div>
        </div>
        <div data-testid="boiler-status-comfort" class="comfort ${comfortClass}">${comfortLabel}</div>
        ${flags.length
          ? html`<div data-testid="boiler-status-degraded-flags" class="degraded-list">${flags.map((f) => html`<span class="degraded-tag">${reasonLabel(f, lang)}</span>`)}</div>`
          : ''}
      </div>
    `;
  }
}
```

Add to top of file imports (only once, near other `import` lines):

```ts
import { t, sourceLabel, reasonLabel, type Lang } from '@/i18n/boiler';
import { formatTempC, formatKwh } from '@/ui/features/boiler/format';
import { css } from 'lit';
```

(If `css` is already imported skip the duplicate. Same for `Lang` import only used here.)

- [ ] **Step 4: Run test to verify it passes**

Run: `cd custom_components/oig_cloud/www_v2 && npx vitest run src/__tests__/boiler-v2-ui.test.ts -t "full DTO coverage"`
Expected: PASS (2 tests).

Then run the whole boiler test file: `npx vitest run src/__tests__/boiler-v2-ui.test.ts`
Expected: all existing assertions still PASS (the test file already checks `data-testid="boiler-status-panel"` etc — keep them green).

- [ ] **Step 5: Commit**

```bash
git add custom_components/oig_cloud/www_v2/src/ui/features/boiler/components.ts custom_components/oig_cloud/www_v2/src/__tests__/boiler-v2-ui.test.ts
git commit -m "feat(boiler-ui): rebuild status panel to render full canonical status DTO"
```

---

### Task 4: Rebuild OigBoilerPlanTimeline with per-slot detail

**Files:**
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/boiler/components.ts` (the `OigBoilerPlanTimeline` class only)
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/boiler/types.ts` — extend `BoilerV2PlanSlot` with optional `expectedTempTopC?: number | null`, `comfortSatisfied?: boolean | null`, `estimatedCostCzk?: number | null`, `pvShare?: number | null` (these fields are produced by the canonical DTO mapping in `boiler-data.ts`; if not yet present in the response, the renderer renders `—`).
- Modify: `custom_components/oig_cloud/www_v2/src/data/boiler-data.ts` — surface those four optional fields when present in the canonical `plan.slots[*]` payload (`predicted_temperature_c`, `comfort_satisfied`, `estimated_cost_czk`, `pv_contribution_kwh / consumption_kwh`).
- Modify: `custom_components/oig_cloud/www_v2/src/__tests__/boiler-v2-ui.test.ts`

Acceptance: timeline renders columns: time (`HH:MM – HH:MM`), translated source label, expected temperature, comfort badge, energy kWh, estimated cost (when present), PV share (when present). Empty slot list renders translated empty state. Selector `boiler-plan-timeline` stays.

- [ ] **Step 1: Write the failing test**

Append to `boiler-v2-ui.test.ts`:

```ts
describe('OigBoilerPlanTimeline — per-slot detail', () => {
  it('renders source, expected temp, comfort, kwh, cost, pv share for each slot', async () => {
    const el = document.createElement('oig-boiler-plan-timeline') as any;
    el.lang = 'cs';
    el.slots = [
      {
        start: '2026-04-26T14:00:00Z',
        end: '2026-04-26T14:15:00Z',
        consumptionKwh: 0.5,
        confidence: 1,
        recommendedSource: 'fve',
        spotPrice: 1.2,
        altPrice: null,
        overflowAvailable: true,
        expectedTempTopC: 48.5,
        comfortSatisfied: true,
        estimatedCostCzk: 0.6,
        pvShare: 0.8,
      },
      {
        start: '2026-04-26T14:15:00Z',
        end: '2026-04-26T14:30:00Z',
        consumptionKwh: 0.3,
        confidence: 1,
        recommendedSource: 'grid',
        spotPrice: 2.1,
        altPrice: null,
        overflowAvailable: false,
        expectedTempTopC: null,
        comfortSatisfied: false,
        estimatedCostCzk: 0.63,
        pvShare: 0,
      },
    ];
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('boiler-plan-timeline');
    // sources translated
    expect(html).toContain('FVE');
    expect(html).toContain('Síť');
    // expected temp formatted
    expect(html).toContain('48.5 °C');
    // comfort badges
    expect(html).toContain('Komfort OK');
    expect(html).toContain('Komfort nesplněn');
    // energy + cost + pv
    expect(html).toContain('0.50 kWh');
    expect(html).toContain('0.60 Kč');
    expect(html).toContain('80 %');
    expect(html).toContain('0 %');
  });

  it('renders translated empty state when no slots', async () => {
    const el = document.createElement('oig-boiler-plan-timeline') as any;
    el.lang = 'cs';
    el.slots = [];
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('Plán bojleru zatím není k dispozici');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/boiler-v2-ui.test.ts -t "per-slot detail"`
Expected: FAIL.

- [ ] **Step 3: Extend types and renderer**

Edit `types.ts` `BoilerV2PlanSlot` interface — append (do not remove existing fields):

```ts
  expectedTempTopC?: number | null;
  comfortSatisfied?: boolean | null;
  estimatedCostCzk?: number | null;
  pvShare?: number | null;
```

Edit `data/boiler-data.ts` mapping function `mapCanonicalToV2` (or equivalent) — find the `plan.slots` mapper and pass through these fields when present in the API payload. Use defensive `?? null` access:

```ts
return canonicalSlots.map((s: any) => ({
  start: s.start,
  end: s.end,
  consumptionKwh: s.consumption_kwh ?? 0,
  confidence: s.confidence ?? 1,
  recommendedSource: s.recommended_source ?? 'unknown',
  spotPrice: s.spot_price ?? null,
  altPrice: s.alt_price ?? null,
  overflowAvailable: !!s.overflow_available,
  expectedTempTopC: s.predicted_temperature_c ?? null,
  comfortSatisfied: s.comfort_satisfied ?? null,
  estimatedCostCzk: s.estimated_cost_czk ?? null,
  pvShare: typeof s.pv_share === 'number'
    ? s.pv_share
    : (s.consumption_kwh && s.pv_contribution_kwh != null
        ? s.pv_contribution_kwh / s.consumption_kwh
        : null),
}));
```

Replace the body of `OigBoilerPlanTimeline`:

```ts
@customElement('oig-boiler-plan-timeline')
export class OigBoilerPlanTimeline extends LitElement {
  @property({ attribute: false }) slots: BoilerV2PlanSlot[] = [];
  @property({ type: String }) lang: 'cs' | 'en' = 'cs';

  static styles = css`
    :host { display: block; }
    .wrap { padding: 16px; border-radius: 12px; background: var(--card-background-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .heading { font-size: 1.05rem; font-weight: 600; margin-bottom: 12px; }
    .empty { color: var(--secondary-text-color, #666); padding: 24px 0; text-align: center; }
    table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
    th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid var(--divider-color, #eee); font-size: 0.9rem; }
    th { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--secondary-text-color, #666); font-weight: 600; }
    .src { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; }
    .src.fve { background: rgba(76,175,80,0.15); color: #2e7d32; }
    .src.grid { background: rgba(255,152,0,0.15); color: #b75d00; }
    .src.alternative { background: rgba(33,150,243,0.15); color: #0d47a1; }
    .src.other { background: rgba(120,120,120,0.15); color: #555; }
    .badge { padding: 1px 6px; border-radius: 4px; font-size: 0.75rem; }
    .badge.ok { background: rgba(76,175,80,0.15); color: #2e7d32; }
    .badge.bad { background: rgba(244,67,54,0.15); color: #b71c1c; }
  `;

  private srcClass(s: string): string {
    return ['fve', 'grid', 'alternative'].includes(s) ? s : 'other';
  }

  render() {
    const lang = this.lang;
    if (!this.slots || this.slots.length === 0) {
      return html`<div data-testid="boiler-plan-timeline" class="wrap"><div class="heading">${t('boiler.timeline.heading', lang)}</div><div class="empty">${t('boiler.timeline.empty', lang)}</div></div>`;
    }
    return html`
      <div data-testid="boiler-plan-timeline" class="wrap">
        <div class="heading">${t('boiler.timeline.heading', lang)}</div>
        <table>
          <thead>
            <tr>
              <th>${t('boiler.timeline.col_time', lang)}</th>
              <th>${t('boiler.timeline.col_source', lang)}</th>
              <th>${t('boiler.timeline.col_temp', lang)}</th>
              <th>${t('boiler.timeline.col_kwh', lang)}</th>
              <th>${t('boiler.timeline.col_cost', lang)}</th>
              <th>${t('boiler.timeline.col_pv', lang)}</th>
            </tr>
          </thead>
          <tbody>
            ${this.slots.map((s) => {
              const comfortBadge = s.comfortSatisfied === true
                ? html`<span class="badge ok">${t('boiler.timeline.comfort_ok', lang)}</span>`
                : s.comfortSatisfied === false
                  ? html`<span class="badge bad">${t('boiler.timeline.comfort_gap', lang)}</span>`
                  : '';
              return html`
                <tr>
                  <td>${formatTimeRange(s.start, s.end)}</td>
                  <td><span class="src ${this.srcClass(s.recommendedSource)}">${sourceLabel(s.recommendedSource, lang)}</span></td>
                  <td>${formatTempC(s.expectedTempTopC ?? null)} ${comfortBadge}</td>
                  <td>${formatKwh(s.consumptionKwh)}</td>
                  <td>${formatCzk(s.estimatedCostCzk ?? null)}</td>
                  <td>${formatPercent(s.pvShare ?? null)}</td>
                </tr>
              `;
            })}
          </tbody>
        </table>
      </div>
    `;
  }
}
```

Add to imports (if missing): `formatTimeRange, formatCzk, formatPercent` from `@/ui/features/boiler/format`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/boiler-v2-ui.test.ts`
Expected: all pass (existing + 2 new).

Run also: `npx vitest run src/__tests__/boiler-data.test.ts` (if exists) — adjust any snapshot/golden if it complains about new fields.

- [ ] **Step 5: Commit**

```bash
git add custom_components/oig_cloud/www_v2/src/ui/features/boiler/types.ts custom_components/oig_cloud/www_v2/src/ui/features/boiler/components.ts custom_components/oig_cloud/www_v2/src/data/boiler-data.ts custom_components/oig_cloud/www_v2/src/__tests__/boiler-v2-ui.test.ts
git commit -m "feat(boiler-ui): rebuild plan timeline with per-slot temp/comfort/cost/PV"
```

---

### Task 5: Rebuild OigBoilerSourceExplanation with split sections

**Files:**
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/boiler/components.ts` (the `OigBoilerSourceExplanation` class only)
- Modify: `custom_components/oig_cloud/www_v2/src/__tests__/boiler-v2-ui.test.ts`

Acceptance fields: `reasonCodes` (translated, one chip per code), separated **Freshness** block (if any of `input_stale_*`, `input_missing_recorder` present, otherwise show `freshness_fresh`), separated **Degraded reasons** block (`degradedReasons` translated), `unsatisfiedComfortGapC`, `temperatureAtDeadlineC`, `dataAgeSecs`, `planCreatedAt`, `planValidUntil`. Empty explanation renders translated empty state.

- [ ] **Step 1: Write the failing test**

Append to `boiler-v2-ui.test.ts`:

```ts
describe('OigBoilerSourceExplanation — split sections', () => {
  it('renders translated reasons split into freshness vs degraded vs others', async () => {
    const el = document.createElement('oig-boiler-source-explanation') as any;
    el.lang = 'cs';
    el.explanation = {
      reasonCodes: ['source_selected_pv', 'input_stale_price'],
      planCreatedAt: '2026-04-26T13:55:00Z',
      planValidUntil: '2026-04-27T13:55:00Z',
      dataAgeSecs: 125,
      degradedReasons: ['top_sensor_unavailable'],
      unsatisfiedComfortGapC: 4.2,
      temperatureAtDeadlineC: 45.5,
    };
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('boiler-source-explanation');
    // freshness section shows the stale reason
    expect(html).toContain('Čerstvost');
    expect(html).toContain('Ceny nejsou aktuální');
    // degraded section shows degraded reason
    expect(html).toContain('Degradované');
    expect(html).toContain('Horní teploměr není dostupný');
    // other reason
    expect(html).toContain('Vybrán zdroj: FVE');
    // gap and predicted temp
    expect(html).toContain('4.2');
    expect(html).toContain('45.5 °C');
    // data age
    expect(html).toContain('2 min');
  });
  it('renders fresh-inputs label when no freshness reason present', async () => {
    const el = document.createElement('oig-boiler-source-explanation') as any;
    el.lang = 'cs';
    el.explanation = {
      reasonCodes: ['source_selected_grid'],
      planCreatedAt: null,
      planValidUntil: null,
      dataAgeSecs: null,
      degradedReasons: [],
      unsatisfiedComfortGapC: null,
      temperatureAtDeadlineC: null,
    };
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('vstupy aktuální');
  });
  it('renders empty state when explanation is null', async () => {
    const el = document.createElement('oig-boiler-source-explanation') as any;
    el.lang = 'cs';
    el.explanation = null;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.innerHTML).toContain('Žádné vysvětlení');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/__tests__/boiler-v2-ui.test.ts -t "split sections"`
Expected: FAIL.

- [ ] **Step 3: Implement the explanation component**

Replace the existing `@customElement('oig-boiler-source-explanation')` class body:

```ts
const FRESHNESS_REASONS = new Set([
  'input_stale_price',
  'input_stale_pv',
  'input_stale_temperature',
  'input_missing_recorder',
  'input_adapter_error',
]);

@customElement('oig-boiler-source-explanation')
export class OigBoilerSourceExplanation extends LitElement {
  @property({ attribute: false }) explanation: BoilerV2Explanation | null = null;
  @property({ type: String }) lang: 'cs' | 'en' = 'cs';

  static styles = css`
    :host { display: block; }
    .wrap { padding: 16px; border-radius: 12px; background: var(--card-background-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.08); display: grid; gap: 12px; }
    .heading { font-size: 1.05rem; font-weight: 600; }
    .section { display: flex; flex-direction: column; gap: 6px; }
    .section h4 { margin: 0; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--secondary-text-color, #666); font-weight: 600; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { padding: 2px 8px; border-radius: 6px; font-size: 0.8rem; background: rgba(33,150,243,0.12); color: #0d47a1; }
    .chip.fresh { background: rgba(76,175,80,0.15); color: #2e7d32; }
    .chip.stale { background: rgba(255,152,0,0.18); color: #b75d00; }
    .chip.degraded { background: rgba(244,67,54,0.15); color: #b71c1c; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
    .meta { display: flex; flex-direction: column; }
    .meta label { font-size: 0.72rem; text-transform: uppercase; color: var(--secondary-text-color, #666); }
    .meta span { font-size: 0.95rem; font-variant-numeric: tabular-nums; }
    .empty { color: var(--secondary-text-color, #666); }
  `;

  render() {
    const e = this.explanation;
    const lang = this.lang;
    if (!e) {
      return html`<div data-testid="boiler-source-explanation" class="wrap"><div class="heading">${t('boiler.explanation.heading', lang)}</div><div class="empty">${t('boiler.explanation.empty', lang)}</div></div>`;
    }
    const reasonCodes = e.reasonCodes ?? [];
    const freshnessFromReasons = reasonCodes.filter((c) => FRESHNESS_REASONS.has(c));
    const otherReasons = reasonCodes.filter((c) => !FRESHNESS_REASONS.has(c));
    const degraded = e.degradedReasons ?? [];

    return html`
      <div data-testid="boiler-source-explanation" class="wrap">
        <div class="heading">${t('boiler.explanation.heading', lang)}</div>

        <div class="section" data-testid="boiler-explanation-freshness">
          <h4>${t('boiler.explanation.freshness_heading', lang)}</h4>
          ${freshnessFromReasons.length === 0
            ? html`<div class="chips"><span class="chip fresh">${t('boiler.explanation.freshness_fresh', lang)}</span></div>`
            : html`<div class="chips">${freshnessFromReasons.map((c) => html`<span class="chip stale">${reasonLabel(c, lang)}</span>`)}</div>`}
        </div>

        <div class="section" data-testid="boiler-explanation-degraded">
          <h4>${t('boiler.explanation.degraded_heading', lang)}</h4>
          ${degraded.length === 0
            ? html`<div class="empty">—</div>`
            : html`<div class="chips">${degraded.map((c) => html`<span class="chip degraded">${reasonLabel(c, lang)}</span>`)}</div>`}
        </div>

        ${otherReasons.length
          ? html`<div class="section" data-testid="boiler-explanation-reasons"><h4>Reason codes</h4><div class="chips">${otherReasons.map((c) => html`<span class="chip">${reasonLabel(c, lang)}</span>`)}</div></div>`
          : ''}

        <div class="meta-grid" data-testid="boiler-explanation-meta">
          ${e.planCreatedAt ? html`<div class="meta"><label>${t('boiler.explanation.plan_created', lang)}</label><span>${e.planCreatedAt}</span></div>` : ''}
          ${e.planValidUntil ? html`<div class="meta"><label>${t('boiler.explanation.plan_valid_until', lang)}</label><span>${e.planValidUntil}</span></div>` : ''}
          ${e.dataAgeSecs != null ? html`<div class="meta"><label>${t('boiler.explanation.data_age', lang)}</label><span>${formatDataAge(e.dataAgeSecs)}</span></div>` : ''}
          ${e.unsatisfiedComfortGapC != null ? html`<div class="meta"><label>${t('boiler.explanation.unsatisfied_gap', lang)}</label><span>${e.unsatisfiedComfortGapC} °C</span></div>` : ''}
          ${e.temperatureAtDeadlineC != null ? html`<div class="meta"><label>${t('boiler.explanation.temp_at_deadline', lang)}</label><span>${formatTempC(e.temperatureAtDeadlineC)}</span></div>` : ''}
        </div>
      </div>
    `;
  }
}
```

Add `formatDataAge` to imports from `format.ts`.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/__tests__/boiler-v2-ui.test.ts`
Expected: all pass (existing + 3 new).

- [ ] **Step 5: Commit**

```bash
git add custom_components/oig_cloud/www_v2/src/ui/features/boiler/components.ts custom_components/oig_cloud/www_v2/src/__tests__/boiler-v2-ui.test.ts
git commit -m "feat(boiler-ui): split explanation into freshness/degraded/meta sections"
```

---

### Task 6: Polish OigBoilerOverridePanel for secondary placement and translations

**Files:**
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/boiler/components.ts` (the `OigBoilerOverridePanel` class only)
- Modify: `custom_components/oig_cloud/www_v2/src/__tests__/boiler-v2-ui.test.ts`

Acceptance: keep existing `data-testid="override-ttl-input"` (default 120, min 15, max 1440, step 15), `override-reason-input` (required), `override-submit-btn` (disabled when identity OR capability unavailable). Add visible heading, subtitle, EN/CS translations. Show `boiler.override.identity_unavailable` when identity missing, `boiler.override.capability_unavailable` when capability missing, `boiler.override.active` chip when `currentOverride.active === true`.

- [ ] **Step 1: Write failing tests** (extend existing capability tests)

Append to `boiler-v2-ui.test.ts`:

```ts
describe('OigBoilerOverridePanel — polish', () => {
  it('renders translated heading + subtitle for cs', async () => {
    const el = document.createElement('oig-boiler-override-panel') as any;
    el.lang = 'cs';
    el.identity = { entryId: 'e', boxId: 'b', available: true };
    el.currentOverride = { active: false, ttlMinutes: 0, reason: '', capabilityAvailable: true };
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('Ruční přepis');
    expect(html).toContain('sekundární');
  });
  it('renders en strings for lang=en', async () => {
    const el = document.createElement('oig-boiler-override-panel') as any;
    el.lang = 'en';
    el.identity = { entryId: 'e', boxId: 'b', available: true };
    el.currentOverride = { active: false, ttlMinutes: 0, reason: '', capabilityAvailable: true };
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.innerHTML).toContain('Manual override');
  });
  it('shows active badge when currentOverride.active is true', async () => {
    const el = document.createElement('oig-boiler-override-panel') as any;
    el.lang = 'cs';
    el.identity = { entryId: 'e', boxId: 'b', available: true };
    el.currentOverride = { active: true, ttlMinutes: 60, reason: 'manual test', capabilityAvailable: true };
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.innerHTML).toContain('Přepis aktivní');
  });
});
```

- [ ] **Step 2: Run failing tests**

Run: `npx vitest run src/__tests__/boiler-v2-ui.test.ts -t "polish"`
Expected: FAIL.

- [ ] **Step 3: Replace component body**

```ts
@customElement('oig-boiler-override-panel')
export class OigBoilerOverridePanel extends LitElement {
  @property({ attribute: false }) identity: BoilerV2Identity = { entryId: null, boxId: null, available: false };
  @property({ attribute: false }) currentOverride: { active: boolean; ttlMinutes: number; reason: string; capabilityAvailable: boolean } | null = null;
  @property({ type: String }) lang: 'cs' | 'en' = 'cs';

  static styles = css`
    :host { display: block; }
    .wrap { padding: 16px; border-radius: 12px; background: var(--card-background-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.08); display: grid; gap: 10px; opacity: 0.95; }
    .heading { font-size: 1rem; font-weight: 600; }
    .subtitle { font-size: 0.85rem; color: var(--secondary-text-color, #666); }
    label { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; }
    input, textarea { font: inherit; padding: 6px 8px; border: 1px solid var(--divider-color, #ccc); border-radius: 6px; background: var(--secondary-background-color, #fafafa); color: var(--primary-text-color); }
    button { padding: 8px 14px; border-radius: 6px; border: 1px solid var(--divider-color, #ccc); background: var(--primary-color, #1976d2); color: #fff; font-weight: 600; cursor: pointer; }
    button[disabled] { opacity: 0.5; cursor: not-allowed; }
    .notice { padding: 6px 10px; border-radius: 6px; background: rgba(244,67,54,0.12); color: #b71c1c; font-size: 0.85rem; }
    .active-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: rgba(255,152,0,0.2); color: #b75d00; font-weight: 600; font-size: 0.85rem; width: max-content; }
  `;

  render() {
    const lang = this.lang;
    const identityOk = this.identity.available;
    const capabilityOk = this.currentOverride?.capabilityAvailable ?? false;
    const canSubmit = identityOk && capabilityOk;
    const active = this.currentOverride?.active === true;
    return html`
      <div data-testid="boiler-override-panel" class="wrap">
        <div class="heading">${t('boiler.override.heading', lang)}</div>
        <div class="subtitle">${t('boiler.override.subtitle', lang)}</div>
        ${active ? html`<span class="active-badge">${t('boiler.override.active', lang)}</span>` : ''}
        ${!identityOk ? html`<div class="notice">${t('boiler.override.identity_unavailable', lang)}</div>` : ''}
        ${identityOk && !capabilityOk ? html`<div class="notice">${t('boiler.override.capability_unavailable', lang)}</div>` : ''}
        <label>
          ${t('boiler.override.ttl_label', lang)}
          <input data-testid="override-ttl-input" type="number" min="15" max="1440" step="15" value="120" ?disabled=${!canSubmit} />
        </label>
        <label>
          ${t('boiler.override.reason_label', lang)}
          <textarea data-testid="override-reason-input" required ?disabled=${!canSubmit}></textarea>
        </label>
        <button data-testid="override-submit-btn" ?disabled=${!canSubmit}>${t('boiler.override.submit', lang)}</button>
      </div>
    `;
  }
}
```

- [ ] **Step 4: Run all boiler tests**

Run: `npx vitest run src/__tests__/boiler-v2-ui.test.ts`
Expected: all pass (existing + 3 new). Particularly the existing capability gating tests must still pass — every selector and disabled assertion is preserved.

- [ ] **Step 5: Commit**

```bash
git add custom_components/oig_cloud/www_v2/src/ui/features/boiler/components.ts custom_components/oig_cloud/www_v2/src/__tests__/boiler-v2-ui.test.ts
git commit -m "feat(boiler-ui): polish override panel with translations and active badge"
```

---

### Task 7: Rebuild OigBoilerUnavailableState with explicit reason variants

**Files:**
- Modify: `custom_components/oig_cloud/www_v2/src/ui/features/boiler/components.ts` (the `OigBoilerUnavailableState` class only)
- Modify: `custom_components/oig_cloud/www_v2/src/__tests__/boiler-v2-ui.test.ts`

Acceptance: rendering one of `loading | error | degraded | unavailable` shows the corresponding translated headline and (for error/degraded) the optional `message`. Selector `boiler-unavailable-state` stays. Old combined-shadow markup is replaced with one visible block per state (no toggling via `?hidden`).

- [ ] **Step 1: Write failing test**

```ts
describe('OigBoilerUnavailableState — explicit variants', () => {
  for (const [reason, label] of [
    ['loading', 'Načítání'],
    ['error', 'Chyba'],
    ['degraded', 'degradovaném'],
    ['unavailable', 'nejsou k dispozici'],
  ] as const) {
    it(`renders ${reason} variant in cs`, async () => {
      const el = document.createElement('oig-boiler-unavailable-state') as any;
      el.lang = 'cs';
      el.reason = reason;
      el.message = 'detail';
      document.body.appendChild(el);
      await el.updateComplete;
      const html = el.shadowRoot!.innerHTML;
      expect(html).toContain(label);
      expect(html).toContain('boiler-unavailable-state');
      if (reason === 'error' || reason === 'degraded') {
        expect(html).toContain('detail');
      }
    });
  }
});
```

- [ ] **Step 2: Run failing test**

Run: `npx vitest run src/__tests__/boiler-v2-ui.test.ts -t "explicit variants"`
Expected: FAIL (current component checks via `?hidden`, message rendered without explicit headline).

- [ ] **Step 3: Replace component**

```ts
@customElement('oig-boiler-unavailable-state')
export class OigBoilerUnavailableState extends LitElement {
  @property({ type: String }) reason: 'loading' | 'error' | 'degraded' | 'unavailable' = 'unavailable';
  @property({ type: String }) message: string = '';
  @property({ type: String }) lang: 'cs' | 'en' = 'cs';

  static styles = css`
    :host { display: block; }
    .wrap { padding: 24px; border-radius: 12px; background: var(--card-background-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center; display: flex; flex-direction: column; gap: 8px; align-items: center; }
    .icon { font-size: 1.6rem; }
    .headline { font-size: 1rem; font-weight: 600; }
    .message { color: var(--secondary-text-color, #666); font-size: 0.9rem; }
  `;

  render() {
    const lang = this.lang;
    const headlineKey = `boiler.unavailable.${this.reason}` as const;
    const headline = t(headlineKey, lang);
    const icon = this.reason === 'loading' ? '⏳' : this.reason === 'error' ? '⚠️' : this.reason === 'degraded' ? '🟠' : 'ℹ️';
    return html`
      <div data-testid="boiler-unavailable-state" class="wrap">
        <span class="icon">${icon}</span>
        <div class="headline">${headline}</div>
        ${this.message ? html`<div class="message">${this.message}</div>` : ''}
      </div>
    `;
  }
}
```

- [ ] **Step 4: Run tests to verify**

Run: `npx vitest run src/__tests__/boiler-v2-ui.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add custom_components/oig_cloud/www_v2/src/ui/features/boiler/components.ts custom_components/oig_cloud/www_v2/src/__tests__/boiler-v2-ui.test.ts
git commit -m "feat(boiler-ui): explicit variants for unavailable state with translations"
```

---

### Task 8: Wire `lang` into the boiler tab in `app.ts`

**Files:**
- Modify: `custom_components/oig_cloud/www_v2/src/ui/app.ts:941–982`
- Modify: `custom_components/oig_cloud/www_v2/src/__tests__/app-refresh.test.ts`

Acceptance: each of the 5 V2 boiler components receives `.lang=${this.boilerLang}`. `boilerLang` is computed from `this.hass` (use `resolveLang`).

- [ ] **Step 1: Write failing test**

Append to `app-refresh.test.ts`:

```ts
import { resolveLang } from '@/i18n/boiler';

describe('app boiler lang wiring', () => {
  it('resolves cs from hass.locale', () => {
    expect(resolveLang({ locale: { language: 'cs' } } as any)).toBe('cs');
  });
  it('renders status panel with lang attribute when hass language is en', async () => {
    // assume an existing helper renderApp(hass) — adapt to existing test harness
    const html = renderBoilerTabHtmlForHass({ language: 'en' });
    expect(html).toMatch(/lang="en"/);
  });
});
```

If `renderBoilerTabHtmlForHass` does not exist, model it after the most-similar existing helper in `app-refresh.test.ts` (the existing tests already render `oig-app` and inspect the shadow DOM for `boiler-setup-guide` etc.). Reuse the same helper instead of inventing a new one.

- [ ] **Step 2: Run failing test**

Run: `npx vitest run src/__tests__/app-refresh.test.ts -t "boiler lang wiring"`
Expected: FAIL.

- [ ] **Step 3: Update `app.ts`**

In `OigApp` add a getter:

```ts
import { resolveLang, type Lang } from '@/i18n/boiler';

private get boilerLang(): Lang {
  return resolveLang(this.hass);
}
```

In the boiler tab render block (lines 941–982 in current file), add `.lang=${this.boilerLang}` to every V2 boiler component:

```html
<oig-boiler-status-panel .lang=${this.boilerLang} .data=${this.boilerV2Data.status}></oig-boiler-status-panel>
<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="loading" message=""></oig-boiler-unavailable-state>
<oig-boiler-plan-timeline .lang=${this.boilerLang} .slots=${this.boilerV2Data?.planSlots ?? []}></oig-boiler-plan-timeline>
<oig-boiler-source-explanation .lang=${this.boilerLang} .explanation=${this.boilerV2Data?.explanation ?? null}></oig-boiler-source-explanation>
<oig-boiler-override-panel .lang=${this.boilerLang} .identity=${...} .currentOverride=${...}></oig-boiler-override-panel>
```

(Keep existing branches and conditions — only add `.lang`.)

- [ ] **Step 4: Run tests**

Run: `npx vitest run src/__tests__/app-refresh.test.ts src/__tests__/boiler-v2-ui.test.ts`
Expected: all pass.

- [ ] **Step 5: Commit**

```bash
git add custom_components/oig_cloud/www_v2/src/ui/app.ts custom_components/oig_cloud/www_v2/src/__tests__/app-refresh.test.ts
git commit -m "feat(boiler-ui): wire hass language into V2 boiler components"
```

---

### Task 9: Lint, typecheck, full test suite

**Files:**
- (none changed — verification only)

- [ ] **Step 1: Lint**

Run: `cd custom_components/oig_cloud/www_v2 && npm run lint`
Expected: 0 errors. Pre-existing `any`-type warnings are acceptable (already documented in notepad).

- [ ] **Step 2: Typecheck**

Run: `npm run typecheck`
Expected: 0 errors.

- [ ] **Step 3: Full unit test suite**

Run: `npm run test:unit`
Expected: all pass; explicitly verify the new boiler-i18n, boiler-format, boiler-v2-ui, app-refresh tests are green.

- [ ] **Step 4: Build**

Run: `npm run build`
Expected: build succeeds; bundle size reported. No new errors.

- [ ] **Step 5: Commit dist**

```bash
git add custom_components/oig_cloud/www_v2/dist
git commit -m "build(boiler-ui): rebuild V2 bundle with new boiler sections"
```

---

### Task 10: Browser smoke against real HA + screenshot

**Files:**
- Create: `custom_components/oig_cloud/www_v2/playwright/boiler-v2-smoke.mjs`

This task is verification only: run a Playwright Node script against the running HA box, switch to the Boiler tab, assert all required selectors are visible, and save a screenshot for the user to inspect.

- [ ] **Step 1: Write the smoke script**

```js
// custom_components/oig_cloud/www_v2/playwright/boiler-v2-smoke.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';

const HA = process.env.HA_HOST;
const TOKEN = process.env.HA_TOKEN;
const ENTRY = process.env.OIG_ENTRY_ID;
const BOX = process.env.OIG_BOX_ID;
if (!HA || !TOKEN || !ENTRY || !BOX) {
  console.error('Required env: HA_HOST, HA_TOKEN, OIG_ENTRY_ID, OIG_BOX_ID');
  process.exit(2);
}

const url = `http://${HA}:8123/oig_cloud_static_v2/index.html?v=smoke&t=${Date.now()}&sn=${BOX}&entry_id=${ENTRY}`;
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });

await ctx.addInitScript(({ token, host }) => {
  const hass = {
    auth: { data: { access_token: token } },
    callApi: async (m, p) => (await fetch(`http://${host}:8123/api/${p}`, { method: m, headers: { Authorization: `Bearer ${token}` } })).json(),
    callWS: async () => ({}),
    callService: async () => ({}),
    states: {},
    config: { language: 'cs' },
    language: 'cs',
    locale: { language: 'cs' },
    user: { is_admin: true, name: 'sis' },
  };
  window.hass = hass;
}, { token: TOKEN, host: HA });

const page = await ctx.newPage();
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(4000);
await page.evaluate(() => {
  const sr = document.querySelector('oig-app')?.shadowRoot;
  if (!sr) return;
  for (const b of sr.querySelectorAll('button, [role="tab"], .tab-button, .tab')) {
    if ((b.textContent || '').toLowerCase().includes('bojler')) { b.click(); return; }
  }
});
await page.waitForTimeout(3000);

const result = await page.evaluate(() => {
  const sr = document.querySelector('oig-app')?.shadowRoot;
  if (!sr) return { ok: false, reason: 'no shadow' };
  const find = (sel) => {
    if (sr.querySelector(sel)) return true;
    for (const el of sr.querySelectorAll('*')) {
      const inner = (el as any).shadowRoot;
      if (inner && inner.querySelector(sel)) return true;
    }
    return false;
  };
  return {
    ok: true,
    selectors: {
      status: find('[data-testid="boiler-status-panel"]'),
      timeline: find('[data-testid="boiler-plan-timeline"]'),
      explanation: find('[data-testid="boiler-source-explanation"]'),
      override: find('[data-testid="boiler-override-panel"]'),
      setupGuide: find('[data-testid="boiler-setup-guide"]'),
      currentState: find('[data-testid="boiler-status-current-state"]'),
      selectedSource: find('[data-testid="boiler-status-selected-source"]'),
      actuatedSource: find('[data-testid="boiler-status-actuated-source"]'),
      comfort: find('[data-testid="boiler-status-comfort"]'),
      freshness: find('[data-testid="boiler-explanation-freshness"]'),
      degraded: find('[data-testid="boiler-explanation-degraded"]'),
    },
  };
});
console.log('Smoke result:', JSON.stringify(result, null, 2));
await page.screenshot({ path: '/tmp/boiler-v2-smoke.png', fullPage: true });
fs.writeFileSync('/tmp/boiler-v2-smoke.log', logs.join('\n'));
await browser.close();

// Fail with non-zero if required selectors missing
const requiredCore = ['status','timeline','explanation','override'];
const missing = requiredCore.filter(k => !(result as any).selectors?.[k]);
if (missing.length) { console.error('Missing selectors:', missing.join(', ')); process.exit(1); }
console.log('Smoke OK. Screenshot: /tmp/boiler-v2-smoke.png');
```

- [ ] **Step 2: Run the smoke script (after deploy)**

Defer running until after Task 11 deploy completes. Then:

```bash
source /repos/oig-cloud/.ha_config
export OIG_ENTRY_ID=aab05107e596a3ee794f37a9be7294ac
export OIG_BOX_ID=2206237016
cd /repos/oig-cloud/custom_components/oig_cloud/www_v2 && node playwright/boiler-v2-smoke.mjs
```

Expected: stdout shows all selectors true; screenshot saved to `/tmp/boiler-v2-smoke.png`.

- [ ] **Step 3: Commit the smoke script (path is tracked, env vars are not)**

```bash
git add custom_components/oig_cloud/www_v2/playwright/boiler-v2-smoke.mjs
git commit -m "test(boiler-ui): add playwright smoke for V2 boiler section selectors"
```

---

### Task 11: Deploy and verify on HA

**Files:** none changed.

- [ ] **Step 1: Deploy via existing script**

```bash
cd /repos/oig-cloud && ./deploy_to_ha.sh --ssh
```

Expected: build, gzip regen, copy to `/config/custom_components/oig_cloud`, HA restart, no errors.

- [ ] **Step 2: Verify deployed bundle hash matches local**

```bash
sha256sum custom_components/oig_cloud/www_v2/dist/assets/index.js
ssh ha "sha256sum /config/custom_components/oig_cloud/www_v2/dist/assets/index.js"
```

Expected: identical.

- [ ] **Step 3: Run Playwright smoke (Task 10 step 2)**

Expected: all required selectors present, screenshot generated.

- [ ] **Step 4: Check HA logs for boiler errors**

```bash
ssh ha "docker logs homeassistant --since 5m" | grep -iE 'boiler|deadline_time|Traceback' | head -40
```

Expected: no `deadline_time must be a string`, no boiler-related Traceback.

- [ ] **Step 5: Ask the user to hard-reload the V2 panel and confirm visually**

Send the user the screenshot path `/tmp/boiler-v2-smoke.png` and ask them to do **Ctrl+Shift+R** in the V2 panel and confirm the new sections are visible.

---

### Task 12: Final commit + notepad update

**Files:**
- Modify: `.sisyphus/notepads/boiler-module-redesign/issues.md` — append a "Task 11 V2 UI rework — 2026-04-26" entry summarising what was done.
- Modify: `.sisyphus/notepads/boiler-module-redesign/learnings.md` — capture lessons (chudá UI vs. plan acceptance criteria; lightweight i18n strategy; per-component lang property pattern).

- [ ] **Step 1: Append to notepad**

Document: which 5 components were rebuilt, new files (`i18n/boiler.ts`, `format.ts`, `playwright/boiler-v2-smoke.mjs`), DTO fields newly surfaced (expectedTempTopC, comfortSatisfied, estimatedCostCzk, pvShare in `BoilerV2PlanSlot`), translation strategy (lightweight cs/en map keyed by hass.locale.language), tests added (boiler-i18n, boiler-format, +N in boiler-v2-ui, +1 in app-refresh).

- [ ] **Step 2: Commit notepad updates**

```bash
git add .sisyphus/notepads/boiler-module-redesign/issues.md .sisyphus/notepads/boiler-module-redesign/learnings.md
git commit -m "docs(notepad): record boiler V2 UI rework outcomes and learnings"
```

---

## Self-Review Checklist (already applied)

1. **Spec coverage**: every Task 11 acceptance bullet from `boiler-module-redesign.md:1262-1271` maps to a task above:
   - status fields → Task 3
   - timeline per-slot detail → Task 4
   - explanation freshness/degraded/gap → Task 5
   - override secondary + TTL/reason + capability gating → Task 6 (preserves existing capability tests)
   - selectors `boiler-status-panel`, `boiler-plan-timeline`, `boiler-source-explanation`, `boiler-override-panel`, `boiler-unavailable-state` → all preserved in Tasks 3,4,5,6,7
   - missing-data states → Task 7 + every component falls back to `formatXxx(null) === '—'` and translated empty messages
   - EN/CS translation parity → Task 1
2. **Placeholder scan**: no TBD / TODO / "implement appropriate ..." remain. All code blocks are concrete.
3. **Type consistency**: `Lang`, `BoilerV2Status`, `BoilerV2PlanSlot`, `BoilerV2Explanation`, `BoilerV2Identity` used consistently. New optional fields on `BoilerV2PlanSlot` are introduced once (Task 4) and used by Task 4 only.

---

## Notes for the executing agent

- **Do not** remove the legacy `OigBoilerDebugPanel`, `OigBoilerStatusGrid`, `OigBoilerEnergyBreakdown`, `OigBoilerPredictedUsage`, `OigBoilerPlanInfo`, `OigBoilerTank`, `OigBoilerCategorySelect`, `OigBoilerHeatmapGrid`, `OigBoilerStatsCards`, `OigBoilerProfiling`, `OigBoilerConfigSection`, `OigBoilerState`, `OigBoilerHeatmap`, `OigBoilerProfiles` classes from `components.ts`. They are dead code that some tests still import; deleting them is out of scope for this rework. Leave them untouched.
- **Do not** touch `OigBoilerDebugPanel` either. It is no longer rendered (F4-Blocker-2 fix), and removing it would break legacy tests.
- Translation keys MUST stay in sync between `cs` and `en` halves of the map; Task 1 test verifies one key in both languages — if you add another key during implementation, add it to both halves.
- Existing capability-gating tests in `boiler-v2-ui.test.ts` (added in Task 11 capability gating fix per notepad) MUST keep passing. The override panel rewrite in Task 6 must preserve every existing `data-testid` and disabled-state behavior.
- The deploy step uses `deploy_to_ha.sh` which is `.gitignore`d (local-only). Do not try to commit it.
