/**
 * Analytics UI types — re-exports from data layer for component use.
 *
 * Components should import from here; the data layer lives in @/data/analytics-data.ts.
 */
export type {
  AnalyticsData,
  BatteryEfficiencyData,
  BatteryHealthData,
  BatteryBalancingData,
  CostComparisonData,
} from '@/data/analytics-data';

export { EMPTY_ANALYTICS } from '@/data/analytics-data';
