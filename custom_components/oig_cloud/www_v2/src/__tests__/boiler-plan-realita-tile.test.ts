// ============================================================================
// "Bojler: plán & realita" tile unit tests
// Covers:
//   - adherenceColor: same thresholds as Ceny's oig-timeline-tile
//   - blockSourceColor: fve/grid/battery/alt mapped, unknown source -> idle gray
//   - blockDurationHours: same-day + midnight-wrap
//   - metricBetterClass: lower-is-better / higher-is-better / no-actual
//   - OigBoilerPlanRealitaTile component: tab switching re-fetches, auto-refresh
//     toggle, adherence bar coloring, metric plan-vs-actual rendering, blocks
//     strip color mapping, graceful hide on available:false / 404
// ============================================================================

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import {
  adherenceColor,
  blockSourceColor,
  blockDurationHours,
  metricBetterClass,
  BOILER_BLOCK_SOURCE_COLORS,
  OigBoilerPlanRealitaTile,
} from '@/ui/features/boiler/boiler-plan-realita-tile';
import type { BoilerDetailTabData, BoilerDetailMetric } from '@/data/boiler-detail-tabs';

const loadBoilerDetailTabMock = vi.hoisted(() => vi.fn());

vi.mock('@/data/boiler-detail-tabs', () => ({
  loadBoilerDetailTab: loadBoilerDetailTabMock,
}));

vi.mock('@/core/logger', () => ({
  oigLog: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

type TileEl = OigBoilerPlanRealitaTile & { updateComplete: Promise<boolean> };

/** jsdom normalizes `element.style.background = '#hex'` to `rgb(r, g, b)`. */
function hexToRgb(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

async function flush(el: TileEl): Promise<void> {
  await el.updateComplete;
  await new Promise((resolve) => setTimeout(resolve, 0));
  await el.updateComplete;
}

// ── Fixtures ────────────────────────────────────────────────────────────────

const TODAY_DATA: BoilerDetailTabData = {
  tab: 'today',
  available: true,
  savings: { vsAltCzk: 12.4, vsGridCzk: 8.1, detail: 'Cheaper than gas by 12.4 Kč' },
  adherencePct: 92.5,
  progress: { progressPct: 60.0, actualCostCzk: 9.3, planCostCzk: 15.5, vsPlanPct: -4.2 },
  eodPrediction: { predictedTotalCzk: 14.8, vsPlanCzk: -0.7, confidence: 'medium' },
  metrics: [
    { key: 'cost_czk', plan: 15.5, actual: 9.3, better: 'lower' },
    { key: 'fve_kwh', plan: 3.4, actual: 2.0, better: 'higher' },
  ],
  blocks: [
    { start: '06:00', end: '08:00', source: 'grid', plannedKwh: 1.2, actualKwh: 1.1, costCzk: 4.8, status: 'historical', mismatch: false },
    { start: '08:00', end: '10:00', source: 'fve', plannedKwh: 2.0, actualKwh: 0.9, costCzk: 0.0, status: 'current', mismatch: true },
  ],
  capacityKwh: 8.4,
  soc: { nowKwh: 5.2, nowLiters: 96, nowPct: 62.0 },
};

const YESTERDAY_DATA: BoilerDetailTabData = {
  ...TODAY_DATA,
  tab: 'yesterday',
  adherencePct: 55.0,
};

const UNAVAILABLE_DATA: BoilerDetailTabData = { tab: 'yesterday', available: false };

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
});

afterEach(() => {
  fixtureCleanup();
  vi.useRealTimers();
});

// ============================================================================
// Pure helpers
// ============================================================================

describe('adherenceColor', () => {
  it('>= 90 -> green (same threshold as Ceny oig-timeline-tile)', () => {
    expect(adherenceColor(92.5)).toBe('#4ade80');
    expect(adherenceColor(90)).toBe('#4ade80');
  });

  it('70-89 -> orange', () => {
    expect(adherenceColor(70)).toBe('#f0b429');
    expect(adherenceColor(89.9)).toBe('#f0b429');
  });

  it('< 70 -> red', () => {
    expect(adherenceColor(69.9)).toBe('#f87171');
    expect(adherenceColor(0)).toBe('#f87171');
  });
});

describe('blockSourceColor', () => {
  it('maps every CONTRACT source to a distinct color', () => {
    expect(blockSourceColor('fve')).toBe(BOILER_BLOCK_SOURCE_COLORS.fve);
    expect(blockSourceColor('grid')).toBe(BOILER_BLOCK_SOURCE_COLORS.grid);
    expect(blockSourceColor('battery')).toBe(BOILER_BLOCK_SOURCE_COLORS.battery);
    expect(blockSourceColor('alt')).toBe(BOILER_BLOCK_SOURCE_COLORS.alt);
    expect(blockSourceColor('idle')).toBe(BOILER_BLOCK_SOURCE_COLORS.idle);
    const colors = new Set(Object.values(BOILER_BLOCK_SOURCE_COLORS));
    expect(colors.size).toBe(5);
  });

  it('unknown source falls back to the idle color, not a crash', () => {
    expect(blockSourceColor('unknown_future_source')).toBe(BOILER_BLOCK_SOURCE_COLORS.idle);
  });
});

describe('blockDurationHours', () => {
  it('same-day span', () => {
    expect(blockDurationHours({ start: '06:00', end: '08:00' })).toBe(2);
    expect(blockDurationHours({ start: '08:00', end: '08:30' })).toBe(0.5);
  });

  it('wraps past midnight when end <= start', () => {
    expect(blockDurationHours({ start: '23:00', end: '01:00' })).toBe(2);
  });
});

describe('metricBetterClass', () => {
  const base: BoilerDetailMetric = { key: 'cost_czk', plan: 15.5, actual: null, better: 'lower' };

  it('no actual -> empty (nothing to compare yet)', () => {
    expect(metricBetterClass({ ...base, actual: null })).toBe('');
  });

  it('lower-is-better: actual <= plan -> better', () => {
    expect(metricBetterClass({ ...base, actual: 9.3, better: 'lower' })).toBe('better');
    expect(metricBetterClass({ ...base, actual: 15.5, better: 'lower' })).toBe('better');
  });

  it('lower-is-better: actual > plan -> worse', () => {
    expect(metricBetterClass({ ...base, actual: 20, better: 'lower' })).toBe('worse');
  });

  it('higher-is-better: actual >= plan -> better, else worse', () => {
    expect(metricBetterClass({ key: 'fve_kwh', plan: 3.4, actual: 4.0, better: 'higher' })).toBe('better');
    expect(metricBetterClass({ key: 'fve_kwh', plan: 3.4, actual: 2.0, better: 'higher' })).toBe('worse');
  });
});

// ============================================================================
// OigBoilerPlanRealitaTile component
// ============================================================================

describe('OigBoilerPlanRealitaTile', () => {
  it('fetches the default (today) tab on connect and renders once loaded', async () => {
    loadBoilerDetailTabMock.mockResolvedValue(TODAY_DATA);

    const el = await fixture<TileEl>(html`<oig-boiler-plan-realita-tile></oig-boiler-plan-realita-tile>`);
    await flush(el);

    expect(loadBoilerDetailTabMock).toHaveBeenCalledWith('today');
    expect(el.shadowRoot!.querySelector('.tile')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('.tile-title')?.textContent).toContain('Bojler');
  });

  it('clicking a day tab re-fetches data for that tab', async () => {
    loadBoilerDetailTabMock.mockResolvedValue(TODAY_DATA);
    const el = await fixture<TileEl>(html`<oig-boiler-plan-realita-tile></oig-boiler-plan-realita-tile>`);
    await flush(el);
    expect(loadBoilerDetailTabMock).toHaveBeenCalledTimes(1);
    expect(loadBoilerDetailTabMock).toHaveBeenLastCalledWith('today');

    loadBoilerDetailTabMock.mockResolvedValue(YESTERDAY_DATA);
    const tabs = Array.from(el.shadowRoot!.querySelectorAll('.tab')) as HTMLButtonElement[];
    const yesterdayTab = tabs.find((b) => b.textContent?.includes('Včera'));
    expect(yesterdayTab).toBeTruthy();
    yesterdayTab!.click();
    await flush(el);

    expect(loadBoilerDetailTabMock).toHaveBeenCalledTimes(2);
    expect(loadBoilerDetailTabMock).toHaveBeenLastCalledWith('yesterday');
  });

  it('clicking the currently active tab does not re-fetch', async () => {
    loadBoilerDetailTabMock.mockResolvedValue(TODAY_DATA);
    const el = await fixture<TileEl>(html`<oig-boiler-plan-realita-tile></oig-boiler-plan-realita-tile>`);
    await flush(el);
    expect(loadBoilerDetailTabMock).toHaveBeenCalledTimes(1);

    const tabs = Array.from(el.shadowRoot!.querySelectorAll('.tab')) as HTMLButtonElement[];
    const todayTab = tabs.find((b) => b.textContent?.includes('Dnes'));
    todayTab!.click();
    await flush(el);

    expect(loadBoilerDetailTabMock).toHaveBeenCalledTimes(1);
  });

  it('auto-refresh is on by default and re-fetches the active tab on the interval', async () => {
    loadBoilerDetailTabMock.mockResolvedValue(TODAY_DATA);
    const el = await fixture<TileEl>(html`<oig-boiler-plan-realita-tile></oig-boiler-plan-realita-tile>`);
    await flush(el);
    expect(loadBoilerDetailTabMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(60000);
    await flush(el);
    expect(loadBoilerDetailTabMock).toHaveBeenCalledTimes(2);
  });

  it('unchecking auto-refresh stops the periodic re-fetch', async () => {
    loadBoilerDetailTabMock.mockResolvedValue(TODAY_DATA);
    const el = await fixture<TileEl>(html`<oig-boiler-plan-realita-tile></oig-boiler-plan-realita-tile>`);
    await flush(el);
    expect(loadBoilerDetailTabMock).toHaveBeenCalledTimes(1);

    const checkbox = el.shadowRoot!.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
    checkbox.click();
    await flush(el);
    expect(checkbox.checked).toBe(false);

    const callsAfterToggleOff = loadBoilerDetailTabMock.mock.calls.length;
    await vi.advanceTimersByTimeAsync(120000);
    await flush(el);
    expect(loadBoilerDetailTabMock).toHaveBeenCalledTimes(callsAfterToggleOff);
  });

  it('adherence bar reflects adherencePct with the correct threshold color', async () => {
    loadBoilerDetailTabMock.mockResolvedValue(TODAY_DATA);
    const el = await fixture<TileEl>(html`<oig-boiler-plan-realita-tile></oig-boiler-plan-realita-tile>`);
    await flush(el);

    const fill = el.shadowRoot!.querySelector('.adherence-fill') as HTMLElement;
    expect(fill.style.width).toBe('92.5%');
    expect(fill.style.background).toBe(hexToRgb(adherenceColor(92.5)));
  });

  it('metric tile renders plan and actual with a better/worse class', async () => {
    loadBoilerDetailTabMock.mockResolvedValue(TODAY_DATA);
    const el = await fixture<TileEl>(html`<oig-boiler-plan-realita-tile></oig-boiler-plan-realita-tile>`);
    await flush(el);

    const tiles = el.shadowRoot!.querySelectorAll('.metric-tile');
    expect(tiles.length).toBe(2);
    const costTile = Array.from(tiles).find((t) => t.textContent?.includes('Náklady'))!;
    expect(costTile.querySelector('.metric-plan')?.textContent).toContain('15,50');
    expect(costTile.querySelector('.metric-actual')?.classList.contains('better')).toBe(true);
  });

  it('blocks strip colors each block by its source', async () => {
    loadBoilerDetailTabMock.mockResolvedValue(TODAY_DATA);
    const el = await fixture<TileEl>(html`<oig-boiler-plan-realita-tile></oig-boiler-plan-realita-tile>`);
    await flush(el);

    const blocks = el.shadowRoot!.querySelectorAll('.block') as NodeListOf<HTMLElement>;
    expect(blocks.length).toBe(2);
    expect(blocks[0].style.background).toBe(hexToRgb(blockSourceColor('grid')));
    expect(blocks[1].style.background).toBe(hexToRgb(blockSourceColor('fve')));
    expect(blocks[1].classList.contains('current')).toBe(true);
    expect(blocks[1].querySelector('.block-mismatch')).toBeTruthy();
  });

  it('hides cleanly (renders nothing) when available:false', async () => {
    loadBoilerDetailTabMock.mockResolvedValue(UNAVAILABLE_DATA);
    const el = await fixture<TileEl>(html`<oig-boiler-plan-realita-tile></oig-boiler-plan-realita-tile>`);
    await flush(el);

    expect(el.shadowRoot!.querySelector('.tile')).toBeNull();
    // Only the adopted <style> may be present — no content element, so no layout jump.
    const nonStyleChildren = Array.from(el.shadowRoot!.children).filter((c) => c.tagName !== 'STYLE');
    expect(nonStyleChildren).toHaveLength(0);
  });

  it('hides cleanly on a 404-shaped response (loader resolves null), no thrown error', async () => {
    loadBoilerDetailTabMock.mockResolvedValue(null);

    const el = await fixture<TileEl>(html`<oig-boiler-plan-realita-tile></oig-boiler-plan-realita-tile>`);
    await flush(el);

    expect(el.shadowRoot!.querySelector('.tile')).toBeNull();
  });

  it('does not log to console on the graceful-hide path', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    loadBoilerDetailTabMock.mockResolvedValue(UNAVAILABLE_DATA);
    const el = await fixture<TileEl>(html`<oig-boiler-plan-realita-tile></oig-boiler-plan-realita-tile>`);
    await flush(el);

    expect(errorSpy).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
