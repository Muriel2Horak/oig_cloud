import { describe, it, expect } from 'vitest';
import { parseBalancingState, buildGridChargingPlan, extractFlowData, getGridExportDisplay } from '@/data/flow-data';

describe('Flow data extraction helpers', () => {
  it('maps balancing states to V1-compatible indicators', () => {
    expect(parseBalancingState('charging')).toBe('charging');
    expect(parseBalancingState('balancing')).toBe('holding');
    expect(parseBalancingState('holding')).toBe('holding');
    expect(parseBalancingState('completed')).toBe('completed');
    expect(parseBalancingState('planned')).toBe('planned');
    expect(parseBalancingState('standby')).toBe('standby');
    expect(parseBalancingState('unknown')).toBe('standby');
    expect(parseBalancingState('')).toBe('standby');
  });

  it('builds grid charging plan summary from attribute totals', () => {
    const plan = buildGridChargingPlan({
      state: 'on',
      attributes: {
        total_energy_kwh: 4.2,
        total_cost_czk: 12.34,
        charging_blocks: [
          { day: 'today', time_from: '01:00', time_to: '02:00', status: 'running', grid_import_kwh: 2.2 },
          { day: 'today', time_from: '03:00', time_to: '04:00', status: 'planned', grid_import_kwh: 2.0 },
        ],
      },
    });

    expect(plan.hasBlocks).toBe(true);
    expect(plan.totalEnergyKwh).toBe(4.2);
    expect(plan.totalCostCzk).toBe(12.34);
    expect(plan.windowLabel).toBe('dnes 01:00 – 04:00');
    expect(plan.durationMinutes).toBe(120);
    expect(plan.currentBlockLabel).toBe('dnes 01:00 - 02:00');
    expect(plan.nextBlockLabel).toBe('dnes 03:00 - 04:00');
  });

  it('computes totals and window when attributes are missing', () => {
    const plan = buildGridChargingPlan({
      state: 'off',
      attributes: {
        charging_blocks: [
          { day: 'today', time_from: '23:00', time_to: '23:30', total_cost_czk: 4.5, battery_start_kwh: 5, battery_end_kwh: 7 },
          { day: 'tomorrow', time_from: '00:30', time_to: '01:00', total_cost_czk: 2.25, grid_import_kwh: 1.5 },
        ],
      },
    });

    expect(plan.totalEnergyKwh).toBe(3.5);
    expect(plan.totalCostCzk).toBe(6.75);
    expect(plan.windowLabel).toBe('dnes 23:00 → zítra 01:00');
    expect(plan.durationMinutes).toBe(60);
    expect(plan.currentBlockLabel).toBe(null);
    expect(plan.nextBlockLabel).toBe('dnes 23:00 - 23:30');
  });

  it('extracts flow data from a direct states map', () => {
    const data = extractFlowData({
      sensor: 'ignored',
      'sensor.oig_2206237016_actual_aco_p': { state: '790' },
      'sensor.oig_2206237016_actual_aci_wtotal': { state: '29' },
      'sensor.oig_2206237016_batt_bat_c': { state: '64' },
    });

    expect(data.housePower).toBe(790);
    expect(data.gridPower).toBe(29);
    expect(data.batterySoC).toBe(64);
  });
});

describe('Grid delivery derivation from canonical model', () => {
  const BASE_SENSOR = 'sensor.oig_2206237016_';

  it('derives grid delivery OFF from raw sensor value', () => {
    const data = extractFlowData({
      [BASE_SENSOR + 'invertor_prms_to_grid']: { state: 'Vypnuto' },
      [BASE_SENSOR + 'invertor_prm1_p_max_feed_grid']: { state: '0' },
    });

    expect(data.inverterGridMode).toBe('off');
    expect(data.inverterGridLimit).toBe(0);
  });

  it('derives grid delivery ON from raw sensor value', () => {
    const data = extractFlowData({
      [BASE_SENSOR + 'invertor_prms_to_grid']: { state: 'Zapnuto' },
      [BASE_SENSOR + 'invertor_prm1_p_max_feed_grid']: { state: '10000' },
    });

    expect(data.inverterGridMode).toBe('on');
    expect(data.inverterGridLimit).toBe(10000);
  });

  it('derives grid delivery LIMITED from raw sensor value', () => {
    const data = extractFlowData({
      [BASE_SENSOR + 'invertor_prms_to_grid']: { state: 'Omezeno' },
      [BASE_SENSOR + 'invertor_prm1_p_max_feed_grid']: { state: '5400' },
    });

    expect(data.inverterGridMode).toBe('limited');
    expect(data.inverterGridLimit).toBe(5400);
  });

  it('derives grid delivery UNKNOWN when sensor unavailable', () => {
    const data = extractFlowData({
      [BASE_SENSOR + 'invertor_prms_to_grid']: { state: 'unavailable' },
      [BASE_SENSOR + 'invertor_prm1_p_max_feed_grid']: { state: '0' },
    });

    expect(data.inverterGridMode).toBe('unknown');
  });

  it('derives grid delivery UNKNOWN when sensor unknown', () => {
    const data = extractFlowData({
      [BASE_SENSOR + 'invertor_prms_to_grid']: { state: 'unknown' },
      [BASE_SENSOR + 'invertor_prm1_p_max_feed_grid']: { state: '0' },
    });

    expect(data.inverterGridMode).toBe('unknown');
  });

  it('derives grid delivery UNKNOWN when sensor empty', () => {
    const data = extractFlowData({
      [BASE_SENSOR + 'invertor_prms_to_grid']: { state: '' },
      [BASE_SENSOR + 'invertor_prm1_p_max_feed_grid']: { state: '0' },
    });

    expect(data.inverterGridMode).toBe('unknown');
  });

  it('handles transition state "Probíhá změna" as unknown', () => {
    const data = extractFlowData({
      [BASE_SENSOR + 'invertor_prms_to_grid']: { state: 'Probíhá změna' },
      [BASE_SENSOR + 'invertor_prm1_p_max_feed_grid']: { state: '5400' },
    });

    expect(data.inverterGridMode).toBe('unknown');
  });

  it('reports unknown limit when mode is unavailable', () => {
    const data = extractFlowData({
      [BASE_SENSOR + 'invertor_prms_to_grid']: { state: 'unavailable' },
      [BASE_SENSOR + 'invertor_prm1_p_max_feed_grid']: { state: '5400' },
    });

    expect(data.inverterGridMode).toBe('unknown');
    expect(data.inverterGridLimit).toBe(0);
  });
});

describe('Suffix-safe grid delivery resolution', () => {
  const BASE_SENSOR = 'sensor.oig_2206237016_';

  it('uses exact match when sensor exists', () => {
    const data = extractFlowData({
      [BASE_SENSOR + 'invertor_prms_to_grid']: { state: 'Zapnuto' },
      [BASE_SENSOR + 'invertor_prm1_p_max_feed_grid']: { state: '10000' },
    });

    expect(data.inverterGridMode).toBe('on');
    expect(data.inverterGridLimit).toBe(10000);
  });

  it('finds suffixed sensor _2 when exact match missing', () => {
    const data = extractFlowData({
      [BASE_SENSOR + 'invertor_prms_to_grid_2']: { state: 'Omezeno' },
      [BASE_SENSOR + 'invertor_prm1_p_max_feed_grid_2']: { state: '3000' },
    });

    expect(data.inverterGridMode).toBe('limited');
    expect(data.inverterGridLimit).toBe(3000);
  });

  it('prefers lowest numeric suffix when multiple suffixed sensors exist', () => {
    const data = extractFlowData({
      [BASE_SENSOR + 'invertor_prms_to_grid_2']: { state: 'Zapnuto' },
      [BASE_SENSOR + 'invertor_prms_to_grid_3']: { state: 'Vypnuto' },
      [BASE_SENSOR + 'invertor_prm1_p_max_feed_grid_2']: { state: '8000' },
      [BASE_SENSOR + 'invertor_prm1_p_max_feed_grid_3']: { state: '5000' },
    });

    expect(data.inverterGridMode).toBe('on');
    expect(data.inverterGridLimit).toBe(8000);
  });

  it('falls back to base sensor when suffixed sensor not found', () => {
    const data = extractFlowData({
      [BASE_SENSOR + 'invertor_prms_to_grid']: { state: 'Vypnuto' },
      [BASE_SENSOR + 'invertor_prm1_p_max_feed_grid']: { state: '0' },
      [BASE_SENSOR + 'invertor_prms_to_grid_5']: { state: 'Zapnuto' },
      [BASE_SENSOR + 'invertor_prm1_p_max_feed_grid_5']: { state: '10000' },
    });

    expect(data.inverterGridMode).toBe('off');
    expect(data.inverterGridLimit).toBe(0);
  });
});

describe('getGridExportDisplay with canonical values', () => {
  it('displays OFF state correctly', () => {
    const result = getGridExportDisplay('off');
    expect(result.display).toBe('Vypnuto');
    expect(result.icon).toBe('🚫');
  });

  it('displays ON state correctly', () => {
    const result = getGridExportDisplay('on');
    expect(result.display).toBe('Zapnuto');
    expect(result.icon).toBe('💧');
  });

  it('displays LIMITED state correctly', () => {
    const result = getGridExportDisplay('limited');
    expect(result.display).toBe('Omezeno');
    expect(result.icon).toBe('🚰');
  });

  it('displays UNKNOWN state correctly', () => {
    const result = getGridExportDisplay('unknown');
    expect(result.display).toBe('--');
    expect(result.icon).toBe('💧');
  });
});
