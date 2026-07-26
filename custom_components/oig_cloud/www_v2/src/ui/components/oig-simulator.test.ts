import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import {
  defaultFetcher,
  mockFetcher,
  type SimRequest,
} from './simulator-fetcher';
import '@/ui/components/oig-simulator';

const batteryPresets = [
  { id: 'zima', label: 'Zima — draho, málo slunce' },
  { id: 'leto', label: 'Léto — přebytky, levno' },
];

const boilerPresets = [
  { id: 'vsedni', label: 'Pracovní den' },
  { id: 'vikend', label: 'Víkend' },
];

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

describe('simulator fetcher', () => {
  it('returns deterministic battery data for a preset', async () => {
    const result = await mockFetcher({ kind: 'battery', presetId: 'zima', draft: {} });
    expect(result.kind).toBe('battery');
    if (result.kind !== 'battery') throw new Error('expected battery result');
    expect(result.intervals).toHaveLength(24);
    expect(result.summary.base_cost).toBeGreaterThan(0);
    expect(result.summary.ups_hours).toBeGreaterThan(0);
  });

  it('returns deterministic boiler data for a preset', async () => {
    const result = await mockFetcher({ kind: 'boiler', presetId: 'vsedni', draft: {} });
    expect(result.kind).toBe('boiler');
    if (result.kind !== 'boiler') throw new Error('expected boiler result');
    expect(result.intervals).toHaveLength(24);
    expect(result.summary.kwh).toBeGreaterThan(0);
    expect(result.summary.solar_share).toBeGreaterThanOrEqual(0);
  });

  it('posts battery simulations to the planner endpoint with the merged draft body', async () => {
    window.history.pushState({}, '', '/?sn=BOX123');
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        kind: 'battery',
        intervals: [],
        summary: { cost: 1, base_cost: 2, ups_hours: 3 },
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await defaultFetcher({
      kind: 'battery',
      presetId: 'zima',
      draft: {
        soc_start: 41,
        charge_rate_kw: 3.2,
      },
    } satisfies SimRequest);

    expect(result.kind).toBe('battery');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/api/oig_cloud/BOX123/planner_simulate');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      preset_id: 'zima',
      soc_start: 41,
      config_overrides: {
        soc_start: 41,
        charge_rate_kw: 3.2,
      },
    });

    vi.unstubAllGlobals();
  });
});

describe('oig-simulator', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  afterEach(() => {
    fixtureCleanup();
    vi.useRealTimers();
  });

  it('renders the battery overlay with preset chips, kpis, charts and read-only chips', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetcher = vi.fn(mockFetcher);

    const el = await fixture<HTMLElement & Record<string, any>>(html`
      <oig-simulator
        .domain=${'battery'}
        .draft=${{ soc_start: 48 }}
        .presets=${batteryPresets}
        .activePresetId=${'zima'}
        .bootstrapPayload=${{ capacity_kwh: 17.4, hw_min_soc_percent: 20 }}
        .fetcher=${fetcher}
      ></oig-simulator>
    `);
    await flush();
    await (el as any).updateComplete;

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(el.shadowRoot!.querySelector('[data-testid="preset-zima"]')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('[data-testid="kpi-day-cost"]')!.textContent).toContain('Kč');
    expect(el.shadowRoot!.querySelector('[data-testid="chart-mode"]')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('[data-testid="chart-soc"]')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('[data-testid="chart-price"]')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('[data-testid="box-capacity"]')!.textContent).toContain('17,4');
    expect(el.shadowRoot!.querySelector('[data-testid="box-hw-min"]')!.textContent).toContain('20');
    expect(warnSpy).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  it('renders the boiler overlay with boiler-specific tiles and charts', async () => {
    const fetcher = vi.fn(mockFetcher);

    const el = await fixture<HTMLElement & Record<string, any>>(html`
      <oig-simulator
        .domain=${'boiler'}
        .draft=${{ target_temp_c: 61, min_temp_c: 46 }}
        .presets=${boilerPresets}
        .activePresetId=${'vsedni'}
        .bootstrapPayload=${{ top_temp_c: 58.8, bottom_temp_c: 46.0, cold_inlet_c: 12 }}
        .fetcher=${fetcher}
      ></oig-simulator>
    `);
    await flush();
    await (el as any).updateComplete;

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(el.shadowRoot!.querySelector('[data-testid="kpi-energy-day"]')!.textContent).toContain('kWh');
    expect(el.shadowRoot!.querySelector('[data-testid="kpi-solar-share"]')!.textContent).toContain('%');
    expect(el.shadowRoot!.querySelector('[data-testid="chart-heating"]')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('[data-testid="chart-temp"]')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('[data-testid="chart-draw"]')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('[data-testid="box-top-temp"]')!.textContent).toContain('58,8');
    expect(el.shadowRoot!.querySelector('[data-testid="box-bottom-temp"]')!.textContent).toContain('46,0');
    expect(el.shadowRoot!.querySelector('[data-testid="box-cold-inlet"]')!.textContent).toContain('12');
  });

  it('switches presets, emits a preset-changed event and refetches', async () => {
    const fetcher = vi.fn(mockFetcher);
    const presetChanged = vi.fn();

    const el = await fixture<HTMLElement & Record<string, any>>(html`
      <oig-simulator
        .domain=${'battery'}
        .draft=${{ soc_start: 35 }}
        .presets=${batteryPresets}
        .activePresetId=${'zima'}
        .fetcher=${fetcher}
        @preset-changed=${presetChanged}
      ></oig-simulator>
    `);
    await flush();
    await (el as any).updateComplete;

    const currentDayCost = el.shadowRoot!.querySelector('[data-testid="kpi-day-cost"]')!.textContent;
    (el.shadowRoot!.querySelector('[data-testid="preset-leto"]') as HTMLButtonElement).click();
    await flush();
    await (el as any).updateComplete;

    expect(presetChanged).toHaveBeenCalledTimes(1);
    expect((el as any).activePresetId).toBe('leto');
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1][0].presetId).toBe('leto');
    expect(el.shadowRoot!.querySelector('[data-testid="kpi-day-cost"]')!.textContent).not.toBe(currentDayCost);
  });

  it('debounces slider-triggered refetches', async () => {
    vi.useFakeTimers();
    const fetcher = vi.fn(mockFetcher);

    const el = await fixture<HTMLElement & Record<string, any>>(html`
      <oig-simulator
        .domain=${'battery'}
        .draft=${{ soc_start: 40 }}
        .presets=${batteryPresets}
        .activePresetId=${'zima'}
        .fetcher=${fetcher}
        .debounceMs=${250}
      ></oig-simulator>
    `);
    await flush();
    await (el as any).updateComplete;

    const slider = el.shadowRoot!.querySelector('[data-testid="slider-charge-rate"]') as HTMLInputElement;
    slider.value = '5.2';
    slider.dispatchEvent(new Event('input', { bubbles: true, composed: true }));

    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(249);
    expect(fetcher).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    await flush();
    await (el as any).updateComplete;

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher.mock.calls[1][0].draft.charge_rate_kw).toBe(5.2);
    expect(el.shadowRoot!.querySelector('[data-testid="kpi-ups-hours"]')!.textContent).toMatch(/\d+/);
  });

  it('shows an error state with retry and recovers on retry', async () => {
    const fetcher = vi
      .fn()
      .mockRejectedValueOnce(new Error('planner offline'))
      .mockResolvedValueOnce(await mockFetcher({ kind: 'battery', presetId: 'zima', draft: {} }));

    const el = await fixture<HTMLElement & Record<string, any>>(html`
      <oig-simulator
        .domain=${'battery'}
        .draft=${{}}
        .presets=${batteryPresets}
        .activePresetId=${'zima'}
        .fetcher=${fetcher}
      ></oig-simulator>
    `);
    await flush();
    await (el as any).updateComplete;

    expect(el.shadowRoot!.querySelector('[data-testid="simulator-error"]')).toBeTruthy();
    expect(el.shadowRoot!.querySelector('[data-testid="simulator-error"]')!.textContent).toContain('planner offline');

    (el.shadowRoot!.querySelector('[data-testid="simulator-retry"]') as HTMLButtonElement).click();
    await flush();
    await (el as any).updateComplete;

    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(el.shadowRoot!.querySelector('[data-testid="simulator-error"]')).toBeNull();
    expect(el.shadowRoot!.querySelector('[data-testid="chart-mode"]')).toBeTruthy();
  });

  it('marks missing bootstrap payload fields as nedostupné and warns once', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const fetcher = vi.fn(mockFetcher);

    const el = await fixture<HTMLElement & Record<string, any>>(html`
      <oig-simulator
        .domain=${'battery'}
        .draft=${{}}
        .presets=${batteryPresets}
        .activePresetId=${'zima'}
        .bootstrapPayload=${{ capacity_kwh: 17.4 }}
        .fetcher=${fetcher}
      ></oig-simulator>
    `);
    await flush();
    await (el as any).updateComplete;

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain('missing bootstrap fields');
    expect(String(warnSpy.mock.calls[0][1]?.missing ?? '')).toContain('hw_min_soc_percent');
    expect(el.shadowRoot!.querySelector('[data-testid="box-hw-min"]')!.textContent).toContain('nedostupné');

    warnSpy.mockRestore();
  });
});
