import { describe, expect, it, vi } from 'vitest';

vi.mock('@/data/ha-client', () => ({ haClient: { fetchOIGAPI: vi.fn() } }));
import { haClient } from '@/data/ha-client';
import {
  legacyAdoptionsForChanges,
  saveModuleConfig,
  type LegacySolarFields,
} from '@/data/settings-data';

const legacy: LegacySolarFields = {
  solar_forecast_string1_azimuth: {
    stored_value: -90,
    display_value: 90,
    legacy_provider_value: true,
    requires_adoption: true,
  },
};

describe('legacy solar adoption transport', () => {
  it('marks only touched legacy azimuth fields for adoption', () => {
    expect(legacyAdoptionsForChanges(legacy, {
      solar_forecast_latitude: 50,
    })).toEqual([]);
    expect(legacyAdoptionsForChanges(legacy, {
      solar_forecast_string1_azimuth: 90,
    })).toEqual(['solar_forecast_string1_azimuth']);
  });

  it('sends adoption outside registry values and never invents it', async () => {
    const fetch = haClient.fetchOIGAPI as ReturnType<typeof vi.fn>;
    fetch.mockResolvedValue({ updated: true });
    await saveModuleConfig(
      'solar',
      { solar_forecast_string1_azimuth: 90 },
      ['solar_forecast_string1_azimuth'],
    );
    const body = JSON.parse(fetch.mock.calls[0][1].body as string);
    expect(body.values).toEqual({ solar_forecast_string1_azimuth: 90 });
    expect(body.adopt_legacy_fields).toEqual(['solar_forecast_string1_azimuth']);
    expect(body.values).not.toHaveProperty('adopt_legacy_fields');
  });

  it('sends an opaque solar proof only at the top-level save boundary', async () => {
    const fetch = haClient.fetchOIGAPI as ReturnType<typeof vi.fn>;
    fetch.mockResolvedValue({ updated: true });
    await saveModuleConfig('solar', { solar_forecast_mode: 'daily' }, [], 'opaque-proof');
    const body = JSON.parse(fetch.mock.calls.at(-1)![1].body as string);
    expect(body.solar_test_proof).toBe('opaque-proof');
    expect(body.values).not.toHaveProperty('solar_test_proof');
  });
});
