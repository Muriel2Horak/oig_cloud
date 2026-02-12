export type TimelineTab = 'yesterday' | 'today' | 'tomorrow' | 'history' | 'comparison';

export interface TimelineMode {
  start: string;
  end: string;
  mode: string;
  color: string;
}

export interface TimelineSummary {
  solarProduction: number;
  gridImport: number;
  gridExport: number;
  batteryCharge: number;
  batteryDischarge: number;
  consumption: number;
  cost: number;
  revenue: number;
}

export interface TimelineData {
  modes: TimelineMode[];
  summary: TimelineSummary;
}

export const TIMELINE_TAB_LABELS: Record<TimelineTab, string> = {
  yesterday: 'Včera',
  today: 'Dnes',
  tomorrow: 'Zítra',
  history: 'Historie',
  comparison: 'Srovnání',
};

export const MODE_COLORS: Record<string, string> = {
  home_1: '#4caf50',
  home_2: '#2196f3',
  home_3: '#ff9800',
  home_ups: '#9c27b0',
  feed_in: '#00bcd4',
  backup: '#f44336',
};
