// ============================================================================
// F4 / Task C — "⚡ Z čeho se bojler nabil — dnes" card unit tests
// Covers:
//   - altTypeLabel: known types, unknown, null
//   - buildSourceTiles: always-shown sources, alt threshold, battery threshold,
//     ordering, costLabel for FVE, no costLabel for grid/alt/battery
//   - computeSavingsLabel: full data, missing estimate, missing grid cost,
//     negative savings (no label), null planSummary
//   - formatKwhLocale: precision, Czech comma
//   - OigBoilerEnergyToday component: empty state, tiles, prop bar, benchmark
// ============================================================================

import { describe, it, expect, beforeEach } from 'vitest';
import {
  altTypeLabel,
  buildSourceTiles,
  computeSavingsLabel,
  formatKwhLocale,
  OigBoilerEnergyToday,
} from '@/ui/features/boiler/boiler-energy-today';
import type { EnergyToday, PlanSummary } from '@/ui/features/boiler/types';

// ── Template helpers ──────────────────────────────────────────────────────────

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

function joinTemplate(el: { render(): unknown }): string {
  return getTemplateStrings(el) + JSON.stringify(getTemplateValues(el));
}

// ── Fixtures ──────────────────────────────────────────────────────────────────

function makeEnergy(overrides: Partial<EnergyToday> = {}): EnergyToday {
  return {
    totalKwh: 5.0,
    fveKwh: 2.1,
    gridKwh: 0.5,
    altKwh: 2.4,
    batteryKwh: 0.0,
    sourceInvalid: false,
    ...overrides,
  };
}

function makePlanSummary(overrides: Partial<PlanSummary> = {}): PlanSummary {
  return {
    estimatedCostCzk: 22.7,
    costIfAllGrid: 28.4,
    costIfAllAlt: 35.0,
    deadlineTime: '18:00',
    ...overrides,
  };
}

// ── altTypeLabel ──────────────────────────────────────────────────────────────

describe('altTypeLabel', () => {
  it('returns gas label for cs', () => {
    const label = altTypeLabel('gas', 'cs');
    expect(label).toBe('🔥 Plynový kotel');
  });

  it('returns gas label for en', () => {
    const label = altTypeLabel('gas', 'en');
    expect(label).toBe('🔥 Gas boiler');
  });

  it('returns heat_pump label for cs', () => {
    const label = altTypeLabel('heat_pump', 'cs');
    expect(label).toBe('🔥 Tepelné čerpadlo');
  });

  it('returns generic cs fallback for unknown type', () => {
    const label = altTypeLabel('unknown_type', 'cs');
    expect(label).toBe('🔥 Alternativní zdroj');
  });

  it('returns generic en fallback for null', () => {
    const label = altTypeLabel(null, 'en');
    expect(label).toBe('🔥 Alternative source');
  });

  it('returns generic cs fallback for undefined', () => {
    const label = altTypeLabel(undefined, 'cs');
    expect(label).toBe('🔥 Alternativní zdroj');
  });

  it('returns electric label for cs', () => {
    const label = altTypeLabel('electric', 'cs');
    expect(label).toBe('🔥 Přímotop');
  });
});

// ── buildSourceTiles ──────────────────────────────────────────────────────────

describe('buildSourceTiles', () => {
  it('always includes FVE tile', () => {
    const energy = makeEnergy({ fveKwh: 0, gridKwh: 0, altKwh: 0, totalKwh: 0 });
    const tiles = buildSourceTiles(energy, 'cs');
    const keys = tiles.map(t => t.key);
    expect(keys).toContain('fve');
  });

  it('always includes Grid tile', () => {
    const energy = makeEnergy({ fveKwh: 0, gridKwh: 0, altKwh: 0, totalKwh: 0 });
    const tiles = buildSourceTiles(energy, 'cs');
    const keys = tiles.map(t => t.key);
    expect(keys).toContain('grid');
  });

  it('includes alt tile only when altKwh > 0', () => {
    const energy = makeEnergy({ altKwh: 2.4 });
    const tiles = buildSourceTiles(energy, 'cs');
    expect(tiles.find(t => t.key === 'alt')).toBeTruthy();
  });

  it('excludes alt tile when altKwh === 0', () => {
    const energy = makeEnergy({ altKwh: 0 });
    const tiles = buildSourceTiles(energy, 'cs');
    expect(tiles.find(t => t.key === 'alt')).toBeUndefined();
  });

  it('includes battery tile when batteryKwh > 0.05', () => {
    const energy = makeEnergy({ batteryKwh: 0.5 });
    const tiles = buildSourceTiles(energy, 'cs');
    expect(tiles.find(t => t.key === 'battery')).toBeTruthy();
  });

  it('excludes battery tile when batteryKwh <= 0.05', () => {
    const energy = makeEnergy({ batteryKwh: 0.05 });
    const tiles = buildSourceTiles(energy, 'cs');
    expect(tiles.find(t => t.key === 'battery')).toBeUndefined();
  });

  it('excludes battery tile when batteryKwh === 0', () => {
    const energy = makeEnergy({ batteryKwh: 0 });
    const tiles = buildSourceTiles(energy, 'cs');
    expect(tiles.find(t => t.key === 'battery')).toBeUndefined();
  });

  it('FVE tile shows costLabel "≈ 0 Kč" when fveKwh > 0', () => {
    const energy = makeEnergy({ fveKwh: 2.1 });
    const tiles = buildSourceTiles(energy, 'cs');
    const fve = tiles.find(t => t.key === 'fve');
    expect(fve?.costLabel).toBe('≈ 0 Kč');
  });

  it('FVE tile has null costLabel when fveKwh === 0', () => {
    const energy = makeEnergy({ fveKwh: 0 });
    const tiles = buildSourceTiles(energy, 'cs');
    const fve = tiles.find(t => t.key === 'fve');
    expect(fve?.costLabel).toBeNull();
  });

  it('Grid tile has null costLabel (cost unknown at FE)', () => {
    const energy = makeEnergy({ gridKwh: 1.0 });
    const tiles = buildSourceTiles(energy, 'cs');
    const grid = tiles.find(t => t.key === 'grid');
    expect(grid?.costLabel).toBeNull();
  });

  it('tile order is FVE, Grid, Battery, Alt', () => {
    const energy = makeEnergy({ batteryKwh: 0.3, altKwh: 1.0 });
    const tiles = buildSourceTiles(energy, 'cs');
    const keys = tiles.map(t => t.key);
    expect(keys).toEqual(['fve', 'grid', 'battery', 'alt']);
  });

  it('order FVE, Grid, Alt when no battery', () => {
    const energy = makeEnergy({ batteryKwh: 0, altKwh: 1.0 });
    const tiles = buildSourceTiles(energy, 'cs');
    const keys = tiles.map(t => t.key);
    expect(keys).toEqual(['fve', 'grid', 'alt']);
  });

  it('uses altTypeLabel for alt tile label', () => {
    const energy = makeEnergy({ altKwh: 1.0 });
    const tiles = buildSourceTiles(energy, 'cs', 'gas');
    const alt = tiles.find(t => t.key === 'alt');
    expect(alt?.label).toBe('🔥 Plynový kotel');
  });

  it('uses generic alt label when altType not provided', () => {
    const energy = makeEnergy({ altKwh: 1.0 });
    const tiles = buildSourceTiles(energy, 'cs');
    const alt = tiles.find(t => t.key === 'alt');
    expect(alt?.label).toBe('🔥 Alternativní zdroj');
  });

  it('FVE tile has correct color', () => {
    const energy = makeEnergy();
    const tiles = buildSourceTiles(energy, 'cs');
    const fve = tiles.find(t => t.key === 'fve');
    expect(fve?.color).toBe('#ffa726');
  });

  it('Grid tile has correct color', () => {
    const energy = makeEnergy();
    const tiles = buildSourceTiles(energy, 'cs');
    const grid = tiles.find(t => t.key === 'grid');
    expect(grid?.color).toBe('#2196f3');
  });

  it('Battery tile has correct color', () => {
    const energy = makeEnergy({ batteryKwh: 0.5 });
    const tiles = buildSourceTiles(energy, 'cs');
    const bat = tiles.find(t => t.key === 'battery');
    expect(bat?.color).toBe('#7e57c2');
  });

  it('Alt tile has correct color', () => {
    const energy = makeEnergy({ altKwh: 1.0 });
    const tiles = buildSourceTiles(energy, 'cs');
    const alt = tiles.find(t => t.key === 'alt');
    expect(alt?.color).toBe('#e64a19');
  });
});

// ── computeSavingsLabel ───────────────────────────────────────────────────────

describe('computeSavingsLabel', () => {
  it('returns null when planSummary is null', () => {
    expect(computeSavingsLabel(null, 'cs')).toBeNull();
  });

  it('returns null when estimatedCostCzk is null', () => {
    const ps = makePlanSummary({ estimatedCostCzk: null });
    expect(computeSavingsLabel(ps, 'cs')).toBeNull();
  });

  it('returns null when costIfAllGrid is null', () => {
    const ps = makePlanSummary({ costIfAllGrid: null });
    expect(computeSavingsLabel(ps, 'cs')).toBeNull();
  });

  it('returns null when savings would be negative', () => {
    // estimated > all-grid means no savings
    const ps = makePlanSummary({ estimatedCostCzk: 30.0, costIfAllGrid: 25.0 });
    expect(computeSavingsLabel(ps, 'cs')).toBeNull();
  });

  it('returns savings label in cs for positive savings', () => {
    const ps = makePlanSummary({ estimatedCostCzk: 22.7, costIfAllGrid: 28.4 });
    const label = computeSavingsLabel(ps, 'cs');
    expect(label).not.toBeNull();
    expect(label).toContain('5.7 Kč');
  });

  it('returns savings label in en for positive savings', () => {
    const ps = makePlanSummary({ estimatedCostCzk: 22.7, costIfAllGrid: 28.4 });
    const label = computeSavingsLabel(ps, 'en');
    expect(label).not.toBeNull();
    expect(label).toContain('5.7 Kč');
  });

  it('includes plan savings prefix', () => {
    const ps = makePlanSummary({ estimatedCostCzk: 10.0, costIfAllGrid: 20.0 });
    const label = computeSavingsLabel(ps, 'cs');
    expect(label).toContain('plán šetří');
  });

  it('handles zero savings', () => {
    const ps = makePlanSummary({ estimatedCostCzk: 20.0, costIfAllGrid: 20.0 });
    const label = computeSavingsLabel(ps, 'cs');
    // 0 savings => not returned (savings < 0 check is strict <)
    // 0.0 is not < 0 so label is returned with "0.0 Kč"
    expect(label).not.toBeNull();
    expect(label).toContain('0.0 Kč');
  });
});

// ── formatKwhLocale ───────────────────────────────────────────────────────────

describe('formatKwhLocale', () => {
  it('formats 2.1 as "2,1 kWh"', () => {
    expect(formatKwhLocale(2.1)).toBe('2,1 kWh');
  });

  it('formats 0 as "0,0 kWh"', () => {
    expect(formatKwhLocale(0)).toBe('0,0 kWh');
  });

  it('formats 14.3 as "14,3 kWh"', () => {
    expect(formatKwhLocale(14.3)).toBe('14,3 kWh');
  });

  it('formats 0.5 as "0,5 kWh"', () => {
    expect(formatKwhLocale(0.5)).toBe('0,5 kWh');
  });
});

// ── OigBoilerEnergyToday component ───────────────────────────────────────────

describe('OigBoilerEnergyToday component', () => {
  let el: OigBoilerEnergyToday;

  beforeEach(() => {
    el = new OigBoilerEnergyToday();
    el.lang = 'cs';
  });

  it('renders heading with correct text', () => {
    el.energy = makeEnergy();
    const str = getTemplateStrings(el);
    expect(str).toContain('card-header');
  });

  it('renders i18n heading via template values', () => {
    el.energy = makeEnergy();
    const joined = joinTemplate(el);
    expect(joined).toContain('Z čeho se bojler nabil');
  });

  it('renders empty state when energy is null', () => {
    el.energy = null;
    const joined = joinTemplate(el);
    expect(joined).toContain('Dnes zatím žádný ohřev');
  });

  it('renders empty state when totalKwh < 0.1', () => {
    el.energy = makeEnergy({ totalKwh: 0.05, fveKwh: 0, gridKwh: 0.05, altKwh: 0 });
    const joined = joinTemplate(el);
    expect(joined).toContain('Dnes zatím žádný ohřev');
  });

  it('renders tiles when totalKwh >= 0.1', () => {
    el.energy = makeEnergy();
    const joined = joinTemplate(el);
    expect(joined).toContain('energy-tiles');
  });

  it('renders FVE tile (FVE label present)', () => {
    el.energy = makeEnergy({ fveKwh: 2.1 });
    const joined = joinTemplate(el);
    // FVE label is Czech string from i18n
    expect(joined).toContain('FVE přetoky');
  });

  it('renders Grid tile (Grid label present)', () => {
    el.energy = makeEnergy({ gridKwh: 0.5 });
    const joined = joinTemplate(el);
    expect(joined).toContain('Síť');
  });

  it('renders Battery tile when batteryKwh > 0.05', () => {
    el.energy = makeEnergy({ batteryKwh: 0.3 });
    const joined = joinTemplate(el);
    expect(joined).toContain('Baterie');
  });

  it('does not render Battery tile when batteryKwh === 0', () => {
    el.energy = makeEnergy({ batteryKwh: 0 });
    // Battery label should not be in template
    const tiles = buildSourceTiles(el.energy, 'cs');
    expect(tiles.find(t => t.key === 'battery')).toBeUndefined();
  });

  it('renders Alt tile when altKwh > 0', () => {
    el.energy = makeEnergy({ altKwh: 2.4 });
    const joined = joinTemplate(el);
    expect(joined).toContain('Alternativní zdroj');
  });

  it('does not render Alt tile when altKwh === 0', () => {
    el.energy = makeEnergy({ altKwh: 0 });
    // Alt not in tiles list
    const tiles = buildSourceTiles(el.energy, 'cs');
    expect(tiles.find(t => t.key === 'alt')).toBeUndefined();
  });

  it('renders proportion bar when totalKwh >= 0.1', () => {
    el.energy = makeEnergy({ fveKwh: 2.1, gridKwh: 0.5, altKwh: 2.4, totalKwh: 5.0 });
    const joined = joinTemplate(el);
    expect(joined).toContain('prop-bar');
  });

  it('does not render proportion bar when empty', () => {
    el.energy = null;
    const joined = joinTemplate(el);
    expect(joined).not.toContain('prop-bar');
  });

  it('renders benchmark when planSummary.costIfAllGrid is set', () => {
    el.energy = makeEnergy();
    el.planSummary = makePlanSummary();
    const joined = joinTemplate(el);
    expect(joined).toContain('benchmark');
  });

  it('benchmark shows cost_if_all_grid value', () => {
    el.energy = makeEnergy();
    el.planSummary = makePlanSummary({ costIfAllGrid: 28.4 });
    const joined = joinTemplate(el);
    expect(joined).toContain('28.4');
  });

  it('benchmark shows savings label', () => {
    el.energy = makeEnergy();
    el.planSummary = makePlanSummary({ estimatedCostCzk: 22.7, costIfAllGrid: 28.4 });
    const joined = joinTemplate(el);
    expect(joined).toContain('5.7');
  });

  it('no benchmark when planSummary is null', () => {
    el.energy = makeEnergy();
    el.planSummary = null;
    const str = getTemplateStrings(el);
    expect(str).not.toContain('benchmark');
  });

  it('no benchmark when costIfAllGrid is null', () => {
    el.energy = makeEnergy();
    el.planSummary = makePlanSummary({ costIfAllGrid: null });
    const str = getTemplateStrings(el);
    expect(str).not.toContain('benchmark');
  });

  it('renders FVE kwh in Czech comma format', () => {
    el.energy = makeEnergy({ fveKwh: 2.1 });
    const joined = joinTemplate(el);
    expect(joined).toContain('2,1 kWh');
  });

  it('renders FVE costLabel ≈ 0 Kč', () => {
    el.energy = makeEnergy({ fveKwh: 2.1 });
    const joined = joinTemplate(el);
    expect(joined).toContain('≈ 0 Kč');
  });

  it('renders heading in en language', () => {
    el.lang = 'en';
    el.energy = makeEnergy();
    const joined = joinTemplate(el);
    expect(joined).toContain('What powered the boiler today');
  });

  it('renders empty state in en language', () => {
    el.lang = 'en';
    el.energy = null;
    const joined = joinTemplate(el);
    expect(joined).toContain('No heating today yet');
  });

  it('benchmark prefix in cs', () => {
    el.energy = makeEnergy();
    el.planSummary = makePlanSummary();
    const joined = joinTemplate(el);
    expect(joined).toContain('Kdyby vše ze sítě');
  });

  it('benchmark prefix in en', () => {
    el.lang = 'en';
    el.energy = makeEnergy();
    el.planSummary = makePlanSummary();
    const joined = joinTemplate(el);
    expect(joined).toContain('If all from grid');
  });
});
