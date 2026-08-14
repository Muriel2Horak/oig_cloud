import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  applyBoilerPlan,
  cancelBoilerPlan,
  planBoilerHeating,
} from '@/data/boiler-data';
import '@/ui/features/boiler/components';
import type {
  BoilerConfig,
  BoilerEnergyBreakdown,
  BoilerHeatmapRow,
  BoilerPlan,
  BoilerPredictedUsage,
  BoilerProfilingData,
  BoilerState,
} from '@/ui/features/boiler/types';

vi.mock('@/data/boiler-data', () => ({
  planBoilerHeating: vi.fn(),
  applyBoilerPlan: vi.fn(),
  cancelBoilerPlan: vi.fn(),
}));

vi.mock('@/data/ha-client', () => ({
  haClient: {
    callService: vi.fn(),
  },
}));

type LitFixture = HTMLElement & { updateComplete: Promise<unknown> };

const state: BoilerState = {
  currentTemp: 56.2,
  targetTemp: 60,
  heating: true,
  tempTop: 62.4,
  tempBottom: 41.6,
  avgTemp: 52.0,
  heatingPercent: 73,
  energyNeeded: 1.25,
  planCost: 9.5,
  nextHeating: '14:00',
  recommendedSource: 'FVE',
  nextProfile: 'evening',
  nextStart: '18:30',
};

const plan: BoilerPlan = {
  slots: [
    {
      start: '2026-01-01T10:00:00Z',
      end: '2026-01-01T10:15:00Z',
      consumptionKwh: 0.55,
      recommendedSource: 'fve',
      spotPrice: 1.23,
      tempTop: 61,
      soc: 82,
    },
    {
      start: '2026-01-01T10:15:00Z',
      end: '2026-01-01T10:30:00Z',
      consumptionKwh: 0.45,
      recommendedSource: 'grid',
      spotPrice: 2.1,
      tempTop: 62,
      soc: 84,
    },
  ],
  totalConsumptionKwh: 2.6,
  fveKwh: 1.4,
  gridKwh: 0.9,
  altKwh: 0.3,
  estimatedCostCzk: 4.9,
  nextSlot: null,
  planStart: '10:00',
  planEnd: '12:00',
  sourceDigest: 'FVE 70 / grid 30',
  activeSlotCount: 2,
  cheapestSpot: '11:00 0.80 Kc',
  mostExpensiveSpot: '20:00 5.40 Kc',
};

const energyBreakdown: BoilerEnergyBreakdown = {
  fveKwh: 1.43,
  gridKwh: 0.82,
  altKwh: 0.35,
  fvePercent: 55,
  gridPercent: 32,
  altPercent: 13,
};

const predictedUsage: BoilerPredictedUsage = {
  predictedTodayKwh: 2.75,
  peakHours: [7, 19],
  waterLiters40c: 144,
  circulationWindows: '06:30-07:00, 19:00-19:30',
  circulationNow: 'ANO - koupelna',
};

const config: BoilerConfig = {
  volumeL: 200,
  heaterPowerW: 2200,
  heaterPowerKw: 2.2,
  targetTempC: 60,
  deadlineTime: '06:30',
  stratificationMode: 'dual',
  kCoefficient: '0.82',
  coldInletTempC: 12,
  auraMaxTempC: 72,
};

const heatmapRows: BoilerHeatmapRow[] = Array.from({ length: 7 }, (_, day) => ({
  day: `D${day + 1}`,
  hours: Array.from({ length: 24 }, (_, hour) => {
    if (hour === 0) return 0;
    if (hour < 8) return 0.1;
    if (hour < 16) return 0.7;
    return 1.2;
  }),
}));

const profilingData: BoilerProfilingData = {
  hourlyAvg: Array.from({ length: 24 }, (_, hour) => (
    hour === 7 || hour === 19 ? 0.9 : 0.1 + hour / 200
  )),
  peakHours: [7, 19],
  predictedTotalKwh: 2.75,
  confidence: 0.85,
  daysTracked: 9,
};

function shadowText(el: Element): string {
  return el.shadowRoot?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

function renderedElementCount(el: Element): number {
  return Array.from(el.shadowRoot?.children ?? []).filter(
    (child) => child.tagName.toLowerCase() !== 'style',
  ).length;
}

async function flushUpdates(el: Element): Promise<void> {
  const updateComplete = (el as Partial<LitFixture>).updateComplete;
  if (updateComplete) {
    await updateComplete;
  }
}

async function flushNestedUpdates(root: ParentNode): Promise<void> {
  const updates = Array.from(root.querySelectorAll('*')).map((el) => (
    (el as Partial<LitFixture>).updateComplete
  )).filter((value): value is Promise<unknown> => Boolean(value));

  await Promise.all(updates);
}

async function flushMicrotasks(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('boiler component public behavior', () => {
  beforeEach(() => {
    vi.mocked(planBoilerHeating).mockResolvedValue(true);
    vi.mocked(applyBoilerPlan).mockResolvedValue(true);
    vi.mocked(cancelBoilerPlan).mockResolvedValue(false);
  });

  afterEach(() => {
    fixtureCleanup();
    vi.clearAllMocks();
  });

  it('opens debug controls and emits action results for every public action', async () => {
    const panel = await fixture<LitFixture>(html`
      <oig-boiler-debug-panel></oig-boiler-debug-panel>
    `);
    await flushUpdates(panel);

    const events: Array<CustomEvent<{ success: boolean; label: string }>> = [];
    panel.addEventListener('action-done', (event) => {
      events.push(event as CustomEvent<{ success: boolean; label: string }>);
    });

    expect(panel.shadowRoot!.querySelector('.panel-content')!.classList.contains('open')).toBe(false);

    panel.shadowRoot!.querySelector<HTMLButtonElement>('.panel-header')!.click();
    await flushUpdates(panel);

    expect(panel.shadowRoot!.querySelector('.panel-content')!.classList.contains('open')).toBe(true);

    const actionButtons = Array.from(panel.shadowRoot!.querySelectorAll<HTMLButtonElement>('.action-btn'));
    expect(actionButtons).toHaveLength(3);

    actionButtons[0].click();
    await flushMicrotasks();
    await flushUpdates(panel);

    actionButtons[1].click();
    await flushMicrotasks();
    await flushUpdates(panel);

    actionButtons[2].click();
    await flushMicrotasks();
    await flushUpdates(panel);

    expect(planBoilerHeating).toHaveBeenCalledTimes(1);
    expect(applyBoilerPlan).toHaveBeenCalledTimes(1);
    expect(cancelBoilerPlan).toHaveBeenCalledTimes(1);
    expect(events.map((event) => event.detail)).toEqual([
      { success: true, label: 'plan' },
      { success: true, label: 'apply' },
      { success: false, label: 'cancel' },
    ]);
  });

  it('renders live state, energy, plan, tank, stats, profiling, and config values', async () => {
    const root = await fixture<HTMLDivElement>(html`
      <div>
        <oig-boiler-status-grid .data=${state}></oig-boiler-status-grid>
        <oig-boiler-energy-breakdown .data=${energyBreakdown}></oig-boiler-energy-breakdown>
        <oig-boiler-predicted-usage .data=${predictedUsage}></oig-boiler-predicted-usage>
        <oig-boiler-plan-info .plan=${plan} .forecastWindows=${{ fve: '10:00-11:00', grid: '02:00-03:00' }}></oig-boiler-plan-info>
        <oig-boiler-tank .boilerState=${state} .targetTemp=${60}></oig-boiler-tank>
        <oig-boiler-stats-cards .plan=${plan}></oig-boiler-stats-cards>
        <oig-boiler-profiling .data=${profilingData}></oig-boiler-profiling>
        <oig-boiler-config-section .config=${config}></oig-boiler-config-section>
      </div>
    `);
    await flushNestedUpdates(root);

    const status = root.querySelector('oig-boiler-status-grid')!;
    expect(status.shadowRoot!.querySelectorAll('.card')).toHaveLength(7);
    expect(shadowText(status)).toContain('73 %');
    expect(shadowText(status)).toContain('1.25 kWh');
    expect(shadowText(status)).toContain('FVE');

    const energy = root.querySelector('oig-boiler-energy-breakdown')!;
    expect(shadowText(energy)).toContain('1.43 kWh');
    expect(energy.shadowRoot!.querySelector<HTMLElement>('.ratio-fve')!.getAttribute('style')).toContain('55.0%');

    const predicted = root.querySelector('oig-boiler-predicted-usage')!;
    expect(shadowText(predicted)).toContain('7h, 19h');
    expect(shadowText(predicted)).toContain('144 L');
    expect(predicted.shadowRoot!.querySelector('.value.active')!.textContent).toContain('ANO - koupelna');

    const info = root.querySelector('oig-boiler-plan-info')!;
    expect(shadowText(info)).toContain('FVE 70 / grid 30');
    expect(shadowText(info)).toContain('10:00-11:00');
    expect(shadowText(info)).toContain('02:00-03:00');

    const tank = root.querySelector('oig-boiler-tank')!;
    expect(shadowText(tank)).toContain('73% nahrato');
    expect(tank.shadowRoot!.querySelector<HTMLElement>('.water')!.getAttribute('style')).toContain('height:73%');
    expect(tank.shadowRoot!.querySelectorAll('.sensor')).toHaveLength(2);

    const stats = root.querySelector('oig-boiler-stats-cards')!;
    expect(shadowText(stats)).toContain('2.60 kWh');
    expect(shadowText(stats)).toContain('4.90 Kc');

    const profiling = root.querySelector('oig-boiler-profiling')!;
    expect(profiling.shadowRoot!.querySelectorAll('.bar-col')).toHaveLength(24);
    expect(profiling.shadowRoot!.querySelectorAll('.bar.peak')).toHaveLength(2);
    expect(shadowText(profiling)).toContain('85 %');

    const profile = root.querySelector('oig-boiler-config-section')!;
    expect(shadowText(profile)).toContain('200 L');
    expect(shadowText(profile)).toContain('2200 W');
    expect(shadowText(profile)).toContain('60 °C');
  });

  it('emits category changes from the public selector event', async () => {
    const selector = await fixture<LitFixture>(html`
      <oig-boiler-category-select
        current="workday_summer"
        .available=${['workday_summer', 'weekend_winter', 'custom_profile']}
      ></oig-boiler-category-select>
    `);
    await flushUpdates(selector);

    const events: Array<CustomEvent<{ category: string }>> = [];
    selector.addEventListener('category-change', (event) => {
      events.push(event as CustomEvent<{ category: string }>);
    });

    const select = selector.shadowRoot!.querySelector<HTMLSelectElement>('select')!;
    expect(select.selectedOptions[0].value).toBe('workday_summer');
    expect(select.options[2].textContent).toContain('custom_profile');

    select.value = 'weekend_winter';
    select.dispatchEvent(new Event('change', { bubbles: true }));

    expect(events.map((event) => event.detail)).toEqual([
      { category: 'weekend_winter' },
    ]);
  });

  it('renders heatmap thresholds and legacy wrappers without leaking fallback DOM', async () => {
    const root = await fixture<HTMLDivElement>(html`
      <div>
        <oig-boiler-heatmap-grid .data=${heatmapRows}></oig-boiler-heatmap-grid>
        <oig-boiler-state .state=${state}></oig-boiler-state>
        <oig-boiler-heatmap .data=${[]}></oig-boiler-heatmap>
        <oig-boiler-profiles .profiles=${[]} .editMode=${true}></oig-boiler-profiles>
      </div>
    `);
    await flushNestedUpdates(root);

    const grid = root.querySelector('oig-boiler-heatmap-grid')!;
    expect(grid.shadowRoot!.querySelectorAll('.hour-header')).toHaveLength(24);
    expect(grid.shadowRoot!.querySelectorAll('.cell')).toHaveLength(168);
    expect(grid.shadowRoot!.querySelector('.cell.none')).not.toBeNull();
    expect(grid.shadowRoot!.querySelector('.cell.low')).not.toBeNull();
    expect(grid.shadowRoot!.querySelector('.cell.medium')).not.toBeNull();
    expect(grid.shadowRoot!.querySelector('.cell.high')).not.toBeNull();

    const stateEl = root.querySelector('oig-boiler-state')!;
    expect(shadowText(stateEl)).toContain('56.2°C');
    expect(shadowText(stateEl)).toContain('Topi');
    expect(shadowText(stateEl)).toContain('Dalsi: evening');

    expect(renderedElementCount(root.querySelector('oig-boiler-heatmap')!)).toBe(0);
    expect(renderedElementCount(root.querySelector('oig-boiler-profiles')!)).toBe(0);
  });
});
