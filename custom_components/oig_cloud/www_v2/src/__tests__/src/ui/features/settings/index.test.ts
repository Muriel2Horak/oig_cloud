import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type { FieldRegistry } from '@/data/registry-data';
import type { ModuleConfig } from '@/data/settings-data';

const fetchOIGAPI = vi.hoisted(() => vi.fn());
const getHassSyncMock = vi.hoisted(() => vi.fn());
const loadFieldRegistryMock = vi.hoisted(() =>
  vi.fn<[signal?: AbortSignal], Promise<FieldRegistry | null>>(),
);
const loadModuleConfigMock = vi.hoisted(() =>
  vi.fn<[signal?: AbortSignal], Promise<ModuleConfig | null>>(),
);
const saveModuleConfigMock = vi.hoisted(() => vi.fn());

vi.mock('@/data/ha-client', () => ({
  haClient: {
    fetchOIGAPI,
    fetchOIGAPITyped: vi.fn(),
    getHass: vi.fn(async () => ({ auth: { data: { access_token: 'token' } } })),
    getHassSync: getHassSyncMock,
    refreshHass: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/data/registry-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/registry-data')>();
  return { ...actual, loadFieldRegistry: loadFieldRegistryMock };
});

vi.mock('@/data/settings-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/settings-data')>();
  return {
    ...actual,
    loadModuleConfig: loadModuleConfigMock,
    saveModuleConfig: saveModuleConfigMock,
  };
});

import '@/ui/features/settings';
import { STEP_PRICING_DISTRIBUTION } from '@/ui/features/onboarding/step-pricing-distribution';
import { fieldsFromRegistry } from '@/data/registry-data';
import { t } from '@/i18n/onboarding';

const REGISTRY_FIXTURE: FieldRegistry = {
  sections: ['modules', 'battery', 'solar', 'pricing_supplier', 'boiler'],
  fields: {
    enable_boiler: {
      section: 'modules',
      type: 'bool',
      scope: 'premium',
      label: 'field.export_fixed_price.label',
      hint: 'field.export_fixed_price.hint',
      default: true,
    },
    auto_mode_switch_enabled: {
      section: 'battery',
      type: 'bool',
      scope: 'premium',
      label: 'field.enable_pricing.label',
      hint: 'field.enable_pricing.hint',
      default: false,
    },
    solar_forecast_provider: {
      section: 'solar',
      type: 'str',
      scope: 'premium',
      label: 'field.enable_chmu_warnings.label',
      hint: 'field.enable_chmu_warnings.hint',
      default: 'forecast_solar',
      enum: ['forecast_solar', 'solcast'],
    },
    spot_pricing_model: {
      section: 'pricing_supplier',
      type: 'str',
      scope: 'premium',
      label: 'field.enable_boiler.label',
      hint: 'field.enable_boiler.hint',
      default: 'percentage',
      enum: ['percentage', 'fixed', 'fixed_prices'],
    },
    boiler_volume_l: {
      section: 'boiler',
      type: 'float',
      scope: 'premium',
      label: 'field.ai_provider.label',
      hint: 'field.ai_provider.hint',
      default: 120,
      min: 30,
      max: 1000,
    },
  },
};

const MODULE_CONFIG: ModuleConfig = {
  modules: {
    enable_solar_forecast: false,
    enable_battery_prediction: false,
    enable_pricing: false,
    enable_boiler: true,
    enable_statistics: false,
    enable_extended_sensors: false,
    enable_chmu_warnings: false,
  },
  battery: {
    auto_mode_switch_enabled: false,
    charge_rate_kw: null,
    expensive_percentile: null,
    battery_comfort_soc_percent: null,
    balancing_enabled: false,
    balancing_interval_days: null,
    balancing_hold_hours: null,
    balancing_opportunistic_threshold: null,
    balancing_economic_threshold: null,
    cheap_window_percentile: null,
  },
  solar: {
    solar_forecast_provider: 'forecast_solar',
    solar_forecast_mode: 'daily_optimized',
    solcast_site_id: '',
    solar_forecast_latitude: null,
    solar_forecast_longitude: null,
    solar_forecast_string1_enabled: false,
    solar_forecast_string1_declination: null,
    solar_forecast_string1_azimuth: null,
    solar_forecast_string1_kwp: null,
    solar_forecast_string2_enabled: false,
    solar_forecast_string2_declination: null,
    solar_forecast_string2_azimuth: null,
    solar_forecast_string2_kwp: null,
  },
  boiler: {
    boiler_volume_l: 120,
    boiler_temp_sensor_top: '',
    boiler_temp_sensor_bottom: '',
    boiler_enable_second_thermometer: false,
    boiler_current_power_entity: '',
    boiler_has_alternative_heating: false,
    boiler_alt_source_type: 'gas',
    boiler_alt_cost_kwh: 0,
    boiler_alt_energy_sensor: '',
    boiler_alt_energy_daily: false,
    box_has_home56: false,
    boiler_home5_maneuver_enabled: false,
    boiler_battery_cycle_cost_czk_kwh: 0,
    boiler_target_temp_c: 60,
    boiler_deadline_time: '07:00',
    boiler_thermal_arbitrage_enabled: false,
    boiler_max_temp_c: 65,
    boiler_alt_power_kw: 0,
    boiler_circulation_enabled: false,
    boiler_circulation_lead_minutes: 15,
    boiler_circulation_run_minutes: 10,
    boiler_circulation_max_runs_per_day: 3,
    boiler_circulation_min_gap_minutes: 120,
    boiler_legionella_interval_days: 0,
    boiler_legionella_target_temp_c: 60,
  },
  pricing_supplier: {
    spot_pricing_model: 'percentage',
    spot_positive_fee_percent: 15,
    spot_positive_fee_percent_nt: 13,
    spot_negative_fee_percent: 9,
    spot_negative_fee_percent_nt: 7,
    spot_fixed_fee_mwh: 500,
    spot_fixed_fee_mwh_nt: 400,
    fixed_commercial_price_vt: 4.5,
    fixed_commercial_price_nt: 3.2,
    export_pricing_model: 'percentage',
    export_fee_percent: 15,
    export_fee_percent_nt: 13,
    export_fixed_fee_czk: 0.5,
    export_fixed_fee_czk_nt: 0.4,
    export_fixed_price: 1,
    tariff_vt_start_weekday: '6',
    tariff_nt_start_weekday: '22,2',
    tariff_weekend_same_as_weekday: true,
    tariff_vt_start_weekend: '',
    tariff_nt_start_weekend: '0',
    dual_tariff_enabled: false,
  },
};

function registryWith(extraFields: Partial<FieldRegistry['fields']>): FieldRegistry {
  return {
    ...REGISTRY_FIXTURE,
    fields: { ...REGISTRY_FIXTURE.fields, ...extraFields } as FieldRegistry['fields'],
  };
}

type ModuleConfigOverrides = {
  modules?: Partial<ModuleConfig['modules']>;
  battery?: Partial<ModuleConfig['battery']>;
  solar?: Partial<ModuleConfig['solar']>;
  boiler?: Partial<ModuleConfig['boiler']>;
  pricing_supplier?: Partial<ModuleConfig['pricing_supplier']>;
};

function moduleConfigWith(partial: ModuleConfigOverrides = {}): ModuleConfig {
  return {
    ...MODULE_CONFIG,
    modules: { ...MODULE_CONFIG.modules, ...partial.modules } as ModuleConfig['modules'],
    battery: { ...MODULE_CONFIG.battery, ...partial.battery } as ModuleConfig['battery'],
    solar: { ...MODULE_CONFIG.solar, ...partial.solar } as ModuleConfig['solar'],
    boiler: { ...MODULE_CONFIG.boiler, ...partial.boiler } as ModuleConfig['boiler'],
    pricing_supplier: { ...MODULE_CONFIG.pricing_supplier, ...partial.pricing_supplier } as ModuleConfig['pricing_supplier'],
  };
}

function settle(el: HTMLElement & { updateComplete: Promise<boolean> }): Promise<void> {
  return (async () => {
    await el.updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await el.updateComplete;
  })();
}

function cardText(settings: HTMLElement, heading: string): string {
  const cards = [...settings.shadowRoot!.querySelectorAll('.card')];
  const card = cards.find((el) => el.querySelector('h2')?.textContent?.includes(heading));
  return card?.textContent ?? '';
}

async function mountSettings(): Promise<HTMLElement & { updateComplete: Promise<boolean> }> {
  const settings = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
    html`<oig-settings></oig-settings>`,
  );
  await settle(settings);
  return settings;
}

beforeEach(() => {
  vi.clearAllMocks();
  getHassSyncMock.mockReturnValue(null);
  loadModuleConfigMock.mockResolvedValue(MODULE_CONFIG);
  loadFieldRegistryMock.mockResolvedValue(REGISTRY_FIXTURE);
});

afterEach(() => {
  fixtureCleanup();
});

describe('oig-settings registry-driven render', () => {
  it('renders section fields from the registry, including boiler', async () => {
    const settings = await mountSettings();
    expect(cardText(settings, 'Moduly')).toContain('Fixní výkupní cena (CZK/kWh)');
    expect(cardText(settings, 'Bojler')).toContain('Poskytovatel AI');
    expect(settings.shadowRoot!.querySelector('[data-testid="registry-error-boiler"]')).toBeNull();
  });

  it('shows an inline registry error with retry when the registry load fails', async () => {
    loadFieldRegistryMock.mockResolvedValueOnce(null);

    const settings = await mountSettings();
    const error = settings.shadowRoot!.querySelector('[data-testid="registry-error-boiler"]');
    expect(error).toBeTruthy();
    expect(error?.textContent).toContain('Zkusit znovu');
    expect(cardText(settings, 'Bojler')).not.toContain('Poskytovatel AI');
  });
});

describe('settings registry-driven — showIf field gating', () => {
  it('shows an adoption warning for a rendered legacy azimuth', async () => {
    loadFieldRegistryMock.mockResolvedValueOnce(
      registryWith({
        solar_forecast_string1_azimuth: {
          section: 'solar', type: 'int', scope: 'premium',
          label: 'field.solar_forecast_string1_azimuth.label',
          hint: 'field.solar_forecast_string1_azimuth.hint',
          min: 0, max: 360, step: 1,
        },
      }),
    );
    loadModuleConfigMock.mockResolvedValueOnce({
      ...moduleConfigWith({
        solar: { solar_forecast_string1_azimuth: 90 },
      }),
      _meta: {
        legacy_fields: {
          solar_forecast_string1_azimuth: {
            stored_value: -90,
            display_value: 90,
            legacy_provider_value: true,
            requires_adoption: true,
          },
        },
      },
    });

    const settings = await mountSettings();
    const warning = settings.shadowRoot!.querySelector(
      '[data-testid="legacy-warning-solar_forecast_string1_azimuth"]',
    );
    expect(warning).toBeTruthy();
    expect(warning?.textContent).toContain('-90');
    expect(warning?.textContent).toContain('90');
  });

  it.each([
    ['cs', 'onboarding.solar.legacy_adoption'],
    ['en', 'onboarding.solar.legacy_adoption'],
  ] as const)(
    'renders the Settings legacy adoption warning from the %s catalog',
    async (lang, key) => {
      getHassSyncMock.mockReturnValue({ language: lang });
      loadFieldRegistryMock.mockResolvedValueOnce(
        registryWith({
          solar_forecast_string1_azimuth: {
            section: 'solar', type: 'int', scope: 'premium',
            label: 'field.solar_forecast_string1_azimuth.label',
            hint: 'field.solar_forecast_string1_azimuth.hint',
            min: 0, max: 360, step: 1,
          },
        }),
      );
      loadModuleConfigMock.mockResolvedValueOnce({
        ...moduleConfigWith({ solar: { solar_forecast_string1_azimuth: 90 } }),
        _meta: {
          legacy_fields: {
            solar_forecast_string1_azimuth: {
              stored_value: -90,
              display_value: 90,
              legacy_provider_value: true,
              requires_adoption: true,
            },
          },
        },
      });

      const settings = await mountSettings();
      const warning = settings.shadowRoot!.querySelector(
        '[data-testid="legacy-warning-solar_forecast_string1_azimuth"]',
      );
      expect(warning?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        t(key, lang, { stored: '-90', display: '90' }),
      );
    },
  );

  it.each([
    ['cs', 'onboarding.solar.legacy_invalid'],
    ['en', 'onboarding.solar.legacy_invalid'],
  ] as const)(
    'renders the Settings corrupt warning from the %s catalog',
    async (lang, key) => {
      getHassSyncMock.mockReturnValue({ language: lang });
      loadFieldRegistryMock.mockResolvedValueOnce(
        registryWith({
          solar_forecast_string1_azimuth: {
            section: 'solar', type: 'int', scope: 'premium',
            label: 'field.solar_forecast_string1_azimuth.label',
            hint: 'field.solar_forecast_string1_azimuth.hint',
            min: 0, max: 360, step: 1,
          },
        }),
      );
      loadModuleConfigMock.mockResolvedValueOnce({
        ...moduleConfigWith({ solar: { solar_forecast_string1_azimuth: null } }),
        _meta: {
          legacy_fields: {
            solar_forecast_string1_azimuth: {
              stored_value: 720,
              display_value: null,
              legacy_provider_value: false,
              requires_adoption: false,
              invalid_legacy_value: true,
            },
          },
        },
      });

      const settings = await mountSettings();
      const warning = settings.shadowRoot!.querySelector(
        '[data-testid="legacy-warning-solar_forecast_string1_azimuth"]',
      );
      expect(warning?.textContent?.replace(/\s+/g, ' ').trim()).toBe(
        t(key, lang, { stored: '720' }),
      );
    },
  );

  it.each([361, 720, 90.5])(
    'shows a corrupt legacy azimuth warning for %s',
    async (storedValue) => {
      loadFieldRegistryMock.mockResolvedValueOnce(
        registryWith({
          solar_forecast_string1_azimuth: {
            section: 'solar', type: 'int', scope: 'premium',
            label: 'field.solar_forecast_string1_azimuth.label',
            hint: 'field.solar_forecast_string1_azimuth.hint',
            min: 0, max: 360, step: 1,
          },
        }),
      );
      loadModuleConfigMock.mockResolvedValueOnce({
        ...moduleConfigWith({
          solar: { solar_forecast_string1_azimuth: null },
        }),
        _meta: {
          legacy_fields: {
            solar_forecast_string1_azimuth: {
              stored_value: storedValue,
              display_value: null,
              legacy_provider_value: false,
              requires_adoption: false,
              invalid_legacy_value: true,
            },
          },
        },
      });

      const settings = await mountSettings();
      const warning = settings.shadowRoot!.querySelector(
        '[data-testid="legacy-warning-solar_forecast_string1_azimuth"]',
      );
      expect(warning).toBeTruthy();
      expect(warning?.textContent).toContain(String(storedValue));
      expect(warning?.textContent).toContain('0');
      expect(warning?.textContent).toContain('360');
      expect(warning?.textContent).not.toMatch(/[−-]180\s*°?\s*(?:až|to)\s*360/);
    },
  );

  it('renders a field when enable_boiler is true', async () => {
    loadFieldRegistryMock.mockResolvedValueOnce(
      registryWith({
        boiler_show_if_gate: {
          section: 'modules',
          type: 'str',
          scope: 'premium',
          label: 'field.boiler_show_if_gate.label',
          hint: 'field.boiler_show_if_gate.hint',
          show_if: { field: 'enable_boiler', in: [true] },
        },
      }),
    );
    loadModuleConfigMock.mockResolvedValueOnce(
      moduleConfigWith({
        modules: { enable_boiler: true },
      }),
    );

    const settings = await mountSettings();
    expect(cardText(settings, 'Moduly')).toContain('boiler show if gate');
  });

  it('hides the same field when enable_boiler is false', async () => {
    loadFieldRegistryMock.mockResolvedValueOnce(
      registryWith({
        boiler_show_if_gate: {
          section: 'modules',
          type: 'str',
          scope: 'premium',
          label: 'field.boiler_show_if_gate.label',
          hint: 'field.boiler_show_if_gate.hint',
          show_if: { field: 'enable_boiler', in: [true] },
        },
      }),
    );
    loadModuleConfigMock.mockResolvedValueOnce(
      moduleConfigWith({
        modules: { enable_boiler: false },
      }),
    );

    const settings = await mountSettings();
    expect(cardText(settings, 'Moduly')).not.toContain('boiler show if gate');
  });

  it('renders a field when spot_pricing_model is in the allowed list', async () => {
    loadFieldRegistryMock.mockResolvedValueOnce(
      registryWith({
        pricing_show_if_marker: {
          section: 'pricing_supplier',
          type: 'str',
          scope: 'premium',
          label: 'field.pricing_show_if_marker.label',
          hint: 'field.pricing_show_if_marker.hint',
          show_if: { field: 'spot_pricing_model', in: ['fixed', 'percentage'] },
        },
      }),
    );
    loadModuleConfigMock.mockResolvedValueOnce(
      moduleConfigWith({
        pricing_supplier: { spot_pricing_model: 'percentage' },
      }),
    );

    const settings = await mountSettings();
    expect(cardText(settings, 'Dodavatelské a distribuční ceny')).toContain('pricing show if marker');
  });

  it('hides the same field when spot_pricing_model is outside the allowed list', async () => {
    loadFieldRegistryMock.mockResolvedValueOnce(
      registryWith({
        pricing_show_if_marker: {
          section: 'pricing_supplier',
          type: 'str',
          scope: 'premium',
          label: 'field.pricing_show_if_marker.label',
          hint: 'field.pricing_show_if_marker.hint',
          show_if: { field: 'spot_pricing_model', in: ['fixed', 'percentage'] },
        },
      }),
    );
    loadModuleConfigMock.mockResolvedValueOnce(
      moduleConfigWith({
        pricing_supplier: { spot_pricing_model: 'fixed_prices' },
      }),
    );

    const settings = await mountSettings();
    expect(cardText(settings, 'Dodavatelské a distribuční ceny')).not.toContain('pricing show if marker');
  });
});

describe('tariff options', () => {
  it('does not expose POZE in the pricing tariff select options', () => {
    const reg: FieldRegistry = {
      sections: ['pricing', 'pricing_supplier'],
      fields: {
        confirmed_distribution_tariff: {
          section: 'pricing',
          type: 'str',
          scope: 'premium',
          label: 'field.confirmed_distribution_tariff.label',
          hint: 'field.confirmed_distribution_tariff.hint',
          enum: ['D01d', 'D25d'],
        },
        confirmed_distribution_distributor: {
          section: 'pricing',
          type: 'str',
          scope: 'premium',
          label: 'field.confirmed_distribution_distributor.label',
          hint: 'field.confirmed_distribution_distributor.hint',
          enum: ['cez', 'egd'],
        },
      },
    };

    const tariffField = STEP_PRICING_DISTRIBUTION.fields(reg).find((f) => f.key === 'confirmed_distribution_tariff');
    const values = tariffField?.options?.map(([value]) => value) ?? [];
    expect(values).not.toContain('POZE');
    expect(fieldsFromRegistry(reg, 'pricing').find((f) => f.key === 'confirmed_distribution_tariff')?.options?.map(([value]) => value))
      .not.toContain('POZE');
  });
});
