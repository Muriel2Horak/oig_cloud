/**
 * Tests for the grid tile V4 FE changes:
 *  - extractFlowData reads cost sensor fields (null when absent, numeric when present)
 *  - EMPTY_FLOW_DATA has null cost fields
 *  - FlowData type has the new cost fields
 */
import { describe, it, expect } from 'vitest';
import { extractFlowData } from '@/data/flow-data';
import { EMPTY_FLOW_DATA } from '@/ui/features/flow/types';

const SN = 'test1234';
const mk = (sensor: string, state: string) => ({
  [`sensor.oig_${SN}_${sensor}`]: { state },
});

describe('extractFlowData — grid cost sensor fields', () => {
  it('returns null for cost fields when sensors are absent', () => {
    const data = extractFlowData({}, SN);
    expect(data.gridImportCostToday).toBeNull();
    expect(data.gridImportCostMonth).toBeNull();
    expect(data.gridExportEarningsToday).toBeNull();
    expect(data.gridExportEarningsMonth).toBeNull();
  });

  it('returns null when sensor state is "unavailable"', () => {
    const data = extractFlowData({
      ...mk('computed_grid_import_cost_today', 'unavailable'),
      ...mk('computed_grid_export_earnings_today', 'unknown'),
    }, SN);
    expect(data.gridImportCostToday).toBeNull();
    expect(data.gridExportEarningsToday).toBeNull();
  });

  it('parses numeric cost fields correctly', () => {
    const data = extractFlowData({
      ...mk('computed_grid_import_cost_today', '42.56'),
      ...mk('computed_grid_import_cost_month', '321.10'),
      ...mk('computed_grid_export_earnings_today', '12.34'),
      ...mk('computed_grid_export_earnings_month', '87.65'),
    }, SN);
    expect(data.gridImportCostToday).toBeCloseTo(42.56);
    expect(data.gridImportCostMonth).toBeCloseTo(321.10);
    expect(data.gridExportEarningsToday).toBeCloseTo(12.34);
    expect(data.gridExportEarningsMonth).toBeCloseTo(87.65);
  });

  it('parses zero cost correctly (not null)', () => {
    const data = extractFlowData({
      ...mk('computed_grid_import_cost_today', '0'),
      ...mk('computed_grid_export_earnings_today', '0'),
    }, SN);
    expect(data.gridImportCostToday).toBe(0);
    expect(data.gridExportEarningsToday).toBe(0);
  });

  it('returns null for non-numeric sensor state', () => {
    const data = extractFlowData({
      ...mk('computed_grid_import_cost_today', 'NaN'),
    }, SN);
    expect(data.gridImportCostToday).toBeNull();
  });
});

describe('EMPTY_FLOW_DATA defaults', () => {
  it('has null cost fields in EMPTY_FLOW_DATA', () => {
    expect(EMPTY_FLOW_DATA.gridImportCostToday).toBeNull();
    expect(EMPTY_FLOW_DATA.gridImportCostMonth).toBeNull();
    expect(EMPTY_FLOW_DATA.gridExportEarningsToday).toBeNull();
    expect(EMPTY_FLOW_DATA.gridExportEarningsMonth).toBeNull();
  });
});

describe('Phase-direction logic (unit — no DOM)', () => {
  /**
   * These verify the state-classification logic used by renderGrid,
   * extracted as pure computations for testability.
   */

  function classifyPhases(l1p: number, l2p: number, l3p: number) {
    const phases = [l1p, l2p, l3p];
    const anyImport = phases.some(p => p > 10);
    const anyExport = phases.some(p => p < -10);
    if (anyImport && anyExport) return 'combined';
    if (anyImport) return 'import';
    if (anyExport) return 'export';
    return 'idle';
  }

  it('classifies all-import correctly', () => {
    expect(classifyPhases(500, 400, 300)).toBe('import');
  });

  it('classifies all-export correctly', () => {
    expect(classifyPhases(-500, -400, -300)).toBe('export');
  });

  it('classifies mixed as combined', () => {
    expect(classifyPhases(116, -115, 79)).toBe('combined');
  });

  it('classifies near-zero as idle', () => {
    expect(classifyPhases(5, -5, 0)).toBe('idle');
  });

  it('classifies one importing and others zero as import', () => {
    expect(classifyPhases(100, 0, 0)).toBe('import');
  });
});

describe('Voltage dot positioning', () => {
  const VOLT_MIN = 207;
  const VOLT_MAX = 253;
  const VOLT_RANGE = VOLT_MAX - VOLT_MIN;

  function voltPct(v: number): number {
    return Math.max(0, Math.min(100, ((v - VOLT_MIN) / VOLT_RANGE) * 100));
  }

  function voltColor(v: number): string {
    if (v < VOLT_MIN || v > VOLT_MAX) return '#e53935';
    if (v < 212 || v > 248) return '#ffa726';
    return '#66bb6a';
  }

  it('positions 230 V dot at 50%', () => {
    expect(voltPct(230)).toBeCloseTo(50, 0);
  });

  it('positions 207 V (limit) at 0%', () => {
    expect(voltPct(207)).toBe(0);
  });

  it('positions 253 V (limit) at 100%', () => {
    expect(voltPct(253)).toBe(100);
  });

  it('clamps out-of-range voltages', () => {
    expect(voltPct(100)).toBe(0);
    expect(voltPct(300)).toBe(100);
  });

  it('colors safe voltage green', () => {
    expect(voltColor(230)).toBe('#66bb6a');
  });

  it('colors near-edge voltage amber', () => {
    expect(voltColor(210)).toBe('#ffa726'); // 210 >= 207 but < 212
    expect(voltColor(250)).toBe('#ffa726'); // 250 <= 253 but > 248
  });

  it('colors out-of-range voltage red', () => {
    expect(voltColor(205)).toBe('#e53935');
    expect(voltColor(260)).toBe('#e53935');
  });
});
