// src/__tests__/onboarding-legacy-pricing-key.test.ts
//
// LIVE BUG: a 3-step-era entry's onboarding state carries the old "pricing"
// key alongside the new split steps (`pricing_distribution`/`pricing_supplier`/
// `pricing_supplier_sell`). The backend self-heals this on load (see
// tests/test_onboarding_state.py), but the FE must independently never treat
// an unrecognized step id as fatal — tolerant parse, unknown ids ignored.

import { describe, expect, it, vi } from 'vitest';

const fetchOIGAPI = vi.hoisted(() => vi.fn());

vi.mock('@/data/ha-client', () => ({
  haClient: { fetchOIGAPI },
}));

import {
  ONBOARDING_STEPS,
  isOnboardingDone,
  loadOnboardingState,
  normalizeOnboardingState,
} from '@/ui/features/onboarding/onboarding-data';

// The exact live repro payload (confirmed throw site investigation):
// GET /api/oig_cloud/{box}/onboarding, 200, legacy "pricing" key present
// alongside every current step id.
const LIVE_PAYLOAD = {
  schema_version: 1,
  steps: {
    ai: 'done', solar: 'pending', pricing: 'pending', modules: 'done',
    pricing_distribution: 'done', pricing_supplier: 'done', battery: 'done',
    boiler: 'done', connection: 'done', pricing_supplier_sell: 'pending',
  },
  timestamps: {},
  provider: null,
  grandfathered: false,
  banner_dismissed: false,
};

describe('tolerant parse of legacy onboarding step ids', () => {
  it('normalizeOnboardingState drops unknown step ids, keeps known ones intact', () => {
    const normalized = normalizeOnboardingState(LIVE_PAYLOAD as never);
    expect(normalized.steps).not.toHaveProperty('pricing');
    for (const step of ONBOARDING_STEPS) {
      expect(normalized.steps[step]).toBe(LIVE_PAYLOAD.steps[step as keyof typeof LIVE_PAYLOAD.steps]);
    }
  });

  it('never throws and never returns null for a payload carrying an unknown step id', () => {
    expect(() => normalizeOnboardingState(LIVE_PAYLOAD as never)).not.toThrow();
  });

  it('loadOnboardingState returns a normalized state instead of surfacing the legacy key', async () => {
    fetchOIGAPI.mockResolvedValueOnce(LIVE_PAYLOAD);
    const state = await loadOnboardingState('SN123');
    expect(state).not.toBeNull();
    expect(state).not.toHaveProperty(['steps', 'pricing']);
    expect(state!.steps).not.toHaveProperty('pricing');
  });

  it('a state with a dropped legacy key is not "done" while real steps remain pending', async () => {
    fetchOIGAPI.mockResolvedValueOnce(LIVE_PAYLOAD);
    const state = await loadOnboardingState('SN123');
    expect(isOnboardingDone(state)).toBe(false); // solar + pricing_supplier_sell still pending
  });
});
