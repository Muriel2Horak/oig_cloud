import { fieldsFromRegistry } from '@/data/registry-data';
import type { FieldRegistry } from '@/data/registry-data';
import type { FieldDef } from '@/ui/features/settings';
import type { WizardStep } from '@/ui/features/onboarding/step-solar';
import {
  DUAL_TARIFF_CODES,
  TARIFF_SCHEDULE_KEYS,
  DISTRIBUTION_PRICE_KEYS,
  VAT_RATE_KEY,
  fieldVisible,
} from '@/ui/features/onboarding/step-pricing-distribution';

/** Rendered in step 4 instead (owner live-walk UX rev, item 3/4) — same
 * "wizard-UI layout, not a registry move" pattern as the tariff-schedule
 * relocation above. */
const RELOCATED_TO_DISTRIBUTION_KEYS: readonly string[] = [
  ...TARIFF_SCHEDULE_KEYS, ...DISTRIBUTION_PRICE_KEYS, VAT_RATE_KEY,
];

function supplierFields(reg: FieldRegistry): FieldDef[] {
  return fieldsFromRegistry(reg, 'pricing_supplier').filter((f) =>
    !RELOCATED_TO_DISTRIBUTION_KEYS.includes(f.key));
}

/**
 * UX-SPEC §4 group membership (A/B/C), verified against the landed registry
 * (config_registry.py:483-552 section comments) — reused by index.ts to
 * render the three group cards (§6 "cards over a flat list"), not
 * re-derived from field order.
 */
export const PRICING_SUPPLIER_GROUP_A_KEYS = [
  'spot_pricing_model',
  'spot_positive_fee_percent', 'spot_positive_fee_percent_nt',
  'spot_negative_fee_percent', 'spot_negative_fee_percent_nt',
  'spot_fixed_fee_mwh', 'spot_fixed_fee_mwh_nt',
  'fixed_commercial_price_vt', 'fixed_commercial_price_nt',
] as const;

export const PRICING_SUPPLIER_GROUP_B_KEYS = [
  'export_pricing_model',
  'export_fee_percent', 'export_fee_percent_nt',
  'export_fixed_fee_czk', 'export_fixed_fee_czk_nt',
  'export_fixed_price',
] as const;

/**
 * `isDualTariff` is the Task 17 cross-step flag — the supplier step's own
 * draft never carries `confirmed_distribution_tariff` (that field belongs to
 * the distribution step). Every registry `show_if`/`show_if_all` condition
 * naming `confirmed_distribution_tariff` only ever checks membership in
 * `DUAL_TARIFF_CODES` (Phase A verified, config_registry.py:487-549) — so a
 * dual-code sentinel answers every such condition correctly without
 * threading the raw tariff code across steps, and without a second,
 * disconnected `_dual` field name the registry never actually emits.
 */
function supplierVisibleFields(
  reg: FieldRegistry,
  values: Record<string, unknown>,
  isDualTariff: boolean,
): FieldDef[] {
  const get = (key: string): unknown =>
    key === 'confirmed_distribution_tariff'
      ? (isDualTariff ? DUAL_TARIFF_CODES[0] : undefined)
      : values[key];
  return supplierFields(reg).filter((f) => fieldVisible(f, reg, get));
}

export const STEP_PRICING_SUPPLIER: WizardStep & {
  fields(reg: FieldRegistry): FieldDef[];
  visibleFields(reg: FieldRegistry, values: Record<string, unknown>, isDualTariff: boolean): FieldDef[];
} = {
  id: 'pricing_supplier',
  blocksDashboard: false,
  skippable: true,
  fields: supplierFields,
  visibleFields: supplierVisibleFields,
};
