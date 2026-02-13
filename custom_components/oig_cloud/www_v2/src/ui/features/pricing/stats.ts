/**
 * OIG Cloud V2 — Pricing Stats Components
 *
 * Full pricing stats implementation:
 * - Current prices (spot, export, average)
 * - Extreme price blocks (cheapest/expensive buy, best/worst export) with mini sparklines
 * - Planned consumption (today consumed + remaining, tomorrow, trend, profile)
 * - What-if analysis table (optimized cost, savings, mode comparison)
 * - Solar forecast total
 *
 * Port of V1 pricing.js stat cards, planned consumption (2000-2160),
 * what-if analysis (2166-2235), mini sparklines (860-1028).
 */

import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import {
  Chart,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  LineController,
} from 'chart.js';
import { CSS_VARS } from '@/ui/theme';
import type {
  PricingData,
  PriceBlock,
  WhatIfAlternative,
} from './types';

const u = unsafeCSS;

// Register Chart.js components needed for sparklines
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, LineController);

// ============================================================================
// MINI SPARKLINE CHART (reusable for extreme price blocks)
// ============================================================================

@customElement('oig-mini-sparkline')
export class OigMiniSparkline extends LitElement {
  @property({ type: Array }) values: number[] = [];
  @property({ type: String }) color = 'rgba(76, 175, 80, 1)';
  @property({ type: String }) startTime = '';
  @property({ type: String }) endTime = '';

  @query('canvas') private canvas!: HTMLCanvasElement;

  private chart: Chart | null = null;
  private lastDataKey = '';

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 40px;
    }
    canvas {
      width: 100% !important;
      height: 100% !important;
    }
  `;

  render() {
    return html`<canvas></canvas>`;
  }

  protected firstUpdated(): void {
    if (this.values.length > 0) {
      requestAnimationFrame(() => this.createSparkline());
    }
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has('values') || changed.has('color')) {
      this.updateOrCreateSparkline();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.destroyChart();
  }

  private getSignificantPoints(): number[] {
    const values = this.values;
    if (values.length < 2) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min;
    const threshold = range * 0.25;

    const significant: number[] = [];
    values.forEach((value, idx) => {
      const prevValue = idx > 0 ? values[idx - 1] : value;
      const nextValue = idx < values.length - 1 ? values[idx + 1] : value;
      const change = Math.max(Math.abs(value - prevValue), Math.abs(value - nextValue));
      const isExtreme = value >= max - threshold || value <= min + threshold;
      const isBigChange = change > threshold;
      if (isExtreme || isBigChange) {
        significant.push(idx);
      }
    });

    return significant;
  }

  private updateOrCreateSparkline(): void {
    if (!this.canvas || this.values.length === 0) return;

    const dataKey = JSON.stringify({ v: this.values, c: this.color });
    if (dataKey === this.lastDataKey && this.chart) return;
    this.lastDataKey = dataKey;

    const significantPoints = this.getSignificantPoints();

    if (this.chart?.data?.datasets?.[0]) {
      const dataset = this.chart.data.datasets[0] as any;
      const labelsChanged = (this.chart.data.labels?.length || 0) !== this.values.length;

      if (!labelsChanged) {
        dataset.data = this.values;
        dataset.borderColor = this.color;
        dataset.backgroundColor = this.color.replace('1)', '0.2)');
        dataset.pointBackgroundColor = this.values.map((_: number, i: number) =>
          significantPoints.includes(i) ? this.color : 'transparent',
        );
        this.chart.update('none');
        return;
      }
    }

    this.destroyChart();
    this.createSparkline();
  }

  private createSparkline(): void {
    if (!this.canvas || this.values.length === 0) return;

    const significantPoints = this.getSignificantPoints();
    const color = this.color;
    const values = this.values;

    const start = new Date(this.startTime);
    const timeLabels = values.map((_, i) => {
      const time = new Date(start.getTime() + i * 15 * 60 * 1000);
      return time.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
    });

    this.chart = new Chart(this.canvas, {
      type: 'line',
      data: {
        labels: timeLabels,
        datasets: [
          {
            data: values,
            borderColor: color,
            backgroundColor: color.replace('1)', '0.2)'),
            borderWidth: 2,
            fill: true,
            tension: 0.3,
            pointRadius: (context: any) =>
              significantPoints.includes(context.dataIndex) ? 4 : 0,
            pointBackgroundColor: color,
            pointBorderColor: '#fff',
            pointBorderWidth: 1,
            pointHoverRadius: 6,
          } as any,
        ],
      },
      plugins: [],
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 0 },
        plugins: {
          legend: { display: false },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            padding: 8,
            displayColors: false,
            callbacks: {
              title: (items: any[]) => items[0]?.label || '',
              label: (item: any) => `${item.parsed.y.toFixed(2)} Kč/kWh`,
            },
          },
          datalabels: {
            display: (context: any) => significantPoints.includes(context.dataIndex),
            align: 'top' as const,
            offset: 4,
            color: '#fff',
            font: { size: 8, weight: 'bold' as const },
            formatter: (value: number) => value.toFixed(2),
            backgroundColor: color.replace('1)', '0.8)'),
            borderRadius: 3,
            padding: { top: 2, bottom: 2, left: 4, right: 4 },
          },
          zoom: {
            pan: { enabled: true, mode: 'x' as const, modifierKey: 'shift' as const },
            zoom: {
              wheel: { enabled: true, speed: 0.1 },
              drag: { enabled: true, backgroundColor: 'rgba(33, 150, 243, 0.3)' },
              mode: 'x' as const,
            },
          },
        },
        scales: {
          x: { display: false },
          y: {
            display: true,
            position: 'right' as const,
            grace: '10%',
            ticks: {
              color: 'rgba(255, 255, 255, 0.6)',
              font: { size: 8 },
              callback: (value: any) => Number(value).toFixed(1),
              maxTicksLimit: 3,
            },
            grid: { display: false },
          },
        },
        layout: { padding: 0 },
        interaction: { mode: 'nearest' as const, intersect: false },
      },
    });
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }
}

// ============================================================================
// STAT CARD (improved with sparkline slot, time range click)
// ============================================================================

@customElement('oig-stats-card')
export class OigStatsCard extends LitElement {
  @property({ type: String }) title = '';
  @property({ type: String }) time = '';
  @property({ type: String }) valueText = '';
  @property({ type: Number }) value = 0;
  @property({ type: String }) unit = 'Kč/kWh';
  @property({ type: String }) variant: 'default' | 'success' | 'warning' | 'danger' | 'info' = 'default';
  @property({ type: Boolean }) clickable = false;
  @property({ type: String }) startTime = '';
  @property({ type: String }) endTime = '';
  @property({ type: Array }) sparklineValues: number[] = [];
  @property({ type: String }) sparklineColor = 'rgba(76, 175, 80, 1)';

  static styles = css`
    :host {
      display: block;
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
      transition: transform 0.2s, box-shadow 0.2s;
      border: 1px solid transparent;
    }

    :host([clickable]) {
      cursor: pointer;
    }

    :host([clickable]:hover) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    :host(.zoom-active) {
      border-color: rgba(33, 150, 243, 0.5);
      box-shadow: 0 0 12px rgba(33, 150, 243, 0.3);
    }

    .card-title {
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .card-value {
      font-size: 22px;
      font-weight: 700;
      color: ${u(CSS_VARS.textPrimary)};
      line-height: 1.2;
    }

    .card-value .stat-unit {
      font-size: 12px;
      font-weight: 400;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .card-value.success { color: #4CAF50; }
    .card-value.warning { color: #FFA726; }
    .card-value.danger { color: #F44336; }
    .card-value.info { color: #29B6F6; }

    .card-time {
      font-size: 10px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-top: 4px;
    }

    .sparkline-container {
      margin-top: 8px;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.clickable) {
      this.addEventListener('click', this.handleClick);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this.handleClick);
  }

  private handleClick = (): void => {
    if (!this.clickable) return;
    this.dispatchEvent(
      new CustomEvent('card-click', {
        detail: {
          startTime: this.startTime,
          endTime: this.endTime,
          value: this.value,
        },
        bubbles: true,
        composed: true,
      }),
    );
  };

  render() {
    const displayValue =
      this.valueText || `${this.value.toFixed(2)} <span class="stat-unit">${this.unit}</span>`;

    return html`
      <div class="card-title">${this.title}</div>
      <div class="card-value ${this.variant}" .innerHTML=${displayValue}></div>
      ${this.time ? html`<div class="card-time">${this.time}</div>` : nothing}
      ${this.sparklineValues.length > 0
        ? html`
            <div class="sparkline-container">
              <oig-mini-sparkline
                .values=${this.sparklineValues}
                .color=${this.sparklineColor}
                .startTime=${this.startTime}
                .endTime=${this.endTime}
              ></oig-mini-sparkline>
            </div>
          `
        : nothing}
    `;
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function formatBlockTimeRange(block: PriceBlock): string {
  const start = new Date(block.start);
  const end = new Date(block.end);
  const startDate = start.toLocaleDateString('cs-CZ', { day: '2-digit', month: '2-digit' });
  const startTimeStr = start.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  const endTimeStr = end.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  return `${startDate} ${startTimeStr} - ${endTimeStr}`;
}

function formatWhatIfDelta(alt: WhatIfAlternative | undefined): string {
  if (!alt || alt.delta_czk === undefined) return '--';
  const delta = alt.delta_czk;
  if (delta > 0.01) return `+${delta.toFixed(2)} Kč`;
  if (delta < -0.01) return `${delta.toFixed(2)} Kč`;
  return '~0 Kč';
}

function whatIfDeltaClass(alt: WhatIfAlternative | undefined): string {
  if (!alt || alt.delta_czk === undefined) return '';
  if (alt.delta_czk > 0.01) return 'danger';
  if (alt.delta_czk < -0.01) return 'success';
  return '';
}

// ============================================================================
// MAIN PRICING STATS CONTAINER
// ============================================================================

@customElement('oig-pricing-stats')
export class OigPricingStats extends LitElement {
  @property({ type: Object }) data: PricingData | null = null;

  static styles = css`
    :host {
      display: block;
      margin-bottom: 16px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }

    .section-title {
      font-size: 13px;
      font-weight: 600;
      color: ${u(CSS_VARS.textSecondary)};
      margin-bottom: 10px;
      margin-top: 16px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Planned consumption */
    .planned-section {
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
      margin-bottom: 12px;
    }

    .planned-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .planned-main-value {
      font-size: 22px;
      font-weight: 700;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .planned-main-value .unit {
      font-size: 12px;
      font-weight: 400;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .planned-trend {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.08);
    }

    .planned-profile {
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-bottom: 10px;
    }

    .planned-details {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
    }

    .planned-detail-item {
      text-align: center;
    }

    .planned-detail-label {
      font-size: 10px;
      color: ${u(CSS_VARS.textSecondary)};
      text-transform: uppercase;
    }

    .planned-detail-value {
      font-size: 14px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
      margin-top: 2px;
    }

    .planned-bars {
      display: flex;
      height: 6px;
      border-radius: 3px;
      overflow: hidden;
      margin-top: 10px;
      background: rgba(255, 255, 255, 0.05);
    }

    .bar-today {
      background: #4CAF50;
      transition: width 0.3s;
    }

    .bar-tomorrow {
      background: #FFA726;
      transition: width 0.3s;
    }

    .bar-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 4px;
      font-size: 9px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    /* What-if analysis */
    .whatif-section {
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
      margin-bottom: 12px;
    }

    .whatif-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .whatif-cost {
      font-size: 20px;
      font-weight: 700;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .whatif-savings {
      font-size: 13px;
      font-weight: 600;
      padding: 3px 8px;
      border-radius: 4px;
    }

    .whatif-savings.positive {
      color: #4CAF50;
      background: rgba(76, 175, 80, 0.15);
    }

    .whatif-savings.negative {
      color: #F44336;
      background: rgba(244, 67, 54, 0.15);
    }

    .whatif-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    .whatif-table th {
      text-align: left;
      color: ${u(CSS_VARS.textSecondary)};
      font-weight: 500;
      padding: 6px 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      font-size: 10px;
      text-transform: uppercase;
    }

    .whatif-table td {
      padding: 6px 8px;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .whatif-row {
      border-radius: 4px;
      transition: background 0.2s;
    }

    .whatif-row.active-mode {
      background: rgba(76, 175, 80, 0.15);
      border: 1px solid rgba(76, 175, 80, 0.3);
    }

    .whatif-delta.success { color: #4CAF50; }
    .whatif-delta.danger { color: #F44336; }

    @media (max-width: 600px) {
      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }
      .planned-details {
        grid-template-columns: 1fr 1fr;
      }
    }
  `;

  private onCardClick(e: CustomEvent): void {
    this.dispatchEvent(
      new CustomEvent('zoom-to-block', {
        detail: e.detail,
        bubbles: true,
        composed: true,
      }),
    );
  }

  // ---- Current Prices ----

  private renderCurrentPrices() {
    if (!this.data) return nothing;

    return html`
      <div class="stats-grid">
        <oig-stats-card
          title="Aktuální spotová cena"
          .value=${this.data.currentSpotPrice}
          unit="Kč/kWh"
          variant="info"
        ></oig-stats-card>

        <oig-stats-card
          title="Výkupní cena"
          .value=${this.data.currentExportPrice}
          unit="Kč/kWh"
          variant="success"
        ></oig-stats-card>

        <oig-stats-card
          title="Průměr spot (predikce)"
          .value=${this.data.avgSpotPrice}
          unit="Kč/kWh"
          variant="default"
        ></oig-stats-card>

        ${this.data.solarForecastTotal > 0
          ? html`
              <oig-stats-card
                title="Solární předpověď dnes"
                .value=${this.data.solarForecastTotal}
                unit="kWh"
                variant="warning"
              ></oig-stats-card>
            `
          : nothing}
      </div>
    `;
  }

  // ---- Extreme Price Blocks ----

  private renderBlockCard(
    title: string,
    block: PriceBlock | null,
    variant: 'success' | 'danger' | 'warning' | 'info',
    sparklineColor: string,
  ) {
    if (!block) return nothing;

    return html`
      <oig-stats-card
        title=${title}
        .value=${block.avg}
        unit="Kč/kWh"
        .time=${formatBlockTimeRange(block)}
        variant=${variant}
        clickable
        .startTime=${block.start}
        .endTime=${block.end}
        .sparklineValues=${block.values}
        .sparklineColor=${sparklineColor}
        @card-click=${this.onCardClick}
      ></oig-stats-card>
    `;
  }

  private renderExtremeBlocks() {
    if (!this.data) return nothing;

    const {
      cheapestBuyBlock,
      expensiveBuyBlock,
      bestExportBlock,
      worstExportBlock,
    } = this.data;

    const hasBlocks =
      cheapestBuyBlock || expensiveBuyBlock || bestExportBlock || worstExportBlock;
    if (!hasBlocks) return nothing;

    return html`
      <div class="section-title">Cenové bloky (3h okna)</div>
      <div class="stats-grid">
        ${this.renderBlockCard(
          'Nejlevnější nákup',
          cheapestBuyBlock,
          'success',
          'rgba(76, 175, 80, 1)',
        )}
        ${this.renderBlockCard(
          'Nejdražší nákup',
          expensiveBuyBlock,
          'danger',
          'rgba(244, 67, 54, 1)',
        )}
        ${this.renderBlockCard(
          'Nejlepší výkup',
          bestExportBlock,
          'success',
          'rgba(76, 175, 80, 1)',
        )}
        ${this.renderBlockCard(
          'Nejhorší výkup',
          worstExportBlock,
          'warning',
          'rgba(255, 167, 38, 1)',
        )}
      </div>
    `;
  }

  // ---- Planned Consumption ----

  private renderPlannedConsumption() {
    const pc = this.data?.plannedConsumption;
    if (!pc) return nothing;

    const todayTotal = pc.todayTotalKwh;
    const tomorrow = pc.tomorrowKwh;
    const total = todayTotal + (tomorrow || 0);
    const todayPercent = total > 0 ? (todayTotal / total) * 100 : 50;
    const tomorrowPercent = total > 0 ? ((tomorrow || 0) / total) * 100 : 50;

    return html`
      <div class="section-title">Plánovaná spotřeba</div>
      <div class="planned-section">
        <div class="planned-header">
          <div>
            <div class="planned-main-value">
              ${pc.totalPlannedKwh > 0
                ? html`${pc.totalPlannedKwh.toFixed(1)} <span class="unit">kWh</span>`
                : '--'}
            </div>
            <div class="planned-profile">${pc.profile}</div>
          </div>
          ${pc.trendText
            ? html`<div class="planned-trend">${pc.trendText}</div>`
            : nothing}
        </div>

        <div class="planned-details">
          <div class="planned-detail-item">
            <div class="planned-detail-label">Dnes spotřeba</div>
            <div class="planned-detail-value">${pc.todayConsumedKwh.toFixed(1)} kWh</div>
          </div>
          <div class="planned-detail-item">
            <div class="planned-detail-label">Dnes zbývá</div>
            <div class="planned-detail-value">
              ${pc.todayPlannedKwh != null ? `${pc.todayPlannedKwh.toFixed(1)} kWh` : '--'}
            </div>
          </div>
          <div class="planned-detail-item">
            <div class="planned-detail-label">Zítra celkem</div>
            <div class="planned-detail-value">
              ${tomorrow != null ? `${tomorrow.toFixed(1)} kWh` : '--'}
            </div>
          </div>
        </div>

        ${total > 0
          ? html`
              <div class="planned-bars">
                <div class="bar-today" style="width: ${todayPercent}%"></div>
                <div class="bar-tomorrow" style="width: ${tomorrowPercent}%"></div>
              </div>
              <div class="bar-labels">
                <span>Dnes: ${todayTotal.toFixed(1)}</span>
                <span>Zítra: ${tomorrow != null ? tomorrow.toFixed(1) : '--'}</span>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  // ---- What-If Analysis ----

  private renderWhatIfAnalysis() {
    const wi = this.data?.whatIf;
    if (!wi) return nothing;

    const alts = wi.alternatives;
    const homeI = alts['HOME I'];
    const homeII = alts['HOME II'];
    const homeIII = alts['HOME III'];
    const homeUps = alts['HOME UPS'] || alts['FULL HOME UPS'];

    const savingsClass = wi.totalSavings > 0 ? 'positive' : wi.totalSavings < 0 ? 'negative' : '';
    const savingsText =
      wi.totalSavings > 0
        ? `+${wi.totalSavings.toFixed(2)} Kč`
        : wi.totalSavings < 0
          ? `${wi.totalSavings.toFixed(2)} Kč`
          : '0 Kč';

    const modeRow = (
      name: string,
      icon: string,
      alt: WhatIfAlternative | undefined,
      modeName: string,
    ) => {
      const isActive = wi.activeMode === modeName;
      return html`
        <tr class="whatif-row ${isActive ? 'active-mode' : ''}">
          <td>${icon} ${name}</td>
          <td class="whatif-delta ${whatIfDeltaClass(alt)}">${formatWhatIfDelta(alt)}</td>
        </tr>
      `;
    };

    return html`
      <div class="section-title">Co kdyby...?</div>
      <div class="whatif-section">
        <div class="whatif-header">
          <div>
            <div style="font-size: 10px; color: ${CSS_VARS.textSecondary}; text-transform: uppercase; margin-bottom: 4px;">
              Optimalizované náklady
            </div>
            <div class="whatif-cost">${wi.totalCost.toFixed(2)} Kč</div>
          </div>
          <div class="whatif-savings ${savingsClass}">
            Úspora: ${savingsText}
          </div>
        </div>

        <table class="whatif-table">
          <thead>
            <tr>
              <th>Režim</th>
              <th>Rozdíl vs. optimální</th>
            </tr>
          </thead>
          <tbody>
            ${modeRow('HOME I', '\u{1F3E0}', homeI, 'HOME I')}
            ${modeRow('HOME II', '\u26A1', homeII, 'HOME II')}
            ${modeRow('HOME III', '\u{1F50B}', homeIII, 'HOME III')}
            ${modeRow('HOME UPS', '\u{1F6E1}\uFE0F', homeUps, 'HOME UPS')}
          </tbody>
        </table>
      </div>
    `;
  }

  // ---- Main Render ----

  render() {
    if (!this.data || this.data.timeline.length === 0) {
      return html`<div style="color: ${CSS_VARS.textSecondary}; padding: 16px;">Načítání cenových dat...</div>`;
    }

    return html`
      ${this.renderCurrentPrices()}
      ${this.renderExtremeBlocks()}
      ${this.renderPlannedConsumption()}
      ${this.renderWhatIfAnalysis()}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-mini-sparkline': OigMiniSparkline;
    'oig-stats-card': OigStatsCard;
    'oig-pricing-stats': OigPricingStats;
  }
}
