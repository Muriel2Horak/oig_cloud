import { test, expect } from '@playwright/test';

function getMode(testInfo) {
  return testInfo.project.metadata?.mode || 'cloud';
}

function normalizeSplitFlapText(value) {
  if (!value) return '';
  const numeric = value.replace(/[^0-9.]/g, '');
  const collapsed = numeric.replace(/(\d)\1+/g, '$1').replace(/\.{2,}/g, '.');
  return collapsed.trim();
}

async function getDashboardFrame(page) {
  await page.waitForSelector('#dashboard');
  let frame = page.frame({ url: /dashboard\.html/ });
  if (frame) {
    return frame;
  }
  await page.waitForEvent('frameattached');
  frame = page.frame({ url: /dashboard\.html/ });
  return frame;
}

test('dashboard loads and shows CHMU badge', async ({ page }, testInfo) => {
  const mode = getMode(testInfo);
  const consoleMessages = [];
  page.on('console', (msg) => {
    if (msg.type() === 'warning' || msg.type() === 'error') {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    }
  });

  await page.goto(`/host?mode=${mode}`);

  const frame = await getDashboardFrame(page);
  await frame.waitForFunction(() => !!globalThis.DashboardFlow?.loadData);
  const chmuText = frame.locator('#chmu-text');
  await expect(chmuText).toBeVisible();

  if (mode === 'proxy') {
    await expect(chmuText).toHaveText('Bez výstrah');
  } else if (mode === 'local') {
    await expect(chmuText).toContainText('Local alert');
  } else {
    await expect(chmuText).toContainText('Test alert');
  }

  const chmuSensorId = 'sensor.oig_2206237016_chmu_warning_level';
  await page.evaluate(({ mode, chmuSensorId }) => {
    if (mode !== 'proxy') {
      const now = new Date().toISOString();
      const eventType = mode === 'local' ? 'Local alert' : 'Test alert';
      const description =
        mode === 'local' ? 'Local warning detail' : 'Test warning detail';
      globalThis.__setHassState?.(chmuSensorId, {
        entity_id: chmuSensorId,
        state: mode === 'local' ? '2' : '1',
        attributes: {
          event_type: eventType,
          severity: mode === 'local' ? 2 : 1,
          warnings_count: 1,
          description,
          instruction: 'Stay safe',
          onset: '2025-01-01 10:00',
          expires: '2025-01-01 12:00',
          eta_hours: 0,
          all_warnings_details: [
            {
              event_type: eventType,
              severity: mode === 'local' ? 2 : 1,
              description,
              instruction: 'Stay safe',
              onset: '2025-01-01 10:00',
              expires: '2025-01-01 12:00',
              regions: ['CZ010']
            }
          ]
        },
        last_updated: now,
        last_changed: now
      });
    }
  }, { mode, chmuSensorId });

  await frame.evaluate(() => {
    globalThis.updateChmuWarningBadge?.();
  });

  const chmuBadge = frame.locator('#chmu-warning-badge');
  await chmuBadge.click();

  const chmuModal = frame.locator('#chmu-modal');
  await expect(chmuModal).toHaveClass(/active/);

  const chmuModalBody = frame.locator('#chmu-modal-body');
  if (mode === 'proxy') {
    await expect(chmuModalBody).toContainText('Žádná meteorologická výstraha');
  } else if (mode === 'local') {
    await expect(chmuModalBody).toContainText('Local warning detail');
  } else {
    await expect(chmuModalBody).toContainText('Test warning detail');
  }

  expect(consoleMessages).toEqual([]);
});

test('mode buttons render and can trigger service call', async ({ page }, testInfo) => {
  const mode = getMode(testInfo);
  await page.goto(`/host?mode=${mode}`);

  const frame = await getDashboardFrame(page);
  await frame.waitForFunction(() => globalThis.DashboardShield?.setBoxMode && globalThis.getHass?.());
  const panelHeader = frame.locator('#control-panel .panel-header');
  await panelHeader.click();

  const targetMode = await frame.evaluate(() => {
    const entityId = getSensorId('box_prms_mode');
    const hass = globalThis.getHass?.();
    const now = new Date().toISOString();
    if (hass?.states?.[entityId]) {
      hass.states[entityId] = {
        ...hass.states[entityId],
        state: 'Home 1',
        last_updated: now,
        last_changed: now
      };
    }
    const current = hass?.states?.[entityId]?.state || '';
    if (current.includes('Home 1')) return 'Home 2';
    if (current.includes('Home 2')) return 'Home 3';
    return 'Home 1';
  });

  const buttonIdMap = {
    'Home 1': '#btn-mode-home1',
    'Home 2': '#btn-mode-home2',
    'Home 3': '#btn-mode-home3',
    'Home UPS': '#btn-mode-ups'
  };
  const targetButton = frame.locator(buttonIdMap[targetMode] || '#btn-mode-home1');
  await expect(targetButton).toBeVisible();

  await frame.evaluate(async (mode) => {
    globalThis.__serviceCalls = [];
    globalThis.showAcknowledgementDialog = async () => true;
    globalThis.showSimpleConfirmDialog = async () => true;
    globalThis.executeServiceWithPendingUI = async ({ serviceCall }) => serviceCall();
    await globalThis.DashboardShield?.setBoxMode?.(mode);
  }, targetMode);

  await page.waitForFunction(() => (globalThis.__getServiceCalls?.() || []).length > 0);

  const serviceCall = await page.evaluate(() => {
    const calls = globalThis.__getServiceCalls?.() || [];
    return calls[calls.length - 1] || null;
  });

  expect(serviceCall).toMatchObject({
    domain: 'oig_cloud',
    service: 'set_box_mode',
    data: { mode: targetMode, acknowledgement: true }
  });

  await frame.evaluate(async (mode) => {
    const hass = globalThis.getHass?.();
    const entityId = getSensorId('box_prms_mode');
    const now = new Date().toISOString();
    if (hass?.states) {
      hass.states[entityId] = {
        entity_id: entityId,
        state: mode,
        attributes: {},
        last_updated: now,
        last_changed: now
      };
    }
    await globalThis.DashboardShield?.updateButtonStates?.();
  }, targetMode);

  await expect(targetButton).toHaveClass(/active/);
});

test('mode button click triggers service call', async ({ page }, testInfo) => {
  const mode = getMode(testInfo);
  await page.goto(`/host?mode=${mode}`);

  const frame = await getDashboardFrame(page);
  const panelHeader = frame.locator('#control-panel .panel-header');
  await panelHeader.click();

  await frame.evaluate(() => {
    globalThis.showAcknowledgementDialog = async () => true;
    globalThis.executeServiceWithPendingUI = async ({ serviceCall }) => serviceCall();
  });

  const currentMode = await frame.evaluate(() => {
    return globalThis.getHass?.()?.states?.[getSensorId('box_prms_mode')]?.state || '';
  });
  const targetMode = currentMode.includes('Home 1') ? 'Home 2' : 'Home 1';
  const buttonId = targetMode === 'Home 1' ? '#btn-mode-home1' : '#btn-mode-home2';

  const button = frame.locator(buttonId);
  await expect(button).toBeVisible();
  await button.click();

  await page.waitForFunction(() => (globalThis.__getServiceCalls?.() || []).length > 0);
  const serviceCall = await page.evaluate(() => {
    const calls = globalThis.__getServiceCalls?.() || [];
    return calls[calls.length - 1] || null;
  });

  expect(serviceCall).toMatchObject({
    domain: 'oig_cloud',
    service: 'set_box_mode',
    data: { mode: targetMode, acknowledgement: true }
  });
});

test('pricing cards render current spot price', async ({ page }, testInfo) => {
  const mode = getMode(testInfo);
  await page.goto(`/host?mode=${mode}`);

  const frame = await getDashboardFrame(page);
  await frame.locator('.dashboard-tab', { hasText: 'Predikce a statistiky' }).click();
  await frame.evaluate(async () => {
    if (globalThis.DashboardPricing?.loadPricingData) {
      await globalThis.DashboardPricing.loadPricingData();
    }
  });

  const priceEl = frame.locator('#cheapest-buy-price');
  await expect(priceEl).toBeVisible();
  await expect(priceEl).not.toHaveText('--');
});

test('pricing cards differ between spot and fixed fixtures', async ({ page }, testInfo) => {
  if (testInfo.project.name !== 'cloud') {
    test.skip();
  }

  const readCheapestPrice = async (mode) => {
    await page.goto(`/host?mode=${mode}`);
    const frame = await getDashboardFrame(page);
    await frame.locator('.dashboard-tab', { hasText: 'Predikce a statistiky' }).click();
    await frame.evaluate(async () => {
      if (globalThis.invalidatePricingTimelineCache) {
        const plan = globalThis.pricingPlanMode || 'hybrid';
        globalThis.invalidatePricingTimelineCache(plan);
      }
      if (globalThis.DashboardPricing?.loadPricingData) {
        await globalThis.DashboardPricing.loadPricingData();
      }
    });

    const priceEl = frame.locator('#cheapest-buy-price');
    await expect(priceEl).toBeVisible();
    await expect(priceEl).not.toHaveText('--');
    const text = await priceEl.textContent();
    const match = text?.match(/[\d.,]+/);
    expect(match).not.toBeNull();
    return Number.parseFloat(match[0].replace(',', '.'));
  };

  const spotPrice = await readCheapestPrice('cloud');
  const fixedPrice = await readCheapestPrice('cloud_fixed');

  expect(spotPrice).not.toBeNaN();
  expect(fixedPrice).not.toBeNaN();
  expect(fixedPrice).not.toBe(spotPrice);
});

test('timeline dialog renders today content', async ({ page }, testInfo) => {
  const mode = getMode(testInfo);
  await page.goto(`/host?mode=${mode}`);

  const frame = await getDashboardFrame(page);
  await frame.locator('.dashboard-tab', { hasText: 'Predikce a statistiky' }).click();
  const pricingTab = frame.locator('#pricing-tab');
  await expect(pricingTab).toBeVisible();

  await frame.waitForFunction(() => !!globalThis.DashboardTimeline?.openTimelineDialog);
  await frame.evaluate(() => {
    globalThis.DashboardTimeline.openTimelineDialog('today');
  });

  await frame.waitForFunction(
    () => document.getElementById('mode-timeline-dialog')?.style.display === 'flex'
  );
  await frame.evaluate(() => {
    globalThis.timelineDialogInstance?.switchTab?.('today');
  });

  const todayContainer = frame.locator('#today-timeline-container');
  await frame.waitForFunction(() => {
    const el = document.getElementById('today-timeline-container');
    return el && getComputedStyle(el).display !== 'none';
  });
  await expect(todayContainer).not.toHaveText('');

  await frame.evaluate(() => {
    globalThis.timelineDialogInstance?.switchTab?.('tomorrow');
  });

  const tomorrowContainer = frame.locator('#tomorrow-timeline-container');
  await frame.waitForFunction(() => {
    const el = document.getElementById('tomorrow-timeline-container');
    return el && getComputedStyle(el).display !== 'none';
  });
  await expect(tomorrowContainer).not.toHaveText('');
});

test('timeline refresh updates pricing cache', async ({ page }, testInfo) => {
  const mode = getMode(testInfo);
  if (mode === 'proxy') {
    test.skip();
  }

  const timelineA = [
    {
      timestamp: '2025-01-01T10:00:00+00:00',
      mode: 'Home 1',
      spot_price_czk: 3.1,
      export_price_czk: 2.0,
      battery_capacity_kwh: 5.5,
      solar_charge_kwh: 0.4,
      grid_charge_kwh: 0.1,
      grid_import: 0.2,
      grid_export: 0.0,
      load_kwh: 0.6
    }
  ];
  const timelineB = [
    {
      timestamp: '2025-01-01T10:00:00+00:00',
      mode: 'Home 2',
      spot_price_czk: 8.8,
      export_price_czk: 2.5,
      battery_capacity_kwh: 5.8,
      solar_charge_kwh: 0.3,
      grid_charge_kwh: 0.0,
      grid_import: 0.3,
      grid_export: 0.1,
      load_kwh: 0.5
    }
  ];

  let useUpdatedTimeline = false;
  await page.route(/\/api\/oig_cloud\/battery_forecast\/\d+\/timeline/, async (route) => {
    const payload = useUpdatedTimeline ? timelineB : timelineA;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ active: payload })
    });
  });

  await page.goto(`/host?mode=${mode}`);
  const frame = await getDashboardFrame(page);
  await frame.locator('.dashboard-tab', { hasText: 'Predikce a statistiky' }).click();

  await frame.evaluate(async () => {
    if (globalThis.invalidatePricingTimelineCache) {
      globalThis.invalidatePricingTimelineCache('hybrid');
    }
    if (globalThis.DashboardPricing?.loadPricingData) {
      await globalThis.DashboardPricing.loadPricingData();
    }
  });

  const firstPrice = await frame.evaluate(
    () => globalThis.timelineDataCache?.perPlan?.hybrid?.data?.[0]?.spot_price_czk ?? null
  );
  expect(firstPrice).toBe(3.1);

  useUpdatedTimeline = true;

  await frame.evaluate(async () => {
    if (globalThis.invalidatePricingTimelineCache) {
      globalThis.invalidatePricingTimelineCache('hybrid');
    }
    if (globalThis.DashboardPricing?.loadPricingData) {
      await globalThis.DashboardPricing.loadPricingData();
    }
  });

  const secondPrice = await frame.evaluate(
    () => globalThis.timelineDataCache?.perPlan?.hybrid?.data?.[0]?.spot_price_czk ?? null
  );
  expect(secondPrice).toBe(8.8);
  expect(secondPrice).not.toBe(firstPrice);
});

test('solar forecast updates flow tiles', async ({ page }, testInfo) => {
  const mode = getMode(testInfo);
  await page.goto(`/host?mode=${mode}`);

  const frame = await getDashboardFrame(page);

  await frame.evaluate(() => {
    const entityId = 'sensor.oig_2206237016_solar_forecast';
    const now = new Date().toISOString();
    parent.__setHassState?.(entityId, {
      entity_id: entityId,
      state: '8.25',
      attributes: { tomorrow_total_sum_kw: 6.75 },
      last_updated: now,
      last_changed: now
    });
  });
  await frame.waitForFunction(() => {
    const entityId = 'sensor.oig_2206237016_solar_forecast';
    const hass = parent.document.querySelector('home-assistant')?.hass;
    return hass?.states?.[entityId]?.state === '8.25';
  });

  await frame.evaluate(async () => {
    if (globalThis.DashboardFlow?.forceFullRefresh) {
      globalThis.DashboardFlow.forceFullRefresh();
      await new Promise((resolve) => setTimeout(resolve, 50));
      globalThis.DashboardFlow.forceFullRefresh();
    } else if (globalThis.DashboardFlow?.loadData) {
      await globalThis.DashboardFlow.loadData();
      await new Promise((resolve) => setTimeout(resolve, 50));
      await globalThis.DashboardFlow.loadData();
    }
  });

  await frame.waitForFunction(() => {
    const el = document.getElementById('solar-forecast-today-value');
    if (!el) return false;
    const normalized = (el.textContent || '')
      .replace(/[^0-9.]/g, '')
      .replace(/(\d)\1+/g, '$1')
      .replace(/\.{2,}/g, '.');
    return normalized.includes('8.25');
  });

  const todayValue = await frame.evaluate(() => {
    const el = document.getElementById('solar-forecast-today-value');
    return el ? el.textContent : '';
  });
  const tomorrowValue = await frame.evaluate(() => {
    const el = document.getElementById('solar-forecast-tomorrow-value');
    return el ? el.textContent : '';
  });
  expect(todayValue).toMatch(/8.*2.*5/);
  expect(tomorrowValue).toMatch(/6.*7.*5/);
});

test('last update header reflects real_data_update', async ({ page }, testInfo) => {
  const mode = getMode(testInfo);
  await page.goto(`/host?mode=${mode}`);

  const frame = await getDashboardFrame(page);
  const now = new Date().toISOString();

  await page.evaluate((value) => {
    const entityId = 'sensor.oig_2206237016_real_data_update';
    globalThis.__setHassState?.(entityId, {
      entity_id: entityId,
      state: value,
      attributes: {},
      last_updated: value,
      last_changed: value
    });
  }, now);

  await frame.evaluate(async () => {
    if (globalThis.DashboardFlow?.loadData) {
      await globalThis.DashboardFlow.loadData();
    }
  });

  const header = frame.locator('#last-update-header');
  await expect(header).toContainText('Aktualizováno');
});

test('battery health and efficiency tiles render values', async ({ page }, testInfo) => {
  const mode = getMode(testInfo);
  await page.goto(`/host?mode=${mode}`);

  const frame = await getDashboardFrame(page);
  await frame.locator('.dashboard-tab', { hasText: 'Predikce a statistiky' }).click();

  await frame.evaluate(async () => {
    if (typeof globalThis.updateBatteryHealthStats === 'function') {
      await globalThis.updateBatteryHealthStats();
    }
    if (globalThis.DashboardAnalytics?.updateBatteryEfficiencyStats) {
      await globalThis.DashboardAnalytics.updateBatteryEfficiencyStats();
    }
  });

  const efficiencyMain = frame.locator('#battery-efficiency-main');
  await expect(efficiencyMain).toBeVisible();
  await expect(efficiencyMain).not.toHaveText('--');

  const healthContainer = frame.locator('#battery-health-container');
  await expect(healthContainer).toBeVisible();
  await expect(healthContainer).toContainText('%');
});

test('runtime proxy/local change updates spot price card', async ({ page }, testInfo) => {
  const mode = getMode(testInfo);
  await page.goto(`/host?mode=${mode}`);

  const frame = await getDashboardFrame(page);
  await frame.locator('.dashboard-tab', { hasText: 'Toky' }).click();

  const priceEl = frame.locator('#grid-spot-price');
  await priceEl.waitFor({ state: 'attached' });

  await page.evaluate(() => {
    const entityId = 'sensor.oig_2206237016_spot_price_current_15min';
    const now = new Date().toISOString();
    globalThis.__setHassState?.(entityId, {
      entity_id: entityId,
      state: '9.99',
      attributes: {},
      last_updated: now,
      last_changed: now
    });
  });

  await frame.evaluate(async () => {
    if (globalThis.DashboardFlow?.loadData) {
      await globalThis.DashboardFlow.loadData();
    }
  });

  await frame.waitForFunction(() => {
    const el = document.getElementById('grid-spot-price');
    return el && /\d/.test(el.textContent || '');
  });
});
