// src/__tests__/field-renderer.test.ts
//
// F1 Plan 3.6 Task 1 — `renderFieldPresenter` is extracted from
// settings/index.ts renderField/renderFieldDisableable as a PURE function:
// no closures over component `this`, callers pass an explicit context.
// Assert the REAL classes (.row/.lab/.row-control) — not .field/.field-label.

import { describe, it, expect, vi } from 'vitest';
import { render } from 'lit';
import { renderFieldPresenter, type FieldPresenterContext } from '@/ui/features/field-renderer';
import type { FieldDef } from '@/ui/features/settings';
import type { EntityEntry } from '@/ui/components/entity-picker';

function mount(f: FieldDef, ctx: FieldPresenterContext): HTMLDivElement {
  const container = document.createElement('div');
  render(renderFieldPresenter(f, ctx), container);
  return container;
}

function baseCtx(overrides: Partial<FieldPresenterContext> = {}): FieldPresenterContext {
  return {
    value: undefined,
    dirty: false,
    secretSet: false,
    onChange: vi.fn(),
    entityCatalog: [],
    ...overrides,
  };
}

describe('renderFieldPresenter (Task 1 — shared field renderer/presenter)', () => {
  it('renders a bool field as a checkbox inside .row/.lab/.row-control and fires onChange', () => {
    const f: FieldDef = { key: 'enable_boiler', label: 'Bojler', type: 'bool' };
    const onChange = vi.fn();
    const el = mount(f, baseCtx({ value: true, onChange }));

    expect(el.querySelector('.row')).toBeTruthy();
    expect(el.querySelector('.lab')).toBeTruthy();
    expect(el.querySelector('.row-control')).toBeTruthy();
    // guards against the v1 defect: wrong classes (.field/.field-label) never existed
    expect(el.querySelector('.field')).toBeNull();
    expect(el.querySelector('.field-label')).toBeNull();

    const input = el.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(input.checked).toBe(true);

    input.checked = false;
    input.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledWith(false);
  });

  it('renders a select-with-secret field and fires onChange with the selected value', () => {
    const f: FieldDef = {
      key: 'solar_forecast_provider',
      label: 'Poskytovatel',
      type: 'select',
      options: [['forecast_solar', 'forecast.solar'], ['solcast', 'Solcast']],
      secret: true,
    };
    const onChange = vi.fn();
    const el = mount(f, baseCtx({ value: 'forecast_solar', onChange }));

    const select = el.querySelector('select') as HTMLSelectElement;
    expect(select).toBeTruthy();
    expect(el.querySelector('.row')).toBeTruthy();

    select.value = 'solcast';
    select.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledWith('solcast');
  });

  it('renders a number-with-scale field, showing the scaled value and coercing back on change', () => {
    const f: FieldDef = {
      key: 'expensive_percentile', label: 'Práh drahých hodin (%)', type: 'number',
      min: 50, max: 95, step: 5, scale: 100,
    };
    const onChange = vi.fn();
    // stored 0.7 -> displayed 70
    const el = mount(f, baseCtx({ value: 0.7, onChange }));
    const input = el.querySelector('input[type="number"]') as HTMLInputElement;
    expect(input.value).toBe('70');

    input.value = '80';
    input.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledWith(0.8);
  });

  it('renders an entity-picker field with the passed entityCatalog', () => {
    const f: FieldDef = {
      key: 'boiler_current_power_entity', label: 'Senzor výkonu', type: 'text',
      entity: { domain: 'sensor' },
    };
    const catalog: EntityEntry[] = [{ entity_id: 'sensor.x', friendly_name: 'X' }];
    const el = mount(f, baseCtx({ value: 'sensor.x', entityCatalog: catalog }));

    const picker = el.querySelector('oig-entity-picker') as unknown as {
      entities: EntityEntry[];
      value: string;
    } | null;
    expect(picker).toBeTruthy();
    expect(picker!.entities).toBe(catalog);
    expect(picker!.value).toBe('sensor.x');
  });

  it('a secret field with secretSet=true shows a masked placeholder and NO raw value', () => {
    const f: FieldDef = { key: 'solcast_api_key', label: 'Solcast API klíč', type: 'text', secret: true };
    const el = mount(f, baseCtx({ value: 'super-secret-value', secretSet: true }));

    const input = el.querySelector('input[type="password"]') as HTMLInputElement;
    expect(input).toBeTruthy();
    expect(input.value).toBe('');
    expect(input.value).not.toContain('super-secret-value');
    expect(input.getAttribute('placeholder')).toMatch(/nastaveno/);
  });

  it('a secret field with secretSet=false shows the "nenastaveno" placeholder', () => {
    const f: FieldDef = { key: 'solcast_api_key', label: 'Solcast API klíč', type: 'text', secret: true };
    const el = mount(f, baseCtx({ value: '', secretSet: false }));
    const input = el.querySelector('input[type="password"]') as HTMLInputElement;
    expect(input.getAttribute('placeholder')).toBe('nenastaveno');
  });

  it('fires onChange with the raw value for a plain (non-secret) text field', () => {
    const f: FieldDef = { key: 'solcast_site_id', label: 'Solcast site ID', type: 'text' };
    const onChange = vi.fn();
    const el = mount(f, baseCtx({ value: 'abc', onChange }));
    const input = el.querySelector('input[type="text"]') as HTMLInputElement;
    expect(input.value).toBe('abc');

    input.value = 'xyz';
    input.dispatchEvent(new Event('change'));
    expect(onChange).toHaveBeenCalledWith('xyz');
  });

  // -- Stage S2 Task 7: per-field diff hint (UX-SPEC §3/§6) --------------

  it('renders a diff hint when value differs from originalValue, none when equal', () => {
    const f: FieldDef = { key: 'charge_rate_kw', label: 'Nabíjecí výkon', type: 'number' };
    const withDiff = mount(f, baseCtx({ value: 3.0, originalValue: 2.8, dirty: true }));
    expect(withDiff.querySelector('[data-testid="diff-hint"]')?.textContent).toBe('Bylo: 2.8 → Nyní: 3');

    const noDiff = mount(f, baseCtx({ value: 2.8, originalValue: 2.8 }));
    expect(noDiff.querySelector('[data-testid="diff-hint"]')).toBeNull();
  });

  it('does not render a diff hint when originalValue is undefined (new install, nothing to compare)', () => {
    const f: FieldDef = { key: 'solar_forecast_latitude', label: 'Zeměpisná šířka', type: 'number' };
    const el = mount(f, baseCtx({ value: 49.5, originalValue: undefined }));
    expect(el.querySelector('[data-testid="diff-hint"]')).toBeNull();
  });

  it('renders a diff hint for a bool field using humanized Zapnuto/Vypnuto, none when unchanged', () => {
    const f: FieldDef = { key: 'enable_boiler', label: 'Bojler', type: 'bool' };
    const changed = mount(f, baseCtx({ value: false, originalValue: true, dirty: true }));
    expect(changed.querySelector('[data-testid="diff-hint"]')?.textContent).toBe('Bylo: Zapnuto → Nyní: Vypnuto');

    const unchanged = mount(f, baseCtx({ value: true, originalValue: true }));
    expect(unchanged.querySelector('[data-testid="diff-hint"]')).toBeNull();
  });

  it('a secret field never shows its raw value in the diff hint — masked, and only when dirty in review mode', () => {
    const f: FieldDef = { key: 'solcast_api_key', label: 'Solcast API klíč', type: 'text', secret: true };

    const changed = mount(f, baseCtx({ value: 'new-secret-value', dirty: true, secretSet: true, reviewMode: true }));
    const hint = changed.querySelector('[data-testid="diff-hint"]');
    expect(hint?.textContent).toBe('Bylo: (nastaveno) → Nyní: (změněno)');
    expect(hint?.textContent).not.toContain('new-secret-value');

    const untouched = mount(f, baseCtx({ value: '', dirty: false, secretSet: true, reviewMode: true }));
    expect(untouched.querySelector('[data-testid="diff-hint"]')).toBeNull();
  });

  // regression: opus S2 review — secret diff hint keys off `dirty` only, so a
  // dirty secret edit in the plain settings UI (reviewMode absent) leaked the
  // review-mode "Bylo → Nyní" hint. It must render ONLY in review mode.
  it('a dirty secret does NOT show the diff hint outside review mode (settings UI leak)', () => {
    const f: FieldDef = { key: 'solcast_api_key', label: 'Solcast API klíč', type: 'text', secret: true };
    const settingsEdit = mount(f, baseCtx({ value: 'new-secret-value', dirty: true, secretSet: true }));
    expect(settingsEdit.querySelector('[data-testid="diff-hint"]')).toBeNull();
  });
});
