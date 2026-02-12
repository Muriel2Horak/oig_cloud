import { LitElement, html, css, svg, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CSS_VARS, getCurrentBreakpoint } from '@/ui/theme';
import { debounce } from '@/utils/dom';
import { FlowNode, FlowConnection, DEFAULT_NODES, DEFAULT_CONNECTIONS, NODE_COLORS } from './types';

const u = unsafeCSS;

interface Particle {
  id: number;
  connectionId: string;
  progress: number;
  speed: number;
  size: number;
  color: string;
}

@customElement('oig-flow-canvas')
export class OigFlowCanvas extends LitElement {
  @property({ type: Array }) nodes: FlowNode[] = DEFAULT_NODES;
  @property({ type: Array }) connections: FlowConnection[] = DEFAULT_CONNECTIONS;
  @property({ type: Boolean }) particlesEnabled = true;
  @state() private particles: Particle[] = [];
  @state() private animationId: number | null = null;

  private particleId = 0;

  static styles = css`
    :host {
      display: block;
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 300px;
      background: ${u(CSS_VARS.bgSecondary)};
      border-radius: 12px;
      overflow: hidden;
    }

    .canvas-container {
      position: relative;
      width: 100%;
      height: 100%;
      min-height: 300px;
    }

    .connections-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    .nodes-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
    }

    .particles-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
    }

    @media (max-width: 768px) {
      :host {
        min-height: 250px;
      }
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('resize', this.onResize);
    
    if (this.particlesEnabled) {
      this.startAnimation();
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('resize', this.onResize);
    this.stopAnimation();
  }

  private onResize = debounce((): void => {
    getCurrentBreakpoint(window.innerWidth);
  }, 100);

  private startAnimation(): void {
    const animate = () => {
      this.updateParticles();
      this.animationId = requestAnimationFrame(animate);
    };
    this.animationId = requestAnimationFrame(animate);
  }

  private stopAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private updateParticles(): void {
    const activeConnections = this.connections.filter(c => Math.abs(c.power) > 0);
    
    for (const conn of activeConnections) {
      if (Math.random() < 0.05) {
        this.createParticle(conn);
      }
    }

    this.particles = this.particles
      .map(p => ({ ...p, progress: p.progress + p.speed }))
      .filter(p => p.progress <= 1);
  }

  private createParticle(conn: FlowConnection): void {
    const fromNode = this.nodes.find(n => n.id === conn.from);
    if (!fromNode) return;

    const speed = 0.005 + (Math.abs(conn.power) / 10000) * 0.01;
    const size = 4 + Math.min(Math.abs(conn.power) / 500, 4);

    this.particles.push({
      id: ++this.particleId,
      connectionId: conn.id,
      progress: 0,
      speed: Math.min(speed, 0.03),
      size,
      color: NODE_COLORS[fromNode.type] || CSS_VARS.accent,
    });
  }

  private getNodePosition(nodeId: string): { x: number; y: number } {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return { x: 0, y: 0 };
    
    return {
      x: node.x + node.width / 2,
      y: node.y + node.height / 2,
    };
  }

  private getParticlePosition(p: Particle): { x: number; y: number } {
    const conn = this.connections.find(c => c.id === p.connectionId);
    if (!conn) return { x: 0, y: 0 };

    const from = this.getNodePosition(conn.from);
    const to = this.getNodePosition(conn.to);
    const midX = (from.x + to.x) / 2;

    const t = p.progress;
    const x = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * midX + t * t * to.x;
    const y = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * from.y + t * t * to.y;

    return { x, y };
  }

  private renderConnections() {
    return this.connections.map(conn => {
      const fromNode = this.nodes.find(n => n.id === conn.from);
      const toNode = this.nodes.find(n => n.id === conn.to);
      if (!fromNode || !toNode) return null;

      const x1 = fromNode.x + fromNode.width / 2;
      const y1 = fromNode.y + fromNode.height / 2;
      const x2 = toNode.x + toNode.width / 2;
      const y2 = toNode.y + toNode.height / 2;
      const midX = (x1 + x2) / 2;

      const isActive = Math.abs(conn.power) > 0;
      const color = isActive 
        ? NODE_COLORS[fromNode.type] || CSS_VARS.accent
        : CSS_VARS.divider;

      const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

      return svg`
        <path
          d="${path}"
          fill="none"
          stroke="${u(color)}"
          stroke-width="${isActive ? 3 : 2}"
          stroke-linecap="round"
          class="${isActive ? 'animated' : ''}"
        />
      `;
    });
  }

  private renderParticles() {
    if (!this.particlesEnabled) return null;

    return this.particles.map(p => {
      const pos = this.getParticlePosition(p);
      return svg`
        <circle
          cx="${pos.x}"
          cy="${pos.y}"
          r="${p.size}"
          fill="${u(p.color)}"
          opacity="0.8"
        />
      `;
    });
  }

  private onNodeClick(e: CustomEvent): void {
    this.dispatchEvent(new CustomEvent('node-click', {
      detail: e.detail,
      bubbles: true,
    }));
  }

  render() {
    return html`
      <div class="canvas-container">
        <svg class="connections-layer">
          <style>
            .animated {
              stroke-dasharray: 10 10;
              animation: flow 0.5s linear infinite;
            }
            @keyframes flow {
              0% { stroke-dashoffset: 20; }
              100% { stroke-dashoffset: 0; }
            }
          </style>
          ${this.renderConnections()}
        </svg>
        
        <svg class="particles-layer">
          ${this.renderParticles()}
        </svg>
        
        <div class="nodes-layer">
          ${this.nodes.map(node => html`
            <oig-flow-node
              .node=${node}
              style="left: ${node.x}px; top: ${node.y}px; width: ${node.width}px;"
              @node-click=${this.onNodeClick}
            ></oig-flow-node>
          `)}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-flow-canvas': OigFlowCanvas;
  }
}
