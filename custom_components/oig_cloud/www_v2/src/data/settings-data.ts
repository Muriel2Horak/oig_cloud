/**
 * OIG Cloud V2 — Dashboard settings (module config) data layer.
 *
 * Talks to GET/POST /api/oig_cloud/<sn>/module_config — a whitelisted,
 * validated bridge to the config-entry options, so common module settings
 * can be edited from the dashboard instead of the HA options flow.
 */

import { haClient } from '@/data/ha-client';
import { oigLog } from '@/core/logger';

const params = new URLSearchParams(window.location.search);
const INVERTER_SN = params.get('sn') || params.get('inverter_sn') || '';

export interface ModulesConfig {
  enable_solar_forecast: boolean;
  enable_battery_prediction: boolean;
  enable_pricing: boolean;
  enable_boiler: boolean;
  enable_statistics: boolean;
  enable_extended_sensors: boolean;
  enable_chmu_warnings: boolean;
}

export interface BatteryConfig {
  auto_mode_switch_enabled: boolean;
  charge_rate_kw: number | null;
  expensive_percentile: number | null;
  battery_comfort_soc_percent: number | null;
  balancing_enabled: boolean;
  balancing_interval_days: number | null;
  balancing_hold_hours: number | null;
  balancing_opportunistic_threshold: number | null;
  balancing_economic_threshold: number | null;
  cheap_window_percentile: number | null;
}

export interface SolarConfig {
  solar_forecast_provider: string;
  solar_forecast_mode: string;
  solar_forecast_api_key_set?: boolean;
  solcast_api_key_set?: boolean;
  solcast_site_id: string;
  solar_forecast_latitude: number | null;
  solar_forecast_longitude: number | null;
  solar_forecast_string1_enabled: boolean;
  solar_forecast_string1_declination: number | null;
  solar_forecast_string1_azimuth: number | null;
  solar_forecast_string1_kwp: number | null;
  solar_forecast_string2_enabled: boolean;
  solar_forecast_string2_declination: number | null;
  solar_forecast_string2_azimuth: number | null;
  solar_forecast_string2_kwp: number | null;
}

/** F5/Task B — Boiler config section (mirrors ha_rest_api _MODULE_CONFIG_FIELDS['boiler']). */
export interface BoilerConfig {
  // Nádrž a čidla
  boiler_volume_l: number | null;
  boiler_temp_sensor_top: string;
  boiler_temp_sensor_bottom: string;
  boiler_enable_second_thermometer: boolean;
  boiler_current_power_entity: string;
  // Alternativní zdroj
  boiler_has_alternative_heating: boolean;
  boiler_alt_source_type: string;
  boiler_alt_cost_kwh: number | null;
  boiler_alt_energy_sensor: string;
  boiler_alt_energy_daily: boolean;
  // Home 5/6 + baterie
  box_has_home56: boolean;
  boiler_home5_maneuver_enabled: boolean;
  boiler_battery_cycle_cost_czk_kwh: number | null;
  // Teplota a čas
  boiler_target_temp_c: number | null;
  boiler_deadline_time: string;
  // Tepelná arbitráž (fáze B)
  boiler_thermal_arbitrage_enabled: boolean;
  boiler_max_temp_c: number | null;
  boiler_alt_power_kw: number | null;
  // Cirkulace
  boiler_circulation_enabled: boolean;
  boiler_circulation_lead_minutes: number | null;
  boiler_circulation_run_minutes: number | null;
  boiler_circulation_max_runs_per_day: number | null;
  boiler_circulation_min_gap_minutes: number | null;
  // Anti-legionella
  boiler_legionella_interval_days: number | null;
  boiler_legionella_target_temp_c: number | null;
}

/** F1 Plan 3.6 Task 7 — mirrors config_registry.py's `pricing` section. */
export interface PricingConfig {
  confirmed_distribution_distributor: string;
  confirmed_distribution_tariff: string;
  confirmed_distribution_price_incl_vat: number;
  confirmed_distribution_price_excl_vat: number;
  confirmed_distribution_unit: string;
  // Relocated from PricingSupplierConfig (supplier-step redesign, owner
  // correction round 2 — distribution does not belong in the supplier
  // contract's step; key names unchanged, config_registry.py).
  distribution_fee_vt_kwh: number;
  distribution_fee_nt_kwh: number;
  vat_rate: number;
}

/** F1 U4 R3 (RCA-R3 restoration) — mirrors config_registry.py's
 * `pricing_supplier` section: legacy commercial/supplier pricing keys. */
export interface PricingSupplierConfig {
  spot_pricing_model: string;
  spot_positive_fee_percent: number;
  spot_positive_fee_percent_nt: number;
  spot_negative_fee_percent: number;
  spot_negative_fee_percent_nt: number;
  spot_fixed_fee_mwh: number;
  spot_fixed_fee_mwh_nt: number;
  fixed_commercial_price_vt: number;
  fixed_commercial_price_nt: number;
  export_pricing_model: string;
  export_fee_percent: number;
  export_fee_percent_nt: number;
  export_fixed_fee_czk: number;
  export_fixed_fee_czk_nt: number;
  export_fixed_price: number;
  tariff_vt_start_weekday: string;
  tariff_nt_start_weekday: string;
  tariff_weekend_same_as_weekday: boolean;
  tariff_vt_start_weekend: string;
  tariff_nt_start_weekend: string;
  dual_tariff_enabled: boolean;
}

export interface ModuleConfig {
  modules: ModulesConfig;
  battery: BatteryConfig;
  solar: SolarConfig;
  boiler: BoilerConfig;
  pricing?: PricingConfig;
  pricing_supplier?: PricingSupplierConfig;
}

export type SettingsSection =
  | 'modules'
  | 'battery'
  | 'solar'
  | 'boiler'
  | 'pricing'
  | 'pricing_supplier';

export async function loadModuleConfig(signal?: AbortSignal): Promise<ModuleConfig | null> {
  const data = await haClient.fetchOIGAPI<ModuleConfig | { error?: string }>(
    `/${INVERTER_SN}/module_config`,
    { signal },
  );
  if (!data || (data as any).error) {
    oigLog.warn('[Settings] module_config load failed', data as any);
    return null;
  }
  return data as ModuleConfig;
}

/**
 * Poll loadModuleConfig with exponential backoff until it returns a valid
 * config or the timeout expires.  Used after saving a section that triggers
 * a config-entry reload (e.g. boiler) — during the reload window the GET
 * returns 404 / "Box not found", which is EXPECTED and must NOT surface as
 * an error to the user.
 *
 * @param onSuccess  Called on first successful poll (receives the new config).
 * @param onTimeout  Called if the poll limit is reached without success.
 * @param delaysMs   Backoff delays in ms between polls (default: 2s 4s 8s 15s 30s).
 */
export async function waitForModuleConfigAfterReload(
  onSuccess: (cfg: ModuleConfig) => void,
  onTimeout: () => void,
  delaysMs: number[] = [2000, 4000, 8000, 15000, 30000],
): Promise<void> {
  for (const delay of delaysMs) {
    await new Promise<void>((res) => setTimeout(res, delay));
    // Deliberately call fetchOIGAPI directly to silence the normal warn path.
    const data = await haClient.fetchOIGAPI<ModuleConfig | { error?: string }>(
      `/${INVERTER_SN}/module_config`,
    );
    if (data && !(data as any).error) {
      onSuccess(data as ModuleConfig);
      return;
    }
    // 404 / "Box not found" during reload window — silently continue.
  }
  onTimeout();
}

export interface SaveResult {
  ok: boolean;
  /** Per-field validation errors from the backend, if any. */
  fields?: Record<string, string>;
}

export async function saveModuleConfig(
  section: SettingsSection,
  values: Record<string, unknown>,
): Promise<SaveResult> {
  const res = await haClient.fetchOIGAPI<any>(`/${INVERTER_SN}/module_config`, {
    method: 'POST',
    body: JSON.stringify({ section, values }),
  });
  if (res && (res.updated === true || res.updated === false)) {
    return { ok: true };
  }
  return { ok: false, fields: res?.fields };
}
