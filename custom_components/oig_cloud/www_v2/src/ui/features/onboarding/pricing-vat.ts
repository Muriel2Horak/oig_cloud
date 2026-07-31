/**
 * OIG Cloud V2 — VAT-inclusive price display (supplier-step redesign).
 *
 * The fixed-price purchase scenario asks for a price excl. VAT
 * (UX-SPEC-wizard-v2.md §4, `fixed_commercial_price_vt`/`_nt` hint:
 * "Zadávejte bez DPH a distribuce") and shows a read-only computed
 * "s DPH" line beneath it — the same pattern the distribution step uses
 * for `confirmed_distribution_price_incl_vat` (`index.ts`'s
 * `pricing_distribution` render branch), but that one reads incl-VAT
 * straight off the `/pricelists` dataset; there is no reusable
 * excl-to-incl conversion anywhere in the codebase to import, so this is
 * the shared helper both the buy and sell steps compute against, not a
 * duplicated formula.
 */

export function priceInclVat(exclVat: number, vatRatePercent: number): number {
  return exclVat * (1 + vatRatePercent / 100);
}
