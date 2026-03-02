import { describe, it, expect } from 'vitest';
import { AnalyticsData } from '@/ui/features/analytics/types';

describe('Analytics types', () => {
  describe('AnalyticsData', () => {
    it('should have batteryEfficiency structure', () => {
      const data: AnalyticsData = {
        batteryEfficiency: {
          efficiency: 95,
          charged: 10000,
          discharged: 9500,
          losses: 500,
          comparisonLastMonth: 2.5,
        },
        batteryHealth: {
          soh: 98,
          capacity: 9800,
          nominalCapacity: 10000,
          measurementCount: 150,
        },
        plannedConsumption: {
          profile: [1000, 1200, 1500],
          plan: [900, 1100, 1400],
          actual: [950, 1150, 1450],
          tomorrow: [1000, 1200, 1300],
        },
        batteryBalancing: {
          status: 'completed',
          lastBalancing: '2024-01-15T10:00:00',
          cost: 25.50,
        },
      };

      expect(data.batteryEfficiency.efficiency).toBe(95);
      expect(data.batteryHealth.soh).toBe(98);
      expect(data.plannedConsumption.profile).toHaveLength(3);
      expect(data.batteryBalancing.status).toBe('completed');
    });
  });
});
