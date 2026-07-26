// src/__tests__/settings-reload-overlay.test.ts
//
// Fix D — live finding: saving `modules` from the Settings-tab card reloads
// the integration and strands the user on HA's own dashboard ("Přehled")
// with no way back. The onboarding wizard already blocks on the same
// backend reload with an overlay, then calls `reloadPanel()` (a real
// `window.location.reload()`, isolated so tests can stub it) to land back
// on the panel — which defaults to the dashboard tab. This ports that same
// mechanism to the settings card's `save()` for RELOAD_SECTIONS.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const saveModuleConfigMock = vi.hoisted(() => vi.fn().mockResolvedValue({ ok: true }));
const waitForModuleConfigAfterReloadMock = vi.hoisted(() => vi.fn());
const loadModuleConfigMock = vi.hoisted(() =>
  vi.fn().mockResolvedValue({
    modules: {},
    battery: {},
    solar: {},
    boiler: {},
    pricing: {},
    pricing_supplier: {},
  }),
);

vi.mock('@/data/settings-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/settings-data')>();
  return {
    ...actual,
    loadModuleConfig: loadModuleConfigMock,
    saveModuleConfig: saveModuleConfigMock,
    waitForModuleConfigAfterReload: waitForModuleConfigAfterReloadMock,
  };
});

vi.mock('@/data/registry-data', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/data/registry-data')>();
  return {
    ...actual,
    loadFieldRegistry: vi.fn().mockResolvedValue(null),
  };
});

vi.mock('@/data/ha-client', () => ({
  haClient: {
    getHassSync: vi.fn().mockReturnValue(null),
    fetchOIGAPI: vi.fn().mockResolvedValue(null),
    fetchOIGAPITyped: vi.fn().mockResolvedValue({ ok: true, status: 200, data: null }),
  },
}));

import { OigSettings } from '@/ui/features/settings';
import '@/ui/features/settings';

async function mountSettings(): Promise<OigSettings> {
  const el = document.createElement('oig-settings') as OigSettings;
  document.body.appendChild(el);
  await el.updateComplete;
  return el;
}

describe('settings card — reload overlay + return to dashboard (fix D)', () => {
  let reloadPanelSpy: any;
  let el: OigSettings;

  beforeEach(() => {
    reloadPanelSpy = vi.spyOn(
      OigSettings.prototype as unknown as { reloadPanel(): void },
      'reloadPanel',
    ).mockImplementation(() => undefined);
  });

  afterEach(() => {
    reloadPanelSpy.mockRestore();
    el?.remove();
    saveModuleConfigMock.mockClear();
    waitForModuleConfigAfterReloadMock.mockReset();
    loadModuleConfigMock.mockClear();
  });

  it('modules save shows the reload overlay', async () => {
    waitForModuleConfigAfterReloadMock.mockImplementation(() => new Promise(() => undefined));
    el = await mountSettings();
    (el as any).pending = { modules: { modules_enable_boiler: true } };

    await (el as any).save('modules');
    await el.updateComplete;

    const overlay = el.shadowRoot!.querySelector('oig-reload-overlay');
    expect(overlay).toBeTruthy();
    expect(overlay!.shadowRoot!.querySelector('[data-testid="reload-overlay"]')).toBeTruthy();
  });

  it('modules save returns to the dashboard (reloadPanel) once the reload settles', async () => {
    waitForModuleConfigAfterReloadMock.mockImplementation(
      (onSuccess: () => void) => { onSuccess(); return Promise.resolve(); },
    );
    el = await mountSettings();
    (el as any).pending = { modules: { modules_enable_boiler: true } };

    await (el as any).save('modules');
    await el.updateComplete;

    expect(reloadPanelSpy).toHaveBeenCalledTimes(1);
  });

  it('modules is included in RELOAD_SECTIONS', async () => {
    const { RELOAD_SECTIONS } = await import('@/ui/features/settings');
    expect(RELOAD_SECTIONS.has('modules')).toBe(true);
  });

  it('boiler save still shows the reload overlay (regression)', async () => {
    waitForModuleConfigAfterReloadMock.mockImplementation(() => new Promise(() => undefined));
    el = await mountSettings();
    (el as any).pending = { boiler: { boiler_volume_l: 120 } };

    await (el as any).save('boiler');
    await el.updateComplete;

    const overlay = el.shadowRoot!.querySelector('oig-reload-overlay');
    expect(overlay).toBeTruthy();
  });

  it('battery save shows no overlay and no reload (regression)', async () => {
    el = await mountSettings();
    (el as any).pending = { battery: { battery_min_soc: 20 } };

    await (el as any).save('battery');
    await el.updateComplete;

    expect(el.shadowRoot!.querySelector('oig-reload-overlay')).toBeFalsy();
    expect(reloadPanelSpy).not.toHaveBeenCalled();
    expect(waitForModuleConfigAfterReloadMock).not.toHaveBeenCalled();
  });
});
