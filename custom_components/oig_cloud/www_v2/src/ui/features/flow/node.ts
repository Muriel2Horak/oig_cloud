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
  private shieldUnsub: (() => void) | null = null;

  // Expand/collapse state for mobile/tablet
  @state() private expandedNodes = new Set<NodeId>();

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
      gap: 8px;
      width: 100%;
      min-height: auto;
      padding: 16px;
      box-sizing: border-box;
    }

    .node-solar    { grid-column: 2; grid-row: 1; justify-self: center; }
    .node-grid     { grid-column: 1; grid-row: 2; align-self: center; justify-self: start; }
    .node-inverter { grid-column: 2; grid-row: 2; align-self: center; justify-self: center; }
    .node-house    { grid-column: 3; grid-row: 2; align-self: center; justify-self: end; }
    .node-battery  { grid-column: 2; grid-row: 3; justify-self: center; }

    .node {
      position: relative;
      background: var(--node-gradient);
      border: 1px solid rgba(255,255,255,0.08);
      border-radius: 12px;
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      padding: 10px 12px;
      box-shadow: 0 2px 12px rgba(0,0,0,0.15);
      transition: transform 0.2s, box-shadow 0.2s;
      overflow: hidden;
      width: fit-content;
      min-width: 170px;
      max-width: 230px;
      text-align: center;
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
      flex-direction: column;
      align-items: center;
      gap: 2px;
      margin-bottom: 4px;
    }

    .node-icon {
      font-size: 24px;
    }

    .node-label {
      font-size: 10px;
      font-weight: 600;
      color: ${u(CSS_VARS.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }

    .node-value {
      font-size: 22px;
      font-weight: 700;
      color: ${u(CSS_VARS.textPrimary)};
      cursor: pointer;
      padding: 0;
      margin: 2px 0;
      line-height: 1;
    }

    .node-value:hover {
      text-decoration: underline;
    }

    .node-subvalue {
      font-size: 10px;
      color: ${u(CSS_VARS.textSecondary)};
      cursor: pointer;
      padding: 0;
    }

    .node-subvalue:hover {
      text-decoration: underline;
    }

    .node-status {
      font-size: 10px;
      font-weight: 500;
      padding: 2px 6px;
      border-radius: 4px;
      display: inline-block;
      margin: 3px 0;
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

    /* ---- Collapsible detail sections ---- */
    .detail-section {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid ${u(CSS_VARS.divider)};
      text-align: left;
    }

    /* On tablet/mobile: details are collapsed by default */
    @media (max-width: 1024px) {
      .detail-section {
        max-height: 0;
        overflow: hidden;
        margin-top: 0;
        padding-top: 0;
        border-top: none;
        transition: max-height 0.3s ease, margin-top 0.15s ease, padding-top 0.15s ease;
      }

      .node.expanded .detail-section {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid ${u(CSS_VARS.divider)};
      }

      /* Expand indicator arrow */
      .node::after {
        content: '▼';
        position: absolute;
        bottom: 2px;
        right: 5px;
        font-size: 8px;
        opacity: 0.35;
        transition: transform 0.3s ease, opacity 0.2s ease;
        pointer-events: none;
      }

      .node.expanded::after {
        transform: rotate(180deg);
        opacity: 0.65;
      }

      .node:hover::after {
        opacity: 0.6;
      }
    }

    /* Also collapse forecast-badges and boiler-section on mobile */
    @media (max-width: 1024px) {
      .forecast-badges,
      .boiler-section,
      .grid-charging-plan {
        max-height: 0;
        overflow: hidden;
        margin: 0;
        padding: 0;
        border: none;
        transition: max-height 0.3s ease;
      }

      .node.expanded .forecast-badges,
      .node.expanded .boiler-section,
      .node.expanded .grid-charging-plan {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
      }

      .node.expanded .boiler-section,
      .node.expanded .grid-charging-plan {
        border-top: 1px dashed ${u(CSS_VARS.divider)};
      }
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
      flex-direction: column;
      align-items: center;
      gap: 4px;
      margin: 4px 0;
    }

    .battery-indicators {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-top: 4px;
      justify-content: center;
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

    /* Grid charging plan — compact clickable badge (opens popup) */
    .grid-charging-plan-summary {
      margin-top: 6px;
      text-align: center;
    }

    .gc-plan-btn {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 4px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      border: 1px solid ${u(CSS_VARS.divider)};
      background: transparent;
      color: ${u(CSS_VARS.textSecondary)};
      transition: background 0.15s, border-color 0.15s, color 0.15s;
    }

    .gc-plan-btn:hover {
      background: rgba(255,255,255,0.06);
      color: ${u(CSS_VARS.textPrimary)};
    }

    .gc-plan-btn.has-plan {
      border-color: rgba(33,150,243,0.4);
      color: #42a5f5;
      background: rgba(33,150,243,0.08);
    }

    .gc-plan-btn.has-plan:hover {
      background: rgba(33,150,243,0.15);
    }

    .gc-plan-arrow {
      font-size: 14px;
      opacity: 0.6;
      line-height: 1;
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

    /* ---- Tablet (768-1024px) ---- */
    @media (min-width: 769px) and (max-width: 1024px) {
      .node {
        min-width: 140px;
        max-width: 200px;
        padding: 8px 10px;
      }
      .node-icon { font-size: 20px; }
      .node-value { font-size: 18px; }
      .node-label { font-size: 9px; }
      .node-subvalue { font-size: 9px; }
      .node-status { font-size: 9px; }
      .indicator { font-size: 9px; }
      .phases { font-size: 10px; }
      .flow-grid { gap: 6px; padding: 12px; }
    }

    /* ---- Mobile (<768px) ---- */
    @media (max-width: 768px) {
      .flow-grid {
        grid-template-columns: 1fr 1fr;
        grid-template-rows: auto auto auto auto;
        gap: 6px;
        padding: 8px;
      }
      .node-solar { grid-column: 1 / span 2; grid-row: 1; justify-self: center; }
      .node-grid { grid-column: 1; grid-row: 2; }
      .node-inverter { grid-column: 2; grid-row: 2; }
      .node-house { grid-column: 1; grid-row: 3; }
      .node-battery { grid-column: 2; grid-row: 3; }

      .node {
        min-width: 120px;
        max-width: 170px;
        padding: 8px 8px;
      }
      .node-icon { font-size: 20px; }
      .node-value { font-size: 18px; }
      .node-label { font-size: 9px; }
      .node-subvalue { font-size: 9px; }
      .node-status { font-size: 8px; padding: 1px 4px; }
      .phases { font-size: 9px; gap: 2px; }
      .indicator { font-size: 9px; padding: 1px 3px; }
      .battery-indicators { gap: 3px; }
    }

    /* ---- Nest Hub landscape (769-1200px landscape) ---- */
    @media (min-width: 769px) and (max-width: 1200px) and (orientation: landscape) {
      .flow-grid {
        transform: scale(0.82);
        transform-origin: top center;
      }
      .node {
        min-width: 130px;
        max-width: 180px;
        padding: 8px 10px;
      }
      .node-icon { font-size: 20px; }
      .node-value { font-size: 20px; }
      .node-label { font-size: 9px; }
    }

    /* ---- Extra small (<380px) ---- */
    @media (max-width: 380px) {
      .flow-grid {
        transform: scale(0.88);
        transform-origin: top center;
      }
      .node {
        min-width: 100px;
        max-width: 150px;
        padding: 6px;
      }
      .node-icon { font-size: 18px; }
      .node-value { font-size: 16px; }
      .node-label { font-size: 8px; }
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

  /** Toggle expand/collapse for a node (on mobile/tablet) */
  private toggleExpand(nodeId: NodeId, e: Event): void {
    // Don't toggle if clicking a clickable value/button
    const target = e.target as HTMLElement;
    if (target.closest('.clickable') || target.closest('.indicator') || target.closest('.forecast-badge') || target.closest('.node-value') || target.closest('.node-subvalue')) {
      return;
    }
    // Only toggle on tablet/mobile
    if (window.innerWidth > 1024) return;

    const next = new Set(this.expandedNodes);
    if (next.has(nodeId)) {
      next.delete(nodeId);
    } else {
      next.add(nodeId);
    }
    this.expandedNodes = next;
  }

  /** Get CSS class string for a node (includes expanded state) */
  private nodeClass(nodeId: NodeId, extra = ''): string {
    const expanded = this.expandedNodes.has(nodeId) ? ' expanded' : '';
    return `node node-${nodeId}${expanded}${extra ? ' ' + extra : ''}`;
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
      <div class="${this.nodeClass('solar')}" style="--node-gradient: ${NODE_GRADIENTS.solar}; --node-border: ${NODE_BORDERS.solar}"
        @click=${(e: Event) => this.toggleExpand('solar', e)}>
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

  /** Dispatch event to open grid charging dialog */
  private openGridChargingDialog(): void {
    this.dispatchEvent(new CustomEvent('oig-grid-charging-open', {
      bubbles: true,
      composed: true,
      detail: { data: this.data.gridChargingPlan },
    }));
  }

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
      <div class="${this.nodeClass('battery')}" style="--node-gradient: ${NODE_GRADIENTS.battery}; --node-border: ${NODE_BORDERS.battery}"
        @click=${(e: Event) => this.toggleExpand('battery', e)}>
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

          <!-- Grid charging plan moved to popup — show as summary badge instead -->
          <div class="grid-charging-plan-summary">
            <button class="gc-plan-btn ${d.gridChargingPlan.hasBlocks ? 'has-plan' : ''}"
              @click=${(e: Event) => { e.stopPropagation(); this.openGridChargingDialog(); }}>
              🔌
              ${d.gridChargingPlan.hasBlocks
                ? html`Plán: ${d.gridChargingPlan.totalEnergyKwh.toFixed(1)} kWh`
                : html`Plán nabíjení`}
              <span class="gc-plan-arrow">›</span>
            </button>
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
      <div class="${this.nodeClass('inverter', pending.inverterModeChanging ? 'mode-changing' : '')}" style="--node-gradient: ${NODE_GRADIENTS.inverter}; --node-border: ${NODE_BORDERS.inverter}"
        @click=${(e: Event) => this.toggleExpand('inverter', e)}>
        <div class="node-header">
          <span class="node-icon">🔄</span>
          <span class="node-label">Střídač</span>
        </div>
        ${bypassActive ? html`
          <button class="bypass-active bypass-warning" style="position:absolute;top:4px;right:6px;font-size:9px" @click=${openEntity('bypass_status')}>
            🔴 Bypass
          </button>
        ` : nothing}

        <div class="node-value" @click=${openEntity('box_prms_mode')}>
          ${pending.inverterModeChanging ? html`<span class="spinner spinner--small"></span>` : nothing}
          ${modeInfo.icon} ${modeInfo.text}
        </div>
        <div class="node-subvalue">${this.getInverterModeDesc()}</div>
        ${pending.inverterModeText ? html`<div class="pending-text">${pending.inverterModeText}</div>` : nothing}

        <div class="planner-badge ${plannerCls}">${plannerText}</div>

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
      <div class="${this.nodeClass('grid', pending.gridExportChanging ? 'mode-changing' : '')}" style="--node-gradient: ${NODE_GRADIENTS.grid}; --node-border: ${NODE_BORDERS.grid}"
        @click=${(e: Event) => this.toggleExpand('grid', e)}>
        <div class="node-header">
          <span class="node-icon">🔌</span>
          <span class="node-label">Síť</span>
        </div>
        <button class="indicator" style="position:absolute;top:4px;left:6px;font-size:9px" @click=${openEntity('current_tariff')}>
          ${getTariffDisplay(d.currentTariff)}
        </button>

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

        <button class="indicator" style="position:absolute;top:4px;right:6px;font-size:9px" @click=${openEntity('ac_in_aci_f')}>
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
      <div class="${this.nodeClass('house')}" style="--node-gradient: ${NODE_GRADIENTS.house}; --node-border: ${NODE_BORDERS.house}"
        @click=${(e: Event) => this.toggleExpand('house', e)}>
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
