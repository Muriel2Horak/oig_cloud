import { test, expect } from '@playwright/test';

function getMode(testInfo) {
  return testInfo.project.metadata?.mode || 'cloud';
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
  const chmuText = frame.locator('#chmu-text');
  await expect(chmuText).toBeVisible();

  if (mode === 'proxy') {
    await expect(chmuText).toHaveText('Bez výstrah');
  } else if (mode === 'local') {
    await expect(chmuText).toContainText('Local alert');
  } else {
    await expect(chmuText).toContainText('Test alert');
  }

  expect(consoleMessages).toEqual([]);
});

test('mode buttons render and can trigger service call', async ({ page }, testInfo) => {
  const mode = getMode(testInfo);
  await page.goto(`/host?mode=${mode}`);

  const frame = await getDashboardFrame(page);
  const panelHeader = frame.locator('#control-panel .panel-header');
  await panelHeader.click();

  const targetMode = await frame.evaluate(() => {
    const current = window.getHass?.()?.states?.[getSensorId('box_prms_mode')]?.state || '';
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
    window.showAcknowledgementDialog = async () => true;
    window.showSimpleConfirmDialog = async () => true;
    window.executeServiceWithPendingUI = async ({ serviceCall }) => serviceCall();
    await window.DashboardShield?.setBoxMode?.(mode);
  }, targetMode);

  await page.waitForFunction(() => (window.__getServiceCalls?.() || []).length > 0);
});

test('pricing cards render current spot price', async ({ page }, testInfo) => {
  const mode = getMode(testInfo);
  await page.goto(`/host?mode=${mode}`);

  const frame = await getDashboardFrame(page);
  await frame.locator('.dashboard-tab', { hasText: 'Predikce a statistiky' }).click();

  const priceEl = frame.locator('#cheapest-buy-price');
  await expect(priceEl).toBeVisible();
  await expect(priceEl).not.toHaveText('--');
});

test('timeline dialog renders today content', async ({ page }, testInfo) => {
  const mode = getMode(testInfo);
  await page.goto(`/host?mode=${mode}`);

  const frame = await getDashboardFrame(page);
  await frame.waitForFunction(() => !!window.DashboardTimeline?.openTimelineDialog);
  await frame.evaluate(() => {
    window.DashboardTimeline.openTimelineDialog('today');
  });

  await frame.waitForFunction(
    () => document.getElementById('mode-timeline-dialog')?.style.display === 'flex'
  );
  await frame.evaluate(() => {
    window.timelineDialogInstance?.switchTab?.('today');
  });

  const todayContainer = frame.locator('#today-timeline-container');
  await frame.waitForFunction(() => {
    const el = document.getElementById('today-timeline-container');
    return el && getComputedStyle(el).display !== 'none';
  });
  await expect(todayContainer).not.toHaveText('');
});

test('battery health and efficiency tiles render values', async ({ page }, testInfo) => {
  const mode = getMode(testInfo);
  await page.goto(`/host?mode=${mode}`);

  const frame = await getDashboardFrame(page);
  await frame.locator('.dashboard-tab', { hasText: 'Predikce a statistiky' }).click();

  await frame.evaluate(async () => {
    if (typeof window.updateBatteryHealthStats === 'function') {
      await window.updateBatteryHealthStats();
    }
    if (window.DashboardAnalytics?.updateBatteryEfficiencyStats) {
      await window.DashboardAnalytics.updateBatteryEfficiencyStats();
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
    window.__setHassState?.(entityId, {
      entity_id: entityId,
      state: '9.99',
      attributes: {},
      last_updated: now,
      last_changed: now
    });
  });

  await frame.evaluate(async () => {
    if (window.DashboardFlow?.loadData) {
      await window.DashboardFlow.loadData();
    }
  });

  await frame.waitForFunction(() => {
    const el = document.getElementById('grid-spot-price');
    return el && /\d/.test(el.textContent || '');
  });
});
