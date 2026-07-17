// src/__tests__/onboarding-skip.test.ts
//
// Plan 3.5 item 5: skipOnboardingStep posts a skip end-to-end. A skip is a user
// choice (#5 — every step skippable), never a lock (#6). The banner-suppression
// for a grandfathered entry is covered in onboarding-soft-gate.test.ts.
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { fetchOIGAPI } = vi.hoisted(() => ({
  fetchOIGAPI: vi.fn().mockResolvedValue(null),
}));

vi.mock('@/data/ha-client', () => ({
  haClient: { fetchOIGAPI },
}));

import {
  skipOnboardingStep,
  completeOnboardingStep,
  EMPTY_ONBOARDING_STATE,
} from '@/ui/features/onboarding/onboarding-data';

describe('skipOnboardingStep (Plan 3.5 item 5)', () => {
  beforeEach(() => fetchOIGAPI.mockClear());

  it('POSTs {action: "skip", step} to the box onboarding endpoint', async () => {
    await skipOnboardingStep('SN123', 'solar');
    expect(fetchOIGAPI).toHaveBeenCalledTimes(1);
    const [path, opts] = fetchOIGAPI.mock.calls[0];
    expect(path).toBe('/SN123/onboarding');
    expect(opts.method).toBe('POST');
    expect(JSON.parse(opts.body)).toEqual({ action: 'skip', step: 'solar' });
  });

  it('is distinct from a completion (which posts action: "complete_step")', async () => {
    await completeOnboardingStep('SN123', 'solar');
    expect(JSON.parse(fetchOIGAPI.mock.calls[0][1].body)).toEqual({
      action: 'complete_step',
      step: 'solar',
    });
  });

  it('throws on an unknown step id (runtime guard behind the type)', async () => {
    await expect(
      // @ts-expect-error — intentionally invalid step id
      skipOnboardingStep('SN123', 'nope'),
    ).rejects.toThrow(/unknown onboarding step/);
    expect(fetchOIGAPI).not.toHaveBeenCalled();
  });
});

describe('OnboardingState shape carries grandfathered (banner suppression source)', () => {
  it('EMPTY_ONBOARDING_STATE defaults grandfathered to false', () => {
    expect(EMPTY_ONBOARDING_STATE.grandfathered).toBe(false);
  });
});
