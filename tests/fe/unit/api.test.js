import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadScript } from './helpers/load_script.js';

function setParentQueryResult(result) {
  Object.defineProperty(globalThis, 'parent', {
    value: {
      document: {
        querySelector: () => result
      }
    },
    configurable: true
  });
}

describe('Dashboard API auth handling', () => {
  beforeAll(() => {
    loadScript('custom_components/oig_cloud/www/js/core/api.js');
  });

  beforeEach(() => {
    globalThis.fetch = vi.fn();
    globalThis.INVERTER_SN = '123';
    setParentQueryResult(null);
    globalThis.DashboardAPI.setInverterSN('123');
    globalThis.PlannerState.invalidate();
  });

  it('blocks authenticated HA API requests when token is missing', async () => {
    await expect(
      globalThis.DashboardAPI.fetchWithAuth('/api/oig_cloud/test-endpoint')
    ).rejects.toThrow('No Home Assistant access token available');

    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('prevents PlannerState fallback from sending unauthenticated requests', async () => {
    const result = await globalThis.PlannerState.fetchSettings(true);

    expect(result).toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('adds bearer token header when HA token is available', async () => {
    setParentQueryResult({
      hass: {
        auth: {
          data: {
            access_token: 'token-123'
          }
        }
      }
    });
    globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });

    await globalThis.DashboardAPI.fetchWithAuth('/api/oig_cloud/test-endpoint', {
      headers: {
        'X-Test': '1'
      }
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/oig_cloud/test-endpoint',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123',
          'X-Test': '1'
        })
      })
    );
  });

  it('uses hass.callApi for HA API requests when raw token is unavailable', async () => {
    const callApi = vi.fn().mockResolvedValue({ today: [] });
    setParentQueryResult({
      hass: {
        callApi,
        auth: {
          data: {}
        }
      }
    });

    const response = await globalThis.DashboardAPI.fetchWithAuth(
      '/api/oig_cloud/battery_forecast/123/detail_tabs?tab=today&plan=hybrid'
    );

    expect(globalThis.fetch).not.toHaveBeenCalled();
    expect(callApi).toHaveBeenCalledWith(
      'GET',
      'oig_cloud/battery_forecast/123/detail_tabs?tab=today&plan=hybrid',
      undefined
    );
    await expect(response.json()).resolves.toEqual({ today: [] });
    await expect(response.text()).resolves.toBe(JSON.stringify({ today: [] }));
  });

  it('passes parsed JSON body to hass.callApi for non-GET HA API requests', async () => {
    const callApi = vi.fn().mockResolvedValue({ ok: true });
    setParentQueryResult({
      hass: {
        callApi,
        auth: {
          data: {}
        }
      }
    });

    const response = await globalThis.DashboardAPI.fetchWithAuth(
      '/api/oig_cloud/battery_forecast/123/timeline',
      {
        method: 'POST',
        body: JSON.stringify({ plan: 'hybrid', day: 'today' })
      }
    );

    expect(callApi).toHaveBeenCalledWith(
      'POST',
      'oig_cloud/battery_forecast/123/timeline',
      { plan: 'hybrid', day: 'today' }
    );
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it('passes object body through to hass.callApi unchanged', async () => {
    const callApi = vi.fn().mockResolvedValue({ ok: true });
    const body = { plan: 'hybrid', force: true };
    setParentQueryResult({
      hass: {
        callApi,
        auth: {
          data: {}
        }
      }
    });

    await globalThis.DashboardAPI.fetchWithAuth('/api/oig_cloud/test-endpoint', {
      method: 'POST',
      body
    });

    expect(callApi).toHaveBeenCalledWith('POST', 'oig_cloud/test-endpoint', body);
  });

  it('throws when authenticated fetch helper is missing for PlannerState fallback', async () => {
    const originalDashboardFetch = globalThis.DashboardAPI.fetchWithAuth;
    const originalGlobalFetchWithAuth = globalThis.fetchWithAuth;

    globalThis.DashboardAPI.fetchWithAuth = undefined;
    globalThis.fetchWithAuth = undefined;

    try {
      const result = await globalThis.PlannerState.fetchSettings(true);
      expect(result).toBeNull();
    } finally {
      globalThis.DashboardAPI.fetchWithAuth = originalDashboardFetch;
      globalThis.fetchWithAuth = originalGlobalFetchWithAuth;
    }
  });

  it('returns null when PlannerState has no inverter serial number', async () => {
    globalThis.DashboardAPI.setInverterSN('');

    await expect(globalThis.PlannerState.fetchSettings(true)).resolves.toBeNull();
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('uses hass.callApi for PlannerState when available', async () => {
    const callApi = vi.fn().mockResolvedValue({ mode: 'hybrid' });
    setParentQueryResult({
      hass: {
        callApi,
        auth: {
          data: {}
        }
      }
    });

    await expect(globalThis.PlannerState.fetchSettings(true)).resolves.toEqual({ mode: 'hybrid' });
    expect(callApi).toHaveBeenCalledWith('GET', 'oig_cloud/battery_forecast/123/planner_settings');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('uses authenticated fetch fallback for PlannerState success path', async () => {
    setParentQueryResult({
      hass: {
        auth: {
          data: {
            access_token: 'token-123'
          }
        }
      }
    });
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ mode: 'hybrid' })
    });

    const result = await globalThis.PlannerState.fetchSettings(true);

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/oig_cloud/battery_forecast/123/planner_settings',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Authorization: 'Bearer token-123'
        })
      })
    );
    expect(result).toEqual({ mode: 'hybrid' });
  });

  it('reuses cached PlannerState settings without refetch when force is false', async () => {
    setParentQueryResult({
      hass: {
        auth: {
          data: {
            access_token: 'token-123'
          }
        }
      }
    });
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ mode: 'hybrid' })
    });

    await expect(globalThis.PlannerState.fetchSettings(true)).resolves.toEqual({ mode: 'hybrid' });
    await expect(globalThis.PlannerState.fetchSettings(false)).resolves.toEqual({ mode: 'hybrid' });

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('shares the inflight PlannerState request across callers', async () => {
    setParentQueryResult({
      hass: {
        auth: {
          data: {
            access_token: 'token-123'
          }
        }
      }
    });

    let resolveResponse;
    globalThis.fetch.mockImplementation(
      () => new Promise((resolve) => {
        resolveResponse = resolve;
      })
    );

    const first = globalThis.PlannerState.fetchSettings(true);
    const second = globalThis.PlannerState.fetchSettings(false);

    resolveResponse({
      ok: true,
      json: async () => ({ mode: 'hybrid' })
    });

    await expect(first).resolves.toEqual({ mode: 'hybrid' });
    await expect(second).resolves.toEqual({ mode: 'hybrid' });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it('returns null when authenticated PlannerState fallback gets non-ok response', async () => {
    setParentQueryResult({
      hass: {
        auth: {
          data: {
            access_token: 'token-123'
          }
        }
      }
    });
    globalThis.fetch.mockResolvedValue({ ok: false, status: 500 });

    const result = await globalThis.PlannerState.fetchSettings(true);

    expect(result).toBeNull();
  });

  it('blocks non-/api absolute URLs in fetchWithAuth', async () => {
    await expect(
      globalThis.DashboardAPI.fetchWithAuth('https://evil.com/api/data')
    ).rejects.toThrow('Nepovoleno: fetchWithAuth je pouze pro HA API');
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it('preserves existing Authorization header in fetchWithAuth', async () => {
    setParentQueryResult({
      hass: {
        auth: {
          data: {
            access_token: 'token-123'
          }
        }
      }
    });
    globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });

    await globalThis.DashboardAPI.fetchWithAuth('/api/oig_cloud/test', {
      headers: {
        Authorization: 'Bearer existing-token'
      }
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/oig_cloud/test',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer existing-token'
        })
      })
    );
  });

  it('falls back to raw fetch when hass exists but callApi is unavailable', async () => {
    setParentQueryResult({
      hass: {
        auth: {
          data: {
            access_token: 'token-123'
          }
        }
      }
    });
    globalThis.fetch.mockResolvedValue({ ok: true, json: async () => ({ data: 'test' }) });

    const response = await globalThis.DashboardAPI.fetchWithAuth('/api/oig_cloud/test-endpoint');

    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
    expect(response.ok).toBe(true);
  });

  it('handles empty-string POST body without JSON.parse error', async () => {
    const callApi = vi.fn().mockResolvedValue({ ok: true });
    setParentQueryResult({
      hass: {
        callApi,
        auth: {
          data: {}
        }
      }
    });

    await globalThis.DashboardAPI.fetchWithAuth('/api/oig_cloud/test', {
      method: 'POST',
      body: ''
    });

    expect(callApi).toHaveBeenCalledWith('POST', 'oig_cloud/test', undefined);
  });

  it('returns null when PlannerState fallback receives malformed JSON', async () => {
    setParentQueryResult({
      hass: {
        auth: {
          data: {
            access_token: 'token-123'
          }
        }
      }
    });
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON');
      }
    });

    const result = await globalThis.PlannerState.fetchSettings(true);

    expect(result).toBeNull();
  });

  it('returns the default hybrid plan label from PlannerState', async () => {
    setParentQueryResult({
      hass: {
        auth: {
          data: {
            access_token: 'token-123'
          }
        }
      }
    });
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ mode: 'hybrid' })
    });

    await expect(globalThis.PlannerState.getDefaultPlan(true)).resolves.toBe('hybrid');
    expect(globalThis.PlannerState.getCachedSettings()).toEqual({ mode: 'hybrid' });
    expect(globalThis.PlannerState.getLabels('missing')).toEqual({ short: 'Plán', long: 'Plánování' });
  });

  it('clears cached PlannerState settings when invalidated', async () => {
    setParentQueryResult({
      hass: {
        auth: {
          data: {
            access_token: 'token-123'
          }
        }
      }
    });
    globalThis.fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ mode: 'hybrid' })
    });

    await globalThis.PlannerState.fetchSettings(true);
    expect(globalThis.PlannerState.getCachedSettings()).toEqual({ mode: 'hybrid' });

    globalThis.PlannerState.invalidate();

    expect(globalThis.PlannerState.getCachedSettings()).toBeNull();
  });
});
