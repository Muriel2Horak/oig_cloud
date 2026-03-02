/**
 * OIG Cloud V2 — Pricing Types
 *
 * Complete type system for pricing tab: spot prices, timeline data,
 * mode segments, extreme price blocks, sparklines, what-if analysis,
 * planned consumption, chart config.
 */

// ============================================================================
// PRICE DATA
// ============================================================================

/** Single 15-min interval price point from timeline API */
export interface TimelinePoint {
  timestamp: string;              // ISO local string e.g. "2025-01-15T14:00:00"
  spot_price_czk?: number;
  export_price_czk?: number;
  battery_capacity_kwh?: number;
  battery_soc?: number;
  battery_start?: number;
  solar_charge_kwh?: number;
  grid_charge_kwh?: number;
  grid_net?: number;
  grid_import?: number;
  grid_export?: number;
  load_kwh?: number;
  consumption_kwh?: number;
  load?: number;
  mode_name?: string;
  mode_planned?: string;
  mode?: string;
  mode_display?: string;
}

/** Simplified price point used by stat cards and block finder */
export interface PricePoint {
  timestamp: string;
  price: number;
}

/** Extreme price block (cheapest/most expensive N-hour window) */
export interface PriceBlock {
  start: string;
  end: string;
  avg: number;
  min: number;
  max: number;
  values: number[];
  type: 'cheapest-buy' | 'expensive-buy' | 'best-export' | 'worst-export';
}

// ============================================================================
// MODE SEGMENTS (Chart.js plugin data)
// ============================================================================

export interface ModeSegment {
  mode: string;
  start: Date;
  end: Date;
  icon: string;
  color: string;
  label: string;
  shortLabel: string;
}

export interface ModeMeta {
  icon: string;
  color: string;
  label: string;
}

export const PRICING_MODE_CONFIG: Record<string, ModeMeta> = {
  'HOME I':         { icon: '🏠', color: 'rgba(76, 175, 80, 0.16)',  label: 'HOME I' },
  'HOME II':        { icon: '⚡', color: 'rgba(33, 150, 243, 0.16)',  label: 'HOME II' },
  'HOME III':       { icon: '🔋', color: 'rgba(156, 39, 176, 0.16)', label: 'HOME III' },
  'HOME UPS':       { icon: '🛡️', color: 'rgba(255, 152, 0, 0.18)',  label: 'HOME UPS' },
  'FULL HOME UPS':  { icon: '🛡️', color: 'rgba(255, 152, 0, 0.18)',  label: 'FULL HOME UPS' },
  'DO NOTHING':     { icon: '⏸️', color: 'rgba(158, 158, 158, 0.18)', label: 'DO NOTHING' },
  'Mode 0':         { icon: '🏠', color: 'rgba(76, 175, 80, 0.16)',  label: 'HOME I' },
  'Mode 1':         { icon: '⚡', color: 'rgba(33, 150, 243, 0.16)',  label: 'HOME II' },
  'Mode 2':         { icon: '🔋', color: 'rgba(156, 39, 176, 0.16)', label: 'HOME III' },
  'Mode 3':         { icon: '🛡️', color: 'rgba(255, 152, 0, 0.18)',  label: 'HOME UPS' },
};

// ============================================================================
// SOLAR FORECAST
// ============================================================================

export interface SolarForecastData {
  string1: number[];
  string2: number[];
  todayTotal: number;
  hasString1: boolean;
  hasString2: boolean;
}

// ============================================================================
// BATTERY FORECAST
// ============================================================================

export interface BatteryForecastArrays {
  baseline: (number | null)[];
  solarCharge: (number | null)[];
  gridCharge: (number | null)[];
  gridNet: (number | null)[];
  consumption: (number | null)[];
}

// ============================================================================
// PLANNED CONSUMPTION
// ============================================================================

export interface PlannedConsumption {
  todayConsumedKwh: number;
  todayPlannedKwh: number | null;
  todayTotalKwh: number;
  tomorrowKwh: number | null;
  totalPlannedKwh: number;
  profile: string;
  trendText: string | null;
}

// ============================================================================
// WHAT-IF ANALYSIS
// ============================================================================

export interface WhatIfAlternative {
  delta_czk?: number;
  total_cost_czk?: number;
  current_mode?: string;
}

export interface WhatIfAnalysis {
  totalCost: number;
  totalSavings: number;
  alternatives: Record<string, WhatIfAlternative>;
  activeMode: string | null;
}

// ============================================================================
// STAT CARDS
// ============================================================================

export interface StatCardData {
  label: string;
  value: string;
  unit: string;
  time?: string;
  variant: 'primary' | 'success' | 'warning' | 'danger' | 'info';
  entityId?: string;
}

// ============================================================================
// CHART STATE
// ============================================================================

export type DatalabelMode = 'auto' | 'always' | 'never';
export type DetailLevel = 'overview' | 'day' | 'detail';

export interface ChartZoomState {
  start: number | null;
  end: number | null;
}

// ============================================================================
// AGGREGATED PRICING DATA (returned by data layer)
// ============================================================================

export interface PricingData {
  /** All timeline points from the API */
  timeline: TimelinePoint[];
  /** Parsed Date labels for chart X-axis */
  labels: Date[];
  /** Spot price points for block finder */
  prices: PricePoint[];
  /** Export price points for block finder */
  exportPrices: PricePoint[];
  /** Mode segments for Chart.js plugin */
  modeSegments: ModeSegment[];
  /** Extreme buy blocks */
  cheapestBuyBlock: PriceBlock | null;
  expensiveBuyBlock: PriceBlock | null;
  /** Extreme export blocks */
  bestExportBlock: PriceBlock | null;
  worstExportBlock: PriceBlock | null;
  /** Solar forecast data (interpolated to 15min) */
  solar: SolarForecastData | null;
  /** Battery forecast stacked arrays */
  battery: BatteryForecastArrays | null;
  /** Initial zoom range from timeline data */
  initialZoomStart: number | null;
  initialZoomEnd: number | null;
  /** Current sensor prices */
  currentSpotPrice: number;
  currentExportPrice: number;
  avgSpotPrice: number;
  /** Planned consumption stats */
  plannedConsumption: PlannedConsumption | null;
  /** What-if analysis */
  whatIf: WhatIfAnalysis | null;
  /** Solar forecast total */
  solarForecastTotal: number;
}

export const EMPTY_PRICING_DATA: PricingData = {
  timeline: [],
  labels: [],
  prices: [],
  exportPrices: [],
  modeSegments: [],
  cheapestBuyBlock: null,
  expensiveBuyBlock: null,
  bestExportBlock: null,
  worstExportBlock: null,
  solar: null,
  battery: null,
  initialZoomStart: null,
  initialZoomEnd: null,
  currentSpotPrice: 0,
  currentExportPrice: 0,
  avgSpotPrice: 0,
  plannedConsumption: null,
  whatIf: null,
  solarForecastTotal: 0,
};

// Keep backward compat for stat cards
export interface PricingStats {
  cheapestBuy: { time: string; price: number };
  bestSell: { time: string; price: number };
  avgBuy: number;
  avgSell: number;
  totalCost: number;
}
