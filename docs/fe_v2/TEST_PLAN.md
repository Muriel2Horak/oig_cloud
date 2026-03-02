# OIG FE V2 - Test Plan

## 1. Test Strategy

### 1.1 Test Pyramid
```
          ┌─────┐
          │ E2E │  (10%) - Critical user flows
          └─────┘
        ┌───────────┐
        │Integration│  (20%) - Feature interactions
        └───────────┘
    ┌───────────────────┐
    │     Unit Tests    │  (70%) - Core functions, utils
    └───────────────────┘
```

### 1.2 Coverage Targets
- **Unit:** 80% line coverage
- **Integration:** Key feature combinations
- **E2E:** All PAR-XXX acceptance criteria

---

## 2. Unit Tests

### 2.1 Framework
- **Runner:** Vitest
- **Assertions:** Vitest built-in
- **Mocking:** vi.fn(), vi.spyOn()

### 2.2 Core Modules
| Module | Tests | Priority |
|--------|-------|----------|
| `core/bootstrap.ts` | Init sequence, error recovery | Critical |
| `core/lifecycle.ts` | Mount/unmount, cleanup | Critical |
| `core/errors.ts` | Error handling, boundaries | Critical |
| `core/logger.ts` | Log formatting, levels | Medium |
| `data/ha-client.ts` | Auth, state access | Critical |
| `data/api.ts` | Fetch, dedup, abort | Critical |
| `data/entity-store.ts` | Subscribe, unsubscribe, cache | Critical |
| `data/query-cache.ts` | TTL, invalidation | High |

### 2.3 Utils
| Module | Tests | Priority |
|--------|-------|----------|
| `utils/format.ts` | Number/date formatting | Medium |
| `utils/colors.ts` | Color calculations | Medium |
| `utils/dom.ts` | DOM helpers | Medium |
| `utils/motion.ts` | Animation easing | Low |

### 2.4 Example Test
```typescript
// tests/unit/data/api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiClient } from '@/data/api';

describe('ApiClient', () => {
  let client: ApiClient;
  
  beforeEach(() => {
    client = new ApiClient({ baseUrl: '/api' });
  });
  
  describe('fetchWithAuth', () => {
    it('should include auth header', async () => {
      const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: () => ({}) });
      global.fetch = mockFetch;
      
      await client.fetch('/test', { token: 'test-token' });
      
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token'
          })
        })
      );
    });
    
    it('should deduplicate concurrent requests', async () => {
      const mockFetch = vi.fn().mockImplementation(() => 
        new Promise(r => setTimeout(() => r({ ok: true, json: () => ({ data: 1 }) }), 100))
      );
      global.fetch = mockFetch;
      
      const results = await Promise.all([
        client.fetch('/same', { token: 't' }),
        client.fetch('/same', { token: 't' }),
        client.fetch('/same', { token: 't' })
      ]);
      
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(results).toHaveLength(3);
    });
  });
});
```

---

## 3. Integration Tests

### 3.1 Framework
- **Runner:** Vitest + jsdom
- **Components:** Lit testing utilities

### 3.2 Feature Tests
| Feature | Tests | Priority |
|---------|-------|----------|
| Flow + State | Flow updates on entity change | Critical |
| Pricing + Zoom | Zoom state persists tab switch | High |
| Control Panel + API | Commands sent correctly | Critical |
| Tiles + Config | Config persists across sessions | High |
| Theme + HA | Theme updates on HA event | High |

### 3.3 Example Test
```typescript
// tests/integration/flow.test.ts
import { describe, it, expect, vi } from 'vitest';
import { fixture, html } from '@open-wc/testing-helpers';
import { FlowFeature } from '@/ui/features/flow';
import { EntityStore } from '@/data/entity-store';

describe('FlowFeature Integration', () => {
  it('should update nodes when entities change', async () => {
    const store = new EntityStore();
    const flow = await fixture<FlowFeature>(html`<oig-flow .store=${store}></oig-flow>`);
    
    // Initial state
    expect(flow.shadowRoot?.querySelector('.battery-node .soc').textContent).toBe('0%');
    
    // Update entity
    store.updateEntity('sensor.battery_soc', { state: '75' });
    
    // Should reflect
    await flow.updateComplete;
    expect(flow.shadowRoot?.querySelector('.battery-node .soc').textContent).toBe('75%');
  });
  
  it('should start particles when flow > 0', async () => {
    const store = new EntityStore();
    const flow = await fixture<FlowFeature>(html`<oig-flow .store=${store}></oig-flow>`);
    
    store.updateEntity('sensor.solar_power', { state: '5000' });
    await flow.updateComplete;
    
    expect(flow.particleEngine.isRunning).toBe(true);
  });
});
```

---

## 4. E2E Tests

### 4.1 Framework
- **Runner:** Playwright
- **Browsers:** Chromium, WebKit (Safari), Firefox

### 4.2 Device Matrix
| Device | Viewport | Browser | Priority |
|--------|----------|---------|----------|
| Desktop | 1920x1080 | Chromium | Critical |
| Desktop | 1920x1080 | Firefox | High |
| Desktop | 1920x1080 | WebKit | High |
| Tablet | 768x1024 | Chromium | High |
| Mobile | 375x667 | Chromium | Critical |
| Mobile | 375x667 | WebKit | High |

### 4.3 Critical Flows
| ID | Flow | Steps | Priority |
|----|------|-------|----------|
| E2E-01 | Dashboard Load | Open → Header visible → Tabs visible → Default tab content | Critical |
| E2E-02 | Tab Navigation | Click each tab → Content loads → No errors | Critical |
| E2E-03 | Flow Particles | Open Flow tab → Particles animate → Match power | Critical |
| E2E-04 | Pricing Chart | Open Pricing → Chart renders → Zoom works | Critical |
| E2E-05 | Control Panel | Expand → Change mode → Confirm → Shield queue updates | Critical |
| E2E-06 | Theme Switch | HA dark → V2 dark → HA light → V2 light | High |
| E2E-07 | Mobile Layout | Resize → Layout adapts → Touch works | Critical |
| E2E-08 | Error Recovery | API fails → Error shown → Retry → Recovers | High |

### 4.4 Example Test
```typescript
// tests/e2e/dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/oig-cloud-v2');
    await page.waitForLoadState('networkidle');
  });
  
  test('E2E-01: Dashboard loads successfully', async ({ page }) => {
    // Header visible
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('header h1')).toContainText('Energetické Toky');
    
    // Tabs visible
    await expect(page.locator('[role="tablist"]')).toBeVisible();
    await expect(page.locator('[role="tab"]')).toHaveCount(3);
    
    // Default tab content
    await expect(page.locator('[role="tabpanel"].active')).toBeVisible();
  });
  
  test('E2E-02: Tab navigation works', async ({ page }) => {
    const tabs = ['Toky', 'Predikce a statistiky', 'Bojler'];
    
    for (const tabName of tabs) {
      await page.click(`[role="tab"]:text("${tabName}")`);
      await expect(page.locator(`[role="tabpanel"].active`)).toBeVisible();
      await expect(page.locator('[role="tab"][aria-selected="true"]')).toContainText(tabName);
    }
  });
  
  test('E2E-03: Flow particles animate', async ({ page }) => {
    await page.click('[role="tab"]:text("Toky")');
    
    // Wait for particles
    await page.waitForSelector('.particle', { timeout: 5000 });
    
    // Check animation
    const particle = page.locator('.particle').first();
    const box1 = await particle.boundingBox();
    await page.waitForTimeout(500);
    const box2 = await particle.boundingBox();
    
    expect(box1?.x).not.toBe(box2?.x);
  });
  
  test('E2E-04: Pricing chart zoom', async ({ page }) => {
    await page.click('[role="tab"]:text("Predikce a statistiky")');
    await page.waitForSelector('canvas');
    
    // Zoom with wheel
    const canvas = page.locator('canvas');
    await canvas.hover();
    await page.mouse.wheel(0, -100);
    
    // Reset button should appear
    await expect(page.locator('button:has-text("Reset")')).toBeVisible();
  });
});
```

---

## 5. Visual Regression Tests

### 5.1 Framework
- **Runner:** Playwright
- **Comparison:** pixelmatch

### 5.2 Snapshots
| Component | States | Browsers |
|-----------|--------|----------|
| Shell | Default, Dark theme | Chromium |
| Flow Tab | No flow, Solar flow, Grid flow | Chromium |
| Pricing Tab | Default, Zoomed | Chromium |
| Control Panel | Collapsed, Expanded | Chromium |
| Mobile Layout | All tabs | Chromium |

### 5.3 Example
```typescript
// tests/e2e/visual.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('Flow tab - solar flow', async ({ page }) => {
    // Mock state with solar production
    await page.route('**/api/states/**', route => {
      route.fulfill({ json: { state: '5000' } });
    });
    
    await page.goto('/oig-cloud-v2');
    await page.click('[role="tab"]:text("Toky")');
    await page.waitForSelector('.particle');
    
    await expect(page).toHaveScreenshot('flow-solar.png', {
      maxDiffPixels: 100
    });
  });
});
```

---

## 6. Performance Tests

### 6.1 Metrics
| Metric | Target | Tool |
|--------|--------|------|
| First Contentful Paint | < 1.5s | Lighthouse |
| Time to Interactive | < 2s | Lighthouse |
| Tab Switch | < 400ms | Custom |
| Memory (1h run) | < 100MB | Chrome DevTools |

### 6.2 Test Script
```typescript
// tests/e2e/performance.spec.ts
import { test, expect } from '@playwright/test';

test('Initial load performance', async ({ page }) => {
  const start = Date.now();
  await page.goto('/oig-cloud-v2');
  await page.waitForSelector('[role="tabpanel"].active');
  const loadTime = Date.now() - start;
  
  expect(loadTime).toBeLessThan(2000);
});

test('Tab switch performance', async ({ page }) => {
  await page.goto('/oig-cloud-v2');
  
  for (let i = 0; i < 10; i++) {
    const start = Date.now();
    await page.click('[role="tab"]:nth-child(' + ((i % 3) + 1) + ')');
    await page.waitForSelector('[role="tabpanel"].active');
    const switchTime = Date.now() - start;
    
    expect(switchTime).toBeLessThan(400);
  }
});
```

---

## 7. HA Companion App Tests

### 7.1 Manual Test Checklist

#### iOS App
- [ ] Dashboard loads
- [ ] Particles animate smoothly
- [ ] Charts render
- [ ] Touch interactions work
- [ ] Theme matches
- [ ] No console errors
- [ ] Memory stable after 5 min

#### Android App
- [ ] Dashboard loads
- [ ] Particles animate smoothly
- [ ] Charts render
- [ ] Touch interactions work
- [ ] Theme matches
- [ ] No console errors
- [ ] Memory stable after 5 min

### 7.2 Automated (if possible)
- BrowserStack / Sauce Labs integration
- Appium for native app automation

---

## 8. Test Commands

```bash
# Unit tests
npm run test:unit

# Unit tests with coverage
npm run test:unit:coverage

# Integration tests
npm run test:integration

# E2E tests
npm run test:e2e

# E2E tests (headed)
npm run test:e2e:headed

# Visual regression
npm run test:visual

# Update snapshots
npm run test:visual:update

# All tests
npm run test:all

# Performance tests
npm run test:perf
```

---

## 9. CI/CD Integration

### GitHub Actions
```yaml
name: Test

on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run test:unit:coverage
      - uses: codecov/codecov-action@v3

  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npx playwright install
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 10. Test Data

### Mock Entities
```typescript
// tests/mocks/entities.ts
export const mockEntities = {
  'sensor.battery_soc': { state: '75', attributes: { unit_of_measurement: '%' } },
  'sensor.solar_power': { state: '5000', attributes: { unit_of_measurement: 'W' } },
  'sensor.grid_power': { state: '-1200', attributes: { unit_of_measurement: 'W' } },
  'sensor.house_power': { state: '3800', attributes: { unit_of_measurement: 'W' } },
  'sensor.inverter_mode': { state: 'Home 1' },
  // ...
};
```

### Mock API Responses
```typescript
// tests/mocks/api.ts
export const mockPricingData = {
  prices: [
    { time: '2024-01-15T00:00:00', buy: 0.85, sell: 0.45 },
    // ...
  ],
  blocks: [
    { start: '2024-01-15T02:00:00', end: '2024-01-15T05:00:00', type: 'cheap' },
    // ...
  ]
};
```
