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
      border-radius: 14px;
      padding: 14px 16px 18px;
      box-shadow: 0 6px 18px rgba(0,0,0,.35);
    }

    /* ── KPI strip ── */
    .kpi-strip {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      margin-bottom: 12px;
    }
    .kpi {
      flex: 1;
      min-width: 110px;
      background: rgba(255,255,255,.04);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 10px;
      padding: 7px 10px;
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
    }
    .kpi b { display: block; color: ${u(CSS_VARS.textPrimary)}; font-size: 14px; margin-top: 2px; }
    .est-badge {
      display: inline-block;
      margin-left: 6px;
      font-size: 9px;
      font-weight: 700;
      color: #ffd17c;
      background: rgba(255,152,0,.16);
      border: 1px solid rgba(255,152,0,.35);
      border-radius: 5px;
      padding: 1px 5px;
      vertical-align: middle;
    }

    /* ── Flow body ── */
    .flow-body { width: 100%; }
    svg.flow-svg { display: block; width: 100%; height: auto; }

    .node rect { fill: rgba(255,255,255,.05); stroke: rgba(255,255,255,.12); }
    .node text { fill: ${u(CSS_VARS.textPrimary)}; }
    .node .node-label { font-size: 11px; font-weight: 700; }
    .node .node-sub { font-size: 9.5px; fill: ${u(CSS_VARS.textSecondary)}; }
    .node.inactive { opacity: .38; }
    .node.active rect { stroke: #5ec98a; filter: drop-shadow(0 0 6px rgba(94,201,138,.5)); }
    .node.planned rect { stroke: #ffb300; stroke-dasharray: 3 3; }

    .connector { fill: none; stroke: rgba(255,255,255,.18); stroke-width: 2.5; stroke-linecap: round; }
    .connector.connector-active { stroke: #5ec98a; stroke-width: 3.5; stroke-dasharray: 6 5; }
    .connector.connector-planned { stroke: #ffb300; stroke-width: 3; stroke-dasharray: 4 5; }
    .connector-anim { animation: hero-dash 1s linear infinite; }
    @keyframes hero-dash { to { stroke-dashoffset: -22; } }

    .tank-readout { font-size: 20px; font-weight: 800; fill: ${u(CSS_VARS.textPrimary)}; }
    .tank-sub { font-size: 9.5px; fill: ${u(CSS_VARS.textSecondary)}; }
    .tank-badge rect { fill: rgba(10,14,19,.7); stroke: rgba(255,255,255,.12); }
    .tank-badge text { fill: ${u(CSS_VARS.textPrimary)}; font-size: 11px; font-weight: 700; }
    .heater-label { font-size: 9.5px; fill: ${u(CSS_VARS.textSecondary)}; }
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
      ? altTypeLabel(this.altSourceType, lang)
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
        cls.push('connector-active');
        if (!reduceMotion) cls.push('connector-anim');
      } else if (planned) {
        cls.push('connector-planned');
      }
      return cls.join(' ');
    };

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
              <b>${hhmm(Date.parse(nextSlot.start))} · ${sourceLabel(nextSlot.recommendedSource, lang)}${nextSlot.heatingKwh != null ? html` · ${formatKwh(nextSlot.heatingKwh)}` : nothing}${nextSlot.estimatedCostCzk != null ? html` · ${formatCzk(nextSlot.estimatedCostCzk)}` : nothing}</b>
            </div>
          ` : nothing}

          <div class="kpi" data-testid="hero-kpi-mode">
            <span>${t('boiler.hero.kpi_mode', lang)}</span>
            <b>${modeLabel}</b>
          </div>
        </div>

        <div class="flow-body" data-testid="hero-flow-body">
          <svg class="flow-svg" viewBox="0 0 900 320" preserveAspectRatio="xMidYMid meet" role="img">
            <!-- connectors, left -->
            ${svg`<path class=${connectorCls(fveActive, fvePlanned)} d="M170 40 L380 130" />`}
            ${svg`<path class=${connectorCls(gridActive, nextGridSlot != null)} d="M170 130 L380 150" />`}
            ${svg`<path class=${connectorCls(batteryActive, batteryPlanned)} d="M170 220 L380 170" />`}
            ${showAlt ? svg`<path class=${connectorCls(activity?.state === 'charging_alt', hasAltSlot)} d="M170 290 L380 190" />` : nothing}

            <!-- connectors, right -->
            ${svg`<path class=${connectorCls(false, nextDemandWindow != null)} d="M520 150 L730 110" />`}
            ${showCircNode ? svg`<path class=${connectorCls(circActiveNow, nextCirc != null)} d="M520 170 L730 220" />` : nothing}

            <!-- LEFT nodes -->
            <g class="node ${fveActive ? 'active' : fvePlanned ? 'planned' : 'inactive'}" data-testid="hero-node-fve">
              <rect x="40" y="16" width="130" height="48" rx="10" />
              <text class="node-label" x="105" y="36" text-anchor="middle">${t('boiler.energy_today.source_fve', lang)}</text>
              ${this.homeBatterySocPct != null ? svg`<text class="node-sub" x="105" y="52" text-anchor="middle">${Math.round(this.homeBatterySocPct)}&#37;</text>` : nothing}
            </g>

            <g class="node ${gridActive ? 'active' : nextGridSlot ? 'planned' : 'inactive'}" data-testid="hero-node-grid">
              <rect x="40" y="106" width="130" height="48" rx="10" />
              <text class="node-label" x="105" y="126" text-anchor="middle">${t('boiler.energy_today.source_grid', lang)}</text>
              ${gridKwhToday != null || nextGridSlot != null ? svg`<text class="node-sub" x="105" y="142" text-anchor="middle">${gridKwhToday != null ? formatKwh(gridKwhToday) : ''}${gridKwhToday != null && nextGridSlot ? ' · ' : ''}${nextGridSlot?.heatingKwh != null ? `+${formatKwh(nextGridSlot.heatingKwh)}` : ''}</text>` : nothing}
            </g>

            <g class="node ${batteryActive ? 'active' : batteryPlanned ? 'planned' : 'inactive'}" data-testid="hero-node-battery">
              <rect x="40" y="196" width="130" height="48" rx="10" />
              <text class="node-label" x="105" y="216" text-anchor="middle">${t('boiler.plan.src_battery', lang)}</text>
              ${this.homeBatterySocPct != null ? svg`<text class="node-sub" x="105" y="232" text-anchor="middle">${Math.round(this.homeBatterySocPct)}&#37;</text>` : nothing}
            </g>

            ${showAlt ? svg`
              <g class="node ${activity?.state === 'charging_alt' ? 'active' : 'planned'}" data-testid="hero-node-alt">
                <rect x="40" y="266" width="130" height="48" rx="10" />
                <text class="node-label" x="105" y="292" text-anchor="middle">${altTypeLabel(this.altSourceType, lang)}</text>
              </g>
            ` : nothing}

            <!-- CENTER tank -->
            <g data-testid="hero-node-tank">
              <rect x="390" y="60" width="120" height="200" rx="24" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.14)" />
              <defs>
                <linearGradient id="hero-water" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0" stop-color=${botColor}/>
                  <stop offset="1" stop-color=${topColor}/>
                </linearGradient>
              </defs>
              <rect x="398" y="68" width="104" height="184" rx="18" fill="url(#hero-water)" opacity=".55" />
              ${readyPct != null ? svg`<rect x="398" y=${68 + (readyPct / 100) * 184} width="104" height="2" fill="#fff" opacity=".55" />` : nothing}

              ${ready ? svg`<text class="tank-readout" x="450" y="150" text-anchor="middle">${Math.round(ready.liters)} L</text>` : nothing}

              ${topT != null ? svg`
                <g class="tank-badge" data-testid="hero-tank-temp-top">
                  <rect x="502" y="66" width="44" height="20" rx="6" />
                  <text x="524" y="80" text-anchor="middle">${Math.round(topT)}&nbsp;°C</text>
                </g>
              ` : nothing}
              ${botT != null ? svg`
                <g class="tank-badge" data-testid="hero-tank-temp-bottom">
                  <rect x="502" y="234" width="44" height="20" rx="6" />
                  <text x="524" y="248" text-anchor="middle">${Math.round(botT)}&nbsp;°C</text>
                </g>
              ` : nothing}

              ${heaterPowerW != null ? svg`
                <text class="heater-label" x="450" y="185" text-anchor="middle" data-testid="hero-heater-power">${t('boiler.model.element', lang)} · ${(heaterPowerW / 1000).toFixed(1)}&nbsp;kW</text>
              ` : nothing}

              ${heatingDone ? svg`
                <text class="heater-label" x="450" y="278" text-anchor="middle" data-testid="hero-heating-done">${t('boiler.hero.heating_done_prefix', lang)} ${formatKwh(heatingDone.kwh)} - ${t('boiler.hero.done_at', lang)} ${hhmm(heatingDone.doneMs)}</text>
              ` : nothing}
            </g>

            <!-- RIGHT nodes -->
            <g class="node ${nextDemandWindow ? 'planned' : 'inactive'}" data-testid="hero-node-demand">
              <rect x="730" y="86" width="140" height="48" rx="10" />
              <text class="node-label" x="800" y="106" text-anchor="middle">${t('boiler.hero.node_demand', lang)}</text>
              ${nextDemandWindow ? svg`<text class="node-sub" x="800" y="122" text-anchor="middle">${Math.round(nextDemandWindow.p80Kwh * 10) / 10}&nbsp;kWh</text>` : nothing}
            </g>

            ${showCircNode ? svg`
              <g class="node ${circActiveNow ? 'active' : nextCirc ? 'planned' : 'inactive'}" data-testid="hero-node-circulation">
                <rect x="730" y="196" width="140" height="48" rx="10" />
                <text class="node-label" x="800" y="216" text-anchor="middle">${t('boiler.plan.circulation', lang)}</text>
                ${legionellaLabel != null ? svg`<text class="node-sub" x="800" y="232" text-anchor="middle">${legionellaLabel}</text>` : nothing}
              </g>
            ` : nothing}
          </svg>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-boiler-hero-flow': OigBoilerHeroFlow;
  }
}
