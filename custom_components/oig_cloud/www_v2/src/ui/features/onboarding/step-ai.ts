/**
 * OIG Cloud V2 — Onboarding wizard · step ① AI (provider guides).
 *
 * Co-equal provider list (SCOPE-REVISION #8): ai_task, Groq, NVIDIA.
 * Strings here are VERBATIM from SCOPE-REVISION #7 (ověřeno 2026-07-17)
 * — see `docs/decisions/plan-3/`. Do NOT add "doporučeno" / "recommended"
 * to any provider: the three are CO-EQUAL (#8).
 *
 * Rendered step = provider chooser (three co-equal cards) → numbered
 * steps + links → paste field (`type="password"`, per Task 5's secret
 * convention) → **[Ověřit]** → POST `/ai` (Task 10). A failed/rate-
 * limited verify stores the key `unverified` and **still lets the user
 * continue** (#5/#6 — AI is optional, soft #6).
 */

import type { OnboardingKey } from '@/i18n/onboarding';

export interface ProviderGuide {
  label: string;
  registerUrl?: string;
  keysUrl?: string;
  steps: string[];
  keyPrefix?: string;
  freeTier?: string;
  /** Deliberately absent for every provider — the three are CO-EQUAL (SCOPE-REVISION #8).
   *  Declared only so callers can assert it is never set; never populate it. */
  recommended?: undefined;
  /**
   * i18n key (`i18n/onboarding.ts`) for the per-provider data-use/ToS disclosure —
   * audit gap O2/P10 (`docs/redesign_2026_07/DECISIONS.md`). Rendered before the
   * key input, not hidden behind a tooltip; every provider MUST carry one.
   */
  disclosureKey: OnboardingKey;
}

/** Verbatim from SCOPE-REVISION #7 (ověřeno 2026-07-17). Co-equal — no ranking (#8). */
export const PROVIDER_GUIDES: Record<string, ProviderGuide> = {
  ai_task: {
    label: 'Moje vlastní AI v Home Assistantu (ai_task)',
    steps: ['Použije se AI, kterou už máš v HA nastavenou.'],
    disclosureKey: 'onboarding.ai.disclosure.ai_task',
  },
  groq: {
    label: 'Groq',
    registerUrl: 'https://console.groq.com',
    keysUrl: 'https://console.groq.com/keys',
    keyPrefix: 'gsk_',
    freeTier: '30k TPM / 30 RPM / 14400 RPD',
    steps: [
      'Otevři console.groq.com a zaregistruj se (email/Google/GitHub, bez karty).',
      'Přejdi na console.groq.com/keys.',
      'Klikni na [Create API Key].',
      'Zkopíruj klíč (zobrazí se jen jednou) a vlož ho níže.',
    ],
    disclosureKey: 'onboarding.ai.disclosure.groq',
  },
  nvidia: {
    label: 'NVIDIA',
    registerUrl: 'https://build.nvidia.com',
    keysUrl: 'https://build.nvidia.com/settings/api-keys',
    keyPrefix: 'nvapi-',
    freeTier: '1000 kreditů (až 5000 na požádání), 40 RPM',
    steps: [
      'Otevři build.nvidia.com a zaregistruj se (bez karty).',
      'Přejdi na build.nvidia.com/settings/api-keys.',
      'Klikni na [Generate API Key].',
      'Zkopíruj klíč a vlož ho níže.',
    ],
    disclosureKey: 'onboarding.ai.disclosure.nvidia',
  },
};

export const STEP_AI = { id: 'ai', skippable: true, blocksDashboard: false } as const;

/**
 * Return the expected key prefix for a provider. `undefined` for ai_task
 * (HA-managed — there is no key to validate here, the user picks the AI in
 * HA itself).
 */
export function keyPrefixFor(provider: string): string | undefined {
  const guide = PROVIDER_GUIDES[provider];
  return guide?.keyPrefix;
}

/**
 * Local shape check for a pasted key. We do NOT call out yet — that happens
 * on [Ověřit] (Task 10 POST /ai). A provider without a prefix (ai_task)
 * cannot be shape-validated here, so we return `{ ok: false }` rather than
 * a misleading success.
 */
export function validateKeyShape(
  provider: string,
  key: string,
): { ok: boolean; reason?: string } {
  const prefix = keyPrefixFor(provider);
  if (!prefix) {
    return { ok: false, reason: 'no_key_required' };
  }
  if (typeof key !== 'string' || key.length < prefix.length + 8) {
    return { ok: false, reason: 'too_short' };
  }
  if (!key.startsWith(prefix)) {
    return { ok: false, reason: 'wrong_prefix' };
  }
  return { ok: true };
}
