// ============================================================================
// Bojler — Hero flow card (bojler-tab-v2 m2b unit "hero flow card")
// ============================================================================
//
// Component: oig-boiler-hero-flow
// Section 1/5 of the rebuilt tab: the tank as HERO, analogue of the "Toky"
// pentagon flow diagram (`ui/features/flow/canvas.ts`). KPI header strip +
// a static-layout SVG flow diagram (source nodes -> tank -> consumption
// nodes). Pure render from props — no data fetching; a later unit wires this
// from `app.ts`.
//
// Boiler = battery analogy: hot-water energy = capacity/SoC, heating-element
// power = charging power.
// ============================================================================

import { LitElement, html, svg, css, nothing, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { t, sourceLabel, type Lang } from '@/i18n/boiler';
import { altTypeLabel } from './boiler-energy-today';
import { tempColor, readyLineTopPct } from './boiler-svg';
import { formatKwh, formatCzk } from './format';
import type {
  BoilerV2Status,
  BoilerV2Activity,
  BoilerV2PlanSlot,
  PlanSummary,
  EnergyToday,
  DemandMapData,
  DemandMapWindow,
  DrawMapData,
  CirculationRun,
  LegionellaStatus,
  BoilerConfig,
} from './types';

const u = unsafeCSS;

// Documented silent-fallback default this codebase already applies elsewhere
// (e.g. `app.ts`'s `cfg?.volumeL ?? 200`). Reused here, but — unlike the
// silent version — flagged with the "odhad" (estimate) marker.
const FALLBACK_VOLUME_L = 200;

// Mock rev3 palette (verbatim from docs/redesign_2026_07/rework/BOILER-TAB-MOCK-rev3.html)
const MOCK = {
  water: '#4dd0e1',
  grid: '#3b82f6',
  fve: '#f0b429',
  battery: '#a78bfa',
  alt: '#ff8a50',
  idle: '#39415f',
  card: '#1b2340',
  card2: '#1f2848',
  line: '#2a3355',
  muted: '#8b93ad',
  dim: '#5c6480',
  text: '#e8ecf7',
} as const;

// ============================================================================
// Pure helpers — exported for unit tests
// ============================================================================

export function prefersReducedMotion(): boolean {
  try {
    return globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  } catch {
    return false;
  }
}

/**
 * heat mode: 'ele' | 'alt' | 'idle' — same mapping as `app.ts:1430-1434`.
 * Reused verbatim per brief (do not invent a new mapping).
 */
export function deriveHeatMode(activity: BoilerV2Activity | null): 'ele' | 'alt' | 'idle' {
  const st = activity?.state ?? 'unknown';
  return st === 'charging_alt' ? 'alt' : (st.startsWith('charging_') ? 'ele' : 'idle');
}

export interface ReadyLiters {
  liters: number;
  /** true = volumeL used the documented silent-fallback default (200 L) */
  estimated: boolean;
}

/** "Připraveno" liters = fillLevelPct * volumeL (odhad-flagged when volumeL is missing). */
export function deriveReadyLiters(
  activity: BoilerV2Activity | null,
  config: BoilerConfig | null,
): ReadyLiters | null {
  const frac = activity?.fillLevelPct ?? null;
  if (frac == null) return null;
  const volume = config?.volumeL;
  const estimated = volume == null;
  return { liters: frac * (volume ?? FALLBACK_VOLUME_L), estimated };
}

/** First plan slot whose start is strictly after `nowMs`. */
export function findNextPlanSlot(slots: BoilerV2PlanSlot[], nowMs: number): BoilerV2PlanSlot | null {
  for (const s of slots) {
    const startMs = Date.parse(s.start);
    if (Number.isFinite(startMs) && startMs > nowMs) return s;
  }
  return null;
}

/** First future plan slot recommending a given source. */
export function findNextSourcedSlot(
  slots: BoilerV2PlanSlot[],
  sources: string[],
  nowMs: number,
): BoilerV2PlanSlot | null {
  for (const s of slots) {
    const startMs = Date.parse(s.start);
    if (!Number.isFinite(startMs) || startMs <= nowMs) continue;
    if (s.recommendedSource && sources.includes(s.recommendedSource)) return s;
  }
  return null;
}

/** Next demand window (P80) whose start-of-day minute is after "now". */
export function findNextDemandWindow(demandMap: DemandMapData | null, nowMs: number): DemandMapWindow | null {
  const windows = demandMap?.windows;
  if (!windows || windows.length === 0) return null;
  const now = new Date(nowMs);
  const nowMinute = now.getHours() * 60 + now.getMinutes();
  return windows.find((w) => w.startMinute > nowMinute) ?? null;
}

/** Next circulation run whose end is still ahead of "now" (ongoing or upcoming). */
export function findNextCirculationRun(runs: CirculationRun[], nowMs: number): CirculationRun | null {
  for (const r of runs) {
    const endMs = Date.parse(r.end);
    if (Number.isFinite(endMs) && endMs > nowMs) return r;
  }
  return null;
}

/** Today's draw summary from drawMap: total liters + peak window. */
export interface DrawsToday {
  totalLiters: number;
  peakTime: string; // HH:MM
  peakLiters: number;
}

export function deriveDrawsToday(drawMap: DrawMapData | null): DrawsToday | null {
  const weekly = drawMap?.weekly;
  if (!weekly || weekly.length === 0) return null;
  const today = weekly[weekly.length - 1]; // last entry = today
  const slots = today?.slotsLiters;
  if (!slots || slots.length === 0) return null;

  let maxLiters = 0;
  let maxIndex = 0;
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] > maxLiters) {
      maxLiters = slots[i];
      maxIndex = i;
    }
  }

  const slotDurationMin = drawMap.slotDurationMin ?? 15;
  const peakMinutes = maxIndex * slotDurationMin;
  const peakHours = Math.floor(peakMinutes / 60);
  const peakMins = peakMinutes % 60;
  const peakTime = `${String(peakHours).padStart(2, '0')}:${String(peakMins).padStart(2, '0')}`;

  return { totalLiters: today.totalLiters, peakTime, peakLiters: maxLiters };
}

export interface HeatingDone {
  kwh: number;
  doneMs: number;
}

/**
 * "na dohřev X kWh - hotovo HH:MM": energyNeededKwh / heaterPowerW -> hours,
 * projected from now. No documented fallback exists for heaterPowerW, so a
 * missing config drops the whole line rather than fabricating an ETA.
 */
export function deriveHeatingDone(
  status: BoilerV2Status | null,
  config: BoilerConfig | null,
  nowMs: number,
): HeatingDone | null {
  const kwh = status?.energyNeededKwh ?? null;
  const powerW = config?.heaterPowerW ?? null;
  if (kwh == null || powerW == null || powerW <= 0) return null;
  const hours = kwh / (powerW / 1000);
  return { kwh, doneMs: nowMs + hours * 3_600_000 };
}

/** Same wording/thresholds as `boiler-metric-panel.ts`'s comfort-panel legionella row. */
export function legionellaCountdownLabel(legionella: LegionellaStatus | null, lang: Lang): string | null {
  if (!legionella) return null;
  if (!legionella.enabled) return t('boiler.panel.legionella_off', lang);
  if (legionella.scheduledStart) {
    const raw = legionella.scheduledStart;
    const timeStr = raw.includes('T') ? isoToHhmm(raw) : raw.substring(0, 5);
    return `${t('boiler.panel.legionella_plan', lang)} ${timeStr}`;
  }
  const daysSince = legionella.daysSinceLast ?? null;
  const interval = legionella.intervalDays ?? null;
  if (daysSince !== null && interval !== null) {
    const remaining = interval - daysSince;
    if (remaining <= 0) return t('boiler.panel.legionella_overdue', lang);
    return `${t('boiler.panel.legionella_in', lang)} ${remaining} ${t('boiler.panel.legionella_days', lang)}`;
  }
  return t('boiler.panel.legionella_scheduled', lang);
}

function isoToHhmm(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '??:??';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function hhmm(ms: number): string {
  const d = new Date(ms);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Drop a leading emoji + optional space so chips read cleanly in the mock style. */
function cleanLabel(label: string): string {
  return label.replace(/^\p{Emoji}️?\s*/u, '');
}

// ============================================================================
// Component
// ============================================================================

@customElement('oig-boiler-hero-flow')
export class OigBoilerHeroFlow extends LitElement {
  @property({ attribute: false }) status: BoilerV2Status | null = null;
  @property({ attribute: false }) activity: BoilerV2Activity | null = null;
  @property({ attribute: false }) planSlots: BoilerV2PlanSlot[] = [];
  @property({ attribute: false }) planSummary: PlanSummary | null = null;
  @property({ attribute: false }) energyToday: EnergyToday | null = null;
  @property({ attribute: false }) demandMap: DemandMapData | null = null;
  @property({ attribute: false }) drawMap: DrawMapData | null = null;
  @property({ attribute: false }) circulationRuns: CirculationRun[] = [];
  @property({ attribute: false }) legionella: LegionellaStatus | null = null;
  @property({ attribute: false }) config: BoilerConfig | null = null;
  /** Home battery %, source = Flow tab data, NOT the boiler DTO. Integrator wires it. */
  @property({ type: Number }) homeBatterySocPct: number | null = null;
  @property({ type: String }) altSourceType: string | null = null;
  @property({ type: String }) lang: Lang = 'cs';

  static styles = css`
    :host { display: block; font-family: ${u(CSS_VARS.fontFamily)}; }

    .card {
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      padding: 12px 14px 14px;
      box-shadow: 0 4px 14px rgba(0,0,0,.28);
    }

    /* ── KPI strip (mock rev3 .kstrip) ── */
    .kpi-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      padding-bottom: 10px;
      margin-bottom: 10px;
      border-bottom: 1px solid ${u(MOCK.line)};
    }
    .kpi {
      flex: 1;
      min-width: 110px;
      font-size: 12px;
      line-height: 1.25;
      color: ${u(MOCK.muted)};
    }
    .kpi b {
      display: block;
      color: ${u(MOCK.text)};
      font-size: 14px;
      font-weight: 700;
      margin-top: 1px;
    }
    .est-badge {
      display: inline-block;
      margin-left: 5px;
      font-size: 9px;
      font-weight: 700;
      color: #ffd17c;
      background: rgba(255,152,0,.14);
      border: 1px solid rgba(255,152,0,.35);
      border-radius: 4px;
      padding: 0 4px;
      vertical-align: middle;
    }

    /* ── Flow body ── */
    .flow-body { width: 100%; }
    svg.flow-svg { display: block; width: 100%; height: auto; }

    .connector { fill: none; stroke-width: 2.5; stroke-linecap: round; }
    .connector.active { stroke-width: 3; }
    .connector.planned { stroke-dasharray: 4 4; }
    .connector-anim { animation: hero-dash 1s linear infinite; }
    @keyframes hero-dash { to { stroke-dashoffset: -22; } }

    .tank-shell { fill: url(#hero-tank-shell); stroke: rgba(255,255,255,.14); }
    .tank-inner { fill: url(#hero-water); opacity: .55; }
    .tank-waterline { fill: none; stroke: rgba(255,255,255,.55); stroke-width: 1.5; stroke-dasharray: 4 3; }
    .tank-readout { font-size: 22px; font-weight: 800; fill: #fff; text-shadow: 0 1px 4px rgba(0,0,0,.5); }
    .tank-caption { font-size: 9.5px; fill: ${u(MOCK.muted)}; }
    .tank-badge rect { fill: rgba(13,20,38,.85); stroke: rgba(255,255,255,.16); }
    .tank-badge text { fill: #fff; font-size: 11px; font-weight: 700; }
    .heater-label { font-size: 9.5px; fill: ${u(MOCK.muted)}; }
  `;

  render() {
    const lang = this.lang;
    const nowMs = Date.now();
    const activity = this.activity;
    const status = this.status;
    const cfg = this.config;
    const planSlots = this.planSlots ?? [];
    const circRuns = this.circulationRuns ?? [];
    const reduceMotion = prefersReducedMotion();
    const estimateSuffix = t('boiler.tank.source_estimated_suffix', lang);

    const heatMode = deriveHeatMode(activity);
    const ready = deriveReadyLiters(activity, cfg);
    const topT = status?.temperatureTop ?? null;
    const botT = status?.temperatureBottom ?? null;

    // ── KPI strip ──────────────────────────────────────────────────────────
    const costToday = this.energyToday?.costCzk ?? null;
    const costPlan = this.planSummary?.estimatedCostCzk ?? null;
    const hasCostKpi = costToday != null && costPlan != null;

    const nextSlot = findNextPlanSlot(planSlots, nowMs);

    const modeLabel = heatMode === 'alt'
      ? cleanLabel(altTypeLabel(this.altSourceType, lang))
      : heatMode === 'ele'
        ? t('boiler.hero.mode_ele', lang)
        : t('boiler.hero.mode_idle', lang);

    // ── LEFT source nodes ────────────────────────────────────────────────────
    const fveActive = activity?.state === 'charging_fve' || activity?.state === 'charging_overflow';
    const fvePlanned = !fveActive && findNextSourcedSlot(planSlots, ['fve', 'overflow'], nowMs) != null;

    const gridActive = activity?.state === 'charging_grid';
    const nextGridSlot = findNextSourcedSlot(planSlots, ['grid'], nowMs);
    const gridKwhToday = this.energyToday?.gridKwh ?? null;

    const batteryActive = activity?.state === 'discharging' || activity?.source === 'discharge';
    const batteryPlanned = !batteryActive && findNextSourcedSlot(planSlots, ['battery', 'discharge'], nowMs) != null;

    const hasAltSlot = findNextSourcedSlot(planSlots, ['alternative'], nowMs) != null;
    const showAlt = activity?.state === 'charging_alt' || hasAltSlot;

    // ── RIGHT consumption nodes ──────────────────────────────────────────────
    const drawsToday = deriveDrawsToday(this.drawMap);
    const nextDemandWindow = findNextDemandWindow(this.demandMap, nowMs);
    const nextCirc = findNextCirculationRun(circRuns, nowMs);
    const legionellaLabel = legionellaCountdownLabel(this.legionella, lang);
    const showCircNode = nextCirc != null || legionellaLabel != null;
    const circActiveNow = nextCirc != null
      && Date.parse(nextCirc.start) <= nowMs && nowMs < Date.parse(nextCirc.end);

    // ── Tank ──────────────────────────────────────────────────────────────
    const heatingDone = deriveHeatingDone(status, cfg, nowMs);
    const heaterPowerW = cfg?.heaterPowerW ?? null;
    const readyPct = readyLineTopPct(activity?.fillLevelPct ?? null);
    const topColor = tempColor(topT);
    const botColor = tempColor(botT ?? topT);

    const connectorCls = (active: boolean, planned: boolean) => {
      const cls = ['connector'];
      if (active) {
        cls.push('active');
        if (!reduceMotion) cls.push('connector-anim');
      } else if (planned) {
        cls.push('planned');
      }
      return cls.join(' ');
    };

    // Source colour map for node strokes and titles
    const srcColor = (key: string) => {
      switch (key) {
        case 'fve': return MOCK.fve;
        case 'grid': return MOCK.grid;
        case 'battery': return MOCK.battery;
        case 'alt': return MOCK.alt;
        default: return MOCK.idle;
      }
    };

    // Connector config per path (mock lines 105-112): class only; stroke/opacity are
    // set inline in the template so this helper must not become a second source of truth.
    const connConfig = (active: boolean, planned: boolean) => {
      const isAnimated = active && !reduceMotion;
      const cls = ['connector'];
      if (active) cls.push('active', isAnimated ? 'connector-anim' : '');
      else if (planned) cls.push('planned');
      return { class: cls.join(' ') };
    };

    // Node geometry
    const nodeW = 138;
    const nodeH = 54;
    const leftX = 36;
    const rightX = 700;
    const tankX = 380;
    const tankY = 40;
    const tankW = 140;
    const tankH = 200;

    const fveY = 18;
    const gridY = 86;
    const batteryY = 154;
    const altY = 222;
    // 3-slot right layout (FIX-H3): Odbery y=30, Dalsi y=127, Cirkulace y=218
    const drawsY = drawsToday != null ? 30 : -100; // omit when null
    const demandY = drawsToday != null ? 127 : 70;
    const circY = drawsToday != null ? 218 : 164;

    return html`
      <div class="card" data-testid="boiler-hero-flow">
        <div class="kpi-strip" data-testid="hero-kpi-strip">
          ${ready ? html`
            <div class="kpi" data-testid="hero-kpi-ready">
              <span>${t('boiler.hero.kpi_ready', lang)}</span>
              <b>${Math.round(ready.liters)} L${ready.estimated ? html`<span class="est-badge" data-testid="hero-est-ready">${estimateSuffix}</span>` : nothing}</b>
            </div>
          ` : nothing}

          ${topT != null || botT != null ? html`
            <div class="kpi" data-testid="hero-kpi-temps">
              <span>${t('boiler.model.top', lang)} / ${t('boiler.model.bottom', lang)}</span>
              <b>${topT != null ? Math.round(topT) : '–'}&nbsp;°C / ${botT != null ? Math.round(botT) : '–'}&nbsp;°C</b>
            </div>
          ` : nothing}

          ${hasCostKpi ? html`
            <div class="kpi" data-testid="hero-kpi-cost">
              <span>${t('boiler.panel.cost_today', lang)} ${t('boiler.hero.vs_plan', lang)}</span>
              <b>${formatCzk(costToday)} / ${formatCzk(costPlan)}</b>
            </div>
          ` : nothing}

          ${nextSlot ? html`
            <div class="kpi" data-testid="hero-kpi-next-heating">
              <span>${t('boiler.plan.next_action', lang)}</span>
              <b>${this._nextHeatingLabel(nextSlot)}</b>
            </div>
          ` : nothing}

          <div class="kpi" data-testid="hero-kpi-mode">
            <span>${t('boiler.hero.kpi_mode', lang)}</span>
            <b>${modeLabel}</b>
          </div>
        </div>

        <div class="flow-body" data-testid="hero-flow-body">
          <svg class="flow-svg" viewBox="0 0 900 290" preserveAspectRatio="xMidYMid meet" role="img">
            <defs>
              <linearGradient id="hero-tank-shell" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#2a7d95"/>
                <stop offset="1" stop-color="#173a54"/>
              </linearGradient>
              <linearGradient id="hero-water" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0" stop-color=${botColor ?? '#173a54'}/>
                <stop offset="1" stop-color=${topColor ?? '#2a7d95'}/>
              </linearGradient>
            </defs>

            <!-- connectors, left (source-colored per FIX-H1) -->
            ${svg`<path class=${connConfig(fveActive, fvePlanned).class} stroke=${srcColor('fve')} stroke-width="2" opacity=${fveActive ? 0.9 : fvePlanned ? 0.6 : 0.35} d="M${leftX + nodeW} ${fveY + nodeH / 2} C${tankX - 40} ${fveY + nodeH / 2}, ${tankX - 40} ${tankY + 55}, ${tankX} ${tankY + 55}" />`}
            ${svg`<path class=${connConfig(gridActive, nextGridSlot != null).class} stroke=${srcColor('grid')} stroke-width="2.5" opacity=${gridActive ? 0.9 : nextGridSlot != null ? 0.6 : 0.35} d="M${leftX + nodeW} ${gridY + nodeH / 2} C${tankX - 40} ${gridY + nodeH / 2}, ${tankX - 40} ${tankY + tankH / 2}, ${tankX} ${tankY + tankH / 2}" />`}
            ${svg`<path class=${connConfig(batteryActive, batteryPlanned).class} stroke=${srcColor('battery')} stroke-width="2" opacity=${batteryActive ? 0.9 : batteryPlanned ? 0.6 : 0.3} d="M${leftX + nodeW} ${batteryY + nodeH / 2} C${tankX - 40} ${batteryY + nodeH / 2}, ${tankX - 40} ${tankY + tankH - 55}, ${tankX} ${tankY + tankH - 55}" />`}
            ${showAlt ? svg`<path class=${connConfig(activity?.state === 'charging_alt', hasAltSlot).class} stroke=${srcColor('alt')} stroke-width="2" opacity=${activity?.state === 'charging_alt' ? 0.9 : hasAltSlot ? 0.6 : 0.3} d="M${leftX + nodeW} ${altY + nodeH / 2} C${tankX - 40} ${altY + nodeH / 2}, ${tankX - 40} ${tankY + tankH - 25}, ${tankX} ${tankY + tankH - 25}" />` : nothing}

            <!-- connectors, right (tank -> draws) -->
            ${drawsToday != null ? svg`<path class="connector" stroke=${MOCK.water} stroke-width="2" opacity="0.55" d="M${tankX + tankW} ${tankY + 55} C${tankX + tankW + 40} ${tankY + 55}, ${tankX + tankW + 40} ${drawsY + nodeH / 2}, ${rightX} ${drawsY + nodeH / 2}" />` : nothing}
            ${svg`<path class=${connectorCls(false, nextDemandWindow != null)} stroke=${MOCK.water} stroke-width="2" opacity="0.35" d="M${tankX + tankW} ${tankY + 90} C${tankX + tankW + 40} ${tankY + 90}, ${tankX + tankW + 40} ${demandY + nodeH / 2}, ${rightX} ${demandY + nodeH / 2}" />`}
            ${showCircNode ? svg`<path class=${connectorCls(circActiveNow, nextCirc != null)} stroke=${MOCK.idle} stroke-width="2" opacity=${circActiveNow ? 0.9 : nextCirc != null ? 0.6 : 0.35} d="M${tankX + tankW} ${tankY + tankH - 55} C${tankX + tankW + 40} ${tankY + tankH - 55}, ${tankX + tankW + 40} ${circY + nodeH / 2}, ${rightX} ${circY + nodeH / 2}" />` : nothing}

            <!-- LEFT source nodes (FIX-H2: richer subtitles) -->
            ${this._sourceNode({
              testid: 'hero-node-fve',
              x: leftX, y: fveY,
              color: srcColor('fve'),
              title: t('boiler.hero.node_fve', lang),
              sub: this._fveNodeSub(this.homeBatterySocPct, fveActive),
              active: fveActive,
              planned: fvePlanned,
            })}
            ${this._sourceNode({
              testid: 'hero-node-grid',
              x: leftX, y: gridY,
              color: srcColor('grid'),
              title: t('boiler.hero.node_grid', lang),
              sub: this._gridNodeSub(gridKwhToday, nextGridSlot),
              active: gridActive,
              planned: nextGridSlot != null,
            })}
            ${this._sourceNode({
              testid: 'hero-node-battery',
              x: leftX, y: batteryY,
              color: srcColor('battery'),
              title: t('boiler.hero.node_battery', lang),
              sub: this._batteryNodeSub(this.energyToday?.batteryKwh ?? null),
              active: batteryActive,
              planned: batteryPlanned,
            })}
            ${showAlt ? this._sourceNode({
              testid: 'hero-node-alt',
              x: leftX, y: altY,
              color: srcColor('alt'),
              title: cleanLabel(altTypeLabel(this.altSourceType, lang)),
              sub: this._altNodeSub(this.energyToday?.altKwh ?? null, this.energyToday?.savingsVsAltCzk ?? null),
              active: activity?.state === 'charging_alt',
              planned: hasAltSlot,
            }) : nothing}

            <!-- CENTER tank -->
            <g data-testid="hero-node-tank">
              <rect class="tank-shell" x="${tankX}" y="${tankY}" width="${tankW}" height="${tankH}" rx="24" />
              <rect class="tank-inner" x="${tankX + 6}" y="${tankY + 6}" width="${tankW - 12}" height="${tankH - 12}" rx="18" />
              <!-- hot-layer band at top of water (FIX-H4) -->
              ${svg`<rect x="${tankX + 6}" y="${tankY + 6}" width="${tankW - 12}" height="40" rx="18" fill="#3fa7bd" opacity="0.5" />`}
              ${readyPct != null ? svg`<line class="tank-waterline" x1="${tankX + 6}" y1="${tankY + 6 + (readyPct / 100) * (tankH - 12)}" x2="${tankX + tankW - 6}" y2="${tankY + 6 + (readyPct / 100) * (tankH - 12)}" />` : nothing}

              <!-- heater arc (FIX-H4) -->
              ${svg`<path d="M${tankX + tankW / 2 - 18} ${tankY + tankH - 10} q0 -34 18 -34 q18 0 18 34" fill="none" stroke="#9aa3c0" stroke-width="6" stroke-linecap="round" data-testid="hero-heater-arc" />`}

              ${ready ? svg`<text class="tank-readout" x="${tankX + tankW / 2}" y="${tankY + tankH / 2 + 7}" text-anchor="middle">${Math.round(ready.liters)} L</text>` : nothing}
              ${ready ? svg`<text class="tank-caption" x="${tankX + tankW / 2}" y="${tankY + tankH / 2 + 22}" text-anchor="middle">${t('boiler.tank.ready_caption', lang)}</text>` : nothing}

              ${topT != null ? svg`
                <g class="tank-badge" data-testid="hero-tank-temp-top">
                  <rect x="${tankX + tankW - 4}" y="${tankY + 8}" width="44" height="20" rx="6" />
                  <text x="${tankX + tankW + 18}" y="${tankY + 22}" text-anchor="middle" fill="#ffb46b">${Math.round(topT)}°C</text>
                </g>
              ` : nothing}
              ${botT != null ? svg`
                <g class="tank-badge" data-testid="hero-tank-temp-bottom">
                  <rect x="${tankX + tankW - 4}" y="${tankY + tankH - 28}" width="44" height="20" rx="6" />
                  <text x="${tankX + tankW + 18}" y="${tankY + tankH - 14}" text-anchor="middle" fill="#8b93ad">${Math.round(botT)}°C</text>
                </g>
              ` : nothing}

              ${heaterPowerW != null ? svg`
                <text class="heater-label" x="${tankX + tankW / 2}" y="${tankY + tankH + 14}" text-anchor="middle" data-testid="hero-heater-power">${t('boiler.model.element', lang)} · ${(heaterPowerW / 1000).toFixed(1).replace('.', ',')}&nbsp;kW</text>
              ` : nothing}

              ${heatingDone ? svg`
                <text class="heater-label" x="${tankX + tankW / 2}" y="${tankY + tankH + 26}" text-anchor="middle" data-testid="hero-heating-done">${t('boiler.hero.heating_done_prefix', lang)} ${formatKwh(heatingDone.kwh)} - ${t('boiler.hero.done_at', lang)} ${hhmm(heatingDone.doneMs)}</text>
              ` : nothing}
            </g>

            <!-- RIGHT nodes (FIX-H3: 3-slot layout when drawMap present) -->
            ${drawsToday ? this._sourceNode({
              testid: 'hero-node-draws-today',
              x: rightX, y: drawsY, w: 170, h: 50,
              color: MOCK.water,
              title: t('boiler.hero.node_draws', lang),
              sub: `${Math.round(drawsToday.totalLiters)} L · špička ${drawsToday.peakTime} (${Math.round(drawsToday.peakLiters)} L)`,
              active: false,
              planned: false,
            }) : nothing}
            ${this._sourceNode({
              testid: 'hero-node-demand',
              x: rightX, y: demandY, w: 170, h: 50,
              color: MOCK.water,
              title: t('boiler.hero.node_next_demand', lang),
              sub: nextDemandWindow ? `${(Math.round(nextDemandWindow.p80Kwh * 10) / 10).toFixed(1).replace('.', ',')} kWh` : null,
              active: false,
              planned: nextDemandWindow != null,
            })}
            ${showCircNode ? this._sourceNode({
              testid: 'hero-node-circulation',
              x: rightX, y: circY, w: 170, h: 50,
              color: MOCK.idle,
              title: t('boiler.hero.node_circulation', lang),
              sub: legionellaLabel ?? (nextCirc ? `${nextCirc.start.substring(11, 16)}–${nextCirc.end.substring(11, 16)}` : null),
              active: circActiveNow,
              planned: nextCirc != null,
            }) : nothing}
          </svg>
        </div>
      </div>
    `;
  }

  private _nextHeatingLabel(slot: BoilerV2PlanSlot): string {
    const lang = this.lang;
    const kwh = slot.heatingKwh ?? null;
    if (kwh != null && kwh <= 0) {
      return t('boiler.hero.next_heating_dash', lang);
    }
    let label = `${hhmm(Date.parse(slot.start))} · ${sourceLabel(slot.recommendedSource, lang)}`;
    if (kwh != null && kwh > 0) label += ` · ${formatKwh(kwh)}`;
    if (slot.estimatedCostCzk != null) label += ` · ${formatCzk(slot.estimatedCostCzk)}`;
    return label;
  }

  private _gridNodeSub(gridKwhToday: number | null, nextGridSlot: BoilerV2PlanSlot | null): string | null {
    // FIX-H2: richer subtitle "ráno X kWh · plán HH:MM"
    const lang = this.lang;
    if (gridKwhToday != null && nextGridSlot != null) {
      const slotTime = hhmm(Date.parse(nextGridSlot.start));
      return `${formatKwh(gridKwhToday)} · ${t('boiler.hero.sub_plan', lang)} ${slotTime}`;
    }
    if (gridKwhToday != null) return `${t('boiler.hero.sub_morning', lang)} ${formatKwh(gridKwhToday)}`;
    if (nextGridSlot != null) {
      const slotTime = hhmm(Date.parse(nextGridSlot.start));
      return `${t('boiler.hero.sub_plan', lang)} ${slotTime}`;
    }
    return null;
  }

  private _batteryNodeSub(batteryKwh: number | null): string | null {
    // FIX-H2: "dnes X kWh" format
    const lang = this.lang;
    if (batteryKwh != null) return `${t('boiler.model.today', lang)} ${formatKwh(batteryKwh)}`;
    return null;
  }

  private _altNodeSub(altKwh: number | null, savingsVsAlt: number | null): string | null {
    // FIX-H2: "dnes X kWh · dráž než spot" or just "dnes X kWh"
    const lang = this.lang;
    if (altKwh != null && savingsVsAlt != null && savingsVsAlt < 0) {
      return `${t('boiler.model.today', lang)} ${formatKwh(altKwh)} · ${t('boiler.hero.sub_pricier_than_spot', lang)}`;
    }
    if (altKwh != null) return `${t('boiler.model.today', lang)} ${formatKwh(altKwh)}`;
    return null;
  }

  private _fveNodeSub(batterySocPct: number | null, fveActive: boolean): string | null {
    // FIX-H2: "X W · baterie Y % — stav" format
    const lang = this.lang;
    const status = fveActive ? t('boiler.hero.sub_active', lang) : t('boiler.hero.sub_waiting', lang);
    if (batterySocPct != null) {
      return `${t('boiler.hero.node_battery', lang)} ${Math.round(batterySocPct)} % — ${status}`;
    }
    return status;
  }

  private _sourceNode(opts: {
    testid: string;
    x: number;
    y: number;
    w?: number;
    h?: number;
    color: string;
    title: string;
    sub: string | null;
    active: boolean;
    planned: boolean;
  }) {
    const w = opts.w ?? 138;
    const h = opts.h ?? 54;
    const opacity = opts.active ? 1 : opts.planned ? 0.85 : 0.55;
    const strokeWidth = opts.active ? 2.5 : opts.planned ? 1.5 : 1;
    const strokeDash = opts.planned && !opts.active ? '3 3' : 'none';
    return svg`
      <g data-testid="${opts.testid}" opacity="${opacity}">
        <rect x="${opts.x}" y="${opts.y}" width="${w}" height="${h}" rx="10"
          fill="${MOCK.card2}" stroke="${opts.color}" stroke-width="${strokeWidth}" stroke-dasharray="${strokeDash}" />
        <text x="${opts.x + 10}" y="${opts.y + 22}" font-size="12" font-weight="700" fill="${opts.color}">${opts.title}</text>
        ${opts.sub != null ? svg`<text x="${opts.x + 10}" y="${opts.y + 40}" font-size="10.5" fill="${MOCK.muted}">${opts.sub}</text>` : nothing}
      </g>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-boiler-hero-flow': OigBoilerHeroFlow;
  }
}
