/**
 * OIG Cloud V2 — Field registry data layer.
 *
 * Talks to GET /api/oig_cloud/<sn>/config_registry — a whitelisted bridge that
 * describes every dashboard-editable field (label, hint, widget type, bounds,
 * visibility predicate, secret flag, etc.). Task 4 makes the settings cards
 * render from this registry instead of hand-written lists; this task ships
 * the FE client + the Czech label catalog so `field.<key>.label` never
 * surfaces as a raw i18n key on screen.
 */

import { haClient } from '@/data/ha-client';
import type { FieldDef } from '@/ui/features/settings';
import { fieldLabel, fieldHint } from '@/i18n/fields';

const params = new URLSearchParams(window.location.search);
const INVERTER_SN = params.get('sn') || params.get('inverter_sn') || '';

export interface RegistrySpec {
  section: string; type: 'bool' | 'int' | 'float' | 'str'; scope: string;
  label: string; hint: string; default?: unknown;
  min?: number; max?: number; step?: number; enum?: string[];
  secret?: boolean; reload_on_change?: boolean;
  show_if?: { field: string; in: unknown[] };
  widget?: string; scale?: number; optional?: boolean; entity_domain?: string;
}
export interface FieldRegistry { fields: Record<string, RegistrySpec>; sections: string[]; }

export async function loadFieldRegistry(): Promise<FieldRegistry | null> {
  const data = await haClient.fetchOIGAPI<FieldRegistry | { error?: string }>(
    `/${INVERTER_SN}/config_registry`,
  );
  if (!data || (data as any).error || !(data as any).fields) return null;
  return data as FieldRegistry;
}

function widgetFor(spec: RegistrySpec): FieldDef['type'] {
  if (spec.widget) return spec.widget as FieldDef['type'];
  if (spec.type === 'bool') return 'bool';
  if (spec.enum) return 'select';
  if (spec.type === 'int' || spec.type === 'float') return 'number';
  return 'text';
}

export function fieldsFromRegistry(reg: FieldRegistry, section: string): FieldDef[] {
  return Object.entries(reg.fields)
    .filter(([, spec]) => spec.section === section)
    .map(([key, spec]) => ({
      key,
      label: fieldLabel(key, spec.label),
      hint: fieldHint(key, spec.hint),
      type: widgetFor(spec),
      min: spec.min, max: spec.max, step: spec.step,
      options: spec.enum?.map((v) => [v, v] as [string, string]),
      scale: spec.scale,
      optional: spec.optional,
      secret: spec.secret,
      showIf: spec.show_if,
      entity: spec.entity_domain ? { domain: spec.entity_domain } : undefined,
    }));
}

/** U1: a field is rendered only when its showIf predicate holds. */
export function isVisible(f: FieldDef, get: (key: string) => unknown): boolean {
  if (!f.showIf) return true;
  return f.showIf.in.some((v) => v === get(f.showIf!.field));
}
