/**
 * Flow Canvas — Container for node grid + SVG connections + particle system
 *
 * New architecture:
 * - <oig-flow-node> handles all 5 nodes as CSS Grid
 * - SVG overlay for connection lines between nodes
 * - Particle system using Web Animation API (port of V1's createContinuousParticle)
 *
 * Receives FlowData and calculates connection parameters internally.
 */

import { LitElement, html, css, svg, unsafeCSS } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { FlowData, EMPTY_FLOW_DATA, FLOW_COLORS, FLOW_MAXIMUMS, FlowParams } from './types';
import { calculateFlowParams } from '@/data/flow-data';
import './node';

const u = unsafeCSS;

// Connection definition — from node to node with flow type
interface FlowLine {
  id: string;
  from: string;  // CSS Grid area name: solar, battery, inverter, grid, house
  to: string;
  color: string;
  power: number;
  params: FlowParams;
}

@customElement('oig-flow-canvas')
export class OigFlowCanvas extends LitElement {
  @property({ type: Object }) data: FlowData = EMPTY_FLOW_DATA;
  @property({ type: Boolean }) particlesEnabled = true;
  @property({ type: Boolean }) active = true;
  @property({ type: Boolean }) editMode = false;

  @state() private lines: FlowLine[] = [];
  @query('.particles-layer') private particlesEl!: HTMLDivElement;

  private animationId: number | null = null;
  private lastSpawnTime: Record<string, number> = {};
  private particleCount = 0;
  private readonly MAX_PARTICLES = 50;

  static styles = css`
    :host {
      display: block;
      position: relative;
      width: 100%;
      background: ${u(CSS_VARS.bgSecondary)};
      border-radius: 12px;
      overflow: hidden;
    }

    .canvas-container {
      position: relative;
      width: 100%;
    }

    .flow-grid-wrapper {
      position: relative;
      z-index: 1;
    }

    .connections-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 2;
    }

    .particles-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 3;
    }

    .particle {
      position: absolute;
      border-radius: 50%;
      pointer-events: none;
    }

    .flow-line {
      fill: none;
      stroke-width: 3;
      stroke-linecap: round;
      opacity: 0.5;
    }

    .flow-line.active {
      opacity: 0.8;
      stroke-dasharray: 10 10;
      animation: flow-dash 1s linear infinite;
    }

    @keyframes flow-dash {
      0% { stroke-dashoffset: 20; }
      100% { stroke-dashoffset: 0; }
    }

    .flow-label {
      font-size: 10px;
      font-weight: 600;
      fill: ${u(CSS_VARS.textSecondary)};
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('visibilitychange', this.onVisibilityChange);
    this.addEventListener('layout-changed', this.onLayoutChanged);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.removeEventListener('layout-changed', this.onLayoutChanged);
    this.stopAnimation();
  }

  protected updated(changed: Map<string, unknown>): void {
    if (changed.has('data')) {
      this.updateLines();
    }
    if (changed.has('active') || changed.has('particlesEnabled')) {
      this.updateAnimationState();
    }
  }

  protected firstUpdated(): void {
    this.updateLines();
    this.updateAnimationState();
    // Recalculate connection positions on resize
    const ro = new ResizeObserver(() => this.requestUpdate());
    ro.observe(this);
  }

  private onVisibilityChange = (): void => {
    this.updateAnimationState();
  };

  /** Redraw SVG connections when nodes are dragged */
  private onLayoutChanged = (): void => {
    this.requestUpdate();
  };

  // ==========================================================================
  // CONNECTION LINES — calculated from data
  // ==========================================================================

  private updateLines(): void {
    const d = this.data;
    const lines: FlowLine[] = [];

    // Solar → Inverter
    if (d.solarPower > 50) {
      lines.push({
        id: 'solar-inverter',
        from: 'solar', to: 'inverter',
        color: FLOW_COLORS.solar,
        power: d.solarPower,
        params: calculateFlowParams(d.solarPower, FLOW_MAXIMUMS.solar, 'solar'),
      });
    }

    // Battery ↔ Inverter
    if (Math.abs(d.batteryPower) > 50) {
      const isCharging = d.batteryPower > 0;
      lines.push({
        id: 'battery-inverter',
        from: isCharging ? 'inverter' : 'battery',
        to: isCharging ? 'battery' : 'inverter',
        color: FLOW_COLORS.battery,
        power: Math.abs(d.batteryPower),
        params: calculateFlowParams(d.batteryPower, FLOW_MAXIMUMS.battery, 'battery'),
      });
    }

    // Grid ↔ Inverter
    if (Math.abs(d.gridPower) > 50) {
      const isImport = d.gridPower > 0;
      lines.push({
        id: 'grid-inverter',
        from: isImport ? 'grid' : 'inverter',
        to: isImport ? 'inverter' : 'grid',
        color: isImport ? FLOW_COLORS.grid_import : FLOW_COLORS.grid_export,
        power: Math.abs(d.gridPower),
        params: calculateFlowParams(d.gridPower, FLOW_MAXIMUMS.grid, 'grid'),
      });
    }

    // Inverter → House
    if (d.housePower > 50) {
      lines.push({
        id: 'inverter-house',
        from: 'inverter', to: 'house',
        color: FLOW_COLORS.house,
        power: d.housePower,
        params: calculateFlowParams(d.housePower, FLOW_MAXIMUMS.house, 'house'),
      });
    }

    this.lines = lines;
  }

  // ==========================================================================
  // SVG CONNECTIONS
  // ==========================================================================

  private renderConnections() {
    // We need actual DOM positions, so use the query
    const nodeEl = this.shadowRoot?.querySelector('oig-flow-node');
    if (!nodeEl?.shadowRoot) return null;

    const wrapper = nodeEl.shadowRoot.querySelector('.flow-grid') as HTMLElement;
    if (!wrapper) return null;

    const containerRect = wrapper.getBoundingClientRect();

    const getCenter = (cls: string): { x: number; y: number } | null => {
      const el = wrapper.querySelector(`.node-${cls}`) as HTMLElement;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: r.left + r.width / 2 - containerRect.left,
        y: r.top + r.height / 2 - containerRect.top,
      };
    };

    return this.lines.map(line => {
      const from = getCenter(line.from);
      const to = getCenter(line.to);
      if (!from || !to) return null;

      const midX = (from.x + to.x) / 2;
      const path = `M ${from.x} ${from.y} C ${midX} ${from.y}, ${midX} ${to.y}, ${to.x} ${to.y}`;

      const labelX = (from.x + to.x) / 2;
      const labelY = (from.y + to.y) / 2 - 10;
      const powerLabel = line.power >= 1000
        ? `${(line.power / 1000).toFixed(1)}kW`
        : `${Math.round(line.power)}W`;

      return svg`
        <path
          class="flow-line active"
          d="${path}"
          stroke="${line.color}"
          stroke-width="${2 + line.params.intensity / 30}"
        />
        <text class="flow-label" x="${labelX}" y="${labelY}" text-anchor="middle">
          ${powerLabel}
        </text>
      `;
    });
  }

  // ==========================================================================
  // PARTICLE SYSTEM
  // ==========================================================================

  private updateAnimationState(): void {
    const shouldRun = this.particlesEnabled && this.active && !document.hidden;
    if (shouldRun) {
      this.startAnimation();
    } else {
      this.stopAnimation();
    }
  }

  private startAnimation(): void {
    if (this.animationId !== null) return;

    const animate = () => {
      this.spawnParticles();
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

  private spawnParticles(): void {
    if (this.particleCount >= this.MAX_PARTICLES) return;

    const nodeEl = this.shadowRoot?.querySelector('oig-flow-node');
    if (!nodeEl?.shadowRoot) return;
    const wrapper = nodeEl.shadowRoot.querySelector('.flow-grid') as HTMLElement;
    if (!wrapper || !this.particlesEl) return;

    const particlesRect = this.particlesEl.getBoundingClientRect();

    const getCenter = (cls: string): { x: number; y: number } | null => {
      const el = wrapper.querySelector(`.node-${cls}`) as HTMLElement;
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: r.left + r.width / 2 - particlesRect.left,
        y: r.top + r.height / 2 - particlesRect.top,
      };
    };

    const now = performance.now();

    for (const line of this.lines) {
      if (!line.params.active) continue;

      // Spawn interval based on intensity
      const interval = line.params.speed;
      const lastSpawn = this.lastSpawnTime[line.id] || 0;
      if (now - lastSpawn < interval) continue;

      const from = getCenter(line.from);
      const to = getCenter(line.to);
      if (!from || !to) continue;

      this.lastSpawnTime[line.id] = now;

      // Create particle element
      const count = line.params.count;
      for (let i = 0; i < count; i++) {
        if (this.particleCount >= this.MAX_PARTICLES) break;
        this.createParticle(from, to, line.color, line.params, i * (line.params.speed / count / 2));
      }
    }
  }

  private createParticle(
    from: { x: number; y: number },
    to: { x: number; y: number },
    color: string,
    params: FlowParams,
    delay: number,
  ): void {
    const particle = document.createElement('div');
    particle.className = 'particle';
    const size = params.size;
    particle.style.width = `${size}px`;
    particle.style.height = `${size}px`;
    particle.style.background = color;
    particle.style.left = `${from.x}px`;
    particle.style.top = `${from.y}px`;
    particle.style.boxShadow = `0 0 ${size}px ${color}`;

    this.particlesEl.appendChild(particle);
    this.particleCount++;

    const duration = params.speed;

    setTimeout(() => {
      const anim = particle.animate([
        { left: `${from.x}px`, top: `${from.y}px`, opacity: 0, offset: 0 },
        { opacity: params.opacity, offset: 0.1 },
        { opacity: params.opacity, offset: 0.9 },
        { left: `${to.x}px`, top: `${to.y}px`, opacity: 0, offset: 1 },
      ], {
        duration,
        easing: 'linear',
      });

      anim.onfinish = () => {
        particle.remove();
        this.particleCount--;
      };
    }, delay);
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  render() {
    return html`
      <div class="canvas-container">
        <div class="flow-grid-wrapper">
          <oig-flow-node .data=${this.data} .editMode=${this.editMode}></oig-flow-node>
        </div>

        <svg class="connections-layer">
          ${this.renderConnections()}
        </svg>

        <div class="particles-layer"></div>
      </div>
    `;
  }

  /** Reset node layout — delegates to flow-node */
  resetLayout(): void {
    const nodeEl = this.shadowRoot?.querySelector('oig-flow-node') as any;
    if (nodeEl?.resetLayout) nodeEl.resetLayout();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-flow-canvas': OigFlowCanvas;
  }
}
