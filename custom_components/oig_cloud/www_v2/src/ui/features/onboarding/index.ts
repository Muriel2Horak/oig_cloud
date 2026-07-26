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
import { loadFieldRegistry, fieldsFromRegistry } from '@/data/registry-data';
import type { FieldDef } from '@/ui/features/settings';
import { STEP_SOLAR, SOLAR_PROVIDER_GUIDES } from './step-solar';
import {
  STEP_PRICING_DISTRIBUTION,
  isDualTariffCode,
  TARIFF_SCHEDULE_KEYS,
  DISTRIBUTION_PRICE_KEYS,
  VAT_RATE_KEY,
  DISTRIBUTOR_LOGO_ASSETS,
} from './step-pricing-distribution';
import {
  stringsToGrid,
  gridToStrings,
  summarizeNtIntervals,
  type Paint,
  type DayGroup,
} from './tariff-hour-matrix';
// Seam merge: supplier redesign split the supplier step into Nakup/Prodej
// scenario-card steps, superseding the distribution branch's single-step
// group rendering (PRICING_SUPPLIER_GROUP_A/B_KEYS + PRICING_SUPPLIER_GROUPS
// are gone). Group B keys now live in step-pricing-supplier-sell.ts.
import { STEP_PRICING_SUPPLIER, SCENARIO_CARDS_BUY } from './step-pricing-supplier';
import { STEP_PRICING_SUPPLIER_SELL, SCENARIO_CARDS_SELL } from './step-pricing-supplier-sell';
import { renderScenarioCards, scenarioCardStyles } from './scenario-radio-cards';
import { priceInclVat } from './pricing-vat';
import {
  STEP_BATTERY,
  BATTERY_GROUPS,
  BATTERY_HARDWARE_CHIPS,
  getBatteryHardwareValue,
} from './step-battery';
import { STEP_BOILER, BOILER_FIELD_GROUPS, ungroupedBoilerFields } from './step-boiler';
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
  vt?: { price_incl_vat: number; price_excl_vat: number; unit: string };
  nt?: { price_incl_vat: number; price_excl_vat: number; unit: string };
  /** ERU decree's own short-form CZ label for the sazba (owner UX rev item
   * 2, `build_pricelists.py`'s ERU-decree mode) — same text for every
   * distributor, absent from non-ERU (flat-fixture) datasets. */
  description?: string;
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
        <div data-testid="ai-intro">
          <h3>${t('onboarding.ai.intro_heading', this.stepLang)}</h3>
          <p>${t('onboarding.ai.intro_body', this.stepLang)}</p>
          <p>${t('onboarding.ai.intro_why_it_matters', this.stepLang)}</p>
          <p>${t('onboarding.ai.intro_optionality', this.stepLang)}</p>
        </div>
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
  'pricing_supplier_sell', 'battery', 'boiler', 'connection', 'summary',
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
  solar: 'Solár',
  pricing_distribution: 'Distribuce',
  pricing_supplier: 'Nákup',
  pricing_supplier_sell: 'Prodej',
  battery: 'Baterie',
  boiler: 'Bojler',
  connection: 'Připojení',
  summary: 'Shrnutí',
};

/** One-line step subtitle for the glow-icon step header (design rev 3). */
const STEP_SUBTITLES: Record<OnboardingStepId, string> = {
  welcome: 'Úvod do průvodce nastavením',
  modules: 'Které části wizardu chcete projít',
  ai: 'Volitelný AI asistent pro doporučení',
  solar: 'Předpověď výroby vaší fotovoltaiky',
  pricing_distribution: 'Sazba a poplatky vašeho distributora',
  pricing_supplier: 'Nákupní cena od dodavatele elektřiny',
  pricing_supplier_sell: 'Prodejní (výkupní) cena do sítě',
  battery: 'Jak agresivně má systém pracovat s cenou',
  boiler: 'Nastavení ohřevu vody',
  connection: 'Připojení k OIG Cloud a Home Assistantu',
  summary: 'Kontrola a dokončení nastavení',
};

/** Per-step domain color (owner-approved design rev 3) — a CSS var expression
 * consumed as `--sc` on the step's root element, inherited by the nav chip,
 * the glow icon tile, and every `.field-group`'s left border. */
const STEP_COLOR_VAR: Record<OnboardingStepId, string> = {
  welcome: 'var(--c-welcome)',
  modules: 'var(--c-mod)',
  ai: 'var(--c-ai)',
  solar: 'var(--c-solar)',
  pricing_distribution: 'var(--c-price)',
  pricing_supplier: 'var(--c-price)',
  pricing_supplier_sell: 'var(--c-price)',
  battery: 'var(--c-batt)',
  boiler: 'var(--c-boiler)',
  connection: 'var(--c-conn)',
  summary: 'var(--c-sum)',
};

const STEP_ICON: Record<OnboardingStepId, string> = {
  welcome: '👋',
  modules: '🧩',
  ai: '🤖',
  solar: '☀️',
  pricing_distribution: '🏭',
  pricing_supplier: '🛒',
  pricing_supplier_sell: '📤',
  battery: '🔋',
  boiler: '🔥',
  connection: '📡',
  summary: '📋',
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
  pricing_supplier_sell: STEP_PRICING_SUPPLIER_SELL.skippable,
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
  pricing_supplier: 'B', pricing_supplier_sell: 'B', battery: 'B',
};
const PHASE_LABELS = { A: 'Nastavuje se jednou', B: 'Mění se v čase' } as const;

/** Steps gated by a modules-step toggle (UX-SPEC table-of-contents "New install" column). */
const STEP_GATE: Partial<Record<OnboardingStepId, string>> = {
  ai: '', // AI is never gated by a modules toggle — always shown (optional, not conditional)
  solar: 'enable_solar_forecast',
  pricing_distribution: 'enable_pricing',
  pricing_supplier: 'enable_pricing',
  pricing_supplier_sell: 'enable_pricing',
  battery: 'enable_battery_prediction',
  boiler: 'enable_boiler',
};

/**
 * Module dependency matrix (f1/wv2-modules-fix §3) — DERIVED FROM BACKEND
 * EVIDENCE, not the brief's guessed example. Verified consumers:
 *
 * HARD (config-blocking): the legacy config flow refuses to persist these
 *   combinations, so the wizard mirrors that block to stay consistent —
 *   `config/steps.py:990-993` `_validate_modules_selection`:
 *     enable_battery_prediction -> enable_solar_forecast ("requires_solar_forecast")
 *                               -> enable_extended_sensors ("required_for_battery")
 *
 * SOFT (runtime-degrading, NON-blocking): the module still loads, but a
 *   prerequisite being off silently degrades its output:
 *     enable_battery_prediction -> enable_pricing: without spot prices the
 *       coordinator never populates the spot timeline
 *       (`core/coordinator.py:91-94`), so the planner builds 0 intervals
 *       (`battery_forecast/planning/forecast_update.py:935,1448`) — an EMPTY
 *       plan. NOT config-blocked by the backend, hence soft here too.
 *     enable_boiler -> enable_pricing, enable_battery_prediction: without
 *       prices the boiler planner falls back to GRID/ALTERNATIVE
 *       (`boiler/planner.py:362-372`); without battery it loses PV-overflow
 *       preheating (`boiler/runtime.py:508-510`). Still produces a plan.
 *
 * INDEPENDENT: solar_forecast, pricing (producers), statistics,
 *   extended_sensors, chmu_warnings (chmu only reads solar GPS cosmetically,
 *   `entities/chmu_sensor.py:290-300`).
 */
const MODULE_HARD_DEPS: Record<string, readonly string[]> = {
  enable_battery_prediction: ['enable_solar_forecast', 'enable_extended_sensors'],
};
const MODULE_SOFT_DEPS: Record<string, readonly string[]> = {
  enable_battery_prediction: ['enable_pricing'],
  enable_boiler: ['enable_pricing', 'enable_battery_prediction'],
};

/**
 * Modules step grouping (Stage S3 Task 21, UX-SPEC §Step 1) — "Hlavní
 * moduly" (each gates a later step, `STEP_GATE` above) above "Doplňkové"
 * (no gated step). Spec-fixed order, NOT the registry's own field order
 * (`config_registry.py` lists `enable_battery_prediction` before
 * `enable_pricing`).
 */
const MODULES_GROUP_HLAVNI = [
  'enable_solar_forecast', 'enable_pricing', 'enable_battery_prediction', 'enable_boiler',
] as const;
const MODULES_GROUP_DOPLNKOVE = [
  'enable_statistics', 'enable_extended_sensors', 'enable_chmu_warnings',
] as const;

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

/** Czech render-time translation of the technical `OnboardingStepStatus`
 * values (design rev 3, owner walk: "no raw pending/done ever renders").
 * The state itself stays technical (`OnboardingStepStatus`) — this map is
 * consulted only at render, never stored. The nav's current chip overrides
 * this with "právě zde" regardless of its own status (see `render()`). */
const STEP_STATUS_LABELS: Record<OnboardingStepStatus, string> = {
  pending: 'čeká',
  done: 'hotovo',
  skipped: 'přeskočeno',
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
 * Flatten a `/module_config` response into one cross-section map, read two
 * ways downstream: review-mode diff hints (UX-SPEC §3) key off a field's own
 * `f.key`, secret set-state (live-walk defect 2) keys off `` `${f.key}_set` ``
 * — same mechanism the settings tab already uses (`settings/index.ts:612`
 * `this.current(section, \`${f.key}_set\`)`). Registry keys are globally
 * unique across sections (verified: no collision across modules/battery/
 * solar/boiler/pricing/pricing_supplier/basic in `config_registry.py`), and
 * no registry key itself ends in `_set`, so both reads share this one map
 * safely. Secret fields' real VALUE never appears here either way — the
 * backend emits only the `{key}_set` boolean, never the value itself.
 */
function flattenModuleConfig(doc: ModuleConfigDoc): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const section of Object.values(doc)) {
    if (!section) continue;
    for (const [key, value] of Object.entries(section)) {
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

/** Owner UX rev, item 4 last bullet: the NT/VT diff hint (inline + step-9
 * table) shows the painted interval summary, never the raw start-hour
 * strings the grid persists as. Falls back to a raw VT/NT readout only if
 * the strings don't parse (never silently drops a real change). */
function describeSchedule(vt: string, nt: string, allowSingleTariff: boolean): string {
  const grid = stringsToGrid(vt, nt, allowSingleTariff);
  if (grid) return summarizeNtIntervals(grid);
  if (!vt && !nt) return '—';
  return `VT ${vt || '—'} / NT ${nt || '—'}`;
}

/**
 * Wizard shell — opens in response to a `launch-onboarding` CustomEvent and
 * routes the 10-step wizard-v2 sequence (`WIZARD_STEPS`, `:315`) in order.
 * Closing returns the user to the dashboard (the dashboard is NEVER
 * replaced — SCOPE #6).
 *
 * The user can:
 *   - click the step indicator to jump to any visible step (no lock/gate; #6)
 *   - click [Zpět] / [Další] for linear navigation
 *   - click [Přeskočit] on any skippable step
 *   - click × or the backdrop to close and return to the dashboard
 *
 * Step content (`renderStepContent`, `:1412`): each content step (ai, solar,
 * pricing_distribution, pricing_supplier, battery, boiler, connection) renders
 * its own field forms from the shared registry — no second field list lives
 * elsewhere (P5). `welcome`/`summary` are static/derived, never individually
 * skippable.
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
  /**
   * f1/wv2-modules-fix §3: a pending "turn off a prerequisite that dependents
   * still need" action, awaiting confirmation. Non-null renders the confirm
   * banner; the toggle change is NOT applied until the user confirms.
   */
  @state() private _pendingPrereqOff: { prereq: string; dependents: string[] } | null = null;
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

  /** Connection step (Task 20): draft form values for the `basic` registry
   * section — seeded from `entry.options` FIRST, registry `default` otherwise
   * (`seedConnectionDraft`, same rule as `seedSolarDraft`). */
  @state() private connectionDraft: Record<string, unknown> = {};

  /**
   * Boiler step: local edits only (Task 19) — read-seeded per field at render
   * time from `originalValues` / the registry default, same fallback chain
   * `seedSolarDraft` uses, but without a persistent seed pass: wiring this
   * into `sectionDrafts()`/`allDraftValues()` (save + step-9 diff row) is
   * Stage S3 Task 21 (`:1236` note), not this task.
   */
  @state() private boilerDraft: Record<string, unknown> = {};

  /**
   * Task 17 cross-step flag: derived from the distribution step's tariff
   * selection (`isDualTariffCode`, step-pricing-distribution.ts), read by
   * the supplier step's `_nt`-variant `show_if_all` gating — a peer to
   * `solarDraft`/`pricingDraft` (UX-SPEC §4), not a rename of them.
   */
  @state() private isDualTariff = false;

  /**
   * NT/VT schedule grid (owner live-walk UX rev, item 4): the 4 start-string
   * keys in `pricingDraft` remain the single source of truth — the grid is
   * derived from them fresh on every render (`stringsToGrid`). This override
   * holds ONLY a transient, not-yet-persistable paint (weekday monochrome,
   * blocked per the brief) so the invalid state stays visible without
   * corrupting `pricingDraft`'s last-valid strings. Cleared once the group's
   * paint becomes expressible again.
   */
  @state() private tariffMatrixOverride: Partial<Record<DayGroup, Paint[]>> = {};
  @state() private tariffMatrixError: Partial<Record<DayGroup, string>> = {};
  @state() private showVatOverride = false;

  /** Content fix (d) — secret fields the user clicked "Změnit" on this open;
   * revealed fields render the real (write-only) input instead of the
   * "✓ nastaveno" badge. Keyed by field key, reset implicitly on close since
   * the whole component re-mounts on next open. */
  @state() private revealedSecretKeys: ReadonlySet<string> = new Set();

  private revealSecret(key: string): void {
    if (this.revealedSecretKeys.has(key)) return;
    this.revealedSecretKeys = new Set(this.revealedSecretKeys).add(key);
  }
  /** Click-drag paint tracking — deliberately NOT `@state()`: it changes on
   * every `mouseenter` during a drag and never affects rendered output by
   * itself (each cell entered already calls `paintMatrixCell`, which does
   * trigger a render via `pricingDraft`/`tariffMatrixOverride`). */
  private _dragGroup: DayGroup | null = null;
  private _dragPaint: Paint | null = null;

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

  /** Battery step (Task 18): draft form values, seeded alongside `solarDraft`
   * from the same shared `_registry` fetch — the registry is not fetched a
   * second time per section. */
  @state() private batteryDraft: Record<string, unknown> = {};

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
    ${scenarioCardStyles}

    :host {
      display: contents;
      /* Owner-approved design rev 3 — per-step domain colors + phase-bar
         colors, fixed hex (not theme tokens): accent colors, not surfaces,
         so they read the same in light and dark HA themes. */
      --c-welcome: #5b8cff;
      --c-mod: #5b8cff;
      --c-ai: #9d7bff;
      --c-solar: #ffb547;
      --c-price: #3fd18b;
      --c-batt: #3ec6dc;
      --c-boiler: #ff7a59;
      --c-conn: #8fa1c4;
      --c-sum: #5b8cff;
      --phA: #5b8cff;
      --phB: #3fd18b;
    }

    .sr-only {
      position: absolute;
      width: 1px; height: 1px;
      padding: 0; margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
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

    /* ── Navigation (design rev 3) ──────────────────────────────────────
       Centerpiece fix: chips are flex:none at a fixed width so .steps
       truly scrolls horizontally instead of shrinking every chip until
       their labels overlap (the mobile-broken bug this slice fixes). */
    .navwrap {
      padding: 10px 18px 0;
      border-bottom: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
      background: rgba(255, 255, 255, 0.02);
    }

    .phasebar {
      display: flex;
      height: 4px;
      border-radius: 99px;
      overflow: hidden;
      margin: 0 2px 8px;
      gap: 1px;
    }
    .phasebar i { display: block; flex: 1; }

    .steps {
      display: flex;
      flex-wrap: nowrap;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
      padding: 2px 2px 10px;
    }
    .steps::-webkit-scrollbar { display: none; }

    .st {
      flex: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      width: 64px;
      padding: 6px 4px 4px;
      border-radius: 12px;
      border: 1px solid transparent;
      background: transparent;
      cursor: pointer;
      font: inherit;
      color: inherit;
      position: relative;
    }

    .st .ic {
      width: 32px; height: 32px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      font-size: 14px;
      background: var(--card-bg, rgba(255, 255, 255, 0.06));
      border: 1.5px solid var(--divider-color, rgba(255, 255, 255, 0.18));
      transition: 0.15s;
    }
    .st .stlabel {
      font-size: 10.5px;
      color: inherit;
      opacity: 0.65;
      white-space: nowrap;
    }

    .st.done .ic {
      border-color: var(--sc);
      color: var(--sc);
    }
    .st.done .ic { position: relative; }
    .st.done .ic::after {
      content: '✓';
      position: absolute;
      top: -3px; right: -5px;
      font-size: 9px;
      color: var(--sc);
      background: var(--card-bg, #1d2330);
      border-radius: 50%;
      padding: 0 2px;
    }

    .st.cur {
      border-color: var(--sc);
      background: color-mix(in srgb, var(--sc) 10%, transparent);
    }
    .st.cur .ic {
      background: var(--sc);
      color: #0a1124;
      border-color: var(--sc);
      box-shadow: 0 0 14px color-mix(in srgb, var(--sc) 55%, transparent);
    }
    .st.cur .stlabel { opacity: 1; font-weight: 600; }

    .stepmeta {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      gap: 8px;
      padding: 0 4px 8px;
      font-size: 11px;
    }
    .stepmeta b { font-weight: 500; opacity: 0.7; }
    .stepmeta em { font-style: normal; font-size: 11.5px; color: var(--sc, inherit); font-weight: 600; }

    /* <=480px: hide labels, chips shrink to icon-only, row scrolls (never wraps). */
    @media (max-width: 480px) {
      .st { width: 44px; }
      .st .stlabel { display: none; }
    }

    /* Low-height viewports (Nest Hub 1024x600 kiosk): compact chips, body
       scrolls internally, footer stays reachable without page-scrolling. */
    @media (max-height: 650px) {
      .st { width: 44px; padding: 5px 2px 4px; }
      .st .stlabel { display: none; }
      .st .ic { width: 26px; height: 26px; font-size: 12px; }
      .content { max-height: 260px; }
      footer { position: sticky; bottom: 0; background: var(--card-bg, #1d2330); }
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

    .module-group + .module-group { margin-top: 16px; }
    .module-group h4 {
      margin: 0 0 4px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      opacity: 0.7;
    }

    /* f1/wv2-modules-fix §3 — dependency gating hints under a toggle. */
    .dep-explain {
      margin: 2px 0 10px;
      font-size: 12px;
      line-height: 1.4;
    }
    .dep-hard { color: var(--warning-color, #e0a52b); }
    .dep-soft { opacity: 0.75; }
    .dep-enable {
      margin-left: 6px;
      padding: 1px 8px;
      font: inherit;
      font-size: 11px;
      cursor: pointer;
      border: 1px solid currentColor;
      border-radius: 6px;
      background: transparent;
      color: inherit;
    }
    .prereq-confirm {
      margin-bottom: 12px;
      padding: 12px 14px;
      border: 1px solid var(--warning-color, #e0a52b);
      border-radius: 10px;
      background: color-mix(in srgb, var(--warning-color, #e0a52b) 12%, transparent);
    }
    .prereq-confirm-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .prereq-confirm-actions button {
      padding: 4px 12px;
      font: inherit;
      cursor: pointer;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.2));
      border-radius: 8px;
      background: transparent;
      color: inherit;
    }
    .prereq-confirm-actions .danger {
      border-color: var(--warning-color, #e0a52b);
      color: var(--warning-color, #e0a52b);
    }

    /* Section grouping within a step (UX-SPEC §6, "cards over a flat list")
       — mirrors the admin tile dialog's numbered-section pattern (164c622a8,
       tile-dialog.ts .sec/.sect), reused here rather than a new mechanism. */
    .field-group {
      margin-bottom: 14px;
      padding: 12px 14px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
      border-left: 3px solid color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 55%, transparent);
      border-radius: 10px;
    }

    /* Step header — glow icon tile + title + one-line subtitle (design rev 3). */
    .step-head {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 10px;
    }
    .step-head-icon {
      flex: none;
      width: 40px; height: 40px;
      border-radius: 13px;
      display: grid;
      place-items: center;
      font-size: 19px;
      background: color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 16%, transparent);
      border: 1px solid color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 45%, transparent);
      box-shadow: 0 0 20px color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 25%, transparent);
    }
    .step-head h3 { margin: 0; font-size: 16px; }
    .step-head-sub { margin: 2px 0 0; font-size: 12px; opacity: 0.7; font-weight: 400; }

    /* Number+unit fields as a "pcard" — label small caps, big value, unit
       (design rev 3 item 2) — a visual wrapper over the shared .row
       control, not a second input implementation. */
    .pcard {
      background: color-mix(in srgb, var(--card-bg, #0c1530) 92%, transparent);
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.1));
      border-radius: 11px;
      padding: 10px 12px;
    }
    .pcard .row {
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
      padding: 0;
      border-bottom: 0;
    }
    .pcard .lab {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
    }
    .pcard input[type=number],
    .pcard input[type=text] {
      font-size: 16px;
      font-weight: 600;
    }

    /* Secret set-state badge (design rev 3 item 3d) — replaces the plain
       always-editable input once a secret is confirmed set; "Změnit"
       reveals the real input to overwrite it. */
    .secret-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: color-mix(in srgb, var(--c-price) 14%, transparent);
      border: 1px solid color-mix(in srgb, var(--c-price) 45%, transparent);
      color: #9fe8c6;
      border-radius: 9px;
      padding: 6px 12px;
      font-size: 12.5px;
    }
    .secret-badge-change {
      background: none;
      border: none;
      color: var(--primary-color, #4f7cff);
      font-size: 12px;
      text-decoration: underline;
      cursor: pointer;
      padding: 0;
      font: inherit;
    }

    .field-group:last-child { margin-bottom: 0; }

    .field-group-heading {
      display: flex;
      align-items: center;
      gap: 7px;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.4px;
      opacity: 0.7;
      margin-bottom: 8px;
    }

    .field-group-heading .field-group-badge {
      width: 17px;
      height: 17px;
      border-radius: 50%;
      background: var(--primary-color, #4f7cff);
      color: #06121f;
      display: grid;
      place-items: center;
      font-size: 10px;
    }

    /* Live-walk defect 3 — solar provider acquisition guide, same visual
       weight as .field-group (UX-SPEC §6 cards over a flat list). */
    .provider-guide {
      margin: 4px 0 14px;
      padding: 10px 14px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.08));
      border-radius: 10px;
      font-size: 12.5px;
    }
    .provider-guide h4 { margin: 0 0 6px; font-size: 12px; }
    .provider-guide-links { display: flex; gap: 12px; margin-bottom: 6px; }
    .provider-guide ol { margin: 4px 0; padding-left: 18px; }
    .provider-guide li { margin-bottom: 3px; line-height: 1.4; }

    /* Fixed-price purchase scenario, dual tariff: VT/NT side by side
       (supplier-step redesign brief item 2). */
    .vt-nt-row {
      display: flex;
      gap: 12px;
    }
    .vt-nt-row > div { flex: 1; min-width: 0; }

    /* Number+unit pcard pairs (battery charge-rate/reserve, item 2) — grid,
       single column on mobile. */
    .pair {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 10px;
    }
    .battery-hardware {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin: 2px 0 14px;
    }
    .battery-chip {
      display: inline-flex;
      align-items: baseline;
      gap: 8px;
      padding: 9px 12px;
      border-radius: 11px;
      border: 1px solid color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 28%, var(--divider-color, rgba(255, 255, 255, 0.12)));
      background: color-mix(in srgb, var(--card-bg, #0c1530) 92%, transparent);
    }
    .battery-chip-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.35px;
      opacity: 0.7;
    }
    .battery-chip-value {
      font-size: 13px;
      font-weight: 700;
    }
    .battery-actions {
      margin-top: 14px;
      display: flex;
      justify-content: flex-start;
    }
    .battery-sim-button {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px;
      border-radius: 12px;
      border: 1px solid transparent;
      background: linear-gradient(
        135deg,
        color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 92%, white 8%),
        color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 68%, #ffffff 32%)
      );
      color: #fff;
      cursor: pointer;
      font: inherit;
      font-weight: 700;
      box-shadow: 0 10px 24px color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 28%, transparent);
      transition: transform 0.12s ease, box-shadow 0.12s ease;
    }
    .battery-sim-button:hover {
      transform: translateY(-1px);
      box-shadow: 0 12px 28px color-mix(in srgb, var(--sc, var(--primary-color, #4f7cff)) 34%, transparent);
    }
    @media (max-width: 480px) {
      .pair { grid-template-columns: 1fr; }
    }

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
      background: linear-gradient(135deg, var(--primary-color, #4f7cff), #7ba4ff);
      border-color: transparent;
      color: #fff;
      font-weight: 600;
      box-shadow: 0 4px 18px rgba(79, 124, 255, 0.35);
    }

    footer button.skip {
      font-style: italic;
    }

    footer button:disabled { opacity: 0.4; cursor: not-allowed; }

    @media (max-width: 480px) {
      footer { flex-wrap: wrap; }
      footer button.primary.next { flex: 1; }
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

    /* Owner live-walk UX rev (F1 dist-ux) — distributor icon slot, VT/NT
       price pair, NT/VT schedule grid. */
    .distributor-icon {
      display: inline-flex;
      width: 18px; height: 18px;
      margin-right: 6px;
      vertical-align: middle;
    }
    .distributor-icon img { width: 100%; height: 100%; object-fit: contain; }

    .distribution-price-pair {
      display: flex;
      gap: 16px;
      padding: 10px 0;
      border-bottom: 1px dashed var(--divider-color, rgba(255, 255, 255, 0.12));
    }
    .price-cell { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
    .price-cell input { max-width: 100px; }

    .link-button {
      background: transparent;
      border: none;
      color: var(--primary-color, #4f7cff);
      font-size: 11.5px;
      cursor: pointer;
      padding: 4px 0;
      text-decoration: underline;
    }

    .tariff-matrix { padding: 10px 0; }
    .tariff-matrix-legend {
      display: flex; align-items: center; gap: 6px;
      font-size: 11px; opacity: 0.8; margin-bottom: 8px;
    }
    .legend-swatch {
      display: inline-block; width: 11px; height: 11px; border-radius: 2px;
    }
    .legend-swatch.vt { background: var(--card-bg, rgba(255, 255, 255, 0.12)); border: 1px solid var(--divider-color, rgba(255,255,255,0.3)); }
    .legend-swatch.nt { background: var(--primary-color, #4f7cff); }

    .tariff-matrix-hours {
      display: grid;
      grid-template-columns: repeat(24, 1fr);
      gap: 1px;
      margin-bottom: 3px;
    }
    .tariff-matrix-hours i {
      font-style: normal;
      font-size: 9px;
      opacity: 0.6;
      text-align: center;
    }

    .tariff-matrix-row { margin-bottom: 12px; }
    .tariff-matrix-row-label { font-size: 12px; font-weight: 600; margin-bottom: 4px; }
    .tariff-matrix-cells {
      display: grid;
      grid-template-columns: repeat(24, 1fr);
      gap: 2px;
    }
    .tariff-cell {
      height: 26px;
      padding: 0;
      border: none;
      border-radius: 3px;
      cursor: pointer;
      background: var(--card-bg, rgba(255, 255, 255, 0.12));
      transition: transform 0.1s;
    }
    .tariff-cell:hover { transform: scale(1.12); }
    .tariff-cell.nt {
      background: var(--primary-color, #4f7cff);
      box-shadow: 0 0 6px color-mix(in srgb, var(--primary-color, #4f7cff) 50%, transparent);
    }
    .tariff-matrix-summary { font-size: 11px; opacity: 0.85; font-weight: 600; margin: 4px 0 0; }
    .tariff-matrix-error { font-size: 11px; color: var(--error-color, #ff8a80); margin: 4px 0 0; }
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
   * `saveModuleConfig` (Stage S2 Task 10). `modulesDraft` IS included now
   * (f1/wv2-modules-fix root cause a): once `seedModulesDraft` (Task 21)
   * lands it is genuinely seeded from `entry.options`, so a flipped toggle is
   * a real change to write. Guarded on the same `sections.includes('modules')`
   * condition `seedModulesDraft` uses — before that seed runs `modulesDraft`
   * is the every-gate-on nav stub (`:641`) and diffing it against an unseeded
   * `originalValues` would fabricate saves for toggles the user never touched.
   */
  private sectionDrafts(): Array<{ section: SettingsSection; draft: Record<string, unknown> }> {
    const drafts: Array<{ section: SettingsSection; draft: Record<string, unknown> }> = [
      { section: 'solar', draft: this.solarDraft },
      { section: 'battery', draft: this.batteryDraft },
      { section: 'pricing', draft: this.pricingDraft },
    ];
    if (this._registry?.sections.includes('modules')) {
      drafts.push({ section: 'modules', draft: this.modulesDraft });
    }
    return drafts;
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

  /** Same seeding rule as `seedSolarDraft` (Task 18) — `entry.options` first,
   * registry `default` only for a field genuinely unset either way. */
  private seedBatteryDraft(): void {
    if (!this._registry) return;
    const draft: Record<string, unknown> = {};
    for (const f of STEP_BATTERY.fields(this._registry)) {
      const spec = this._registry.fields[f.key];
      const seeded = this.originalValues[f.key] ?? spec?.default;
      if (seeded !== undefined) draft[f.key] = seeded;
    }
    this.batteryDraft = draft;
  }

  /**
   * Seed `modulesDraft` from `originalValues` (entry.options, via
   * `/module_config`'s `modules` section) FIRST, the registry's own
   * `default` only for a field genuinely unset either way (Stage S3 Task
   * 21, mirrors `seedSolarDraft` — Task 8's pattern applied to the modules
   * section). New install: "all off except recommended defaults" (UX-SPEC
   * table-of-contents) IS the registry `default` for every module key
   * (`config_registry.py`) — no separate rule needed here.
   *
   * Guarded on the registry actually describing the `modules` section:
   * every other bootstrap fixture in this test suite registers only its
   * own section (e.g. `solar`), so this never fires there and the Stage S1
   * every-gate-on stub (`:525-530`) keeps gating nav in those tests exactly
   * as before — only a registry response that genuinely includes `modules`
   * (production, or this task's own test fixture) replaces it.
   */
  private seedModulesDraft(): void {
    if (!this._registry || !this._registry.sections.includes('modules')) return;
    const draft: Record<string, unknown> = {};
    for (const key of [...MODULES_GROUP_HLAVNI, ...MODULES_GROUP_DOPLNKOVE]) {
      const spec = this._registry.fields[key];
      const seeded = this.originalValues[key] ?? spec?.default;
      if (seeded !== undefined) draft[key] = seeded;
    }
    // Enforce the hard-dependency invariant on a (rare) inconsistent seed: a
    // dependent left ON in entry.options while a hard prerequisite is OFF is
    // normalised to OFF — the legacy config flow (config/steps.py:990-993)
    // never allowed the combination to be persisted, so it can only arrive as
    // stale/hand-edited options; the gated toggle would render disabled anyway.
    for (const [dep, prereqs] of Object.entries(MODULE_HARD_DEPS)) {
      if (draft[dep] === true && prereqs.some((p) => draft[p] !== true)) {
        draft[dep] = false;
      }
    }
    this.modulesDraft = draft;
  }

  /** Same seeding rule as `seedSolarDraft` — `entry.options` first, registry
   * `default` only for a field genuinely unset either way (fe/fix connection
   * step: `connectionDraft` was never seeded, so the step always rendered its
   * registry defaults instead of the owner's stored `basic`-section values). */
  private seedConnectionDraft(): void {
    if (!this._registry) return;
    const draft: Record<string, unknown> = {};
    for (const f of STEP_CONNECTION.fields(this._registry)) {
      const spec = this._registry.fields[f.key];
      const seeded = this.originalValues[f.key] ?? spec?.default;
      if (seeded !== undefined) draft[f.key] = seeded;
    }
    this.connectionDraft = draft;
  }

  private async loadSolarRegistry(signal?: AbortSignal): Promise<void> {
    if (this._registryLoaded) return;
    this._registryLoaded = true;
    try {
      this._registry = await loadFieldRegistry(signal);
      this._registryOutcome = signal?.aborted ? 'aborted' : this._registry !== null ? 'success' : 'failed';
      this.seedSolarDraft();
      this.seedBatteryDraft();
      this.seedModulesDraft();
      this.seedConnectionDraft();
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
        if (data.pricing || data.pricing_supplier) {
          // Supplier-step redesign: the Nakup/Prodej scenario cards must
          // preselect from a review/recovered entry's stored scenario
          // (`spot_pricing_model`/`export_pricing_model`, both
          // `pricing_supplier`-sectioned) — merged into the same shared
          // `pricingDraft` as `data.pricing`, not a second draft object.
          this.pricingDraft = { ...data.pricing, ...data.pricing_supplier };
          if (data.pricing) {
            // Task 17: a review/recovered entry never touches the distribution
            // step's tariff onChange, so the cross-step flag must also be
            // derived here — same `isDualTariffCode`, not a second mechanism.
            this.isDualTariff = isDualTariffCode(
              this.pricingDraft['confirmed_distribution_tariff'] as string | undefined,
            );
          }
        }
        this.seedSolarDraft(); // re-seed if the registry already settled first
        this.seedBatteryDraft(); // T18 review: battery draft misses entry.options on registry-first race
        this.seedModulesDraft(); // re-seed if the registry already settled first
        this.seedConnectionDraft(); // re-seed if the registry already settled first
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
    this._pendingPrereqOff = null;
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

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('mouseup', this.endMatrixDrag);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopBootstrap();
    window.removeEventListener('mouseup', this.endMatrixDrag);
  }

  /**
   * Live-walk defect 3 — acquisition guide for the selected solar provider,
   * mirroring the AI step's `PROVIDER_GUIDES` card (step-ai.ts:renderProvider).
   * Rendered right after the provider select so it is visible for whichever
   * provider is currently chosen, before the credential field(s) below it.
   */
  private renderSolarProviderGuide() {
    const provider = String(this.solarDraft['solar_forecast_provider'] ?? '');
    const guide = SOLAR_PROVIDER_GUIDES[provider];
    if (!guide) return nothing;
    return html`
      <div class="provider-guide" data-testid="solar-provider-guide" data-provider=${provider}>
        <h4>${guide.label} — jak získat přístup</h4>
        <div class="provider-guide-links">
          <a href=${guide.registerUrl} target="_blank" rel="noopener">Registrace</a>
          ${guide.keysUrl && guide.keysUrl !== guide.registerUrl
            ? html`<a href=${guide.keysUrl} target="_blank" rel="noopener">Správa klíčů</a>`
            : nothing}
        </div>
        <ol>${guide.steps.map((s) => html`<li>${s}</li>`)}</ol>
        ${guide.siteIdSteps
          ? html`
              <p class="hint">Jak najít Site ID:</p>
              <ol>${guide.siteIdSteps.map((s) => html`<li>${s}</li>`)}</ol>
            `
          : nothing}
      </div>
    `;
  }
  /** Ends a tariff-matrix click-drag even if the mouse is released outside
   * the grid — bound once per connection, not per render. */
  private endMatrixDrag = (): void => {
    this._dragGroup = null;
    this._dragPaint = null;
  };

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

  // ------------------------------------------------------------------
  // Module dependency gating (f1/wv2-modules-fix §3) — matrix in
  // `MODULE_HARD_DEPS`/`MODULE_SOFT_DEPS` (`:462`), derived from backend
  // consumers. Hard prereqs disable a dependent toggle; soft prereqs only
  // surface a recommendation; turning a prereq off while a dependent is on
  // requires confirmation.
  // ------------------------------------------------------------------

  private moduleIsOn(key: string): boolean {
    return this.modulesDraft[key] === true;
  }

  /** Hard/soft prerequisites of `key` not currently satisfied. */
  private moduleDepState(key: string): { hardMissing: string[]; softMissing: string[] } {
    const hardMissing = (MODULE_HARD_DEPS[key] ?? []).filter((d) => !this.moduleIsOn(d));
    const softMissing = (MODULE_SOFT_DEPS[key] ?? []).filter((d) => !this.moduleIsOn(d));
    return { hardMissing, softMissing };
  }

  /** Dependents currently ON that HARD-require `prereq`. */
  private activeHardDependents(prereq: string): string[] {
    return Object.keys(MODULE_HARD_DEPS).filter(
      (dep) => this.moduleIsOn(dep) && MODULE_HARD_DEPS[dep].includes(prereq),
    );
  }

  /** Toggle handler for a module field — intercepts a prerequisite being
   * turned off while dependents still need it (confirm flow), otherwise
   * applies the change directly. */
  private onModuleToggle(key: string, value: unknown): void {
    if (value === false) {
      const dependents = this.activeHardDependents(key);
      if (dependents.length > 0) {
        this._pendingPrereqOff = { prereq: key, dependents };
        return;
      }
    }
    this.modulesDraft = { ...this.modulesDraft, [key]: value };
  }

  /** Auto-suggest: enable the missing HARD prereqs of `key` on explicit click
   * — never the dependent itself (no silent auto-enable, UX-SPEC §3). */
  private enableModulePrereqs(key: string): void {
    const { hardMissing } = this.moduleDepState(key);
    if (hardMissing.length === 0) return;
    const next = { ...this.modulesDraft };
    for (const d of hardMissing) next[d] = true;
    this.modulesDraft = next;
  }

  private confirmPrereqOff(): void {
    const pending = this._pendingPrereqOff;
    if (!pending) return;
    const next = { ...this.modulesDraft, [pending.prereq]: false };
    for (const dep of pending.dependents) next[dep] = false;
    this.modulesDraft = next;
    this._pendingPrereqOff = null;
  }

  private cancelPrereqOff(): void {
    this._pendingPrereqOff = null;
  }

  /**
   * Every currently-seeded section draft, flattened (Stage S2 Task 9).
   * `modulesDraft` is included once genuinely seeded (f1/wv2-modules-fix root
   * cause a) so a flipped module toggle shows up in the step-9 diff table —
   * guarded on `sections.includes('modules')` exactly like `sectionDrafts()`:
   * before the seed it is the every-gate-on stub (`:641`) and diffing it
   * against an unseeded `originalValues` would fabricate diff rows. Stage S3
   * must add its new drafts (boiler/connection/pricing_supplier) here once
   * each is properly seeded. `batteryDraft` added by Task 18.
   */
  private allDraftValues(): Record<string, unknown> {
    const modules = this._registry?.sections.includes('modules') ? this.modulesDraft : {};
    return { ...this.solarDraft, ...this.pricingDraft, ...this.batteryDraft, ...modules };
  }

  /** One row per field whose current draft value differs from its
   * `originalValues` snapshot — unchanged fields are omitted (UX-SPEC §3:
   * "a wall of 'X → X' rows defeats the purpose"). */
  private summaryDiffRows(): Array<{ key: string; oldValue: unknown; newValue: unknown }> {
    const all = this.allDraftValues();
    // The 4 raw start-hour keys collapse into one summary row per day-group
    // (owner UX rev, item 4) — a raw "Bylo: 6 → Nyní: 7" row means nothing
    // to the owner; the painted interval summary does.
    const scheduleKeys = new Set(TARIFF_SCHEDULE_KEYS as readonly string[]);
    const rows = Object.entries(all)
      .filter(([key, value]) => !scheduleKeys.has(key) && String(this.originalValues[key]) !== String(value))
      .map(([key, value]) => ({ key, oldValue: this.originalValues[key], newValue: value }));

    for (const group of ['weekday', 'weekend'] as const) {
      const vtKey = `tariff_vt_start_${group}`;
      const ntKey = `tariff_nt_start_${group}`;
      const allowSingle = group === 'weekend';
      const oldVt = String(this.originalValues[vtKey] ?? '');
      const oldNt = String(this.originalValues[ntKey] ?? '');
      const newVt = String(all[vtKey] ?? '');
      const newNt = String(all[ntKey] ?? '');
      if (oldVt === newVt && oldNt === newNt) continue;
      rows.push({
        key: `tariff_schedule_${group}`,
        oldValue: describeSchedule(oldVt, oldNt, allowSingle),
        newValue: describeSchedule(newVt, newNt, allowSingle),
      });
    }
    return rows;
  }

  // --------------------------------------------------------------------
  // Owner live-walk UX rev (F1 dist-ux) — items 1/3/4: distributor icon
  // slot, editable VT/NT distribution price, NT/VT schedule grid.
  // --------------------------------------------------------------------

  /** Item 1: icon/logo slot left of the distributor name — text-only until
   * a cleared bundled asset exists (`DISTRIBUTOR_LOGO_ASSETS`, currently
   * empty; see that file for why no logo ships today). */
  private renderDistributorIconSlot() {
    const code = this.pricingDraft['confirmed_distribution_distributor'] as string | undefined;
    const asset = code ? DISTRIBUTOR_LOGO_ASSETS[code] : undefined;
    return html`
      <span class="distributor-icon" data-testid="distributor-icon">
        ${asset ? html`<img src=${asset} alt="" width="18" height="18" />` : nothing}
      </span>`;
  }

  /** Item 3: prefills `distribution_fee_vt_kwh`/`_nt_kwh` from the selected
   * distributor+tariff's dataset price (Kc/MWh -> Kc/kWh, /1000) ONLY while
   * the field is still at its untouched registry default — an existing
   * user's already-customized value is never overwritten (UX-SPEC §3 review
   * mode: "existing users see THEIR values, not dataset defaults"). */
  private applyDistributionFeeSuggestion(): void {
    if (!this._registry) return;
    const distributor = this.pricingDraft['confirmed_distribution_distributor'] as string | undefined;
    const tariff = this.pricingDraft['confirmed_distribution_tariff'] as string | undefined;
    if (!distributor || !tariff) return;
    const rate = this.pricing?.distributors?.[distributor]?.[tariff];
    if (!rate) return;

    const suggest = (key: string, leg?: { price_excl_vat: number }): [string, number] | null => {
      if (!leg) return null;
      const current = this.pricingDraft[key];
      const registryDefault = this._registry!.fields[key]?.default;
      const untouched = current === undefined || current === registryDefault;
      if (!untouched) return null;
      return [key, Math.round((leg.price_excl_vat / 1000) * 100) / 100];
    };

    const updates = [
      suggest('distribution_fee_vt_kwh', rate.vt),
      suggest('distribution_fee_nt_kwh', rate.nt),
    ].filter((u): u is [string, number] => u !== null);
    if (updates.length === 0) return;
    this.pricingDraft = { ...this.pricingDraft, ...Object.fromEntries(updates) };
  }

  /** Item 3: VT (+ NT, when dual) distribution price excl. VAT, side by
   * side, both editable — plus the read-only computed "s DPH" line and the
   * `vat_rate` reveal link. */
  private renderDistributionPriceBlock(
    dual: boolean,
    vtField: FieldDef,
    ntField: FieldDef | undefined,
    vatField: FieldDef | undefined,
    vatRatePercent: number,
  ) {
    const vatMultiplier = 1 + vatRatePercent / 100;
    const cell = (field: FieldDef, testid: string) => {
      const raw = this.pricingDraft[field.key];
      const excl = raw == null || raw === '' ? null : Number(raw);
      const incl = excl == null ? null : Math.round(excl * vatMultiplier * 100) / 100;
      return html`
        <div class="price-cell pcard" data-testid=${testid}>
          <span class="lab">${field.label}</span>
          <input
            type="number" step="0.01" min="0"
            data-testid="${testid}-input"
            .value=${excl == null ? '' : String(excl)}
            @change=${(e: Event) => {
              const v = (e.target as HTMLInputElement).value;
              this.pricingDraft = { ...this.pricingDraft, [field.key]: v === '' ? null : Number(v) };
            }}
          />
          <span class="hint" data-testid="${testid}-incl-vat">
            ${incl == null ? nothing : html`s DPH ${vatRatePercent} %: ${incl.toFixed(2)} Kč/kWh`}
          </span>
        </div>`;
    };
    return html`
      <div class="row distribution-price-pair" data-testid="distribution-price-pair">
        ${cell(vtField, 'distribution-fee-vt')}
        ${dual && ntField ? cell(ntField, 'distribution-fee-nt') : nothing}
      </div>
      ${vatField
        ? html`
            <button
              type="button" class="link-button" data-testid="vat-rate-toggle"
              @click=${() => { this.showVatOverride = !this.showVatOverride; }}
            >${this.showVatOverride ? 'Skrýt DPH' : 'Upravit DPH'}</button>
            ${this.showVatOverride
              ? html`<div data-key=${VAT_RATE_KEY}>
                  ${renderFieldPresenter(vatField, {
                    value: this.pricingDraft[VAT_RATE_KEY],
                    dirty: false,
                    secretSet: false,
                    originalValue: this.originalValues[VAT_RATE_KEY],
                    reviewMode: this.onboardingState?.grandfathered === true,
                    onChange: (v: unknown) => {
                      this.pricingDraft = { ...this.pricingDraft, [VAT_RATE_KEY]: v };
                    },
                    entityCatalog: [],
                  })}
                </div>`
              : nothing}
          `
        : nothing}
    `;
  }

  /** `tariff_vt_start_*`/`tariff_nt_start_*` key pair + whether the BE
   * validates that day-group with `allow_single_tariff` (weekend only —
   * schema.py `validate_tariff_hours`/steps.py:2333-2335). */
  private matrixKeysFor(group: DayGroup): { vt: string; nt: string; allowSingleTariff: boolean } {
    return group === 'weekday'
      ? { vt: 'tariff_vt_start_weekday', nt: 'tariff_nt_start_weekday', allowSingleTariff: false }
      : { vt: 'tariff_vt_start_weekend', nt: 'tariff_nt_start_weekend', allowSingleTariff: true };
  }

  /** `pricingDraft`'s 4 strings are the single source of truth; a group's
   * grid is derived fresh every render UNLESS a not-yet-expressible paint is
   * pending for it (`tariffMatrixOverride`). */
  private matrixGridFor(group: DayGroup): Paint[] {
    const override = this.tariffMatrixOverride[group];
    if (override) return override;
    const { vt, nt, allowSingleTariff } = this.matrixKeysFor(group);
    const grid = stringsToGrid(String(this.pricingDraft[vt] ?? ''), String(this.pricingDraft[nt] ?? ''), allowSingleTariff);
    return grid ?? Array<Paint>(24).fill('VT');
  }

  private commitMatrixGrid(group: DayGroup, grid: Paint[]): void {
    const { vt, nt, allowSingleTariff } = this.matrixKeysFor(group);
    const result = gridToStrings(grid, allowSingleTariff);
    if (!result) {
      this.tariffMatrixOverride = { ...this.tariffMatrixOverride, [group]: grid };
      this.tariffMatrixError = {
        ...this.tariffMatrixError,
        [group]: 'Tento vzor zatím neumíme uložit - intervaly musí být souvislé bloky NT/VT',
      };
      return;
    }
    const nextOverride = { ...this.tariffMatrixOverride };
    delete nextOverride[group];
    const nextError = { ...this.tariffMatrixError };
    delete nextError[group];
    this.tariffMatrixOverride = nextOverride;
    this.tariffMatrixError = nextError;
    this.pricingDraft = { ...this.pricingDraft, [vt]: result.vt, [nt]: result.nt };
  }

  private paintMatrixCell(group: DayGroup, hour: number, paint: Paint): void {
    const grid = this.matrixGridFor(group);
    if (grid[hour] === paint) return;
    const next = [...grid];
    next[hour] = paint;
    this.commitMatrixGrid(group, next);
  }

  private beginMatrixPaint(group: DayGroup, hour: number): void {
    const grid = this.matrixGridFor(group);
    const paint: Paint = grid[hour] === 'NT' ? 'VT' : 'NT';
    this._dragGroup = group;
    this._dragPaint = paint;
    this.paintMatrixCell(group, hour, paint);
  }

  private continueMatrixPaint(group: DayGroup, hour: number): void {
    if (this._dragGroup !== group || !this._dragPaint) return;
    this.paintMatrixCell(group, hour, this._dragPaint);
  }

  /** Item 4: the NT/VT schedule grid — replaces the old VT/NT start-hour
   * text inputs when the tariff is dual. Single-tariff never renders this
   * (no matrix, no time fields — whole day VT, matching the old behaviour). */
  /** Item 3b: sparse 0–23 hour labels above each day-group's cell grid —
   * 0/6/12/18/23 only, the rest blank, matching the design reference. */
  private renderMatrixHourLabels() {
    return html`
      <div class="tariff-matrix-hours" aria-hidden="true">
        ${Array.from({ length: 24 }, (_, h) => html`<i>${h % 6 === 0 || h === 23 ? h : ''}</i>`)}
      </div>`;
  }

  private renderTariffMatrix() {
    const groups: Array<{ id: DayGroup; label: string }> = [
      { id: 'weekday', label: 'Pracovní dny (Po–Pá)' },
      { id: 'weekend', label: 'Víkend (So–Ne)' },
    ];
    return html`
      <div class="tariff-matrix" data-testid="tariff-matrix">
        <div class="tariff-matrix-legend">
          <span class="legend-swatch vt"></span> VT
          <span class="legend-swatch nt"></span> NT
        </div>
        ${groups.map(({ id, label }) => {
          const grid = this.matrixGridFor(id);
          const error = this.tariffMatrixError[id];
          return html`
            <div class="tariff-matrix-row" data-testid="tariff-matrix-row-${id}">
              <div class="tariff-matrix-row-label">${label}</div>
              ${this.renderMatrixHourLabels()}
              <div class="tariff-matrix-cells" data-testid="tariff-matrix-cells-${id}">
                ${grid.map((paint, hour) => html`
                  <button
                    type="button"
                    class="tariff-cell ${paint === 'NT' ? 'nt' : 'vt'}"
                    data-testid="tariff-cell-${id}-${hour}"
                    title="${String(hour).padStart(2, '0')}:00"
                    @mousedown=${(e: MouseEvent) => { e.preventDefault(); this.beginMatrixPaint(id, hour); }}
                    @mouseenter=${(e: MouseEvent) => { if (e.buttons === 1) this.continueMatrixPaint(id, hour); }}
                  ></button>
                `)}
              </div>
              <p class="tariff-matrix-summary" data-testid="tariff-matrix-summary-${id}">
                ${summarizeNtIntervals(grid)}
              </p>
              ${error
                ? html`<p class="tariff-matrix-error" data-testid="tariff-matrix-error-${id}">${error}</p>`
                : nothing}
            </div>
          `;
        })}
      </div>`;
  }

  /** True while any day-group's paint is currently inexpressible — gates the
   * wizard's "Next"/"Uložit" button (owner brief: "block save of this step,
   * not the wizard" — Back/Přeskočit stay enabled, only advancing is blocked). */
  private hasBlockingTariffMatrixError(): boolean {
    return this.currentStep === 'pricing_distribution'
      && (this.tariffMatrixError.weekday !== undefined || this.tariffMatrixError.weekend !== undefined);
  }

  /**
   * Read-only "s DPH" computed line (UX-SPEC §4, `fixed_commercial_price_vt`/
   * `_nt` hint: "Zadávejte bez DPH a distribuce") — same pattern as the
   * distribution step's incl-VAT display, computed here since
   * `fixed_commercial_price_*` is a user-entered excl-VAT price, not a
   * dataset lookup (`pricing-vat.ts`'s shared helper).
   */
  private renderInclVatLine(fieldKey: string) {
    const excl = Number(this.pricingDraft[fieldKey] ?? 0);
    const vatRate = Number(this.pricingDraft['vat_rate'] ?? 21);
    const incl = priceInclVat(excl, vatRate);
    return html`
      <div class="row" data-testid=${`incl-vat-${fieldKey}`}>
        <span class="lab">Cena s DPH</span>
        <div class="row-control">${incl.toFixed(2)} Kč/kWh</div>
      </div>
    `;
  }

  /**
   * Nakup/Prodej scenario field body (content fix item 3c) — any field with
   * a `_nt` counterpart in `fields` renders paired, VT+NT side by side as
   * pcards (single-column on mobile via `.vt-nt-row`'s CSS); a field with no
   * `_nt` sibling (single-tariff selection, or `export_fixed_price`, which
   * has no NT variant at all) renders standalone. `fixed_commercial_price_*`
   * additionally gets the computed incl-VAT line, same as before — the only
   * pair whose unit is a plain Kč/kWh price, not a %/Kč-MWh fee.
   */
  private renderScenarioFields(fields: FieldDef[], testid: string) {
    const byKey = new Map(fields.map((f) => [f.key, f]));
    const renderCell = (f: FieldDef) => html`
      <div class="pcard" data-key=${f.key}>
        ${renderFieldPresenter(f, {
          value: this.pricingDraft[f.key],
          dirty: false,
          secretSet: false,
          originalValue: this.originalValues[f.key],
          reviewMode: this.onboardingState?.grandfathered === true,
          onChange: (v: unknown) => {
            this.pricingDraft = { ...this.pricingDraft, [f.key]: v };
          },
          entityCatalog: [],
        })}
        ${f.key === 'fixed_commercial_price_vt' || f.key === 'fixed_commercial_price_nt'
          ? this.renderInclVatLine(f.key)
          : nothing}
      </div>
    `;
    // Most pairs are `key`/`${key}_nt` (spot_positive_fee_percent, ...);
    // `fixed_commercial_price_vt` is the one exception, whose NT sibling is
    // `fixed_commercial_price_nt`, not `fixed_commercial_price_vt_nt`.
    const ntCounterpartKey = (key: string): string =>
      key === 'fixed_commercial_price_vt' ? 'fixed_commercial_price_nt' : `${key}_nt`;
    const consumedNtKeys = new Set<string>();
    fields.forEach((f) => {
      const ntKey = ntCounterpartKey(f.key);
      if (byKey.has(ntKey)) consumedNtKeys.add(ntKey);
    });
    const items = fields.flatMap((f) => {
      if (consumedNtKeys.has(f.key)) return []; // rendered paired with its VT sibling below
      const ntField = byKey.get(ntCounterpartKey(f.key));
      if (ntField) {
        const rowTestid = f.key === 'fixed_commercial_price_vt'
          ? 'fixed-price-vt-nt-row'
          : `${f.key.replace(/_/g, '-')}-vt-nt-row`;
        return [html`<div class="vt-nt-row" data-testid=${rowTestid}>${renderCell(f)}${renderCell(ntField)}</div>`];
      }
      return [renderCell(f)];
    });
    return html`<div class="scenario-fields" data-testid=${testid}>${items}</div>`;
  }

  /** Step header — glow icon tile + title + one-line subtitle (design rev 3
   * item 2). Relies on the enclosing `<section style="--sc:...">` for its
   * color, so every call site is a section's own domain, not a repeated arg. */
  private renderStepHead(stepId: OnboardingStepId) {
    return html`
      <div class="step-head">
        <div class="step-head-icon" aria-hidden="true">${STEP_ICON[stepId]}</div>
        <div>
          <h3>${STEP_LABELS[stepId]}</h3>
          <p class="step-head-sub">${STEP_SUBTITLES[stepId]}</p>
        </div>
      </div>`;
  }

  private renderStepContent() {
    if (this.currentStep === 'welcome') {
      const isReview = this.onboardingState?.grandfathered === true; // design decision 3
      return html`
        <section class="step step-welcome" data-step="welcome" style=${`--sc:${STEP_COLOR_VAR.welcome}`}>
          ${this.renderStepHead('welcome')}
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
          <section class="step step-solar" data-step="solar" style=${`--sc:${STEP_COLOR_VAR.solar}`}>
            ${this.renderStepHead('solar')}
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
          <section class="step step-solar" data-step="solar" style=${`--sc:${STEP_COLOR_VAR.solar}`}>
            ${this.renderStepHead('solar')}
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
        <section class="step step-solar" data-step="solar" style=${`--sc:${STEP_COLOR_VAR.solar}`}>
          ${this.renderStepHead('solar')}
          <div class="step-card">
            ${allStringsHidden
              ? html`<p data-testid="solar-all-hidden" class="hint">
                  Povolte alespoň jeden string pro zobrazení polí výkonu a orientace.
                </p>`
              : nothing}
            ${visible.flatMap((f) => {
              const row = renderFieldPresenter(f, {
                value: this.solarDraft[f.key],
                dirty: false,
                secretSet: !!f.secret && !!this.originalValues[`${f.key}_set`],
                originalValue: this.originalValues[f.key],
                reviewMode: this.onboardingState?.grandfathered === true,
                secretRevealed: this.revealedSecretKeys.has(f.key),
                onRevealSecret: () => this.revealSecret(f.key),
                onChange: (v: unknown) => {
                  this.solarDraft = { ...this.solarDraft, [f.key]: v };
                  this.solarTestMatchesDraft = false;
                },
                entityCatalog: [],
              });
              // Live-walk defect 3: guide card directly below the provider
              // select, before its credential field(s).
              if (f.key === 'solar_forecast_provider') return [row, this.renderSolarProviderGuide()];
              // Owner correction round 2 (UX-SPEC §Step 3): one-click action
              // directly below the GPS pair, wiring hass.config into the
              // fields the user could otherwise only type by hand — not a
              // new data source (steps.py:1687-1688 reads the same values).
              if (f.key !== 'solar_forecast_longitude') return [row];
              return [
                row,
                html`<button
                  type="button"
                  data-testid="solar-gps-from-hass"
                  ?disabled=${!this.hass?.config?.latitude}
                  @click=${() => {
                    this.solarDraft = {
                      ...this.solarDraft,
                      solar_forecast_latitude: this.hass?.config?.latitude,
                      solar_forecast_longitude: this.hass?.config?.longitude,
                    };
                    this.solarTestMatchesDraft = false;
                  }}
                >📍 Převzít z Home Assistanta</button>`,
              ];
            })}
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

    if (this.currentStep === 'battery') {
      if (this.bootstrapRetry.registry) {
        return html`
          <section class="step step-battery" data-step="battery" style=${`--sc:${STEP_COLOR_VAR.battery}`}>
            ${this.renderStepHead('battery')}
            <div class="step-card">
              <p data-testid="battery-bootstrap-retry">${t('onboarding.bootstrap.load_failed', this.wizardLang)}</p>
              <button
                type="button"
                data-testid="battery-bootstrap-retry-button"
                @click=${() => this.retrySolarBootstrap()}
              >${t('onboarding.bootstrap.retry_button', this.wizardLang)}</button>
            </div>
          </section>
        `;
      }
      if (!this._registry || STEP_BATTERY.fields(this._registry).length === 0) {
        return html`
          <section class="step step-battery" data-step="battery" style=${`--sc:${STEP_COLOR_VAR.battery}`}>
            ${this.renderStepHead('battery')}
            <div class="step-card">
              <p data-testid="battery-not-available">
                Pole baterie nejsou k dispozici.
              </p>
            </div>
          </section>
        `;
      }

      const visible = STEP_BATTERY.visibleFields(this._registry, this.batteryDraft);
      const visibleByKey = new Map(visible.map((f) => [f.key, f]));
      const renderHardwareChip = (chip: (typeof BATTERY_HARDWARE_CHIPS)[number]) => {
        const value = getBatteryHardwareValue(this.hass, this.inverterSn, chip.attr);
        const valueText = value == null
          ? t('onboarding.battery.hardware.unavailable', this.wizardLang)
          : `${String(value)} kWh`;
        return html`
          <div class="battery-chip" data-testid=${chip.id}>
            <span class="battery-chip-label">${t(chip.labelKey, this.wizardLang)}</span>
            <span class="battery-chip-value">${valueText}</span>
          </div>
        `;
      };
      const openSimulator = () => {
        this.dispatchEvent(new CustomEvent('oig-simulator-open', {
          bubbles: true,
          composed: true,
          detail: {
            domain: 'battery',
            box: this.inverterSn,
            draft: { ...this.batteryDraft },
          },
        }));
      };

      return html`
        <section class="step step-battery" data-step="battery" style=${`--sc:${STEP_COLOR_VAR.battery}`}>
          ${this.renderStepHead('battery')}
          <div class="step-card">
            <div class="battery-hardware" data-testid="battery-hardware">
              ${BATTERY_HARDWARE_CHIPS.map(renderHardwareChip)}
            </div>
            ${BATTERY_GROUPS.map((group) => {
              const groupFields = group.keys.map((key) => visibleByKey.get(key)).filter((f): f is FieldDef => !!f);
              // Item 2: number+unit pair as pcards, side by side (design rev 3
              // "distribution/battery pairs") — only the charge-rate/reserve
              // pair reads as a pcard row; the rest of the step is unchanged.
              const asPair = group.id === 'nabijeni';
              const renderField = (f: FieldDef) => html`
                <div class=${asPair ? 'pcard' : ''} data-key=${f.key}>
                  ${renderFieldPresenter(f, {
                    value: this.batteryDraft[f.key],
                    dirty: false,
                    secretSet: !!f.secret && !!this.originalValues[`${f.key}_set`],
                    originalValue: this.originalValues[f.key],
                    reviewMode: this.onboardingState?.grandfathered === true,
                    secretRevealed: this.revealedSecretKeys.has(f.key),
                    onRevealSecret: () => this.revealSecret(f.key),
                    onChange: (v: unknown) => {
                      this.batteryDraft = { ...this.batteryDraft, [f.key]: v };
                    },
                    entityCatalog: [],
                  })}
                </div>
              `;
              return html`
              <div class="battery-group" data-group=${group.id}>
                <h4 data-testid="battery-group-heading">${group.heading}</h4>
                ${asPair
                  ? html`<div class="pair">${groupFields.map(renderField)}</div>`
                  : groupFields.map(renderField)}
              </div>`;
            })}
            <div class="battery-actions">
              <button
                type="button"
                class="battery-sim-button"
                data-testid="battery-simulator-button"
                @click=${openSimulator}
              >${t('onboarding.battery.simulator_button', this.wizardLang)}</button>
            </div>
          </div>
        </section>
      `;
    }

    if (
      this.currentStep === 'pricing_distribution'
      || this.currentStep === 'pricing_supplier'
      || this.currentStep === 'pricing_supplier_sell'
    ) {
      // Bootstrap plumbing is shared by both field bodies below — the retry
      // affordance is shell behaviour, not step content, so it stays common.
      // Both steps now render registry-driven fields (Stage S3 Tasks 14-16),
      // so the registry outcome gates them too, same as solar's own check.
      if (this.bootstrapRetry.registry || this.bootstrapRetry.pricing || this.bootstrapRetry.pricingConfig) {
        return html`
          <section class="step step-stub" data-step=${this.currentStep} style=${`--sc:${STEP_COLOR_VAR[this.currentStep]}`}>
            ${this.renderStepHead(this.currentStep)}
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
    }

    if (this.currentStep === 'pricing_distribution') {
      if (!this._registry || STEP_PRICING_DISTRIBUTION.fields(this._registry).length === 0) {
        return html`
          <section class="step step-pricing-distribution" data-step="pricing_distribution" style=${`--sc:${STEP_COLOR_VAR.pricing_distribution}`}>
            ${this.renderStepHead('pricing_distribution')}
            <div class="step-card">
              <p data-testid="pricing-distribution-not-available">Ceny nejsou dostupné.</p>
            </div>
          </section>
        `;
      }

      // Task 14: dual-ness for THIS step's own display is derived fresh from
      // the live draft on every render (no stored flag needed locally).
      const tariff = this.pricingDraft['confirmed_distribution_tariff'] as string | undefined;
      const dual = isDualTariffCode(tariff);

      const registry = this._registry;
      // Owner walk content fix (a): the legacy dataset price trio (incl-VAT /
      // excl-VAT / editable MWh unit) never renders — the kWh fee block with
      // computed VAT below is the single price surface, single- or
      // dual-tariff alike. Display-only: the keys stay in the registry/draft
      // untouched, the dataset suggestion still prefills the kWh fields via
      // `applyDistributionFeeSuggestion`.
      const excludedFromGenericRender: readonly string[] = [
        ...TARIFF_SCHEDULE_KEYS, ...DISTRIBUTION_PRICE_KEYS, VAT_RATE_KEY,
        'confirmed_distribution_price_incl_vat', 'confirmed_distribution_price_excl_vat',
        'confirmed_distribution_unit',
      ];
      const visible = STEP_PRICING_DISTRIBUTION.visibleFields(registry, this.pricingDraft)
        .filter((f) => !excludedFromGenericRender.includes(f.key));
      const distributor = this.pricingDraft['confirmed_distribution_distributor'] as string | undefined;
      const rate = distributor && tariff ? this.pricing?.distributors?.[distributor]?.[tariff] : undefined;

      const vtFeeField = STEP_PRICING_DISTRIBUTION.fields(registry).find((f) => f.key === 'distribution_fee_vt_kwh');
      const ntFeeField = STEP_PRICING_DISTRIBUTION.fields(registry).find((f) => f.key === 'distribution_fee_nt_kwh');
      const vatField = STEP_PRICING_DISTRIBUTION.fields(registry).find((f) => f.key === VAT_RATE_KEY);
      const vatRate = Number(this.pricingDraft[VAT_RATE_KEY] ?? registry?.fields[VAT_RATE_KEY]?.default ?? 21);

      return html`
        <section class="step step-pricing-distribution" data-step="pricing_distribution" style=${`--sc:${STEP_COLOR_VAR.pricing_distribution}`}>
          ${this.renderStepHead('pricing_distribution')}
          <div class="step-card">
            ${visible.map((f) => html`
              <div data-key=${f.key}>
                ${f.key === 'confirmed_distribution_distributor' ? this.renderDistributorIconSlot() : nothing}
                ${renderFieldPresenter(f, {
                  value: this.pricingDraft[f.key],
                  dirty: false,
                  secretSet: !!f.secret && !!this.originalValues[`${f.key}_set`],
                  originalValue: this.originalValues[f.key],
                  reviewMode: this.onboardingState?.grandfathered === true,
                  secretRevealed: this.revealedSecretKeys.has(f.key),
                  onRevealSecret: () => this.revealSecret(f.key),
                  onChange: (v: unknown) => {
                    this.pricingDraft = { ...this.pricingDraft, [f.key]: v };
                    // Task 17: the distribution step's tariff-change handler
                    // is where the cross-step `isDualTariff` flag is set —
                    // reuses Task 14's `isDualTariffCode`, not a second
                    // dual-code-set.
                    if (f.key === 'confirmed_distribution_tariff') {
                      this.isDualTariff = isDualTariffCode(v);
                    }
                    if (f.key === 'confirmed_distribution_tariff' || f.key === 'confirmed_distribution_distributor') {
                      this.applyDistributionFeeSuggestion();
                    }
                  },
                  entityCatalog: [],
                })}
                ${f.key === 'confirmed_distribution_tariff'
                  ? html`
                      ${rate?.description
                        ? html`<p class="hint" data-testid="tariff-description">${rate.description}</p>`
                        : nothing}
                      <p class="hint" data-testid="tariff-invoice-hint">
                        Svou sazbu najdete na faktuře za elektřinu, obvykle v části „Distribuční sazba“ nebo „Sazba“.
                      </p>
                    `
                  : nothing}
              </div>
            `)}
            ${tariff
              ? html`<p data-testid="tariff-dual-info" class="hint">
                  ${dual ? 'Dvoutarifní — ceny zvlášť pro VT a NT.' : 'Jednotarifní — jedna cena po celý den.'}
                </p>`
              : nothing}
            ${tariff && vtFeeField
              ? this.renderDistributionPriceBlock(dual, vtFeeField, ntFeeField, vatField, vatRate)
              : nothing}
            ${dual ? this.renderTariffMatrix() : nothing}
            ${this.pricingLoadFailed
              ? html`<p data-testid="pricing-stale-warning" class="hint">Ceny nejsou dostupné.</p>`
              : nothing}
          </div>
        </section>
      `;
    }

    if (this.currentStep === 'pricing_supplier') {
      // The recovered-values note (K2f, Task 11) is step-level copy,
      // independent of whether the registry happens to carry
      // `pricing_supplier` fields in this render — never gated behind the
      // fields-available check below (a registry fixture that only seeds
      // OTHER sections must not silently hide it).
      const hasFields = !!this._registry && STEP_PRICING_SUPPLIER.fields(this._registry).length > 0;
      const visible = hasFields
        ? STEP_PRICING_SUPPLIER.visibleFields(this._registry!, this.pricingDraft, this.isDualTariff)
        : [];
      const scenario = this.pricingDraft['spot_pricing_model'] as string | undefined;
      const scenarioFields = visible.filter((f) => f.key !== 'spot_pricing_model');

      return html`
        <section class="step step-pricing-supplier" data-step="pricing_supplier" style=${`--sc:${STEP_COLOR_VAR.pricing_supplier}`}>
          ${this.renderStepHead('pricing_supplier')}
          <div class="step-card">
            ${this.showRecoveredPricingNote()
              ? html`<p data-testid="recovered-pricing-note" class="hint">
                  ${t('onboarding.pricing_supplier.recovered_note', this.wizardLang)}
                </p>`
              : nothing}
            <p data-testid="pricing-supplier-intro" class="hint">
              Nákupní cena od dodavatele — kolik platíte za elektřinu odebranou ze sítě. Vyberte
              scénář, který odpovídá vaší smlouvě.
            </p>
            ${hasFields
              ? html`
                  ${renderScenarioCards(
                    SCENARIO_CARDS_BUY,
                    scenario,
                    (v) => { this.pricingDraft = { ...this.pricingDraft, spot_pricing_model: v }; },
                    'scenario-cards-buy',
                  )}
                  ${scenario ? this.renderScenarioFields(scenarioFields, 'scenario-fields-buy') : nothing}
                `
              : html`<p data-testid="pricing-supplier-not-available">Ceny nejsou dostupné.</p>`}
          </div>
        </section>
      `;
    }

    if (this.currentStep === 'pricing_supplier_sell') {
      const hasFields = !!this._registry && STEP_PRICING_SUPPLIER_SELL.fields(this._registry).length > 0;
      const visible = hasFields
        ? STEP_PRICING_SUPPLIER_SELL.visibleFields(this._registry!, this.pricingDraft, this.isDualTariff)
        : [];
      const scenario = this.pricingDraft['export_pricing_model'] as string | undefined;
      const scenarioFields = visible.filter((f) => f.key !== 'export_pricing_model');

      return html`
        <section class="step step-pricing-supplier-sell" data-step="pricing_supplier_sell" style=${`--sc:${STEP_COLOR_VAR.pricing_supplier_sell}`}>
          ${this.renderStepHead('pricing_supplier_sell')}
          <div class="step-card">
            <p data-testid="pricing-supplier-sell-intro" class="hint">
              Prodejní (výkupní) cena — kolik dostanete za elektřinu dodanou do sítě. Vyberte
              scénář, který odpovídá vaší smlouvě.
            </p>
            ${hasFields
              ? html`
                  ${renderScenarioCards(
                    SCENARIO_CARDS_SELL,
                    scenario,
                    (v) => { this.pricingDraft = { ...this.pricingDraft, export_pricing_model: v }; },
                    'scenario-cards-sell',
                  )}
                  ${scenario ? this.renderScenarioFields(scenarioFields, 'scenario-fields-sell') : nothing}
                `
              : html`<p data-testid="pricing-supplier-sell-not-available">Ceny nejsou dostupné.</p>`}
          </div>
        </section>
      `;
    }

    if (this.currentStep === 'boiler') {
      if (!this._registry || STEP_BOILER.fields(this._registry).length === 0) {
        return html`
          <section class="step step-boiler" data-step="boiler" style=${`--sc:${STEP_COLOR_VAR.boiler}`}>
            ${this.renderStepHead('boiler')}
            <div class="step-card">
              <p data-testid="boiler-not-available">Pole bojleru nejsou k dispozici.</p>
            </div>
          </section>
        `;
      }

      const registry = this._registry;
      const byKey = new Map(STEP_BOILER.fields(registry).map((f) => [f.key, f]));
      const reviewMode = this.onboardingState?.grandfathered === true;
      const renderRow = (f: FieldDef) => html`
        <div data-key=${f.key}>
          ${renderFieldPresenter(f, {
            value: this.boilerDraft[f.key] ?? this.originalValues[f.key] ?? registry.fields[f.key]?.default,
            dirty: false,
            secretSet: !!f.secret && !!this.originalValues[`${f.key}_set`],
            originalValue: this.originalValues[f.key],
            reviewMode,
            secretRevealed: this.revealedSecretKeys.has(f.key),
            onRevealSecret: () => this.revealSecret(f.key),
            onChange: (v: unknown) => {
              this.boilerDraft = { ...this.boilerDraft, [f.key]: v };
            },
            entityCatalog: [],
          })}
        </div>
      `;

      return html`
        <section class="step step-boiler" data-step="boiler" style=${`--sc:${STEP_COLOR_VAR.boiler}`}>
          ${this.renderStepHead('boiler')}
          <div class="step-card">
            ${BOILER_FIELD_GROUPS.map((group) => {
              const groupFields = group.keys.map((k) => byKey.get(k)).filter((f): f is FieldDef => !!f);
              if (groupFields.length === 0) return nothing;
              return html`
                <div class="field-group" data-testid="boiler-group">
                  <h4>${group.heading}</h4>
                  ${groupFields.map(renderRow)}
                </div>
              `;
            })}
            ${(() => {
              const leftover = ungroupedBoilerFields(registry);
              return leftover.length === 0 ? nothing : html`
                <div class="field-group" data-testid="boiler-group-other">
                  ${leftover.map(renderRow)}
                </div>
              `;
            })()}
          </div>
        </section>
      `;
    }

    if (this.currentStep === 'modules') {
      const turnedOff = this.turnedOffModuleKeys();

      // Spec-fixed group order (`MODULES_GROUP_HLAVNI`/`_DOPLNKOVE`, :357-369),
      // NOT the registry's own field order — same lookup-by-key approach as
      // `STEP_GATE`.
      const moduleFields = this._registry ? fieldsFromRegistry(this._registry, 'modules') : [];
      const byKey = new Map(moduleFields.map((f): [string, FieldDef] => [f.key, f]));
      const hlavniFields = MODULES_GROUP_HLAVNI.map((k) => byKey.get(k)).filter((f): f is FieldDef => !!f);
      const doplnkoveFields = MODULES_GROUP_DOPLNKOVE.map((k) => byKey.get(k)).filter((f): f is FieldDef => !!f);

      const renderGroup = (fields: FieldDef[]) => fields.map((f) => {
        const { hardMissing, softMissing } = this.moduleDepState(f.key);
        const gated = hardMissing.length > 0;
        return html`
        <div data-key=${f.key}>
          ${renderFieldPresenter(f, {
            value: this.modulesDraft[f.key],
            dirty: false,
            disabled: gated,
            secretSet: !!f.secret && !!this.originalValues[`${f.key}_set`],
            originalValue: this.originalValues[f.key],
            reviewMode: this.onboardingState?.grandfathered === true,
            secretRevealed: this.revealedSecretKeys.has(f.key),
            onRevealSecret: () => this.revealSecret(f.key),
            onChange: (v: unknown) => this.onModuleToggle(f.key, v),
            entityCatalog: [],
          })}
          ${gated
            ? html`<p class="dep-explain dep-hard" data-testid="dep-hard-${f.key}">
                ${t('onboarding.modules.dep_hard_prefix', this.wizardLang)}
                ${hardMissing.map((d) => fieldLabel(d, `field.${d}.label`)).join(', ')}
                <button type="button" class="dep-enable" data-testid="dep-enable-${f.key}"
                  @click=${() => this.enableModulePrereqs(f.key)}>
                  ${t('onboarding.modules.dep_enable_btn', this.wizardLang)}
                </button>
              </p>`
            : nothing}
          ${!gated && this.moduleIsOn(f.key) && softMissing.length > 0
            ? html`<p class="dep-explain dep-soft" data-testid="dep-soft-${f.key}">
                ${t(`onboarding.modules.dep_soft.${f.key}`, this.wizardLang)}
              </p>`
            : nothing}
        </div>
      `;
      });

      const pending = this._pendingPrereqOff;

      return html`
        <section class="step step-modules" data-step="modules" style=${`--sc:${STEP_COLOR_VAR.modules}`}>
          ${this.renderStepHead('modules')}
          <div class="step-card">
            ${pending
              ? html`<div class="prereq-confirm" data-testid="prereq-off-confirm" role="alertdialog">
                  <p>${t('onboarding.modules.prereq_off_confirm', this.wizardLang)}</p>
                  <div class="prereq-confirm-actions">
                    <button type="button" data-testid="prereq-off-cancel"
                      @click=${() => this.cancelPrereqOff()}>
                      ${t('onboarding.modules.prereq_off_cancel', this.wizardLang)}
                    </button>
                    <button type="button" class="danger" data-testid="prereq-off-confirm-yes"
                      @click=${() => this.confirmPrereqOff()}>
                      ${t('onboarding.modules.prereq_off_confirm_yes', this.wizardLang)}
                    </button>
                  </div>
                </div>`
              : nothing}
            ${turnedOff.length > 0
              ? html`<p data-testid="module-off-warning" class="hint">
                  ${t('onboarding.modules.off_warning', this.wizardLang)}
                </p>`
              : nothing}
            ${hlavniFields.length === 0 && doplnkoveFields.length === 0
              ? html`<p data-testid="modules-not-available">Moduly nejsou k dispozici.</p>`
              : html`
                  <div class="module-group" data-group="hlavni">
                    <h4>${t('onboarding.modules.group_hlavni', this.wizardLang)}</h4>
                    ${renderGroup(hlavniFields)}
                  </div>
                  <div class="module-group" data-group="doplnkove">
                    <h4>${t('onboarding.modules.group_doplnkove', this.wizardLang)}</h4>
                    ${renderGroup(doplnkoveFields)}
                  </div>
                `}
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
          <section class="step step-summary" data-step="summary" style=${`--sc:${STEP_COLOR_VAR.summary}`}>
            ${this.renderStepHead('summary')}
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
        <section class="step step-summary" data-step="summary" style=${`--sc:${STEP_COLOR_VAR.summary}`}>
          ${this.renderStepHead('summary')}
          <div class="step-card">
            <p>${t('onboarding.summary.new_install_heading', this.wizardLang)}</p>
            <ul>
              ${enabledModules.map((label) => html`<li>${label}</li>`)}
            </ul>
          </div>
        </section>
      `;
    }

    if (this.currentStep === 'connection') {
      if (!this._registry) {
        return html`
          <section class="step step-stub" data-step="connection" style=${`--sc:${STEP_COLOR_VAR.connection}`}>
            ${this.renderStepHead('connection')}
            <div class="step-card">
              <p data-testid="step-stub-placeholder">
                Tento krok bude doplněn v další verzi průvodce.
              </p>
            </div>
          </section>
        `;
      }

      const visible = STEP_CONNECTION.visibleFields(this._registry, this.connectionDraft);
      return html`
        <section class="step step-connection" data-step="connection" style=${`--sc:${STEP_COLOR_VAR.connection}`}>
          ${this.renderStepHead('connection')}
          <div class="step-card">
            <div class="connection-explainer" data-testid="connection-explainer">
              <p>${t('onboarding.connection.explainer_cloud', this.wizardLang)}</p>
              <p>${t('onboarding.connection.explainer_local', this.wizardLang)}</p>
            </div>
            ${visible.map((f) => html`
              <div data-key=${f.key}>
                ${renderFieldPresenter(f, {
                  value: this.connectionDraft[f.key],
                  dirty: false,
                  secretSet: !!f.secret && !!this.originalValues[`${f.key}_set`],
                  originalValue: this.originalValues[f.key],
                  reviewMode: this.onboardingState?.grandfathered === true,
                  secretRevealed: this.revealedSecretKeys.has(f.key),
                  onRevealSecret: () => this.revealSecret(f.key),
                  onChange: (v: unknown) => {
                    this.connectionDraft = { ...this.connectionDraft, [f.key]: v };
                  },
                  entityCatalog: [],
                })}
              </div>
            `)}
          </div>
        </section>
      `;
    }

    // Every other step without dedicated content yet (battery, boiler —
    // Stage S3 fills these in). A stub, not a second source of truth.
    return html`
      <section class="step step-stub" data-step=${this.currentStep} style=${`--sc:${STEP_COLOR_VAR[this.currentStep]}`}>
        ${this.renderStepHead(this.currentStep)}
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

          <div class="navwrap">
            <div class="phasebar" data-testid="wizard-phasebar">
              ${visibleSteps.map((s, i) => html`
                <i
                  data-testid="wizard-phasebar-segment"
                  data-phase=${STEP_PHASE[s] ?? ''}
                  style=${`background:${STEP_PHASE[s] === 'A' ? 'var(--phA)' : STEP_PHASE[s] === 'B' ? 'var(--phB)' : 'transparent'};opacity:${i === idx ? 1 : 0.35}`}
                ></i>
              `)}
            </div>

            <nav class="steps" data-testid="wizard-steps" aria-label="Kroky průvodce">
              ${visibleSteps.map((s) => {
                const status = this.onboardingState?.steps[s] ?? 'pending';
                const isCurrent = this.currentStep === s;
                const statusLabel = isCurrent ? 'právě zde' : STEP_STATUS_LABELS[status];
                return html`
                  <button
                    type="button"
                    class="st ${isCurrent ? 'cur active' : status === 'done' ? 'done' : ''}"
                    style=${`--sc:${STEP_COLOR_VAR[s]}`}
                    data-step=${s}
                    title=${`${STEP_LABELS[s]} — ${statusLabel}`}
                    aria-current=${isCurrent ? 'step' : nothing}
                    @click=${() => this.jumpTo(s)}
                  >
                    <span class="ic" aria-hidden="true">${STEP_ICON[s]}</span>
                    <span class="stlabel">${STEP_LABELS[s]}</span>
                    <span
                      class="step-status sr-only"
                      data-testid=${`wizard-step-status-${s}`}
                      data-status=${status}
                    >${statusLabel}</span>
                  </button>
                `;
              })}
            </nav>

            <div class="stepmeta" data-testid="wizard-stepmeta">
              <b>Krok ${idx + 1} z ${visibleSteps.length} · ${STEP_PHASE[this.currentStep] === 'A' ? PHASE_LABELS.A : STEP_PHASE[this.currentStep] === 'B' ? PHASE_LABELS.B : (this.currentStep === 'welcome' ? 'Úvod' : 'Závěr')}</b>
              <em style=${`--sc:${STEP_COLOR_VAR[this.currentStep]}`}>${STEP_LABELS[this.currentStep]}</em>
            </div>
          </div>

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
              ?disabled=${this.finishing || this.hasBlockingTariffMatrixError()}
              @click=${() => void this.goNext()}
            >${this.finishing ? 'Dokončuji…' : isLast ? (isReview ? 'Uložit' : 'Dokončit') : 'Další →'}</button>
          </footer>
        </div>
      </div>
    `;
  }
}
