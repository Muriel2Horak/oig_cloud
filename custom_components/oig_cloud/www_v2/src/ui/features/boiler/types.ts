// ============================================================================
// Boiler Tab — Types
// Full feature parity with V1: state, plan, profiles, energy, config, heatmap
// ============================================================================

// --- State ---

export interface BoilerState {
  currentTemp: number;
  targetTemp: number;
  heating: boolean;
  tempTop: number | null;
  tempBottom: number | null;
  avgTemp: number | null;
  heatingPercent: number | null;
  energyNeeded: number | null;
  planCost: number | null;
  nextHeating: string;
  recommendedSource: string;
  nextProfile?: string;
  nextStart?: string;
}

// --- Plan ---

export interface BoilerPlanSlot {
  start: string;
  end: string;
  consumptionKwh: number;
  recommendedSource: string;
  spotPrice: number | null;
  tempTop?: number;
  soc?: number;
}

export interface BoilerPlan {
  slots: BoilerPlanSlot[];
  totalConsumptionKwh: number;
  fveKwh: number;
  gridKwh: number;
  altKwh: number;
  estimatedCostCzk: number;
  nextSlot: BoilerPlanSlot | null;
  planStart: string;
  planEnd: string;
  sourceDigest: string;
  activeSlotCount: number;
  cheapestSpot: string;
  mostExpensiveSpot: string;
}

// --- Energy Breakdown ---

export interface BoilerEnergyBreakdown {
  fveKwh: number;
  gridKwh: number;
  altKwh: number;
  fvePercent: number;
  gridPercent: number;
  altPercent: number;
}

// --- Predicted Usage ---

export interface BoilerPredictedUsage {
  predictedTodayKwh: number;
  peakHours: number[];
  waterLiters40c: number | null;
  circulationWindows: string;
  circulationNow: string;
}

// --- Config ---

export interface BoilerConfig {
  volumeL: number | null;
  heaterPowerW: number | null;
  targetTempC: number | null;
  deadlineTime: string;
  stratificationMode: string;
  kCoefficient: string;
  coldInletTempC: number;
  configMode: string;
}

// --- Profile ---

export interface BoilerProfile {
  id: string;
  name: string;
  targetTemp: number;
  startTime: string;
  endTime: string;
  days: number[];
  enabled: boolean;
}

// --- Heatmap ---

export interface BoilerHourData {
  hour: number;
  temp: number;
  heating: boolean;
  profile?: string;
}

export interface BoilerHeatmapRow {
  day: string;
  hours: number[];  // 24 values (consumption kWh)
}

export interface BoilerProfilingData {
  hourlyAvg: number[];    // 24 values
  peakHours: number[];
  predictedTotalKwh: number;
  confidence: number | null;
  daysTracked: number;
}

// --- Category ---

export const CATEGORY_LABELS: Record<string, string> = {
  workday_spring: 'Pracovní den - Jaro',
  workday_summer: 'Pracovní den - Léto',
  workday_autumn: 'Pracovní den - Podzim',
  workday_winter: 'Pracovní den - Zima',
  weekend_spring: 'Víkend - Jaro',
  weekend_summer: 'Víkend - Léto',
  weekend_autumn: 'Víkend - Podzim',
  weekend_winter: 'Víkend - Zima',
};

export const SOURCE_COLORS: Record<string, string> = {
  fve: '#4CAF50',
  grid: '#FF9800',
  alternative: '#2196F3',
};

export const SOURCE_LABELS: Record<string, string> = {
  fve: 'FVE',
  grid: 'Síť',
  alternative: 'Alternativa',
};

export const DAYS_SHORT = ['Po', 'Út', 'St', 'Čt', 'Pá', 'So', 'Ne'];
export const DAYS_FULL = ['Pondělí', 'Úterý', 'Středa', 'Čtvrtek', 'Pátek', 'Sobota', 'Neděle'];

// --- Combined data ---

export interface BoilerData {
  state: BoilerState;
  plan: BoilerPlan | null;
  energyBreakdown: BoilerEnergyBreakdown;
  predictedUsage: BoilerPredictedUsage;
  config: BoilerConfig;
  profiles: BoilerProfile[];
  heatmap: BoilerHourData[];
  heatmap7x24: BoilerHeatmapRow[];
  profiling: BoilerProfilingData;
  currentCategory: string;
  availableCategories: string[];
  forecastWindows: { fve: string; grid: string };
}
