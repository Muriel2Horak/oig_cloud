import { fieldsFromRegistry } from '@/data/registry-data';
import type { FieldRegistry } from '@/data/registry-data';
import type { FieldDef } from '@/ui/features/settings';
import type { WizardStep } from '@/ui/features/onboarding/step-solar';
import {
  DUAL_TARIFF_CODES,
  fieldVisible,
} from '@/ui/features/onboarding/step-pricing-distribution';
import type { ScenarioCard } from '@/ui/features/onboarding/scenario-radio-cards';

/**
 * "Ceny — nákup" (Nakup) step — supplier-step redesign (owner walkthrough:
 * the combined supplier step was "too dense"; this brief SUPERSEDES
 * UX-SPEC-wizard-v2.md §step-5's single-step layout where they conflict).
 * Only group A ("Nákupní cena / import") keys render here now — group B
 * (export) moved to `step-pricing-supplier-sell.ts`, group C
 * (distribution fee + VAT keys) moved to the registry `pricing` section
 * and no longer renders in either supplier step (config_registry.py).
 */
function supplierFields(reg: FieldRegistry): FieldDef[] {
  return fieldsFromRegistry(reg, 'pricing_supplier').filter((f) =>
    (PRICING_SUPPLIER_GROUP_A_KEYS as readonly string[]).includes(f.key));
}

export const PRICING_SUPPLIER_GROUP_A_KEYS = [
  'spot_pricing_model',
  'spot_positive_fee_percent', 'spot_positive_fee_percent_nt',
  'spot_negative_fee_percent', 'spot_negative_fee_percent_nt',
  'spot_fixed_fee_mwh', 'spot_fixed_fee_mwh_nt',
  'fixed_commercial_price_vt', 'fixed_commercial_price_nt',
] as const;

/** UX-SPEC §4 table A copy, human names — no raw enum value ever renders. */
export const SCENARIO_CARDS_BUY: readonly ScenarioCard[] = [
  {
    value: 'percentage',
    title: 'SPOT + procento',
    hint: 'Variabilní cena podle burzy — cena roste a klesá se spotovým trhem.',
  },
  {
    value: 'fixed',
    title: 'SPOT + pevná přirážka',
    hint: 'Stabilnější než procento — k burzovní ceně se přičte fixní poplatek.',
  },
  {
    value: 'fixed_prices',
    title: 'Pevná cena',
    hint: 'Předvídatelná cena bez ohledu na burzu, dle vaší smlouvy.',
  },
];

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
