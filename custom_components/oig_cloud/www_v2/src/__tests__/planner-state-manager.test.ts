/**
 * F1 — `PlannerStateManager.fetchSettings` cache-guard regression tests.
 *
 * Background: commit f7fa244d0 wired the flow inverter chip
 * `plannerAutoMode` from `PlannerStateManager.fetchSettings()`. Before that
 * commit the cache-guard had one low-frequency caller, so its broken
 * failure path was unreachable. After wiring, `app.ts:911` and
 * `timeline-data.ts:270` call it on every refresh — the refresh loop runs
 * at ~500 ms. With the old guard, a transient BE failure (401, 404, 5xx)
 * produces a `null` payload, leaves `cache = null` and never advances
 * `lastFetch`, so the next call re-issues the request with no backoff:
 * the FE hammers `GET /api/oig_cloud/battery_forecast/{box}/planner_settings`
 * twice a second while the endpoint is down.
 *
 * These tests pin the negative-result suppression window. They were
 * written on the branch `f1/planner-cache-guard` against the commit base
 * 3d0624be4; cases 2 and 3 are RED-BEFORE on the unmodified guard.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type HaClient, PlannerStateManager } from '@/data/ha-client';

function makeClient(loadPlannerSettings: ReturnType<typeof vi.fn>): HaClient {
  // The cache guard only touches `loadPlannerSettings`; the rest of HaClient
  // is irrelevant here, so a partial cast is the smallest faithful mock.
  return { loadPlannerSettings } as unknown as HaClient;
}

describe('PlannerStateManager.fetchSettings — negative-result backoff', () => {
  let mgr: PlannerStateManager;
  let loadMock: ReturnType<typeof vi.fn>;
  let client: HaClient;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-27T10:00:00Z'));
    mgr = new PlannerStateManager();
    loadMock = vi.fn();
    client = makeClient(loadMock);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // 1. success, then immediate second call → one fetch (TTL hit)
  // ---------------------------------------------------------------------------
  it('serves the cached payload on a second call within CACHE_TTL (no re-fetch)', async () => {
    const payload = { auto_mode_switch_enabled: true, planner_mode: 'hybrid' };
    loadMock.mockResolvedValueOnce(payload);

    const first = await mgr.fetchSettings(client, 'SN1');
    const second = await mgr.fetchSettings(client, 'SN1');

    expect(first).toBe(payload);
    expect(second).toBe(payload);
    expect(loadMock).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // 2. RED-BEFORE: failing call (rejects) → second call returns null WITHOUT
  //    re-issuing the request. The unmodified guard never advanced `lastFetch`
  //    on a failure, so the next call hit the endpoint again immediately.
  // ---------------------------------------------------------------------------
  it('suppresses a re-fetch when the underlying call rejects (returns null on the second call)', async () => {
    loadMock.mockRejectedValueOnce(new Error('network down'));

    const first = await mgr.fetchSettings(client, 'SN1');
    const second = await mgr.fetchSettings(client, 'SN1');

    expect(first).toBeNull();
    expect(second).toBeNull();
    // The storm: old code would hit the endpoint again. New code must NOT.
    expect(loadMock).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // 3. Same as 2, but the failure mode is `loadPlannerSettings` resolving to
  //    `null` — the path `fetchOIGAPI` actually takes on a non-2xx response.
  // ---------------------------------------------------------------------------
  it('suppresses a re-fetch when the underlying call resolves to null', async () => {
    loadMock.mockResolvedValueOnce(null);

    const first = await mgr.fetchSettings(client, 'SN1');
    const second = await mgr.fetchSettings(client, 'SN1');

    expect(first).toBeNull();
    expect(second).toBeNull();
    expect(loadMock).toHaveBeenCalledTimes(1);
  });

  // ---------------------------------------------------------------------------
  // 4. After ERROR_TTL elapses, a re-attempt IS issued.
  // ---------------------------------------------------------------------------
  it('re-attempts after the error window elapses', async () => {
    loadMock.mockRejectedValueOnce(new Error('transient'));

    await mgr.fetchSettings(client, 'SN1');
    expect(loadMock).toHaveBeenCalledTimes(1);

    // Advance past ERROR_TTL (10_000 ms) but stay within CACHE_TTL (60_000 ms)
    vi.setSystemTime(new Date('2026-07-27T10:00:11Z')); // +11s
    const payload = { auto_mode_switch_enabled: false };
    loadMock.mockResolvedValueOnce(payload);

    const recovered = await mgr.fetchSettings(client, 'SN1');

    expect(recovered).toBe(payload);
    expect(loadMock).toHaveBeenCalledTimes(2);
  });

  // ---------------------------------------------------------------------------
  // 5. force = true inside the TTL still issues a real fetch.
  // ---------------------------------------------------------------------------
  it('honours force=true even when a successful cache entry is still fresh', async () => {
    const payload = { auto_mode_switch_enabled: true };
    loadMock.mockResolvedValueOnce(payload);

    await mgr.fetchSettings(client, 'SN1');

    // +5s, well within CACHE_TTL (60s)
    vi.setSystemTime(new Date('2026-07-27T00:00:05Z'));
    // Note: the base time above overrode the +5s; reset to base + 5s.
    vi.setSystemTime(new Date('2026-07-27T10:00:05Z'));

    const fresh = { auto_mode_switch_enabled: false };
    loadMock.mockResolvedValueOnce(fresh);

    const forced = await mgr.fetchSettings(client, 'SN1', /* force */ true);

    expect(forced).toBe(fresh);
    expect(loadMock).toHaveBeenCalledTimes(2);
  });

  // ---------------------------------------------------------------------------
  // 6. Concurrent calls while one is inflight → loadPlannerSettings called ONCE.
  // ---------------------------------------------------------------------------
  it('de-dups concurrent calls via the inflight promise', async () => {
    let resolveFetch!: (v: unknown) => void;
    loadMock.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveFetch = resolve;
      }),
    );

    // Fire two calls without awaiting; both see the same inflight.
    const p1 = mgr.fetchSettings(client, 'SN1');
    const p2 = mgr.fetchSettings(client, 'SN1');

    resolveFetch({ auto_mode_switch_enabled: true });
    const [a, b] = await Promise.all([p1, p2]);

    expect(a).toEqual({ auto_mode_switch_enabled: true });
    expect(b).toEqual({ auto_mode_switch_enabled: true });
    expect(loadMock).toHaveBeenCalledTimes(1);
  });
});
