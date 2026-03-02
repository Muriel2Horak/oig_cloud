import { describe, it, expect } from 'vitest';
import {
  parseBalancingState,
  buildGridChargingPlan,
  formatPlanWindow,
  getBlockEnergyKwh,
  computeBlocksDurationMinutes,
} from '../../../src/data/flow-data';
import type { GridChargingBlock } from '../../../src/ui/features/flow/types';

describe('flow-data helpers', () => {
  describe('parseBalancingState', () => {
    it('maps balancing states to V2 UI states', () => {
      expect(parseBalancingState('charging')).toBe('charging');
      expect(parseBalancingState('balancing')).toBe('holding');
      expect(parseBalancingState('holding')).toBe('holding');
      expect(parseBalancingState('completed')).toBe('completed');
      expect(parseBalancingState('planned')).toBe('planned');
    });

    it('falls back to standby for unknown values', () => {
      expect(parseBalancingState('')).toBe('standby');
      expect(parseBalancingState('unknown')).toBe('standby');
      expect(parseBalancingState(undefined)).toBe('standby');
    });
  });

  describe('grid charging plan extraction', () => {
    it('builds plan data from charging_blocks attributes', () => {
      const blocks: GridChargingBlock[] = [
        {
          day: 'today',
          time_from: '01:00',
          time_to: '01:30',
          grid_import_kwh: 1.2,
          total_cost_czk: 6.3,
        },
        {
          day: 'tomorrow',
          time_from: '02:00',
          time_to: '02:15',
          grid_charge_kwh: 0.6,
          total_cost_czk: 3.0,
          status: 'running',
        },
      ];

      const plan = buildGridChargingPlan({
        state: 'on',
        attributes: {
          charging_blocks: blocks,
          total_energy_kwh: 2.4,
          total_cost_czk: 10.5,
        },
      });

      expect(plan.hasBlocks).toBe(true);
      expect(plan.totalEnergyKwh).toBe(2.4);
      expect(plan.totalCostCzk).toBe(10.5);
      expect(plan.windowLabel).toBe('dnes 01:00 → zítra 02:15');
      expect(plan.durationMinutes).toBe(45);
      expect(plan.currentBlockLabel).toBe('zítra 02:00 - 02:15');
      expect(plan.nextBlockLabel).toBeNull();
    });

    it('falls back to computed totals when attrs are missing', () => {
      const blocks: GridChargingBlock[] = [
        { day: 'today', time_from: '10:00', time_to: '10:15', grid_import_kwh: 0.5, total_cost_czk: 1.2 },
        { day: 'today', time_from: '10:15', time_to: '10:30', battery_start_kwh: 5, battery_end_kwh: 5.4 },
      ];

      const plan = buildGridChargingPlan({
        state: 'off',
        attributes: { charging_blocks: blocks },
      });

      expect(plan.totalEnergyKwh).toBeCloseTo(0.9, 5);
      expect(plan.totalCostCzk).toBeCloseTo(1.2, 5);
      expect(plan.windowLabel).toBe('dnes 10:00 – 10:30');
    });

    it('formats plan window and energy helpers consistently', () => {
      const blocks: GridChargingBlock[] = [
        { day: 'today', time_from: '06:00', time_to: '06:30', grid_import_kwh: 1.5 },
        { day: 'today', time_from: '07:00', time_to: '07:15', battery_start_kwh: 2, battery_end_kwh: 2.5 },
      ];

      expect(formatPlanWindow(blocks)).toBe('dnes 06:00 – 07:15');
      expect(getBlockEnergyKwh(blocks[0])).toBe(1.5);
      expect(getBlockEnergyKwh(blocks[1])).toBeCloseTo(0.5, 5);
      expect(computeBlocksDurationMinutes(blocks)).toBe(45);
    });
  });
});
