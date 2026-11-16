import { describe, expect, it } from 'vitest';
import { evStatus, priceLevel, profileRows, type EvData } from '@/data/ev-data';
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

  it('shows status, a slot per quarter hour and the weekly profile', async () => {
    const el = await mount({ enabled: true, car: { soc_pct: 30, plugged_in: true, capacity_kwh: 26.3 }, need_pct: 79, plan: plan as any, profile: {} });
    const root = el.shadowRoot!;
    expect(root.querySelector('[data-testid="ev-status"]')!.textContent).toContain('Čeká na levný čas');
    expect(root.querySelectorAll('[data-testid="ev-strip"] .slot')).toHaveLength(2);
    expect(root.querySelectorAll('[data-testid="ev-strip"] .bar')).toHaveLength(1);
    expect(root.querySelectorAll('[data-testid="ev-profile"] tr')).toHaveLength(8);
    el.remove();
  });

  it('explains how to turn the car on when it is off', async () => {
    const el = await mount({ enabled: false });
    expect(el.shadowRoot!.textContent).toContain('Elektroauto');
    el.remove();
  });
});
