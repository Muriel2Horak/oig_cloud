import { chromium } from 'playwright';
import fs from 'node:fs';

const HA = process.env.HA_HOST;
const TOKEN = process.env.HA_TOKEN;
const ENTRY = process.env.OIG_ENTRY_ID;
const BOX = process.env.OIG_BOX_ID;
if (!HA || !TOKEN || !ENTRY || !BOX) {
  console.error('Required env: HA_HOST, HA_TOKEN, OIG_ENTRY_ID, OIG_BOX_ID');
  process.exit(2);
}

const url = `http://${HA}:8123/oig_cloud_static_v2/index.html?v=smoke&t=${Date.now()}&sn=${BOX}&entry_id=${ENTRY}`;
const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', headless: true, args: ['--no-sandbox','--disable-dev-shm-usage'] });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 1800 } });

await ctx.addInitScript(({ token, host }) => {
  const hass = {
    auth: { data: { access_token: token } },
    callApi: async (m, p) => (await fetch(`http://${host}:8123/api/${p}`, { method: m, headers: { Authorization: `Bearer ${token}` } })).json(),
    callWS: async () => ({}),
    callService: async () => ({}),
    states: {},
    config: { language: 'cs' },
    language: 'cs',
    locale: { language: 'cs' },
    user: { is_admin: true, name: 'sis' },
  };
  window.hass = hass;
}, { token: TOKEN, host: HA });

const page = await ctx.newPage();
const logs = [];
page.on('console', m => logs.push(`[${m.type()}] ${m.text()}`));
page.on('pageerror', e => logs.push(`[pageerror] ${e.message}`));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(4000);
await page.evaluate(() => {
  const sr = document.querySelector('oig-app')?.shadowRoot;
  if (!sr) return;
  for (const b of sr.querySelectorAll('button, [role="tab"], .tab-button, .tab')) {
    if ((b.textContent || '').toLowerCase().includes('bojler')) { b.click(); return; }
  }
});
await page.waitForTimeout(3000);

const result = await page.evaluate(() => {
  const sr = document.querySelector('oig-app')?.shadowRoot;
  if (!sr) return { ok: false, reason: 'no shadow' };
  const find = (sel) => {
    if (sr.querySelector(sel)) return true;
    for (const el of sr.querySelectorAll('*')) {
      const inner = el.shadowRoot;
      if (inner && inner.querySelector(sel)) return true;
    }
    return false;
  };
  return {
    ok: true,
    selectors: {
      statusOrUnavailable: find('[data-testid="boiler-status-panel"]') || find('[data-testid="boiler-unavailable-state"]'),
      status: find('[data-testid="boiler-status-panel"]'),
      timeline: find('[data-testid="boiler-plan-timeline"]'),
      explanation: find('[data-testid="boiler-source-explanation"]'),
      override: find('[data-testid="boiler-override-panel"]'),
      setupGuide: find('[data-testid="boiler-setup-guide"]'),
      currentState: find('[data-testid="boiler-status-current-state"]'),
      selectedSource: find('[data-testid="boiler-status-selected-source"]'),
      actuatedSource: find('[data-testid="boiler-status-actuated-source"]'),
      comfort: find('[data-testid="boiler-status-comfort"]'),
      freshness: find('[data-testid="boiler-explanation-freshness"]'),
      degraded: find('[data-testid="boiler-explanation-degraded"]'),
    },
  };
});
console.log('Smoke result:', JSON.stringify(result, null, 2));
await page.screenshot({ path: '/tmp/boiler-v2-smoke.png', fullPage: true });
fs.writeFileSync('/tmp/boiler-v2-smoke.log', logs.join('\n'));
await browser.close();

const requiredCore = ['statusOrUnavailable','timeline','explanation','override'];
const missing = requiredCore.filter(k => !result?.selectors?.[k]);
if (missing.length) { console.error('Missing selectors:', missing.join(', ')); process.exit(1); }
console.log('Smoke OK. Screenshot: /tmp/boiler-v2-smoke.png');
