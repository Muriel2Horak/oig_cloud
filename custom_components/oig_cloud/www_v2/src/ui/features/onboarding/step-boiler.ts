import { fieldsFromRegistry, isVisible } from '@/data/registry-data';
import type { FieldRegistry } from '@/data/registry-data';
import type { RegistryStep } from '@/ui/features/onboarding/step-solar';

/**
 * UX-SPEC §Step 7: all 25 `boiler` registry fields, single flat step (not
 * the legacy 8-substep `wizard_boiler_simple_1..8` HA-native flow), gated by
 * `enable_boiler` (Task 2's `STEP_GATE`, `index.ts`). The registry carries no
 * `show_if` on any boiler field today (verified `config_registry.py:352-401`),
 * so `visibleFields` is currently equivalent to `fields` — kept for parity
 * with `STEP_SOLAR`/the `RegistryStep` contract, and to auto-pick up a future
 * `show_if` without a second FE change.
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

/**
 * Structural grouping only (UX-SPEC §Step 7: "co modul dělá" intro → sensors
 * → thresholds → circulation → legionella, reusing the existing
 * `wizard_boiler` cs.json structure) — heading text below is hardcoded
 * Czech, NOT read from `cs.json` (Task 19 brief: field label/hint copy comes
 * from `i18n/fields.ts` CS_LABELS/CS_HINTS only; this keeps that same rule
 * for the group headings instead of re-importing the legacy translation
 * layer for a second kind of copy).
 */
export interface BoilerFieldGroup {
  heading: string;
  keys: readonly string[];
}

export const BOILER_FIELD_GROUPS: readonly BoilerFieldGroup[] = [
  {
    heading: 'Nádrž a senzory',
    keys: [
      'boiler_volume_l',
      'boiler_temp_sensor_top',
      'boiler_temp_sensor_bottom',
      'boiler_enable_second_thermometer',
      'boiler_current_power_entity',
      'box_has_home56',
    ],
  },
  {
    heading: 'Cílová teplota a alternativní zdroj',
    keys: [
      'boiler_target_temp_c',
      'boiler_deadline_time',
      'boiler_max_temp_c',
      'boiler_thermal_arbitrage_enabled',
      'boiler_has_alternative_heating',
      'boiler_alt_source_type',
      'boiler_alt_cost_kwh',
      'boiler_alt_power_kw',
      'boiler_alt_energy_sensor',
      'boiler_alt_energy_daily',
      'boiler_home5_maneuver_enabled',
      'boiler_battery_cycle_cost_czk_kwh',
    ],
  },
  {
    heading: 'Cirkulace teplé vody',
    keys: [
      'boiler_circulation_enabled',
      'boiler_circulation_lead_minutes',
      'boiler_circulation_run_minutes',
      'boiler_circulation_max_runs_per_day',
      'boiler_circulation_min_gap_minutes',
    ],
  },
  {
    heading: 'Ochrana proti legionele',
    keys: [
      'boiler_legionella_interval_days',
      'boiler_legionella_target_temp_c',
    ],
  },
];

/**
 * Every field a `FieldRegistry`'s `boiler` section carries but that isn't
 * listed in any `BOILER_FIELD_GROUPS` entry — a safety net against registry
 * drift (a new boiler field added server-side before the grouping above is
 * updated), rendered under its own fallback heading rather than silently
 * dropped. Empty for the current 25-field set.
 */
export function ungroupedBoilerFields(reg: FieldRegistry) {
  const grouped = new Set(BOILER_FIELD_GROUPS.flatMap((g) => g.keys));
  return fieldsFromRegistry(reg, 'boiler').filter((f) => !grouped.has(f.key));
}
