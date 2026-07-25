import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type { FieldRegistry } from '@/data/registry-data';

const loadFieldRegistryMock = vi.hoisted(() =>
  vi.fn<[signal?: AbortSignal], Promise<FieldRegistry | null>>().mockResolvedValue(null),
);

vi.mock('@/data/ha-client', () => ({
  haClient: {
    fetchOIGAPI: vi.fn().mockResolvedValue(null),
    fetchOIGAPITyped: vi.fn().mockResolvedValue({ ok: true, status: 200, data: null }),
    getHass: vi.fn(async () => ({ auth: { data: { access_token: 'token' } } })),
    getHassSync: vi.fn(() => null),
    refreshHass: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/data/state-watcher', () => ({
  stateWatcher: {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    onEntityChange: vi.fn().mockReturnValue(vi.fn()),
  },
}));

vi.mock('@/data/settings-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/settings-data')>();
  return {
    ...actual,
    saveModuleConfig: vi.fn(),
  };
});

vi.mock('@/data/registry-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/registry-data')>();
  return {
    ...actual,
    loadFieldRegistry: loadFieldRegistryMock,
  };
});

vi.mock('@/ui/components/header', () => ({}));
vi.mock('@/ui/components/theme-provider', () => ({}));
vi.mock('@/ui/layout/tabs', () => ({}));
vi.mock('@/ui/layout/grid', () => ({}));
vi.mock('@/ui/features/flow', () => ({}));
vi.mock('@/ui/features/flow/grid-charging-dialog', () => ({}));
vi.mock('@/ui/features/pricing', () => ({}));
vi.mock('@/ui/features/boiler', () => ({}));
vi.mock('@/ui/features/control-panel', () => ({}));
vi.mock('@/ui/features/analytics', () => ({}));
vi.mock('@/ui/features/weather', () => ({}));
vi.mock('@/ui/features/timeline', () => ({}));
vi.mock('@/ui/features/tiles', () => ({}));
vi.mock('@/ui/features/tiles/icon-picker', () => ({}));
vi.mock('@/ui/features/tiles/tile-dialog', () => ({}));
vi.mock('@/ui/features/onboarding/banner', () => ({}));

import { fieldsFromRegistry } from '@/data/registry-data';
import '@/ui/features/onboarding';

/**
 * Verbatim mirror of `config_registry.py:352-401` `boiler` section (Task 19
 * — the FE's boiler step has never existed before this task, so no prior FE
 * fixture to reuse). 25 fields, no `show_if` on any of them (confirmed in
 * `config_registry.py` — this step renders as one flat, ungated-by-field-
 * visibility form; the whole STEP is gated by `enable_boiler` instead).
 */
const BOILER_REGISTRY_FIXTURE: FieldRegistry = {
  sections: ['boiler'],
  fields: {
    boiler_volume_l: {
      section: 'boiler', type: 'float', scope: 'premium', default: null, min: 30, max: 1000,
      label: 'field.boiler_volume_l.label', hint: 'field.boiler_volume_l.hint',
    },
    boiler_temp_sensor_top: {
      section: 'boiler', type: 'str', scope: 'premium', default: '', entity_domain: 'sensor',
      label: 'field.boiler_temp_sensor_top.label', hint: 'field.boiler_temp_sensor_top.hint',
    },
    boiler_temp_sensor_bottom: {
      section: 'boiler', type: 'str', scope: 'premium', default: '', entity_domain: 'sensor', optional: true,
      label: 'field.boiler_temp_sensor_bottom.label', hint: 'field.boiler_temp_sensor_bottom.hint',
    },
    boiler_enable_second_thermometer: {
      section: 'boiler', type: 'bool', scope: 'premium', default: false,
      label: 'field.boiler_enable_second_thermometer.label', hint: 'field.boiler_enable_second_thermometer.hint',
    },
    boiler_current_power_entity: {
      section: 'boiler', type: 'str', scope: 'premium', default: '', entity_domain: 'sensor', optional: true,
      label: 'field.boiler_current_power_entity.label', hint: 'field.boiler_current_power_entity.hint',
    },
    boiler_alt_energy_sensor: {
      section: 'boiler', type: 'str', scope: 'premium', default: '', entity_domain: 'sensor', optional: true,
      label: 'field.boiler_alt_energy_sensor.label', hint: 'field.boiler_alt_energy_sensor.hint',
    },
    boiler_alt_energy_daily: {
      section: 'boiler', type: 'bool', scope: 'premium', default: false,
      label: 'field.boiler_alt_energy_daily.label', hint: 'field.boiler_alt_energy_daily.hint',
    },
    boiler_alt_cost_kwh: {
      section: 'boiler', type: 'float', scope: 'premium', default: null, min: 0, max: 20,
      label: 'field.boiler_alt_cost_kwh.label', hint: 'field.boiler_alt_cost_kwh.hint',
    },
    boiler_has_alternative_heating: {
      section: 'boiler', type: 'bool', scope: 'premium', default: false,
      label: 'field.boiler_has_alternative_heating.label', hint: 'field.boiler_has_alternative_heating.hint',
    },
    boiler_target_temp_c: {
      section: 'boiler', type: 'float', scope: 'premium', default: null, min: 40, max: 85,
      label: 'field.boiler_target_temp_c.label', hint: 'field.boiler_target_temp_c.hint',
    },
    boiler_deadline_time: {
      section: 'boiler', type: 'str', scope: 'premium', default: '',
      label: 'field.boiler_deadline_time.label', hint: 'field.boiler_deadline_time.hint',
    },
    boiler_alt_source_type: {
      section: 'boiler', type: 'str', scope: 'premium', default: 'gas',
      enum: ['gas', 'heat_pump', 'fireplace', 'other'],
      label: 'field.boiler_alt_source_type.label', hint: 'field.boiler_alt_source_type.hint',
    },
    boiler_battery_cycle_cost_czk_kwh: {
      section: 'boiler', type: 'float', scope: 'premium', default: 0.5, min: 0, max: 5,
      label: 'field.boiler_battery_cycle_cost_czk_kwh.label', hint: 'field.boiler_battery_cycle_cost_czk_kwh.hint',
    },
    boiler_thermal_arbitrage_enabled: {
      section: 'boiler', type: 'bool', scope: 'premium', default: false,
      label: 'field.boiler_thermal_arbitrage_enabled.label', hint: 'field.boiler_thermal_arbitrage_enabled.hint',
    },
    boiler_max_temp_c: {
      section: 'boiler', type: 'float', scope: 'premium', default: 65, min: 40, max: 85,
      label: 'field.boiler_max_temp_c.label', hint: 'field.boiler_max_temp_c.hint',
    },
    boiler_alt_power_kw: {
      section: 'boiler', type: 'float', scope: 'premium', default: 0, min: 0, max: 50,
      label: 'field.boiler_alt_power_kw.label', hint: 'field.boiler_alt_power_kw.hint',
    },
    box_has_home56: {
      section: 'boiler', type: 'bool', scope: 'premium', default: false,
      label: 'field.box_has_home56.label', hint: 'field.box_has_home56.hint',
    },
    boiler_home5_maneuver_enabled: {
      section: 'boiler', type: 'bool', scope: 'premium', default: false,
      label: 'field.boiler_home5_maneuver_enabled.label', hint: 'field.boiler_home5_maneuver_enabled.hint',
    },
    boiler_circulation_enabled: {
      section: 'boiler', type: 'bool', scope: 'premium', default: false,
      label: 'field.boiler_circulation_enabled.label', hint: 'field.boiler_circulation_enabled.hint',
    },
    boiler_circulation_lead_minutes: {
      section: 'boiler', type: 'int', scope: 'premium', default: null, min: 0, max: 120,
      label: 'field.boiler_circulation_lead_minutes.label', hint: 'field.boiler_circulation_lead_minutes.hint',
    },
    boiler_circulation_run_minutes: {
      section: 'boiler', type: 'int', scope: 'premium', default: null, min: 1, max: 60,
      label: 'field.boiler_circulation_run_minutes.label', hint: 'field.boiler_circulation_run_minutes.hint',
    },
    boiler_circulation_max_runs_per_day: {
      section: 'boiler', type: 'int', scope: 'premium', default: null, min: 1, max: 20,
      label: 'field.boiler_circulation_max_runs_per_day.label', hint: 'field.boiler_circulation_max_runs_per_day.hint',
    },
    boiler_circulation_min_gap_minutes: {
      section: 'boiler', type: 'int', scope: 'premium', default: null, min: 10, max: 480,
      label: 'field.boiler_circulation_min_gap_minutes.label', hint: 'field.boiler_circulation_min_gap_minutes.hint',
    },
    boiler_legionella_interval_days: {
      section: 'boiler', type: 'int', scope: 'premium', default: null, min: 0, max: 30,
      label: 'field.boiler_legionella_interval_days.label', hint: 'field.boiler_legionella_interval_days.hint',
    },
    boiler_legionella_target_temp_c: {
      section: 'boiler', type: 'float', scope: 'premium', default: null, min: 60, max: 75,
      label: 'field.boiler_legionella_target_temp_c.label', hint: 'field.boiler_legionella_target_temp_c.hint',
    },
  },
};

async function openWizard(): Promise<HTMLElement & Record<string, any>> {
  const wizard = await fixture<HTMLElement>(html`<oig-onboarding-wizard
    .inverterSn=${'SN123'}
    ?open=${true}
  ></oig-onboarding-wizard>`);
  await (wizard as any).updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (wizard as any).updateComplete;
  return wizard as HTMLElement & Record<string, any>;
}

describe('boiler step (Task 19 — single registry-driven form, UX-SPEC §Step 7)', () => {
  beforeEach(() => {
    loadFieldRegistryMock.mockReset();
    loadFieldRegistryMock.mockResolvedValue(BOILER_REGISTRY_FIXTURE);
  });

  afterEach(() => {
    fixtureCleanup();
  });

  it('renders all 25 boiler registry fields as a single step, gated by enable_boiler', async () => {
    const el = await openWizard();

    el.modulesDraft = { ...el.modulesDraft, enable_boiler: false };
    await el.updateComplete;
    const stepsWhenOff = [...el.shadowRoot!.querySelectorAll('[data-testid="wizard-steps"] button')]
      .map((b: Element) => (b as HTMLElement).dataset.step);
    expect(stepsWhenOff).not.toContain('boiler');

    el.modulesDraft = { ...el.modulesDraft, enable_boiler: true };
    el.currentStep = 'boiler';
    await el.updateComplete;

    const stepsWhenOn = [...el.shadowRoot!.querySelectorAll('[data-testid="wizard-steps"] button')]
      .map((b: Element) => (b as HTMLElement).dataset.step);
    expect(stepsWhenOn).toContain('boiler');

    const rendered = fieldsFromRegistry(BOILER_REGISTRY_FIXTURE, 'boiler').every(
      (f) => el.shadowRoot!.querySelector(`[data-key="${f.key}"]`),
    );
    expect(rendered).toBe(true);
  });
});
