import { beforeAll, describe, expect, it, vi } from 'vitest';

// Integration test for the Ceny-tab stat-card → chart zoom wiring.
//
// The bug class this guards against: `oig-stats-card` click dispatches
// `card-click` → `oig-pricing-stats` re-dispatches `zoom-to-block` — and
// nothing listened for it, so the chart never zoomed. The wiring lives in
// app.ts (`@zoom-to-block` on <oig-pricing-stats> calling
// chart.zoomToTimeRange), so this test mounts the real OigApp shell with the
// real pricing elements and drives the flow end-to-end from the card click.

// Data layer mocked out (same approach as app-refresh.test.ts) — the app is
// mounted without a Home Assistant backend.
vi.mock('@/data/pricing-data', () => ({
  invalidateTimelineCache: vi.fn(),
  loadPricingData: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/data/analytics-data', () => ({
  loadAnalyticsData: vi.fn().mockResolvedValue({
    efficiency: null,
    health: null,
    balancing: null,
    costComparison: null,
  }),
  extractAnalyticsSensors: vi.fn().mockReturnValue({
    efficiency: null,
    health: null,
    balancing: null,
  }),
  EMPTY_ANALYTICS: {
    efficiency: null,
    health: null,
    balancing: null,
    costComparison: null,
  },
}));

vi.mock('@/data/boiler-data', () => ({
  loadBoilerData: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/data/chmu-data', () => ({
  extractChmuData: vi.fn().mockReturnValue({
    effectiveSeverity: 0,
    warningsCount: 0,
  }),
  EMPTY_CHMU_DATA: {
    effectiveSeverity: 0,
    warningsCount: 0,
  },
}));

vi.mock('@/data/timeline-data', () => ({
  loadTimelineTab: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/data/tiles-data', async () => {
  const actual = await vi.importActual<typeof import('@/data/tiles-data')>('@/data/tiles-data');
  return {
    ...actual,
    loadTilesConfig: vi.fn().mockResolvedValue({
      tiles_left: [],
      tiles_right: [],
    }),
    saveTilesConfig: vi.fn(),
    resolveTiles: vi.fn().mockReturnValue({
      left: [],
      right: [],
    }),
  };
});

vi.mock('@/data/shield-controller', () => ({
  shieldController: {
    start: vi.fn(),
    stop: vi.fn(),
  },
}));

vi.mock('@/data/ha-client', () => ({
  haClient: {
    getHass: vi.fn().mockResolvedValue(null),
    getHassSync: vi.fn().mockReturnValue(null),
    refreshHass: vi.fn().mockResolvedValue(null),
  },
}));

// Unrelated feature elements mocked to empty modules — their tags stay
// unregistered and render as inert unknown elements. Pricing stays REAL:
// that is the wiring under test.
vi.mock('@/ui/components/header', () => ({}));
vi.mock('@/ui/components/theme-provider', () => ({}));
vi.mock('@/ui/layout/tabs', () => ({}));
vi.mock('@/ui/layout/grid', () => ({}));
vi.mock('@/ui/features/flow', () => ({}));
vi.mock('@/ui/features/flow/grid-charging-dialog', () => ({}));
vi.mock('@/ui/features/boiler', () => ({}));
vi.mock('@/ui/features/control-panel', () => ({}));
vi.mock('@/ui/features/analytics', () => ({}));
vi.mock('@/ui/features/chmu', () => ({}));
vi.mock('@/ui/features/timeline', () => ({}));
vi.mock('@/ui/features/tiles', () => ({}));
vi.mock('@/ui/features/tiles/icon-picker', () => ({}));
vi.mock('@/ui/features/tiles/tile-dialog', () => ({}));

import { OigApp } from '@/ui/app';
import type { OigPricingStats } from '@/ui/features/pricing/stats';
import type { OigPricingChart } from '@/ui/features/pricing/chart';
import { EMPTY_PRICING_DATA, type PriceBlock, type PricingData } from '@/ui/features/pricing/types';

const BLOCK_START = '2025-01-15T02:00:00';
const BLOCK_END = '2025-01-15T05:00:00';
const MARGIN_MS = 15 * 60 * 1000;

const cheapestBuyBlock: PriceBlock = {
  start: BLOCK_START,
  end: BLOCK_END,
  avg: 1.23,
  min: 0.9,
  max: 1.6,
  values: [1.2, 1.1, 1.4],
  type: 'cheapest-buy',
};

const pricingData: PricingData = {
  ...EMPTY_PRICING_DATA,
  // Non-empty timeline so oig-pricing-stats renders its top row.
  timeline: [{ timestamp: '2025-01-15T00:00:00' }],
  cheapestBuyBlock,
};

/** Minimal Chart.js stand-in — enough for zoomToTimeRange/resetZoom. */
function makeFakeChart() {
  return {
    options: { scales: { x: {} as { min?: number; max?: number } } },
    scales: { x: { min: 0, max: 0 } },
    data: { datasets: [] },
    update: vi.fn(),
  };
}

async function mountApp(): Promise<OigApp> {
  const app = document.createElement('oig-app') as OigApp;
  document.body.appendChild(app);
  (app as any).loading = false;
  await app.updateComplete;
  return app;
}

describe('Ceny tab: stat-card zoom-to-block → chart zoom (integration)', () => {
  beforeAll(() => {
    // initApp needs a live HA backend; the wiring under test does not.
    vi.spyOn(OigApp.prototype as any, 'initApp').mockResolvedValue(undefined);
    vi.spyOn(OigApp.prototype as any, 'startTimeUpdate').mockImplementation(() => {});
    // Block the chart element's deferred Chart.js creation — jsdom has no
    // canvas 2d context. The test injects a fake chart instance instead.
    vi.stubGlobal('requestAnimationFrame', () => 0);
  });

  it('clicking a block stat-card zooms the pricing chart to the block range', async () => {
    const app = await mountApp();

    const stats = app.shadowRoot!.querySelector('oig-pricing-stats') as OigPricingStats;
    const chart = app.shadowRoot!.querySelector('oig-pricing-chart') as OigPricingChart;
    expect(stats).toBeTruthy();
    expect(chart).toBeTruthy();

    (app as any).pricingData = pricingData;
    await app.updateComplete;
    await stats.updateComplete;
    await chart.updateComplete;

    const fakeChart = makeFakeChart();
    (chart as any).chart = fakeChart;

    const zoomChanges: Array<{ start: number; end: number }> = [];
    chart.addEventListener('zoom-change', (e) => {
      zoomChanges.push((e as CustomEvent).detail);
    });

    const card = stats.shadowRoot!.querySelector('oig-stats-card') as HTMLElement;
    expect(card).toBeTruthy();

    // Sanity: not zoomed before the click.
    expect(fakeChart.options.scales.x.min).toBeUndefined();
    expect(fakeChart.options.scales.x.max).toBeUndefined();

    // Real user path: click the card in the stats shadow DOM.
    card.click();

    const expectedStart = new Date(BLOCK_START).getTime() - MARGIN_MS;
    const expectedEnd = new Date(BLOCK_END).getTime() + MARGIN_MS;

    expect(fakeChart.options.scales.x.min).toBe(expectedStart);
    expect(fakeChart.options.scales.x.max).toBe(expectedEnd);
    expect(fakeChart.update).toHaveBeenCalledWith('none');
    expect(zoomChanges).toHaveLength(1);
    expect(zoomChanges[0].start).toBe(expectedStart);
    expect(zoomChanges[0].end).toBe(expectedEnd);
  });

  it('clicking the same block again toggles the zoom back off', async () => {
    const app = await mountApp();
    const stats = app.shadowRoot!.querySelector('oig-pricing-stats') as OigPricingStats;
    const chart = app.shadowRoot!.querySelector('oig-pricing-chart') as OigPricingChart;

    (app as any).pricingData = pricingData;
    await app.updateComplete;
    await stats.updateComplete;
    await chart.updateComplete;

    const fakeChart = makeFakeChart();
    (chart as any).chart = fakeChart;

    const card = stats.shadowRoot!.querySelector('oig-stats-card') as HTMLElement;
    card.click();
    expect(fakeChart.options.scales.x.min).toBeDefined();

    card.click();
    expect(fakeChart.options.scales.x.min).toBeUndefined();
    expect(fakeChart.options.scales.x.max).toBeUndefined();
  });
});
