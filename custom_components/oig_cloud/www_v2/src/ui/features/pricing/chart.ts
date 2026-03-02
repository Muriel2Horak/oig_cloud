/**
 * OIG Cloud V2 — Pricing Chart (Chart.js Mega-Chart)
 *
 * Full Chart.js implementation with:
 * - 8+ datasets: spot price, export price, solar strings, consumption, battery stacks, net grid
 * - 3 Y-axes: y-price (Kč/kWh), y-solar (kWh, stacked), y-power (kW, stacked)
 * - X-axis: timeseries with dd.MM HH:mm
 * - Zoom/pan via chartjs-plugin-zoom (wheel, drag, pinch, shift+pan)
 * - Datalabels with 3-mode toggle (auto/always/never), adaptive detail levels
 * - Mode icon plugin (colored backgrounds + emoji band)
 * - zoomToTimeRange() for stat card click interaction
 * - Incremental update vs full rebuild logic
 *
 * Port of V1 pricing.js lines 1110-1814, 528-810.
 */

import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import {
  Chart,
  CategoryScale,
  LinearScale,
  TimeSeriesScale,
  TimeScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Legend,
  Title,
  Tooltip,
  LineController,
  BarController,
} from 'chart.js';
import type { ChartConfiguration, ChartDataset } from 'chart.js';
import 'chartjs-adapter-date-fns';
import zoomPlugin from 'chartjs-plugin-zoom';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { CSS_VARS } from '@/ui/theme';
import { oigLog } from '@/core/logger';
import type { PricingData, DatalabelMode, DetailLevel, ChartZoomState } from './types';
import {
  pricingModeIconPlugin,
  buildModeIconPluginOptions,
  applyModeIconPadding,
} from './mode-icon-plugin';

const u = unsafeCSS;

// ============================================================================
// CHART.JS REGISTRATION
// ============================================================================

// Register everything we need (safe to call multiple times)
Chart.register(
  CategoryScale,
  LinearScale,
  TimeSeriesScale,
  TimeScale,
  PointElement,
  LineElement,
  BarElement,
  Filler,
  Legend,
  Title,
  Tooltip,
  LineController,
  BarController,
  zoomPlugin,
  ChartDataLabels,
  pricingModeIconPlugin,
);

// ============================================================================
// DATASET BUILDERS
// ============================================================================

function buildSpotPriceDataset(data: PricingData): ChartDataset<'line'> {
  const spotPriceData = data.timeline.map(p => p.spot_price_czk ?? 0);
  return {
    label: '\u{1F4CA} Spotová cena nákupu',
    data: spotPriceData,
    borderColor: '#2196F3',
    backgroundColor: 'rgba(33, 150, 243, 0.15)',
    borderWidth: 3,
    fill: false,
    tension: 0.4,
    type: 'line',
    yAxisID: 'y-price',
    pointRadius: spotPriceData.map(() => 0),
    pointHoverRadius: 7,
    pointBackgroundColor: spotPriceData.map(() => '#42a5f5'),
    pointBorderColor: spotPriceData.map(() => '#42a5f5'),
    pointBorderWidth: 2,
    order: 1,
    datalabels: { display: false },
  } as any;
}

function buildExportPriceDataset(data: PricingData): ChartDataset<'line'> {
  return {
    label: '\u{1F4B0} Výkupní cena',
    data: data.timeline.map(p => p.export_price_czk ?? 0),
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 187, 106, 0.15)',
    borderWidth: 2,
    fill: false,
    type: 'line',
    tension: 0.4,
    yAxisID: 'y-price',
    pointRadius: 0,
    pointHoverRadius: 5,
    order: 1,
    borderDash: [5, 5],
  } as any;
}

function buildSolarDatasets(data: PricingData): ChartDataset<'line'>[] {
  if (!data.solar) return [];

  const { string1, string2, hasString1, hasString2 } = data.solar;
  const stringCount = (hasString1 ? 1 : 0) + (hasString2 ? 1 : 0);

  const solarColors = {
    string1: { border: 'rgba(255, 193, 7, 0.8)', bg: 'rgba(255, 193, 7, 0.2)' },
    string2: { border: 'rgba(255, 152, 0, 0.8)', bg: 'rgba(255, 152, 0, 0.2)' },
  };

  if (stringCount === 1) {
    const sData = hasString1 ? string1 : string2;
    const colors = hasString1 ? solarColors.string1 : solarColors.string2;
    return [{
      label: '\u2600\uFE0F Solární předpověď',
      data: sData,
      borderColor: colors.border,
      backgroundColor: colors.bg,
      borderWidth: 2,
      fill: 'origin',
      tension: 0.4,
      type: 'line',
      yAxisID: 'y-power',
      pointRadius: 0,
      pointHoverRadius: 5,
      order: 2,
    } as any];
  }

  if (stringCount === 2) {
    return [
      {
        label: '\u2600\uFE0F String 2',
        data: string2,
        borderColor: solarColors.string2.border,
        backgroundColor: solarColors.string2.bg,
        borderWidth: 1.5,
        fill: 'origin',
        tension: 0.4,
        type: 'line',
        yAxisID: 'y-power',
        stack: 'solar',
        pointRadius: 0,
        pointHoverRadius: 5,
        order: 2,
      } as any,
      {
        label: '\u2600\uFE0F String 1',
        data: string1,
        borderColor: solarColors.string1.border,
        backgroundColor: solarColors.string1.bg,
        borderWidth: 1.5,
        fill: '-1',
        tension: 0.4,
        type: 'line',
        yAxisID: 'y-power',
        stack: 'solar',
        pointRadius: 0,
        pointHoverRadius: 5,
        order: 2,
      } as any,
    ];
  }

  return [];
}

function buildBatteryDatasets(data: PricingData): ChartDataset<'line'>[] {
  if (!data.battery) return [];

  const { baseline, solarCharge, gridCharge, gridNet, consumption } = data.battery;
  const datasets: ChartDataset<'line'>[] = [];

  const batteryColors = {
    baseline: { border: '#78909C', bg: 'rgba(120, 144, 156, 0.25)' },
    solar: { border: 'transparent', bg: 'rgba(255, 167, 38, 0.6)' },
    grid: { border: 'transparent', bg: 'rgba(33, 150, 243, 0.6)' },
  };

  // Consumption (planned)
  if (consumption.some(v => v != null && v > 0)) {
    datasets.push({
      label: '\u{1F3E0} Spotřeba (plán)',
      data: consumption as number[],
      borderColor: 'rgba(255, 112, 67, 0.7)',
      backgroundColor: 'rgba(255, 112, 67, 0.12)',
      borderWidth: 1.5,
      type: 'line',
      fill: false,
      tension: 0.25,
      pointRadius: 0,
      pointHoverRadius: 5,
      yAxisID: 'y-power',
      stack: 'consumption',
      borderDash: [6, 4],
      order: 2,
    } as any);
  }

  // Grid charge → battery
  if (gridCharge.some(v => v != null && v > 0)) {
    datasets.push({
      label: '\u26A1 Do baterie ze sítě',
      data: gridCharge as number[],
      backgroundColor: batteryColors.grid.bg,
      borderColor: batteryColors.grid.border,
      borderWidth: 0,
      type: 'line',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 5,
      yAxisID: 'y-solar',
      stack: 'charging',
      order: 3,
    } as any);
  }

  // Solar charge → battery
  if (solarCharge.some(v => v != null && v > 0)) {
    datasets.push({
      label: '\u2600\uFE0F Do baterie ze soláru',
      data: solarCharge as number[],
      backgroundColor: batteryColors.solar.bg,
      borderColor: batteryColors.solar.border,
      borderWidth: 0,
      type: 'line',
      fill: true,
      tension: 0.4,
      pointRadius: 0,
      pointHoverRadius: 5,
      yAxisID: 'y-solar',
      stack: 'charging',
      order: 3,
    } as any);
  }

  // Baseline (remaining capacity)
  datasets.push({
    label: '\u{1F50B} Zbývající kapacita',
    data: baseline as number[],
    backgroundColor: batteryColors.baseline.bg,
    borderColor: batteryColors.baseline.border,
    borderWidth: 3,
    type: 'line',
    fill: true,
    tension: 0.4,
    pointRadius: 0,
    pointHoverRadius: 5,
    yAxisID: 'y-solar',
    stack: 'charging',
    order: 3,
  } as any);

  // Net grid
  if (gridNet.some(v => v !== null)) {
    datasets.push({
      label: '\u{1F4E1} Netto odběr ze sítě',
      data: gridNet as number[],
      borderColor: '#00BCD4',
      backgroundColor: 'transparent',
      borderWidth: 2,
      type: 'line',
      fill: false,
      tension: 0.2,
      pointRadius: 0,
      pointHoverRadius: 5,
      yAxisID: 'y-solar',
      order: 2,
    } as any);
  }

  return datasets;
}

function buildAllDatasets(data: PricingData): ChartDataset[] {
  const datasets: ChartDataset[] = [];

  // 1. Spot price
  if (data.prices.length > 0) {
    datasets.push(buildSpotPriceDataset(data));
  }

  // 2. Export price
  if (data.exportPrices.length > 0) {
    datasets.push(buildExportPriceDataset(data));
  }

  // 3. Solar forecast
  datasets.push(...buildSolarDatasets(data));

  // 4. Battery + consumption + grid net
  datasets.push(...buildBatteryDatasets(data));

  return datasets;
}

// ============================================================================
// DATALABEL FORMAT HELPER
// ============================================================================

function formatDatalabelValue(value: number | null, decimals: number, unit = ''): string {
  if (value == null) return '';
  const suffix = unit ? ` ${unit}` : '';
  return `${value.toFixed(decimals)}${suffix}`;
}

// ============================================================================
// DETAIL LEVEL LOGIC (adaptive chart based on zoom)
// ============================================================================

function computeDetailLevel(chart: Chart): DetailLevel {
  const xScale = chart.scales?.x;
  if (!xScale) return 'overview';

  const visibleRange = xScale.max - xScale.min;
  const hoursVisible = visibleRange / (1000 * 60 * 60);

  if (hoursVisible <= 6) return 'detail';
  if (hoursVisible <= 24) return 'day';
  return 'overview';
}

function updateChartDetailLevel(chart: Chart, datalabelMode: DatalabelMode): void {
  if (!chart?.scales?.x) return;

  const xScale = chart.scales.x;
  const visibleRange = xScale.max - xScale.min;
  const hoursVisible = visibleRange / (1000 * 60 * 60);

  const detailLevel = computeDetailLevel(chart);

  // Adaptive legend
  const legendLabels = (chart.options as any).plugins?.legend?.labels;
  if (legendLabels) {
    legendLabels.padding = 10;
    if (legendLabels.font) legendLabels.font.size = 11;
    if (detailLevel === 'detail') {
      legendLabels.padding = 12;
      if (legendLabels.font) legendLabels.font.size = 12;
    }
  }

  // Adaptive Y-axes
  const yAxes = ['y-price', 'y-solar', 'y-power'];
  for (const axisId of yAxes) {
    const axis = (chart.options as any).scales?.[axisId];
    if (!axis) continue;

    if (detailLevel === 'overview') {
      if (axis.title) axis.title.display = false;
      if (axis.ticks?.font) axis.ticks.font.size = 10;
      if (axisId === 'y-solar') axis.display = false;
    } else if (detailLevel === 'detail') {
      if (axis.title) {
        axis.title.display = true;
        if (axis.title.font) axis.title.font.size = 12;
      }
      if (axis.ticks?.font) axis.ticks.font.size = 11;
      axis.display = true;
    } else {
      // day
      if (axis.title) {
        axis.title.display = true;
        if (axis.title.font) axis.title.font.size = 11;
      }
      if (axis.ticks?.font) axis.ticks.font.size = 10;
      axis.display = true;
    }
  }

  // Adaptive X-axis
  const xOpts = (chart.options as any).scales?.x;
  if (xOpts) {
    if (detailLevel === 'overview') {
      if (xOpts.ticks) {
        xOpts.ticks.maxTicksLimit = 12;
        if (xOpts.ticks.font) xOpts.ticks.font.size = 10;
      }
    } else if (detailLevel === 'detail') {
      if (xOpts.ticks) {
        xOpts.ticks.maxTicksLimit = 24;
        if (xOpts.ticks.font) xOpts.ticks.font.size = 11;
      }
      if (xOpts.time) xOpts.time.displayFormats.hour = 'HH:mm';
    } else {
      if (xOpts.ticks) {
        xOpts.ticks.maxTicksLimit = 16;
        if (xOpts.ticks.font) xOpts.ticks.font.size = 10;
      }
      if (xOpts.time) xOpts.time.displayFormats.hour = 'dd.MM HH:mm';
    }
  }

  // Adaptive datalabels
  const shouldShowLabels =
    datalabelMode === 'always' || (datalabelMode === 'auto' && hoursVisible <= 6);

  for (const dataset of chart.data.datasets) {
    const ds = dataset as any;
    if (!ds.datalabels) ds.datalabels = {};

    if (datalabelMode === 'never') {
      ds.datalabels.display = false;
      continue;
    }

    if (shouldShowLabels) {
      let showEveryNth = 1;
      if (hoursVisible > 3 && hoursVisible <= 6) showEveryNth = 2;
      else if (hoursVisible > 6) showEveryNth = 4;

      ds.datalabels.display = (context: any) => {
        const value = context.dataset.data[context.dataIndex];
        if (value == null || value === 0) return false;
        return context.dataIndex % showEveryNth === 0;
      };

      const isPrice = ds.yAxisID === 'y-price';
      const isSolar = ds.label?.includes('Solární') || ds.label?.includes('String');
      const isBattery = ds.label?.includes('kapacita');

      ds.datalabels.align = 'top';
      ds.datalabels.offset = 6;
      ds.datalabels.color = '#fff';
      ds.datalabels.font = { size: 9, weight: 'bold' };

      if (isPrice) {
        ds.datalabels.formatter = (v: number) => formatDatalabelValue(v, 2, 'Kč');
        ds.datalabels.backgroundColor = ds.borderColor || 'rgba(33, 150, 243, 0.8)';
      } else if (isSolar) {
        ds.datalabels.formatter = (v: number) => formatDatalabelValue(v, 1, 'kW');
        ds.datalabels.backgroundColor = ds.borderColor || 'rgba(255, 193, 7, 0.8)';
      } else if (isBattery) {
        ds.datalabels.formatter = (v: number) => formatDatalabelValue(v, 1, 'kWh');
        ds.datalabels.backgroundColor = ds.borderColor || 'rgba(120, 144, 156, 0.8)';
      } else {
        ds.datalabels.formatter = (v: number) => formatDatalabelValue(v, 1);
        ds.datalabels.backgroundColor = ds.borderColor || 'rgba(33, 150, 243, 0.8)';
      }

      ds.datalabels.borderRadius = 4;
      ds.datalabels.padding = { top: 3, bottom: 3, left: 5, right: 5 };
    } else {
      ds.datalabels.display = false;
    }
  }

  chart.update('none');
  oigLog.debug(
    `[PricingChart] Detail: ${hoursVisible.toFixed(1)}h, Labels: ${shouldShowLabels ? 'ON' : 'OFF'}, Mode: ${datalabelMode}`,
  );
}

// ============================================================================
// LIT ELEMENT — <oig-pricing-chart>
// ============================================================================

@customElement('oig-pricing-chart')
export class OigPricingChart extends LitElement {
  @property({ type: Object }) data: PricingData | null = null;
  @property({ type: String }) datalabelMode: DatalabelMode = 'auto';

  @state() private zoomState: ChartZoomState = { start: null, end: null };
  @state() private currentDetailLevel: DetailLevel = 'overview';

  @query('#pricing-canvas') private canvas!: HTMLCanvasElement;

  private chart: Chart | null = null;
  private resizeObserver: ResizeObserver | null = null;

  static styles = css`
    :host {
      display: block;
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
    }

    .chart-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      flex-wrap: wrap;
      gap: 8px;
    }

    .chart-title {
      font-size: 14px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .chart-controls {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .control-btn {
      padding: 5px 10px;
      border: 1px solid rgba(76, 175, 80, 0.5);
      background: rgba(76, 175, 80, 0.2);
      color: ${u(CSS_VARS.textSecondary)};
      border-radius: 4px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .control-btn:hover {
      background: ${u(CSS_VARS.accent)};
      color: #fff;
    }

    .control-btn.active {
      background: ${u(CSS_VARS.accent)};
      color: #fff;
    }

    .control-btn.mode-always {
      background: rgba(76, 175, 80, 0.3);
      border-color: rgba(76, 175, 80, 0.7);
    }

    .control-btn.mode-never {
      background: rgba(244, 67, 54, 0.2);
      border-color: rgba(244, 67, 54, 0.5);
    }

    .control-btn.reset-btn {
      background: rgba(33, 150, 243, 0.2);
      border-color: rgba(33, 150, 243, 0.5);
      color: #64b5f6;
    }

    .control-btn.reset-btn:hover {
      background: rgba(33, 150, 243, 0.4);
    }

    .chart-container {
      position: relative;
      width: 100%;
      height: 380px;
      max-height: 400px;
    }

    @media (max-width: 768px) {
      .chart-container {
        height: 300px;
      }
    }

    canvas {
      width: 100% !important;
    }

    .no-data {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: ${u(CSS_VARS.textSecondary)};
      font-size: 14px;
    }

    .chart-hint {
      font-size: 10px;
      color: ${u(CSS_VARS.textSecondary)};
      opacity: 0.7;
      margin-top: 6px;
      text-align: center;
    }
  `;

  // ---- Lifecycle ----

  protected firstUpdated(): void {
    this.setupResizeObserver();
    if (this.data && this.data.timeline.length > 0) {
      // Defer chart creation to ensure canvas is in DOM
      requestAnimationFrame(() => this.createChart());
    }
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has('data') && this.data) {
      if (this.chart) {
        this.updateChartData();
      } else if (this.data.timeline.length > 0) {
        requestAnimationFrame(() => this.createChart());
      }
    }
    if (changed.has('datalabelMode') && this.chart) {
      updateChartDetailLevel(this.chart, this.datalabelMode);
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.destroyChart();
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  // ---- Public API ----

  /** Zoom to a specific time range (called from stat cards) */
  zoomToTimeRange(startTime: string | number, endTime: string | number): void {
    if (!this.chart) {
      oigLog.warn('[PricingChart] Chart not available for zoom');
      return;
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    const marginMs = 15 * 60 * 1000;
    const zoomStart = start.getTime() - marginMs;
    const zoomEnd = end.getTime() + marginMs;

    // Toggle: if already zoomed to same range → reset
    if (
      this.zoomState.start !== null &&
      Math.abs(this.zoomState.start - zoomStart) < 60000 &&
      this.zoomState.end !== null &&
      Math.abs(this.zoomState.end - zoomEnd) < 60000
    ) {
      oigLog.debug('[PricingChart] Already zoomed to same range → reset');
      this.resetZoom();
      return;
    }

    // Zoom in
    try {
      const opts = this.chart.options as any;
      opts.scales.x.min = zoomStart;
      opts.scales.x.max = zoomEnd;
      this.chart.update('none');

      this.zoomState = { start: zoomStart, end: zoomEnd };
      this.currentDetailLevel = computeDetailLevel(this.chart);
      updateChartDetailLevel(this.chart, this.datalabelMode);

      this.dispatchEvent(
        new CustomEvent('zoom-change', {
          detail: { start: zoomStart, end: zoomEnd, level: this.currentDetailLevel },
          bubbles: true,
          composed: true,
        }),
      );

      oigLog.debug('[PricingChart] Zoomed to range', {
        start: new Date(zoomStart).toISOString(),
        end: new Date(zoomEnd).toISOString(),
      });
    } catch (err) {
      oigLog.error('[PricingChart] Zoom error', err as Error);
    }
  }

  /** Reset zoom to full view */
  resetZoom(): void {
    if (!this.chart) return;

    const opts = this.chart.options as any;
    delete opts.scales.x.min;
    delete opts.scales.x.max;
    this.chart.update('none');

    this.zoomState = { start: null, end: null };
    this.currentDetailLevel = computeDetailLevel(this.chart);
    updateChartDetailLevel(this.chart, this.datalabelMode);

    this.dispatchEvent(
      new CustomEvent('zoom-reset', { bubbles: true, composed: true }),
    );
  }

  /** Get the underlying Chart.js instance */
  getChart(): Chart | null {
    return this.chart;
  }

  // ---- Internals ----

  private createChart(): void {
    if (!this.canvas || !this.data || this.data.timeline.length === 0) return;
    if (this.chart) this.destroyChart();

    const data = this.data;
    const datasets = buildAllDatasets(data);
    const modeIconOptions = buildModeIconPluginOptions(data.modeSegments);

    const chartOptions: any = {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 0 },
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: {
          labels: {
            color: '#ffffff',
            font: { size: 11, weight: '500' },
            padding: 10,
            usePointStyle: true,
            pointStyle: 'circle',
            boxWidth: 12,
            boxHeight: 12,
          },
          position: 'top',
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.9)',
          titleColor: '#ffffff',
          bodyColor: '#ffffff',
          titleFont: { size: 13, weight: 'bold' },
          bodyFont: { size: 11 },
          padding: 10,
          cornerRadius: 6,
          displayColors: true,
          callbacks: {
            title: (tooltipItems: any[]) => {
              if (tooltipItems.length > 0) {
                const date = new Date(tooltipItems[0].parsed.x);
                return date.toLocaleString('cs-CZ', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
              }
              return '';
            },
            label: (context: any) => {
              let label = context.dataset.label || '';
              if (label) label += ': ';
              if (context.parsed.y !== null) {
                if (context.dataset.yAxisID === 'y-price') {
                  label += context.parsed.y.toFixed(2) + ' Kč/kWh';
                } else if (context.dataset.yAxisID === 'y-solar') {
                  label += context.parsed.y.toFixed(2) + ' kWh';
                } else if (context.dataset.yAxisID === 'y-power') {
                  label += context.parsed.y.toFixed(2) + ' kW';
                } else {
                  label += context.parsed.y;
                }
              }
              return label;
            },
          },
        },
        datalabels: {
          display: false,
        },
        zoom: {
          zoom: {
            wheel: { enabled: true, modifierKey: null },
            drag: {
              enabled: true,
              backgroundColor: 'rgba(33, 150, 243, 0.3)',
              borderColor: 'rgba(33, 150, 243, 0.8)',
              borderWidth: 2,
            },
            pinch: { enabled: true },
            mode: 'x',
            onZoomComplete: ({ chart }: { chart: Chart }) => {
              this.zoomState = { start: null, end: null };
              this.currentDetailLevel = computeDetailLevel(chart);
              updateChartDetailLevel(chart, this.datalabelMode);
            },
          },
          pan: {
            enabled: true,
            mode: 'x',
            modifierKey: 'shift',
            onPanComplete: ({ chart }: { chart: Chart }) => {
              this.zoomState = { start: null, end: null };
              this.currentDetailLevel = computeDetailLevel(chart);
              updateChartDetailLevel(chart, this.datalabelMode);
            },
          },
          limits: {
            x: { minRange: 3600000 }, // min 1 hour
          },
        },
        pricingModeIcons: modeIconOptions || null,
      },
      scales: {
        x: {
          type: 'timeseries',
          time: {
            unit: 'hour',
            displayFormats: { hour: 'dd.MM HH:mm' },
            tooltipFormat: 'dd.MM.yyyy HH:mm',
          },
          ticks: {
            color: this.getTextColor(),
            maxRotation: 45,
            minRotation: 45,
            font: { size: 11 },
            maxTicksLimit: 20,
          },
          grid: { color: this.getGridColor(), lineWidth: 1 },
        },
        'y-price': {
          type: 'linear',
          position: 'left',
          ticks: {
            color: '#2196F3',
            font: { size: 11, weight: '500' },
            callback: (value: number) => value.toFixed(2) + ' Kč',
          },
          grid: { color: 'rgba(33, 150, 243, 0.15)', lineWidth: 1 },
          title: {
            display: true,
            text: '\u{1F4B0} Cena (Kč/kWh)',
            color: '#2196F3',
            font: { size: 13, weight: 'bold' },
          },
        },
        'y-solar': {
          type: 'linear',
          position: 'left',
          stacked: true,
          ticks: {
            color: '#78909C',
            font: { size: 11, weight: '500' },
            callback: (value: number) => value.toFixed(1) + ' kWh',
            display: true,
          },
          grid: {
            display: true,
            color: 'rgba(120, 144, 156, 0.15)',
            lineWidth: 1,
            drawOnChartArea: true,
          },
          title: {
            display: true,
            text: '\u{1F50B} Kapacita baterie (kWh)',
            color: '#78909C',
            font: { size: 11, weight: 'bold' },
          },
          beginAtZero: false,
        },
        'y-power': {
          type: 'linear',
          position: 'right',
          stacked: true,
          ticks: {
            color: '#FFA726',
            font: { size: 11, weight: '500' },
            callback: (value: number) => value.toFixed(2) + ' kW',
          },
          grid: { display: false },
          title: {
            display: true,
            text: '\u2600\uFE0F Výkon (kW)',
            color: '#FFA726',
            font: { size: 13, weight: 'bold' },
          },
        },
      },
    };

    // Apply bottom padding for mode icon band
    applyModeIconPadding(chartOptions, modeIconOptions);

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: data.labels,
        datasets,
      },
      plugins: [ChartDataLabels],
      options: chartOptions,
    };

    try {
      this.chart = new Chart(this.canvas, config);
      updateChartDetailLevel(this.chart, this.datalabelMode);

      // Apply initial zoom from timeline data range
      if (data.initialZoomStart && data.initialZoomEnd) {
        requestAnimationFrame(() => {
          if (!this.chart) return;
          const opts = this.chart.options as any;
          opts.scales.x.min = data.initialZoomStart;
          opts.scales.x.max = data.initialZoomEnd;
          this.chart.update('none');
          this.currentDetailLevel = computeDetailLevel(this.chart);
          updateChartDetailLevel(this.chart, this.datalabelMode);
        });
      }

      oigLog.info('[PricingChart] Chart created', {
        datasets: datasets.length,
        labels: data.labels.length,
        segments: data.modeSegments.length,
      });
    } catch (err) {
      oigLog.error('[PricingChart] Failed to create chart', err as Error);
    }
  }

  private updateChartData(): void {
    if (!this.chart || !this.data) return;

    const data = this.data;
    const newDatasets = buildAllDatasets(data);
    const modeIconOptions = buildModeIconPluginOptions(data.modeSegments);

    const labelsChanged =
      this.chart.data.labels?.length !== data.labels.length;
    const datasetsChanged =
      this.chart.data.datasets.length !== newDatasets.length;

    if (labelsChanged) {
      this.chart.data.labels = data.labels;
    }

    let updateMode: 'none' | undefined = 'none';
    if (datasetsChanged) {
      this.chart.data.datasets = newDatasets;
      updateMode = undefined; // animate
    } else {
      newDatasets.forEach((newDs, idx) => {
        const existing = this.chart!.data.datasets[idx];
        if (existing) {
          existing.data = newDs.data;
          (existing as any).label = newDs.label;
          (existing as any).backgroundColor = (newDs as any).backgroundColor;
          (existing as any).borderColor = (newDs as any).borderColor;
        }
      });
    }

    // Update mode icon plugin options
    const opts = this.chart.options as any;
    if (!opts.plugins) opts.plugins = {};
    opts.plugins.pricingModeIcons = modeIconOptions || null;
    applyModeIconPadding(opts, modeIconOptions);

    this.chart.update(updateMode);
    oigLog.debug('[PricingChart] Chart updated incrementally');
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      this.chart?.resize();
    });
    this.resizeObserver.observe(this);
  }

  private getTextColor(): string {
    try {
      const style = getComputedStyle(this);
      return style.getPropertyValue('--oig-text-primary').trim() || '#e0e0e0';
    } catch {
      return '#e0e0e0';
    }
  }

  private getGridColor(): string {
    try {
      const style = getComputedStyle(this);
      return style.getPropertyValue('--oig-border').trim() || 'rgba(255,255,255,0.1)';
    } catch {
      return 'rgba(255,255,255,0.1)';
    }
  }

  // ---- Datalabel mode handling ----

  private setDatalabelMode(mode: DatalabelMode): void {
    this.datalabelMode = mode;
    this.dispatchEvent(
      new CustomEvent('datalabel-mode-change', {
        detail: { mode },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private get isZoomed(): boolean {
    return this.zoomState.start !== null || this.zoomState.end !== null;
  }

  // ---- Render ----

  private renderControls() {
    const modeClass = (mode: DatalabelMode) => {
      const active = this.datalabelMode === mode ? 'active' : '';
      if (mode === 'always' && this.datalabelMode === 'always') return `control-btn mode-always ${active}`;
      if (mode === 'never' && this.datalabelMode === 'never') return `control-btn mode-never ${active}`;
      return `control-btn ${active}`;
    };

    return html`
      <div class="chart-controls">
        <button class=${modeClass('auto')} @click=${() => this.setDatalabelMode('auto')}>
          Auto
        </button>
        <button class=${modeClass('always')} @click=${() => this.setDatalabelMode('always')}>
          Vždy
        </button>
        <button class=${modeClass('never')} @click=${() => this.setDatalabelMode('never')}>
          Nikdy
        </button>
        ${this.isZoomed
          ? html`<button class="control-btn reset-btn" @click=${() => this.resetZoom()}>
              Reset zoom
            </button>`
          : null}
      </div>
    `;
  }

  render() {
    const hasData = this.data && this.data.timeline.length > 0;

    return html`
      <div class="chart-header">
        <span class="chart-title">Ceny elektřiny & předpověď</span>
        ${this.renderControls()}
      </div>

      <div class="chart-container">
        ${hasData
          ? html`<canvas id="pricing-canvas"></canvas>`
          : html`<div class="no-data">Žádná data o cenách</div>`}
      </div>

      ${hasData
        ? html`<div class="chart-hint">
            Kolečko myši = zoom | Shift + tah = posun | Tah = výběr oblasti
          </div>`
        : null}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-pricing-chart': OigPricingChart;
  }
}
