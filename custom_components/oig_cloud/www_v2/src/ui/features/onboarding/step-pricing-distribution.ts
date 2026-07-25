import { fieldsFromRegistry, isVisible } from '@/data/registry-data';
import type { FieldRegistry } from '@/data/registry-data';
import type { FieldDef } from '@/ui/features/settings';
import type { WizardStep } from '@/ui/features/onboarding/step-solar';

/**
 * UX-SPEC §4a — the selected `confirmed_distribution_tariff` code carries
 * single/dual-tariff nature by itself, verified against the bundled dataset
 * (30/30 tariff x distributor combinations, zero exceptions). Matches
 * `config_registry.py`'s `DUAL_TARIFF_CODES` exactly (Phase A verified,
 * config_registry.py:473-475) — the wizard derives dual-ness client-side,
 * never a user-facing "Mám dva tarify" toggle (UX-SPEC §4).
 */
export const DUAL_TARIFF_CODES = [
  'D25d', 'D26d', 'D27d', 'D35d', 'D45d', 'D56d', 'D57d', 'D61d',
] as const;

export function isDualTariffCode(code: unknown): boolean {
  return typeof code === 'string' && (DUAL_TARIFF_CODES as readonly string[]).includes(code);
}

/**
 * Registry-side these 5 fields are `pricing_supplier` (config_registry.py
 * :536-549, "the step split is wizard-UI layout") — UX-SPEC §4 relocates
 * them to THIS step (step 4): the tariff's own schedule is a
 * distribution-level fact, shown right after tariff selection.
 */
export const TARIFF_SCHEDULE_KEYS = [
  'tariff_vt_start_weekday', 'tariff_nt_start_weekday', 'tariff_weekend_same_as_weekday',
  'tariff_vt_start_weekend', 'tariff_nt_start_weekend',
] as const;

/**
 * A field is visible when its `show_if` holds AND (if present) every
 * `show_if_all` (F1 U4 R3) condition holds. `registry-data.ts`'s `isVisible`
 * only evaluates the single-condition `show_if` — `FieldDef` carries no
 * `showIfAll` of its own, so the AND-extension is read straight off the raw
 * wire payload, same established pattern as `settings/index.ts`'s
 * `isFieldVisible` (not a second mechanism, not a change to `isVisible`'s
 * contract — it stays untouched, matching every other registry-driven step).
 */
export function fieldVisible(
  f: FieldDef,
  reg: FieldRegistry,
  get: (key: string) => unknown,
): boolean {
  if (!isVisible(f, get)) return false;
  const extra = (reg.fields[f.key] as unknown as { show_if_all?: { field: string; in: unknown[] }[] })
    ?.show_if_all;
  if (!extra) return true;
  return extra.every((c) => c.in.some((v) => v === get(c.field)));
}

function distributionFields(reg: FieldRegistry): FieldDef[] {
  return [
    ...fieldsFromRegistry(reg, 'pricing'),
    ...fieldsFromRegistry(reg, 'pricing_supplier').filter((f) =>
      (TARIFF_SCHEDULE_KEYS as readonly string[]).includes(f.key)),
  ];
}

export const STEP_PRICING_DISTRIBUTION: WizardStep & {
  fields(reg: FieldRegistry): FieldDef[];
  visibleFields(reg: FieldRegistry, values: Record<string, unknown>): FieldDef[];
} = {
  id: 'pricing_distribution',
  blocksDashboard: false,
  skippable: true,
  fields: distributionFields,
  visibleFields: (reg, values) =>
    distributionFields(reg).filter((f) => fieldVisible(f, reg, (k) => values[k])),
};
