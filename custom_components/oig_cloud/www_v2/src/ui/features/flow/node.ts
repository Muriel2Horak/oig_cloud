import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { FlowNode, NODE_COLORS, DEFAULT_NODES } from './types';

const u = unsafeCSS;

@customElement('oig-flow-node')
export class OigFlowNode extends LitElement {
  @property({ type: Object }) node: FlowNode = DEFAULT_NODES[0];
  @property({ type: Boolean }) selected = false;

  static styles = css`
    :host {
      display: block;
      position: absolute;
      min-width: 100px;
      min-height: 60px;
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
      cursor: pointer;
      transition: transform 0.2s, box-shadow 0.2s;
      user-select: none;
    }

    :host(:hover) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    }

    :host([selected]) {
      box-shadow: 0 0 0 3px ${u(CSS_VARS.accent)};
    }

    .node-content {
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .node-header {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .node-icon {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 12px;
    }

    .node-label {
      font-size: 12px;
      font-weight: 500;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .node-power {
      font-size: 16px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .node-power.export {
      color: ${u(CSS_VARS.success)};
    }

    .node-power.import {
      color: ${u(CSS_VARS.error)};
    }

    .node-detail {
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
    }
  `;

  private onClick(): void {
    this.dispatchEvent(new CustomEvent('node-click', {
      detail: { node: this.node },
      bubbles: true,
    }));
  }

  private getIcon(): string {
    const icons: Record<string, string> = {
      solar: '☀️',
      battery: '🔋',
      inverter: '⚡',
      grid: '🔌',
      house: '🏠',
    };
    return icons[this.node.type] || '❓';
  }

  private getPowerClass(): string {
    if (this.node.power > 0) return 'export';
    if (this.node.power < 0) return 'import';
    return '';
  }

  private formatPower(): string {
    const abs = Math.abs(this.node.power);
    if (abs >= 1000) return `${(this.node.power / 1000).toFixed(1)} kW`;
    return `${Math.round(this.node.power)} W`;
  }

  render() {
    const color = NODE_COLORS[this.node.type];

    return html`
      <div class="node-content" @click=${this.onClick}>
        <div class="node-header">
          <div class="node-icon" style="background: ${color}20; color: ${color}">
            ${this.getIcon()}
          </div>
          <span class="node-label">${this.node.label}</span>
        </div>
        <div class="node-power ${this.getPowerClass()}">
          ${this.formatPower()}
        </div>
        ${this.node.type === 'battery' && this.node.data.soc !== undefined ? html`
          <div class="node-detail">SoC: ${this.node.data.soc}%</div>
        ` : null}
        ${this.node.type === 'inverter' && this.node.data.mode ? html`
          <div class="node-detail">${this.node.data.mode}</div>
        ` : null}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-flow-node': OigFlowNode;
  }
}
