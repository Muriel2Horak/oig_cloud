/**
 * OIG Cloud V2 — Confirm Dialog
 *
 * Reusable confirmation dialog with:
 * - Acknowledgement checkbox (required to enable confirm button)
 * - Warning message
 * - Optional limit input (for grid delivery)
 * - Promise-based API
 *
 * Port of V1 showAcknowledgementDialog(), showGridDeliveryDialog(), showSimpleConfirmDialog().
 */

import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { CSS_VARS } from '@/ui/theme';
import { ConfirmDialogConfig, ConfirmDialogResult } from './types';

const u = unsafeCSS;

@customElement('oig-confirm-dialog')
export class OigConfirmDialog extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Object }) config: ConfirmDialogConfig = {
    title: '',
    message: '',
  };

  @state() private acknowledged = false;
  @state() private limitValue = 5000;

  /** Promise resolver — set by the static `show()` helper */
  private resolver: ((result: ConfirmDialogResult) => void) | null = null;

  static styles = css`
    :host {
      display: none;
    }

    :host([open]) {
      display: flex;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.15s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .dialog {
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 16px;
      padding: 0;
      min-width: 340px;
      max-width: 90vw;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
      animation: scaleIn 0.15s ease-out;
    }

    @keyframes scaleIn {
      from { transform: scale(0.95); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }

    .dialog-header {
      padding: 16px 20px;
      font-size: 16px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
      border-bottom: 1px solid ${u(CSS_VARS.divider)};
    }

    .dialog-body {
      padding: 16px 20px;
      font-size: 14px;
      line-height: 1.5;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .dialog-warning {
      margin: 0 20px 12px;
      padding: 10px 14px;
      background: rgba(255, 152, 0, 0.1);
      border: 1px solid rgba(255, 152, 0, 0.3);
      border-radius: 8px;
      font-size: 13px;
      color: ${u(CSS_VARS.textPrimary)};
      line-height: 1.4;
    }

    .dialog-warning strong {
      color: #ff9800;
    }

    .ack-wrapper {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      margin: 0 20px 16px;
      padding: 12px 14px;
      background: ${u(CSS_VARS.bgSecondary)};
      border-radius: 8px;
      cursor: pointer;
    }

    .ack-wrapper input[type="checkbox"] {
      margin-top: 2px;
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: ${u(CSS_VARS.accent)};
    }

    .ack-wrapper label {
      font-size: 13px;
      line-height: 1.4;
      color: ${u(CSS_VARS.textPrimary)};
      cursor: pointer;
    }

    .limit-section {
      margin: 0 20px 16px;
    }

    .limit-label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      font-size: 13px;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .limit-input {
      width: 100%;
      padding: 10px 14px;
      border: 1px solid ${u(CSS_VARS.divider)};
      border-radius: 8px;
      font-size: 14px;
      background: ${u(CSS_VARS.bgPrimary)};
      color: ${u(CSS_VARS.textPrimary)};
      box-sizing: border-box;
    }

    .limit-hint {
      display: block;
      margin-top: 5px;
      font-size: 12px;
      opacity: 0.7;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .dialog-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      padding: 12px 20px 16px;
    }

    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
    }

    .btn-cancel {
      background: ${u(CSS_VARS.bgSecondary)};
      color: ${u(CSS_VARS.textPrimary)};
    }

    .btn-cancel:hover {
      background: ${u(CSS_VARS.divider)};
    }

    .btn-confirm {
      background: ${u(CSS_VARS.accent)};
      color: #fff;
    }

    .btn-confirm:hover:not(:disabled) {
      opacity: 0.9;
    }

    .btn-confirm:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('keydown', this.onKeyDown);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('keydown', this.onKeyDown);
  }

  // --------------------------------------------------------------------------
  // Public API — Promise-based show/hide
  // --------------------------------------------------------------------------

  /** Show dialog and return a promise that resolves when user confirms/cancels */
  showDialog(config: ConfirmDialogConfig): Promise<ConfirmDialogResult> {
    this.config = config;
    this.acknowledged = false;
    this.limitValue = config.limitValue ?? 5000;
    this.open = true;

    return new Promise<ConfirmDialogResult>((resolve) => {
      this.resolver = resolve;
    });
  }

  private closeDialog(result: ConfirmDialogResult): void {
    this.open = false;
    this.resolver?.(result);
    this.resolver = null;
  }

  // --------------------------------------------------------------------------
  // Handlers
  // --------------------------------------------------------------------------

  private onOverlayClick = (): void => {
    this.closeDialog({ confirmed: false });
  };

  private onDialogClick = (e: Event): void => {
    e.stopPropagation();
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.open) {
      this.closeDialog({ confirmed: false });
    }
  };

  private onAckChange = (e: Event): void => {
    this.acknowledged = (e.target as HTMLInputElement).checked;
  };

  private onLimitInput = (e: Event): void => {
    this.limitValue = parseInt((e.target as HTMLInputElement).value, 10) || 0;
  };

  private onCancel = (): void => {
    this.closeDialog({ confirmed: false });
  };

  private onConfirm = (): void => {
    // Validate limit if required
    if (this.config.showLimitInput) {
      const min = this.config.limitMin ?? 1;
      const max = this.config.limitMax ?? 20000;
      if (isNaN(this.limitValue) || this.limitValue < min || this.limitValue > max) {
        return; // Don't close — invalid input
      }
    }

    this.closeDialog({
      confirmed: true,
      limit: this.config.showLimitInput ? this.limitValue : undefined,
    });
  };

  private get canConfirm(): boolean {
    if (this.config.requireAcknowledgement && !this.acknowledged) return false;
    return true;
  }

  // --------------------------------------------------------------------------
  // Render
  // --------------------------------------------------------------------------

  render() {
    if (!this.open) return nothing;

    const c = this.config;

    return html`
      <div @click=${this.onOverlayClick}>
        <div class="dialog" @click=${this.onDialogClick}>
          <div class="dialog-header">
            ${c.title}
          </div>

          <div class="dialog-body">
            ${this.renderHTML(c.message)}
          </div>

          ${c.showLimitInput ? html`
            <div class="limit-section">
              <label class="limit-label" for="confirm-limit-input">
                Zadejte limit p\u0159etok\u016F (W):
              </label>
              <input
                type="number"
                id="confirm-limit-input"
                class="limit-input"
                .value=${String(this.limitValue)}
                min=${c.limitMin ?? 1}
                max=${c.limitMax ?? 20000}
                step=${c.limitStep ?? 100}
                @input=${this.onLimitInput}
                placeholder="nap\u0159. 5000"
              />
              <small class="limit-hint">Rozsah: ${c.limitMin ?? 1}\u2013${c.limitMax ?? 20000} W</small>
            </div>
          ` : nothing}

          ${c.warning ? html`
            <div class="dialog-warning">
              \u26A0\uFE0F ${this.renderHTML(c.warning)}
            </div>
          ` : nothing}

          ${c.requireAcknowledgement ? html`
            <div class="ack-wrapper" @click=${() => { this.acknowledged = !this.acknowledged; }}>
              <input
                type="checkbox"
                .checked=${this.acknowledged}
                @change=${this.onAckChange}
                @click=${(e: Event) => e.stopPropagation()}
              />
              <label>
                ${c.acknowledgementText
                  ? this.renderHTML(c.acknowledgementText)
                  : html`
                  <strong>Souhlas\u00EDm</strong> s t\u00EDm, \u017Ee m\u011Bn\u00EDm nastaven\u00ED na vlastn\u00ED odpov\u011Bdnost.
                  Aplikace nenese odpov\u011Bdnost za p\u0159\u00EDpadn\u00E9 negativn\u00ED d\u016Fsledky t\u00E9to zm\u011Bny.
                `}
              </label>
            </div>
          ` : nothing}

          <div class="dialog-actions">
            <button class="btn btn-cancel" @click=${this.onCancel}>
              ${c.cancelText || 'Zru\u0161it'}
            </button>
            <button
              class="btn btn-confirm"
              ?disabled=${!this.canConfirm}
              @click=${this.onConfirm}
            >
              ${c.confirmText || 'Potvrdit zm\u011Bnu'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  private renderHTML(text: string) {
    return unsafeHTML(text);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-confirm-dialog': OigConfirmDialog;
  }
}
