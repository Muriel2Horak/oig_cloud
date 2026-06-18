// ============================================================================
// F2 Demand Map — unit tests
// Covers: mapping (full DTO, missing demand_map, zero-history),
//         component render (chips text, empty state, meta line, confidence)
// ============================================================================

import { describe, it, expect } from 'vitest';
import { mapCanonicalToV2 } from '@/data/boiler-data';
import { OigBoilerDemandMap } from '@/ui/features/boiler/components';
import { t } from '@/i18n/boiler';

// ── Helpers ──────────────────────────────────────────────────────────────────

function getTemplateStrings(el: { render(): unknown }): string {
  const result = Reflect.apply(
    Reflect.get(Object.getPrototypeOf(el), 'render'),
    el,
    [],
  ) as { strings?: ArrayLike<string> } | null;
  if (!result) return '';
  const strings = result.strings;
  if (!strings) return '';
  return Array.from(strings).join('');
}

function getTemplateValues(el: { render(): unknown }): unknown[] {
  const result = Reflect.apply(
    Reflect.get(Object.getPrototypeOf(el), 'render'),
    el,
    [],
  ) as { values?: unknown[] } | null;
  return result?.values ?? [];
}

function joinTemplate(el: { render(): unknown }): string {
  return getTemplateStrings(el) + JSON.stringify(getTemplateValues(el));
}

// ── Canonical fixtures ────────────────────────────────────────────────────────

const MINIMAL_CANONICAL = {
  entry_id: 'entry1',
  box_id: 'box1',
  current_state: {
    temperatures: { top: 55, bottom: 40 },
    energy_state: {},
    energy_tracking: { current_source: 'fve' },
    heating: false,
    recommended_source: null,
    last_update: '2026-06-01T08:00:00Z',
  },
  comfort_status: {
    comfort_satisfied: true,
    comfort_status_code: null,
    temperature_at_deadline_c: null,
    unsatisfied_comfort_gap_c: null,
  },
  selected_source: null,
  actuated_source: null,
  plan_slots: [],
  reason_codes: [],
  freshness: { last_update: '2026-06-01T08:00:00Z', data_age_seconds: 30 },
  degraded_flags: { degraded: false, flags: [], serializer_state: null },
  manual_override: { active: false, state: null },
};

const DEMAND_MAP_RAW = {
  slot_duration_min: 15,
  slots_p50: Array(96).fill(0).map((_, i) => (i === 28 ? 0.6 : 0)),
  slots_p80: Array(96).fill(0).map((_, i) => (i === 28 ? 1.088 : i === 84 ? 0.558 : 0)),
  windows: [
    { slot_index: 28, start_minute: 420, p80_kwh: 1.451, liters: 25.0, label: 'morning' },
    { slot_index: 84, start_minute: 1260, p80_kwh: 0.558, liters: 9.6, label: 'evening' },
  ],
  profile: {
    category: 'workday_summer',
    level: 'exact',
    days_used: 8,
    label: 'workday (summer), 8 days',
    fallback_used: false,
  },
  confidence: 0.8,
};

const CANONICAL_WITH_DEMAND_MAP = {
  ...MINIMAL_CANONICAL,
  demand_map: DEMAND_MAP_RAW,
};

const CANONICAL_NO_DEMAND_MAP = {
  ...MINIMAL_CANONICAL,
  // demand_map absent
};

const CANONICAL_NULL_DEMAND_MAP = {
  ...MINIMAL_CANONICAL,
  demand_map: null,
};

const CANONICAL_ZERO_HISTORY = {
  ...MINIMAL_CANONICAL,
  demand_map: {
    ...DEMAND_MAP_RAW,
    slots_p50: Array(96).fill(0),
    slots_p80: Array(96).fill(0),
    windows: [],
    profile: {
      category: 'workday_spring',
      level: 'bootstrap',
      days_used: 0,
      label: 'workday (spring), 0 days',
      fallback_used: true,
    },
    confidence: 0.1,
  },
};

// ── mapCanonicalToV2 — demand_map mapping ────────────────────────────────────

describe('mapCanonicalToV2 — demand_map field', () => {
  it('maps demandMap.slotDurationMin from canonical slot_duration_min', () => {
    const v2 = mapCanonicalToV2(CANONICAL_WITH_DEMAND_MAP as any);
    expect(v2.demandMap).not.toBeNull();
    expect(v2.demandMap!.slotDurationMin).toBe(15);
  });

  it('maps demandMap.slotsP80 length (96)', () => {
    const v2 = mapCanonicalToV2(CANONICAL_WITH_DEMAND_MAP as any);
    expect(v2.demandMap!.slotsP80).toHaveLength(96);
  });

  it('maps demandMap.slotsP80 values correctly', () => {
    const v2 = mapCanonicalToV2(CANONICAL_WITH_DEMAND_MAP as any);
    expect(v2.demandMap!.slotsP80[28]).toBeCloseTo(1.088);
    expect(v2.demandMap!.slotsP80[84]).toBeCloseTo(0.558);
    expect(v2.demandMap!.slotsP80[0]).toBe(0);
  });

  it('maps demandMap.slotsP50 values correctly', () => {
    const v2 = mapCanonicalToV2(CANONICAL_WITH_DEMAND_MAP as any);
    expect(v2.demandMap!.slotsP50[28]).toBeCloseTo(0.6);
    expect(v2.demandMap!.slotsP50[0]).toBe(0);
  });

  it('maps demandMap.windows length', () => {
    const v2 = mapCanonicalToV2(CANONICAL_WITH_DEMAND_MAP as any);
    expect(v2.demandMap!.windows).toHaveLength(2);
  });

  it('maps demandMap.windows[0] fields correctly (camelCase)', () => {
    const v2 = mapCanonicalToV2(CANONICAL_WITH_DEMAND_MAP as any);
    const w = v2.demandMap!.windows[0];
    expect(w.slotIndex).toBe(28);
    expect(w.startMinute).toBe(420);
    expect(w.p80Kwh).toBeCloseTo(1.451);
    expect(w.liters).toBeCloseTo(25.0);
    expect(w.label).toBe('morning');
  });

  it('maps demandMap.profile category and level', () => {
    const v2 = mapCanonicalToV2(CANONICAL_WITH_DEMAND_MAP as any);
    expect(v2.demandMap!.profile.category).toBe('workday_summer');
    expect(v2.demandMap!.profile.level).toBe('exact');
  });

  it('maps demandMap.profile daysUsed from days_used', () => {
    const v2 = mapCanonicalToV2(CANONICAL_WITH_DEMAND_MAP as any);
    expect(v2.demandMap!.profile.daysUsed).toBe(8);
  });

  it('maps demandMap.profile fallbackUsed=false', () => {
    const v2 = mapCanonicalToV2(CANONICAL_WITH_DEMAND_MAP as any);
    expect(v2.demandMap!.profile.fallbackUsed).toBe(false);
  });

  it('maps demandMap.confidence', () => {
    const v2 = mapCanonicalToV2(CANONICAL_WITH_DEMAND_MAP as any);
    expect(v2.demandMap!.confidence).toBeCloseTo(0.8);
  });

  it('returns demandMap=null when demand_map is absent', () => {
    const v2 = mapCanonicalToV2(CANONICAL_NO_DEMAND_MAP as any);
    expect(v2.demandMap).toBeNull();
  });

  it('returns demandMap=null when demand_map is explicitly null', () => {
    const v2 = mapCanonicalToV2(CANONICAL_NULL_DEMAND_MAP as any);
    expect(v2.demandMap).toBeNull();
  });

  it('returns demandMap=null when canonical is null', () => {
    const v2 = mapCanonicalToV2(null);
    expect(v2.demandMap).toBeNull();
  });

  it('maps zero-history: windows empty, fallbackUsed=true, confidence=0.1', () => {
    const v2 = mapCanonicalToV2(CANONICAL_ZERO_HISTORY as any);
    expect(v2.demandMap).not.toBeNull();
    expect(v2.demandMap!.windows).toHaveLength(0);
    expect(v2.demandMap!.profile.fallbackUsed).toBe(true);
    expect(v2.demandMap!.confidence).toBeCloseTo(0.1);
    expect(v2.demandMap!.profile.daysUsed).toBe(0);
  });

  it('maps zero-history slotsP80 are all zero', () => {
    const v2 = mapCanonicalToV2(CANONICAL_ZERO_HISTORY as any);
    const sum = v2.demandMap!.slotsP80.reduce((a, b) => a + b, 0);
    expect(sum).toBe(0);
  });
});

// ── OigBoilerDemandMap component — null state ────────────────────────────────

describe('OigBoilerDemandMap — null data (empty state)', () => {
  it('renders data-testid="boiler-demand-map"', () => {
    const el = new OigBoilerDemandMap();
    el.data = null;
    const str = getTemplateStrings(el as any);
    expect(str).toContain('data-testid="boiler-demand-map"');
  });

  it('renders cs empty state text when data is null', () => {
    const el = new OigBoilerDemandMap();
    el.data = null;
    el.lang = 'cs';
    const all = joinTemplate(el as any);
    expect(all).toMatch(/Sbírám data|mapa se objeví|pár dní|pár dnech/i);
  });

  it('renders en empty state text when data is null and lang=en', () => {
    const el = new OigBoilerDemandMap();
    el.data = null;
    el.lang = 'en';
    const all = joinTemplate(el as any);
    expect(all).toMatch(/Collecting usage|map will appear|few days/i);
  });

  it('does NOT render chips section when data is null', () => {
    const el = new OigBoilerDemandMap();
    el.data = null;
    const str = getTemplateStrings(el as any);
    expect(str).not.toContain('class="chip"');
    expect(str).not.toContain('class="chips"');
  });
});

// ── OigBoilerDemandMap component — full data ─────────────────────────────────

describe('OigBoilerDemandMap — full demand_map data', () => {
  function makeDemandMap() {
    const v2 = mapCanonicalToV2(CANONICAL_WITH_DEMAND_MAP as any);
    return v2.demandMap!;
  }

  it('renders heading in cs', () => {
    const el = new OigBoilerDemandMap();
    el.data = makeDemandMap();
    el.lang = 'cs';
    const all = joinTemplate(el as any);
    expect(all).toMatch(/Mapa odběrů/i);
  });

  it('renders heading in en', () => {
    const el = new OigBoilerDemandMap();
    el.data = makeDemandMap();
    el.lang = 'en';
    const all = joinTemplate(el as any);
    expect(all).toMatch(/Demand Map/i);
  });

  it('renders chips section when windows present', () => {
    const el = new OigBoilerDemandMap();
    el.data = makeDemandMap();
    // chips is rendered in the values (conditional template), so check joinTemplate
    const all = joinTemplate(el as any);
    expect(all).toContain('chips');
  });

  it('renders morning chip time "07:00" for slotIndex=28, slotDuration=15', () => {
    // slot 28 * 15 min = 420 min = 7 h = 07:00
    const el = new OigBoilerDemandMap();
    el.data = makeDemandMap();
    el.lang = 'cs';
    const all = joinTemplate(el as any);
    expect(all).toContain('07:00');
  });

  it('renders evening chip time "21:00" for slotIndex=84, slotDuration=15', () => {
    // slot 84 * 15 min = 1260 min = 21 h = 21:00
    const el = new OigBoilerDemandMap();
    el.data = makeDemandMap();
    el.lang = 'cs';
    const all = joinTemplate(el as any);
    expect(all).toContain('21:00');
  });

  it('renders morning emoji 🌅 for morning window', () => {
    const el = new OigBoilerDemandMap();
    el.data = makeDemandMap();
    const all = joinTemplate(el as any);
    expect(all).toContain('🌅');
  });

  it('renders evening emoji 🌆 for evening window', () => {
    const el = new OigBoilerDemandMap();
    el.data = makeDemandMap();
    const all = joinTemplate(el as any);
    expect(all).toContain('🌆');
  });

  it('renders liters rounded for morning chip (25 L)', () => {
    const el = new OigBoilerDemandMap();
    el.data = makeDemandMap();
    const all = joinTemplate(el as any);
    expect(all).toContain('25');
  });

  it('renders kWh formatted for morning chip (1.5 kWh)', () => {
    const el = new OigBoilerDemandMap();
    el.data = makeDemandMap();
    const all = joinTemplate(el as any);
    // p80Kwh=1.451 formatted with toFixed(1) = "1.5" and " kWh" comes from template strings
    expect(all).toContain('"1.5"');
    expect(all).toContain('kWh');
  });

  it('renders meta line with days_used=8', () => {
    const el = new OigBoilerDemandMap();
    el.data = makeDemandMap();
    el.lang = 'cs';
    const all = joinTemplate(el as any);
    expect(all).toContain('8');
  });

  it('renders confidence badge with percentage', () => {
    const el = new OigBoilerDemandMap();
    el.data = makeDemandMap();
    el.lang = 'cs';
    const all = joinTemplate(el as any);
    expect(all).toContain('80');
    // Should contain "Spolehlivost" or similar
    expect(all).toMatch(/Spolehlivost|Confidence/i);
  });

  it('does NOT render fallback notice when fallbackUsed=false', () => {
    const el = new OigBoilerDemandMap();
    el.data = makeDemandMap();
    el.lang = 'cs';
    const all = joinTemplate(el as any);
    expect(all).not.toMatch(/Přibližný profil|Approximate profile/i);
  });

  it('renders "řídí plán" badge when drivesPlan=true (confidence 0.8 exact)', () => {
    const el = new OigBoilerDemandMap();
    el.data = makeDemandMap();
    el.lang = 'cs';
    expect(el.data!.drivesPlan).toBe(true);
    const all = joinTemplate(el as any);
    expect(all).toMatch(/řídí plán/i);
    expect(all).not.toMatch(/učí se/i);
  });

  it('renders heatmap columns (48-col pattern in template strings)', () => {
    const el = new OigBoilerDemandMap();
    el.data = makeDemandMap();
    const str = getTemplateStrings(el as any);
    expect(str).toContain('heatmap');
  });

  it('renders hour-axis with "00" label', () => {
    const el = new OigBoilerDemandMap();
    el.data = makeDemandMap();
    const all = joinTemplate(el as any);
    expect(all).toContain('00');
  });
});

// ── OigBoilerDemandMap component — fallback / low-data state ─────────────────

describe('OigBoilerDemandMap — zero-history (fallback) state', () => {
  function makeZeroData() {
    const v2 = mapCanonicalToV2(CANONICAL_ZERO_HISTORY as any);
    return v2.demandMap!;
  }

  it('renders heading even for zero-history data', () => {
    const el = new OigBoilerDemandMap();
    el.data = makeZeroData();
    el.lang = 'cs';
    const all = joinTemplate(el as any);
    expect(all).toMatch(/Mapa odběrů/i);
  });

  it('renders fallback-notice when fallbackUsed=true', () => {
    const el = new OigBoilerDemandMap();
    el.data = makeZeroData();
    el.lang = 'cs';
    const all = joinTemplate(el as any);
    expect(all).toMatch(/Přibližný profil|Approximate profile|fallback-notice/i);
  });

  it('does NOT render chips when windows=[]', () => {
    const el = new OigBoilerDemandMap();
    el.data = makeZeroData();
    // getTemplateValues will map over empty windows array — no chip values
    const vals = getTemplateValues(el as any);
    const json = JSON.stringify(vals);
    // chips div should not contain any chip items
    expect(json).not.toContain('🌅');
    expect(json).not.toContain('🌆');
  });

  it('renders low confidence badge (confidence=0.1 → 10%)', () => {
    const el = new OigBoilerDemandMap();
    el.data = makeZeroData();
    el.lang = 'cs';
    const all = joinTemplate(el as any);
    expect(all).toContain('10');
  });

  it('renders "učí se" badge when drivesPlan=false (low confidence / bootstrap)', () => {
    const el = new OigBoilerDemandMap();
    el.data = makeZeroData();
    el.lang = 'cs';
    expect(el.data!.drivesPlan).toBe(false);
    const all = joinTemplate(el as any);
    expect(all).toMatch(/učí se/i);
    expect(all).not.toMatch(/řídí plán/i);
  });
});

// ── i18n demand_map keys ──────────────────────────────────────────────────────

describe('i18n — demand_map keys cs+en', () => {
  it('cs has boiler.demand_map.heading = "Mapa odběrů"', () => {
    expect(t('boiler.demand_map.heading', 'cs')).toBe('Mapa odběrů');
  });

  it('en has boiler.demand_map.heading = "Demand Map"', () => {
    expect(t('boiler.demand_map.heading', 'en')).toBe('Demand Map');
  });

  it('cs has boiler.demand_map.empty (collecting message)', () => {
    const str = t('boiler.demand_map.empty', 'cs');
    expect(str).toMatch(/Sbírám|mapa|pár/i);
  });

  it('en has boiler.demand_map.empty (collecting message)', () => {
    const str = t('boiler.demand_map.empty', 'en');
    expect(str).toMatch(/Collecting|map|days/i);
  });

  it('cs has boiler.demand_map.confidence = "Spolehlivost"', () => {
    expect(t('boiler.demand_map.confidence', 'cs')).toBe('Spolehlivost');
  });

  it('en has boiler.demand_map.confidence = "Confidence"', () => {
    expect(t('boiler.demand_map.confidence', 'en')).toBe('Confidence');
  });

  it('cs has boiler.demand_map.fallback_notice', () => {
    const str = t('boiler.demand_map.fallback_notice', 'cs');
    expect(str).toMatch(/Přibližný|málo dat/i);
  });

  it('en has boiler.demand_map.fallback_notice', () => {
    const str = t('boiler.demand_map.fallback_notice', 'en');
    expect(str).toMatch(/Approximate|low data/i);
  });

  it('cs has boiler.demand_map.meta with placeholders', () => {
    const str = t('boiler.demand_map.meta', 'cs');
    expect(str).toContain('{n}');
    expect(str).toContain('{cat}');
  });

  it('en has boiler.demand_map.meta with placeholders', () => {
    const str = t('boiler.demand_map.meta', 'en');
    expect(str).toContain('{n}');
    expect(str).toContain('{cat}');
  });

  it('cs has window labels (morning, evening)', () => {
    expect(t('boiler.demand_map.window.morning', 'cs')).toBeTruthy();
    expect(t('boiler.demand_map.window.evening', 'cs')).toBeTruthy();
  });

  it('en has window labels (morning, evening)', () => {
    expect(t('boiler.demand_map.window.morning', 'en')).toBe('Morning');
    expect(t('boiler.demand_map.window.evening', 'en')).toBe('Evening');
  });
});

// ── OigBoilerDemandMap — DOM integration test ────────────────────────────────

describe('OigBoilerDemandMap — DOM render integration', () => {
  it('mounts as custom element and renders heading', async () => {
    const v2 = mapCanonicalToV2(CANONICAL_WITH_DEMAND_MAP as any);
    const el = document.createElement('oig-boiler-demand-map') as any;
    el.lang = 'cs';
    el.data = v2.demandMap;
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('Mapa odběrů');
    expect(html).toContain('07:00');
    expect(html).toContain('21:00');
  });

  it('mounts with null data and shows empty state', async () => {
    const el = document.createElement('oig-boiler-demand-map') as any;
    el.lang = 'cs';
    el.data = null;
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toMatch(/Sbírám data|mapa/i);
  });

  it('shows fallback notice in DOM when fallbackUsed=true', async () => {
    const v2 = mapCanonicalToV2(CANONICAL_ZERO_HISTORY as any);
    const el = document.createElement('oig-boiler-demand-map') as any;
    el.lang = 'cs';
    el.data = v2.demandMap;
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toMatch(/Přibližný profil/i);
  });

  it('shows confidence badge in DOM', async () => {
    const v2 = mapCanonicalToV2(CANONICAL_WITH_DEMAND_MAP as any);
    const el = document.createElement('oig-boiler-demand-map') as any;
    el.lang = 'cs';
    el.data = v2.demandMap;
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('Spolehlivost');
    expect(html).toContain('80');
  });
});
