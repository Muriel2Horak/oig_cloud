import { fieldsFromRegistry, isVisible } from '@/data/registry-data';
import type { FieldRegistry } from '@/data/registry-data';
import type { FieldDef } from '@/ui/features/settings';
import type { WizardStep } from '@/ui/features/onboarding/step-solar';
import cezDistributorLogo from '@/assets/distributors/cez-distribuce.svg';
import egdDistributorLogo from '@/assets/distributors/egd-logo.svg';
import preDistributorLogo from '@/assets/distributors/predistribuce.svg';

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
 * Owner live-walk UX rev, item 1: a logo/icon slot left of the distributor
 * name. Bundled official SVGs from the distributors' own sites; the slot
 * stays text-first and falls back to text-only when an asset is absent.
 */
export const DISTRIBUTOR_LOGO_ASSETS: Readonly<Record<string, string>> = {
  cez: cezDistributorLogo,
  egd: egdDistributorLogo,
  pre: preDistributorLogo,
};

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
 * Owner live-walk UX rev (F1 dist-ux, item 3) — the VT/NT distribution price
 * excl. VAT is registry-side `pricing_supplier` (config_registry.py:531-534,
 * already in Kc/kWh, already editable, already what every BE consumer reads
 * — `battery_forecast/data/pricing.py`, `pricing/spot_price_15min.py`,
 * `entities/analytics_sensor.py`) — same "wizard-UI layout, not a registry
 * move" pattern as `TARIFF_SCHEDULE_KEYS` above. Relocated here so the price
 * the user is confirming sits next to the tariff that produced the
 * suggestion, per the owner's walk-through.
 */
export const DISTRIBUTION_PRICE_KEYS = ['distribution_fee_vt_kwh', 'distribution_fee_nt_kwh'] as const;

/** Hidden-by-default VAT-rate override (owner brief: "Upravit DPH" reveal link). */
export const VAT_RATE_KEY = 'vat_rate';

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
  // Seam merge: the supplier-step redesign moved distribution_fee_vt/nt_kwh
  // and vat_rate REGISTRY-side from `pricing_supplier` to `pricing`
  // (config_registry.py), so they now arrive via the `pricing` section fetch
  // below. Only the tariff-schedule keys still live in `pricing_supplier`
  // while rendering here (UX-SPEC §4), so the cross-section pull is reduced to
  // them. `DISTRIBUTION_PRICE_KEYS`/`VAT_RATE_KEY` remain exported for the
  // step-4 price block + "Upravit DPH" reveal, which look them up by name.
  const relocatedKeys: readonly string[] = [...TARIFF_SCHEDULE_KEYS];
  return [
    ...fieldsFromRegistry(reg, 'pricing'),
    ...fieldsFromRegistry(reg, 'pricing_supplier').filter((f) => relocatedKeys.includes(f.key)),
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
