import { fieldsFromRegistry, isVisible } from '@/data/registry-data';
import type { FieldRegistry } from '@/data/registry-data';
import type { RegistryStep } from '@/ui/features/onboarding/step-solar';
import type { OnboardingKey } from '@/i18n/onboarding';

/**
 * UX-SPEC §Step 7: boiler fields are still registry-driven, but the wizard
 * now presents them with progressive disclosure: core setup first, then
 * three collapsed advanced groups.
 */
export const STEP_BOILER: RegistryStep = {
  id: 'boiler',
  section: 'boiler',
  blocksDashboard: false,
  skippable: true,
  fields: (reg) => fieldsFromRegistry(reg, 'boiler'),
  visibleFields: (reg, values) =>
    fieldsFromRegistry(reg, 'boiler').filter((f) => isVisible(f, (k) => values[k])),
};

export interface BoilerFieldGroup {
  id: string;
  heading: string;
  keys: readonly string[];
  collapsible: boolean;
  summaryKey?: OnboardingKey;
}

export const BOILER_CORE_KEYS = [
  'boiler_volume_l',
  'boiler_temp_sensor_top',
  'boiler_temp_sensor_bottom',
  'boiler_enable_second_thermometer',
  'boiler_target_temp_c',
  'boiler_deadline_time',
  'boiler_has_alternative_heating',
] as const;

export const BOILER_FIELD_GROUPS: readonly BoilerFieldGroup[] = [
  {
    id: 'core',
    heading: 'Základní údaje o bojleru',
    keys: BOILER_CORE_KEYS,
    collapsible: false,
  },
  {
    id: 'circulation',
    heading: 'Cirkulace teplé vody',
    keys: [
      'boiler_circulation_enabled',
      'boiler_circulation_lead_minutes',
      'boiler_circulation_run_minutes',
      'boiler_circulation_max_runs_per_day',
      'boiler_circulation_min_gap_minutes',
    ],
    collapsible: true,
    summaryKey: 'onboarding.boiler.advanced.circulation_summary',
  },
  {
    id: 'legionella',
    heading: 'Ochrana proti legionele',
    keys: [
      'boiler_legionella_interval_days',
      'boiler_legionella_target_temp_c',
    ],
    collapsible: true,
    summaryKey: 'onboarding.boiler.advanced.legionella_summary',
  },
  {
    id: 'alt-source',
    heading: 'Alternativní zdroj tepla',
    keys: [
      'boiler_alt_source_type',
      'boiler_alt_cost_kwh',
      'boiler_alt_energy_sensor',
      'boiler_alt_energy_daily',
      'boiler_battery_cycle_cost_czk_kwh',
      'boiler_thermal_arbitrage_enabled',
      'boiler_max_temp_c',
      'boiler_alt_power_kw',
      'boiler_current_power_entity',
      'box_has_home56',
      'boiler_home5_maneuver_enabled',
    ],
    collapsible: true,
    summaryKey: 'onboarding.boiler.advanced.alt_source_summary',
  },
];

/**
 * Every field a `FieldRegistry`'s `boiler` section carries but that isn't
 * listed in any `BOILER_FIELD_GROUPS` entry — a safety net against registry
 * drift. Current fixture should keep this empty.
 */
export function ungroupedBoilerFields(reg: FieldRegistry) {
  const grouped = new Set(BOILER_FIELD_GROUPS.flatMap((g) => g.keys));
  return fieldsFromRegistry(reg, 'boiler').filter((f) => !grouped.has(f.key));
}
