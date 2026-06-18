import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { renderIcon } from '@/utils/render-icon';
import { weatherConditionIcon } from '@/data/weather-data';

const u = unsafeCSS;

@customElement('oig-header')
export class OigHeader extends LitElement {
  @property({ type: String }) title = 'Energetické Toky';
  @property({ type: String }) time = '';
  @property({ type: Boolean }) showStatus = false;
  /** Count of active ČHMÚ warnings (drives the warning chip). */
  @property({ type: Number }) alertCount = 0;
  /** Live weather (from weather.* entity); when unavailable, badge shows warnings only. */
  @property({ type: Boolean }) weatherAvailable = false;
  @property({ type: String }) weatherCondition = '';
  @property({ type: Number }) weatherTemp: number | null = null;

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      background: ${u(CSS_VARS.bgPrimary)};
      border-bottom: 1px solid ${u(CSS_VARS.divider)};
      gap: 12px;
    }

    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 18px;
      font-weight: 500;
      color: ${u(CSS_VARS.textPrimary)};
      margin: 0;
    }

    .title-icon { font-size: 20px; color: ${u(CSS_VARS.accent)}; display: inline-flex; }
    .oig-mdi { width: 1em; height: 1em; fill: currentColor; vertical-align: -0.125em; display: inline-block; }

    .time {
      font-size: 13px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-left: 8px;
    }

    .spacer { flex: 1; }

    /* ── Weather badge (current conditions + optional warning chip) ── */
    .weather-badge {
      display: flex;
      align-items: center;
      gap: 7px;
      padding: 4px 10px 4px 8px;
      border-radius: 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid ${u(CSS_VARS.divider)};
      background: ${u(CSS_VARS.bgSecondary)};
      color: ${u(CSS_VARS.textPrimary)};
      transition: background 0.2s, border-color 0.2s;
    }
    .weather-badge:hover { background: ${u(CSS_VARS.divider)}; }
    .weather-badge.has-warn { border-color: ${u(CSS_VARS.warning)}; }

    .wb-icon { font-size: 18px; display: inline-flex; color: ${u(CSS_VARS.accent)}; }
    .wb-temp { font-variant-numeric: tabular-nums; }

    .wb-warn {
      display: inline-flex;
      align-items: center;
      gap: 3px;
      margin-left: 2px;
      padding: 1px 7px 1px 5px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 700;
      background: ${u(CSS_VARS.warning)};
      color: #fff;
    }
    .wb-warn .oig-mdi { font-size: 12px; }

    /* Fallback OK/warning pill when no weather entity is configured */
    .status-badge {
      display: flex; align-items: center; gap: 6px;
      padding: 4px 10px; border-radius: 16px;
      font-size: 12px; font-weight: 500; cursor: pointer;
      transition: background 0.2s; color: #fff;
    }
    .status-badge.warning { background: ${u(CSS_VARS.warning)}; }
    .status-badge.ok { background: ${u(CSS_VARS.success)}; }
    .status-badge:hover { opacity: 0.9; }
    .status-count { background: rgba(255,255,255,0.3); padding: 1px 6px; border-radius: 10px; font-size: 11px; }

    .actions { display: flex; gap: 8px; }

    .action-btn {
      width: 32px;
      height: 32px;
      border: none;
      background: transparent;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: ${u(CSS_VARS.textSecondary)};
      transition: all 0.2s;
      font-size: 18px;
    }

    .action-btn:hover {
      background: ${u(CSS_VARS.bgSecondary)};
      color: ${u(CSS_VARS.textPrimary)};
    }

    .action-btn.active {
      background: ${u(CSS_VARS.accent)};
      color: #fff;
    }
  `;

  private onStatusClick(): void {
    this.dispatchEvent(new CustomEvent('status-click', { bubbles: true }));
  }

  private onEditClick(): void {
    this.dispatchEvent(new CustomEvent('edit-click', { bubbles: true }));
  }

  private onResetClick(): void {
    this.dispatchEvent(new CustomEvent('reset-click', { bubbles: true }));
  }

  render() {
    const statusClass = this.alertCount > 0 ? 'warning' : 'ok';

    return html`
      <h1 class="title">
        <span class="title-icon">${renderIcon('mdi:lightning-bolt')}</span>
        ${this.title}
        ${this.time ? html`<span class="time">${this.time}</span>` : null}
      </h1>

      <div class="spacer"></div>

      ${this.showStatus ? (
        this.weatherAvailable ? html`
          <button class="weather-badge ${this.alertCount > 0 ? 'has-warn' : ''}"
            @click=${this.onStatusClick} title="Počasí a výstrahy">
            <span class="wb-icon">${renderIcon(weatherConditionIcon(this.weatherCondition))}</span>
            <span class="wb-temp">${this.weatherTemp != null ? `${Math.round(this.weatherTemp)} °C` : '—'}</span>
            ${this.alertCount > 0 ? html`
              <span class="wb-warn">${renderIcon('mdi:alert-circle')} ${this.alertCount}</span>
            ` : null}
          </button>
        ` : html`
          <div class="status-badge ${statusClass}" @click=${this.onStatusClick}>
            ${this.alertCount > 0 ? html`<span class="status-count">${this.alertCount}</span>` : null}
            <span>${this.alertCount > 0 ? 'Výstrahy' : 'OK'}</span>
          </div>
        `
      ) : null}

       <div class="actions">
         <button class="action-btn" @click=${this.onEditClick} title="Upravit rozložení dlaždic">
           ${renderIcon('mdi:pencil')}
         </button>
         <button class="action-btn" @click=${this.onResetClick} title="Obnovit rozložení">
           ${renderIcon('mdi:refresh')}
         </button>
       </div>
    `;
  }
}
