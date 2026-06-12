// ============================================================================
// F5 / Task C — boiler UI wiring tests
//
// Coverage:
//   1. mapCanonicalToV2: alt_source_type threaded into BoilerV2Data.altSourceType
//   2. OigControlPanel: boxHasHome56=false hides supplementary section,
//                       boxHasHome56=true shows it
//   3. OigBoilerPlanStrip: altSourceType property accepted + used in band label
// ============================================================================

import { describe, it, expect } from 'vitest';
import { mapCanonicalToV2 } from '@/data/boiler-data';

// ── helpers ───────────────────────────────────────────────────────────────────

function makeMinimalCanonical(overrides: Record<string, any> = {}): any {
  return {
    entry_id: 'test_entry',
    box_id: 'test_box',
    current_state: {
      temperatures: { top: 55 },
      energy_state: {},
      energy_tracking: { current_source: 'fve', total_kwh: 1, fve_kwh: 1, grid_kwh: 0, alt_kwh: 0 },
      heating: false,
      recommended_source: null,
      last_update: new Date().toISOString(),
    },
    comfort_status: {
      comfort_satisfied: true,
      comfort_status_code: null,
      temperature_at_deadline_c: null,
      unsatisfied_comfort_gap_c: null,
    },
    selected_source: null,
    actuated_source: null,
    plan_slots: [],
    reason_codes: [],
    freshness: { data_age_seconds: 10, last_update: new Date().toISOString() },
    degraded_flags: { degraded: false, flags: [], serializer_state: null },
    manual_override: { active: false, state: null },
    ...overrides,
  };
}

// ── 1. mapCanonicalToV2: altSourceType ───────────────────────────────────────

describe('mapCanonicalToV2 — altSourceType', () => {
  it('extracts alt_source_type="gas" from canonical', () => {
    const canonical = makeMinimalCanonical({ alt_source_type: 'gas' });
    const v2 = mapCanonicalToV2(canonical);
    expect(v2.altSourceType).toBe('gas');
  });

  it('extracts alt_source_type="heat_pump"', () => {
    const canonical = makeMinimalCanonical({ alt_source_type: 'heat_pump' });
    const v2 = mapCanonicalToV2(canonical);
    expect(v2.altSourceType).toBe('heat_pump');
  });

  it('extracts alt_source_type="fireplace"', () => {
    const canonical = makeMinimalCanonical({ alt_source_type: 'fireplace' });
    const v2 = mapCanonicalToV2(canonical);
    expect(v2.altSourceType).toBe('fireplace');
  });

  it('extracts alt_source_type="other"', () => {
    const canonical = makeMinimalCanonical({ alt_source_type: 'other' });
    const v2 = mapCanonicalToV2(canonical);
    expect(v2.altSourceType).toBe('other');
  });

  it('returns null when alt_source_type missing', () => {
    const canonical = makeMinimalCanonical();
    // no alt_source_type key
    delete canonical.alt_source_type;
    const v2 = mapCanonicalToV2(canonical);
    expect(v2.altSourceType).toBeNull();
  });

  it('returns null when canonical is null', () => {
    const v2 = mapCanonicalToV2(null);
    expect(v2.altSourceType).toBeNull();
  });

  it('returns null when alt_source_type is null', () => {
    const canonical = makeMinimalCanonical({ alt_source_type: null });
    const v2 = mapCanonicalToV2(canonical);
    expect(v2.altSourceType).toBeNull();
  });

  it('returns null when alt_source_type is a number (type guard)', () => {
    const canonical = makeMinimalCanonical({ alt_source_type: 42 });
    const v2 = mapCanonicalToV2(canonical);
    expect(v2.altSourceType).toBeNull();
  });
});

// ── 2. OigControlPanel: boxHasHome56 property ────────────────────────────────

import { OigControlPanel } from '@/ui/features/control-panel/panel';

describe('OigControlPanel — boxHasHome56 property', () => {
  it('has boxHasHome56 property defaulting to false', () => {
    const panel = new OigControlPanel();
    expect(panel.boxHasHome56).toBe(false);
  });

  it('renders without throwing when boxHasHome56=false', () => {
    const panel = new OigControlPanel();
    panel.boxHasHome56 = false;
    expect(() => panel.render()).not.toThrow();
  });

  it('renders without throwing when boxHasHome56=true', () => {
    const panel = new OigControlPanel();
    panel.boxHasHome56 = true;
    expect(() => panel.render()).not.toThrow();
  });

  it('hides supplementary section when boxHasHome56=false', () => {
    const panel = new OigControlPanel();
    panel.boxHasHome56 = false;
    const result = panel.render() as any;
    // Convert to string to check for supplementary selector absence
    const rendered = JSON.stringify(result);
    expect(rendered).not.toContain('oig-supplementary-selector');
  });

  it('shows supplementary section when boxHasHome56=true', () => {
    const panel = new OigControlPanel();
    panel.boxHasHome56 = true;
    const result = panel.render() as any;
    const rendered = JSON.stringify(result);
    expect(rendered).toContain('oig-supplementary-selector');
  });
});

// ── 3. OigBoilerPlanStrip: altSourceType property ────────────────────────────

import { OigBoilerPlanStrip } from '@/ui/features/boiler/boiler-plan-strip';
import { altTypeLabel } from '@/ui/features/boiler/boiler-energy-today';

describe('OigBoilerPlanStrip — altSourceType property', () => {
  it('has altSourceType property defaulting to null', () => {
    const strip = new OigBoilerPlanStrip();
    expect(strip.altSourceType).toBeNull();
  });

  it('accepts altSourceType="gas"', () => {
    const strip = new OigBoilerPlanStrip();
    strip.altSourceType = 'gas';
    expect(strip.altSourceType).toBe('gas');
  });

  it('renders without throwing when altSourceType=null', () => {
    const strip = new OigBoilerPlanStrip();
    strip.altSourceType = null;
    expect(() => strip.render()).not.toThrow();
  });

  it('renders without throwing when altSourceType="heat_pump"', () => {
    const strip = new OigBoilerPlanStrip();
    strip.altSourceType = 'heat_pump';
    expect(() => strip.render()).not.toThrow();
  });
});

// ── 4. altTypeLabel — plan-strip integration: correct Czech labels ─────────────

describe('altTypeLabel used in plan-strip context', () => {
  it('gas → "🔥 Plyn" (short, R12)', () => {
    expect(altTypeLabel('gas', 'cs')).toBe('🔥 Plyn');
  });

  it('heat_pump → "🔥 Tepelné čerpadlo" (R12)', () => {
    expect(altTypeLabel('heat_pump', 'cs')).toBe('🔥 Tepelné čerpadlo');
  });

  it('fireplace → "🔥 Krb" (R12)', () => {
    expect(altTypeLabel('fireplace', 'cs')).toBe('🔥 Krb');
  });

  it('null → "🔥 Alternativní zdroj" (generic fallback)', () => {
    expect(altTypeLabel(null, 'cs')).toBe('🔥 Alternativní zdroj');
  });
});
