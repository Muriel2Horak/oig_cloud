import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';

export type AlertLevel = 'ok' | 'warning' | 'error';

@customElement('oig-status-badge')
export class OigStatusBadge extends LitElement {
  @property({ type: String }) level: AlertLevel = 'ok';
  @property({ type: Number }) count = 0;
  @property({ type: String }) label = '';
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

    :host([level='ok']) {
      background: ${unsafeCSS(CSS_VARS.success)};
      color: #fff;
    }

    :host([level='warning']) {
      background: ${unsafeCSS(CSS_VARS.warning)};
      color: #fff;
    }

    :host([level='error']) {
      background: ${unsafeCSS(CSS_VARS.error)};
      color: #fff;
    }

    .count {
      background: rgba(255,255,255,0.3);
      padding: 1px 6px;
      border-radius: 10px;
      font-size: 11px;
      min-width: 18px;
      text-align: center;
    }

    :host([compact]) .label {
      display: none;
    }

    @media (max-width: 768px) {
      :host {
        padding: 3px 8px;
        font-size: 11px;
      }

      .label {
        display: none;
      }
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
    this.dispatchEvent(new CustomEvent('status-click', {
      detail: { level: this.level, count: this.count },
      bubbles: true,
    }));
  };

  render() {
    return html`
      ${this.count > 0 ? html`
        <span class="count">${this.count}</span>
      ` : null}
      ${this.label ? html`
        <span class="label">${this.label}</span>
      ` : null}
    `;
  }
}
