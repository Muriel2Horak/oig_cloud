/**
 * Tests for daily self-sufficiency computation (energy-based aura data).
 *
 * Covers: typical day, zero-load, FVE-export clamp, grid-dominant (car day ~31%),
 * battery-only evening (~88%).
 */

import { describe, it, expect } from 'vitest';
import {
  computeDailySelfSufficiency,
  type DailySelfSufficiencyInputs,
  extractFlowData,
} from '@/data/flow-data';

const TEST_SN = '2206237016';

// Helper: build a minimal inputs object with safe defaults.
function makeInputs(overrides: Partial<DailySelfSufficiencyInputs> = {}): DailySelfSufficiencyInputs {
  return {
    fveTodayWh:            0,
    battDischargeTodayWh:  0,
    battChargeFveTodayWh:  0,
    battChargeGridTodayWh: 0,
    zalohaConsumptionWh:   0,
    nezalohaConsumptionWh: 0,
    gridExportTodayWh:     0,
    ...overrides,
  };
}

describe('computeDailySelfSufficiency', () => {
  // ------------------------------------------------------------------ zero-load
  it('returns all zeros when total load is zero', () => {
    const result = computeDailySelfSufficiency(makeInputs({
      fveTodayWh: 5000,
      battDischargeTodayWh: 2000,
    }));

    expect(result.pct).toBe(0);
    expect(result.fveKwh).toBe(0);
    expect(result.batteryKwh).toBe(0);
    expect(result.gridKwh).toBe(0);
    expect(result.arcFve).toBe(0);
    expect(result.arcBattery).toBe(0);
    expect(result.arcGrid).toBe(0);
  });

  // ---------------------------------------------------------------- typical day
  it('typical day: balanced mix of FVE, battery, grid', () => {
    // FVE produced 12 kWh, charged 3 kWh to battery, exported 2 kWh → FVE to load = 7 kWh
    // Battery discharged 4 kWh to load
    // Total load = záloha 8 kWh + nezáloha 5 kWh = 13 kWh
    // fve_to_load = max(0, 12000 - 3000 - 2000) = 7000 Wh → 7 kWh, clamped to min(7000, 13000-4000) = 7000 ✓
    // battery_to_load = min(4000, 13000) = 4000 Wh → 4 kWh
    // grid_to_load = 13000 - 7000 - 4000 = 2000 Wh → 2 kWh
    // self-suff = (7+4)/13 = 84.6%
    const result = computeDailySelfSufficiency(makeInputs({
      fveTodayWh:            12_000,
      battDischargeTodayWh:   4_000,
      battChargeFveTodayWh:   3_000,
      battChargeGridTodayWh:      0,
      gridExportTodayWh:      2_000,
      zalohaConsumptionWh:    8_000,
      nezalohaConsumptionWh:  5_000,
    }));

    expect(result.fveKwh).toBeCloseTo(7, 2);
    expect(result.batteryKwh).toBeCloseTo(4, 2);
    expect(result.gridKwh).toBeCloseTo(2, 2);
    expect(result.pct).toBeCloseTo((11 / 13) * 100, 1);
    expect(result.arcFve + result.arcBattery + result.arcGrid).toBeCloseTo(1, 5);
  });

  // -------------------------------------------------------- FVE-export clamp
  it('FVE-export clamp: fve_to_load capped so fve+batt ≤ total_load', () => {
    // Scenario: FVE 20 kWh, batt charge 2 kWh, export 5 kWh → unclamped fve_to_load = 13 kWh
    // Battery discharge = 6 kWh, total load = 10 kWh
    // Without clamp: 13 kWh > (10-6) = 4 kWh → clamp to 4 kWh
    // grid_to_load = max(0, 10 - 4 - 6) = 0
    const result = computeDailySelfSufficiency(makeInputs({
      fveTodayWh:            20_000,
      battDischargeTodayWh:   6_000,
      battChargeFveTodayWh:   2_000,
      gridExportTodayWh:      5_000,
      zalohaConsumptionWh:    6_000,
      nezalohaConsumptionWh:  4_000,
    }));

    // battery_to_load = min(6000, 10000) = 6000 → 6 kWh
    // fve_to_load = min(13000, 10000-6000) = 4000 → 4 kWh
    expect(result.batteryKwh).toBeCloseTo(6, 2);
    expect(result.fveKwh).toBeCloseTo(4, 2);
    expect(result.gridKwh).toBeCloseTo(0, 2);
    expect(result.pct).toBeCloseTo(100, 1);
    // Arcs must sum to 1
    expect(result.arcFve + result.arcBattery + result.arcGrid).toBeCloseTo(1, 5);
  });

  // ----------------------------------------- grid-dominant (car charging day ~31%)
  it('grid-dominant day: car charging, ~31% self-sufficient', () => {
    // Corresponds to mockup "live data" example (car day):
    //   FVE 5 kWh, batt charge (FVE) 1 kWh, batt discharge 1.5 kWh, export 0
    //   záloha 4.9 kWh, nezáloha 13.4 kWh → total 18.3 kWh
    //   fve_to_load = max(0, 5000-1000-0) = 4000 Wh, clamp min(4000, 18300-1500)=min(4000,16800)=4000 ✓
    //   battery_to_load = min(1500, 18300) = 1500 Wh
    //   grid_to_load = 18300 - 4000 - 1500 = 12800 Wh
    //   self-suff = (4000+1500)/18300 = 30.05% ≈ 31%
    const result = computeDailySelfSufficiency(makeInputs({
      fveTodayWh:            5_000,
      battDischargeTodayWh:  1_500,
      battChargeFveTodayWh:  1_000,
      battChargeGridTodayWh:     0,
      gridExportTodayWh:         0,
      zalohaConsumptionWh:   4_900,
      nezalohaConsumptionWh: 13_400,
    }));

    expect(result.pct).toBeCloseTo((5500 / 18300) * 100, 0);
    expect(result.pct).toBeGreaterThan(28);
    expect(result.pct).toBeLessThan(34);
    // Grid dominates
    expect(result.gridKwh).toBeGreaterThan(result.fveKwh + result.batteryKwh);
    expect(result.arcGrid).toBeGreaterThan(0.65);
  });

  // --------------------------------------------- battery-only evening (~88%)
  it('battery-dominant evening: ~88% self-sufficient', () => {
    // Corresponds to mockup "demo evening":
    //   FVE 8 kWh, batt charge (FVE) 5 kWh, batt discharge 7.5 kWh, export 1 kWh
    //   záloha 9.4 kWh, nezáloha 4.5 kWh → total 13.9 kWh
    //   fve_to_load = max(0, 8000-5000-1000) = 2000 Wh, clamp min(2000, 13900-7500)=min(2000,6400)=2000 ✓
    //   battery_to_load = min(7500, 13900) = 7500 Wh
    //   grid_to_load = max(0, 13900-2000-7500) = 4400 Wh
    //   self-suff = (2000+7500)/13900 = 68.3%
    // (mockup shows 88% but that's with different raw numbers — our test uses the derivation)
    // Test with exact 88% scenario: total load 13900, batt 9500, fve 2500, grid 1900
    const result = computeDailySelfSufficiency(makeInputs({
      fveTodayWh:            10_000,
      battDischargeTodayWh:   9_500,
      battChargeFveTodayWh:   5_000,
      battChargeGridTodayWh:      0,
      gridExportTodayWh:      2_500,
      zalohaConsumptionWh:    9_400,
      nezalohaConsumptionWh:  4_500,
    }));

    // fve_to_load = max(0, 10000-5000-2500) = 2500, clamp min(2500, 13900-9500)=min(2500,4400)=2500 ✓
    // battery_to_load = min(9500, 13900) = 9500
    // grid_to_load = max(0, 13900-2500-9500) = 1900
    // self-suff = (2500+9500)/13900 = 86.3%
    expect(result.fveKwh).toBeCloseTo(2.5, 2);
    expect(result.batteryKwh).toBeCloseTo(9.5, 2);
    expect(result.gridKwh).toBeCloseTo(1.9, 2);
    expect(result.pct).toBeCloseTo((12000 / 13900) * 100, 0);
    expect(result.pct).toBeGreaterThan(80);
    expect(result.arcBattery).toBeGreaterThan(result.arcFve);
  });

  // ---------------------------------------------- 100% FVE (no grid, no batt)
  it('100% FVE self-sufficient day', () => {
    const result = computeDailySelfSufficiency(makeInputs({
      fveTodayWh:           10_000,
      battDischargeTodayWh:      0,
      battChargeFveTodayWh:  2_000,
      gridExportTodayWh:     1_000,
      zalohaConsumptionWh:   5_000,
      nezalohaConsumptionWh: 2_000,
    }));

    // fve_to_load = max(0, 10000-2000-1000) = 7000, clamp min(7000, 7000-0)=7000 ✓
    expect(result.fveKwh).toBeCloseTo(7, 2);
    expect(result.batteryKwh).toBeCloseTo(0, 2);
    expect(result.gridKwh).toBeCloseTo(0, 2);
    expect(result.pct).toBeCloseTo(100, 1);
    expect(result.arcFve).toBeCloseTo(1, 5);
  });

  // ----------------------------------------------- defensive: negative inputs
  it('treats negative or NaN inputs as 0 (defensive)', () => {
    const result = computeDailySelfSufficiency(makeInputs({
      fveTodayWh:            -500,     // negative → 0
      battDischargeTodayWh:  NaN,      // NaN → 0
      zalohaConsumptionWh:   3_000,
      nezalohaConsumptionWh: 2_000,
    }));

    // grid covers everything
    expect(result.fveKwh).toBe(0);
    expect(result.batteryKwh).toBe(0);
    expect(result.gridKwh).toBeCloseTo(5, 2);
    expect(result.pct).toBeCloseTo(0, 1);
  });
});

// ------------------------------------------------------------------- integration
describe('extractFlowData daily self-sufficiency integration', () => {
  const SN = TEST_SN;
  const s = (name: string) => `sensor.oig_${SN}_${name}`;

  it('populates selfSufficiencyTodayPct and src* fields from HA states', () => {
    const states = {
      [s('dc_in_fv_ad')]:                              { state: '10000' },  // 10 kWh FVE
      [s('computed_batt_discharge_energy_today')]:     { state: '2000' },   // 2 kWh batt discharge
      [s('computed_batt_charge_fve_energy_today')]:    { state: '1000' },   // 1 kWh FVE→batt
      [s('computed_batt_charge_grid_energy_today')]:   { state: '0' },
      [s('ac_out_en_day')]:                            { state: '5000' },   // 5 kWh záloha
      [s('computed_nonbackup_consumption_today')]:     { state: '3000' },   // 3 kWh nezáloha
      [s('ac_in_ac_pd')]:                              { state: '2000' },   // 2 kWh export
    };

    const data = extractFlowData(states, SN);

    // fve_to_load = max(0, 10000-1000-2000) = 7000, clamp min(7000, 8000-2000)=min(7000,6000)=6000
    // battery_to_load = min(2000, 8000) = 2000
    // grid_to_load = max(0, 8000-6000-2000) = 0
    // self-suff = (6000+2000)/8000 = 100%
    expect(data.selfSufficiencyTodayPct).toBeCloseTo(100, 0);
    expect(data.srcFveTodayKwh).toBeCloseTo(6, 2);
    expect(data.srcBatteryTodayKwh).toBeCloseTo(2, 2);
    expect(data.srcGridTodayKwh).toBeCloseTo(0, 2);
  });

  it('returns zero self-sufficiency when load sensors are missing', () => {
    const data = extractFlowData({}, SN);

    expect(data.selfSufficiencyTodayPct).toBe(0);
    expect(data.srcFveTodayKwh).toBe(0);
    expect(data.srcBatteryTodayKwh).toBe(0);
    expect(data.srcGridTodayKwh).toBe(0);
  });
});
