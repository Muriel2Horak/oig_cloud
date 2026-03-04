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
  private initializing = false;

  static styles = css`
    :host {
      display: block;
      width: 100%;
      height: 30px;
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
      this.initializing = true;
      requestAnimationFrame(() => {
        this.createSparkline();
        this.initializing = false;
      });
    }
  }

  protected updated(changed: Map<string, unknown>): void {
    if (this.initializing) return;
    if (changed.has('values') || changed.has('color')) {
      this.updateOrCreateSparkline();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.destroyChart();
  }

  private updateOrCreateSparkline(): void {
    if (!this.canvas || this.values.length === 0) return;

    const dataKey = JSON.stringify({ v: this.values, c: this.color });
    if (dataKey === this.lastDataKey && this.chart) return;
    this.lastDataKey = dataKey;

    if (this.chart?.data?.datasets?.[0]) {
      const dataset = this.chart.data.datasets[0] as any;
      const labelsChanged = (this.chart.data.labels?.length || 0) !== this.values.length;

      if (!labelsChanged) {
        dataset.data = this.values;
        dataset.borderColor = this.color;
        dataset.backgroundColor = this.color.replace('1)', '0.2)');
        this.chart.update('none');
        return;
      }
    }

    this.destroyChart();
    this.createSparkline();
  }

  private createSparkline(): void {
    if (!this.canvas || this.values.length === 0) return;

    // Safety: destroy any existing chart on this canvas
    this.destroyChart();

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
            pointRadius: 0,
            pointHoverRadius: 5,
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
            display: false,
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
      padding: 10px 12px;
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
      font-size: 16px;
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

    /* Top row: price tiles + extreme blocks in one line */
    .top-row {
      display: grid;
      grid-template-columns: auto auto auto 1fr 1fr 1fr 1fr;
      gap: 10px;
      margin-bottom: 12px;
      align-items: stretch;
    }

    /* Compact price tiles: spot, export, solar */
    .price-tile {
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 10px;
      padding: 10px 12px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
      border: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      flex-direction: column;
      justify-content: center;
      min-width: 76px;
    }

    .price-tile.spot {
      background: linear-gradient(135deg, ${u(CSS_VARS.accent)}22 0%, ${u(CSS_VARS.accent)}11 100%);
      border-color: rgba(76, 175, 80, 0.3);
    }

    .price-tile.export {
      background: linear-gradient(135deg, rgba(76, 175, 80, 0.2) 0%, rgba(76, 175, 80, 0.1) 100%);
      border-color: rgba(76, 175, 80, 0.3);
    }

    .price-tile.solar {
      background: linear-gradient(135deg, rgba(255, 167, 38, 0.2) 0%, rgba(255, 167, 38, 0.1) 100%);
      border-color: rgba(255, 167, 38, 0.3);
    }

    .price-tile-label {
      font-size: 10px;
      color: ${u(CSS_VARS.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.8;
      margin-bottom: 4px;
    }

    .price-tile-value {
      font-size: 16px;
      font-weight: 700;
      color: ${u(CSS_VARS.textPrimary)};
      line-height: 1.2;
    }

    .price-tile-unit {
      font-size: 10px;
      font-weight: 400;
      color: ${u(CSS_VARS.textSecondary)};
      opacity: 0.7;
    }

    .price-tile-sub {
      font-size: 9px;
      color: ${u(CSS_VARS.textSecondary)};
      opacity: 0.55;
      margin-top: 3px;
    }

    .section-label {
      font-size: 10px;
      font-weight: 600;
      color: ${u(CSS_VARS.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.7;
    }

    /* Planned consumption */
    .planned-section {
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      padding: 12px 14px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
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


    @media (max-width: 700px) {
      .top-row {
        grid-template-columns: repeat(4, 1fr);
      }
      .planned-details {
        grid-template-columns: 1fr 1fr;
      }
      .bottom-row {
        grid-template-columns: 1fr;
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

  // ---- Current Prices (compact tiles, part of top-row) ----

  private renderPriceTiles() {
    if (!this.data) return nothing;

    const solarAvailable = this.data.solarForecastTotal > 0;

    return html`
      <div class="price-tile spot">
        <div class="price-tile-label">Spot</div>
        <div class="price-tile-value">${this.data.currentSpotPrice.toFixed(2)} <span class="price-tile-unit">Kč/kWh</span></div>
        <div class="price-tile-sub">Aktuální hodina</div>
      </div>

      <div class="price-tile export">
        <div class="price-tile-label">Výkup</div>
        <div class="price-tile-value">${this.data.currentExportPrice.toFixed(2)} <span class="price-tile-unit">Kč/kWh</span></div>
        <div class="price-tile-sub">Za přetok</div>
      </div>

      <div class="price-tile solar">
        <div class="price-tile-label">☀ Solar dnes</div>
        <div class="price-tile-value">
          ${solarAvailable
            ? html`${this.data.solarForecastTotal.toFixed(1)} <span class="price-tile-unit">kWh</span>`
            : html`-- <span class="price-tile-unit">kWh</span>`}
        </div>
        <div class="price-tile-sub">${solarAvailable ? 'Předpověď' : 'Nedostupná'}</div>
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

    // Return individual cards (no wrapper — they sit directly in .top-row)
    return html`
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
      <div class="planned-section">
        <div class="section-label" style="margin-bottom: 8px;">Plánovaná spotřeba</div>
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

  // ---- Main Render ----

  @property({ type: Boolean }) topOnly = false;

  render() {
    if (!this.data || this.data.timeline.length === 0) {
      if (this.topOnly) return nothing;
      return html`<div style="color: ${CSS_VARS.textSecondary}; padding: 16px;">Načítání cenových dat...</div>`;
    }

    if (this.topOnly) {
      return html`
        <div class="top-row">
          ${this.renderPriceTiles()}
          ${this.renderExtremeBlocks()}
        </div>
      `;
    }

    // Bottom only: planned consumption
    return html`${this.renderPlannedConsumption()}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-mini-sparkline': OigMiniSparkline;
    'oig-stats-card': OigStatsCard;
    'oig-pricing-stats': OigPricingStats;
  }
}
