// ============================================================================
// Boiler progress strip — "plán & realita" (slice 3, FE)
//
// The binding visual spec is docs/redesign_2026_07/rework/BOILER-TAB-MOCK-rev3.html
// lines 267-279.  Every label asserted here is copied VERBATIM from those lines.
//
// Covers:
//   - every mock field renders from a full progress payload
//   - null adherence / null energy deltas render as em dashes, never 0
//   - a plan cost of exactly 0 renders as an em dash (upstream is wrong, D-plan-cost)
//   - unattributed and alt (gas) render as their OWN items, never folded into
//     the electric totals
//   - missing / empty progress renders the neutral empty state without throwing
//   - the strip is mounted in the shell under the hero, above the plan slot
// ============================================================================

import { describe, it, expect } from 'vitest';
import { fixture } from '@open-wc/testing-helpers';
import { html } from 'lit';

import {
  OigBoilerProgress,
  PROGRESS_SLOT_COUNT,
  progressPct,
  slotSideKwh,
  slotSideSource,
  sumSideCostCzk,
  sumSideSourceKwh,
  minSideReadyLiters,
  confidenceKey,
  formatPct100,
  formatCostCzkStrict,
  formatKwh1,
} from '@/ui/features/boiler/boiler-progress';
import type {
  BoilerProgressData,
  BoilerProgressSlot,
} from '@/ui/features/boiler/types';
import { OigBoilerV2Shell } from '@/ui/features/boiler/boiler-shell';
import { t } from '@/i18n/boiler';

const DASH = '—';

// ── fixture builders ─────────────────────────────────────────────────────────

function hhmm(i: number): string {
  const m = i * 15;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/**
 * 96 slots.  Planned: slots 20-27 grid @1.0 kWh / 1.50 Kč, slots 40-42 fve
 * @0.2 kWh / 0 Kč.  Actual: slots 20-22 grid @1.0 kWh.
 *   planned grid 8.0, planned fve 0.6, planned cost 12.00
 *   actual  grid 3.0, actual  fve 0.0
 */
function buildSlots(): BoilerProgressSlot[] {
  const slots: BoilerProgressSlot[] = [];
  for (let i = 0; i < PROGRESS_SLOT_COUNT; i++) {
    let planned: BoilerProgressSlot['planned'] = {
      time: hhmm(i), heating_kwh: 0, source: null, cost_czk: 0, predicted_top_temp_c: 50,
    };
    if (i >= 20 && i <= 27) {
      planned = { time: hhmm(i), heating_kwh: 1.0, source: 'grid', cost_czk: 1.5, predicted_top_temp_c: 55 };
    } else if (i >= 40 && i <= 42) {
      planned = { time: hhmm(i), heating_kwh: 0.2, source: 'fve', cost_czk: 0, predicted_top_temp_c: 58 };
    }
    const actual: BoilerProgressSlot['actual'] =
      i >= 20 && i <= 22
        ? { time: hhmm(i), heating_kwh: 1.0, source: 'grid', top_temp_c: 54, by_source_kwh: { grid: 1.0 } }
        : { time: hhmm(i), heating_kwh: 0, source: null, top_temp_c: 50, by_source_kwh: {} };
    slots.push({
      time: hhmm(i),
      status: i < 42 ? 'done' : 'pending',
      planned,
      actual,
      source_match: true,
      delta_kwh: (actual.heating_kwh ?? 0) - (planned.heating_kwh ?? 0),
    });
  }
  return slots;
}

function fullProgress(over: Partial<BoilerProgressData> = {}): BoilerProgressData {
  return {
    date: '2026-09-08',
    slots: buildSlots(),
    completed_slots: 42,
    adherence_pct: 72.3,
    energy: { planned_kwh: 8.6, actual_kwh: 3.0, delta_kwh: -5.6 },
    eod: {
      actual_so_far_kwh: 3.0,
      remaining_planned_kwh: 5.4,
      estimated_total_kwh: 8.4,
      planned_total_kwh: 8.6,
    },
    unattributed_kwh: 0.533,
    alt_kwh: 2.68,
    yesterday: null,
    ...over,
  };
}

async function render(progress: BoilerProgressData | null, altSourceType: string | null = 'gas') {
  return fixture<OigBoilerProgress>(html`
    <oig-boiler-progress
      .progress=${progress}
      .altSourceType=${altSourceType}
      lang="cs"
    ></oig-boiler-progress>
  `);
}

function txt(el: OigBoilerProgress, testId: string): string {
  const node = el.shadowRoot!.querySelector(`[data-testid="${testId}"]`);
  return (node?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

// ── pure helpers ─────────────────────────────────────────────────────────────

describe('boiler-progress pure helpers', () => {
  it('progressPct is completed_slots / 96', () => {
    expect(PROGRESS_SLOT_COUNT).toBe(96);
    expect(progressPct(42)).toBeCloseTo(43.75, 5);
    expect(progressPct(96)).toBe(100);
    expect(progressPct(0)).toBe(0);
  });

  it('progressPct is null when completed_slots is unknown', () => {
    expect(progressPct(null)).toBeNull();
    expect(progressPct(undefined)).toBeNull();
    expect(progressPct(Number.NaN)).toBeNull();
  });

  it('slotSideKwh accepts both the object form and the bare-number form', () => {
    expect(slotSideKwh({ heating_kwh: 1.25 })).toBe(1.25);
    expect(slotSideKwh(0.5)).toBe(0.5);
    expect(slotSideKwh(null)).toBeNull();
    expect(slotSideKwh({ heating_kwh: null })).toBeNull();
  });

  it('slotSideSource returns null for the bare-number form', () => {
    expect(slotSideSource({ source: 'grid' })).toBe('grid');
    expect(slotSideSource(1.0)).toBeNull();
    expect(slotSideSource(null)).toBeNull();
  });

  it('sumSideSourceKwh sums the planned and actual sides per source', () => {
    const slots = buildSlots();
    expect(sumSideSourceKwh(slots, 'planned', 'grid')).toBeCloseTo(8.0, 5);
    expect(sumSideSourceKwh(slots, 'planned', 'fve')).toBeCloseTo(0.6, 5);
    expect(sumSideSourceKwh(slots, 'actual', 'grid')).toBeCloseTo(3.0, 5);
    // no PV was measured — a real, measured zero, not "unknown"
    expect(sumSideSourceKwh(slots, 'actual', 'fve')).toBe(0);
  });

  it('sumSideSourceKwh is null when no slot carries that side at all', () => {
    expect(sumSideSourceKwh([], 'planned', 'grid')).toBeNull();
    const bare: BoilerProgressSlot[] = [{ time: '00:00', planned: null, actual: null }];
    expect(sumSideSourceKwh(bare, 'planned', 'grid')).toBeNull();
  });

  it('sumSideCostCzk sums planned cost_czk', () => {
    expect(sumSideCostCzk(buildSlots(), 'planned')).toBeCloseTo(12.0, 5);
    // the actual side carries no cost at all in the contract
    expect(sumSideCostCzk(buildSlots(), 'actual')).toBeNull();
  });

  it('minSideReadyLiters is null when the contract carries no litres', () => {
    expect(minSideReadyLiters(buildSlots(), 'planned')).toBeNull();
    const withL: BoilerProgressSlot[] = [
      { time: '00:00', planned: { ready_liters: 60 } },
      { time: '00:15', planned: { ready_liters: 35 } },
    ];
    expect(minSideReadyLiters(withL, 'planned')).toBe(35);
  });

  it('confidenceKey rises with the number of completed slots', () => {
    expect(confidenceKey(90)).toBe('high');
    expect(confidenceKey(42)).toBe('medium');
    expect(confidenceKey(4)).toBe('low');
    expect(confidenceKey(null)).toBe('low');
  });

  it('formatPct100 rounds a 0..100 percentage and dashes on null', () => {
    expect(formatPct100(72.3)).toBe('72 %');
    expect(formatPct100(100)).toBe('100 %');
    expect(formatPct100(0)).toBe('0 %');
    expect(formatPct100(null)).toBe(DASH);
  });

  it('formatCostCzkStrict dashes on null AND on exactly 0', () => {
    expect(formatCostCzkStrict(14.1)).toBe('14,10');
    expect(formatCostCzkStrict(0)).toBe(DASH);
    expect(formatCostCzkStrict(null)).toBe(DASH);
  });

  it('formatKwh1 keeps a measured zero as zero', () => {
    expect(formatKwh1(8.5)).toBe('8,5');
    expect(formatKwh1(0)).toBe('0,0');
    expect(formatKwh1(null)).toBe(DASH);
  });
});

// ── full payload ─────────────────────────────────────────────────────────────

describe('boiler-progress renders every mock field', () => {
  it('renders adherence, progress, actual/plan, forecast and the 4 metric tiles', async () => {
    const el = await render(fullProgress());

    // <span>Soulad</span> … <b class="num">100 %</b>   (mock line 269)
    expect(txt(el, 'progress-adherence-label')).toBe('Soulad');
    expect(txt(el, 'progress-adherence-value')).toBe('72 %');
    const bar = el.shadowRoot!.querySelector('[data-testid="progress-adherence-fill"]') as HTMLElement;
    expect(bar).not.toBeNull();
    expect(bar.style.width).toBe('72.3%');

    // <span>Průběh <b class="num">44 %</b></span>      (mock line 270)
    expect(txt(el, 'progress-progress')).toBe('Průběh 44 %');

    // <span>Skutečné <b>3,20</b> / plán <b>14,10 Kč</b></span>   (mock line 271)
    expect(txt(el, 'progress-actual-vs-plan')).toBe('Skutečné 3,00 / plán 8,60 kWh');

    // <span>Predikce <b>13,90 Kč</b> · vysoká jistota</span>     (mock line 272)
    expect(txt(el, 'progress-forecast')).toBe('Predikce 8,40 kWh · střední jistota');

    // mock lines 275-278 — plan value, actual in parentheses, unit last
    expect(txt(el, 'progress-metric-cost')).toBe('Náklady 12,00 (—) Kč');
    expect(txt(el, 'progress-metric-grid')).toBe('Síť 8,0 (3,0) kWh');
    expect(txt(el, 'progress-metric-fve')).toBe('FVE 0,6 (0,0) kWh');
    expect(txt(el, 'progress-metric-ready')).toBe('Min. připraveno — (—) L');
  });

  it('uses the mock markup classes', async () => {
    const el = await render(fullProgress());
    expect(el.shadowRoot!.querySelector('.prline')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.adhbar')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.mgrid')).not.toBeNull();
    expect(el.shadowRoot!.querySelectorAll('.mtile').length).toBeGreaterThanOrEqual(4);
    expect(el.shadowRoot!.querySelector('.mtile .lbl')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.mtile .v')).not.toBeNull();
  });

  it('renders the "vysoká jistota" note verbatim when the day is mostly done', async () => {
    const el = await render(fullProgress({ completed_slots: 90 }));
    expect(txt(el, 'progress-forecast')).toContain('vysoká jistota');
  });

  it('every user-facing string comes from the i18n helper', async () => {
    const el = await render(fullProgress());
    expect(t('boiler.progress.adherence', 'cs')).toBe('Soulad');
    expect(t('boiler.progress.progress', 'cs')).toBe('Průběh');
    expect(t('boiler.progress.actual', 'cs')).toBe('Skutečné');
    expect(t('boiler.progress.plan', 'cs')).toBe('plán');
    expect(t('boiler.progress.forecast', 'cs')).toBe('Predikce');
    expect(t('boiler.progress.confidence_high', 'cs')).toBe('vysoká jistota');
    expect(t('boiler.progress.metric_cost', 'cs')).toBe('Náklady');
    expect(t('boiler.progress.metric_grid', 'cs')).toBe('Síť');
    expect(t('boiler.progress.metric_fve', 'cs')).toBe('FVE');
    expect(t('boiler.progress.metric_ready', 'cs')).toBe('Min. připraveno');
    // and the English side is translated, not the Czech string leaking through
    expect(t('boiler.progress.adherence', 'en')).not.toBe('Soulad');
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-progress"]')).not.toBeNull();
  });
});

// ── unknown must look unknown ────────────────────────────────────────────────

describe('boiler-progress renders unknown as an em dash, never 0', () => {
  it('null adherence renders an em dash and an empty bar', async () => {
    const el = await render(fullProgress({ adherence_pct: null }));
    expect(txt(el, 'progress-adherence-value')).toBe(DASH);
    expect(txt(el, 'progress-adherence-value')).not.toContain('0');
    const bar = el.shadowRoot!.querySelector('[data-testid="progress-adherence-fill"]') as HTMLElement;
    expect(bar.style.width).toBe('0%');
  });

  it('null completed_slots renders the progress percentage as an em dash', async () => {
    const el = await render(fullProgress({ completed_slots: null }));
    expect(txt(el, 'progress-progress')).toBe(`Průběh ${DASH}`);
  });

  it('null energy figures render as em dashes, not zeros', async () => {
    const el = await render(
      fullProgress({ energy: { planned_kwh: null, actual_kwh: null, delta_kwh: null } }),
    );
    expect(txt(el, 'progress-actual-vs-plan')).toBe(`Skutečné ${DASH} / plán ${DASH}`);
  });

  it('a missing energy block does not fall back to zero', async () => {
    const el = await render(fullProgress({ energy: null }));
    expect(txt(el, 'progress-actual-vs-plan')).toBe(`Skutečné ${DASH} / plán ${DASH}`);
  });

  it('a missing eod block renders the forecast as an em dash', async () => {
    const el = await render(fullProgress({ eod: null }));
    expect(txt(el, 'progress-forecast')).toContain(DASH);
    expect(txt(el, 'progress-forecast')).not.toContain('0,00');
  });

  it('slots without a resolvable side render the grid/PV tiles as em dashes', async () => {
    const el = await render(fullProgress({ slots: [] }));
    expect(txt(el, 'progress-metric-grid')).toBe(`Síť ${DASH} (${DASH}) kWh`);
    expect(txt(el, 'progress-metric-fve')).toBe(`FVE ${DASH} (${DASH}) kWh`);
  });
});

// ── the known-wrong plan cost ────────────────────────────────────────────────

describe('boiler-progress plan cost of exactly 0', () => {
  it('renders an em dash rather than "0 Kč"', async () => {
    const slots = buildSlots().map(s => ({
      ...s,
      planned: { ...(s.planned as Record<string, unknown>), cost_czk: 0 },
    })) as BoilerProgressSlot[];
    const el = await render(fullProgress({ slots }));
    const cost = txt(el, 'progress-metric-cost');
    expect(cost).toBe(`Náklady ${DASH} (${DASH}) Kč`);
    expect(cost).not.toContain('0,00');
    expect(cost).not.toContain('0 Kč');
  });
});

// ── unattributed and alt are their own items ─────────────────────────────────

describe('boiler-progress keeps unattributed and alt out of the electric totals', () => {
  it('renders unattributed and gas as their own labelled items', async () => {
    const el = await render(fullProgress());

    const unattributed = txt(el, 'progress-metric-unattributed');
    expect(unattributed).toContain(t('boiler.panel.unattributed_label', 'cs'));
    expect(unattributed).toContain('0,5');
    expect(unattributed).toContain('kWh');

    const alt = txt(el, 'progress-metric-alt');
    expect(alt).toContain('Plyn');
    expect(alt).toContain('2,7');
    expect(alt).toContain('kWh');
  });

  it('never folds unattributed or alt into the grid / PV / actual totals', async () => {
    const el = await render(fullProgress());
    // actual electric = 3.0 exactly — 0.533 unattributed and 2.68 gas stay out
    expect(txt(el, 'progress-actual-vs-plan')).toContain('3,00');
    expect(txt(el, 'progress-metric-grid')).toBe('Síť 8,0 (3,0) kWh');
  });

  it('labels the alt item from the configured alt source type', async () => {
    const el = await render(fullProgress(), 'heat_pump');
    expect(txt(el, 'progress-metric-alt')).toContain('Tepelné čerpadlo');
  });

  it('renders unattributed / alt as em dashes when unknown, never 0', async () => {
    const el = await render(fullProgress({ unattributed_kwh: null, alt_kwh: null }));
    expect(txt(el, 'progress-metric-unattributed')).toContain(DASH);
    expect(txt(el, 'progress-metric-alt')).toContain(DASH);
  });
});

// ── empty state ──────────────────────────────────────────────────────────────

describe('boiler-progress empty state', () => {
  it('renders the neutral empty state when progress is missing', async () => {
    const el = await render(null);
    expect(el.shadowRoot!.querySelector('[data-testid="progress-empty"]')).not.toBeNull();
    expect(txt(el, 'progress-empty')).toBe(t('boiler.progress.empty', 'cs'));
    expect(el.shadowRoot!.querySelector('.prline')).toBeNull();
    expect(el.shadowRoot!.querySelector('.mgrid')).toBeNull();
  });

  it('renders the empty state for an empty object without throwing', async () => {
    const el = await render({} as BoilerProgressData);
    expect(el.shadowRoot!.querySelector('[data-testid="progress-empty"]')).not.toBeNull();
  });

  it('does not throw on a structurally broken payload', async () => {
    const broken = { slots: 'not-an-array', energy: 7, eod: [], completed_slots: 'x' } as unknown as BoilerProgressData;
    const el = await render(broken);
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-progress"]')).not.toBeNull();
    expect(el.shadowRoot!.textContent).not.toContain('undefined');
  });
});

// ── mounted in the shell ─────────────────────────────────────────────────────

describe('boiler shell mounts the progress strip', () => {
  it('renders oig-boiler-progress under the hero and above the plan slot', async () => {
    const el = await fixture<OigBoilerV2Shell>(html`
      <oig-boiler-v2-shell
        .data=${{
          status: null,
          planSlots: [],
          explanation: null,
          manualOverride: null,
          identity: { entryId: null, boxId: null, available: false },
          activity: null,
          sourceSegments: [],
          timeline: [],
          sparkline: null,
          demandMap: null,
          drawMap: null,
          circulationRuns: [],
          legionella: null,
          planSummary: null,
          energyToday: null,
          loading: false,
          loadError: null,
          altSourceType: 'gas',
          progress: fullProgress(),
        }}
        .config=${{ volumeL: 200, heaterPowerKw: 2, targetTempC: 55 }}
        lang="cs"
      ></oig-boiler-v2-shell>
    `);

    const strip = el.shadowRoot!.querySelector('oig-boiler-progress') as OigBoilerProgress | null;
    expect(strip).not.toBeNull();
    expect(strip!.progress).not.toBeNull();

    const children = Array.from(el.shadowRoot!.querySelectorAll('.svg-wrapper, oig-boiler-progress, .advanced-slot'));
    const tags = children.map(c => c.classList.contains('svg-wrapper')
      ? 'hero'
      : c.classList.contains('advanced-slot') ? 'plan' : 'progress');
    expect(tags).toEqual(['hero', 'progress', 'plan']);
  });

  it('shell without progress still renders and shows the empty strip', async () => {
    const el = await fixture<OigBoilerV2Shell>(html`
      <oig-boiler-v2-shell .data=${null} .config=${null} lang="cs"></oig-boiler-v2-shell>
    `);
    expect(el.shadowRoot!.querySelector('oig-boiler-progress')).not.toBeNull();
  });
});
