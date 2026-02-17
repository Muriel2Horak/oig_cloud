/**
 * Flow Node Details — CSS Grid layout with all 5 nodes
 *
 * Port of V1 flow.js node rendering:
 * - Solar: power, today, 2 strings (P/V/A), forecast today/tomorrow
 * - Battery: SVG gauge, SoC, power, status, temp/voltage/current, energy breakdown
 * - Inverter: mode, bypass, temp, grid export mode/limit, notifications, planner
 * - Grid: power, tariff, freq, 3-phase V+W, import/export, spot/export prices
 * - House: power, today, 3-phase, boiler section
 *
 * All clickable values → haClient.openEntityDialog()
 */

import { LitElement, html, css, nothing, unsafeCSS, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CSS_VARS, getCurrentBreakpoint } from '@/ui/theme';
import { FlowData, EMPTY_FLOW_DATA, NODE_GRADIENTS, NODE_BORDERS } from './types';
import { shieldController, ShieldListener } from '@/data/shield-controller';
import type { ShieldServiceType } from '@/ui/features/control-panel/types';
import { mapShieldPendingToFlowIndicators } from './pending';
import { formatPower, formatEnergy, getTariffDisplay, getHouseModeInfo, getGridExportDisplay } from '@/data/flow-data';
import { haClient } from '@/data/ha-client';
import { oigLog } from '@/core/logger';
import './battery-gauge';

const u = unsafeCSS;

const params = new URLSearchParams(window.location.search);
const SN = params.get('sn') || params.get('inverter_sn') || '2206237016';
const sid = (s: string) => `sensor.oig_${SN}_${s}`;

/** Layout storage key prefix (per breakpoint) */
const LAYOUT_KEY = 'oig_v2_flow_layout_';
const NODE_IDS = ['solar', 'battery', 'inverter', 'grid', 'house'] as const;
type NodeId = typeof NODE_IDS[number];

interface NodePosition {
  top: string;
  left: string;
}

type SavedLayout = Partial<Record<NodeId, NodePosition>>;

/** Open HA entity dialog on click */
function openEntity(sensor: string): () => void {
  return () => haClient.openEntityDialog(sid(sensor));
}

@customElement('oig-flow-node')
export class OigFlowNode extends LitElement {
  @property({ type: Object }) data: FlowData = EMPTY_FLOW_DATA;
  @property({ type: Boolean }) editMode = false;

  @state() private pendingServices: Map<ShieldServiceType, string> = new Map();
  @state() private changingServices: Set<ShieldServiceType> = new Set();
  @state() private shieldStatus: 'idle' | 'running' = 'idle';
  @state() private shieldQueueCount: number = 0;
  private shieldUnsub: (() => void) | null = null;

  // DnD state
  @state() private customPositions: SavedLayout = {};
  private draggedNodeId: NodeId | null = null;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragStartTop = 0;
  private dragStartLeft = 0;

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    .flow-grid {
      display: grid !important;
      grid-template-columns: 1fr 1.2fr 1fr !important;
      grid-template-rows: auto auto auto !important;
      gap: 10px;
      width: 100%;
      min-height: auto;
      padding: 20px;
      box-sizing: border-box;
    }

    .node-solar    { grid-column: 2; grid-row: 1; justify-self: center; }
    .node-grid     { grid-column: 1; grid-row: 2; align-self: center; justify-self: start; }
    .node-inverter { grid-column: 2; grid-row: 2; align-self: center; justify-self: center; }
    .node-house    { grid-column: 3; grid-row: 2; align-self: center; justify-self: end; }
    .node-battery  { grid-column: 2; grid-row: 3; justify-self: center; }

    .node {
      background: var(--node-gradient);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      padding: 10px 14px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s, box-shadow 0.2s;
      overflow: hidden;
      min-width: 130px;
      max-width: 250px;
    }

    .node:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    }

    /* Edit mode: grid with draggable nodes */
    :host([editmode]) .flow-grid {
      display: grid !important;
      grid-template-columns: 1fr 1.2fr 1fr;
      grid-template-rows: auto 1fr auto;
      min-height: 80vh;
    }

    :host([editmode]) .node {
      position: absolute;
      width: 30%;
      cursor: move;
      user-select: none;
      -webkit-user-select: none;
    }

    :host([editmode]) .node:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      outline: 2px dashed var(--oig-accent, #3b82f6);
    }

    :host([editmode]) .node.dragging {
      opacity: 0.85;
      transform: scale(1.03);
      z-index: 100;
      box-shadow: 0 8px 24px rgba(0,0,0,0.3);
    }

    :host([editmode]) .node::after {
      content: '⠿';
      position: absolute;
      top: 4px;
      right: 6px;
      font-size: 14px;
      color: var(--oig-text-secondary, #94a3b8);
      opacity: 0.6;
    }

    /* Default absolute positions when entering edit mode (V1 cross layout) */
    :host([editmode]) .node-solar    { top: 0%;  left: 35%; }
    :host([editmode]) .node-grid     { top: 35%; left: 0%; }
    :host([editmode]) .node-inverter { top: 35%; left: 35%; }
    :host([editmode]) .node-house    { top: 35%; left: 65%; }
    :host([editmode]) .node-battery  { top: 70%; left: 35%; }

    .node-header {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-bottom: 6px;
    }

    .node-icon {
      font-size: 18px;
    }

    .node-label {
      font-size: 12px;
      font-weight: 600;
      color: ${u(CSS_VARS.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .node-value {
      font-size: 20px;
      font-weight: 700;
      color: ${u(CSS_VARS.textPrimary)};
      cursor: pointer;
      padding: 0;
      margin: 2px 0;
    }

    .node-value:hover {
      text-decoration: underline;
    }

    .node-subvalue {
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
      cursor: pointer;
      padding: 0;
    }

    .node-subvalue:hover {
      text-decoration: underline;
    }

    .node-status {
      font-size: 11px;
      font-weight: 500;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      margin: 4px 0;
    }

    .pending-text {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-top: 4px;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 2px solid ${u(CSS_VARS.divider)};
      border-top-color: ${u(CSS_VARS.accent)};
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner--small {
      width: 12px;
      height: 12px;
      border-width: 2px;
    }

    .mode-changing {
      border-color: rgba(255, 255, 255, 0.55);
      box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.35), 0 0 18px rgba(59, 130, 246, 0.25);
      animation: modePulse 1.6s ease-in-out infinite;
    }

    .status-charging { background: #e8f5e9; color: #2e7d32; }
    .status-discharging { background: #fff3e0; color: #e65100; }
    .status-importing { background: #fce4ec; color: #c62828; }
    .status-exporting { background: #e8f5e9; color: #2e7d32; }
    .status-idle { background: #f5f5f5; color: #757575; }

    .pulse { animation: pulse 2s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.7} }

    @keyframes modePulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.78; }
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .temp-hot { animation: pulse-hot 1s ease-in-out infinite; }
    @keyframes pulse-hot { 
      0%,100%{opacity:1; transform:scale(1);} 
      50%{opacity:0.8; transform:scale(1.1); filter:hue-rotate(-10deg);} 
    }
    
    .temp-cold { animation: pulse-cold 1.5s ease-in-out infinite; }
    @keyframes pulse-cold { 
      0%,100%{opacity:1; transform:scale(1);} 
      50%{opacity:0.7; transform:scale(1.05); filter:hue-rotate(180deg);} 
    }

    .detail-section {
      margin-top: 8px;
      padding-top: 8px;
      border-top: 1px solid ${u(CSS_VARS.divider)};
    }

    .detail-header {
      font-size: 10px;
      font-weight: 600;
      color: ${u(CSS_VARS.textSecondary)};
      text-transform: uppercase;
      margin-bottom: 4px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-bottom: 2px;
    }

    .detail-row .icon { width: 14px; text-align: center; flex-shrink: 0; }

    .clickable {
      cursor: pointer;
      color: ${u(CSS_VARS.textPrimary)};
      padding: 0;
      margin: 0;
      background: none;
      border: none;
      font: inherit;
      text-align: left;
    }

    .clickable:hover { text-decoration: underline; }

    .solar-strings {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
    }

    .forecast-badges {
      display: flex;
      gap: 8px;
      margin-top: 6px;
    }

    .forecast-badge {
      font-size: 10px;
      cursor: pointer;
      padding: 2px 6px;
      border-radius: 4px;
      background: #fff8e1;
      color: #f57f17;
      border: none;
      font-family: inherit;
    }

    .forecast-badge:hover { background: #fff3c4; }

    .phases {
      display: flex;
      gap: 4px;
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      margin: 4px 0;
      align-items: center;
    }

    .phase-sep { color: ${u(CSS_VARS.divider)}; }

    .battery-center {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 4px 0;
    }

    .battery-indicators {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }

    .indicator {
      font-size: 10px;
      cursor: pointer;
      padding: 1px 4px;
      border-radius: 3px;
      background: ${u(CSS_VARS.bgSecondary)};
      border: none;
      font-family: inherit;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .indicator:hover { background: ${u(CSS_VARS.divider)}; }

    .grid-charging-badge {
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 4px;
      background: #e3f2fd;
      color: #1565c0;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .balancing-indicator {
      font-size: 10px;
      padding: 2px 6px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      gap: 4px;
      border: 1px solid transparent;
      margin-left: 6px;
    }

    .balancing-indicator.charging {
      background: linear-gradient(135deg, rgba(255,193,7,0.25), rgba(255,152,0,0.18));
      border-color: rgba(255,193,7,0.45);
      color: #b26a00;
      animation: pulse 2s ease-in-out infinite;
    }

    .balancing-indicator.holding {
      background: linear-gradient(135deg, rgba(66,165,245,0.25), rgba(33,150,243,0.18));
      border-color: rgba(66,165,245,0.45);
      color: #0d47a1;
      animation: pulse 2s ease-in-out infinite;
    }

    .balancing-indicator.completed {
      background: linear-gradient(135deg, rgba(76,175,80,0.25), rgba(56,142,60,0.18));
      border-color: rgba(76,175,80,0.45);
      color: #1b5e20;
    }

    .grid-charging-plan {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px dashed ${u(CSS_VARS.divider)};
    }

    .grid-charging-plan .detail-header {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .grid-charging-tag {
      font-size: 9px;
      padding: 1px 5px;
      border-radius: 999px;
      background: rgba(33,150,243,0.15);
      color: #1565c0;
      border: 1px solid rgba(33,150,243,0.35);
      text-transform: none;
    }

    .grid-charging-empty {
      font-size: 10px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .energy-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2px 8px;
      font-size: 11px;
    }

    .energy-grid .clickable { font-size: 11px; }

    .planner-badge {
      font-size: 10px;
      padding: 2px 8px;
      border-radius: 4px;
      margin-top: 4px;
      display: inline-block;
    }

    .planner-auto { background: #e8f5e9; color: #2e7d32; }
    .planner-off { background: #fff3e0; color: #e65100; }
    .planner-unknown { background: #f5f5f5; color: #757575; }

    .shield-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 8px;
      font-size: 10px;
      font-weight: 600;
      margin-top: 4px;
    }
    .shield-idle {
      background: rgba(76, 175, 80, 0.15);
      color: #4caf50;
    }
    .shield-running {
      background: rgba(33, 150, 243, 0.15);
      color: #2196f3;
    }
    .shield-queue {
      font-weight: 400;
      opacity: 0.8;
    }

    .bypass-active {
      background: #fce4ec;
      color: #c62828;
      font-size: 10px;
      padding: 1px 6px;
      border-radius: 4px;
    }

    .notif-badge {
      font-size: 10px;
      padding: 1px 4px;
      border-radius: 3px;
    }

    .notif-badge.has-error { background: #fce4ec; color: #c62828; }
    .notif-badge.has-unread { background: #fff8e1; color: #f57f17; }

    .boiler-section {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px dashed ${u(CSS_VARS.divider)};
    }

    @media (max-width: 768px) {
      .flow-grid {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto auto auto auto;
      }
      .node-solar { grid-column: 1 / span 2; grid-row: 1; justify-self: center; }
      .node-grid { grid-column: 1; grid-row: 2; }
      .node-inverter { grid-column: 2; grid-row: 2; }
      .node-house { grid-column: 1; grid-row: 3; }
      .node-battery { grid-column: 2; grid-row: 3; }
    }
  `;

  // ==========================================================================
  // LIFECYCLE & EDIT MODE
  // ==========================================================================

  connectedCallback(): void {
    super.connectedCallback();
    this.loadSavedLayout();
    this.shieldUnsub = shieldController.subscribe(this.onShieldUpdate);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.removeDragListeners();
    this.shieldUnsub?.();
    this.shieldUnsub = null;
  }

  private onShieldUpdate: ShieldListener = (state) => {
    this.pendingServices = state.pendingServices;
    this.changingServices = state.changingServices;
    this.shieldStatus = state.status;
    this.shieldQueueCount = state.queueCount;
  };

  protected updated(changed: PropertyValues): void {
    if (changed.has('editMode')) {
      if (this.editMode) {
        this.setAttribute('editmode', '');
        this.loadSavedLayout();
        this.requestUpdate();
        // Apply saved positions after render
        this.updateComplete.then(() => this.applySavedPositions());
      } else {
        this.removeAttribute('editmode');
        this.removeDragListeners();
        this.clearInlinePositions();
      }
    }
  }

  private loadSavedLayout(): void {
    const bp = getCurrentBreakpoint(window.innerWidth);
    const key = `${LAYOUT_KEY}${bp}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        this.customPositions = JSON.parse(saved);
        oigLog.debug('[FlowNode] Loaded layout for ' + bp);
      }
    } catch { /* ignore */ }
  }

  private applySavedPositions(): void {
    if (!this.editMode) return;
    const container = this.shadowRoot?.querySelector('.flow-grid') as HTMLElement;
    if (!container) return;

    for (const id of NODE_IDS) {
      const pos = this.customPositions[id];
      if (!pos) continue;
      const el = container.querySelector(`.node-${id}`) as HTMLElement;
      if (!el) continue;
      el.style.top = pos.top;
      el.style.left = pos.left;
    }

    // Add drag listeners after positions are applied
    this.initDragListeners();
  }

  private clearInlinePositions(): void {
    const container = this.shadowRoot?.querySelector('.flow-grid') as HTMLElement;
    if (!container) return;
    for (const id of NODE_IDS) {
      const el = container.querySelector(`.node-${id}`) as HTMLElement;
      if (el) {
        el.style.top = '';
        el.style.left = '';
      }
    }
  }

  private saveLayout(): void {
    const bp = getCurrentBreakpoint(window.innerWidth);
    const key = `${LAYOUT_KEY}${bp}`;
    try {
      localStorage.setItem(key, JSON.stringify(this.customPositions));
      oigLog.debug('[FlowNode] Saved layout for ' + bp);
    } catch { /* ignore */ }
  }

  resetLayout(): void {
    const bp = getCurrentBreakpoint(window.innerWidth);
    const key = `${LAYOUT_KEY}${bp}`;
    localStorage.removeItem(key);
    this.customPositions = {};
    this.clearInlinePositions();
    if (this.editMode) {
      // Re-apply default edit mode positions from CSS
      this.requestUpdate();
    }
    oigLog.debug('[FlowNode] Reset layout for ' + bp);
  }

  // ==========================================================================
  // DRAG & DROP
  // ==========================================================================

  private initDragListeners(): void {
    const container = this.shadowRoot?.querySelector('.flow-grid') as HTMLElement;
    if (!container) return;

    for (const id of NODE_IDS) {
      const el = container.querySelector(`.node-${id}`) as HTMLElement;
      if (!el) continue;
      el.addEventListener('mousedown', this.handleDragStart);
      el.addEventListener('touchstart', this.handleTouchStart, { passive: false });
    }

    // Global move/end listeners
    document.addEventListener('mousemove', this.handleDragMove);
    document.addEventListener('mouseup', this.handleDragEnd);
    document.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    document.addEventListener('touchend', this.handleTouchEnd);
  }

  private removeDragListeners(): void {
    document.removeEventListener('mousemove', this.handleDragMove);
    document.removeEventListener('mouseup', this.handleDragEnd);
    document.removeEventListener('touchmove', this.handleTouchMove);
    document.removeEventListener('touchend', this.handleTouchEnd);
  }

  private findNodeId(el: HTMLElement): NodeId | null {
    for (const id of NODE_IDS) {
      if (el.classList.contains(`node-${id}`)) return id;
    }
    // Walk up to find the node wrapper
    const parent = el.closest('[class*="node-"]') as HTMLElement;
    if (!parent) return null;
    for (const id of NODE_IDS) {
      if (parent.classList.contains(`node-${id}`)) return id;
    }
    return null;
  }

  private handleDragStart = (e: MouseEvent): void => {
    if (!this.editMode) return;
    e.preventDefault();
    e.stopPropagation();

    const target = e.target as HTMLElement;
    const nodeEl = target.closest('.node') as HTMLElement;
    if (!nodeEl) return;

    const nodeId = this.findNodeId(nodeEl);
    if (!nodeId) return;

    this.draggedNodeId = nodeId;
    nodeEl.classList.add('dragging');

    const rect = nodeEl.getBoundingClientRect();
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.dragStartTop = rect.top;
    this.dragStartLeft = rect.left;
  };

  private handleTouchStart = (e: TouchEvent): void => {
    if (!this.editMode) return;
    e.preventDefault();

    const target = e.target as HTMLElement;
    const nodeEl = target.closest('.node') as HTMLElement;
    if (!nodeEl) return;

    const nodeId = this.findNodeId(nodeEl);
    if (!nodeId) return;

    this.draggedNodeId = nodeId;
    nodeEl.classList.add('dragging');

    const touch = e.touches[0];
    const rect = nodeEl.getBoundingClientRect();
    this.dragStartX = touch.clientX;
    this.dragStartY = touch.clientY;
    this.dragStartTop = rect.top;
    this.dragStartLeft = rect.left;
  };

  private handleDragMove = (e: MouseEvent): void => {
    if (!this.draggedNodeId || !this.editMode) return;
    e.preventDefault();
    this.updateDragPosition(e.clientX, e.clientY);
  };

  private handleTouchMove = (e: TouchEvent): void => {
    if (!this.draggedNodeId || !this.editMode) return;
    e.preventDefault();
    const touch = e.touches[0];
    this.updateDragPosition(touch.clientX, touch.clientY);
  };

  private handleDragEnd = (_e: MouseEvent | TouchEvent): void => {
    if (!this.draggedNodeId || !this.editMode) return;

    const container = this.shadowRoot?.querySelector('.flow-grid') as HTMLElement;
    const el = container?.querySelector(`.node-${this.draggedNodeId}`) as HTMLElement;
    if (el) el.classList.remove('dragging');

    this.saveLayout();

    // Dispatch event so canvas can redraw SVG connections
    this.dispatchEvent(new CustomEvent('layout-changed', { bubbles: true, composed: true }));

    this.draggedNodeId = null;
  };

  private handleTouchEnd = (e: TouchEvent): void => {
    this.handleDragEnd(e);
  };

  private updateDragPosition(clientX: number, clientY: number): void {
    if (!this.draggedNodeId) return;

    const container = this.shadowRoot?.querySelector('.flow-grid') as HTMLElement;
    if (!container) return;

    const el = container.querySelector(`.node-${this.draggedNodeId}`) as HTMLElement;
    if (!el) return;

    const containerRect = container.getBoundingClientRect();
    const nodeRect = el.getBoundingClientRect();

    const deltaX = clientX - this.dragStartX;
    const deltaY = clientY - this.dragStartY;

    const newLeft = this.dragStartLeft + deltaX;
    const newTop = this.dragStartTop + deltaY;

    // Constrain within container
    const minLeft = containerRect.left;
    const maxLeft = containerRect.right - nodeRect.width;
    const minTop = containerRect.top;
    const maxTop = containerRect.bottom - nodeRect.height;

    const constrainedLeft = Math.max(minLeft, Math.min(maxLeft, newLeft));
    const constrainedTop = Math.max(minTop, Math.min(maxTop, newTop));

    // Convert to percentage
    const relLeft = ((constrainedLeft - containerRect.left) / containerRect.width) * 100;
    const relTop = ((constrainedTop - containerRect.top) / containerRect.height) * 100;

    el.style.left = `${relLeft}%`;
    el.style.top = `${relTop}%`;

    // Store position
    this.customPositions[this.draggedNodeId] = {
      top: `${relTop}%`,
      left: `${relLeft}%`,
    };

    // Live connection redraw
    this.dispatchEvent(new CustomEvent('layout-changed', { bubbles: true, composed: true }));
  }

  // ==========================================================================
  // SOLAR
  // ==========================================================================

  private renderSolar() {
    const d = this.data;
    const isActive = d.solarPower > 50;
    const percent = d.solarPercent;
    const icon = percent <= 5 ? '🌙' : '☀️';

    return html`
      <div class="node node-solar" style="--node-gradient: ${NODE_GRADIENTS.solar}; --node-border: ${NODE_BORDERS.solar}">
        <div class="node-header">
          <span class="node-icon">${icon}</span>
          <span class="node-label">Solár</span>
        </div>
        <div class="node-value" @click=${openEntity('actual_fv_total')}>
          ${formatPower(d.solarPower)}
        </div>
        <div class="node-subvalue" @click=${openEntity('dc_in_fv_ad')}>
          Dnes: ${(d.solarToday / 1000).toFixed(2)} kWh
        </div>

        ${isActive || d.solarP1 > 0 || d.solarP2 > 0 ? html`
          <div class="detail-section">
            <div class="solar-strings">
              <div>
                <div class="detail-header">🏭 String 1</div>
                <div class="detail-row">
                  <span class="icon">⚡</span>
                  <button class="clickable" @click=${openEntity('extended_fve_voltage_1')}>${Math.round(d.solarV1)}V</button>
                </div>
                <div class="detail-row">
                  <span class="icon">〰️</span>
                  <button class="clickable" @click=${openEntity('extended_fve_current_1')}>${d.solarI1.toFixed(1)}A</button>
                </div>
                <div class="detail-row">
                  <span class="icon">⚡</span>
                  <button class="clickable" @click=${openEntity('dc_in_fv_p1')}>${Math.round(d.solarP1)} W</button>
                </div>
              </div>
              <div>
                <div class="detail-header">🏭 String 2</div>
                <div class="detail-row">
                  <span class="icon">⚡</span>
                  <button class="clickable" @click=${openEntity('extended_fve_voltage_2')}>${Math.round(d.solarV2)}V</button>
                </div>
                <div class="detail-row">
                  <span class="icon">〰️</span>
                  <button class="clickable" @click=${openEntity('extended_fve_current_2')}>${d.solarI2.toFixed(1)}A</button>
                </div>
                <div class="detail-row">
                  <span class="icon">⚡</span>
                  <button class="clickable" @click=${openEntity('dc_in_fv_p2')}>${Math.round(d.solarP2)} W</button>
                </div>
              </div>
            </div>
          </div>
        ` : nothing}

        <div class="forecast-badges">
          <button class="forecast-badge" @click=${openEntity('solar_forecast')}>
            🔮 ${d.solarForecastToday.toFixed(2)} kWh
          </button>
          <button class="forecast-badge" @click=${openEntity('solar_forecast')}>
            🌅 ${d.solarForecastTomorrow.toFixed(2)} kWh
          </button>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // BATTERY
  // ==========================================================================

  private getBatteryStatus(): { text: string; cls: string } {
    const d = this.data;
    if (d.batteryPower > 10) {
      const t = d.timeToFull ? ` (${d.timeToFull})` : '';
      return { text: `⚡ Nabíjení${t}`, cls: 'status-charging pulse' };
    }
    if (d.batteryPower < -10) {
      const t = d.timeToEmpty ? ` (${d.timeToEmpty})` : '';
      return { text: `⚡ Vybíjení${t}`, cls: 'status-discharging pulse' };
    }
    return { text: '◉ Klid', cls: 'status-idle' };
  }

  private getBalancingIndicator(): { show: boolean; text: string; icon: string; cls: string } {
    const d = this.data;
    const state = d.balancingState;
    if (state !== 'charging' && state !== 'holding' && state !== 'completed') {
      return { show: false, text: '', icon: '', cls: '' };
    }

    if (state === 'charging') {
      const suffix = d.balancingTimeRemaining ? ` (${d.balancingTimeRemaining})` : '';
      return { show: true, text: `Nabíjení${suffix}`, icon: '⚡', cls: 'charging' };
    }
    if (state === 'holding') {
      const suffix = d.balancingTimeRemaining ? ` (${d.balancingTimeRemaining})` : '';
      return { show: true, text: `Držení${suffix}`, icon: '⏸️', cls: 'holding' };
    }
    return { show: true, text: 'Dokončeno', icon: '✅', cls: 'completed' };
  }

  private renderBattery() {
    const d = this.data;
    const status = this.getBatteryStatus();
    const balancing = this.getBalancingIndicator();
    const isCharging = d.batteryPower > 10;
    const tempIcon = d.batteryTemp > 25 ? '🌡️' : d.batteryTemp < 15 ? '🧊' : '🌡️';
    const tempClass = d.batteryTemp > 25 ? 'temp-hot' : d.batteryTemp < 15 ? 'temp-cold' : '';

    return html`
      <div class="node node-battery" style="--node-gradient: ${NODE_GRADIENTS.battery}; --node-border: ${NODE_BORDERS.battery}">
        <div class="node-header">
          <span class="node-icon">🔋</span>
          <span class="node-label">Baterie</span>
        </div>

        <div class="battery-center">
          <oig-battery-gauge
            .soc=${d.batterySoC}
            ?charging=${isCharging}
            ?gridCharging=${d.isGridCharging && isCharging}
          ></oig-battery-gauge>
          <div>
            <div class="node-value" @click=${openEntity('batt_bat_c')}>
              ${Math.round(d.batterySoC)} %
            </div>
            <div class="node-subvalue" @click=${openEntity('batt_batt_comp_p')}>
              ${formatPower(d.batteryPower)}
            </div>
          </div>
        </div>

        <div class="node-status ${status.cls}">${status.text}</div>

        ${d.isGridCharging ? html`
          <span class="grid-charging-badge">⚡🔌 Síťové nabíjení</span>
        ` : nothing}
        ${balancing.show ? html`
          <span class="balancing-indicator ${balancing.cls}">
            <span>${balancing.icon}</span>
            <span>${balancing.text}</span>
          </span>
        ` : nothing}

        <div class="battery-indicators">
          <button class="indicator" @click=${openEntity('extended_battery_voltage')}>
            ⚡ ${d.batteryVoltage.toFixed(1)} V
          </button>
          <button class="indicator" @click=${openEntity('extended_battery_current')}>
            〰️ ${d.batteryCurrent.toFixed(1)} A
          </button>
          <button class="indicator ${tempClass}" @click=${openEntity('extended_battery_temperature')}>
            ${tempIcon} ${d.batteryTemp.toFixed(1)} °C
          </button>
        </div>

        <div class="detail-section">
          <div class="detail-header">⚡ Energie dnes</div>
          <div class="energy-grid">
            <div class="detail-row">
              <span class="icon">⬆️</span>
              <button class="clickable" @click=${openEntity('computed_batt_charge_energy_today')}>
                Nab: ${formatEnergy(d.batteryChargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">⬇️</span>
              <button class="clickable" @click=${openEntity('computed_batt_discharge_energy_today')}>
                Vyb: ${formatEnergy(d.batteryDischargeTotal)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">☀️</span>
              <button class="clickable" @click=${openEntity('computed_batt_charge_fve_energy_today')}>
                FVE: ${formatEnergy(d.batteryChargeSolar)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">🔌</span>
              <button class="clickable" @click=${openEntity('computed_batt_charge_grid_energy_today')}>
                Síť: ${formatEnergy(d.batteryChargeGrid)}
              </button>
            </div>
          </div>

          <div class="grid-charging-plan">
            <div class="detail-header">🔌 Plánované <span class="grid-charging-tag">Grid</span></div>
            ${d.gridChargingPlan.hasBlocks ? html`
              <div class="detail-row">
                <span class="icon">⚡</span>
                <span>Dobití: ${d.gridChargingPlan.totalEnergyKwh.toFixed(1)} kWh</span>
              </div>
              <div class="detail-row">
                <span class="icon">💰</span>
                <span>Cena: ~${d.gridChargingPlan.totalCostCzk.toFixed(2)} Kč</span>
              </div>
              ${d.gridChargingPlan.windowLabel ? html`
                <div class="detail-row">
                  <span class="icon">🪟</span>
                  <span>Okno: ${d.gridChargingPlan.windowLabel}</span>
                </div>
              ` : nothing}
              ${d.gridChargingPlan.durationMinutes > 0 ? html`
                <div class="detail-row">
                  <span class="icon">⏱️</span>
                  <span>Délka: ${Math.round(d.gridChargingPlan.durationMinutes)} min</span>
                </div>
              ` : nothing}
              ${d.gridChargingPlan.currentBlockLabel ? html`
                <div class="detail-row">
                  <span class="icon">▶️</span>
                  <span>Probíhá: ${d.gridChargingPlan.currentBlockLabel}</span>
                </div>
              ` : nothing}
              ${d.gridChargingPlan.nextBlockLabel ? html`
                <div class="detail-row">
                  <span class="icon">⏭️</span>
                  <span>Další: ${d.gridChargingPlan.nextBlockLabel}</span>
                </div>
              ` : nothing}
            ` : html`
              <div class="grid-charging-empty">Žádné plánované nabíjení.</div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // INVERTER
  // ==========================================================================

  private getInverterModeDesc(): string {
    const m = this.data.inverterMode;
    if (m.includes('Home 1')) return '🏠 Home 1: Max baterie + FVE';
    if (m.includes('Home 2')) return '🔋 Home 2: Šetří baterii';
    if (m.includes('Home 3')) return '☀️ Home 3: Priorita nabíjení';
    if (m.includes('UPS')) return '⚡ UPS: Vše ze sítě';
    return `⚙️ ${m || '--'}`;
  }

  private renderInverter() {
    const d = this.data;
    const modeInfo = getHouseModeInfo(d.inverterMode);
    const bypassActive = d.bypassStatus.toLowerCase() === 'on' || d.bypassStatus === '1';
    const tempIcon = d.inverterTemp > 35 ? '🔥' : '🌡️';
    const gridExport = getGridExportDisplay(d.inverterGridMode);
    const limitKw = (d.inverterGridLimit / 1000).toFixed(1);
    const pending = mapShieldPendingToFlowIndicators(this.pendingServices, this.changingServices);

    let plannerCls = 'planner-unknown';
    let plannerText = 'Plánovač: N/A';
    if (d.plannerAutoMode === true) {
      plannerCls = 'planner-auto';
      plannerText = 'Plánovač: AUTO';
    } else if (d.plannerAutoMode === false) {
      plannerCls = 'planner-off';
      plannerText = 'Plánovač: VYPNUTO';
    }

    return html`
      <div class="node node-inverter ${pending.inverterModeChanging ? 'mode-changing' : ''}" style="--node-gradient: ${NODE_GRADIENTS.inverter}; --node-border: ${NODE_BORDERS.inverter}">
        <div class="node-header">
          <span class="node-icon">🔄</span>
          <span class="node-label">Střídač</span>
          ${bypassActive ? html`
            <button class="bypass-active bypass-warning" @click=${openEntity('bypass_status')}>
              <span id="inverter-bypass-icon">🔴</span> Bypass
            </button>
          ` : nothing}
        </div>

        <div class="node-value" @click=${openEntity('box_prms_mode')}>
          ${pending.inverterModeChanging ? html`<span class="spinner spinner--small"></span>` : nothing}
          ${modeInfo.icon} ${modeInfo.text}
        </div>
        <div class="node-subvalue">${this.getInverterModeDesc()}</div>
        ${pending.inverterModeText ? html`<div class="pending-text">${pending.inverterModeText}</div>` : nothing}

        <div class="planner-badge ${plannerCls}">${plannerText}</div>
        <div class="shield-badge ${this.shieldStatus === 'running' ? 'shield-running' : 'shield-idle'}">
          🛡️ ${this.shieldStatus === 'running' ? 'Zpracovávám' : 'Nečinný'}${this.shieldQueueCount > 0 ? html` <span class="shield-queue">(${this.shieldQueueCount})</span>` : nothing}
        </div>

        <div class="battery-indicators" style="margin-top:6px">
          <button class="indicator" @click=${openEntity('box_temp')}>
            ${tempIcon} ${d.inverterTemp.toFixed(1)} °C
          </button>
          <button class="indicator ${bypassActive ? 'bypass-warning' : ''}" @click=${openEntity('bypass_status')}>
            <span id="inverter-bypass-icon">${bypassActive ? '🔴' : '🟢'}</span> Bypass: ${bypassActive ? 'ON' : 'OFF'}
          </button>
        </div>

        <div class="detail-section">
          <div class="detail-header">🌊 Přetoky do sítě</div>
          <div class="detail-row">
            <span class="icon">${gridExport.icon}</span>
            <button class="clickable" @click=${openEntity('invertor_prms_to_grid')}>
              ${gridExport.display}
            </button>
            <span style="margin-left:8px">LIMIT:</span>
            <button class="clickable" @click=${openEntity('invertor_prm1_p_max_feed_grid')}>
              ${limitKw} kW
            </button>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-header">🔔 Notifikace</div>
          <div class="detail-row">
            <button class="clickable notif-badge ${d.notificationsUnread > 0 ? 'has-unread' : ''}"
              @click=${openEntity('notification_count_unread')}>
              📨 ${d.notificationsUnread}
            </button>
            <button class="clickable notif-badge ${d.notificationsError > 0 ? 'has-error' : ''}"
              @click=${openEntity('notification_count_error')}>
              ❌ ${d.notificationsError}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // GRID
  // ==========================================================================

  private getGridStatus(): { text: string; cls: string } {
    const p = this.data.gridPower;
    if (p > 10) return { text: '⬇ Import', cls: 'status-importing pulse' };
    if (p < -10) return { text: '⬆ Export', cls: 'status-exporting pulse' };
    return { text: '◉ Žádný tok', cls: 'status-idle' };
  }

  private renderGrid() {
    const d = this.data;
    const status = this.getGridStatus();
    const pending = mapShieldPendingToFlowIndicators(this.pendingServices, this.changingServices);

    return html`
      <div class="node node-grid ${pending.gridExportChanging ? 'mode-changing' : ''}" style="--node-gradient: ${NODE_GRADIENTS.grid}; --node-border: ${NODE_BORDERS.grid}">
        <div class="node-header">
          <span class="node-icon">🔌</span>
          <span class="node-label">Síť</span>
          <button class="indicator" style="margin-left:auto" @click=${openEntity('current_tariff')}>
            ${getTariffDisplay(d.currentTariff)}
          </button>
        </div>

        <div class="node-value" @click=${openEntity('actual_aci_wtotal')}>
          ${formatPower(d.gridPower)}
        </div>

        <div class="node-status ${status.cls}">${status.text}</div>
        ${pending.gridExportText ? html`
          <div class="pending-text">
            <span class="spinner spinner--small"></span>
            ${pending.gridExportText}
          </div>
        ` : nothing}

        <button class="indicator" @click=${openEntity('ac_in_aci_f')}>
          〰️ ${d.gridFrequency.toFixed(2)} Hz
        </button>

        <!-- 3-phase power -->
        <div class="phases">
          <button class="clickable" @click=${openEntity('actual_aci_wr')}>${Math.round(d.gridL1P)}W</button>
          <span class="phase-sep">|</span>
          <button class="clickable" @click=${openEntity('actual_aci_ws')}>${Math.round(d.gridL2P)}W</button>
          <span class="phase-sep">|</span>
          <button class="clickable" @click=${openEntity('actual_aci_wt')}>${Math.round(d.gridL3P)}W</button>
        </div>
        <!-- 3-phase voltage -->
        <div class="phases">
          <button class="clickable" @click=${openEntity('ac_in_aci_vr')}>${Math.round(d.gridL1V)}V</button>
          <span class="phase-sep">|</span>
          <button class="clickable" @click=${openEntity('ac_in_aci_vs')}>${Math.round(d.gridL2V)}V</button>
          <span class="phase-sep">|</span>
          <button class="clickable" @click=${openEntity('ac_in_aci_vt')}>${Math.round(d.gridL3V)}V</button>
        </div>

        <div class="detail-section">
          <div class="detail-header">⚡ Energie dnes</div>
          <div class="detail-row">
            <span class="icon">⬇️</span>
            <button class="clickable" @click=${openEntity('ac_in_ac_ad')}>${formatEnergy(d.gridImportToday)}</button>
            <span style="margin-left:8px" class="icon">⬆️</span>
            <button class="clickable" @click=${openEntity('ac_in_ac_pd')}>${formatEnergy(d.gridExportToday)}</button>
          </div>
        </div>

        <div class="detail-section">
          <div class="detail-header">💰 Ceny</div>
          <div class="detail-row">
            <span class="icon">⬇️</span>
            <button class="clickable" @click=${openEntity('spot_price_current_15min')}>
              ${d.spotPrice.toFixed(2)} Kč/kWh
            </button>
          </div>
          <div class="detail-row">
            <span class="icon">⬆️</span>
            <button class="clickable" @click=${openEntity('export_price_current_15min')}>
              ${d.exportPrice.toFixed(2)} Kč/kWh
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // ==========================================================================
  // HOUSE
  // ==========================================================================

  private renderHouse() {
    const d = this.data;

    return html`
      <div class="node node-house" style="--node-gradient: ${NODE_GRADIENTS.house}; --node-border: ${NODE_BORDERS.house}">
        <div class="node-header">
          <span class="node-icon">🏠</span>
          <span class="node-label">Spotřeba</span>
        </div>

        <div class="node-value" @click=${openEntity('actual_aco_p')}>
          ${formatPower(d.housePower)}
        </div>
        <div class="node-subvalue" @click=${openEntity('ac_out_en_day')}>
          Dnes: ${(d.houseTodayWh / 1000).toFixed(1)} kWh
        </div>

        <!-- Per-phase consumption (plain, not clickable — same as V1) -->
        <div class="phases">
          <span>${Math.round(d.houseL1)}W</span>
          <span class="phase-sep">|</span>
          <span>${Math.round(d.houseL2)}W</span>
          <span class="phase-sep">|</span>
          <span>${Math.round(d.houseL3)}W</span>
        </div>

        ${d.boilerIsUse ? html`
          <div class="boiler-section">
            <div class="detail-header">🔥 Bojler</div>
            <div class="detail-row">
              <span class="icon">⚡</span>
              <span>Výkon:</span>
              <button class="clickable" @click=${openEntity('boiler_current_cbb_w')}>
                ${formatPower(d.boilerPower)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">📊</span>
              <span>Nabito:</span>
              <button class="clickable" @click=${openEntity('boiler_day_w')}>
                ${formatEnergy(d.boilerDayEnergy)}
              </button>
            </div>
            <div class="detail-row">
              <span class="icon">${d.boilerManualMode === 'CBB' ? '🤖' : d.boilerManualMode === 'Manual' ? '👤' : '⚙️'}</span>
              <span>Režim:</span>
              <button class="clickable" @click=${openEntity('boiler_manual_mode')}>
                ${d.boilerManualMode === 'CBB' ? '🤖 Inteligentní'
                  : d.boilerManualMode === 'Manual' ? '👤 Manuální'
                  : d.boilerManualMode || '--'}
              </button>
            </div>
          </div>
        ` : nothing}
      </div>
    `;
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  render() {
    return html`
      <div class="flow-grid">
        ${this.renderSolar()}
        ${this.renderBattery()}
        ${this.renderInverter()}
        ${this.renderGrid()}
        ${this.renderHouse()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-flow-node': OigFlowNode;
  }
}
