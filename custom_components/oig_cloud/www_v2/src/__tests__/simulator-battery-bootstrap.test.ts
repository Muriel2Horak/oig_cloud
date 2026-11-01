import { describe, expect, it } from 'vitest';
import { batterySimulatorBootstrap } from '@/ui/features/onboarding/step-battery';

const hass = (attributes: Record<string, unknown>) => ({
  states: {
    'sensor.oig_123_battery_forecast': { state: 'ok', attributes },
  },
});

describe('batterySimulatorBootstrap', () => {
  it('passes the box capacity and its minimum as a percentage', () => {
    const payload = batterySimulatorBootstrap(
      hass({ max_capacity_kwh: 15.36, min_capacity_kwh: 3.072 }),
      '123',
    );
    expect(payload).toEqual({ capacity_kwh: 15.36, hw_min_soc_percent: 20 });
  });

  it('leaves out what the box does not report', () => {
    expect(batterySimulatorBootstrap(hass({}), '123')).toEqual({
      capacity_kwh: undefined,
      hw_min_soc_percent: undefined,
    });
  });
});
