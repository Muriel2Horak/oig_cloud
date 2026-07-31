/**
 * OIG Cloud V2 — <oig-reload-overlay> reusable component.
 *
 * Full-screen blocking overlay + spinner, shown while a `module_config`
 * write's unconditional config-entry reload settles (`__init__.py`'s
 * `add_update_listener` — no section is exempt). Mirrors the onboarding
 * wizard's own reload panel (ui/features/onboarding/index.ts) so both
 * surfaces present the same "Saving and reloading…" moment instead of
 * leaving the caller free to race the reload and get bounced to the HA
 * dashboard mid-flight.
 */

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

@customElement('oig-reload-overlay')
export class OigReloadOverlay extends LitElement {
  @property() message = '';

  static styles = css`
    .overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.12s ease-out;
    }

    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
      }
    }

    .modal {
      width: min(420px, calc(100vw - 32px));
      background: var(--card-bg, #1d2330);
      color: inherit;
      border-radius: 14px;
      box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
    }

    .reload-panel {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px 24px;
      text-align: center;
    }

    .reload-spinner {
      width: 34px;
      height: 34px;
      border-radius: 50%;
      border: 3px solid var(--divider-color, rgba(255, 255, 255, 0.18));
      border-top-color: var(--primary-color, #4f7cff);
      animation: reload-spin 0.8s linear infinite;
    }

    @keyframes reload-spin { to { transform: rotate(360deg); } }
  `;

  render() {
    return html`
      <div class="overlay" data-testid="reload-overlay">
        <div class="modal" role="dialog" aria-modal="true" data-testid="reload-overlay-modal">
          <div class="reload-panel">
            <div class="reload-spinner" aria-hidden="true"></div>
            <p data-testid="reload-overlay-message">${this.message}</p>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-reload-overlay': OigReloadOverlay;
  }
}
