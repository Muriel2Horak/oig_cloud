// src/__tests__/onboarding-step-ai.test.ts
import { afterEach, describe, it, expect } from 'vitest';
import { fixture, fixtureCleanup } from '@open-wc/testing-helpers';
import { html } from 'lit';
import { PROVIDER_GUIDES, keyPrefixFor, validateKeyShape } from '@/ui/features/onboarding/step-ai';
import { t } from '@/i18n/onboarding';
import '@/ui/features/onboarding';

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

  it('carries a disclosure key for every provider (audit gap O2/P10)', () => {
    for (const [provider, g] of Object.entries(PROVIDER_GUIDES)) {
      expect(g.disclosureKey, `${provider} disclosureKey`).toBeTruthy();
      expect(t(g.disclosureKey, 'cs')).not.toBe(g.disclosureKey);
      expect(t(g.disclosureKey, 'en')).not.toBe(g.disclosureKey);
    }
  });
});

describe('step ① — per-provider data-use disclosure (audit gap O2/P10)', () => {
  afterEach(() => {
    fixtureCleanup();
  });

  it('renders a visible disclosure block for every provider card, before the key input', async () => {
    const el = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
      html`<oig-onboarding-step-ai></oig-onboarding-step-ai>`,
    );
    await el.updateComplete;

    for (const provider of Object.keys(PROVIDER_GUIDES)) {
      const card = el.shadowRoot!.querySelector(`[data-provider="${provider}"]`) as HTMLElement;
      expect(card, `${provider} card`).toBeTruthy();
      const disclosure = card.querySelector(`[data-testid="disclosure-${provider}"]`);
      expect(disclosure, `${provider} disclosure`).toBeTruthy();
      expect(disclosure!.textContent).toContain(t(PROVIDER_GUIDES[provider].disclosureKey, 'cs'));

      const disclosureIdx = Array.from(card.children).indexOf(disclosure as Element);
      const input = card.querySelector('input[type="password"]');
      if (input) {
        const inputWrapperIdx = Array.from(card.children).indexOf(input.parentElement as Element);
        expect(disclosureIdx).toBeLessThan(inputWrapperIdx < 0 ? Number.MAX_SAFE_INTEGER : inputWrapperIdx);
      }
    }
  });

  it('renders the en disclosure copy when hass resolves language to en', async () => {
    const hass = { language: 'en' };
    const el = await fixture<HTMLElement & { updateComplete: Promise<boolean> }>(
      html`<oig-onboarding-step-ai .hass=${hass}></oig-onboarding-step-ai>`,
    );
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('[data-testid="disclosure-groq"]')!.textContent).toContain(
      t('onboarding.ai.disclosure.groq', 'en'),
    );
    expect(el.shadowRoot!.querySelector('[data-testid="disclosure-nvidia"]')!.textContent).toContain(
      t('onboarding.ai.disclosure.nvidia', 'en'),
    );
    expect(el.shadowRoot!.querySelector('[data-testid="disclosure-ai_task"]')!.textContent).toContain(
      t('onboarding.ai.disclosure.ai_task', 'en'),
    );
  });

  it('en strings — exact text (no invented legal claims beyond DECISIONS.md O2/P10)', () => {
    expect(t('onboarding.ai.disclosure.ai_task', 'en')).toBe(
      'Processing stays with whichever AI backend you already configured in Home Assistant — we don’t introduce any new third party.',
    );
    expect(t('onboarding.ai.disclosure.groq', 'en')).toBe(
      'Per its terms of service, Groq contractually does not train on your inputs. Our integration sends only anonymous numeric values — no personal data.',
    );
    expect(t('onboarding.ai.disclosure.nvidia', 'en')).toBe(
      'NVIDIA’s free tier is, per its ToS, "trial/evaluation, not production" — permanent use is a gray area. Under §3.3, NVIDIA may use deidentified inputs to improve its models; personal data in prompts is prohibited. Our integration sends only anonymous numeric values.',
    );
  });
});
