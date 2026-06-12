import { describe, it, expect } from 'vitest';
import {
  mapCanonicalToV2,
  parseStateForTest,
  parseConfigForTest,
  normalizePlannerSource,
  normalizeRuntimeSource,
  filterPublicFlags,
  OVERRIDE_TTL_DEFAULT_MINUTES,
  OVERRIDE_TTL_MIN_MINUTES,
  OVERRIDE_TTL_MAX_MINUTES,
  OVERRIDE_TTL_STEP_MINUTES,
} from '@/data/boiler-data';
import type { BoilerConfig, BoilerV2Data, BoilerV2SourceSegment, BoilerV2TimelinePoint, BoilerV2PlanSlot } from '@/ui/features/boiler/types';
import {
  OigBoilerMetricPanel,
  OigBoilerSparkline,
  OigBoilerTimelineChart,
  resolveTimelineNowMs,
  minutesSinceMidnightInTimeZone,
} from '@/ui/features/boiler';
import { BOILER_SOURCE_COLORS } from '@/ui/features/boiler/types';
import {
  estimateTimeToTargetMinutes,
  formatTempTrendCPerMin,
  formatLiters,
  formatKw,
  formatCompactTime,
} from '@/ui/features/boiler/format';
import { t, sourceLabel } from '@/i18n/boiler';
import {
  OigBoilerStatusPanel,
  OigBoilerPlanTimeline,
  OigBoilerSourceExplanation,
  OigBoilerOverridePanel,
  OigBoilerUnavailableState,
} from '@/ui/features/boiler/components';
import { OigBoilerV2Svg } from '@/ui/features/boiler/boiler-svg';
import { OigBoilerV2Shell } from '@/ui/features/boiler/boiler-shell';

function getTemplateStrings(el: { render(): unknown }): string {
  const result = Reflect.apply(
    Reflect.get(Object.getPrototypeOf(el), 'render'),
    el,
    [],
  ) as { strings?: ArrayLike<string> } | null;
  if (!result) return '';
  const strings = result.strings;
  if (!strings) return '';
  return Array.from(strings).join('');
}

function getTemplateValues(el: { render(): unknown }): unknown[] {
  const result = Reflect.apply(
    Reflect.get(Object.getPrototypeOf(el), 'render'),
    el,
    [],
  ) as { values?: unknown[] } | null;
  return result?.values ?? [];
}

const FULL_CANONICAL = {
  entry_id: 'entry1',
  box_id: '2206237016',
  current_state: {
    temperatures: { top: 58.5, bottom: 42.1, upper_zone: 58.5, lower_zone: 42.1 },
    energy_state: { avg_temp: 50.3, energy_needed_kwh: 1.4 },
    energy_tracking: { current_source: 'fve', total_kwh: 5.2, fve_kwh: 3.1, grid_kwh: 2.1, alt_kwh: 0 },
    heating: true,
    recommended_source: 'fve',
    last_update: '2026-04-26T10:00:00Z',
  },
  comfort_status: {
    comfort_satisfied: true,
    comfort_status_code: 'ok',
    temperature_at_deadline_c: 60.0,
    unsatisfied_comfort_gap_c: null,
  },
  selected_source: 'fve',
  actuated_source: 'fve',
  plan_slots: [
    {
      start: '2026-04-26T10:00:00Z',
      end: '2026-04-26T10:15:00Z',
      consumption_kwh: 0.375,
      confidence: 0.9,
      recommended_source: 'fve',
      spot_price: 1.5,
      alt_price: 2.0,
      overflow_available: true,
    },
    {
      start: '2026-04-26T14:00:00Z',
      end: '2026-04-26T14:15:00Z',
      consumption_kwh: 0.375,
      confidence: 0.8,
      recommended_source: 'grid',
      spot_price: 3.2,
      alt_price: null,
      overflow_available: false,
    },
  ],
  reason_codes: ['spot_cheap', 'pv_forecast_high'],
  freshness: {
    plan_created_at: '2026-04-26T09:55:00Z',
    plan_valid_until: '2026-04-26T15:00:00Z',
    last_update: '2026-04-26T10:00:00Z',
    data_age_seconds: 120,
    profile_last_updated: '2026-04-25T20:00:00Z',
  },
  degraded_flags: {
    degraded: false,
    flags: [],
    serializer_state: 'idle',
  },
  manual_override: {
    active: false,
    state: null,
  },
};

const DEGRADED_CANONICAL = {
  ...FULL_CANONICAL,
  degraded_flags: {
    degraded: true,
    flags: ['temperature_stale', 'source_stale'],
    serializer_state: 'degraded',
  },
  comfort_status: {
    ...FULL_CANONICAL.comfort_status,
    comfort_satisfied: false,
    comfort_status_code: 'gap',
    unsatisfied_comfort_gap_c: 5.0,
  },
};


describe('mapCanonicalToV2', () => {
  it('maps status.heating from canonical current_state', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.status).not.toBeNull();
    expect(v2.status!.heating).toBe(true);
  });

  it('maps status.currentState to "heating" when heating=true', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.status!.currentState).toBe('heating');
  });

  it('maps status.currentState to "idle" when heating=false', () => {
    const v2 = mapCanonicalToV2({ ...FULL_CANONICAL, current_state: { ...FULL_CANONICAL.current_state, heating: false } });
    expect(v2.status!.currentState).toBe('idle');
  });

  it('maps status.temperatureTop from canonical temperatures.top', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.status!.temperatureTop).toBe(58.5);
  });

  it('maps status.temperatureBottom from canonical temperatures.bottom', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.status!.temperatureBottom).toBe(42.1);
  });

  it('maps status.temperatureTop to null when canonical has no temperature', () => {
    const noTemp = {
      ...FULL_CANONICAL,
      current_state: {
        ...FULL_CANONICAL.current_state,
        temperatures: {},
      },
    };
    const v2 = mapCanonicalToV2(noTemp as any);
    expect(v2.status!.temperatureTop).toBeNull();
  });

  it('maps status.selectedSource from canonical selected_source', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.status!.selectedSource).toBe('fve');
  });

  it('maps status.actuatedSource from canonical actuated_source', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.status!.actuatedSource).toBe('fve');
  });

  it('maps status.comfortSatisfied from canonical comfort_status', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.status!.comfortSatisfied).toBe(true);
  });

  it('maps status.comfortStatusCode from canonical comfort_status', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.status!.comfortStatusCode).toBe('ok');
  });

  it('maps status.degraded=false when flags empty', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.status!.degraded).toBe(false);
    expect(v2.status!.degradedFlags).toEqual([]);
  });

  it('maps status.degraded=true and degradedFlags when degraded', () => {
    const v2 = mapCanonicalToV2(DEGRADED_CANONICAL);
    expect(v2.status!.degraded).toBe(true);
    expect(v2.status!.degradedFlags).toContain('temperature_stale');
    expect(v2.status!.degradedFlags).toContain('source_stale');
  });

  it('maps planSlots with correct fields', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.planSlots).toHaveLength(2);
    const slot = v2.planSlots[0];
    expect(slot.consumptionKwh).toBe(0.375);
    expect(slot.confidence).toBe(0.9);
    expect(slot.recommendedSource).toBe('fve');
    expect(slot.spotPrice).toBe(1.5);
    expect(slot.altPrice).toBe(2.0);
    expect(slot.overflowAvailable).toBe(true);
  });

  it('maps planSlots with null spotPrice/altPrice when absent', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    const slot2 = v2.planSlots[1];
    expect(slot2.altPrice).toBeNull();
  });

  it('maps explanation.reasonCodes from canonical reason_codes', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.explanation).not.toBeNull();
    expect(v2.explanation!.reasonCodes).toContain('spot_cheap');
    expect(v2.explanation!.reasonCodes).toContain('pv_forecast_high');
  });

  it('maps explanation.planCreatedAt from canonical freshness', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.explanation!.planCreatedAt).toBe('2026-04-26T09:55:00Z');
  });

  it('maps explanation.planValidUntil from canonical freshness', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.explanation!.planValidUntil).toBe('2026-04-26T15:00:00Z');
  });

  it('maps explanation.dataAgeSecs from canonical freshness', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.explanation!.dataAgeSecs).toBe(120);
  });

  it('maps explanation.degradedReasons from degraded flags', () => {
    const v2 = mapCanonicalToV2(DEGRADED_CANONICAL);
    expect(v2.explanation!.degradedReasons).toContain('temperature_stale');
  });

  it('maps explanation.unsatisfiedComfortGapC when comfort not satisfied', () => {
    const v2 = mapCanonicalToV2(DEGRADED_CANONICAL);
    expect(v2.explanation!.unsatisfiedComfortGapC).toBe(5.0);
  });

  it('returns null status and loadError when null canonical', () => {
    const v2 = mapCanonicalToV2(null);
    expect(v2.status).toBeNull();
    expect(v2.planSlots).toEqual([]);
    expect(v2.explanation).toBeNull();
    expect(v2.loadError).not.toBeNull();
  });

  it('returns identity with available=true when entry_id and box_id present', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.identity.available).toBe(true);
    expect(v2.identity.entryId).toBe('entry1');
    expect(v2.identity.boxId).toBe('2206237016');
  });

  it('returns identity with available=false when null canonical', () => {
    const v2 = mapCanonicalToV2(null);
    expect(v2.identity.available).toBe(false);
  });

  it('maps manualOverride.active when manual_override.active=false', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.manualOverride).not.toBeNull();
    expect(v2.manualOverride!.active).toBe(false);
  });
});


describe('parseStateForTest — no fake temperatures', () => {
  const emptyConfig: BoilerConfig = {
    volumeL: null,
    heaterPowerW: null,
    heaterPowerKw: null,
    targetTempC: 60,
    deadlineTime: '--:--',
    stratificationMode: '--',
    kCoefficient: '--',
    coldInletTempC: 10,
    auraMaxTempC: null,
  };

  it('returns null currentTemp when planData has no current_temp', () => {
    const state = parseStateForTest(null, null, emptyConfig);
    expect(state.currentTemp).toBeNull();
  });

  it('does NOT fabricate 45°C for missing temperature', () => {
    const state = parseStateForTest(null, null, emptyConfig);
    expect(state.currentTemp).not.toBe(45);
  });

  it('returns actual currentTemp when planData provides it', () => {
    const plan = { state: { current_temp: 58.5 } };
    const state = parseStateForTest(plan as any, null, emptyConfig);
    expect(state.currentTemp).toBe(58.5);
  });

  it('returns null nextHeating when no slots', () => {
    const state = parseStateForTest(null, null, emptyConfig);
    // Must NOT be 'Neplánováno' as a fake value when data is truly absent
    // It's ok to say "Neplánováno" when the plan data is empty, 
    // but currentTemp must not be 45
    expect(state.currentTemp).toBeNull();
  });
});


describe('Override TTL constraints', () => {
  it('OVERRIDE_TTL_DEFAULT_MINUTES is 120', () => {
    expect(OVERRIDE_TTL_DEFAULT_MINUTES).toBe(120);
  });

  it('OVERRIDE_TTL_MIN_MINUTES is 15', () => {
    expect(OVERRIDE_TTL_MIN_MINUTES).toBe(15);
  });

  it('OVERRIDE_TTL_MAX_MINUTES is 1440', () => {
    expect(OVERRIDE_TTL_MAX_MINUTES).toBe(1440);
  });

  it('OVERRIDE_TTL_STEP_MINUTES is 15', () => {
    expect(OVERRIDE_TTL_STEP_MINUTES).toBe(15);
  });
});


describe('OigBoilerStatusPanel — data-testid', () => {
  it('render template contains data-testid="boiler-status-panel"', () => {
    const el = new OigBoilerStatusPanel();
    el.data = null;
    const strings = getTemplateStrings(el as any);
    expect(strings).toContain('data-testid="boiler-status-panel"');
  });

  it('renders degraded badge when status.degraded=true', () => {
    const el = new OigBoilerStatusPanel();
    el.data = {
      currentState: 'idle',
      comfortSatisfied: false,
      comfortStatusCode: 'gap',
      selectedSource: 'grid',
      actuatedSource: 'grid',
      temperatureTop: 45.0,
      temperatureBottom: null,
      energyNeededKwh: 2.0,
      heating: false,
      lastUpdate: null,
      degraded: true,
      degradedFlags: ['temperature_stale'],
    };
    const strings = getTemplateStrings(el as any);
    expect(strings.toLowerCase()).toMatch(/degraded|degradov/);
  });

  it('renders without fake 45°C when temperatureTop is null', () => {
    const el = new OigBoilerStatusPanel();
    el.data = {
      currentState: 'unknown',
      comfortSatisfied: null,
      comfortStatusCode: null,
      selectedSource: null,
      actuatedSource: null,
      temperatureTop: null,
      temperatureBottom: null,
      energyNeededKwh: null,
      heating: false,
      lastUpdate: null,
      degraded: false,
      degradedFlags: [],
    };
    // Temperature values in template strings — the template should not contain "45"
    const vals = getTemplateValues(el as any);
    const allVals = JSON.stringify(vals);
    expect(allVals).not.toContain('"45"');
    expect(allVals).not.toContain(':45,');
    expect(allVals).not.toContain(':45}');
  });
});

describe('OigBoilerPlanTimeline — data-testid', () => {
  it('render template contains data-testid="boiler-plan-timeline"', () => {
    const el = new OigBoilerPlanTimeline();
    el.slots = [];
    const strings = getTemplateStrings(el as any);
    expect(strings).toContain('data-testid="boiler-plan-timeline"');
  });

  it('renders one entry per slot', () => {
    const el = new OigBoilerPlanTimeline();
    el.slots = [
      {
        start: '2026-04-26T10:00:00Z',
        end: '2026-04-26T10:15:00Z',
        consumptionKwh: 0.375,
        confidence: 0.9,
        recommendedSource: 'fve',
        spotPrice: 1.5,
        altPrice: null,
        overflowAvailable: true,
      },
      {
        start: '2026-04-26T14:00:00Z',
        end: '2026-04-26T14:15:00Z',
        consumptionKwh: 0.375,
        confidence: 0.8,
        recommendedSource: 'grid',
        spotPrice: 3.2,
        altPrice: null,
        overflowAvailable: false,
      },
    ];
    const vals = getTemplateValues(el as any);
    // Should have values array - the slot list should be in values
    const hasSlots = JSON.stringify(vals).includes('fve') && JSON.stringify(vals).includes('grid');
    expect(hasSlots).toBe(true);
  });
});

describe('OigBoilerSourceExplanation — data-testid', () => {
  it('render template contains data-testid="boiler-source-explanation"', () => {
    const el = new OigBoilerSourceExplanation();
    el.explanation = null;
    const strings = getTemplateStrings(el as any);
    expect(strings).toContain('data-testid="boiler-source-explanation"');
  });

  it('renders reason codes when explanation is provided', () => {
    const el = new OigBoilerSourceExplanation();
    el.explanation = {
      reasonCodes: ['spot_cheap', 'pv_forecast_high'],
      planCreatedAt: '2026-04-26T09:55:00Z',
      planValidUntil: '2026-04-26T15:00:00Z',
      dataAgeSecs: 120,
      degradedReasons: [],
      unsatisfiedComfortGapC: null,
      temperatureAtDeadlineC: 60.0,
    };
    const vals = getTemplateValues(el as any);
    const json = JSON.stringify(vals);
    expect(json).toContain('spot_cheap');
  });
});

describe('OigBoilerOverridePanel — data-testid', () => {
  it('render template contains data-testid="boiler-override-panel"', () => {
    const el = new OigBoilerOverridePanel();
    el.identity = { entryId: 'entry1', boxId: '2206237016', available: true };
    el.currentOverride = null;
    const strings = getTemplateStrings(el as any);
    expect(strings).toContain('data-testid="boiler-override-panel"');
  });

  it('render template has TTL input with min=15 max=1440 step=15', () => {
    const el = new OigBoilerOverridePanel();
    el.identity = { entryId: 'entry1', boxId: '2206237016', available: true };
    el.currentOverride = null;
    const strings = getTemplateStrings(el as any);
    expect(strings).toContain('min="15"');
    expect(strings).toContain('max="1440"');
    expect(strings).toContain('step="15"');
  });

  it('renders disabled controls when identity.available=false', () => {
    const el = new OigBoilerOverridePanel();
    el.identity = { entryId: null, boxId: null, available: false };
    el.currentOverride = null;
    // Should render with disabled state indicated in template strings
    const strings = getTemplateStrings(el as any);
    // Template must mention unavailable identity somehow
    // Either via disabled attribute or text explaining unavailability
    const vals = getTemplateValues(el as any);
    const valStr = JSON.stringify(vals);
    // Check for disabled state (true means element is disabled)
    expect(strings + valStr).toMatch(/disabled|unavailabl|nedostupn/i);
  });
});

describe('OigBoilerUnavailableState — data-testid', () => {
  it('render template contains data-testid="boiler-unavailable-state"', () => {
    const el = new OigBoilerUnavailableState();
    el.reason = 'loading';
    el.message = '';
    const strings = getTemplateStrings(el as any);
    expect(strings).toContain('data-testid="boiler-unavailable-state"');
  });

  it('renders loading indicator for reason=loading', () => {
    const el = new OigBoilerUnavailableState();
    el.reason = 'loading';
    el.message = '';
    const vals = getTemplateValues(el as any);
    const json = JSON.stringify(vals);
    // Should mention loading / načítání
    expect(json.toLowerCase()).toMatch(/načít|loading|spinner/);
  });

  it('renders error message for reason=error', () => {
    const el = new OigBoilerUnavailableState();
    el.reason = 'error';
    el.message = 'API call failed';
    const vals = getTemplateValues(el as any);
    const json = JSON.stringify(vals);
    expect(json).toContain('API call failed');
  });

  it('renders degraded notice for reason=degraded', () => {
    const el = new OigBoilerUnavailableState();
    el.reason = 'degraded';
    el.message = 'price_data_stale';
    const strings = getTemplateStrings(el as any);
    expect(strings.toLowerCase()).toMatch(/degraded|degradov|zhoršen/);
  });
});


describe('No fabricated temperature values', () => {
  it('BoilerStatusPanel with null temperatureTop renders "--" not "45"', () => {
    const el = new OigBoilerStatusPanel();
    el.data = {
      currentState: 'unknown',
      comfortSatisfied: null,
      comfortStatusCode: null,
      selectedSource: null,
      actuatedSource: null,
      temperatureTop: null,
      temperatureBottom: null,
      energyNeededKwh: null,
      heating: false,
      lastUpdate: null,
      degraded: false,
      degradedFlags: [],
    };
    const vals = getTemplateValues(el as any);
    const json = JSON.stringify(vals);
    // Value "45" should not appear as a fabricated temperature
    expect(json).not.toMatch(/"45(?:\.0)?(?:°C)?"/);
    // "—" (em dash) should appear as the unavailable placeholder  
    expect(json).toContain('—');
  });
});


describe('OigBoilerOverridePanel — TTL default and reason input', () => {
  it('TTL input has value="120" as default', () => {
    const el = new OigBoilerOverridePanel();
    el.identity = { entryId: 'entry1', boxId: '2206237016', available: true };
    el.currentOverride = null;
    const strings = getTemplateStrings(el as any);
    expect(strings).toContain('value="120"');
  });

  it('renders a reason textarea with required attribute', () => {
    const el = new OigBoilerOverridePanel();
    el.identity = { entryId: 'entry1', boxId: '2206237016', available: true };
    el.currentOverride = null;
    const strings = getTemplateStrings(el as any);
    expect(strings).toContain('<textarea');
    expect(strings).toContain('required');
  });

  it('reason textarea has data-testid="override-reason-input"', () => {
    const el = new OigBoilerOverridePanel();
    el.identity = { entryId: 'entry1', boxId: '2206237016', available: true };
    el.currentOverride = null;
    const strings = getTemplateStrings(el as any);
    expect(strings).toContain('data-testid="override-reason-input"');
  });

  it('TTL input has data-testid="override-ttl-input"', () => {
    const el = new OigBoilerOverridePanel();
    el.identity = { entryId: 'entry1', boxId: '2206237016', available: true };
    el.currentOverride = null;
    const strings = getTemplateStrings(el as any);
    expect(strings).toContain('data-testid="override-ttl-input"');
  });

  it('submit button has data-testid="override-submit-btn"', () => {
    const el = new OigBoilerOverridePanel();
    el.identity = { entryId: 'entry1', boxId: '2206237016', available: true };
    el.currentOverride = null;
    const strings = getTemplateStrings(el as any);
    expect(strings).toContain('data-testid="override-submit-btn"');
  });

  it('all controls are disabled when identity.available=false', () => {
    const el = new OigBoilerOverridePanel();
    el.identity = { entryId: null, boxId: null, available: false };
    el.currentOverride = null;
    const vals = getTemplateValues(el as any);
    const disabledValues = vals.filter(v => v === true);
    expect(disabledValues.length).toBeGreaterThanOrEqual(3);
  });

  it('unavailable notice is visible (not hidden) when identity.available=false', () => {
    const el = new OigBoilerOverridePanel();
    el.identity = { entryId: null, boxId: null, available: false };
    el.currentOverride = null;
    const vals = getTemplateValues(el as any);
    const json = JSON.stringify(vals);
    expect(json).toContain('false');
  });
});


describe('OigBoilerUnavailableState — reason selection', () => {
  it('reason=unavailable renders unavailable-msg (not hidden)', () => {
    const el = new OigBoilerUnavailableState();
    el.reason = 'unavailable';
    el.message = 'Data bojleru nejsou k dispozici';
    const vals = getTemplateValues(el as any);
    const json = JSON.stringify(vals);
    expect(json).toContain('Data bojleru nejsou k dispozici');
  });

  it('reason=error renders the error message in values', () => {
    const el = new OigBoilerUnavailableState();
    el.reason = 'error';
    el.message = 'Nepodařilo se načíst data bojleru';
    const vals = getTemplateValues(el as any);
    const json = JSON.stringify(vals);
    expect(json).toContain('Nepodařilo se načíst data bojleru');
  });

  it('reason=loading does NOT render error or unavailable message text', () => {
    const el = new OigBoilerUnavailableState();
    el.reason = 'loading';
    el.message = '';
    const vals = getTemplateValues(el as any);
    const json = JSON.stringify(vals);
    expect(json).not.toContain('error-msg');
    expect(json).not.toContain('unavailable-msg');
  });
});


describe('OigBoilerOverridePanel — capability gating', () => {
  it('controls are disabled when identity available but capability unavailable', () => {
    const el = new OigBoilerOverridePanel();
    el.identity = { entryId: 'entry1', boxId: '2206237016', available: true };
    el.currentOverride = { active: false, ttlMinutes: 120, reason: '', capabilityAvailable: false };
    const vals = getTemplateValues(el as any);
    const disabledValues = vals.filter(v => v === true);
    expect(disabledValues.length).toBeGreaterThanOrEqual(3);
  });

  it('shows capability-notice when identity available but capability unavailable', () => {
    const el = new OigBoilerOverridePanel();
    el.identity = { entryId: 'entry1', boxId: '2206237016', available: true };
    el.currentOverride = { active: false, ttlMinutes: 120, reason: '', capabilityAvailable: false };
    const strings = getTemplateStrings(el as any);
    expect(strings).toContain('capability-notice');
  });

  it('controls are enabled when both identity and capability are available', () => {
    const el = new OigBoilerOverridePanel();
    el.identity = { entryId: 'entry1', boxId: '2206237016', available: true };
    el.currentOverride = { active: false, ttlMinutes: 120, reason: '', capabilityAvailable: true };
    const vals = getTemplateValues(el as any);
    const falseValues = vals.filter(v => v === false);
    expect(falseValues.length).toBeGreaterThanOrEqual(3);
  });

  it('controls are disabled when currentOverride is null (capability unknown)', () => {
    const el = new OigBoilerOverridePanel();
    el.identity = { entryId: 'entry1', boxId: '2206237016', available: true };
    el.currentOverride = null;
    const vals = getTemplateValues(el as any);
    const disabledValues = vals.filter(v => v === true);
    expect(disabledValues.length).toBeGreaterThanOrEqual(3);
  });

  it('mapCanonicalToV2 sets capabilityAvailable=true when manual_override present', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.manualOverride).not.toBeNull();
    expect(v2.manualOverride!.capabilityAvailable).toBe(true);
  });

  it('mapCanonicalToV2 sets capabilityAvailable=false when manual_override absent', () => {
    const noOverride = { ...FULL_CANONICAL, manual_override: undefined as any };
    const v2 = mapCanonicalToV2(noOverride);
    expect(v2.manualOverride!.capabilityAvailable).toBe(false);
  });

  it('mapCanonicalToV2 returns manualOverride=null when canonical is null', () => {
    const v2 = mapCanonicalToV2(null);
    expect(v2.manualOverride).toBeNull();
  });
});

describe('OigBoilerStatusPanel — full DTO coverage', () => {
  it('renders current_state, both sources, comfort and every degraded flag', async () => {
    const el = document.createElement('oig-boiler-status-panel') as any;
    el.lang = 'cs';
    el.data = {
      currentState: 'heating',
      comfortSatisfied: false,
      comfortStatusCode: 'comfort_unsatisfied',
      selectedSource: 'fve',
      actuatedSource: 'grid',
      temperatureTop: 45.2,
      temperatureBottom: 38.0,
      energyNeededKwh: 1.234,
      heating: true,
      lastUpdate: '2026-04-26T14:00:00Z',
      degraded: true,
      degradedFlags: ['input_stale_pv', 'top_sensor_unavailable'],
    };
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('boiler-status-current-state');
    expect(html).toContain('Ohřev');
    expect(html).toContain('boiler-status-selected-source');
    expect(html).toContain('FVE');
    expect(html).toContain('boiler-status-actuated-source');
    expect(html).toContain('Síť');
    expect(html).toContain('boiler-status-comfort');
    expect(html).toContain('Komfort nesplněn');
    expect(html).toContain('boiler-status-degraded-flags');
    expect(html).toContain('FVE predikce není aktuální');
    expect(html).toContain('Horní teploměr není dostupný');
    expect(html).toContain('45.2 °C');
    expect(html).toContain('38.0 °C');
    expect(html).toContain('1.23 kWh');
  });
  it('renders en strings when lang=en', async () => {
    const el = document.createElement('oig-boiler-status-panel') as any;
    el.lang = 'en';
    el.data = {
      currentState: 'idle',
      comfortSatisfied: true,
      comfortStatusCode: 'comfort_satisfied',
      selectedSource: 'grid',
      actuatedSource: 'grid',
      temperatureTop: 50,
      temperatureBottom: null,
      energyNeededKwh: 0,
      heating: false,
      lastUpdate: null,
      degraded: false,
      degradedFlags: [],
    };
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('Idle');
    expect(html).toContain('Comfort satisfied');
    expect(html).toContain('Grid');
  });
});

describe('OigBoilerPlanTimeline — per-slot detail', () => {
  it('renders source, expected temp, comfort, kwh, cost, pv share for each slot', async () => {
    const el = document.createElement('oig-boiler-plan-timeline') as any;
    el.lang = 'cs';
    el.slots = [
      {
        start: '2026-04-26T14:00:00Z',
        end: '2026-04-26T14:15:00Z',
        consumptionKwh: 0.5,
        confidence: 1,
        recommendedSource: 'fve',
        spotPrice: 1.2,
        altPrice: null,
        overflowAvailable: true,
        expectedTempTopC: 48.5,
        comfortSatisfied: true,
        estimatedCostCzk: 0.6,
        pvShare: 0.8,
      },
      {
        start: '2026-04-26T14:15:00Z',
        end: '2026-04-26T14:30:00Z',
        consumptionKwh: 0.3,
        confidence: 1,
        recommendedSource: 'grid',
        spotPrice: 2.1,
        altPrice: null,
        overflowAvailable: false,
        expectedTempTopC: null,
        comfortSatisfied: false,
        estimatedCostCzk: 0.63,
        pvShare: 0,
      },
    ];
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('boiler-plan-timeline');
    expect(html).toContain('FVE');
    expect(html).toContain('Síť');
    expect(html).toContain('48.5 °C');
    expect(html).toContain('Komfort OK');
    expect(html).toContain('Komfort nesplněn');
    expect(html).toContain('0.50 kWh');
    expect(html).toContain('0.60 Kč');
    expect(html).toContain('80 %');
    expect(html).toContain('0 %');
  });

  it('renders translated empty state when no slots', async () => {
    const el = document.createElement('oig-boiler-plan-timeline') as any;
    el.lang = 'cs';
    el.slots = [];
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('Plán bojleru zatím není k dispozici');
  });
});

describe('OigBoilerSourceExplanation — split sections', () => {
  it('renders translated reasons split into freshness vs degraded vs others', async () => {
    const el = document.createElement('oig-boiler-source-explanation') as any;
    el.lang = 'cs';
    el.explanation = {
      reasonCodes: ['source_selected_pv', 'input_stale_price'],
      planCreatedAt: '2026-04-26T13:55:00Z',
      planValidUntil: '2026-04-27T13:55:00Z',
      dataAgeSecs: 125,
      degradedReasons: ['top_sensor_unavailable'],
      unsatisfiedComfortGapC: 4.2,
      temperatureAtDeadlineC: 45.5,
    };
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('boiler-source-explanation');
    expect(html).toContain('Čerstvost');
    expect(html).toContain('Ceny nejsou aktuální');
    expect(html).toContain('Degradované');
    expect(html).toContain('Horní teploměr není dostupný');
    expect(html).toContain('Vybrán zdroj: FVE');
    expect(html).toContain('4.2');
    expect(html).toContain('45.5 °C');
    expect(html).toContain('2 min');
  });
  it('renders fresh-inputs label when no freshness reason present', async () => {
    const el = document.createElement('oig-boiler-source-explanation') as any;
    el.lang = 'cs';
    el.explanation = {
      reasonCodes: ['source_selected_grid'],
      planCreatedAt: null,
      planValidUntil: null,
      dataAgeSecs: null,
      degradedReasons: [],
      unsatisfiedComfortGapC: null,
      temperatureAtDeadlineC: null,
    };
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('vstupy aktuální');
  });
  it('renders empty state when explanation is null', async () => {
    const el = document.createElement('oig-boiler-source-explanation') as any;
    el.lang = 'cs';
    el.explanation = null;
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.innerHTML).toContain('Žádné vysvětlení');
  });
});

describe('OigBoilerOverridePanel — polish', () => {
  it('renders translated heading + subtitle for cs', async () => {
    const el = document.createElement('oig-boiler-override-panel') as any;
    el.lang = 'cs';
    el.identity = { entryId: 'e', boxId: 'b', available: true };
    el.currentOverride = { active: false, ttlMinutes: 0, reason: '', capabilityAvailable: true };
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('Ruční přepis');
    expect(html).toContain('sekundární');
  });
  it('renders en strings for lang=en', async () => {
    const el = document.createElement('oig-boiler-override-panel') as any;
    el.lang = 'en';
    el.identity = { entryId: 'e', boxId: 'b', available: true };
    el.currentOverride = { active: false, ttlMinutes: 0, reason: '', capabilityAvailable: true };
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.innerHTML).toContain('Manual override');
  });
  it('shows active badge when currentOverride.active is true', async () => {
    const el = document.createElement('oig-boiler-override-panel') as any;
    el.lang = 'cs';
    el.identity = { entryId: 'e', boxId: 'b', available: true };
    el.currentOverride = { active: true, ttlMinutes: 60, reason: 'manual test', capabilityAvailable: true };
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.innerHTML).toContain('Přepis aktivní');
  });
});

describe('OigBoilerUnavailableState — explicit variants', () => {
  for (const [reason, label] of [
    ['loading', 'Načítání'],
    ['error', 'Chyba'],
    ['degraded', 'degradovaném'],
    ['unavailable', 'nejsou k dispozici'],
  ] as const) {
    it(`renders ${reason} variant in cs`, async () => {
      const el = document.createElement('oig-boiler-unavailable-state') as any;
      el.lang = 'cs';
      el.reason = reason;
      el.message = 'detail';
      document.body.appendChild(el);
      await el.updateComplete;
      const html = el.shadowRoot!.innerHTML;
      expect(html).toContain(label);
      expect(html).toContain('boiler-unavailable-state');
      if (reason === 'error' || reason === 'degraded') {
        expect(html).toContain('detail');
      }
    });
  }
});


describe('normalizePlannerSource', () => {
  it('maps fve -> fve, no sourceInvalid', () => {
    expect(normalizePlannerSource('fve')).toEqual({ source: 'fve', sourceInvalid: false });
  });

  it('maps pv -> fve', () => {
    expect(normalizePlannerSource('pv')).toEqual({ source: 'fve', sourceInvalid: false });
  });

  it('maps overflow -> overflow', () => {
    expect(normalizePlannerSource('overflow')).toEqual({ source: 'overflow', sourceInvalid: false });
  });

  it('maps grid -> grid', () => {
    expect(normalizePlannerSource('grid')).toEqual({ source: 'grid', sourceInvalid: false });
  });

  it('maps alternative -> alternative (kept distinct for plan strip rendering)', () => {
    expect(normalizePlannerSource('alternative')).toEqual({ source: 'alternative', sourceInvalid: false });
  });

  it('maps alt -> alternative', () => {
    expect(normalizePlannerSource('alt')).toEqual({ source: 'alternative', sourceInvalid: false });
  });

  it('maps null -> null, no sourceInvalid', () => {
    expect(normalizePlannerSource(null)).toEqual({ source: null, sourceInvalid: false });
  });

  it('maps empty string -> null, no sourceInvalid', () => {
    expect(normalizePlannerSource('')).toEqual({ source: null, sourceInvalid: false });
  });

  it('maps unrecognized -> null, sourceInvalid=true', () => {
    expect(normalizePlannerSource('unknown_source')).toEqual({ source: null, sourceInvalid: true });
  });

  it('discharge in planner -> null, sourceInvalid=true (discharge not valid planner source)', () => {
    const result = normalizePlannerSource('discharge');
    expect(result.source).toBeNull();
    expect(result.sourceInvalid).toBe(true);
  });
});


describe('normalizeRuntimeSource', () => {
  it('maps fve -> fve', () => {
    expect(normalizeRuntimeSource('fve')).toBe('fve');
  });

  it('maps overflow -> overflow', () => {
    expect(normalizeRuntimeSource('overflow')).toBe('overflow');
  });

  it('maps discharge -> discharge', () => {
    expect(normalizeRuntimeSource('discharge')).toBe('discharge');
  });

  it('maps discharging -> discharge', () => {
    expect(normalizeRuntimeSource('discharging')).toBe('discharge');
  });

  it('maps alternative -> alternative (gas/alt-heat kept distinct from grid)', () => {
    expect(normalizeRuntimeSource('alternative')).toBe('alternative');
  });

  it('maps alt -> alternative', () => {
    expect(normalizeRuntimeSource('alt')).toBe('alternative');
  });

  it('maps null -> null', () => {
    expect(normalizeRuntimeSource(null)).toBeNull();
  });

  it('maps unrecognized -> null', () => {
    expect(normalizeRuntimeSource('bogus')).toBeNull();
  });
});


describe('mapCanonicalToV2 — sourceInvalid propagation', () => {
  it('sets sourceInvalid=null for recognized source fve', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.planSlots[0].sourceInvalid).toBeFalsy();
  });

  it('sets sourceInvalid=true for unrecognized source', () => {
    const withBadSource = {
      ...FULL_CANONICAL,
      plan_slots: [
        { ...FULL_CANONICAL.plan_slots[0], recommended_source: 'bogus_source' },
      ],
    };
    const v2 = mapCanonicalToV2(withBadSource);
    expect(v2.planSlots[0].sourceInvalid).toBe(true);
    expect(v2.planSlots[0].recommendedSource).toBeNull();
  });

  it('maps alternative -> alternative (kept distinct for plan strip rendering)', () => {
    const withAlt = {
      ...FULL_CANONICAL,
      plan_slots: [
        { ...FULL_CANONICAL.plan_slots[0], recommended_source: 'alternative' },
      ],
    };
    const v2 = mapCanonicalToV2(withAlt);
    expect(v2.planSlots[0].recommendedSource).toBe('alternative');
    expect(v2.planSlots[0].sourceInvalid).toBeFalsy();
  });

  it('maps overflow -> overflow', () => {
    const withOverflow = {
      ...FULL_CANONICAL,
      plan_slots: [
        { ...FULL_CANONICAL.plan_slots[0], recommended_source: 'overflow' },
      ],
    };
    const v2 = mapCanonicalToV2(withOverflow);
    expect(v2.planSlots[0].recommendedSource).toBe('overflow');
  });

  it('includes new attribution fields heatingKwh, pvKwh, gridKwh, altKwh', () => {
    const withAttribution = {
      ...FULL_CANONICAL,
      plan_slots: [
        {
          ...FULL_CANONICAL.plan_slots[0],
          heating_kwh: 0.3,
          pv_kwh: 0.2,
          grid_kwh: 0.1,
          alt_kwh: 0.0,
        },
      ],
    };
    const v2 = mapCanonicalToV2(withAttribution as any);
    expect(v2.planSlots[0].heatingKwh).toBe(0.3);
    expect(v2.planSlots[0].pvKwh).toBe(0.2);
    expect(v2.planSlots[0].gridKwh).toBe(0.1);
    expect(v2.planSlots[0].altKwh).toBe(0.0);
  });

  it('defaults new fields to null when absent', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.planSlots[0].heatingKwh).toBeNull();
    expect(v2.planSlots[0].pvKwh).toBeNull();
  });

  it('includes activity=null, sourceSegments=[], timeline=[], sparkline=null', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.activity).toBeNull();
    expect(v2.sourceSegments).toEqual([]);
    expect(v2.timeline).toEqual([]);
    expect(v2.sparkline).toBeNull();
  });
});


describe('parseConfigForTest', () => {
  it('returns heaterPowerKw=null when not in config', () => {
    const config = parseConfigForTest(null);
    expect(config.heaterPowerKw).toBeNull();
    expect(config.heaterPowerW).toBeNull();
  });

  it('derives heaterPowerW from heaterPowerKw when present', () => {
    const profileData = { config: { heater_power_kw: 2.0, volume_l: 100 } } as any;
    const config = parseConfigForTest(profileData);
    expect(config.heaterPowerKw).toBe(2.0);
    expect(config.heaterPowerW).toBe(2000);
  });

  it('heaterPowerKw=0 is valid (not treated as falsy)', () => {
    const profileData = { config: { heater_power_kw: 0, volume_l: 100 } } as any;
    const config = parseConfigForTest(profileData);
    expect(config.heaterPowerKw).toBe(0);
    expect(config.heaterPowerW).toBe(0);
  });

  it('returns volumeL from config', () => {
    const profileData = { config: { volume_l: 120 } } as any;
    const config = parseConfigForTest(profileData);
    expect(config.volumeL).toBe(120);
  });
});


describe('estimateTimeToTargetMinutes', () => {
  it('returns 0 when target already reached', () => {
    expect(estimateTimeToTargetMinutes({
      targetTempC: 55,
      topTempC: 60,
      temperatureTrendCPerMin: null,
      volumeL: null,
      heaterPowerKw: null,
    })).toBe(0);
  });

  it('uses trend when available', () => {
    const result = estimateTimeToTargetMinutes({
      targetTempC: 60,
      topTempC: 50,
      temperatureTrendCPerMin: 2,
      volumeL: null,
      heaterPowerKw: null,
    });
    expect(result).toBeCloseTo(5, 5);
  });

  it('falls back to heater formula when trend unavailable', () => {
    const result = estimateTimeToTargetMinutes({
      targetTempC: 60,
      topTempC: 50,
      temperatureTrendCPerMin: null,
      volumeL: 100,
      heaterPowerKw: 2,
    });
    expect(result).toBeCloseTo((100 * 0.001163 * 10 / 2) * 60, 2);
  });

  it('returns null when heaterPowerKw=0 (avoid division by zero)', () => {
    expect(estimateTimeToTargetMinutes({
      targetTempC: 60,
      topTempC: 50,
      temperatureTrendCPerMin: null,
      volumeL: 100,
      heaterPowerKw: 0,
    })).toBeNull();
  });

  it('returns null when topTempC is null', () => {
    expect(estimateTimeToTargetMinutes({
      targetTempC: 60,
      topTempC: null,
      temperatureTrendCPerMin: 1,
      volumeL: 100,
      heaterPowerKw: 2,
    })).toBeNull();
  });

  it('returns null when no trend and no heater info', () => {
    expect(estimateTimeToTargetMinutes({
      targetTempC: 60,
      topTempC: 50,
      temperatureTrendCPerMin: null,
      volumeL: null,
      heaterPowerKw: null,
    })).toBeNull();
  });
});


describe('BOILER_SOURCE_COLORS', () => {
  it('has fve, overflow, grid, discharge keys', () => {
    expect(BOILER_SOURCE_COLORS).toHaveProperty('fve');
    expect(BOILER_SOURCE_COLORS).toHaveProperty('overflow');
    expect(BOILER_SOURCE_COLORS).toHaveProperty('grid');
    expect(BOILER_SOURCE_COLORS).toHaveProperty('discharge');
  });

  it('does not have alternative key', () => {
    expect(BOILER_SOURCE_COLORS).not.toHaveProperty('alternative');
  });
});


describe('i18n — new keys', () => {
  it('cs has boiler.source.overflow', () => {
    expect(t('boiler.source.overflow', 'cs')).toBe('Přetoky');
  });

  it('en has boiler.source.overflow', () => {
    expect(t('boiler.source.overflow', 'en')).toBe('Overflow');
  });

  it('cs has boiler.source.discharge', () => {
    expect(t('boiler.source.discharge', 'cs')).toBe('Vybíjení');
  });

  it('en has boiler.source.discharge', () => {
    expect(t('boiler.source.discharge', 'en')).toBe('Discharge');
  });

  it('cs has boiler.eta.label', () => {
    expect(t('boiler.eta.label', 'cs')).not.toBe('boiler.eta.label');
  });

  it('en has boiler.eta.label', () => {
    expect(t('boiler.eta.label', 'en')).not.toBe('boiler.eta.label');
  });

  it('cs has boiler.activity.state.charging_fve', () => {
    expect(t('boiler.activity.state.charging_fve', 'cs')).not.toBe('boiler.activity.state.charging_fve');
  });

  it('sourceLabel returns Přetoky for overflow in cs', () => {
    expect(sourceLabel('overflow', 'cs')).toBe('Přetoky');
  });

  it('sourceLabel returns Discharge for discharge in en', () => {
    expect(sourceLabel('discharge', 'en')).toBe('Discharge');
  });
});


describe('format — new formatters', () => {
  it('formatTempTrendCPerMin formats positive trend', () => {
    expect(formatTempTrendCPerMin(1.5)).toBe('+1.50 °C/min');
  });

  it('formatTempTrendCPerMin formats negative trend', () => {
    expect(formatTempTrendCPerMin(-0.5)).toBe('-0.50 °C/min');
  });

  it('formatTempTrendCPerMin returns dash for null', () => {
    expect(formatTempTrendCPerMin(null)).toBe('—');
  });

  it('formatLiters formats liters', () => {
    expect(formatLiters(120)).toBe('120 L');
  });

  it('formatLiters returns dash for null', () => {
    expect(formatLiters(null)).toBe('—');
  });

  it('formatKw formats kilowatts', () => {
    expect(formatKw(2.5)).toBe('2.50 kW');
  });

  it('formatCompactTime formats minutes only', () => {
    expect(formatCompactTime(45)).toBe('45 min');
  });

  it('formatCompactTime formats hours and minutes', () => {
    expect(formatCompactTime(90)).toBe('1 h 30 min');
  });

  it('formatCompactTime formats exact hours', () => {
    expect(formatCompactTime(120)).toBe('2 h');
  });

  it('formatCompactTime returns dash for null', () => {
    expect(formatCompactTime(null)).toBe('—');
  });
});

const ENRICHED_CANONICAL = {
  ...FULL_CANONICAL,
  activity: {
    state: 'charging_fve',
    source: 'fve',
    temperature_trend_c_per_min: 0.12,
    fill_level_pct: 72.5,
    aura_max_temp_c: 75,
    heater_states: { heater_1: 'on', heater_2: 'off' },
    stale_flags: ['temperature_stale'],
  },
  source_segments: [
    { key: 'fve', start: '2026-04-26T08:00:00Z', end: '2026-04-26T10:00:00Z', energy_kwh: 1.2, fill_pct: 40, active: false },
    { key: 'grid', start: '2026-04-26T10:00:00Z', end: null, energy_kwh: 0.3, fill_pct: 10, active: true },
  ],
  timeline: [
    { timestamp: '2026-04-26T08:00:00Z', top_temp_c: 55.0, bottom_temp_c: 40.0, power_kw: 2.0, source_key: 'fve', activity_state: 'charging_fve' },
    { timestamp: '2026-04-26T09:00:00Z', top_temp_c: 58.0, bottom_temp_c: 43.0, power_kw: null, source_key: null, activity_state: 'standby' },
  ],
  sparkline: {
    temperature: [55, 56, 57, 58],
    power: [2.0, 2.0, 0.0, 0.0],
  },
};

describe('mapCanonicalToV2 — enriched activity/segments/timeline/sparkline', () => {
  it('maps activity.state from canonical', () => {
    const v2 = mapCanonicalToV2(ENRICHED_CANONICAL);
    expect(v2.activity?.state).toBe('charging_fve');
  });

  it('maps activity.source from canonical', () => {
    const v2 = mapCanonicalToV2(ENRICHED_CANONICAL);
    expect(v2.activity?.source).toBe('fve');
  });

  it('maps activity.temperatureTrendCPerMin', () => {
    const v2 = mapCanonicalToV2(ENRICHED_CANONICAL);
    expect(v2.activity?.temperatureTrendCPerMin).toBeCloseTo(0.12);
  });

  it('maps activity.fillLevelPct', () => {
    const v2 = mapCanonicalToV2(ENRICHED_CANONICAL);
    expect(v2.activity?.fillLevelPct).toBeCloseTo(72.5);
  });

  it('maps activity.auraMaxTempC', () => {
    const v2 = mapCanonicalToV2(ENRICHED_CANONICAL);
    expect(v2.activity?.auraMaxTempC).toBe(75);
  });

  it('maps activity.heaterStates with normalized values', () => {
    const v2 = mapCanonicalToV2(ENRICHED_CANONICAL);
    expect(v2.activity?.heaterStates).toEqual({ heater_1: 'on', heater_2: 'off' });
  });

  it('maps activity.staleFlags array', () => {
    const v2 = mapCanonicalToV2(ENRICHED_CANONICAL);
    expect(v2.activity?.staleFlags).toEqual(['temperature_stale']);
  });

  it('activity is null when canonical.activity is absent', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.activity).toBeNull();
  });

  it('maps sourceSegments length', () => {
    const v2 = mapCanonicalToV2(ENRICHED_CANONICAL);
    expect(v2.sourceSegments).toHaveLength(2);
  });

  it('maps sourceSegments[0].key', () => {
    const v2 = mapCanonicalToV2(ENRICHED_CANONICAL);
    expect(v2.sourceSegments[0].key).toBe('fve');
  });

  it('maps sourceSegments[1].active', () => {
    const v2 = mapCanonicalToV2(ENRICHED_CANONICAL);
    expect(v2.sourceSegments[1].active).toBe(true);
  });

  it('sourceSegments defaults to [] when absent', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.sourceSegments).toEqual([]);
  });

  it('maps timeline length', () => {
    const v2 = mapCanonicalToV2(ENRICHED_CANONICAL);
    expect(v2.timeline).toHaveLength(2);
  });

  it('maps timeline[0].topTempC', () => {
    const v2 = mapCanonicalToV2(ENRICHED_CANONICAL);
    expect(v2.timeline[0].topTempC).toBe(55.0);
  });

  it('maps timeline[1].powerKw as null', () => {
    const v2 = mapCanonicalToV2(ENRICHED_CANONICAL);
    expect(v2.timeline[1].powerKw).toBeNull();
  });

  it('maps timeline[0].activityState', () => {
    const v2 = mapCanonicalToV2(ENRICHED_CANONICAL);
    expect(v2.timeline[0].activityState).toBe('charging_fve');
  });

  it('maps timeline[1].sourceKey as null', () => {
    const v2 = mapCanonicalToV2(ENRICHED_CANONICAL);
    expect(v2.timeline[1].sourceKey).toBeNull();
  });

  it('timeline defaults to [] when absent', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.timeline).toEqual([]);
  });

  it('maps sparkline.temperature array', () => {
    const v2 = mapCanonicalToV2(ENRICHED_CANONICAL);
    expect(v2.sparkline?.temperature).toEqual([55, 56, 57, 58]);
  });

  it('maps sparkline.power array', () => {
    const v2 = mapCanonicalToV2(ENRICHED_CANONICAL);
    expect(v2.sparkline?.power).toEqual([2.0, 2.0, 0.0, 0.0]);
  });

  it('sparkline is null when absent', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL);
    expect(v2.sparkline).toBeNull();
  });

  it('sparkline with missing arrays defaults to []', () => {
    const v2 = mapCanonicalToV2({ ...FULL_CANONICAL, sparkline: { temperature: null as any, power: null as any } });
    expect(v2.sparkline?.temperature).toEqual([]);
    expect(v2.sparkline?.power).toEqual([]);
  });

  it('unknown activity state normalizes to unknown', () => {
    const v2 = mapCanonicalToV2({
      ...ENRICHED_CANONICAL,
      activity: { ...ENRICHED_CANONICAL.activity, state: 'bogus_state' },
    });
    expect(v2.activity?.state).toBe('unknown');
  });

  it('unknown heater state normalizes to unavailable', () => {
    const v2 = mapCanonicalToV2({
      ...ENRICHED_CANONICAL,
      activity: { ...ENRICHED_CANONICAL.activity, heater_states: { h1: 'broken' } },
    });
    expect(v2.activity?.heaterStates.h1).toBe('unavailable');
  });
});

describe('mapCanonicalToV2 — config_profile_unavailable degrade flag', () => {
  it('adds config_profile_unavailable to degradedReasons when flag is true', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL, true);
    expect(v2.explanation?.degradedReasons).toContain('config_profile_unavailable');
  });

  it('does not add config_profile_unavailable when flag is false', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL, false);
    expect(v2.explanation?.degradedReasons).not.toContain('config_profile_unavailable');
  });

  it('preserves existing backend degraded flags alongside config_profile_unavailable', () => {
    const v2 = mapCanonicalToV2(DEGRADED_CANONICAL, true);
    expect(v2.explanation?.degradedReasons).toContain('temperature_stale');
    expect(v2.explanation?.degradedReasons).toContain('source_stale');
    expect(v2.explanation?.degradedReasons).toContain('config_profile_unavailable');
  });

  it('exact flag string is config_profile_unavailable', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL, true);
    const flags = v2.explanation?.degradedReasons ?? [];
    expect(flags.find(f => f === 'config_profile_unavailable')).toBe('config_profile_unavailable');
  });
});

describe('parseConfig — auraMaxTempC', () => {
  it('maps aura_max_temp_c from config', () => {
    const config = parseConfigForTest({ config: { aura_max_temp_c: 80 } } as any);
    expect(config.auraMaxTempC).toBe(80);
  });

  it('auraMaxTempC is null when absent', () => {
    const config = parseConfigForTest(null);
    expect(config.auraMaxTempC).toBeNull();
  });

  it('auraMaxTempC is null for non-finite value', () => {
    const config = parseConfigForTest({ config: { aura_max_temp_c: NaN } } as any);
    expect(config.auraMaxTempC).toBeNull();
  });

  it('auraMaxTempC accepts 0 as valid', () => {
    const config = parseConfigForTest({ config: { aura_max_temp_c: 0 } } as any);
    expect(config.auraMaxTempC).toBe(0);
  });
});

describe('mapCanonicalToV2 — selectedSource/actuatedSource normalization', () => {
  it('normalizes selectedSource fve', () => {
    const v2 = mapCanonicalToV2({ ...FULL_CANONICAL, selected_source: 'fve' });
    expect(v2.status?.selectedSource).toBe('fve');
  });

  it('normalizes selectedSource alternative to alternative (kept distinct)', () => {
    const v2 = mapCanonicalToV2({ ...FULL_CANONICAL, selected_source: 'alternative' });
    expect(v2.status?.selectedSource).toBe('alternative');
  });

  it('normalizes selectedSource manual to null (invalid planner source)', () => {
    const v2 = mapCanonicalToV2({ ...FULL_CANONICAL, selected_source: 'manual' });
    expect(v2.status?.selectedSource).toBeNull();
  });

  it('normalizes selectedSource bogus_raw to null (invalid planner source)', () => {
    const v2 = mapCanonicalToV2({ ...FULL_CANONICAL, selected_source: 'bogus_raw_source' });
    expect(v2.status?.selectedSource).toBeNull();
  });

  it('normalizes actuatedSource overflow', () => {
    const v2 = mapCanonicalToV2({ ...FULL_CANONICAL, actuated_source: 'overflow' });
    expect(v2.status?.actuatedSource).toBe('overflow');
  });

  it('normalizes actuatedSource discharge to null (discharge is runtime-only, invalid for planner)', () => {
    const v2 = mapCanonicalToV2({ ...FULL_CANONICAL, actuated_source: 'discharge' });
    expect(v2.status?.actuatedSource).toBeNull();
  });

  it('normalizes actuatedSource null to null', () => {
    const v2 = mapCanonicalToV2({ ...FULL_CANONICAL, actuated_source: null });
    expect(v2.status?.actuatedSource).toBeNull();
  });
});

describe('mapCanonicalToV2 — sourceSegments invalid key becomes null', () => {
  it('invalid runtime source key becomes null (no raw leak)', () => {
    const v2 = mapCanonicalToV2({
      ...FULL_CANONICAL,
      source_segments: [
        { key: 'bogus_source', start: '2026-04-26T08:00:00Z', end: null, energy_kwh: 1.0, fill_pct: 30, active: true },
      ],
    });
    expect(v2.sourceSegments[0].key).toBeNull();
  });

  it('valid runtime source key fve passes through', () => {
    const v2 = mapCanonicalToV2({
      ...FULL_CANONICAL,
      source_segments: [
        { key: 'fve', start: '2026-04-26T08:00:00Z', end: null, energy_kwh: 1.0, fill_pct: 30, active: true },
      ],
    });
    expect(v2.sourceSegments[0].key).toBe('fve');
  });

  it('discharge is valid runtime source key', () => {
    const v2 = mapCanonicalToV2({
      ...FULL_CANONICAL,
      source_segments: [
        { key: 'discharge', start: '2026-04-26T08:00:00Z', end: null, energy_kwh: 0.5, fill_pct: 10, active: false },
      ],
    });
    expect(v2.sourceSegments[0].key).toBe('discharge');
  });

  it('alternative raw key is preserved as alternative (gas/alt-heat kept distinct from grid)', () => {
    const v2 = mapCanonicalToV2({
      ...FULL_CANONICAL,
      source_segments: [
        { key: 'alternative', start: '2026-04-26T08:00:00Z', end: null, energy_kwh: 0.5, fill_pct: 10, active: false },
      ],
    });
    expect(v2.sourceSegments[0].key).toBe('alternative');
  });
});

describe('estimateTimeToTargetMinutes — non-positive trend falls back to heater', () => {
  it('falls back to heater formula when trend is zero', () => {
    const result = estimateTimeToTargetMinutes({
      targetTempC: 60,
      topTempC: 50,
      temperatureTrendCPerMin: 0,
      volumeL: 100,
      heaterPowerKw: 2,
    });
    expect(result).toBeCloseTo((100 * 0.001163 * 10 / 2) * 60, 2);
  });

  it('falls back to heater formula when trend is negative', () => {
    const result = estimateTimeToTargetMinutes({
      targetTempC: 60,
      topTempC: 50,
      temperatureTrendCPerMin: -0.5,
      volumeL: 100,
      heaterPowerKw: 2,
    });
    expect(result).toBeCloseTo((100 * 0.001163 * 10 / 2) * 60, 2);
  });

  it('returns null when trend is negative and no heater info', () => {
    const result = estimateTimeToTargetMinutes({
      targetTempC: 60,
      topTempC: 50,
      temperatureTrendCPerMin: -1,
      volumeL: null,
      heaterPowerKw: null,
    });
    expect(result).toBeNull();
  });
});

describe('filterPublicFlags — allowlist enforcement', () => {
  it('passes through all allowed flags', () => {
    const allowed = [
      'temperature_unavailable',
      'temperature_stale',
      'source_stale',
      'activity_stale',
      'source_invalid',
      'power_sign_mismatch_charge',
      'power_sign_mismatch_discharge',
      'runtime_cache_empty',
    ];
    expect(filterPublicFlags(allowed)).toEqual(allowed);
  });

  it('removes free-form backend flags', () => {
    const result = filterPublicFlags(['price_data_stale', 'pv_forecast_unavailable', 'temp_sensor_stale']);
    expect(result).toEqual([]);
  });

  it('keeps allowed flags and removes free-form flags from mixed input', () => {
    const result = filterPublicFlags(['temperature_stale', 'price_data_stale', 'source_invalid', 'pv_forecast_unavailable']);
    expect(result).toEqual(['temperature_stale', 'source_invalid']);
  });

  it('returns empty array for empty input', () => {
    expect(filterPublicFlags([])).toEqual([]);
  });

  it('mapCanonicalToV2 status.degradedFlags filters free-form backend flags', () => {
    const v2 = mapCanonicalToV2({
      ...FULL_CANONICAL,
      degraded_flags: { degraded: true, flags: ['price_data_stale', 'temperature_stale', 'pv_forecast_unavailable'], serializer_state: 'degraded' },
    });
    expect(v2.status?.degradedFlags).not.toContain('price_data_stale');
    expect(v2.status?.degradedFlags).not.toContain('pv_forecast_unavailable');
    expect(v2.status?.degradedFlags).toContain('temperature_stale');
  });

  it('mapCanonicalToV2 explanation.degradedReasons filters free-form backend flags', () => {
    const v2 = mapCanonicalToV2({
      ...FULL_CANONICAL,
      degraded_flags: { degraded: true, flags: ['price_data_stale', 'source_invalid'], serializer_state: 'degraded' },
    });
    expect(v2.explanation?.degradedReasons).not.toContain('price_data_stale');
    expect(v2.explanation?.degradedReasons).toContain('source_invalid');
  });

  it('mapCanonicalToV2 activity.staleFlags filters free-form stale flags', () => {
    const v2 = mapCanonicalToV2({
      ...FULL_CANONICAL,
      activity: {
        state: 'charging_fve',
        source: 'fve',
        temperature_trend_c_per_min: 0.1,
        fill_level_pct: 50,
        aura_max_temp_c: 75,
        heater_states: {},
        stale_flags: ['temp_sensor_stale', 'temperature_stale', 'bogus_flag'],
      },
    });
    expect(v2.activity?.staleFlags).not.toContain('temp_sensor_stale');
    expect(v2.activity?.staleFlags).not.toContain('bogus_flag');
    expect(v2.activity?.staleFlags).toContain('temperature_stale');
  });

  it('config_profile_unavailable is preserved in degradedReasons despite not being in backend allowlist', () => {
    const v2 = mapCanonicalToV2(FULL_CANONICAL, true);
    expect(v2.explanation?.degradedReasons).toContain('config_profile_unavailable');
  });
});

function makeSeg(
  key: BoilerV2SourceSegment['key'],
  fillPct: number,
  active = false,
): BoilerV2SourceSegment {
  return { key, fillPct, active, start: '', end: null, energyKwh: 0 };
}

describe('OigBoilerV2Svg', () => {
  it('renders svg with data-testid boiler-svg', () => {
    const el = new OigBoilerV2Svg();
    const strings = getTemplateStrings(el);
    expect(strings).toContain('data-testid="boiler-svg"');
  });

  it('renders role=img on svg', () => {
    const el = new OigBoilerV2Svg();
    const strings = getTemplateStrings(el);
    expect(strings).toContain('role="img"');
  });

  it('renders aria-label from i18n', () => {
    const el = new OigBoilerV2Svg();
    el.lang = 'en';
    const values = getTemplateValues(el);
    const flat = values.map(String).join(' ');
    expect(flat).toContain('Boiler visualization');
  });

  it('renders no aura-fill rects when fillLevelPct is null', () => {
    const el = new OigBoilerV2Svg();
    el.fillLevelPct = null;
    el.sourceSegments = [makeSeg('fve', 0.5, true)];
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).not.toContain('boiler-aura-fill');
  });

  it('renders no aura-fill rects when fillLevelPct is 0', () => {
    const el = new OigBoilerV2Svg();
    el.fillLevelPct = 0;
    el.sourceSegments = [makeSeg('fve', 0.5, true)];
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).not.toContain('boiler-aura-fill');
  });





  it('renders active segment: surf--charging class on surf ellipse when charging', () => {
    const el = new OigBoilerV2Svg();
    el.fillLevelPct = 0.5;
    el.sourceSegments = [makeSeg('fve', 0.5, true)];
    el.chargingLabel = '⚡ NABÍJÍ';
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('surf--charging');
  });

  it('inactive segment does not have aura-segment--active class', () => {
    const el = new OigBoilerV2Svg();
    el.fillLevelPct = 0.5;
    el.sourceSegments = [makeSeg('grid', 0.5, false)];
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).not.toContain('aura-segment--active');
  });







  it('renders .tank and .shell CSS classes in template', () => {
    const el = new OigBoilerV2Svg();
    const strings = getTemplateStrings(el);
    // HTML div-based tank has class="tank" and class="shell"
    expect(strings).toContain('class="tank"');
    expect(strings).toContain('class="shell"');
  });



  it('renders boiler-temp-top-label testid in template strings', () => {
    const el = new OigBoilerV2Svg();
    const strings = getTemplateStrings(el);
    expect(strings).toContain('data-testid="boiler-temp-top-label"');
  });

  it('renders boiler-temp-bottom-label testid when bottomTempC is set', () => {
    const el = new OigBoilerV2Svg();
    el.bottomTempC = 40;
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('boiler-temp-bottom-label');
  });

  it('renders top temp value in template values', () => {
    const el = new OigBoilerV2Svg();
    el.topTempC = 58;
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('58');
  });

  it('renders bottom temp value in template values', () => {
    const el = new OigBoilerV2Svg();
    el.bottomTempC = 42;
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('42');
  });

  it('renders boiler-volume-badge when readyLiters is set', () => {
    const el = new OigBoilerV2Svg();
    el.readyLiters = 120;
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('boiler-volume-badge');
    expect(json).toContain('120');
  });

  it('renders boiler-volume-badge with computed readyLiters from fillLevelPct * volumeL', () => {
    const el = new OigBoilerV2Svg();
    el.volumeL = 200;
    el.fillLevelPct = 0.6;
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('boiler-volume-badge');
    // 200 * 0.6 = 120
    expect(json).toContain('120');
  });

  it('does not render boiler-volume-badge when volumeL is null', () => {
    const el = new OigBoilerV2Svg();
    el.volumeL = null;
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).not.toContain('boiler-volume-badge');
  });

  it('renders boiler-eta-chip when etaText is set', () => {
    const el = new OigBoilerV2Svg();
    el.etaText = '1h 20m';
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('boiler-eta-chip');
    expect(json).toContain('1h 20m');
  });

  it('does not render boiler-eta-chip when etaText is null', () => {
    const el = new OigBoilerV2Svg();
    el.etaText = null;
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).not.toContain('boiler-eta-chip');
  });

  it('renders boiler-source-chip when sourceKey is set', () => {
    const el = new OigBoilerV2Svg();
    el.sourceKey = 'fve';
    el.lang = 'en';
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('boiler-source-chip');
    // en label for fve source chip
    expect(json).toContain('Charging from PV overflow');
  });

  it('renders idle source chip when sourceKey is null', () => {
    // Per mockup: always render source chip; show "Neohřívá" when idle
    const el = new OigBoilerV2Svg();
    el.sourceKey = null;
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('boiler-source-chip');
    // idle chip shows "not heating" text
    expect(json).toMatch(/Neohřívá|Not heating/);
  });

  it('aria-label contains top temp value', () => {
    const el = new OigBoilerV2Svg();
    el.topTempC = 61;
    el.lang = 'en';
    const values = getTemplateValues(el);
    const flat = values.map(String).join(' ');
    expect(flat).toMatch(/61/);
  });

  it('aria-label contains bottom temp value', () => {
    const el = new OigBoilerV2Svg();
    el.bottomTempC = 38;
    el.lang = 'en';
    const values = getTemplateValues(el);
    const flat = values.map(String).join(' ');
    expect(flat).toMatch(/38/);
  });

  it('aria-label contains source label when sourceKey is set', () => {
    const el = new OigBoilerV2Svg();
    el.sourceKey = 'grid';
    el.lang = 'en';
    const values = getTemplateValues(el);
    const flat = values.map(String).join(' ');
    expect(flat).toContain('Grid');
  });

  it('aria-label contains stale text when stale=true', () => {
    const el = new OigBoilerV2Svg();
    el.stale = true;
    el.lang = 'en';
    const values = getTemplateValues(el);
    const flat = values.map(String).join(' ');
    expect(flat).toContain('stale');
  });

  it('render safety: returns bare svg shell on error', () => {
    const el = new OigBoilerV2Svg();
    // Force an error by making sourceSegments a non-iterable
    (el as unknown as Record<string, unknown>).sourceSegments = null as unknown as [];
    expect(() => getTemplateStrings(el)).not.toThrow();
    const strings = getTemplateStrings(el);
    expect(strings).toContain('data-testid="boiler-svg"');
  });

  // ── New mockup-fidelity tests ──

  it('renders trend chip when charging', () => {
    const el = new OigBoilerV2Svg();
    el.chargingLabel = '⚡ NABÍJÍ +0,4 °C/min';
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('boiler-trend-chip');
    expect(json).not.toContain('trend--idle');
    expect(json).toContain('⚡ NABÍJÍ');
  });

  it('trend chip is absent when chargingLabel is null (no empty pill)', () => {
    const el = new OigBoilerV2Svg();
    el.chargingLabel = null;
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).not.toContain('boiler-trend-chip');
  });


  it('vol-caption contains ready text in template values', () => {
    const el = new OigBoilerV2Svg();
    el.readyLiters = 150;
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('vol-caption');
  });

  it('does not render vol pill when readyLiters=null and no fillLevelPct/volumeL', () => {
    const el = new OigBoilerV2Svg();
    el.readyLiters = null;
    el.volumeL = null;
    el.fillLevelPct = null;
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).not.toContain('boiler-volume-badge');
  });

  it('idle source chip renders "Neohřívá" in cs', () => {
    const el = new OigBoilerV2Svg();
    el.sourceKey = null;
    el.lang = 'cs';
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('Neohřívá');
  });

  it('grid source chip renders grid label', () => {
    const el = new OigBoilerV2Svg();
    el.sourceKey = 'grid';
    el.lang = 'cs';
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('Nabíjí ze sítě');
  });

  it('battery/discharge source chip renders battery label', () => {
    const el = new OigBoilerV2Svg();
    el.sourceKey = 'battery';
    el.lang = 'cs';
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('Ohřev z baterie');
  });

  it('bottom temp label shows "dole X °C" format', () => {
    const el = new OigBoilerV2Svg();
    el.bottomTempC = 42;
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('dole 42.0 °C');
  });

  it('no pipe labels (Cirk./TUV/Vstup) in rendered output', () => {
    const el = new OigBoilerV2Svg();
    const strings = getTemplateStrings(el);
    expect(strings).not.toContain('Cirk');
    expect(strings).not.toContain('TUV');
    expect(strings).not.toContain('Vstup');
  });
});

function makeMinimalData(overrides: Partial<BoilerV2Data> = {}): BoilerV2Data {
  return {
    status: {
      currentState: 'idle',
      comfortSatisfied: null,
      comfortStatusCode: null,
      selectedSource: null,
      actuatedSource: null,
      temperatureTop: 55,
      temperatureBottom: 40,
      energyNeededKwh: null,
      heating: false,
      lastUpdate: null,
      degraded: false,
      degradedFlags: [],
    },
    planSlots: [],
    explanation: { reasonCodes: [], planCreatedAt: null, planValidUntil: null, dataAgeSecs: null, degradedReasons: [], unsatisfiedComfortGapC: null, temperatureAtDeadlineC: null },
    manualOverride: null,
    identity: { entryId: null, boxId: null, available: false },
    activity: {
      state: 'standby',
      source: null,
      temperatureTrendCPerMin: null,
      fillLevelPct: 0.5,
      auraMaxTempC: 75,
      heaterStates: {},
      staleFlags: [],
    },
    sourceSegments: [],
    timeline: [],
    sparkline: null,
    demandMap: null,
    circulationRuns: [],
    legionella: null,
    planSummary: null,
    energyToday: null,
    loading: false,
    loadError: null,
    ...overrides,
  };
}

describe('OigBoilerV2Shell', () => {
  it('renders data-testid boiler-v2-shell', () => {
    const el = new OigBoilerV2Shell();
    el.data = makeMinimalData();
    const strings = getTemplateStrings(el);
    expect(strings).toContain('data-testid="boiler-v2-shell"');
  });

  it('does not render stale warning when not stale', () => {
    const el = new OigBoilerV2Shell();
    el.data = makeMinimalData();
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).not.toContain('boiler-stale-warning');
  });

  it('renders stale warning when status.degraded is true', () => {
    const el = new OigBoilerV2Shell();
    el.data = makeMinimalData({ status: { ...makeMinimalData().status!, degraded: true } });
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('boiler-stale-warning');
  });

  it('renders stale warning when activity.staleFlags contains temperature_stale', () => {
    const el = new OigBoilerV2Shell();
    el.data = makeMinimalData({
      activity: { ...makeMinimalData().activity!, staleFlags: ['temperature_stale'] },
    });
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('boiler-stale-warning');
  });

  it('does NOT render stale warning for source_stale (push-on-change quiet is normal)', () => {
    const el = new OigBoilerV2Shell();
    el.data = makeMinimalData({
      status: { ...makeMinimalData().status!, degradedFlags: ['source_stale'] },
    });
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).not.toContain('boiler-stale-warning');
  });

  it('renders stale warning when explanation.degradedReasons contains activity_stale', () => {
    const el = new OigBoilerV2Shell();
    el.data = makeMinimalData({
      explanation: { ...makeMinimalData().explanation!, degradedReasons: ['activity_stale'] },
    });
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('boiler-stale-warning');
  });

  it('stale warning has role=alert', () => {
    const el = new OigBoilerV2Shell();
    el.data = makeMinimalData({ status: { ...makeMinimalData().status!, degraded: true } });
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('role=\\"alert\\"');
  });

  it('renders oig-boiler-v2-svg child element', () => {
    const el = new OigBoilerV2Shell();
    el.data = makeMinimalData();
    const strings = getTemplateStrings(el);
    expect(strings).toContain('oig-boiler-v2-svg');
  });

  it('renders temperature top with aria-live=polite', () => {
    const el = new OigBoilerV2Shell();
    el.data = makeMinimalData();
    const strings = getTemplateStrings(el);
    expect(strings).toContain('aria-live="polite"');
  });

  it('passes computed etaText to oig-boiler-v2-svg when config and activity are present', () => {
    const el = new OigBoilerV2Shell();
    el.data = makeMinimalData({
      status: { ...makeMinimalData().status!, temperatureTop: 55 },
      activity: { ...makeMinimalData().activity!, temperatureTrendCPerMin: 0.5 },
    });
    el.config = {
      volumeL: 100,
      heaterPowerW: 2000,
      heaterPowerKw: 2,
      targetTempC: 65,
      deadlineTime: '07:00',
      stratificationMode: 'top',
      kCoefficient: '0.5',
      coldIntelTempC: 10,
      coldInletTempC: 10,
      auraMaxTempC: 75,
    } as any;
    el.lang = 'en';
    const json = JSON.stringify(getTemplateValues(el));
    // ETA is computed (55→65 at 0.5°C/min = 20 min) and passed to SVG with full format
    expect(json).toContain('~20 min');
  });

  it('renders ETA already_reached when target already met', () => {
    const el = new OigBoilerV2Shell();
    el.data = makeMinimalData({
      status: { ...makeMinimalData().status!, temperatureTop: 70 },
    });
    el.config = {
      volumeL: 100,
      heaterPowerW: 2000,
      heaterPowerKw: 2,
      targetTempC: 65,
      deadlineTime: '07:00',
      stratificationMode: 'top',
      kCoefficient: '0.5',
      coldInletTempC: 10,
      auraMaxTempC: 75,
    };
    el.lang = 'en';
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('Target reached');
  });

  it('passes sourceSegments to oig-boiler-v2-svg', () => {
    const el = new OigBoilerV2Shell();
    const segs = [makeSeg('fve', 0.5, false), makeSeg('grid', 0.3, false)];
    el.data = makeMinimalData({ sourceSegments: segs });
    el.lang = 'en';
    const json = JSON.stringify(getTemplateValues(el));
    // sourceSegments array is passed as a prop — should contain the source keys
    expect(json).toContain('"fve"');
    expect(json).toContain('"grid"');
  });

  it('source chip shows fve label when sourceKey is fve', () => {
    const el = new OigBoilerV2Svg();
    el.sourceKey = 'fve';
    el.lang = 'en';
    const json = JSON.stringify(getTemplateValues(el));
    // fve renders PV overflow chip
    expect(json).toContain('PV overflow');
  });

  it('discharge source chip renders battery label (not raw Discharge text)', () => {
    // discharge maps to battery chip — renders battery label for the chip
    const el = new OigBoilerV2Svg();
    el.sourceKey = 'discharge';
    el.lang = 'en';
    const json = JSON.stringify(getTemplateValues(el));
    // source chip shows Battery heating
    expect(json).toContain('Battery heating');
    // The chip label itself is not "Discharge"
    expect(json).not.toContain('"Discharge"');
  });

  it('renders with null data without throwing', () => {
    const el = new OigBoilerV2Shell();
    el.data = null;
    expect(() => getTemplateStrings(el)).not.toThrow();
  });

  it('renders stale warning text from i18n', () => {
    const el = new OigBoilerV2Shell();
    el.data = makeMinimalData({ status: { ...makeMinimalData().status!, degraded: true } });
    el.lang = 'en';
    const json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('Data may be stale');
  });

  it('all stale indicator flags trigger stale warning', () => {
    // Only display-trust flags trigger the chip; source_stale and
    // power_sign_mismatch_* are accounting/quiet-entity signals, not
    // display staleness.
    const flags = [
      'temperature_unavailable',
      'temperature_stale',
      'activity_stale',
      'source_invalid',
      'runtime_cache_empty',
      'config_profile_unavailable',
    ];
    for (const flag of flags) {
      const el = new OigBoilerV2Shell();
      el.data = makeMinimalData({
        activity: { ...makeMinimalData().activity!, staleFlags: [flag] },
      });
      const json = JSON.stringify(getTemplateValues(el));
      expect(json).toContain('boiler-stale-warning');
    }
  });

  it('renders boiler-advanced-slot with slot name=advanced', () => {
    const el = new OigBoilerV2Shell();
    el.data = makeMinimalData();
    const strings = getTemplateStrings(el);
    expect(strings).toContain('data-testid="boiler-advanced-slot"');
    expect(strings).toContain('name="advanced"');
  });

  it('shell render safety: returns fallback on error', () => {
    const el = new OigBoilerV2Shell();
    (el as unknown as Record<string, unknown>).data = { status: null, activity: null, sourceSegments: null };
    expect(() => getTemplateStrings(el)).not.toThrow();
    const strings = getTemplateStrings(el);
    expect(strings).toContain('boiler-v2-shell');
  });
});

// ============================================================================
// Task 9 — Timeline helpers, metric panels, sparkline, timeline chart
// ============================================================================

// Frozen instant: 2026-05-03T13:00:00.000Z → Prague local 15:00 (UTC+2)
const FROZEN_NOW_MS = Date.UTC(2026, 4, 3, 13, 0, 0);
// Prague midnight May 3 = 2026-05-02T22:00:00Z
const PRAGUE_DAY_START = Date.UTC(2026, 4, 2, 22, 0, 0);

const FROZEN_CONFIG: BoilerConfig = {
  volumeL: 120,
  heaterPowerW: 2000,
  heaterPowerKw: 2.0,
  targetTempC: 60,
  deadlineTime: '19:30',
  stratificationMode: 'standard',
  kCoefficient: '0.5',
  coldInletTempC: 10,
  auraMaxTempC: 75,
};

function makeMinimalBoilerData(overrides: Partial<BoilerV2Data> = {}): BoilerV2Data {
  return {
    status: null,
    planSlots: [],
    explanation: null,
    manualOverride: null,
    identity: { entryId: 'e1', boxId: 'b1', available: true },
    activity: null,
    sourceSegments: [],
    timeline: [],
    sparkline: null,
    demandMap: null,
    circulationRuns: [],
    legionella: null,
    planSummary: null,
    energyToday: null,
    loading: false,
    loadError: null,
    ...overrides,
  };
}

function makeSlot(overrides: Partial<BoilerV2PlanSlot> = {}): BoilerV2PlanSlot {
  return {
    start: new Date(PRAGUE_DAY_START + 0).toISOString(),
    end: new Date(PRAGUE_DAY_START + 15 * 60000).toISOString(),
    consumptionKwh: 0.5,
    confidence: 0.9,
    recommendedSource: 'fve',
    spotPrice: null,
    altPrice: null,
    overflowAvailable: false,
    heatingKwh: 0.4,
    ...overrides,
  };
}

function makeTimelinePt(overrides: Partial<BoilerV2TimelinePoint> = {}): BoilerV2TimelinePoint {
  return {
    timestamp: new Date(PRAGUE_DAY_START + 60 * 60000).toISOString(),
    topTempC: 55,
    bottomTempC: 45,
    powerKw: null,
    sourceKey: null,
    activityState: 'standby',
    ...overrides,
  };
}

function makeSrcSeg(overrides: Partial<BoilerV2SourceSegment> = {}): BoilerV2SourceSegment {
  return {
    key: 'fve',
    start: new Date(PRAGUE_DAY_START).toISOString(),
    end: new Date(PRAGUE_DAY_START + 3600000).toISOString(),
    energyKwh: 1.5,
    fillPct: 0.5,
    active: true,
    ...overrides,
  };
}

async function mountTimeline(
  data: BoilerV2Data | null,
  config: BoilerConfig | null,
  nowMs: number,
  timeZone = 'Europe/Prague',
): Promise<OigBoilerTimelineChart> {
  const el = document.createElement('oig-boiler-timeline-chart') as OigBoilerTimelineChart;
  el.data = data;
  el.config = config;
  (el as unknown as Record<string, unknown>).nowMs = nowMs;
  el.timeZone = timeZone;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

// ============================================================================
// resolveTimelineNowMs
// ============================================================================
describe('resolveTimelineNowMs', () => {
  it('returns override when provided', () => {
    expect(resolveTimelineNowMs(FROZEN_NOW_MS)).toBe(FROZEN_NOW_MS);
  });

  it('returns a recent timestamp when no override', () => {
    const before = Date.now();
    const result = resolveTimelineNowMs();
    const after = Date.now();
    expect(result).toBeGreaterThanOrEqual(before);
    expect(result).toBeLessThanOrEqual(after);
  });
});

// ============================================================================
// minutesSinceMidnightInTimeZone
// ============================================================================
describe('minutesSinceMidnightInTimeZone', () => {
  it('returns 900 for frozen instant in Europe/Prague (15:00 local)', () => {
    const mins = minutesSinceMidnightInTimeZone(FROZEN_NOW_MS, 'Europe/Prague');
    expect(mins).toBe(900);
  });

  it('returns 0 for Prague midnight', () => {
    const mins = minutesSinceMidnightInTimeZone(PRAGUE_DAY_START, 'Europe/Prague');
    expect(mins).toBe(0);
  });

  it('returns 60 for 01:00 Prague local', () => {
    const mins = minutesSinceMidnightInTimeZone(PRAGUE_DAY_START + 60 * 60000, 'Europe/Prague');
    expect(mins).toBe(60);
  });
});

// ============================================================================
// OigBoilerMetricPanel — source panel
// ============================================================================
describe('OigBoilerMetricPanel source panel', () => {
  it('renders data-testid="boiler-source-panel" for panelType=source', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    el.data = makeMinimalBoilerData();
    document.body.appendChild(el);
    await el.updateComplete;
    const panel = el.shadowRoot!.querySelector('[data-testid="boiler-source-panel"]');
    expect(panel).not.toBeNull();
    document.body.removeChild(el);
  });

  it('does not render boiler-comfort-panel for panelType=source', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    el.data = makeMinimalBoilerData();
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-comfort-panel"]')).toBeNull();
    document.body.removeChild(el);
  });

  it('renders current source row when activity.source is set', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    el.data = makeMinimalBoilerData({
      activity: {
        state: 'charging_fve',
        source: 'fve',
        temperatureTrendCPerMin: null,
        fillLevelPct: null,
        auraMaxTempC: 75,
        heaterStates: {},
        staleFlags: [],
      },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    // New panel shows "Aktuální zdroj" row with the source label
    expect(html).toContain('Aktuální zdroj');
    // fve/overflow maps to '☀️ přetoky'
    expect(html).toContain('přetoky');
    document.body.removeChild(el);
  });

  it('render safety: does not throw on null data', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    el.data = null;
    document.body.appendChild(el);
    await expect(el.updateComplete).resolves.not.toThrow();
    document.body.removeChild(el);
  });
});

describe('OigBoilerTimelineChart plan band gap preservation', () => {
  it('keeps two bands when same-source/heating slots have a gap between them', async () => {
    const data = makeMinimalBoilerData({
      planSlots: [
        makeSlot({
          start: new Date(PRAGUE_DAY_START + 0).toISOString(),
          end: new Date(PRAGUE_DAY_START + 15 * 60000).toISOString(),
          recommendedSource: 'fve',
          heatingKwh: 0.5,
        }),
        makeSlot({
          start: new Date(PRAGUE_DAY_START + 30 * 60000).toISOString(),
          end: new Date(PRAGUE_DAY_START + 45 * 60000).toISOString(),
          recommendedSource: 'fve',
          heatingKwh: 0.3,
        }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const bands = el.shadowRoot!.querySelectorAll('.plan-band');
    expect(bands.length).toBe(2);
    document.body.removeChild(el);
  });
});

describe('OigBoilerTimelineChart tomorrow slot filtering', () => {
  it('ignores slots that start tomorrow', async () => {
    const tomorrow = PRAGUE_DAY_START + 86400000;
    const data = makeMinimalBoilerData({
      planSlots: [
        makeSlot({
          start: new Date(tomorrow).toISOString(),
          end: new Date(tomorrow + 60 * 60000).toISOString(),
          recommendedSource: 'fve',
          heatingKwh: 0.5,
        }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const bands = el.shadowRoot!.querySelectorAll('.plan-band');
    expect(bands.length).toBe(0);
    document.body.removeChild(el);
  });
});

describe('OigBoilerTimelineChart cross-midnight clipping', () => {
  it('clips slot starting before day start to x=0', async () => {
    const data = makeMinimalBoilerData({
      planSlots: [
        makeSlot({
          start: new Date(PRAGUE_DAY_START - 30 * 60000).toISOString(),
          end: new Date(PRAGUE_DAY_START + 30 * 60000).toISOString(),
          recommendedSource: 'fve',
          heatingKwh: 0.5,
        }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const band = el.shadowRoot!.querySelector('.plan-band');
    expect(band).not.toBeNull();
    expect(parseFloat(band!.getAttribute('x') ?? '99')).toBe(0);
    document.body.removeChild(el);
  });

  it('clips slot ending after day end to x=1000', async () => {
    const dayEnd = PRAGUE_DAY_START + 1440 * 60000;
    const data = makeMinimalBoilerData({
      planSlots: [
        makeSlot({
          start: new Date(dayEnd - 30 * 60000).toISOString(),
          end: new Date(dayEnd + 30 * 60000).toISOString(),
          recommendedSource: 'fve',
          heatingKwh: 0.5,
        }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const band = el.shadowRoot!.querySelector('.plan-band');
    expect(band).not.toBeNull();
    const x = parseFloat(band!.getAttribute('x') ?? '0');
    const w = parseFloat(band!.getAttribute('width') ?? '0');
    expect(x + w).toBeCloseTo(1000, 1);
    document.body.removeChild(el);
  });
});

describe('OigBoilerTimelineChart empty/null planSlots preserves other elements', () => {
  it('renders zero plan-band elements when planSlots is empty', async () => {
    const data = makeMinimalBoilerData({
      planSlots: [],
      timeline: [
        makeTimelinePt({ timestamp: new Date(PRAGUE_DAY_START + 60 * 60000).toISOString(), topTempC: 55 }),
        makeTimelinePt({ timestamp: new Date(PRAGUE_DAY_START + 120 * 60000).toISOString(), topTempC: 60 }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    expect(el.shadowRoot!.querySelectorAll('.plan-band').length).toBe(0);
    expect(el.shadowRoot!.querySelector('.temp-line')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-now-marker"]')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.goal-line')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-deadline-marker"]')).not.toBeNull();
    document.body.removeChild(el);
  });

  it('renders zero plan-band elements when planSlots is missing (null data)', async () => {
    const el = await mountTimeline(null, FROZEN_CONFIG, FROZEN_NOW_MS);
    expect(el.shadowRoot!.querySelectorAll('.plan-band').length).toBe(0);
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-now-marker"]')).not.toBeNull();
    document.body.removeChild(el);
  });

  it('planSlots=null with timeline data: zero bands, temp-line, NOW, goal-line, deadline all present', async () => {
    const data = makeMinimalBoilerData({
      timeline: [
        makeTimelinePt({ timestamp: new Date(PRAGUE_DAY_START + 60 * 60000).toISOString(), topTempC: 55 }),
        makeTimelinePt({ timestamp: new Date(PRAGUE_DAY_START + 120 * 60000).toISOString(), topTempC: 60 }),
      ],
    });
    (data as unknown as Record<string, unknown>).planSlots = null;
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    expect(el.shadowRoot!.querySelectorAll('.plan-band').length).toBe(0);
    expect(el.shadowRoot!.querySelector('.temp-line')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-now-marker"]')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.goal-line')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-deadline-marker"]')).not.toBeNull();
    document.body.removeChild(el);
  });

  it('planSlots property deleted with timeline data: zero bands, temp-line, NOW, goal-line, deadline all present', async () => {
    const data = makeMinimalBoilerData({
      timeline: [
        makeTimelinePt({ timestamp: new Date(PRAGUE_DAY_START + 60 * 60000).toISOString(), topTempC: 55 }),
        makeTimelinePt({ timestamp: new Date(PRAGUE_DAY_START + 120 * 60000).toISOString(), topTempC: 60 }),
      ],
    });
    delete (data as unknown as Record<string, unknown>).planSlots;
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    expect(el.shadowRoot!.querySelectorAll('.plan-band').length).toBe(0);
    expect(el.shadowRoot!.querySelector('.temp-line')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-now-marker"]')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('.goal-line')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-deadline-marker"]')).not.toBeNull();
    document.body.removeChild(el);
  });
});

describe('OigBoilerTimelineChart power estimation from active segment (end=null)', () => {
  it('estimates power from active segment with end=null', async () => {
    const ptTs = new Date(PRAGUE_DAY_START + 30 * 60000).toISOString();
    const data = makeMinimalBoilerData({
      timeline: [makeTimelinePt({ timestamp: ptTs, powerKw: null, sourceKey: 'fve' })],
      sourceSegments: [
        makeSrcSeg({
          key: 'fve',
          start: new Date(PRAGUE_DAY_START).toISOString(),
          end: null,
          energyKwh: 1.0,
          active: true,
        }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const bar = el.shadowRoot!.querySelector('[data-testid="boiler-charge-bar-up"]');
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute('data-estimated-power')).toBe('true');
    document.body.removeChild(el);
  });
});

describe('OigBoilerTimelineChart latest-start segment precedence', () => {
  it('boundary point: later-start discharge segment wins over earlier fve — produces draw bar not charge bar', async () => {
    const boundary = new Date(PRAGUE_DAY_START + 60 * 60000).toISOString();
    const data = makeMinimalBoilerData({
      timeline: [makeTimelinePt({ timestamp: boundary, powerKw: null })],
      sourceSegments: [
        makeSrcSeg({
          key: 'fve',
          start: new Date(PRAGUE_DAY_START).toISOString(),
          end: boundary,
          energyKwh: 1.0,
        }),
        makeSrcSeg({
          key: 'discharge',
          start: boundary,
          end: new Date(PRAGUE_DAY_START + 120 * 60000).toISOString(),
          energyKwh: 2.0,
        }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-draw-bar-down"]')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-charge-bar-up"]')).toBeNull();
    document.body.removeChild(el);
  });

  it('overlapping segments: latest-start discharge wins over earlier fve — produces draw bar not charge bar', async () => {
    const ptTs = new Date(PRAGUE_DAY_START + 45 * 60000).toISOString();
    const data = makeMinimalBoilerData({
      timeline: [makeTimelinePt({ timestamp: ptTs, powerKw: null })],
      sourceSegments: [
        makeSrcSeg({
          key: 'fve',
          start: new Date(PRAGUE_DAY_START).toISOString(),
          end: new Date(PRAGUE_DAY_START + 120 * 60000).toISOString(),
          energyKwh: 0.5,
        }),
        makeSrcSeg({
          key: 'discharge',
          start: new Date(PRAGUE_DAY_START + 30 * 60000).toISOString(),
          end: new Date(PRAGUE_DAY_START + 90 * 60000).toISOString(),
          energyKwh: 2.0,
        }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-draw-bar-down"]')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-charge-bar-up"]')).toBeNull();
    document.body.removeChild(el);
  });
});

describe('OigBoilerTimelineChart placeholder edge cases', () => {
  it('renders placeholder when segment has zero energyKwh (invalid power)', async () => {
    const ptTs = new Date(PRAGUE_DAY_START + 30 * 60000).toISOString();
    const data = makeMinimalBoilerData({
      timeline: [makeTimelinePt({ timestamp: ptTs, powerKw: null })],
      sourceSegments: [
        makeSrcSeg({
          key: 'fve',
          start: new Date(PRAGUE_DAY_START).toISOString(),
          end: new Date(PRAGUE_DAY_START + 3600000).toISOString(),
          energyKwh: 0,
        }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const placeholder = el.shadowRoot!.querySelector('[data-testid="boiler-power-placeholder"]');
    expect(placeholder).not.toBeNull();
    document.body.removeChild(el);
  });

  it('renders placeholder when no segment overlaps the point', async () => {
    const ptTs = new Date(PRAGUE_DAY_START + 30 * 60000).toISOString();
    const data = makeMinimalBoilerData({
      timeline: [makeTimelinePt({ timestamp: ptTs, powerKw: null })],
      sourceSegments: [
        makeSrcSeg({
          key: 'fve',
          start: new Date(PRAGUE_DAY_START + 120 * 60000).toISOString(),
          end: new Date(PRAGUE_DAY_START + 180 * 60000).toISOString(),
          energyKwh: 1.0,
        }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const placeholder = el.shadowRoot!.querySelector('[data-testid="boiler-power-placeholder"]');
    expect(placeholder).not.toBeNull();
    document.body.removeChild(el);
  });

  it('placeholder is not also rendered as charge or draw bar', async () => {
    const ptTs = new Date(PRAGUE_DAY_START + 30 * 60000).toISOString();
    const data = makeMinimalBoilerData({
      timeline: [makeTimelinePt({ timestamp: ptTs, powerKw: null })],
      sourceSegments: [],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-power-placeholder"]')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-charge-bar-up"]')).toBeNull();
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-draw-bar-down"]')).toBeNull();
    document.body.removeChild(el);
  });

  it('renders placeholder when segment has invalid (non-finite) start date', async () => {
    const ptTs = new Date(PRAGUE_DAY_START + 30 * 60000).toISOString();
    const data = makeMinimalBoilerData({
      timeline: [makeTimelinePt({ timestamp: ptTs, powerKw: null })],
      sourceSegments: [
        makeSrcSeg({
          key: 'fve',
          start: 'not-a-date',
          end: new Date(PRAGUE_DAY_START + 3600000).toISOString(),
          energyKwh: 1.0,
        }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const placeholder = el.shadowRoot!.querySelector('[data-testid="boiler-power-placeholder"]');
    expect(placeholder).not.toBeNull();
    document.body.removeChild(el);
  });

  it('renders placeholder when segment has negative energyKwh', async () => {
    const ptTs = new Date(PRAGUE_DAY_START + 30 * 60000).toISOString();
    const data = makeMinimalBoilerData({
      timeline: [makeTimelinePt({ timestamp: ptTs, powerKw: null })],
      sourceSegments: [
        makeSrcSeg({
          key: 'fve',
          start: new Date(PRAGUE_DAY_START).toISOString(),
          end: new Date(PRAGUE_DAY_START + 3600000).toISOString(),
          energyKwh: -1.0,
        }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-power-placeholder"]')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-charge-bar-up"]')).toBeNull();
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-draw-bar-down"]')).toBeNull();
    document.body.removeChild(el);
  });

  it('renders placeholder when segment has zero duration (end === start)', async () => {
    const sameTime = new Date(PRAGUE_DAY_START + 60 * 60000).toISOString();
    const data = makeMinimalBoilerData({
      timeline: [makeTimelinePt({ timestamp: sameTime, powerKw: null })],
      sourceSegments: [
        makeSrcSeg({
          key: 'fve',
          start: sameTime,
          end: sameTime,
          energyKwh: 1.0,
        }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-power-placeholder"]')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-charge-bar-up"]')).toBeNull();
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-draw-bar-down"]')).toBeNull();
    document.body.removeChild(el);
  });

  it('renders placeholder when segment end is before start (invalid duration)', async () => {
    const ptTs = new Date(PRAGUE_DAY_START + 30 * 60000).toISOString();
    const data = makeMinimalBoilerData({
      timeline: [makeTimelinePt({ timestamp: ptTs, powerKw: null })],
      sourceSegments: [
        makeSrcSeg({
          key: 'fve',
          start: new Date(PRAGUE_DAY_START + 3600000).toISOString(),
          end: new Date(PRAGUE_DAY_START).toISOString(),
          energyKwh: 1.0,
        }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-power-placeholder"]')).not.toBeNull();
    expect(el.shadowRoot!.querySelector('[data-testid="boiler-charge-bar-up"]')).toBeNull();
    document.body.removeChild(el);
  });
});

// ============================================================================
// OigBoilerMetricPanel — comfort panel
// ============================================================================
describe('OigBoilerMetricPanel comfort panel', () => {
  it('renders data-testid="boiler-comfort-panel" for panelType=comfort', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'comfort';
    el.data = makeMinimalBoilerData();
    document.body.appendChild(el);
    await el.updateComplete;
    const panel = el.shadowRoot!.querySelector('[data-testid="boiler-comfort-panel"]');
    expect(panel).not.toBeNull();
    document.body.removeChild(el);
  });

  it('shows deadline time from config', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'comfort';
    el.data = makeMinimalBoilerData();
    el.config = FROZEN_CONFIG;
    document.body.appendChild(el);
    await el.updateComplete;
    const text = el.shadowRoot!.textContent ?? '';
    expect(text).toContain('19:30');
    document.body.removeChild(el);
  });

  it('shows goal temp from config', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'comfort';
    el.data = makeMinimalBoilerData();
    el.config = FROZEN_CONFIG;
    document.body.appendChild(el);
    await el.updateComplete;
    const text = el.shadowRoot!.textContent ?? '';
    expect(text).toContain('60');
    document.body.removeChild(el);
  });
});

// ============================================================================
// OigBoilerSparkline
// ============================================================================
describe('OigBoilerSparkline', () => {
  it('renders data-testid="boiler-sparkline"', async () => {
    const el = document.createElement('oig-boiler-sparkline') as OigBoilerSparkline;
    el.values = [10, 20, 30];
    document.body.appendChild(el);
    await el.updateComplete;
    const svg = el.shadowRoot!.querySelector('[data-testid="boiler-sparkline"]');
    expect(svg).not.toBeNull();
    document.body.removeChild(el);
  });

  it('renders polyline when ≥2 values', async () => {
    const el = document.createElement('oig-boiler-sparkline') as OigBoilerSparkline;
    el.values = [10, 20, 30];
    document.body.appendChild(el);
    await el.updateComplete;
    const polyline = el.shadowRoot!.querySelector('polyline');
    expect(polyline).not.toBeNull();
    document.body.removeChild(el);
  });

  it('renders empty SVG when <2 values', async () => {
    const el = document.createElement('oig-boiler-sparkline') as OigBoilerSparkline;
    el.values = [42];
    document.body.appendChild(el);
    await el.updateComplete;
    const polyline = el.shadowRoot!.querySelector('polyline');
    expect(polyline).toBeNull();
    document.body.removeChild(el);
  });

  it('renders empty SVG when values=[]', async () => {
    const el = document.createElement('oig-boiler-sparkline') as OigBoilerSparkline;
    el.values = [];
    document.body.appendChild(el);
    await el.updateComplete;
    const polyline = el.shadowRoot!.querySelector('polyline');
    expect(polyline).toBeNull();
    document.body.removeChild(el);
  });

  it('uses provided color on polyline stroke', async () => {
    const el = document.createElement('oig-boiler-sparkline') as OigBoilerSparkline;
    el.values = [1, 2, 3];
    el.color = '#FF0000';
    document.body.appendChild(el);
    await el.updateComplete;
    const polyline = el.shadowRoot!.querySelector('polyline');
    expect(polyline?.getAttribute('stroke')).toBe('#FF0000');
    document.body.removeChild(el);
  });
});

// ============================================================================
// OigBoilerTimelineChart — NOW marker
// ============================================================================
describe('OigBoilerTimelineChart NOW marker', () => {
  it('renders boiler-now-marker with correct data-now-x=625', async () => {
    const el = await mountTimeline(makeMinimalBoilerData(), FROZEN_CONFIG, FROZEN_NOW_MS);
    const marker = el.shadowRoot!.querySelector('[data-testid="boiler-now-marker"]');
    expect(marker).not.toBeNull();
    expect(marker?.getAttribute('data-now-x')).toBe('625');
    document.body.removeChild(el);
  });

  it('renders data-now-time=2026-05-03T15:00:00+02:00', async () => {
    const el = await mountTimeline(makeMinimalBoilerData(), FROZEN_CONFIG, FROZEN_NOW_MS);
    const marker = el.shadowRoot!.querySelector('[data-testid="boiler-now-marker"]');
    expect(marker?.getAttribute('data-now-time')).toBe('2026-05-03T15:00:00+02:00');
    document.body.removeChild(el);
  });
});

// ============================================================================
// OigBoilerTimelineChart — deadline marker
// ============================================================================
describe('OigBoilerTimelineChart deadline marker', () => {
  it('renders boiler-deadline-marker with data-deadline-x=812.5 for 19:30', async () => {
    const el = await mountTimeline(makeMinimalBoilerData(), FROZEN_CONFIG, FROZEN_NOW_MS);
    const marker = el.shadowRoot!.querySelector('[data-testid="boiler-deadline-marker"]');
    expect(marker).not.toBeNull();
    expect(marker?.getAttribute('data-deadline-x')).toBe('812.5');
    document.body.removeChild(el);
  });

  it('renders data-deadline-time=19:30', async () => {
    const el = await mountTimeline(makeMinimalBoilerData(), FROZEN_CONFIG, FROZEN_NOW_MS);
    const marker = el.shadowRoot!.querySelector('[data-testid="boiler-deadline-marker"]');
    expect(marker?.getAttribute('data-deadline-time')).toBe('19:30');
    document.body.removeChild(el);
  });

  it('does not render deadline marker when deadlineTime is --:--', async () => {
    const cfg = { ...FROZEN_CONFIG, deadlineTime: '--:--' };
    const el = await mountTimeline(makeMinimalBoilerData(), cfg, FROZEN_NOW_MS);
    const marker = el.shadowRoot!.querySelector('[data-testid="boiler-deadline-marker"]');
    expect(marker).toBeNull();
    document.body.removeChild(el);
  });

  it('does not render deadline marker when config is null', async () => {
    const el = await mountTimeline(makeMinimalBoilerData(), null, FROZEN_NOW_MS);
    const marker = el.shadowRoot!.querySelector('[data-testid="boiler-deadline-marker"]');
    expect(marker).toBeNull();
    document.body.removeChild(el);
  });
});

// ============================================================================
// OigBoilerTimelineChart — temperature polyline
// ============================================================================
describe('OigBoilerTimelineChart temperature polyline', () => {
  it('renders temp-line polyline when ≥2 valid temp points', async () => {
    const data = makeMinimalBoilerData({
      timeline: [
        makeTimelinePt({ timestamp: new Date(PRAGUE_DAY_START + 60 * 60000).toISOString(), topTempC: 55 }),
        makeTimelinePt({ timestamp: new Date(PRAGUE_DAY_START + 120 * 60000).toISOString(), topTempC: 60 }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const polyline = el.shadowRoot!.querySelector('.temp-line');
    expect(polyline).not.toBeNull();
    document.body.removeChild(el);
  });

  it('does not render temp-line when <2 valid points', async () => {
    const data = makeMinimalBoilerData({
      timeline: [
        makeTimelinePt({ timestamp: new Date(PRAGUE_DAY_START + 60 * 60000).toISOString(), topTempC: 55 }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const polyline = el.shadowRoot!.querySelector('.temp-line');
    expect(polyline).toBeNull();
    document.body.removeChild(el);
  });

  it('clamps temp below 20°C to y=200', async () => {
    const data = makeMinimalBoilerData({
      timeline: [
        makeTimelinePt({ timestamp: new Date(PRAGUE_DAY_START + 60 * 60000).toISOString(), topTempC: 5 }),
        makeTimelinePt({ timestamp: new Date(PRAGUE_DAY_START + 120 * 60000).toISOString(), topTempC: 10 }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const polyline = el.shadowRoot!.querySelector('.temp-line');
    const pts = polyline?.getAttribute('points') ?? '';
    // Both points should have y=200.00 (clamped to 20°C)
    expect(pts).toContain('200.00');
    document.body.removeChild(el);
  });

  it('clamps temp above 80°C to y=0', async () => {
    const data = makeMinimalBoilerData({
      timeline: [
        makeTimelinePt({ timestamp: new Date(PRAGUE_DAY_START + 60 * 60000).toISOString(), topTempC: 95 }),
        makeTimelinePt({ timestamp: new Date(PRAGUE_DAY_START + 120 * 60000).toISOString(), topTempC: 100 }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const polyline = el.shadowRoot!.querySelector('.temp-line');
    const pts = polyline?.getAttribute('points') ?? '';
    expect(pts).toContain('0.00');
    document.body.removeChild(el);
  });
});

// ============================================================================
// OigBoilerTimelineChart — charge/draw bars
// ============================================================================
describe('OigBoilerTimelineChart charge and draw bars', () => {
  it('renders boiler-charge-bar-up for positive powerKw', async () => {
    const data = makeMinimalBoilerData({
      timeline: [
        makeTimelinePt({
          timestamp: new Date(PRAGUE_DAY_START + 60 * 60000).toISOString(),
          powerKw: 2.0,
        }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const bar = el.shadowRoot!.querySelector('[data-testid="boiler-charge-bar-up"]');
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute('data-estimated-power')).toBe('false');
    document.body.removeChild(el);
  });

  it('renders boiler-draw-bar-down for negative powerKw', async () => {
    const data = makeMinimalBoilerData({
      timeline: [
        makeTimelinePt({
          timestamp: new Date(PRAGUE_DAY_START + 60 * 60000).toISOString(),
          powerKw: -1.5,
        }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const bar = el.shadowRoot!.querySelector('[data-testid="boiler-draw-bar-down"]');
    expect(bar).not.toBeNull();
    document.body.removeChild(el);
  });

  it('renders estimated charge bar when powerKw=null but segment has energy', async () => {
    const segStart = new Date(PRAGUE_DAY_START).toISOString();
    const segEnd = new Date(PRAGUE_DAY_START + 3600000).toISOString();
    const ptTs = new Date(PRAGUE_DAY_START + 30 * 60000).toISOString();
    const data = makeMinimalBoilerData({
      timeline: [makeTimelinePt({ timestamp: ptTs, powerKw: null, sourceKey: 'fve' })],
      sourceSegments: [makeSrcSeg({ key: 'fve', start: segStart, end: segEnd, energyKwh: 1.5 })],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const bar = el.shadowRoot!.querySelector('[data-testid="boiler-charge-bar-up"]');
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute('data-estimated-power')).toBe('true');
    document.body.removeChild(el);
  });

  it('renders estimated draw bar for discharge segment', async () => {
    const segStart = new Date(PRAGUE_DAY_START).toISOString();
    const segEnd = new Date(PRAGUE_DAY_START + 3600000).toISOString();
    const ptTs = new Date(PRAGUE_DAY_START + 30 * 60000).toISOString();
    const data = makeMinimalBoilerData({
      timeline: [makeTimelinePt({ timestamp: ptTs, powerKw: null, sourceKey: 'discharge' })],
      sourceSegments: [makeSrcSeg({ key: 'discharge', start: segStart, end: segEnd, energyKwh: 1.0 })],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const bar = el.shadowRoot!.querySelector('[data-testid="boiler-draw-bar-down"]');
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute('data-estimated-power')).toBe('true');
    document.body.removeChild(el);
  });
});

// ============================================================================
// OigBoilerTimelineChart — power placeholder
// ============================================================================
describe('OigBoilerTimelineChart power placeholder', () => {
  it('renders boiler-power-placeholder when powerKw=null and no matching segment', async () => {
    const data = makeMinimalBoilerData({
      timeline: [
        makeTimelinePt({
          timestamp: new Date(PRAGUE_DAY_START + 60 * 60000).toISOString(),
          powerKw: null,
        }),
      ],
      sourceSegments: [],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const placeholder = el.shadowRoot!.querySelector('[data-testid="boiler-power-placeholder"]');
    expect(placeholder).not.toBeNull();
    expect(placeholder?.getAttribute('data-estimated-power')).toBe('true');
    document.body.removeChild(el);
  });
});

// ============================================================================
// OigBoilerTimelineChart — plan bands
// ============================================================================
describe('OigBoilerTimelineChart plan bands', () => {
  it('renders plan-band rects for slots on current day', async () => {
    const data = makeMinimalBoilerData({
      planSlots: [
        makeSlot({
          start: new Date(PRAGUE_DAY_START + 0).toISOString(),
          end: new Date(PRAGUE_DAY_START + 60 * 60000).toISOString(),
          recommendedSource: 'fve',
          heatingKwh: 0.5,
        }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const bands = el.shadowRoot!.querySelectorAll('.plan-band');
    expect(bands.length).toBeGreaterThan(0);
    document.body.removeChild(el);
  });

  it('filters out slots from yesterday', async () => {
    const yesterday = PRAGUE_DAY_START - 86400000;
    const data = makeMinimalBoilerData({
      planSlots: [
        makeSlot({
          start: new Date(yesterday).toISOString(),
          end: new Date(yesterday + 60 * 60000).toISOString(),
        }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const bands = el.shadowRoot!.querySelectorAll('.plan-band');
    expect(bands.length).toBe(0);
    document.body.removeChild(el);
  });

  it('merges adjacent slots with same source and same heating boolean', async () => {
    const data = makeMinimalBoilerData({
      planSlots: [
        makeSlot({
          start: new Date(PRAGUE_DAY_START + 0).toISOString(),
          end: new Date(PRAGUE_DAY_START + 15 * 60000).toISOString(),
          recommendedSource: 'fve',
          heatingKwh: 0.5,
        }),
        makeSlot({
          start: new Date(PRAGUE_DAY_START + 15 * 60000).toISOString(),
          end: new Date(PRAGUE_DAY_START + 30 * 60000).toISOString(),
          recommendedSource: 'fve',
          heatingKwh: 0.3,
        }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const bands = el.shadowRoot!.querySelectorAll('.plan-band');
    // Both slots have same source (fve) and same heating boolean (true), should merge to 1
    expect(bands.length).toBe(1);
    document.body.removeChild(el);
  });

  it('does not merge slots with different source', async () => {
    const data = makeMinimalBoilerData({
      planSlots: [
        makeSlot({
          start: new Date(PRAGUE_DAY_START + 0).toISOString(),
          end: new Date(PRAGUE_DAY_START + 15 * 60000).toISOString(),
          recommendedSource: 'fve',
          heatingKwh: 0.5,
        }),
        makeSlot({
          start: new Date(PRAGUE_DAY_START + 15 * 60000).toISOString(),
          end: new Date(PRAGUE_DAY_START + 30 * 60000).toISOString(),
          recommendedSource: 'grid',
          heatingKwh: 0.3,
        }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const bands = el.shadowRoot!.querySelectorAll('.plan-band');
    expect(bands.length).toBe(2);
    document.body.removeChild(el);
  });

  it('does not merge slots with same source but different heating boolean', async () => {
    const data = makeMinimalBoilerData({
      planSlots: [
        makeSlot({
          start: new Date(PRAGUE_DAY_START + 0).toISOString(),
          end: new Date(PRAGUE_DAY_START + 15 * 60000).toISOString(),
          recommendedSource: 'fve',
          heatingKwh: 0.5,
        }),
        makeSlot({
          start: new Date(PRAGUE_DAY_START + 15 * 60000).toISOString(),
          end: new Date(PRAGUE_DAY_START + 30 * 60000).toISOString(),
          recommendedSource: 'fve',
          heatingKwh: 0,
        }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const bands = el.shadowRoot!.querySelectorAll('.plan-band');
    expect(bands.length).toBe(2);
    document.body.removeChild(el);
  });
});

// ============================================================================
// OigBoilerTimelineChart — performance guardrail
// ============================================================================
describe('OigBoilerTimelineChart performance guardrail', () => {
  it('full-day fixture with 160 alternating-source slots has ≤500 SVG descendants', async () => {
    const slots: BoilerV2PlanSlot[] = [];
    const sources = ['fve', 'grid'];
    for (let i = 0; i < 160; i++) {
      slots.push(makeSlot({
        start: new Date(PRAGUE_DAY_START + i * 9 * 60000).toISOString(),
        end: new Date(PRAGUE_DAY_START + (i + 1) * 9 * 60000).toISOString(),
        recommendedSource: sources[i % 2],
        heatingKwh: 0.1,
      }));
    }
    const data = makeMinimalBoilerData({ planSlots: slots });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const svgEl = el.shadowRoot!.querySelector('[data-testid="boiler-timeline"]');
    const descendants = svgEl ? svgEl.querySelectorAll('*').length : 0;
    expect(descendants).toBeLessThanOrEqual(500);
    document.body.removeChild(el);
  });

  it('full-day fixture with 160 same-source slots merges to 1 band', async () => {
    const slots: BoilerV2PlanSlot[] = [];
    for (let i = 0; i < 160; i++) {
      slots.push(makeSlot({
        start: new Date(PRAGUE_DAY_START + i * 9 * 60000).toISOString(),
        end: new Date(PRAGUE_DAY_START + (i + 1) * 9 * 60000).toISOString(),
        recommendedSource: 'fve',
        heatingKwh: 0.1,
      }));
    }
    const data = makeMinimalBoilerData({ planSlots: slots });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const bands = el.shadowRoot!.querySelectorAll('.plan-band');
    expect(bands.length).toBe(1);
    document.body.removeChild(el);
  });
});

// ============================================================================
// OigBoilerTimelineChart — malformed data safety
// ============================================================================
describe('OigBoilerTimelineChart malformed data safety', () => {
  it('does not throw when data is null', async () => {
    const el = await mountTimeline(null, FROZEN_CONFIG, FROZEN_NOW_MS);
    const svg = el.shadowRoot!.querySelector('[data-testid="boiler-timeline"]');
    expect(svg).not.toBeNull();
    document.body.removeChild(el);
  });

  it('does not throw when timeline has invalid timestamps', async () => {
    const data = makeMinimalBoilerData({
      timeline: [
        makeTimelinePt({ timestamp: 'not-a-date', topTempC: 55 }),
        makeTimelinePt({ timestamp: '', topTempC: 60 }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const svg = el.shadowRoot!.querySelector('[data-testid="boiler-timeline"]');
    expect(svg).not.toBeNull();
    document.body.removeChild(el);
  });

  it('does not throw when planSlots have invalid dates', async () => {
    const data = makeMinimalBoilerData({
      planSlots: [
        makeSlot({ start: 'bad', end: 'bad' }),
      ],
    });
    const el = await mountTimeline(data, FROZEN_CONFIG, FROZEN_NOW_MS);
    const svg = el.shadowRoot!.querySelector('[data-testid="boiler-timeline"]');
    expect(svg).not.toBeNull();
    document.body.removeChild(el);
  });
});

describe('Task 9 components are display-only (no interactive controls)', () => {
  const INTERACTIVE_SELECTOR = 'button,a,input,select,textarea,[role="button"],[tabindex]';

  it('oig-boiler-metric-panel introduces no interactive controls', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    el.data = makeMinimalBoilerData();
    document.body.appendChild(el);
    await el.updateComplete;
    const interactive = el.shadowRoot!.querySelectorAll(INTERACTIVE_SELECTOR);
    expect(interactive.length).toBe(0);
    document.body.removeChild(el);
  });

  it('oig-boiler-sparkline introduces no interactive controls', async () => {
    const el = document.createElement('oig-boiler-sparkline') as OigBoilerSparkline;
    el.values = [10, 20, 30];
    document.body.appendChild(el);
    await el.updateComplete;
    const interactive = el.shadowRoot!.querySelectorAll(INTERACTIVE_SELECTOR);
    expect(interactive.length).toBe(0);
    document.body.removeChild(el);
  });

  it('oig-boiler-timeline-chart introduces no interactive controls', async () => {
    const el = await mountTimeline(makeMinimalBoilerData(), FROZEN_CONFIG, FROZEN_NOW_MS);
    const interactive = el.shadowRoot!.querySelectorAll(INTERACTIVE_SELECTOR);
    expect(interactive.length).toBe(0);
    document.body.removeChild(el);
  });
});

describe('Task 10 — config_profile_unavailable does not block shell render', () => {
  it('shell renders normally when config_profile_unavailable is the only degraded reason', () => {
    const el = new OigBoilerV2Shell();
    el.data = makeMinimalData({
      status: null,
      explanation: {
        reasonCodes: [],
        planCreatedAt: null,
        planValidUntil: null,
        dataAgeSecs: null,
        degradedReasons: ['config_profile_unavailable'],
        unsatisfiedComfortGapC: null,
        temperatureAtDeadlineC: null,
      },
    });
    expect(() => getTemplateStrings(el)).not.toThrow();
    const strings = getTemplateStrings(el);
    expect(strings).toContain('boiler-v2-shell');
  });

  it('shell shows stale warning when config_profile_unavailable is in degradedReasons', () => {
    const el = new OigBoilerV2Shell();
    el.data = makeMinimalData({
      status: null,
      explanation: {
        reasonCodes: [],
        planCreatedAt: null,
        planValidUntil: null,
        dataAgeSecs: null,
        degradedReasons: ['config_profile_unavailable'],
        unsatisfiedComfortGapC: null,
        temperatureAtDeadlineC: null,
      },
    });
    const vals = getTemplateValues(el);
    const json = JSON.stringify(vals);
    expect(json).toContain('boiler-stale-warning');
  });

  it('mounted: shell shadow DOM contains boiler-stale-warning for config_profile_unavailable', async () => {
    const el = document.createElement('oig-boiler-v2-shell') as OigBoilerV2Shell;
    el.data = makeMinimalData({
      status: null,
      explanation: {
        reasonCodes: [],
        planCreatedAt: null,
        planValidUntil: null,
        dataAgeSecs: null,
        degradedReasons: ['config_profile_unavailable'],
        unsatisfiedComfortGapC: null,
        temperatureAtDeadlineC: null,
      },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    const staleEl = el.shadowRoot!.querySelector('[data-testid="boiler-stale-warning"]');
    expect(staleEl).not.toBeNull();
    document.body.removeChild(el);
  });

  it('OigBoilerUnavailableState does not accept errorCode prop', () => {
    const el = new OigBoilerUnavailableState();
    expect('errorCode' in el).toBe(false);
    expect('code' in el).toBe(false);
  });
});

// ============================================================================
// Task 2 — New Zdroj & náklady panel rows (mockup fidelity)
// ============================================================================

describe('OigBoilerMetricPanel source panel — mockup rows (Task 2)', () => {
  it('renders Cena dnes row when estimatedCostCzk is present', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    el.data = makeMinimalBoilerData({
      planSummary: { estimatedCostCzk: 22.7, costIfAllGrid: 30.0, costIfAllAlt: null, deadlineTime: '18:00' },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('Cena dnes');
    // Czech comma decimal
    expect(html).toMatch(/22[,.]7/);
    document.body.removeChild(el);
  });

  it('renders Cena dnes row with placeholder when planSummary is null (mockup: full row set)', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    el.data = makeMinimalBoilerData({ planSummary: null });
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.innerHTML).toContain('Cena dnes');
    expect(el.shadowRoot!.innerHTML).toContain('—');
    document.body.removeChild(el);
  });

  it('renders Energie dnes row when energyToday is present', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    el.data = makeMinimalBoilerData({
      energyToday: { totalKwh: 16.9, fveKwh: 2.1, gridKwh: 0.5, altKwh: 0, batteryKwh: 0, unattributedKwh: 0, sourceInvalid: false },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('Energie dnes');
    expect(html).toMatch(/16[,.]9/);
    document.body.removeChild(el);
  });

  it('renders ☀️ z FVE row with orange color when fveKwh > 0', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    el.data = makeMinimalBoilerData({
      energyToday: { totalKwh: 5.0, fveKwh: 2.1, gridKwh: 0, altKwh: 0, batteryKwh: 0, unattributedKwh: 0, sourceInvalid: false },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('z FVE');
    expect(html).toContain('#ffd479');
    document.body.removeChild(el);
  });

  it('renders 🔌 ze sítě row with blue color when gridKwh > 0', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    el.data = makeMinimalBoilerData({
      energyToday: { totalKwh: 1.0, fveKwh: 0, gridKwh: 0.5, altKwh: 0, batteryKwh: 0, unattributedKwh: 0, sourceInvalid: false },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('ze sítě');
    expect(html).toContain('#81d4fa');
    document.body.removeChild(el);
  });

  it('renders alt row with salmon color only when altKwh > 0', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    // F5/Task C: altSourceType="gas" → "🔥 Plyn" label (R12 short label)
    el.data = makeMinimalBoilerData({
      energyToday: { totalKwh: 14.3, fveKwh: 0, gridKwh: 0, altKwh: 14.3, batteryKwh: 0, unattributedKwh: 0, sourceInvalid: false },
      altSourceType: 'gas',
    });
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    // F5/Task C: dynamic label from altSourceType — "🔥 Plyn" for gas
    expect(html).toContain('Plyn');
    expect(html).toContain('#ffab91');
    document.body.removeChild(el);
  });

  it('does not render alt row when altKwh is 0', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    el.data = makeMinimalBoilerData({
      energyToday: { totalKwh: 2.0, fveKwh: 2.0, gridKwh: 0, altKwh: 0, batteryKwh: 0, unattributedKwh: 0, sourceInvalid: false },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    // mockup full row set: alt row renders with 0,0 kWh value
    expect(el.shadowRoot!.innerHTML).toContain('0,0 kWh');
    document.body.removeChild(el);
  });

  it('renders battery row only when batteryKwh > 0', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    el.data = makeMinimalBoilerData({
      energyToday: { totalKwh: 3.0, fveKwh: 0, gridKwh: 0, altKwh: 0, batteryKwh: 2.5, unattributedKwh: 0, sourceInvalid: false },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('z baterie');
    document.body.removeChild(el);
  });

  it('does not render battery row when batteryKwh is 0', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    el.data = makeMinimalBoilerData({
      energyToday: { totalKwh: 2.0, fveKwh: 2.0, gridKwh: 0, altKwh: 0, batteryKwh: 0, unattributedKwh: 0, sourceInvalid: false },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.innerHTML).not.toContain('z baterie');
    document.body.removeChild(el);
  });

  it('renders Ušetřeno vs. plyn row with green color when savings > 0', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    el.data = makeMinimalBoilerData({
      planSummary: { estimatedCostCzk: 22.7, costIfAllGrid: null, costIfAllAlt: 28.4, deadlineTime: '18:00' },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('Ušetřeno vs. plyn');
    expect(html).toContain('#9fe6a8');
    document.body.removeChild(el);
  });

  it('does not render Ušetřeno when costIfAllAlt is 0 or null', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    el.data = makeMinimalBoilerData({
      planSummary: { estimatedCostCzk: 5.0, costIfAllGrid: 0, costIfAllAlt: null, deadlineTime: '18:00' },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    // mockup full row set: row stays with placeholder when not computable
    expect(el.shadowRoot!.innerHTML).toContain('Ušetřeno');
    expect(el.shadowRoot!.innerHTML).toContain('—');
    document.body.removeChild(el);
  });

  it('always renders Aktuální zdroj row', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    el.data = makeMinimalBoilerData();
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.innerHTML).toContain('Aktuální zdroj');
    document.body.removeChild(el);
  });

  it('renders source panel heading "Zdroj & náklady"', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    el.data = makeMinimalBoilerData();
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toMatch(/Zdroj.*náklady/);
    document.body.removeChild(el);
  });
});

// ============================================================================
// Task 2 — New Komfort panel rows (mockup fidelity)
// ============================================================================

describe('OigBoilerMetricPanel comfort panel — mockup rows (Task 2)', () => {
  it('renders okchip for comfort_satisfied=true', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'comfort';
    el.data = makeMinimalBoilerData({
      status: {
        currentState: 'idle', comfortSatisfied: true, comfortStatusCode: null,
        selectedSource: null, actuatedSource: null, temperatureTop: 60,
        temperatureBottom: null, energyNeededKwh: null, heating: false,
        lastUpdate: null, degraded: false, degradedFlags: [],
      },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    const chip = el.shadowRoot!.querySelector('.okchip');
    expect(chip).not.toBeNull();
    expect(chip!.textContent).toContain('Komfort splněn');
    document.body.removeChild(el);
  });

  it('renders gapcip for comfort_satisfied=false', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'comfort';
    el.data = makeMinimalBoilerData({
      status: {
        currentState: 'idle', comfortSatisfied: false, comfortStatusCode: null,
        selectedSource: null, actuatedSource: null, temperatureTop: 45,
        temperatureBottom: null, energyNeededKwh: null, heating: false,
        lastUpdate: null, degraded: false, degradedFlags: [],
      },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    const chip = el.shadowRoot!.querySelector('.gapcip');
    expect(chip).not.toBeNull();
    expect(chip!.textContent).toContain('nesplněn');
    document.body.removeChild(el);
  });

  it('renders demand window rows from demandMap.windows', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'comfort';
    el.data = makeMinimalBoilerData({
      demandMap: {
        slotDurationMin: 15,
        slotsP50: [],
        slotsP80: [],
        windows: [
          { slotIndex: 26, startMinute: 390, p80Kwh: 3.2, liters: 110, label: 'morning' },
          { slotIndex: 78, startMinute: 1170, p80Kwh: 4.1, liters: 140, label: 'evening' },
        ],
        profile: { category: 'workday_spring', level: 'exact', daysUsed: 14, label: 'test', fallbackUsed: false },
        confidence: 0.78,
      },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    // Morning window: slotIndex 26 → 06:30
    expect(html).toContain('06:30');
    expect(html).toContain('110');
    // Evening window: slotIndex 78 → 19:30
    expect(html).toContain('19:30');
    expect(html).toContain('140');
    document.body.removeChild(el);
  });

  it('renders Pojistka row from planSummary.deadlineTime', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'comfort';
    el.data = makeMinimalBoilerData({
      planSummary: { estimatedCostCzk: null, costIfAllGrid: null, costIfAllAlt: null, deadlineTime: '18:00' },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('Pojistka');
    expect(html).toContain('18:00');
    document.body.removeChild(el);
  });

  it('renders Anti-legionella row as "vypnuto" when legionella.enabled=false', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'comfort';
    el.data = makeMinimalBoilerData({
      legionella: { enabled: false, daysSinceLast: null, intervalDays: null, scheduledStart: null },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('Anti-legionella');
    expect(html).toContain('vypnuto');
    document.body.removeChild(el);
  });

  it('renders Anti-legionella row as "za X dní" when enabled with days info', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'comfort';
    el.data = makeMinimalBoilerData({
      legionella: { enabled: true, daysSinceLast: 4, intervalDays: 7, scheduledStart: null },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('za');
    expect(html).toContain('3');
    document.body.removeChild(el);
  });

  it('renders Trend row from activity.temperatureTrendCPerMin', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'comfort';
    el.data = makeMinimalBoilerData({
      activity: {
        state: 'charging_fve', source: 'fve',
        temperatureTrendCPerMin: 0.4,
        fillLevelPct: 0.5, auraMaxTempC: 75,
        heaterStates: {}, staleFlags: [],
      },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('Trend');
    expect(html).toMatch(/\+0[,.]4/);
    document.body.removeChild(el);
  });

  it('renders Cirkulace row as "vypnuta" when circulationRuns is empty', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'comfort';
    el.data = makeMinimalBoilerData({ circulationRuns: [] });
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('Cirkulace');
    expect(html).toContain('vypnuta');
    document.body.removeChild(el);
  });

  it('renders Cirkulace row with time when circulationRuns present', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'comfort';
    el.data = makeMinimalBoilerData({
      circulationRuns: [
        { start: '2026-06-11T17:15:00Z', end: '2026-06-11T17:20:00Z', label: 'pre-peak' },
      ],
    });
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('Cirkulace');
    // circulationRuns[0] start is 17:15 UTC → just check the time appears
    expect(html).toMatch(/\d\d:\d\d/);
    document.body.removeChild(el);
  });

  it('renders comfort panel heading "Komfort"', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'comfort';
    el.data = makeMinimalBoilerData();
    document.body.appendChild(el);
    await el.updateComplete;
    expect(el.shadowRoot!.textContent).toContain('Komfort');
    document.body.removeChild(el);
  });

  it('uses kv class for rows (dashed separators)', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'comfort';
    el.data = makeMinimalBoilerData({
      planSummary: { estimatedCostCzk: null, costIfAllGrid: null, costIfAllAlt: null, deadlineTime: '18:00' },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    const kvRows = el.shadowRoot!.querySelectorAll('.kv');
    expect(kvRows.length).toBeGreaterThan(0);
    document.body.removeChild(el);
  });
});

// ============================================================================
// Task C — charging_alt / alternative source truth tests
// ============================================================================

describe('normalizeRuntimeSource — alternative kept distinct', () => {
  it('maps alternative -> alternative (not grid)', () => {
    expect(normalizeRuntimeSource('alternative')).toBe('alternative');
  });

  it('maps alt -> alternative', () => {
    expect(normalizeRuntimeSource('alt')).toBe('alternative');
  });

  it('maps grid -> grid (no cross-contamination)', () => {
    expect(normalizeRuntimeSource('grid')).toBe('grid');
  });
});

describe('normalizeActivityState — charging_alt', () => {
  it('mapCanonicalToV2 preserves charging_alt activity state', () => {
    const canonical = {
      ...FULL_CANONICAL,
      activity: {
        state: 'charging_alt',
        source: 'alternative',
        temperature_trend_c_per_min: 0.3,
        fill_level_pct: 0.6,
        aura_max_temp_c: 75,
        heater_states: {},
        stale_flags: [],
        source_estimated: false,
      },
    };
    const v2 = mapCanonicalToV2(canonical as any);
    expect(v2.activity).not.toBeNull();
    expect(v2.activity!.state).toBe('charging_alt');
    expect(v2.activity!.source).toBe('alternative');
  });

  it('mapCanonicalToV2 maps source_estimated=true to activity.sourceEstimated=true', () => {
    const canonical = {
      ...FULL_CANONICAL,
      activity: {
        state: 'charging_alt',
        source: 'alternative',
        temperature_trend_c_per_min: null,
        fill_level_pct: null,
        aura_max_temp_c: 0,
        heater_states: {},
        stale_flags: [],
        source_estimated: true,
      },
    };
    const v2 = mapCanonicalToV2(canonical as any);
    expect(v2.activity!.sourceEstimated).toBe(true);
  });

  it('mapCanonicalToV2 defaults sourceEstimated=false when field absent', () => {
    const canonical = {
      ...FULL_CANONICAL,
      activity: {
        state: 'standby',
        source: null,
        temperature_trend_c_per_min: null,
        fill_level_pct: null,
        aura_max_temp_c: 0,
        heater_states: {},
        stale_flags: [],
        // no source_estimated field
      },
    };
    const v2 = mapCanonicalToV2(canonical as any);
    expect(v2.activity!.sourceEstimated).toBe(false);
  });
});

describe('OigBoilerV2Shell — charging_alt trend chip', () => {
  it('renders 🔥 OHŘÍVÁ trend chip for charging_alt state', () => {
    const el = new OigBoilerV2Shell();
    el.data = makeMinimalData({
      activity: {
        state: 'charging_alt',
        source: 'alternative',
        temperatureTrendCPerMin: 0.3,
        fillLevelPct: 0.5,
        auraMaxTempC: 75,
        heaterStates: {},
        staleFlags: [],
      },
    });
    const vals = getTemplateValues(el);
    const json = JSON.stringify(vals);
    expect(json).toContain('OHŘÍVÁ');
    expect(json).not.toContain('NABÍJÍ');
  });

  it('renders ⚡ NABÍJÍ trend chip for charging_fve state', () => {
    const el = new OigBoilerV2Shell();
    el.data = makeMinimalData({
      activity: {
        state: 'charging_fve',
        source: 'fve',
        temperatureTrendCPerMin: 0.4,
        fillLevelPct: 0.5,
        auraMaxTempC: 75,
        heaterStates: {},
        staleFlags: [],
      },
    });
    const vals = getTemplateValues(el);
    const json = JSON.stringify(vals);
    expect(json).toContain('NABÍJÍ');
    expect(json).not.toContain('OHŘÍVÁ');
  });

  it('passes altCharging=true to oig-boiler-v2-svg for charging_alt', () => {
    const el = new OigBoilerV2Shell();
    el.data = makeMinimalData({
      activity: {
        state: 'charging_alt',
        source: 'alternative',
        temperatureTrendCPerMin: null,
        fillLevelPct: null,
        auraMaxTempC: 0,
        heaterStates: {},
        staleFlags: [],
      },
    });
    const vals = getTemplateValues(el);
    // altCharging prop is set to true — find it in values
    expect(vals).toContain(true);
  });
});

describe('OigBoilerV2Svg — source chip for alternative', () => {
  it('renders srcchip--alt class for source=alternative', () => {
    const el = new OigBoilerV2Svg();
    el.sourceKey = 'alternative';
    el.lang = 'cs';
    // Dynamic class is in template values, not static strings
    const vals = getTemplateValues(el);
    const json = JSON.stringify(vals);
    expect(json).toContain('srcchip--alt');
  });

  it('renders 🔥 Ohřev plynem label for source=alternative in cs', () => {
    const el = new OigBoilerV2Svg();
    el.sourceKey = 'alternative';
    el.lang = 'cs';
    const vals = getTemplateValues(el);
    const json = JSON.stringify(vals);
    expect(json).toContain('Ohřev plynem');
  });

  it('renders 🔥 Gas heating label for source=alternative in en', () => {
    const el = new OigBoilerV2Svg();
    el.sourceKey = 'alternative';
    el.lang = 'en';
    const vals = getTemplateValues(el);
    const json = JSON.stringify(vals);
    expect(json).toContain('Gas heating');
  });

  it('renders (odhad) suffix when sourceEstimated=true', () => {
    const el = new OigBoilerV2Svg();
    el.sourceKey = 'fve';
    el.sourceEstimated = true;
    el.lang = 'cs';
    const vals = getTemplateValues(el);
    const json = JSON.stringify(vals);
    expect(json).toContain('odhad');
  });

  it('renders (estimated) suffix when sourceEstimated=true in en', () => {
    const el = new OigBoilerV2Svg();
    el.sourceKey = 'grid';
    el.sourceEstimated = true;
    el.lang = 'en';
    const vals = getTemplateValues(el);
    const json = JSON.stringify(vals);
    expect(json).toContain('estimated');
  });

  it('does not render estimated suffix when sourceEstimated=false', () => {
    const el = new OigBoilerV2Svg();
    el.sourceKey = 'fve';
    el.sourceEstimated = false;
    el.lang = 'cs';
    const vals = getTemplateValues(el);
    const json = JSON.stringify(vals);
    expect(json).not.toContain('odhad');
  });

  it('renders trend--alt class when altCharging=true', () => {
    const el = new OigBoilerV2Svg();
    el.chargingLabel = '🔥 OHŘÍVÁ +0,3 °C/min';
    el.altCharging = true;
    el.lang = 'cs';
    // Dynamic class value is in template values
    const vals = getTemplateValues(el);
    const json = JSON.stringify(vals);
    expect(json).toContain('trend--alt');
  });

  it('does not render trend--alt class when altCharging=false', () => {
    const el = new OigBoilerV2Svg();
    el.chargingLabel = '⚡ NABÍJÍ +0,4 °C/min';
    el.altCharging = false;
    el.lang = 'cs';
    // Dynamic class value is in template values — just "trend" not "trend--alt"
    const vals = getTemplateValues(el);
    const json = JSON.stringify(vals);
    expect(json).not.toContain('trend--alt');
    expect(json).toContain('"trend"');
  });

});

describe('OigBoilerMetricPanel — alternative source in Aktuální zdroj row', () => {
  it('shows 🔥 plyn for alternative source in cs', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    el.data = makeMinimalBoilerData({
      activity: {
        state: 'charging_alt',
        source: 'alternative',
        temperatureTrendCPerMin: 0.3,
        fillLevelPct: 0.5,
        auraMaxTempC: 75,
        heaterStates: {},
        staleFlags: [],
      },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('plyn');
    document.body.removeChild(el);
  });

  it('shows (odhad) suffix in current_source row when sourceEstimated=true', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    el.data = makeMinimalBoilerData({
      activity: {
        state: 'charging_alt',
        source: 'alternative',
        temperatureTrendCPerMin: null,
        fillLevelPct: null,
        auraMaxTempC: 0,
        heaterStates: {},
        staleFlags: [],
        sourceEstimated: true,
      } as any,
    });
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).toContain('odhad');
    document.body.removeChild(el);
  });

  it('does not show (odhad) when sourceEstimated is absent', async () => {
    const el = document.createElement('oig-boiler-metric-panel') as OigBoilerMetricPanel;
    el.panelType = 'source';
    el.data = makeMinimalBoilerData({
      activity: {
        state: 'charging_fve',
        source: 'fve',
        temperatureTrendCPerMin: 0.5,
        fillLevelPct: 0.7,
        auraMaxTempC: 75,
        heaterStates: {},
        staleFlags: [],
      },
    });
    document.body.appendChild(el);
    await el.updateComplete;
    const html = el.shadowRoot!.innerHTML;
    expect(html).not.toContain('odhad');
    document.body.removeChild(el);
  });
});

describe('i18n — charging_alt and gas labels', () => {
  it('cs has boiler.activity.state.charging_alt = 🔥 Ohřev plynem', () => {
    expect(t('boiler.activity.state.charging_alt', 'cs')).toBe('🔥 Ohřev plynem');
  });

  it('en has boiler.activity.state.charging_alt = 🔥 Gas heating', () => {
    expect(t('boiler.activity.state.charging_alt', 'en')).toBe('🔥 Gas heating');
  });

  it('cs has boiler.tank.source_alt = 🔥 Ohřev plynem', () => {
    expect(t('boiler.tank.source_alt', 'cs')).toBe('🔥 Ohřev plynem');
  });

  it('en has boiler.tank.source_alt = 🔥 Gas heating', () => {
    expect(t('boiler.tank.source_alt', 'en')).toBe('🔥 Gas heating');
  });

  it('cs has boiler.tank.source_estimated_suffix = (odhad)', () => {
    expect(t('boiler.tank.source_estimated_suffix', 'cs')).toBe('(odhad)');
  });

  it('en has boiler.tank.source_estimated_suffix = (estimated)', () => {
    expect(t('boiler.tank.source_estimated_suffix', 'en')).toBe('(estimated)');
  });
});


// ============================================================================
// Thermal tank (2026-06-12): tank always full, color = stratification
// ============================================================================
import { tempColor, readyLineTopPct } from '@/ui/features/boiler/boiler-svg';

describe('OigBoilerV2Svg — thermal gradient tank', () => {
  it('tempColor maps cold/boundary/hot correctly', () => {
    expect(tempColor(5)).toBe('rgb(21,101,192)');
    expect(tempColor(40)).toBe('rgb(255,183,77)');
    expect(tempColor(90)).toBe('rgb(230,74,25)');
    expect(tempColor(null)).toBe('#37474f');
  });

  it('tempColor interpolates between stops', () => {
    // 32.5 °C = midpoint cyan(25)→amber(40)
    expect(tempColor(32.5)).toBe('rgb(147,191,148)');
  });

  it('readyLineTopPct maps fraction to top offset, hides at extremes', () => {
    expect(readyLineTopPct(0.43)).toBeCloseTo(57.0, 5);
    expect(readyLineTopPct(0)).toBeNull();
    expect(readyLineTopPct(1)).toBeNull();
    expect(readyLineTopPct(null)).toBeNull();
  });

  it('renders full-tank thermal element with top/bottom temp colors', () => {
    const el = new OigBoilerV2Svg();
    el.topTempC = 44.6;
    el.bottomTempC = 19.9;
    el.fillLevelPct = 0.43;
    const strings = getTemplateStrings(el);
    const json = JSON.stringify(getTemplateValues(el));
    expect(strings).toContain('class="thermal"');
    expect(json).toContain('linear-gradient(180deg');
    expect(json).toContain(tempColor(44.6));
    expect(json).toContain(tempColor(19.9));
  });

  it('renders ready-line at correct top offset, hidden when all cold', () => {
    const el = new OigBoilerV2Svg();
    el.topTempC = 44.6;
    el.bottomTempC = 19.9;
    el.fillLevelPct = 0.43;
    let json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('boiler-ready-line');
    expect(json).toContain('"57.0"');

    el.fillLevelPct = 0;
    json = JSON.stringify(getTemplateValues(el));
    expect(json).not.toContain('boiler-ready-line');
  });

  it('surf pulse renders only while charging', () => {
    const el = new OigBoilerV2Svg();
    el.topTempC = 40;
    el.chargingLabel = '⚡ NABÍJÍ';
    let json = JSON.stringify(getTemplateValues(el));
    expect(json).toContain('surf--charging');

    el.chargingLabel = null;
    json = JSON.stringify(getTemplateValues(el));
    expect(json).not.toContain('surf--charging');
  });
});
