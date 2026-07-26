import { fieldsFromRegistry, isVisible } from '@/data/registry-data';
import type { FieldRegistry } from '@/data/registry-data';
import type { FieldDef } from '@/ui/features/settings';
import type { RegistryStep } from '@/ui/features/onboarding/step-solar';
import type { OnboardingKey } from '@/i18n/onboarding';

/** UX-SPEC §Step 6 grouping, spec order — Task 18. */
export interface BatteryGroup {
  id: string;
  heading: string;
  keys: readonly string[];
}

/** Wizard-facing battery fields only. Expert tuning stays in Settings. */
export const BATTERY_WIZARD_FIELD_KEYS = [
  'charge_rate_kw',
  'battery_comfort_soc_percent',
] as const;

const BATTERY_WIZARD_KEY_SET = new Set<string>(BATTERY_WIZARD_FIELD_KEYS);

export const BATTERY_GROUPS: readonly BatteryGroup[] = [
  { id: 'nabijeni', heading: 'Nabíjení', keys: BATTERY_WIZARD_FIELD_KEYS },
];

export interface BatteryHardwareChip {
  id: string;
  labelKey: OnboardingKey;
  attr: 'max_capacity_kwh' | 'min_capacity_kwh';
}

export const BATTERY_HARDWARE_CHIPS: readonly BatteryHardwareChip[] = [
  {
    id: 'battery-capacity-chip',
    labelKey: 'onboarding.battery.hardware.capacity',
    attr: 'max_capacity_kwh',
  },
  {
    id: 'battery-hw-min-chip',
    labelKey: 'onboarding.battery.hardware.hw_min_soc',
    attr: 'min_capacity_kwh',
  },
];

export function getBatteryHardwareValue(
  hass: any,
  inverterSn: string,
  attr: BatteryHardwareChip['attr'],
): number | null {
  if (!inverterSn || !hass?.states) return null;
  const entity = hass.states[`sensor.oig_${inverterSn}_battery_forecast`];
  if (!entity || entity.state === 'unknown' || entity.state === 'unavailable') return null;
  const raw = entity.attributes?.[attr];
  const value = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(value) ? value : null;
}

export function isBatteryWizardField(key: string): boolean {
  return BATTERY_WIZARD_KEY_SET.has(key);
}

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
      .filter((f) => isBatteryWizardField(f.key))
      .filter((f) => isVisible(f, (k) => values[k]))
      .filter((f) => !isBalancingGated(f.key, values)),
};
