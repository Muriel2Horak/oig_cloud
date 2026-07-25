import { LitElement, css, html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { t } from '@/i18n/onboarding';

@customElement('oig-onboarding-banner')
export class OigOnboardingBanner extends LitElement {
  /**
   * True for an existing (grandfathered) entry — D11: shown a distinct
   * "review your config" copy, and its dismissal is persisted server-side
   * (`dismiss-onboarding-banner` event) since such a user may never want
   * the wizard. A non-grandfathered dismissal stays local/session-only.
   */
  @property({ type: Boolean }) grandfathered = false;
  @property({ type: String }) lang: 'cs' | 'en' = 'cs';
  @state() private dismissed = false;

  static styles = css`
    :host {
      display: block;
      margin-bottom: 12px;
    }

    .banner {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 14px;
      border: 1px solid var(--divider-color, rgba(120, 160, 255, 0.3));
      border-radius: 10px;
      background: var(--card-bg, rgba(120, 160, 255, 0.08));
      color: var(--primary-text-color, inherit);
    }

    .copy {
      flex: 1;
      min-width: 0;
      font-size: 13px;
      line-height: 1.4;
    }

    .copy strong {
      display: block;
      margin-bottom: 2px;
    }

    button {
      border-radius: 8px;
      cursor: pointer;
      font: inherit;
    }

    .launch {
      padding: 7px 12px;
      border: none;
      background: var(--primary-color, #4f7cff);
      color: #fff;
      font-weight: 600;
      white-space: nowrap;
    }

    .close {
      padding: 4px 7px;
      border: 1px solid var(--divider-color, rgba(255, 255, 255, 0.18));
      background: transparent;
      color: inherit;
      font-size: 16px;
      line-height: 1;
    }

    @media (max-width: 600px) {
      .banner { align-items: flex-start; flex-wrap: wrap; }
      .copy { flex-basis: calc(100% - 42px); }
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.setAttribute('role', 'status');
  }

  private launch(): void {
    this.dispatchEvent(new CustomEvent('launch-onboarding', {
      bubbles: true,
      composed: true,
    }));
  }

  private close(): void {
    this.dismissed = true;
    if (this.grandfathered) {
      // Session-local hide is instant; the grandfathered case additionally
      // needs the dismissal to survive a reload (D11) — the parent persists
      // it via REST and refreshes onboarding state.
      this.dispatchEvent(new CustomEvent('dismiss-onboarding-banner', {
        bubbles: true,
        composed: true,
      }));
    }
  }

  render() {
    if (this.dismissed) return nothing;

    const title = this.grandfathered
      ? t('onboarding.banner.grandfathered_title', this.lang)
      : t('onboarding.banner.title', this.lang);
    const body = this.grandfathered
      ? t('onboarding.banner.grandfathered_body', this.lang)
      : t('onboarding.banner.body', this.lang);
    const closeLabel = this.grandfathered
      ? t('onboarding.banner.grandfathered_close_label', this.lang)
      : t('onboarding.banner.close_label', this.lang);

    return html`
      <div class="banner">
        <div class="copy">
          <strong>${title}</strong>
          ${body}
        </div>
        <button class="launch" type="button" @click=${this.launch}>${t('onboarding.banner.launch', this.lang)}</button>
        <button
          class="close"
          type="button"
          aria-label=${closeLabel}
          title=${closeLabel}
          @click=${this.close}
        >×</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-onboarding-banner': OigOnboardingBanner;
  }
}
