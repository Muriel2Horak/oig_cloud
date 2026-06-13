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

import { LitElement, html, svg, css, nothing, unsafeCSS, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CSS_VARS, getCurrentBreakpoint } from '@/ui/theme';
import { FlowData, EMPTY_FLOW_DATA, NODE_GRADIENTS, NODE_BORDERS } from './types';
import { shieldController, ShieldListener } from '@/data/shield-controller';
import type { ShieldServiceType } from '@/ui/features/control-panel/types';
import { mapShieldPendingToFlowIndicators, resolveInverterGridDeliveryDisplay } from './pending';
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
const SN = params.get('sn') || params.get('inverter_sn') || '';
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
const EXPANDED_NODES_LS_KEY = 'oig_v2_flow_expanded_nodes';

function loadExpandedNodes(): Set<NodeId> {
  try {
    const raw = localStorage.getItem(EXPANDED_NODES_LS_KEY);
    if (raw) return new Set(JSON.parse(raw) as NodeId[]);
  } catch { /* ignore */ }
  return new Set<NodeId>(['solar', 'house']);
}

function saveExpandedNodes(nodes: Set<NodeId>): void {
  try {
    localStorage.setItem(EXPANDED_NODES_LS_KEY, JSON.stringify([...nodes]));
  } catch { /* ignore */ }
}

function openEntity(sensor: string): () => void {
  return () => haClient.openEntityDialog(sid(sensor));
}

// ==========================================================================
// PHASE STATUS — exported pure helper for tests
// ==========================================================================

/** Watt spread threshold: above this value the záloha phases are "unbalanced". */
export const BALANCE_UNBALANCED_W = 1000;
/** Backup-phase overload limit set by inverter manufacturer. Not configurable. */
export const BACKUP_PHASE_LIMIT_W = 3300;
/** Below this total záloha wattage phase balance is irrelevant — show "Klid". */
export const BALANCE_CALM_W = 300;

export interface PhaseStatus {
  spreadW: number;             // max − min of záloha phases [W]
  balanced: boolean;           // spreadW ≤ BALANCE_UNBALANCED_W
  calm: boolean;               // total záloha < BALANCE_CALM_W
  worstPct: number;            // worstPhase / BACKUP_PHASE_LIMIT_W × 100
  overloadPhase: 'L1' | 'L2' | 'L3' | null;   // first phase ≥ limit, or null
}

/**
 * Derive phase-balance / overload status from the three záloha phase powers.
 * @param zaloha [L1, L2, L3] záloha watt readings (ac_out_aco_pr/ps/pt)
 */
export function computePhaseStatus(zaloha: [number, number, number]): PhaseStatus {
  const [l1, l2, l3] = zaloha.map(w => Math.max(0, isFinite(w) ? w : 0)) as [number, number, number];
  const total = l1 + l2 + l3;
  const spreadW = Math.max(l1, l2, l3) - Math.min(l1, l2, l3);
  const calm = total < BALANCE_CALM_W;
  const balanced = spreadW <= BALANCE_UNBALANCED_W;
  const worst = Math.max(l1, l2, l3);
  const worstPct = (worst / BACKUP_PHASE_LIMIT_W) * 100;
  const phaseLabels = ['L1', 'L2', 'L3'] as const;
  const overloadIndex = [l1, l2, l3].findIndex(w => w >= BACKUP_PHASE_LIMIT_W);
  const overloadPhase = overloadIndex >= 0 ? phaseLabels[overloadIndex] : null;
  return { spreadW, balanced, calm, worstPct, overloadPhase };
}

/**
 * Compute the spread-band geometry for the phase graph.
 *
 * The band spans from the MIN záloha segment-end to the MAX záloha
 * segment-end across all three rows, expressed as percentages of the
 * track width.  Returns {leftPct, widthPct} where widthPct=0 means
 * "hide the band" (calm state: total záloha < BALANCE_CALM_W).
 *
 * @param zalohaWidthsPct  [L1, L2, L3] záloha segment widths as % of track (0-100 each)
 * @param totalZalohaW     summed záloha watts across all phases (for calm detection)
 */
export function computeSpreadBand(
  zalohaWidthsPct: [number, number, number],
  totalZalohaW: number,
): { leftPct: number; widthPct: number } {
  if (totalZalohaW < BALANCE_CALM_W) return { leftPct: 0, widthPct: 0 };
  const minEnd = Math.min(...zalohaWidthsPct);
  const maxEnd = Math.max(...zalohaWidthsPct);
  return { leftPct: minEnd, widthPct: maxEnd - minEnd };
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
  // Solar + house start expanded (user 2026-06-12: details are the point of
  // the Flow tab); the user's collapse/expand choice persists per browser.
  @state() private expandedNodes = loadExpandedNodes();
  /** Tap-friendly gauge detail (mobile can't hover): which node's popover is open. */
  @state() private gaugeDetailOpen: NodeId | null = null;
  /** Phase history modal open state */

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
      /* The edge-gauge is the only ring — a visible card border would read
         as a permanently "full" gauge (caught by user on the solar node). */
      border: 1px solid transparent;
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

    /* Desktop: keep the star layout visually balanced (similar node heights). */
    @media (min-width: 769px) {
      .node { min-height: 206px; }
    }

    /* Edge-gauge: perimeter progress hugging the node border. */
    .node > * { position: relative; z-index: 1; }
    .edge-gauge {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
      pointer-events: none;
      border-radius: 12px;
    }
    .edge-track { fill: none; stroke: rgba(255,255,255,0.07); stroke-width: 1.4; }
    .edge-fill {
      fill: none;
      stroke-linecap: round;
      transition: stroke-dashoffset 0.6s ease, stroke-width 0.4s ease;
      filter: drop-shadow(0 0 4px rgba(255,255,255,0.18));
    }
    @keyframes edgePulse { 0%,100% { opacity: 0.7; } 50% { opacity: 1; } }
    .edge-gauge.pulse .edge-fill {
      animation: edgePulse var(--pulse-dur, 1.8s) ease-in-out infinite;
    }

    /* Faint state tint behind content */
    .node-tint {
      position: absolute;
      inset: 0;
      z-index: 0;
      pointer-events: none;
      border-radius: 12px;
    }

    /* Header with label left + state right (approved node skin) */
    .node-header--split {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6px;
    }
    .node-state { font-size: 11px; font-weight: 700; white-space: nowrap; }
    .node-state.st-charge { color: #9fe6a8; }
    .node-state.st-discharge { color: #ffcc80; }
    .node-state.st-idle { color: rgba(255,255,255,0.55); }

    /* Solar: produced/forecast headline + remaining chip */
    .nv-sub { font-size: 14px; font-weight: 600; opacity: 0.6; }
    .solar-rem { display: inline-block; font-size: 11px; font-weight: 700; border-radius: 6px; padding: 2px 9px; margin-top: 2px; }
    .solar-rem.rem-on { background: #ffca5a; color: #101a10; }
    .solar-rem.rem-off { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.7); }

    /* (Phase balance legacy CSS removed — replaced by .pblock/.prow/.pseg/.ptrack system) */

    /* Inverter — clean rows (approved mockup C) */
    .inv-chip {
      display: inline-block;
      font-size: 10px;
      font-weight: 600;
      border-radius: 6px;
      padding: 2px 9px;
      margin: 4px auto 7px;
      background: rgba(255,255,255,0.1);
      border: 1px solid rgba(255,255,255,0.15);
    }
    .inv-chip.planner-auto { background: rgba(76,175,80,0.16); border-color: rgba(76,175,80,0.35); color: #bdf0c4; }
    .inv-chip.planner-off { background: rgba(244,67,54,0.14); border-color: rgba(244,67,54,0.3); color: #ff9d93; }
    .inv-rows { text-align: left; }
    .inv-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      padding: 4px 2px;
      border-bottom: 1px dashed rgba(255,255,255,0.1);
    }
    .inv-row:last-child { border-bottom: none; }
    .inv-lab { opacity: 0.62; white-space: nowrap; }
    .inv-val { font-weight: 600; background: none; border: none; color: inherit; cursor: pointer; font-size: 11px; text-align: right; padding: 0; }
    .inv-pill { font-size: 10px; font-weight: 700; border: none; border-radius: 5px; padding: 1px 8px; cursor: pointer; }
    .inv-pill.pill-green { background: rgba(76,175,80,0.2); color: #bdf0c4; }
    .inv-pill.pill-red { background: rgba(244,67,54,0.22); color: #ff9d93; }
    .inv-note {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
      width: 100%;
      font-size: 10px;
      background: rgba(120,160,255,0.12);
      border: 1px solid rgba(120,160,255,0.25);
      color: inherit;
      border-radius: 7px;
      padding: 4px 8px;
      margin-top: 7px;
      cursor: pointer;
    }
    .inv-note.warn { background: rgba(244,67,54,0.14); border-color: rgba(244,67,54,0.35); color: #ffb3ab; }

    /* Gauge detail pill + popover (tap-friendly; sits on the bottom edge) */
    .ss-pill {
      position: absolute;
      bottom: -9px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 4;
      font-size: 10px;
      font-weight: 800;
      background: #131f33;
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 9px;
      padding: 2px 9px;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.4);
    }
    /* House tile: pill sits at the TOP (center-top, approved design) */
    .node-house .ss-pill {
      bottom: auto;
      top: -11px;
    }
    /* House popover drops DOWN from the top pill */
    .node-house .ss-pop { bottom: auto; top: 16px; }
    /* House header: SVG icon + caps label */
    .house-head { display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 16px; }
    .house-ico { width: 15px; height: 15px; opacity: .85; }
    .house-cap { font-size: 11px; font-weight: 700; letter-spacing: .6px; opacity: .7; }
    .ss-pop {
      position: absolute;
      bottom: 14px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 6;
      width: 180px;
      background: #0e1828;
      border: 1px solid rgba(255,255,255,0.25);
      border-radius: 10px;
      padding: 9px 11px;
      box-shadow: 0 10px 26px rgba(0,0,0,0.55);
      text-align: left;
    }
    .ss-pop-h { display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; margin-bottom: 6px; }
    .ss-bar { display: flex; height: 8px; border-radius: 4px; overflow: hidden; margin-bottom: 5px; background: rgba(255,255,255,0.06); }
    .ss-bar i { display: block; }
    .ss-leg { display: flex; justify-content: space-between; font-size: 9px; opacity: 0.85; }
    .gp-r { display: flex; justify-content: space-between; gap: 10px; font-size: 11px; padding: 3px 0; border-bottom: 1px dashed rgba(255,255,255,0.1); }
    .gp-r:last-child { border-bottom: none; }
    .gp-r span { opacity: 0.65; }
    .gp-r b { font-weight: 600; }

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

    /* Baterie nemá rozbalovací detail (vše je vždy viditelné) — skrýt mrtvou šipku */
    .node-battery::after {
      display: none;
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
      justify-content: center;
    }

    .phase-sep { color: ${u(CSS_VARS.divider)}; }

    .cons-split {
      display: flex;
      height: 5px;
      border-radius: 3px;
      overflow: hidden;
      margin: 5px 0 2px;
      background: rgba(255, 255, 255, 0.06);
    }
    .cons-split-z { background: #4CAF50; transition: width 0.3s; }
    .cons-split-n { background: #FFA726; transition: width 0.3s; }

    /* (house-corner legacy CSS removed — replaced by .sc-chip system) */
    .hc-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      display: inline-block;
      flex-shrink: 0;
    }

    /* ---- Spotřeba: compact split row (dot + kW inline) ---- */
    .csplit {
      display: flex;
      justify-content: center;
      gap: 16px;
      margin: 4px 0 9px;
    }
    .cs {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      white-space: nowrap;
      cursor: pointer;
      background: none;
      border: none;
      color: inherit;
      padding: 0;
    }
    .cs:hover { opacity: .8; }
    .cs-top { display: flex; align-items: center; gap: 5px; font-size: 14px; font-weight: 800; }
    .cs-top .d { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
    .cs-day { font-size: 9.5px; font-weight: 600; opacity: .55; }

    /* ---- Spotřeba: phase graph ---- */
    .pg {
      position: relative;
      background: rgba(0,0,0,.18);
      border-radius: 9px;
      padding: 8px 10px;
      cursor: pointer;
    }
    .pg:hover { background: rgba(0,0,0,.24); }
    .pg-row {
      position: relative;
      display: flex;
      align-items: center;
      gap: 7px;
      height: 18px;
      margin: 4px 0;
    }
    .pg-track {
      position: relative;
      flex: 1;
      height: 100%;
      background: rgba(255,255,255,.05);
      border-radius: 4px;
      overflow: visible;
      display: flex;
    }
    .pg-z {
      height: 100%;
      background: #43a047;
      display: flex;
      align-items: center;
      padding-left: 4px;
      font-size: 8.5px;
      font-weight: 800;
      color: #06270c;
      white-space: nowrap;
      overflow: hidden;
      border-radius: 4px 0 0 4px;
    }
    .pg-z.crit { background: #e53935; color: #fff; }
    .pg-div { width: 1.5px; background: #0d1526; height: 100%; flex-shrink: 0; }
    .pg-n {
      height: 100%;
      background: #fb8c00;
      display: flex;
      align-items: center;
      padding-left: 4px;
      font-size: 8.5px;
      font-weight: 800;
      color: #2b1500;
      white-space: nowrap;
      overflow: hidden;
      border-radius: 0 4px 4px 0;
    }
    .pg-lim {
      position: absolute;
      top: -3px;
      bottom: -3px;
      width: 2px;
      background: #fff;
      box-shadow: 0 0 5px rgba(255,255,255,.7);
      z-index: 4;
      pointer-events: none;
    }
    .pg-tot {
      font-size: 9px;
      font-weight: 700;
      opacity: .8;
      width: 34px;
      text-align: right;
      font-variant-numeric: tabular-nums;
      flex-shrink: 0;
    }
    /* Spread band: absolute overlay spanning záloha spread region */
    .pg-spread {
      position: absolute;
      top: 4px;
      bottom: 4px;
      z-index: 3;
      border-left: 1.5px dashed rgba(255,255,255,.45);
      border-right: 1.5px dashed rgba(255,255,255,.45);
      background: linear-gradient(90deg,rgba(76,175,80,0),rgba(76,175,80,.12),rgba(76,175,80,0));
      pointer-events: none;
    }
    .pg-spread.balanced {
      border-color: rgba(76,175,80,.45);
    }
    .pg-spread.unbal {
      border-color: rgba(229,57,53,.9);
      background: linear-gradient(90deg,rgba(229,57,53,.05),rgba(229,57,53,.28),rgba(229,57,53,.05));
      box-shadow: 0 0 8px rgba(229,57,53,.45);
      animation: pg-shimmer 1.4s ease-in-out infinite;
    }
    @keyframes pg-shimmer { 0%,100% { opacity:.55; } 50% { opacity:1; } } 50% { opacity:1; } } 50% { opacity:1; } }
    /* ⚖️ warning marker sitting on top of an unbalanced band */
    .pg-spread-mark {
      position: absolute;
      top: -8px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      line-height: 1;
      background: #e53935;
      border-radius: 5px;
      padding: 1px 3px;
      box-shadow: 0 1px 4px rgba(0,0,0,.5);
      white-space: nowrap;
    }

    /* mobile: tighten phase graph a bit */
    @media (max-width: 768px) {
      .pg { padding: 6px 8px; }
      .pg-row { height: 15px; }
    }

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

    /* ---- Landscape kiosk (Google Nest Hub ~768×543) — kompaktní pentagon ---- */
    @media (orientation: landscape) and (max-height: 600px) {
      .flow-grid {
        grid-template-columns: 1fr 1.05fr 1fr;
        grid-template-rows: auto auto auto;
        gap: 2px;
        padding: 0;
      }
      .node-solar    { grid-column: 1; grid-row: 1; justify-self: center; }
      .node-house    { grid-column: 3; grid-row: 1; justify-self: center; }
      .node-inverter { grid-column: 2; grid-row: 2; justify-self: center; }
      .node-grid     { grid-column: 1; grid-row: 3; justify-self: center; }
      .node-battery  { grid-column: 3; grid-row: 3; justify-self: center; }
      .node { min-width: 96px; max-width: 140px; padding: 3px 6px; }
      .node-header { margin-bottom: 0; }
      .node-value { font-size: 14px; margin: 0; }
      .node-label { font-size: 8px; }
      .node-subvalue { font-size: 8px; }
      .node-status { font-size: 8px; padding: 0 4px; margin: 1px 0; }
      .indicator { font-size: 8px; padding: 1px 3px; }
      .planner-badge, .shield-badge { font-size: 8px; margin: 1px 0; padding: 0 4px; }
      .battery-indicators { gap: 2px; margin-top: 1px; }
      .battery-energy-section { margin-top: 2px; }
      .detail-header { font-size: 8px; margin-bottom: 0; }
      .detail-row { font-size: 8px; margin-bottom: 0; }
      .energy-grid { gap: 0 6px; }
      .prices-row { margin-top: 2px; }
      .price-label, .price-val { font-size: 9px; }
      .phases { font-size: 8px; margin: 1px 0; }
      .phases-grid { margin-top: 2px; }
      .phase-label, .phase-val { font-size: 8px; }
      .planner-badge, .shield-badge { font-size: 8px; }
      .gc-plan-btn { font-size: 8px; padding: 1px 4px; }
      .node::after { display: none; }
      /* Kiosk = přehledový pohled: skrýt těžké rozpady (jsou na ostatních tabech/po rozkliknutí) */
      .battery-energy-section,
      .prices-row,
      .phases-grid,
      .pg { display: none; }
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
    this.measureNodes();
  }

  /**
   * Measure node boxes so each edge-gauge gets a real-pixel viewBox.
   * With a fixed 0–100 viewBox + preserveAspectRatio=none, the stroke scales
   * anisotropically (horizontal edges thicker than vertical on tall nodes);
   * a matching viewBox keeps the stroke uniform. Guarded so it only sets
   * state when a dimension actually changed (no update loops).
   */
  @state() private nodeDims: Record<string, { w: number; h: number }> = {};

  private measureNodes(): void {
    const grid = this.shadowRoot?.querySelector('.flow-grid');
    if (!grid) return;
    let changed = false;
    const dims = { ...this.nodeDims };
    for (const id of NODE_IDS) {
      const el = grid.querySelector(`.node-${id}`) as HTMLElement | null;
      if (!el) continue;
      const w = Math.round(el.offsetWidth);
      const h = Math.round(el.offsetHeight);
      if (w < 10 || h < 10) continue;
      const cur = dims[id];
      if (!cur || Math.abs(cur.w - w) > 1 || Math.abs(cur.h - h) > 1) {
        dims[id] = { w, h };
        changed = true;
      }
    }
    if (changed) this.nodeDims = dims;
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
    saveExpandedNodes(next);
  }

  /** Get CSS class string for a node (includes expanded state) */
  private nodeClass(nodeId: NodeId, extra = ''): string {
    const expanded = this.expandedNodes.has(nodeId) ? ' expanded' : '';
    return `node node-${nodeId}${expanded}${extra ? ' ' + extra : ''}`;
  }

  /**
   * Edge-gauge that hugs the node border. Works on any node size via a
   * 0–100 viewBox with preserveAspectRatio="none" + non-scaling stroke and
   * pathLength=100 (so dashoffset = 100 − pct regardless of perimeter length).
   * Thickness ∝ flow magnitude, pulse speed ∝ flow.
   */
  /** Bottom-edge % pill + tap popover with the gauge's detail (mobile has no
   *  hover). Generic rule: every edge-gauge gets one. */
  private gaugePill(nodeId: NodeId, label: string, color: string, detail: unknown) {
    const open = this.gaugeDetailOpen === nodeId;
    return html`
      <button class="ss-pill" style="color:${color};border-color:${color}55"
        @click=${(e: Event) => {
          e.stopPropagation();
          this.gaugeDetailOpen = open ? null : nodeId;
        }}>${label}</button>
      ${open ? html`
        <div class="ss-pop" style="border-color:${color}66"
          @click=${(e: Event) => e.stopPropagation()}>${detail}</div>` : nothing}
    `;
  }

  private edgeGauge(opts: {
    id: string;
    nodeId?: string;
    pct: number;
    stops: Array<[number, string]>;
    width?: number;
    pulse?: boolean;
    pulseDur?: number;
    full?: boolean;
  }) {
    const pct = Math.max(0, Math.min(100, opts.pct));
    // Stroke width in px (no non-scaling-stroke: breaks pathLength dashes in
    // Chromium; instead the viewBox matches the measured node box so the
    // stroke stays uniform on all four edges).
    const w = Math.max(1.5, Math.min(6, opts.width ?? 2.5));
    const dim = opts.nodeId ? this.nodeDims[opts.nodeId] : undefined;
    const W = dim?.w ?? 180;
    const H = dim?.h ?? 180;
    const inset = 1.5;
    const dash = opts.full ? 0 : 100 - pct;
    const stops = opts.stops.map(
      ([o, c]) => svg`<stop offset="${o}" stop-color="${c}"></stop>`,
    );
    const style = opts.pulseDur ? `--pulse-dur:${opts.pulseDur}s` : '';
    return svg`
      <svg class="edge-gauge ${opts.pulse ? 'pulse' : ''}" viewBox="0 0 ${W} ${H}"
        preserveAspectRatio="none" style=${style}>
        <defs>
          <linearGradient id=${opts.id} x1="0" y1="1" x2="0" y2="0">${stops}</linearGradient>
        </defs>
        <rect class="edge-track" x=${inset} y=${inset}
          width=${W - inset * 2} height=${H - inset * 2} rx="10.5"></rect>
        <rect class="edge-fill" x=${inset} y=${inset}
          width=${W - inset * 2} height=${H - inset * 2} rx="10.5"
          stroke=${`url(#${opts.id})`} stroke-width=${w} pathLength="100"
          stroke-dasharray="100" stroke-dashoffset=${dash}></rect>
      </svg>`;
  }

  /**
   * Multi-segment edge gauge — proportional coloured arcs around the node border.
   * Each segment uses pathLength=100 + stroke-dasharray="${frac} 100" positioned
   * via stroke-dashoffset = -(cumulative offset of previous segments).
   * Order: render segments in the array order (caller decides clockwise sequence).
   * Empty-load guard: if all fracs are 0, only the track rect is rendered.
   */
  private edgeGaugeSegments(opts: {
    nodeId: string;
    segments: Array<{ frac: number; color: string }>;
    width?: number;
  }) {
    const w = Math.max(1.5, Math.min(6, opts.width ?? 3.5));
    const dim = this.nodeDims[opts.nodeId];
    const W = dim?.w ?? 180;
    const H = dim?.h ?? 180;
    const inset = 1.5;
    const rx = 10.5;
    // Filter out zero-fraction segments to avoid rendering invisible rects.
    const segs = opts.segments.filter(s => s.frac > 0.001);
    let offset = 0;
    const arcs = segs.map((seg) => {
      const dashOffset = -offset;
      offset += seg.frac;
      return svg`<rect x=${inset} y=${inset}
        width=${W - inset * 2} height=${H - inset * 2} rx=${rx}
        fill="none" stroke=${seg.color} stroke-width=${w}
        pathLength="100"
        stroke-dasharray="${seg.frac} 100"
        stroke-dashoffset="${dashOffset}"></rect>`;
    });
    return svg`
      <svg class="edge-gauge" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
        <rect class="edge-track" x=${inset} y=${inset}
          width=${W - inset * 2} height=${H - inset * 2} rx=${rx}></rect>
        ${arcs}
      </svg>`;
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
      ? 'linear-gradient(135deg, rgba(38,48,82,0.45) 0%, rgba(23,31,58,0.3) 100%)'
      : NODE_GRADIENTS.solar;
    const border = 'transparent';

    const producedKwh = d.solarToday / 1000;
    // Late in the day the forecast-for-today can read 0; never show produced/0.
    const forecastKwh = Math.max(d.solarForecastToday, producedKwh);
    const remainingKwh = Math.max(0, forecastKwh - producedKwh);
    const progressPct = forecastKwh > 0 ? Math.min(100, (producedKwh / forecastKwh) * 100) : 0;
    const powerKw = d.solarPower / 1000;
    // Edge colour = production intensity (% of peak): dim orange → bright yellow.
    const intColor = isNight
      ? '#5c6bc0'
      : percent < 20 ? '#ff7043' : percent < 50 ? '#ffa726' : '#ffd54f';

    return html`
      <div class="${this.nodeClass('solar', isNight ? 'night' : '')}" style="--node-gradient: ${gradient}; --node-border: ${border};"
        @click=${(e: Event) => this.toggleExpand('solar', e)}>
        ${this.edgeGauge({
          id: 'gauge-solar',
          nodeId: 'solar',
          pct: isNight ? 0 : progressPct,
          stops: [[0, intColor], [1, intColor]],
          width: 2 + Math.min(3, powerKw),
          pulse: !isNight && d.solarPower > 30,
          pulseDur: Math.max(0.9, 2.2 - powerKw * 0.35),
        })}
        <div class="node-tint" style="background: radial-gradient(120% 70% at 50% 0, ${isNight ? 'rgba(57,73,171,0.18)' : intColor + '22'}, transparent 70%)"></div>

        <button class="indicator" style="position:absolute;top:4px;right:6px;font-size:9px;z-index:3" @click=${openEntity('solar_forecast')}
          title=${d.solarForecastStale ? 'Předpověď zítra (zastaralá)' : 'Předpověď FVE na zítra'}>
          ${d.solarForecastStale ? '⚠' : '🌅'} ${d.solarForecastTomorrow.toFixed(1)}
        </button>
        ${this.gaugePill('solar', `${Math.round(progressPct)} %`, isNight ? '#7986cb' : intColor, html`
          <div class="ss-pop-h"><span>Výroba dne</span><b style="color:${isNight ? '#9fa8da' : intColor}">${Math.round(progressPct)} %</b></div>
          <div class="gp-r"><span>Vyrobeno</span><b>${producedKwh.toFixed(1)} kWh</b></div>
          <div class="gp-r"><span>Předpověď</span><b>${forecastKwh.toFixed(1)} kWh</b></div>
          <div class="gp-r"><span>Ještě vyrobí</span><b>~${remainingKwh.toFixed(1)} kWh</b></div>
          <div class="gp-r"><span>Aktuální výkon</span><b>${formatPower(d.solarPower)} · ${Math.round(percent)} % špičky</b></div>
        `)}

        <div class="node-header node-header--split" style="margin-top:16px">
          <span class="node-label">☀️ Solár</span>
          <span class="node-state" style="color:${isNight ? '#9fa8da' : intColor}">
            ${isNight ? '🌙 Noc' : `${Math.round(percent)} % špičky`}
          </span>
        </div>
        <div class="node-value" @click=${openEntity('actual_fv_total')}>
          ${formatPower(d.solarPower)}
        </div>
        <div class="node-subvalue" @click=${openEntity('dc_in_fv_ad')}>
          Dnes ${producedKwh.toFixed(1)} <span class="nv-sub">/ ${forecastKwh.toFixed(1)} kWh</span>
        </div>
        <div class="node-subvalue">
          ${remainingKwh > 0.05
            ? html`<span class="solar-rem ${remainingKwh > 1 ? 'rem-on' : 'rem-off'}">⚡ ještě ~${remainingKwh.toFixed(1)} kWh</span>`
            : html`<span class="solar-rem rem-off">✓ hotovo dnes</span>`}
        </div>

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
    const balancing = this.getBalancingIndicator();
    const tempIcon = d.batteryTemp > 25 ? '🌡️' : d.batteryTemp < 15 ? '🧊' : '🌡️';
    const tempClass = d.batteryTemp > 25 ? 'temp-hot' : d.batteryTemp < 15 ? 'temp-cold' : '';

    const batPowerKw = Math.abs(d.batteryPower) / 1000;
    const batActive = Math.abs(d.batteryPower) > 10;
    const charging = d.batteryPower > 10;
    const discharging = d.batteryPower < -10;
    const stateText = charging ? 'Nabíjí' : discharging ? 'Vybíjí' : 'Klid';
    const stateCls = charging ? 'st-charge' : discharging ? 'st-discharge' : 'st-idle';
    const powerStr = `${charging ? '+' : discharging ? '−' : ''}${formatPower(Math.abs(d.batteryPower))}`;
    // Only show the time when it's an actual duration (sensor may report
    // "N/A" / "Nabito" / "Vybíjí se" etc.).
    const validTime = (t: string | null | undefined) => !!t && /\d/.test(t);
    const timeStr = charging && validTime(d.timeToFull) ? ` · do plna ${d.timeToFull}`
      : discharging && validTime(d.timeToEmpty) ? ` · do vybití ${d.timeToEmpty}` : '';
    const socTint = d.batterySoC >= 66 ? 'rgba(67,160,71,0.13)'
      : d.batterySoC >= 33 ? 'rgba(253,216,53,0.10)' : 'rgba(229,57,53,0.12)';
    const socPillColor = d.batterySoC >= 66 ? '#43a047'
      : d.batterySoC >= 33 ? '#fdd835' : '#e53935';

    return html`
      <div class="${this.nodeClass('battery')}" style="--node-gradient: ${NODE_GRADIENTS.battery}; --node-border: ${NODE_BORDERS.battery};"
        @click=${(e: Event) => this.toggleExpand('battery', e)}>
        ${this.edgeGauge({
          id: 'gauge-battery',
          nodeId: 'battery',
          pct: d.batterySoC,
          stops: [[0, '#e53935'], [0.45, '#fb8c00'], [0.7, '#fdd835'], [1, '#43a047']],
          width: 2 + Math.min(3, batPowerKw),
          pulse: batActive,
          pulseDur: Math.max(0.9, 2.2 - batPowerKw * 0.35),
        })}

        <div class="node-tint" style="background: radial-gradient(120% 80% at 50% 100%, ${socTint}, transparent 72%)"></div>
        ${this.gaugePill('battery', `${Math.round(d.batterySoC)} %`, socPillColor, html`
          <div class="ss-pop-h"><span>Nabití baterie</span><b style="color:${socPillColor}">${Math.round(d.batterySoC)} %</b></div>
          <div class="gp-r"><span>Stav</span><b>${stateText} ${powerStr}</b></div>
          ${timeStr ? html`<div class="gp-r"><span>Čas</span><b>${timeStr.replace(' · ', '')}</b></div>` : nothing}
          <div class="gp-r"><span>Dnes nabito</span><b>${formatEnergy(d.batteryChargeTotal)}</b></div>
          <div class="gp-r"><span>Dnes vybito</span><b>${formatEnergy(d.batteryDischargeTotal)}</b></div>
        `)}

        <div class="node-header node-header--split">
          <span class="node-label">🔋 Baterie</span>
          <span class="node-state ${stateCls}">${stateText}</span>
        </div>

        <div class="node-value" @click=${openEntity('batt_bat_c')}>
          ${Math.round(d.batterySoC)} %
        </div>
        <div class="node-subvalue" @click=${openEntity('batt_batt_comp_p')}>
          ${powerStr}${timeStr}
        </div>

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

  /** Krátký popis režimu (bez názvu Home X – ten už je v hlavní hodnotě). */
  private getInverterModeDesc(): string {
    const m = this.data.inverterMode;
    if (m.includes('Home 1')) return 'Max baterie + FVE';
    if (m.includes('Home 2')) return 'Šetří baterii';
    if (m.includes('Home 3')) return 'Priorita nabíjení';
    if (m.includes('UPS')) return 'Vše ze sítě';
    return '';
  }

  private renderInverter() {
    const d = this.data;
    const modeInfo = getHouseModeInfo(d.inverterMode);
    const bypassActive = d.bypassStatus.toLowerCase() === 'on' || d.bypassStatus === '1';
    const tempIcon = d.inverterTemp > 35 ? '🔥' : '🌡️';
    const gridExport = getGridExportDisplay(d.inverterGridMode);
    const pending = mapShieldPendingToFlowIndicators(this.pendingServices, this.changingServices);
    const gridDelivery = resolveInverterGridDeliveryDisplay(this.gridDeliveryState);

    let plannerCls = 'planner-unknown';
    let plannerText = 'Plánovač: N/A';
    if (d.plannerAutoMode === true) {
      plannerCls = 'planner-auto';
      plannerText = 'Plánovač: AUTO';
    } else if (d.plannerAutoMode === false) {
      plannerCls = 'planner-off';
      plannerText = 'Plánovač: VYPNUTO';
    }

    const m = d.inverterMode;
    const modeColor = m.includes('UPS') ? '#ff9800'
      : m.includes('Home 2') ? '#2196f3'
      : m.includes('Home 3') ? '#9c27b0' : '#4caf50';
    const tempColor = d.inverterTemp >= 45 ? '#e53935' : d.inverterTemp >= 35 ? '#ffa726' : '#43a047';
    const tempPct = Math.max(0, Math.min(100, (d.inverterTemp / 55) * 100));
    const edgeColor = bypassActive ? '#e53935' : tempColor;

    return html`
      <div class="${this.nodeClass('inverter', pending.inverterModeChanging ? 'mode-changing' : '')}" style="--node-gradient: ${NODE_GRADIENTS.inverter}; --node-border: ${NODE_BORDERS.inverter};"
        @click=${(e: Event) => this.toggleExpand('inverter', e)}
        title="Teplota ${d.inverterTemp.toFixed(1)} °C · ${bypassActive ? 'Bypass aktivní' : 'Bypass vyp'}">
        ${this.edgeGauge({
          id: 'gauge-inverter',
          nodeId: 'inverter',
          pct: bypassActive ? 100 : tempPct,
          stops: [[0, edgeColor], [1, edgeColor]],
          width: bypassActive ? 4 : 2.5,
          pulse: bypassActive,
          pulseDur: 1.1,
        })}
        <div class="node-tint" style="background: radial-gradient(120% 90% at 50% 0, ${modeColor}22, transparent 72%)"></div>

        ${this.gaugePill('inverter', bypassActive ? '⚠ BYPASS' : `${d.inverterTemp.toFixed(0)} °C`, edgeColor, html`
          <div class="ss-pop-h"><span>Teplota střídače</span><b style="color:${tempColor}">${d.inverterTemp.toFixed(1)} °C</b></div>
          <div class="gp-r"><span>Bypass</span><b>${bypassActive ? '🔴 AKTIVNÍ' : 'Vypnutý'}</b></div>
          <div class="gp-r"><span>Režim</span><b>${modeInfo.text}</b></div>
        `)}

        <div class="node-header" style="justify-content:center">
          <span class="node-label">⚙️ Střídač</span>
        </div>
        <div class="node-value" @click=${openEntity('box_prms_mode')} style="color:${modeColor}">
          ${pending.inverterModeChanging ? html`<span class="spinner spinner--small"></span>` : nothing}
          ${modeInfo.icon} ${modeInfo.text}
        </div>
        ${this.getInverterModeDesc() ? html`<div class="node-subvalue">${this.getInverterModeDesc()}</div>` : nothing}
        ${pending.inverterModeText ? html`<div class="pending-text">${pending.inverterModeText}</div>` : nothing}

        <div class="inv-chip ${plannerCls}">🤖 ${plannerText}</div>

        <div class="inv-rows">
          <div class="inv-row">
            <span class="inv-lab">${tempIcon} Teplota</span>
            <button class="inv-pill" style="background:${tempColor}26;color:${tempColor}"
              @click=${openEntity('box_temp')}>${d.inverterTemp.toFixed(1)} °C</button>
          </div>
          <div class="inv-row">
            <span class="inv-lab">🔁 Bypass</span>
            <button class="inv-pill ${bypassActive ? 'pill-red' : 'pill-green'}"
              @click=${openEntity('bypass_status')}>${bypassActive ? 'ZAP' : 'Vyp'}</button>
          </div>
          <div class="inv-row">
            <span class="inv-lab">${gridExport.icon} Dodávka</span>
            <button class="inv-val ${gridDelivery.isUnavailable ? 'current-state-unknown' : ''}"
              @click=${openEntity('invertor_prms_to_grid')}>${gridDelivery.currentModeText}</button>
          </div>
          ${gridDelivery.limitLabel !== null ? html`
            <div class="inv-row">
              <span class="inv-lab">🌊 ${gridDelivery.limitLabel}</span>
              <button class="inv-val ${gridDelivery.showLimitAsActive ? 'limit-active' : ''}"
                @click=${openEntity('invertor_prm1_p_max_feed_grid')}>${gridDelivery.limitValue}</button>
            </div>
          ` : nothing}
          <div class="inv-row">
            <span class="inv-lab">🛡️ Shield</span>
            <span class="inv-val">${this.shieldStatus === 'running' ? 'Zpracovávám' : 'Nečinný'}${this.shieldQueueCount > 0 ? ` (${this.shieldQueueCount})` : ''}</span>
          </div>
        </div>

        <button class="inv-note ${d.notificationsError > 0 ? 'warn' : ''}"
          @click=${openEntity('notification_count_unread')}>
          🔔 ${d.notificationsError > 0
            ? `${d.notificationsError} chyb · ${d.notificationsUnread} nepřečtených`
            : d.notificationsUnread > 0
              ? `${d.notificationsUnread} nepřečtených`
              : 'Bez notifikací'}
        </button>

        ${gridDelivery.pendingModeText ? html`
          <div class="pending-overlay">
            <span class="spinner spinner--small"></span>
            ${gridDelivery.pendingModeText}
          </div>
        ` : nothing}
        ${gridDelivery.pendingLimitText ? html`
          <div class="pending-overlay">
            <span class="spinner spinner--small"></span>
            ${gridDelivery.pendingLimitText}
          </div>
        ` : nothing}
      </div>
    `;
  }

  // ==========================================================================
  // GRID
  // ==========================================================================

  private renderGrid() {
    const d = this.data;
    const importing = d.gridPower > 10;
    const exporting = d.gridPower < -10;
    const absW = Math.abs(d.gridPower);
    const flowKw = absW / 1000;
    const dirText = importing ? '↓ Odběr ze sítě' : exporting ? '↑ Přetok do sítě' : '◉ Žádný tok';
    const breakerMax = 25 * 230 * 3; // 25 A / phase
    const exportLimit = d.inverterGridLimit > 0 ? d.inverterGridLimit : 5000;
    const limitPct = importing ? (absW / breakerMax) * 100 : exporting ? (absW / exportLimit) * 100 : 0;
    // Colour by price: import expensive→red / cheap→orange / ≤0→green;
    // export inverse by sell price (good→green).
    const gColor = importing
      ? (d.spotPrice <= 0 ? '#43a047' : d.spotPrice < 3 ? '#ffa726' : '#ef5350')
      : exporting
        ? (d.exportPrice >= 3 ? '#43a047' : d.exportPrice >= 1.5 ? '#ffa726' : '#ef5350')
        : 'rgba(255,255,255,0.35)';
    const priceState = importing ? `${d.spotPrice.toFixed(2)} Kč` : exporting ? `+${d.exportPrice.toFixed(2)} Kč` : '';
    const amps = (p: number, v: number) => (v > 10 ? Math.round(Math.abs(p) / v) : 0);

    return html`
      <div class="${this.nodeClass('grid')}" style="--node-gradient: ${NODE_GRADIENTS.grid}; --node-border: ${NODE_BORDERS.grid};"
        @click=${(e: Event) => this.toggleExpand('grid', e)}>
        ${this.edgeGauge({
          id: 'gauge-grid',
          nodeId: 'grid',
          pct: limitPct,
          stops: [[0, gColor], [1, gColor]],
          width: 2 + Math.min(3, flowKw),
          pulse: importing || exporting,
          pulseDur: Math.max(0.9, 2.2 - flowKw * 0.35),
        })}
        <div class="node-tint" style="background: radial-gradient(120% 80% at 50% 50%, ${gColor}22, transparent 72%)"></div>

        <button class="indicator" style="position:absolute;top:4px;left:6px;font-size:9px;z-index:3" @click=${openEntity('current_tariff')}>
          ${getTariffDisplay(d.currentTariff)}
        </button>
        <button class="indicator" style="position:absolute;top:4px;right:6px;font-size:9px;z-index:3" @click=${openEntity('ac_in_aci_f')}>
          ${d.gridFrequency.toFixed(1)} Hz
        </button>

        ${this.gaugePill('grid', importing || exporting ? `${Math.round(limitPct)} %` : '0 %', gColor, html`
          <div class="ss-pop-h"><span>${importing ? 'Vytížení jističe' : exporting ? 'Vytížení limitu přetoku' : 'Síť v klidu'}</span><b style="color:${gColor}">${Math.round(limitPct)} %</b></div>
          <div class="gp-r"><span>Tok</span><b>${dirText} · ${formatPower(absW)}</b></div>
          <div class="gp-r"><span>Limit</span><b>${importing ? `${(breakerMax / 1000).toFixed(1)} kW (25 A/fáze)` : `${(exportLimit / 1000).toFixed(1)} kW přetok`}</b></div>
          <div class="gp-r"><span>Spot / Výkup</span><b>${d.spotPrice.toFixed(2)} / ${d.exportPrice.toFixed(2)} Kč</b></div>
        `)}

        <div class="node-header node-header--split" style="margin-top:16px">
          <span class="node-label">🔌 Síť</span>
          <span class="node-state" style="color:${gColor}">${priceState}</span>
        </div>
        <div class="node-value" @click=${openEntity('actual_aci_wtotal')}>${formatPower(absW)}</div>
        <div class="node-subvalue" style="color:${gColor};font-weight:600">${dirText}</div>

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
            <button class="phase-val" @click=${openEntity('actual_aci_wr')}>${amps(d.gridL1P, d.gridL1V)} A</button>
            <button class="phase-val" style="font-size:10px;color:${u(CSS_VARS.textSecondary)}" @click=${openEntity('actual_aci_wr')}>${Math.round(d.gridL1P)} W</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L2</span>
            <button class="phase-val" @click=${openEntity('actual_aci_ws')}>${amps(d.gridL2P, d.gridL2V)} A</button>
            <button class="phase-val" style="font-size:10px;color:${u(CSS_VARS.textSecondary)}" @click=${openEntity('actual_aci_ws')}>${Math.round(d.gridL2P)} W</button>
          </div>
          <div class="phase-cell">
            <span class="phase-label">L3</span>
            <button class="phase-val" @click=${openEntity('actual_aci_wt')}>${amps(d.gridL3P, d.gridL3V)} A</button>
            <button class="phase-val" style="font-size:10px;color:${u(CSS_VARS.textSecondary)}" @click=${openEntity('actual_aci_wt')}>${Math.round(d.gridL3P)} W</button>
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

    const zalohaToday = d.houseTodayWh / 1000;
    const nezalohaToday = d.nonbackupTodayWh / 1000;
    const totalToday = zalohaToday + nezalohaToday;
    const totalPower = d.housePower + d.nonbackupPower;
    const zalohaForecast = zalohaToday + d.zalohaPlannedRemainingKwh;

    // --- DAILY self-sufficiency (aura) from Task A precomputed fields ---
    const dailySS = d.selfSufficiencyTodayPct;
    const totalTodayWh = d.houseTodayWh + d.nonbackupTodayWh;
    // Arc fractions (0..100 each, summing to 100) for the multi-segment aura.
    // green=battery, yellow=FVE, red=grid (clockwise from top).
    const arcBat = totalTodayWh > 0 ? (d.srcBatteryTodayKwh * 1000 / totalTodayWh) * 100 : 0;
    const arcFve = totalTodayWh > 0 ? (d.srcFveTodayKwh * 1000 / totalTodayWh) * 100 : 0;
    const arcGrid = totalTodayWh > 0 ? (d.srcGridTodayKwh * 1000 / totalTodayWh) * 100 : 0;

    // Pill colour: smooth hsl red→green by self-suff value (same logic as other gauges).
    const ssColor = dailySS >= 66 ? '#43a047' : dailySS >= 33 ? '#fdd835' : '#e53935';
    const ssGaugeColor = `hsl(${Math.round(Math.max(0, Math.min(120, dailySS * 1.2)))}, 72%, 46%)`;

    // Popover breakdown kWh + %
    // When no data yet (totalToday = 0), show '—' rather than the contradictory 'Síť 100 %'.
    const hasLoad = totalToday > 0;
    const totalKwh = hasLoad ? totalToday : 1; // avoid /0
    const pctFve = hasLoad ? Math.round((d.srcFveTodayKwh / totalKwh) * 100) : 0;
    const pctBat = hasLoad ? Math.round((d.srcBatteryTodayKwh / totalKwh) * 100) : 0;
    // Clamp to 0 so rounding of near-100% self-sufficiency cannot yield -1.
    const pctGrid = hasLoad ? Math.max(0, 100 - pctFve - pctBat) : 0;
    const ssTitle = `Denní soběstačnost ${Math.round(dailySS)} % · FVE ${pctFve} % · Baterie ${pctBat} % · Síť ${pctGrid} %`;

    // --- Phase status (záloha) ---
    const ps = computePhaseStatus([d.houseL1, d.houseL2, d.houseL3]);

    // Phase track scale: DYNAMIC — fill to the actual largest phase total so
    // small loads still render readable bars. Small floor avoids /0. The 3.3 kW
    // limit tick is only drawn when it falls within the visible scale (i.e. a
    // phase is actually near the overload limit).
    const phases = [
      { z: d.houseL1, n: d.nonbackupL1, ze: 'ac_out_aco_pr' },
      { z: d.houseL2, n: d.nonbackupL2, ze: 'ac_out_aco_ps' },
      { z: d.houseL3, n: d.nonbackupL3, ze: 'ac_out_aco_pt' },
    ];
    const maxPhaseTotal = Math.max(300, ...phases.map(p => p.z + p.n));
    const limPct = (BACKUP_PHASE_LIMIT_W / maxPhaseTotal) * 100;
    const showLimTick = limPct <= 100;

    const spreadStr = ps.spreadW >= 1000
      ? `${(ps.spreadW / 1000).toFixed(1).replace('.', ',')} kW`
      : `${Math.round(ps.spreadW)} W`;

    // Spread band geometry (záloha ends min→max), relative to the dynamic scale.
    const zalohaWidthsPct: [number, number, number] = phases.map(p =>
      (Math.max(0, p.z) / maxPhaseTotal) * 100,
    ) as [number, number, number];
    const totalZalohaW = d.houseL1 + d.houseL2 + d.houseL3;
    const spreadBand = computeSpreadBand(zalohaWidthsPct, totalZalohaW);

    // Format watts/kW for inline segment label
    const fmtKw = (w: number) => w >= 1000 ? `${(w / 1000).toFixed(1).replace('.', ',')}` : `${Math.round(w)} W`;
    // Show label inside segment only when wide enough (≥14% of track width ≈ enough for "0.9")
    const LABEL_THRESHOLD_PCT = 14;

    // Tooltip data for compact split row
    const zalohaTitle = `Záloha ${formatPower(d.housePower)} · dnes ${zalohaToday.toFixed(1)} kWh${d.zalohaPlannedRemainingKwh > 0 ? ` · plán ${zalohaForecast.toFixed(1)} kWh` : ''}`;
    const nezalohaTitle = `Nezáloha ${formatPower(d.nonbackupPower)} · dnes ${nezalohaToday.toFixed(1)} kWh`;

    return html`
      <div class="${this.nodeClass('house')}" style="--node-gradient: ${NODE_GRADIENTS.house}; --node-border: ${NODE_BORDERS.house};"
        @click=${(e: Event) => this.toggleExpand('house', e)} title=${ssTitle}>

        <!-- MULTI-SEGMENT AURA: battery (green) → FVE (yellow) → grid (red) — UNCHANGED -->
        ${this.edgeGaugeSegments({
          nodeId: 'house',
          segments: [
            { frac: arcBat,  color: '#43a047' },
            { frac: arcFve,  color: '#ffca28' },
            { frac: arcGrid, color: '#e53935' },
          ],
          width: 3.5,
        })}
        <div class="node-tint" style="background: radial-gradient(120% 80% at 50% 100%, ${ssColor}22, transparent 72%)"></div>

        <!-- GAUGE PILL: daily self-sufficiency with kWh popover — UNCHANGED -->
        ${this.gaugePill('house', `${Math.round(dailySS)} %`, ssGaugeColor, html`
          <div class="ss-pop-h"><span>Denní soběstačnost</span><b style="color:${ssGaugeColor}">${Math.round(dailySS)} %</b></div>
          ${hasLoad ? html`
            <div class="ss-bar">
              <i style="width:${pctBat}%;background:#43a047"></i>
              <i style="width:${pctFve}%;background:#ffca28"></i>
              <i style="width:${pctGrid}%;background:#e53935"></i>
            </div>
            <div class="gp-r"><span>☀️ FVE</span><b>${d.srcFveTodayKwh.toFixed(1)} kWh · ${pctFve} %</b></div>
            <div class="gp-r"><span>🔋 Baterie</span><b>${d.srcBatteryTodayKwh.toFixed(1)} kWh · ${pctBat} %</b></div>
            <div class="gp-r"><span>🔌 Síť</span><b>${d.srcGridTodayKwh.toFixed(1)} kWh · ${pctGrid} %</b></div>
            <div class="gp-r" style="margin-top:4px;border-top:1px solid rgba(255,255,255,.12);padding-top:4px">
              <span>Celkem dnes</span><b>${totalToday.toFixed(1)} kWh</b>
            </div>
          ` : html`<div class="gp-r" style="opacity:.6"><span>Žádná spotřeba dnes zatím</span></div>`}
        `)}

        <!-- COMPACT HEADER: SVG house icon · big kW · tiny kWh -->
        <div class="house-head">
          ${svg`<svg class="house-ico" viewBox="0 0 24 24" fill="none" stroke="#cfe0ff" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"><path d="M3 11l9-7 9 7"></path><path d="M5 10v10h14V10"></path></svg>`}
          <span class="house-cap">SPOTŘEBA</span>
        </div>
        <div class="node-value" @click=${openEntity('actual_aco_p')}>${formatPower(totalPower)}</div>
        <div class="node-subvalue" @click=${openEntity('ac_out_en_day')}>${totalToday.toFixed(1).replace('.', ',')} kWh</div>

        <!-- COMPACT SPLIT ROW: colored dot + value, tooltip carries detail -->
        <div class="csplit">
          <button class="cs" @click=${openEntity('actual_aco_p')} title=${zalohaTitle}>
            <span class="cs-top"><span class="d" style="background:#43a047"></span>${formatPower(d.housePower)}</span>
            <span class="cs-day">${zalohaToday.toFixed(1).replace('.', ',')} kWh</span>
          </button>
          <button class="cs" @click=${openEntity('actual_acinb_wtotal')} title=${nezalohaTitle}>
            <span class="cs-top"><span class="d" style="background:#fb8c00"></span>${formatPower(d.nonbackupPower)}</span>
            <span class="cs-day">${nezalohaToday.toFixed(1).replace('.', ',')} kWh</span>
          </button>
        </div>

        <!-- PHASE GRAPH (phasegraph2 design) -->
        <div class="pg">
          <!-- Spread band = imbalance "thermometer" (no text); red shimmer when unbalanced -->
          ${spreadBand.widthPct > 0 ? html`
            <div class="pg-spread ${ps.balanced ? 'balanced' : 'unbal'}"
              title=${ps.balanced ? 'Fáze vyvážené' : `Fáze nevyvážené — rozdíl ${spreadStr}`}
              style="left:calc(10px + ${spreadBand.leftPct.toFixed(2)}% * (100% - 61px) / 100);width:calc(${spreadBand.widthPct.toFixed(2)}% * (100% - 61px) / 100)"></div>` : nothing}
          <!-- Phase rows: NO L1/L2/L3 labels per spec -->
          ${phases.map((p) => {
            const zOver = p.z >= BACKUP_PHASE_LIMIT_W;
            const phaseTotal = p.z + p.n;
            const zWidthPct = (Math.max(0, p.z) / maxPhaseTotal) * 100;
            const nWidthPct = (Math.max(0, p.n) / maxPhaseTotal) * 100;
            const showZLabel = zWidthPct >= LABEL_THRESHOLD_PCT && p.z > 100;
            const showNLabel = nWidthPct >= LABEL_THRESHOLD_PCT && p.n > 100;
            return html`
              <div class="pg-row">
                <div class="pg-track">
                  <div class="pg-z ${zOver ? 'crit' : ''}" style="width:${zWidthPct.toFixed(1)}%">
                    ${showZLabel ? fmtKw(p.z) : nothing}
                  </div>
                  ${p.n > 0 ? html`
                    <div class="pg-div"></div>
                    <div class="pg-n" style="width:${nWidthPct.toFixed(1)}%">
                      ${showNLabel ? fmtKw(p.n) : nothing}
                    </div>` : nothing}
                  ${showLimTick ? html`<div class="pg-lim" style="left:${limPct.toFixed(1)}%"></div>` : nothing}
                </div>
                <span class="pg-tot">${((phaseTotal) / 1000).toFixed(1).replace('.', ',')}</span>
              </div>`;
          })}
        </div>

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
