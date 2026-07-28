import { LitElement, html, css, nothing, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
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
import { t, sourceLabel, type Lang } from '@/i18n/boiler';

const u = unsafeCSS;

const TABS: BoilerDetailTab[] = ['yesterday', 'today', 'tomorrow'];

const METRIC_LABELS: Record<string, string> = {
  cost_czk: 'Náklady',
  grid_kwh: 'Síť',
  fve_kwh: 'FVE',
  ready_liters_min: 'Připraveno',
};

const REFRESH_INTERVAL_MS = 60000;

// Mock rev3 palette
const MOCK = {
  water: '#4dd0e1', grid: '#3b82f6', fve: '#f0b429',
  battery: '#a78bfa', alt: '#ff8a50', idle: '#39415f',
  card: '#1b2340', card2: '#1f2848', line: '#2a3355',
  muted: '#8b93ad', dim: '#5c6480', text: '#e8ecf7',
} as const;

// ============================================================================
// Pure helpers — exported for unit tests
// ============================================================================

export function adherenceColor(pct: number): string {
  if (pct >= 90) return '#4ade80';
  if (pct >= 70) return '#f0b429';
  return '#f87171';
}

export const BOILER_BLOCK_SOURCE_COLORS: Record<string, string> = {
  fve: MOCK.fve,
  grid: MOCK.grid,
  battery: MOCK.battery,
  alt: MOCK.alt,
  idle: MOCK.idle,
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
  @property({ type: String }) lang: Lang = 'cs';
  @state() private activeTab: BoilerDetailTab = 'today';
  @state() private data: BoilerDetailTabData | null = null;
  @state() private autoRefresh = true;
  @state() private loaded = false;

  private refreshInterval: number | null = null;

  static styles = css`
    :host {
      display: block;
      font-family: ${u(CSS_VARS.fontFamily)};
    }

    .tile {
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .tile-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-bottom: 1px solid ${u(MOCK.line)};
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
      font-size: 10px;
      color: ${u(MOCK.muted)};
    }

    .auto-refresh input {
      margin: 0;
      accent-color: ${u(MOCK.water)};
    }

    .tabs {
      display: flex;
      border-bottom: 1px solid ${u(MOCK.line)};
      padding: 0 14px;
      gap: 12px;
    }

    .tab {
      padding: 6px 0 4px;
      border: none;
      background: transparent;
      font-size: 11px;
      color: ${u(MOCK.muted)};
      cursor: pointer;
      white-space: nowrap;
      border-bottom: 2px solid transparent;
      transition: color 0.2s;
    }

    .tab:hover { color: ${u(MOCK.text)}; }

    .tab.active {
      color: ${u(MOCK.water)};
      border-bottom-color: ${u(MOCK.water)};
    }

    .tile-content {
      flex: 1;
      padding: 12px 14px 14px;
    }

    /* ---- Savings row ---- */
    .savings {
      display: flex;
      align-items: baseline;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
      font-size: 12px;
      color: ${u(MOCK.muted)};
    }

    .savings .s-value {
      font-size: 13px;
      font-weight: 700;
    }

    .savings .s-value.pos { color: #4ade80; }
    .savings .s-value.neg { color: #f87171; }

    .savings .s-detail { font-size: 10px; opacity: 0.85; }

    /* ---- Adherence bar ---- */
    .adherence-bar { margin-bottom: 10px; }

    .adherence-header {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      color: ${u(MOCK.muted)};
      margin-bottom: 3px;
    }

    .adherence-track {
      height: 5px;
      background: rgba(255, 255, 255, 0.08);
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
      margin-bottom: 10px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      font-size: 11px;
      color: ${u(MOCK.muted)};
    }

    .progress-value {
      font-weight: 600;
      color: ${u(MOCK.text)};
    }

    /* ---- EOD prediction ---- */
    .eod-prediction {
      background: ${u(MOCK.card2)};
      border-radius: 8px;
      padding: 7px 10px;
      margin-bottom: 10px;
      font-size: 10px;
      color: ${u(MOCK.muted)};
    }

    .eod-value {
      font-size: 13px;
      font-weight: 700;
      color: ${u(MOCK.text)};
      margin-left: 4px;
    }

    .eod-savings { color: #4ade80; font-weight: 600; margin-left: 4px; }

    /* ---- Metric tiles ---- */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
      margin-bottom: 10px;
    }

    @media (max-width: 499px) {
      .metrics-grid { grid-template-columns: repeat(2, 1fr); }
    }

    .metric-tile {
      background: ${u(MOCK.card2)};
      border-radius: 8px;
      padding: 7px 8px;
    }

    .metric-label {
      font-size: 9px;
      color: ${u(MOCK.muted)};
      margin-bottom: 2px;
    }

    .metric-values {
      display: flex;
      align-items: baseline;
      gap: 4px;
      flex-wrap: wrap;
    }

    .metric-plan {
      font-size: 13px;
      font-weight: 700;
      color: ${u(MOCK.text)};
    }

    .metric-actual {
      font-size: 10px;
      font-weight: 600;
    }

    .metric-actual.better { color: #4ade80; }
    .metric-actual.worse { color: #f87171; }

    /* ---- Blocks strip ---- */
    .blocks-section { margin-bottom: 2px; }

    .section-title {
      font-size: 11px;
      color: ${u(MOCK.muted)};
      margin-bottom: 6px;
    }

    .blocks-timeline {
      display: flex;
      gap: 4px;
      height: 38px;
      overflow-x: auto;
    }

    .block {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1px;
      min-width: 36px;
      border-radius: 6px;
      font-size: 9px;
      color: #fff;
      position: relative;
      cursor: default;
      opacity: 0.55;
      transition: opacity 0.2s, box-shadow 0.2s;
    }

    .block:hover { opacity: 1; }

    .block.current {
      opacity: 1;
      box-shadow: inset 0 0 0 1px #fff;
    }

    .block .block-time { font-size: 8px; opacity: 0.9; }

    .block-mismatch {
      position: absolute;
      top: -3px;
      right: -3px;
      width: 10px;
      height: 10px;
      background: #f87171;
      border-radius: 50%;
      font-size: 7px;
      font-weight: 700;
      display: flex;
      align-items: center;
      justify-content: center;
      color: #fff;
    }

    .block-cost { font-size: 8px; opacity: 0.85; margin-top: 1px; }

    .empty-tile {
      display: none;
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
    if (!this.loaded || !this.data || this.data.available !== true) {
      return nothing;
    }

    const d = this.data;
    const lang = this.lang;

    return html`
      <div class="tile" data-testid="boiler-plan-realita-tile">
        <div class="tile-header">
          <span class="tile-title">${t('boiler.plan_realita.title', lang)}</span>
          <label class="auto-refresh">
            <input
              type="checkbox"
              .checked=${this.autoRefresh}
              @change=${() => this.toggleAutoRefresh()}
            />
            ${t('boiler.plan_realita.auto_refresh', lang)}
          </label>
        </div>

        <div class="tabs">
          ${TABS.map(
            (tab) => html`
              <button
                class="tab ${this.activeTab === tab ? 'active' : ''}"
                data-testid="pr-tab-${tab}"
                @click=${() => this.onTabClick(tab)}
              >
                ${t(`boiler.plan_realita.${tab}`, lang)}
              </button>
            `,
          )}
        </div>

        <div class="tile-content" data-testid="pr-content">${this.renderContent(d)}</div>
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
        ? html`<div class="metrics-grid" data-testid="pr-metrics">${d.metrics.map((m) => this.renderMetricTile(m))}</div>`
        : nothing}
      ${d.blocks && d.blocks.length ? this.renderBlocks(d.blocks) : nothing}
    `;
  }

  private renderSavings(s: BoilerDetailSavings) {
    const lang = this.lang;
    return html`
      <div class="savings" data-testid="pr-savings">
        <span>${t('boiler.plan_realita.savings_prefix', lang)}:</span>
        ${s.vsGridCzk != null
          ? html`
              <span class="s-value ${s.vsGridCzk >= 0 ? 'pos' : 'neg'}">
                ${s.vsGridCzk >= 0 ? '+' : ''}${formatCzk(s.vsGridCzk)} ${t('boiler.plan.vs_grid', lang)}
              </span>
            `
          : nothing}
        ${s.vsAltCzk != null
          ? html`
              <span class="s-value ${s.vsAltCzk >= 0 ? 'pos' : 'neg'}">
                ${s.vsAltCzk >= 0 ? '+' : ''}${formatCzk(s.vsAltCzk)} vs ${sourceLabel('alternative', lang)}
              </span>
            `
          : nothing}
        ${s.detail ? html`<span class="s-detail">${s.detail}</span>` : nothing}
      </div>
    `;
  }

  private renderAdherence(pct: number) {
    const lang = this.lang;
    return html`
      <div class="adherence-bar" data-testid="pr-adherence">
        <div class="adherence-header">
          <span>${t('boiler.plan_realita.adherence_label', lang)}</span>
          <span>${fmtPct(pct)}</span>
        </div>
        <div class="adherence-track">
          <div
            class="adherence-fill"
            data-testid="pr-adherence-fill"
            style="width: ${pct}%; background: ${adherenceColor(pct)}"
          ></div>
        </div>
      </div>
    `;
  }

  private renderProgress(p: BoilerDetailProgress) {
    const lang = this.lang;
    return html`
      <div class="progress-section" data-testid="pr-progress">
        <div>
          ${t('boiler.plan_realita.progress_label', lang)}:
          <span class="progress-value">${fmtPct(p.progressPct)}</span>
        </div>
        <div>
          ${t('boiler.plan_realita.progress_actual', lang)}:
          <span class="progress-value">${formatCzk(p.actualCostCzk)}</span>
        </div>
        <div>
          ${t('boiler.plan_realita.progress_plan', lang)}:
          <span class="progress-value">${formatCzk(p.planCostCzk)}</span>
        </div>
      </div>
    `;
  }

  private renderEod(e: BoilerDetailEodPrediction) {
    const lang = this.lang;
    return html`
      <div class="eod-prediction" data-testid="pr-eod">
        ${t('boiler.plan_realita.eod_label', lang)}:
        <span class="eod-value">${formatCzk(e.predictedTotalCzk)}</span>
        ${e.vsPlanCzk < 0
          ? html`<span class="eod-savings">(${t('boiler.plan_realita.savings_prefix', lang)} ${formatCzk(Math.abs(e.vsPlanCzk))})</span>`
          : nothing}
      </div>
    `;
  }

  private renderMetricTile(metric: BoilerDetailMetric) {
    const cls = metricBetterClass(metric);
    return html`
      <div class="metric-tile" data-testid="pr-metric-${metric.key}">
        <div class="metric-label">${metricLabel(metric.key)}</div>
        <div class="metric-values">
          <span class="metric-plan">${formatMetricValue(metric.key, metric.plan)}</span>
          ${metric.actual != null
            ? html`
                <span class="metric-actual ${cls}">(${formatMetricValue(metric.key, metric.actual)})</span>
              `
            : nothing}
        </div>
      </div>
    `;
  }

  private renderBlocks(blocks: BoilerDetailBlock[]) {
    const lang = this.lang;
    return html`
      <div class="blocks-section" data-testid="pr-blocks">
        <div class="section-title">${t('boiler.plan_realita.blocks_label', lang)}</div>
        <div class="blocks-timeline">${blocks.map((b) => this.renderBlock(b))}</div>
      </div>
    `;
  }

  private renderBlock(block: BoilerDetailBlock) {
    const color = blockSourceColor(block.source);
    const isCurrent = block.status === 'current';
    const duration = Math.max(blockDurationHours(block), 0.25);
    return html`
      <div
        class="block ${isCurrent ? 'current' : ''}"
        data-testid="pr-block"
        data-source="${block.source}"
        style="background: ${color}; flex: ${duration}"
        title="${block.start}–${block.end} | ${block.source}"
      >
        ${block.mismatch ? html`<span class="block-mismatch">!</span>` : nothing}
        <span class="block-time">${block.start}</span>
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
