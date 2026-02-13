import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import type { ChmuData, ChmuWarningDetail } from './types';
import { SEVERITY_COLORS, SEVERITY_LABELS, getChmuIcon, EMPTY_CHMU_DATA } from './types';

const u = unsafeCSS;

// ============================================================================
// oig-chmu-badge — compact badge for the header
// ============================================================================

@customElement('oig-chmu-badge')
export class OigChmuBadge extends LitElement {
  @property({ type: Object }) data: ChmuData = EMPTY_CHMU_DATA;
  @property({ type: Boolean }) compact = false;

  static styles = css`
    :host {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: opacity 0.2s;
      color: #fff;
    }

    :host(:hover) {
      opacity: 0.9;
    }

    .badge-icon {
      font-size: 14px;
    }

    .badge-count {
      background: rgba(255,255,255,0.3);
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 11px;
    }

    :host([compact]) .badge-label {
      display: none;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.addEventListener('click', this.onClick);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeEventListener('click', this.onClick);
  }

  private onClick = (): void => {
    this.dispatchEvent(new CustomEvent('badge-click', { bubbles: true }));
  };

  render() {
    const sev = this.data.effectiveSeverity;
    const color = SEVERITY_COLORS[sev] ?? SEVERITY_COLORS[0];
    const hasWarnings = this.data.warningsCount > 0 && sev > 0;
    const icon = hasWarnings ? getChmuIcon(this.data.eventType) : '✓';

    return html`
      <style>
        :host { background: ${u(color)}; }
      </style>
      <span class="badge-icon">${icon}</span>
      ${hasWarnings ? html`
        <span class="badge-count">${this.data.warningsCount}</span>
      ` : null}
      <span class="badge-label">${hasWarnings ? SEVERITY_LABELS[sev] ?? 'Výstraha' : 'OK'}</span>
    `;
  }
}

// ============================================================================
// oig-chmu-modal — full overlay with all warnings
// ============================================================================

@customElement('oig-chmu-modal')
export class OigChmuModal extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Object }) data: ChmuData = EMPTY_CHMU_DATA;

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

    .modal {
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 16px;
      padding: 20px;
      width: 90vw;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 16px;
    }

    .modal-title {
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

    .warning-item {
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 12px;
      color: #fff;
    }

    .warning-item:last-child {
      margin-bottom: 0;
    }

    .warning-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .warning-icon { font-size: 18px; }

    .warning-type {
      font-size: 14px;
      font-weight: 600;
    }

    .warning-level {
      font-size: 11px;
      padding: 2px 6px;
      background: rgba(255,255,255,0.2);
      border-radius: 4px;
    }

    .warning-description {
      font-size: 12px;
      margin-bottom: 4px;
    }

    .warning-instruction {
      font-size: 11px;
      font-style: italic;
      opacity: 0.85;
      margin-bottom: 8px;
    }

    .warning-time {
      font-size: 11px;
      opacity: 0.8;
    }

    .empty-state {
      text-align: center;
      padding: 20px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .eta-badge {
      display: inline-block;
      font-size: 10px;
      padding: 1px 6px;
      background: rgba(255,255,255,0.2);
      border-radius: 4px;
      margin-left: 6px;
    }
  `;

  private onClose(): void {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true }));
  }

  private formatTime(dateStr: string): string {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('cs-CZ');
  }

  private renderWarning(w: ChmuWarningDetail) {
    const color = SEVERITY_COLORS[w.severity] ?? SEVERITY_COLORS[2];
    const icon = getChmuIcon(w.event_type);
    const levelLabel = SEVERITY_LABELS[w.severity] ?? 'Neznámá';

    return html`
      <div class="warning-item" style="background: ${color}">
        <div class="warning-header">
          <span class="warning-icon">${icon}</span>
          <span class="warning-type">${w.event_type}</span>
          <span class="warning-level">${levelLabel}</span>
          ${w.eta_hours > 0 ? html`
            <span class="eta-badge">za ${w.eta_hours.toFixed(0)}h</span>
          ` : null}
        </div>
        ${w.description ? html`
          <div class="warning-description">${w.description}</div>
        ` : null}
        ${w.instruction ? html`
          <div class="warning-instruction">${w.instruction}</div>
        ` : null}
        <div class="warning-time">
          ${this.formatTime(w.onset)} — ${this.formatTime(w.expires)}
        </div>
      </div>
    `;
  }

  render() {
    const warnings = this.data.allWarnings;
    const hasWarnings = warnings.length > 0 && this.data.effectiveSeverity > 0;

    return html`
      <div class="modal" @click=${(e: Event) => e.stopPropagation()}>
        <div class="modal-header">
          <span class="modal-title">⚠️ ČHMÚ výstrahy</span>
          <button class="close-btn" @click=${this.onClose}>✕</button>
        </div>

        ${!hasWarnings ? html`
          <div class="empty-state">Žádné aktivní výstrahy</div>
        ` : warnings.map(w => this.renderWarning(w))}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-chmu-badge': OigChmuBadge;
    'oig-chmu-modal': OigChmuModal;
  }
}
