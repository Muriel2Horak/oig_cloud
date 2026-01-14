import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = process.env.OIG_REPO_ROOT
  ? path.resolve(process.env.OIG_REPO_ROOT)
  : path.resolve(__dirname, '../../..');

const FIXTURES_DIR = path.join(__dirname, 'fixtures');
const DEFAULT_MODE = 'cloud';
const PORT = process.env.OIG_MOCK_PORT || 8124;

function loadFixture(mode) {
  const file = path.join(FIXTURES_DIR, `${mode}.json`);
  if (!fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(path.join(FIXTURES_DIR, `${DEFAULT_MODE}.json`), 'utf8'));
  }
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function resolveMode(req = {}) {
  const query = req.query || {};
  const headers = req.headers || {};
  if (query.mode) {
    return query.mode.toString();
  }
  const referer = headers.referer;
  if (referer) {
    try {
      const refUrl = new URL(referer);
      const refMode = refUrl.searchParams.get('mode');
      if (refMode) {
        return refMode.toString();
      }
    } catch (_err) {
      // Ignore malformed referer and fallback to defaults.
    }
  }
  return (process.env.OIG_MOCK_MODE || DEFAULT_MODE).toString();
}

function respondJson(res, payload) {
  res.statusCode = 200;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(payload));
}

function normalizeTimeline(timeline) {
  if (!Array.isArray(timeline)) {
    return timeline;
  }
  const now = new Date();
  const base = new Date(now);
  base.setMinutes(Math.floor(base.getMinutes() / 15) * 15, 0, 0);
  const normalized = timeline.map((entry, index) => ({
    ...entry,
    timestamp: new Date(base.getTime() + index * 15 * 60 * 1000).toISOString()
  }));
  const minLength = 12;
  if (normalized.length < minLength) {
    const last = normalized[normalized.length - 1] || { spot_price_czk: 3.0, export_price_czk: 2.0 };
    for (let i = normalized.length; i < minLength; i += 1) {
      normalized.push({
        ...last,
        timestamp: new Date(base.getTime() + i * 15 * 60 * 1000).toISOString()
      });
    }
  }
  return normalized;
}

function guessType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const map = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.svg': 'image/svg+xml'
  };
  return map[ext] || 'application/octet-stream';
}

function serveStatic(res, filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  res.statusCode = 200;
  res.setHeader('content-type', guessType(filePath));
  res.end(fs.readFileSync(filePath));
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const mode = resolveMode({
    query: Object.fromEntries(url.searchParams.entries()),
    headers: req.headers
  });

  if (url.pathname === '/host') {
    const fixture = loadFixture(mode);
    const inverterSn = url.searchParams.get('inverter_sn') || '2206237016';
    const hassData = {
      states: fixture.hass?.states || {},
      auth: { data: { access_token: 'mock-token' } },
      themes: { darkMode: false, themes: {}, theme: 'default', default_theme: 'default' },
      selectedTheme: 'default'
    };

    res.statusCode = 200;
    res.setHeader('content-type', 'text/html');
    res.end(`<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>OIG Cloud Mock Host (${mode})</title>
    <style>
      html, body, iframe { width: 100%; height: 100%; margin: 0; border: 0; }
    </style>
  </head>
  <body>
    <home-assistant id="ha-root"></home-assistant>
    <script>
      const ha = document.getElementById('ha-root');
      const hass = ${JSON.stringify(hassData)};
      hass.connection = {
        subscribeEvents: async () => () => {},
        addEventListener: () => {}
      };
      hass.callWS = async () => ({ result: {} });
      hass.callService = async (domain, service, data) => {
        globalThis.__serviceCalls = globalThis.__serviceCalls || [];
        globalThis.__serviceCalls.push({ domain, service, data });
        return { result: 'ok' };
      };
      ha.hass = hass;
      globalThis.__setHassState = (entityId, state) => {
        ha.hass.states[entityId] = state;
      };
      globalThis.__getServiceCalls = () => (globalThis.__serviceCalls || []);
    </script>
    <iframe id="dashboard" src="/local/oig_cloud/dashboard.html?inverter_sn=${inverterSn}&mode=${mode}"></iframe>
  </body>
</html>`);
    return;
  }

  if (url.pathname.startsWith('/local/oig_cloud/')) {
    let rel = url.pathname.replace('/local/oig_cloud/', '');
    if (rel.startsWith('www/')) {
      rel = rel.slice(4);
    }
    const filePath = path.join(ROOT, 'custom_components/oig_cloud/www', rel);
    serveStatic(res, filePath);
    return;
  }

  if (url.pathname.startsWith('/api/oig_cloud/')) {
    const fixture = loadFixture(mode);
    if (url.pathname.endsWith('/modules')) {
      respondJson(res, fixture.api?.modules || { modules: [] });
      return;
    }
    if (url.pathname.endsWith('/boiler_profile')) {
      respondJson(res, fixture.api?.boiler_profile || {});
      return;
    }
    if (url.pathname.endsWith('/boiler_plan')) {
      respondJson(res, fixture.api?.boiler_plan || {});
      return;
    }
    if (url.pathname.includes('/planner_settings')) {
      respondJson(res, fixture.api?.planner_settings || {});
      return;
    }
    if (url.pathname.includes('/timeline')) {
      const payload = fixture.api?.timeline || { timeline: [] };
      if (payload?.timeline) {
        payload.timeline = normalizeTimeline(payload.timeline);
      }
      if (payload?.active) {
        payload.active = normalizeTimeline(payload.active);
      }
      respondJson(res, payload);
      return;
    }
    if (url.pathname.includes('/detail_tabs')) {
      respondJson(res, fixture.api?.detail_tabs || { intervals: [] });
      return;
    }
    if (url.pathname.includes('/unified_cost_tile')) {
      respondJson(res, fixture.api?.unified_cost_tile || {});
      return;
    }
  }

  res.statusCode = 404;
  res.end('Not found');
});

server.listen(PORT, '0.0.0.0', () => {
  // eslint-disable-next-line no-console
  console.log(`OIG FE mock server listening on http://localhost:${PORT}`);
});
