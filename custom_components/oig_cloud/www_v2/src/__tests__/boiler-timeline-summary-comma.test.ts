// Regression: boiler-timeline-chart .timeline-summary must render Czech comma decimals.
// Prior fixes updated every other boiler component but missed this block.

import { describe, it, expect } from 'vitest';
import { OigBoilerTimelineChart } from '@/ui/features/boiler/boiler-timeline-chart';

// 2026-06-15 12:00 UTC
const FROZEN_NOW_MS = Date.UTC(2026, 5, 15, 12, 0, 0);
// Prague local midnight start for that day
const PRAGUE_DAY_START = Date.UTC(2026, 5, 15, 0, 0, 0) - 2 * 3600000;

const FROZEN_CONFIG = {
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

function makeMinimalBoilerData(overrides = {}) {
  return Object.assign({
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
  }, overrides);
}

function makeSlot(overrides = {}) {
  return Object.assign({
    start: new Date(PRAGUE_DAY_START).toISOString(),
    end: new Date(PRAGUE_DAY_START + 15 * 60000).toISOString(),
    consumptionKwh: 0.5,
    confidence: 0.9,
    recommendedSource: 'fve',
    spotPrice: null,
    altPrice: null,
    overflowAvailable: false,
    heatingKwh: 0.4,
  }, overrides);
}

async function mountTimeline(data, config = FROZEN_CONFIG) {
  const el = document.createElement('oig-boiler-timeline-chart');
  el.data = data;
  el.config = config;
  el.nowMs = FROZEN_NOW_MS;
  el.timeZone = 'Europe/Prague';
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('OigBoilerTimelineChart timeline-summary Czech comma decimals', () => {
  it('renders dot decimals as commas for all four summary numbers', async () => {
    const data = makeMinimalBoilerData({
      planSlots: [
        makeSlot({ gridKwh: 1.2, pvKwh: 0.8, altKwh: 0.4, estimatedCostCzk: 3.45 }),
        makeSlot({ gridKwh: 2.3, pvKwh: 1.1, altKwh: 0.0, estimatedCostCzk: 6.78 }),
      ],
    });
    const el = await mountTimeline(data);
    // Runtime reference keeps the module import from being tree-shaken,
    // which guarantees the custom element is registered.
    expect(el).toBeInstanceOf(OigBoilerTimelineChart);

    const summary = el.shadowRoot!.querySelector('.timeline-summary');
    expect(summary).not.toBeNull();
    const text = summary!.textContent!;

    // Expected sums: grid=3.5, pv+alt=2.3, cost=10.23, total=5.8
    expect(text).toContain('3,5 kWh');
    expect(text).toContain('2,3 kWh');
    expect(text).toContain('10,23 Kč');
    expect(text).toContain('5,8 kWh');

    // Guard against regression to dot-decimal rendering.
    expect(text).not.toMatch(/\b3\.5 kWh\b/);
    expect(text).not.toMatch(/\b2\.3 kWh\b/);
    expect(text).not.toMatch(/\b10\.23 Kč\b/);
    expect(text).not.toMatch(/\b5\.8 kWh\b/);

    document.body.removeChild(el);
  });

  it('omits cost and total lines when their sums are zero', async () => {
    const data = makeMinimalBoilerData({
      planSlots: [makeSlot({ gridKwh: 0, pvKwh: 0, altKwh: 0, estimatedCostCzk: 0 })],
    });
    const el = await mountTimeline(data);
    expect(el).toBeInstanceOf(OigBoilerTimelineChart);

    const summary = el.shadowRoot!.querySelector('.timeline-summary');
    expect(summary).not.toBeNull();
    const text = summary!.textContent!;
    expect(text).toContain('ze sítě');
    expect(text).not.toContain('Kč');
    expect(text).not.toContain('spotřeba');

    document.body.removeChild(el);
  });
});
