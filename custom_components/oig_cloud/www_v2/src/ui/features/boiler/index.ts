export {
  OigBoilerDebugPanel,
  OigBoilerStatusGrid,
  OigBoilerEnergyBreakdown,
  OigBoilerPredictedUsage,
  OigBoilerPlanInfo,
  OigBoilerTank,
  OigBoilerCategorySelect,
  OigBoilerHeatmapGrid,
  OigBoilerStatsCards,
  OigBoilerProfiling,
  OigBoilerConfigSection,
  OigBoilerState,
  OigBoilerHeatmap,
  OigBoilerProfiles,
  OigBoilerStatusPanel,
  OigBoilerPlanTimeline,
  OigBoilerSourceExplanation,
  OigBoilerOverridePanel,
  OigBoilerUnavailableState,
  OigBoilerDemandMap,
} from './components';

export {
  OigBoilerPlanStrip,
  groupSlotsToBands,
  normalizeDisplaySource,
  isoToFraction,
  nowFraction,
  deadlineFraction,
} from './boiler-plan-strip';

export {
  OigBoilerEnergyToday,
  buildSourceTiles,
  altTypeLabel,
  computeSavingsLabel,
  formatKwhLocale,
} from './boiler-energy-today';

export { OigBoilerDrawMap, pickProfile, drawWindows, drawTypeSymbol } from './boiler-draw-map';
export { OigBoilerModel, usableLiters } from './boiler-model';
export { OigBoilerPlan, buildPlanAgenda } from './boiler-plan';
export { OigBoilerSocChart, buildSocSeries } from './boiler-soc-chart';
export { OigBoilerV2Svg } from './boiler-svg';
export { OigBoilerV2Shell } from './boiler-shell';
export { OigBoilerMetricPanel } from './boiler-metric-panel';
export { OigBoilerSparkline } from './boiler-sparkline';
export { OigBoilerTimelineChart, resolveTimelineNowMs, minutesSinceMidnightInTimeZone } from './boiler-timeline-chart';

export {
  OigBoilerPlanRealitaTile,
  adherenceColor,
  blockSourceColor,
  blockDurationHours,
  metricBetterClass,
  BOILER_BLOCK_SOURCE_COLORS,
} from './boiler-plan-realita-tile';

export * from './types';
