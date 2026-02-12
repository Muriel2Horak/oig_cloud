import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { PricingData, ChartZoomState, DatalabelMode } from './types';

const u = unsafeCSS;

@customElement('oig-pricing-chart')
export class OigPricingChart extends LitElement {
  @property({ type: Object }) data: PricingData | null = null;
  @property({ type: String }) datalabelMode: DatalabelMode = 'auto';
  @state() private zoomState: ChartZoomState = {
    start: null,
    end: null,
    level: 'full',
  };
  @state() private hoveredPoint: { x: number; y: number; buy: number; sell: number } | null = null;

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
      margin-bottom: 16px;
    }

    .chart-title {
      font-size: 14px;
      font-weight: 500;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .chart-controls {
      display: flex;
      gap: 8px;
    }

    .control-btn {
      padding: 6px 12px;
      border: none;
      background: ${u(CSS_VARS.bgSecondary)};
      color: ${u(CSS_VARS.textSecondary)};
      border-radius: 4px;
      font-size: 12px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .control-btn:hover {
      background: ${u(CSS_VARS.accent)};
      color: #fff;
    }

    .control-btn.active {
      background: ${u(CSS_VARS.accent)};
      color: #fff;
    }

    .chart-container {
      position: relative;
      width: 100%;
      height: 300px;
    }

    .chart-svg {
      width: 100%;
      height: 100%;
    }

    .axis-line {
      stroke: ${u(CSS_VARS.divider)};
      stroke-width: 1;
    }

    .grid-line {
      stroke: ${u(CSS_VARS.divider)};
      stroke-width: 0.5;
      stroke-dasharray: 4 4;
    }

    .buy-line {
      fill: none;
      stroke: ${u(CSS_VARS.error)};
      stroke-width: 2;
    }

    .sell-line {
      fill: none;
      stroke: ${u(CSS_VARS.success)};
      stroke-width: 2;
    }

    .chart-tooltip {
      position: absolute;
      background: ${u(CSS_VARS.cardBg)};
      border: 1px solid ${u(CSS_VARS.divider)};
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
      pointer-events: none;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      z-index: 100;
    }

    .no-data {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 200px;
      color: ${u(CSS_VARS.textSecondary)};
    }
  `;

  private getChartData(): { x: number; y: number; buy: number; sell: number }[] {
    if (!this.data?.prices) return [];
    
    const width = 500;
    const height = 250;
    const padding = { top: 20, right: 20, bottom: 30, left: 40 };
    
    const prices = this.data.prices;
    const maxPrice = Math.max(...prices.map(p => Math.max(p.buy, p.sell)));
    const minPrice = Math.min(...prices.map(p => Math.min(p.buy, p.sell)));
    
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;
    
    return prices.map((p, i) => ({
      x: padding.left + (i / (prices.length - 1)) * chartWidth,
      y: padding.top + chartHeight,
      buy: padding.top + (1 - (p.buy - minPrice) / (maxPrice - minPrice)) * chartHeight,
      sell: padding.top + (1 - (p.sell - minPrice) / (maxPrice - minPrice)) * chartHeight,
    }));
  }

  private resetZoom(): void {
    this.zoomState = { start: null, end: null, level: 'full' };
    this.dispatchEvent(new CustomEvent('zoom-reset', { bubbles: true }));
  }

  private setDatalabelMode(mode: DatalabelMode): void {
    this.datalabelMode = mode;
    this.dispatchEvent(new CustomEvent('datalabel-mode-change', {
      detail: { mode },
      bubbles: true,
    }));
  }

  private onMouseMove(e: MouseEvent): void {
    const rect = (e.target as SVGElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    const chartData = this.getChartData();
    
    const closest = chartData.reduce((prev, curr) => 
      Math.abs(curr.x - x) < Math.abs(prev.x - x) ? curr : prev
    );
    
    this.hoveredPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      buy: this.data?.prices[chartData.indexOf(closest)]?.buy ?? 0,
      sell: this.data?.prices[chartData.indexOf(closest)]?.sell ?? 0,
    };
  }

  private onMouseLeave(): void {
    this.hoveredPoint = null;
  }

  private renderChart(): unknown {
    const chartData = this.getChartData();
    if (chartData.length === 0) return null;

    const buyPath = `M ${chartData.map(p => `${p.x},${p.buy}`).join(' L ')}`;
    const sellPath = `M ${chartData.map(p => `${p.x},${p.sell}`).join(' L ')}`;

    return html`
      <svg 
        class="chart-svg" 
        viewBox="0 0 500 300"
        @mousemove=${this.onMouseMove}
        @mouseleave=${this.onMouseLeave}
      >
        <line x1="40" y1="20" x2="40" y2="270" class="axis-line" />
        <line x1="40" y1="270" x2="480" y2="270" class="axis-line" />
        
        ${[0.25, 0.5, 0.75].map(ratio => html`
          <line 
            x1="40" 
            y1=${20 + ratio * 250} 
            x2="480" 
            y2=${20 + ratio * 250} 
            class="grid-line" 
          />
        `)}
        
        <path d=${buyPath} class="buy-line" />
        <path d=${sellPath} class="sell-line" />
      </svg>
      
      ${this.hoveredPoint ? html`
        <div 
          class="chart-tooltip" 
          style="left: ${this.hoveredPoint.x + 10}px; top: ${this.hoveredPoint.y - 30}px;"
        >
          <div>Nákup: ${this.hoveredPoint.buy.toFixed(2)} Kč/kWh</div>
          <div>Prodej: ${this.hoveredPoint.sell.toFixed(2)} Kč/kWh</div>
        </div>
      ` : null}
    `;
  }

  render() {
    return html`
      <div class="chart-header">
        <span class="chart-title">Ceny elektřiny</span>
        <div class="chart-controls">
          <button 
            class="control-btn ${this.datalabelMode === 'auto' ? 'active' : ''}"
            @click=${() => this.setDatalabelMode('auto')}
          >Auto</button>
          <button 
            class="control-btn ${this.datalabelMode === 'always' ? 'active' : ''}"
            @click=${() => this.setDatalabelMode('always')}
          >Vždy</button>
          <button 
            class="control-btn ${this.datalabelMode === 'never' ? 'active' : ''}"
            @click=${() => this.setDatalabelMode('never')}
          >Nikdy</button>
          ${this.zoomState.level !== 'full' ? html`
            <button class="control-btn" @click=${this.resetZoom}>Reset</button>
          ` : null}
        </div>
      </div>
      
      <div class="chart-container">
        ${this.data?.prices?.length 
          ? this.renderChart() 
          : html`<div class="no-data">Žádná data</div>`
        }
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-pricing-chart': OigPricingChart;
  }
}
