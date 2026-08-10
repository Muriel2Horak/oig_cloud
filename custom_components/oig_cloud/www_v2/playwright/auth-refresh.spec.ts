import { expect, test } from '@playwright/test';

const STALE_TOKEN = 'browser-stale-token-sentinel';
const FRESH_TOKEN = 'browser-fresh-token';
const REJECTION_SENTINEL = 'browser-refresh-exception-stack-body-query-sentinel';

interface HarnessState {
  refreshCount: number;
  oigRefreshCalls: number;
  invalidAuthRequests: number;
  mutationDispatches: number;
  requests: Array<{ path: string; method: string; bearer: string }>;
}

async function installHaFake(page: Parameters<typeof test>[0]['page'], rejectRefresh: boolean) {
  await page.addInitScript(
    ({ staleToken, freshToken, rejectionSentinel, reject }) => {
      const state: HarnessState = {
        refreshCount: 0,
        oigRefreshCalls: 0,
        invalidAuthRequests: 0,
        mutationDispatches: 0,
        requests: [],
      };
      let activeToken = staleToken;
      const hass = {
        auth: {
          expired: true,
          refreshAccessToken: async () => {
            state.oigRefreshCalls += 1;
          },
        },
        fetchWithAuth: async (path: string, init: RequestInit = {}) => {
          if (hass.auth.expired) {
            state.refreshCount += 1;
            if (reject) {
              const error = new Error(rejectionSentinel);
              error.stack = rejectionSentinel;
              throw error;
            }
            activeToken = freshToken;
            hass.auth.expired = false;
          }
          const headers = init.headers as Record<string, string>;
          headers.authorization = `Bearer ${activeToken}`;
          const method = (init.method ?? 'GET').toUpperCase();
          if (headers.authorization.includes(staleToken)) state.invalidAuthRequests += 1;
          if (method !== 'GET' && method !== 'HEAD') state.mutationDispatches += 1;
          state.requests.push({ path, method, bearer: headers.authorization });
          return new Response(JSON.stringify({ ok: true, method }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        },
        states: {},
        callService: async () => undefined,
        callApi: async () => ({}),
        callWS: async () => ({}),
      };
      Object.assign(window, {
        hass,
        __authHarnessState: state,
      });
    },
    {
      staleToken: STALE_TOKEN,
      freshToken: FRESH_TOKEN,
      rejectionSentinel: REJECTION_SENTINEL,
      reject: rejectRefresh,
    },
  );
}

test('expired HA auth refreshes before one read and one mutation dispatch', async ({ page }) => {
  await installHaFake(page, false);
  await page.goto('playwright/auth-refresh.html');
  await page.waitForFunction(() => Boolean((window as any).authHarnessReady));

  const output = await page.evaluate(() => (window as any).runAuthHarness());
  const state = await page.evaluate(() => (window as any).__authHarnessState as HarnessState);

  expect(output.read).toEqual({ ok: true, method: 'GET' });
  expect(output.mutation).toEqual({
    ok: true,
    status: 200,
    data: { ok: true, method: 'POST' },
  });
  expect(state.refreshCount).toBeGreaterThanOrEqual(1);
  expect(state.oigRefreshCalls).toBe(0);
  expect(state.invalidAuthRequests).toBe(0);
  expect(state.mutationDispatches).toBe(1);
  expect(state.requests).toEqual([
    {
      path: '/api/oig_cloud/browser/read?scope=expiry',
      method: 'GET',
      bearer: `Bearer ${FRESH_TOKEN}`,
    },
    {
      path: '/api/oig_cloud/browser/settings_test',
      method: 'POST',
      bearer: `Bearer ${FRESH_TOKEN}`,
    },
  ]);
});

test('refresh rejection dispatches nothing and exposes only the fixed safe UI error', async ({ page }) => {
  const consoleMessages: string[] = [];
  page.on('console', (message) => consoleMessages.push(message.text()));
  await installHaFake(page, true);
  await page.goto('playwright/auth-refresh.html');
  await page.waitForFunction(() => Boolean((window as any).authHarnessReady));

  const output = await page.evaluate(() => (window as any).runAuthHarness());
  const state = await page.evaluate(() => (window as any).__authHarnessState as HarnessState);
  const pageText = await page.locator('body').innerText();

  expect(output.read).toBeNull();
  expect(output.mutation).toEqual({
    ok: false,
    status: 0,
    code: 'auth',
    error: 'Home Assistant authentication unavailable',
  });
  expect(state.refreshCount).toBeGreaterThanOrEqual(1);
  expect(state.requests).toEqual([]);
  expect(state.mutationDispatches).toBe(0);
  expect(state.invalidAuthRequests).toBe(0);
  expect(state.oigRefreshCalls).toBe(0);
  expect(pageText).toContain('Home Assistant authentication unavailable');
  expect(`${pageText}\n${consoleMessages.join('\n')}`).not.toContain(REJECTION_SENTINEL);
  expect(`${pageText}\n${consoleMessages.join('\n')}`).not.toContain(STALE_TOKEN);
});
