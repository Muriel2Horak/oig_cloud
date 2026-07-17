import { describe, it, expect } from 'vitest';
import { fieldsFromRegistry } from '@/data/registry-data';
import { STEP_SOLAR } from '@/ui/features/onboarding/step-solar';
import { STEP_PRICING } from '@/ui/features/onboarding/step-pricing';
import { REGISTRY_FIXTURE } from './fixtures/registry-fixture';

describe('step ② solar (P3, as narrowed by SCOPE-REVISION #6)', () => {
  it('renders solar fields from the registry, not a local list', () => {
    expect(STEP_SOLAR.fields(REGISTRY_FIXTURE).map((f) => f.key))
      .toEqual(fieldsFromRegistry(REGISTRY_FIXTURE, 'solar').map((f) => f.key));
  });

  it('applies the same provider→key conditional as the settings tab', () => {
    const shown = STEP_SOLAR.visibleFields(REGISTRY_FIXTURE, { solar_forecast_provider: 'solcast' });
    expect(shown.map((f) => f.key)).toContain('solcast_api_key');
    expect(shown.map((f) => f.key)).not.toContain('solar_forecast_api_key');
  });

  it('[Otestovat] gates only the STEP, never the dashboard (#6)', () => {
    expect(STEP_SOLAR.blocksDashboard).toBe(false);
    expect(STEP_SOLAR.skippable).toBe(true);
  });
});

describe('step ③ pricing', () => {
  it('is reachable without a verified AI (#5)', () => {
    expect(STEP_PRICING.requiresAi).toBe(false);
  });

  it('AI cross-verification is an optional helper button, not a precondition', () => {
    expect(STEP_PRICING.aiVerify.optional).toBe(true);
  });
});
