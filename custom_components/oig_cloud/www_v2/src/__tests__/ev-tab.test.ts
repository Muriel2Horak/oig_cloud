import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchOIGAPI = vi.fn();
vi.mock('@/data/ha-client', () => ({ haClient: { fetchOIGAPI: (...args: unknown[]) => fetchOIGAPI(...args) } }));

import {
  dayTag,
  evStatus,
  initialChoices,
  reasonText,
  preconditionText,
  priceLevel,
  profileRows,
  wizardValues,
  type EvData,
} from '@/data/ev-data';
import '@/ui/features/ev';

const plan = {
  status: 'planned', target_soc_pct: 79, deadline: '2026-11-17T08:00:00+01:00', needed_kwh: 10,
  planned_kwh: 10, shortfall_kwh: 0, opportunistic_kwh: 0, cost_czk: 52, soc_at_deadline_pct: 79,
  charge_now: false, next_start: '2026-11-17T02:00:00+01:00', slots: [],
  timeline: [
    { start: '2026-11-17T01:45:00+01:00', energy_kwh: 0, pv_kwh: 0, grid_kwh: 0, power_kw: 0, price: 6, cost_czk: 0, estimated: false },
    { start: '2026-11-17T02:00:00+01:00', energy_kwh: 2.75, pv_kwh: 0, grid_kwh: 2.75, power_kw: 11, price: 4.7, cost_czk: 12.9, estimated: false },
  ],
};

describe('evStatus', () => {
  it('names what the car is doing', () => {
    expect(evStatus({ enabled: true, plan: plan as any }).key).toBe('waiting');
    expect(evStatus({ enabled: true, plan: { ...plan, charge_now: true } as any }).key).toBe('charging');
    expect(evStatus({ enabled: true, plan: { ...plan, status: 'unplugged' } as any }).key).toBe('unplugged');
    expect(evStatus({ enabled: true, plan: { ...plan, status: 'shortfall' } as any }).key).toBe('shortfall');
    expect(evStatus({ enabled: true, plan: { ...plan, status: 'no_need', next_start: null } as any }).key).toBe('done');
    expect(evStatus({ enabled: true, issue: 'capacity_unknown', plan: null }).key).toBe('unknown');
  });
});

describe('profileRows and priceLevel', () => {
  it('lists Monday to Sunday with departure and need', () => {
    const rows = profileRows({ '0': { need_pct: 79.4, departure_hour: 8, samples: 8, drive_days: 4 } });
    expect(rows).toHaveLength(7);
    expect(rows[0]).toEqual({ day: 'Po', departure: '08:00', needPct: 79, samples: 8 });
    expect(rows[6].departure).toBe('—');
  });
  it('places a price between the cheapest and dearest slot', () => {
    expect(priceLevel(5, 4, 6)).toBeCloseTo(0.5);
    expect(priceLevel(7, 4, 6)).toBe(1);
    expect(priceLevel(5, 5, 5)).toBe(0.5);
  });
});

describe('oig-ev-tab', () => {
  async function mount(data: EvData | null) {
    const el = document.createElement('oig-ev-tab');
    el.data = data;
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  }

  it('says when the car charges and shows every 15-minute slot as it is', async () => {
    const el = await mount({ enabled: true, car: { soc_pct: 30, plugged_in: true, capacity_kwh: 26.3 }, need_pct: 79, plan: plan as any, profile: {} });
    const root = el.shadowRoot!;
    expect(root.querySelector('[data-testid="ev-status"]')!.textContent).toMatch(/^Nabije se .*02:00–02:15$/);
    // One bar per quarter hour, the plan's own price (no hourly averaging).
    expect(root.querySelectorAll('[data-testid="ev-strip"] .bar')).toHaveLength(2);
    expect(root.querySelector('[data-testid="ev-strip"] .bar')!.getAttribute('title')).toContain('6.00 Kč/kWh');
    expect(root.querySelectorAll('[data-testid="ev-strip"] .bar.charging')).toHaveLength(1);
    expect(root.querySelector('[data-testid="ev-price-range"]')!.textContent).toBe('cena 4.70–6.00 Kč/kWh');
    el.remove();
  });

  it('explains how to turn the car on when it is off', async () => {
    const el = await mount({ enabled: false });
    expect(el.shadowRoot!.textContent).toContain('Elektroauto');
    el.remove();
  });
});

const day = (date: string, source: string, extra: Record<string, unknown> = {}) => ({
  date, source, departure: `${date}T06:00:00+01:00`, need_pct: 40, full_charge: false, holiday: null, precondition: null, ...extra,
});

describe('car tab actions', () => {
  beforeEach(() => {
    fetchOIGAPI.mockReset();
  });

  async function mount(data: EvData) {
    const el = document.createElement('oig-ev-tab');
    el.data = data;
    document.body.appendChild(el);
    await el.updateComplete;
    return el;
  }

  const flush = () => new Promise((r) => setTimeout(r, 0));

  it('charge now posts the choice and asks for a refresh', async () => {
    fetchOIGAPI.mockResolvedValue({ charge_override: { mode: 'now' } });
    const el = await mount({ enabled: true, plan: plan as any });
    const refresh = vi.fn();
    el.addEventListener('oig-ev-refresh', refresh);
    (el.shadowRoot!.querySelector('[data-testid="ev-charge-now"]') as HTMLButtonElement).click();
    await flush();
    expect(fetchOIGAPI).toHaveBeenCalledWith(expect.stringMatching(/\/ev\/charge$/), expect.objectContaining({ method: 'POST', body: JSON.stringify({ mode: 'now' }) }));
    expect(refresh).toHaveBeenCalled();
    el.remove();
  });

  it('charge by sends the chosen time', async () => {
    fetchOIGAPI.mockResolvedValue({ charge_override: { mode: 'by' } });
    const el = await mount({ enabled: true, plan: plan as any });
    (el.shadowRoot!.querySelector('[data-testid="ev-charge-by"]') as HTMLButtonElement).click();
    await flush();
    expect(JSON.parse(fetchOIGAPI.mock.calls[0][1].body)).toEqual({ mode: 'by', time: '05:00' });
    el.remove();
  });

  it('a holiday tomorrow offers to drive as on a working day', async () => {
    fetchOIGAPI.mockResolvedValue({ days: [] });
    const holiday = day('2026-11-17', 'holiday', { holiday: 'Den boje za svobodu a demokracii' });
    const el = await mount({ enabled: true, plan: plan as any, next_day: holiday as any });
    expect(el.shadowRoot!.querySelector('.departure')!.textContent).toContain('Den boje');
    (el.shadowRoot!.querySelector('[data-testid="ev-holiday"]') as HTMLButtonElement).click();
    await flush();
    expect(JSON.parse(fetchOIGAPI.mock.calls[0][1].body)).toMatchObject({ date: '2026-11-17', kind: 'workday' });
    el.remove();
  });

  it('the calendar edits a day and adds a vacation', async () => {
    fetchOIGAPI.mockResolvedValue({ days: [], vacations: [] });
    const days = [day('2026-11-16', 'profile'), day('2026-11-17', 'holiday'), day('2026-11-21', 'profile')];
    const el = await mount({ enabled: true, plan: plan as any, days: days as any, vacations: [['2026-12-23', '2026-12-27']] });
    const root = el.shadowRoot!;
    const cells = root.querySelectorAll('[data-testid="ev-days"] .day');
    expect(cells).toHaveLength(3);
    expect(cells[1].textContent).toContain('svátek');
    expect(cells[0].textContent).toContain('06:00');
    (cells[0] as HTMLButtonElement).click();
    await el.updateComplete;
    const editor = root.querySelector('[data-testid="ev-day-editor"]')!;
    const home = [...editor.querySelectorAll('button')].find((b) => b.textContent!.includes('Jsem doma')) as HTMLButtonElement;
    home.click();
    await flush();
    expect(JSON.parse(fetchOIGAPI.mock.calls[0][1].body)).toMatchObject({ date: '2026-11-16', kind: 'home' });
    expect(root.querySelector('[data-testid="ev-vacations"]')!.textContent).toContain('St 23. 12.');
    (root.querySelector('[data-testid="ev-vacations"] button.link') as HTMLButtonElement).click();
    await el.updateComplete;
    expect(root.querySelectorAll('[data-testid="ev-vacations"] input[type="date"]')).toHaveLength(2);
    el.remove();
  });

  it('the setup wizard proposes the best candidates and saves them', async () => {
    fetchOIGAPI.mockImplementation((path: string, opts?: RequestInit) => {
      if (path.endsWith('/ev/discover')) {
        return Promise.resolve({
          control_mode: 'wallbox',
          switch_inverted: false,
          roles: {
            ev_soc_entity: [{ entity_id: 'sensor.car_soc', name: 'Car SoC', device: 'Car', score: 9, reasons: ['belongs to a car'] }],
            ev_switch_entity: [{ entity_id: 'switch.charger', name: 'Charger', device: 'Charger', score: 6, reasons: [] }],
          },
        });
      }
      if (path.endsWith('/module_config') && opts?.method === 'POST') return Promise.resolve({ updated: true });
      return Promise.resolve(null);
    });
    const el = await mount({ enabled: true, plan: plan as any });
    const root = el.shadowRoot!;
    (root.querySelector('[data-testid="ev-tab-setup"]') as HTMLButtonElement).click();
    await flush();
    await el.updateComplete;
    expect((root.querySelector('#role-ev_soc_entity') as HTMLSelectElement).value).toBe('sensor.car_soc');
    expect(root.querySelectorAll('[data-testid="ev-profile"] tr')).toHaveLength(8);
    (root.querySelector('[data-testid="ev-setup-save"]') as HTMLButtonElement).click();
    await flush();
    const save = fetchOIGAPI.mock.calls.find((c) => String(c[0]).endsWith('/module_config'))!;
    expect(JSON.parse(save[1].body).values).toEqual({
      ev_soc_entity: 'sensor.car_soc',
      ev_switch_entity: 'switch.charger',
      ev_control_mode: 'wallbox',
      ev_switch_inverted: false,
      ev_target_limit_pct: 0,
      ev_set_car_limit: false,
    });
    el.remove();
  });
});

describe('car data helpers', () => {
  it('starts from what is configured and keeps the set modes', () => {
    const found = {
      control_mode: 'wallbox' as const,
      switch_inverted: false,
      roles: {
        ev_charger_power_entity: [{ entity_id: 'sensor.ocpp_power', name: '', device: '', score: 7, reasons: ['device_charger'] }],
        ev_switch_entity: [{ entity_id: 'switch.ocpp', name: '', device: '', score: 6, reasons: [] }],
      },
      current: { ev_charger_power_entity: 'sensor.wallbox_power', ev_switch_entity: 'switch.ocpp' },
      current_settings: { ev_control_mode: 'car', ev_switch_inverted: true, ev_climate_when: 'calendar' },
    };
    const chosen = initialChoices(found);
    expect(chosen.ev_charger_power_entity).toBe('sensor.wallbox_power');
    const values = wizardValues({ ...chosen, ev_climate_entity: 'climate.c' }, found, { control: true, heating: true });
    expect(values).toMatchObject({ ev_control_mode: 'car', ev_switch_inverted: true, ev_climate_when: 'calendar' });
    expect(reasonText(['device_car', 'class_plug', 'x'])).toBe('patří autu, typ zástrčka, x');
    const limit = wizardValues(chosen, found, { control: true, heating: true, targetLimit: 100, setCarLimit: true });
    expect(limit).toMatchObject({ ev_target_limit_pct: 100, ev_set_car_limit: true });
    const off = wizardValues(chosen, found, { control: true, heating: true, targetLimit: 0, setCarLimit: true });
    expect(off).toMatchObject({ ev_target_limit_pct: 0, ev_set_car_limit: false });
  });

  it('wizard values follow the choices', () => {
    const values = wizardValues(
      { ev_soc_entity: 's', ev_switch_entity: 'sw', ev_current_entity: 'n', ev_climate_entity: 'c' },
      { control_mode: 'car', switch_inverted: true },
      { control: true, heating: false },
    );
    expect(values).toMatchObject({ ev_control_mode: 'car', ev_switch_inverted: true, ev_climate_when: 'off' });
    expect(values).not.toHaveProperty('ev_current_control');
    expect(wizardValues({ ev_soc_entity: 's' }, { control_mode: 'none', switch_inverted: false }, { control: true, heating: true }).ev_control_mode).toBe('none');
  });

  it('names days and heating states in Czech', () => {
    expect(dayTag(day('2026-11-18', 'profile') as any)).toBe('pracovní den');
    expect(dayTag(day('2026-11-22', 'profile') as any)).toBe('víkend');
    expect(dayTag(day('2026-11-18', 'trip') as any)).toBe('dlouhá cesta');
    expect(preconditionText(null)).toContain('není nastavené');
    expect(preconditionText({ climate_entity: 'climate.c', precondition: { start: false, reason: 'warm', starts_at: null } } as any)).toBe('Venku je teplo, netopí se.');
  });
});
