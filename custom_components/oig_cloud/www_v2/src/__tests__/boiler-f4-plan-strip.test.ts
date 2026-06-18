// ============================================================================
// F4 Plan Strip — unit tests
// Covers:
//   - normalizeDisplaySource: all source keys + unknown
//   - isoToFraction: in-range, before, after plan horizon
//   - groupSlotsToBands: basic grouping, source change splits band, legionella flag,
//     battery source, skip zero-heating slots, contiguous same source merges
//   - nowFraction: in-range, before/after horizon
//   - deadlineFraction: same-day, next-day wrap, bad format
//   - OigBoilerPlanStrip component render: empty state, heading, bands, draws,
//     NOW line, deadline line, legend entries
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  normalizeDisplaySource,
  isoToFraction,
  groupSlotsToBands,
  nowFraction,
  deadlineFraction,
  planMidnightMs,
  OigBoilerPlanStrip,
} from '@/ui/features/boiler/boiler-plan-strip';
import type { BoilerV2PlanSlot } from '@/ui/features/boiler/types';

// ── Template inspection helpers ───────────────────────────────────────────────

function getTemplateStrings(el: { render(): unknown }): string {
  const result = Reflect.apply(
    Reflect.get(Object.getPrototypeOf(el), 'render'),
    el,
    [],
  ) as { strings?: ArrayLike<string> } | null;
  if (!result) return '';
  const strings = result.strings;
  if (!strings) return '';
  return Array.from(strings).join('');
}

function getTemplateValues(el: { render(): unknown }): unknown[] {
  const result = Reflect.apply(
    Reflect.get(Object.getPrototypeOf(el), 'render'),
    el,
    [],
  ) as { values?: unknown[] } | null;
  return result?.values ?? [];
}

function joinTemplate(el: { render(): unknown }): string {
  return getTemplateStrings(el) + JSON.stringify(getTemplateValues(el));
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

const T0 = '2026-06-11T00:00:00.000Z'; // plan horizon start (midnight UTC)
const T1 = '2026-06-11T06:00:00.000Z'; // +6h → 0.25
const T2 = '2026-06-11T12:00:00.000Z'; // +12h → 0.5
const T_END = '2026-06-12T00:00:00.000Z'; // +24h → 1.0

function makeSlot(
  start: string,
  end: string,
  source: string,
  heatingKwh: number,
  purpose?: string,
): BoilerV2PlanSlot {
  return {
    start,
    end,
    consumptionKwh: heatingKwh,
    confidence: 1,
    recommendedSource: source,
    overflowAvailable: false,
    spotPrice: null,
    altPrice: null,
    heatingKwh,
    pvKwh: 0,
    gridKwh: 0,
    altKwh: 0,
    expectedTempTopC: 55,
    comfortSatisfied: true,
    estimatedCostCzk: 0,
    ...(purpose ? { purpose } : {}),
  };
}

// ── normalizeDisplaySource ─────────────────────────────────────────────────────

describe('normalizeDisplaySource', () => {
  it('maps fve → fve', () => expect(normalizeDisplaySource('fve')).toBe('fve'));
  it('maps overflow → fve', () => expect(normalizeDisplaySource('overflow')).toBe('fve'));
  it('maps pv → fve', () => expect(normalizeDisplaySource('pv')).toBe('fve'));
  it('maps FVE uppercase → fve', () => expect(normalizeDisplaySource('FVE')).toBe('fve'));
  it('maps grid → grid', () => expect(normalizeDisplaySource('grid')).toBe('grid'));
  it('maps battery → battery', () => expect(normalizeDisplaySource('battery')).toBe('battery'));
  it('maps discharge → battery', () => expect(normalizeDisplaySource('discharge')).toBe('battery'));
  it('maps alternative → alternative', () => expect(normalizeDisplaySource('alternative')).toBe('alternative'));
  it('maps alt → alternative', () => expect(normalizeDisplaySource('alt')).toBe('alternative'));
  it('maps null → null', () => expect(normalizeDisplaySource(null)).toBeNull());
  it('maps empty string → null', () => expect(normalizeDisplaySource('')).toBeNull());
  it('maps unknown → null', () => expect(normalizeDisplaySource('unknown_xyz')).toBeNull());
});

// ── isoToFraction ──────────────────────────────────────────────────────────────

describe('isoToFraction', () => {
  it('returns 0 at plan start', () => {
    expect(isoToFraction(T0, T0)).toBe(0);
  });

  it('returns 0.25 at +6h', () => {
    expect(isoToFraction(T1, T0)).toBeCloseTo(0.25, 5);
  });

  it('returns 0.5 at +12h', () => {
    expect(isoToFraction(T2, T0)).toBeCloseTo(0.5, 5);
  });

  it('returns 1.0 at +24h', () => {
    expect(isoToFraction(T_END, T0)).toBe(1);
  });

  it('clamps to 0 before plan start', () => {
    expect(isoToFraction('2026-06-10T23:00:00Z', T0)).toBe(0);
  });

  it('clamps to 1 after plan end', () => {
    expect(isoToFraction('2026-06-12T12:00:00Z', T0)).toBe(1);
  });
});

// ── planMidnightMs ────────────────────────────────────────────────────────────

describe('planMidnightMs', () => {
  it('returns midnight of calendar day for midnight-UTC start', () => {
    const ms = planMidnightMs('2026-06-11T00:00:00.000Z');
    const d = new Date(ms);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
    expect(d.getMilliseconds()).toBe(0);
  });

  it('returns midnight of same calendar day for non-midnight plan start', () => {
    // Plan computed at 10:00 local → midnight of same day
    const tenAM = new Date(2026, 5, 11, 10, 0, 0, 0); // local 10:00
    const ms = planMidnightMs(tenAM.toISOString());
    const d = new Date(ms);
    expect(d.getDate()).toBe(11);
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });
});

// ── isoToFraction (midnight-anchored) ─────────────────────────────────────────

describe('isoToFraction midnight-anchor correctness', () => {
  it('fraction for 10:00 local on a plan starting at 10:00 is 10/24', () => {
    // Both the slot start and plan start are at the same 10:00 local time.
    // On the midnight-anchored axis, 10:00 = 10/24 ≈ 0.4167, not 0.
    const tenAM = new Date(2026, 5, 11, 10, 0, 0, 0);
    const frac = isoToFraction(tenAM.toISOString(), tenAM.toISOString());
    expect(frac).toBeCloseTo(10 / 24, 4);
  });

  it('midnight on the plan day is fraction 0', () => {
    const tenAM = new Date(2026, 5, 11, 10, 0, 0, 0);
    const midnightSameDay = new Date(2026, 5, 11, 0, 0, 0, 0);
    const frac = isoToFraction(midnightSameDay.toISOString(), tenAM.toISOString());
    expect(frac).toBe(0);
  });
});

// ── groupSlotsToBands ─────────────────────────────────────────────────────────

describe('groupSlotsToBands', () => {
  it('returns empty array when no slots', () => {
    expect(groupSlotsToBands([], T0)).toEqual([]);
  });

  it('skips slots with heatingKwh <= 0', () => {
    const slot = makeSlot(T0, T1, 'fve', 0);
    expect(groupSlotsToBands([slot], T0)).toHaveLength(0);
  });

  it('creates one band for a single heating slot', () => {
    const slot = makeSlot(T0, T1, 'fve', 1.0);
    const bands = groupSlotsToBands([slot], T0);
    expect(bands).toHaveLength(1);
    expect(bands[0].source).toBe('fve');
    expect(bands[0].xStart).toBeCloseTo(0, 5);
    expect(bands[0].xEnd).toBeCloseTo(0.25, 5);
    expect(bands[0].hasLegionella).toBe(false);
    expect(bands[0].heatingKwh).toBe(1.0);
  });

  it('merges contiguous slots with same source', () => {
    const s1 = makeSlot(T0, '2026-06-11T03:00:00Z', 'grid', 0.5);
    const s2 = makeSlot('2026-06-11T03:00:00Z', T1, 'grid', 0.5);
    const bands = groupSlotsToBands([s1, s2], T0);
    expect(bands).toHaveLength(1);
    expect(bands[0].heatingKwh).toBeCloseTo(1.0, 5);
    expect(bands[0].xStart).toBeCloseTo(0, 5);
    expect(bands[0].xEnd).toBeCloseTo(0.25, 5);
  });

  it('splits bands when source changes', () => {
    const s1 = makeSlot(T0, '2026-06-11T03:00:00Z', 'fve', 0.5);
    const s2 = makeSlot('2026-06-11T03:00:00Z', T1, 'grid', 0.5);
    const bands = groupSlotsToBands([s1, s2], T0);
    expect(bands).toHaveLength(2);
    expect(bands[0].source).toBe('fve');
    expect(bands[1].source).toBe('grid');
  });

  it('splits band at zero-heating gap', () => {
    const s1 = makeSlot(T0, '2026-06-11T02:00:00Z', 'fve', 0.5);
    const s2 = makeSlot('2026-06-11T02:00:00Z', '2026-06-11T04:00:00Z', 'fve', 0); // gap
    const s3 = makeSlot('2026-06-11T04:00:00Z', T1, 'fve', 0.5);
    const bands = groupSlotsToBands([s1, s2, s3], T0);
    expect(bands).toHaveLength(2);
  });

  it('sets hasLegionella when slot has purpose=legionella', () => {
    const slot = makeSlot(T0, T1, 'fve', 1.0, 'legionella');
    const bands = groupSlotsToBands([slot], T0);
    expect(bands[0].hasLegionella).toBe(true);
  });

  it('does not set hasLegionella for purpose=comfort', () => {
    const slot = makeSlot(T0, T1, 'fve', 1.0, 'comfort');
    const bands = groupSlotsToBands([slot], T0);
    expect(bands[0].hasLegionella).toBe(false);
  });

  it('normalizes battery source', () => {
    const slot = makeSlot(T0, T1, 'battery', 1.0);
    const bands = groupSlotsToBands([slot], T0);
    expect(bands[0].source).toBe('battery');
  });

  it('normalizes discharge → battery', () => {
    const slot = makeSlot(T0, T1, 'discharge', 1.0);
    const bands = groupSlotsToBands([slot], T0);
    expect(bands[0].source).toBe('battery');
  });

  it('normalizes alternative source', () => {
    const slot = makeSlot(T0, T1, 'alternative', 1.0);
    const bands = groupSlotsToBands([slot], T0);
    expect(bands[0].source).toBe('alternative');
  });

  it('skips slots with unknown source', () => {
    const slot = makeSlot(T0, T1, 'mystery_source', 1.0);
    expect(groupSlotsToBands([slot], T0)).toHaveLength(0);
  });

  it('propagates hasLegionella to band that has mixed slots', () => {
    const s1 = makeSlot(T0, '2026-06-11T03:00:00Z', 'fve', 0.5, 'comfort');
    const s2 = makeSlot('2026-06-11T03:00:00Z', T1, 'fve', 0.5, 'legionella');
    const bands = groupSlotsToBands([s1, s2], T0);
    expect(bands).toHaveLength(1);
    expect(bands[0].hasLegionella).toBe(true);
  });
});

// ── nowFraction ────────────────────────────────────────────────────────────────

describe('nowFraction', () => {
  it('returns 0.5 when now is exactly 12h into plan', () => {
    const nowMs = new Date(T2).getTime();
    expect(nowFraction(T0, nowMs)).toBeCloseTo(0.5, 5);
  });

  it('returns null when now is before plan start', () => {
    const nowMs = new Date('2026-06-10T23:59:59Z').getTime();
    expect(nowFraction(T0, nowMs)).toBeNull();
  });

  it('returns null when now is after plan end', () => {
    const nowMs = new Date('2026-06-12T01:00:00Z').getTime();
    expect(nowFraction(T0, nowMs)).toBeNull();
  });

  it('returns 0 exactly at plan start', () => {
    const nowMs = new Date(T0).getTime();
    expect(nowFraction(T0, nowMs)).toBe(0);
  });
});

// ── deadlineFraction ───────────────────────────────────────────────────────────

describe('deadlineFraction', () => {
  it('computes fraction for deadline after plan start (same day)', () => {
    // Plan starts at 00:00 UTC, deadline 18:00 → fraction = 18/24 = 0.75
    const f = deadlineFraction(T0, '18:00');
    expect(f).toBeCloseTo(0.75, 5);
  });

  it('computes fraction for deadline at 06:00 (same day)', () => {
    const f = deadlineFraction(T0, '06:00');
    expect(f).toBeCloseTo(0.25, 5);
  });

  it('deadline at 06:00 for plan starting 12:00 is at 6/24 on midnight axis', () => {
    // Axis is always midnight-anchored (00–24), so deadline 06:00 = fraction 0.25
    // regardless of when the plan was computed.
    const planStart = '2026-06-11T12:00:00.000Z';
    const f = deadlineFraction(planStart, '06:00');
    expect(f).toBeCloseTo(0.25, 5);
  });

  it('returns null for invalid format', () => {
    expect(deadlineFraction(T0, 'not-a-time')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(deadlineFraction(T0, '')).toBeNull();
  });
});

// ── OigBoilerPlanStrip component render ───────────────────────────────────────

describe('OigBoilerPlanStrip component', () => {
  let el: OigBoilerPlanStrip;

  beforeEach(() => {
    el = new OigBoilerPlanStrip();
    el.lang = 'cs';
  });

  it('renders empty state when no slots', () => {
    el.slots = [];
    const out = joinTemplate(el);
    expect(out).toContain('boiler-plan-strip');
    expect(out).toContain('Plán ohřevu zatím není k dispozici');
  });

  it('renders heading with correct text when slots present', () => {
    el.slots = [makeSlot(T0, T1, 'fve', 1.0)];
    const out = joinTemplate(el);
    expect(out).toContain('Plán ohřevu 24 h');
  });

  it('renders time axis with 00..24 labels', () => {
    el.slots = [makeSlot(T0, T1, 'fve', 1.0)];
    const out = joinTemplate(el);
    expect(out).toContain('plan-strip-time-axis');
  });

  it('renders fve band when fve slot present', () => {
    el.slots = [makeSlot(T0, T1, 'fve', 1.5)];
    const out = joinTemplate(el);
    expect(out).toContain('plan-band-fve');
  });

  it('renders grid band when grid slot present', () => {
    el.slots = [makeSlot(T0, T1, 'grid', 1.0)];
    const out = joinTemplate(el);
    expect(out).toContain('plan-band-grid');
  });

  it('renders battery band when battery slot present', () => {
    el.slots = [makeSlot(T0, T1, 'battery', 1.0)];
    const out = joinTemplate(el);
    expect(out).toContain('plan-band-battery');
  });

  it('renders alternative band when alternative slot present', () => {
    el.slots = [makeSlot(T0, T1, 'alternative', 1.0)];
    const out = joinTemplate(el);
    expect(out).toContain('plan-band-alternative');
  });

  it('renders legionella-marked band', () => {
    el.slots = [makeSlot(T0, T1, 'fve', 1.0, 'legionella')];
    const out = joinTemplate(el);
    expect(out).toContain('plan-band-fve-legionella');
  });

  it('renders NOW line when in range', () => {
    // Plan starts at T0 (midnight UTC). Use T1 (06:00 UTC, fraction 0.25) as now.
    // We cannot control Date.now() without mocking, but we can verify the element
    // is rendered by using a fixed nowMs indirectly via checking the line appears
    // for a plan that spans the current wall-clock time.
    // Instead, test via the rendered output: if plan starts in the past (now > T0),
    // the NOW line should appear.
    // We'll create a plan starting TODAY at local midnight so "now" always
    // falls inside the 00-24 axis window regardless of wall-clock time
    // (the previous Date.now()-6h fixture crossed midnight between 00:00 and
    // 06:00 and made nowFraction() > 1 — time-of-day flaky).
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const endOfDay = new Date(todayMidnight.getTime() + 24 * 3600 * 1000);
    el.slots = [makeSlot(todayMidnight.toISOString(), endOfDay.toISOString(), 'fve', 1.0)];
    const out = joinTemplate(el);
    expect(out).toContain('plan-strip-now-line');
  });

  it('renders deadline line when planSummary.deadlineTime provided', () => {
    const pastStart = new Date(Date.now() - 6 * 3600 * 1000).toISOString();
    const futureEnd = new Date(Date.now() + 18 * 3600 * 1000).toISOString();
    el.slots = [makeSlot(pastStart, futureEnd, 'grid', 1.0)];
    // Use a deadline well in the future within the 24h window
    const deadlineHour = new Date(Date.now() + 8 * 3600 * 1000).getHours();
    const deadlineMin = new Date(Date.now() + 8 * 3600 * 1000).getMinutes();
    el.planSummary = {
      estimatedCostCzk: 5.0,
      costIfAllGrid: 8.0,
      costIfAllAlt: 12.0,
      deadlineTime: `${String(deadlineHour).padStart(2,'0')}:${String(deadlineMin).padStart(2,'0')}`,
    };
    const out = joinTemplate(el);
    expect(out).toContain('plan-strip-deadline-line');
  });

  it('renders demand draws section when demandMap provided', () => {
    el.slots = [makeSlot(T0, T1, 'fve', 1.0)];
    const p80 = new Array(96).fill(0);
    p80[0] = 0.8; // first slot has significant demand
    p80[24] = 0.6; // slot 24 (at +6h)
    el.demandMap = {
      slotDurationMin: 15,
      slotsP50: new Array(96).fill(0),
      slotsP80: p80,
      windows: [],
      profile: { category: 'workday_summer', level: 'exact', daysUsed: 14, label: 'Pracovní den', fallbackUsed: false },
      confidence: 0.9,
      minConfidence: 0.3,
      drivesPlan: true,
    };
    // Draws appear in tl section as elements with class="draw"
    // (nested template strings are JSON-serialized so quotes are escaped)
    const out = joinTemplate(el);
    expect(out).toMatch(/class=\\"draw\\"|class="draw"/);
  });

  it('renders legend entries for present sources', () => {
    el.slots = [
      makeSlot(T0, '2026-06-11T06:00:00Z', 'fve', 1.0),
      makeSlot('2026-06-11T06:00:00Z', '2026-06-11T12:00:00Z', 'grid', 0.5),
    ];
    const out = joinTemplate(el);
    expect(out).toContain('plan-strip-legend');
    // FVE legend entry present
    expect(out).toContain('Přetoky FVE');
    // Grid legend entry present
    expect(out).toContain('Levné okno');
  });

  it('does not render battery legend entry when no battery slot', () => {
    el.slots = [makeSlot(T0, T1, 'fve', 1.0)];
    const out = joinTemplate(el);
    expect(out).not.toContain('Ohřev z baterie');
  });

  it('renders circulation legend when circulationRuns present', () => {
    el.slots = [makeSlot(T0, T1, 'fve', 1.0)];
    el.circulationRuns = [{ start: T0, end: '2026-06-11T00:15:00Z', label: 'circ' }];
    const out = joinTemplate(el);
    expect(out).toContain('cirkulace');
  });

  it('does not render circulation legend when circulationRuns empty', () => {
    el.slots = [makeSlot(T0, T1, 'fve', 1.0)];
    el.circulationRuns = [];
    const out = joinTemplate(el);
    // legend_circ should not appear
    expect(out).not.toContain('plan-strip-circ');
  });

  it('renders temp svg when slots have expectedTempTopC', () => {
    const s = makeSlot(T0, T1, 'fve', 1.0);
    s.expectedTempTopC = 58;
    const s2 = makeSlot(T1, T2, 'fve', 1.0);
    s2.expectedTempTopC = 60;
    el.slots = [s, s2];
    const out = joinTemplate(el);
    expect(out).toContain('plan-strip-temp-svg');
  });

  it('does not render temp svg when all expectedTempTopC are null', () => {
    const s = makeSlot(T0, T1, 'fve', 1.0);
    s.expectedTempTopC = null;
    el.slots = [s];
    const out = joinTemplate(el);
    expect(out).not.toContain('plan-strip-temp-svg');
  });
});
