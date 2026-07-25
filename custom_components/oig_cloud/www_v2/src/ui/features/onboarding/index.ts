/**
 * OIG Cloud V2 — Onboarding wizard · shell (Plan 3 Task 12).
 *
 * A soft-guide wizard with three independent steps (AI · Solar · Pricing).
 * AI is OPTIONAL (#5) and the steps are UNORDERED — there is no lock/gate
 * concept (SCOPE-REVISION #6 / K2f). An existing user who finished pricing
 * before solar sees the wizard as a banner, never a wall.
 *
 * Task 12 introduces only the shell + step ① (AI). Steps ②/③ land in
 * Task 13; wiring the wizard into `oig-app` lands in Task 14.
 *
 * The render here composes `OigOnboardingStepAi` for now; once Task 13
 * lands, this shell will render the full step sequence with a "Přeskočit"
 * control on every step that has `skippable: true`.
 *
 * Re-exports the data/helpers consumed by other tabs and by the tests:
 *   - `PROVIDER_GUIDES`, `STEP_AI`, `keyPrefixFor`, `validateKeyShape`
 *   - `OnboardingState`, `OnboardingStepId`, `AiVerifyResult`
 *   - `loadOnboardingState`, `completeOnboardingStep`, `verifyAiKey`
 */

import { LitElement, html, css, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import {
  PROVIDER_GUIDES,
  STEP_AI,
  keyPrefixFor,
  validateKeyShape,
} from './step-ai';
import type { FieldRegistry } from '@/data/registry-data';
import { loadFieldRegistry } from '@/data/registry-data';
import { STEP_SOLAR } from './step-solar';
import { STEP_PRICING_DISTRIBUTION } from './step-pricing-distribution';
import { STEP_PRICING_SUPPLIER } from './step-pricing-supplier';
import { STEP_BATTERY } from './step-battery';
import { STEP_BOILER } from './step-boiler';
import { STEP_CONNECTION } from './step-connection';
import { renderFieldPresenter, fieldStyles } from '@/ui/features/field-renderer';
export { renderFieldPresenter, fieldStyles };
import {
  completeOnboardingStep,
  loadOnboardingState,
  skipOnboardingStep,
  verifyAiKey,
  type OnboardingState,
  type OnboardingStepId,
  type OnboardingStepStatus,
  type AiVerifyResult,
} from './onboarding-data';
import { haClient } from '@/data/ha-client';
import { saveModuleConfig, type SettingsSection } from '@/data/settings-data';
import { t, resolveLang, type Lang, type OnboardingKey } from '@/i18n/onboarding';
import { fieldLabel } from '@/i18n/fields';

interface PricingRate {
  price_incl_vat: number;
  price_excl_vat: number;
  unit: string;
}

interface PricelistsResponse {
  distributors: Record<string, Record<string, PricingRate>>;
  tariffs: string[];
  selected_distributor: string;
  selected_tariff: string;
  confirmed_distribution_price_incl_vat: number;
  confirmed_distribution_price_excl_vat: number;
  confirmed_distribution_unit: string;
  stale_warning: boolean;
  valid_from: string | null;
  year: number | null;
}

// ----------------------------------------------------------------------------
// Re-exports for tests / other tabs
// ----------------------------------------------------------------------------

export {
  PROVIDER_GUIDES,
  STEP_AI,
  keyPrefixFor,
  validateKeyShape,
} from './step-ai';

export {
  loadOnboardingState,
  completeOnboardingStep,
  skipOnboardingStep,
  verifyAiKey,
  isOnboardingDone,
  isAiStepResolved,
  EMPTY_ONBOARDING_STATE,
  ONBOARDING_STEPS,
} from './onboarding-data';

export type {
  ProviderGuide,
} from './step-ai';

export type {
  OnboardingState,
  OnboardingStepStatus,
  OnboardingStepId,
  AiVerifyResult,
} from './onboarding-data';

// ----------------------------------------------------------------------------
// Wizard-shell component
// ----------------------------------------------------------------------------

/**
 * Minimal shell — composes the three co-equal provider cards for step ①.
 * The full multi-step navigator lands in Task 14 (wiring). Until then this
 * serves as the typed, typecheck-clean rendering surface for tests.
 */
@customElement('oig-onboarding-step-ai')
export class OigOnboardingStepAi extends LitElement {
  @property({ attribute: false }) inverterSn = '';

  /**
   * Optional: when the host wizard already has onboarding state loaded
   * (F1 Plan 3.6 Task 9 bootstrap budget), pass it down instead of letting
   * this component fetch its own copy — avoids a second `/onboarding` GET
   * per wizard open. `undefined` (the default) falls back to this
   * component's own fetch, for standalone usage.
   */
  @property({ attribute: false }) onboardingState: OnboardingState | null | undefined = undefined;

  /** HA connection object — drives which language the per-provider disclosure
   * (audit gap O2/P10) renders in, same `resolveLang(hass)` pattern as the
   * wizard shell. `null` (standalone/test usage) resolves to `'cs'`. */
  @property({ attribute: false }) hass: any = null;

  private get stepLang(): Lang {
    return resolveLang(this.hass);
  }

  /** Soft-guide state — null while loading / on network error. Only used
   * when `onboardingState` is not supplied by the host. */
  @state() private state: OnboardingState | null = null;

  /** Verifying spinner state — failures still let the user continue (#5/#6). */
  @state() private verifying: string | null = null;
  @state() private lastVerify: AiVerifyResult | null = null;

  static styles = css`
    :host {
      display: block;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }
    .card {
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      border-radius: 10px;
      padding: 12px;
      background: var(--card-bg, transparent);
    }
    .card h3 { margin: 0 0 6px; font-size: 14px; }
    .card ol { padding-left: 18px; margin: 6px 0; }
    .card li { font-size: 12px; line-height: 1.45; margin-bottom: 3px; }
    .tier { font-size: 11px; opacity: 0.75; margin-top: 6px; }
    .disclosure {
      font-size: 11px;
      line-height: 1.4;
      opacity: 0.85;
      margin-top: 8px;
      padding: 6px 8px;
      border-left: 2px solid var(--divider-color, rgba(255, 255, 255, 0.25));
    }
    .paste {
      width: 100%;
      box-sizing: border-box;
      margin-top: 6px;
    }
    .verify {
      margin-top: 6px;
      font-size: 12px;
    }
    .skippable-badge {
      font-size: 10px;
      font-style: italic;
      opacity: 0.7;
      margin-left: 6px;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.onboardingState === undefined && this.inverterSn) void this.refresh();
  }

  private async refresh(): Promise<void> {
    this.state = await loadOnboardingState(this.inverterSn);
  }

  /** [Ověřit] handler — local shape check first (Task 10 mirrors it server-side). */
  private async verify(provider: string, key: string): Promise<void> {
    const shape = validateKeyShape(provider, key);
    if (!shape.ok) {
      this.lastVerify = { ok: false, provider, verified: false, reason: shape.reason };
      return;
    }
    this.verifying = provider;
    try {
      this.lastVerify = await verifyAiKey(this.inverterSn, provider, key);
    } finally {
      this.verifying = null;
    }
  }

  private renderProvider(provider: string) {
    const guide = PROVIDER_GUIDES[provider];
    if (!guide) return nothing;
    const prefix = keyPrefixFor(provider);
    return html`
      <div class="card" data-provider=${provider}>
        <h3>
          ${guide.label}
          ${STEP_AI.skippable ? html`<span class="skippable-badge">(volitelné)</span>` : nothing}
        </h3>
        ${guide.registerUrl
          ? html`<div><a href=${guide.registerUrl} target="_blank" rel="noopener">
                Registrace
              </a></div>`
          : nothing}
        ${guide.keysUrl
          ? html`<div><a href=${guide.keysUrl} target="_blank" rel="noopener">
                Správa klíčů
              </a></div>`
          : nothing}
        <ol>
          ${guide.steps.map((s) => html`<li>${s}</li>`)}
        </ol>
        ${guide.freeTier ? html`<div class="tier">${guide.freeTier}</div>` : nothing}
        <div class="disclosure" data-testid=${`disclosure-${provider}`}>
          ${t(guide.disclosureKey, this.stepLang)}
        </div>
        ${prefix
          ? html`
              <input
                class="paste"
                type="password"
                placeholder=${`API klíč (začíná ${prefix}…)`}
                @change=${(e: Event) => {
                  const v = (e.target as HTMLInputElement).value;
                  if (v) void this.verify(provider, v);
                }}
              />
              <div class="verify">
                ${this.verifying === provider
                  ? html`Ověřuji…`
                  : this.lastVerify?.provider === provider
                    ? this.lastVerify.verified
                      ? html`✓ Ověřeno`
                      : html`⚠ Neověřeno — klíč se uloží a onboarding pokračuje (#5/#6)`
                    : nothing}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  render() {
    return html`
      <section aria-labelledby="step-ai-heading">
        <h2 id="step-ai-heading">
          ① AI${STEP_AI.skippable ? html` <span class="skippable-badge">(volitelné)</span>` : nothing}
          ${(this.onboardingState !== undefined ? this.onboardingState : this.state)?.steps.ai === 'done'
            ? html`<span class="done-badge">✓ hotovo</span>`
            : nothing}
        </h2>
        <div class="grid">
          ${Object.keys(PROVIDER_GUIDES).map((p) => this.renderProvider(p))}
        </div>
      </section>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-onboarding-step-ai': OigOnboardingStepAi;
    'oig-onboarding-wizard': OigOnboardingWizard;
  }
}

// ============================================================================
// WIZARD SHELL — three skippable steps in order (Plan 3.5 item 4)
// ============================================================================

/**
 * The wizard's 10-step wizard-v2 sequence (F1 Wizard v2 plan, Stage S1 Task
 * 2): welcome → modules → ai → solar → pricing_distribution →
 * pricing_supplier → battery → boiler → connection → summary. Each content
 * step is soft/skippable per SCOPE-REVISION #5/#6 — this is a guide, never
 * a wall; welcome/summary are never individually skippable (design decision 1).
 */
const WIZARD_STEPS: ReadonlyArray<OnboardingStepId> = [
  'welcome', 'modules', 'ai', 'solar', 'pricing_distribution', 'pricing_supplier',
  'battery', 'boiler', 'connection', 'summary',
];

/**
 * Per-step display meta. `skippable` is sourced from the typed step
 * descriptors (STEP_AI / STEP_SOLAR / STEP_PRICING_DISTRIBUTION / ...) so
 * adding a new step only needs touching step-*.ts + this map — no second
 * source of truth.
 */
const STEP_LABELS: Record<OnboardingStepId, string> = {
  welcome: 'Vítejte',
  modules: 'Moduly',
  ai: 'AI',
  solar: 'Solar',
  pricing_distribution: 'Ceny — distribuce',
  pricing_supplier: 'Ceny — dodavatel',
  battery: 'Baterie a plánovač',
  boiler: 'Bojler',
  connection: 'Připojení',
  summary: 'Shrnutí',
};

// welcome/summary are not in ONBOARDING_STEPS (design decision 1) and are never
// individually skippable — Přeskočit is disabled on them regardless of this map.
const STEP_SKIPPABLE: Record<OnboardingStepId, boolean> = {
  welcome: false,
  modules: false, // gates later steps; skipping it is meaningless
  ai: STEP_AI.skippable,
  solar: STEP_SOLAR.skippable,
  pricing_distribution: STEP_PRICING_DISTRIBUTION.skippable,
  pricing_supplier: STEP_PRICING_SUPPLIER.skippable,
  battery: STEP_BATTERY.skippable,
  boiler: STEP_BOILER.skippable,
  connection: STEP_CONNECTION.skippable,
  summary: false,
};

/**
 * Which UX-SPEC phase (§table-of-contents) a step belongs to — `undefined`
 * (welcome/summary) means "spans both", per spec's own framing. Not
 * contiguous in `WIZARD_STEPS` order (pricing_supplier/battery sit between
 * two Phase-A runs), so the legend below is a static label, not a spanning
 * grid cell tied to nav button positions.
 */
const STEP_PHASE: Partial<Record<OnboardingStepId, 'A' | 'B'>> = {
  modules: 'A', ai: 'A', solar: 'A', pricing_distribution: 'A', boiler: 'A', connection: 'A',
  pricing_supplier: 'B', battery: 'B',
};
const PHASE_LABELS = { A: 'Nastavuje se jednou', B: 'Mění se v čase' } as const;

/** Steps gated by a modules-step toggle (UX-SPEC table-of-contents "New install" column). */
const STEP_GATE: Partial<Record<OnboardingStepId, string>> = {
  ai: '', // AI is never gated by a modules toggle — always shown (optional, not conditional)
  solar: 'enable_solar_forecast',
  pricing_distribution: 'enable_pricing',
  pricing_supplier: 'enable_pricing',
  battery: 'enable_battery_prediction',
  boiler: 'enable_boiler',
};

/**
 * `pricing_supplier` registry keys the LEGACY options-flow already wrote
 * before wizard v2 existed (RCA-R3, UX-SPEC §3) — the original 19-key set,
 * excluding the 5 `_nt`-variant keys added in round 2 (§4a), which are net
 * new and cannot pre-exist in any entry. Mirrors
 * `PricingSupplierConfig` (`data/settings-data.ts`) minus its `*_nt` fields.
 */
const LEGACY_PRICING_SUPPLIER_KEYS: ReadonlyArray<string> = [
  'spot_pricing_model', 'spot_positive_fee_percent', 'spot_negative_fee_percent',
  'spot_fixed_fee_mwh', 'fixed_commercial_price_vt', 'fixed_commercial_price_nt',
  'export_pricing_model', 'export_fee_percent', 'export_fixed_fee_czk', 'export_fixed_price',
  'distribution_fee_vt_kwh', 'distribution_fee_nt_kwh', 'vat_rate',
  'tariff_vt_start_weekday', 'tariff_nt_start_weekday', 'tariff_weekend_same_as_weekday',
  'tariff_vt_start_weekend', 'tariff_nt_start_weekend', 'dual_tariff_enabled',
];

const STEP_STATUS_LABELS: Record<OnboardingStepStatus, string> = {
  pending: 'pending',
  done: 'done',
  skipped: 'skipped',
};

/**
 * `POST /{sn}/solar_test` result shape — mirrors
 * `run_solar_candidate_test`'s success dict (`forecast/candidate_test.py`).
 */
interface SolarTestResult {
  tomorrow_total_kwh: number;
  forecast_covers_tomorrow: boolean;
}

/**
 * Per-bootstrap-endpoint outcome (F1 Plan 3.6 Task 9 rework, finding #1).
 * `pending` covers both "still in flight" and "never settled" — the 5s
 * deadline treats anything that isn't `success` as needing a retry,
 * including an endpoint that was `aborted` at the 3s mark: an abort makes
 * the underlying fetch SETTLE (real `fetchOIGAPI` catches it and resolves
 * to `null`), so a plain settled/unsettled boolean can't tell "aborted"
 * apart from "succeeded" — that conflation was the bug.
 */
type BootstrapOutcome = 'pending' | 'success' | 'aborted' | 'failed';

/**
 * Q1 wire schema (plan §Task 6): registry key names verbatim, with ONE fixed
 * rename — `solar_forecast_provider` → `provider` — plus one exclusion:
 * `solar_forecast_mode` is registry-visible but not part of the schema the
 * backend (`_SOLAR_TEST_ALLOWED_KEYS`, `ha_rest_api.py`) accepts.
 */
const SOLAR_TEST_WIRE_RENAME: Readonly<Record<string, string>> = {
  solar_forecast_provider: 'provider',
};
const SOLAR_TEST_ALLOWED_WIRE_KEYS: ReadonlySet<string> = new Set([
  'provider',
  'solar_forecast_api_key',
  'solcast_api_key',
  'solcast_site_id',
  'solar_forecast_latitude',
  'solar_forecast_longitude',
  'solar_forecast_string1_enabled',
  'solar_forecast_string1_kwp',
  'solar_forecast_string1_declination',
  'solar_forecast_string1_azimuth',
  'solar_forecast_string2_enabled',
  'solar_forecast_string2_kwp',
  'solar_forecast_string2_declination',
  'solar_forecast_string2_azimuth',
]);

/** Readable message per classified `/solar_test` error code, i18n-routed. */
const SOLAR_TEST_ERROR_CODE_KEYS: Readonly<Record<string, OnboardingKey>> = {
  timeout: 'onboarding.solar_test.error.timeout',
  auth: 'onboarding.solar_test.error.auth',
  provider_unreachable: 'onboarding.solar_test.error.provider_unreachable',
  rate_limited: 'onboarding.solar_test.error.rate_limited',
  invalid_response: 'onboarding.solar_test.error.invalid_response',
  aborted: 'onboarding.solar_test.error.aborted',
};

function solarTestErrorMessage(code: string, lang: Lang): string | undefined {
  const key = SOLAR_TEST_ERROR_CODE_KEYS[code];
  return key ? t(key, lang) : undefined;
}

/** Shape of a `/module_config` GET — every registry section, keyed loosely
 * since not every section is populated in every fixture/response. */
type ModuleConfigDoc = Partial<Record<string, Record<string, unknown>>>;

/**
 * Flatten a `/module_config` response into one cross-section map for
 * review-mode diff hints (UX-SPEC §3) — registry keys are globally unique
 * across sections (verified: no collision across modules/battery/solar/
 * boiler/pricing/pricing_supplier/basic in `config_registry.py`). Secret
 * fields never appear here — the backend emits only their `{key}_set` flag,
 * never the value itself.
 */
function flattenModuleConfig(doc: ModuleConfigDoc): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const section of Object.values(doc)) {
    if (!section) continue;
    for (const [key, value] of Object.entries(section)) {
      if (key.endsWith('_set')) continue;
      out[key] = value;
    }
  }
  return out;
}

/** Display string for a step-9 diff-table cell — humanized bool, em dash for
 * empty, raw value otherwise (Stage S2 Task 9). */
function formatDiffValue(value: unknown): string {
  if (typeof value === 'boolean') return value ? 'Zapnuto' : 'Vypnuto';
  if (value == null || value === '') return '—';
  return String(value);
}

/**
 * Wizard shell — opens in response to a `launch-onboarding` CustomEvent and
 * routes the three independent onboarding steps in order. Closing returns
 * the user to the dashboard (the dashboard is NEVER replaced — SCOPE #6).
 *
 * The user can:
 *   - click the step indicator to jump to any step (no lock/gate; #6)
 *   - click [Zpět] / [Další] for linear navigation
 *   - click [Přeskočit] on any skippable step
 *   - click × or the backdrop to close and return to the dashboard
 *
 * Step content:
 *   - ① AI   → reuses the typed <oig-onboarding-step-ai> renderer
 *   - ② Solar → brief description + pointer to Nastavení tab (P5: no second
 *               field list — fields live in the registry, rendered once
 *               by the Settings tab)
 *   - ③ Pricing → brief description + pointer to the Ceny tab (same reason)
 */
@customElement('oig-onboarding-wizard')
export class OigOnboardingWizard extends LitElement {
  /** Open the wizard. The parent (oig-app) flips this on `launch-onboarding`. */
  @property({ type: Boolean, reflect: true }) open = false;

  /** Inverter SN — forwarded to the AI step so verify/storage work end-to-end. */
  @property({ attribute: false }) inverterSn = '';

  /** HA connection object — `resolveLang(hass)` drives which language the
   * catalog in `i18n/onboarding.ts` renders, same pattern as `boilerLang`
   * in `ui/app.ts`. `null` (standalone/test usage) resolves to `'cs'`. */
  @property({ attribute: false }) hass: any = null;

  private get wizardLang(): Lang {
    return resolveLang(this.hass);
  }

  /** Internal step routing — single source of truth is `visibleWizardSteps()`. */
  @state() private currentStep: OnboardingStepId = 'welcome';
  /**
   * Modules step draft (Stage S3 wires the real step body, seeded from the
   * `modules` registry section / `entry.options`). `STEP_GATE` reads it to
   * decide which content steps are currently reachable. Stubbed here with
   * every gate defaulted on so the shell's nav shows all 10 steps until the
   * real modules step lands — the plan's own S1 done-criteria for this task
   * requires Task 2/3's "every module on" nav assertions to keep passing.
   */
  @state() private modulesDraft: Record<string, unknown> = {
    enable_solar_forecast: true,
    enable_pricing: true,
    enable_battery_prediction: true,
    enable_boiler: true,
  };
  @state() private onboardingState: OnboardingState | null = null;
  @state() private pricing: PricelistsResponse | null = null;
  @state() private pricingLoading = false;
  @state() private pricingLoadFailed = false;
  @state() private finishing = false;
  @state() private finishError: string | null = null;
  private _onboardingStateLoadedFor: string | null = null;

  /** Pricing step: draft form values, seeded from the persisted module_config
   * `pricing` section (Task 7) — never re-fetched for step navigation. */
  private _pricingConfigLoaded = false;
  @state() private pricingDraft: Record<string, unknown> = {};

  /**
   * Every section's entry.options-derived value, flattened and frozen once
   * per wizard open (UX-SPEC §3 "snapshotted once at wizard open") — a peer
   * to `solarDraft`/`pricingDraft`, never itself edited by the user. Drives
   * every step's diff hint (Task 7) and the step-9 diff table (Task 9).
   */
  @state() private originalValues: Record<string, unknown> = {};

  /** Solar step: registry cached per open (never re-fetched for step navigation). */
  private _registry: FieldRegistry | null = null;
  private _registryLoaded = false;
  @state() private solarDraft: Record<string, unknown> = {};

  /** [Otestovat] — Task 6. */
  @state() private solarTestLoading = false;
  @state() private solarTestResult: SolarTestResult | null = null;
  @state() private solarTestError: { code: string; message: string } | null = null;
  /**
   * True only right after a successful test for the values currently in the
   * draft (Q2) — Task 8's `goNext` reads this to decide whether the solar
   * step may complete. Cleared on any solar field edit (a stale success must
   * not silently count as done for edited values). Not private: Task 8 reads
   * it from outside this class's own methods.
   */
  @state() solarTestMatchesDraft = false;

  /**
   * Bounded bootstrap (F1 Plan 3.6 Task 9, R10.2/R9.2). One `AbortController`
   * per open, shared by the four bootstrap fetches (onboarding state, solar
   * registry, pricelists, pricing module_config): a 3 s timer aborts it,
   * and an INDEPENDENT 5 s timer force-marks any resource not yet settled as
   * needing a retry — independent because an aborted fetch is not guaranteed
   * to reject promptly (or at all) in every environment.
   */
  private _bootstrapController: AbortController | null = null;
  private _bootstrapAbortTimer: ReturnType<typeof setTimeout> | null = null;
  private _bootstrapDeadlineTimer: ReturnType<typeof setTimeout> | null = null;
  private _onboardingStateOutcome: BootstrapOutcome = 'pending';
  private _registryOutcome: BootstrapOutcome = 'pending';
  private _pricingOutcome: BootstrapOutcome = 'pending';
  private _pricingConfigOutcome: BootstrapOutcome = 'pending';
  @state() private bootstrapRetry = {
    onboardingState: false,
    registry: false,
    pricing: false,
    pricingConfig: false,
  };

  static styles = css`
    ${fieldStyles}

    :host {
      display: contents;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.18s ease;
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    .modal {
      width: min(720px, calc(100vw - 32px));
      max-height: calc(100vh - 48px);
      overflow: auto;
      background: var(--card-bg, #1d2330);
      color: inherit;
      border-radius: 14px;
      box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
      display: flex;
      flex-direction: column;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 14px 18px;
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.12));
    }

    header h2 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
    }

    button.close {
      background: transparent;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.18));
      color: inherit;
      border-radius: 8px;
      width: 30px; height: 30px;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
    }

    .phase-legend {
      display: flex;
      gap: 14px;
      padding: 8px 18px 0;
      font-size: 11px;
      opacity: 0.7;
    }

    .phase-chip strong {
      font-weight: 600;
      margin-right: 4px;
    }

    nav.steps {
      display: flex;
      gap: 6px;
      padding: 10px 18px;
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
      background: rgba(255, 255, 255, 0.02);
      overflow-x: auto;
    }

    nav.steps button {
      flex: 1;
      padding: 8px 10px;
      border-radius: 8px;
      border: 1px solid transparent;
      background: transparent;
      color: inherit;
      cursor: pointer;
      font-size: 13px;
      min-width: 0;
    }

    nav.steps button.active {
      border-color: var(--primary-color, #4f7cff);
      background: color-mix(in srgb, var(--primary-color, #4f7cff) 12%, transparent);
      font-weight: 600;
    }

    .content {
      padding: 16px 18px;
      min-height: 120px;
      overflow-y: auto;
    }

    .step-card {
      font-size: 14px;
      line-height: 1.5;
    }

    .step-card p { margin: 0 0 8px; }

    footer {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      padding: 12px 18px 16px;
      border-top: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
    }

    footer button {
      padding: 8px 14px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.18));
      background: var(--card-bg, transparent);
      color: inherit;
      cursor: pointer;
      font: inherit;
    }

    footer button.primary {
      background: var(--primary-color, #4f7cff);
      border-color: transparent;
      color: #fff;
      font-weight: 600;
    }

    footer button.skip {
      font-style: italic;
    }

    footer button:disabled { opacity: 0.4; cursor: not-allowed; }

    .step-status {
      display: block;
      margin-top: 2px;
      font-size: 11px;
      opacity: 0.72;
      font-weight: 400;
    }

    .finish-status {
      padding: 0 18px 12px;
      display: flex;
      gap: 10px;
      align-items: center;
      flex-wrap: wrap;
    }

    .finish-status p {
      margin: 0;
      font-size: 13px;
      color: var(--error-color, #ff8a80);
    }

    .finish-status button {
      padding: 7px 12px;
      border-radius: 8px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.18));
      background: var(--card-bg, transparent);
      color: inherit;
      cursor: pointer;
      font: inherit;
    }
  `;

  private async refreshOnboardingState(force = false, signal?: AbortSignal): Promise<void> {
    if (!this.inverterSn) return;
    if (!force && this._onboardingStateLoadedFor === this.inverterSn) return;
    this._onboardingStateLoadedFor = this.inverterSn;
    try {
      this.onboardingState = await loadOnboardingState(this.inverterSn, signal);
      this._onboardingStateOutcome = signal?.aborted ? 'aborted' : this.onboardingState !== null ? 'success' : 'failed';
    } catch {
      this._onboardingStateOutcome = signal?.aborted ? 'aborted' : 'failed';
    } finally {
      if (this._onboardingStateOutcome === 'success' && this.bootstrapRetry.onboardingState) {
        this.bootstrapRetry = { ...this.bootstrapRetry, onboardingState: false };
      }
    }
  }

  private completeCurrentStepIfNeeded(): Promise<void> | void {
    if (!this.inverterSn) return;
    if (this.currentStep === 'solar' && !this.solarTestMatchesDraft) return;

    return this.persistCurrentStep();
  }

  private async persistCurrentStep(): Promise<void> {
    try {
      const state = await completeOnboardingStep(this.inverterSn, this.currentStep);
      if (state) this.onboardingState = state;
      this.dispatchEvent(new CustomEvent('onboarding-changed', {
        bubbles: true,
        composed: true,
      }));
    } catch {
      // Soft guide: failed per-step persistence must not block navigation.
    }
  }

  private finishErrorMessage(code: string, error?: string): string {
    if (code === 'finish_in_progress') {
      return t('onboarding.finish.error.in_progress', this.wizardLang);
    }
    if (code === 'finish_save_failed') {
      return t('onboarding.finish.error.save_failed', this.wizardLang);
    }
    return error || t('onboarding.finish.error.generic', this.wizardLang);
  }

  /**
   * Every seeded section draft, paired with its `SettingsSection` name for
   * `saveModuleConfig` (Stage S2 Task 10) — `modulesDraft` is excluded, same
   * reason as `allDraftValues()` (`:1157-1166`): it isn't seeded from
   * `entry.options` yet, so it never has a genuine "changed" field to save.
   */
  private sectionDrafts(): Array<{ section: SettingsSection; draft: Record<string, unknown> }> {
    return [
      { section: 'solar', draft: this.solarDraft },
      { section: 'pricing', draft: this.pricingDraft },
    ];
  }

  /**
   * Single final save (UX-SPEC §3): write only the fields that differ from
   * `originalValues`, one `saveModuleConfig` call per section that has any,
   * and nothing for a section with no changes. Called once, from
   * `sendFinishRequest` — no per-step auto-save anywhere else in the wizard.
   */
  private async saveAllChangedSections(): Promise<void> {
    for (const { section, draft } of this.sectionDrafts()) {
      const changed: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(draft)) {
        if (String(this.originalValues[key]) !== String(value)) changed[key] = value;
      }
      if (Object.keys(changed).length > 0) {
        await saveModuleConfig(section, changed);
      }
    }
  }

  private async sendFinishRequest(): Promise<void> {
    await this.saveAllChangedSections();
    const result = await haClient.fetchOIGAPITyped<OnboardingState>(
      `/${this.inverterSn}/onboarding`,
      { method: 'POST', body: JSON.stringify({ action: 'finish' }) },
    );
    if (!result.ok) {
      this.finishError = this.finishErrorMessage(result.code, result.error);
      return;
    }
    if (result.data) this.onboardingState = result.data;
    this.dispatchEvent(new CustomEvent('onboarding-changed', {
      bubbles: true,
      composed: true,
    }));
    this.close();
  }

  private async finish(): Promise<void> {
    if (!this.inverterSn) {
      this.close();
      return;
    }
    if (this.finishing) return;

    this.finishing = true;
    this.finishError = null;
    try {
      await this.sendFinishRequest();
    } finally {
      this.finishing = false;
    }
  }

  /**
   * `WIZARD_STEPS` filtered to steps whose gating module toggle (if any) is
   * on — the single source of truth for both nav rendering and step-advance
   * logic (Task 4). A step with no entry in `STEP_GATE` is always visible.
   */
  private visibleWizardSteps(): OnboardingStepId[] {
    return WIZARD_STEPS.filter((s) => {
      const gate = STEP_GATE[s];
      return !gate || !!this.modulesDraft[gate];
    });
  }

  private async advanceFromCurrentStep(): Promise<void> {
    const steps = this.visibleWizardSteps();
    const i = steps.indexOf(this.currentStep);
    if (i < 0) return;
    if (i >= steps.length - 1) {
      await this.finish();
      return;
    }
    this.finishError = null;
    this.currentStep = steps[i + 1];
  }

  private async goNext(): Promise<void> {
    const steps = this.visibleWizardSteps();
    const i = steps.indexOf(this.currentStep);
    if (i < 0) return;

    if (i >= steps.length - 1) {
      if (this.finishing) return;
      this.finishing = true;
      this.finishError = null;
      try {
        const completion = this.completeCurrentStepIfNeeded();
        if (completion) await completion;
        if (!this.inverterSn) {
          this.close();
        } else {
          await this.sendFinishRequest();
        }
      } finally {
        this.finishing = false;
      }
      return;
    }

    const completion = this.completeCurrentStepIfNeeded();
    if (completion) await completion;
    this.finishError = null;
    this.currentStep = steps[i + 1];
  }

  private goPrev(): void {
    const steps = this.visibleWizardSteps();
    const i = steps.indexOf(this.currentStep);
    if (i <= 0) return;
    this.currentStep = steps[i - 1];
  }

  /**
   * Přeskočit — persist a skip for the current step, then advance. Always
   * permitted (#5: every step skippable). The persist is best-effort: a network
   * failure must never trap the user (soft guide — #6), so we advance regardless
   * and let the dashboard refresh reconcile state on close.
   */
  private async skip(): Promise<void> {
    if (this.inverterSn) {
      try {
        const state = await skipOnboardingStep(this.inverterSn, this.currentStep);
        if (state) this.onboardingState = state;
        this.dispatchEvent(new CustomEvent('onboarding-changed', {
          bubbles: true,
          composed: true,
        }));
      } catch {
        // Soft guide: a failed skip must not wall the user — advance anyway.
      }
    }
    await this.advanceFromCurrentStep();
  }

  private close(): void {
    this.open = false;
    this.stopBootstrap();
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  /**
   * Seed `solarDraft` from `originalValues` (entry.options, via
   * `/module_config`'s `solar` section) FIRST, the registry's own `default`
   * only for a field genuinely unset either way (Stage S2 Task 8, UX-SPEC
   * §3) — never a fabricated value for a field with no live source (GPS).
   * Idempotent and safe to call from either bootstrap loader, in either
   * order: the registry fetch and the module_config fetch settle
   * independently, and whichever settles second produces the correct seed.
   */
  private seedSolarDraft(): void {
    if (!this._registry) return;
    const draft: Record<string, unknown> = {};
    for (const f of STEP_SOLAR.fields(this._registry)) {
      const spec = this._registry.fields[f.key];
      const seeded = this.originalValues[f.key] ?? spec?.default;
      if (seeded !== undefined) draft[f.key] = seeded;
    }
    this.solarDraft = draft;
  }

  private async loadSolarRegistry(signal?: AbortSignal): Promise<void> {
    if (this._registryLoaded) return;
    this._registryLoaded = true;
    try {
      this._registry = await loadFieldRegistry(signal);
      this._registryOutcome = signal?.aborted ? 'aborted' : this._registry !== null ? 'success' : 'failed';
      this.seedSolarDraft();
    } catch {
      this._registry = null;
      this._registryOutcome = signal?.aborted ? 'aborted' : 'failed';
    } finally {
      if (this._registryOutcome === 'success' && this.bootstrapRetry.registry) {
        this.bootstrapRetry = { ...this.bootstrapRetry, registry: false };
      }
    }
  }

  /** Task 7: prefill the pricing draft from the persisted `module_config`
   * `pricing` section — NOT from `/pricelists`' dataset-suggested default,
   * so a real confirm round-trips instead of re-showing the same guess. */
  private async loadPricingConfig(signal?: AbortSignal): Promise<void> {
    if (this._pricingConfigLoaded || !this.inverterSn) return;
    this._pricingConfigLoaded = true;
    try {
      const data = await haClient.fetchOIGAPI<ModuleConfigDoc | null>(
        `/${this.inverterSn}/module_config`,
        { signal },
      );
      this._pricingConfigOutcome = signal?.aborted ? 'aborted' : data !== null ? 'success' : 'failed';
      if (data) {
        this.originalValues = Object.freeze(flattenModuleConfig(data));
        if (data.pricing) this.pricingDraft = { ...data.pricing };
        this.seedSolarDraft(); // re-seed if the registry already settled first
      }
    } catch {
      this._pricingConfigOutcome = signal?.aborted ? 'aborted' : 'failed';
    } finally {
      if (this._pricingConfigOutcome === 'success' && this.bootstrapRetry.pricingConfig) {
        this.bootstrapRetry = { ...this.bootstrapRetry, pricingConfig: false };
      }
    }
  }

  /**
   * One `AbortController` per open (F1 Plan 3.6 Task 9): fans out the four
   * bootstrap fetches, aborts them at 3 s, and — independent of whether the
   * abort actually unblocked anything — force-marks whatever hasn't settled
   * by 5 s as needing a retry. Never disables `wizard-close`/`wizard-skip`/
   * dashboard nav; only the affected step's content shows a retry control.
   * A NEW open (mount, or `open`/`inverterSn` flipping while mounted) always
   * gets a fresh controller and re-fetches — cached results only survive
   * step navigation within the SAME open.
   */
  private startBootstrap(): void {
    this.stopBootstrap();

    const controller = new AbortController();
    this._bootstrapController = controller;

    this._onboardingStateLoadedFor = null;
    this._onboardingStateOutcome = 'pending';
    this._registryLoaded = false;
    this._registry = null;
    this._registryOutcome = 'pending';
    this._pricingConfigLoaded = false;
    this._pricingConfigOutcome = 'pending';
    this._pricingOutcome = 'pending';
    this.originalValues = {};
    this.pricing = null;
    this.pricingLoadFailed = false;
    this.bootstrapRetry = { onboardingState: false, registry: false, pricing: false, pricingConfig: false };

    this._bootstrapAbortTimer = setTimeout(() => {
      if (this._bootstrapController === controller) controller.abort();
    }, 3000);

    this._bootstrapDeadlineTimer = setTimeout(() => {
      if (this._bootstrapController !== controller) return;
      this.bootstrapRetry = {
        onboardingState: this._onboardingStateOutcome !== 'success',
        registry: this._registryOutcome !== 'success',
        pricing: this._pricingOutcome !== 'success',
        pricingConfig: this._pricingConfigOutcome !== 'success',
      };
    }, 5000);

    void this.refreshOnboardingState(true, controller.signal);
    void this.refreshPricing(controller.signal);
    void this.loadSolarRegistry(controller.signal);
    void this.loadPricingConfig(controller.signal);
  }

  /**
   * Finding #2: closing the mounted wizard must stop the in-flight bootstrap
   * the same way a remount/unmount would — abort the controller and clear
   * BOTH timers, so a closed wizard leaves no pending request or queued
   * timer behind. Shared by `close()` and `disconnectedCallback()`.
   */
  private stopBootstrap(): void {
    if (this._bootstrapAbortTimer !== null) {
      clearTimeout(this._bootstrapAbortTimer);
      this._bootstrapAbortTimer = null;
    }
    if (this._bootstrapDeadlineTimer !== null) {
      clearTimeout(this._bootstrapDeadlineTimer);
      this._bootstrapDeadlineTimer = null;
    }
    this._bootstrapController?.abort();
  }

  private retrySolarBootstrap(): void {
    this.bootstrapRetry = { ...this.bootstrapRetry, registry: false };
    this._registryLoaded = false;
    void this.loadSolarRegistry();
  }

  private retryPricingBootstrap(): void {
    this.bootstrapRetry = { ...this.bootstrapRetry, registry: false, pricing: false, pricingConfig: false };
    this._registryLoaded = false;
    this._pricingConfigLoaded = false;
    this.pricingLoadFailed = false;
    void this.loadSolarRegistry();
    void this.refreshPricing();
    void this.loadPricingConfig();
  }

  private retryOnboardingStateBootstrap(): void {
    this.bootstrapRetry = { ...this.bootstrapRetry, onboardingState: false };
    this._onboardingStateLoadedFor = null;
    void this.refreshOnboardingState(true);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopBootstrap();
  }

  /** Q1: registry values → the exact `/solar_test` wire body, no extra keys. */
  private buildSolarTestBody(): Record<string, unknown> {
    const body: Record<string, unknown> = {};
    if (!this._registry) return body;
    const visible = STEP_SOLAR.visibleFields(this._registry, this.solarDraft);
    for (const f of visible) {
      const wireKey = SOLAR_TEST_WIRE_RENAME[f.key] ?? f.key;
      if (!SOLAR_TEST_ALLOWED_WIRE_KEYS.has(wireKey)) continue;
      body[wireKey] = this.solarDraft[f.key];
    }
    return body;
  }

  /** [Otestovat] — side-effect-free probe of the unsaved draft values (Task 6). */
  private async runSolarTest(): Promise<void> {
    if (!this.inverterSn || this.solarTestLoading) return;
    this.solarTestLoading = true;
    this.solarTestResult = null;
    this.solarTestError = null;

    const result = await haClient.fetchOIGAPITyped<SolarTestResult>(
      `/${this.inverterSn}/solar_test`,
      { method: 'POST', body: JSON.stringify(this.buildSolarTestBody()) },
    );

    this.solarTestLoading = false;
    if (result.ok) {
      this.solarTestResult = result.data;
      this.solarTestMatchesDraft = true;
    } else {
      this.solarTestError = {
        code: result.code,
        message: solarTestErrorMessage(result.code, this.wizardLang) ?? result.error ?? t('onboarding.solar_test.error.generic', this.wizardLang),
      };
      this.solarTestMatchesDraft = false;
    }
  }

  protected updated(changedProperties: Map<string, unknown>): void {
    super.updated(changedProperties);
    if (
      (changedProperties.has('open') || changedProperties.has('inverterSn')) &&
      this.open &&
      this.inverterSn
    ) {
      this.startBootstrap();
    }
  }

  private async refreshPricing(signal?: AbortSignal): Promise<void> {
    if (!this.inverterSn || this.pricingLoading) {
      return;
    }
    this.pricingLoading = true;
    this.pricingLoadFailed = false;
    try {
      this.pricing = await haClient.fetchOIGAPI<PricelistsResponse>(
        `/${this.inverterSn}/pricelists`,
        { signal },
      );
      this._pricingOutcome = signal?.aborted ? 'aborted' : this.pricing !== null ? 'success' : 'failed';
    } catch {
      this.pricing = null;
      this.pricingLoadFailed = true;
      this._pricingOutcome = signal?.aborted ? 'aborted' : 'failed';
    } finally {
      this.pricingLoading = false;
      if (this._pricingOutcome === 'success' && this.bootstrapRetry.pricing) {
        this.bootstrapRetry = { ...this.bootstrapRetry, pricing: false };
      }
    }
  }

  private jumpTo(step: OnboardingStepId): void {
    this.currentStep = step;
  }

  /** Order index of the current step — drives disabled-state and labels. */
  private currentIndex(): number {
    return this.visibleWizardSteps().indexOf(this.currentStep);
  }

  /**
   * "We recovered these values" note (UX-SPEC §3) — shown only for a true
   * recovered case: pricing enabled, at least one legacy `pricing_supplier`
   * key present in the entry.options snapshot, AND the entry predates
   * wizard v2 (grandfathered) — never for a fresh install that merely
   * happens to match a registry default.
   */
  private showRecoveredPricingNote(): boolean {
    return !!this.modulesDraft.enable_pricing
      && this.onboardingState?.grandfathered === true
      && Object.keys(this.originalValues).some((k) => LEGACY_PRICING_SUPPLIER_KEYS.includes(k));
  }

  /**
   * Module toggles turned OFF this session, review mode only (UX-SPEC §3) —
   * a toggle whose `originalValues` snapshot was `true`, now `false` in
   * `modulesDraft`. New-install has nothing to lose yet (nothing was ever
   * on), so it never gates this warning.
   */
  private turnedOffModuleKeys(): string[] {
    if (this.onboardingState?.grandfathered !== true) return [];
    return Object.keys(this.modulesDraft).filter((key) =>
      this.originalValues[key] === true && this.modulesDraft[key] === false,
    );
  }

  /**
   * Every currently-seeded section draft, flattened (Stage S2 Task 9) —
   * `modulesDraft` is deliberately EXCLUDED: it is still Task 2's
   * every-gate-on stub (`:476-481`), not yet seeded from `entry.options`
   * (Stage S3 Task 21 does that), so diffing it against `originalValues`
   * would produce false-positive rows for a value the user never touched.
   * Stage S3 must add its new drafts (battery/boiler/connection/
   * pricing_supplier) here once each is properly seeded.
   */
  private allDraftValues(): Record<string, unknown> {
    return { ...this.solarDraft, ...this.pricingDraft };
  }

  /** One row per field whose current draft value differs from its
   * `originalValues` snapshot — unchanged fields are omitted (UX-SPEC §3:
   * "a wall of 'X → X' rows defeats the purpose"). */
  private summaryDiffRows(): Array<{ key: string; oldValue: unknown; newValue: unknown }> {
    return Object.entries(this.allDraftValues())
      .filter(([key, value]) => String(this.originalValues[key]) !== String(value))
      .map(([key, value]) => ({ key, oldValue: this.originalValues[key], newValue: value }));
  }

  private renderStepContent() {
    if (this.currentStep === 'welcome') {
      const isReview = this.onboardingState?.grandfathered === true; // design decision 3
      return html`
        <section class="step step-welcome" data-step="welcome">
          <h3>${STEP_LABELS.welcome}</h3>
          <div class="step-card">
            <p>${t(isReview ? 'onboarding.welcome.review' : 'onboarding.welcome.new_install', this.wizardLang)}</p>
          </div>
        </section>`;
    }

    if (this.currentStep === 'ai') {
      // Reuse the typed AI renderer (provider cards + key verify). It owns
      // its own verify state — but shares the wizard's already-bootstrapped
      // onboarding state (Task 9 budget) instead of fetching its own copy.
      return html`<oig-onboarding-step-ai
        class="step step-ai"
        .inverterSn=${this.inverterSn}
        .onboardingState=${this.onboardingState}
        .hass=${this.hass}
      ></oig-onboarding-step-ai>`;
    }

    if (this.currentStep === 'solar') {
      if (this.bootstrapRetry.registry) {
        return html`
          <section class="step step-solar" data-step="solar">
            <h3>② Solar</h3>
            <div class="step-card">
              <p data-testid="solar-bootstrap-retry">${t('onboarding.bootstrap.load_failed', this.wizardLang)}</p>
              <button
                type="button"
                data-testid="solar-bootstrap-retry-button"
                @click=${() => this.retrySolarBootstrap()}
              >${t('onboarding.bootstrap.retry_button', this.wizardLang)}</button>
            </div>
          </section>
        `;
      }
      if (!this._registry || STEP_SOLAR.fields(this._registry).length === 0) {
        return html`
          <section class="step step-solar" data-step="solar">
            <h3>② Solar</h3>
            <div class="step-card">
              <p data-testid="solar-not-available">
                Solární pole nejsou k dispozici.
              </p>
            </div>
          </section>
        `;
      }

      const visible = STEP_SOLAR.visibleFields(this._registry, this.solarDraft);
      const allStringsHidden = !this.solarDraft['solar_forecast_string1_enabled'] &&
        !this.solarDraft['solar_forecast_string2_enabled'];

      return html`
        <section class="step step-solar" data-step="solar">
          <h3>② Solar</h3>
          <div class="step-card">
            ${allStringsHidden
              ? html`<p data-testid="solar-all-hidden" class="hint">
                  Povolte alespoň jeden string pro zobrazení polí výkonu a orientace.
                </p>`
              : nothing}
            ${visible.map((f) =>
              renderFieldPresenter(f, {
                value: this.solarDraft[f.key],
                dirty: false,
                secretSet: false,
                originalValue: this.originalValues[f.key],
                reviewMode: this.onboardingState?.grandfathered === true,
                onChange: (v: unknown) => {
                  this.solarDraft = { ...this.solarDraft, [f.key]: v };
                  this.solarTestMatchesDraft = false;
                },
                entityCatalog: [],
              }),
            )}
            <button
              type="button"
              data-testid="solar-test"
              ?disabled=${this.solarTestLoading}
              @click=${() => void this.runSolarTest()}
            >${this.solarTestLoading ? 'Testuji…' : 'Otestovat'}</button>
            ${this.solarTestResult
              ? html`<p data-testid="solar-test-success">
                  Odhad na zítra: ${this.solarTestResult.tomorrow_total_kwh} kWh
                  ${this.solarTestResult.forecast_covers_tomorrow ? nothing : html` (neúplná předpověď)`}
                </p>`
              : nothing}
            ${this.solarTestError
              ? html`<p data-testid="solar-test-error">${this.solarTestError.message}</p>`
              : nothing}
          </div>
        </section>
      `;
    }

    if (this.currentStep === 'pricing_distribution' || this.currentStep === 'pricing_supplier') {
      // Bootstrap plumbing is shared with the (Stage S3) field bodies — the
      // retry affordance is shell behaviour, not step content, so it stays.
      if (this.bootstrapRetry.pricing || this.bootstrapRetry.pricingConfig) {
        return html`
          <section class="step step-stub" data-step=${this.currentStep}>
            <h3>${STEP_LABELS[this.currentStep]}</h3>
            <div class="step-card">
              <p data-testid="pricing-bootstrap-retry">${t('onboarding.bootstrap.load_failed', this.wizardLang)}</p>
              <button
                type="button"
                data-testid="pricing-bootstrap-retry-button"
                @click=${() => this.retryPricingBootstrap()}
              >${t('onboarding.bootstrap.retry_button', this.wizardLang)}</button>
            </div>
          </section>
        `;
      }
      return html`
        <section class="step step-stub" data-step=${this.currentStep}>
          <h3>${STEP_LABELS[this.currentStep]}</h3>
          <div class="step-card">
            ${this.currentStep === 'pricing_supplier' && this.showRecoveredPricingNote()
              ? html`<p data-testid="recovered-pricing-note" class="hint">
                  ${t('onboarding.pricing_supplier.recovered_note', this.wizardLang)}
                </p>`
              : nothing}
            <p data-testid="step-stub-placeholder">
              ${this.pricingLoadFailed || Object.keys(this.pricingDraft).length === 0
                ? 'Ceny nejsou dostupné.'
                : 'Tento krok bude doplněn v další verzi průvodce.'}
            </p>
          </div>
        </section>
      `;
    }

    if (this.currentStep === 'modules') {
      const turnedOff = this.turnedOffModuleKeys();
      return html`
        <section class="step step-stub" data-step="modules">
          <h3>${STEP_LABELS.modules}</h3>
          <div class="step-card">
            ${turnedOff.length > 0
              ? html`<p data-testid="module-off-warning" class="hint">
                  ${t('onboarding.modules.off_warning', this.wizardLang)}
                </p>`
              : nothing}
            <p data-testid="step-stub-placeholder">
              Tento krok bude doplněn v další verzi průvodce.
            </p>
          </div>
        </section>
      `;
    }

    if (this.currentStep === 'summary') {
      const isReview = this.onboardingState?.grandfathered === true; // design decision 3
      if (isReview) {
        // Full diff table (UX-SPEC §3): "review mode... full diff table is
        // this step's entire content, not a generic summary."
        const rows = this.summaryDiffRows();
        return html`
          <section class="step step-summary" data-step="summary">
            <h3>${STEP_LABELS.summary}</h3>
            <div class="step-card">
              ${rows.length === 0
                ? html`<p data-testid="summary-diff-empty">${t('onboarding.summary.diff_empty', this.wizardLang)}</p>`
                : html`
                    <table data-testid="summary-diff-table">
                      <thead><tr><th>Pole</th><th>Bylo</th><th>Nyní</th></tr></thead>
                      <tbody>
                        ${rows.map((r) => html`
                          <tr data-testid="summary-diff-row">
                            <td>${fieldLabel(r.key, `field.${r.key}.label`)}</td>
                            <td>${formatDiffValue(r.oldValue)}</td>
                            <td>${formatDiffValue(r.newValue)}</td>
                          </tr>
                        `)}
                      </tbody>
                    </table>
                  `}
              <p>${t('onboarding.summary.confirm_notice', this.wizardLang)}</p>
            </div>
          </section>
        `;
      }

      // New install: flat "toto se vytvoří" confirm list (Stage S1 Task 5).
      const enabledModules = Object.entries(this.modulesDraft)
        .filter(([key, value]) => key.startsWith('enable_') && value === true)
        .map(([key]) => fieldLabel(key, `field.${key}.label`));
      return html`
        <section class="step step-summary" data-step="summary">
          <h3>${STEP_LABELS.summary}</h3>
          <div class="step-card">
            <p>${t('onboarding.summary.new_install_heading', this.wizardLang)}</p>
            <ul>
              ${enabledModules.map((label) => html`<li>${label}</li>`)}
            </ul>
          </div>
        </section>
      `;
    }

    // Every other step without dedicated content yet (battery, boiler,
    // connection — Stage S3 fills these in). A stub, not a second source
    // of truth.
    return html`
      <section class="step step-stub" data-step=${this.currentStep}>
        <h3>${STEP_LABELS[this.currentStep]}</h3>
        <div class="step-card">
          <p data-testid="step-stub-placeholder">
            Tento krok bude doplněn v další verzi průvodce.
          </p>
        </div>
      </section>
    `;
  }

  render() {
    if (!this.open) return nothing;

    const visibleSteps = this.visibleWizardSteps();
    const idx = this.currentIndex();
    const isFirst = idx <= 0;
    const isLast = idx >= visibleSteps.length - 1;
    const skippable = STEP_SKIPPABLE[this.currentStep];
    const isReview = this.onboardingState?.grandfathered === true; // design decision 3

    return html`
      <div
        class="overlay"
        data-testid="onboarding-wizard-overlay"
        @click=${this.close}
      >
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="onboarding-wizard-title"
          data-testid="onboarding-wizard"
          @click=${(e: Event) => e.stopPropagation()}
        >
          <header>
            <h2 id="onboarding-wizard-title">Průvodce nastavením</h2>
            <button
              class="close"
              type="button"
              aria-label="Zavřít"
              data-testid="wizard-close"
              @click=${this.close}
            >×</button>
          </header>

          <div class="phase-legend" data-testid="wizard-phase-legend">
            <div class="phase-chip" data-testid="wizard-phase-a">
              <strong>${PHASE_LABELS.A}</strong>
              <span class="phase-steps">
                ${WIZARD_STEPS.filter((s) => STEP_PHASE[s] === 'A').map((s) => STEP_LABELS[s]).join(', ')}
              </span>
            </div>
            <div class="phase-chip" data-testid="wizard-phase-b">
              <strong>${PHASE_LABELS.B}</strong>
              <span class="phase-steps">
                ${WIZARD_STEPS.filter((s) => STEP_PHASE[s] === 'B').map((s) => STEP_LABELS[s]).join(', ')}
              </span>
            </div>
          </div>

          <nav class="steps" data-testid="wizard-steps" aria-label="Kroky průvodce">
            ${visibleSteps.map((s, i) => html`
              ${(() => {
                const status = this.onboardingState?.steps[s] ?? 'pending';
                return html`
              <button
                type="button"
                class=${this.currentStep === s ? 'active' : ''}
                data-step=${s}
                @click=${() => this.jumpTo(s)}
              >
                ${i + 1} ${STEP_LABELS[s]}
                <span
                  class="step-status"
                  data-testid=${`wizard-step-status-${s}`}
                  data-status=${status}
                >${STEP_STATUS_LABELS[status]}</span>
              </button>
                `;
              })()}
            `)}
          </nav>

          ${this.bootstrapRetry.onboardingState
            ? html`
                <div class="finish-status">
                  <p data-testid="onboarding-state-retry">${t('onboarding.bootstrap.state_load_failed', this.wizardLang)}</p>
                  <button
                    type="button"
                    data-testid="onboarding-state-retry-button"
                    @click=${() => this.retryOnboardingStateBootstrap()}
                  >${t('onboarding.bootstrap.retry_button', this.wizardLang)}</button>
                </div>
              `
            : nothing}

          <div class="content" data-testid="wizard-content">
            ${this.renderStepContent()}
          </div>

          ${this.finishError
            ? html`
                <div class="finish-status">
                  <p data-testid="wizard-finish-error">${this.finishError}</p>
                  <button
                    type="button"
                    data-testid="wizard-finish-retry"
                    ?disabled=${this.finishing}
                    @click=${() => void this.finish()}
                  >${t('onboarding.bootstrap.retry_button', this.wizardLang)}</button>
                </div>
              `
            : nothing}

          <footer>
            <button
              type="button"
              class="back"
              data-testid="wizard-back"
              ?disabled=${isFirst}
              @click=${this.goPrev}
            >← Zpět</button>
            <button
              type="button"
              class="skip"
              data-testid="wizard-skip"
              ?disabled=${!skippable}
              @click=${this.skip}
            >Přeskočit</button>
            <button
              type="button"
              class="primary next"
              data-testid="wizard-next"
              ?disabled=${this.finishing}
              @click=${() => void this.goNext()}
            >${this.finishing ? 'Dokončuji…' : isLast ? (isReview ? 'Uložit' : 'Dokončit') : 'Další →'}</button>
          </footer>
        </div>
      </div>
    `;
  }
}
