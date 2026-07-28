// ============================================================================
// 🚿 Bojler: plán & realita — self-contained detail-tabs tile (bojler-tab-v2 m2)
// ============================================================================
//
// Component: oig-boiler-plan-realita-tile
// Pattern copied from Ceny's `oig-timeline-tile` (src/ui/features/timeline/dialog.ts
// lines ~593-1123): day tabs, auto-refresh checkbox, adherence bar, progress row,
// EOD prediction, metric tiles, mode-block-style strip. Unlike `oig-timeline-tile`
// (a "dumb" component driven by a parent that owns fetching), this tile owns its
// own data fetching via `loadBoilerDetailTab` — it is meant to be dropped in without
// any wiring in app.ts (a later, sequenced unit mounts it).
// ============================================================================

import { LitElement, html, css, nothing, unsafeCSS } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { loadBoilerDetailTab } from '@/data/boiler-detail-tabs';
import type {
  BoilerDetailTab,
  BoilerDetailTabData,
  BoilerDetailSavings,
  BoilerDetailProgress,
  BoilerDetailEodPrediction,
  BoilerDetailMetric,
  BoilerDetailBlock,
} from '@/data/boiler-detail-tabs';
import { formatCzk, formatKwh, formatLiters } from './format';

const u = unsafeCSS;

const TABS: BoilerDetailTab[] = ['yesterday', 'today', 'tomorrow'];

const TAB_LABELS: Record<BoilerDetailTab, string> = {
  yesterday: '📊 Včera',
  today: '📆 Dnes',
  tomorrow: '📅 Zítra',
};

const METRIC_LABELS: Record<string, string> = {
  cost_czk: 'Náklady',
  grid_kwh: 'Síť',
  fve_kwh: 'FVE',
  ready_liters_min: 'Připraveno',
};

const REFRESH_INTERVAL_MS = 60000;

// ============================================================================
// Pure helpers — exported for unit tests
// ============================================================================

/** Same thresholds/colors as Ceny's oig-timeline-tile.adherenceColor (dialog.ts:926-930). */
export function adherenceColor(pct: number): string {
  if (pct >= 90) return '#4caf50';
  if (pct >= 70) return '#ff9800';
  return '#f44336';
}

/**
 * Boiler block-source palette (fve/grid/battery/alt/idle).
 *
 * Ceny's dialog.ts/stats.ts define no source palette matching this key set — their
 * only color map is TIMELINE_MODE_CONFIG (pricing/chart.ts, data/timeline-data.ts),
 * keyed by battery *mode* name (HOME I/II/III/UPS/DO NOTHING), a different concept.
 * The established boiler-specific source palette instead lives in two sibling boiler
 * files that already agree on the same hex values: boiler-plan-strip.ts
 * (`SOURCE_VISUAL.legendColor`) and boiler-energy-today.ts (`buildSourceTiles` color).
 * Reused verbatim here for fve/grid/battery/alt. `idle` has no prior art in either —
 * given the neutral gray already used for the conceptually-equivalent "DO NOTHING"
 * entry in TIMELINE_MODE_CONFIG.
 */
export const BOILER_BLOCK_SOURCE_COLORS: Record<string, string> = {
  fve: '#ffa726',
  grid: '#2196f3',
  battery: '#7e57c2',
  alt: '#e64a19',
  idle: '#9e9e9e',
};

export function blockSourceColor(source: string): string {
  return BOILER_BLOCK_SOURCE_COLORS[source] ?? BOILER_BLOCK_SOURCE_COLORS.idle;
}

/** "06:00"..."08:00" -> 2. Wraps past midnight (end <= start). */
export function blockDurationHours(block: Pick<BoilerDetailBlock, 'start' | 'end'>): number {
  const toMinutes = (s: string): number => {
    const [h, m] = s.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const start = toMinutes(block.start);
  let end = toMinutes(block.end);
  if (end <= start) end += 24 * 60;
  return (end - start) / 60;
}

export function metricBetterClass(metric: BoilerDetailMetric): '' | 'better' | 'worse' {
  if (metric.actual == null) return '';
  if (metric.better === 'lower') return metric.actual <= metric.plan ? 'better' : 'worse';
  return metric.actual >= metric.plan ? 'better' : 'worse';
}

function metricLabel(key: string): string {
  return METRIC_LABELS[key] ?? key;
}

function formatMetricValue(key: string, v: number | null): string {
  if (key === 'cost_czk') return formatCzk(v);
  if (key === 'grid_kwh' || key === 'fve_kwh') return formatKwh(v);
  if (key === 'ready_liters_min') return formatLiters(v);
  return v == null || !Number.isFinite(v) ? '—' : String(v);
}

function fmtPct(v: number): string {
  return `${v.toFixed(0)}%`;
}

// ============================================================================
// Component
// ============================================================================

@customElement('oig-boiler-plan-realita-tile')
export class OigBoilerPlanRealitaTile extends LitElement {
  @state() private activeTab: BoilerDetailTab = 'today';
  @state() private data: BoilerDetailTabData | null = null;
  @state() private autoRefresh = true;
  /** Whether the current tab's first fetch has resolved — gates render to avoid a flash/layout jump. */
  @state() private loaded = false;

  private refreshInterval: number | null = null;

  static styles = css`
    :host {
      display: block;
    }

    .tile {
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
    }

    .tile-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-bottom: 1px solid ${u(CSS_VARS.divider)};
    }

    .tile-title {
      font-size: 13px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .auto-refresh input {
      margin: 0;
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${u(CSS_VARS.divider)};
      overflow-x: auto;
    }

    .tab {
      padding: 6px 10px;
      border: none;
      background: transparent;
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: all 0.2s;
    }

    .tab:hover {
      color: ${u(CSS_VARS.textPrimary)};
    }

    .tab.active {
      color: ${u(CSS_VARS.accent)};
      border-bottom-color: ${u(CSS_VARS.accent)};
    }

    .tile-content {
      flex: 1;
      overflow-y: auto;
      padding: 14px;
    }

    /* ---- Savings ---- */
    .savings {
      background: ${u(CSS_VARS.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 6px;
    }

    .savings .s-value {
      font-size: 14px;
      font-weight: 700;
    }

    .savings .s-value.pos { color: var(--success-color, #4caf50); }
    .savings .s-value.neg { color: var(--error-color, #f44336); }

    .savings .s-detail {
      font-size: 10px;
      opacity: 0.8;
    }

    /* ---- Adherence bar ---- */
    .adherence-bar {
      margin-bottom: 12px;
    }

    .adherence-header {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-bottom: 4px;
    }

    .adherence-track {
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 3px;
      overflow: hidden;
    }

    .adherence-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s;
    }

    /* ---- Progress ---- */
    .progress-section {
      margin-bottom: 12px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .progress-item {
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .progress-value {
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${u(CSS_VARS.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 12px;
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .eod-value {
      font-size: 14px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    /* ---- Metric tiles ---- */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
      gap: 8px;
      margin-bottom: 12px;
    }

    .metric-tile {
      background: ${u(CSS_VARS.bgSecondary)};
      border-radius: 8px;
      padding: 8px 10px;
    }

    .metric-label {
      font-size: 10px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-bottom: 2px;
    }

    .metric-values {
      display: flex;
      align-items: baseline;
      gap: 4px;
    }

    .metric-plan {
      font-size: 14px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .metric-actual {
      font-size: 11px;
      font-weight: 500;
    }

    .metric-actual.better { color: var(--success-color, #4caf50); }
    .metric-actual.worse { color: var(--error-color, #f44336); }

    /* ---- Blocks strip ---- */
    .blocks-section {
      margin-bottom: 12px;
    }

    .section-title {
      font-size: 12px;
      font-weight: 500;
      color: ${u(CSS_VARS.textPrimary)};
      margin-bottom: 8px;
    }

    .blocks-timeline {
      display: flex;
      gap: 4px;
      overflow-x: auto;
      padding: 2px 0;
    }

    .block {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1px;
      padding: 5px 8px;
      border-radius: 8px;
      font-size: 10px;
      color: #fff;
      min-width: 56px;
      min-height: 40px;
      position: relative;
      cursor: default;
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.15), 0 1px 3px rgba(0, 0, 0, 0.25);
    }

    .block.current {
      box-shadow: 0 0 0 2px #fff, 0 0 0 4px rgba(255, 255, 255, 0.3);
    }

    .block .block-time { font-size: 9px; opacity: 0.85; }

    .block-mismatch {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 12px;
      height: 12px;
      background: #f44336;
      border-radius: 50%;
      font-size: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .block-cost {
      font-size: 8px;
      opacity: 0.7;
      margin-top: 1px;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    void this.fetchTab(this.activeTab);
    if (this.autoRefresh) {
      this.startAutoRefresh();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopAutoRefresh();
  }

  private async fetchTab(tab: BoilerDetailTab): Promise<void> {
    const result = await loadBoilerDetailTab(tab);
    // Tab may have changed while this fetch was in flight — drop a stale response.
    if (tab !== this.activeTab) return;
    this.data = result;
    this.loaded = true;
  }

  private startAutoRefresh(): void {
    this.refreshInterval = window.setInterval(() => {
      if (this.autoRefresh) {
        void this.fetchTab(this.activeTab);
      }
    }, REFRESH_INTERVAL_MS);
  }

  private stopAutoRefresh(): void {
    if (this.refreshInterval !== null) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  private onTabClick(tab: BoilerDetailTab): void {
    if (tab === this.activeTab) return;
    this.activeTab = tab;
    this.loaded = false;
    this.data = null;
    void this.fetchTab(tab);
  }

  private toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      void this.fetchTab(this.activeTab);
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  render() {
    // Nothing fetched yet, no BE (older install / 404), or available:false — hide
    // the tile cleanly. No skeleton/empty-state is rendered on purpose: a skeleton
    // that later collapses to nothing IS the layout jump the brief asks us to avoid.
    if (!this.loaded || !this.data || this.data.available !== true) {
      return nothing;
    }

    const d = this.data;

    return html`
      <div class="tile">
        <div class="tile-header">
          <span class="tile-title">🚿 Bojler: plán &amp; realita</span>
          <label class="auto-refresh">
            <input
              type="checkbox"
              .checked=${this.autoRefresh}
              @change=${() => this.toggleAutoRefresh()}
            />
            Auto
          </label>
        </div>

        <div class="tabs">
          ${TABS.map(
            (tab) => html`
              <button
                class="tab ${this.activeTab === tab ? 'active' : ''}"
                @click=${() => this.onTabClick(tab)}
              >
                ${TAB_LABELS[tab]}
              </button>
            `,
          )}
        </div>

        <div class="tile-content">${this.renderContent(d)}</div>
      </div>
    `;
  }

  private renderContent(d: BoilerDetailTabData) {
    return html`
      ${d.savings ? this.renderSavings(d.savings) : nothing}
      ${d.adherencePct != null ? this.renderAdherence(d.adherencePct) : nothing}
      ${d.progress ? this.renderProgress(d.progress) : nothing}
      ${d.eodPrediction ? this.renderEod(d.eodPrediction) : nothing}
      ${d.metrics && d.metrics.length
        ? html`<div class="metrics-grid">${d.metrics.map((m) => this.renderMetricTile(m))}</div>`
        : nothing}
      ${d.blocks && d.blocks.length ? this.renderBlocks(d.blocks) : nothing}
    `;
  }

  private renderSavings(s: BoilerDetailSavings) {
    return html`
      <div class="savings">
        <span>Úspora:</span>
        ${s.vsGridCzk != null
          ? html`
              <span class="s-value ${s.vsGridCzk >= 0 ? 'pos' : 'neg'}">
                ${s.vsGridCzk >= 0 ? '+' : ''}${formatCzk(s.vsGridCzk)} vs síť
              </span>
            `
          : nothing}
        ${s.vsAltCzk != null
          ? html`
              <span class="s-value ${s.vsAltCzk >= 0 ? 'pos' : 'neg'}">
                ${s.vsAltCzk >= 0 ? '+' : ''}${formatCzk(s.vsAltCzk)} vs alt
              </span>
            `
          : nothing}
        ${s.detail ? html`<span class="s-detail">${s.detail}</span>` : nothing}
      </div>
    `;
  }

  private renderAdherence(pct: number) {
    return html`
      <div class="adherence-bar">
        <div class="adherence-header">
          <span>Soulad s plánem</span>
          <span>${fmtPct(pct)}</span>
        </div>
        <div class="adherence-track">
          <div
            class="adherence-fill"
            style="width: ${pct}%; background: ${adherenceColor(pct)}"
          ></div>
        </div>
      </div>
    `;
  }

  private renderProgress(p: BoilerDetailProgress) {
    return html`
      <div class="progress-section">
        <div class="progress-item">
          Průběh: <span class="progress-value">${fmtPct(p.progressPct)}</span>
        </div>
        <div class="progress-item">
          Skutečné: <span class="progress-value">${formatCzk(p.actualCostCzk)}</span>
        </div>
        <div class="progress-item">
          Plán: <span class="progress-value">${formatCzk(p.planCostCzk)}</span>
        </div>
        ${p.vsPlanPct != null
          ? html`
              <div class="progress-item">
                vs plán:
                <span
                  class="progress-value"
                  style="color: ${p.vsPlanPct <= 0 ? '#4caf50' : '#f44336'}"
                >
                  ${p.vsPlanPct > 0 ? '+' : ''}${fmtPct(p.vsPlanPct)}
                </span>
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private renderEod(e: BoilerDetailEodPrediction) {
    return html`
      <div class="eod-prediction">
        Predikce konce dne:
        <span class="eod-value">${formatCzk(e.predictedTotalCzk)}</span>
        ${e.vsPlanCzk < 0
          ? html`<span class="eod-savings"> (úspora ${formatCzk(Math.abs(e.vsPlanCzk))})</span>`
          : nothing}
      </div>
    `;
  }

  private renderMetricTile(metric: BoilerDetailMetric) {
    const cls = metricBetterClass(metric);
    return html`
      <div class="metric-tile">
        <div class="metric-label">${metricLabel(metric.key)}</div>
        <div class="metric-values">
          <span class="metric-plan">${formatMetricValue(metric.key, metric.plan)}</span>
          ${metric.actual != null
            ? html`
                <span class="metric-actual ${cls}">
                  (${formatMetricValue(metric.key, metric.actual)})
                </span>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  private renderBlocks(blocks: BoilerDetailBlock[]) {
    return html`
      <div class="blocks-section">
        <div class="section-title">Bloky</div>
        <div class="blocks-timeline">${blocks.map((b) => this.renderBlock(b))}</div>
      </div>
    `;
  }

  private renderBlock(block: BoilerDetailBlock) {
    const color = blockSourceColor(block.source);
    const isCurrent = block.status === 'current';
    return html`
      <div
        class="block ${isCurrent ? 'current' : ''}"
        style="background: ${color}; flex: ${Math.max(blockDurationHours(block), 0.5)}"
        title="${block.start}–${block.end} | ${block.source}"
      >
        ${block.mismatch ? html`<span class="block-mismatch">!</span>` : nothing}
        <span class="block-time">${block.start}–${block.end}</span>
        ${block.costCzk != null
          ? html`<span class="block-cost">${formatCzk(block.costCzk)}</span>`
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-boiler-plan-realita-tile': OigBoilerPlanRealitaTile;
  }
}
