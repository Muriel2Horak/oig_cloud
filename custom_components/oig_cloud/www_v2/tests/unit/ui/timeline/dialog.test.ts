import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import type { TimelineDayData, ModeBlock, MetricTile, DaySummary } from '@/ui/features/timeline/types';
import '@/ui/features/timeline/dialog';

function makeBlock(overrides: Partial<ModeBlock> = {}): ModeBlock {
  return {
    modeHistorical: 'HOME I',
    modePlanned: 'HOME I',
    modeMatch: true,
    status: 'completed',
    startTime: '00:00',
    endTime: '06:00',
    durationHours: 6,
    costHistorical: 10,
    costPlanned: 12,
    costDelta: 2,
    solarKwh: 0,
    consumptionKwh: 3,
    gridImportKwh: 3,
    gridExportKwh: 0,
    intervalReasons: [],
    ...overrides,
  };
}

function makeMetric(unit: string, plan: number, actual: number | null, hasActual: boolean): MetricTile {
  return { plan, actual, hasActual, unit };
}

function makeSummary(overrides: Partial<DaySummary> = {}): DaySummary {
  return {
    overallAdherence: 85,
    modeSwitches: 3,
    totalCost: 120,
    metrics: {
      cost: makeMetric('Kč', 100, 90, true),
      solar: makeMetric('kWh', 8, 7.5, true),
      consumption: makeMetric('kWh', 20, 22, true),
      grid: makeMetric('kWh', 12, 14, true),
    },
    ...overrides,
  };
}

function makeData(overrides: Partial<TimelineDayData> = {}): TimelineDayData {
  return {
    date: '2025-01-15',
    modeBlocks: [
      makeBlock({ startTime: '00:00', endTime: '06:00', durationHours: 6 }),
      makeBlock({ modePlanned: 'HOME II', modeHistorical: 'HOME I', modeMatch: false, status: 'current', startTime: '06:00', endTime: '12:00', durationHours: 6 }),
    ],
    summary: makeSummary(),
    ...overrides,
  };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function shadow(el: HTMLElement): ShadowRoot {
  return el.shadowRoot!;
}

function q(el: HTMLElement, sel: string): Element | null {
  return shadow(el).querySelector(sel);
}

function qa(el: HTMLElement, sel: string): Element[] {
  return Array.from(shadow(el).querySelectorAll(sel));
}

function text(el: HTMLElement, sel: string): string {
  const node = q(el, sel);
  return node ? (node.textContent ?? '').trim() : '';
}

describe('OigTimelineDialog', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    fixtureCleanup();
  });

  it('renders hidden when open is false', async () => {
    const el = await fixture<HTMLElement & { open: boolean }>(html`<oig-timeline-dialog></oig-timeline-dialog>`);
    expect(el.open).toBe(false);
    expect(el.hasAttribute('open')).toBe(false);
  });

  it('renders visible dialog when open is true', async () => {
    const el = await fixture<HTMLElement & { open: boolean }>(html`<oig-timeline-dialog .open=${true}></oig-timeline-dialog>`);
    await flush();
    expect(el.open).toBe(true);
    expect(q(el, '.dialog')).not.toBeNull();
    expect(q(el, '.dialog-header')).not.toBeNull();
    expect(q(el, '.close-btn')).not.toBeNull();
  });

  it('shows empty state when data is null', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true}></oig-timeline-dialog>`);
    await flush();
    expect(q(el, '.empty-state')).not.toBeNull();
    expect(text(el, '.empty-state')).toContain('Načítání');
  });

  it('renders three tab buttons', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true}></oig-timeline-dialog>`);
    await flush();
    const tabs = qa(el, '.tab');
    expect(tabs).toHaveLength(3);
  });

  it('marks the active tab with .active class', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .activeTab=${'today' as any}></oig-timeline-dialog>`);
    await flush();
    const tabs = qa(el, '.tab');
    const activeTab = tabs.find(t => t.classList.contains('active'));
    expect(activeTab).toBeDefined();
    expect(activeTab!.textContent!.trim()).toContain('Dnes');
  });

  it('dispatches close event when close button clicked', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true}></oig-timeline-dialog>`);
    await flush();
    const spy = vi.fn();
    el.addEventListener('close', spy);
    (q(el, '.close-btn') as HTMLElement).click();
    expect(spy).toHaveBeenCalledOnce();
  });

  it('dispatches tab-change event with tab detail on tab click', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .activeTab=${'today' as any}></oig-timeline-dialog>`);
    await flush();
    const spy = vi.fn();
    el.addEventListener('tab-change', spy);
    const tabs = qa(el, '.tab');
    const yesterdayTab = tabs.find(t => t.textContent!.includes('Včera'));
    (yesterdayTab as HTMLElement).click();
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0].detail.tab).toBe('yesterday');
  });

  it('updates activeTab property on tab click', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .activeTab=${'today' as any}></oig-timeline-dialog>`);
    await flush();
    const tabs = qa(el, '.tab');
    const tomorrowTab = tabs.find(t => t.textContent!.includes('Zítra'));
    (tomorrowTab as HTMLElement).click();
    await (el as any).updateComplete;
    expect((el as any).activeTab).toBe('tomorrow');
  });

  it('auto-refresh checkbox is checked by default', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true}></oig-timeline-dialog>`);
    await flush();
    const cb = q(el, '.auto-refresh input') as HTMLInputElement;
    expect(cb).not.toBeNull();
    expect(cb.checked).toBe(true);
  });

  it('toggles auto-refresh off when checkbox changed', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true}></oig-timeline-dialog>`);
    await flush();
    const cb = q(el, '.auto-refresh input') as HTMLInputElement;
    cb.checked = false;
    cb.dispatchEvent(new Event('change'));
    await (el as any).updateComplete;
    expect((el as any).autoRefresh).toBe(false);
  });

  it('toggles auto-refresh back on when checkbox changed again', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true}></oig-timeline-dialog>`);
    await flush();
    const cb = q(el, '.auto-refresh input') as HTMLInputElement;
    cb.checked = false;
    cb.dispatchEvent(new Event('change'));
    await (el as any).updateComplete;
    cb.checked = true;
    cb.dispatchEvent(new Event('change'));
    await (el as any).updateComplete;
    expect((el as any).autoRefresh).toBe(true);
  });

  it('fires refresh event on auto-refresh interval when open', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true}></oig-timeline-dialog>`);
    await flush();
    const spy = vi.fn();
    el.addEventListener('refresh', spy);
    vi.advanceTimersByTime(60_000);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('does not fire refresh event when auto-refresh is disabled', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true}></oig-timeline-dialog>`);
    await flush();
    const cb = q(el, '.auto-refresh input') as HTMLInputElement;
    cb.checked = false;
    cb.dispatchEvent(new Event('change'));
    await (el as any).updateComplete;
    const spy = vi.fn();
    el.addEventListener('refresh', spy);
    vi.advanceTimersByTime(60_000);
    expect(spy).not.toHaveBeenCalled();
  });

  it('does not fire refresh event when dialog is closed', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${false}></oig-timeline-dialog>`);
    await flush();
    const spy = vi.fn();
    el.addEventListener('refresh', spy);
    vi.advanceTimersByTime(60_000);
    expect(spy).not.toHaveBeenCalled();
  });

  it('clears interval on disconnect', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true}></oig-timeline-dialog>`);
    await flush();
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    el.remove();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('stops interval when auto-refresh toggled off', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true}></oig-timeline-dialog>`);
    await flush();
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const cb = q(el, '.auto-refresh input') as HTMLInputElement;
    cb.checked = false;
    cb.dispatchEvent(new Event('change'));
    await (el as any).updateComplete;
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  describe('with full data', () => {
    it('renders adherence bar when modeBlocks > 1 and adherence > 0', async () => {
      const data = makeData({ summary: makeSummary({ overallAdherence: 85 }) });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      expect(q(el, '.adherence-bar')).not.toBeNull();
      expect(text(el, '.adherence-header')).toContain('85%');
    });

    it('hides adherence bar when only one mode block', async () => {
      const data = makeData({ modeBlocks: [makeBlock()] });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      expect(q(el, '.adherence-bar')).toBeNull();
    });

    it('hides adherence bar when adherence is 0', async () => {
      const data = makeData({ summary: makeSummary({ overallAdherence: 0 }) });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      expect(q(el, '.adherence-bar')).toBeNull();
    });

    it('uses green adherence color for >= 90%', async () => {
      const data = makeData({ summary: makeSummary({ overallAdherence: 95 }) });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const fill = q(el, '.adherence-fill') as HTMLElement;
      expect(fill.style.background).toContain('rgb(76, 175, 80)');
    });

    it('uses orange adherence color for 70-89%', async () => {
      const data = makeData({ summary: makeSummary({ overallAdherence: 75 }) });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const fill = q(el, '.adherence-fill') as HTMLElement;
      expect(fill.style.background).toContain('rgb(255, 152, 0)');
    });

    it('uses red adherence color for < 70%', async () => {
      const data = makeData({ summary: makeSummary({ overallAdherence: 50 }) });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const fill = q(el, '.adherence-fill') as HTMLElement;
      expect(fill.style.background).toContain('rgb(244, 67, 54)');
    });

    it('renders metric tiles grid with 4 tiles', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const tiles = qa(el, '.metric-tile');
      expect(tiles).toHaveLength(4);
    });

    it('formats Kč metric with formatCurrency', async () => {
      const data = makeData({
        summary: makeSummary({
          metrics: {
            cost: makeMetric('Kč', 100, 90, true),
            solar: makeMetric('kWh', 8, 7.5, true),
            consumption: makeMetric('kWh', 20, 22, true),
            grid: makeMetric('kWh', 12, 14, true),
          },
        }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const planEl = q(el, '.metric-plan');
      expect(planEl!.textContent).toContain('100.00 CZK');
    });

    it('formats non-Kč metric with toFixed and unit', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const plans = qa(el, '.metric-plan');
      const solarPlan = plans[1];
      expect(solarPlan.textContent).toContain('8.0 kWh');
    });

    it('shows better class for Kč actual <= plan', async () => {
      const data = makeData({
        summary: makeSummary({
          metrics: {
            cost: makeMetric('Kč', 100, 90, true),
            solar: makeMetric('kWh', 8, 7.5, true),
            consumption: makeMetric('kWh', 20, 22, true),
            grid: makeMetric('kWh', 12, 14, true),
          },
        }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const actuals = qa(el, '.metric-actual');
      expect(actuals[0].classList.contains('better')).toBe(true);
    });

    it('shows worse class for Kč actual > plan', async () => {
      const data = makeData({
        summary: makeSummary({
          metrics: {
            cost: makeMetric('Kč', 100, 120, true),
            solar: makeMetric('kWh', 8, 7.5, true),
            consumption: makeMetric('kWh', 20, 22, true),
            grid: makeMetric('kWh', 12, 14, true),
          },
        }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const actuals = qa(el, '.metric-actual');
      expect(actuals[0].classList.contains('worse')).toBe(true);
    });

    it('shows better class for non-Kč actual >= plan', async () => {
      const data = makeData({
        summary: makeSummary({
          metrics: {
            cost: makeMetric('Kč', 100, 90, true),
            solar: makeMetric('kWh', 8, 10, true),
            consumption: makeMetric('kWh', 20, 22, true),
            grid: makeMetric('kWh', 12, 14, true),
          },
        }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const actuals = qa(el, '.metric-actual');
      expect(actuals[1].classList.contains('better')).toBe(true);
    });

    it('shows worse class for non-Kč actual < plan', async () => {
      const data = makeData({
        summary: makeSummary({
          metrics: {
            cost: makeMetric('Kč', 100, 90, true),
            solar: makeMetric('kWh', 8, 5, true),
            consumption: makeMetric('kWh', 20, 22, true),
            grid: makeMetric('kWh', 12, 14, true),
          },
        }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const actuals = qa(el, '.metric-actual');
      expect(actuals[1].classList.contains('worse')).toBe(true);
    });

    it('hides actual when hasActual is false', async () => {
      const data = makeData({
        summary: makeSummary({
          metrics: {
            cost: makeMetric('Kč', 100, null, false),
            solar: makeMetric('kWh', 8, null, false),
            consumption: makeMetric('kWh', 20, null, false),
            grid: makeMetric('kWh', 12, null, false),
          },
        }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const actuals = qa(el, '.metric-actual');
      expect(actuals).toHaveLength(0);
    });

    it('renders mode blocks with correct count', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const blocks = qa(el, '.modes-section .mode-block');
      expect(blocks).toHaveLength(2);
    });

    it('marks current mode block with .current class', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const currentBlocks = qa(el, '.mode-block.current');
      expect(currentBlocks).toHaveLength(1);
    });

    it('shows mismatch indicator when modeMatch is false', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const mismatch = qa(el, '.mode-mismatch');
      expect(mismatch).toHaveLength(1);
      expect(mismatch[0].textContent).toContain('!');
    });

    it('hides mismatch indicator when modeMatch is true', async () => {
      const data = makeData({
        modeBlocks: [
          makeBlock({ modeMatch: true, startTime: '00:00', endTime: '06:00' }),
          makeBlock({ modeMatch: true, startTime: '06:00', endTime: '12:00' }),
        ],
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const mismatch = qa(el, '.mode-mismatch');
      expect(mismatch).toHaveLength(0);
    });

    it('shows cost on mode block when costPlanned is set', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const costs = qa(el, '.mode-cost');
      expect(costs.length).toBeGreaterThan(0);
    });

    it('hides cost on mode block when costPlanned is null', async () => {
      const data = makeData({
        modeBlocks: [
          makeBlock({ costPlanned: null, startTime: '00:00', endTime: '06:00' }),
          makeBlock({ costPlanned: null, startTime: '06:00', endTime: '12:00' }),
        ],
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const costs = qa(el, '.mode-cost');
      expect(costs).toHaveLength(0);
    });

    it('uses fallback mode config for unknown mode', async () => {
      const data = makeData({
        modeBlocks: [
          makeBlock({ modePlanned: 'UNKNOWN_MODE', modeHistorical: 'UNKNOWN_MODE', startTime: '00:00', endTime: '06:00' }),
          makeBlock({ modePlanned: 'UNKNOWN_MODE', modeHistorical: 'UNKNOWN_MODE', startTime: '06:00', endTime: '12:00' }),
        ],
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const names = qa(el, '.mode-name');
      expect(names[0].textContent).toBe('UNKNOWN_MODE');
    });

    it('uses modeHistorical when modePlanned is empty', async () => {
      const data = makeData({
        modeBlocks: [
          makeBlock({ modePlanned: '', modeHistorical: 'HOME III', startTime: '00:00', endTime: '06:00' }),
          makeBlock({ modePlanned: '', modeHistorical: 'HOME III', startTime: '06:00', endTime: '12:00' }),
        ],
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const names = qa(el, '.mode-name');
      expect(names[0].textContent).toBe('HOME III');
    });

    it('renders section title with blocks and switches labels', async () => {
      const data = makeData({ summary: makeSummary({ modeSwitches: 3 }) });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const title = text(el, '.section-title');
      expect(title).toContain('2 bloky');
      expect(title).toContain('3 přepnutí');
    });

    it('uses correct Czech plural for 1 block', async () => {
      const data = makeData({ modeBlocks: [makeBlock()] });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const title = text(el, '.section-title');
      expect(title).toContain('1 blok');
    });

    it('uses correct Czech plural for 5 blocks', async () => {
      const blocks = Array.from({ length: 5 }, (_, i) =>
        makeBlock({ startTime: `${i * 4}:00`, endTime: `${(i + 1) * 4}:00`, durationHours: 4 })
      );
      const data = makeData({ modeBlocks: blocks });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const title = text(el, '.section-title');
      expect(title).toContain('5 bloků');
    });

    it('hides mode blocks section when modeBlocks is empty', async () => {
      const data = makeData({ modeBlocks: [] });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      expect(q(el, '.modes-section')).toBeNull();
    });

    it('renders progress section when progressPct is set', async () => {
      const data = makeData({
        summary: makeSummary({ progressPct: 45, actualTotalCost: 55, planTotalCost: 100, vsPlanPct: 55 }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      expect(q(el, '.progress-section')).not.toBeNull();
      const items = qa(el, '.progress-item');
      expect(items.length).toBeGreaterThanOrEqual(4);
    });

    it('hides progress section when progressPct is undefined', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      expect(q(el, '.progress-section')).toBeNull();
    });

    it('shows green vs-plan color when vsPlanPct <= 100', async () => {
      const data = makeData({
        summary: makeSummary({ progressPct: 50, vsPlanPct: 80 }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const progressValues = qa(el, '.progress-value');
      const vsPlan = progressValues.find(v => v.textContent!.includes('80%'));
      expect(vsPlan).toBeDefined();
      expect((vsPlan as HTMLElement).style.color).toContain('rgb(76, 175, 80)');
    });

    it('shows red vs-plan color when vsPlanPct > 100', async () => {
      const data = makeData({
        summary: makeSummary({ progressPct: 50, vsPlanPct: 120 }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const progressValues = qa(el, '.progress-value');
      const vsPlan = progressValues.find(v => v.textContent!.includes('120%'));
      expect(vsPlan).toBeDefined();
      expect((vsPlan as HTMLElement).style.color).toContain('rgb(244, 67, 54)');
    });

    it('renders EOD prediction when present', async () => {
      const data = makeData({
        summary: makeSummary({ eodPrediction: { predictedTotal: 200, predictedSavings: 50 } }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      expect(q(el, '.eod-prediction')).not.toBeNull();
      expect(text(el, '.eod-prediction')).toContain('200.00 CZK');
    });

    it('shows EOD savings when predictedSavings > 0', async () => {
      const data = makeData({
        summary: makeSummary({ eodPrediction: { predictedTotal: 200, predictedSavings: 50 } }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      expect(q(el, '.eod-savings')).not.toBeNull();
      expect(text(el, '.eod-savings')).toContain('50.00 CZK');
    });

    it('hides EOD savings when predictedSavings <= 0', async () => {
      const data = makeData({
        summary: makeSummary({ eodPrediction: { predictedTotal: 200, predictedSavings: 0 } }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      expect(q(el, '.eod-savings')).toBeNull();
    });

    it('hides EOD prediction when not present', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      expect(q(el, '.eod-prediction')).toBeNull();
    });

    it('renders backup savings with positive value', async () => {
      const data = makeData({
        summary: makeSummary({ backupSavings: 25, backupActualCost: 80, backupBaselineCost: 105 }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      expect(q(el, '.backup-savings')).not.toBeNull();
      const val = q(el, '.bs-value');
      expect(val!.classList.contains('pos')).toBe(true);
      expect(val!.textContent).toContain('+');
    });

    it('renders backup savings with negative value', async () => {
      const data = makeData({
        summary: makeSummary({ backupSavings: -10, backupActualCost: 110, backupBaselineCost: 100 }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const val = q(el, '.bs-value');
      expect(val!.classList.contains('neg')).toBe(true);
    });

    it('hides backup savings when null', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      expect(q(el, '.backup-savings')).toBeNull();
    });

    it('renders comparison section when comparison is present', async () => {
      const data = makeData({
        comparison: {
          plan: 'Cheapest',
          modeBlocks: [
            makeBlock({ modePlanned: 'DO NOTHING', startTime: '00:00', endTime: '12:00', durationHours: 12 }),
          ],
        },
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const sections = qa(el, '.modes-section');
      expect(sections.length).toBeGreaterThanOrEqual(2);
      const compTitle = sections[1].querySelector('.section-title');
      expect(compTitle!.textContent).toContain('Srovnání: Cheapest');
    });

    it('hides comparison section when comparison is absent', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const sections = qa(el, '.modes-section');
      expect(sections).toHaveLength(1);
    });

    it('renders mode block time range in mode-time span', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const times = qa(el, '.mode-time');
      expect(times[0].textContent).toContain('00:00');
      expect(times[0].textContent).toContain('06:00');
    });

    it('clamps mode block flex to minimum 0.5', async () => {
      const data = makeData({
        modeBlocks: [
          makeBlock({ durationHours: 0.1, startTime: '00:00', endTime: '00:06' }),
          makeBlock({ durationHours: 0.1, startTime: '00:06', endTime: '00:12' }),
        ],
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const blocks = qa(el, '.mode-block') as HTMLElement[];
      expect(blocks[0].style.flex).toContain('0.5');
    });

    it('renders actual and plan cost in progress section', async () => {
      const data = makeData({
        summary: makeSummary({ progressPct: 60, actualTotalCost: 70, planTotalCost: 100 }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const content = shadow(el).textContent;
      expect(content).toContain('70.00 CZK');
      expect(content).toContain('100.00 CZK');
    });

    it('hides actual cost in progress when actualTotalCost is null', async () => {
      const data = makeData({
        summary: makeSummary({ progressPct: 60, actualTotalCost: undefined, planTotalCost: 100 }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const items = qa(el, '.progress-item');
      const actualItem = items.find(i => i.textContent!.includes('Skutečné'));
      expect(actualItem).toBeUndefined();
    });

    it('hides plan cost in progress when planTotalCost is null', async () => {
      const data = makeData({
        summary: makeSummary({ progressPct: 60, actualTotalCost: 70, planTotalCost: undefined }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const items = qa(el, '.progress-item');
      const planItem = items.find(i => i.textContent!.includes('Plán'));
      expect(planItem).toBeUndefined();
    });

    it('hides vs-plan in progress when vsPlanPct is null', async () => {
      const data = makeData({
        summary: makeSummary({ progressPct: 60, vsPlanPct: undefined }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const items = qa(el, '.progress-item');
      const vsItem = items.find(i => i.textContent!.includes('vs plán'));
      expect(vsItem).toBeUndefined();
    });

    it('renders backup detail costs with fallback to 0', async () => {
      const data = makeData({
        summary: makeSummary({ backupSavings: 10, backupActualCost: undefined, backupBaselineCost: undefined }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true} .data=${data}></oig-timeline-dialog>`);
      await flush();
      const detail = q(el, '.bs-detail');
      expect(detail).not.toBeNull();
      expect(detail!.textContent).toContain('0.00 CZK');
    });
  });

  describe('dialog click propagation', () => {
    it('stops click propagation on .dialog', async () => {
      const el = await fixture<HTMLElement>(html`<oig-timeline-dialog .open=${true}></oig-timeline-dialog>`);
      await flush();
      const dialog = q(el, '.dialog') as HTMLElement;
      const parentSpy = vi.fn();
      el.addEventListener('click', parentSpy);
      dialog.click();
      expect(parentSpy).not.toHaveBeenCalled();
    });
  });
});

describe('OigTimelineTile', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    fixtureCleanup();
  });

  it('renders tile structure', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-tile></oig-timeline-tile>`);
    await flush();
    expect(q(el, '.tile')).not.toBeNull();
    expect(q(el, '.tile-header')).not.toBeNull();
  });

  it('shows empty state when data is null', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-tile></oig-timeline-tile>`);
    await flush();
    expect(q(el, '.empty-state')).not.toBeNull();
  });

  it('renders three tabs', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-tile></oig-timeline-tile>`);
    await flush();
    expect(qa(el, '.tab')).toHaveLength(3);
  });

  it('marks active tab', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-tile .activeTab=${'tomorrow' as any}></oig-timeline-tile>`);
    await flush();
    const tabs = qa(el, '.tab');
    const active = tabs.find(t => t.classList.contains('active'));
    expect(active!.textContent).toContain('Zítra');
  });

  it('dispatches tab-change on tab click', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-tile .activeTab=${'today' as any}></oig-timeline-tile>`);
    await flush();
    const spy = vi.fn();
    el.addEventListener('tab-change', spy);
    const tabs = qa(el, '.tab');
    (tabs[0] as HTMLElement).click();
    expect(spy).toHaveBeenCalledOnce();
    expect(spy.mock.calls[0][0].detail.tab).toBe('yesterday');
  });

  it('updates activeTab on tab click', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-tile .activeTab=${'today' as any}></oig-timeline-tile>`);
    await flush();
    const tabs = qa(el, '.tab');
    (tabs[2] as HTMLElement).click();
    await (el as any).updateComplete;
    expect((el as any).activeTab).toBe('tomorrow');
  });

  it('auto-refresh checkbox defaults to checked', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-tile></oig-timeline-tile>`);
    await flush();
    const cb = q(el, '.auto-refresh input') as HTMLInputElement;
    expect(cb.checked).toBe(true);
  });

  it('toggles auto-refresh off', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-tile></oig-timeline-tile>`);
    await flush();
    const cb = q(el, '.auto-refresh input') as HTMLInputElement;
    cb.checked = false;
    cb.dispatchEvent(new Event('change'));
    await (el as any).updateComplete;
    expect((el as any).autoRefresh).toBe(false);
  });

  it('toggles auto-refresh back on', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-tile></oig-timeline-tile>`);
    await flush();
    const cb = q(el, '.auto-refresh input') as HTMLInputElement;
    cb.checked = false;
    cb.dispatchEvent(new Event('change'));
    await (el as any).updateComplete;
    cb.checked = true;
    cb.dispatchEvent(new Event('change'));
    await (el as any).updateComplete;
    expect((el as any).autoRefresh).toBe(true);
  });

  it('fires refresh event on interval', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-tile></oig-timeline-tile>`);
    await flush();
    const spy = vi.fn();
    el.addEventListener('refresh', spy);
    vi.advanceTimersByTime(60_000);
    expect(spy).toHaveBeenCalledOnce();
  });

  it('does not fire refresh when auto-refresh disabled', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-tile></oig-timeline-tile>`);
    await flush();
    const cb = q(el, '.auto-refresh input') as HTMLInputElement;
    cb.checked = false;
    cb.dispatchEvent(new Event('change'));
    await (el as any).updateComplete;
    const spy = vi.fn();
    el.addEventListener('refresh', spy);
    vi.advanceTimersByTime(60_000);
    expect(spy).not.toHaveBeenCalled();
  });

  it('clears interval on disconnect', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-tile></oig-timeline-tile>`);
    await flush();
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    el.remove();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  it('stops interval when auto-refresh toggled off', async () => {
    const el = await fixture<HTMLElement>(html`<oig-timeline-tile></oig-timeline-tile>`);
    await flush();
    const clearIntervalSpy = vi.spyOn(globalThis, 'clearInterval');
    const cb = q(el, '.auto-refresh input') as HTMLInputElement;
    cb.checked = false;
    cb.dispatchEvent(new Event('change'));
    await (el as any).updateComplete;
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });

  describe('with full data', () => {
    it('renders adherence bar', async () => {
      const data = makeData({ summary: makeSummary({ overallAdherence: 92 }) });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(q(el, '.adherence-bar')).not.toBeNull();
      expect(text(el, '.adherence-header')).toContain('92%');
    });

    it('hides adherence bar when one block', async () => {
      const data = makeData({ modeBlocks: [makeBlock()] });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(q(el, '.adherence-bar')).toBeNull();
    });

    it('hides adherence bar when adherence is 0', async () => {
      const data = makeData({ summary: makeSummary({ overallAdherence: 0 }) });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(q(el, '.adherence-bar')).toBeNull();
    });

    it('uses green adherence color >= 90', async () => {
      const data = makeData({ summary: makeSummary({ overallAdherence: 95 }) });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      const fill = q(el, '.adherence-fill') as HTMLElement;
      expect(fill.style.background).toContain('rgb(76, 175, 80)');
    });

    it('uses orange adherence color 70-89', async () => {
      const data = makeData({ summary: makeSummary({ overallAdherence: 80 }) });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      const fill = q(el, '.adherence-fill') as HTMLElement;
      expect(fill.style.background).toContain('rgb(255, 152, 0)');
    });

    it('uses red adherence color < 70', async () => {
      const data = makeData({ summary: makeSummary({ overallAdherence: 30 }) });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      const fill = q(el, '.adherence-fill') as HTMLElement;
      expect(fill.style.background).toContain('rgb(244, 67, 54)');
    });

    it('renders 4 metric tiles', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(qa(el, '.metric-tile')).toHaveLength(4);
    });

    it('formats Kč metric plan with formatCurrency', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      const plans = qa(el, '.metric-plan');
      expect(plans[0].textContent).toContain('100.00 CZK');
    });

    it('formats non-Kč metric plan with unit', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      const plans = qa(el, '.metric-plan');
      expect(plans[1].textContent).toContain('8.0 kWh');
    });

    it('shows better for Kč actual <= plan', async () => {
      const data = makeData({
        summary: makeSummary({
          metrics: {
            cost: makeMetric('Kč', 100, 90, true),
            solar: makeMetric('kWh', 8, 7.5, true),
            consumption: makeMetric('kWh', 20, 22, true),
            grid: makeMetric('kWh', 12, 14, true),
          },
        }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      const actuals = qa(el, '.metric-actual');
      expect(actuals[0].classList.contains('better')).toBe(true);
    });

    it('shows worse for Kč actual > plan', async () => {
      const data = makeData({
        summary: makeSummary({
          metrics: {
            cost: makeMetric('Kč', 100, 150, true),
            solar: makeMetric('kWh', 8, 7.5, true),
            consumption: makeMetric('kWh', 20, 22, true),
            grid: makeMetric('kWh', 12, 14, true),
          },
        }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      const actuals = qa(el, '.metric-actual');
      expect(actuals[0].classList.contains('worse')).toBe(true);
    });

    it('shows better for non-Kč actual >= plan', async () => {
      const data = makeData({
        summary: makeSummary({
          metrics: {
            cost: makeMetric('Kč', 100, 90, true),
            solar: makeMetric('kWh', 8, 10, true),
            consumption: makeMetric('kWh', 20, 22, true),
            grid: makeMetric('kWh', 12, 14, true),
          },
        }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      const actuals = qa(el, '.metric-actual');
      expect(actuals[1].classList.contains('better')).toBe(true);
    });

    it('shows worse for non-Kč actual < plan', async () => {
      const data = makeData({
        summary: makeSummary({
          metrics: {
            cost: makeMetric('Kč', 100, 90, true),
            solar: makeMetric('kWh', 8, 5, true),
            consumption: makeMetric('kWh', 20, 22, true),
            grid: makeMetric('kWh', 12, 14, true),
          },
        }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      const actuals = qa(el, '.metric-actual');
      expect(actuals[1].classList.contains('worse')).toBe(true);
    });

    it('hides actual when hasActual is false', async () => {
      const data = makeData({
        summary: makeSummary({
          metrics: {
            cost: makeMetric('Kč', 100, null, false),
            solar: makeMetric('kWh', 8, null, false),
            consumption: makeMetric('kWh', 20, null, false),
            grid: makeMetric('kWh', 12, null, false),
          },
        }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(qa(el, '.metric-actual')).toHaveLength(0);
    });

    it('renders mode blocks', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(qa(el, '.mode-block')).toHaveLength(2);
    });

    it('marks current block', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(qa(el, '.mode-block.current')).toHaveLength(1);
    });

    it('shows mismatch indicator', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(qa(el, '.mode-mismatch')).toHaveLength(1);
    });

    it('hides mismatch when all match', async () => {
      const data = makeData({
        modeBlocks: [
          makeBlock({ modeMatch: true, startTime: '00:00', endTime: '06:00' }),
          makeBlock({ modeMatch: true, startTime: '06:00', endTime: '12:00' }),
        ],
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(qa(el, '.mode-mismatch')).toHaveLength(0);
    });

    it('shows cost on mode block', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(qa(el, '.mode-cost').length).toBeGreaterThan(0);
    });

    it('hides cost when costPlanned is null', async () => {
      const data = makeData({
        modeBlocks: [
          makeBlock({ costPlanned: null, startTime: '00:00', endTime: '06:00' }),
          makeBlock({ costPlanned: null, startTime: '06:00', endTime: '12:00' }),
        ],
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(qa(el, '.mode-cost')).toHaveLength(0);
    });

    it('uses fallback for unknown mode', async () => {
      const data = makeData({
        modeBlocks: [
          makeBlock({ modePlanned: 'XYZ', modeHistorical: 'XYZ', startTime: '00:00', endTime: '06:00' }),
          makeBlock({ modePlanned: 'XYZ', modeHistorical: 'XYZ', startTime: '06:00', endTime: '12:00' }),
        ],
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(qa(el, '.mode-name')[0].textContent).toBe('XYZ');
    });

    it('uses modeHistorical when modePlanned is empty', async () => {
      const data = makeData({
        modeBlocks: [
          makeBlock({ modePlanned: '', modeHistorical: 'HOME UPS', startTime: '00:00', endTime: '06:00' }),
          makeBlock({ modePlanned: '', modeHistorical: 'HOME UPS', startTime: '06:00', endTime: '12:00' }),
        ],
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(qa(el, '.mode-name')[0].textContent).toBe('HOME UPS');
    });

    it('renders section title with plural labels', async () => {
      const data = makeData({ summary: makeSummary({ modeSwitches: 1 }) });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      const title = text(el, '.section-title');
      expect(title).toContain('2 bloky');
      expect(title).toContain('1 přepnutí');
    });

    it('hides mode section when empty', async () => {
      const data = makeData({ modeBlocks: [] });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(q(el, '.modes-section')).toBeNull();
    });

    it('renders progress section', async () => {
      const data = makeData({
        summary: makeSummary({ progressPct: 55, actualTotalCost: 60, planTotalCost: 100, vsPlanPct: 60 }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(q(el, '.progress-section')).not.toBeNull();
    });

    it('hides progress section when progressPct is undefined', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(q(el, '.progress-section')).toBeNull();
    });

    it('green vs-plan when <= 100', async () => {
      const data = makeData({
        summary: makeSummary({ progressPct: 50, vsPlanPct: 90 }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      const vals = qa(el, '.progress-value');
      const vs = vals.find(v => v.textContent!.includes('90%'));
      expect((vs as HTMLElement).style.color).toContain('rgb(76, 175, 80)');
    });

    it('red vs-plan when > 100', async () => {
      const data = makeData({
        summary: makeSummary({ progressPct: 50, vsPlanPct: 150 }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      const vals = qa(el, '.progress-value');
      const vs = vals.find(v => v.textContent!.includes('150%'));
      expect((vs as HTMLElement).style.color).toContain('rgb(244, 67, 54)');
    });

    it('renders EOD prediction', async () => {
      const data = makeData({
        summary: makeSummary({ eodPrediction: { predictedTotal: 180, predictedSavings: 30 } }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(q(el, '.eod-prediction')).not.toBeNull();
      expect(text(el, '.eod-prediction')).toContain('180.00 CZK');
    });

    it('shows EOD savings when > 0', async () => {
      const data = makeData({
        summary: makeSummary({ eodPrediction: { predictedTotal: 180, predictedSavings: 30 } }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(q(el, '.eod-savings')).not.toBeNull();
    });

    it('hides EOD savings when <= 0', async () => {
      const data = makeData({
        summary: makeSummary({ eodPrediction: { predictedTotal: 180, predictedSavings: -5 } }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(q(el, '.eod-savings')).toBeNull();
    });

    it('hides EOD when absent', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(q(el, '.eod-prediction')).toBeNull();
    });

    it('renders backup savings positive', async () => {
      const data = makeData({
        summary: makeSummary({ backupSavings: 15, backupActualCost: 70, backupBaselineCost: 85 }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      const val = q(el, '.bs-value');
      expect(val!.classList.contains('pos')).toBe(true);
    });

    it('renders backup savings negative', async () => {
      const data = makeData({
        summary: makeSummary({ backupSavings: -20, backupActualCost: 120, backupBaselineCost: 100 }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      const val = q(el, '.bs-value');
      expect(val!.classList.contains('neg')).toBe(true);
    });

    it('hides backup savings when null', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(q(el, '.backup-savings')).toBeNull();
    });

    it('renders comparison section', async () => {
      const data = makeData({
        comparison: {
          plan: 'Green',
          modeBlocks: [makeBlock({ modePlanned: 'HOME III', startTime: '00:00', endTime: '12:00', durationHours: 12 })],
        },
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      const sections = qa(el, '.modes-section');
      expect(sections.length).toBeGreaterThanOrEqual(2);
    });

    it('hides comparison when absent', async () => {
      const data = makeData();
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      expect(qa(el, '.modes-section')).toHaveLength(1);
    });

    it('clamps flex to 0.5 for tiny duration', async () => {
      const data = makeData({
        modeBlocks: [
          makeBlock({ durationHours: 0.01, startTime: '00:00', endTime: '00:01' }),
          makeBlock({ durationHours: 0.01, startTime: '00:01', endTime: '00:02' }),
        ],
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      const blocks = qa(el, '.mode-block') as HTMLElement[];
      expect(blocks[0].style.flex).toContain('0.5');
    });

    it('renders progress actual and plan costs', async () => {
      const data = makeData({
        summary: makeSummary({ progressPct: 40, actualTotalCost: 50, planTotalCost: 100 }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      const content = shadow(el).textContent;
      expect(content).toContain('50.00 CZK');
      expect(content).toContain('100.00 CZK');
    });

    it('hides actual cost when undefined', async () => {
      const data = makeData({
        summary: makeSummary({ progressPct: 40, actualTotalCost: undefined, planTotalCost: 100 }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      const items = qa(el, '.progress-item');
      expect(items.find(i => i.textContent!.includes('Skutečné'))).toBeUndefined();
    });

    it('hides plan cost when undefined', async () => {
      const data = makeData({
        summary: makeSummary({ progressPct: 40, actualTotalCost: 50, planTotalCost: undefined }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      const items = qa(el, '.progress-item');
      expect(items.find(i => i.textContent!.includes('Plán'))).toBeUndefined();
    });

    it('hides vs-plan when undefined', async () => {
      const data = makeData({
        summary: makeSummary({ progressPct: 40, vsPlanPct: undefined }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      const items = qa(el, '.progress-item');
      expect(items.find(i => i.textContent!.includes('vs plán'))).toBeUndefined();
    });

    it('renders backup detail with fallback 0', async () => {
      const data = makeData({
        summary: makeSummary({ backupSavings: 5, backupActualCost: undefined, backupBaselineCost: undefined }),
      });
      const el = await fixture<HTMLElement>(html`<oig-timeline-tile .data=${data}></oig-timeline-tile>`);
      await flush();
      const detail = q(el, '.bs-detail');
      expect(detail!.textContent).toContain('0.00 CZK');
    });
  });
});
