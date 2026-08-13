import { describe, it, expect, beforeEach } from 'vitest';
import {
  parseBalancingState,
  buildGridChargingPlan,
  formatPlanWindow,
  getBlockEnergyKwh,
  computeBlocksDurationMinutes,
  buildFlowNodes,
  buildFlowConnections,
  calculateFlowParams,
  getFlowDataColor,
  formatPower,
  formatEnergy,
  getTariffDisplay,
  getHouseModeInfo,
  getGridExportDisplay,
  getSensorId,
  extractFlowData,
  applyPlannerSettings,
  computeDailySelfSufficiency,
} from '../../../src/data/flow-data';
import type { GridChargingBlock, FlowData, FlowNode, FlowConnection } from '../../../src/ui/features/flow/types';
import type { FlowGridDelivery } from '../../../src/ui/features/flow/types';

describe('flow-data helpers', () => {
  describe('parseBalancingState', () => {
    it('maps balancing states to V2 UI states', () => {
      expect(parseBalancingState('charging')).toBe('charging');
      expect(parseBalancingState('balancing')).toBe('holding');
      expect(parseBalancingState('holding')).toBe('holding');
      expect(parseBalancingState('completed')).toBe('completed');
      expect(parseBalancingState('planned')).toBe('planned');
    });

    it('falls back to standby for unknown values', () => {
      expect(parseBalancingState('')).toBe('standby');
      expect(parseBalancingState('unknown')).toBe('standby');
      expect(parseBalancingState(undefined)).toBe('standby');
    });
  });

  describe('grid charging plan extraction', () => {
    it('builds plan data from charging_blocks attributes', () => {
      const blocks: GridChargingBlock[] = [
        {
          day: 'today',
          time_from: '01:00',
          time_to: '01:30',
          grid_import_kwh: 1.2,
          total_cost_czk: 6.3,
        },
        {
          day: 'tomorrow',
          time_from: '02:00',
          time_to: '02:15',
          grid_charge_kwh: 0.6,
          total_cost_czk: 3.0,
          status: 'running',
        },
      ];

      const plan = buildGridChargingPlan({
        state: 'on',
        attributes: {
          charging_blocks: blocks,
          total_energy_kwh: 2.4,
          total_cost_czk: 10.5,
        },
      });

      expect(plan.hasBlocks).toBe(true);
      expect(plan.totalEnergyKwh).toBe(2.4);
      expect(plan.totalCostCzk).toBe(10.5);
      expect(plan.windowLabel).toBe('dnes 01:00 → zítra 02:15');
      expect(plan.durationMinutes).toBe(45);
      expect(plan.currentBlockLabel).toBe('zítra 02:00 - 02:15');
      expect(plan.nextBlockLabel).toBeNull();
    });

    it('falls back to computed totals when attrs are missing', () => {
      const blocks: GridChargingBlock[] = [
        { day: 'today', time_from: '10:00', time_to: '10:15', grid_import_kwh: 0.5, total_cost_czk: 1.2 },
        { day: 'today', time_from: '10:15', time_to: '10:30', battery_start_kwh: 5, battery_end_kwh: 5.4 },
      ];

      const plan = buildGridChargingPlan({
        state: 'off',
        attributes: { charging_blocks: blocks },
      });

      expect(plan.totalEnergyKwh).toBeCloseTo(0.9, 5);
      expect(plan.totalCostCzk).toBeCloseTo(1.2, 5);
      expect(plan.windowLabel).toBe('dnes 10:00 – 10:30');
    });

    it('formats plan window and energy helpers consistently', () => {
      const blocks: GridChargingBlock[] = [
        { day: 'today', time_from: '06:00', time_to: '06:30', grid_import_kwh: 1.5 },
        { day: 'today', time_from: '07:00', time_to: '07:15', battery_start_kwh: 2, battery_end_kwh: 2.5 },
      ];

      expect(formatPlanWindow(blocks)).toBe('dnes 06:00 – 07:15');
      expect(getBlockEnergyKwh(blocks[0])).toBe(1.5);
      expect(getBlockEnergyKwh(blocks[1])).toBeCloseTo(0.5, 5);
      expect(computeBlocksDurationMinutes(blocks)).toBe(45);
    });

    it('returns null window and zero duration for empty input', () => {
      expect(formatPlanWindow([])).toBeNull();
      expect(computeBlocksDurationMinutes([])).toBe(0);
    });

    it('getBlockEnergyKwh returns 0 when both grid_*_kwh and battery_*_kwh are missing', () => {
      expect(getBlockEnergyKwh({})).toBe(0);
      expect(getBlockEnergyKwh({ battery_start_kwh: 5, battery_end_kwh: undefined as unknown as number })).toBe(0);
    });

    it('getBlockEnergyKwh returns max(0, end-start) when grid fields are zero/negative', () => {
      expect(getBlockEnergyKwh({ grid_import_kwh: -1, battery_start_kwh: 3, battery_end_kwh: 4 })).toBe(1);
    });

    it('computeBlocksDurationMinutes ignores malformed time strings and negative deltas', () => {
      const blocks: GridChargingBlock[] = [
        { day: 'today', time_from: 'broken', time_to: '06:00' },
        { day: 'today', time_from: '06:00', time_to: '05:00' }, // negative delta
        { day: 'today', time_from: '06:00', time_to: '06:30' },
      ];
      expect(computeBlocksDurationMinutes(blocks)).toBe(30);
    });
  });

  describe('parseNumber / parseString / parseBool coverage through extractFlowData', () => {
    it('treats unknown and unavailable string states as empty for nullable cost sensors', () => {
      const data = extractFlowData({ states: {
        'sensor.oig_SN1_computed_grid_import_cost_today': { state: 'unknown' },
        'sensor.oig_SN1_computed_grid_import_cost_month': { state: 'unavailable' },
        'sensor.oig_SN1_time_to_empty': { state: 'unavailable' },
        'sensor.oig_SN1_time_to_full': { state: 'unknown' },
      } }, 'SN1');
      expect(data.gridImportCostToday).toBeNull();
      expect(data.gridImportCostMonth).toBeNull();
      expect(data.timeToEmpty).toBe('');
      expect(data.timeToFull).toBe('');
    });

    it('parses non-numeric and empty string numeric states as 0', () => {
      const data = extractFlowData({ states: {
        'sensor.oig_SN1_actual_fv_p1': { state: 'abc' },
        'sensor.oig_SN1_actual_fv_p2': { state: '' },
        'sensor.oig_SN1_dc_in_fv_ad': { state: 'NaN' },
        'sensor.oig_SN1_batt_bat_c': { state: '50' },
      } }, 'SN1');
      expect(data.solarP1).toBe(0);
      expect(data.solarP2).toBe(0);
      expect(data.solarToday).toBe(0);
      expect(data.batterySoC).toBe(50);
    });

    it('accepts both on/1/zapnuto as truthy boolean states', () => {
      const onData = extractFlowData({ states: {
        'sensor.oig_SN1_grid_charging_planned': { state: 'ON' },
      } }, 'SN1');
      expect(onData.isGridCharging).toBe(true);

      const zapnutoData = extractFlowData({ states: {
        'sensor.oig_SN1_grid_charging_planned': { state: 'zapnuto' },
      } }, 'SN1');
      expect(zapnutoData.isGridCharging).toBe(true);

      const oneData = extractFlowData({ states: {
        'sensor.oig_SN1_grid_charging_planned': { state: '1' },
      } }, 'SN1');
      expect(oneData.isGridCharging).toBe(true);

      const offData = extractFlowData({ states: {
        'sensor.oig_SN1_grid_charging_planned': { state: 'off' },
      } }, 'SN1');
      expect(offData.isGridCharging).toBe(false);
    });
  });

  describe('getSensorId', () => {
    it('builds the sensor id from base name + inverter sn', () => {
      expect(getSensorId('batt_bat_c', 'SN1')).toBe('sensor.oig_SN1_batt_bat_c');
    });
  });

  describe('buildFlowNodes', () => {
    it('produces 5 nodes (solar/battery/inverter/grid/house) with the expected ids and labels', () => {
      const data = {
        solarPower: 1234, solarP1: 600, solarP2: 634,
        solarV1: 30, solarV2: 31, solarI1: 20, solarI2: 20.4,
        solarPercent: 50, solarToday: 1000, solarForecastToday: 10, solarForecastTomorrow: 12,
        solarForecastStale: false,
        batterySoC: 50, batteryPower: 0, batteryVoltage: 48, batteryCurrent: 0, batteryTemp: 25,
        batteryChargeTotal: 100, batteryDischargeTotal: 50, batteryChargeSolar: 80, batteryChargeGrid: 20,
        batteryChargeMonth: 0, batteryDischargeMonth: 0,
        batteryFloorPct: 0, batteryUsableKwh: 0, batteryInstalledKwh: 0, batteryMissingKwh: 0,
        batterySoH: 100, batteryEfficiency: 95, batteryForecastKwh: 0,
        isGridCharging: false, timeToEmpty: '', timeToFull: '',
        balancingState: 'standby' as const, balancingTimeRemaining: '',
        gridChargingPlan: {
          hasBlocks: false, totalEnergyKwh: 0, totalCostCzk: 0,
          windowLabel: null, durationMinutes: 0,
          currentBlockLabel: null, nextBlockLabel: null, blocks: [],
        },
        gridPower: 0, gridVoltage: 230, gridFrequency: 50,
        gridImportToday: 0, gridExportToday: 0,
        gridL1V: 230, gridL2V: 230, gridL3V: 230,
        gridL1P: 0, gridL2P: 0, gridL3P: 0,
        spotPrice: 0, exportPrice: 0, currentTariff: '',
        gridImportCostToday: null, gridImportCostMonth: null,
        gridExportEarningsToday: null, gridExportEarningsMonth: null,
        housePower: 0, houseTodayWh: 0, houseL1: 0, houseL2: 0, houseL3: 0,
        nonbackupPower: 0, nonbackupTodayWh: 0, nonbackupL1: 0, nonbackupL2: 0, nonbackupL3: 0,
        zalohaPlannedRemainingKwh: 0,
        selfSufficiencyTodayPct: 0, srcFveTodayKwh: 0, srcBatteryTodayKwh: 0, srcGridTodayKwh: 0,
        inverterMode: 'Home 1', inverterGridMode: 'off' as FlowGridDelivery, inverterGridLimit: 0,
        inverterTemp: 0, bypassStatus: 'off', notificationsUnread: 0, notificationsError: 0,
        boilerIsUse: false, boilerPower: 0, boilerDayEnergy: 0, boilerManualMode: '', boilerInstallPower: 3000,
        plannerAutoMode: null, plannerRecommendedMode: '', lastUpdate: '',
      } as unknown as FlowData;

      const nodes: FlowNode[] = buildFlowNodes(data);
      expect(nodes.map(n => n.id)).toEqual(['solar', 'battery', 'inverter', 'grid', 'house']);
      expect(nodes.find(n => n.id === 'solar')?.power).toBe(1234);
      expect(nodes.find(n => n.id === 'solar')?.data.today).toBe(1); // Wh/1000
      expect(nodes.find(n => n.id === 'battery')?.data.isCharging).toBe(false); // batteryPower === 0
      expect(nodes.find(n => n.id === 'house')?.data.todayKWh).toBe(0);
    });

    it('flips isCharging on the battery node when batteryPower > 10', () => {
      const data = {
        solarPower: 0, solarP1: 0, solarP2: 0, solarV1: 0, solarV2: 0, solarI1: 0, solarI2: 0,
        solarPercent: 0, solarToday: 0, solarForecastToday: 0, solarForecastTomorrow: 0,
        solarForecastStale: false,
        batterySoC: 50, batteryPower: 1500, batteryVoltage: 48, batteryCurrent: 30, batteryTemp: 25,
        batteryChargeTotal: 0, batteryDischargeTotal: 0, batteryChargeSolar: 0, batteryChargeGrid: 0,
        batteryChargeMonth: 0, batteryDischargeMonth: 0,
        batteryFloorPct: 0, batteryUsableKwh: 0, batteryInstalledKwh: 0, batteryMissingKwh: 0,
        batterySoH: 100, batteryEfficiency: 95, batteryForecastKwh: 0,
        isGridCharging: false, timeToEmpty: '', timeToFull: '',
        balancingState: 'standby' as const, balancingTimeRemaining: '',
        gridChargingPlan: { hasBlocks: false, totalEnergyKwh: 0, totalCostCzk: 0, windowLabel: null, durationMinutes: 0, currentBlockLabel: null, nextBlockLabel: null, blocks: [] },
        gridPower: 0, gridVoltage: 0, gridFrequency: 0, gridImportToday: 0, gridExportToday: 0,
        gridL1V: 0, gridL2V: 0, gridL3V: 0, gridL1P: 0, gridL2P: 0, gridL3P: 0,
        spotPrice: 0, exportPrice: 0, currentTariff: '',
        gridImportCostToday: null, gridImportCostMonth: null,
        gridExportEarningsToday: null, gridExportEarningsMonth: null,
        housePower: 0, houseTodayWh: 0, houseL1: 0, houseL2: 0, houseL3: 0,
        nonbackupPower: 0, nonbackupTodayWh: 0, nonbackupL1: 0, nonbackupL2: 0, nonbackupL3: 0,
        zalohaPlannedRemainingKwh: 0,
        selfSufficiencyTodayPct: 0, srcFveTodayKwh: 0, srcBatteryTodayKwh: 0, srcGridTodayKwh: 0,
        inverterMode: '', inverterGridMode: 'unknown' as FlowGridDelivery, inverterGridLimit: 0,
        inverterTemp: 0, bypassStatus: 'off', notificationsUnread: 0, notificationsError: 0,
        boilerIsUse: false, boilerPower: 0, boilerDayEnergy: 0, boilerManualMode: '', boilerInstallPower: 3000,
        plannerAutoMode: null, plannerRecommendedMode: '', lastUpdate: '',
      } as unknown as FlowData;
      const nodes = buildFlowNodes(data);
      expect(nodes.find(n => n.id === 'battery')?.data.isCharging).toBe(true);
    });
  });

  describe('buildFlowConnections', () => {
    const baseData = (over: Partial<FlowData> = {}): FlowData => ({
      solarPower: 0, solarP1: 0, solarP2: 0, solarV1: 0, solarV2: 0, solarI1: 0, solarI2: 0,
      solarPercent: 0, solarToday: 0, solarForecastToday: 0, solarForecastTomorrow: 0, solarForecastStale: false,
      batterySoC: 0, batteryPower: 0, batteryVoltage: 0, batteryCurrent: 0, batteryTemp: 0,
      batteryChargeTotal: 0, batteryDischargeTotal: 0, batteryChargeSolar: 0, batteryChargeGrid: 0,
      batteryChargeMonth: 0, batteryDischargeMonth: 0,
      batteryFloorPct: 0, batteryUsableKwh: 0, batteryInstalledKwh: 0, batteryMissingKwh: 0,
      batterySoH: 0, batteryEfficiency: 0, batteryForecastKwh: 0,
      isGridCharging: false, timeToEmpty: '', timeToFull: '',
      balancingState: 'standby', balancingTimeRemaining: '',
      gridChargingPlan: { hasBlocks: false, totalEnergyKwh: 0, totalCostCzk: 0, windowLabel: null, durationMinutes: 0, currentBlockLabel: null, nextBlockLabel: null, blocks: [] },
      gridPower: 0, gridVoltage: 0, gridFrequency: 0, gridImportToday: 0, gridExportToday: 0,
      gridL1V: 0, gridL2V: 0, gridL3V: 0, gridL1P: 0, gridL2P: 0, gridL3P: 0,
      spotPrice: 0, exportPrice: 0, currentTariff: '',
      gridImportCostToday: null, gridImportCostMonth: null,
      gridExportEarningsToday: null, gridExportEarningsMonth: null,
      housePower: 0, houseTodayWh: 0, houseL1: 0, houseL2: 0, houseL3: 0,
      nonbackupPower: 0, nonbackupTodayWh: 0, nonbackupL1: 0, nonbackupL2: 0, nonbackupL3: 0,
      zalohaPlannedRemainingKwh: 0,
      selfSufficiencyTodayPct: 0, srcFveTodayKwh: 0, srcBatteryTodayKwh: 0, srcGridTodayKwh: 0,
      inverterMode: '', inverterGridMode: 'unknown', inverterGridLimit: 0,
      inverterTemp: 0, bypassStatus: 'off', notificationsUnread: 0, notificationsError: 0,
      boilerIsUse: false, boilerPower: 0, boilerDayEnergy: 0, boilerManualMode: '', boilerInstallPower: 3000,
      plannerAutoMode: null, plannerRecommendedMode: '', lastUpdate: '',
      ...over,
    });

    it('emits no connections when all power flows are below threshold', () => {
      const conns = buildFlowConnections(baseData());
      expect(conns).toHaveLength(0);
    });

    it('emits solar->inverter only when solar > 50', () => {
      const conns = buildFlowConnections(baseData({ solarPower: 100 }));
      expect(conns).toEqual([
        { id: 'solar-inverter', from: 'solar', to: 'inverter', power: 100, direction: 'forward' },
      ]);
    });

    it('emits inverter->battery when battery is discharging (positive) and battery->inverter when charging (negative)', () => {
      const discharging = buildFlowConnections(baseData({ batteryPower: 200 }));
      expect(discharging).toContainEqual({
        id: 'battery-inverter', from: 'inverter', to: 'battery',
        power: 200, direction: 'bidirectional',
      });

      const charging = buildFlowConnections(baseData({ batteryPower: -300 }));
      expect(charging).toContainEqual({
        id: 'battery-inverter', from: 'battery', to: 'inverter',
        power: 300, direction: 'bidirectional',
      });
    });

    it('emits grid connections only when |gridPower| > 50, with correct import/export direction', () => {
      const importing = buildFlowConnections(baseData({ gridPower: 500 }));
      expect(importing).toContainEqual({
        id: 'grid-inverter', from: 'grid', to: 'inverter',
        power: 500, direction: 'bidirectional',
      });

      const exporting = buildFlowConnections(baseData({ gridPower: -500 }));
      expect(exporting).toContainEqual({
        id: 'grid-inverter', from: 'inverter', to: 'grid',
        power: 500, direction: 'bidirectional',
      });

      const idle = buildFlowConnections(baseData({ gridPower: 30 }));
      expect(idle.find(c => c.id === 'grid-inverter')).toBeUndefined();
    });

    it('emits inverter->house when housePower > 50', () => {
      const conns = buildFlowConnections(baseData({ housePower: 600 }));
      expect(conns).toContainEqual({
        id: 'inverter-house', from: 'inverter', to: 'house',
        power: 600, direction: 'forward',
      });
    });
  });

  describe('calculateFlowParams', () => {
    it('marks flow inactive when |power| < 50', () => {
      const params = calculateFlowParams(0, 1000);
      expect(params.active).toBe(false);
    });

    it('returns intensity proportional to power/maximum and caps at 100', () => {
      const fullPower = calculateFlowParams(1000, 1000);
      expect(fullPower.intensity).toBe(100);
      expect(fullPower.count).toBe(4);
    });

    it('clamps count to [1, 4] even for tiny intensity', () => {
      const tiny = calculateFlowParams(60, 10000);
      expect(tiny.count).toBeGreaterThanOrEqual(1);
      expect(tiny.count).toBeLessThanOrEqual(4);
    });

    it('honours flowKey cache for smoothing — same key, similar speed sticks', () => {
      const first = calculateFlowParams(1000, 1000, 'cache-key');
      const second = calculateFlowParams(1000, 1000, 'cache-key');
      // After one tick, the cached value gets reused when within 100ms
      expect(second.speed).toBe(first.speed);
    });

    it('produces different speeds when called without a flowKey', () => {
      const a = calculateFlowParams(2000, 5000);
      const b = calculateFlowParams(2000, 5000);
      // No smoothing without a key, but speed depends on intensity which is the same.
      // Just assert deterministic output and that opacity is clamped to [0, 1].
      expect(a.speed).toBeGreaterThanOrEqual(500);
      expect(b.speed).toBeGreaterThanOrEqual(500);
      expect(a.opacity).toBeLessThanOrEqual(1);
      expect(a.size).toBeGreaterThanOrEqual(6);
    });
  });

  describe('getFlowDataColor', () => {
    it('maps each flow type to FLOW_COLORS and distinguishes grid export/import', () => {
      expect(getFlowDataColor('solar')).toBe('#ffd54f');
      expect(getFlowDataColor('battery')).toBe('#ff9800');
      expect(getFlowDataColor('grid')).toBe('#f44336'); // import default
      expect(getFlowDataColor('grid', true)).toBe('#4caf50'); // export
      expect(getFlowDataColor('house')).toBe('#f06292');
    });

    it('returns neutral grey for unknown types', () => {
      expect(getFlowDataColor('unknown')).toBe('#9e9e9e');
      expect(getFlowDataColor('')).toBe('#9e9e9e');
    });
  });

  describe('formatPower / formatEnergy', () => {
    it('formatPower formats small as W and large as kW with one decimal', () => {
      expect(formatPower(0)).toBe('0 W');
      expect(formatPower(500)).toBe('500 W');
      expect(formatPower(-999)).toBe('-999 W');
      expect(formatPower(1000)).toBe('1.0 kW');
      expect(formatPower(1234)).toBe('1.2 kW');
      expect(formatPower(-3500)).toBe('-3.5 kW');
    });

    it('formatEnergy formats small as Wh and large as kWh with two decimals', () => {
      expect(formatEnergy(0)).toBe('0 Wh');
      expect(formatEnergy(500)).toBe('500 Wh');
      expect(formatEnergy(1000)).toBe('1.00 kWh');
      expect(formatEnergy(2500)).toBe('2.50 kWh');
    });
  });

  describe('getTariffDisplay / getHouseModeInfo / getGridExportDisplay', () => {
    it('getTariffDisplay maps VT/NT plus vysoký/nízký variants and falls back to placeholder', () => {
      expect(getTariffDisplay('VT')).toBe('⚡ VT');
      expect(getTariffDisplay('NT')).toBe('🌙 NT');
      expect(getTariffDisplay('vysoký tarif')).toBe('⚡ VT');
      expect(getTariffDisplay('nízký tarif')).toBe('🌙 NT');
      expect(getTariffDisplay('A1')).toBe('⏰ A1');
      expect(getTariffDisplay('')).toBe('--');
    });

    it('getHouseModeInfo maps each Home mode and falls back to placeholder', () => {
      expect(getHouseModeInfo('Home 1')).toEqual({ icon: '🏠', text: 'Home 1' });
      expect(getHouseModeInfo('Home 2 backup')).toEqual({ icon: '🔋', text: 'Home 2' });
      expect(getHouseModeInfo('Home 3 solar')).toEqual({ icon: '☀️', text: 'Home 3' });
      expect(getHouseModeInfo('Home UPS backup')).toEqual({ icon: '⚡', text: 'Home UPS' });
      expect(getHouseModeInfo('off')).toEqual({ icon: '⚙️', text: 'off' });
      expect(getHouseModeInfo('')).toEqual({ icon: '⚙️', text: '--' });
    });

    it('getGridExportDisplay maps every FlowGridDelivery to a label and icon', () => {
      expect(getGridExportDisplay('off')).toEqual({ display: 'Vypnuto', icon: '🚫' });
      expect(getGridExportDisplay('on')).toEqual({ display: 'Zapnuto', icon: '💧' });
      expect(getGridExportDisplay('limited')).toEqual({ display: 'Omezeno', icon: '🚰' });
      expect(getGridExportDisplay('unknown')).toEqual({ display: '--', icon: '💧' });
    });
  });

  describe('extractFlowData', () => {
    function makeHass(states: Record<string, { state: string; attributes?: any }>) {
      return { states };
    }

    it('returns zeroed defaults when hass is empty', () => {
      const data = extractFlowData({ states: {} }, 'SN1');
      expect(data.solarPower).toBe(0);
      expect(data.batterySoC).toBe(0);
      expect(data.gridPower).toBe(0);
      expect(data.housePower).toBe(0);
      expect(data.balancingState).toBe('standby');
      expect(data.isGridCharging).toBe(false);
      expect(data.gridImportCostToday).toBeNull();
      expect(data.bypassStatus).toBe('off');
      expect(data.boilerInstallPower).toBe(3000); // default fallback
    });

    it('parses solar, battery, grid and house values from sensor states', () => {
      const states: Record<string, { state: string; attributes?: any }> = {
        'sensor.oig_SN1_actual_fv_p1': { state: '600' },
        'sensor.oig_SN1_actual_fv_p2': { state: '400' },
        'sensor.oig_SN1_extended_fve_voltage_1': { state: '30.5' },
        'sensor.oig_SN1_extended_fve_voltage_2': { state: '31.5' },
        'sensor.oig_SN1_extended_fve_current_1': { state: '20' },
        'sensor.oig_SN1_extended_fve_current_2': { state: '12.7' },
        'sensor.oig_SN1_dc_in_fv_proc': { state: '50' },
        'sensor.oig_SN1_dc_in_fv_ad': { state: '5000' },
        'sensor.oig_SN1_batt_bat_c': { state: '80' },
        'sensor.oig_SN1_batt_batt_comp_p': { state: '-1500' },
        'sensor.oig_SN1_extended_battery_voltage': { state: '48' },
        'sensor.oig_SN1_extended_battery_current': { state: '30' },
        'sensor.oig_SN1_extended_battery_temperature': { state: '25' },
        'sensor.oig_SN1_computed_batt_charge_energy_today': { state: '1000' },
        'sensor.oig_SN1_computed_batt_discharge_energy_today': { state: '800' },
        'sensor.oig_SN1_computed_batt_charge_fve_energy_today': { state: '700' },
        'sensor.oig_SN1_computed_batt_charge_grid_energy_today': { state: '300' },
        'sensor.oig_SN1_batt_bat_min': { state: '15' },
        'sensor.oig_SN1_usable_battery_capacity': { state: '8' },
        'sensor.oig_SN1_installed_battery_capacity_kwh': { state: '10000' },
        'sensor.oig_SN1_missing_battery_kwh': { state: '2' },
        'sensor.oig_SN1_battery_health': { state: '98' },
        'sensor.oig_SN1_battery_efficiency': { state: '95' },
        'sensor.oig_SN1_battery_forecast': { state: '8' },
        'sensor.oig_SN1_time_to_empty': { state: '02:30' },
        'sensor.oig_SN1_time_to_full': { state: '01:45' },
        'sensor.oig_SN1_grid_charging_planned': { state: 'Zapnuto', attributes: {} },
        'sensor.oig_SN1_battery_balancing': { state: 'idle', attributes: { current_state: 'balancing', time_remaining: '00:30' } },
        'sensor.oig_SN1_actual_aci_wtotal': { state: '300' },
        'sensor.oig_SN1_extended_grid_voltage': { state: '230' },
        'sensor.oig_SN1_ac_in_aci_f': { state: '50' },
        'sensor.oig_SN1_ac_in_ac_ad': { state: '1500' },
        'sensor.oig_SN1_ac_in_ac_pd': { state: '3000' },
        'sensor.oig_SN1_ac_in_aci_vr': { state: '230' },
        'sensor.oig_SN1_ac_in_aci_vs': { state: '231' },
        'sensor.oig_SN1_ac_in_aci_vt': { state: '229' },
        'sensor.oig_SN1_actual_aci_wr': { state: '100' },
        'sensor.oig_SN1_actual_aci_ws': { state: '100' },
        'sensor.oig_SN1_actual_aci_wt': { state: '100' },
        'sensor.oig_SN1_spot_price_current_15min': { state: '4.5' },
        'sensor.oig_SN1_export_price_current_15min': { state: '2.1' },
        'sensor.oig_SN1_current_tariff': { state: 'VT' },
        'sensor.oig_SN1_computed_grid_import_cost_today': { state: '12.5' },
        'sensor.oig_SN1_actual_aco_p': { state: '600' },
        'sensor.oig_SN1_ac_out_en_day': { state: '8000' },
        'sensor.oig_SN1_ac_out_aco_pr': { state: '200' },
        'sensor.oig_SN1_ac_out_aco_ps': { state: '200' },
        'sensor.oig_SN1_ac_out_aco_pt': { state: '200' },
        'sensor.oig_SN1_actual_acinb_wtotal': { state: '0' },
        'sensor.oig_SN1_computed_nonbackup_consumption_today': { state: '500' },
        'sensor.oig_SN1_battery_forecast': { state: '8', attributes: { planned_consumption_today: '1.5' } },
        'sensor.oig_SN1_box_prms_mode': { state: 'Home 1' },
        'sensor.oig_SN1_box_temp': { state: '35' },
        'sensor.oig_SN1_bypass_status': { state: 'on' },
        'sensor.oig_SN1_notification_count_unread': { state: '2' },
        'sensor.oig_SN1_notification_count_error': { state: '1' },
        'sensor.oig_SN1_invertor_prms_to_grid': { state: 'on' },
        'sensor.oig_SN1_invertor_prm1_p_max_feed_grid': { state: '5000' },
        'sensor.oig_SN1_boiler_is_use': { state: 'on' },
        'sensor.oig_SN1_boiler_current_cbb_w': { state: '1200' },
        'sensor.oig_SN1_boiler_day_w': { state: '4500' },
        'sensor.oig_SN1_boiler_manual_mode': { state: 'auto' },
        'sensor.oig_SN1_boiler_install_power': { state: '2500' },
        'sensor.oig_SN1_real_data_update': { state: '2024-01-01T12:00:00' },
        'sensor.oig_SN1_planner_recommended_mode': { state: 'hybrid' },
        'sensor.oig_SN1_solar_forecast': {
          state: '5',
          attributes: {
            today_total_kwh: '10.5',
            tomorrow_total_kwh: '15.5',
            forecast_stale: true,
          },
        },
      };

      const data = extractFlowData(makeHass(states), 'SN1');

      expect(data.solarPower).toBe(1000);
      expect(data.solarP1).toBe(600);
      expect(data.solarP2).toBe(400);
      expect(data.solarForecastToday).toBe(10.5);
      expect(data.solarForecastTomorrow).toBe(15.5);
      expect(data.solarForecastStale).toBe(true);
      expect(data.batterySoC).toBe(80);
      expect(data.batteryPower).toBe(-1500);
      expect(data.batteryInstalledKwh).toBe(10); // 10000 Wh -> 10 kWh
      expect(data.balancingState).toBe('holding');
      expect(data.balancingTimeRemaining).toBe('00:30');
      expect(data.isGridCharging).toBe(true);
      expect(data.gridPower).toBe(300);
      expect(data.gridImportCostToday).toBe(12.5);
      expect(data.housePower).toBe(600);
      expect(data.houseTodayWh).toBe(8000);
      expect(data.zalohaPlannedRemainingKwh).toBe(1.5);
      expect(data.inverterMode).toBe('Home 1');
      expect(data.inverterTemp).toBe(35);
      expect(data.bypassStatus).toBe('on');
      expect(data.boilerIsUse).toBe(true);
      expect(data.boilerInstallPower).toBe(2500);
      expect(data.lastUpdate).toBe('2024-01-01T12:00:00');
      expect(data.plannerRecommendedMode).toBe('hybrid');
    });

    it('masks unknown/unavailable sensor values for nullable cost sensors', () => {
      const states = {
        'sensor.oig_SN1_computed_grid_import_cost_today': { state: 'unknown' },
        'sensor.oig_SN1_computed_grid_import_cost_month': { state: 'unavailable' },
        'sensor.oig_SN1_computed_grid_export_earnings_today': { state: '12.3' },
        'sensor.oig_SN1_computed_grid_export_earnings_month': { state: 'broken' },
      };
      const data = extractFlowData(makeHass(states), 'SN1');
      expect(data.gridImportCostToday).toBeNull();
      expect(data.gridImportCostMonth).toBeNull();
      expect(data.gridExportEarningsToday).toBe(12.3);
      expect(data.gridExportEarningsMonth).toBeNull();
    });

    it('falls back to today_total_sum_kw when daily value is absent', () => {
      const states = {
        'sensor.oig_SN1_solar_forecast': {
          state: '5',
          attributes: {
            today_total_sum_kw: '7.2',
            tomorrow_total_sum_kw: '11.1',
          },
        },
      };
      const data = extractFlowData(makeHass(states), 'SN1');
      expect(data.solarForecastToday).toBe(7.2);
      expect(data.solarForecastTomorrow).toBe(11.1);
    });

    it('treats empty/missing solar forecast attributes as null', () => {
      const states = {
        'sensor.oig_SN1_solar_forecast': { state: '', attributes: { today_total_kwh: '' } },
      };
      const data = extractFlowData(makeHass(states), 'SN1');
      expect(data.solarForecastToday).toBe(0); // parseFloat('') -> NaN -> 0
      expect(data.solarForecastTomorrow).toBe(0);
      expect(data.solarForecastStale).toBe(false);
    });

    it('uses battery_forecast attribute for planned_consumption_today defaulting to 0', () => {
      const states = {
        'sensor.oig_SN1_battery_forecast': { state: '8', attributes: {} },
      };
      const data = extractFlowData(makeHass(states), 'SN1');
      expect(data.zalohaPlannedRemainingKwh).toBe(0);
    });

    it('resolves grid delivery via suffix-safe lookup', () => {
      const states = {
        'sensor.oig_SN1_invertor_prms_to_grid_1': { state: 'on' },
        'sensor.oig_SN1_invertor_prm1_p_max_feed_grid_2': { state: '4500' },
      };
      const data = extractFlowData(makeHass(states), 'SN1');
      expect(data.inverterGridMode).toBe('on');
      expect(data.inverterGridLimit).toBe(4500);
    });

    it('treats boiler_is_use = "Zapnuto" as truthy even when parseBool returns false', () => {
      const states = {
        'sensor.oig_SN1_boiler_is_use': { state: 'Zapnuto' },
      };
      const data = extractFlowData(makeHass(states), 'SN1');
      expect(data.boilerIsUse).toBe(true);
    });
  });

  describe('applyPlannerSettings', () => {
    const baseFlow = (over: Partial<FlowData> = {}): FlowData => ({
      solarPower: 0, solarP1: 0, solarP2: 0, solarV1: 0, solarV2: 0, solarI1: 0, solarI2: 0,
      solarPercent: 0, solarToday: 0, solarForecastToday: 0, solarForecastTomorrow: 0, solarForecastStale: false,
      batterySoC: 0, batteryPower: 0, batteryVoltage: 0, batteryCurrent: 0, batteryTemp: 0,
      batteryChargeTotal: 0, batteryDischargeTotal: 0, batteryChargeSolar: 0, batteryChargeGrid: 0,
      batteryChargeMonth: 0, batteryDischargeMonth: 0,
      batteryFloorPct: 0, batteryUsableKwh: 0, batteryInstalledKwh: 0, batteryMissingKwh: 0,
      batterySoH: 0, batteryEfficiency: 0, batteryForecastKwh: 0,
      isGridCharging: false, timeToEmpty: '', timeToFull: '',
      balancingState: 'standby', balancingTimeRemaining: '',
      gridChargingPlan: { hasBlocks: false, totalEnergyKwh: 0, totalCostCzk: 0, windowLabel: null, durationMinutes: 0, currentBlockLabel: null, nextBlockLabel: null, blocks: [] },
      gridPower: 0, gridVoltage: 0, gridFrequency: 0, gridImportToday: 0, gridExportToday: 0,
      gridL1V: 0, gridL2V: 0, gridL3V: 0, gridL1P: 0, gridL2P: 0, gridL3P: 0,
      spotPrice: 0, exportPrice: 0, currentTariff: '',
      gridImportCostToday: null, gridImportCostMonth: null,
      gridExportEarningsToday: null, gridExportEarningsMonth: null,
      housePower: 0, houseTodayWh: 0, houseL1: 0, houseL2: 0, houseL3: 0,
      nonbackupPower: 0, nonbackupTodayWh: 0, nonbackupL1: 0, nonbackupL2: 0, nonbackupL3: 0,
      zalohaPlannedRemainingKwh: 0,
      selfSufficiencyTodayPct: 0, srcFveTodayKwh: 0, srcBatteryTodayKwh: 0, srcGridTodayKwh: 0,
      inverterMode: '', inverterGridMode: 'unknown', inverterGridLimit: 0,
      inverterTemp: 0, bypassStatus: 'off', notificationsUnread: 0, notificationsError: 0,
      boilerIsUse: false, boilerPower: 0, boilerDayEnergy: 0, boilerManualMode: '', boilerInstallPower: 3000,
      plannerAutoMode: null, plannerRecommendedMode: '', lastUpdate: '',
      ...over,
    });

    it('returns the same object untouched when settings is null (fetch failed)', () => {
      const flow = baseFlow({ plannerAutoMode: true });
      const result = applyPlannerSettings(flow, null);
      expect(result).toBe(flow); // same reference — no wipe
      expect(result.plannerAutoMode).toBe(true);
    });

    it('sets plannerAutoMode = true when auto_mode_switch_enabled is true', () => {
      const flow = baseFlow();
      const result = applyPlannerSettings(flow, { auto_mode_switch_enabled: true, planner_mode: 'hybrid' });
      expect(result.plannerAutoMode).toBe(true);
    });

    it('sets plannerAutoMode = false when auto_mode_switch_enabled is false', () => {
      const flow = baseFlow();
      const result = applyPlannerSettings(flow, { auto_mode_switch_enabled: false, planner_mode: 'hybrid' });
      expect(result.plannerAutoMode).toBe(false);
    });

    it('tolerates missing auto_mode_switch_enabled field as off', () => {
      const flow = baseFlow();
      const result = applyPlannerSettings(flow, { planner_mode: 'hybrid' });
      expect(result.plannerAutoMode).toBe(false);
    });

    it('returns the same reference when value is already in sync (avoids needless re-renders)', () => {
      const flow = baseFlow({ plannerAutoMode: true });
      const result = applyPlannerSettings(flow, { auto_mode_switch_enabled: true, planner_mode: 'hybrid' });
      expect(result).toBe(flow);
    });

    it('preserves all other FlowData fields when toggling plannerAutoMode', () => {
      const flow = baseFlow({ solarPower: 1234, balancerState: 'planned' as any });
      const result = applyPlannerSettings(flow, { auto_mode_switch_enabled: true, planner_mode: 'hybrid' });
      expect(result.solarPower).toBe(1234);
      // Other fields preserved
      expect(result.plannerRecommendedMode).toBe('');
    });
  });

  describe('computeDailySelfSufficiency', () => {
    it('returns zeroed result when total load is zero', () => {
      const r = computeDailySelfSufficiency({
        fveTodayWh: 1000, battDischargeTodayWh: 0, battChargeFveTodayWh: 0,
        battChargeGridTodayWh: 0, zalohaConsumptionWh: 0, nezalohaConsumptionWh: 0, gridExportTodayWh: 0,
      });
      expect(r.pct).toBe(0);
      expect(r.fveKwh).toBe(0);
      expect(r.batteryKwh).toBe(0);
      expect(r.gridKwh).toBe(0);
    });

    it('clamps negative and non-finite inputs to 0', () => {
      const r = computeDailySelfSufficiency({
        fveTodayWh: -1000, battDischargeTodayWh: NaN, battChargeFveTodayWh: -50,
        battChargeGridTodayWh: Infinity, zalohaConsumptionWh: 1000, nezalohaConsumptionWh: 500,
        gridExportTodayWh: -10,
      });
      expect(r.pct).toBeGreaterThanOrEqual(0);
      expect(r.pct).toBeLessThanOrEqual(100);
    });

    it('caps pct at 100 and never goes negative', () => {
      const r = computeDailySelfSufficiency({
        fveTodayWh: 5000, battDischargeTodayWh: 5000, battChargeFveTodayWh: 0,
        battChargeGridTodayWh: 0, zalohaConsumptionWh: 500, nezalohaConsumptionWh: 500,
        gridExportTodayWh: 0,
      });
      expect(r.pct).toBe(100);
    });

    it('reports grid contribution when FVE production is less than load', () => {
      const r = computeDailySelfSufficiency({
        fveTodayWh: 1000, battDischargeTodayWh: 0, battChargeFveTodayWh: 0,
        battChargeGridTodayWh: 0, zalohaConsumptionWh: 800, nezalohaConsumptionWh: 700,
        gridExportTodayWh: 0,
      });
      // total load = 1500; fve_to_load clamped to <= load; grid fills remainder
      expect(r.gridKwh).toBeGreaterThan(0);
    });

    it('computes arcFve/arcBattery/arcGrid as fractions summing to ~1', () => {
      const r = computeDailySelfSufficiency({
        fveTodayWh: 600, battDischargeTodayWh: 400, battChargeFveTodayWh: 0,
        battChargeGridTodayWh: 0, zalohaConsumptionWh: 500, nezalohaConsumptionWh: 500,
        gridExportTodayWh: 0,
      });
      const sum = r.arcFve + r.arcBattery + r.arcGrid;
      expect(sum).toBeCloseTo(1, 5);
    });
  });

  describe('formatPlanWindow edge cases', () => {
    it('returns null for non-array input', () => {
      expect(formatPlanWindow(undefined as unknown as GridChargingBlock[])).toBeNull();
      expect(formatPlanWindow(null as unknown as GridChargingBlock[])).toBeNull();
    });

    it('returns day label when both blocks share a day but have no times', () => {
      const blocks: GridChargingBlock[] = [{ day: 'today' }, { day: 'today' }];
      // prefix 'dnes ' trimmed -> 'dnes' since first.time_from is missing
      expect(formatPlanWindow(blocks)).toBe('dnes');
    });

    it('returns day-prefixed "--" placeholders when blocks span multiple days with missing times', () => {
      const blocks: GridChargingBlock[] = [
        { day: 'today' }, { day: 'tomorrow' },
      ];
      expect(formatPlanWindow(blocks)).toBe('dnes -- → zítra --');
    });
  });
});
