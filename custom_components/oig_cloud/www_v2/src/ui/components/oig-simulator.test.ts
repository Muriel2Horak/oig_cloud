import { haClient } from '@/data/ha-client';
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import {
  defaultFetcher,
  fetchSimulatorPresets,
  mockFetcher,
  type SimRequest,
  type SimResponse,
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

  // Live-probed BE shapes (see brief): POST /{box}/planner_simulate ->
  // {preset, horizon_intervals, interval_minutes, timeline:[...], summary:{...}}
  const PLANNER_SIMULATE_FIXTURE = {
    preset: 'winter_high_price',
    horizon_intervals: 2,
    interval_minutes: 15,
    prices: [2.4, 6.2],
    timeline: [
      {
        interval_index: 0,
        soc_kwh: 8.7,
        solar_kwh: 0,
        load_kwh: 0.2,
        grid_import_kwh: 0.2,
        grid_export_kwh: 0,
        cost_czk: 1.1,
        mode: 3,
        mode_name: 'HOME UPS',
        soc_percent: 50.0,
      },
      {
        interval_index: 1,
        soc_kwh: 9.0,
        solar_kwh: 0,
        load_kwh: 0.15,
        grid_import_kwh: 0,
        grid_export_kwh: 0,
        cost_czk: 0,
        mode: 0,
        mode_name: 'HOME I',
        soc_percent: 51.7,
      },
    ],
    summary: {
      total_cost_czk: 1.1,
      total_grid_import_kwh: 0.2,
      total_grid_export_kwh: 0,
      total_solar_kwh: 0,
      min_soc_kwh: 8.7,
      max_soc_kwh: 9.0,
      min_soc_percent: 50.0,
      max_soc_percent: 51.7,
      mode_distribution: { 'HOME UPS': 1, 'HOME I': 1 },
    },
  };

  it('posts battery simulations to the planner endpoint and maps the real BE response', async () => {
    window.history.pushState({}, '', '/?sn=BOX123');
    const fetchMock = vi
      .spyOn(haClient, 'fetchOIGAPITyped')
      .mockResolvedValue({ ok: true, status: 200, data: PLANNER_SIMULATE_FIXTURE } as any);

    const result = await defaultFetcher({
      kind: 'battery',
      presetId: 'winter_high_price',
      draft: {
        soc_start: 41,
        charge_rate_kw: 3.2,
      },
    } satisfies SimRequest);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/BOX123/planner_simulate');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      preset: 'winter_high_price',
      soc_start: 41,
      config_overrides: {
        soc_start: 41,
        charge_rate_kw: 3.2,
      },
    });

    expect(result.kind).toBe('battery');
    if (result.kind !== 'battery') throw new Error('expected battery result');
    expect(result.intervals).toHaveLength(2);
    expect(result.intervals[0]).toEqual({ t: '2099-06-14T00:00:00Z', mode: 'ups', soc: 50.0, cost: 1.1 });
    expect(result.intervals[1]).toEqual({ t: '2099-06-14T00:15:00Z', mode: 'home', soc: 51.7, cost: 0 });
    expect(result.summary.cost).toBeCloseTo(1.1);
    expect(result.summary.base_cost).toBeUndefined();
    expect(result.summary.ups_hours).toBeCloseTo(0.25);
    expect(result.prices).toEqual([2.4, 6.2]);

    vi.unstubAllGlobals();
  });

  // Live-probed BE shape: POST /boiler/{entry}/{box}/simulate_water_day ->
  // {..., timeline:[{start, end, action, source, heating_kwh, pv_kwh, ...,
  // predicted_top_temp_c, purpose}], summary:{total_heating_kwh, cost_czk, pv_kwh, ...}}
  const BOILER_SIMULATE_FIXTURE = {
    entry_id: 'entry1',
    box_id: 'BOX123',
    preset: 'workday',
    inputs: { water_draw_profile_lh: [0, 12, 80] },
    source: {},
    timeline: [
      {
        start: '2026-07-26T05:00:00+02:00',
        end: '2026-07-26T05:15:00+02:00',
        action: 'heat',
        source: 'fve',
        heating_kwh: 0.5,
        pv_kwh: 0.5,
        grid_kwh: 0,
        alt_kwh: 0,
        battery_kwh: 0,
        estimated_cost_czk: 0,
        predicted_top_temp_c: 58.2,
        purpose: 'comfort',
      },
      {
        start: '2026-07-26T05:15:00+02:00',
        end: '2026-07-26T05:30:00+02:00',
        action: 'idle',
        source: null,
        heating_kwh: 0,
        pv_kwh: 0,
        grid_kwh: 0,
        alt_kwh: 0,
        battery_kwh: 0,
        estimated_cost_czk: 0,
        predicted_top_temp_c: 57.9,
        purpose: 'comfort',
      },
    ],
    summary: {
      total_heating_kwh: 2.4,
      cost_czk: 5.6,
      pv_kwh: 1.2,
      grid_kwh: 1.2,
      alt_kwh: 0,
      battery_kwh: 0,
      cost_if_all_grid: 8.4,
      cost_if_all_alt: 10.0,
      comfort_satisfied: true,
      comfort_status: 'satisfied',
      temperature_at_deadline_c: 60.0,
      unsatisfied_comfort_gap_c: 0,
      degraded: false,
      safe_hold: false,
      reason_codes: [],
      demands_met: [],
      demand_labels: [],
    },
  };

  it('posts boiler simulations to the boiler endpoint and maps the real BE response', async () => {
    window.history.pushState({}, '', '/?sn=BOX123&entry_id=entry1');
    const fetchMock = vi
      .spyOn(haClient, 'fetchOIGAPITyped')
      .mockResolvedValue({ ok: true, status: 200, data: BOILER_SIMULATE_FIXTURE } as any);

    const result = await defaultFetcher({
      kind: 'boiler',
      presetId: 'workday',
      draft: { target_temp_c: 60 },
    } satisfies SimRequest);

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/boiler/entry1/BOX123/simulate_water_day');
    expect(JSON.parse(String(fetchMock.mock.calls[0][1]?.body))).toEqual({
      preset: 'workday',
      override_config: { target_temp_c: 60 },
    });

    expect(result.kind).toBe('boiler');
    if (result.kind !== 'boiler') throw new Error('expected boiler result');
    expect(result.intervals).toHaveLength(2);
    expect(result.intervals[0]).toEqual({
      t: '2026-07-26T05:00:00+02:00',
      heating: true,
      source: 'solar',
      temp: 58.2,
    });
    expect(result.intervals[1]).toEqual({
      t: '2026-07-26T05:15:00+02:00',
      heating: false,
      source: 'grid',
      temp: 57.9,
    });
    expect(result.summary.kwh).toBeCloseTo(2.4);
    expect(result.summary.cost).toBeCloseTo(5.6);
    expect(result.summary.solar_share).toBeCloseTo(0.5);
    expect(result.draws).toEqual([0, 12, 80]);

    vi.unstubAllGlobals();
  });

  // Preset-list GET (fe/fix): the overlay fetches its preset chips via GET, not
  // POST. BE returns [{id, name}]; the component's PresetItem is {id, label}, so
  // the fetcher maps name -> label and falls back to id when name is absent.
  const BATTERY_PRESETS_FIXTURE = [
    { id: 'winter_high_price', name: 'Zima, draho' },
    { id: 'sunny_summer', name: 'Léto, slunečno' },
  ];
  const BOILER_PRESETS_FIXTURE = [
    { id: 'workday', name: 'Pracovní den' },
    { id: 'weekend', name: 'Víkend' },
  ];

  it('GETs the battery preset list and maps {id,name} -> {id,label}', async () => {
    window.history.pushState({}, '', '/?sn=BOX123');
    const fetchMock = vi
      .spyOn(haClient, 'fetchOIGAPITyped')
      .mockResolvedValue({ ok: true, status: 200, data: BATTERY_PRESETS_FIXTURE } as any);

    const presets = await fetchSimulatorPresets('battery', { box_id: 'BOX123' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/BOX123/planner_simulate/presets');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET');
    expect(presets).toEqual([
      { id: 'winter_high_price', label: 'Zima, draho' },
      { id: 'sunny_summer', label: 'Léto, slunečno' },
    ]);

    vi.unstubAllGlobals();
  });

  it('GETs the boiler preset list via entry_id and maps {id,name} -> {id,label}', async () => {
    window.history.pushState({}, '', '/?sn=BOX123&entry_id=entry1');
    const fetchMock = vi
      .spyOn(haClient, 'fetchOIGAPITyped')
      .mockResolvedValue({ ok: true, status: 200, data: BOILER_PRESETS_FIXTURE } as any);

    const presets = await fetchSimulatorPresets('boiler', { box_id: 'BOX123' });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('/boiler/entry1/BOX123/simulate_water_day/presets');
    expect(fetchMock.mock.calls[0][1]?.method).toBe('GET');
    expect(presets).toEqual([
      { id: 'workday', label: 'Pracovní den' },
      { id: 'weekend', label: 'Víkend' },
    ]);

    vi.unstubAllGlobals();
  });

  it('throws when the preset-list GET fails', async () => {
    window.history.pushState({}, '', '/?sn=BOX123');
    vi.spyOn(haClient, 'fetchOIGAPITyped').mockResolvedValue({
      ok: false,
      status: 403,
      code: 'forbidden',
      error: 'Admin only',
    } as any);

    await expect(fetchSimulatorPresets('battery', { box_id: 'BOX123' })).rejects.toThrow('Admin only');

    vi.unstubAllGlobals();
  });

  it('throws when the boiler entry id cannot be resolved', async () => {
    window.history.pushState({}, '', '/?sn=BOX123');

    await expect(fetchSimulatorPresets('boiler', { box_id: 'BOX123' })).rejects.toThrow('entry id');

    vi.unstubAllGlobals();
  });

  it('falls back to id as label when BE omits name', async () => {
    window.history.pushState({}, '', '/?sn=BOX123');
    vi.spyOn(haClient, 'fetchOIGAPITyped').mockResolvedValue({
      ok: true,
      status: 200,
      data: [{ id: 'only_id' }],
    } as any);

    const presets = await fetchSimulatorPresets('battery', { box_id: 'BOX123' });
    expect(presets).toEqual([{ id: 'only_id', label: 'only_id' }]);

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

  it('offers the charge rate as the only battery control and posts nothing else from its controls', async () => {
    const fetcher = vi.fn(mockFetcher);

    const el = await fixture<HTMLElement & Record<string, any>>(html`
      <oig-simulator
        .domain=${'battery'}
        .draft=${{}}
        .presets=${batteryPresets}
        .activePresetId=${'zima'}
        .bootstrapPayload=${{ capacity_kwh: 17.4, hw_min_soc_percent: 20 }}
        .fetcher=${fetcher}
      ></oig-simulator>
    `);
    await flush();
    await (el as any).updateComplete;

    const sliders = [...el.shadowRoot!.querySelectorAll('input[type="range"]')];
    expect(sliders.map((slider) => slider.getAttribute('data-testid'))).toEqual(['slider-charge-rate']);
    expect(fetcher.mock.calls[0][0].draft).toEqual({ charge_rate_kw: 2.6 });
    expect(el.shadowRoot!.textContent).not.toContain('komfortní rezerva');
    expect(el.shadowRoot!.textContent).not.toContain('Práh drahých hodin');
  });

  describe('sliders start from the draft', () => {
    type SimElement = HTMLElement & Record<string, any>;

    async function mountSimulator(domain: 'battery' | 'boiler', draft: Record<string, unknown>) {
      const fetcher = vi.fn(mockFetcher);
      const el = await fixture<SimElement>(html`
        <oig-simulator
          .domain=${domain}
          .draft=${draft}
          .presets=${domain === 'battery' ? batteryPresets : boilerPresets}
          .activePresetId=${domain === 'battery' ? 'zima' : 'vsedni'}
          .fetcher=${fetcher}
          .debounceMs=${0}
        ></oig-simulator>
      `);
      await flush();
      await el.updateComplete;
      return { el, fetcher };
    }

    const slider = (el: SimElement, testId: string) =>
      el.shadowRoot!.querySelector(`[data-testid="${testId}"]`) as HTMLInputElement;
    const settings = (el: SimElement) =>
      el.shadowRoot!.querySelector('[data-testid="simulator-settings"]')!.textContent;
    const lastDraft = (fetcher: Mock<[SimRequest], Promise<SimResponse>>) => fetcher.mock.lastCall![0].draft;

    async function drag(el: SimElement, testId: string, value: string) {
      const input = slider(el, testId);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
      await el.updateComplete;
      await flush();
      await el.updateComplete;
    }

    async function setDraft(el: SimElement, draft: Record<string, unknown>) {
      el.draft = draft;
      await el.updateComplete;
      await flush();
      await el.updateComplete;
    }

    it('shows and posts the charge rate the draft carries', async () => {
      const { el, fetcher } = await mountSimulator('battery', { charge_rate_kw: 3.1 });

      expect(slider(el, 'slider-charge-rate').value).toBe('3.1');
      expect(settings(el)).toContain('3,1 kW');
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(lastDraft(fetcher).charge_rate_kw).toBe(3.1);
    });

    it('reads a charge rate the wizard field left as text', async () => {
      const { el, fetcher } = await mountSimulator('battery', { charge_rate_kw: '3.4' });

      expect(slider(el, 'slider-charge-rate').value).toBe('3.4');
      expect(lastDraft(fetcher).charge_rate_kw).toBe(3.4);
    });

    it.each([[undefined], [null], [''], ['nope']])(
      'falls back to 2.6 kW when the draft holds %j',
      async (value) => {
        const { el, fetcher } = await mountSimulator('battery', { charge_rate_kw: value });

        expect(slider(el, 'slider-charge-rate').value).toBe('2.6');
        expect(settings(el)).toContain('2,6 kW');
        expect(lastDraft(fetcher).charge_rate_kw).toBe(2.6);
      },
    );

    // The field accepts 0.5–10 kW (config_registry.py). A narrower slider would
    // park its thumb on the end stop while the readout and the POST say otherwise.
    it.each([['0.5'], ['8.5'], ['10']])('can show %s kW, which the wizard field accepts', async (value) => {
      const { el } = await mountSimulator('battery', { charge_rate_kw: Number(value) });

      expect(slider(el, 'slider-charge-rate').value).toBe(value);
    });

    it('follows a charge rate that changes after mount', async () => {
      const { el, fetcher } = await mountSimulator('battery', { charge_rate_kw: 3.1 });

      await setDraft(el, { charge_rate_kw: 4.2 });

      expect(slider(el, 'slider-charge-rate').value).toBe('4.2');
      expect(settings(el)).toContain('4,2 kW');
      expect(fetcher).toHaveBeenCalledTimes(2);
      expect(lastDraft(fetcher).charge_rate_kw).toBe(4.2);
    });

    it('goes back to the fallback when a later draft stops carrying a charge rate', async () => {
      const { el, fetcher } = await mountSimulator('battery', { charge_rate_kw: 3.1 });

      await setDraft(el, {});

      expect(slider(el, 'slider-charge-rate').value).toBe('2.6');
      expect(lastDraft(fetcher).charge_rate_kw).toBe(2.6);
    });

    it('keeps a dragged charge rate when the draft changes something else', async () => {
      const { el, fetcher } = await mountSimulator('battery', { charge_rate_kw: 3.1, soc_start: 40 });

      await drag(el, 'slider-charge-rate', '5.2');
      await setDraft(el, { charge_rate_kw: 3.1, soc_start: 55 });

      expect(slider(el, 'slider-charge-rate').value).toBe('5.2');
      expect(lastDraft(fetcher)).toMatchObject({ charge_rate_kw: 5.2, soc_start: 55 });
    });

    it('replaces a dragged charge rate when the draft brings a new one', async () => {
      const { el, fetcher } = await mountSimulator('battery', { charge_rate_kw: 3.1 });

      await drag(el, 'slider-charge-rate', '5.2');
      await setDraft(el, { charge_rate_kw: 3.3 });

      expect(slider(el, 'slider-charge-rate').value).toBe('3.3');
      expect(lastDraft(fetcher).charge_rate_kw).toBe(3.3);
    });

    it('shows the boiler target the draft carries', async () => {
      const { el, fetcher } = await mountSimulator('boiler', { boiler_target_temp_c: 63 });

      expect(slider(el, 'slider-target-temp').value).toBe('63');
      expect(settings(el)).toContain('63 °C');
      expect(fetcher).toHaveBeenCalledTimes(1);
      expect(lastDraft(fetcher).boiler_target_temp_c).toBe(63);
    });

    // simulate_water_day has no minimum-temperature input, so a slider for one
    // could only move a line in the chart.
    it('offers the target as the only boiler control', async () => {
      const { el, fetcher } = await mountSimulator('boiler', {});

      const sliders = [...el.shadowRoot!.querySelectorAll('input[type="range"]')];
      expect(sliders.map((input) => input.getAttribute('data-testid'))).toEqual(['slider-target-temp']);
      expect(lastDraft(fetcher)).toEqual({ boiler_target_temp_c: 60 });
      expect(el.shadowRoot!.textContent).not.toContain('Minimální teplota');
      expect(el.shadowRoot!.querySelector('[data-testid="chart-temp"]')!.textContent).toContain('cíl 60 °C');
      expect(el.shadowRoot!.querySelector('[data-testid="chart-temp"]')!.textContent).not.toContain('minimum');
    });

    it('falls back to 60 °C when the boiler draft is empty', async () => {
      const { el } = await mountSimulator('boiler', {});

      expect(slider(el, 'slider-target-temp').value).toBe('60');
    });

    // simulate_water_day drops every override_config key outside
    // _OVERRIDE_CONFIG_KEYS (boiler/api_views.py), so posting `target_temp_c`
    // left the slider with no effect on the simulation at all.
    it('posts the dragged boiler target under the key the backend accepts', async () => {
      const { el, fetcher } = await mountSimulator('boiler', { boiler_target_temp_c: 63 });

      await drag(el, 'slider-target-temp', '66');

      expect(lastDraft(fetcher).boiler_target_temp_c).toBe(66);
      expect(lastDraft(fetcher)).not.toHaveProperty('target_temp_c');
    });

    // boiler_target_temp_c accepts 40–85 °C (config_registry.py).
    it.each([['40'], ['75'], ['85']])('can show a %s °C boiler target, which the wizard field accepts', async (value) => {
      const { el } = await mountSimulator('boiler', { boiler_target_temp_c: Number(value) });

      expect(slider(el, 'slider-target-temp').value).toBe(value);
    });

    it('follows a boiler target that changes after mount', async () => {
      const { el, fetcher } = await mountSimulator('boiler', { boiler_target_temp_c: 63 });

      await setDraft(el, { boiler_target_temp_c: 58 });

      expect(slider(el, 'slider-target-temp').value).toBe('58');
      expect(lastDraft(fetcher).boiler_target_temp_c).toBe(58);
    });
  });

  describe('charts draw what the simulation returned', () => {
    // Real preset ids from the backend: none of them exists in the mock's
    // local scenarios, which is how every preset used to end up drawing `zima`.
    const realBatteryPresets = [
      { id: 'winter_high_price', label: 'Zima, draho' },
      { id: 'sunny_summer', label: 'Léto, slunečno' },
    ];
    const realBoilerPresets = [
      { id: 'workday', label: 'Pracovní den' },
      { id: 'weekend', label: 'Víkend' },
    ];
    const quarterHours = (price: number) => Array.from({ length: 96 }, () => price);

    function batteryFetcher(pricesByPreset: Record<string, number[]>) {
      return vi.fn(async (req: SimRequest): Promise<SimResponse> => ({
        kind: 'battery',
        intervals: [{ t: '2099-06-14T00:00:00Z', mode: 'home', soc: 50, cost: 0 }],
        prices: pricesByPreset[req.presetId as string],
        summary: { cost: 1, ups_hours: 0 },
      }));
    }

    function boilerFetcher(drawsByPreset: Record<string, number[]>) {
      return vi.fn(async (req: SimRequest): Promise<SimResponse> => ({
        kind: 'boiler',
        intervals: [{ t: '2099-06-14T00:00:00Z', heating: false, source: 'grid', temp: 50 }],
        draws: drawsByPreset[req.presetId as string],
        summary: { kwh: 1, cost: 1, solar_share: 0 },
      }));
    }

    const barLabels = (el: HTMLElement, chart: string) =>
      [...el.shadowRoot!.querySelectorAll(`[data-testid="${chart}"] rect`)].map((bar) => bar.getAttribute('aria-label'));

    it('draws every quarter-hour price of a real preset', async () => {
      const el = await fixture<HTMLElement & Record<string, any>>(html`
        <oig-simulator
          .domain=${'battery'}
          .presets=${realBatteryPresets}
          .activePresetId=${'sunny_summer'}
          .fetcher=${batteryFetcher({ winter_high_price: quarterHours(6.2), sunny_summer: quarterHours(0.6) })}
        ></oig-simulator>
      `);
      await flush();
      await el.updateComplete;

      const labels = barLabels(el, 'chart-price');
      expect(labels).toHaveLength(96);
      expect(labels.every((label) => label?.includes('0.60 Kč/kWh'))).toBe(true);
    });

    it('redraws the prices when another preset is picked', async () => {
      const el = await fixture<HTMLElement & Record<string, any>>(html`
        <oig-simulator
          .domain=${'battery'}
          .presets=${realBatteryPresets}
          .activePresetId=${'winter_high_price'}
          .fetcher=${batteryFetcher({ winter_high_price: quarterHours(6.2), sunny_summer: quarterHours(0.6) })}
        ></oig-simulator>
      `);
      await flush();
      await el.updateComplete;
      expect(barLabels(el, 'chart-price')[0]).toContain('6.20 Kč/kWh');

      (el.shadowRoot!.querySelector('[data-testid="preset-sunny_summer"]') as HTMLButtonElement).click();
      await flush();
      await el.updateComplete;

      expect(barLabels(el, 'chart-price')[0]).toContain('0.60 Kč/kWh');
    });

    it('draws the water draws of a real boiler preset', async () => {
      const weekend = Array.from({ length: 24 }, (_, hour) => hour);
      const el = await fixture<HTMLElement & Record<string, any>>(html`
        <oig-simulator
          .domain=${'boiler'}
          .presets=${realBoilerPresets}
          .activePresetId=${'weekend'}
          .fetcher=${boilerFetcher({ workday: weekend.map(() => 0), weekend })}
        ></oig-simulator>
      `);
      await flush();
      await el.updateComplete;

      const labels = barLabels(el, 'chart-draw');
      expect(labels).toHaveLength(24);
      expect(labels[7]).toContain('odběr 7 l');
    });
  });

  it('renders the boiler overlay with boiler-specific tiles and charts', async () => {
    const fetcher = vi.fn(mockFetcher);

    const el = await fixture<HTMLElement & Record<string, any>>(html`
      <oig-simulator
        .domain=${'boiler'}
        .draft=${{ boiler_target_temp_c: 61 }}
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
    expect(fetcher.mock.calls[1][0].draft.charge_rate_kw).toBeCloseTo(5.2);
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
