import { fieldsFromRegistry, isVisible } from '@/data/registry-data';
import type { FieldRegistry } from '@/data/registry-data';
import type { FieldDef } from '@/ui/features/settings';
import type { RegistryStep } from '@/ui/features/onboarding/step-solar';

/** UX-SPEC §Step 6 grouping, spec order — Task 18. */
export interface BatteryGroup {
  id: string;
  heading: string;
  keys: readonly string[];
}

export const BATTERY_GROUPS: readonly BatteryGroup[] = [
  { id: 'nabijeni', heading: 'Nabíjení', keys: ['charge_rate_kw', 'battery_comfort_soc_percent'] },
  { id: 'automatika', heading: 'Automatika', keys: ['auto_mode_switch_enabled'] },
  {
    id: 'vyrovnavani',
    heading: 'Vyrovnávání článků',
    keys: [
      'balancing_enabled',
      'balancing_interval_days',
      'balancing_hold_hours',
      'balancing_opportunistic_threshold',
      'balancing_economic_threshold',
    ],
  },
  { id: 'planovac', heading: 'Plánovač', keys: ['expensive_percentile', 'cheap_window_percentile'] },
];

/**
 * `balancing_enabled`'s 4 sub-fields, client-side fallback gate. Today's
 * registry (`config_registry.py:309-314`) carries no `show_if` for these —
 * plan Task 18 step 3 requires the gate regardless of whether Phase A adds
 * the server-side one later.
 */
const BALANCING_GATED_KEYS: ReadonlySet<string> = new Set([
  'balancing_interval_days',
  'balancing_hold_hours',
  'balancing_opportunistic_threshold',
  'balancing_economic_threshold',
]);

export function isBalancingGated(key: string, values: Record<string, unknown>): boolean {
  return BALANCING_GATED_KEYS.has(key) && !values['balancing_enabled'];
}

export const STEP_BATTERY: RegistryStep = {
  id: 'battery',
  section: 'battery',
  blocksDashboard: false,
  skippable: true,
  fields: (reg) => fieldsFromRegistry(reg, 'battery'),
  visibleFields: (reg: FieldRegistry, values: Record<string, unknown>): FieldDef[] =>
    fieldsFromRegistry(reg, 'battery')
      .filter((f) => isVisible(f, (k) => values[k]))
      .filter((f) => !isBalancingGated(f.key, values)),
};
