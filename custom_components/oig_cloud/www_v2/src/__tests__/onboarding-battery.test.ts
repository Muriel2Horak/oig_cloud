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

async function openWizardOnBatteryStep(): Promise<HTMLElement & Record<string, any>> {
  const wizard = await fixture<HTMLElement>(html`<oig-onboarding-wizard
    .inverterSn=${'SN123'}
    ?open=${true}
  ></oig-onboarding-wizard>`);
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

describe('battery step render (Task 18 — 4 grouped sections)', () => {
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

  it('renders 4 grouped sections in spec order: Nabíjení, Automatika, Vyrovnávání, Plánovač', async () => {
    const wizard = await openWizardOnBatteryStep();
    const el = wizard;

    const headings = [...el.shadowRoot!.querySelectorAll('[data-testid="battery-group-heading"]')]
      .map((h) => h.textContent);
    expect(headings).toEqual(['Nabíjení', 'Automatika', 'Vyrovnávání článků', 'Plánovač']);

    const nabijeniGroup = el.shadowRoot!.querySelector('[data-group="nabijeni"]') as HTMLElement;
    expect(nabijeniGroup).toBeTruthy();
    expect(nabijeniGroup.querySelector('[data-key="charge_rate_kw"]')).not.toBeNull();
  });

  it('all 10 battery registry fields render exactly once, across the 4 groups (balancing_enabled on)', async () => {
    const wizard = await openWizardOnBatteryStep();
    const el = wizard;

    // balancing_enabled starts off (registry default) — flip it on so the 4
    // gated sub-fields join the render before counting the full field set.
    const toggle = el.shadowRoot!.querySelector(
      '[data-key="balancing_enabled"] input[type="checkbox"]',
    ) as HTMLInputElement;
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await (wizard as any).updateComplete;

    const allKeys = [...el.shadowRoot!.querySelectorAll('[data-step="battery"] [data-key]')]
      .map((n) => n.getAttribute('data-key'));
    expect(allKeys.sort()).toEqual(Object.keys(BATTERY_REGISTRY_FIXTURE.fields).sort());
  });

  it('nabijeni group contains exactly charge_rate_kw + battery_comfort_soc_percent', async () => {
    const wizard = await openWizardOnBatteryStep();
    const el = wizard;

    const nabijeniGroup = el.shadowRoot!.querySelector('[data-group="nabijeni"]') as HTMLElement;
    const keys = [...nabijeniGroup.querySelectorAll('[data-key]')].map((n) => n.getAttribute('data-key'));
    expect(keys).toEqual(['charge_rate_kw', 'battery_comfort_soc_percent']);
  });

  it('automatika group contains exactly auto_mode_switch_enabled', async () => {
    const wizard = await openWizardOnBatteryStep();
    const el = wizard;

    const group = el.shadowRoot!.querySelector('[data-group="automatika"]') as HTMLElement;
    const keys = [...group.querySelectorAll('[data-key]')].map((n) => n.getAttribute('data-key'));
    expect(keys).toEqual(['auto_mode_switch_enabled']);
  });

  it('planovac group contains exactly expensive_percentile + cheap_window_percentile', async () => {
    const wizard = await openWizardOnBatteryStep();
    const el = wizard;

    const group = el.shadowRoot!.querySelector('[data-group="planovac"]') as HTMLElement;
    const keys = [...group.querySelectorAll('[data-key]')].map((n) => n.getAttribute('data-key'));
    expect(keys).toEqual(['expensive_percentile', 'cheap_window_percentile']);
  });

  it('vyrovnavani group: balancing_enabled off hides its 4 sub-fields (client-side fallback gate)', async () => {
    const wizard = await openWizardOnBatteryStep();
    const el = wizard;

    const group = el.shadowRoot!.querySelector('[data-group="vyrovnavani"]') as HTMLElement;
    const keys = [...group.querySelectorAll('[data-key]')].map((n) => n.getAttribute('data-key'));
    expect(keys).toEqual(['balancing_enabled']);
  });

  it('vyrovnavani group: toggling balancing_enabled on reveals its 4 sub-fields', async () => {
    const wizard = await openWizardOnBatteryStep();
    const el = wizard;

    let group = el.shadowRoot!.querySelector('[data-group="vyrovnavani"]') as HTMLElement;
    const toggle = group.querySelector('[data-key="balancing_enabled"] input[type="checkbox"]') as HTMLInputElement;
    expect(toggle).toBeTruthy();
    toggle.checked = true;
    toggle.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await (wizard as any).updateComplete;

    group = el.shadowRoot!.querySelector('[data-group="vyrovnavani"]') as HTMLElement;
    const keys = [...group.querySelectorAll('[data-key]')].map((n) => n.getAttribute('data-key'));
    expect(keys).toEqual([
      'balancing_enabled',
      'balancing_interval_days',
      'balancing_hold_hours',
      'balancing_opportunistic_threshold',
      'balancing_economic_threshold',
    ]);
  });
});
