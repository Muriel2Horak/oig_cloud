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
 *   - step-ai.ts                    (data + helpers — provider guides, key shape)
 *   - step-solar.ts
 *   - step-pricing-distribution.ts, step-pricing-supplier.ts
 *   - step-battery.ts, step-boiler.ts, step-connection.ts
 *
 * The component shell (`index.ts`) imports from here so the steps can stay
 * purely presentational and tested in isolation.
 */

import { haClient } from '@/data/ha-client';
import { oigLog } from '@/core/logger';

// ============================================================================
// SHARED TYPES
// ============================================================================

/**
 * The 10 wizard-v2 step ids: the 8 status-tracked content steps (mirrors
 * Python-side `ONBOARDING_STEPS`, custom_components/oig_cloud/onboarding/state.py
 * — keep in sync) plus `welcome`/`summary`, which the FE routes to as
 * always-rendered navigation endpoints but which carry no independent
 * pending/done/skipped status (design decision 1).
 */
export type OnboardingStepId =
  | 'welcome'
  | 'modules'
  | 'ai'
  | 'solar'
  | 'pricing_distribution'
  | 'pricing_supplier'
  | 'pricing_supplier_sell'
  | 'battery'
  | 'boiler'
  | 'connection'
  | 'summary';

export type OnboardingStepStatus = 'pending' | 'done' | 'skipped';

/**
 * Soft-guide state — mirrors `OnboardingState.async_get()` on the backend.
 * There is NO `locked`/`gate`/`dashboard_locked`/`complete_required` key
 * (SCOPE-REVISION #6 — onboarding is a SOFT guide, banner-not-wall).
 */
export interface OnboardingState {
  schema_version: number;
  /**
   * `welcome`/`summary` never appear here — they are always-rendered
   * navigation endpoints, not independently pending/done/skipped (design
   * decision 1). Only the 8 content steps (`ONBOARDING_STEPS`) are keys.
   */
  steps: Partial<Record<OnboardingStepId, OnboardingStepStatus>>;
  timestamps: Partial<Record<OnboardingStepId, string>>;
  provider: string | null;
  /**
   * True when the entry was already configured (solar provider + keys) before
   * onboarding existed. Such a user gets the migration/review banner — a
   * dismissible invitation to review their config in the wizard — but never
   * a forced wizard or gate (D11 / SCOPE-REVISION #6). Derived server-side
   * from the config-entry options.
   */
  grandfathered: boolean;
  /**
   * True once the user has closed the banner. Persisted so a grandfathered
   * user who never wants the wizard doesn't see it again after reload (D11).
   */
  banner_dismissed: boolean;
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
export const ONBOARDING_STEPS: ReadonlyArray<OnboardingStepId> = [
  'modules', 'ai', 'solar', 'pricing_distribution', 'pricing_supplier',
  'pricing_supplier_sell', 'battery', 'boiler', 'connection',
];

/** Empty state used when the backend returns nothing (404 / cold start). */
export const EMPTY_ONBOARDING_STATE: OnboardingState = {
  schema_version: 1,
  steps: {
    modules: 'pending',
    ai: 'pending',
    solar: 'pending',
    pricing_distribution: 'pending',
    pricing_supplier: 'pending',
    pricing_supplier_sell: 'pending',
    battery: 'pending',
    boiler: 'pending',
    connection: 'pending',
  },
  timestamps: {},
  provider: null,
  grandfathered: false,
  banner_dismissed: false,
};

// ============================================================================
// LOADER
// ============================================================================

/**
 * Tolerant parse (LIVE BUG fix): a legacy `"pricing"` key (pre-split 3-step
 * era) — or any other id the backend hasn't migrated yet — must never be
 * fatal. Filters `steps`/`timestamps` down to the known `ONBOARDING_STEPS`,
 * logging any drop at debug level; every other field passes through as-is.
 */
export function normalizeOnboardingState(state: OnboardingState): OnboardingState {
  const rawSteps = state.steps ?? {};
  const rawTimestamps = state.timestamps ?? {};
  const unknown = Object.keys(rawSteps).filter(
    (key) => !ONBOARDING_STEPS.includes(key as OnboardingStepId),
  );
  if (unknown.length > 0) {
    oigLog.debug('Ignoring unknown onboarding step id(s)', { unknown });
  }
  const steps: Partial<Record<OnboardingStepId, OnboardingStepStatus>> = {};
  const timestamps: Partial<Record<OnboardingStepId, string>> = {};
  for (const step of ONBOARDING_STEPS) {
    if (rawSteps[step] !== undefined) steps[step] = rawSteps[step];
    if (rawTimestamps[step] !== undefined) timestamps[step] = rawTimestamps[step];
  }
  return { ...state, steps, timestamps };
}

/**
 * Fetch the current onboarding state. Returns `null` on any network error
 * (the wizard treats null as "no prior state" and starts fresh — soft guide,
 * never a wall).
 */
export async function loadOnboardingState(
  inverterSn: string,
  signal?: AbortSignal,
): Promise<OnboardingState | null> {
  if (!inverterSn) return null;
  const state = await haClient.fetchOIGAPI<OnboardingState>(`/${inverterSn}/onboarding`, { signal });
  return state ? normalizeOnboardingState(state) : null;
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
  const state = await haClient.fetchOIGAPI<OnboardingState>(`/${inverterSn}/onboarding`, {
    method: 'POST',
    body: JSON.stringify({ action: 'complete_step', step }),
  });
  return state ? normalizeOnboardingState(state) : null;
}

/**
 * Mark a step skipped (#5: every step is skippable — a skip is a user choice,
 * not a lock). Posts `{action: 'skip', step}`; the backend routes it to
 * `async_skip_step` and persists status `'skipped'`. Throws on unknown step id.
 */
export async function skipOnboardingStep(
  inverterSn: string,
  step: OnboardingStepId,
): Promise<OnboardingState | null> {
  if (!ONBOARDING_STEPS.includes(step)) {
    throw new Error(`unknown onboarding step: ${step}`);
  }
  const state = await haClient.fetchOIGAPI<OnboardingState>(`/${inverterSn}/onboarding`, {
    method: 'POST',
    body: JSON.stringify({ action: 'skip', step }),
  });
  return state ? normalizeOnboardingState(state) : null;
}

/**
 * Persist that the user closed the migration/review banner (D11) — mainly for
 * grandfathered users, who may never want the wizard. Not a gate: the wizard
 * stays launchable from Settings regardless (#6).
 */
export async function dismissOnboardingBanner(
  inverterSn: string,
): Promise<OnboardingState | null> {
  if (!inverterSn) return null;
  const state = await haClient.fetchOIGAPI<OnboardingState>(`/${inverterSn}/onboarding`, {
    method: 'POST',
    body: JSON.stringify({ action: 'dismiss_banner' }),
  });
  return state ? normalizeOnboardingState(state) : null;
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
