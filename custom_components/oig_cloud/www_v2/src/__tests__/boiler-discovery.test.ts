import { describe, expect, it, vi } from 'vitest';

vi.mock('@/data/ha-client', () => ({ haClient: { fetchOIGAPI: vi.fn() } }));

import { boilerSuggestions, reasonText, type BoilerDiscovery } from '@/data/ev-data';

const cand = (entity_id: string, reasons: string[] = []) => ({ entity_id, name: entity_id, device: '', score: 5, reasons });

describe('boilerSuggestions', () => {
  const found: BoilerDiscovery = {
    roles: {
      boiler_temp_sensor_top: [cand('sensor.top')],
      boiler_heater_switch_entity: [cand('switch.main', ['device_boiler', 'name_main'])],
      boiler_circulation_pump_switch_entity: [cand('switch.circ_socket')],
      boiler_alt_energy_sensor: [],
    },
    current: {
      boiler_temp_sensor_top: 'sensor.top_configured',
      boiler_heater_switch_entity: null,
      boiler_circulation_pump_switch_entity: 'switch.gone',
    },
  };
  const exists = (id: string) => id !== 'switch.gone';

  it('keeps working settings, fills empty ones and replaces missing entities', () => {
    const out = boilerSuggestions(found, exists);
    expect(out.map((s) => s.key)).toEqual(['boiler_heater_switch_entity', 'boiler_circulation_pump_switch_entity']);
    expect(out[0].candidate.entity_id).toBe('switch.main');
    expect(out[1]).toMatchObject({ currentMissing: true, current: 'switch.gone' });
  });

  it('explains boiler reasons in Czech', () => {
    expect(reasonText(['device_boiler', 'name_main'])).toBe('patří bojleru, hlavní spínač zařízení');
  });
});
