import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import type { TimelineTab, TimelineDayData, ModeBlock, MetricTile } from './types';
import { TIMELINE_TAB_LABELS, TIMELINE_MODE_CONFIG } from './types';
import { formatCurrency } from '@/utils/format';

const u = unsafeCSS;

@customElement('oig-timeline-dialog')
export class OigTimelineDialog extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: String }) activeTab: TimelineTab = 'today';
  @property({ type: Object }) data: TimelineDayData | null = null;
  @state() private autoRefresh = true;

  private refreshInterval: number | null = null;

  static styles = css`
    :host {
      display: none;
    }

    :host([open]) {
      display: flex;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .dialog {
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 16px;
      width: 90vw;
      max-width: 800px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .dialog-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 20px;
      border-bottom: 1px solid ${u(CSS_VARS.divider)};
    }

    .dialog-title {
      font-size: 18px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .header-controls {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .close-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      font-size: 20px;
      cursor: pointer;
      color: ${u(CSS_VARS.textSecondary)};
      border-radius: 50%;
    }

    .close-btn:hover {
      background: ${u(CSS_VARS.bgSecondary)};
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
      padding: 12px 16px;
      border: none;
      background: transparent;
      font-size: 13px;
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

    .dialog-content {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
    }

    /* ---- Adherence bar ---- */
    .adherence-bar {
      margin-bottom: 16px;
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
      background: rgba(255,255,255,0.1);
      border-radius: 3px;
      overflow: hidden;
    }

    .adherence-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s;
    }

    /* ---- Metric tiles ---- */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 20px;
    }

    .metric-tile {
      background: ${u(CSS_VARS.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
    }

    .metric-label {
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-bottom: 4px;
    }

    .metric-values {
      display: flex;
      align-items: baseline;
      gap: 6px;
    }

    .metric-plan {
      font-size: 16px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .metric-actual {
      font-size: 12px;
      font-weight: 500;
    }

    .metric-actual.better { color: var(--success-color, #4caf50); }
    .metric-actual.worse { color: var(--error-color, #f44336); }

    /* ---- Mode blocks ---- */
    .modes-section {
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 500;
      color: ${u(CSS_VARS.textPrimary)};
      margin-bottom: 12px;
    }

    .mode-blocks-timeline {
      display: flex;
      gap: 2px;
      overflow-x: auto;
      padding: 4px 0;
    }

    .mode-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 6px 8px;
      border-radius: 6px;
      font-size: 11px;
      color: #fff;
      min-width: 50px;
      position: relative;
      cursor: default;
    }

    .mode-block.current {
      box-shadow: 0 0 0 2px #fff, 0 0 0 4px rgba(255,255,255,0.3);
    }

    .mode-block .mode-icon { font-size: 14px; }
    .mode-block .mode-time { font-size: 9px; opacity: 0.8; }
    .mode-block .mode-name { font-size: 10px; font-weight: 500; }

    .mode-mismatch {
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

    .mode-cost {
      font-size: 9px;
      opacity: 0.7;
      margin-top: 2px;
    }

    /* ---- Progress section (today) ---- */
    .progress-section {
      margin-bottom: 16px;
      display: flex;
      gap: 16px;
      flex-wrap: wrap;
    }

    .progress-item {
      font-size: 12px;
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
      padding: 12px;
      margin-bottom: 16px;
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .eod-value {
      font-size: 16px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .eod-savings {
      color: var(--success-color, #4caf50);
      font-weight: 500;
    }

    .empty-state {
      text-align: center;
      padding: 40px 20px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    @media (max-width: 600px) {
      .dialog {
        width: 100vw;
        max-width: 100vw;
        height: 100vh;
        max-height: 100vh;
        border-radius: 0;
      }
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.autoRefresh) {
      this.startAutoRefresh();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopAutoRefresh();
  }

  private startAutoRefresh(): void {
    this.refreshInterval = window.setInterval(() => {
      if (this.open && this.autoRefresh) {
        this.dispatchEvent(new CustomEvent('refresh', { bubbles: true }));
      }
    }, 60000);
  }

  private stopAutoRefresh(): void {
    if (this.refreshInterval !== null) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  private onClose(): void {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true }));
  }

  private onTabClick(tab: TimelineTab): void {
    this.activeTab = tab;
    this.dispatchEvent(new CustomEvent('tab-change', {
      detail: { tab },
      bubbles: true,
    }));
  }

  private toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  // ---- Formatting helpers ----

  private fmtPct(v: number): string {
    return `${v.toFixed(0)}%`;
  }

  // ---- Adherence bar color ----

  private adherenceColor(pct: number): string {
    if (pct >= 90) return '#4caf50';
    if (pct >= 70) return '#ff9800';
    return '#f44336';
  }

  // ---- Mode block rendering ----

  private getModeConfig(modeName: string) {
    return TIMELINE_MODE_CONFIG[modeName] ?? { icon: '❓', color: '#666', label: modeName };
  }

  private renderModeBlock(block: ModeBlock) {
    const cfg = this.getModeConfig(block.modePlanned || block.modeHistorical);
    const isCurrent = block.status === 'current';

    return html`
      <div
        class="mode-block ${isCurrent ? 'current' : ''}"
        style="background: ${cfg.color}; flex: ${Math.max(block.durationHours, 0.5)}"
        title="${block.startTime}–${block.endTime} | ${cfg.label}"
      >
        ${!block.modeMatch ? html`<span class="mode-mismatch">!</span>` : null}
        <span class="mode-icon">${cfg.icon}</span>
        <span class="mode-name">${cfg.label}</span>
        <span class="mode-time">${block.startTime}–${block.endTime}</span>
        ${block.costPlanned != null ? html`
          <span class="mode-cost">${formatCurrency(block.costPlanned)}</span>
        ` : null}
      </div>
    `;
  }

  // ---- Metric tile rendering ----

  private renderMetricTile(label: string, tile: MetricTile) {
    const planStr = tile.unit === 'Kč'
      ? formatCurrency(tile.plan)
      : `${tile.plan.toFixed(1)} ${tile.unit}`;

    let actualClass = '';
    let actualStr = '';
    if (tile.hasActual && tile.actual != null) {
      actualStr = tile.unit === 'Kč'
        ? formatCurrency(tile.actual)
        : `${tile.actual.toFixed(1)} ${tile.unit}`;

      // For cost: lower is better; for solar: higher is better
      if (tile.unit === 'Kč') {
        actualClass = tile.actual <= tile.plan ? 'better' : 'worse';
      } else {
        actualClass = tile.actual >= tile.plan ? 'better' : 'worse';
      }
    }

    return html`
      <div class="metric-tile">
        <div class="metric-label">${label}</div>
        <div class="metric-values">
          <span class="metric-plan">${planStr}</span>
          ${tile.hasActual ? html`
            <span class="metric-actual ${actualClass}">(${actualStr})</span>
          ` : null}
        </div>
      </div>
    `;
  }

  // ---- Main render ----

  render() {
    const tabs: TimelineTab[] = ['yesterday', 'today', 'tomorrow', 'history', 'detail'];

    return html`
      <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
        <div class="dialog-header">
          <span class="dialog-title">📅 Timeline</span>
          <div class="header-controls">
            <label class="auto-refresh">
              <input type="checkbox" .checked=${this.autoRefresh} @change=${this.toggleAutoRefresh} />
              Auto
            </label>
            <button class="close-btn" @click=${this.onClose}>✕</button>
          </div>
        </div>

        <div class="tabs">
          ${tabs.map(tab => html`
            <button
              class="tab ${this.activeTab === tab ? 'active' : ''}"
              @click=${() => this.onTabClick(tab)}
            >
              ${TIMELINE_TAB_LABELS[tab]}
            </button>
          `)}
        </div>

        <div class="dialog-content">
          ${this.data ? this.renderDayContent() : html`
            <div class="empty-state">Načítání dat...</div>
          `}
        </div>
      </div>
    `;
  }

  private renderDayContent() {
    const d = this.data!;
    const s = d.summary;

    return html`
      <!-- Adherence bar -->
      ${s.overallAdherence > 0 ? html`
        <div class="adherence-bar">
          <div class="adherence-header">
            <span>Soulad s plánem</span>
            <span>${this.fmtPct(s.overallAdherence)}</span>
          </div>
          <div class="adherence-track">
            <div
              class="adherence-fill"
              style="width: ${s.overallAdherence}%; background: ${this.adherenceColor(s.overallAdherence)}"
            ></div>
          </div>
        </div>
      ` : null}

      <!-- Progress (today specific) -->
      ${s.progressPct != null ? html`
        <div class="progress-section">
          <div class="progress-item">
            Průběh: <span class="progress-value">${this.fmtPct(s.progressPct)}</span>
          </div>
          ${s.actualTotalCost != null ? html`
            <div class="progress-item">
              Skutečné: <span class="progress-value">${formatCurrency(s.actualTotalCost)}</span>
            </div>
          ` : null}
          ${s.planTotalCost != null ? html`
            <div class="progress-item">
              Plán: <span class="progress-value">${formatCurrency(s.planTotalCost)}</span>
            </div>
          ` : null}
          ${s.vsPlanPct != null ? html`
            <div class="progress-item">
              vs plán: <span class="progress-value" style="color: ${s.vsPlanPct <= 100 ? '#4caf50' : '#f44336'}">${this.fmtPct(s.vsPlanPct)}</span>
            </div>
          ` : null}
        </div>
      ` : null}

      <!-- EOD prediction -->
      ${s.eodPrediction ? html`
        <div class="eod-prediction">
          Predikce konce dne: <span class="eod-value">${formatCurrency(s.eodPrediction.predictedTotal)}</span>
          ${s.eodPrediction.predictedSavings > 0 ? html`
            <span class="eod-savings"> (úspora ${formatCurrency(s.eodPrediction.predictedSavings)})</span>
          ` : null}
        </div>
      ` : null}

      <!-- Metrics grid -->
      <div class="metrics-grid">
        ${this.renderMetricTile('Náklady', s.metrics.cost)}
        ${this.renderMetricTile('Solár', s.metrics.solar)}
        ${this.renderMetricTile('Spotřeba', s.metrics.consumption)}
        ${this.renderMetricTile('Síť', s.metrics.grid)}
      </div>

      <!-- Mode blocks timeline -->
      ${d.modeBlocks.length > 0 ? html`
        <div class="modes-section">
          <div class="section-title">Režimy (${d.modeBlocks.length} bloků, ${s.modeSwitches} přepnutí)</div>
          <div class="mode-blocks-timeline">
            ${d.modeBlocks.map(b => this.renderModeBlock(b))}
          </div>
        </div>
      ` : null}

      <!-- Comparison plan (if available) -->
      ${d.comparison ? html`
        <div class="modes-section">
          <div class="section-title">Srovnání: ${d.comparison.plan}</div>
          <div class="mode-blocks-timeline">
            ${d.comparison.modeBlocks.map(b => this.renderModeBlock(b))}
          </div>
        </div>
      ` : null}
    `;
  }
}

@customElement('oig-timeline-tile')
export class OigTimelineTile extends LitElement {
  @property({ type: Object }) data: TimelineDayData | null = null;
  @property({ type: String }) activeTab: TimelineTab = 'today';
  @state() private autoRefresh = true;

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
      background: rgba(255,255,255,0.1);
      border-radius: 3px;
      overflow: hidden;
    }

    .adherence-fill {
      height: 100%;
      border-radius: 3px;
      transition: width 0.3s;
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

    /* ---- Mode blocks ---- */
    .modes-section {
      margin-bottom: 12px;
    }

    .section-title {
      font-size: 12px;
      font-weight: 500;
      color: ${u(CSS_VARS.textPrimary)};
      margin-bottom: 8px;
    }

    .mode-blocks-timeline {
      display: flex;
      gap: 2px;
      overflow-x: auto;
      padding: 2px 0;
    }

    .mode-block {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 5px 6px;
      border-radius: 6px;
      font-size: 10px;
      color: #fff;
      min-width: 44px;
      position: relative;
      cursor: default;
    }

    .mode-block.current {
      box-shadow: 0 0 0 2px #fff, 0 0 0 4px rgba(255,255,255,0.3);
    }

    .mode-block .mode-icon { font-size: 12px; }
    .mode-block .mode-time { font-size: 8px; opacity: 0.8; }
    .mode-block .mode-name { font-size: 9px; font-weight: 500; }

    .mode-mismatch {
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

    .mode-cost {
      font-size: 8px;
      opacity: 0.7;
      margin-top: 1px;
    }

    /* ---- Progress section ---- */
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

    .empty-state {
      text-align: center;
      padding: 24px 16px;
      color: ${u(CSS_VARS.textSecondary)};
      font-size: 12px;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    if (this.autoRefresh) {
      this.startAutoRefresh();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.stopAutoRefresh();
  }

  private startAutoRefresh(): void {
    this.refreshInterval = window.setInterval(() => {
      if (this.autoRefresh) {
        this.dispatchEvent(new CustomEvent('refresh', { bubbles: true }));
      }
    }, 60000);
  }

  private stopAutoRefresh(): void {
    if (this.refreshInterval !== null) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  private onTabClick(tab: TimelineTab): void {
    this.activeTab = tab;
    this.dispatchEvent(new CustomEvent('tab-change', {
      detail: { tab },
      bubbles: true,
    }));
  }

  private toggleAutoRefresh(): void {
    this.autoRefresh = !this.autoRefresh;
    if (this.autoRefresh) {
      this.startAutoRefresh();
    } else {
      this.stopAutoRefresh();
    }
  }

  private fmtPct(v: number): string {
    return `${v.toFixed(0)}%`;
  }

  private adherenceColor(pct: number): string {
    if (pct >= 90) return '#4caf50';
    if (pct >= 70) return '#ff9800';
    return '#f44336';
  }

  private getModeConfig(modeName: string) {
    return TIMELINE_MODE_CONFIG[modeName] ?? { icon: '❓', color: '#666', label: modeName };
  }

  private renderModeBlock(block: ModeBlock) {
    const cfg = this.getModeConfig(block.modePlanned || block.modeHistorical);
    const isCurrent = block.status === 'current';

    return html`
      <div
        class="mode-block ${isCurrent ? 'current' : ''}"
        style="background: ${cfg.color}; flex: ${Math.max(block.durationHours, 0.5)}"
        title="${block.startTime}–${block.endTime} | ${cfg.label}"
      >
        ${!block.modeMatch ? html`<span class="mode-mismatch">!</span>` : null}
        <span class="mode-icon">${cfg.icon}</span>
        <span class="mode-name">${cfg.label}</span>
        <span class="mode-time">${block.startTime}–${block.endTime}</span>
        ${block.costPlanned != null ? html`
          <span class="mode-cost">${formatCurrency(block.costPlanned)}</span>
        ` : null}
      </div>
    `;
  }

  private renderMetricTile(label: string, tile: MetricTile) {
    const planStr = tile.unit === 'Kč'
      ? formatCurrency(tile.plan)
      : `${tile.plan.toFixed(1)} ${tile.unit}`;

    let actualClass = '';
    let actualStr = '';
    if (tile.hasActual && tile.actual != null) {
      actualStr = tile.unit === 'Kč'
        ? formatCurrency(tile.actual)
        : `${tile.actual.toFixed(1)} ${tile.unit}`;

      if (tile.unit === 'Kč') {
        actualClass = tile.actual <= tile.plan ? 'better' : 'worse';
      } else {
        actualClass = tile.actual >= tile.plan ? 'better' : 'worse';
      }
    }

    return html`
      <div class="metric-tile">
        <div class="metric-label">${label}</div>
        <div class="metric-values">
          <span class="metric-plan">${planStr}</span>
          ${tile.hasActual ? html`
            <span class="metric-actual ${actualClass}">(${actualStr})</span>
          ` : null}
        </div>
      </div>
    `;
  }

  render() {
    const tabs: TimelineTab[] = ['yesterday', 'today', 'tomorrow', 'history', 'detail'];

    return html`
      <div class="tile">
        <div class="tile-header">
          <span class="tile-title">📅 Plán režimů</span>
          <label class="auto-refresh">
            <input type="checkbox" .checked=${this.autoRefresh} @change=${this.toggleAutoRefresh} />
            Auto
          </label>
        </div>

        <div class="tabs">
          ${tabs.map(tab => html`
            <button
              class="tab ${this.activeTab === tab ? 'active' : ''}"
              @click=${() => this.onTabClick(tab)}
            >
              ${TIMELINE_TAB_LABELS[tab]}
            </button>
          `)}
        </div>

        <div class="tile-content">
          ${this.data ? this.renderDayContent() : html`
            <div class="empty-state">Načítání dat...</div>
          `}
        </div>
      </div>
    `;
  }

  private renderDayContent() {
    const d = this.data!;
    const s = d.summary;

    return html`
      <!-- Adherence bar -->
      ${s.overallAdherence > 0 ? html`
        <div class="adherence-bar">
          <div class="adherence-header">
            <span>Soulad s plánem</span>
            <span>${this.fmtPct(s.overallAdherence)}</span>
          </div>
          <div class="adherence-track">
            <div
              class="adherence-fill"
              style="width: ${s.overallAdherence}%; background: ${this.adherenceColor(s.overallAdherence)}"
            ></div>
          </div>
        </div>
      ` : null}

      <!-- Progress (today specific) -->
      ${s.progressPct != null ? html`
        <div class="progress-section">
          <div class="progress-item">
            Průběh: <span class="progress-value">${this.fmtPct(s.progressPct)}</span>
          </div>
          ${s.actualTotalCost != null ? html`
            <div class="progress-item">
              Skutečné: <span class="progress-value">${formatCurrency(s.actualTotalCost)}</span>
            </div>
          ` : null}
          ${s.planTotalCost != null ? html`
            <div class="progress-item">
              Plán: <span class="progress-value">${formatCurrency(s.planTotalCost)}</span>
            </div>
          ` : null}
          ${s.vsPlanPct != null ? html`
            <div class="progress-item">
              vs plán: <span class="progress-value" style="color: ${s.vsPlanPct <= 100 ? '#4caf50' : '#f44336'}">${this.fmtPct(s.vsPlanPct)}</span>
            </div>
          ` : null}
        </div>
      ` : null}

      <!-- EOD prediction -->
      ${s.eodPrediction ? html`
        <div class="eod-prediction">
          Predikce konce dne: <span class="eod-value">${formatCurrency(s.eodPrediction.predictedTotal)}</span>
          ${s.eodPrediction.predictedSavings > 0 ? html`
            <span class="eod-savings"> (úspora ${formatCurrency(s.eodPrediction.predictedSavings)})</span>
          ` : null}
        </div>
      ` : null}

      <!-- Metrics grid -->
      <div class="metrics-grid">
        ${this.renderMetricTile('Náklady', s.metrics.cost)}
        ${this.renderMetricTile('Solár', s.metrics.solar)}
        ${this.renderMetricTile('Spotřeba', s.metrics.consumption)}
        ${this.renderMetricTile('Síť', s.metrics.grid)}
      </div>

      <!-- Mode blocks timeline -->
      ${d.modeBlocks.length > 0 ? html`
        <div class="modes-section">
          <div class="section-title">Režimy (${d.modeBlocks.length} bloků, ${s.modeSwitches} přepnutí)</div>
          <div class="mode-blocks-timeline">
            ${d.modeBlocks.map(b => this.renderModeBlock(b))}
          </div>
        </div>
      ` : null}

      <!-- Comparison plan (if available) -->
      ${d.comparison ? html`
        <div class="modes-section">
          <div class="section-title">Srovnání: ${d.comparison.plan}</div>
          <div class="mode-blocks-timeline">
            ${d.comparison.modeBlocks.map(b => this.renderModeBlock(b))}
          </div>
        </div>
      ` : null}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-timeline-dialog': OigTimelineDialog;
    'oig-timeline-tile': OigTimelineTile;
  }
}
