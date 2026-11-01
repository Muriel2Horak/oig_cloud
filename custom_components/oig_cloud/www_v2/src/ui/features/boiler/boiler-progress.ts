// ============================================================================
// 📊 Bojler: plán & realita — progress strip
// ============================================================================
//
// Component: oig-boiler-progress
//
// Binding visual spec: docs/redesign_2026_07/rework/BOILER-TAB-MOCK-rev3.html,
// lines 267-279 — a `.prline` (adherence bar, progress, actual-vs-plan, forecast
// with a confidence note) above a `.mgrid` of `.mtile` metrics, each showing the
// PLAN value with the ACTUAL in parentheses.  Markup, classes and label strings
// are taken from the mock verbatim; no new visual language is introduced here.
//
// Data source: the `progress` block of the canonical boiler payload (day-record
// contract).  Read snake_case straight from the wire so the FE cannot silently
// rename a contract key.
//
// Two invariants the mock cannot express, and this file must:
//   - unknown looks unknown.  `null` renders as an em dash, NEVER as 0 or 0 %.
//   - `unattributed_kwh` and `alt_kwh` are their OWN items.  They are never
//     summed into the electric totals.
// ============================================================================

import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import type {
  BoilerProgressData,
  BoilerProgressSlot,
  BoilerProgressSlotSide,
} from './types';
import { t, type Lang } from '@/i18n/boiler';
import { altTypeLabelPlain } from './boiler-energy-today';
import { adherenceColor } from './boiler-plan-realita-tile';

const u = unsafeCSS;

const DASH = '—';

/** The day record is a fixed 96-slot (15 min) baseline. */
export const PROGRESS_SLOT_COUNT = 96;

/**
 * Confidence tiers for the end-of-day forecast, expressed as a share of the day
 * already measured: the more slots are done, the less of the estimate is guess.
 */
const CONFIDENCE_HIGH_FRACTION = 2 / 3;
const CONFIDENCE_MEDIUM_FRACTION = 1 / 3;

/** Mock rev3 palette — same constants the other boiler tiles use. */
const MOCK = {
  card2: '#1f2848', line: '#2a3355', idle: '#39415f',
  muted: '#8b93ad', text: '#e8ecf7',
} as const;

// ============================================================================
// Pure helpers — exported for unit tests
// ============================================================================

function num(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

/** completed_slots as a 0..100 percentage of the 96-slot day. */
export function progressPct(completedSlots: number | null | undefined): number | null {
  const n = num(completedSlots);
  if (n === null) return null;
  return (n / PROGRESS_SLOT_COUNT) * 100;
}

/**
 * kWh of one slot side.  The contract's sides are objects, but a BE that emits
 * the bare kWh number is read too rather than crashing the strip.
 */
export function slotSideKwh(side: BoilerProgressSlotSide | number | null | undefined): number | null {
  if (typeof side === 'number') return num(side);
  if (!side || typeof side !== 'object') return null;
  return num(side.heating_kwh);
}

/** Source of one slot side. The bare-number form carries no source. */
export function slotSideSource(side: BoilerProgressSlotSide | number | null | undefined): string | null {
  if (!side || typeof side !== 'object') return null;
  const s = side.source;
  return typeof s === 'string' && s.length > 0 ? s.toLowerCase() : null;
}

function sideOf(slot: BoilerProgressSlot, which: 'planned' | 'actual') {
  return which === 'planned' ? slot.planned : slot.actual;
}

function slotList(slots: unknown): BoilerProgressSlot[] {
  return Array.isArray(slots) ? (slots as BoilerProgressSlot[]) : [];
}

/**
 * kWh attributed to `source` across one side of the day.
 *
 * Returns null when NO slot carries that side at all — that is "unknown", and
 * unknown must not be shown as 0.  A side that exists but never used the source
 * returns a real, measured 0.
 */
export function sumSideSourceKwh(
  slots: BoilerProgressSlot[] | null | undefined,
  which: 'planned' | 'actual',
  source: string,
): number | null {
  const list = slotList(slots);
  let seen = false;
  let total = 0;
  for (const slot of list) {
    const side = sideOf(slot, which);
    if (!side || typeof side !== 'object') continue;
    seen = true;
    // by_source_kwh is the precise breakdown; `source` is only the dominant one.
    const bySource = side.by_source_kwh;
    if (bySource && typeof bySource === 'object') {
      const v = num((bySource as Record<string, unknown>)[source]);
      if (v !== null) { total += v; continue; }
      // an explicit, non-empty breakdown that omits the source means zero for it
      if (Object.keys(bySource).length > 0) continue;
    }
    if (slotSideSource(side) === source) {
      total += slotSideKwh(side) ?? 0;
    }
  }
  return seen ? total : null;
}

/**
 * Cost of one side of the day. Only the planned baseline carries `cost_czk`;
 * the actual side has none in the contract, so it stays unknown.
 */
export function sumSideCostCzk(
  slots: BoilerProgressSlot[] | null | undefined,
  which: 'planned' | 'actual',
): number | null {
  const list = slotList(slots);
  let seen = false;
  let total = 0;
  for (const slot of list) {
    const side = sideOf(slot, which);
    if (!side || typeof side !== 'object') continue;
    const v = num(side.cost_czk);
    if (v === null) continue;
    seen = true;
    total += v;
  }
  return seen ? total : null;
}

/**
 * Lowest ready-litre value across one side of the day.  The contract carries no
 * litres today, so this is null unless a future BE adds `ready_liters`.
 */
export function minSideReadyLiters(
  slots: BoilerProgressSlot[] | null | undefined,
  which: 'planned' | 'actual',
): number | null {
  const list = slotList(slots);
  let best: number | null = null;
  for (const slot of list) {
    const side = sideOf(slot, which);
    if (!side || typeof side !== 'object') continue;
    const v = num(side.ready_liters);
    if (v === null) continue;
    best = best === null ? v : Math.min(best, v);
  }
  return best;
}

/** How much of the end-of-day forecast is already measured rather than guessed. */
export function confidenceKey(completedSlots: number | null | undefined): 'high' | 'medium' | 'low' {
  const n = num(completedSlots);
  if (n === null) return 'low';
  const fraction = n / PROGRESS_SLOT_COUNT;
  if (fraction >= CONFIDENCE_HIGH_FRACTION) return 'high';
  if (fraction >= CONFIDENCE_MEDIUM_FRACTION) return 'medium';
  return 'low';
}

/** A 0..100 percentage as the mock writes it: "72 %". Em dash when unknown. */
export function formatPct100(v: number | null | undefined): string {
  const n = num(v);
  if (n === null) return DASH;
  return `${Math.round(n)} %`;
}

/**
 * Cost, bare (the unit is rendered once at the end of the tile, as in the mock).
 *
 * A cost of EXACTLY 0 renders as an em dash: the planner's snapshot cost is
 * currently 0 upstream and that zero is wrong, not free. Unknown must look
 * unknown rather than claim the day cost nothing.
 */
export function formatCostCzkStrict(v: number | null | undefined): string {
  const n = num(v);
  if (n === null || n === 0) return DASH;
  return n.toFixed(2).replace('.', ',');
}

/** kWh, bare, one decimal as the mock's metric tiles write it. A measured 0 stays 0. */
export function formatKwh1(v: number | null | undefined): string {
  const n = num(v);
  if (n === null) return DASH;
  return n.toFixed(1).replace('.', ',');
}

/** kWh, bare, two decimals as the mock's `.prline` writes its value pair. */
export function formatKwh2(v: number | null | undefined): string {
  const n = num(v);
  if (n === null) return DASH;
  return n.toFixed(2).replace('.', ',');
}

/** Litres, bare, whole numbers as the mock writes them. */
export function formatLiters0(v: number | null | undefined): string {
  const n = num(v);
  if (n === null) return DASH;
  return n.toFixed(0);
}

/** True when there is nothing worth drawing a strip for. */
export function isProgressEmpty(progress: BoilerProgressData | null | undefined): boolean {
  if (!progress || typeof progress !== 'object') return true;
  const hasSlots = Array.isArray(progress.slots) && progress.slots.length > 0;
  const hasAny =
    hasSlots ||
    num(progress.completed_slots) !== null ||
    num(progress.adherence_pct) !== null ||
    (!!progress.energy && typeof progress.energy === 'object') ||
    (!!progress.eod && typeof progress.eod === 'object') ||
    num(progress.unattributed_kwh) !== null ||
    num(progress.alt_kwh) !== null;
  return !hasAny;
}

// ============================================================================
// Component
// ============================================================================

@customElement('oig-boiler-progress')
export class OigBoilerProgress extends LitElement {
  @property({ attribute: false }) progress: BoilerProgressData | null = null;
  @property({ type: String }) lang: Lang = 'cs';
  /** Alt source type from config ("gas"|"heat_pump"|"fireplace"|"other") — labels the alt item. */
  @property({ type: String }) altSourceType: string | null = null;

  static styles = css`
    :host {
      display: block;
      font-family: ${u(CSS_VARS.fontFamily)};
      width: 100%;
    }

    .strip {
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      padding: 10px 14px;
      box-sizing: border-box;
    }

    /* mock .prline */
    .prline {
      display: flex;
      flex-wrap: wrap;
      gap: 8px 20px;
      align-items: center;
      font-size: 12px;
      color: ${u(MOCK.muted)};
      margin-bottom: 8px;
    }

    .prline b {
      color: ${u(MOCK.text)};
    }

    /* mock .adhbar */
    .adhbar {
      flex: 1;
      min-width: 120px;
      height: 5px;
      border-radius: 3px;
      background: ${u(MOCK.idle)};
      overflow: hidden;
    }

    .adhbar i {
      display: block;
      height: 100%;
      border-radius: 3px;
    }

    /* mock .mgrid / .mtile */
    .mgrid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 8px;
    }

    .mtile {
      background: ${u(MOCK.card2)};
      border-radius: 8px;
      padding: 6px 10px;
    }

    .mtile .lbl {
      display: block;
      font-size: 10px;
      color: ${u(MOCK.muted)};
    }

    .mtile .v {
      font-size: 14px;
      font-weight: 600;
      color: ${u(MOCK.text)};
    }

    .mtile .v span {
      font-size: 11px;
      font-weight: 400;
    }

    .empty {
      color: ${u(CSS_VARS.textSecondary)};
      padding: 14px 0;
      text-align: center;
      font-size: 12px;
    }

    @media (max-width: 900px) {
      .mgrid { grid-template-columns: repeat(2, 1fr); }
    }
  `;

  render() {
    try {
      return this._renderStrip();
    } catch {
      // A broken payload must never take the tab down with it.
      return html`
        <div class="strip" data-testid="boiler-progress">
          <div class="empty" data-testid="progress-empty">${t('boiler.progress.empty', this.lang)}</div>
        </div>
      `;
    }
  }

  private _renderStrip() {
    const lang = this.lang;
    const p = this.progress;

    if (isProgressEmpty(p)) {
      return html`
        <div class="strip" data-testid="boiler-progress">
          <div class="empty" data-testid="progress-empty">${t('boiler.progress.empty', lang)}</div>
        </div>
      `;
    }

    const progress = p as BoilerProgressData;
    const slots = slotList(progress.slots);

    const adherence = num(progress.adherence_pct);
    const adherenceWidth = adherence === null ? 0 : Math.max(0, Math.min(100, adherence));
    const barColor = adherence === null ? MOCK.idle : adherenceColor(adherence);

    const energy = (progress.energy && typeof progress.energy === 'object') ? progress.energy : null;
    const eod = (progress.eod && typeof progress.eod === 'object') ? progress.eod : null;

    const confidence = t(`boiler.progress.confidence_${confidenceKey(progress.completed_slots)}`, lang);

    return html`
      <div class="strip" data-testid="boiler-progress">
        <div class="prline">
          <span data-testid="progress-adherence-label">${t('boiler.progress.adherence', lang)}</span>
          <div class="adhbar" data-testid="progress-adherence-bar">
            <i
              data-testid="progress-adherence-fill"
              style="width:${adherenceWidth}%;background:${barColor}"
            ></i>
          </div>
          <b class="num" data-testid="progress-adherence-value">${formatPct100(adherence)}</b>

          <span data-testid="progress-progress"
            >${t('boiler.progress.progress', lang)}
            <b class="num">${formatPct100(progressPct(progress.completed_slots))}</b></span
          >

          <span data-testid="progress-actual-vs-plan"
            >${t('boiler.progress.actual', lang)}
            <b class="num">${formatKwh2(energy?.actual_kwh)}</b> /
            ${t('boiler.progress.plan', lang)}
            <b class="num">${formatKwh2(energy?.planned_kwh)}${num(energy?.planned_kwh) === null ? '' : ' kWh'}</b></span
          >

          <span data-testid="progress-forecast"
            >${t('boiler.progress.forecast', lang)}
            <b class="num">${formatKwh2(eod?.estimated_total_kwh)}${num(eod?.estimated_total_kwh) === null ? '' : ' kWh'}</b>
            · ${confidence}</span
          >
        </div>

        <div class="mgrid">
          ${this._renderPairTile(
            'progress-metric-cost',
            t('boiler.progress.metric_cost', lang),
            formatCostCzkStrict(sumSideCostCzk(slots, 'planned')),
            formatCostCzkStrict(sumSideCostCzk(slots, 'actual')),
            'Kč',
          )}
          ${this._renderPairTile(
            'progress-metric-grid',
            t('boiler.progress.metric_grid', lang),
            formatKwh1(sumSideSourceKwh(slots, 'planned', 'grid')),
            formatKwh1(sumSideSourceKwh(slots, 'actual', 'grid')),
            'kWh',
          )}
          ${this._renderPairTile(
            'progress-metric-fve',
            t('boiler.progress.metric_fve', lang),
            formatKwh1(sumSideSourceKwh(slots, 'planned', 'fve')),
            formatKwh1(sumSideSourceKwh(slots, 'actual', 'fve')),
            'kWh',
          )}
          ${this._renderPairTile(
            'progress-metric-ready',
            t('boiler.progress.metric_ready', lang),
            formatLiters0(minSideReadyLiters(slots, 'planned')),
            formatLiters0(minSideReadyLiters(slots, 'actual')),
            'L',
          )}

          <!-- measured energy with no source, and the alt (gas) source: their OWN
               items, never added into the electric totals above -->
          ${this._renderSingleTile(
            'progress-metric-unattributed',
            t('boiler.panel.unattributed_label', lang),
            formatKwh1(progress.unattributed_kwh),
            'kWh',
          )}
          ${this._renderSingleTile(
            'progress-metric-alt',
            altTypeLabelPlain(this.altSourceType, lang),
            formatKwh1(progress.alt_kwh),
            'kWh',
          )}
        </div>
      </div>
    `;
  }

  /** mock line 275: `<span class="lbl">X</span><div class="v num">PLAN <span>(ACTUAL)</span> UNIT</div>` */
  private _renderPairTile(testId: string, label: string, plan: string, actual: string, unit: string) {
    return html`
      <div class="mtile" data-testid="${testId}">
        <span class="lbl">${label}</span>
        <div class="v num">${plan} <span>(${actual})</span> ${unit}</div>
      </div>
    `;
  }

  /** Same tile, for a value that has no plan/actual pair (unattributed, alt). */
  private _renderSingleTile(testId: string, label: string, value: string, unit: string) {
    return html`
      <div class="mtile" data-testid="${testId}">
        <span class="lbl">${label}</span>
        <div class="v num">${value} ${unit}</div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-boiler-progress': OigBoilerProgress;
  }
}
