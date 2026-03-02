import { LitElement, css, svg, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { FlowConnection, FlowNode, NODE_COLORS } from './types';

const u = unsafeCSS;

@customElement('oig-flow-connection')
export class OigFlowConnection extends LitElement {
  @property({ type: Object }) connection!: FlowConnection;
  @property({ type: Object }) fromNode!: FlowNode;
  @property({ type: Object }) toNode!: FlowNode;
  @property({ type: Boolean }) animated = false;

  static styles = css`
    :host {
      display: block;
      position: absolute;
      pointer-events: none;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    svg {
      width: 100%;
      height: 100%;
      overflow: visible;
    }

    .connection-line {
      fill: none;
      stroke-width: 3;
      stroke-linecap: round;
    }

    .connection-active {
      filter: drop-shadow(0 0 3px currentColor);
    }

    .power-label {
      font-size: 11px;
      font-weight: 500;
      fill: ${u(CSS_VARS.textPrimary)};
    }

    @keyframes flow {
      0% { stroke-dashoffset: 20; }
      100% { stroke-dashoffset: 0; }
    }

    .animated {
      stroke-dasharray: 10 10;
      animation: flow 0.5s linear infinite;
    }
  `;

  private getStrokeColor(): string {
    if (this.connection.power > 0) {
      const fromType = this.fromNode.type;
      return NODE_COLORS[fromType] || CSS_VARS.accent;
    }
    if (this.connection.power < 0) {
      return NODE_COLORS.grid;
    }
    return CSS_VARS.divider;
  }

  private getPath(): string {
    const x1 = this.fromNode.x + this.fromNode.width / 2;
    const y1 = this.fromNode.y + this.fromNode.height / 2;
    const x2 = this.toNode.x + this.toNode.width / 2;
    const y2 = this.toNode.y + this.toNode.height / 2;

    const midX = (x1 + x2) / 2;

    return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  }

  private getLabelPosition(): { x: number; y: number } {
    const x1 = this.fromNode.x + this.fromNode.width / 2;
    const y1 = this.fromNode.y + this.fromNode.height / 2;
    const x2 = this.toNode.x + this.toNode.width / 2;
    const y2 = this.toNode.y + this.toNode.height / 2;

    return {
      x: (x1 + x2) / 2,
      y: (y1 + y2) / 2 - 8,
    };
  }

  private formatPower(): string {
    const abs = Math.abs(this.connection.power);
    if (abs >= 1000) return `${(this.connection.power / 1000).toFixed(1)}k`;
    return `${Math.round(this.connection.power)}`;
  }

  render() {
    const path = this.getPath();
    const color = this.getStrokeColor();
    const label = this.getLabelPosition();
    const isActive = Math.abs(this.connection.power) > 0;

    return svg`
      <svg>
        <path
          class="connection-line ${isActive ? 'connection-active' : ''} ${this.animated && isActive ? 'animated' : ''}"
          d="${path}"
          stroke="${color}"
        />
        ${isActive ? svg`
          <text
            class="power-label"
            x="${label.x}"
            y="${label.y}"
            text-anchor="middle"
          >${this.formatPower()}W</text>
        ` : null}
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-flow-connection': OigFlowConnection;
  }
}
