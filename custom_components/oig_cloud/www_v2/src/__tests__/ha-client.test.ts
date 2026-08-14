import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HaClient, type Hass, type OigApiResult, plannerState } from '@/data/ha-client';

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

  describe('Task 4: PlannerStateManager', () => {
    it('provides default plan as hybrid', () => {
      const manager = plannerState;
      expect(manager.getDefaultPlan()).toBe('hybrid');
    });

    it('returns cached settings when available', async () => {
      const manager = plannerState;
      const fake = createHaFake();
      setHass(client, fake.hass);

      // First call should fetch and cache
      fake.dispatch.mockResolvedValueOnce(response(200, { auto_mode_switch_enabled: true, planner_mode: 'hybrid' }));
      const result1 = await manager.fetchSettings(client, 'SN1', true);
      expect(result1).toEqual({ auto_mode_switch_enabled: true, planner_mode: 'hybrid' });

      // getCachedSettings should return the same cached value
      expect(manager.getCachedSettings()).toEqual({ auto_mode_switch_enabled: true, planner_mode: 'hybrid' });
    });

    it('returns null when no settings are cached', () => {
      const manager = plannerState;
      manager.invalidate();
      expect(manager.getCachedSettings()).toBeNull();
    });

    it('returns labels for known plan types', () => {
      const manager = plannerState;
      expect(manager.getLabels('hybrid')).toEqual({ short: 'Plán', long: 'Plánování' });
    });

    it('falls back to hybrid labels for unknown plan types', () => {
      const manager = plannerState;
      expect(manager.getLabels('unknown-plan')).toEqual({ short: 'Plán', long: 'Plánování' });
      expect(manager.getLabels('')).toEqual({ short: 'Plán', long: 'Plánování' });
    });

    it('invalidates cache and clears timestamp', async () => {
      const manager = plannerState;
      const fake = createHaFake();
      setHass(client, fake.hass);

      // Populate cache
      fake.dispatch.mockResolvedValueOnce(response(200, { cached: true }));
      await manager.fetchSettings(client, 'SN1', true);
      expect(manager.getCachedSettings()).toEqual({ cached: true });

      // Invalidate
      manager.invalidate();
      expect(manager.getCachedSettings()).toBeNull();
    });

    it('uses cache within TTL and bypasses fetch', async () => {
      const manager = plannerState;
      const fake = createHaFake();
      setHass(client, fake.hass);

      // First call
      fake.dispatch.mockResolvedValueOnce(response(200, { value: 1 }));
      const result1 = await manager.fetchSettings(client, 'SN1', true);
      expect(result1).toEqual({ value: 1 });
      expect(fake.dispatch).toHaveBeenCalledTimes(1);

      // Second call within TTL - should use cache
      const result2 = await manager.fetchSettings(client, 'SN1', false);
      expect(result2).toEqual({ value: 1 });
      expect(fake.dispatch).toHaveBeenCalledTimes(1); // No additional call
    });

    it('forces refresh and bypasses cache when force is true', async () => {
      const manager = plannerState;
      const fake = createHaFake();
      setHass(client, fake.hass);

      // First call
      fake.dispatch.mockResolvedValueOnce(response(200, { value: 1 }));
      await manager.fetchSettings(client, 'SN1', true);

      // Force refresh
      fake.dispatch.mockResolvedValueOnce(response(200, { value: 2 }));
      const result = await manager.fetchSettings(client, 'SN1', true);
      expect(result).toEqual({ value: 2 });
      expect(fake.dispatch).toHaveBeenCalledTimes(2);
    });

    it('returns null on silent fetch failure and replaces the cached payload', async () => {
      const manager = plannerState;
      manager.invalidate();
      const fake = createHaFake();
      setHass(client, fake.hass);

      // Populate cache with a successful payload
      fake.dispatch.mockResolvedValueOnce(response(200, { cached: true }));
      await manager.fetchSettings(client, 'SN1', true);
      expect(manager.getCachedSettings()).toEqual({ cached: true });

      // Simulate a silent failure: dispatch rejects -> fetchOIGAPI returns null ->
      // loadPlannerSettings returns null -> the IIFE assigns cache = null.
      fake.dispatch.mockRejectedValueOnce(new Error('Network error'));
      const result = await manager.fetchSettings(client, 'SN1', true);
      expect(result).toBeNull();
      // Documents the current behaviour: a silent failure (null payload) wipes
      // the cached value. See src/data/ha-client.ts:606 — `this.cache = payload`
      // runs on the success path before distinguishing "fetch failed" from
      // "fetch succeeded with null".
      expect(manager.getCachedSettings()).toBeNull();
    });

    it('deduplicates concurrent inflight requests', async () => {
      const manager = plannerState;
      manager.invalidate();
      const fake = createHaFake();
      setHass(client, fake.hass);

      // Slow fetch that resolves after concurrent calls
      let resolveFetch: (value: Response) => void;
      const slowFetch = new Promise<Response>(resolve => {
        resolveFetch = resolve;
      });
      fake.dispatch.mockReturnValueOnce(slowFetch);

      // Launch concurrent requests
      const pending1 = manager.fetchSettings(client, 'SN1', true);
      const pending2 = manager.fetchSettings(client, 'SN1', true);
      const pending3 = manager.fetchSettings(client, 'SN1', true);

      // Yield so the async chain reaches the dispatch layer
      await Promise.resolve();

      // All three should be waiting on the same inflight request
      expect(fake.dispatch).toHaveBeenCalledTimes(1);

      // Resolve the fetch with a proper Response shape so the success branch
      // is taken once and the same Promise is shared by all three callers.
      resolveFetch!(response(200, { concurrent: true }));

      // All three should resolve to the same value
      const [r1, r2, r3] = await Promise.all([pending1, pending2, pending3]);
      expect(r1).toEqual({ concurrent: true });
      expect(r2).toEqual({ concurrent: true });
      expect(r3).toEqual({ concurrent: true });
      expect(fake.dispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('Task 5: showNotification and service fallback', () => {
    it('forwards to persistent_notification.create and never logs when service resolves true', async () => {
      const fake = createHaFake();
      setHass(client, fake.hass);
      (fake.hass.callService as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      await client.showNotification('hello', 'world');

      expect(fake.hass.callService).toHaveBeenCalledTimes(1);
      const [domain, service, data] = (fake.hass.callService as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(domain).toBe('persistent_notification');
      expect(service).toBe('create');
      expect(data).toMatchObject({ title: 'hello', message: 'world' });
      expect(typeof (data as { notification_id: string }).notification_id).toBe('string');
      expect((data as { notification_id: string }).notification_id).toMatch(/^oig_dashboard_\d+$/);
      expect(consoleLog).not.toHaveBeenCalled();
    });

    it('emits console fallback when callService rejects', async () => {
      const fake = createHaFake();
      setHass(client, fake.hass);
      (fake.hass.callService as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('boom'));
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      await client.showNotification('oh no', 'something broke', 'error');

      expect(fake.hass.callService).toHaveBeenCalledTimes(1);
      expect(consoleLog).toHaveBeenCalledTimes(1);
      expect(consoleLog.mock.calls[0][0]).toBe('[ERROR] oh no: something broke');
    });

    it('emits console fallback when hass is unavailable', async () => {
      setHass(client, null);
      const consoleLog = vi.spyOn(console, 'log').mockImplementation(() => undefined);

      await client.showNotification('quiet', 'no hass', 'warning');

      expect(consoleLog).toHaveBeenCalledTimes(1);
      expect(consoleLog.mock.calls[0][0]).toBe('[WARNING] quiet: no hass');
    });
  });

  describe('Task 6: PlannerStateManager catch path via thrown loadPlannerSettings', () => {
    it('returns null and leaves the cache untouched when loadPlannerSettings throws', async () => {
      const manager = plannerState;
      manager.invalidate();
      const failingClient = {
        loadPlannerSettings: vi.fn().mockRejectedValue(new Error('load-planner-sentinel')),
      } as unknown as HaClient;

      const result = await manager.fetchSettings(failingClient, 'SN1', true);

      expect(result).toBeNull();
      expect(manager.getCachedSettings()).toBeNull();
      // inflight must be cleared after the throw — next call can start fresh
      manager.invalidate();
      expect((manager as unknown as { inflight: unknown }).inflight).toBeNull();
    });
  });

  describe('Task 7: callApi and callWS error paths', () => {
    it('callApi throws AuthError when hass is unavailable', async () => {
      setHass(client, null);

      await expect(client.callApi('GET', '/x')).rejects.toThrow('Cannot get HASS context');
    });

    it('callWS throws AuthError when hass is unavailable', async () => {
      setHass(client, null);

      await expect(client.callWS({ type: 'foo' })).rejects.toThrow('Cannot get HASS context for WS call');
    });

    it('callService returns false and logs when hass has no callService', async () => {
      const fake = createHaFake();
      setHass(client, fake.hass);
      (fake.hass as unknown as { callService: undefined }).callService = undefined as unknown as never;
      const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);

      const result = await client.callService('light', 'turn_on', { entity_id: 'light.x' });

      expect(result).toBe(false);
      expect(errorLog).toHaveBeenCalledTimes(1);
    });
  });

  describe('Task 8: openEntityDialog dispatch and failure paths', () => {
    it('fires hass-more-info on the home-assistant element found in the parent document', () => {
      const haElement = {
        dispatchEvent: vi.fn(),
      };
      const parentDocument = {
        querySelector: vi.fn().mockReturnValue(haElement),
      };
      const fakeParent = { document: parentDocument };
      const originalParent = (window as unknown as { parent: unknown }).parent;
      (window as unknown as { parent: unknown }).parent = fakeParent;

      const ok = client.openEntityDialog('light.kitchen');

      expect(ok).toBe(true);
      expect(parentDocument.querySelector).toHaveBeenCalledWith('home-assistant');
      expect(haElement.dispatchEvent).toHaveBeenCalledTimes(1);
      const event = haElement.dispatchEvent.mock.calls[0][0] as CustomEvent;
      expect(event.type).toBe('hass-more-info');
      expect(event.bubbles).toBe(true);
      expect(event.composed).toBe(true);
      expect(event.detail).toEqual({ entityId: 'light.kitchen' });

      (window as unknown as { parent: unknown }).parent = originalParent;
    });

    it('falls back to the local document when the parent document has no home-assistant', () => {
      const haElement = {
        dispatchEvent: vi.fn(),
      };
      const parentDocument = {
        querySelector: vi.fn().mockReturnValue(null),
      };
      const fakeParent = { document: parentDocument };
      const originalParent = (window as unknown as { parent: unknown }).parent;
      const documentSpy = vi.spyOn(document, 'querySelector').mockReturnValue(haElement as unknown as Element);
      (window as unknown as { parent: unknown }).parent = fakeParent;

      const ok = client.openEntityDialog('switch.garage');

      expect(ok).toBe(true);
      expect(haElement.dispatchEvent).toHaveBeenCalledTimes(1);

      (window as unknown as { parent: unknown }).parent = originalParent;
      documentSpy.mockRestore();
    });

    it('returns false and warns when no home-assistant element exists', () => {
      const parentDocument = {
        querySelector: vi.fn().mockReturnValue(null),
      };
      const fakeParent = { document: parentDocument };
      const originalParent = (window as unknown as { parent: unknown }).parent;
      const documentSpy = vi.spyOn(document, 'querySelector').mockReturnValue(null);
      const warnLog = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      (window as unknown as { parent: unknown }).parent = fakeParent;

      const ok = client.openEntityDialog('sensor.orphan');

      expect(ok).toBe(false);
      expect(warnLog).toHaveBeenCalledTimes(1);

      (window as unknown as { parent: unknown }).parent = originalParent;
      documentSpy.mockRestore();
    });

    it('returns false and logs when querySelector throws across origins', () => {
      const originalParent = (window as unknown as { parent: unknown }).parent;
      const errorLog = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const fakeParent = {
        get document() {
          throw new DOMException('cross-origin', 'SecurityError');
        },
      };
      (window as unknown as { parent: unknown }).parent = fakeParent;

      const ok = client.openEntityDialog('sensor.cross');

      expect(ok).toBe(false);
      expect(errorLog).toHaveBeenCalledTimes(1);

      (window as unknown as { parent: unknown }).parent = originalParent;
    });
  });

  describe('Task 9: fetchOIGAPI/Typed JSON parse failure paths', () => {
    it('returns null when the successful response body cannot be parsed', async () => {
      vi.useFakeTimers();
      const fake = createHaFake();
      const unparseable = {
        ok: true,
        status: 200,
        statusText: 'OK',
        type: 'basic',
        json: vi.fn().mockRejectedValue(new SyntaxError('bad-json-sentinel')),
      } as unknown as Response;
      fake.dispatch.mockResolvedValue(unparseable);
      setHass(client, fake.hass);

      const result = await client.fetchOIGAPI('/battery/x');

      expect(result).toBeNull();
      vi.useRealTimers();
    });

    it('fetchOIGAPITyped returns ok=true with null body when response.json rejects on 2xx', async () => {
      const fake = createHaFake();
      const unparseable = {
        ok: true,
        status: 200,
        statusText: 'OK',
        type: 'basic',
        json: vi.fn().mockRejectedValue(new SyntaxError('bad-json-sentinel')),
      } as unknown as Response;
      fake.dispatch.mockResolvedValue(unparseable);
      setHass(client, fake.hass);

      const typed = await client.fetchOIGAPITyped('/battery/x');

      expect(typed).toEqual({ ok: true, status: 200, data: null });
    });

    it('fetchOIGAPITyped falls back to statusText when body has no error/code on non-2xx', async () => {
      const fake = createHaFake();
      const empty = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        type: 'basic',
        json: vi.fn().mockResolvedValue(null),
      } as unknown as Response;
      fake.dispatch.mockResolvedValue(empty);
      setHass(client, fake.hass);

      const typed = await client.fetchOIGAPITyped('/battery/x');

      expect(typed).toEqual({
        ok: false,
        status: 500,
        code: 'provider_unreachable',
        error: 'Internal Server Error',
      });
    });
  });

  describe('Task 10: findHass resolution paths', () => {
    it('returns null in non-window environments', async () => {
      const originalWindow = (globalThis as unknown as { window: unknown }).window;
      (globalThis as unknown as { window: unknown }).window = undefined;

      const result = await (client as unknown as { findHass: () => Promise<unknown> }).findHass();

      expect(result).toBeNull();
      (globalThis as unknown as { window: unknown }).window = originalWindow;
    });

    it('returns window.hass when set', async () => {
      const fakeHass = { auth: { expired: false } } as unknown as Hass;
      (window as unknown as { hass: Hass }).hass = fakeHass;

      const result = await (client as unknown as { findHass: () => Promise<unknown> }).findHass();

      expect(result).toBe(fakeHass);
      delete (window as unknown as { hass?: Hass }).hass;
    });
  });
});
