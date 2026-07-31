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

    .connector { fill: none; stroke: ${u(MOCK.line)}; stroke-width: 2.5; stroke-linecap: round; }
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

    // Node geometry
    const nodeW = 138;
    const nodeH = 54;
    const leftX = 36;
    const rightX = 726;
    const tankX = 380;
    const tankY = 40;
    const tankW = 140;
    const tankH = 200;

    const fveY = 18;
    const gridY = 86;
    const batteryY = 154;
    const altY = 222;
    const demandY = 70;
    const circY = 164;

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

            <!-- connectors, left -->
            ${svg`<path class=${connectorCls(fveActive, fvePlanned)} d="M${leftX + nodeW} ${fveY + nodeH / 2} C${tankX - 40} ${fveY + nodeH / 2}, ${tankX - 40} ${tankY + 55}, ${tankX} ${tankY + 55}" />`}
            ${svg`<path class=${connectorCls(gridActive, nextGridSlot != null)} d="M${leftX + nodeW} ${gridY + nodeH / 2} C${tankX - 40} ${gridY + nodeH / 2}, ${tankX - 40} ${tankY + tankH / 2}, ${tankX} ${tankY + tankH / 2}" />`}
            ${svg`<path class=${connectorCls(batteryActive, batteryPlanned)} d="M${leftX + nodeW} ${batteryY + nodeH / 2} C${tankX - 40} ${batteryY + nodeH / 2}, ${tankX - 40} ${tankY + tankH - 55}, ${tankX} ${tankY + tankH - 55}" />`}
            ${showAlt ? svg`<path class=${connectorCls(activity?.state === 'charging_alt', hasAltSlot)} d="M${leftX + nodeW} ${altY + nodeH / 2} C${tankX - 40} ${altY + nodeH / 2}, ${tankX - 40} ${tankY + tankH - 25}, ${tankX} ${tankY + tankH - 25}" />` : nothing}

            <!-- connectors, right -->
            ${svg`<path class=${connectorCls(false, nextDemandWindow != null)} d="M${tankX + tankW} ${tankY + 55} C${tankX + tankW + 40} ${tankY + 55}, ${tankX + tankW + 40} ${demandY + nodeH / 2}, ${rightX} ${demandY + nodeH / 2}" />`}
            ${showCircNode ? svg`<path class=${connectorCls(circActiveNow, nextCirc != null)} d="M${tankX + tankW} ${tankY + tankH - 55} C${tankX + tankW + 40} ${tankY + tankH - 55}, ${tankX + tankW + 40} ${circY + nodeH / 2}, ${rightX} ${circY + nodeH / 2}" />` : nothing}

            <!-- LEFT source nodes -->
            ${this._sourceNode({
              testid: 'hero-node-fve',
              x: leftX, y: fveY,
              color: srcColor('fve'),
              title: t('boiler.hero.node_fve', lang),
              sub: this.homeBatterySocPct != null ? `${Math.round(this.homeBatterySocPct)} %` : null,
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
              sub: this.homeBatterySocPct != null ? `${Math.round(this.homeBatterySocPct)} %` : null,
              active: batteryActive,
              planned: batteryPlanned,
            })}
            ${showAlt ? this._sourceNode({
              testid: 'hero-node-alt',
              x: leftX, y: altY,
              color: srcColor('alt'),
              title: cleanLabel(altTypeLabel(this.altSourceType, lang)),
              sub: null,
              active: activity?.state === 'charging_alt',
              planned: hasAltSlot,
            }) : nothing}

            <!-- CENTER tank -->
            <g data-testid="hero-node-tank">
              <rect class="tank-shell" x="${tankX}" y="${tankY}" width="${tankW}" height="${tankH}" rx="24" />
              <rect class="tank-inner" x="${tankX + 6}" y="${tankY + 6}" width="${tankW - 12}" height="${tankH - 12}" rx="18" />
              ${readyPct != null ? svg`<line class="tank-waterline" x1="${tankX + 6}" y1="${tankY + 6 + (readyPct / 100) * (tankH - 12)}" x2="${tankX + tankW - 6}" y2="${tankY + 6 + (readyPct / 100) * (tankH - 12)}" />` : nothing}

              ${ready ? svg`<text class="tank-readout" x="${tankX + tankW / 2}" y="${tankY + tankH / 2 + 7}" text-anchor="middle">${Math.round(ready.liters)} L</text>` : nothing}
              ${ready ? svg`<text class="tank-caption" x="${tankX + tankW / 2}" y="${tankY + tankH / 2 + 22}" text-anchor="middle">${t('boiler.tank.ready_caption', lang)}</text>` : nothing}

              ${topT != null ? svg`
                <g class="tank-badge" data-testid="hero-tank-temp-top">
                  <rect x="${tankX + tankW - 4}" y="${tankY + 8}" width="44" height="20" rx="6" />
                  <text x="${tankX + tankW + 18}" y="${tankY + 22}" text-anchor="middle">${Math.round(topT)}°C</text>
                </g>
              ` : nothing}
              ${botT != null ? svg`
                <g class="tank-badge" data-testid="hero-tank-temp-bottom">
                  <rect x="${tankX + tankW - 4}" y="${tankY + tankH - 28}" width="44" height="20" rx="6" />
                  <text x="${tankX + tankW + 18}" y="${tankY + tankH - 14}" text-anchor="middle">${Math.round(botT)}°C</text>
                </g>
              ` : nothing}

              ${heaterPowerW != null ? svg`
                <text class="heater-label" x="${tankX + tankW / 2}" y="${tankY + tankH + 14}" text-anchor="middle" data-testid="hero-heater-power">${t('boiler.model.element', lang)} · ${(heaterPowerW / 1000).toFixed(1).replace('.', ',')}&nbsp;kW</text>
              ` : nothing}

              ${heatingDone ? svg`
                <text class="heater-label" x="${tankX + tankW / 2}" y="${tankY + tankH + 26}" text-anchor="middle" data-testid="hero-heating-done">${t('boiler.hero.heating_done_prefix', lang)} ${formatKwh(heatingDone.kwh)} - ${t('boiler.hero.done_at', lang)} ${hhmm(heatingDone.doneMs)}</text>
              ` : nothing}
            </g>

            <!-- RIGHT nodes -->
            ${this._sourceNode({
              testid: 'hero-node-demand',
              x: rightX, y: demandY,
              color: MOCK.water,
              title: t('boiler.hero.node_next_demand', lang),
              sub: nextDemandWindow ? `${(Math.round(nextDemandWindow.p80Kwh * 10) / 10).toFixed(1).replace('.', ',')} kWh` : null,
              active: false,
              planned: nextDemandWindow != null,
            })}
            ${showCircNode ? this._sourceNode({
              testid: 'hero-node-circulation',
              x: rightX, y: circY,
              color: MOCK.water,
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
    if (gridKwhToday != null && nextGridSlot != null && nextGridSlot.heatingKwh != null && nextGridSlot.heatingKwh > 0) {
      return `${formatKwh(gridKwhToday)} · +${formatKwh(nextGridSlot.heatingKwh)}`;
    }
    if (gridKwhToday != null) return formatKwh(gridKwhToday);
    if (nextGridSlot != null && nextGridSlot.heatingKwh != null && nextGridSlot.heatingKwh > 0) {
      return `+${formatKwh(nextGridSlot.heatingKwh)}`;
    }
    return null;
  }

  private _sourceNode(opts: {
    testid: string;
    x: number;
    y: number;
    color: string;
    title: string;
    sub: string | null;
    active: boolean;
    planned: boolean;
  }) {
    const w = 138;
    const h = 54;
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
