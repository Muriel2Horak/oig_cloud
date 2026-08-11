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
          let body: unknown = { ok: true, method };
          if (method === 'GET' && path.endsWith('/module_config')) {
            body = {
              basic: {},
              modules: {
                enable_pricing: true,
                enable_boiler: true,
                enable_statistics: true,
                enable_battery_prediction: true,
              },
              battery: {},
              solar: {},
              boiler: {},
              pricing: {},
              pricing_supplier: {},
              ai: { ai_provider: 'ai_task' },
            };
          } else if (method === 'GET' && path.endsWith('/config_registry')) {
            body = { fields: {}, sections: [] };
          } else if (method === 'GET' && path.endsWith('/ai')) {
            body = { provider: 'ai_task', status: 'verified' };
          } else if (method === 'POST' && path.endsWith('/ai/validate_config')) {
            body = { ok: true, findings: [] };
          } else if (method === 'GET' && path.endsWith('/onboarding')) {
            body = { steps: {}, completed: false };
          }
          return new Response(JSON.stringify(body), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        },
        states: {},
        language: 'en',
        connection: {
          subscribeEvents: async () => () => undefined,
        },
        callService: async () => undefined,
        callApi: async () => ({}),
        callWS: async () => null,
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

async function openMountedSettings(page: Parameters<typeof test>[0]['page']) {
  await page.goto('./?sn=browser-e2e');
  await expect(page.locator('oig-app')).toHaveCount(1);
  const settingsTab = page
    .locator('oig-app oig-tabs')
    .getByRole('button', { name: 'Nastavení' });
  await expect(settingsTab).toBeVisible();
  await settingsTab.click();
  await expect(page.getByTestId('launch-onboarding')).toBeVisible();
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

test('mounted oig-app performs a real read and Settings validation POST with fresh HA auth', async ({ page }) => {
  await installHaFake(page, false);

  await openMountedSettings(page);
  const validate = page.getByTestId('validate-ai-config-button');
  await expect(validate).toBeVisible();
  await validate.click();
  await expect(page.getByTestId('validate-ai-config-findings')).toBeVisible();

  const state = await page.evaluate(() => (window as any).__authHarnessState as HarnessState);
  expect(state.refreshCount).toBeGreaterThanOrEqual(1);
  expect(state.oigRefreshCalls).toBe(0);
  expect(state.invalidAuthRequests).toBe(0);
  expect(state.mutationDispatches).toBe(1);
  expect(state.requests).toContainEqual({
    path: '/api/oig_cloud/browser-e2e/module_config',
    method: 'GET',
    bearer: `Bearer ${FRESH_TOKEN}`,
  });
  expect(state.requests).toContainEqual({
    path: '/api/oig_cloud/browser-e2e/ai/validate_config',
    method: 'POST',
    bearer: `Bearer ${FRESH_TOKEN}`,
  });
  expect(state.requests.every((request) => request.bearer === `Bearer ${FRESH_TOKEN}`)).toBe(true);
});

test('mounted oig-app exposes only safe UI and console text when HA refresh rejects', async ({ page }) => {
  const consoleMessages: string[] = [];
  page.on('console', (message) => consoleMessages.push(message.text()));
  await installHaFake(page, true);

  await openMountedSettings(page);
  await expect(page.getByText('Nastavení se nepodařilo načíst', { exact: false })).toBeVisible();
  await expect(page.getByText(REJECTION_SENTINEL, { exact: false })).toHaveCount(0);
  await expect(page.getByText(STALE_TOKEN, { exact: false })).toHaveCount(0);

  const state = await page.evaluate(() => (window as any).__authHarnessState as HarnessState);
  const observable = `${await page.locator('body').innerText()}\n${consoleMessages.join('\n')}`;
  expect(state.refreshCount).toBeGreaterThanOrEqual(1);
  expect(state.requests).toEqual([]);
  expect(state.mutationDispatches).toBe(0);
  expect(state.invalidAuthRequests).toBe(0);
  expect(observable).not.toContain(REJECTION_SENTINEL);
  expect(observable).not.toContain(STALE_TOKEN);
});
