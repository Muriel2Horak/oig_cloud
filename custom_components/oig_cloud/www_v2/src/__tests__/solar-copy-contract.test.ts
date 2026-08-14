import { describe, expect, it } from 'vitest';
import { fieldHint } from '@/i18n/fields';

describe('solar provider copy contract', () => {
  it('uses the canonical compass hint identically for both strings', () => {
    const expected = 'Sever 0°/360°, východ 90°, jih 180°, západ 270°. Rozsah: 0–360°.';
    expect(fieldHint('solar_forecast_string1_azimuth', 'field.solar_forecast_string1_azimuth.hint')).toBe(expected);
    expect(fieldHint('solar_forecast_string2_azimuth', 'field.solar_forecast_string2_azimuth.hint')).toBe(expected);
  });

  it('explains Solcast Rooftop Site ownership and non-transmitted local kWp', () => {
    expect(fieldHint('solcast_site_id', 'field.solcast_site_id.hint')).toContain('Rooftop Site');
    for (const number of [1, 2]) {
      const hint = fieldHint(
        `solar_forecast_string${number}_kwp`,
        `field.solar_forecast_string${number}_kwp.hint`,
      );
      expect(hint).toContain('Solcast');
      expect(hint).toContain('neposílá');
    }
  });
});
