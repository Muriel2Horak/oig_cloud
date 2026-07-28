import { LitElement, html, css, svg, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { BOILER_SOURCE_COLORS, type BoilerV2Data, type BoilerConfig, type BoilerV2PlanSlot, type BoilerV2SourceSegment, type BatteryForecastEntry } from './types';
import { t, sourceLabel, type Lang } from '@/i18n/boiler';

const u = unsafeCSS;

const VIEWBOX_W = 1000;
const VIEWBOX_H = 200;
const TEMP_MIN = 20;
const TEMP_MAX = 80;
const POWER_MAX_KW = 3;
const POWER_BASELINE_Y = 100;
const MINUTES_PER_DAY = 1440;
// Spot overlay: Ceny spot-price blue (src/ui/features/pricing/chart.ts buildSpotPriceDataset)
const SPOT_COLOR = '#2196F3';
// SoC curve: same cyan as boiler-soc-chart's COL.soc
const SOC_COLOR = '#22d3ee';
const SPOT_Y_TOP = 12;
const SPOT_Y_BOTTOM = VIEWBOX_H - 12;
const DEFAULT_CAPACITY_LITERS = 200;
// FVE overlay + overflow marker: amber, matches the existing FVE legend swatch
const FVE_COLOR = '#f5b800';
// FVE overlay shares the kWh band's vertical span with the charge/draw bars
// (0..POWER_BASELINE_Y going up) but scales to its own dynamic max — a distinct
// scale from POWER_MAX_KW, not the left liters/SoC axis.
const FVE_BAND_BASELINE_Y = POWER_BASELINE_Y;

export function resolveTimelineNowMs(nowOverrideMs?: number): number {
  return nowOverrideMs ?? Date.now();
}

export function minutesSinceMidnightInTimeZone(epochMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: 'numeric',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(epochMs));
  const h = parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10) % 24;
  const m = parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10);
  return h * 60 + m;
}

function formatISOWithOffset(epochMs: number, timeZone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date(epochMs));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '00';
  const y = get('year');
  const mo = get('month');
  const d = get('day');
  const hRaw = parseInt(get('hour'), 10) % 24;
  const mStr = get('minute');
  const sStr = get('second');
  const hPadded = String(hRaw).padStart(2, '0');
  const civilMs = Date.UTC(parseInt(y), parseInt(mo) - 1, parseInt(d), hRaw, parseInt(mStr), parseInt(sStr));
  const offsetMin = Math.round((civilMs - epochMs) / 60000);
  const sign = offsetMin >= 0 ? '+' : '-';
  const absMin = Math.abs(offsetMin);
  const oh = String(Math.floor(absMin / 60)).padStart(2, '0');
  const om = String(absMin % 60).padStart(2, '0');
  return `${y}-${mo}-${d}T${hPadded}:${mStr}:${sStr}${sign}${oh}:${om}`;
}

function xFromMinutes(minutes: number): number {
  return (minutes / MINUTES_PER_DAY) * VIEWBOX_W;
}

function formatX(x: number): string {
  return String(parseFloat(x.toFixed(3)));
}

function tempToY(tempC: number): number {
  const clamped = Math.max(TEMP_MIN, Math.min(TEMP_MAX, tempC));
  return ((TEMP_MAX - clamped) / (TEMP_MAX - TEMP_MIN)) * VIEWBOX_H;
}

function getDayStartMs(nowMs: number, timeZone: string): number {
  const minsIntoDay = minutesSinceMidnightInTimeZone(nowMs, timeZone);
  return nowMs - minsIntoDay * 60000;
}

function mergePlanSlots(slots: BoilerV2PlanSlot[]): BoilerV2PlanSlot[] {
  if (slots.length <= 1) return slots;
  const merged: BoilerV2PlanSlot[] = [];
  let current = { ...slots[0] };
  for (let i = 1; i < slots.length; i++) {
    const next = slots[i];
    const sameSource = current.recommendedSource === next.recommendedSource;
    const sameHeating = (current.heatingKwh != null ? current.heatingKwh > 0 : false) ===
      (next.heatingKwh != null ? next.heatingKwh > 0 : false);
    const contiguous = current.end === next.start;
    if (sameSource && sameHeating && contiguous) {
      current = { ...current, end: next.end };
    } else {
      merged.push(current);
      current = { ...next };
    }
  }
  merged.push(current);
  return merged;
}

function findBestSegment(
  timestampMs: number,
  segments: BoilerV2SourceSegment[],
  nowMs: number,
): BoilerV2SourceSegment | null {
  let best: BoilerV2SourceSegment | null = null;
  let bestStartMs = -Infinity;
  for (const seg of segments) {
    const segStartMs = Date.parse(seg.start);
    if (!isFinite(segStartMs)) continue;
    const segEndMs = seg.end !== null ? Date.parse(seg.end) : nowMs;
    if (!isFinite(segEndMs)) continue;
    if (segStartMs <= timestampMs && timestampMs <= segEndMs) {
      if (segStartMs > bestStartMs) {
        bestStartMs = segStartMs;
        best = seg;
      }
    }
  }
  return best;
}

function estimateSegmentPower(
  seg: BoilerV2SourceSegment,
  nowMs: number,
): number | null {
  const startMs = Date.parse(seg.start);
  const endMs = seg.end !== null ? Date.parse(seg.end) : nowMs;
  if (!isFinite(startMs) || !isFinite(endMs)) return null;
  const durationHours = (endMs - startMs) / 3600000;
  if (durationHours <= 0 || !isFinite(durationHours)) return null;
  if (!isFinite(seg.energyKwh) || seg.energyKwh < 0) return null;
  return seg.energyKwh / durationHours;
}

interface PlanBand {
  x1: number;
  x2: number;
  source: string | null;
  heating: boolean;
}

interface TempPoint {
  x: number;
  y: number;
}

interface PowerBar {
  x: number;
  barH: number;
  isCharge: boolean;
  isEstimated: boolean;
}

interface OverflowSlice {
  x: number;
  y: number;
  h: number;
}

interface SpotStep {
  x1: number;
  x2: number;
  y: number;
  price: number;
}

export interface SpotOverlay {
  steps: SpotStep[];
  min: number;
  max: number;
}

/**
 * Build the spot-price step overlay from plan slots. Prices are per-slot
 * constants, so each slot renders as a horizontal step (x1..x2 at one y).
 * Returns null when fewer than 2 slots carry a finite spotPrice — a lone
 * dash reads as noise, not a price curve.
 */
export function buildSpotSteps(
  slots: BoilerV2PlanSlot[],
  dayStartMs: number,
): SpotOverlay | null {
  const dayEndMs = dayStartMs + MINUTES_PER_DAY * 60000;
  const priced: Array<{ startMs: number; endMs: number; price: number }> = [];
  for (const slot of slots) {
    if (slot.spotPrice == null || !isFinite(slot.spotPrice)) continue;
    const startMs = Date.parse(slot.start);
    const endMs = Date.parse(slot.end);
    if (!isFinite(startMs) || !isFinite(endMs)) continue;
    if (endMs <= dayStartMs || startMs >= dayEndMs) continue;
    const clippedStart = Math.max(startMs, dayStartMs);
    const clippedEnd = Math.min(endMs, dayEndMs);
    if (clippedEnd <= clippedStart) continue;
    priced.push({ startMs: clippedStart, endMs: clippedEnd, price: slot.spotPrice });
  }
  if (priced.length < 2) return null;

  let min = Infinity;
  let max = -Infinity;
  for (const p of priced) {
    if (p.price < min) min = p.price;
    if (p.price > max) max = p.price;
  }
  const span = max - min;
  const priceToY = (price: number): number => {
    if (span <= 0) return (SPOT_Y_TOP + SPOT_Y_BOTTOM) / 2;
    return SPOT_Y_BOTTOM - ((price - min) / span) * (SPOT_Y_BOTTOM - SPOT_Y_TOP);
  };

  const steps: SpotStep[] = priced.map((p) => ({
    x1: xFromMinutes((p.startMs - dayStartMs) / 60000),
    x2: xFromMinutes((p.endMs - dayStartMs) / 60000),
    y: priceToY(p.price),
    price: p.price,
  }));
  return { steps, min, max };
}

export interface FveOverlayPoint {
  x: number;
  y: number;
  kw: number;
}

export interface FveOverlay {
  points: FveOverlayPoint[];
  maxKw: number;
  usedFallback: boolean;
}

/**
 * Amber FVE-production area for the kWh band. Prefers `batteryForecast[].solarKwh`
 * (confirmed real field, see boiler-data.ts buildBatteryForecast); falls back to
 * `planSlots[].pvKwh` when the forecast timeline doesn't cover this day (`usedFallback`
 * flags which source was used). Both are per-15-min-interval kWh, converted to an
 * instantaneous kW estimate (`kwh * 4`) matching the existing power-bar convention.
 * Returns null when fewer than 2 points carry data — a lone point reads as noise.
 */
export function buildFveOverlay(
  batteryForecast: BatteryForecastEntry[] | null | undefined,
  planSlots: BoilerV2PlanSlot[],
  dayStartMs: number,
): FveOverlay | null {
  const dayEndMs = dayStartMs + MINUTES_PER_DAY * 60000;

  const fromForecast: Array<{ startMs: number; kw: number }> = [];
  if (Array.isArray(batteryForecast)) {
    for (const entry of batteryForecast) {
      if (!isFinite(entry.timestampMs)) continue;
      if (entry.timestampMs < dayStartMs || entry.timestampMs > dayEndMs) continue;
      fromForecast.push({ startMs: entry.timestampMs, kw: Math.max(0, entry.solarKwh) * 4 });
    }
  }

  let usedFallback = false;
  let raw = fromForecast;
  if (raw.length < 2) {
    usedFallback = true;
    raw = [];
    for (const slot of planSlots) {
      const startMs = Date.parse(slot.start);
      if (!isFinite(startMs)) continue;
      if (startMs < dayStartMs || startMs > dayEndMs) continue;
      raw.push({ startMs, kw: Math.max(0, slot.pvKwh ?? 0) * 4 });
    }
  }

  if (raw.length < 2) return null;
  raw.sort((a, b) => a.startMs - b.startMs);

  const maxRawKw = Math.max(...raw.map((r) => r.kw));
  if (maxRawKw <= 0) return null;
  const maxKw = Math.max(0.5, maxRawKw);

  const points: FveOverlayPoint[] = raw.map((r) => {
    const minsIntoDay = (r.startMs - dayStartMs) / 60000;
    return {
      x: xFromMinutes(minsIntoDay),
      y: FVE_BAND_BASELINE_Y - (r.kw / maxKw) * FVE_BAND_BASELINE_Y,
      kw: r.kw,
    };
  });

  return { points, maxKw, usedFallback };
}

export interface OverflowWindow {
  startMs: number;
  endMs: number;
}

/**
 * First contiguous run of plan slots where PV alone covers heating (no grid/alt
 * sourcing) — the fallback marker for "battery at 100% -> PV surplus routed to the
 * boiler" onset. Used because no confirmed 0-100 battery-SoC-percent field exists on
 * the battery-forecast payload (see boiler-data.ts buildBatteryForecast /
 * BatteryForecastEntry.batterySocPct).
 */
export function findOverflowWindow(slots: BoilerV2PlanSlot[]): OverflowWindow | null {
  let startMs: number | null = null;
  let endMs: number | null = null;
  for (const slot of slots) {
    const pv = slot.pvKwh ?? 0;
    const grid = slot.gridKwh ?? 0;
    const alt = slot.altKwh ?? 0;
    const isOverflow = pv > 0 && grid <= 0 && alt <= 0;
    if (isOverflow) {
      const slotStartMs = Date.parse(slot.start);
      const slotEndMs = Date.parse(slot.end);
      if (!isFinite(slotStartMs) || !isFinite(slotEndMs)) continue;
      if (startMs == null) startMs = slotStartMs;
      endMs = slotEndMs;
    } else if (startMs != null) {
      break;
    }
  }
  if (startMs == null || endMs == null) return null;
  return { startMs, endMs };
}

function buildAriaLabel(
  nowTimeStr: string,
  deadlineTime: string | null,
  goalTempC: number | null,
  sourceBands: Array<string | null>,
  lang: Lang,
): string {
  const parts: string[] = [t('boiler.aria.plan_timeline', lang)];
  parts.push(`NOW: ${nowTimeStr}`);
  if (deadlineTime) parts.push(`${t('boiler.config.deadline', lang)}: ${deadlineTime}`);
  if (goalTempC != null) parts.push(`${t('boiler.config.goal_temp', lang)}: ${goalTempC}°C`);
  const uniqueSources = [...new Set(sourceBands.filter(Boolean))];
  if (uniqueSources.length > 0) {
    parts.push(uniqueSources.map((s) => sourceLabel(s, lang)).join(', '));
  }
  return parts.join('. ');
}

@customElement('oig-boiler-timeline-chart')
export class OigBoilerTimelineChart extends LitElement {
  @property({ type: Object }) data: BoilerV2Data | null = null;
  @property({ type: Object }) config: BoilerConfig | null = null;
  @property({ type: String }) lang: Lang = 'cs';
  @property({ type: Number }) nowMs: number | null = null;
  @property({ type: String }) timeZone: string | null = null;
  /** SoC curve scale — mirrors boiler-soc-chart's prop; falls back to config.volumeL. */
  @property({ type: Number }) capacityLiters: number | null = null;
  /** Current ready litres — mirrors boiler-soc-chart's prop; renders a NOW anchor dot. */
  @property({ type: Number }) nowLiters: number | null = null;

  static styles = css`
    :host {
      display: block;
      font-family: ${u(CSS_VARS.fontFamily)};
    }

    .timeline-section {
      width: 100%;
    }

    .timeline-header {
      margin-bottom: 10px;
    }

    .timeline-header h3 {
      margin: 0 0 4px;
      font-size: 14px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .timeline-summary {
      font-size: 11px;
      color: #9aa6b2;
    }

    .timeline-summary strong {
      color: #e6edf3;
    }

    .chart-wrap {
      position: relative;
      width: 100%;
    }

    .y-axis-label {
      position: absolute;
      top: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 100%;
      font-size: 9px;
      color: #9aa6b2;
      pointer-events: none;
    }

    .y-axis-label.left { left: 0; text-align: right; padding-right: 4px; }
    .y-axis-label.right { right: 0; text-align: left; padding-left: 4px; }

    svg.chart-svg {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
    }

    .plan-band {
      opacity: 0.18;
    }

    .temp-line {
      fill: none;
      stroke: #ff7a45;
      stroke-width: 1.5;
      stroke-linejoin: round;
      stroke-linecap: round;
    }

    .spot-line {
      fill: none;
      stroke: ${u(SPOT_COLOR)};
      stroke-width: 1.2;
      opacity: 0.9;
    }

    .soc-line {
      fill: none;
      stroke: ${u(SOC_COLOR)};
      stroke-width: 2;
      stroke-linejoin: round;
      stroke-linecap: round;
    }

    .soc-area {
      fill: ${u(SOC_COLOR)};
      opacity: 0.1;
    }

    .goal-line {
      stroke: #4ade80;
      stroke-width: 1;
      stroke-dasharray: 6 3;
      opacity: 0.8;
    }

    .now-marker {
      stroke: #60a5fa;
      stroke-width: 2;
    }

    .deadline-marker {
      stroke: #E65100;
      stroke-width: 1.5;
      stroke-dasharray: 4 2;
    }

    .charge-bar {
      fill: #4ade80;
      opacity: 0.75;
    }

    .draw-bar {
      fill: #60a5fa;
      opacity: 0.75;
    }

    .placeholder-bar {
      fill: #9E9E9E;
      opacity: 0.4;
    }

    .fve-area {
      fill: ${u(FVE_COLOR)};
      opacity: 0.22;
    }

    .overflow-band {
      fill: ${u(FVE_COLOR)};
      opacity: 0.12;
    }

    .overflow-slice {
      fill: ${u(FVE_COLOR)};
      opacity: 0.95;
    }

    .overflow-marker {
      stroke: ${u(FVE_COLOR)};
      stroke-width: 2;
      stroke-dasharray: 3 2;
    }

    .timeline-axis {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #9aa6b2;
      margin-top: 4px;
    }

    .timeline-legend {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 8px;
      font-size: 10px;
      color: #9aa6b2;
    }

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }

    .legend-dot {
      width: 10px;
      height: 10px;
      border-radius: 2px;
    }

    .footer-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
      font-size: 11px;
      color: #9aa6b2;
    }

    .degraded-chip {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 6px;
      background: rgba(245,184,0,.12);
      color: #f5b800;
      font-size: 10px;
      margin-right: 6px;
    }

    .empty-timeline {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 60px;
      font-size: 13px;
      color: ${u(CSS_VARS.textSecondary)};
      font-style: italic;
    }

    @media (max-width: 599px) {
      :host { font-size: 12px; }
    }
  `;

  render() {
    try {
      return this._renderTimeline();
    } catch {
      return html`
        <div class="timeline-section">
          <div class="empty-timeline" data-testid="boiler-timeline">${t('boiler.timeline.empty', this.lang)}</div>
        </div>
      `;
    }
  }

  private _resolveTimeZone(): string {
    if (this.timeZone) return this.timeZone;
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'Europe/Prague';
    }
  }

  private _renderTimeline() {
    const resolvedNowMs = resolveTimelineNowMs(this.nowMs ?? undefined);
    const tz = this._resolveTimeZone();
    let dayStartMs: number;
    try {
      dayStartMs = getDayStartMs(resolvedNowMs, tz);
    } catch {
      dayStartMs = resolvedNowMs - (resolvedNowMs % 86400000);
    }

    const nowMinsIntoDay = (resolvedNowMs - dayStartMs) / 60000;
    const nowX = xFromMinutes(nowMinsIntoDay);
    let nowTimeStr = '';
    try {
      nowTimeStr = formatISOWithOffset(resolvedNowMs, tz);
    } catch {
      nowTimeStr = new Date(resolvedNowMs).toISOString();
    }

    const cfg = this.config;
    const deadlineTime = cfg?.deadlineTime && cfg.deadlineTime !== '--:--' ? cfg.deadlineTime : null;
    let deadlineX: number | null = null;
    if (deadlineTime) {
      try {
        const [hStr, mStr] = deadlineTime.split(':');
        const deadlineMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
        deadlineX = xFromMinutes(deadlineMins);
      } catch {
        deadlineX = null;
      }
    }

    const goalTempC = cfg?.targetTempC != null && isFinite(cfg.targetTempC) ? cfg.targetTempC : 60;
    const goalY = tempToY(goalTempC);

    const data = this.data;
    const planSlots: BoilerV2PlanSlot[] = Array.isArray(data?.planSlots) ? data!.planSlots : [];
    const timelinePoints = Array.isArray(data?.timeline) ? data!.timeline : [];
    const sourceSegments: BoilerV2SourceSegment[] = Array.isArray(data?.sourceSegments)
      ? data!.sourceSegments
      : [];

    const allZero = planSlots.length > 0 && planSlots.every(
      s => (s.heatingKwh ?? 0) === 0 && (s.pvKwh ?? 0) === 0 && (s.gridKwh ?? 0) === 0 && (s.altKwh ?? 0) === 0
    );

    const planBands = this._buildPlanBands(planSlots, dayStartMs);
    const tempPointsFromSlots = this._buildTempPointsFromSlots(planSlots, dayStartMs);
    const tempPointsFromTimeline = this._buildTempPointsFromTimeline(timelinePoints, dayStartMs);
    const tempPoints = tempPointsFromSlots.length > 0 ? tempPointsFromSlots : tempPointsFromTimeline;
    const powerBars = this._buildPowerBarsFromSlots(planSlots, dayStartMs);
    const historyBars = this._buildPowerBars(timelinePoints, sourceSegments, dayStartMs, resolvedNowMs);

    let spotOverlay: SpotOverlay | null = null;
    try {
      spotOverlay = buildSpotSteps(planSlots, dayStartMs);
    } catch {
      spotOverlay = null;
    }
    const spotPolyline = spotOverlay
      ? spotOverlay.steps
          .flatMap((s) => [`${s.x1.toFixed(2)},${s.y.toFixed(2)}`, `${s.x2.toFixed(2)},${s.y.toFixed(2)}`])
          .join(' ')
      : null;

    let fveOverlay: FveOverlay | null = null;
    try {
      fveOverlay = buildFveOverlay(data?.batteryForecast ?? null, planSlots, dayStartMs);
    } catch {
      fveOverlay = null;
    }
    const fveAreaPath =
      fveOverlay && fveOverlay.points.length >= 2
        ? `M${fveOverlay.points[0].x.toFixed(2)} ${FVE_BAND_BASELINE_Y}` +
          fveOverlay.points.map((p) => ` L${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join('') +
          ` L${fveOverlay.points[fveOverlay.points.length - 1].x.toFixed(2)} ${FVE_BAND_BASELINE_Y} Z`
        : null;

    const dayEndMsForOverflow = dayStartMs + MINUTES_PER_DAY * 60000;
    let overflowWindow: OverflowWindow | null = null;
    try {
      overflowWindow = findOverflowWindow(planSlots);
    } catch {
      overflowWindow = null;
    }
    const overflowInDay = overflowWindow != null
      && overflowWindow.startMs >= dayStartMs
      && overflowWindow.startMs <= dayEndMsForOverflow;
    const overflowX = overflowInDay ? xFromMinutes((overflowWindow!.startMs - dayStartMs) / 60000) : null;
    const overflowBandX1 = overflowInDay ? xFromMinutes((Math.max(overflowWindow!.startMs, dayStartMs) - dayStartMs) / 60000) : null;
    const overflowBandX2 = overflowInDay ? xFromMinutes((Math.min(overflowWindow!.endMs, dayEndMsForOverflow) - dayStartMs) / 60000) : null;
    const overflowSlices = overflowInDay ? this._buildOverflowSlices(planSlots, dayStartMs, overflowWindow!) : [];

    const capacityL = this.capacityLiters ?? cfg?.volumeL ?? DEFAULT_CAPACITY_LITERS;
    const socPoints = this._buildSocPointsFromSlots(planSlots, dayStartMs, capacityL);
    const socPolyline =
      socPoints.length >= 2
        ? socPoints.map((p: TempPoint) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
        : null;
    const socAreaPath =
      socPoints.length >= 2
        ? `M${socPoints[0].x.toFixed(2)} ${VIEWBOX_H}` +
          socPoints.map((p: TempPoint) => ` L${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join('') +
          ` L${socPoints[socPoints.length - 1].x.toFixed(2)} ${VIEWBOX_H} Z`
        : null;
    const socNowY =
      this.nowLiters != null && isFinite(this.nowLiters) && capacityL > 0
        ? VIEWBOX_H * (1 - Math.max(0, Math.min(1, this.nowLiters / capacityL)))
        : null;

    const sourceBandKeys = planBands.map((b) => b.source);
    let ariaLabel = '';
    try {
      ariaLabel = buildAriaLabel(nowTimeStr, deadlineTime, goalTempC, sourceBandKeys, this.lang);
    } catch {
      ariaLabel = t('boiler.aria.plan_timeline', this.lang);
    }

    const tempPolyline =
      tempPoints.length >= 2
        ? tempPoints.map((p: TempPoint) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
        : null;

    const sumGridKwh = planSlots.reduce((s, sl) => s + (sl.gridKwh ?? 0), 0);
    const sumPvAltKwh = planSlots.reduce((s, sl) => s + (sl.pvKwh ?? 0) + (sl.altKwh ?? 0), 0);
    const sumCostCzk = planSlots.reduce((s, sl) => s + (sl.estimatedCostCzk ?? 0), 0);
    const sumTotalKwh = sumGridKwh + sumPvAltKwh;

    const degradedFlags = data?.status?.degradedFlags ?? [];
    const showPriceDegraded = degradedFlags.includes('price_degraded');
    const showForecastDegraded = degradedFlags.includes('forecast_degraded');

    const HOURS = ['00', '03', '06', '09', '12', '15', '18', '21', '24'];

    return html`
      <div class="timeline-section">
        <div class="timeline-header">
          <h3>📅 24h plán: teplota, výkon &amp; zdroje</h3>
          ${planSlots.length > 0 ? html`
            <div class="timeline-summary">
              Dnes: <strong>${sumGridKwh.toFixed(1)} kWh</strong> ze sítě
              · <strong style="color:#f5b800">${sumPvAltKwh.toFixed(1)} kWh</strong> z FVE/přetoku
              ${sumCostCzk > 0 ? html` · <strong>~${sumCostCzk.toFixed(2)} Kč</strong>` : ''}
              ${sumTotalKwh > 0 ? html` · spotřeba <strong>~${sumTotalKwh.toFixed(1)} kWh</strong>` : ''}
            </div>
          ` : ''}
        </div>

        ${allZero ? html`
          <div class="empty-timeline" data-testid="boiler-timeline">Plán nedostupný (degraded)</div>
        ` : html`
          <div class="chart-wrap">
            <div class="y-axis-label left">
              <span>80°</span><span>60°</span><span>40°</span><span>20°</span>
            </div>
            <div class="y-axis-label right">
              <span>3kW</span><span>1.5kW</span><span>0</span>
            </div>
            <svg
              class="chart-svg"
              viewBox="0 0 ${VIEWBOX_W} ${VIEWBOX_H}"
              role="img"
              aria-label="${ariaLabel}"
              data-testid="boiler-timeline"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              ${svg`<rect x="0" y="0" width="${VIEWBOX_W}" height="${VIEWBOX_H}" fill="transparent" />`}

              ${planBands.map((band) => {
                const color = band.source
                  ? (BOILER_SOURCE_COLORS as Record<string, string>)[band.source] ?? '#9E9E9E'
                  : '#9E9E9E';
                const bw = band.x2 - band.x1;
                return svg`<rect
                  class="plan-band"
                  data-source="${band.source ?? 'unknown'}"
                  x="${band.x1.toFixed(2)}"
                  y="0"
                  width="${bw.toFixed(2)}"
                  height="${VIEWBOX_H}"
                  fill="${color}"
                />`;
              })}

              ${overflowBandX1 != null && overflowBandX2 != null && overflowBandX2 > overflowBandX1 ? svg`
                <rect class="overflow-band"
                  data-testid="boiler-overflow-band"
                  x="${overflowBandX1.toFixed(2)}" y="0"
                  width="${(overflowBandX2 - overflowBandX1).toFixed(2)}" height="${VIEWBOX_H}"
                />
              ` : ''}

              ${svg`<line x1="0" y1="${POWER_BASELINE_Y}" x2="${VIEWBOX_W}" y2="${POWER_BASELINE_Y}" stroke="rgba(255,255,255,.08)" stroke-width="1"/>`}

              ${svg`<line
                class="goal-line"
                x1="0" y1="${goalY.toFixed(2)}"
                x2="${VIEWBOX_W}" y2="${goalY.toFixed(2)}"
              />`}
              ${svg`<text x="4" y="${(goalY - 3).toFixed(2)}" font-size="8" fill="#4ade80">CÍL ${goalTempC}°C</text>`}

              ${deadlineX != null && deadlineTime != null ? svg`
                <line class="deadline-marker"
                  data-testid="boiler-deadline-marker"
                  data-deadline-time="${deadlineTime}"
                  data-deadline-x="${formatX(deadlineX)}"
                  x1="${formatX(deadlineX)}" y1="0"
                  x2="${formatX(deadlineX)}" y2="${VIEWBOX_H}"
                />
                <text x="${(deadlineX + 3).toFixed(2)}" y="12" font-size="8" fill="#E65100">${deadlineTime}</text>
              ` : ''}

              ${fveAreaPath != null
                ? svg`<path class="fve-area" data-testid="boiler-fve-area" d="${fveAreaPath}" />`
                : ''}

              ${powerBars.map((bar) => {
                if (bar.isCharge) {
                  const barTop = POWER_BASELINE_Y - bar.barH;
                  return svg`<rect class="charge-bar" data-testid="boiler-charge-bar-up"
                    x="${(bar.x - 2).toFixed(2)}" y="${barTop.toFixed(2)}" width="4" height="${bar.barH.toFixed(2)}"/>`;
                } else {
                  return svg`<rect class="draw-bar" data-testid="boiler-draw-bar-down"
                    x="${(bar.x - 2).toFixed(2)}" y="${POWER_BASELINE_Y}" width="4" height="${bar.barH.toFixed(2)}"/>`;
                }
              })}

              ${historyBars.map((bar) => {
                if (bar.isCharge) {
                  const barTop = POWER_BASELINE_Y - bar.barH;
                  return svg`<rect class="charge-bar" data-testid="boiler-charge-bar-up"
                    data-estimated-power="${bar.isEstimated ? 'true' : 'false'}"
                    x="${(bar.x - 2).toFixed(2)}" y="${barTop.toFixed(2)}" width="4" height="${bar.barH.toFixed(2)}"/>`;
                } else {
                  return svg`<rect class="draw-bar" data-testid="boiler-draw-bar-down"
                    data-estimated-power="${bar.isEstimated ? 'true' : 'false'}"
                    x="${(bar.x - 2).toFixed(2)}" y="${POWER_BASELINE_Y}" width="4" height="${bar.barH.toFixed(2)}"/>`;
                }
              })}

              ${overflowSlices.map((slice) => svg`<rect class="overflow-slice"
                data-testid="boiler-overflow-slice"
                x="${(slice.x - 2).toFixed(2)}" y="${slice.y.toFixed(2)}" width="4" height="${slice.h.toFixed(2)}"/>`)}

              ${timelinePoints.map((pt) => {
                let ptMs: number;
                try { ptMs = Date.parse(pt.timestamp); } catch { return ''; }
                if (!isFinite(ptMs)) return '';
                const ptMins = (ptMs - dayStartMs) / 60000;
                if (ptMins < 0 || ptMins > MINUTES_PER_DAY) return '';
                if (pt.powerKw !== null) return '';
                const seg = findBestSegment(ptMs, sourceSegments, resolvedNowMs);
                const estimated = seg ? estimateSegmentPower(seg, resolvedNowMs) : null;
                if (estimated !== null && estimated > 0) return '';
                const ptX = xFromMinutes(ptMins);
                return svg`<rect
                  class="placeholder-bar"
                  data-testid="boiler-power-placeholder"
                  data-estimated-power="true"
                  x="${(ptX - 2).toFixed(2)}" y="99" width="4" height="2"
                />`;
              })}

              ${tempPolyline != null
                ? svg`<polyline class="temp-line" points="${tempPolyline}" />`
                : ''}

              ${socAreaPath != null
                ? svg`<path class="soc-area" d="${socAreaPath}" />`
                : ''}
              ${socPolyline != null
                ? svg`<polyline
                    class="soc-line"
                    data-testid="boiler-soc-curve"
                    data-capacity-liters="${capacityL}"
                    points="${socPolyline}"
                  />`
                : ''}
              ${socPolyline != null && socNowY != null
                ? svg`<circle
                    data-testid="boiler-soc-now-dot"
                    cx="${formatX(nowX)}" cy="${socNowY.toFixed(2)}" r="3"
                    fill="#fff" stroke="${SOC_COLOR}" stroke-width="1.5"
                  />`
                : ''}

              ${spotOverlay != null && spotPolyline != null ? svg`
                <polyline
                  class="spot-line"
                  data-testid="boiler-spot-line"
                  data-price-min="${spotOverlay.min.toFixed(2)}"
                  data-price-max="${spotOverlay.max.toFixed(2)}"
                  points="${spotPolyline}"
                />
                <text x="${VIEWBOX_W - 4}" y="${(SPOT_Y_TOP - 2).toFixed(2)}" font-size="8" fill="${SPOT_COLOR}" text-anchor="end" opacity="0.8">${spotOverlay.max.toFixed(2)} Kč</text>
                <text x="${VIEWBOX_W - 4}" y="${(SPOT_Y_BOTTOM + 10).toFixed(2)}" font-size="8" fill="${SPOT_COLOR}" text-anchor="end" opacity="0.8">${spotOverlay.min.toFixed(2)} Kč</text>
              ` : ''}

              ${fveOverlay != null ? svg`
                <text x="${VIEWBOX_W - 4}" y="24" font-size="8" fill="${FVE_COLOR}" text-anchor="end" opacity="0.85">☀ ${fveOverlay.maxKw.toFixed(1)} kW</text>
                <text x="${VIEWBOX_W - 4}" y="${(POWER_BASELINE_Y - 2).toFixed(2)}" font-size="8" fill="${FVE_COLOR}" text-anchor="end" opacity="0.6">0 kW</text>
              ` : ''}

              ${overflowX != null ? svg`
                <line class="overflow-marker"
                  data-testid="boiler-overflow-marker"
                  data-overflow-x="${formatX(overflowX)}"
                  x1="${formatX(overflowX)}" y1="0"
                  x2="${formatX(overflowX)}" y2="${VIEWBOX_H}"
                />
                <text x="${(overflowX + 3).toFixed(2)}" y="${VIEWBOX_H - 6}" font-size="7.5" fill="${FVE_COLOR}">${t('boiler.chart.overflow_label', this.lang)}</text>
              ` : ''}

              ${svg`<line
                class="now-marker"
                data-testid="boiler-now-marker"
                data-now-time="${nowTimeStr}"
                data-now-x="${formatX(nowX)}"
                x1="${formatX(nowX)}" y1="0"
                x2="${formatX(nowX)}" y2="${VIEWBOX_H}"
              />`}
              ${svg`<text x="${(nowX + 3).toFixed(2)}" y="12" font-size="8" fill="#60a5fa">TEĎ</text>`}
            </svg>
          </div>

          <div class="timeline-axis">
            ${HOURS.map(h => html`<span>${h}</span>`)}
          </div>

          <div class="timeline-legend">
            <div class="legend-item"><span class="legend-dot" style="background:#f5b800"></span>FVE</div>
            <div class="legend-item"><span class="legend-dot" style="background:#4ade80"></span>Přetok</div>
            <div class="legend-item"><span class="legend-dot" style="background:#7c8694"></span>Síť</div>
            <div class="legend-item"><span class="legend-dot" style="background:#4ade80;opacity:.75"></span>Nabíjení kW</div>
            <div class="legend-item"><span class="legend-dot" style="background:#60a5fa;opacity:.75"></span>Odběr kW</div>
            <div class="legend-item"><span class="legend-dot" style="background:#ff7a45"></span>°C predikce</div>
            ${socPolyline != null ? html`<div class="legend-item"><span class="legend-dot" style="background:${SOC_COLOR}"></span>SoC (L)</div>` : ''}
            ${spotPolyline != null ? html`<div class="legend-item"><span class="legend-dot" style="background:${SPOT_COLOR}"></span>Spot Kč/kWh</div>` : ''}
            ${fveOverlay != null ? html`<div class="legend-item" data-testid="boiler-fve-overlay-legend"><span class="legend-dot" style="background:${FVE_COLOR};opacity:.4"></span>${t('boiler.chart.fve_overlay_legend', this.lang)}</div>` : ''}
            ${overflowX != null ? html`<div class="legend-item" data-testid="boiler-overflow-legend"><span class="legend-dot" style="background:${FVE_COLOR}"></span>${t('boiler.chart.overflow_legend', this.lang)}</div>` : ''}
          </div>
        `}

        <div class="footer-meta">
          <div>
            ${showPriceDegraded ? html`<span class="degraded-chip">⚠ Ceny: stará data</span>` : ''}
            ${showForecastDegraded ? html`<span class="degraded-chip">⚠ FVE predikce: stará data</span>` : ''}
          </div>
        </div>
      </div>
    `;
  }

  private _buildTempPointsFromTimeline(
    points: BoilerV2Data['timeline'],
    dayStartMs: number,
  ): TempPoint[] {
    const result: TempPoint[] = [];
    const dayEndMs = dayStartMs + MINUTES_PER_DAY * 60000;
    for (const pt of points) {
      try {
        if (pt.topTempC == null || !isFinite(pt.topTempC)) continue;
        const ptMs = Date.parse(pt.timestamp);
        if (!isFinite(ptMs)) continue;
        if (ptMs < dayStartMs || ptMs > dayEndMs) continue;
        const minsIntoDay = (ptMs - dayStartMs) / 60000;
        result.push({ x: xFromMinutes(minsIntoDay), y: tempToY(pt.topTempC) });
      } catch {
        continue;
      }
    }
    return result;
  }

  private _buildTempPointsFromSlots(slots: BoilerV2PlanSlot[], dayStartMs: number): TempPoint[] {
    const result: TempPoint[] = [];
    const dayEndMs = dayStartMs + MINUTES_PER_DAY * 60000;
    for (const slot of slots) {
      try {
        const tempC = slot.expectedTempTopC;
        if (tempC == null || !isFinite(tempC)) continue;
        const slotStartMs = Date.parse(slot.start);
        if (!isFinite(slotStartMs)) continue;
        if (slotStartMs < dayStartMs || slotStartMs > dayEndMs) continue;
        const minsIntoDay = (slotStartMs - dayStartMs) / 60000;
        result.push({ x: xFromMinutes(minsIntoDay), y: tempToY(tempC) });
      } catch {
        continue;
      }
    }
    return result;
  }

  /** SoC-of-ready-litres curve (merged from boiler-soc-chart) on the day axis. */
  private _buildSocPointsFromSlots(
    slots: BoilerV2PlanSlot[],
    dayStartMs: number,
    capacityLiters: number,
  ): TempPoint[] {
    const result: TempPoint[] = [];
    if (!(capacityLiters > 0)) return result;
    const dayEndMs = dayStartMs + MINUTES_PER_DAY * 60000;
    for (const slot of slots) {
      try {
        const liters = slot.readyLiters;
        if (liters == null || !isFinite(liters)) continue;
        const slotStartMs = Date.parse(slot.start);
        if (!isFinite(slotStartMs)) continue;
        if (slotStartMs < dayStartMs || slotStartMs > dayEndMs) continue;
        const minsIntoDay = (slotStartMs - dayStartMs) / 60000;
        const frac = Math.max(0, Math.min(1, liters / capacityLiters));
        result.push({ x: xFromMinutes(minsIntoDay), y: VIEWBOX_H * (1 - frac) });
      } catch {
        continue;
      }
    }
    return result;
  }

  private _buildPowerBarsFromSlots(slots: BoilerV2PlanSlot[], dayStartMs: number): PowerBar[] {
    const bars: PowerBar[] = [];
    const dayEndMs = dayStartMs + MINUTES_PER_DAY * 60000;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      try {
        const slotStartMs = Date.parse(slot.start);
        if (!isFinite(slotStartMs)) continue;
        if (slotStartMs < dayStartMs || slotStartMs > dayEndMs) continue;
        const minsIntoDay = (slotStartMs - dayStartMs) / 60000;
        const ptX = xFromMinutes(minsIntoDay);
        const powerKwh = (slot.pvKwh ?? 0) + (slot.gridKwh ?? 0) + (slot.altKwh ?? 0);
        if (powerKwh <= 0) continue;
        const powerKw = powerKwh * 4;
        const clamped = Math.min(powerKw, POWER_MAX_KW);
        const barH = (clamped / POWER_MAX_KW) * POWER_BASELINE_Y;
        bars.push({ x: ptX, barH, isCharge: true, isEstimated: false });
      } catch {
        continue;
      }
    }
    return bars;
  }

  /**
   * Amber top-slices on the existing charge bars inside the overflow window, sized by
   * pvKwh's share of heatingKwh per slot — reuses _buildPowerBarsFromSlots' bar-height
   * math so the slice aligns exactly with the top edge of the bar it sits on.
   */
  private _buildOverflowSlices(
    slots: BoilerV2PlanSlot[],
    dayStartMs: number,
    overflow: OverflowWindow,
  ): OverflowSlice[] {
    const slices: OverflowSlice[] = [];
    const dayEndMs = dayStartMs + MINUTES_PER_DAY * 60000;
    for (const slot of slots) {
      try {
        const slotStartMs = Date.parse(slot.start);
        if (!isFinite(slotStartMs)) continue;
        if (slotStartMs < dayStartMs || slotStartMs > dayEndMs) continue;
        if (slotStartMs < overflow.startMs || slotStartMs >= overflow.endMs) continue;
        const heatingKwh = slot.heatingKwh ?? 0;
        if (heatingKwh <= 0) continue;
        const pvKwh = slot.pvKwh ?? 0;
        const powerKwh = pvKwh + (slot.gridKwh ?? 0) + (slot.altKwh ?? 0);
        if (powerKwh <= 0) continue;
        const powerKw = powerKwh * 4;
        const clamped = Math.min(powerKw, POWER_MAX_KW);
        const barH = (clamped / POWER_MAX_KW) * POWER_BASELINE_Y;
        const pvShare = Math.max(0, Math.min(1, pvKwh / powerKwh));
        if (pvShare <= 0) continue;
        const minsIntoDay = (slotStartMs - dayStartMs) / 60000;
        const sliceH = barH * pvShare;
        slices.push({ x: xFromMinutes(minsIntoDay), y: POWER_BASELINE_Y - barH, h: sliceH });
      } catch {
        continue;
      }
    }
    return slices;
  }

  private _buildPlanBands(slots: BoilerV2PlanSlot[], dayStartMs: number): PlanBand[] {
    if (!slots.length) return [];

    const bands: PlanBand[] = [];
    const dayEndMs = dayStartMs + MINUTES_PER_DAY * 60000;
    const validSlots: BoilerV2PlanSlot[] = [];

    for (const slot of slots) {
      try {
        const slotStartMs = Date.parse(slot.start);
        const slotEndMs = Date.parse(slot.end);
        if (!isFinite(slotStartMs) || !isFinite(slotEndMs)) continue;
        if (slotEndMs <= dayStartMs || slotStartMs >= dayEndMs) continue;
        const clippedStart = Math.max(slotStartMs, dayStartMs);
        const clippedEnd = Math.min(slotEndMs, dayEndMs);
        if (clippedEnd <= clippedStart) continue;
        validSlots.push({ ...slot, start: new Date(clippedStart).toISOString(), end: new Date(clippedEnd).toISOString() });
      } catch {
        continue;
      }
    }

    const merged = mergePlanSlots(validSlots);

    for (const slot of merged) {
      try {
        const slotStartMs = Date.parse(slot.start);
        const slotEndMs = Date.parse(slot.end);
        if (!isFinite(slotStartMs) || !isFinite(slotEndMs)) continue;
        const x1 = xFromMinutes((slotStartMs - dayStartMs) / 60000);
        const x2 = xFromMinutes((slotEndMs - dayStartMs) / 60000);
        if (x2 <= x1) continue;
        bands.push({ x1, x2, source: slot.recommendedSource, heating: (slot.heatingKwh ?? 0) > 0 });
      } catch {
        continue;
      }
    }
    return bands;
  }

  private _buildPowerBars(
    points: BoilerV2Data['timeline'],
    segments: BoilerV2SourceSegment[],
    dayStartMs: number,
    nowMs: number,
  ): PowerBar[] {
    const bars: PowerBar[] = [];
    const dayEndMs = dayStartMs + MINUTES_PER_DAY * 60000;
    for (const pt of points) {
      try {
        const ptMs = Date.parse(pt.timestamp);
        if (!isFinite(ptMs)) continue;
        if (ptMs < dayStartMs || ptMs > dayEndMs) continue;
        const minsIntoDay = (ptMs - dayStartMs) / 60000;
        const ptX = xFromMinutes(minsIntoDay);

        if (pt.powerKw !== null && isFinite(pt.powerKw)) {
          const clamped = Math.max(-POWER_MAX_KW, Math.min(POWER_MAX_KW, pt.powerKw));
          if (Math.abs(clamped) < 0.001) continue;
          const barH = (Math.abs(clamped) / POWER_MAX_KW) * POWER_BASELINE_Y;
          bars.push({ x: ptX, barH, isCharge: clamped > 0, isEstimated: false });
        } else {
          const seg = findBestSegment(ptMs, segments, nowMs);
          if (seg !== null) {
            const estimated = estimateSegmentPower(seg, nowMs);
            if (estimated !== null && estimated > 0) {
              const isDischarge = seg.key === 'discharge';
              const clamped = Math.min(estimated, POWER_MAX_KW);
              const barH = (clamped / POWER_MAX_KW) * POWER_BASELINE_Y;
              bars.push({ x: ptX, barH, isCharge: !isDischarge, isEstimated: true });
            }
          }
        }
      } catch {
        continue;
      }
    }
    return bars;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-boiler-timeline-chart': OigBoilerTimelineChart;
  }
}
