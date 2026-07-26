import { describe, expect, it } from 'vitest';
import {
  filterDashboardTiles,
  type ModuleTileFlags,
  type ResolvedTile,
} from '@/data/tiles-data';

type TileModule = 'core' | 'pricing' | 'boiler' | 'statistics';

const mkTile = (entityId: string, module: TileModule): ResolvedTile => ({
  config: {
    type: 'entity',
    entity_id: entityId,
    module,
  },
  value: '1',
  unit: '',
  isActive: true,
  isZero: false,
  formattedValue: '1',
  supportValues: {},
});

const coreTile = mkTile('sensor.oig_2206237016_actual_aci_wtotal', 'core');
const boilerTile = mkTile('sensor.oig_2206237016_heat_buffer', 'boiler');
const pricingTile = mkTile('sensor.oig_2206237016_energy_market_current', 'pricing');
const statisticsTile = mkTile('sensor.oig_2206237016_battery_report_summary', 'statistics');
const statisticsTileWithBoilerLikeId = mkTile('sensor.oig_2206237016_hourly_real_boiler_kwh', 'statistics');

const flags = (overrides: Partial<ModuleTileFlags>): ModuleTileFlags => ({
  enablePricing: true,
  enableBoiler: true,
  enableStatistics: true,
  ...overrides,
});

describe('filterDashboardTiles', () => {
  it('hides module-owned tiles when their module flag is off', () => {
    const filtered = filterDashboardTiles(
      [coreTile, boilerTile, pricingTile, statisticsTile],
      flags({
        enablePricing: false,
        enableBoiler: false,
        enableStatistics: false,
      }),
    );

    expect(filtered).toEqual([coreTile]);
  });

  it('keeps the matching module tiles when their flags are enabled', () => {
    const filtered = filterDashboardTiles(
      [coreTile, boilerTile, pricingTile, statisticsTile],
      flags({
        enablePricing: true,
        enableBoiler: true,
        enableStatistics: true,
      }),
    );

    expect(filtered).toEqual([coreTile, boilerTile, pricingTile, statisticsTile]);
  });

  it('uses the explicit module label instead of the entity name', () => {
    const hidden = filterDashboardTiles(
      [coreTile, statisticsTileWithBoilerLikeId],
      flags({
        enableStatistics: false,
      }),
    );

    expect(hidden).toEqual([coreTile]);

    const visible = filterDashboardTiles(
      [coreTile, statisticsTileWithBoilerLikeId],
      flags({
        enableStatistics: true,
      }),
    );

    expect(visible).toEqual([coreTile, statisticsTileWithBoilerLikeId]);
  });
});
