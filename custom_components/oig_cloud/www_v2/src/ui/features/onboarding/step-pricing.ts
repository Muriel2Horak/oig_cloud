import type { WizardStep } from '@/ui/features/onboarding/step-solar';

export interface PricingStep extends WizardStep {
  /** #5: AI is optional — pricing must never require a verified provider. */
  requiresAi: false;
  /** The AI cross-check is a helper button, not a precondition. */
  aiVerify: { optional: true; enabledWhenAiVerified: boolean };
}

export const STEP_PRICING: PricingStep = {
  id: 'pricing',
  blocksDashboard: false,
  skippable: true,
  requiresAi: false,
  aiVerify: { optional: true, enabledWhenAiVerified: false },
};
