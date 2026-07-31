/**
 * F1 Plan 3.6 Task 6 — typed classified-error client path RED tests.
 *
 * `fetchOIGAPI` swallows every non-2xx response to `null` (ha-client.ts's
 * `fetchWithRetry` throws on non-ok, `fetchOIGAPI` catches and discards the
 * body). `fetchOIGAPITyped` must instead surface `{ ok, status, code, error }`
 * on non-2xx, and distinguish an aborted request from a generic network
 * failure.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HaClient } from '@/data/ha-client';

function mockHass() {
  return {
    auth: { data: { access_token: 'test-token' } },
    states: {},
    callService: vi.fn(),
    callApi: vi.fn(),
    callWS: vi.fn(),
  };
}

describe('HaClient.fetchOIGAPITyped (F1 Plan 3.6 Task 6)', () => {
  let client: HaClient;
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new HaClient();
    (client as unknown as { hass: unknown }).hass = mockHass();
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('surfaces the parsed JSON body + status on a classified 400', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      statusText: 'Bad Request',
      json: async () => ({ error: 'unknown provider', code: 'invalid_response' }),
    });

    const result = await client.fetchOIGAPITyped('/SN1/solar_test', { method: 'POST' });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure result');
    expect(result.status).toBe(400);
    expect(result.code).toBe('invalid_response');
    expect(result.error).toBe('unknown provider');
  });

  it('surfaces the parsed JSON body + status on a classified 502 — not null', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 502,
      statusText: 'Bad Gateway',
      json: async () => ({ ok: false, code: 'provider_unreachable' }),
    });

    const result = await client.fetchOIGAPITyped('/SN1/solar_test', { method: 'POST' });

    expect(result).not.toBeNull();
    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure result');
    expect(result.status).toBe(502);
    expect(result.code).toBe('provider_unreachable');
  });

  it('returns the parsed body on a 2xx response', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ tomorrow_total_kwh: 12.3, forecast_covers_tomorrow: true }),
    });

    const result = await client.fetchOIGAPITyped<{ tomorrow_total_kwh: number }>('/SN1/solar_test', {
      method: 'POST',
    });

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected success result');
    expect(result.status).toBe(200);
    expect(result.data.tomorrow_total_kwh).toBe(12.3);
  });

  it('distinguishes an aborted request (code "aborted") from a generic network failure', async () => {
    const abortError = new DOMException('The operation was aborted', 'AbortError');
    fetchMock.mockRejectedValueOnce(abortError);

    const controller = new AbortController();
    const aborted = await client.fetchOIGAPITyped('/SN1/solar_test', {
      method: 'POST',
      signal: controller.signal,
    });

    expect(aborted.ok).toBe(false);
    if (aborted.ok) throw new Error('expected failure result');
    expect(aborted.code).toBe('aborted');

    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));
    const unreachable = await client.fetchOIGAPITyped('/SN1/solar_test', { method: 'POST' });

    expect(unreachable.ok).toBe(false);
    if (unreachable.ok) throw new Error('expected failure result');
    expect(unreachable.code).toBe('provider_unreachable');
    expect(unreachable.code).not.toBe('aborted');
  });

  it('threads the AbortSignal through to the underlying fetch call', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({}),
    });
    const controller = new AbortController();

    await client.fetchOIGAPITyped('/SN1/solar_test', { method: 'POST', signal: controller.signal });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init.signal).toBe(controller.signal);
  });
});
