// src/__tests__/settings-solar-conditional.test.ts
import { describe, it, expect } from 'vitest';
import { fieldsFromRegistry, isVisible } from '@/data/registry-data';
import { REGISTRY_FIXTURE } from './fixtures/registry-fixture';  // trimmed real /config_registry body

describe('solar card — provider→key wiring (UX-AUDIT U1/U2)', () => {
  const defs = fieldsFromRegistry(REGISTRY_FIXTURE, 'solar');
  const keys = defs.map((d) => d.key);
  const visibleFor = (provider: string) =>
    defs.filter((d) => isVisible(d, (k) =>
      k === 'solar_forecast_provider' ? provider : undefined)).map((d) => d.key);

  it('exposes forecast.solar key + mode at all (U2 — they were absent from the form)', () => {
    expect(keys).toContain('solar_forecast_api_key');
    expect(keys).toContain('solar_forecast_mode');
  });

  it('shows ONLY forecast.solar credentials when provider=forecast_solar', () => {
    const shown = visibleFor('forecast_solar');
    expect(shown).toContain('solar_forecast_api_key');
    expect(shown).toContain('solar_forecast_mode');
    expect(shown).not.toContain('solcast_api_key');
    expect(shown).not.toContain('solcast_site_id');
  });

  it('shows ONLY Solcast credentials when provider=solcast', () => {
    const shown = visibleFor('solcast');
    expect(shown).toContain('solcast_api_key');
    expect(shown).toContain('solcast_site_id');
    expect(shown).not.toContain('solar_forecast_api_key');
    expect(shown).not.toContain('solar_forecast_mode');
  });

  it('provider select is always visible', () => {
    expect(visibleFor('solcast')).toContain('solar_forecast_provider');
  });
});
