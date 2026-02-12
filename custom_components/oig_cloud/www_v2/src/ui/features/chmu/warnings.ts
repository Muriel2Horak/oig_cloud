import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { ChmuWarning, LEVEL_COLORS, LEVEL_LABELS } from './types';

const u = unsafeCSS;

@customElement('oig-chmu-badge')
export class OigChmuBadge extends LitElement {
  @property({ type: Array }) warnings: ChmuWarning[] = [];
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

  private get highestLevel(): ChmuWarning['level'] {
    if (this.warnings.some(w => w.level === 'extreme')) return 'extreme';
    if (this.warnings.some(w => w.level === 'high')) return 'high';
    if (this.warnings.some(w => w.level === 'medium')) return 'medium';
    return 'low';
  }

  render() {
    const hasWarnings = this.warnings.length > 0;
    const level = this.highestLevel;
    const color = LEVEL_COLORS[level];

    return html`
      <style>
        :host { background: ${u(color)}; color: #fff; }
      </style>
      <span class="badge-icon">${hasWarnings ? '⚠️' : '✓'}</span>
      ${hasWarnings ? html`
        <span class="badge-count">${this.warnings.length}</span>
      ` : null}
      <span class="badge-label">${hasWarnings ? 'Výstrahy' : 'OK'}</span>
    `;
  }
}

@customElement('oig-chmu-modal')
export class OigChmuModal extends LitElement {
  @property({ type: Boolean }) open = false;
  @property({ type: Array }) warnings: ChmuWarning[] = [];

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
  `;

  private onClose(): void {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true }));
  }

  private formatTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('cs-CZ');
  }

  render() {
    return html`
      <div class="modal" @click=${(e: Event) => e.stopPropagation()}>
        <div class="modal-header">
          <span class="modal-title">⚠️ ČHMÚ výstrahy</span>
          <button class="close-btn" @click=${this.onClose}>✕</button>
        </div>

        ${this.warnings.length === 0 ? html`
          <div class="empty-state">Žádné aktivní výstrahy</div>
        ` : this.warnings.map(warning => html`
          <div
            class="warning-item"
            style="background: ${u(LEVEL_COLORS[warning.level])}"
          >
            <div class="warning-header">
              <span class="warning-type">${warning.type}</span>
              <span class="warning-level">${LEVEL_LABELS[warning.level]}</span>
            </div>
            <div class="warning-description">${warning.description}</div>
            <div class="warning-time">
              ${this.formatTime(warning.start)} - ${this.formatTime(warning.end)}
            </div>
          </div>
        `)}
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
