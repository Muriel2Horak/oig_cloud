/**
 * OIG Cloud V2 — Chart.js Lit Wrapper
 *
 * A LitElement wrapper for Chart.js that handles:
 * - Canvas creation and lifecycle
 * - Chart.js registration (plugins, scales)
 * - Automatic destroy on disconnect
 * - Resize observer
 * - Theme-aware defaults
 */

import { LitElement, html, css } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import {
  Chart,
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Legend,
  Title,
  Tooltip,
  LineController,
  BarController,
  DoughnutController,
  ScatterController,
} from 'chart.js';
import type { ChartConfiguration, ChartType, ChartData, ChartOptions, Plugin } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import zoomPlugin from 'chartjs-plugin-zoom';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import 'chartjs-adapter-date-fns';
import { oigLog } from '@/core/logger';

// Register all Chart.js components we need
Chart.register(
  CategoryScale,
  LinearScale,
  TimeScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Filler,
  Legend,
  Title,
  Tooltip,
  LineController,
  BarController,
  DoughnutController,
  ScatterController,
  annotationPlugin,
  zoomPlugin,
  ChartDataLabels
);

// Re-export for convenience
export { Chart, ChartDataLabels, zoomPlugin, annotationPlugin };
export type { ChartConfiguration, ChartType, ChartData, ChartOptions, Plugin };

@customElement('oig-chart')
export class OigChart extends LitElement {
  @property({ type: Object }) config: ChartConfiguration | null = null;
  @property({ type: Number }) width: number | null = null;
  @property({ type: Number }) height: number | null = null;

  @query('canvas') private canvas!: HTMLCanvasElement;

  private chart: Chart | null = null;
  private resizeObserver: ResizeObserver | null = null;

  static styles = css`
    :host {
      display: block;
      position: relative;
      width: 100%;
    }

    .chart-container {
      position: relative;
      width: 100%;
    }

    canvas {
      width: 100% !important;
    }
  `;

  render() {
    const containerStyle = this.height ? `height: ${this.height}px` : '';
    return html`
      <div class="chart-container" style=${containerStyle}>
        <canvas></canvas>
      </div>
    `;
  }

  protected firstUpdated(): void {
    if (this.config) {
      this.createChart();
    }
    this.setupResizeObserver();
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has('config') && this.config) {
      if (this.chart) {
        this.destroyChart();
      }
      this.createChart();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.destroyChart();
    this.resizeObserver?.disconnect();
  }

  // ---- Public API ----

  getChart(): Chart | null {
    return this.chart;
  }

  updateData(data: ChartData): void {
    if (this.chart) {
      this.chart.data = data;
      this.chart.update('none');
    }
  }

  updateOptions(options: ChartOptions): void {
    if (this.chart) {
      this.chart.options = options;
      this.chart.update();
    }
  }

  resetZoom(): void {
    if (this.chart) {
      (this.chart as any).resetZoom();
    }
  }

  // ---- Internals ----

  private createChart(): void {
    if (!this.canvas || !this.config) return;

    try {
      // Apply theme defaults
      const config = this.applyDefaults(this.config);
      this.chart = new Chart(this.canvas, config);
      oigLog.debug('Chart created', { type: config.type });
    } catch (e) {
      oigLog.error('Failed to create chart', e as Error);
    }
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  private setupResizeObserver(): void {
    this.resizeObserver = new ResizeObserver(() => {
      if (this.chart) {
        this.chart.resize();
      }
    });
    this.resizeObserver.observe(this);
  }

  private applyDefaults(config: ChartConfiguration): ChartConfiguration {
    // Get CSS custom properties for theming
    const style = getComputedStyle(this);
    const textColor = style.getPropertyValue('--oig-text-primary').trim() || '#e0e0e0';
    const gridColor = style.getPropertyValue('--oig-border').trim() || 'rgba(255,255,255,0.1)';

    const defaults: Partial<ChartOptions> = {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 300,
      },
      plugins: {
        legend: {
          labels: {
            color: textColor,
            font: { size: 11 },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          cornerRadius: 4,
          padding: 8,
        },
        datalabels: {
          display: false, // off by default, enable per-dataset
        },
      },
      scales: {},
    };

    // Apply scale defaults for common scale types
    if (config.options?.scales) {
      for (const [, scale] of Object.entries(config.options.scales)) {
        if (scale && typeof scale === 'object') {
          const s = scale as any;
          if (!s.ticks) s.ticks = {};
          if (!s.ticks.color) s.ticks.color = textColor;
          if (!s.grid) s.grid = {};
          if (!s.grid.color) s.grid.color = gridColor;
        }
      }
    }

    return {
      ...config,
      options: {
        ...defaults,
        ...config.options,
        plugins: {
          ...defaults.plugins,
          ...config.options?.plugins,
        },
      },
    };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-chart': OigChart;
  }
}
