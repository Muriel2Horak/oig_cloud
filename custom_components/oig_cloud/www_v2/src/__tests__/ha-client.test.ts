import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HaClient, type Hass, type OigApiResult } from '@/data/ha-client';

const STALE_TOKEN = 'stale-token-sentinel';
const CURRENT_TOKEN = 'current-token-sentinel';
const FRESH_TOKEN = 'fresh-token-sentinel';

type Dispatch = ReturnType<typeof vi.fn<[string, RequestInit?], Promise<Response>>>;

interface HaFake {
  hass: Hass;
  dispatch: Dispatch;
  transport: ReturnType<typeof vi.fn<[string, RequestInit?], Promise<Response>>>;
  haOwnedRefresh: ReturnType<typeof vi.fn<[], Promise<void>>>;
  forbiddenOigRefresh: ReturnType<typeof vi.fn<[], Promise<void>>>;
}

interface HaFakeOptions {
  expired?: boolean;
  refreshReject?: Error;
}

function response(status = 200, body: unknown = { ok: true }, type = 'basic'): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? 'OK' : `HTTP ${status}`,
    type,
    json: vi.fn().mockResolvedValue(body),
  } as unknown as Response;
}

function createHaFake(options: HaFakeOptions = {}): HaFake {
  const dispatch: Dispatch = vi.fn().mockResolvedValue(response());
  let activeToken = options.expired ? STALE_TOKEN : CURRENT_TOKEN;

  const forbiddenOigRefresh = vi.fn<[], Promise<void>>().mockResolvedValue(undefined);
  const haOwnedRefresh = vi.fn<[], Promise<void>>(async () => {
    if (options.refreshReject) throw options.refreshReject;
    activeToken = FRESH_TOKEN;
    hass.auth.expired = false;
  });

  const transport = vi.fn<[string, RequestInit?], Promise<Response>>(
    async (path, init = {}) => {
      if (hass.auth.expired) await haOwnedRefresh();

      if (init.headers instanceof Headers) {
        throw new Error('Home Assistant requires a copied plain header record');
      }
      const callerHeaders = { ...((init.headers ?? {}) as Record<string, string>) };
      const delegatedHeaders = {
        ...callerHeaders,
        authorization: `Bearer ${activeToken}`,
      };
      return dispatch(path, { ...init, headers: delegatedHeaders });
    },
  );

  const hass = {
    auth: {
      expired: options.expired ?? false,
      data: { access_token: activeToken },
      refreshAccessToken: forbiddenOigRefresh,
    },
    fetchWithAuth: transport,
    states: {},
    callService: vi.fn(),
    callApi: vi.fn(),
    callWS: vi.fn(),
  } as unknown as Hass;

  return { hass, dispatch, transport, haOwnedRefresh, forbiddenOigRefresh };
}

function setHass(client: HaClient, hass: Hass | null): void {
  (client as unknown as { hass: Hass | null }).hass = hass;
}

function dispatchedHeaders(fake: HaFake, call = 0): Record<string, string> {
  return fake.dispatch.mock.calls[call][1]?.headers as Record<string, string>;
}

async function invokePrivateDispatch(client: HaClient, path: string): Promise<unknown> {
  const seam = (
    client as unknown as {
      dispatchOigRequest?: (
        canonicalPath: string,
        init: RequestInit,
        policy: { kind: 'untyped'; retrySafeReads: boolean },
      ) => Promise<unknown>;
    }
  ).dispatchOigRequest;
  expect(typeof seam).toBe('function');
  if (!seam) return undefined;
  return seam.call(client, path, { method: 'GET' }, { kind: 'untyped', retrySafeReads: false });
}

async function settleTimers<T>(pending: Promise<T>): Promise<T> {
  await vi.runAllTimersAsync();
  return pending;
}

describe('HaClient authenticated Home Assistant transport', () => {
  let client: HaClient;
  let globalFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    client = new HaClient();
    globalFetch = vi.fn().mockRejectedValue(new TypeError('global-fetch-escape-sentinel'));
    vi.stubGlobal('fetch', globalFetch);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    delete (window as unknown as { hass?: Hass }).hass;
  });

  describe('Task 1: delegation and refresh ownership', () => {
    it('delegates typed POST through HA with the canonical path and preserved request fields', async () => {
      const fake = createHaFake({ expired: true });
      fake.dispatch.mockResolvedValue(response(200, { accepted: true }));
      setHass(client, fake.hass);
      const controller = new AbortController();
      const body = JSON.stringify({ mode: 'test' });

      const result = await client.fetchOIGAPITyped<{ accepted: boolean }>('SN1/solar_test', {
        method: 'POST',
        body,
        signal: controller.signal,
        headers: { 'X-Trace': 'trace-value' },
      });

      expect(result).toEqual({ ok: true, status: 200, data: { accepted: true } });
      expect(fake.transport).toHaveBeenCalledTimes(1);
      expect(fake.transport.mock.calls[0][0]).toBe('/api/oig_cloud/SN1/solar_test');
      const transportInit = fake.transport.mock.calls[0][1]!;
      expect(transportInit.method).toBe('POST');
      expect(transportInit.body).toBe(body);
      expect(transportInit.signal).toBe(controller.signal);
      expect(transportInit.redirect).toBe('manual');
      expect(transportInit.headers).not.toBeInstanceOf(Headers);
      expect(Object.getPrototypeOf(transportInit.headers as object)).toBe(Object.prototype);
      expect(transportInit.headers).toEqual({
        'content-type': 'application/json',
        'x-trace': 'trace-value',
      });
      expect(dispatchedHeaders(fake)).toEqual({
        'content-type': 'application/json',
        'x-trace': 'trace-value',
        authorization: `Bearer ${FRESH_TOKEN}`,
      });
      expect(fake.haOwnedRefresh).toHaveBeenCalledTimes(1);
      expect(fake.forbiddenOigRefresh).not.toHaveBeenCalled();
      expect(globalFetch).not.toHaveBeenCalled();
    });

    it('delegates untyped GET through HA and parses the successful response', async () => {
      const fake = createHaFake({ expired: true });
      fake.dispatch.mockResolvedValue(response(200, { value: 42 }));
      setHass(client, fake.hass);

      const result = await client.fetchOIGAPI<{ value: number }>('/battery/x?a=1');

      expect(result).toEqual({ value: 42 });
      expect(fake.transport.mock.calls[0][0]).toBe('/api/oig_cloud/battery/x?a=1');
      expect(fake.transport.mock.calls[0][1]).toMatchObject({
        redirect: 'manual',
      });
      expect(dispatchedHeaders(fake).authorization).toBe(`Bearer ${FRESH_TOKEN}`);
      expect(fake.forbiddenOigRefresh).not.toHaveBeenCalled();
      expect(globalFetch).not.toHaveBeenCalled();
    });

    it('uses a current HA credential without refreshing and dispatches once', async () => {
      const fake = createHaFake();
      setHass(client, fake.hass);

      await client.fetchOIGAPI('/battery/x');

      expect(fake.haOwnedRefresh).not.toHaveBeenCalled();
      expect(fake.dispatch).toHaveBeenCalledTimes(1);
      expect(dispatchedHeaders(fake).authorization).toBe(`Bearer ${CURRENT_TOKEN}`);
      expect(globalFetch).not.toHaveBeenCalled();
    });

    it('leaves concurrent expiry handling to HA and never dispatches a stale credential', async () => {
      const fake = createHaFake({ expired: true });
      setHass(client, fake.hass);

      await Promise.all([
        client.fetchOIGAPI('/battery/a'),
        client.fetchOIGAPITyped('/battery/b'),
      ]);

      expect(fake.haOwnedRefresh.mock.calls.length).toBeGreaterThanOrEqual(1);
      expect(fake.forbiddenOigRefresh).not.toHaveBeenCalled();
      expect(fake.dispatch).toHaveBeenCalledTimes(2);
      for (const call of fake.dispatch.mock.calls) {
        const headers = call[1]?.headers as Record<string, string>;
        expect(headers.authorization).toBe(`Bearer ${FRESH_TOKEN}`);
        expect(JSON.stringify(headers)).not.toContain(STALE_TOKEN);
      }
      expect(globalFetch).not.toHaveBeenCalled();
    });
  });

  describe('Task 2: path, header, redirect, and callable boundaries', () => {
    it.each([
      ['battery/x?a=1', '/api/oig_cloud/battery/x?a=1'],
      ['/battery/x?a=1', '/api/oig_cloud/battery/x?a=1'],
    ])('joins public suffix %s to %s', async (suffix, canonical) => {
      const fake = createHaFake();
      setHass(client, fake.hass);

      await client.fetchOIGAPI(suffix);

      expect(fake.transport).toHaveBeenCalledTimes(1);
      expect(fake.transport.mock.calls[0][0]).toBe(canonical);
      expect(fake.dispatch).toHaveBeenCalledTimes(1);
    });

    it.each([
      '',
      '//evil.example/path',
      'http://evil.example/path',
      'https://evil.example/path',
      'evil.example/path',
      'localhost/path',
      '127.0.0.1/path',
      '[::1]/path',
      'user@evil.example/path',
      'user@localhost/path',
      'user@evil.example:443/path',
      'user@localhost:8123/path',
      'user@127.0.0.1:8123/path',
      'user@[::1]:8123/path',
      'user:pass@evil.example/path',
      'user:pass@localhost/path',
      'user:pass@evil.example:443/path',
      'user:pass@localhost:8123/path',
      'user:pass@127.0.0.1:8123/path',
      'user:pass@[::1]:8123/path',
      'localhost:8123/path',
      '127.0.0.1:8123/path',
      '[::1]:8123/path',
      'evil.example:443/path',
      '/api/oig_cloud/battery/x',
      'api/oig_cloud/battery/x',
      'api/oig_cloud_evil/battery/x',
      'battery\\x',
      'battery/x#fragment',
      'battery/%',
      'battery/../secret',
      'battery/%2e%2e/secret',
      'battery/%252e%252e/secret',
      'battery/%2f..%2fsecret',
    ])('rejects hostile public suffix %s before HA transport', async (suffix) => {
      const fake = createHaFake();
      setHass(client, fake.hass);

      await expect(client.fetchOIGAPI(suffix)).resolves.toBeNull();
      expect(fake.transport).not.toHaveBeenCalled();
      expect(fake.dispatch).not.toHaveBeenCalled();
      expect(globalFetch).not.toHaveBeenCalled();
    });

    it.each([
      '/api/oig_cloud',
      '/api/oig_cloud/battery/x',
      '/api/oig_cloud/battery/x?a=1&b=2',
    ])('accepts canonical private seam path %s', async (path) => {
      const fake = createHaFake();
      setHass(client, fake.hass);

      await invokePrivateDispatch(client, path);

      expect(fake.transport).toHaveBeenCalledTimes(1);
      expect(fake.transport.mock.calls[0][0]).toBe(path);
      expect(fake.dispatch).toHaveBeenCalledTimes(1);
    });

    it.each([
      '',
      '/api/oig_cloud_evil',
      '/api/other',
      '//evil.example/api/oig_cloud/x',
      'https://evil.example/api/oig_cloud/x',
      'http://localhost:8123/api/oig_cloud/x',
      'http://127.0.0.1:8123/api/oig_cloud/x',
      'http://[::1]:8123/api/oig_cloud/x',
      'http://user:pass@localhost/api/oig_cloud/x',
      'http://localhost:9999/api/oig_cloud/x',
      '/api/oig_cloud\\x',
      '/api/oig_cloud/x#fragment',
      '/api/oig_cloud/%',
      '/api/oig_cloud/../secret',
      '/api/oig_cloud/%2e%2e/secret',
      '/api/oig_cloud/%252e%252e/secret',
    ])('rejects non-canonical private seam path %s', async (path) => {
      const fake = createHaFake();
      setHass(client, fake.hass);

      const result = await invokePrivateDispatch(client, path);

      expect(result).toMatchObject({ ok: false, code: 'invalid_path' });
      expect(fake.transport).not.toHaveBeenCalled();
      expect(fake.dispatch).not.toHaveBeenCalled();
      expect(globalFetch).not.toHaveBeenCalled();
    });

    it.each([
      { Authorization: 'Bearer caller-object' },
      { authorization: 'Bearer caller-lower' },
      { AuThOrIzAtIoN: 'Bearer caller-mixed' },
      [['Authorization', 'Bearer caller-tuple']] as [string, string][],
      new Headers([['aUtHoRiZaTiOn', 'Bearer caller-headers']]),
    ])('strips caller Authorization from every HeadersInit form', async (headers) => {
      const fake = createHaFake({ expired: true });
      setHass(client, fake.hass);

      await client.fetchOIGAPITyped('/battery/x', { headers: headers as HeadersInit });

      const transportHeaders = fake.transport.mock.calls[0][1]?.headers as Record<string, string>;
      expect(Object.keys(transportHeaders).map((key) => key.toLowerCase())).not.toContain(
        'authorization',
      );
      expect(dispatchedHeaders(fake)).toEqual({
        'content-type': 'application/json',
        authorization: `Bearer ${FRESH_TOKEN}`,
      });
      expect(JSON.stringify(fake.transport.mock.calls)).not.toContain('caller-');
      expect(JSON.stringify(fake.dispatch.mock.calls)).not.toContain('caller-');
    });

    it.each([300, 301, 302, 303, 304, 305, 306, 307, 308])(
      'blocks visible HTTP %s without retry or follow',
      async (status) => {
        const fake = createHaFake();
        fake.dispatch.mockResolvedValue(response(status, { redirect: true }));
        setHass(client, fake.hass);

        const untyped = await client.fetchOIGAPI('/battery/x');
        expect(untyped).toBeNull();
        expect(fake.dispatch).toHaveBeenCalledTimes(1);
        expect(fake.transport.mock.calls[0][1]?.redirect).toBe('manual');

        fake.dispatch.mockClear();
        fake.transport.mockClear();
        const typed = await client.fetchOIGAPITyped('/battery/x');
        expect(typed).toEqual({
          ok: false,
          status: 0,
          code: 'redirect_blocked',
          error: 'Authenticated redirect blocked',
        });
        expect(fake.dispatch).toHaveBeenCalledTimes(1);
        expect(fake.transport.mock.calls[0][1]?.redirect).toBe('manual');
      },
    );

    it('blocks opaqueredirect without retry or follow', async () => {
      const fake = createHaFake();
      fake.dispatch.mockResolvedValue(response(0, null, 'opaqueredirect'));
      setHass(client, fake.hass);

      expect(await client.fetchOIGAPI('/battery/x')).toBeNull();
      expect(fake.dispatch).toHaveBeenCalledTimes(1);

      fake.dispatch.mockClear();
      fake.transport.mockClear();
      expect(await client.fetchOIGAPITyped('/battery/x')).toEqual({
        ok: false,
        status: 0,
        code: 'redirect_blocked',
        error: 'Authenticated redirect blocked',
      });
      expect(fake.dispatch).toHaveBeenCalledTimes(1);
    });

    it('does not expose the legacy public manual-token fetchWithAuth method', () => {
      expect(Object.getOwnPropertyNames(HaClient.prototype)).not.toContain('fetchWithAuth');
    });
  });

  describe('Task 3: retry and safe failure classification', () => {
    it('retries untyped GET transport failures exactly after one-second delays', async () => {
      vi.useFakeTimers();
      const fake = createHaFake();
      fake.dispatch
        .mockRejectedValueOnce(new TypeError('transport-1'))
        .mockRejectedValueOnce(new TypeError('transport-2'))
        .mockRejectedValueOnce(new TypeError('transport-3'))
        .mockResolvedValueOnce(response(200, { ok: true }));
      setHass(client, fake.hass);

      const pending = client.fetchOIGAPI('/battery/x', { method: 'GET' });
      await vi.advanceTimersByTimeAsync(0);
      expect(fake.dispatch).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(999);
      expect(fake.dispatch).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(1);
      expect(fake.dispatch).toHaveBeenCalledTimes(2);
      await vi.advanceTimersByTimeAsync(1000);
      expect(fake.dispatch).toHaveBeenCalledTimes(3);
      await vi.advanceTimersByTimeAsync(1000);

      await expect(pending).resolves.toEqual({ ok: true });
      expect(fake.dispatch).toHaveBeenCalledTimes(4);
    });

    it.each([
      ['GET', 'transport', 0],
      ['GET', 'http', 502],
      ['GET', 'http', 503],
      ['GET', 'http', 504],
      ['HEAD', 'transport', 0],
      ['HEAD', 'http', 502],
      ['HEAD', 'http', 503],
      ['HEAD', 'http', 504],
    ])('retries safe %s %s failure %s within four total attempts', async (method, kind, status) => {
      vi.useFakeTimers();
      const fake = createHaFake();
      if (kind === 'transport') {
        fake.dispatch.mockRejectedValue(new TypeError('transport'));
      } else {
        fake.dispatch.mockResolvedValue(response(status));
      }
      setHass(client, fake.hass);

      const pending = client.fetchOIGAPI('/battery/x', { method });
      await settleTimers(pending);

      expect(fake.dispatch).toHaveBeenCalledTimes(4);
    });

    it.each(['GET', 'HEAD'])(
      'stops %s TypeError retry during backoff when the caller aborts',
      async (method) => {
        vi.useFakeTimers();
        const fake = createHaFake();
        fake.dispatch
          .mockRejectedValueOnce(new TypeError('network failure'))
          .mockResolvedValueOnce(response(200, { shouldNotDispatch: true }));
        setHass(client, fake.hass);
        const controller = new AbortController();

        const pending = client.fetchOIGAPI('/battery/x', {
          method,
          signal: controller.signal,
        });
        await vi.advanceTimersByTimeAsync(0);
        expect(fake.transport).toHaveBeenCalledTimes(1);
        controller.abort();
        await vi.advanceTimersByTimeAsync(1000);

        await expect(pending).resolves.toBeNull();
        expect(fake.transport).toHaveBeenCalledTimes(1);
        expect(fake.dispatch).toHaveBeenCalledTimes(1);
      },
    );

    it.each([
      ['GET', 502],
      ['GET', 503],
      ['GET', 504],
      ['HEAD', 502],
      ['HEAD', 503],
      ['HEAD', 504],
    ])('stops %s HTTP %s retry during backoff when the caller aborts', async (method, status) => {
      vi.useFakeTimers();
      const fake = createHaFake();
      fake.dispatch
        .mockResolvedValueOnce(response(status))
        .mockResolvedValueOnce(response(200, { shouldNotDispatch: true }));
      setHass(client, fake.hass);
      const controller = new AbortController();

      const pending = client.fetchOIGAPI('/battery/x', {
        method,
        signal: controller.signal,
      });
      await vi.advanceTimersByTimeAsync(0);
      expect(fake.transport).toHaveBeenCalledTimes(1);
      controller.abort();
      await vi.advanceTimersByTimeAsync(1000);

      await expect(pending).resolves.toBeNull();
      expect(fake.transport).toHaveBeenCalledTimes(1);
      expect(fake.dispatch).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['GET', new Error('unexpected error')],
      ['GET', new RangeError('unexpected range')],
      ['GET', new DOMException('unexpected DOM failure', 'InvalidStateError')],
      ['HEAD', new Error('unexpected error')],
      ['HEAD', new RangeError('unexpected range')],
      ['HEAD', new DOMException('unexpected DOM failure', 'InvalidStateError')],
    ])('does not retry %s when HA throws %s', async (method, thrown) => {
      vi.useFakeTimers();
      const fake = createHaFake();
      fake.dispatch.mockRejectedValue(thrown);
      setHass(client, fake.hass);

      const pending = client.fetchOIGAPI('/battery/x', { method });
      await settleTimers(pending);

      expect(fake.transport).toHaveBeenCalledTimes(1);
      expect(fake.dispatch).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['GET', 'http', 400],
      ['GET', 'http', 401],
      ['GET', 'http', 403],
      ['GET', 'http', 429],
      ['GET', 'http', 500],
      ['HEAD', 'http', 401],
      ['HEAD', 'http', 403],
      ['HEAD', 'http', 429],
      ['HEAD', 'http', 500],
      ['GET', 'redirect', 302],
      ['HEAD', 'redirect', 307],
      ['GET', 'abort', 0],
      ['HEAD', 'abort', 0],
    ])('does not retry %s %s failure %s', async (method, kind, status) => {
      vi.useFakeTimers();
      const fake = createHaFake();
      if (kind === 'abort') {
        fake.dispatch.mockRejectedValue(new DOMException('request aborted', 'AbortError'));
      } else {
        fake.dispatch.mockResolvedValue(response(status));
      }
      setHass(client, fake.hass);

      const pending = client.fetchOIGAPI('/battery/x', { method });
      await settleTimers(pending);

      expect(fake.dispatch).toHaveBeenCalledTimes(1);
    });

    it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
      'dispatches %s exactly once for transport ambiguity',
      async (method) => {
        vi.useFakeTimers();
        const fake = createHaFake();
        fake.dispatch.mockRejectedValue(new TypeError('ambiguous mutation'));
        setHass(client, fake.hass);

        const pending = client.fetchOIGAPI('/battery/x', { method });
        await settleTimers(pending);

        expect(fake.dispatch).toHaveBeenCalledTimes(1);
      },
    );

    it.each(['POST', 'PUT', 'PATCH', 'DELETE'])(
      'dispatches %s exactly once for every HTTP status',
      async (method) => {
        for (const status of [400, 401, 403, 429, 500, 502, 503, 504]) {
          const fake = createHaFake();
          fake.dispatch.mockResolvedValue(response(status));
          setHass(client, fake.hass);

          await client.fetchOIGAPI('/battery/x', { method });

          expect(fake.dispatch, `${method} ${status}`).toHaveBeenCalledTimes(1);
        }
      },
    );

    it('keeps every typed call single-dispatch', async () => {
      const transportFake = createHaFake();
      transportFake.dispatch.mockRejectedValue(new TypeError('typed transport'));
      setHass(client, transportFake.hass);
      await client.fetchOIGAPITyped('/battery/x', { method: 'GET' });
      expect(transportFake.dispatch).toHaveBeenCalledTimes(1);

      const httpFake = createHaFake();
      httpFake.dispatch.mockResolvedValue(response(503));
      setHass(client, httpFake.hass);
      await client.fetchOIGAPITyped('/battery/x', { method: 'HEAD' });
      expect(httpFake.dispatch).toHaveBeenCalledTimes(1);
    });

    it('returns the exact safe auth result when HASS is absent', async () => {
      setHass(client, null);

      await expect(client.fetchOIGAPI('/battery/x')).resolves.toBeNull();
      await expect(client.fetchOIGAPITyped('/battery/x')).resolves.toEqual({
        ok: false,
        status: 0,
        code: 'auth',
        error: 'Home Assistant authentication unavailable',
      });
      expect(globalFetch).not.toHaveBeenCalled();
    });

    it('returns the exact safe auth result and zero dispatch when HA refresh rejects', async () => {
      const fake = createHaFake({
        expired: true,
        refreshReject: new Error('refresh-secret-sentinel'),
      });
      setHass(client, fake.hass);

      await expect(client.fetchOIGAPI('/battery/x')).resolves.toBeNull();
      await expect(client.fetchOIGAPITyped('/battery/x')).resolves.toEqual({
        ok: false,
        status: 0,
        code: 'auth',
        error: 'Home Assistant authentication unavailable',
      });
      expect(fake.dispatch).not.toHaveBeenCalled();
      expect(fake.forbiddenOigRefresh).not.toHaveBeenCalled();
      expect(globalFetch).not.toHaveBeenCalled();
    });

    it('returns the exact safe abort result', async () => {
      const fake = createHaFake();
      fake.dispatch.mockRejectedValue(new DOMException('raw abort sentinel', 'AbortError'));
      setHass(client, fake.hass);

      await expect(client.fetchOIGAPITyped('/battery/x')).resolves.toEqual({
        ok: false,
        status: 0,
        code: 'aborted',
        error: 'Request aborted',
      });
      expect(fake.dispatch).toHaveBeenCalledTimes(1);
    });

    it('does not dispatch a request whose caller signal is already aborted', async () => {
      const fake = createHaFake();
      setHass(client, fake.hass);
      const controller = new AbortController();
      controller.abort();

      await expect(
        client.fetchOIGAPITyped('/battery/x', { signal: controller.signal }),
      ).resolves.toEqual({
        ok: false,
        status: 0,
        code: 'aborted',
        error: 'Request aborted',
      });
      expect(fake.transport).not.toHaveBeenCalled();
      expect(fake.dispatch).not.toHaveBeenCalled();
    });

    it('returns a fixed provider failure without the raw transport exception', async () => {
      const fake = createHaFake();
      fake.dispatch.mockRejectedValue(new TypeError('raw-exception-sentinel'));
      setHass(client, fake.hass);

      const result = await client.fetchOIGAPITyped('/battery/x');

      expect(result).toEqual({
        ok: false,
        status: 0,
        code: 'provider_unreachable',
        error: 'Provider request failed',
      });
      expect(JSON.stringify(result)).not.toContain('raw-exception-sentinel');
    });

    it('does not leak auth, request, query, body, exception, or stack sentinels', async () => {
      const sentinels = [
        STALE_TOKEN,
        'api-key-sentinel',
        'site-id-sentinel',
        'query-sentinel',
        'body-sentinel',
        'exception-sentinel',
        'stack-sentinel',
      ];
      const consoleCalls: unknown[][] = [];
      for (const level of ['debug', 'info', 'warn', 'error'] as const) {
        vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
          consoleCalls.push(args);
        });
      }
      const failure = new Error('exception-sentinel');
      failure.stack = 'stack-sentinel';
      const fake = createHaFake({ expired: true, refreshReject: failure });
      setHass(client, fake.hass);

      const typed = await client.fetchOIGAPITyped('/battery/x?value=query-sentinel', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${STALE_TOKEN}`,
          'X-Api-Key': 'api-key-sentinel',
          'X-Site-Id': 'site-id-sentinel',
        },
        body: JSON.stringify({ secret: 'body-sentinel' }),
      });
      const untyped = await client.fetchOIGAPI('/battery/x?value=query-sentinel', {
        headers: { Authorization: `Bearer ${STALE_TOKEN}` },
      });

      const observable = JSON.stringify({ typed, untyped, consoleCalls });
      for (const sentinel of sentinels) {
        expect(observable).not.toContain(sentinel);
      }
    });

    it('preserves parsed HTTP bodies and server error codes', async () => {
      const fake = createHaFake();
      fake.dispatch.mockResolvedValue(
        response(422, { code: 'invalid_response', error: 'Invalid provider response' }),
      );
      setHass(client, fake.hass);

      const typed: OigApiResult<unknown> = await client.fetchOIGAPITyped('/battery/x');

      expect(typed).toEqual({
        ok: false,
        status: 422,
        code: 'invalid_response',
        error: 'Invalid provider response',
      });
    });
  });
});
