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
import { STEP_SOLAR } from './step-solar';
import { STEP_PRICING } from './step-pricing';
import {
  loadOnboardingState,
  skipOnboardingStep,
  verifyAiKey,
  type OnboardingState,
  type OnboardingStepId,
  type AiVerifyResult,
} from './onboarding-data';

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

  /** Soft-guide state — null while loading / on network error. */
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
    if (this.inverterSn) void this.refresh();
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
          ${this.state?.steps.ai === 'done'
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
 * The wizard's step sequence. AI → Solar → Pricing. Each step is soft /
 * skippable per SCOPE-REVISION #5/#6 — this is a guide, never a wall.
 */
const WIZARD_STEPS: ReadonlyArray<OnboardingStepId> = ['ai', 'solar', 'pricing'];

/**
 * Per-step display meta. `skippable` is sourced from the typed step
 * descriptors (STEP_AI / STEP_SOLAR / STEP_PRICING) so adding a new step only
 * needs touching step-*.ts + this map — no second source of truth.
 */
const STEP_LABELS: Record<OnboardingStepId, string> = {
  ai: 'AI',
  solar: 'Solar',
  pricing: 'Ceny',
};

const STEP_SKIPPABLE: Record<OnboardingStepId, boolean> = {
  ai: STEP_AI.skippable,
  solar: STEP_SOLAR.skippable,
  pricing: STEP_PRICING.skippable,
};

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

  /** Internal step routing — single source of truth is `WIZARD_STEPS`. */
  @state() private currentStep: OnboardingStepId = 'ai';

  static styles = css`
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
  `;

  private goNext(): void {
    const i = WIZARD_STEPS.indexOf(this.currentStep);
    if (i < 0) return;
    if (i >= WIZARD_STEPS.length - 1) {
      this.close();
      return;
    }
    this.currentStep = WIZARD_STEPS[i + 1];
  }

  private goPrev(): void {
    const i = WIZARD_STEPS.indexOf(this.currentStep);
    if (i <= 0) return;
    this.currentStep = WIZARD_STEPS[i - 1];
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
        await skipOnboardingStep(this.inverterSn, this.currentStep);
        this.dispatchEvent(new CustomEvent('onboarding-changed', {
          bubbles: true,
          composed: true,
        }));
      } catch {
        // Soft guide: a failed skip must not wall the user — advance anyway.
      }
    }
    this.goNext();
  }

  private close(): void {
    this.open = false;
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private jumpTo(step: OnboardingStepId): void {
    this.currentStep = step;
  }

  /** Order index of the current step — drives disabled-state and labels. */
  private currentIndex(): number {
    return WIZARD_STEPS.indexOf(this.currentStep);
  }

  private renderStepContent() {
    if (this.currentStep === 'ai') {
      // Reuse the typed AI renderer (provider cards + key verify). It owns
      // its own state — the wizard just hosts it.
      return html`<oig-onboarding-step-ai
        class="step step-ai"
        .inverterSn=${this.inverterSn}
      ></oig-onboarding-step-ai>`;
    }

    if (this.currentStep === 'solar') {
      // P5: no second field list — solar fields live in the registry, rendered
      // by the Settings tab. The wizard is a guide to the right place.
      return html`
        <section class="step step-solar" data-step="solar">
          <h3>② Solar</h3>
          <div class="step-card">
            <p>
              Solar settings (registr poskytovatele forecastu, API klíč, režim)
              najdete v <strong>Nastavení</strong>.
            </p>
            <p>
              Průvodce záměrně nezobrazuje formulář znovu — konfigurace se
              provede jednou, a to v Nastavení.
            </p>
          </div>
        </section>
      `;
    }

    // pricing
    return html`
      <section class="step step-pricing" data-step="pricing">
        <h3>③ Ceny</h3>
        <div class="step-card">
          <p>
            Tarify, spotové ceny a kalkulace najdete v záložce <strong>Ceny</strong>.
          </p>
          <p>
            Průvodce nezobrazuje cenový editor znovu — konfigurace tarifů se
            provede jednou, a to v Nastavení → Tarify.
          </p>
        </div>
      </section>
    `;
  }

  render() {
    if (!this.open) return nothing;

    const idx = this.currentIndex();
    const isFirst = idx <= 0;
    const isLast = idx >= WIZARD_STEPS.length - 1;
    const skippable = STEP_SKIPPABLE[this.currentStep];

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

          <nav class="steps" data-testid="wizard-steps" aria-label="Kroky průvodce">
            ${WIZARD_STEPS.map((s, i) => html`
              <button
                type="button"
                class=${this.currentStep === s ? 'active' : ''}
                data-step=${s}
                @click=${() => this.jumpTo(s)}
              >${i + 1} ${STEP_LABELS[s]}</button>
            `)}
          </nav>

          <div class="content" data-testid="wizard-content">
            ${this.renderStepContent()}
          </div>

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
              @click=${this.goNext}
            >${isLast ? 'Dokončit' : 'Další →'}</button>
          </footer>
        </div>
      </div>
    `;
  }
}
