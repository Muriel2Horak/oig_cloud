import { describe, expect, it } from 'vitest';
import { priceInclVat } from '@/ui/features/onboarding/pricing-vat';

describe('priceInclVat', () => {
  it('adds the VAT percentage on top of the excl-VAT price', () => {
    expect(priceInclVat(4.5, 21)).toBeCloseTo(5.445, 5);
  });

  it('returns the excl-VAT price unchanged at 0% VAT', () => {
    expect(priceInclVat(3.2, 0)).toBe(3.2);
  });
});
