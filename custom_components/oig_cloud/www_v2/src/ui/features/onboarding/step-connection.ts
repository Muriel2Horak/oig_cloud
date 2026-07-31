import { fieldsFromRegistry, isVisible } from '@/data/registry-data';
import type { FieldDef } from '@/ui/features/settings';
import type { RegistryStep } from '@/ui/features/onboarding/step-solar';

/**
 * UX-SPEC §Step 8: `data_source_mode`'s registry enum is 3-valued
 * (cloud_only/local_only/hybrid) — `hybrid` is a legacy value kept only so a
 * pre-existing entry's GET->POST round-trip stays honest, never a
 * selectable option. `i18n/enum-labels.ts` gives it no catalog entry on
 * purpose, so this excludes it explicitly rather than let a catalog-miss
 * silently fall back to the raw string (spec §6: "no raw enum value is ever
 * a visible label").
 */
function excludeHybrid(fields: FieldDef[]): FieldDef[] {
  return fields.map((f) =>
    f.key === 'data_source_mode' && f.options
      ? { ...f, options: f.options.filter(([v]) => v !== 'hybrid') }
      : f,
  );
}

export const STEP_CONNECTION: RegistryStep = {
  id: 'connection',
  section: 'basic',
  blocksDashboard: false,
  skippable: true,
  fields: (reg) => excludeHybrid(fieldsFromRegistry(reg, 'basic')),
  visibleFields: (reg, values) =>
    excludeHybrid(fieldsFromRegistry(reg, 'basic')).filter((f) => isVisible(f, (k) => values[k])),
};
