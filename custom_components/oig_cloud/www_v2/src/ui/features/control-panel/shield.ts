/**
 * OIG Cloud V2 — Shield Status Component
 *
 * Displays shield status with 3 states (idle/pending/processing) and queue count.
 * Provides visual feedback for shield activity state.
 *
 * Data is provided by the parent oig-control-panel via properties,
 * sourced from ShieldController.
 */

import { LitElement, html, css, nothing, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { ShieldState } from './types';

const u = unsafeCSS;

@customElement('oig-shield-status')
export class OigShieldStatus extends LitElement {
  @property({ type: Object }) shieldState: ShieldState | null = null;

  static styles = css`
    :host {
      display: block;
      padding: 16px 20px;
      border-top: 1px solid ${u(CSS_VARS.divider)};
    }

    .shield-status-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }

    .shield-status-left {
      display: flex;
      align-items: center;
      gap: 8px;
      flex: 1;
    }

    .shield-status-icon {
      font-size: 20px;
    }

    .shield-status-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .shield-status-title {
      font-size: 13px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .shield-status-subtitle {
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .shield-status-right {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .shield-status-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .shield-status-badge.idle {
      color: #4caf50;
      background: rgba(76, 175, 80, 0.1);
    }

    .shield-status-badge.pending {
      color: #ffc107;
      background: rgba(255, 193, 7, 0.1);
    }

    .shield-status-badge.processing {
      color: #42a5f5;
      background: rgba(66, 165, 245, 0.1);
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }

    .queue-count {
      font-size: 11px;
      padding: 3px 8px;
      border-radius: 8px;
      background: ${u(CSS_VARS.bgSecondary)};
      color: ${u(CSS_VARS.textSecondary)};
      font-weight: 500;
    }

    .queue-count.has-items {
      color: #ff9800;
      background: rgba(255, 152, 0, 0.1);
    }

    @media (max-width: 480px) {
      :host {
        padding: 12px 14px;
      }

      .shield-status-badge {
        padding: 3px 8px;
        font-size: 10px;
      }

      .queue-count {
        font-size: 10px;
        padding: 2px 6px;
      }
    }
  `;

  render() {
    if (!this.shieldState) return nothing;

    const status = this.determineStatus(this.shieldState);
    const statusClass = status.toLowerCase();
    const statusIcon = this.getStatusIcon(status);
    const statusLabel = this.getStatusLabel(status);
    const hasQueue = this.shieldState.queueCount > 0;
    const queueCountClass = hasQueue ? 'has-items' : '';

    return html`
      <div class="shield-status-container">
        <div class="shield-status-left">
          <span class="shield-status-icon">${statusIcon}</span>
          <div class="shield-status-info">
            <span class="shield-status-title">Shield ochrana</span>
            <span class="shield-status-subtitle">${this.getActivityText()}</span>
          </div>
        </div>
        <div class="shield-status-right">
          <span class="queue-count ${queueCountClass}">
            Fronta: ${this.shieldState.queueCount}
          </span>
          <span class="shield-status-badge ${statusClass}">${statusLabel}</span>
        </div>
      </div>
    `;
  }

  private determineStatus(state: ShieldState): 'idle' | 'pending' | 'processing' {
    if (state.status === 'running') {
      return 'processing';
    }

    if (state.queueCount > 0) {
      return 'pending';
    }

    return 'idle';
  }

  private getStatusIcon(status: 'idle' | 'pending' | 'processing'): string {
    switch (status) {
      case 'idle':
        return '\u2713';
      case 'pending':
        return '\u23F3';
      case 'processing':
        return '\uD83D\uDD04';
      default:
        return '\u2713';
    }
  }

  private getStatusLabel(status: 'idle' | 'pending' | 'processing'): string {
    switch (status) {
      case 'idle':
        return 'Připraveno';
      case 'pending':
        return 'Čeká';
      case 'processing':
        return 'Zpracovává';
      default:
        return 'Neznámý';
    }
  }

  private getActivityText(): string {
    if (!this.shieldState) return 'Žádná aktivita';

    if (this.shieldState.activity) {
      return this.shieldState.activity;
    }

    if (this.shieldState.queueCount > 0) {
      return `${this.shieldState.queueCount} operací ve frontě`;
    }

    return 'Systém připraven';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-shield-status': OigShieldStatus;
  }
}
