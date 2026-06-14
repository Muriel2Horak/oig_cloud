// ============================================================================
// Boiler Tab — Types
// Full feature parity with V1: state, plan, profiles, energy, config, heatmap
// ============================================================================

export const OVERRIDE_TTL_DEFAULT_MINUTES = 120;
export const OVERRIDE_TTL_MIN_MINUTES = 15;
export const OVERRIDE_TTL_MAX_MINUTES = 1440;
export const OVERRIDE_TTL_STEP_MINUTES = 15;

export interface BoilerV2Status {
  currentState: 'heating' | 'idle' | 'unknown';
  comfortSatisfied: boolean | null;
  comfortStatusCode: string | null;
  selectedSource: string | null;
  actuatedSource: string | null;
  temperatureTop: number | null;
  temperatureBottom: number | null;
  energyNeededKwh: number | null;
  heating: boolean;
  lastUpdate: string | null;
  degraded: boolean;
  degradedFlags: string[];
}

export interface BoilerV2PlanSlot {
  start: string;
  end: string;
  consumptionKwh: number;
  confidence: number;
  recommendedSource: string | null;
  spotPrice: number | null;
  altPrice: number | null;
  overflowAvailable: boolean;
  heatingKwh?: number | null;
  pvKwh?: number | null;
  gridKwh?: number | null;
  altKwh?: number | null;
  expectedTempTopC?: number | null;
  comfortSatisfied?: boolean | null;
  estimatedCostCzk?: number | null;
  pvShare?: number | null;
  sourceInvalid?: boolean | null;
  /** Purpose of this slot: 'comfort' (default) or 'legionella' */
  purpose?: string | null;
}

export interface BoilerV2Explanation {
  reasonCodes: string[];
  planCreatedAt: string | null;
  planValidUntil: string | null;
  dataAgeSecs: number | null;
  degradedReasons: string[];
  unsatisfiedComfortGapC: number | null;
  temperatureAtDeadlineC: number | null;
}

export interface BoilerV2Activity {
  state: 'charging_fve' | 'charging_overflow' | 'charging_grid' | 'charging_alt' | 'discharging' | 'standby' | 'unknown';
  source: 'fve' | 'overflow' | 'grid' | 'discharge' | 'alternative' | null;
  temperatureTrendCPerMin: number | null;
  fillLevelPct: number | null;
  auraMaxTempC: number;
  heaterStates: Record<string, 'on' | 'off' | 'unavailable'>;
  staleFlags: string[];
  sourceEstimated?: boolean;
}

export interface BoilerV2SourceSegment {
  key: 'fve' | 'overflow' | 'grid' | 'discharge' | 'alternative' | null;
  start: string;
  end: string | null;
  energyKwh: number;
  fillPct: number;
  active: boolean;
}

export interface BoilerV2TimelinePoint {
  timestamp: string;
  topTempC: number | null;
  bottomTempC: number | null;
  powerKw: number | null;
  sourceKey: 'fve' | 'overflow' | 'grid' | 'discharge' | 'alternative' | null;
  activityState: string;
}

export interface BoilerV2Sparkline {
  temperature: number[];
  power: number[];
}

export interface BoilerV2ManualOverride {
  active: boolean;
  ttlMinutes: number;
  reason: string;
  capabilityAvailable: boolean;
}

export interface BoilerV2Identity {
  entryId: string | null;
  boxId: string | null;
  available: boolean;
}

export interface DemandMapWindow {
  slotIndex: number;
  startMinute: number;
  p80Kwh: number;
  liters: number;
  label: string; // "morning" | "afternoon" | "evening" | "night"
}

export interface DemandMapProfile {
  category: string;
  level: string; // "exact" | "same_day_type" | "global" | "bootstrap"
  daysUsed: number;
  label: string;
  fallbackUsed: boolean;
}

export interface DemandMapData {
  slotDurationMin: number;
  slotsP50: number[];   // 96 values
  slotsP80: number[];   // 96 values
  windows: DemandMapWindow[];
  profile: DemandMapProfile;
  confidence: number;
  /** Threshold the plan requires before windows drive charging (default 0.3). */
  minConfidence: number;
  /** True when these windows actually feed the planner; false = learning estimate only. */
  drivesPlan: boolean;
}

/** Single circulation pump run (start/end ISO, label) */
export interface CirculationRun {
  start: string;
  end: string;
  label: string;
}

/** Legionella status from the canonical DTO */
export interface LegionellaStatus {
  enabled: boolean;
  daysSinceLast: number | null;
  intervalDays: number | null;
  scheduledStart: string | null; // ISO or null
}

/** Plan cost benchmarks + deadline from plan_summary DTO */
export interface PlanSummary {
  estimatedCostCzk: number | null;
  costIfAllGrid: number | null;
  costIfAllAlt: number | null;
  deadlineTime: string; // "HH:MM"
}

/** Energy-today breakdown from energy_today DTO (Task C / F4) */
export interface EnergyToday {
  totalKwh: number;
  fveKwh: number;
  gridKwh: number;
  altKwh: number;
  batteryKwh: number;
  /** Electric kWh whose source could not be determined (e.g. pre-restart gap). */
  unattributedKwh: number;
  sourceInvalid: boolean;
  /** Real today cost (Kč): grid×all-in spot + metered gas×config. null/absent until computed. */
  costCzk?: number | null;
  gridCostCzk?: number | null;
  altCostCzk?: number | null;
  /** Savings vs heating the same electric energy on the alt source (gas). null if no alt price. */
  savingsVsAltCzk?: number | null;
}

export interface BoilerV2Data {
  status: BoilerV2Status | null;
  planSlots: BoilerV2PlanSlot[];
  explanation: BoilerV2Explanation | null;
  manualOverride: BoilerV2ManualOverride | null;
  identity: BoilerV2Identity;
  activity: BoilerV2Activity | null;
  sourceSegments: BoilerV2SourceSegment[];
  timeline: BoilerV2TimelinePoint[];
  sparkline: BoilerV2Sparkline | null;
  demandMap: DemandMapData | null;
  circulationRuns: CirculationRun[];
  legionella: LegionellaStatus | null;
  planSummary: PlanSummary | null;
  energyToday: EnergyToday | null;
  loading: boolean;
  loadError: string | null;
  /** F5/Task C: alt source type from config ("gas"|"heat_pump"|"fireplace"|"other") */
  altSourceType?: string | null;
}

// --- State ---

export interface BoilerState {
  currentTemp: number | null;
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
  heaterPowerKw: number | null;
  targetTempC: number | null;
  deadlineTime: string;
  stratificationMode: string;
  kCoefficient: string;
  coldInletTempC: number;
  auraMaxTempC: number | null;
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

export const BOILER_SOURCE_COLORS: Record<string, string> = {
  fve: '#4CAF50',
  overflow: '#8BC34A',
  grid: '#FF9800',
  discharge: '#2196F3',
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
  v2Data: BoilerV2Data;
}
