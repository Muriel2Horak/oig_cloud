import { expect, test, type Locator, type Page } from '@playwright/test';

interface SolarHarnessState {
  requests: Array<{ path: string; method: string; body: Record<string, unknown> | null }>;
}

const registry = {
  sections: ['solar'],
  fields: {
    solar_forecast_provider: {
      section: 'solar', type: 'str', scope: 'premium',
      label: 'field.solar_forecast_provider.label', hint: 'field.solar_forecast_provider.hint',
      default: 'forecast_solar', enum: ['forecast_solar', 'solcast'],
    },
    solar_forecast_mode: {
      section: 'solar', type: 'str', scope: 'premium',
      label: 'field.solar_forecast_mode.label', hint: 'field.solar_forecast_mode.hint',
      default: 'daily', enum: ['daily', 'daily_optimized', 'every_4h', 'hourly'],
      show_if: { field: 'solar_forecast_provider', in: ['forecast_solar'] },
    },
    solar_forecast_api_key: {
      section: 'solar', type: 'str', scope: 'premium', secret: true, optional: true,
      label: 'field.solar_forecast_api_key.label', hint: 'field.solar_forecast_api_key.hint',
      show_if: { field: 'solar_forecast_provider', in: ['forecast_solar'] },
    },
    solcast_api_key: {
      section: 'solar', type: 'str', scope: 'premium', secret: true,
      label: 'field.solcast_api_key.label', hint: 'field.solcast_api_key.hint',
      show_if: { field: 'solar_forecast_provider', in: ['solcast'] },
    },
    solcast_site_id: {
      section: 'solar', type: 'str', scope: 'premium', secret: true,
      label: 'field.solcast_site_id.label', hint: 'field.solcast_site_id.hint',
      show_if: { field: 'solar_forecast_provider', in: ['solcast'] },
    },
    solar_forecast_latitude: {
      section: 'solar', type: 'float', scope: 'premium',
      label: 'field.solar_forecast_latitude.label', hint: 'field.solar_forecast_latitude.hint',
      min: -90, max: 90, step: 0.0001,
      show_if: { field: 'solar_forecast_provider', in: ['forecast_solar'] },
    },
    solar_forecast_longitude: {
      section: 'solar', type: 'float', scope: 'premium',
      label: 'field.solar_forecast_longitude.label', hint: 'field.solar_forecast_longitude.hint',
      min: -180, max: 180, step: 0.0001,
      show_if: { field: 'solar_forecast_provider', in: ['forecast_solar'] },
    },
    solar_forecast_string1_enabled: {
      section: 'solar', type: 'bool', scope: 'premium',
      label: 'field.solar_forecast_string1_enabled.label', hint: 'field.solar_forecast_string1_enabled.hint',
      default: true,
    },
    solar_forecast_string1_kwp: {
      section: 'solar', type: 'float', scope: 'premium',
      label: 'field.solar_forecast_string1_kwp.label', hint: 'field.solar_forecast_string1_kwp.hint',
      min: 0.1, max: 50, step: 0.1,
      show_if: { field: 'solar_forecast_string1_enabled', in: [true] },
    },
    solar_forecast_string1_declination: {
      section: 'solar', type: 'int', scope: 'premium',
      label: 'field.solar_forecast_string1_declination.label', hint: 'field.solar_forecast_string1_declination.hint',
      min: 0, max: 90, step: 1,
      show_if: { field: 'solar_forecast_string1_enabled', in: [true] },
      show_if_all: [{ field: 'solar_forecast_provider', in: ['forecast_solar'] }],
    },
    solar_forecast_string1_azimuth: {
      section: 'solar', type: 'int', scope: 'premium',
      label: 'field.solar_forecast_string1_azimuth.label', hint: 'field.solar_forecast_string1_azimuth.hint',
      min: 0, max: 360, step: 1,
      show_if: { field: 'solar_forecast_string1_enabled', in: [true] },
      show_if_all: [{ field: 'solar_forecast_provider', in: ['forecast_solar'] }],
    },
    solar_forecast_string2_enabled: {
      section: 'solar', type: 'bool', scope: 'premium',
      label: 'field.solar_forecast_string2_enabled.label', hint: 'field.solar_forecast_string2_enabled.hint',
      default: false,
    },
  },
};

async function installSolarFake(page: Page) {
  await page.addInitScript(({ registryResponse }) => {
    const storageKey = 'oig-solar-provider-e2e-state';
    const initialModuleConfig = {
      basic: {}, modules: {}, battery: {}, boiler: {}, pricing: {}, pricing_supplier: {},
      solar: {
        solar_forecast_provider: 'forecast_solar',
        solar_forecast_mode: 'daily',
        solar_forecast_api_key_set: false,
        solcast_api_key_set: false,
        solcast_site_id_set: false,
        solar_forecast_latitude: 50.12,
        solar_forecast_longitude: 13.94,
        solar_forecast_string1_enabled: true,
        solar_forecast_string1_kwp: 5.5,
        solar_forecast_string1_declination: 35,
        solar_forecast_string1_azimuth: 138,
        solar_forecast_string2_enabled: false,
      },
      _meta: { legacy_fields: {} },
    };
    type PersistedHarness = {
      moduleConfig: typeof initialModuleConfig;
      privateCredentials: Record<string, Record<string, string>>;
      proofs: Record<string, Record<string, unknown>>;
      requests: SolarHarnessState['requests'];
      proofCounter: number;
    };
    const initial: PersistedHarness = {
      moduleConfig: initialModuleConfig,
      privateCredentials: {
        forecast_solar: { solar_forecast_api_key: 'previously-set-forecast-key' },
      },
      proofs: {},
      requests: [],
      proofCounter: 0,
    };
    let persisted: PersistedHarness;
    try {
      persisted = JSON.parse(sessionStorage.getItem(storageKey) ?? 'null') ?? initial;
    } catch {
      persisted = initial;
    }
    const state: SolarHarnessState = { requests: persisted.requests };
    const saveHarness = () => {
      persisted.requests = state.requests;
      sessionStorage.setItem(storageKey, JSON.stringify(persisted));
    };
    const publicSolar = () => ({
      ...persisted.moduleConfig.solar,
      solar_forecast_api_key_set: !!persisted.privateCredentials.forecast_solar?.solar_forecast_api_key,
      solcast_api_key_set: !!persisted.privateCredentials.solcast?.solcast_api_key,
      solcast_site_id_set: !!persisted.privateCredentials.solcast?.solcast_site_id,
    });
    const hass = {
      auth: { expired: false, refreshAccessToken: async () => undefined },
      fetchWithAuth: async (path: string, init: RequestInit = {}) => {
        const method = (init.method ?? 'GET').toUpperCase();
        const body = typeof init.body === 'string' ? JSON.parse(init.body) : null;
        state.requests.push({ path, method, body });
        let response: unknown = {};
        let status = 200;
        if (method === 'GET' && path.endsWith('/module_config')) {
          response = { ...persisted.moduleConfig, solar: publicSolar() };
        }
        else if (method === 'GET' && path.endsWith('/config_registry')) response = registryResponse;
        else if (method === 'GET' && path.endsWith('/onboarding')) {
          response = {
            steps: {
              modules: 'pending', ai: 'pending', solar: 'pending',
              pricing_distribution: 'pending', pricing_supplier: 'pending',
              pricing_supplier_sell: 'pending', battery: 'pending', boiler: 'pending',
              connection: 'pending',
            },
            timestamps: {}, grandfathered: false,
          };
        } else if (method === 'GET' && path.endsWith('/pricelists')) {
          response = {
            distributors: {}, tariffs: [], selected_distributor: '', selected_tariff: '',
            confirmed_distribution_price_incl_vat: 0,
            confirmed_distribution_price_excl_vat: 0,
            confirmed_distribution_unit: '', stale_warning: false, valid_from: null, year: null,
          };
        } else if (method === 'POST' && path.endsWith('/solar_test')) {
          const proof = `opaque-browser-proof-${++persisted.proofCounter}`;
          persisted.proofs[proof] = body ?? {};
          response = {
            tomorrow_total_kwh: 7.5,
            forecast_covers_tomorrow: true,
            proof,
          };
        } else if (method === 'POST' && path.endsWith('/module_config')) {
          const proof = typeof body?.solar_test_proof === 'string'
            ? persisted.proofs[body.solar_test_proof]
            : undefined;
          const values = body?.values ?? {};
          const selectedProvider = String(
            values.solar_forecast_provider ?? persisted.moduleConfig.solar.solar_forecast_provider,
          );
          const proofProvider = String(proof?.provider ?? '');
          const proofMatches = body?.section !== 'solar' || (
            proof !== undefined && proofProvider === selectedProvider &&
            Object.entries(values).every(([key, value]) => {
              const proofKey = key === 'solar_forecast_provider' ? 'provider' : key;
              if (!(proofKey in proof)) return true;
              return String(proof[proofKey]) === String(value);
            })
          );
          if (!proofMatches) {
            status = 409;
            response = { error: 'solar_test_proof_mismatch' };
          } else {
            const priorProvider = persisted.moduleConfig.solar.solar_forecast_provider;
            const nextSolar = { ...persisted.moduleConfig.solar, ...values };
            if (selectedProvider === 'solcast') {
              persisted.privateCredentials.solcast = {
                solcast_api_key: String(values.solcast_api_key ?? ''),
                solcast_site_id: String(values.solcast_site_id ?? ''),
              };
            } else if (values.solar_forecast_api_key) {
              persisted.privateCredentials.forecast_solar = {
                solar_forecast_api_key: String(values.solar_forecast_api_key),
              };
            }
            if (priorProvider !== selectedProvider) {
              delete persisted.privateCredentials[priorProvider];
            }
            delete nextSolar.solar_forecast_api_key;
            delete nextSolar.solcast_api_key;
            delete nextSolar.solcast_site_id;
            nextSolar.solar_forecast_provider = selectedProvider;
            persisted.moduleConfig.solar = nextSolar;
            if (body.solar_test_proof) delete persisted.proofs[body.solar_test_proof];
            response = { updated: true, revision: persisted.proofCounter, verified: true };
          }
        } else if (method === 'GET' && path.endsWith('/ai')) {
          response = { provider: 'ai_task', status: 'not_configured' };
        }
        saveHarness();
        return new Response(JSON.stringify(response), {
          status,
          headers: { 'Content-Type': 'application/json' },
        });
      },
      states: {}, language: 'cs', config: { latitude: 50.1, longitude: 14.1 },
      connection: { subscribeEvents: async () => () => undefined },
      callService: async () => undefined, callApi: async () => ({}), callWS: async () => null,
    };
    Object.assign(window, { hass, __solarHarnessState: state });
  }, { registryResponse: registry });
}

async function openSolarStep(page: Page) {
  await page.goto('./?sn=browser-e2e');
  await page.locator('oig-app oig-tabs').getByRole('button', { name: 'Nastavení' }).click();
  await page.getByTestId('launch-onboarding').click();
  const wizard = page.locator('oig-onboarding-wizard');
  await wizard.locator('button[data-step="solar"]').click();
  await expect(fieldRow(wizard, 'Poskytovatel')).toBeVisible();
  return wizard;
}

function fieldRow(wizard: Locator, label: string) {
  return wizard.locator('.row').filter({ hasText: label });
}

test('Solcast hides local geometry, retains kWp, and forwards proof only on save', async ({ page }) => {
  await installSolarFake(page);
  const wizard = await openSolarStep(page);
  await expect(fieldRow(wizard, 'String 1 azimut (°)')).toBeVisible();

  const providerRow = fieldRow(wizard, 'Poskytovatel');
  await providerRow.locator('select').selectOption('solcast');
  await expect(fieldRow(wizard, 'Zeměpisná šířka')).toHaveCount(0);
  await expect(fieldRow(wizard, 'String 1 sklon (°)')).toHaveCount(0);
  await expect(fieldRow(wizard, 'String 1 azimut (°)')).toHaveCount(0);
  await expect(fieldRow(wizard, 'String 1 výkon (kWp)')).toBeVisible();

  await fieldRow(wizard, 'Solcast API klíč').locator('input').fill('sc-secret');
  await fieldRow(wizard, 'Solcast site ID').locator('input').fill('roof-1');
  await wizard.getByTestId('solar-test').click();
  await expect(wizard.getByTestId('solar-test-success')).toContainText('7.5');

  let state = await page.evaluate(() => (window as any).__solarHarnessState as SolarHarnessState);
  const testRequest = state.requests.find((request) => request.path.endsWith('/solar_test'))!;
  expect(testRequest.body).toMatchObject({
    provider: 'solcast', solar_forecast_mode: 'daily',
    solcast_api_key: 'sc-secret', solcast_site_id: 'roof-1',
    solar_forecast_string1_enabled: true, solar_forecast_string1_kwp: 5.5,
  });
  expect(testRequest.body).not.toHaveProperty('solar_forecast_latitude');
  expect(testRequest.body).not.toHaveProperty('solar_forecast_string1_azimuth');
  expect(state.requests.filter((request) => request.method === 'POST' && request.path.endsWith('/module_config'))).toHaveLength(0);

  await wizard.getByTestId('quicksave-save').click();
  await expect.poll(async () => {
    const current = await page.evaluate(() => (window as any).__solarHarnessState as SolarHarnessState);
    return current.requests.filter(
      (request) => request.method === 'POST' && request.path.endsWith('/module_config'),
    ).length;
  }).toBe(1);
  state = await page.evaluate(() => (window as any).__solarHarnessState as SolarHarnessState);
  const saveRequest = state.requests.find((request) => request.method === 'POST' && request.path.endsWith('/module_config'))!;
  expect(saveRequest.body?.solar_test_proof).toBe('opaque-browser-proof-1');

  await page.waitForLoadState('load');
  const reopened = await openSolarStep(page);
  await expect(fieldRow(reopened, 'String 1 azimut (°)')).toHaveCount(0);
  await expect(fieldRow(reopened, 'Solcast API klíč').getByTestId('secret-badge')).toBeVisible();
  await expect(fieldRow(reopened, 'Solcast site ID').getByTestId('secret-badge')).toBeVisible();

  const reopenedProvider = fieldRow(reopened, 'Poskytovatel');
  await reopenedProvider.locator('select').selectOption('forecast_solar');
  await expect(fieldRow(reopened, 'String 1 azimut (°)').locator('input')).toHaveValue('138');
  await expect(fieldRow(reopened, 'Zeměpisná šířka').locator('input')).toHaveValue('50.12');
  const forecastKey = fieldRow(reopened, 'forecast.solar API klíč');
  await expect(forecastKey.getByTestId('secret-badge')).toHaveCount(0);
  await expect(forecastKey.locator('input')).toHaveValue('');
  await forecastKey.locator('input').fill('replacement-forecast-key');
  await reopened.getByTestId('solar-test').click();
  await expect(reopened.getByTestId('solar-test-success')).toContainText('7.5');
  await reopened.getByTestId('quicksave-save').click();
  await expect.poll(async () => {
    const current = await page.evaluate(() => (window as any).__solarHarnessState as SolarHarnessState);
    return current.requests.filter(
      (request) => request.method === 'POST' && request.path.endsWith('/module_config'),
    ).length;
  }).toBe(2);

  await page.waitForLoadState('load');
  const finalWizard = await openSolarStep(page);
  await expect(fieldRow(finalWizard, 'Poskytovatel').locator('select')).toHaveValue('forecast_solar');
  await expect(fieldRow(finalWizard, 'String 1 azimut (°)').locator('input')).toHaveValue('138');
  await expect(fieldRow(finalWizard, 'Zeměpisná šířka').locator('input')).toHaveValue('50.12');
  await expect(fieldRow(finalWizard, 'forecast.solar API klíč').getByTestId('secret-badge')).toBeVisible();
  await fieldRow(finalWizard, 'Poskytovatel').locator('select').selectOption('solcast');
  await expect(fieldRow(finalWizard, 'Solcast API klíč').getByTestId('secret-badge')).toHaveCount(0);
  await expect(fieldRow(finalWizard, 'Solcast API klíč').locator('input')).toHaveValue('');
  await expect(fieldRow(finalWizard, 'Solcast site ID').locator('input')).toHaveValue('');
});

test('fake backend rejects a proof for a different effective DTO and persists only valid saves', async ({ page }) => {
  await installSolarFake(page);
  await page.goto('./?sn=browser-e2e');

  const result = await page.evaluate(async () => {
    const hass = (window as any).hass;
    const wrong = await hass.fetchWithAuth('/api/oig_cloud/browser-e2e/module_config', {
      method: 'POST',
      body: JSON.stringify({
        section: 'solar',
        values: { solar_forecast_provider: 'solcast' },
        solar_test_proof: 'proof-for-a-different-dto',
      }),
    });
    const persisted = await hass.fetchWithAuth('/api/oig_cloud/browser-e2e/module_config');
    return { status: wrong.status, persisted: await persisted.json() };
  });

  expect(result.status).toBe(409);
  expect(result.persisted.solar.solar_forecast_provider).toBe('forecast_solar');
});
