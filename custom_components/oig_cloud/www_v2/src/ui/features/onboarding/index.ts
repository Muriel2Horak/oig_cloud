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
import {
  loadOnboardingState,
  verifyAiKey,
  type OnboardingState,
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
  }
}
