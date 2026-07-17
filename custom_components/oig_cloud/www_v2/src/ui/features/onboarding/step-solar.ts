import { fieldsFromRegistry, isVisible } from '@/data/registry-data';
import type { FieldRegistry } from '@/data/registry-data';
import type { FieldDef } from '@/ui/features/settings';

/** The shape every wizard step shares. STEP_AI (step-ai.ts) is the same contract. */
export interface WizardStep {
  id: string;
  /** #6: NO step may gate the dashboard. Pinned to false, asserted in tests. */
  blocksDashboard: false;
  /** #5/#6: every step may be skipped. */
  skippable: boolean;
}

export interface RegistryStep extends WizardStep {
  section: string;
  fields(reg: FieldRegistry): FieldDef[];
  visibleFields(reg: FieldRegistry, values: Record<string, unknown>): FieldDef[];
}

export const STEP_SOLAR: RegistryStep = {
  id: 'solar',
  section: 'solar',
  blocksDashboard: false,   // [Otestovat] gates the STEP, never the dashboard (#6)
  skippable: true,
  // P5: the SAME derivation the settings tab uses (Tasks 3-4). Not a copy.
  fields: (reg) => fieldsFromRegistry(reg, 'solar'),
  // U1: the SAME predicate as the settings card. Not a second implementation.
  visibleFields: (reg, values) =>
    fieldsFromRegistry(reg, 'solar').filter((f) => isVisible(f, (k) => values[k])),
};
