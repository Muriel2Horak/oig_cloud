import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { TimelineTab, TimelineData, TIMELINE_TAB_LABELS, MODE_COLORS } from './types';

const u = unsafeCSS;

@customElement('oig-timeline-dialog')
export class OigTimelineDialog extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ type: String }) activeTab: TimelineTab = 'today';
  @property({ type: Object }) data: TimelineData | null = null;
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

    .modes-section {
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 14px;
      font-weight: 500;
      color: ${u(CSS_VARS.textPrimary)};
      margin-bottom: 12px;
    }

    .modes-grid {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
    }

    .mode-block {
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      color: #fff;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
      gap: 12px;
    }

    .summary-item {
      background: ${u(CSS_VARS.bgSecondary)};
      border-radius: 8px;
      padding: 12px;
    }

    .summary-label {
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-bottom: 4px;
    }

    .summary-value {
      font-size: 16px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
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

  private formatEnergy(wh: number): string {
    if (Math.abs(wh) >= 1000) {
      return `${(wh / 1000).toFixed(1)} kWh`;
    }
    return `${Math.round(wh)} Wh`;
  }

  private formatCurrency(value: number): string {
    return `${value.toFixed(2)} Kč`;
  }

  render() {
    const tabs: TimelineTab[] = ['yesterday', 'today', 'tomorrow', 'history', 'comparison'];

    return html`
      <div class="dialog" @click=${(e: Event) => e.stopPropagation()}>
        <div class="dialog-header">
          <span class="dialog-title">Timeline</span>
          <button class="close-btn" @click=${this.onClose}>✕</button>
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
          ${this.data ? html`
            <div class="modes-section">
              <div class="section-title">Režimy</div>
              <div class="modes-grid">
                ${this.data.modes.map(mode => html`
                  <div
                    class="mode-block"
                    style="background: ${u(MODE_COLORS[mode.mode] || '#666')}"
                  >
                    ${mode.mode} (${mode.start} - ${mode.end})
                  </div>
                `)}
              </div>
            </div>

            <div class="section-title">Souhrn</div>
            <div class="summary-grid">
              <div class="summary-item">
                <div class="summary-label">Solár</div>
                <div class="summary-value">${this.formatEnergy(this.data.summary.solarProduction)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Ze sítě</div>
                <div class="summary-value">${this.formatEnergy(this.data.summary.gridImport)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Do sítě</div>
                <div class="summary-value">${this.formatEnergy(this.data.summary.gridExport)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Spotřeba</div>
                <div class="summary-value">${this.formatEnergy(this.data.summary.consumption)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Náklady</div>
                <div class="summary-value">${this.formatCurrency(this.data.summary.cost)}</div>
              </div>
              <div class="summary-item">
                <div class="summary-label">Výnos</div>
                <div class="summary-value">${this.formatCurrency(this.data.summary.revenue)}</div>
              </div>
            </div>
          ` : html`
            <div>Načítání...</div>
          `}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-timeline-dialog': OigTimelineDialog;
  }
}
