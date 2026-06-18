import { LitElement, html, css, svg, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { BOILER_SOURCE_COLORS, type BoilerV2Data, type BoilerConfig, type BoilerV2PlanSlot, type BoilerV2SourceSegment } from './types';
import { t, sourceLabel, type Lang } from '@/i18n/boiler';

const u = unsafeCSS;

const VIEWBOX_W = 1000;
const VIEWBOX_H = 200;
const TEMP_MIN = 20;
const TEMP_MAX = 80;
const POWER_MAX_KW = 3;
const POWER_BASELINE_Y = 100;
const MINUTES_PER_DAY = 1440;

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
