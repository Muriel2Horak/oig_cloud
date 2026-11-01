import { describe, expect, it, vi } from 'vitest';

let attributes: Record<string, unknown> = {};

vi.mock('@/data/entity-store', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>();
  return {
    ...actual,
    getEntityStore: () => ({
      findSensorId: () => 'sensor.oig_1_battery_efficiency',
      get: () => ({ state: '98.6', attributes }),
      getNumeric: () => ({ value: 0, exists: false }),
      getString: () => ({ value: '', exists: false }),
    }),
  };
});

import { extractAnalyticsSensors } from '@/data/analytics-data';

function trend(overrides: Record<string, unknown>) {
  attributes = {
    efficiency_last_month_pct: 98.6,
    efficiency_current_month_pct: 95,
    current_month_days: 14,
    current_month_delta_kwh: 2,
    ...overrides,
  };
  return extractAnalyticsSensors('1').efficiency?.trend;
}

describe('battery efficiency trend', () => {
  it('compares a month with enough days and a known battery balance', () => {
    expect(trend({})).toBeCloseTo(-3.6);
  });

  it('stays out while the month is only a few days old', () => {
    expect(trend({ current_month_days: 1 })).toBe(0);
  });

  it('stays out when the energy stored in the battery is unknown', () => {
    expect(trend({ current_month_delta_kwh: null })).toBe(0);
  });
});
