import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { BoxMode, BOX_MODE_LABELS } from './types';

const u = unsafeCSS;

@customElement('oig-box-mode-selector')
export class OigBoxModeSelector extends LitElement {
  @property({ type: String }) value: BoxMode = 'home_1';
  @property({ type: Boolean }) disabled = false;

  static styles = css`
    :host {
      display: block;
    }

    .selector-label {
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-bottom: 8px;
    }

    .mode-buttons {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .mode-btn {
      flex: 1;
      min-width: 80px;
      padding: 10px 12px;
      border: 2px solid ${u(CSS_VARS.divider)};
      background: ${u(CSS_VARS.bgSecondary)};
      color: ${u(CSS_VARS.textPrimary)};
      border-radius: 8px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
    }

    .mode-btn:hover:not(:disabled) {
      border-color: ${u(CSS_VARS.accent)};
    }

    .mode-btn.active {
      background: ${u(CSS_VARS.accent)};
      border-color: ${u(CSS_VARS.accent)};
      color: #fff;
    }

    .mode-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 480px) {
      .mode-buttons {
        flex-direction: column;
      }

      .mode-btn {
        min-width: auto;
      }
    }
  `;

  private onModeClick(mode: BoxMode): void {
    if (this.disabled || mode === this.value) return;
    
    this.value = mode;
    this.dispatchEvent(new CustomEvent('mode-change', {
      detail: { mode },
      bubbles: true,
    }));
  }

  render() {
    const modes: BoxMode[] = ['home_1', 'home_2', 'home_3', 'home_ups'];

    return html`
      <div class="selector-label">Režim střídače</div>
      <div class="mode-buttons">
        ${modes.map(mode => html`
          <button
            class="mode-btn ${this.value === mode ? 'active' : ''}"
            ?disabled=${this.disabled}
            @click=${() => this.onModeClick(mode)}
          >
            ${BOX_MODE_LABELS[mode]}
          </button>
        `)}
      </div>
    `;
  }
}

@customElement('oig-grid-delivery-selector')
export class OigGridDeliverySelector extends LitElement {
  @property({ type: String }) value: 'off' | 'on' | 'limited' = 'off';
  @property({ type: Number }) limit: number = 0;
  @property({ type: Boolean }) disabled = false;
  @property({ type: Boolean }) showLimitInput = false;

  static styles = css`
    :host {
      display: block;
    }

    .selector-label {
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-bottom: 8px;
    }

    .delivery-buttons {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
    }

    .delivery-btn {
      flex: 1;
      padding: 8px 12px;
      border: 2px solid ${u(CSS_VARS.divider)};
      background: ${u(CSS_VARS.bgSecondary)};
      color: ${u(CSS_VARS.textPrimary)};
      border-radius: 8px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .delivery-btn:hover:not(:disabled) {
      border-color: ${u(CSS_VARS.accent)};
    }

    .delivery-btn.active {
      background: ${u(CSS_VARS.accent)};
      border-color: ${u(CSS_VARS.accent)};
      color: #fff;
    }

    .delivery-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .limit-input-container {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }

    .limit-input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid ${u(CSS_VARS.divider)};
      border-radius: 6px;
      font-size: 14px;
      background: ${u(CSS_VARS.bgPrimary)};
      color: ${u(CSS_VARS.textPrimary)};
    }

    .limit-unit {
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
    }
  `;

  private onDeliveryClick(value: 'off' | 'on' | 'limited'): void {
    if (this.disabled || value === this.value) return;
    
    this.value = value;
    this.showLimitInput = value === 'limited';
    
    this.dispatchEvent(new CustomEvent('delivery-change', {
      detail: { value, limit: value === 'limited' ? this.limit : null },
      bubbles: true,
    }));
  }

  private onLimitInput(e: Event): void {
    const input = e.target as HTMLInputElement;
    this.limit = parseInt(input.value, 10) || 0;
    
    this.dispatchEvent(new CustomEvent('limit-change', {
      detail: { limit: this.limit },
      bubbles: true,
    }));
  }

  render() {
    const options: Array<{ value: 'off' | 'on' | 'limited'; label: string }> = [
      { value: 'off', label: 'Vypnuto' },
      { value: 'on', label: 'Zapnuto' },
      { value: 'limited', label: 'S omezením' },
    ];

    return html`
      <div class="selector-label">Dodávka ze sítě</div>
      <div class="delivery-buttons">
        ${options.map(opt => html`
          <button
            class="delivery-btn ${this.value === opt.value ? 'active' : ''}"
            ?disabled=${this.disabled}
            @click=${() => this.onDeliveryClick(opt.value)}
          >
            ${opt.label}
          </button>
        `)}
      </div>
      
      ${this.showLimitInput ? html`
        <div class="limit-input-container">
          <input
            type="number"
            class="limit-input"
            .value=${String(this.limit)}
            min="0"
            step="100"
            @input=${this.onLimitInput}
            ?disabled=${this.disabled}
          />
          <span class="limit-unit">W</span>
        </div>
      ` : null}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-box-mode-selector': OigBoxModeSelector;
    'oig-grid-delivery-selector': OigGridDeliverySelector;
  }
}
