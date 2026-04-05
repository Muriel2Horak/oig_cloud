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
});
