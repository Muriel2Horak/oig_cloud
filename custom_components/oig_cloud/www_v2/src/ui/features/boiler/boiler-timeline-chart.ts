import { LitElement, html, css, svg, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { BOILER_SOURCE_COLORS, type BoilerV2Data, type BoilerConfig, type BoilerV2PlanSlot, type BoilerV2SourceSegment, type BatteryForecastEntry } from './types';
import { t, sourceLabel, type Lang } from '@/i18n/boiler';

const u = unsafeCSS;

// Mock rev3 geometry (verbatim from docs/redesign_2026_07/rework/BOILER-TAB-MOCK-rev3.html)
const VIEWBOX_W = 960;
const VIEWBOX_H = 240;
const WINDOW_HOURS = 24;
const WINDOW_MS = WINDOW_HOURS * 3600000;
const PAST_HOURS = 1.5;
const PAST_MS = PAST_HOURS * 3600000;

const TEMP_MIN = 20;
const TEMP_MAX = 80;

const SOC_BAND_TOP = 25;
const SOC_BAND_BOTTOM = 115;
const SOC_BAND_H = SOC_BAND_BOTTOM - SOC_BAND_TOP;

const POWER_BASELINE_Y = 190;
const POWER_BAND_TOP = 115;
const POWER_BAND_H = POWER_BASELINE_Y - POWER_BAND_TOP;
const POWER_MAX_KW = 3;

const SPOT_Y_TOP = 20;
const SPOT_Y_BOTTOM = 220;

const SOC_COLOR = '#4dd0e1';
const TEMP_COLOR = '#ff8a50';
const FVE_COLOR = '#f0b429';
const SPOT_COLOR = '#8b93ad';
const DEADLINE_COLOR = '#ffb300';
const NOW_COLOR = '#ffffff';

const MOCK = {
  water: '#4dd0e1', grid: '#3b82f6', fve: '#f0b429',
  battery: '#a78bfa', alt: '#ff8a50', idle: '#39415f',
  card: '#1b2340', card2: '#1f2848', line: '#2a3355',
  muted: '#8b93ad', dim: '#5c6480', text: '#e8ecf7',
} as const;

const DEFAULT_CAPACITY_LITERS = 200;

// Source colour mapping to mock palette (overrides legacy BOILER_SOURCE_COLORS)
function sourceFill(source: string | null | undefined): string {
  if (!source) return '#39415f';
  switch (source) {
    case 'fve':
    case 'overflow':
      return '#f0b429';
    case 'grid':
      return '#3b82f6';
    case 'battery':
    case 'discharge':
      return '#a78bfa';
    case 'alternative':
    case 'alt':
      return '#ff8a50';
    default:
      return BOILER_SOURCE_COLORS[source] ?? '#39415f';
  }
}

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

function formatHhmm(ms: number, tz: string): string {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(ms));
    const h = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const m = parts.find((p) => p.type === 'minute')?.value ?? '00';
    return `${h}:${m}`;
  } catch {
    const d = new Date(ms);
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
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

function xFromMs(ms: number, windowStartMs: number): number {
  return ((ms - windowStartMs) / WINDOW_MS) * VIEWBOX_W;
}

function formatX(x: number): string {
  return String(parseFloat(x.toFixed(3)));
}

function tempToY(tempC: number): number {
  const clamped = Math.max(TEMP_MIN, Math.min(TEMP_MAX, tempC));
  return SOC_BAND_BOTTOM - ((clamped - TEMP_MIN) / (TEMP_MAX - TEMP_MIN)) * SOC_BAND_H;
}

function socToY(liters: number, capacityLiters: number): number {
  const frac = Math.max(0, Math.min(1, liters / capacityLiters));
  return SOC_BAND_BOTTOM - frac * SOC_BAND_H;
}

function getDayStartMs(nowMs: number, timeZone: string): number {
  const minsIntoDay = minutesSinceMidnightInTimeZone(nowMs, timeZone);
  return nowMs - minsIntoDay * 60000;
}

function computeWindowStartMs(resolvedNowMs: number, timelinePoints: BoilerV2Data['timeline']): number {
  const historyTimestamps = timelinePoints
    .map((p) => Date.parse(p.timestamp))
    .filter((t) => Number.isFinite(t) && t >= resolvedNowMs - PAST_MS && t <= resolvedNowMs);
  if (historyTimestamps.length > 0) {
    const oldest = Math.min(...historyTimestamps);
    return Math.min(resolvedNowMs - 15 * 60000, Math.max(resolvedNowMs - PAST_MS, oldest));
  }
  return resolvedNowMs - PAST_MS;
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

interface TempPoint {
  x: number;
  y: number;
}

interface PowerBar {
  x: number;
  barH: number;
  isCharge: boolean;
  isEstimated: boolean;
  fill: string;
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
 * Build the spot-price step overlay for a rolling window. Prices are per-slot
 * constants, so each slot renders as a horizontal step (x1..x2 at one y).
 * Returns null when fewer than 2 slots carry a finite spotPrice.
 */
export function buildSpotSteps(
  slots: BoilerV2PlanSlot[],
  windowStartMs: number,
  windowEndMs?: number,
): SpotOverlay | null {
  const endMs = windowEndMs ?? windowStartMs + WINDOW_MS;
  const priced: Array<{ startMs: number; endMs: number; price: number }> = [];
  for (const slot of slots) {
    if (slot.spotPrice == null || !isFinite(slot.spotPrice)) continue;
    const startMs = Date.parse(slot.start);
    const slotEndMs = Date.parse(slot.end);
    if (!isFinite(startMs) || !isFinite(slotEndMs)) continue;
    if (slotEndMs <= windowStartMs || startMs >= endMs) continue;
    const clippedStart = Math.max(startMs, windowStartMs);
    const clippedEnd = Math.min(slotEndMs, endMs);
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
    x1: xFromMs(p.startMs, windowStartMs),
    x2: xFromMs(p.endMs, windowStartMs),
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
 * Amber FVE-production area for the bottom band. Prefers `batteryForecast[].solarKwh`;
 * falls back to `planSlots[].pvKwh`. Both are per-15-min-interval kWh, converted to an
 * instantaneous kW estimate (`kwh * 4`).
 */
export function buildFveOverlay(
  batteryForecast: BatteryForecastEntry[] | null | undefined,
  planSlots: BoilerV2PlanSlot[],
  windowStartMs: number,
  windowEndMs?: number,
): FveOverlay | null {
  const endMs = windowEndMs ?? windowStartMs + WINDOW_MS;

  const fromForecast: Array<{ startMs: number; kw: number }> = [];
  if (Array.isArray(batteryForecast)) {
    for (const entry of batteryForecast) {
      if (!isFinite(entry.timestampMs)) continue;
      if (entry.timestampMs < windowStartMs || entry.timestampMs > endMs) continue;
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
      if (startMs < windowStartMs || startMs > endMs) continue;
      raw.push({ startMs, kw: Math.max(0, slot.pvKwh ?? 0) * 4 });
    }
  }

  if (raw.length < 2) return null;
  raw.sort((a, b) => a.startMs - b.startMs);

  const maxRawKw = Math.max(...raw.map((r) => r.kw));
  if (maxRawKw <= 0) return null;
  const maxKw = Math.max(0.5, maxRawKw);

  const points: FveOverlayPoint[] = raw.map((r) => ({
    x: xFromMs(r.startMs, windowStartMs),
    y: POWER_BASELINE_Y - (r.kw / maxKw) * POWER_BAND_H,
    kw: r.kw,
  }));

  return { points, maxKw, usedFallback };
}

export interface OverflowWindow {
  startMs: number;
  endMs: number;
}

/**
 * First contiguous run of plan slots where PV alone covers heating (no grid/alt
 * sourcing) — the fallback marker for "battery at 100% -> PV surplus routed to the
 * boiler" onset.
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
  slots: BoilerV2PlanSlot[],
  lang: Lang,
): string {
  const parts: string[] = [t('boiler.aria.plan_timeline', lang)];
  parts.push(`NOW: ${nowTimeStr}`);
  if (deadlineTime) parts.push(`${t('boiler.config.deadline', lang)}: ${deadlineTime}`);
  if (goalTempC != null) parts.push(`${t('boiler.config.goal_temp', lang)}: ${goalTempC}°C`);
  const sources = slots.map((s) => s.recommendedSource).filter(Boolean);
  const uniqueSources = [...new Set(sources)];
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
  @property({ type: Number }) capacityLiters: number | null = null;
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
      margin-bottom: 8px;
    }

    .timeline-header h3 {
      margin: 0 0 3px;
      font-size: 13px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .timeline-summary {
      font-size: 10.5px;
      color: #8b93ad;
    }

    .timeline-summary strong {
      color: #e8ecf7;
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
      color: #8b93ad;
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

    .grid-line {
      stroke: rgba(255,255,255,.06);
      stroke-width: 1;
    }

    .band-separator {
      stroke: rgba(255,255,255,.10);
      stroke-width: 1;
    }

    .temp-line {
      fill: none;
      stroke: ${u(TEMP_COLOR)};
      stroke-width: 1.5;
      stroke-linejoin: round;
      stroke-linecap: round;
    }

    .spot-line {
      fill: none;
      stroke: ${u(SPOT_COLOR)};
      stroke-width: 1;
      stroke-dasharray: 3 3;
      opacity: 0.7;
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
      opacity: 0.12;
    }

    .goal-line {
      stroke: #4ade80;
      stroke-width: 1;
      stroke-dasharray: 5 3;
      opacity: 0.6;
    }

    .now-marker {
      stroke: ${u(NOW_COLOR)};
      stroke-width: 2;
    }

    .now-label {
      font-size: 9px;
      fill: ${u(NOW_COLOR)};
      font-weight: 700;
    }

    .deadline-marker {
      stroke: ${u(DEADLINE_COLOR)};
      stroke-width: 1.5;
      stroke-dasharray: 4 3;
    }

    .deadline-label {
      font-size: 9px;
      fill: ${u(DEADLINE_COLOR)};
      font-weight: 600;
    }

    .charge-bar {
      opacity: 0.85;
    }

    .draw-bar {
      fill: ${u(MOCK.water)};
      opacity: 0.75;
    }

    .fve-area {
      fill: ${u(FVE_COLOR)};
      opacity: 0.18;
      stroke: ${u(FVE_COLOR)};
      stroke-width: 1;
    }

    .overflow-band {
      fill: ${u(FVE_COLOR)};
      opacity: 0.10;
    }

    .overflow-slice {
      fill: ${u(FVE_COLOR)};
      opacity: 0.95;
    }

    .overflow-marker {
      stroke: ${u(FVE_COLOR)};
      stroke-width: 1.5;
      stroke-dasharray: 3 2;
    }

    .timeline-axis {
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #8b93ad;
      margin-top: 4px;
      padding: 0 2px;
    }

    .timeline-legend {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      margin-top: 8px;
      font-size: 10px;
      color: #8b93ad;
    }

    .legend-item {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }

    .footer-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 8px;
      font-size: 11px;
      color: #8b93ad;
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
    const lang = this.lang;
    const windowStartMs = computeWindowStartMs(resolvedNowMs, this.data?.timeline ?? []);
    const windowEndMs = windowStartMs + WINDOW_MS;

    const nowX = xFromMs(resolvedNowMs, windowStartMs);
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
      // Place deadline at its local-time occurrence within the rolling window.
      // Find the matching civil instant: today if it lies ahead, else tomorrow.
      const dayStartMs = getDayStartMs(resolvedNowMs, tz);
      const [hStr, mStr] = deadlineTime.split(':');
      const deadlineMins = parseInt(hStr, 10) * 60 + parseInt(mStr, 10);
      let candidateMs = dayStartMs + deadlineMins * 60000;
      if (candidateMs <= resolvedNowMs) candidateMs += 86400000;
      if (candidateMs >= windowStartMs && candidateMs <= windowEndMs) {
        deadlineX = xFromMs(candidateMs, windowStartMs);
      }
    }

    const goalTempC = cfg?.targetTempC != null && isFinite(cfg.targetTempC) ? cfg.targetTempC : 60;

    const data = this.data;
    const planSlots: BoilerV2PlanSlot[] = Array.isArray(data?.planSlots) ? data!.planSlots : [];
    const timelinePoints = Array.isArray(data?.timeline) ? data!.timeline : [];
    const sourceSegments: BoilerV2SourceSegment[] = Array.isArray(data?.sourceSegments)
      ? data!.sourceSegments
      : [];

    const allZero = planSlots.length > 0 && planSlots.every(
      s => (s.heatingKwh ?? 0) === 0 && (s.pvKwh ?? 0) === 0 && (s.gridKwh ?? 0) === 0 && (s.altKwh ?? 0) === 0
    );

    const tempPointsFromSlots = this._buildTempPointsFromSlots(planSlots, windowStartMs, windowEndMs);
    const tempPointsFromTimeline = this._buildTempPointsFromTimeline(timelinePoints, windowStartMs, windowEndMs);
    const tempPoints = tempPointsFromSlots.length > 0 ? tempPointsFromSlots : tempPointsFromTimeline;
    const powerBars = this._buildPowerBarsFromSlots(planSlots, windowStartMs, windowEndMs);
    const historyBars = this._buildPowerBars(timelinePoints, sourceSegments, windowStartMs, windowEndMs, resolvedNowMs);

    let spotOverlay: SpotOverlay | null = null;
    try {
      spotOverlay = buildSpotSteps(planSlots, windowStartMs, windowEndMs);
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
      fveOverlay = buildFveOverlay(data?.batteryForecast ?? null, planSlots, windowStartMs, windowEndMs);
    } catch {
      fveOverlay = null;
    }
    const fveAreaPath =
      fveOverlay && fveOverlay.points.length >= 2
        ? `M${fveOverlay.points[0].x.toFixed(2)} ${POWER_BASELINE_Y}` +
          fveOverlay.points.map((p) => ` L${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join('') +
          ` L${fveOverlay.points[fveOverlay.points.length - 1].x.toFixed(2)} ${POWER_BASELINE_Y} Z`
        : null;

    let overflowWindow: OverflowWindow | null = null;
    try {
      overflowWindow = findOverflowWindow(planSlots);
    } catch {
      overflowWindow = null;
    }
    const overflowInWindow = overflowWindow != null
      && overflowWindow.startMs < windowEndMs
      && overflowWindow.endMs > windowStartMs;
    const overflowX = overflowInWindow ? xFromMs(overflowWindow!.startMs, windowStartMs) : null;
    const overflowBandX1 = overflowInWindow
      ? xFromMs(Math.max(overflowWindow!.startMs, windowStartMs), windowStartMs)
      : null;
    const overflowBandX2 = overflowInWindow
      ? xFromMs(Math.min(overflowWindow!.endMs, windowEndMs), windowStartMs)
      : null;
    const overflowSlices = overflowInWindow
      ? this._buildOverflowSlices(planSlots, windowStartMs, windowEndMs, overflowWindow!)
      : [];

    const capacityL = this.capacityLiters ?? cfg?.volumeL ?? DEFAULT_CAPACITY_LITERS;
    const socPoints = this._buildSocPointsFromSlots(planSlots, windowStartMs, windowEndMs, capacityL);
    const socPolyline =
      socPoints.length >= 2
        ? socPoints.map((p: TempPoint) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(' ')
        : null;
    const socAreaPath =
      socPoints.length >= 2
        ? `M${socPoints[0].x.toFixed(2)} ${SOC_BAND_BOTTOM}` +
          socPoints.map((p: TempPoint) => ` L${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join('') +
          ` L${socPoints[socPoints.length - 1].x.toFixed(2)} ${SOC_BAND_BOTTOM} Z`
        : null;
    const socNowY =
      this.nowLiters != null && isFinite(this.nowLiters) && capacityL > 0
        ? socToY(this.nowLiters, capacityL)
        : null;

    let ariaLabel = '';
    try {
      ariaLabel = buildAriaLabel(nowTimeStr, deadlineTime, goalTempC, planSlots, this.lang);
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

    // 3-hour axis ticks within the rolling window
    const axisTicks: Array<{ label: string; x: number }> = [];
    const tickMs = 3 * 3600000;
    const firstTick = Math.ceil(windowStartMs / tickMs) * tickMs;
    for (let t = firstTick; t <= windowEndMs; t += tickMs) {
      axisTicks.push({ label: formatHhmm(t, tz), x: xFromMs(t, windowStartMs) });
    }

    // Local axis labels for the top band
    const socTicks = [`${capacityL} L`, `${Math.round(capacityL / 2)} L`, '0 L'];
    const kwTicks = [`${POWER_MAX_KW} kW`, '0 kW'];

    return html`
      <div class="timeline-section">
        <div class="timeline-header">
          <h3>${t('boiler.soc.heading', this.lang)}</h3>
          ${planSlots.length > 0 ? html`
            <div class="timeline-summary">
              ${t('boiler.model.today', lang)}: <strong>${sumGridKwh.toFixed(1).replace('.', ',')} kWh</strong> ze sítě
              · <strong style="color:${FVE_COLOR}">${sumPvAltKwh.toFixed(1).replace('.', ',')} kWh</strong> z FVE/přetoku
              ${sumCostCzk > 0 ? html` · <strong>~${sumCostCzk.toFixed(2).replace('.', ',')} Kč</strong>` : ''}
              ${sumTotalKwh > 0 ? html` · spotřeba <strong>~${sumTotalKwh.toFixed(1).replace('.', ',')} kWh</strong>` : ''}
            </div>
          ` : ''}
        </div>

        ${allZero ? html`
          <div class="empty-timeline" data-testid="boiler-timeline">Plán nedostupný (degraded)</div>
        ` : html`
          <div class="chart-wrap">
            <div class="y-axis-label left">
              ${socTicks.map(l => html`<span>${l}</span>`)}
            </div>
            <div class="y-axis-label right">
              ${kwTicks.map(l => html`<span>${l}</span>`)}
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

              <!-- horizontal band separator -->
              ${svg`<line class="band-separator" x1="0" y1="${SOC_BAND_BOTTOM}" x2="${VIEWBOX_W}" y2="${SOC_BAND_BOTTOM}" />`}
              ${svg`<line class="band-separator" x1="0" y1="${POWER_BASELINE_Y}" x2="${VIEWBOX_W}" y2="${POWER_BASELINE_Y}" />`}

              <!-- faint vertical grid every 3h -->
              ${axisTicks.map((tick) => svg`<line class="grid-line" x1="${tick.x.toFixed(1)}" y1="0" x2="${tick.x.toFixed(1)}" y2="${VIEWBOX_H}" />`)}

              ${overflowBandX1 != null && overflowBandX2 != null && overflowBandX2 > overflowBandX1 ? svg`
                <rect class="overflow-band"
                  data-testid="boiler-overflow-band"
                  x="${overflowBandX1.toFixed(2)}" y="0"
                  width="${(overflowBandX2 - overflowBandX1).toFixed(2)}" height="${VIEWBOX_H}"
                />
              ` : ''}

              ${fveAreaPath != null
                ? svg`<path class="fve-area" data-testid="boiler-fve-area" d="${fveAreaPath}" />`
                : ''}

              ${powerBars.map((bar) => {
                if (bar.isCharge) {
                  const barTop = POWER_BASELINE_Y - bar.barH;
                  return svg`<rect class="charge-bar" data-testid="boiler-charge-bar-up"
                    fill="${bar.fill}"
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
                    fill="${bar.fill}"
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

              ${tempPolyline != null
                ? svg`<polyline class="temp-line" points="${tempPolyline}" />`
                : ''}

              ${spotOverlay != null && spotPolyline != null ? svg`
                <polyline
                  class="spot-line"
                  data-testid="boiler-spot-line"
                  data-price-min="${spotOverlay.min.toFixed(2)}"
                  data-price-max="${spotOverlay.max.toFixed(2)}"
                  points="${spotPolyline}"
                />
              ` : ''}

              ${deadlineX != null && deadlineTime != null ? svg`
                <line class="deadline-marker"
                  data-testid="boiler-deadline-marker"
                  data-deadline-time="${deadlineTime}"
                  data-deadline-x="${formatX(deadlineX)}"
                  x1="${formatX(deadlineX)}" y1="0"
                  x2="${formatX(deadlineX)}" y2="${VIEWBOX_H}"
                />
                <text class="deadline-label" x="${(deadlineX + 3).toFixed(2)}" y="14">${t('boiler.plan.safety', lang)} ${deadlineTime}</text>
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
              ${svg`<text class="now-label" x="${(nowX + 3).toFixed(2)}" y="14">${t('boiler.soc.now', this.lang)}</text>`}
            </svg>
          </div>

          <div class="timeline-axis">
            ${axisTicks.map((tick) => html`<span style="transform:translateX(${tick.x < 30 ? 0 : tick.x > VIEWBOX_W - 30 ? 0 : 0}px)">${tick.label}</span>`)}
          </div>

          <div class="timeline-legend">
            <div class="legend-item"><span class="legend-dot" style="background:${SOC_COLOR}"></span>${t('boiler.soc.legend_soc', lang)}</div>
            <div class="legend-item"><span class="legend-dot" style="background:${TEMP_COLOR}"></span>${t('boiler.soc.legend_temp', lang)}</div>
            <div class="legend-item"><span class="legend-dot" style="background:${FVE_COLOR};opacity:.5"></span>${t('boiler.chart.fve_overlay_legend', lang)}</div>
            <div class="legend-item"><span class="legend-dot" style="background:${sourceFill('grid')}"></span>${t('boiler.source.grid', lang)} → ${t('boiler.model.element', lang)}</div>
            <div class="legend-item"><span class="legend-dot" style="background:${sourceFill('fve')}"></span>${t('boiler.source.fve', lang)} ${t('boiler.soc.charging', lang)}</div>
            <div class="legend-item"><span class="legend-dot" style="background:${MOCK.water}"></span>${t('boiler.soc.legend_draw', lang)}</div>
            ${spotPolyline != null ? html`<div class="legend-item"><span class="legend-dot" style="background:${SPOT_COLOR}"></span>Spot Kč/kWh</div>` : ''}
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

  private _inWindow(ms: number, startMs: number, endMs: number): boolean {
    return ms >= startMs && ms <= endMs;
  }

  private _buildTempPointsFromTimeline(
    points: BoilerV2Data['timeline'],
    windowStartMs: number,
    windowEndMs: number,
  ): TempPoint[] {
    const result: TempPoint[] = [];
    for (const pt of points) {
      try {
        if (pt.topTempC == null || !isFinite(pt.topTempC)) continue;
        const ptMs = Date.parse(pt.timestamp);
        if (!isFinite(ptMs)) continue;
        if (!this._inWindow(ptMs, windowStartMs, windowEndMs)) continue;
        result.push({ x: xFromMs(ptMs, windowStartMs), y: tempToY(pt.topTempC) });
      } catch {
        continue;
      }
    }
    return result;
  }

  private _buildTempPointsFromSlots(
    slots: BoilerV2PlanSlot[],
    windowStartMs: number,
    windowEndMs: number,
  ): TempPoint[] {
    const result: TempPoint[] = [];
    for (const slot of slots) {
      try {
        const tempC = slot.expectedTempTopC;
        if (tempC == null || !isFinite(tempC)) continue;
        const slotStartMs = Date.parse(slot.start);
        if (!isFinite(slotStartMs)) continue;
        if (!this._inWindow(slotStartMs, windowStartMs, windowEndMs)) continue;
        result.push({ x: xFromMs(slotStartMs, windowStartMs), y: tempToY(tempC) });
      } catch {
        continue;
      }
    }
    return result;
  }

  private _buildSocPointsFromSlots(
    slots: BoilerV2PlanSlot[],
    windowStartMs: number,
    windowEndMs: number,
    capacityLiters: number,
  ): TempPoint[] {
    const result: TempPoint[] = [];
    if (!(capacityLiters > 0)) return result;
    for (const slot of slots) {
      try {
        const liters = slot.readyLiters;
        if (liters == null || !isFinite(liters)) continue;
        const slotStartMs = Date.parse(slot.start);
        if (!isFinite(slotStartMs)) continue;
        if (!this._inWindow(slotStartMs, windowStartMs, windowEndMs)) continue;
        result.push({ x: xFromMs(slotStartMs, windowStartMs), y: socToY(liters, capacityLiters) });
      } catch {
        continue;
      }
    }
    return result;
  }

  private _dominantSource(slot: BoilerV2PlanSlot): string {
    const sources: Array<[string, number]> = [
      ['fve', slot.pvKwh ?? 0],
      ['overflow', 0],
      ['grid', slot.gridKwh ?? 0],
      ['alt', slot.altKwh ?? 0],
    ];
    sources.sort((a, b) => b[1] - a[1]);
    return sources[0][1] > 0 ? sources[0][0] : 'idle';
  }

  private _buildPowerBarsFromSlots(
    slots: BoilerV2PlanSlot[],
    windowStartMs: number,
    windowEndMs: number,
  ): PowerBar[] {
    const bars: PowerBar[] = [];
    for (const slot of slots) {
      try {
        const slotStartMs = Date.parse(slot.start);
        if (!isFinite(slotStartMs)) continue;
        if (!this._inWindow(slotStartMs, windowStartMs, windowEndMs)) continue;
        const powerKwh = (slot.pvKwh ?? 0) + (slot.gridKwh ?? 0) + (slot.altKwh ?? 0);
        if (powerKwh <= 0) continue;
        const powerKw = powerKwh * 4;
        const clamped = Math.min(powerKw, POWER_MAX_KW);
        const barH = (clamped / POWER_MAX_KW) * POWER_BAND_H;
        bars.push({
          x: xFromMs(slotStartMs, windowStartMs),
          barH,
          isCharge: true,
          isEstimated: false,
          fill: sourceFill(this._dominantSource(slot)),
        });
      } catch {
        continue;
      }
    }
    return bars;
  }

  private _buildOverflowSlices(
    slots: BoilerV2PlanSlot[],
    windowStartMs: number,
    windowEndMs: number,
    overflow: OverflowWindow,
  ): OverflowSlice[] {
    const slices: OverflowSlice[] = [];
    for (const slot of slots) {
      try {
        const slotStartMs = Date.parse(slot.start);
        if (!isFinite(slotStartMs)) continue;
        if (!this._inWindow(slotStartMs, windowStartMs, windowEndMs)) continue;
        if (slotStartMs < overflow.startMs || slotStartMs >= overflow.endMs) continue;
        const heatingKwh = slot.heatingKwh ?? 0;
        if (heatingKwh <= 0) continue;
        const pvKwh = slot.pvKwh ?? 0;
        const powerKwh = pvKwh + (slot.gridKwh ?? 0) + (slot.altKwh ?? 0);
        if (powerKwh <= 0) continue;
        const powerKw = powerKwh * 4;
        const clamped = Math.min(powerKw, POWER_MAX_KW);
        const barH = (clamped / POWER_MAX_KW) * POWER_BAND_H;
        const pvShare = Math.max(0, Math.min(1, pvKwh / powerKwh));
        if (pvShare <= 0) continue;
        const sliceH = barH * pvShare;
        slices.push({
          x: xFromMs(slotStartMs, windowStartMs),
          y: POWER_BASELINE_Y - barH,
          h: sliceH,
        });
      } catch {
        continue;
      }
    }
    return slices;
  }

  private _buildPowerBars(
    points: BoilerV2Data['timeline'],
    segments: BoilerV2SourceSegment[],
    windowStartMs: number,
    windowEndMs: number,
    nowMs: number,
  ): PowerBar[] {
    const bars: PowerBar[] = [];
    for (const pt of points) {
      try {
        const ptMs = Date.parse(pt.timestamp);
        if (!isFinite(ptMs)) continue;
        if (!this._inWindow(ptMs, windowStartMs, windowEndMs)) continue;

        if (pt.powerKw !== null && isFinite(pt.powerKw)) {
          const clamped = Math.max(-POWER_MAX_KW, Math.min(POWER_MAX_KW, pt.powerKw));
          if (Math.abs(clamped) < 0.001) continue;
          const barH = (Math.abs(clamped) / POWER_MAX_KW) * POWER_BAND_H;
          bars.push({
            x: xFromMs(ptMs, windowStartMs),
            barH,
            isCharge: clamped > 0,
            isEstimated: false,
            fill: sourceFill(pt.sourceKey),
          });
        } else {
          const seg = findBestSegment(ptMs, segments, nowMs);
          if (seg !== null) {
            const estimated = estimateSegmentPower(seg, nowMs);
            if (estimated !== null && estimated > 0) {
              const isDischarge = seg.key === 'discharge';
              const clamped = Math.min(estimated, POWER_MAX_KW);
              const barH = (clamped / POWER_MAX_KW) * POWER_BAND_H;
              bars.push({
                x: xFromMs(ptMs, windowStartMs),
                barH,
                isCharge: !isDischarge,
                isEstimated: true,
                fill: sourceFill(seg.key),
              });
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
