/**
 * OIG Cloud V2 — Onboarding wizard · data layer (Plan 3 Task 12).
 *
 * Shared types + a thin client used by the wizard steps. Talks to two
 * backend endpoints introduced by Plan 3:
 *
 *   GET  /api/oig_cloud/<sn>/onboarding   — versioned soft-guide state
 *   POST /api/oig_cloud/<sn>/onboarding   — complete a step
 *   GET  /api/oig_cloud/<sn>/ai           — current AI state
 *   POST /api/oig_cloud/<sn>/ai           — verify a provider key
 *
 * Wizard steps themselves live under `ui/features/onboarding/`:
 *   - step-ai.ts        (data + helpers — provider guides, key shape)
 *   - step-solar.ts     (Task 13)
 *   - step-pricing.ts   (Task 13)
 *
 * The component shell (`index.ts`) imports from here so the steps can stay
 * purely presentational and tested in isolation.
 */

import { haClient } from '@/data/ha-client';

// ============================================================================
// SHARED TYPES
// ============================================================================

/**
 * The four independent onboarding steps. AI is OPTIONAL (#5) and the four
 * are unordered (SCOPE-REVISION #6 / K2f — no lock/gate concept). The
 * Python-side `ONBOARDING_STEPS` (custom_components/oig_cloud/onboarding/state.py)
 * mirrors this list; keep in sync.
 */
export type OnboardingStepId = 'ai' | 'solar' | 'pricing';

export type OnboardingStepStatus = 'pending' | 'done' | 'skipped';

/**
 * Soft-guide state — mirrors `OnboardingState.async_get()` on the backend.
 * There is NO `locked`/`gate`/`dashboard_locked`/`complete_required` key
 * (SCOPE-REVISION #6 — onboarding is a SOFT guide, banner-not-wall).
 */
export interface OnboardingState {
  schema_version: number;
  steps: Record<OnboardingStepId, OnboardingStepStatus>;
  timestamps: Partial<Record<OnboardingStepId, string>>;
  provider: string | null;
}

/**
 * Result of the POST /ai verify call. The backend never echoes the key
 * itself (codex CRITICAL #2, P2). A failed/rate-limited verify stores the
 * key `unverified` and STILL lets the user continue (#5/#6).
 */
export interface AiVerifyResult {
  ok: boolean;
  provider: string;
  verified: boolean;
  reason?: string;
  latency_ms?: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Mirror of `ONBOARDING_STEPS` in Python — used for completion validation. */
export const ONBOARDING_STEPS: ReadonlyArray<OnboardingStepId> = ['ai', 'solar', 'pricing'];

/** Empty state used when the backend returns nothing (404 / cold start). */
export const EMPTY_ONBOARDING_STATE: OnboardingState = {
  schema_version: 1,
  steps: { ai: 'pending', solar: 'pending', pricing: 'pending' },
  timestamps: {},
  provider: null,
};

// ============================================================================
// LOADER
// ============================================================================

/**
 * Fetch the current onboarding state. Returns `null` on any network error
 * (the wizard treats null as "no prior state" and starts fresh — soft guide,
 * never a wall).
 */
export async function loadOnboardingState(inverterSn: string): Promise<OnboardingState | null> {
  if (!inverterSn) return null;
  return haClient.fetchOIGAPI<OnboardingState>(`/${inverterSn}/onboarding`);
}

/**
 * Mark a step done. Throws on unknown step id — the type system catches the
 * common case, the runtime guard is belt-and-braces.
 */
export async function completeOnboardingStep(
  inverterSn: string,
  step: OnboardingStepId,
): Promise<OnboardingState | null> {
  if (!ONBOARDING_STEPS.includes(step)) {
    throw new Error(`unknown onboarding step: ${step}`);
  }
  return haClient.fetchOIGAPI<OnboardingState>(`/${inverterSn}/onboarding`, {
    method: 'POST',
    body: JSON.stringify({ action: 'complete_step', step }),
  });
}

/**
 * Ask the backend to verify a pasted provider key (POST /ai). Returns
 * `null` on network error so the caller can degrade to "store unverified,
 * let the user continue" (SCOPE-REVISION #5/#6).
 */
export async function verifyAiKey(
  inverterSn: string,
  provider: string,
  apiKey: string,
): Promise<AiVerifyResult | null> {
  if (!inverterSn) return null;
  return haClient.fetchOIGAPI<AiVerifyResult>(`/${inverterSn}/ai`, {
    method: 'POST',
    body: JSON.stringify({ action: 'verify', provider, api_key: apiKey }),
  });
}

// ============================================================================
// PURE HELPERS — exported for unit tests
// ============================================================================

/** True when every step in the wizard has reached a terminal status. */
export function isOnboardingDone(state: OnboardingState | null): boolean {
  if (!state) return false;
  return ONBOARDING_STEPS.every((s) => state.steps[s] === 'done' || state.steps[s] === 'skipped');
}

/** True when the AI step is either done or explicitly skipped. */
export function isAiStepResolved(state: OnboardingState | null): boolean {
  if (!state) return false;
  const s = state.steps.ai;
  return s === 'done' || s === 'skipped';
}
