import { describe, expect, beforeAll, beforeEach, it } from 'vitest';
import { loadScript } from './helpers/load_script.js';

describe('Dashboard utils', () => {
  beforeAll(() => {
    loadScript('custom_components/oig_cloud/www/js/core/utils.js');
  });

  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('formats power and energy values', () => {
    const { formatPower, formatEnergy } = globalThis.DashboardUtils;
    expect(formatPower(500)).toBe('500 W');
    expect(formatPower(1250)).toBe('1.25 kW');
    expect(formatEnergy(800)).toBe('800 Wh');
    expect(formatEnergy(1500)).toBe('1.50 kWh');
  });

  it('updates element value without animation', () => {
    const { updateElementIfChanged } = globalThis.DashboardUtils;
    const el = document.createElement('span');
    el.id = 'test-el';
    document.body.appendChild(el);

    const changed = updateElementIfChanged('test-el', '42', 'test-el', false, false);
    expect(changed).toBe(true);
    expect(el.textContent).toBe('42');
  });

  it('finds sensor with suffix when present', () => {
    globalThis.getHass = () => ({
      states: {
        'sensor.oig_2206237016_service_shield_queue_2': { state: '1' }
      }
    });
    globalThis.INVERTER_SN = '2206237016';

    const { findShieldSensorId } = globalThis.DashboardUtils;
    expect(findShieldSensorId('service_shield_queue')).toBe(
      'sensor.oig_2206237016_service_shield_queue_2'
    );
  });
});
