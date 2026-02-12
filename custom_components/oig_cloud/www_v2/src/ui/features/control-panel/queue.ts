import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { ShieldQueueItem, QUEUE_STATUS_COLORS } from './types';

const u = unsafeCSS;

@customElement('oig-shield-queue')
export class OigShieldQueue extends LitElement {
  @property({ type: Array }) items: ShieldQueueItem[] = [];
  @property({ type: Boolean }) expanded = false;
  @state() private now = Date.now();

  private updateInterval: number | null = null;

  static styles = css`
    :host {
      display: block;
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
      overflow: hidden;
    }

    .queue-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      cursor: pointer;
      background: ${u(CSS_VARS.bgSecondary)};
    }

    .queue-title {
      font-size: 14px;
      font-weight: 500;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .queue-count {
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .queue-toggle {
      font-size: 12px;
      color: ${u(CSS_VARS.accent)};
    }

    .queue-content {
      padding: 12px 16px;
    }

    .queue-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 0;
      border-bottom: 1px solid ${u(CSS_VARS.divider)};
    }

    .queue-item:last-child {
      border-bottom: none;
    }

    .item-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .item-info {
      flex: 1;
    }

    .item-type {
      font-size: 12px;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .item-time {
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .item-error {
      font-size: 11px;
      color: ${u(CSS_VARS.error)};
      margin-top: 2px;
    }

    .item-remove {
      padding: 4px 8px;
      border: none;
      background: transparent;
      color: ${u(CSS_VARS.textSecondary)};
      cursor: pointer;
      font-size: 12px;
    }

    .item-remove:hover {
      color: ${u(CSS_VARS.error)};
    }

    .empty-state {
      text-align: center;
      padding: 16px;
      color: ${u(CSS_VARS.textSecondary)};
      font-size: 12px;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.updateInterval = window.setInterval(() => {
      this.now = Date.now();
    }, 1000);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.updateInterval !== null) {
      clearInterval(this.updateInterval);
    }
  }

  private toggleExpanded(): void {
    this.expanded = !this.expanded;
  }

  private removeItem(id: string): void {
    this.dispatchEvent(new CustomEvent('remove-item', {
      detail: { id },
      bubbles: true,
    }));
  }

  private formatTime(dateStr: string): string {
    const date = new Date(dateStr);
    const diff = this.now - date.getTime();
    
    if (diff < 60000) return 'právě teď';
    if (diff < 3600000) return `před ${Math.floor(diff / 60000)} min`;
    if (diff < 86400000) return `před ${Math.floor(diff / 3600000)} h`;
    return date.toLocaleDateString('cs-CZ');
  }

  private getItemTypeLabel(item: ShieldQueueItem): string {
    const labels: Record<string, string> = {
      mode_change: 'Změna režimu',
      grid_delivery: 'Dodávka ze sítě',
      battery_charge: 'Nabíjení baterie',
    };
    return labels[item.type] || item.type;
  }

  private get activeCount(): number {
    return this.items.filter(i => i.status === 'pending' || i.status === 'running').length;
  }

  render() {
    return html`
      <div class="queue-header" @click=${this.toggleExpanded}>
        <div>
          <span class="queue-title">Shield fronta</span>
          ${this.activeCount > 0 ? html`
            <span class="queue-count">(${this.activeCount} aktivních)</span>
          ` : null}
        </div>
        <span class="queue-toggle">${this.expanded ? '▲' : '▼'}</span>
      </div>
      
      ${this.expanded ? html`
        <div class="queue-content">
          ${this.items.length === 0 ? html`
            <div class="empty-state">Fronta je prázdná</div>
          ` : this.items.map(item => html`
            <div class="queue-item">
              <div 
                class="item-status" 
                style="background: ${u(QUEUE_STATUS_COLORS[item.status])}"
              ></div>
              <div class="item-info">
                <div class="item-type">${this.getItemTypeLabel(item)}</div>
                <div class="item-time">${this.formatTime(item.createdAt)}</div>
                ${item.error ? html`
                  <div class="item-error">${item.error}</div>
                ` : null}
              </div>
              ${item.status === 'pending' ? html`
                <button 
                  class="item-remove"
                  @click=${(e: Event) => { e.stopPropagation(); this.removeItem(item.id); }}
                >
                  ✕
                </button>
              ` : null}
            </div>
          `)}
        </div>
      ` : null}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-shield-queue': OigShieldQueue;
  }
}
