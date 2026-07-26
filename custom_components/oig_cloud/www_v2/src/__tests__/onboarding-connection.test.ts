// src/__tests__/onboarding-connection.test.ts
//
// F1 Wizard v2 Stage S3 Task 20 — Connection step (new step 8): 5
// basic-section fields, `data_source_mode` enum labels with `hybrid`
// excluded (UX-SPEC-wizard-v2.md §Step 8).

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type { FieldRegistry } from '@/data/registry-data';
import { STEP_CONNECTION } from '@/ui/features/onboarding/step-connection';

const CONNECTION_REGISTRY_FIXTURE: FieldRegistry = {
  sections: ['basic'],
  fields: {
    data_source_mode: {
      section: 'basic', type: 'str', scope: 'basic',
      label: 'field.data_source_mode.label',
      hint: 'field.data_source_mode.hint',
      default: 'cloud_only',
      enum: ['cloud_only', 'local_only', 'hybrid'],
    },
    standard_scan_interval: {
      section: 'basic', type: 'int', scope: 'basic',
      label: 'field.standard_scan_interval.label',
      hint: 'field.standard_scan_interval.hint',
      default: 30, min: 30,
    },
    extended_scan_interval: {
      section: 'basic', type: 'int', scope: 'basic',
      label: 'field.extended_scan_interval.label',
      hint: 'field.extended_scan_interval.hint',
      default: 300, min: 300,
    },
    local_proxy_stale_minutes: {
      section: 'basic', type: 'int', scope: 'basic',
      label: 'field.local_proxy_stale_minutes.label',
      hint: 'field.local_proxy_stale_minutes.hint',
      default: 10,
      show_if: { field: 'data_source_mode', in: ['local_only'] },
    },
    local_event_debounce_ms: {
      section: 'basic', type: 'int', scope: 'basic',
      label: 'field.local_event_debounce_ms.label',
      hint: 'field.local_event_debounce_ms.hint',
      default: 500,
      show_if: { field: 'data_source_mode', in: ['local_only'] },
    },
    // Premium gate checkbox — lives in the 'modules' section, NOT 'basic'.
    // Proves the connection step's section filter, not just an absent fixture entry.
    enable_dashboard: {
      section: 'modules', type: 'bool', scope: 'premium',
      label: 'field.enable_dashboard.label',
      hint: 'field.enable_dashboard.hint',
      default: false,
    },
  },
};

describe('STEP_CONNECTION (Task 20)', () => {
  it('never blocks the dashboard and is skippable, same contract as every step', () => {
    expect(STEP_CONNECTION.blocksDashboard).toBe(false);
    expect(STEP_CONNECTION.skippable).toBe(true);
    expect(STEP_CONNECTION.section).toBe('basic');
  });

  it('renders data_source_mode with 2 CZ labels, hybrid excluded from options', () => {
    const field = STEP_CONNECTION.fields(CONNECTION_REGISTRY_FIXTURE).find((f) => f.key === 'data_source_mode');
    expect(field).toBeTruthy();
    expect(field!.options!.map(([v]) => v)).not.toContain('hybrid');
    expect(field!.options).toEqual([
      ['cloud_only', 'Přes OIG Cloud (výchozí — funguje vždy)'],
      ['local_only', 'Přímo z boxu po domácí síti (rychlejší, bez internetu)'],
    ]);
  });

  it('the 5 basic fields render, enable_dashboard (modules section) excluded', () => {
    const keys = STEP_CONNECTION.fields(CONNECTION_REGISTRY_FIXTURE).map((f) => f.key);
    expect(keys).toEqual([
      'data_source_mode',
      'standard_scan_interval',
      'extended_scan_interval',
      'local_proxy_stale_minutes',
      'local_event_debounce_ms',
    ]);
    expect(keys).not.toContain('enable_dashboard');
  });

  it('local_proxy_stale_minutes/local_event_debounce_ms visible only when data_source_mode=local_only', () => {
    const cloudOnly = STEP_CONNECTION.visibleFields(CONNECTION_REGISTRY_FIXTURE, { data_source_mode: 'cloud_only' });
    expect(cloudOnly.map((f) => f.key)).not.toContain('local_proxy_stale_minutes');
    expect(cloudOnly.map((f) => f.key)).not.toContain('local_event_debounce_ms');

    const localOnly = STEP_CONNECTION.visibleFields(CONNECTION_REGISTRY_FIXTURE, { data_source_mode: 'local_only' });
    expect(localOnly.map((f) => f.key)).toContain('local_proxy_stale_minutes');
    expect(localOnly.map((f) => f.key)).toContain('local_event_debounce_ms');
  });
});

// ============================================================================
// Component render — full wizard, connection step (F1 Wizard v2 Stage S3 Task 20)
// ============================================================================

const fetchOIGAPI = vi.hoisted(() => vi.fn<[path: string], Promise<unknown>>());
const fetchOIGAPITyped = vi.hoisted(() => vi.fn());
const loadFieldRegistryMock = vi.hoisted(() => vi.fn<[], Promise<FieldRegistry | null>>());
const loadModuleConfigMock = vi.hoisted(() => vi.fn().mockResolvedValue({
  modules: {}, battery: {}, solar: {}, boiler: {},
}));

vi.mock('@/data/ha-client', () => ({
  haClient: {
    fetchOIGAPI,
    fetchOIGAPITyped,
    getHass: vi.fn(async () => ({ auth: { data: { access_token: 'token' } } })),
    getHassSync: vi.fn(() => null),
    refreshHass: vi.fn().mockResolvedValue(null),
  },
}));
vi.mock('@/data/settings-data', async () => {
  const actual = await vi.importActual<typeof import('@/data/settings-data')>('@/data/settings-data');
  return {
    ...actual,
    loadModuleConfig: loadModuleConfigMock,
  };
});
vi.mock('@/data/registry-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/registry-data')>();
  return {
    ...actual,
    loadFieldRegistry: loadFieldRegistryMock,
  };
});

import '@/ui/features/onboarding';

describe('connection step render (F1 Wizard v2 Stage S3 Task 20)', () => {
  beforeEach(() => {
    fetchOIGAPI.mockClear();
    fetchOIGAPITyped.mockClear();
    loadFieldRegistryMock.mockClear();
    loadFieldRegistryMock.mockResolvedValue(CONNECTION_REGISTRY_FIXTURE);
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
          distributors: {}, tariffs: [],
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

  async function openWizardOnConnectionStep(): Promise<HTMLElement & Record<string, any>> {
    const wizard = await fixture<HTMLElement>(html`<oig-onboarding-wizard
      .inverterSn=${'SN123'}
      ?open=${true}
    ></oig-onboarding-wizard>`);
    await (wizard as any).updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await (wizard as any).updateComplete;

    const connectionNavBtn = wizard.shadowRoot!.querySelector(
      'button[data-step="connection"]',
    ) as HTMLButtonElement;
    connectionNavBtn.click();
    await (wizard as any).updateComplete;
    await new Promise((resolve) => setTimeout(resolve, 0));
    await (wizard as any).updateComplete;

    return wizard as HTMLElement & Record<string, any>;
  }

  it('renders the 3 default-visible basic fields (intervals hidden until local_only), enable_dashboard excluded', async () => {
    const wizard = await openWizardOnConnectionStep();
    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    expect(content).toBeTruthy();

    const keys = [...content.querySelectorAll('[data-key]')].map((el) => el.getAttribute('data-key'));
    expect(keys).toEqual([
      'data_source_mode',
      'standard_scan_interval',
      'extended_scan_interval',
    ]);
    expect(keys).not.toContain('enable_dashboard');
  });

  it('hybrid never appears as a selectable data_source_mode option', async () => {
    const wizard = await openWizardOnConnectionStep();
    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    const select = content.querySelector('[data-key="data_source_mode"] select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    const optionValues = [...select.options].map((o) => o.value);
    expect(optionValues).toEqual(['cloud_only', 'local_only']);
    expect(content.textContent).not.toContain('hybrid');
  });

  it('local_proxy_stale_minutes/local_event_debounce_ms hidden by default, shown after switching to local_only', async () => {
    const wizard = await openWizardOnConnectionStep();
    let content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    expect(content.querySelector('[data-key="local_proxy_stale_minutes"]')).toBeNull();
    expect(content.querySelector('[data-key="local_event_debounce_ms"]')).toBeNull();

    const select = content.querySelector('[data-key="data_source_mode"] select') as HTMLSelectElement;
    select.value = 'local_only';
    select.dispatchEvent(new Event('change', { bubbles: true, composed: true }));
    await (wizard as any).updateComplete;

    content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    expect(content.querySelector('[data-key="local_proxy_stale_minutes"]')).toBeTruthy();
    expect(content.querySelector('[data-key="local_event_debounce_ms"]')).toBeTruthy();
  });

  it('seeds the step from the entry\'s stored basic-section values (owner live-walk defect: draft started empty)', async () => {
    fetchOIGAPI.mockImplementation((path: string) => {
      if (path.includes('/onboarding')) {
        return Promise.resolve({
          steps: { ai: 'pending', solar: 'pending', pricing: 'pending' },
          timestamps: {},
          grandfathered: true,
        });
      }
      if (path.includes('/pricelists')) {
        return Promise.resolve({
          distributors: {}, tariffs: [],
          selected_distributor: '', selected_tariff: '',
          confirmed_distribution_price_incl_vat: 0,
          confirmed_distribution_price_excl_vat: 0,
          confirmed_distribution_unit: '',
          stale_warning: false, valid_from: null, year: null,
        });
      }
      if (path.includes('/module_config')) {
        return Promise.resolve({
          basic: {
            data_source_mode: 'local_only',
            standard_scan_interval: 45,
            extended_scan_interval: 600,
            local_proxy_stale_minutes: 20,
            local_event_debounce_ms: 750,
          },
        });
      }
      return Promise.resolve(null);
    });

    const wizard = await openWizardOnConnectionStep();
    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;

    const select = content.querySelector('[data-key="data_source_mode"] select') as HTMLSelectElement;
    expect(select.value).toBe('local_only');

    const scanInput = content.querySelector('[data-key="standard_scan_interval"] input') as HTMLInputElement;
    expect(scanInput.value).toBe('45');
    const staleInput = content.querySelector('[data-key="local_proxy_stale_minutes"] input') as HTMLInputElement;
    expect(staleInput.value).toBe('20');
    const debounceInput = content.querySelector('[data-key="local_event_debounce_ms"] input') as HTMLInputElement;
    expect(debounceInput.value).toBe('750');
  });

  it('renders the plain-language proxy explainer above the mode select, wording matching the code (fallback to cloud on stale/missing proxy)', async () => {
    const wizard = await openWizardOnConnectionStep();
    const content = wizard.shadowRoot!.querySelector('[data-testid="wizard-content"]') as HTMLElement;
    const explainer = content.querySelector('[data-testid="connection-explainer"]') as HTMLElement;
    expect(explainer).toBeTruthy();

    const modeField = content.querySelector('[data-key="data_source_mode"]') as HTMLElement;
    expect(
      explainer.compareDocumentPosition(modeField) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    expect(explainer.textContent).toContain('OIG Cloud');
    expect(explainer.textContent).toContain('lokální proxy');
  });
});
