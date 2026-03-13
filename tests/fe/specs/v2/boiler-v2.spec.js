import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_PATH = path.join(__dirname, '../../mock/fixtures/boiler-v2.json');
const SCREENSHOTS_DIR = path.join(__dirname, '../../../fe/reports/v2/screenshots');
const ENTRY_ID = 'test_entry_v2';
const INVERTER_SN = '2206237016';

const fixture = JSON.parse(fs.readFileSync(FIXTURE_PATH, 'utf8'));

const mockHass = {
  auth: { data: { access_token: 'mock-token-v2' } },
  states: {
    [`sensor.oig_${INVERTER_SN}_box_prms_mode`]: {
      entity_id: `sensor.oig_${INVERTER_SN}_box_prms_mode`,
      state: 'Home 1',
      attributes: { friendly_name: 'Mode' },
      last_updated: '2026-03-12T10:00:00+00:00',
      last_changed: '2026-03-12T10:00:00+00:00'
    },
    [`sensor.oig_${INVERTER_SN}_batt_bat_c`]: {
      entity_id: `sensor.oig_${INVERTER_SN}_batt_bat_c`,
      state: '72',
      attributes: { unit_of_measurement: '%' },
      last_updated: '2026-03-12T10:00:00+00:00',
      last_changed: '2026-03-12T10:00:00+00:00'
    },
    [`sensor.oig_${INVERTER_SN}_chmu_warning_level`]: {
      entity_id: `sensor.oig_${INVERTER_SN}_chmu_warning_level`,
      state: '0',
      attributes: { warnings_count: 0 },
      last_updated: '2026-03-12T10:00:00+00:00',
      last_changed: '2026-03-12T10:00:00+00:00'
    },
    [`sensor.oig_${INVERTER_SN}_spot_price_current_15min`]: {
      entity_id: `sensor.oig_${INVERTER_SN}_spot_price_current_15min`,
      state: '3.21',
      attributes: {},
      last_updated: '2026-03-12T10:00:00+00:00',
      last_changed: '2026-03-12T10:00:00+00:00'
    }
  },
  connection: {
    subscribeEvents: async (_callback, _eventType) => () => {},
    addEventListener: () => {}
  },
  callService: async () => ({ result: 'ok' }),
  callApi: async () => ({}),
  callWS: async () => ({ result: {} })
};

function ensureScreenshotsDir() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
  }
}

async function injectHassAndWaitForApp(page) {
  await page.addInitScript((hass) => {
    window.hass = hass;
  }, mockHass);
}

async function mockBoilerApis(page) {
  // NOTE: Playwright uses LIFO route matching — last registered route wins.
  // Register catch-all FIRST so specific routes registered after it take priority.
  await page.route('**/api/oig_cloud/**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({})
    });
  });

  await page.route(`**/api/oig_cloud/${ENTRY_ID}/boiler_plan`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixture.boiler_plan)
    });
  });

  await page.route(`**/api/oig_cloud/${ENTRY_ID}/boiler_profile`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(fixture.boiler_profile)
    });
  });
}

async function waitForAppLoaded(page) {
  await page.waitForFunction(() => {
    const app = document.querySelector('oig-app');
    if (!app || !app.shadowRoot) return false;
    const loading = app.shadowRoot.querySelector('.loading');
    const error = app.shadowRoot.querySelector('.error');
    if (error) return true;
    return !loading;
  }, { timeout: 30000 });
}

async function navigateToBoilerTab(page) {
  await page.evaluate(() => {
    const app = document.querySelector('oig-app');
    if (!app || !app.shadowRoot) return;
    const tabs = app.shadowRoot.querySelectorAll('oig-tabs');
    if (tabs.length === 0) return;
    const tabEl = tabs[0];
    if (!tabEl || !tabEl.shadowRoot) return;
    const boilerTab = Array.from(tabEl.shadowRoot.querySelectorAll('.tab')).find(
      t => t.textContent?.includes('Bojler')
    );
    if (boilerTab) boilerTab.click();
  });
  await page.waitForTimeout(500);
}

async function getOigAppShadowElement(page, selector) {
  return page.evaluateHandle((sel) => {
    const app = document.querySelector('oig-app');
    return app?.shadowRoot?.querySelector(sel) ?? null;
  }, selector);
}

test.describe('V2 Dashboard - Boiler Tab E2E', () => {
  test.beforeEach(async ({ page }) => {
    await injectHassAndWaitForApp(page);
    await mockBoilerApis(page);

    const url = `/oig_cloud_static_v2/?sn=${INVERTER_SN}&entry_id=${ENTRY_ID}`;
    await page.goto(url);
    await waitForAppLoaded(page);
  });

  test('app loads without error and shows tabs', async ({ page }) => {
    ensureScreenshotsDir();

    const hasError = await page.evaluate(() => {
      const app = document.querySelector('oig-app');
      return !!app?.shadowRoot?.querySelector('.error');
    });
    expect(hasError).toBe(false);

    const hasThemeProvider = await page.evaluate(() => {
      const app = document.querySelector('oig-app');
      return !!app?.shadowRoot?.querySelector('oig-theme-provider');
    });
    expect(hasThemeProvider).toBe(true);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '01-app-loaded.png') });
  });

  test('boiler tab is accessible and boiler components render', async ({ page }) => {
    ensureScreenshotsDir();

    await navigateToBoilerTab(page);

    const boilerTabActive = await page.evaluate(() => {
      const app = document.querySelector('oig-app');
      if (!app?.shadowRoot) return false;
      const boilerContent = app.shadowRoot.querySelector('.tab-content.boiler-layout');
      return boilerContent?.classList.contains('active') ?? false;
    });
    expect(boilerTabActive).toBe(true);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '02-boiler-tab-active.png') });
  });

  test('debug panel is NOT present in DOM', async ({ page }) => {
    await navigateToBoilerTab(page);

    const debugPanelExists = await page.evaluate(() => {
      const app = document.querySelector('oig-app');
      if (!app?.shadowRoot) return false;
      return !!app.shadowRoot.querySelector('oig-boiler-debug-panel');
    });
    expect(debugPanelExists).toBe(false);

    const debugInDoc = await page.evaluate(() => {
      return !!document.querySelector('oig-boiler-debug-panel');
    });
    expect(debugInDoc).toBe(false);
  });

  test('plan info section has 4 sections with correct labels', async ({ page }) => {
    ensureScreenshotsDir();

    await navigateToBoilerTab(page);

    await page.waitForTimeout(2000);

    const sectionCount = await page.evaluate(() => {
      const app = document.querySelector('oig-app');
      if (!app?.shadowRoot) return -1;
      const planInfo = app.shadowRoot.querySelector('oig-boiler-plan-info');
      if (!planInfo?.shadowRoot) return -2;
      return planInfo.shadowRoot.querySelectorAll('.section').length;
    });
    expect(sectionCount).toBe(4);

    const sectionLabels = await page.evaluate(() => {
      const app = document.querySelector('oig-app');
      if (!app?.shadowRoot) return [];
      const planInfo = app.shadowRoot.querySelector('oig-boiler-plan-info');
      if (!planInfo?.shadowRoot) return [];
      return Array.from(planInfo.shadowRoot.querySelectorAll('.section-label')).map(
        el => el.textContent?.trim()
      );
    });
    expect(sectionLabels).toContain('Základní info');
    expect(sectionLabels).toContain('Cenové info');
    expect(sectionLabels).toContain('Forecast info');
    expect(sectionLabels).toContain('Časové info');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '03-plan-info.png') });
  });

  test('config section shows config_mode as Pokrocily for advanced', async ({ page }) => {
    ensureScreenshotsDir();

    await navigateToBoilerTab(page);

    await page.waitForTimeout(4000);

    const rezimlabel = await page.evaluate(() => {
      const app = document.querySelector('oig-app');
      if (!app?.shadowRoot) return null;
      const configSection = app.shadowRoot.querySelector('oig-boiler-config-section');
      if (!configSection?.shadowRoot) return null;
      const labels = Array.from(configSection.shadowRoot.querySelectorAll('.card-label'));
      const rezimCard = labels.find(el => el.textContent?.trim() === 'Rezim');
      if (!rezimCard) return null;
      const cardEl = rezimCard.closest('.card');
      return cardEl?.querySelector('.card-value')?.textContent?.trim() ?? null;
    });
    expect(rezimlabel).toBe('Pokrocily');

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '04-config-section-advanced.png') });
  });

  test('simple config mode shows Jednoduchy', async ({ page }) => {
    await page.route(`**/api/oig_cloud/${ENTRY_ID}/boiler_plan`, async (route) => {
      const simpleFixture = JSON.parse(JSON.stringify(fixture.boiler_plan));
      simpleFixture.config.config_mode = 'simple';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(simpleFixture)
      });
    });
    await page.route(`**/api/oig_cloud/${ENTRY_ID}/boiler_profile`, async (route) => {
      const simpleFixture = JSON.parse(JSON.stringify(fixture.boiler_profile));
      simpleFixture.config.config_mode = 'simple';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(simpleFixture)
      });
    });

    const url = `/oig_cloud_static_v2/?sn=${INVERTER_SN}&entry_id=${ENTRY_ID}`;
    await page.goto(url);
    await waitForAppLoaded(page);
    await navigateToBoilerTab(page);
    await page.waitForTimeout(2000);

    const modeLabel = await page.evaluate(() => {
      const app = document.querySelector('oig-app');
      if (!app?.shadowRoot) return null;
      const configSection = app.shadowRoot.querySelector('oig-boiler-config-section');
      if (!configSection?.shadowRoot) return null;
      const labels = Array.from(configSection.shadowRoot.querySelectorAll('.card-label'));
      const rezimCard = labels.find(el => el.textContent?.trim() === 'Rezim');
      if (!rezimCard) return null;
      const cardEl = rezimCard.closest('.card');
      return cardEl?.querySelector('.card-value')?.textContent?.trim() ?? null;
    });
    expect(modeLabel).toBe('Jednoduchy');
  });

  test('heater control elements are present', async ({ page }) => {
    ensureScreenshotsDir();

    await navigateToBoilerTab(page);
    await page.waitForTimeout(2000);

    const boilerStatePresent = await page.evaluate(() => {
      const app = document.querySelector('oig-app');
      if (!app?.shadowRoot) return false;
      return !!app.shadowRoot.querySelector('oig-boiler-state');
    });
    expect(boilerStatePresent).toBe(true);

    const statusGridPresent = await page.evaluate(() => {
      const app = document.querySelector('oig-app');
      if (!app?.shadowRoot) return false;
      return !!app.shadowRoot.querySelector('oig-boiler-status-grid');
    });
    expect(statusGridPresent).toBe(true);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '05-heater-control.png') });
  });

  test('circulation pump control elements are present', async ({ page }) => {
    ensureScreenshotsDir();

    await navigateToBoilerTab(page);
    await page.waitForTimeout(2000);

    const predictedUsagePresent = await page.evaluate(() => {
      const app = document.querySelector('oig-app');
      if (!app?.shadowRoot) return false;
      return !!app.shadowRoot.querySelector('oig-boiler-predicted-usage');
    });
    expect(predictedUsagePresent).toBe(true);

    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, '06-circulation-pump.png') });
  });

  test('full boiler tab screenshot with all sections', async ({ page }) => {
    ensureScreenshotsDir();

    await navigateToBoilerTab(page);
    await page.waitForTimeout(3000);

    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, '07-boiler-full-tab.png'),
      fullPage: true
    });

    const boilerComponents = await page.evaluate(() => {
      const app = document.querySelector('oig-app');
      if (!app?.shadowRoot) return {};
      return {
        state: !!app.shadowRoot.querySelector('oig-boiler-state'),
        statusGrid: !!app.shadowRoot.querySelector('oig-boiler-status-grid'),
        energyBreakdown: !!app.shadowRoot.querySelector('oig-boiler-energy-breakdown'),
        predictedUsage: !!app.shadowRoot.querySelector('oig-boiler-predicted-usage'),
        planInfo: !!app.shadowRoot.querySelector('oig-boiler-plan-info'),
        tank: !!app.shadowRoot.querySelector('oig-boiler-tank'),
        heatmapGrid: !!app.shadowRoot.querySelector('oig-boiler-heatmap-grid'),
        statsCards: !!app.shadowRoot.querySelector('oig-boiler-stats-cards'),
        configSection: !!app.shadowRoot.querySelector('oig-boiler-config-section'),
        debugPanel: !!app.shadowRoot.querySelector('oig-boiler-debug-panel')
      };
    });

    expect(boilerComponents.state).toBe(true);
    expect(boilerComponents.statusGrid).toBe(true);
    expect(boilerComponents.energyBreakdown).toBe(true);
    expect(boilerComponents.predictedUsage).toBe(true);
    expect(boilerComponents.planInfo).toBe(true);
    expect(boilerComponents.tank).toBe(true);
    expect(boilerComponents.heatmapGrid).toBe(true);
    expect(boilerComponents.statsCards).toBe(true);
    expect(boilerComponents.configSection).toBe(true);
    expect(boilerComponents.debugPanel).toBe(false);
  });
});
