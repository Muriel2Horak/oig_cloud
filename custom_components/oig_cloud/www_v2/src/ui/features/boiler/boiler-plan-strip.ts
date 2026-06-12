// ============================================================================
// 🗓️ Plán ohřevu 24 h — horizontal plan strip (F4 boiler planner V3)
// ============================================================================
//
// Component: oig-boiler-plan-strip
// Renders a 24-hour horizontal strip showing:
//   - Source bands above the axis (fve/grid/battery/alternative) with gradients
//   - Demand draws below the axis (from demand_map.slots_p80)
//   - Predicted temperature curve (from plan_slots.predicted_top_temp_c)
//   - Circulation ticks (from circulation_runs)
//   - NOW white line + pojistka blue dashed line
//   - Time axis 00..24 every 3h + legend row
// ============================================================================

import { LitElement, html, css, nothing, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import type {
  BoilerV2PlanSlot,
  DemandMapData,
  CirculationRun,
  LegionellaStatus,
  PlanSummary,
} from './types';
import { t, type Lang } from '@/i18n/boiler';
import { altTypeLabel } from './boiler-energy-today';

const u = unsafeCSS;

// ============================================================================
// Pure helper types + functions — exported for unit tests
// ============================================================================

export interface PlanBand {
  /** 0..1 relative start on the 24h axis */
  xStart: number;
  /** 0..1 relative end on the 24h axis */
  xEnd: number;
  /** canonical source key */
  source: 'fve' | 'grid' | 'battery' | 'alternative';
  /** whether any slot in band has purpose === 'legionella' */
  hasLegionella: boolean;
  /** total heating kWh across slots (for tooltip) */
  heatingKwh: number;
  /** first slot start ISO (for positioning math) */
  startIso: string;
  /** last slot end ISO */
  endIso: string;
}

/** Source keys that represent heating activity */
const HEATING_SOURCES = new Set(['fve', 'grid', 'battery', 'alternative']);

/**
 * Normalize raw recommended_source strings to one of the 4 canonical display keys.
 * Returns null if the source is not a heating source.
 */
export function normalizeDisplaySource(raw: string | null | undefined): 'fve' | 'grid' | 'battery' | 'alternative' | null {
  if (!raw) return null;
  const s = raw.toLowerCase();
  if (s === 'fve' || s === 'overflow' || s === 'pv') return 'fve';
  if (s === 'grid') return 'grid';
  if (s === 'battery' || s === 'discharge') return 'battery';
  if (s === 'alternative' || s === 'alt') return 'alternative';
  return null;
}

/**
 * Compute the epoch ms of local midnight (00:00:00.000) on the calendar day
 * that contains `planStartIso`.  This is the axis origin for the 00–24 labels.
 *
 * Example: planStartIso = "2026-06-11T10:00:00+02:00" → midnight of 2026-06-11
 * in the local timezone = "2026-06-11T00:00:00" local.
 */
export function planMidnightMs(planStartIso: string): number {
  const d = new Date(planStartIso);
  // Use local calendar date
  const midnight = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0);
  return midnight.getTime();
}

/**
 * Given an ISO string and a plan horizon start (also ISO), compute a 0..1 fraction
 * on the 24-hour axis.  The axis origin is LOCAL MIDNIGHT of the calendar day
 * containing `planStartIso`, matching the 00–24 hard-coded axis labels.
 */
export function isoToFraction(isoStr: string, planStartIso: string): number {
  const t0 = planMidnightMs(planStartIso);
  const t1 = new Date(isoStr).getTime();
  const span = 24 * 3600 * 1000;
  return Math.max(0, Math.min(1, (t1 - t0) / span));
}

/**
 * Group contiguous plan slots (heating_kwh > 0) with the same recommended_source
 * into PlanBand objects.  Slots are assumed sorted by start time (as they come from
 * the BE).  Legionella-purpose slots contribute the hasLegionella flag to their band.
 */
export function groupSlotsToBands(
  slots: BoilerV2PlanSlot[],
  planStartIso: string,
): PlanBand[] {
  const bands: PlanBand[] = [];
  let current: PlanBand | null = null;

  for (const slot of slots) {
    const heatingKwh = slot.heatingKwh ?? 0;
    if (heatingKwh <= 0) {
      if (current) { bands.push(current); current = null; }
      continue;
    }

    const displaySrc = normalizeDisplaySource(slot.recommendedSource);
    if (!displaySrc || !HEATING_SOURCES.has(displaySrc)) {
      if (current) { bands.push(current); current = null; }
      continue;
    }

    const isLeg = slot.purpose === 'legionella';

    if (current && current.source === displaySrc) {
      // Extend existing band
      current.xEnd = isoToFraction(slot.end, planStartIso);
      current.endIso = slot.end;
      current.heatingKwh += heatingKwh;
      if (isLeg) current.hasLegionella = true;
    } else {
      if (current) bands.push(current);
      current = {
        xStart: isoToFraction(slot.start, planStartIso),
        xEnd: isoToFraction(slot.end, planStartIso),
        source: displaySrc,
        hasLegionella: isLeg,
        heatingKwh,
        startIso: slot.start,
        endIso: slot.end,
      };
    }
  }
  if (current) bands.push(current);
  return bands;
}

/**
 * Compute NOW-line position as a 0..1 fraction on the midnight-anchored 24h axis.
 * Returns null if now is outside the plan horizon (i.e. outside midnight..midnight+24h).
 */
export function nowFraction(planStartIso: string, nowMs?: number): number | null {
  const ms = nowMs ?? Date.now();
  const t0 = planMidnightMs(planStartIso);
  const span = 24 * 3600 * 1000;
  const f = (ms - t0) / span;
  if (f < 0 || f > 1) return null;
  return f;
}

/**
 * Compute the deadline-line fraction on the midnight-anchored 24h axis.
 * `deadlineTime` is "HH:MM" (local wall clock).
 * Fraction = (hh*60+mm) / (24*60).  No wrap needed since the axis always
 * covers exactly midnight to midnight+24h.
 */
export function deadlineFraction(planStartIso: string, deadlineTime: string): number | null {
  if (!deadlineTime || !deadlineTime.includes(':')) return null;
  const [hh, mm] = deadlineTime.split(':').map(Number);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;

  // Build the deadline timestamp at the given HH:MM on the same local calendar
  // day as planStartIso (midnight anchor).
  const t0 = planMidnightMs(planStartIso);
  const d = new Date(t0);
  d.setHours(hh, mm, 0, 0);
  let tDeadline = d.getTime();
  // If the deadline is before midnight (shouldn't happen for valid HH:MM but
  // guard anyway), treat as same-day.  If it falls past the 24h window, clamp.
  const span = 24 * 3600 * 1000;
  const f = (tDeadline - t0) / span;
  if (f < 0 || f > 1.0001) return null;
  return Math.min(1, f);
}

// ============================================================================
// Source visual config
// ============================================================================

interface SourceVisual {
  gradStart: string;
  gradEnd: string;
  legendColor: string;
  textColor: string;
}

const SOURCE_VISUAL: Record<string, SourceVisual> = {
  fve:         { gradStart: '#ffd54f', gradEnd: '#ffa726', legendColor: '#ffa726', textColor: '#101a10' },
  grid:        { gradStart: '#4fc3f7', gradEnd: '#2196f3', legendColor: '#2196f3', textColor: '#062033' },
  battery:     { gradStart: '#b39ddb', gradEnd: '#7e57c2', legendColor: '#7e57c2', textColor: '#1c1430' },
  alternative: { gradStart: '#ff8a65', gradEnd: '#e64a19', legendColor: '#e64a19', textColor: '#2b0d05' },
};

// ============================================================================
// Component
// ============================================================================

@customElement('oig-boiler-plan-strip')
export class OigBoilerPlanStrip extends LitElement {
  @property({ attribute: false }) slots: BoilerV2PlanSlot[] = [];
  @property({ attribute: false }) demandMap: DemandMapData | null = null;
  @property({ attribute: false }) circulationRuns: CirculationRun[] = [];
  @property({ attribute: false }) legionella: LegionellaStatus | null = null;
  @property({ attribute: false }) planSummary: PlanSummary | null = null;
  @property({ type: String }) lang: Lang = 'cs';
  /** F5/Task C: alt source type for dynamic legend/band labels (e.g. "gas", "heat_pump") */
  @property({ type: String }) altSourceType: string | null = null;

  static styles = css`
    :host { display: block; }

    .card {
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      padding: 14px 16px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
    }

    .heading {
      font-size: 13px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
      margin: 0 0 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .heading .meta {
      font-size: 10.5px;
      opacity: 0.55;
      font-weight: 400;
    }

    .empty {
      color: ${u(CSS_VARS.textSecondary)};
      padding: 24px 0;
      text-align: center;
      font-size: 13px;
    }

    /* Timeline container: position:relative, fixed height 170px */
    .tl {
      position: relative;
      height: 170px;
      margin: 6px 0 2px;
      overflow: visible;
    }

    /* Axis line */
    .tl .axis {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 38px;
      height: 1px;
      background: rgba(255,255,255,0.18);
    }

    /* Source band */
    .band {
      position: absolute;
      bottom: 39px;
      height: 34px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9.5px;
      font-weight: 700;
      overflow: hidden;
      white-space: nowrap;
      box-sizing: border-box;
    }

    .band.legionella-border {
      outline: 1.5px solid rgba(255,255,255,0.45);
      outline-offset: -1px;
    }

    /* Demand draw (below axis) */
    .draw {
      position: absolute;
      bottom: 9px;
      border-radius: 0 0 3px 3px;
      background: linear-gradient(180deg, #ef9a9a, #e53935);
      min-height: 2px;
    }

    /* Temp SVG */
    .temp-svg {
      position: absolute;
      left: 0;
      right: 0;
      top: 8px;
      height: 84px;
      width: 100%;
    }

    /* Circulation tick */
    .circ {
      position: absolute;
      top: 120px;
      font-size: 11px;
      cursor: default;
    }

    /* NOW line */
    .nowl {
      position: absolute;
      top: 0;
      bottom: 24px;
      width: 2px;
      background: #fff;
      opacity: 0.85;
    }

    .nowl::after {
      content: attr(data-label);
      position: absolute;
      top: -2px;
      left: 5px;
      font-size: 9px;
      font-weight: 700;
      opacity: 0.9;
      color: #fff;
    }

    /* Deadline line */
    .dline {
      position: absolute;
      top: 0;
      bottom: 24px;
      width: 2px;
      background: #29b6f6;
      opacity: 0.6;
    }

    .dline::after {
      content: attr(data-label);
      position: absolute;
      top: -2px;
      left: 5px;
      font-size: 9px;
      color: #81d4fa;
      white-space: nowrap;
    }

    /* Legionella standalone marker */
    .leg-marker {
      position: absolute;
      bottom: 39px;
      font-size: 11px;
      transform: translateX(-50%);
      cursor: default;
    }

    /* Time axis row */
    .tlx {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      opacity: 0.5;
      color: ${u(CSS_VARS.textPrimary)};
    }

    /* Legend row */
    .leg {
      display: flex;
      gap: 12px;
      font-size: 10px;
      opacity: 0.85;
      margin-top: 8px;
      flex-wrap: wrap;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .leg span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .dot {
      width: 9px;
      height: 9px;
      border-radius: 2px;
      display: inline-block;
      flex-shrink: 0;
    }
  `;

  render() {
    const lang = this.lang;

    // Empty state: no slots
    if (!this.slots || this.slots.length === 0) {
      return html`
        <div class="card" data-testid="boiler-plan-strip">
          <div class="heading">
            🗓️ ${t('boiler.plan_strip.heading', lang)}
            <span class="meta">${t('boiler.plan_strip.meta', lang)}</span>
          </div>
          <div class="empty">${t('boiler.plan_strip.empty', lang)}</div>
        </div>
      `;
    }

    // Plan horizon: use first slot start as t0 (24h window)
    const planStartIso = this.slots[0].start;

    // Group slots → bands
    const bands = groupSlotsToBands(this.slots, planStartIso);

    // Demand draws: from demandMap.slotsP80 (96 slots), skip < 0.05
    const drawItems = this._buildDrawItems(planStartIso);

    // Temperature curve points
    const tempPoints = this._buildTempCurve(planStartIso);

    // NOW and deadline
    const nowFrac = nowFraction(planStartIso);
    // Config may store HH:MM:SS — display as HH:MM (parsing handles both).
    const deadlineRaw = this.planSummary?.deadlineTime ?? null;
    const deadlineStr = deadlineRaw ? deadlineRaw.slice(0, 5) : null;
    const deadlineFrac = deadlineStr ? deadlineFraction(planStartIso, deadlineRaw!) : null;

    // Legionella standalone marker (scheduled_start outside heat bands)
    const legMarkerFrac = this._legionellaStandaloneMarker(planStartIso, bands);

    // Which sources are present in bands (for legend)
    const presentSources = new Set(bands.map(b => b.source));
    const hasDraws = drawItems.length > 0;
    const hasCirc = this.circulationRuns.length > 0;
    const hasTempCurve = tempPoints.length > 1;

    return html`
      <div class="card" data-testid="boiler-plan-strip">
        <div class="heading">
          🗓️ ${t('boiler.plan_strip.heading', lang)}
          <span class="meta">${t('boiler.plan_strip.meta', lang)}</span>
        </div>

        <div class="tl" data-testid="plan-strip-tl">
          <!-- Temperature SVG curve -->
          ${hasTempCurve ? this._renderTempSvg(tempPoints, lang) : nothing}

          <!-- Axis line -->
          <div class="axis"></div>

          <!-- Source bands -->
          ${bands.map(b => this._renderBand(b, lang))}

          <!-- Demand draws (below axis) -->
          ${drawItems.map(d => this._renderDraw(d))}

          <!-- Circulation ticks -->
          ${this.circulationRuns.map(r => this._renderCircTick(r, planStartIso, lang))}

          <!-- Legionella standalone marker -->
          ${legMarkerFrac !== null ? html`
            <div class="leg-marker" style="left:${(legMarkerFrac * 100).toFixed(2)}%" title="🦠 Legionella">🦠</div>
          ` : nothing}

          <!-- NOW line -->
          ${nowFrac !== null ? html`
            <div class="nowl"
              style="left:${(nowFrac * 100).toFixed(2)}%"
              data-label="${t('boiler.plan_strip.now_label', lang)}"
              data-testid="plan-strip-now-line">
            </div>
          ` : nothing}

          <!-- Deadline line -->
          ${deadlineFrac !== null ? html`
            <div class="dline"
              style="left:${(deadlineFrac * 100).toFixed(2)}%"
              data-label="${t('boiler.plan_strip.deadline_label', lang)} ${deadlineStr}"
              data-testid="plan-strip-deadline-line">
            </div>
          ` : nothing}
        </div>

        <!-- Time axis -->
        <div class="tlx" data-testid="plan-strip-time-axis">
          <span>00</span><span>03</span><span>06</span><span>09</span>
          <span>12</span><span>15</span><span>18</span><span>21</span>
          <span>24</span>
        </div>

        <!-- Legend -->
        <div class="leg" data-testid="plan-strip-legend">
          ${((['fve', 'grid', 'battery', 'alternative'] as const).filter(s => presentSources.has(s))).map(s => html`
            <span>
              <i class="dot" style="background:${SOURCE_VISUAL[s].legendColor}"></i>
              ${this._sourceLegendLabel(s, lang)}
            </span>
          `)}
          ${hasDraws ? html`
            <span>
              <i class="dot" style="background:#e53935"></i>
              ${t('boiler.plan_strip.legend_demands', lang)}
            </span>
          ` : nothing}
          ${hasCirc ? html`
            <span>${t('boiler.plan_strip.legend_circ', lang)}</span>
          ` : nothing}
        </div>
      </div>
    `;
  }

  // --------------------------------------------------------------------------
  // Private render helpers
  // --------------------------------------------------------------------------

  private _renderBand(band: PlanBand, lang: Lang) {
    const vis = SOURCE_VISUAL[band.source] ?? SOURCE_VISUAL.fve;
    const left = (band.xStart * 100).toFixed(2);
    const width = ((band.xEnd - band.xStart) * 100).toFixed(2);
    const widthPx = (band.xEnd - band.xStart) * 100; // % as a numeric proxy for "wide enough"
    const showLabel = widthPx >= 6; // only label bands wide enough (>= 6% of track)

    const label = band.hasLegionella
      ? t('boiler.plan_strip.source_legionella', lang)
      : this._sourceBandLabel(band.source, lang);

    const tooltip = `${label} · ${band.heatingKwh.toFixed(2)} kWh`;

    const testId = `plan-band-${band.source}${band.hasLegionella ? '-legionella' : ''}`;
    return html`
      <div class="band ${band.hasLegionella ? 'legionella-border' : ''}"
        style="left:${left}%;width:${width}%;background:linear-gradient(180deg,${vis.gradStart},${vis.gradEnd});color:${vis.textColor}"
        title="${tooltip}"
        data-source="${band.source}"
        data-legionella="${band.hasLegionella}"
        data-testid="${testId}">
        ${showLabel ? label : nothing}
      </div>
    `;
  }

  private _renderDraw(item: { frac: number; heightPct: number; kwh: number }) {
    const left = (item.frac * 100).toFixed(2);
    const DRAW_ZONE_PX = 29; // px from bottom: 38 (axis offset) - 9 (draw bottom) = 29px zone
    const h = Math.max(2, Math.round(item.heightPct * DRAW_ZONE_PX));
    const DRAW_WIDTH = 0.9; // percent per 15-min slot
    return html`
      <div class="draw"
        style="left:${left}%;width:${DRAW_WIDTH}%;height:${h}px"
        title="${item.kwh.toFixed(2)} kWh">
      </div>
    `;
  }

  private _renderCircTick(run: CirculationRun, planStartIso: string, lang: Lang) {
    const frac = isoToFraction(run.start, planStartIso);
    if (frac < 0 || frac > 1) return nothing;
    const left = (frac * 100).toFixed(2);
    const endFrac = isoToFraction(run.end, planStartIso);
    const endFracPct = (endFrac * 100).toFixed(2);
    const tip = `${t('boiler.plan_strip.circ_tooltip', lang)} ${_isoToHhmm(run.start)}–${_isoToHhmm(run.end)}`;
    return html`
      <div class="circ"
        style="left:${left}%"
        title="${tip}"
        data-testid="plan-strip-circ"
        data-end-frac="${endFracPct}">
        💧
      </div>
    `;
  }

  private _renderTempSvg(points: Array<{ frac: number; temp: number }>, lang: Lang) {
    if (points.length < 2) return nothing;

    const W = 960;
    const H = 84;

    const minTemp = Math.min(...points.map(p => p.temp));
    const maxTemp = Math.max(...points.map(p => p.temp));
    const tempRange = maxTemp - minTemp || 1;

    const toX = (f: number) => f * W;
    const toY = (t: number) => H - ((t - minTemp) / tempRange) * (H - 16) - 8;

    const d = points
      .map((p, i) => `${i === 0 ? 'M' : 'L'}${toX(p.frac).toFixed(1)},${toY(p.temp).toFixed(1)}`)
      .join(' ');

    return html`
      <svg class="temp-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none"
        data-testid="plan-strip-temp-svg"
        aria-hidden="true">
        <path d="${d}" fill="none" stroke="#ffca5a" stroke-width="2.5" opacity="0.9"/>
        <text x="6" y="12" fill="#ffca5a" font-size="10" font-family="system-ui,sans-serif">
          ${t('boiler.plan_strip.temp_zone_label', lang)}
        </text>
      </svg>
    `;
  }

  // --------------------------------------------------------------------------
  // Private data helpers
  // --------------------------------------------------------------------------

  private _buildDrawItems(planStartIso: string): Array<{ frac: number; heightPct: number; kwh: number }> {
    const dm = this.demandMap;
    if (!dm) return [];

    const p80 = dm.slotsP80;
    if (!p80 || p80.length === 0) return [];

    const maxKwh = Math.max(...p80, 0.001);
    const slotDur = dm.slotDurationMin || 15;
    // demand_map.slots_p80 is midnight-anchored (slot 0 = 00:00 local,
    // slot i = i * slotDur minutes from midnight).  Use the same midnight
    // anchor as the axis so draws align correctly.
    const t0 = planMidnightMs(planStartIso);

    return p80
      .map((kwh, i) => {
        if (kwh < 0.05) return null;
        const slotStartMs = t0 + i * slotDur * 60 * 1000;
        const frac = (slotStartMs - t0) / (24 * 3600 * 1000);
        if (frac < 0 || frac >= 1) return null;
        return {
          frac,
          heightPct: kwh / maxKwh,
          kwh,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null);
  }

  private _buildTempCurve(planStartIso: string): Array<{ frac: number; temp: number }> {
    const points: Array<{ frac: number; temp: number }> = [];
    for (const slot of this.slots) {
      const temp = slot.expectedTempTopC ?? null;
      if (temp == null || !Number.isFinite(temp)) continue;
      const frac = isoToFraction(slot.start, planStartIso);
      points.push({ frac, temp });
    }
    return points;
  }

  private _legionellaStandaloneMarker(
    planStartIso: string,
    bands: PlanBand[],
  ): number | null {
    const leg = this.legionella;
    if (!leg?.scheduledStart) return null;
    const frac = isoToFraction(leg.scheduledStart, planStartIso);
    if (frac < 0 || frac > 1) return null;
    // Only show if not already covered by a band with hasLegionella
    const covered = bands.some(b => b.hasLegionella && frac >= b.xStart && frac <= b.xEnd);
    if (covered) return null;
    return frac;
  }

  private _sourceBandLabel(source: string, lang: Lang): string {
    switch (source) {
      case 'fve': return t('boiler.plan_strip.source_overflow', lang);
      case 'grid': return t('boiler.plan_strip.source_grid', lang);
      case 'battery': return t('boiler.plan_strip.source_battery', lang);
      // F5/Task C: use dynamic alt type label when available
      case 'alternative': return altTypeLabel(this.altSourceType, lang);
      default: return source;
    }
  }

  private _sourceLegendLabel(source: string, lang: Lang): string {
    switch (source) {
      case 'fve': return t('boiler.plan_strip.legend_overflow', lang);
      case 'grid': return t('boiler.plan_strip.legend_grid', lang);
      case 'battery': return t('boiler.plan_strip.legend_battery', lang);
      // F5/Task C: use dynamic alt type label for legend
      case 'alternative': return altTypeLabel(this.altSourceType, lang);
      default: return source;
    }
  }
}

// --------------------------------------------------------------------------
// Small utility: ISO → "HH:MM"
// --------------------------------------------------------------------------
function _isoToHhmm(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// ============================================================================
// TagName declaration
// ============================================================================

declare global {
  interface HTMLElementTagNameMap {
    'oig-boiler-plan-strip': OigBoilerPlanStrip;
  }
}
