// src/__tests__/registry-data.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/data/ha-client', () => ({ haClient: { fetchOIGAPI: vi.fn() } }));
import { haClient } from '@/data/ha-client';
import { loadFieldRegistry, fieldsFromRegistry, isVisible } from '@/data/registry-data';
import { fieldLabel, fieldHint } from '@/i18n/fields';

const mockFetch = haClient.fetchOIGAPI as ReturnType<typeof vi.fn>;

const REGISTRY = {
  fields: {
    solar_forecast_provider: {
      section: 'solar', type: 'str', scope: 'premium',
      label: 'field.solar_forecast_provider.label', hint: 'field.solar_forecast_provider.hint',
      default: 'forecast_solar', enum: ['forecast_solar', 'solcast'],
    },
    solcast_api_key: {
      section: 'solar', type: 'str', scope: 'premium', secret: true,
      label: 'field.solcast_api_key.label', hint: 'field.solcast_api_key.hint',
      show_if: { field: 'solar_forecast_provider', in: ['solcast'] },
    },
    solar_forecast_api_key: {
      section: 'solar', type: 'str', scope: 'premium', secret: true, optional: true,
      label: 'field.solar_forecast_api_key.label', hint: 'field.solar_forecast_api_key.hint',
      show_if: { field: 'solar_forecast_provider', in: ['forecast_solar'] },
    },
    expensive_percentile: {
      section: 'battery', type: 'float', scope: 'premium', default: 0.7,
      min: 0.5, max: 0.95, scale: 100,
      label: 'field.expensive_percentile.label', hint: 'field.expensive_percentile.hint',
    },
  },
  sections: ['battery', 'solar'],
};

beforeEach(() => mockFetch.mockReset());

describe('loadFieldRegistry', () => {
  it('returns null (never throws) when the endpoint errors', async () => {
    mockFetch.mockResolvedValue({ error: 'Box not found' });
    expect(await loadFieldRegistry()).toBeNull();
  });

  it('parses fields + sections', async () => {
    mockFetch.mockResolvedValue(REGISTRY);
    const reg = await loadFieldRegistry();
    expect(reg!.fields.solcast_api_key.secret).toBe(true);
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('/config_registry'),
      expect.objectContaining({ signal: undefined }),
    );
  });
});

describe('fieldsFromRegistry', () => {
  it('builds typed FieldDefs for one section, carrying showIf/scale/secret', () => {
    const defs = fieldsFromRegistry(REGISTRY as any, 'solar');
    const provider = defs.find((d) => d.key === 'solar_forecast_provider')!;
    expect(provider.type).toBe('select');
    expect(provider.options).toEqual([['forecast_solar', 'forecast_solar'], ['solcast', 'solcast']]);
    const solcastKey = defs.find((d) => d.key === 'solcast_api_key')!;
    expect(solcastKey.showIf).toEqual({ field: 'solar_forecast_provider', in: ['solcast'] });
    expect(solcastKey.secret).toBe(true);
    expect(defs.every((d) => d.key !== 'expensive_percentile')).toBe(true); // section filter
  });

  it('maps registry numeric types + scale onto the number widget', () => {
    const [pct] = fieldsFromRegistry(REGISTRY as any, 'battery');
    expect(pct.type).toBe('number');
    expect(pct.scale).toBe(100);
    expect(pct.min).toBe(0.5);
  });

  it('resolves i18n keys to Czech copy — never renders a raw key', () => {
    const defs = fieldsFromRegistry(REGISTRY as any, 'solar');
    for (const d of defs) {
      expect(d.label).not.toMatch(/^field\./);
      expect(d.label.length).toBeGreaterThan(0);
    }
  });
});

describe('isVisible', () => {
  const defs = fieldsFromRegistry(REGISTRY as any, 'solar');
  const solcastKey = defs.find((d) => d.key === 'solcast_api_key')!;
  const fsKey = defs.find((d) => d.key === 'solar_forecast_api_key')!;

  it('hides a field whose showIf predicate is unsatisfied', () => {
    const get = (k: string) => (k === 'solar_forecast_provider' ? 'forecast_solar' : undefined);
    expect(isVisible(solcastKey, get)).toBe(false);
    expect(isVisible(fsKey, get)).toBe(true);
  });

  it('reveals the matching provider key on switch', () => {
    const get = (k: string) => (k === 'solar_forecast_provider' ? 'solcast' : undefined);
    expect(isVisible(solcastKey, get)).toBe(true);
    expect(isVisible(fsKey, get)).toBe(false);
  });

  it('treats a field with no showIf as always visible', () => {
    const provider = defs.find((d) => d.key === 'solar_forecast_provider')!;
    expect(isVisible(provider, () => undefined)).toBe(true);
  });
});

// Direct catalog check — references fieldLabel/fieldHint imports (PLAN3 verbatim
// imports them without using them; this also documents the seeded Czech copy).
describe('fieldLabel / fieldHint catalog', () => {
  it('resolves an entered Czech label and a hint', () => {
    expect(fieldLabel('solcast_api_key', 'field.solcast_api_key.label')).toBe('Solcast API klíč');
    expect(fieldHint('solcast_api_key', 'field.solcast_api_key.hint')).toBe('Nech prázdné = beze změny');
  });

  it('falls back to a humanised key when the i18n key is unknown', () => {
    expect(fieldLabel('solar_forecast_api_key', 'field.solar_forecast_api_key.label')).toBe('forecast.solar API klíč');
    expect(fieldLabel('unknown_thing', 'field.unknown_thing.label')).toBe('unknown thing');
    expect(fieldHint('unknown_thing', 'field.unknown_thing.hint')).toBeUndefined();
  });
});
