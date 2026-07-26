// src/__tests__/registry-data.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/data/ha-client', () => ({ haClient: { fetchOIGAPI: vi.fn() } }));
import { haClient } from '@/data/ha-client';
import { loadFieldRegistry, fieldsFromRegistry, isVisible } from '@/data/registry-data';
import type { FieldRegistry, RegistrySpec } from '@/data/registry-data';
import { fieldLabel, fieldHint } from '@/i18n/fields';

const mockFetch = haClient.fetchOIGAPI as ReturnType<typeof vi.fn>;

const REGISTRY = {
  fields: {
    solar_forecast_provider: {
      section: 'solar', type: 'str', scope: 'premium',
      label: 'field.solar_forecast_provider.label', hint: 'field.solar_forecast_provider.hint',
      default: 'forecast_solar', enum: ['forecast_solar', 'solcast'],
    },
    solcast_api_key: {
      section: 'solar', type: 'str', scope: 'premium', secret: true,
      label: 'field.solcast_api_key.label', hint: 'field.solcast_api_key.hint',
      show_if: { field: 'solar_forecast_provider', in: ['solcast'] },
    },
    solar_forecast_api_key: {
      section: 'solar', type: 'str', scope: 'premium', secret: true, optional: true,
      label: 'field.solar_forecast_api_key.label', hint: 'field.solar_forecast_api_key.hint',
      show_if: { field: 'solar_forecast_provider', in: ['forecast_solar'] },
    },
    expensive_percentile: {
      section: 'battery', type: 'float', scope: 'premium', default: 0.7,
      min: 0.5, max: 0.95, scale: 100,
      label: 'field.expensive_percentile.label', hint: 'field.expensive_percentile.hint',
    },
  },
  sections: ['battery', 'solar'],
};

const REGISTRY_WITH_SOLAR_FORECAST_MODE = {
  fields: {
    ...REGISTRY.fields,
    solar_forecast_mode: {
      section: 'solar', type: 'str', scope: 'premium',
      label: 'field.solar_forecast_mode.label', hint: 'field.solar_forecast_mode.hint',
      default: 'daily_optimized', enum: ['hourly', 'every_4h', 'daily_optimized'],
    },
  },
  sections: ['battery', 'solar'],
};

beforeEach(() => mockFetch.mockReset());

describe('loadFieldRegistry', () => {
  it('returns null (never throws) when the endpoint errors', async () => {
    mockFetch.mockResolvedValue({ error: 'Box not found' });
    expect(await loadFieldRegistry()).toBeNull();
  });

  it('parses fields + sections', async () => {
    mockFetch.mockResolvedValue(REGISTRY);
    const reg = await loadFieldRegistry();
    expect(reg!.fields.solcast_api_key.secret).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/config_registry'),
      expect.objectContaining({ signal: undefined }),
    );
  });
});

describe('fieldsFromRegistry', () => {
  it('builds typed FieldDefs for one section, carrying showIf/scale/secret', () => {
    const defs = fieldsFromRegistry(REGISTRY as any, 'solar');
    const provider = defs.find((d) => d.key === 'solar_forecast_provider')!;
    expect(provider.type).toBe('select');
    expect(provider.options).toEqual([
      ['forecast_solar', 'Forecast.Solar (zdarma, bez registrace)'],
      ['solcast', 'Solcast (přesnější, vyžaduje registraci)'],
    ]);
    const solcastKey = defs.find((d) => d.key === 'solcast_api_key')!;
    expect(solcastKey.showIf).toEqual({ field: 'solar_forecast_provider', in: ['solcast'] });
    expect(solcastKey.secret).toBe(true);
    expect(defs.every((d) => d.key !== 'expensive_percentile')).toBe(true); // section filter
  });

  it('maps registry numeric types + scale onto the number widget', () => {
    const [pct] = fieldsFromRegistry(REGISTRY as any, 'battery');
    expect(pct.type).toBe('number');
    expect(pct.scale).toBe(100);
    expect(pct.min).toBe(0.5);
  });

  it('resolves i18n keys to Czech copy — never renders a raw key', () => {
    const defs = fieldsFromRegistry(REGISTRY as any, 'solar');
    for (const d of defs) {
      expect(d.label).not.toMatch(/^field\./);
      expect(d.label.length).toBeGreaterThan(0);
    }
  });

  it('renders humanized CZ labels for solar_forecast_mode enum values, never the raw enum string', () => {
    const fields = fieldsFromRegistry(REGISTRY_WITH_SOLAR_FORECAST_MODE as any, 'solar');
    const modeField = fields.find((f) => f.key === 'solar_forecast_mode')!;
    expect(modeField.options).toEqual([
      ['hourly', 'Každou hodinu (vyžaduje API klíč)'],
      ['every_4h', 'Každé 4 hodiny (vyžaduje API klíč)'],
      ['daily_optimized', 'Denně, optimalizovaně (výchozí)'],
    ]);
  });
});

describe('isVisible', () => {
  const defs = fieldsFromRegistry(REGISTRY as any, 'solar');
  const solcastKey = defs.find((d) => d.key === 'solcast_api_key')!;
  const fsKey = defs.find((d) => d.key === 'solar_forecast_api_key')!;

  it('hides a field whose showIf predicate is unsatisfied', () => {
    const get = (k: string) => (k === 'solar_forecast_provider' ? 'forecast_solar' : undefined);
    expect(isVisible(solcastKey, get)).toBe(false);
    expect(isVisible(fsKey, get)).toBe(true);
  });

  it('reveals the matching provider key on switch', () => {
    const get = (k: string) => (k === 'solar_forecast_provider' ? 'solcast' : undefined);
    expect(isVisible(solcastKey, get)).toBe(true);
    expect(isVisible(fsKey, get)).toBe(false);
  });

  it('treats a field with no showIf as always visible', () => {
    const provider = defs.find((d) => d.key === 'solar_forecast_provider')!;
    expect(isVisible(provider, () => undefined)).toBe(true);
  });
});

// Direct catalog check — references fieldLabel/fieldHint imports (PLAN3 verbatim
// imports them without using them; this also documents the seeded Czech copy).
describe('fieldLabel / fieldHint catalog', () => {
  it('resolves an entered Czech label and a hint', () => {
    expect(fieldLabel('solcast_api_key', 'field.solcast_api_key.label')).toBe('Solcast API klíč');
    expect(fieldHint('solcast_api_key', 'field.solcast_api_key.hint')).toBe('Nech prázdné = beze změny');
  });

  it('falls back to a humanised key when the i18n key is unknown', () => {
    expect(fieldLabel('solar_forecast_api_key', 'field.solar_forecast_api_key.label')).toBe('forecast.solar API klíč');
    expect(fieldLabel('unknown_thing', 'field.unknown_thing.label')).toBe('unknown thing');
    expect(fieldHint('unknown_thing', 'field.unknown_thing.hint')).toBeUndefined();
  });
});

// Task 23 — CS_LABELS completeness parity guard. FE mirror of the backend's
// own regression net at tests/test_config_registry.py::test_registry_covers_legacy_whitelist:
// every field key the CANONICAL registry (config_registry.py FIELD_REGISTRY) defines
// must resolve to real Czech copy, never fieldLabel()'s humanised-fallback path —
// that fallback is exactly the RCA-R1 defect class (raw `field.<key>.label` /
// "key with spaces" reaching the screen). Keep this key list in sync with
// config_registry.py when the backend registry gains a field.
//
// Registry section names below match config_registry.py's `Field(key, section, ...)`
// calls verbatim. Note: the backend section is `pricing` — the wizard step id
// `pricing_distribution` (step-pricing-distribution.ts) reads it via
// `fieldsFromRegistry(reg, 'pricing')`, not a section literally named that.
const ALL_REGISTRY_KEYS: Record<string, string[]> = {
  modules: [
    'enable_solar_forecast', 'enable_battery_prediction', 'enable_pricing', 'enable_boiler',
    'enable_statistics', 'enable_extended_sensors', 'enable_chmu_warnings',
  ],
  battery: [
    'auto_mode_switch_enabled', 'charge_rate_kw', 'expensive_percentile',
    'battery_comfort_soc_percent', 'balancing_enabled', 'balancing_interval_days',
    'balancing_hold_hours', 'balancing_opportunistic_threshold', 'balancing_economic_threshold',
    'cheap_window_percentile',
  ],
  solar: [
    'solar_forecast_provider', 'solar_forecast_mode', 'solar_forecast_api_key',
    'solcast_api_key', 'solcast_site_id', 'solar_forecast_latitude', 'solar_forecast_longitude',
    'solar_forecast_string1_enabled', 'solar_forecast_string1_kwp',
    'solar_forecast_string1_declination', 'solar_forecast_string1_azimuth',
    'solar_forecast_string2_enabled', 'solar_forecast_string2_kwp',
    'solar_forecast_string2_declination', 'solar_forecast_string2_azimuth',
  ],
  boiler: [
    'boiler_volume_l', 'boiler_temp_sensor_top', 'boiler_temp_sensor_bottom',
    'boiler_enable_second_thermometer', 'boiler_current_power_entity',
    'boiler_alt_energy_sensor', 'boiler_alt_energy_daily', 'boiler_alt_cost_kwh',
    'boiler_has_alternative_heating', 'boiler_target_temp_c', 'boiler_deadline_time',
    'boiler_alt_source_type', 'boiler_battery_cycle_cost_czk_kwh',
    'boiler_thermal_arbitrage_enabled', 'boiler_max_temp_c', 'boiler_alt_power_kw',
    'box_has_home56', 'boiler_home5_maneuver_enabled', 'boiler_circulation_enabled',
    'boiler_circulation_lead_minutes', 'boiler_circulation_run_minutes',
    'boiler_circulation_max_runs_per_day', 'boiler_circulation_min_gap_minutes',
    'boiler_legionella_interval_days', 'boiler_legionella_target_temp_c',
  ],
  ai: ['ai_provider', 'ai_base_url', 'ai_model'],
  pricing: [
    'confirmed_distribution_distributor', 'confirmed_distribution_tariff',
    'confirmed_distribution_price_incl_vat', 'confirmed_distribution_price_excl_vat',
    'confirmed_distribution_unit',
    // Relocated from pricing_supplier (supplier-step redesign, owner
    // correction round 2 — distribution does not belong in the supplier
    // contract's step; key names unchanged, config_registry.py).
    'distribution_fee_vt_kwh', 'distribution_fee_nt_kwh', 'vat_rate',
  ],
  pricing_supplier: [
    'spot_pricing_model', 'spot_positive_fee_percent', 'spot_positive_fee_percent_nt',
    'spot_negative_fee_percent', 'spot_negative_fee_percent_nt', 'spot_fixed_fee_mwh',
    'spot_fixed_fee_mwh_nt', 'fixed_commercial_price_vt', 'fixed_commercial_price_nt',
    'export_pricing_model', 'export_fee_percent', 'export_fee_percent_nt',
    'export_fixed_fee_czk', 'export_fixed_fee_czk_nt', 'export_fixed_price',
    'tariff_vt_start_weekday', 'tariff_nt_start_weekday', 'tariff_weekend_same_as_weekday',
    'tariff_vt_start_weekend', 'tariff_nt_start_weekend', 'dual_tariff_enabled',
  ],
  basic: [
    'standard_scan_interval', 'extended_scan_interval', 'data_source_mode',
    'local_proxy_stale_minutes', 'local_event_debounce_ms', 'enable_dashboard',
  ],
};

function buildFullRegistryFixture(): FieldRegistry {
  const fields: Record<string, RegistrySpec> = {};
  for (const [section, keys] of Object.entries(ALL_REGISTRY_KEYS)) {
    for (const key of keys) {
      fields[key] = {
        section, type: 'str', scope: 'premium',
        label: `field.${key}.label`, hint: `field.${key}.hint`,
      };
    }
  }
  return { fields, sections: Object.keys(ALL_REGISTRY_KEYS) };
}

describe('CS_LABELS completeness parity guard (Task 23)', () => {
  it('every registry field key rendered by the wizard resolves to real Czech copy — no humanised fallback reaches the screen', () => {
    const registry = buildFullRegistryFixture();
    const missing: string[] = [];
    for (const section of Object.keys(ALL_REGISTRY_KEYS)) {
      for (const f of fieldsFromRegistry(registry, section)) {
        const humanisedFallback = f.key.replace(/_/g, ' ');
        if (f.label === humanisedFallback) missing.push(`${section}/${f.key}`);
      }
    }
    expect(missing).toEqual([]);
  });
});

// Live-walk defect 1 — enum-value label completeness guard, mirroring the
// CS_LABELS parity guard above (Task 23) one level down: UX-SPEC §6 "no raw
// enum value is ever a visible label" covers the VALUE, not just the field.
// Enum tuples below are transcribed verbatim from config_registry.py's own
// `Field(..., enum=(...))` calls — keep in sync when the backend registry
// gains/changes an enum field.
//
// Two fields are deliberately EXEMPT: `confirmed_distribution_distributor`
// and `confirmed_distribution_tariff` (config_registry.py:420-434) are
// dataset-derived at runtime from the bundled pricelists (distributor names,
// official distribution tariff codes like "D01d") — real-world, already
// human-facing values, not raw internal identifiers, and there is no static
// set to catalog a label for. `data_source_mode`'s `hybrid` value is
// exempted for the same reason enum-labels.ts itself omits it: it is
// filtered out of rendered options (step-connection.ts) before it ever
// reaches the screen, kept in the enum only for a legacy GET/POST round-trip.
const ALL_ENUM_FIELDS: Record<string, { values: readonly string[]; skipValues?: readonly string[] }> = {
  solar_forecast_provider: { values: ['forecast_solar', 'solcast'] },
  solar_forecast_mode: { values: ['hourly', 'every_4h', 'daily_optimized'] },
  boiler_alt_source_type: { values: ['gas', 'heat_pump', 'fireplace', 'other'] },
  ai_provider: { values: ['ai_task', 'groq', 'nvidia'] },
  spot_pricing_model: { values: ['percentage', 'fixed', 'fixed_prices'] },
  export_pricing_model: { values: ['percentage', 'fixed', 'fixed_prices'] },
  data_source_mode: { values: ['cloud_only', 'local_only', 'hybrid'], skipValues: ['hybrid'] },
};

describe('enum-value label completeness guard (live-walk defect 1)', () => {
  it('every registry enum field resolves every allowed value to a human Czech label, never the raw enum string', () => {
    const fields: Record<string, RegistrySpec> = {};
    for (const [key, { values }] of Object.entries(ALL_ENUM_FIELDS)) {
      fields[key] = {
        section: 'x', type: 'str', scope: 'premium',
        label: `field.${key}.label`, hint: `field.${key}.hint`,
        enum: [...values],
      };
    }
    const registry: FieldRegistry = { fields, sections: ['x'] };

    const missing: string[] = [];
    for (const def of fieldsFromRegistry(registry, 'x')) {
      const { values, skipValues } = ALL_ENUM_FIELDS[def.key];
      for (const [value, label] of def.options ?? []) {
        if (skipValues?.includes(value)) continue;
        if (label === value) missing.push(`${def.key}.${value}`);
      }
      expect(values.length).toBe((def.options ?? []).length);
    }
    expect(missing).toEqual([]);
  });
});
