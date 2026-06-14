import { describe, it, expect, beforeEach } from 'vitest';
import { OigBoilerSocChart, buildSocSeries } from '@/ui/features/boiler/boiler-soc-chart';
import type { BoilerV2PlanSlot } from '@/ui/features/boiler/types';

function slot(p: Partial<BoilerV2PlanSlot> & { start: string }): BoilerV2PlanSlot {
  return {
    end: p.start, consumptionKwh: 0, confidence: 1, recommendedSource: null,
    spotPrice: null, altPrice: null, overflowAvailable: false, ...p,
  } as BoilerV2PlanSlot;
}

const D = '2099-06-14T';

describe('buildSocSeries', () => {
  it('maps slots into aligned arrays and derives battery kWh', () => {
    const slots = [
      slot({ start: `${D}10:00:00`, readyLiters: 80, pvKwh: 0.3, gridKwh: 0.2, altKwh: 0, heatingKwh: 0.8, consumptionKwh: 0.1, expectedTempTopC: 55, overflowAvailable: true }),
      slot({ start: `${D}10:15:00`, readyLiters: 90, heatingKwh: 0 }),
    ];
    const s = buildSocSeries(slots);
    expect(s.liters).toEqual([80, 90]);
    // battery = heating - pv - grid - alt = 0.8 - 0.3 - 0.2 - 0 = 0.3
    expect(s.battery[0]).toBeCloseTo(0.3, 3);
    expect(s.fve[0]).toBeCloseTo(0.3, 3);
    expect(s.draw[0]).toBeCloseTo(0.1, 3);
    expect(s.temp[0]).toBe(55);
    expect(s.overflow[0]).toBe(true);
    expect(s.times.length).toBe(2);
  });

  it('clamps negative derived battery to zero', () => {
    const s = buildSocSeries([slot({ start: `${D}10:00:00`, pvKwh: 1.0, heatingKwh: 0.5 })]);
    expect(s.battery[0]).toBe(0);
  });
});

describe('OigBoilerSocChart render', () => {
  let el: OigBoilerSocChart;
  beforeEach(() => { el = document.createElement('oig-boiler-soc-chart') as OigBoilerSocChart; document.body.appendChild(el); });

  it('shows empty state without slots', async () => {
    el.planSlots = [];
    await el.updateComplete;
    expect(el.shadowRoot!.innerHTML).toMatch(/Plán zatím|No plan/i);
  });

  it('renders an svg with data', async () => {
    el.planSlots = [
      slot({ start: `${D}10:00:00`, readyLiters: 80, gridKwh: 0.4, heatingKwh: 0.4, expectedTempTopC: 55 }),
      slot({ start: `${D}10:15:00`, readyLiters: 95, gridKwh: 0.4, heatingKwh: 0.4, expectedTempTopC: 58 }),
    ];
    el.capacityLiters = 200;
    el.nowLiters = 75;
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('<svg');
    expect(html).toContain('boiler-soc-chart');
    expect(html).toMatch(/SoC/);
  });

  it('shows learning badge when drivesPlan=false', async () => {
    el.planSlots = [slot({ start: `${D}10:00:00`, readyLiters: 80 })];
    el.drivesPlan = false;
    await el.updateComplete;
    expect(el.shadowRoot!.innerHTML).toMatch(/učí se|learning/i);
  });
});
