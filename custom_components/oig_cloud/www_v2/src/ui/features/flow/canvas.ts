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

import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { FlowData, EMPTY_FLOW_DATA, FLOW_COLORS, FLOW_MAXIMUMS, FlowParams } from './types';
import { calculateFlowParams } from '@/data/flow-data';
import { OIG_RUNTIME } from '@/core/bootstrap';
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
  @query('.connections-layer') private svgEl!: SVGSVGElement;

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
      overflow: visible;
    }

    .canvas-container {
      position: relative;
      width: 100%;
    }

    .flow-grid-wrapper {
      position: relative;
      z-index: 1;
      min-height: 420px;
    }

    /* Tablet: reduce min-height */
    @media (min-width: 769px) and (max-width: 1024px) {
      .flow-grid-wrapper { min-height: 360px; }
    }

    /* Mobile: compact */
    @media (max-width: 768px) {
      .flow-grid-wrapper { min-height: auto; }
    }

    /* Nest Hub landscape */
    @media (min-width: 769px) and (max-width: 1200px) and (orientation: landscape) {
      :host { max-height: 600px; overflow: auto; }
      .flow-grid-wrapper { min-height: auto; }
    }

    /* HA App / reduced motion — no particles via CSS */
    :host(.no-particles) .particles-layer { display: none; }

    .connections-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: unset;
      height: unset;
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
      opacity: 0.6;
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
      if (this.animationId !== null) {
        this.spawnParticles();
      }
    }
    if (changed.has('active') || changed.has('particlesEnabled')) {
      this.updateAnimationState();
    }
    // Always re-draw SVG connections after render (DOM is now laid out)
    this.drawConnectionsDeferred();
  }

  protected firstUpdated(): void {
    this.updateLines();
    this.updateAnimationState();
    // Recalculate connection positions on resize
    const ro = new ResizeObserver(() => this.drawConnectionsDeferred());
    ro.observe(this);
  }

  /** Draw SVG connections after a frame so DOM positions are accurate */
  private drawConnectionsDeferred(): void {
    requestAnimationFrame(() => this.drawConnectionsSVG());
  }

  private getParticlesLayer(): HTMLDivElement | null {
    return this.renderRoot?.querySelector('.particles-layer') as HTMLDivElement | null;
  }

  private getGridMetrics(): {
    grid: HTMLElement;
    gridRect: DOMRect;
    canvasRect: DOMRect;
  } | null {
    const nodeEl = this.renderRoot?.querySelector('oig-flow-node') as HTMLElement | null;
    if (!nodeEl) return null;

    const nodeRoot = (nodeEl as any).renderRoot || nodeEl.shadowRoot || nodeEl;
    const grid = nodeRoot.querySelector('.flow-grid') as HTMLElement | null;
    if (!grid) return null;

    const canvasContainer = this.renderRoot?.querySelector('.canvas-container') as HTMLElement | null;
    if (!canvasContainer) return null;

    const gridRect = grid.getBoundingClientRect();
    if (gridRect.width === 0 || gridRect.height === 0) return null;

    return { grid, gridRect, canvasRect: canvasContainer.getBoundingClientRect() };
  }

  private positionOverlayLayer(
    layer: HTMLElement | SVGSVGElement,
    gridRect: DOMRect,
    canvasRect: DOMRect,
  ): void {
    const offsetLeft = gridRect.left - canvasRect.left;
    const offsetTop = gridRect.top - canvasRect.top;

    layer.style.left = `${offsetLeft}px`;
    layer.style.top = `${offsetTop}px`;
    layer.style.width = `${gridRect.width}px`;
    layer.style.height = `${gridRect.height}px`;
  }

  private onVisibilityChange = (): void => {
    this.updateAnimationState();
  };

  /** Redraw SVG connections when nodes are dragged */
  private onLayoutChanged = (): void => {
    this.drawConnectionsDeferred();
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
  // SVG CONNECTIONS — drawn imperatively after layout
  // ==========================================================================

  /** Calculate where a line from center toward target exits the node's bounding rectangle */
  private calcEdgePoint(
    center: { x: number; y: number },
    target: { x: number; y: number },
    halfW: number,
    halfH: number,
  ): { x: number; y: number } {
    const dx = target.x - center.x;
    const dy = target.y - center.y;
    if (dx === 0 && dy === 0) return { ...center };

    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const scale = absDx * halfH > absDy * halfW
      ? halfW / absDx
      : halfH / absDy;

    return { x: center.x + dx * scale, y: center.y + dy * scale };
  }

  private getNodeInfo(
    grid: HTMLElement,
    gridRect: DOMRect,
    cls: string,
  ): { x: number; y: number; hw: number; hh: number } | null {
    const el = grid.querySelector(`.node-${cls}`) as HTMLElement;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return {
      x: r.left + r.width / 2 - gridRect.left,
      y: r.top + r.height / 2 - gridRect.top,
      hw: r.width / 2,
      hh: r.height / 2,
    };
  }

  private drawConnectionsSVG(): void {
    const svgEl = this.svgEl;
    if (!svgEl) return;

    const metrics = this.getGridMetrics();
    if (!metrics) return;

    const { grid, gridRect, canvasRect } = metrics;

    this.positionOverlayLayer(svgEl, gridRect, canvasRect);
    svgEl.setAttribute('viewBox', `0 0 ${gridRect.width} ${gridRect.height}`);

    const particlesLayer = this.getParticlesLayer();
    if (particlesLayer) {
      this.positionOverlayLayer(particlesLayer, gridRect, canvasRect);
    }

    svgEl.innerHTML = '';

    const NS = 'http://www.w3.org/2000/svg';

    for (const line of this.lines) {
      const fromInfo = this.getNodeInfo(grid, gridRect, line.from);
      const toInfo = this.getNodeInfo(grid, gridRect, line.to);
      if (!fromInfo || !toInfo) continue;

      const fromCenter = { x: fromInfo.x, y: fromInfo.y };
      const toCenter = { x: toInfo.x, y: toInfo.y };
      const from = this.calcEdgePoint(fromCenter, toCenter, fromInfo.hw, fromInfo.hh);
      const to = this.calcEdgePoint(toCenter, fromCenter, toInfo.hw, toInfo.hh);

      // Draw straight line (V1 style)
      const svgLine = document.createElementNS(NS, 'line');
      svgLine.setAttribute('x1', String(from.x));
      svgLine.setAttribute('y1', String(from.y));
      svgLine.setAttribute('x2', String(to.x));
      svgLine.setAttribute('y2', String(to.y));
      svgLine.setAttribute('stroke', line.color);
      svgLine.setAttribute('stroke-width', '3');
      svgLine.setAttribute('stroke-linecap', 'round');
      svgLine.setAttribute('opacity', '0.6');
      svgLine.classList.add('flow-line');
      svgEl.appendChild(svgLine);
    }
  }

  // ==========================================================================
  // PARTICLE SYSTEM
  // ==========================================================================

  private updateAnimationState(): void {
    // Disable particles in HA app or when reduce-motion is preferred
    const shouldRun = this.particlesEnabled && this.active && !document.hidden && !OIG_RUNTIME.reduceMotion;
    if (shouldRun) {
      this.spawnParticles();
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

    const particlesLayer = this.getParticlesLayer();
    if (!particlesLayer) return;

    const metrics = this.getGridMetrics();
    if (!metrics) return;

    const { grid, gridRect, canvasRect } = metrics;

    this.positionOverlayLayer(particlesLayer, gridRect, canvasRect);

    const now = performance.now();

    for (const line of this.lines) {
      if (!line.params.active) continue;

      const interval = line.params.speed;
      const lastSpawn = this.lastSpawnTime[line.id] || 0;
      if (now - lastSpawn < interval) continue;

      const fromInfo = this.getNodeInfo(grid, gridRect, line.from);
      const toInfo = this.getNodeInfo(grid, gridRect, line.to);
      if (!fromInfo || !toInfo) continue;

      const fromCenter = { x: fromInfo.x, y: fromInfo.y };
      const toCenter = { x: toInfo.x, y: toInfo.y };
      const from = this.calcEdgePoint(fromCenter, toCenter, fromInfo.hw, fromInfo.hh);
      const to = this.calcEdgePoint(toCenter, fromCenter, toInfo.hw, toInfo.hh);

      this.lastSpawnTime[line.id] = now;

      const count = line.params.count;
      for (let i = 0; i < count; i++) {
        if (this.particleCount >= this.MAX_PARTICLES) break;
        this.createParticle(particlesLayer, from, to, line.color, line.params, i * (line.params.speed / count / 2));
      }
    }
  }

  private createParticle(
    particlesLayer: HTMLDivElement,
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
    particle.style.opacity = '0';

    particlesLayer.appendChild(particle);
    this.particleCount++;

    const duration = params.speed;

    setTimeout(() => {
      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        if (particle.isConnected) {
          particle.remove();
        }
        this.particleCount = Math.max(0, this.particleCount - 1);
      };

      if (typeof particle.animate === 'function') {
        const anim = particle.animate([
          { left: `${from.x}px`, top: `${from.y}px`, opacity: 0, offset: 0 },
          { opacity: params.opacity, offset: 0.1 },
          { opacity: params.opacity, offset: 0.9 },
          { left: `${to.x}px`, top: `${to.y}px`, opacity: 0, offset: 1 },
        ], {
          duration,
          easing: 'linear',
        });

        anim.onfinish = cleanup;
        anim.oncancel = cleanup;
      } else {
        particle.style.transition = `left ${duration}ms linear, top ${duration}ms linear, opacity ${duration}ms linear`;
        particle.style.opacity = `${params.opacity}`;
        requestAnimationFrame(() => {
          particle.style.left = `${to.x}px`;
          particle.style.top = `${to.y}px`;
          particle.style.opacity = '0';
        });
        particle.addEventListener('transitionend', cleanup, { once: true });
        window.setTimeout(cleanup, duration + 50);
      }
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

        <svg class="connections-layer"></svg>

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
