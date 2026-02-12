import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { AnalyticsData } from './types';
import { formatPercent, formatEnergy, formatCurrency } from '@/utils/format';

const u = unsafeCSS;

@customElement('oig-analytics-block')
export class OigAnalyticsBlock extends LitElement {
  @property({ type: String }) title = '';
  @property({ type: String }) icon = '📊';
  @property({ type: Object }) data: Record<string, any> | null = null;

  static styles = css`
    :host {
      display: block;
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
    }

    .block-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
    }

    .block-icon {
      font-size: 20px;
    }

    .block-title {
      font-size: 14px;
      font-weight: 500;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .metric {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid ${u(CSS_VARS.divider)};
    }

    .metric:last-child {
      border-bottom: none;
    }

    .metric-label {
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .metric-value {
      font-size: 12px;
      font-weight: 500;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .metric-value.positive { color: ${u(CSS_VARS.success)}; }
    .metric-value.negative { color: ${u(CSS_VARS.error)}; }
  `;

  render() {
    return html`
      <div class="block-header">
        <span class="block-icon">${this.icon}</span>
        <span class="block-title">${this.title}</span>
      </div>
      <slot></slot>
    `;
  }
}

@customElement('oig-battery-efficiency')
export class OigBatteryEfficiency extends LitElement {
  @property({ type: Object }) data: AnalyticsData['batteryEfficiency'] | null = null;

  static styles = css`
    :host {
      display: block;
    }

    .efficiency-value {
      font-size: 32px;
      font-weight: 600;
      color: var(--primary-text-color);
      margin-bottom: 12px;
    }

    .comparison {
      font-size: 12px;
      margin-bottom: 12px;
    }

    .comparison.positive { color: var(--success-color); }
    .comparison.negative { color: var(--error-color); }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }

    .stat {
      text-align: center;
      padding: 8px;
      background: var(--secondary-background-color);
      border-radius: 6px;
    }

    .stat-value {
      font-size: 14px;
      font-weight: 600;
    }

    .stat-label {
      font-size: 10px;
      color: var(--secondary-text-color);
    }
  `;

  render() {
    if (!this.data) return html`<div>Načítání...</div>`;

    const comparisonClass = this.data.comparisonLastMonth >= 0 ? 'positive' : 'negative';
    const comparisonSign = this.data.comparisonLastMonth >= 0 ? '+' : '';

    return html`
      <div class="efficiency-value">${formatPercent(this.data.efficiency, 1)}</div>
      
      <div class="comparison ${comparisonClass}">
        ${comparisonSign}${formatPercent(this.data.comparisonLastMonth)} vs minulý měsíc
      </div>

      <div class="stats-grid">
        <div class="stat">
          <div class="stat-value">${formatEnergy(this.data.charged)}</div>
          <div class="stat-label">Nabito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${formatEnergy(this.data.discharged)}</div>
          <div class="stat-label">Vybito</div>
        </div>
        <div class="stat">
          <div class="stat-value">${formatEnergy(this.data.losses)}</div>
          <div class="stat-label">Ztráty</div>
        </div>
      </div>
    `;
  }
}

@customElement('oig-battery-health')
export class OigBatteryHealth extends LitElement {
  @property({ type: Object }) data: AnalyticsData['batteryHealth'] | null = null;

  render() {
    if (!this.data) return html`<div>Načítání...</div>`;

    return html`
      <oig-analytics-block title="Zdraví baterie" icon="❤️">
        <div class="metric">
          <span class="metric-label">State of Health</span>
          <span class="metric-value">${formatPercent(this.data.soh, 1)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Aktuální kapacita</span>
          <span class="metric-value">${formatEnergy(this.data.capacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Nominální kapacita</span>
          <span class="metric-value">${formatEnergy(this.data.nominalCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Měření</span>
          <span class="metric-value">${this.data.measurementCount}</span>
        </div>
      </oig-analytics-block>
    `;
  }
}

@customElement('oig-battery-balancing')
export class OigBatteryBalancing extends LitElement {
  @property({ type: Object }) data: AnalyticsData['batteryBalancing'] | null = null;

  render() {
    if (!this.data) return html`<div>Načítání...</div>`;

    return html`
      <oig-analytics-block title="Balancování" icon="⚖️">
        <div class="metric">
          <span class="metric-label">Stav</span>
          <span class="metric-value">${this.data.status}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Poslední</span>
          <span class="metric-value">${this.data.lastBalancing}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Náklady</span>
          <span class="metric-value">${formatCurrency(this.data.cost)}</span>
        </div>
        ${this.data.nextScheduled ? html`
          <div class="metric">
            <span class="metric-label">Plánováno</span>
            <span class="metric-value">${this.data.nextScheduled}</span>
          </div>
        ` : null}
      </oig-analytics-block>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-analytics-block': OigAnalyticsBlock;
    'oig-battery-efficiency': OigBatteryEfficiency;
    'oig-battery-health': OigBatteryHealth;
    'oig-battery-balancing': OigBatteryBalancing;
  }
}
