export interface AnalyticsData {
  batteryEfficiency: {
    efficiency: number;
    charged: number;
    discharged: number;
    losses: number;
    comparisonLastMonth: number;
  };
  batteryHealth: {
    soh: number;
    capacity: number;
    nominalCapacity: number;
    measurementCount: number;
  };
  plannedConsumption: {
    profile: number[];
    plan: number[];
    actual: number[];
    tomorrow: number[];
  };
  batteryBalancing: {
    status: string;
    lastBalancing: string;
    cost: number;
    nextScheduled?: string;
  };
}
