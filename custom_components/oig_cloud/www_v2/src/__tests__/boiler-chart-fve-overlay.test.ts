// ============================================================================
// M2b — boiler-timeline-chart FVE-production overlay + overflow marker.
// Fixture pattern follows boiler-timeline-spot-soc.test.ts (frozen Prague day).
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  OigBoilerTimelineChart,
  buildFveOverlay,
  findOverflowWindow,
} from '@/ui/features/boiler/boiler-timeline-chart';
import type {
  BatteryForecastEntry,
  BoilerConfig,
  BoilerV2Data,
  BoilerV2PlanSlot,
} from '@/ui/features/boiler/types';

// 2026-05-03 15:00 Prague local
const FROZEN_NOW_MS = Date.UTC(2026, 4, 3, 13, 0, 0);
// Prague midnight May 3 = 2026-05-02T22:00:00Z
const PRAGUE_DAY_START = Date.UTC(2026, 4, 2, 22, 0, 0);

const FROZEN_CONFIG: BoilerConfig = {
  volumeL: 120,
  heaterPowerW: 2000,
  heaterPowerKw: 2.0,
  targetTempC: 60,
  deadlineTime: '19:30',
  stratificationMode: 'standard',
  kCoefficient: '0.5',
  coldInletTempC: 10,
  auraMaxTempC: 75,
};

function makeMinimalBoilerData(overrides: Partial<BoilerV2Data> = {}): BoilerV2Data {
  return {
    status: null,
    planSlots: [],
    explanation: null,
    manualOverride: null,
    identity: { entryId: 'e1', boxId: 'b1', available: true },
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
    ...overrides,
  };
}

function makeSlot(overrides: Partial<BoilerV2PlanSlot> = {}): BoilerV2PlanSlot {
  return {
    start: new Date(PRAGUE_DAY_START + 0).toISOString(),
    end: new Date(PRAGUE_DAY_START + 15 * 60000).toISOString(),
    consumptionKwh: 0.5,
    confidence: 0.9,
    recommendedSource: 'fve',
    spotPrice: null,
    altPrice: null,
    overflowAvailable: false,
    heatingKwh: 0.4,
    ...overrides,
  };
}

/** n contiguous 15-min slots starting at day start + offsetMin. */
function slotRun(
  n: number,
  offsetMin: number,
  per: (i: number) => Partial<BoilerV2PlanSlot>,
): BoilerV2PlanSlot[] {
  return Array.from({ length: n }, (_, i) =>
    makeSlot({
      start: new Date(PRAGUE_DAY_START + (offsetMin + i * 15) * 60000).toISOString(),
      end: new Date(PRAGUE_DAY_START + (offsetMin + (i + 1) * 15) * 60000).toISOString(),
      ...per(i),
    }),
  );
}

function makeForecastEntry(overrides: Partial<BatteryForecastEntry> = {}): BatteryForecastEntry {
  return {
    timestampMs: PRAGUE_DAY_START,
    solarKwh: 0,
    gridChargeKwh: 0,
    batterySocPct: null,
    ...overrides,
  };
}

async function mountTimeline(
  data: BoilerV2Data | null,
  config: BoilerConfig | null = FROZEN_CONFIG,
): Promise<OigBoilerTimelineChart> {
  const el = document.createElement('oig-boiler-timeline-chart') as OigBoilerTimelineChart;
  el.data = data;
  el.config = config;
  el.nowMs = FROZEN_NOW_MS;
  el.timeZone = 'Europe/Prague';
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

// ============================================================================
// buildFveOverlay
// ============================================================================
describe('buildFveOverlay', () => {
  it('returns null when fewer than 2 points carry data', () => {
    const slots = slotRun(1, 600, () => ({ pvKwh: 1.0 }));
    expect(buildFveOverlay(null, slots, PRAGUE_DAY_START)).toBeNull();
  });

  it('returns null when all points are zero', () => {
    const slots = slotRun(4, 600, () => ({ pvKwh: 0 }));
    expect(buildFveOverlay(null, slots, PRAGUE_DAY_START)).toBeNull();
  });

  it('prefers batteryForecast[].solarKwh when it covers the day', () => {
    const forecast = [
      makeForecastEntry({ timestampMs: PRAGUE_DAY_START + 600 * 60000, solarKwh: 0.5 }),
      makeForecastEntry({ timestampMs: PRAGUE_DAY_START + 615 * 60000, solarKwh: 1.0 }),
    ];
    const slots = slotRun(2, 600, () => ({ pvKwh: 99 })); // would dominate if used — must NOT be picked
    const overlay = buildFveOverlay(forecast, slots, PRAGUE_DAY_START)!;
    expect(overlay).not.toBeNull();
    expect(overlay.usedFallback).toBe(false);
    // solarKwh 1.0 * 4 = 4 kW peak, not 99*4
    expect(overlay.maxKw).toBeCloseTo(4.0, 5);
    expect(overlay.points.length).toBe(2);
  });

  it('falls back to planSlots[].pvKwh when batteryForecast is absent', () => {
    const slots = slotRun(3, 600, (i) => ({ pvKwh: [0.2, 0.5, 0.3][i] }));
    const overlay = buildFveOverlay(null, slots, PRAGUE_DAY_START)!;
    expect(overlay).not.toBeNull();
    expect(overlay.usedFallback).toBe(true);
    // max pvKwh 0.5 * 4 = 2 kW
    expect(overlay.maxKw).toBeCloseTo(2.0, 5);
    expect(overlay.points.length).toBe(3);
  });

  it('falls back when batteryForecast has data but none inside this day window', () => {
    const tomorrow = PRAGUE_DAY_START + 86400000;
    const forecast = [
      makeForecastEntry({ timestampMs: tomorrow + 600 * 60000, solarKwh: 1.0 }),
      makeForecastEntry({ timestampMs: tomorrow + 615 * 60000, solarKwh: 1.0 }),
    ];
    const slots = slotRun(2, 600, () => ({ pvKwh: 0.4 }));
    const overlay = buildFveOverlay(forecast, slots, PRAGUE_DAY_START)!;
    expect(overlay).not.toBeNull();
    expect(overlay.usedFallback).toBe(true);
  });

  it('rising then falling kw maps to a rising-then-falling area (y inverted, higher kw -> lower y)', () => {
    const slots = slotRun(3, 600, (i) => ({ pvKwh: [0.1, 0.5, 0.2][i] }));
    const overlay = buildFveOverlay(null, slots, PRAGUE_DAY_START)!;
    expect(overlay.points[1].y).toBeLessThan(overlay.points[0].y);
    expect(overlay.points[1].y).toBeLessThan(overlay.points[2].y);
  });
});

// ============================================================================
// findOverflowWindow
// ============================================================================
describe('findOverflowWindow', () => {
  it('returns null when no slot has pv-only sourcing', () => {
    const slots = slotRun(4, 600, () => ({ pvKwh: 0.3, gridKwh: 0.1 }));
    expect(findOverflowWindow(slots)).toBeNull();
  });

  it('finds the first contiguous run of pv>0, grid<=0, alt<=0 slots', () => {
    const slots = [
      ...slotRun(2, 600, () => ({ pvKwh: 0, gridKwh: 0.2, altKwh: 0 })),
      ...slotRun(3, 630, () => ({ pvKwh: 0.4, gridKwh: 0, altKwh: 0 })),
      ...slotRun(2, 675, () => ({ pvKwh: 0, gridKwh: 0.1, altKwh: 0 })),
    ];
    const window = findOverflowWindow(slots)!;
    expect(window).not.toBeNull();
    expect(window.startMs).toBe(new Date(slots[2].start).getTime());
    expect(window.endMs).toBe(new Date(slots[4].end).getTime());
  });

  it('stops at the first run and does not extend across a gap', () => {
    const slots = [
      ...slotRun(1, 600, () => ({ pvKwh: 0.4, gridKwh: 0, altKwh: 0 })),
      ...slotRun(1, 615, () => ({ pvKwh: 0, gridKwh: 0.2, altKwh: 0 })),
      ...slotRun(1, 630, () => ({ pvKwh: 0.4, gridKwh: 0, altKwh: 0 })),
    ];
    const window = findOverflowWindow(slots)!;
    expect(window.startMs).toBe(new Date(slots[0].start).getTime());
    expect(window.endMs).toBe(new Date(slots[0].end).getTime());
  });

  it('ignores alt-sourced slots even with pv > 0', () => {
    const slots = slotRun(2, 600, () => ({ pvKwh: 0.4, gridKwh: 0, altKwh: 0.1 }));
    expect(findOverflowWindow(slots)).toBeNull();
  });
});

// ============================================================================
// Timeline chart — FVE overlay + overflow marker rendering
// ============================================================================
describe('OigBoilerTimelineChart FVE overlay', () => {
  it('renders the amber FVE area and its own kW scale label from batteryForecast', async () => {
    const forecast = [
      makeForecastEntry({ timestampMs: PRAGUE_DAY_START + 600 * 60000, solarKwh: 0.3 }),
      makeForecastEntry({ timestampMs: PRAGUE_DAY_START + 615 * 60000, solarKwh: 0.6 }),
    ];
    const data = makeMinimalBoilerData({
      planSlots: slotRun(2, 600, () => ({ pvKwh: 0 })),
      batteryForecast: forecast,
    });
    const el = await mountTimeline(data);
    const area = el.shadowRoot!.querySelector('[data-testid="boiler-fve-area"]');
    expect(area).not.toBeNull();
    expect(el.shadowRoot!.innerHTML).toContain('2.4 kW'); // 0.6 * 4
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-fve-overlay-legend"]')).not.toBeNull();
    document.body.removeChild(el);
  });

  it('renders no FVE area when there is no PV production anywhere', async () => {
    const data = makeMinimalBoilerData({
      planSlots: slotRun(3, 600, () => ({ pvKwh: 0 })),
    });
    const el = await mountTimeline(data);
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-fve-area"]')).toBeNull();
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-fve-overlay-legend"]')).toBeNull();
    document.body.removeChild(el);
  });
});

describe('OigBoilerTimelineChart overflow marker', () => {
  it('renders the overflow marker, band and top-slices for a pv-only window today', async () => {
    const slots = [
      ...slotRun(2, 600, () => ({ pvKwh: 0, gridKwh: 0.2, heatingKwh: 0.4 })),
      ...slotRun(2, 630, () => ({ pvKwh: 0.5, gridKwh: 0, altKwh: 0, heatingKwh: 0.5 })),
    ];
    const data = makeMinimalBoilerData({ planSlots: slots });
    const el = await mountTimeline(data);
    const marker = el.shadowRoot!.querySelector('[data-testid="boiler-overflow-marker"]');
    expect(marker).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-overflow-band"]')).not.toBeNull();
    expect(el.shadowRoot!.querySelectorAll('[data-testid="boiler-overflow-slice"]').length).toBeGreaterThan(0);
    expect(el.shadowRoot!.innerHTML).toContain('baterie 100 % → přebytek do bojleru');
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-overflow-legend"]')).not.toBeNull();
    document.body.removeChild(el);
  });

  it('renders no overflow marker when no slot is pv-only', async () => {
    const slots = slotRun(4, 600, () => ({ pvKwh: 0.3, gridKwh: 0.1, heatingKwh: 0.4 }));
    const data = makeMinimalBoilerData({ planSlots: slots });
    const el = await mountTimeline(data);
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-overflow-marker"]')).toBeNull();
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-overflow-band"]')).toBeNull();
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-overflow-legend"]')).toBeNull();
    document.body.removeChild(el);
  });
});
