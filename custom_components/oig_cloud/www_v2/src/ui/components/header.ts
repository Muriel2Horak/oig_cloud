import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';

const u = unsafeCSS;

@customElement('oig-header')
export class OigHeader extends LitElement {
  @property({ type: String }) title = 'Energetické Toky';
  @property({ type: String }) time = '';
  @property({ type: Boolean }) showStatus = false;
  @property({ type: Number }) alertCount = 0;

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

    .title-icon { font-size: 20px; }

    .version {
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      background: ${u(CSS_VARS.bgSecondary)};
      padding: 2px 6px;
      border-radius: 4px;
    }

    .time {
      font-size: 13px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-left: 8px;
    }

    .spacer { flex: 1; }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.2s;
    }

    .status-badge.warning {
      background: ${u(CSS_VARS.warning)};
      color: #fff;
    }

    .status-badge.error {
      background: ${u(CSS_VARS.error)};
      color: #fff;
    }

    .status-badge.ok {
      background: ${u(CSS_VARS.success)};
      color: #fff;
    }

    .status-badge:hover { opacity: 0.9; }

    .status-count {
      background: rgba(255,255,255,0.3);
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 11px;
    }

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
        <span class="title-icon">⚡</span>
        ${this.title}
        <span class="version">V2</span>
        ${this.time ? html`<span class="time">${this.time}</span>` : null}
      </h1>
      
      <div class="spacer"></div>
      
      ${this.showStatus ? html`
        <div class="status-badge ${statusClass}" @click=${this.onStatusClick}>
          ${this.alertCount > 0 ? html`
            <span class="status-count">${this.alertCount}</span>
          ` : null}
          <span>${this.alertCount > 0 ? 'Výstrahy' : 'OK'}</span>
        </div>
      ` : null}
      
      <div class="actions">
        <button class="action-btn" @click=${this.onEditClick} title="Upravit layout">
          ✏️
        </button>
        <button class="action-btn" @click=${this.onResetClick} title="Reset layout">
          ↺
        </button>
      </div>
    `;
  }
}
