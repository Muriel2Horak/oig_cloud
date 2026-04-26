import { describe, it, expect } from 'vitest';
import {
  mapCanonicalToV2,
  parseStateForTest,
  OVERRIDE_TTL_DEFAULT_MINUTES,
  OVERRIDE_TTL_MIN_MINUTES,
  OVERRIDE_TTL_MAX_MINUTES,
  OVERRIDE_TTL_STEP_MINUTES,
} from '@/data/boiler-data';
import type { BoilerConfig } from '@/ui/features/boiler/types';
import {
  OigBoilerStatusPanel,
  OigBoilerPlanTimeline,
  OigBoilerSourceExplanation,
  OigBoilerOverridePanel,
  OigBoilerUnavailableState,
} from '@/ui/features/boiler/components';

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
    flags: ['price_data_stale', 'pv_forecast_unavailable'],
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
    expect(v2.status!.degradedFlags).toContain('price_data_stale');
    expect(v2.status!.degradedFlags).toContain('pv_forecast_unavailable');
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
    expect(v2.explanation!.degradedReasons).toContain('price_data_stale');
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
    targetTempC: 60,
    deadlineTime: '--:--',
    stratificationMode: '--',
    kCoefficient: '--',
    coldInletTempC: 10,
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
      degradedFlags: ['price_data_stale'],
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
