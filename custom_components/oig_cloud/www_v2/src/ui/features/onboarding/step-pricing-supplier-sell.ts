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
 * "Ceny — prodej" (Prodej) step — the other half of the supplier-step
 * redesign split (see `step-pricing-supplier.ts`'s Nakup step for the full
 * rationale). Only group B ("Prodejní cena / export") keys render here.
 */
function supplierSellFields(reg: FieldRegistry): FieldDef[] {
  return fieldsFromRegistry(reg, 'pricing_supplier').filter((f) =>
    (PRICING_SUPPLIER_GROUP_B_KEYS as readonly string[]).includes(f.key));
}

export const PRICING_SUPPLIER_GROUP_B_KEYS = [
  'export_pricing_model',
  'export_fee_percent', 'export_fee_percent_nt',
  'export_fixed_fee_czk', 'export_fixed_fee_czk_nt',
  'export_fixed_price',
] as const;

/** UX-SPEC §4 table B copy, human names — no raw enum value ever renders. */
export const SCENARIO_CARDS_SELL: readonly ScenarioCard[] = [
  {
    value: 'percentage',
    title: 'SPOT − procento',
    hint: 'Výhodné při vysokých cenách — dostanete spotovou cenu sníženou o srážku.',
  },
  {
    value: 'fixed',
    title: 'SPOT − pevná srážka',
    hint: 'Stabilnější výkup — od spotové ceny se odečte fixní částka.',
  },
  {
    value: 'fixed_prices',
    title: 'Pevná výkupní cena',
    hint: 'Stabilní výkupní cena po celý rok, bez ohledu na burzu.',
  },
];

/** Mirrors `step-pricing-supplier.ts`'s `supplierVisibleFields` — same
 * cross-step dual-flag derivation, not a second mechanism. */
function supplierSellVisibleFields(
  reg: FieldRegistry,
  values: Record<string, unknown>,
  isDualTariff: boolean,
): FieldDef[] {
  const get = (key: string): unknown =>
    key === 'confirmed_distribution_tariff'
      ? (isDualTariff ? DUAL_TARIFF_CODES[0] : undefined)
      : values[key];
  return supplierSellFields(reg).filter((f) => fieldVisible(f, reg, get));
}

export const STEP_PRICING_SUPPLIER_SELL: WizardStep & {
  fields(reg: FieldRegistry): FieldDef[];
  visibleFields(reg: FieldRegistry, values: Record<string, unknown>, isDualTariff: boolean): FieldDef[];
} = {
  id: 'pricing_supplier_sell',
  blocksDashboard: false,
  skippable: true,
  fields: supplierSellFields,
  visibleFields: supplierSellVisibleFields,
};
