import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type { FieldRegistry } from '@/data/registry-data';

const fetchOIGAPI = vi.hoisted(() => vi.fn<[path: string], Promise<unknown>>());
const loadFieldRegistryMock = vi.hoisted(() => vi.fn<[], Promise<FieldRegistry | null>>());

vi.mock('@/data/ha-client', () => ({
  haClient: {
    fetchOIGAPI,
    getHass: vi.fn(async () => ({ auth: { data: { access_token: 'token' } } })),
    getHassSync: vi.fn(() => null),
    refreshHass: vi.fn().mockResolvedValue(null),
  },
}));

vi.mock('@/data/registry-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/registry-data')>();
  return {
    ...actual,
    loadFieldRegistry: loadFieldRegistryMock,
  };
});

import '@/ui/features/onboarding';

/**
 * Verbatim mirror of the 10 `battery`-section fields registered in
 * `config_registry.py:299-315` (Task 18). None carry a `show_if` today —
 * the 4 `balancing_*` sub-fields' gate on `balancing_enabled` is a
 * client-side fallback (plan Task 18 step 3), not registry-driven yet.
 */
const BATTERY_REGISTRY_FIXTURE: FieldRegistry = {
  sections: ['battery'],
  fields: {
    auto_mode_switch_enabled: {
      section: 'battery', type: 'bool', scope: 'premium',
      label: 'field.auto_mode_switch_enabled.label',
      hint: 'field.auto_mode_switch_enabled.hint',
      default: false,
    },
    charge_rate_kw: {
      section: 'battery', type: 'float', scope: 'premium',
      label: 'field.charge_rate_kw.label',
      hint: 'field.charge_rate_kw.hint',
      min: 0.5, max: 10.0, step: 0.1,
    },
    expensive_percentile: {
      section: 'battery', type: 'float', scope: 'premium',
      label: 'field.expensive_percentile.label',
      hint: 'field.expensive_percentile.hint',
      min: 0.5, max: 0.95, scale: 100,
    },
    battery_comfort_soc_percent: {
      section: 'battery', type: 'float', scope: 'premium',
      label: 'field.battery_comfort_soc_percent.label',
      hint: 'field.battery_comfort_soc_percent.hint',
      min: 0.0, max: 95.0, step: 5.0,
    },
    balancing_enabled: {
      section: 'battery', type: 'bool', scope: 'premium',
      label: 'field.balancing_enabled.label',
      hint: 'field.balancing_enabled.hint',
      default: false,
    },
    balancing_interval_days: {
      section: 'battery', type: 'int', scope: 'premium',
      label: 'field.balancing_interval_days.label',
      hint: 'field.balancing_interval_days.hint',
      min: 3, max: 30,
    },
    balancing_hold_hours: {
      section: 'battery', type: 'int', scope: 'premium',
      label: 'field.balancing_hold_hours.label',
      hint: 'field.balancing_hold_hours.hint',
      min: 1, max: 12,
    },
    balancing_opportunistic_threshold: {
      section: 'battery', type: 'float', scope: 'premium',
      label: 'field.balancing_opportunistic_threshold.label',
      hint: 'field.balancing_opportunistic_threshold.hint',
      min: 0.5, max: 5.0,
    },
    balancing_economic_threshold: {
      section: 'battery', type: 'float', scope: 'premium',
      label: 'field.balancing_economic_threshold.label',
      hint: 'field.balancing_economic_threshold.hint',
      min: 0.5, max: 10.0,
    },
    cheap_window_percentile: {
      section: 'battery', type: 'int', scope: 'premium',
      label: 'field.cheap_window_percentile.label',
      hint: 'field.cheap_window_percentile.hint',
      min: 5, max: 80,
    },
  },
};

function makeBatteryHass(attributes: Record<string, unknown>): any {
  return {
    language: 'cs',
    states: {
      'sensor.oig_SN123_battery_forecast': {
        entity_id: 'sensor.oig_SN123_battery_forecast',
        state: 'ok',
        attributes,
        last_changed: '2026-07-26T00:00:00Z',
        last_updated: '2026-07-26T00:00:00Z',
      },
    },
  };
}

async function openWizardOnBatteryStep(hass: any = null): Promise<HTMLElement & Record<string, any>> {
  const wizard = await fixture<HTMLElement>(html`<oig-onboarding-wizard
    .inverterSn=${'SN123'}
    ?open=${true}
  ></oig-onboarding-wizard>`);
  (wizard as any).hass = hass;
  await (wizard as any).updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (wizard as any).updateComplete;

  const batteryNavBtn = wizard.shadowRoot!.querySelector(
    'button[data-step="battery"]',
  ) as HTMLButtonElement;
  batteryNavBtn.click();
  await (wizard as any).updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await (wizard as any).updateComplete;

  return wizard as HTMLElement & Record<string, any>;
}

describe('battery step render (wizard/expert split + simulator seam)', () => {
  beforeEach(() => {
    fetchOIGAPI.mockClear();
    loadFieldRegistryMock.mockClear();
    loadFieldRegistryMock.mockResolvedValue(BATTERY_REGISTRY_FIXTURE);
    fetchOIGAPI.mockImplementation((path: string) => {
      if (path.includes('/onboarding')) {
        return Promise.resolve({
          steps: { ai: 'pending', solar: 'pending', pricing: 'pending' },
          timestamps: {},
          grandfathered: false,
        });
      }
      if (path.includes('/pricelists')) {
        return Promise.resolve({
          distributors: {},
          tariffs: [],
          selected_distributor: '', selected_tariff: '',
          confirmed_distribution_price_incl_vat: 0,
          confirmed_distribution_price_excl_vat: 0,
          confirmed_distribution_unit: '',
          stale_warning: false, valid_from: null, year: null,
        });
      }
      return Promise.resolve(null);
    });
  });

  afterEach(() => {
    fixtureCleanup();
  });

  it('renders only the user-facing Nabíjení group with charge_rate_kw and battery_comfort_soc_percent', async () => {
    const wizard = await openWizardOnBatteryStep();
    const headings = [...wizard.shadowRoot!.querySelectorAll('[data-testid="battery-group-heading"]')]
      .map((h) => h.textContent);
    expect(headings).toEqual(['Nabíjení']);

    const nabijeniGroup = wizard.shadowRoot!.querySelector('[data-group="nabijeni"]') as HTMLElement;
    expect(nabijeniGroup).toBeTruthy();
    expect(nabijeniGroup.querySelector('[data-key="charge_rate_kw"]')).not.toBeNull();
    expect(nabijeniGroup.querySelector('[data-key="battery_comfort_soc_percent"]')).not.toBeNull();
    expect(wizard.shadowRoot!.querySelector('[data-key="auto_mode_switch_enabled"]')).toBeNull();
    expect(wizard.shadowRoot!.querySelector('[data-key="expensive_percentile"]')).toBeNull();
    expect(wizard.shadowRoot!.querySelector('[data-key="balancing_enabled"]')).toBeNull();
    expect(wizard.shadowRoot!.querySelector('[data-key="cheap_window_percentile"]')).toBeNull();
  });

  it('dispatches oig-simulator-open with the current draft values', async () => {
    const wizard = await openWizardOnBatteryStep();
    const chargeInput = wizard.shadowRoot!.querySelector(
      '[data-key="charge_rate_kw"] input[type="number"]',
    ) as HTMLInputElement;
    const comfortInput = wizard.shadowRoot!.querySelector(
      '[data-key="battery_comfort_soc_percent"] input[type="number"]',
    ) as HTMLInputElement;

    chargeInput.value = '3.2';
    chargeInput.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    comfortInput.value = '65';
    comfortInput.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await (wizard as any).updateComplete;

    const received: CustomEvent[] = [];
    wizard.addEventListener('oig-simulator-open', (e) => {
      received.push(e as CustomEvent);
    });

    const button = wizard.shadowRoot!.querySelector(
      '[data-testid="battery-simulator-button"]',
    ) as HTMLButtonElement;
    button.click();

    expect(received).toHaveLength(1);
    expect(received[0].detail).toMatchObject({
      domain: 'battery',
      box: 'SN123',
      draft: {
        charge_rate_kw: 3.2,
        battery_comfort_soc_percent: 65,
      },
    });
  });

  it('renders z boxu chips and marks missing hardware values as nedostupné', async () => {
    const wizard = await openWizardOnBatteryStep(
      makeBatteryHass({ max_capacity_kwh: 9.6 }),
    );

    const capacityChip = wizard.shadowRoot!.querySelector('[data-testid="battery-capacity-chip"]');
    expect(capacityChip).toBeTruthy();
    expect(capacityChip!.textContent).toContain('9.6');
    expect(capacityChip!.textContent).toContain('kWh');

    const hwMinChip = wizard.shadowRoot!.querySelector('[data-testid="battery-hw-min-chip"]');
    expect(hwMinChip).toBeTruthy();
    expect(hwMinChip!.textContent).toContain('nedostupné');
  });
});
