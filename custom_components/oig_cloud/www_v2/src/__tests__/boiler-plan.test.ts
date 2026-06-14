import { describe, it, expect, beforeEach } from 'vitest';
import { OigBoilerPlan, buildPlanAgenda } from '@/ui/features/boiler/boiler-plan';
import type { BoilerV2PlanSlot } from '@/ui/features/boiler/types';

function slot(start: string, end: string, source: string | null, heatingKwh: number, purpose = 'comfort'): BoilerV2PlanSlot {
  return {
    start, end, consumptionKwh: 0, confidence: 1, recommendedSource: source,
    spotPrice: null, altPrice: null, overflowAvailable: false, heatingKwh, purpose,
  };
}

// far-future so the component's "endIso > now" filter keeps them
const D = '2099-06-14T';

describe('buildPlanAgenda', () => {
  it('merges consecutive same-source heating slots into one window', () => {
    const slots = [
      slot(`${D}10:00:00`, `${D}10:15:00`, 'grid', 0.4),
      slot(`${D}10:15:00`, `${D}10:30:00`, 'grid', 0.4),
      slot(`${D}10:30:00`, `${D}10:45:00`, 'fve', 0.3),
    ];
    const wins = buildPlanAgenda(slots);
    expect(wins).toHaveLength(2);
    expect(wins[0].source).toBe('grid');
    expect(wins[0].kwh).toBeCloseTo(0.8, 3);
    expect(wins[1].source).toBe('fve');
  });

  it('skips zero-heating slots and breaks windows on a gap', () => {
    const slots = [
      slot(`${D}10:00:00`, `${D}10:15:00`, 'grid', 0.4),
      slot(`${D}10:15:00`, `${D}10:30:00`, 'grid', 0.0), // idle gap
      slot(`${D}10:30:00`, `${D}10:45:00`, 'grid', 0.4),
    ];
    const wins = buildPlanAgenda(slots);
    expect(wins).toHaveLength(2);
  });

  it('marks legionella windows', () => {
    const wins = buildPlanAgenda([slot(`${D}02:00:00`, `${D}02:15:00`, 'grid', 0.5, 'legionella')]);
    expect(wins[0].legionella).toBe(true);
  });

  it('returns empty for an all-idle plan', () => {
    expect(buildPlanAgenda([slot(`${D}10:00:00`, `${D}10:15:00`, 'alternative', 0)])).toHaveLength(0);
  });
});

describe('OigBoilerPlan render', () => {
  let el: OigBoilerPlan;
  beforeEach(() => { el = document.createElement('oig-boiler-plan') as OigBoilerPlan; document.body.appendChild(el); });

  it('shows idle state when comfort satisfied and no heating', async () => {
    el.planSlots = [slot(`${D}10:00:00`, `${D}10:15:00`, 'alternative', 0)];
    el.status = { comfortSatisfied: true, heating: false } as any;
    el.planSummary = { estimatedCostCzk: 2.25, costIfAllGrid: 6.29, costIfAllAlt: 2.25, deadlineTime: '18:00:00' } as any;
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('boiler-plan');
    expect(html).toMatch(/Komfort splněn|Comfort met/i);
    expect(html).toMatch(/Žádný ohřev|No heating/i);
    expect(html).toContain('2.25');
  });

  it('lists upcoming heating windows when active', async () => {
    el.planSlots = [
      slot(`${D}10:00:00`, `${D}10:15:00`, 'grid', 0.4),
      slot(`${D}10:15:00`, `${D}10:30:00`, 'grid', 0.4),
    ];
    el.status = { comfortSatisfied: false, heating: true } as any;
    el.planSummary = { estimatedCostCzk: 5.4, costIfAllGrid: 9.1, costIfAllAlt: 7.2, deadlineTime: '18:00:00' } as any;
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toMatch(/Topí se|Heating/i);
    expect(html).toContain('kWh');
    expect(html).toMatch(/10:00/);
  });
});
