import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import type {
  BatteryEfficiencyData,
  BatteryHealthData,
  BatteryBalancingData,
  CostComparisonData,
} from './types';
import { formatPercent, formatEnergy, formatCurrency } from '@/utils/format';

const u = unsafeCSS;

// ============================================================================
// Shared metric styles — used across multiple analytics sub-components
// ============================================================================

const METRIC_STYLES = css`
  .metric {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid var(--divider-color, rgba(255,255,255,0.1));
  }

  .metric:last-child {
    border-bottom: none;
  }

  .metric-label {
    font-size: 12px;
    color: var(--secondary-text-color, #999);
  }

  .metric-value {
    font-size: 12px;
    font-weight: 500;
    color: var(--primary-text-color, #fff);
  }

  .metric-value.positive { color: var(--success-color, #4caf50); }
  .metric-value.negative { color: var(--error-color, #f44336); }
`;

// ============================================================================
// oig-analytics-block — generic card wrapper
// ============================================================================

@customElement('oig-analytics-block')
export class OigAnalyticsBlock extends LitElement {
  @property({ type: String }) title = '';
  @property({ type: String }) icon = '📊';

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

    ${METRIC_STYLES}
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

// ============================================================================
// oig-battery-efficiency — uses new BatteryEfficiencyData type
// ============================================================================

@customElement('oig-battery-efficiency')
export class OigBatteryEfficiency extends LitElement {
  @property({ type: Object }) data: BatteryEfficiencyData | null = null;

  static styles = css`
    :host {
      display: block;
    }

    .efficiency-value {
      font-size: 32px;
      font-weight: 600;
      color: var(--primary-text-color);
      margin-bottom: 4px;
    }

    .period-label {
      font-size: 11px;
      color: var(--secondary-text-color);
      margin-bottom: 12px;
    }

    .comparison {
      font-size: 12px;
      margin-bottom: 12px;
    }

    .comparison.positive { color: var(--success-color, #4caf50); }
    .comparison.negative { color: var(--error-color, #f44336); }

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

    .losses-pct {
      font-size: 10px;
      color: var(--error-color, #f44336);
    }
  `;

  render() {
    if (!this.data) return html`<div>Načítání...</div>`;

    const trendClass = this.data.trend >= 0 ? 'positive' : 'negative';
    const trendSign = this.data.trend >= 0 ? '+' : '';
    const periodLabel = this.data.period === 'last_month' ? 'Minulý měsíc' : `Aktuální měsíc (${this.data.currentMonthDays} dní)`;

    return html`
      <div class="efficiency-value">${formatPercent(this.data.efficiency, 1)}</div>
      <div class="period-label">${periodLabel}</div>

      ${this.data.trend !== 0 ? html`
        <div class="comparison ${trendClass}">
          ${trendSign}${formatPercent(this.data.trend)} vs minulý měsíc
        </div>
      ` : null}

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
          ${this.data.lossesPct ? html`
            <div class="losses-pct">${formatPercent(this.data.lossesPct, 1)}</div>
          ` : null}
        </div>
      </div>
    `;
  }
}

// ============================================================================
// oig-battery-health — uses new BatteryHealthData type
// FIX: has its own styles (no longer relies on parent Shadow DOM)
// ============================================================================

@customElement('oig-battery-health')
export class OigBatteryHealth extends LitElement {
  @property({ type: Object }) data: BatteryHealthData | null = null;

  static styles = css`
    :host { display: block; }

    .status-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      color: #fff;
      margin-bottom: 12px;
    }

    .status-badge.excellent { background: #4caf50; }
    .status-badge.good { background: #8bc34a; }
    .status-badge.fair { background: #ff9800; }
    .status-badge.poor { background: #f44336; }

    .sparkline-container {
      margin: 8px 0 12px;
      height: 40px;
    }

    .sparkline-container svg {
      width: 100%;
      height: 100%;
    }

    ${METRIC_STYLES}

    .degradation-section {
      margin-top: 12px;
      padding-top: 8px;
      border-top: 1px solid var(--divider-color, rgba(255,255,255,0.1));
    }

    .section-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--secondary-text-color);
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .prediction {
      font-size: 11px;
      color: var(--secondary-text-color);
      padding: 4px 0;
    }

    .prediction-value {
      font-weight: 500;
      color: var(--primary-text-color);
    }
  `;

  private renderSparkline() {
    const history = this.data?.measurementHistory;
    if (!history || history.length < 2) return null;

    const values = history.map(m => m.soh_percent);
    const min = Math.min(...values) - 1;
    const max = Math.max(...values) + 1;
    const range = max - min || 1;
    const w = 200;
    const h = 40;

    const points = values
      .map((v, i) => {
        const x = (i / (values.length - 1)) * w;
        const y = h - ((v - min) / range) * h;
        return `${x},${y}`;
      })
      .join(' ');

    return html`
      <div class="sparkline-container">
        <svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
          <polyline
            points="${points}"
            fill="none"
            stroke="#4caf50"
            stroke-width="1.5"
            vector-effect="non-scaling-stroke"
          />
        </svg>
      </div>
    `;
  }

  render() {
    if (!this.data) return html`<div>Načítání...</div>`;

    return html`
      <oig-analytics-block title="Zdraví baterie" icon="❤️">
        <span class="status-badge ${this.data.status}">${this.data.statusLabel}</span>

        ${this.renderSparkline()}

        <div class="metric">
          <span class="metric-label">State of Health</span>
          <span class="metric-value">${formatPercent(this.data.soh, 1)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Kapacita (P80)</span>
          <span class="metric-value">${formatEnergy(this.data.capacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Min. kapacita (P20)</span>
          <span class="metric-value">${formatEnergy(this.data.minCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Nominální kapacita</span>
          <span class="metric-value">${formatEnergy(this.data.nominalCapacity)}</span>
        </div>
        <div class="metric">
          <span class="metric-label">Počet měření</span>
          <span class="metric-value">${this.data.measurementCount}</span>
        </div>
        ${this.data.qualityScore != null ? html`
          <div class="metric">
            <span class="metric-label">Kvalita dat</span>
            <span class="metric-value">${formatPercent(this.data.qualityScore, 0)}</span>
          </div>
        ` : null}

        ${(this.data.degradation3m != null || this.data.degradation6m != null || this.data.degradation12m != null) ? html`
          <div class="degradation-section">
            <div class="section-label">Degradace</div>
            ${this.data.degradation3m != null ? html`
              <div class="metric">
                <span class="metric-label">3 měsíce</span>
                <span class="metric-value ${this.data.degradation3m > 0 ? 'negative' : ''}">${this.data.degradation3m.toFixed(2)} %</span>
              </div>
            ` : null}
            ${this.data.degradation6m != null ? html`
              <div class="metric">
                <span class="metric-label">6 měsíců</span>
                <span class="metric-value ${this.data.degradation6m > 0 ? 'negative' : ''}">${this.data.degradation6m.toFixed(2)} %</span>
              </div>
            ` : null}
            ${this.data.degradation12m != null ? html`
              <div class="metric">
                <span class="metric-label">12 měsíců</span>
                <span class="metric-value ${this.data.degradation12m > 0 ? 'negative' : ''}">${this.data.degradation12m.toFixed(2)} %</span>
              </div>
            ` : null}
          </div>
        ` : null}

        ${(this.data.degradationPerYear != null || this.data.estimatedEolDate != null) ? html`
          <div class="degradation-section">
            <div class="section-label">Predikce</div>
            ${this.data.degradationPerYear != null ? html`
              <div class="prediction">
                Degradace: <span class="prediction-value">${this.data.degradationPerYear.toFixed(2)} %/rok</span>
              </div>
            ` : null}
            ${this.data.yearsTo80Pct != null ? html`
              <div class="prediction">
                80% SoH za: <span class="prediction-value">${this.data.yearsTo80Pct.toFixed(1)} let</span>
              </div>
            ` : null}
            ${this.data.estimatedEolDate ? html`
              <div class="prediction">
                Odhad EOL: <span class="prediction-value">${this.data.estimatedEolDate}</span>
              </div>
            ` : null}
            ${this.data.trendConfidence != null ? html`
              <div class="prediction">
                Spolehlivost: <span class="prediction-value">${formatPercent(this.data.trendConfidence, 0)}</span>
              </div>
            ` : null}
          </div>
        ` : null}
      </oig-analytics-block>
    `;
  }
}

// ============================================================================
// oig-battery-balancing — uses new BatteryBalancingData type
// FIX: has its own METRIC_STYLES (no longer relies on parent Shadow DOM)
// ============================================================================

@customElement('oig-battery-balancing')
export class OigBatteryBalancing extends LitElement {
  @property({ type: Object }) data: BatteryBalancingData | null = null;

  static styles = css`
    :host { display: block; }
    ${METRIC_STYLES}
  `;

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

// ============================================================================
// oig-cost-comparison — NEW component for the unified cost tile
// ============================================================================

@customElement('oig-cost-comparison')
export class OigCostComparison extends LitElement {
  @property({ type: Object }) data: CostComparisonData | null = null;

  static styles = css`
    :host { display: block; }

    .cost-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid var(--divider-color, rgba(255,255,255,0.1));
    }

    .cost-row:last-child { border-bottom: none; }

    .cost-label {
      font-size: 12px;
      color: var(--secondary-text-color, #999);
    }

    .cost-value {
      font-size: 12px;
      font-weight: 500;
      color: var(--primary-text-color, #fff);
    }

    .yesterday-section {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid var(--divider-color, rgba(255,255,255,0.1));
    }

    .section-label {
      font-size: 11px;
      font-weight: 600;
      color: var(--secondary-text-color);
      margin-bottom: 6px;
      text-transform: uppercase;
    }

    .delta-positive { color: var(--success-color, #4caf50); }
    .delta-negative { color: var(--error-color, #f44336); }
  `;

  render() {
    if (!this.data) return html`<div>Načítání...</div>`;

    return html`
      <oig-analytics-block title="Porovnání nákladů" icon="💰">
        <div class="cost-row">
          <span class="cost-label">Skutečné náklady</span>
          <span class="cost-value">${formatCurrency(this.data.actualSpent)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Plán celkem</span>
          <span class="cost-value">${formatCurrency(this.data.planTotalCost)}</span>
        </div>
        <div class="cost-row">
          <span class="cost-label">Zbývající plán</span>
          <span class="cost-value">${formatCurrency(this.data.futurePlanCost)}</span>
        </div>
        ${this.data.tomorrowCost != null ? html`
          <div class="cost-row">
            <span class="cost-label">Zítra odhad</span>
            <span class="cost-value">${formatCurrency(this.data.tomorrowCost)}</span>
          </div>
        ` : null}

        ${this.data.yesterdayActualCost != null ? html`
          <div class="yesterday-section">
            <div class="section-label">Včera</div>
            <div class="cost-row">
              <span class="cost-label">Plán</span>
              <span class="cost-value">${this.data.yesterdayPlannedCost != null ? formatCurrency(this.data.yesterdayPlannedCost) : '—'}</span>
            </div>
            <div class="cost-row">
              <span class="cost-label">Skutečnost</span>
              <span class="cost-value">${formatCurrency(this.data.yesterdayActualCost)}</span>
            </div>
            ${this.data.yesterdayDelta != null ? html`
              <div class="cost-row">
                <span class="cost-label">Rozdíl</span>
                <span class="cost-value ${this.data.yesterdayDelta <= 0 ? 'delta-positive' : 'delta-negative'}">
                  ${this.data.yesterdayDelta >= 0 ? '+' : ''}${formatCurrency(this.data.yesterdayDelta)}
                </span>
              </div>
            ` : null}
            ${this.data.yesterdayAccuracy != null ? html`
              <div class="cost-row">
                <span class="cost-label">Přesnost</span>
                <span class="cost-value">${this.data.yesterdayAccuracy.toFixed(0)}%</span>
              </div>
            ` : null}
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
    'oig-cost-comparison': OigCostComparison;
  }
}
