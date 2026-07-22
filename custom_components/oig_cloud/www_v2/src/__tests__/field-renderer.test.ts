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
});
