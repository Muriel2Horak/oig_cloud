/**
 * OIG Cloud V2 — Mode Selectors
 *
 * Three selector components:
 * 1. oig-box-mode-selector — Home 1/2/3/UPS
 * 2. oig-grid-delivery-selector — Vypnuto/Zapnuto/S omezením + limit input
 * 3. oig-boiler-mode-selector — CBB/Manual
 *
 * Each button supports 5 visual states: idle, active, pending, processing, disabled-by-service.
 * State is driven by the `buttonStates` property (set by parent oig-control-panel from ShieldController).
 *
 * Port of V1 shield.js button state machine.
 */

import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import {
  BoxMode,
  BOX_MODE_LABELS,
  GridDelivery,
  GRID_DELIVERY_LABELS,
  BoilerMode,
  BOILER_MODE_LABELS,
  BOILER_MODE_ICONS,
  ButtonState,
} from './types';

const u = unsafeCSS;

// ============================================================================
// SHARED BUTTON STYLES (all 3 selectors use same visual state system)
// ============================================================================

const sharedButtonStyles = css`
  .selector-label {
    font-size: 12px;
    color: ${u(CSS_VARS.textSecondary)};
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .status-text {
    font-size: 11px;
    font-weight: 500;
  }

  .status-text.transitioning {
    color: #ff9800;
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
    position: relative;
    overflow: hidden;
  }

  .mode-btn:hover:not(:disabled):not(.active) {
    border-color: ${u(CSS_VARS.accent)};
  }

  .mode-btn.active {
    background: ${u(CSS_VARS.accent)};
    border-color: ${u(CSS_VARS.accent)};
    color: #fff;
  }

  .mode-btn.pending {
    border-color: #ffc107;
    animation: pulse-pending 1.5s ease-in-out infinite;
    opacity: 0.8;
  }

  .mode-btn.processing {
    border-color: #42a5f5;
    animation: pulse-processing 1s ease-in-out infinite;
    opacity: 0.9;
  }

  .mode-btn.disabled-by-service {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .mode-btn:disabled {
    cursor: not-allowed;
  }

  @keyframes pulse-pending {
    0%, 100% { opacity: 0.6; }
    50% { opacity: 1; }
  }

  @keyframes pulse-processing {
    0%, 100% { opacity: 0.7; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.02); }
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

// ============================================================================
// BOX MODE SELECTOR
// ============================================================================

@customElement('oig-box-mode-selector')
export class OigBoxModeSelector extends LitElement {
  @property({ type: String }) value: BoxMode = 'home_1';
  @property({ type: Boolean }) disabled = false;
  /** Map of mode → ButtonState, set by parent from ShieldController */
  @property({ type: Object }) buttonStates: Record<BoxMode, ButtonState> = {
    home_1: 'idle',
    home_2: 'idle',
    home_3: 'idle',
    home_ups: 'idle',
    home_5: 'idle',
    home_6: 'idle',
  };

  static styles = [sharedButtonStyles];

  private onModeClick(mode: BoxMode): void {
    const state = this.buttonStates[mode];
    if (this.disabled || state === 'active' || state === 'pending' || state === 'processing' || state === 'disabled-by-service') return;

    this.dispatchEvent(new CustomEvent('mode-change', {
      detail: { mode },
      bubbles: true,
    }));
  }

  render() {
    const modes: BoxMode[] = ['home_1', 'home_2', 'home_3', 'home_ups', 'home_5', 'home_6'];

    return html`
      <div class="selector-label">
        Re\u017Eim st\u0159\u00EDda\u010De
      </div>
      <div class="mode-buttons">
        ${modes.map(mode => {
          const state = this.buttonStates[mode];
          const isDisabled = this.disabled || state === 'pending' || state === 'processing' || state === 'disabled-by-service';
          return html`
            <button
              class="mode-btn ${state}"
              ?disabled=${isDisabled}
              @click=${() => this.onModeClick(mode)}
            >
              ${BOX_MODE_LABELS[mode]}
              ${state === 'pending' ? html`<span style="font-size:10px"> \u23F3</span>` : ''}
              ${state === 'processing' ? html`<span style="font-size:10px"> \uD83D\uDD04</span>` : ''}
            </button>
          `;
        })}
      </div>
    `;
  }
}

// ============================================================================
// GRID DELIVERY SELECTOR
// ============================================================================

@customElement('oig-grid-delivery-selector')
export class OigGridDeliverySelector extends LitElement {
  @property({ type: String }) value: GridDelivery = 'off';
  @property({ type: Number }) limit = 0;
  @property({ type: Boolean }) disabled = false;
  @property({ type: String }) pendingTarget: GridDelivery | null = null;
  @property({ type: Object }) buttonStates: Record<GridDelivery, ButtonState> = {
    off: 'idle',
    on: 'idle',
    limited: 'idle',
  };

  static styles = [
    sharedButtonStyles,
    css`
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
        transition: border-color 0.2s;
      }

      .limit-input.pending-border {
        border-color: #ffc107;
      }

      .limit-input.processing-border {
        border-color: #42a5f5;
      }

      .limit-unit {
        font-size: 12px;
        color: ${u(CSS_VARS.textSecondary)};
      }

      .mode-btn.pending-target {
        border-color: #ffc107;
        color: #ffc107;
        background: rgba(255, 193, 7, 0.08);
      }
    `,
  ];

  private onDeliveryClick(delivery: GridDelivery): void {
    const state = this.buttonStates[delivery];
    if (this.disabled || state === 'active' || state === 'pending' || state === 'processing' || state === 'disabled-by-service') return;

    this.dispatchEvent(new CustomEvent('delivery-change', {
      detail: { value: delivery, limit: delivery === 'limited' ? this.limit : null },
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

  private get showLimitInput(): boolean {
    return this.value === 'limited' || this.buttonStates.limited === 'active';
  }

  render() {
    const options: Array<{ value: GridDelivery; label: string }> = [
      { value: 'off', label: GRID_DELIVERY_LABELS.off },
      { value: 'on', label: GRID_DELIVERY_LABELS.on },
      { value: 'limited', label: GRID_DELIVERY_LABELS.limited },
    ];

    const limitState = this.buttonStates.limited;
    const limitBorderClass = limitState === 'pending' ? 'pending-border' : limitState === 'processing' ? 'processing-border' : '';

    const isLiveLimited = this.value === 'limited';
    const activeLimitLabel = isLiveLimited && this.limit > 0
      ? html`<span class="status-text">${this.limit}\u00A0W</span>`
      : null;

    const hasPendingChange = this.pendingTarget !== null && this.pendingTarget !== this.value;
    const pendingLabel = hasPendingChange
      ? html`<span class="status-text transitioning">\u23F3\u00A0${GRID_DELIVERY_LABELS[this.pendingTarget!]}</span>`
      : null;

    return html`
      <div class="selector-label">
        Dod\u00E1vka do s\u00EDt\u011B ${activeLimitLabel}${pendingLabel}
      </div>
      <div class="mode-buttons">
        ${options.map(opt => {
          const state = this.buttonStates[opt.value];
          const isCurrentValue = opt.value === this.value;
          const isPendingTarget = opt.value === this.pendingTarget && !isCurrentValue;
          const isDisabled = this.disabled || state === 'pending' || state === 'processing' || state === 'disabled-by-service';
          const effectiveClass = (isCurrentValue && state === 'disabled-by-service')
            ? 'active disabled-by-service'
            : isPendingTarget
              ? `${state} pending-target`
              : state;
          return html`
            <button
              class="mode-btn ${effectiveClass}"
              ?disabled=${isDisabled}
              @click=${() => this.onDeliveryClick(opt.value)}
            >
              ${opt.label}
              ${state === 'pending' ? html`<span style="font-size:10px"> \u23F3</span>` : ''}
              ${state === 'processing' ? html`<span style="font-size:10px"> \uD83D\uDD04</span>` : ''}
            </button>
          `;
        })}
      </div>

      ${this.showLimitInput ? html`
        <div class="limit-input-container">
          <input
            type="number"
            class="limit-input ${limitBorderClass}"
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

// ============================================================================
// BOILER MODE SELECTOR
// ============================================================================

@customElement('oig-boiler-mode-selector')
export class OigBoilerModeSelector extends LitElement {
  @property({ type: String }) value: BoilerMode = 'cbb';
  @property({ type: Boolean }) disabled = false;
  @property({ type: Object }) buttonStates: Record<BoilerMode, ButtonState> = {
    cbb: 'idle',
    manual: 'idle',
  };

  static styles = [sharedButtonStyles];

  private onModeClick(mode: BoilerMode): void {
    const state = this.buttonStates[mode];
    if (this.disabled || state === 'active' || state === 'pending' || state === 'processing' || state === 'disabled-by-service') return;

    this.dispatchEvent(new CustomEvent('boiler-mode-change', {
      detail: { mode },
      bubbles: true,
    }));
  }

  render() {
    const modes: BoilerMode[] = ['cbb', 'manual'];

    return html`
      <div class="selector-label">
        Re\u017Eim bojleru
      </div>
      <div class="mode-buttons">
        ${modes.map(mode => {
          const state = this.buttonStates[mode];
          const isDisabled = this.disabled || state === 'pending' || state === 'processing' || state === 'disabled-by-service';
          return html`
            <button
              class="mode-btn ${state}"
              ?disabled=${isDisabled}
              @click=${() => this.onModeClick(mode)}
            >
              ${BOILER_MODE_ICONS[mode]} ${BOILER_MODE_LABELS[mode]}
              ${state === 'pending' ? html`<span style="font-size:10px"> \u23F3</span>` : ''}
              ${state === 'processing' ? html`<span style="font-size:10px"> \uD83D\uDD04</span>` : ''}
            </button>
          `;
        })}
      </div>
    `;
  }
}

// ============================================================================
// TAG NAME DECLARATIONS
// ============================================================================

declare global {
  interface HTMLElementTagNameMap {
    'oig-box-mode-selector': OigBoxModeSelector;
    'oig-grid-delivery-selector': OigGridDeliverySelector;
    'oig-boiler-mode-selector': OigBoilerModeSelector;
  }
}
