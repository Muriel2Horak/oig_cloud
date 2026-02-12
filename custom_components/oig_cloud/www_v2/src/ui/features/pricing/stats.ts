import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { PricingStats } from './types';
import { formatTime, formatCurrency } from '@/utils/format';

const u = unsafeCSS;

@customElement('oig-stats-card')
export class OigStatsCard extends LitElement {
  @property({ type: String }) title = '';
  @property({ type: String }) time = '';
  @property({ type: Number }) value = 0;
  @property({ type: String }) unit = '';
  @property({ type: String }) variant: 'default' | 'success' | 'warning' | 'danger' = 'default';
  @property({ type: Boolean }) clickable = false;

  static styles = css`
    :host {
      display: block;
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
      transition: transform 0.2s;
    }

    :host([clickable]) {
      cursor: pointer;
    }

    :host([clickable]:hover) {
      transform: translateY(-2px);
    }

    .card-title {
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-bottom: 8px;
    }

    .card-value {
      font-size: 24px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .card-value.success { color: ${u(CSS_VARS.success)}; }
    .card-value.warning { color: ${u(CSS_VARS.warning)}; }
    .card-value.danger { color: ${u(CSS_VARS.error)}; }

    .card-time {
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-top: 4px;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('click', this.onClick);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this.onClick);
  }

  private onClick = (): void => {
    if (this.clickable) {
      this.dispatchEvent(new CustomEvent('card-click', {
        detail: { time: this.time, value: this.value },
        bubbles: true,
      }));
    }
  };

  render() {
    return html`
      <div class="card-title">${this.title}</div>
      <div class="card-value ${this.variant}">
        ${formatCurrency(this.value)}
      </div>
      ${this.time ? html`
        <div class="card-time">${formatTime(this.time)}</div>
      ` : null}
    `;
  }
}

@customElement('oig-pricing-stats')
export class OigPricingStats extends LitElement {
  @property({ type: Object }) stats: PricingStats | null = null;

  static styles = css`
    :host {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 12px;
    }
  `;

  private onCardClick(e: CustomEvent): void {
    this.dispatchEvent(new CustomEvent('zoom-to-block', {
      detail: e.detail,
      bubbles: true,
    }));
  }

  render() {
    if (!this.stats) {
      return html`<div>Načítání...</div>`;
    }

    return html`
      <oig-stats-card
        title="Nejlevnější nákup"
        .value=${this.stats.cheapestBuy.price}
        .time=${this.stats.cheapestBuy.time}
        variant="success"
        clickable
        @card-click=${this.onCardClick}
      ></oig-stats-card>

      <oig-stats-card
        title="Nejlepší prodej"
        .value=${this.stats.bestSell.price}
        .time=${this.stats.bestSell.time}
        variant="success"
        clickable
        @card-click=${this.onCardClick}
      ></oig-stats-card>

      <oig-stats-card
        title="Průměr nákup"
        .value=${this.stats.avgBuy}
        variant="default"
      ></oig-stats-card>

      <oig-stats-card
        title="Průměr prodej"
        .value=${this.stats.avgSell}
        variant="default"
      ></oig-stats-card>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-stats-card': OigStatsCard;
    'oig-pricing-stats': OigPricingStats;
  }
}
