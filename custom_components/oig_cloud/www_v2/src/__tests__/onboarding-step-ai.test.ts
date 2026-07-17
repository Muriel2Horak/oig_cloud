// src/__tests__/onboarding-step-ai.test.ts
import { describe, it, expect } from 'vitest';
import { PROVIDER_GUIDES, keyPrefixFor, validateKeyShape } from '@/ui/features/onboarding/step-ai';

describe('step ① — provider guides (SCOPE-REVISION #7)', () => {
  it('offers Groq, NVIDIA and the user’s own HA ai_task as co-equal options (#8)', () => {
    expect(Object.keys(PROVIDER_GUIDES).sort()).toEqual(['ai_task', 'groq', 'nvidia']);
    for (const g of Object.values(PROVIDER_GUIDES)) {
      expect(g.label).not.toMatch(/doporučen|recommended/i);
      expect(g.recommended).toBeUndefined();
    }
  });

  it('carries the direct registration links verbatim', () => {
    expect(PROVIDER_GUIDES.groq.registerUrl).toBe('https://console.groq.com');
    expect(PROVIDER_GUIDES.groq.keysUrl).toBe('https://console.groq.com/keys');
    expect(PROVIDER_GUIDES.nvidia.registerUrl).toBe('https://build.nvidia.com');
    expect(PROVIDER_GUIDES.nvidia.keysUrl).toBe('https://build.nvidia.com/settings/api-keys');
  });

  it('carries numbered key-setup steps and the free-tier facts', () => {
    expect(PROVIDER_GUIDES.groq.steps.length).toBeGreaterThanOrEqual(4);
    expect(PROVIDER_GUIDES.groq.steps[0]).toMatch(/console\.groq\.com/);
    expect(PROVIDER_GUIDES.groq.freeTier).toBe('30k TPM / 30 RPM / 14400 RPD');
    expect(PROVIDER_GUIDES.nvidia.freeTier).toMatch(/1000 kreditů/);
    expect(PROVIDER_GUIDES.groq.steps.join(' ')).toMatch(/jen jednou/); // "zkopíruj (jen jednou)"
  });

  it('states the key prefixes', () => {
    expect(keyPrefixFor('groq')).toBe('gsk_');
    expect(keyPrefixFor('nvidia')).toBe('nvapi-');
  });

  it('validates the pasted key’s shape locally before [Ověřit] calls out', () => {
    expect(validateKeyShape('groq', 'gsk_abc123def456')).toEqual({ ok: true });
    expect(validateKeyShape('groq', 'nvapi-abc').ok).toBe(false);
    expect(validateKeyShape('nvidia', 'nvapi-abc123def456')).toEqual({ ok: true });
  });

  it('step ① is skippable — AI is optional (#5)', async () => {
    const { STEP_AI } = await import('@/ui/features/onboarding/step-ai');
    expect(STEP_AI.skippable).toBe(true);
    expect(STEP_AI.blocksDashboard).toBe(false);
  });
});
