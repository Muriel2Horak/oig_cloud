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
import { mapShieldPendingToFlowIndicators, resolveGridFlowState } from './pending';
import type { GridDeliveryStateModel } from '@/data/grid-delivery-model';
import { formatPower, formatEnergy, getTariffDisplay, getHouseModeInfo, getGridExportDisplay } from '@/data/flow-data';
import { haClient } from '@/data/ha-client';
import { oigLog } from '@/core/logger';
import './battery-gauge';
import './icons/solar-icon';
import './icons/battery-icon';
import './icons/grid-icon';
import './icons/house-icon';
import './icons/inverter-icon';

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

const DEFAULT_POSITIONS: Record<NodeId, NodePosition> = {
  solar:    { top: '0%',   left: '0%'   },
  house:    { top: '0%',   left: '65%'  },
  inverter: { top: '35%',  left: '35%'  },
  grid:     { top: '70%',  left: '0%'   },
  battery:  { top: '70%',  left: '65%'  },
};

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
  @state() private gridDeliveryState: GridDeliveryStateModel = {
    currentLiveDelivery: 'unknown',
    currentLiveLimit: null,
    pendingDeliveryTarget: null,
    pendingLimitTarget: null,
    isTransitioning: false,
    isUnavailable: false,
  };
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
      gap: 12px;
      width: 100%;
      max-width: 860px;
      margin: 0 auto;
      min-height: auto;
      padding: 16px;
      box-sizing: border-box;
    }

    .node-solar    { grid-column: 1; grid-row: 1; justify-self: center; }
    .node-house    { grid-column: 3; grid-row: 1; justify-self: center; }
    .node-inverter { grid-column: 2; grid-row: 2; align-self: center; justify-self: center; }
    .node-grid     { grid-column: 1; grid-row: 3; justify-self: center; }
    .node-battery  { grid-column: 3; grid-row: 3; justify-self: center; }

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
      overflow: visible;
      width: fit-content;
      min-width: 170px;
      max-width: 230px;
      text-align: center;
    }

    .node:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    }

    .flow-grid.custom-layout {
      position: relative;
      min-height: 650px;
      display: block !important;
    }

    .flow-grid.custom-layout .node {
      position: absolute;
      width: 30%;
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

    :host([editmode]) .node-solar    { top: 0%;  left: 0%; }
    :host([editmode]) .node-house    { top: 0%;  left: 65%; }
    :host([editmode]) .node-inverter { top: 35%; left: 35%; }
    :host([editmode]) .node-grid     { top: 70%; left: 0%; }
    :host([editmode]) .node-battery  { top: 70%; left: 65%; }

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

    .pending-overlay {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      color: ${u(CSS_VARS.accent)};
      background: rgba(59, 130, 246, 0.08);
      border: 1px solid rgba(59, 130, 246, 0.25);
      border-radius: 4px;
      padding: 2px 6px;
      margin-top: 4px;
    }

    .current-state-unknown {
      color: ${u(CSS_VARS.textSecondary)};
      font-style: italic;
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

    /* ---- Collapsible detail sections — vždy collapsed, rozbalí se klikem ---- */
    .detail-section {
      max-height: 0;
      overflow: hidden;
      margin-top: 0;
      padding-top: 0;
      border-top: none;
      transition: max-height 0.3s ease, margin-top 0.15s ease, padding-top 0.15s ease;
      text-align: left;
    }

    .node.expanded .detail-section {
      max-height: 500px;
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid ${u(CSS_VARS.divider)};
    }

    /* Expand indicator arrow — vždy viditelný */
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

    /* forecast-badges a boiler-section — vždy collapsed */
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

    /* Battery energie section — always visible (never collapsed) */
    .battery-energy-section {
      margin-top: 6px;
      padding-top: 6px;
      border-top: 1px solid ${u(CSS_VARS.divider)};
      text-align: left;
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

    /* ---- SVG ikony ---- */
    .node-svg-icon {
      display: flex;
      justify-content: center;
      align-items: center;
      margin-bottom: 2px;
    }

    /* Explicitní velikosti ikon v node-header */
    .node-header oig-solar-icon    { display: block; width: 48px; height: 48px; }
    .node-header oig-battery-icon  { display: block; width: 32px; height: 52px; }
    .node-header oig-inverter-icon { display: block; width: 48px; height: 48px; }
    .node-header oig-house-icon    { display: block; width: 48px; height: 48px; }

    /* ---- Grid node: 3-fázové hodnoty jako symetrická tabulka ---- */
    .phases-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 2px 4px;
      text-align: center;
      margin: 4px 0;
    }
    .phase-cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
    }
    .phase-label {
      font-size: 8px;
      color: ${u(CSS_VARS.textSecondary)};
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .phase-val {
      font-size: 11px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
    }
    .phase-val:hover { text-decoration: underline; }
    .phase-divider {
      border: none;
      border-top: 1px solid ${u(CSS_VARS.divider)};
      margin: 2px 0;
    }

    /* ---- Energie symetricky (odběr vlevo, dodávka vpravo) ---- */
    .energy-symmetric {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 4px;
      padding: 4px 0;
    }
    .energy-side {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      flex: 1;
    }
    .energy-side-label {
      font-size: 9px;
      color: ${u(CSS_VARS.textSecondary)};
      text-transform: uppercase;
      letter-spacing: 0.3px;
    }
    .energy-side-val {
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      color: ${u(CSS_VARS.textPrimary)};
    }
    .energy-side-val:hover { text-decoration: underline; }
    .energy-import { color: #ef5350; }
    .energy-export { color: #66bb6a; }
    .energy-divider-v {
      width: 1px;
      height: 28px;
      background: ${u(CSS_VARS.divider)};
      flex-shrink: 0;
    }

    /* ---- Ceny vedle sebe ---- */
    .prices-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 4px;
      padding: 2px 0;
    }
    .price-cell {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      flex: 1;
    }
    .price-label {
      font-size: 8px;
      color: ${u(CSS_VARS.textSecondary)};
      text-transform: uppercase;
    }
    .price-val {
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      color: ${u(CSS_VARS.textPrimary)};
    }
    .price-val:hover { text-decoration: underline; }
    .price-spot { color: #ef5350; }
    .price-export { color: #66bb6a; }

    @media (min-width: 1025px) {
      .detail-section {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px solid ${u(CSS_VARS.divider)};
      }
      .node-solar .detail-section {
        max-height: 0;
        margin-top: 0;
        padding-top: 0;
        border-top: none;
      }
      .boiler-section,
      .grid-charging-plan {
        max-height: 500px;
        margin-top: 6px;
        padding-top: 6px;
        border-top: 1px dashed ${u(CSS_VARS.divider)};
      }
      .node::after { display: none; }
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
      .node-solar { grid-column: 1; grid-row: 1; justify-self: center; }
      .node-house { grid-column: 2; grid-row: 1; justify-self: center; }
      .node-inverter { grid-column: 1 / span 2; grid-row: 2; justify-self: center; }
      .node-grid { grid-column: 1; grid-row: 3; }
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
    this.shieldStatus = state.status;
    this.shieldQueueCount = state.queueCount;
    this.gridDeliveryState = state.gridDeliveryState;
  };

  protected updated(changed: PropertyValues): void {
    if (changed.has('editMode')) {
      if (this.editMode) {
        this.setAttribute('editmode', '');
        this.loadSavedLayout();
        this.requestUpdate();
        this.updateComplete.then(() => this.applySavedPositions());
      } else {
        this.removeAttribute('editmode');
        this.removeDragListeners();
        this.clearInlinePositions();
        this.updateComplete.then(() => this.applyCustomPositions());
      }
    }
    if (!this.editMode && this.hasCustomLayout) {
      this.updateComplete.then(() => this.applyCustomPositions());
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
      if (!el) continue;
      el.style.top = '';
      el.style.left = '';
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

  /** Toggle expand/collapse for a node — vždy funkční */
  private toggleExpand(nodeId: NodeId, e: Event): void {
    // Don't toggle if clicking a clickable value/button
    const target = e.target as HTMLElement;
    if (target.closest('.clickable') || target.closest('.indicator') || target.closest('.forecast-badge') || target.closest('.node-value') || target.closest('.node-subvalue') || target.closest('.gc-plan-btn')) {
      return;
    }

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

  private get hasCustomLayout(): boolean {
    return NODE_IDS.some(id => {
      const pos = this.customPositions[id];
      return pos?.top != null && pos?.left != null;
    });
  }

  private applyCustomPositions(): void {
    if (this.editMode || !this.hasCustomLayout) return;
    const container = this.shadowRoot?.querySelector('.flow-grid') as HTMLElement;
    if (!container) return;
    for (const id of NODE_IDS) {
      const el = container.querySelector(`.node-${id}`) as HTMLElement;
      if (!el) continue;
      const pos = this.customPositions[id] ?? DEFAULT_POSITIONS[id];
      el.style.top = pos.top;
      el.style.left = pos.left;
    }
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
    const percent = d.solarPercent;
    const isNight = percent < 2;

    const gradient = isNight
      ? 'linear-gradient(135deg, rgba(57,73,171,0.25) 0%, rgba(26,35,126,0.18) 100%)'
      : NODE_GRADIENTS.solar;
    const border = isNight ? 'rgba(121,134,203,0.5)' : NODE_BORDERS.solar;

    const badgeL = isNight
      ? 'position:absolute;top:4px;left:6px;font-size:11px;background:rgba(57,73,171,0.35);color:#9fa8da;padding:3px 8px;border-radius:4px;border:1px solid rgba(121,134,203,0.4)'
      : 'position:absolute;top:4px;left:6px;font-size:9px';
    const badgeR = isNight
      ? 'position:absolute;top:4px;right:6px;font-size:11px;background:rgba(57,73,171,0.35);color:#9fa8da;padding:3px 8px;border-radius:4px;border:1px solid rgba(121,134,203,0.4)'
      : 'position:absolute;top:4px;right:6px;font-size:9px';

    return html`
      <div class="${this.nodeClass('solar', isNight ? 'night' : '')}" style="--node-gradient: ${gradient}; --node-border: ${border};"
        @click=${(e: Event) => this.toggleExpand('solar', e)}>
        <div class="node-header" style="margin-top:16px">
          <oig-solar-icon .power=${d.solarPower} .percent=${percent} .maxPower=${5400}></oig-solar-icon>
          <span class="node-label">Solár</span>
        </div>
        <div class="node-value" @click=${openEntity('actual_fv_total')}>
          ${formatPower(d.solarPower)}
        </div>
        <div class="node-subvalue" @click=${openEntity('dc_in_fv_ad')}>
          Dnes: ${(d.solarToday / 1000).toFixed(2)} kWh
        </div>
        <div class="node-subvalue" @click=${openEntity('solar_forecast')}>
          Zítra: ${d.solarForecastTomorrow.toFixed(1)} kWh
        </div>

        <button class="indicator" style="${badgeL}" @click=${openEntity('solar_forecast')}>
          🔮 ${d.solarForecastToday.toFixed(1)} kWh
        </button>
        <button class="indicator" style="${badgeR}" @click=${openEntity('solar_forecast')}>
          🌅 ${d.solarForecastTomorrow.toFixed(1)} kWh
        </button>

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
      <div class="${this.nodeClass('battery')}" style="--node-gradient: ${NODE_GRADIENTS.battery}; --node-border: ${NODE_BORDERS.battery};"
        @click=${(e: Event) => this.toggleExpand('battery', e)}>

        <div class="node-header">
          <!-- Jediná ikona: SVG baterie nahrazuje gauge + emoji -->
          <oig-battery-icon
            .soc=${d.batterySoC}
            ?charging=${isCharging && !d.isGridCharging}
            ?gridCharging=${d.isGridCharging && isCharging}
            ?discharging=${d.batteryPower < -10}
          ></oig-battery-icon>
          <span class="node-label">Baterie</span>
        </div>

        <div class="node-value" @click=${openEntity('batt_bat_c')}>
          ${Math.round(d.batterySoC)} %
        </div>
        <div class="node-subvalue" @click=${openEntity('batt_batt_comp_p')}>
          ${formatPower(d.batteryPower)}
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

        <!-- Energie + gc-plan vždy viditelné (ne v detail-section) -->
        <div class="battery-energy-section">
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

          <!-- Grid charging plan — always visible badge -->
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
      <div class="${this.nodeClass('inverter', pending.inverterModeChanging ? 'mode-changing' : '')}" style="--node-gradient: ${NODE_GRADIENTS.inverter}; --node-border: ${NODE_BORDERS.inverter};"
        @click=${(e: Event) => this.toggleExpand('inverter', e)}>
        <div class="node-header">
          <oig-inverter-icon
            .mode=${d.inverterMode}
            ?bypassActive=${bypassActive}
            ?hasAlarm=${d.notificationsError > 0}
            ?plannerAuto=${d.plannerAutoMode === true}
          ></oig-inverter-icon>
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

        <!-- Přetoky + notifikace — vždy viditelné -->
        <div class="battery-indicators" style="margin-top:4px">
          <button class="indicator" @click=${openEntity('invertor_prms_to_grid')}>
            ${gridExport.icon} ${gridExport.display}
          </button>
          <button class="clickable notif-badge ${d.notificationsError > 0 ? 'has-error' : d.notificationsUnread > 0 ? 'has-unread' : 'indicator'}"
            @click=${openEntity('notification_count_unread')}>
            🔔 ${d.notificationsUnread}/${d.notificationsError}
          </button>
        </div>

        <div class="detail-section">
          <div class="detail-header">🌊 Přetoky — limit</div>
          <div class="detail-row">
            <button class="clickable" @click=${openEntity('invertor_prm1_p_max_feed_grid')}>
              Limit: ${limitKw} kW
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
    const gridFlow = resolveGridFlowState(this.gridDeliveryState);

    return html`
      <div class="${this.nodeClass('grid', pending.gridExportChanging ? 'mode-changing' : '')}" style="--node-gradient: ${NODE_GRADIENTS.grid}; --node-border: ${NODE_BORDERS.grid};"
        @click=${(e: Event) => this.toggleExpand('grid', e)}>

        <!-- Tarif badge vlevo nahoře -->
        <button class="indicator" style="position:absolute;top:4px;left:6px;font-size:9px" @click=${openEntity('current_tariff')}>
          ${getTariffDisplay(d.currentTariff)}
        </button>
        <!-- Frekvence vpravo nahoře -->
        <button class="indicator" style="position:absolute;top:4px;right:6px;font-size:9px" @click=${openEntity('ac_in_aci_f')}>
          ${d.gridFrequency.toFixed(1)} Hz
        </button>

        <!-- SVG ikona -->
        <div class="node-svg-icon" style="margin-top:14px">
          <oig-grid-icon .power=${d.gridPower} style="width:44px;height:44px"></oig-grid-icon>
        </div>
        <div class="node-label" style="margin-bottom:2px">Síť</div>

        <!-- Hlavní hodnota -->
        <div class="node-value" @click=${openEntity('actual_aci_wtotal')}>
          ${formatPower(d.gridPower)}
        </div>
        <div class="node-status ${status.cls}">${status.text}</div>
        <div class="node-subvalue ${gridFlow.currentUnavailable ? 'current-state-unknown' : ''}" @click=${openEntity('invertor_prms_to_grid')}>
          ${gridFlow.currentText}
        </div>
        ${gridFlow.pendingText ? html`
          <div class="pending-overlay">
            <span class="spinner spinner--small"></span>
            ${gridFlow.pendingText}
          </div>
        ` : nothing}

        <!-- Ceny — vždy viditelné jako rychlý přehled -->
        <div class="prices-row" style="margin-top:4px">
          <div class="price-cell">
            <span class="price-label">⬇ Spot</span>
            <button class="price-val price-spot" @click=${openEntity('spot_price_current_15min')}>
              ${d.spotPrice.toFixed(2)} Kč
            </button>
          </div>
          <div class="energy-divider-v"></div>
          <div class="price-cell">
            <span class="price-label">⬆ Výkup</span>
            <button class="price-val price-export" @click=${openEntity('export_price_current_15min')}>
              ${d.exportPrice.toFixed(2)} Kč
            </button>
          </div>
        </div>

        <!-- 3 fáze — vždy viditelné -->
        <div class="phases-grid" style="margin-top:6px">
          <div class="phase-cell">
            <span class="phase-label">L1</span>
            <button class="phase-val" @click=${openEntity('actual_aci_wr')}>${Math.round(d.gridL1P)}W</button>
            <button class="phase-val" style="font-size:10px;color:${u(CSS_VARS.textSecondary)}" @click=${openEntity('ac_in_aci_vr')}>${Math.round(d.gridL1V)}V</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L2</span>
            <button class="phase-val" @click=${openEntity('actual_aci_ws')}>${Math.round(d.gridL2P)}W</button>
            <button class="phase-val" style="font-size:10px;color:${u(CSS_VARS.textSecondary)}" @click=${openEntity('ac_in_aci_vs')}>${Math.round(d.gridL2V)}V</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L3</span>
            <button class="phase-val" @click=${openEntity('actual_aci_wt')}>${Math.round(d.gridL3P)}W</button>
            <button class="phase-val" style="font-size:10px;color:${u(CSS_VARS.textSecondary)}" @click=${openEntity('ac_in_aci_vt')}>${Math.round(d.gridL3V)}V</button>
          </div>
        </div>

        <div class="detail-section">
          <!-- Energie dnes — odběr vlevo, dodávka vpravo -->
          <div class="energy-symmetric">
            <div class="energy-side">
              <span class="energy-side-label">⬇ Odběr</span>
              <button class="energy-side-val energy-import" @click=${openEntity('ac_in_ac_ad')}>
                ${formatEnergy(d.gridImportToday)}
              </button>
            </div>
            <div class="energy-divider-v"></div>
            <div class="energy-side">
              <span class="energy-side-label">⬆ Dodávka</span>
              <button class="energy-side-val energy-export" @click=${openEntity('ac_in_ac_pd')}>
                ${formatEnergy(d.gridExportToday)}
              </button>
            </div>
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
      <div class="${this.nodeClass('house')}" style="--node-gradient: ${NODE_GRADIENTS.house}; --node-border: ${NODE_BORDERS.house};"
        @click=${(e: Event) => this.toggleExpand('house', e)}>
        <div class="node-header">
          <oig-house-icon
            .power=${d.housePower}
            .maxPower=${d.boilerInstallPower > 0 ? 10000 : 8000}
            ?boilerActive=${d.boilerIsUse}
          ></oig-house-icon>
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
      <div class="flow-grid ${this.hasCustomLayout && !this.editMode ? 'custom-layout' : ''}">
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
