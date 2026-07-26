import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type { FieldRegistry } from '@/data/registry-data';

type AiStatus = {
  provider: string;
  key_set: boolean;
  verified: boolean;
  status: 'not_configured' | 'verified' | 'unverified' | 'backing_off' | 'no_credits' | 'error';
  last_error_code: string | null;
  next_probe_at: string | null;
};

type AiValidateBody = {
  ok: boolean;
  findings?: Array<{ severity: string; message: string }>;
  code?: string;
};

type AiValidateTypedResult = {
  ok: boolean;
  status: number;
  data: AiValidateBody;
  code?: string;
  error?: string;
};

const fetchOIGAPI = vi.hoisted(() =>
  vi.fn<[path: string, options?: RequestInit], Promise<unknown>>(),
);
const fetchOIGAPITyped = vi.hoisted(() =>
  vi.fn<[path: string, options?: RequestInit], Promise<AiValidateTypedResult>>(),
);
const loadFieldRegistryMock = vi.hoisted(() =>
  vi.fn<[signal?: AbortSignal], Promise<FieldRegistry | null>>(),
);
const loadModuleConfigMock = vi.hoisted(() =>
  vi.fn<[], Promise<Record<string, unknown>>>(),
);

vi.mock('@/data/ha-client', () => ({
  haClient: {
    fetchOIGAPI,
    fetchOIGAPITyped,
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

vi.mock('@/data/settings-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/settings-data')>();
  return {
    ...actual,
    loadModuleConfig: loadModuleConfigMock,
    saveModuleConfig: vi.fn().mockResolvedValue({ ok: true }),
    waitForModuleConfigAfterReload: vi.fn(),
  };
});

import '@/ui/features/onboarding';
import '@/ui/features/settings';

const AI_REGISTRY_FIXTURE: FieldRegistry = {
  sections: ['ai'],
  fields: {
    ai_provider: {
      section: 'ai',
      type: 'str',
      scope: 'premium',
      label: 'field.ai_provider.label',
      hint: 'field.ai_provider.hint',
      default: '',
      enum: ['ai_task', 'groq', 'nvidia'],
    } as any,
    ai_base_url: {
      section: 'ai',
      type: 'str',
      scope: 'premium',
      label: 'field.ai_base_url.label',
      hint: 'field.ai_base_url.hint',
      default: '',
    } as any,
    ai_model: {
      section: 'ai',
      type: 'str',
      scope: 'premium',
      label: 'field.ai_model.label',
      hint: 'field.ai_model.hint',
      default: '',
    } as any,
  },
};

const PRICELISTS = {
  distributors: {},
  tariffs: [],
  selected_distributor: '',
  selected_tariff: '',
  confirmed_distribution_price_incl_vat: 0,
  confirmed_distribution_price_excl_vat: 0,
  confirmed_distribution_unit: '',
  stale_warning: false,
  valid_from: null,
  year: null,
};

const BASE_CONFIG: Record<string, any> = {
  modules: {
    enable_solar_forecast: true,
    enable_battery_prediction: true,
    enable_pricing: true,
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
  solar: {},
  boiler: {},
  pricing: {},
  pricing_supplier: {},
  ai: {
    ai_provider: 'groq',
    ai_base_url: 'https://api.groq.com/openai/v1',
    ai_model: 'llama-3',
    ai_api_key_set: true,
  },
};

const REVIEW_ONBOARDING_STATE = {
  schema_version: 1,
  steps: {
    modules: 'done',
    ai: 'pending',
    solar: 'pending',
    pricing_distribution: 'pending',
    pricing_supplier: 'pending',
    pricing_supplier_sell: 'pending',
    battery: 'pending',
    boiler: 'pending',
    connection: 'pending',
  },
  timestamps: {},
  provider: 'groq',
  grandfathered: true,
  banner_dismissed: false,
};

const NEW_INSTALL_ONBOARDING_STATE = {
  ...REVIEW_ONBOARDING_STATE,
  grandfathered: false,
};

const AI_NOT_CONFIGURED: AiStatus = {
  provider: '',
  key_set: false,
  verified: false,
  status: 'not_configured',
  last_error_code: null,
  next_probe_at: null,
};

const AI_UNVERIFIED: AiStatus = {
  provider: 'groq',
  key_set: true,
  verified: false,
  status: 'unverified',
  last_error_code: null,
  next_probe_at: null,
};

const AI_BACKING_OFF: AiStatus = {
  provider: 'groq',
  key_set: true,
  verified: false,
  status: 'backing_off',
  last_error_code: 'backing_off',
  next_probe_at: '2026-07-26T00:00:00Z',
};

const AI_NO_CREDITS: AiStatus = {
  provider: 'groq',
  key_set: true,
  verified: false,
  status: 'no_credits',
  last_error_code: 'no_credits',
  next_probe_at: null,
};

const AI_VERIFIED: AiStatus = {
  provider: 'groq',
  key_set: true,
  verified: true,
  status: 'verified',
  last_error_code: null,
  next_probe_at: null,
};

const VALIDATE_FINDINGS: AiValidateTypedResult = {
  ok: true,
  status: 200,
  data: {
    ok: true,
    findings: [
      { severity: 'info', message: 'Inspect the provider base URL.' },
      { severity: 'warn', message: 'Confirm the selected model name.' },
    ],
  },
};

let currentOnboardingState = NEW_INSTALL_ONBOARDING_STATE;
let currentAiStatus = AI_UNVERIFIED;
let currentValidateResponse: AiValidateTypedResult = VALIDATE_FINDINGS;

function deepQuery(root: ParentNode, selector: string): Element | null {
  const direct = root.querySelector(selector);
  if (direct) return direct;
  for (const el of Array.from(root.querySelectorAll('*'))) {
    const shadow = (el as HTMLElement).shadowRoot;
    if (!shadow) continue;
    const found = deepQuery(shadow, selector);
    if (found) return found;
  }
  return null;
}

function deepText(root: ParentNode): string {
  const chunks: string[] = [];
  const collect = (node: ParentNode): void => {
    if (node.textContent) chunks.push(node.textContent);
    for (const el of Array.from(node.querySelectorAll('*'))) {
      const shadow = (el as HTMLElement).shadowRoot;
      if (shadow) collect(shadow);
    }
  };
  collect(root);
  return chunks.join(' ');
}

async function settle(el: HTMLElement & { updateComplete: Promise<boolean> }): Promise<void> {
  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
}

async function mountWizard(step: 'ai' | 'summary'): Promise<HTMLElement & { updateComplete: Promise<boolean> }> {
  const wizard = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
    html`<oig-onboarding-wizard .inverterSn=${'SN123'} ?open=${true}></oig-onboarding-wizard>`,
  );
  await settle(wizard);

  const nav = wizard.shadowRoot!.querySelector(`[data-step="${step}"]`) as HTMLButtonElement;
  nav.click();
  await settle(wizard);
  return wizard;
}

async function mountSettings(): Promise<HTMLElement & { updateComplete: Promise<boolean> }> {
  const settings = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
    html`<oig-settings></oig-settings>`,
  );
  await settle(settings);
  return settings;
}

function configureMocks(): void {
  fetchOIGAPI.mockImplementation((path: string) => {
    if (path.includes('/onboarding')) return Promise.resolve(currentOnboardingState);
    if (path.includes('/pricelists')) return Promise.resolve(PRICELISTS);
    if (path.includes('/ai/validate_config')) return Promise.resolve(currentValidateResponse.data);
    if (path.endsWith('/ai')) return Promise.resolve(currentAiStatus);
    if (path.includes('/module_config')) return Promise.resolve(BASE_CONFIG);
    return Promise.resolve(null);
  });

  fetchOIGAPITyped.mockImplementation((path: string) => {
    if (path.includes('/ai/validate_config')) return Promise.resolve(currentValidateResponse);
    return Promise.resolve({ ok: true, status: 200, data: currentValidateResponse.data });
  });

  loadFieldRegistryMock.mockResolvedValue(AI_REGISTRY_FIXTURE);
  loadModuleConfigMock.mockResolvedValue(BASE_CONFIG);
}

beforeEach(() => {
  vi.clearAllMocks();
  currentOnboardingState = NEW_INSTALL_ONBOARDING_STATE;
  currentAiStatus = AI_UNVERIFIED;
  currentValidateResponse = VALIDATE_FINDINGS;
  configureMocks();
});

afterEach(() => {
  fixtureCleanup();
});

describe('AI badge + validate gate', () => {
  it('hides the badge when AI is not configured, then shows the status copy for unverified and backoff states', async () => {
    currentAiStatus = AI_NOT_CONFIGURED;
    currentOnboardingState = NEW_INSTALL_ONBOARDING_STATE;
    configureMocks();

    const wizardEmpty = await mountWizard('ai');
    expect(deepQuery(wizardEmpty.shadowRoot!, '[data-testid="ai-status-badge"]')).toBeNull();

    const settingsEmpty = await mountSettings();
    expect(deepQuery(settingsEmpty.shadowRoot!, '[data-testid="ai-status-badge"]')).toBeNull();

    currentAiStatus = AI_UNVERIFIED;
    configureMocks();
    const wizardUnverified = await mountWizard('ai');
    const badge = deepQuery(wizardUnverified.shadowRoot!, '[data-testid="ai-status-badge"]') as HTMLElement;
    expect(badge).toBeTruthy();
    expect(badge.textContent).toContain('AI čeká na ověření');

    currentAiStatus = AI_BACKING_OFF;
    configureMocks();
    const settingsBackingOff = await mountSettings();
    const backingBadge = deepQuery(settingsBackingOff.shadowRoot!, '[data-testid="ai-status-badge"]') as HTMLElement;
    expect(backingBadge).toBeTruthy();
    expect(backingBadge.getAttribute('data-status')).toBe('backing_off');
    expect(backingBadge.textContent).not.toContain('AI čeká na ověření');

    currentAiStatus = AI_NO_CREDITS;
    configureMocks();
    const wizardNoCredits = await mountWizard('ai');
    const noCreditsBadge = deepQuery(wizardNoCredits.shadowRoot!, '[data-testid="ai-status-badge"]') as HTMLElement;
    expect(noCreditsBadge).toBeTruthy();
    expect(noCreditsBadge.getAttribute('data-status')).toBe('no_credits');
    expect(noCreditsBadge.textContent).not.toContain('AI čeká na ověření');

    currentAiStatus = AI_VERIFIED;
    configureMocks();
    const settingsVerified = await mountSettings();
    expect(deepQuery(settingsVerified.shadowRoot!, '[data-testid="ai-status-badge"]')).toBeNull();
  });

  it('keeps the validate button hidden until verified and renders findings inline in the summary card', async () => {
    currentOnboardingState = NEW_INSTALL_ONBOARDING_STATE;
    currentAiStatus = AI_UNVERIFIED;
    configureMocks();

    const wizardUnverified = await mountWizard('summary');
    expect(deepQuery(wizardUnverified.shadowRoot!, '[data-testid="validate-ai-config-button"]')).toBeNull();

    currentAiStatus = AI_VERIFIED;
    currentValidateResponse = VALIDATE_FINDINGS;
    configureMocks();

    const wizardVerified = await mountWizard('summary');
    const button = deepQuery(wizardVerified.shadowRoot!, '[data-testid="validate-ai-config-button"]') as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.disabled).toBe(false);

    button.click();
    await settle(wizardVerified);

    expect(fetchOIGAPITyped).toHaveBeenCalled();
    const validateCall = fetchOIGAPITyped.mock.calls.find(([path]) => path.includes('/ai/validate_config'));
    expect(validateCall).toBeTruthy();
    expect(validateCall![1]?.body).toBeUndefined();

    const findings = deepQuery(wizardVerified.shadowRoot!, '[data-testid="validate-ai-config-findings"]') as HTMLElement;
    expect(findings).toBeTruthy();
    expect(findings.textContent).toContain('Inspect the provider base URL.');
    expect(findings.textContent).toContain('Confirm the selected model name.');
  });

  it.each([
    { code: 'ai_not_verified', response: { ok: true, status: 200, data: { ok: false, code: 'ai_not_verified' } } },
    { code: 'no_credits', response: { ok: true, status: 200, data: { ok: false, code: 'no_credits' } } },
    { code: 'provider_unreachable', response: { ok: false, status: 0, code: 'provider_unreachable', error: 'network down' } },
  ])(
    'renders a classified error state for %s without leaking a raw exception',
    async ({ code, response }) => {
      currentOnboardingState = NEW_INSTALL_ONBOARDING_STATE;
      currentAiStatus = AI_VERIFIED;
      currentValidateResponse = response as AiValidateTypedResult;
      configureMocks();

      const wizard = await mountWizard('summary');
      const button = deepQuery(wizard.shadowRoot!, '[data-testid="validate-ai-config-button"]') as HTMLButtonElement;
      button.click();
      await settle(wizard);

      const error = deepQuery(wizard.shadowRoot!, '[data-testid="validate-ai-config-error"]') as HTMLElement;
      expect(error).toBeTruthy();
      expect(error.textContent).not.toContain(code);
      expect(error.textContent).not.toMatch(/TypeError|Error:/);
    },
  );
});

describe('Settings AI card parity', () => {
  it('shows the masked ai_api_key input and mirrors the validate gate', async () => {
    currentOnboardingState = NEW_INSTALL_ONBOARDING_STATE;
    currentAiStatus = AI_UNVERIFIED;
    configureMocks();

    const settings = await mountSettings();
    expect(deepText(settings.shadowRoot!)).toContain('Poskytovatel AI');

    const secretInput = deepQuery(settings.shadowRoot!, 'input[type="password"]') as HTMLInputElement;
    expect(secretInput).toBeTruthy();
    expect(secretInput.placeholder).toContain('nastaveno');

    expect(deepQuery(settings.shadowRoot!, '[data-testid="ai-status-badge"]')).toBeTruthy();
    expect(deepQuery(settings.shadowRoot!, '[data-testid="validate-ai-config-button"]')).toBeNull();

    currentAiStatus = AI_VERIFIED;
    configureMocks();
    const verified = await mountSettings();
    expect(deepQuery(verified.shadowRoot!, '[data-testid="ai-status-badge"]')).toBeNull();
    const button = deepQuery(verified.shadowRoot!, '[data-testid="validate-ai-config-button"]') as HTMLButtonElement;
    expect(button).toBeTruthy();
    expect(button.disabled).toBe(false);
  });
});

describe('Cross-surface tie-together', () => {
  it('removes the badge and reveals the button on both surfaces after verification', async () => {
    currentOnboardingState = REVIEW_ONBOARDING_STATE;
    currentAiStatus = AI_UNVERIFIED;
    configureMocks();

    const wizardBefore = await mountWizard('summary');
    const settingsBefore = await mountSettings();

    expect(deepQuery(wizardBefore.shadowRoot!, '[data-testid="ai-status-badge"]')).toBeTruthy();
    expect(deepQuery(settingsBefore.shadowRoot!, '[data-testid="ai-status-badge"]')).toBeTruthy();
    expect(deepQuery(wizardBefore.shadowRoot!, '[data-testid="validate-ai-config-button"]')).toBeNull();
    expect(deepQuery(settingsBefore.shadowRoot!, '[data-testid="validate-ai-config-button"]')).toBeNull();

    currentAiStatus = AI_VERIFIED;
    configureMocks();

    const wizardAfter = await mountWizard('summary');
    const settingsAfter = await mountSettings();

    expect(deepQuery(wizardAfter.shadowRoot!, '[data-testid="ai-status-badge"]')).toBeNull();
    expect(deepQuery(settingsAfter.shadowRoot!, '[data-testid="ai-status-badge"]')).toBeNull();

    const wizardButton = deepQuery(wizardAfter.shadowRoot!, '[data-testid="validate-ai-config-button"]') as HTMLButtonElement;
    const settingsButton = deepQuery(settingsAfter.shadowRoot!, '[data-testid="validate-ai-config-button"]') as HTMLButtonElement;
    expect(wizardButton).toBeTruthy();
    expect(settingsButton).toBeTruthy();
    expect(wizardButton.disabled).toBe(false);
    expect(settingsButton.disabled).toBe(false);

    expect(deepQuery(wizardAfter.shadowRoot!, '[data-testid="validate-ai-config-findings"]')).toBeNull();
    expect(deepQuery(settingsAfter.shadowRoot!, '[data-testid="validate-ai-config-findings"]')).toBeNull();
    expect(deepQuery(wizardAfter.shadowRoot!, '[data-testid="validate-ai-config-error"]')).toBeNull();
    expect(deepQuery(settingsAfter.shadowRoot!, '[data-testid="validate-ai-config-error"]')).toBeNull();
  });
});
