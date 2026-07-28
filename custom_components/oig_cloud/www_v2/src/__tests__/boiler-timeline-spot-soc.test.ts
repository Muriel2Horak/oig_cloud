// ============================================================================
// M2/U1 — boiler-timeline-chart spot-price overlay + merged SoC curve,
// boiler-metric-panel alt-row gating.
// Fixture pattern follows boiler-v2-ui.test.ts (frozen Prague day).
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  OigBoilerTimelineChart,
  buildSpotSteps,
} from '@/ui/features/boiler/boiler-timeline-chart';
import '@/ui/features/boiler/boiler-metric-panel';
import type { OigBoilerMetricPanel } from '@/ui/features/boiler/boiler-metric-panel';
import type {
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
// buildSpotSteps
// ============================================================================
describe('buildSpotSteps', () => {
  it('returns null with fewer than 2 priced slots', () => {
    const slots = slotRun(3, 600, (i) => ({ spotPrice: i === 0 ? 2.5 : null }));
    expect(buildSpotSteps(slots, PRAGUE_DAY_START)).toBeNull();
  });

  it('maps min price to bottom of the band and max to top', () => {
    const slots = slotRun(2, 600, (i) => ({ spotPrice: i === 0 ? 1.0 : 3.0 }));
    const overlay = buildSpotSteps(slots, PRAGUE_DAY_START)!;
    expect(overlay).not.toBeNull();
    expect(overlay.min).toBe(1.0);
    expect(overlay.max).toBe(3.0);
    // cheaper slot sits lower (greater y) than the expensive one
    expect(overlay.steps[0].y).toBeGreaterThan(overlay.steps[1].y);
  });

  it('flat prices land mid-band, not NaN', () => {
    const slots = slotRun(2, 600, () => ({ spotPrice: 2.0 }));
    const overlay = buildSpotSteps(slots, PRAGUE_DAY_START)!;
    expect(overlay.steps.every(s => isFinite(s.y))).toBe(true);
    expect(overlay.steps[0].y).toBe(overlay.steps[1].y);
  });

  it('clips slots outside the day and ignores non-finite prices', () => {
    const tomorrow = PRAGUE_DAY_START + 86400000;
    const slots = [
      ...slotRun(2, 600, () => ({ spotPrice: 2.0 })),
      makeSlot({
        start: new Date(tomorrow).toISOString(),
        end: new Date(tomorrow + 15 * 60000).toISOString(),
        spotPrice: 9.9,
      }),
      makeSlot({ spotPrice: NaN as unknown as number }),
    ];
    const overlay = buildSpotSteps(slots, PRAGUE_DAY_START)!;
    expect(overlay.steps.length).toBe(2);
    expect(overlay.max).toBe(2.0);
  });
});

// ============================================================================
// Timeline chart — spot overlay rendering
// ============================================================================
describe('OigBoilerTimelineChart spot-price overlay', () => {
  it('renders the spot line with min/max data attributes and legend', async () => {
    const data = makeMinimalBoilerData({
      planSlots: slotRun(4, 600, (i) => ({ spotPrice: [1.5, 2.0, 4.5, 3.0][i] })),
    });
    const el = await mountTimeline(data);
    const line = el.shadowRoot!.querySelector('[data-testid="boiler-spot-line"]');
    expect(line).not.toBeNull();
    expect(line!.getAttribute('data-price-min')).toBe('1.50');
    expect(line!.getAttribute('data-price-max')).toBe('4.50');
    // 4 steps -> 8 polyline points
    expect(line!.getAttribute('points')!.split(' ').length).toBe(8);
    expect(el.shadowRoot!.innerHTML).toContain('Spot Kč/kWh');
    document.body.removeChild(el);
  });

  it('renders no spot line when all spotPrice are null', async () => {
    const data = makeMinimalBoilerData({
      planSlots: slotRun(4, 600, () => ({ spotPrice: null })),
    });
    const el = await mountTimeline(data);
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-spot-line"]')).toBeNull();
    expect(el.shadowRoot!.innerHTML).not.toContain('Spot Kč/kWh');
    document.body.removeChild(el);
  });
});

// ============================================================================
// Timeline chart — merged SoC curve
// ============================================================================
describe('OigBoilerTimelineChart SoC curve (merged from boiler-soc-chart)', () => {
  it('renders the SoC polyline from readyLiters with config.volumeL as capacity', async () => {
    const data = makeMinimalBoilerData({
      planSlots: slotRun(3, 600, (i) => ({ readyLiters: [60, 90, 120][i] })),
    });
    const el = await mountTimeline(data);
    const curve = el.shadowRoot!.querySelector('[data-testid="boiler-soc-curve"]');
    expect(curve).not.toBeNull();
    expect(curve!.getAttribute('data-capacity-liters')).toBe('120');
    const ys = curve!.getAttribute('points')!.split(' ').map(p => parseFloat(p.split(',')[1]));
    // rising litres -> falling y; full capacity (120/120) hits y=0
    expect(ys[0]).toBeGreaterThan(ys[1]);
    expect(ys[1]).toBeGreaterThan(ys[2]);
    expect(ys[2]).toBe(0);
    document.body.removeChild(el);
  });

  it('capacityLiters prop overrides config.volumeL', async () => {
    const data = makeMinimalBoilerData({
      planSlots: slotRun(2, 600, () => ({ readyLiters: 100 })),
    });
    const el = document.createElement('oig-boiler-timeline-chart') as OigBoilerTimelineChart;
    el.data = data;
    el.config = FROZEN_CONFIG;
    el.nowMs = FROZEN_NOW_MS;
    el.timeZone = 'Europe/Prague';
    el.capacityLiters = 200;
    document.body.appendChild(el);
    await el.updateComplete;
    const curve = el.shadowRoot!.querySelector('[data-testid="boiler-soc-curve"]');
    expect(curve!.getAttribute('data-capacity-liters')).toBe('200');
    document.body.removeChild(el);
  });

  it('renders the NOW anchor dot when nowLiters is set', async () => {
    const data = makeMinimalBoilerData({
      planSlots: slotRun(2, 600, () => ({ readyLiters: 100 })),
    });
    const el = document.createElement('oig-boiler-timeline-chart') as OigBoilerTimelineChart;
    el.data = data;
    el.config = FROZEN_CONFIG;
    el.nowMs = FROZEN_NOW_MS;
    el.timeZone = 'Europe/Prague';
    el.nowLiters = 60;
    document.body.appendChild(el);
    await el.updateComplete;
    const dot = el.shadowRoot!.querySelector('[data-testid="boiler-soc-now-dot"]');
    expect(dot).not.toBeNull();
    // 60/120 L -> mid height (viewbox 200)
    expect(parseFloat(dot!.getAttribute('cy')!)).toBeCloseTo(100, 1);
    document.body.removeChild(el);
  });

  it('renders no SoC curve when readyLiters are absent', async () => {
    const data = makeMinimalBoilerData({
      planSlots: slotRun(3, 600, () => ({ readyLiters: null })),
    });
    const el = await mountTimeline(data);
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-soc-curve"]')).toBeNull();
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-soc-now-dot"]')).toBeNull();
    document.body.removeChild(el);
  });
});

// ============================================================================
// Metric panel — alt-row gating (alt configured OR altKwh > 0)
// ============================================================================
describe('OigBoilerMetricPanel alt row gating', () => {
  async function mountPanel(data: BoilerV2Data): Promise<OigBoilerMetricPanel> {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    el.data = data;
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  }

  const energyBase = {
    totalKwh: 3.0,
    fveKwh: 2.0,
    gridKwh: 1.0,
    altKwh: 0,
    batteryKwh: 0,
    unattributedKwh: 0,
    sourceInvalid: false,
  };

  it('hides alt row when no alt source configured and altKwh is 0', async () => {
    const el = await mountPanel(makeMinimalBoilerData({
      energyToday: { ...energyBase },
      altSourceType: null,
    }));
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-alt-row"]')).toBeNull();
    document.body.removeChild(el);
  });

  it('shows alt row at 0 kWh when alt source is configured', async () => {
    const el = await mountPanel(makeMinimalBoilerData({
      energyToday: { ...energyBase },
      altSourceType: 'gas',
    }));
    const row = el.shadowRoot!.querySelector('[data-testid="boiler-alt-row"]');
    expect(row).not.toBeNull();
    expect(row!.textContent).toContain('Plyn');
    expect(row!.textContent).toContain('0,0 kWh');
    document.body.removeChild(el);
  });

  it('shows alt row when altKwh > 0 even without configured type', async () => {
    const el = await mountPanel(makeMinimalBoilerData({
      energyToday: { ...energyBase, altKwh: 1.2, totalKwh: 4.2 },
      altSourceType: null,
    }));
    const row = el.shadowRoot!.querySelector('[data-testid="boiler-alt-row"]');
    expect(row).not.toBeNull();
    expect(row!.textContent).toContain('1,2 kWh');
    document.body.removeChild(el);
  });
});
