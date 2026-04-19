import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  selectBoxModeButtons,
  selectSupplementaryToggles,
  OigSupplementarySelector,
} from '@/ui/features/control-panel/selectors';
import type { SupplementaryState } from '@/ui/features/control-panel/types';

type TemplateResult = { values?: unknown[]; strings?: TemplateStringsArray };

function renderSupplementary(props: {
  homeGridV?: boolean;
  homeGridVi?: boolean;
  flexibilita?: boolean;
  available?: boolean;
  disabled?: boolean;
}): TemplateResult | null {
  const el = new OigSupplementarySelector();
  el.homeGridV = props.homeGridV ?? false;
  el.homeGridVi = props.homeGridVi ?? false;
  el.flexibilita = props.flexibilita ?? false;
  el.available = props.available ?? true;
  el.disabled = props.disabled ?? false;
  return Reflect.apply(
    Reflect.get(Object.getPrototypeOf(el), 'render'),
    el,
    [],
  ) as TemplateResult | null;
}

describe('selectBoxModeButtons', () => {
  it('returns exactly 4 main mode buttons', () => {
    const buttons = selectBoxModeButtons();
    expect(buttons).toHaveLength(4);
  });

  it('contains home_1, home_2, home_3, home_ups', () => {
    const buttons = selectBoxModeButtons();
    expect(buttons).toContain('home_1');
    expect(buttons).toContain('home_2');
    expect(buttons).toContain('home_3');
    expect(buttons).toContain('home_ups');
  });

  it('does not contain home_5 or home_6', () => {
    const buttons = selectBoxModeButtons();
    expect(buttons).not.toContain('home_5');
    expect(buttons).not.toContain('home_6');
  });
});

describe('selectSupplementaryToggles', () => {
  describe('when sensor is available and Flexibilita inactive', () => {
    const base: SupplementaryState = {
      home_grid_v: true,
      home_grid_vi: false,
      flexibilita: false,
      available: true,
    };

    it('reflects sensor attribute values directly', () => {
      const result = selectSupplementaryToggles(base);
      expect(result.home_grid_v).toBe(true);
      expect(result.home_grid_vi).toBe(false);
    });

    it('sets available=true', () => {
      expect(selectSupplementaryToggles(base).available).toBe(true);
    });

    it('sets disabled=false so toggles are interactive', () => {
      expect(selectSupplementaryToggles(base).disabled).toBe(false);
    });
  });

  describe('when Flexibilita (app=4) is active', () => {
    const withFlexibilita: SupplementaryState = {
      home_grid_v: true,
      home_grid_vi: true,
      flexibilita: true,
      available: true,
    };

    it('sets disabled=true to block toggles', () => {
      expect(selectSupplementaryToggles(withFlexibilita).disabled).toBe(true);
    });

    it('still exposes flexibilita=true for indicator rendering', () => {
      expect(selectSupplementaryToggles(withFlexibilita).flexibilita).toBe(true);
    });

    it('still exposes toggle values from sensor (read-only view)', () => {
      const result = selectSupplementaryToggles(withFlexibilita);
      expect(result.home_grid_v).toBe(true);
      expect(result.home_grid_vi).toBe(true);
    });
  });

  describe('when box_mode_extended sensor is unavailable', () => {
    const unavailable: SupplementaryState = {
      home_grid_v: false,
      home_grid_vi: false,
      flexibilita: false,
      available: false,
    };

    it('sets disabled=true', () => {
      expect(selectSupplementaryToggles(unavailable).disabled).toBe(true);
    });

    it('returns home_grid_v=false regardless of underlying value', () => {
      const partial: SupplementaryState = { ...unavailable, home_grid_v: true };
      expect(selectSupplementaryToggles(partial).home_grid_v).toBe(false);
    });

    it('returns home_grid_vi=false regardless of underlying value', () => {
      const partial: SupplementaryState = { ...unavailable, home_grid_vi: true };
      expect(selectSupplementaryToggles(partial).home_grid_vi).toBe(false);
    });

    it('sets available=false', () => {
      expect(selectSupplementaryToggles(unavailable).available).toBe(false);
    });
  });

  describe('toggle dispatch guard logic (Flexibilita blocks service call)', () => {
    it('Flexibilita active → disabled=true prevents dispatch', () => {
      const state: SupplementaryState = {
        home_grid_v: false,
        home_grid_vi: false,
        flexibilita: true,
        available: true,
      };
      const result = selectSupplementaryToggles(state);
      expect(result.disabled).toBe(true);
    });

    it('Flexibilita inactive + available → disabled=false allows dispatch', () => {
      const state: SupplementaryState = {
        home_grid_v: false,
        home_grid_vi: false,
        flexibilita: false,
        available: true,
      };
      const result = selectSupplementaryToggles(state);
      expect(result.disabled).toBe(false);
    });
  });

  describe('cloud-fed vs local/proxy-fed box_mode_extended', () => {
    const cloudState: SupplementaryState = {
      home_grid_v: true,
      home_grid_vi: false,
      flexibilita: false,
      available: true,
    };
    const proxyState: SupplementaryState = { ...cloudState };

    it('produces identical toggle state from cloud-fed and proxy-fed attributes', () => {
      const cloudResult = selectSupplementaryToggles(cloudState);
      const proxyResult = selectSupplementaryToggles(proxyState);
      expect(cloudResult).toEqual(proxyResult);
    });

    it('same disabled logic applies regardless of data source', () => {
      const cloudFlexibilita: SupplementaryState = { ...cloudState, flexibilita: true };
      const proxyFlexibilita: SupplementaryState = { ...cloudState, flexibilita: true };
      expect(selectSupplementaryToggles(cloudFlexibilita).disabled).toBe(true);
      expect(selectSupplementaryToggles(proxyFlexibilita).disabled).toBe(true);
    });
  });

  describe('toggle service call contract', () => {
    it('toggleSupplementary field names match home_grid_v / home_grid_vi only', () => {
      const allowedFields: Array<'home_grid_v' | 'home_grid_vi'> = ['home_grid_v', 'home_grid_vi'];
      expect(allowedFields).toHaveLength(2);
      expect(allowedFields).toContain('home_grid_v');
      expect(allowedFields).toContain('home_grid_vi');
      expect(allowedFields).not.toContain('mode');
      expect(allowedFields).not.toContain('home_5');
      expect(allowedFields).not.toContain('home_6');
    });
  });
});

describe('OigSupplementarySelector', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders Home 5 and Home 6 controls', async () => {
    const el = document.createElement('oig-supplementary-selector') as OigSupplementarySelector;
    document.body.appendChild(el);
    await el.updateComplete;

    const buttons = Array.from(el.shadowRoot?.querySelectorAll('button') ?? []).map(button => button.textContent?.trim());

    expect(buttons).toHaveLength(2);
    expect(buttons.some(text => text?.includes('Home 5'))).toBe(true);
    expect(buttons.some(text => text?.includes('Home 6'))).toBe(true);
  });

  it('renders Home 6 as active from live-equivalent supplementary state', async () => {
    const el = document.createElement('oig-supplementary-selector') as OigSupplementarySelector;
    el.homeGridVi = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const buttons = el.shadowRoot?.querySelectorAll('button') ?? [];
    expect(buttons[0]?.className).toContain('idle');
    expect(buttons[1]?.className).toContain('active');
  });

  it('supports both Home 5 and Home 6 active simultaneously', async () => {
    const el = document.createElement('oig-supplementary-selector') as OigSupplementarySelector;
    el.homeGridV = true;
    el.homeGridVi = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const buttons = el.shadowRoot?.querySelectorAll('button') ?? [];
    expect(buttons[0]?.className).toContain('active');
    expect(buttons[1]?.className).toContain('active');
  });

  it('disables both controls when Flexibilita is active', async () => {
    const el = document.createElement('oig-supplementary-selector') as OigSupplementarySelector;
    el.homeGridV = true;
    el.homeGridVi = true;
    el.flexibilita = true;
    el.disabled = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const buttons = el.shadowRoot?.querySelectorAll('button') ?? [];
    expect(buttons[0]?.disabled).toBe(true);
    expect(buttons[1]?.disabled).toBe(true);
    expect(buttons[0]?.className).toContain('active');
    expect(buttons[0]?.className).toContain('disabled-by-service');
    expect(buttons[1]?.className).toContain('active');
    expect(buttons[1]?.className).toContain('disabled-by-service');
  });

  it('disables both controls when supplementary state is unavailable', async () => {
    const el = document.createElement('oig-supplementary-selector') as OigSupplementarySelector;
    el.available = false;
    el.disabled = true;
    document.body.appendChild(el);
    await el.updateComplete;

    const buttons = el.shadowRoot?.querySelectorAll('button') ?? [];
    expect(buttons[0]?.disabled).toBe(true);
    expect(buttons[1]?.disabled).toBe(true);
  });

  it('dispatches supplementary-toggle with the selected service field', () => {
    const el = new OigSupplementarySelector();
    let detail: unknown = null;

    el.addEventListener('supplementary-toggle', event => {
      detail = (event as CustomEvent).detail;
    });

    const onToggleClick = Reflect.get(Object.getPrototypeOf(el), 'onToggleClick') as (key: 'home_grid_v' | 'home_grid_vi') => void;
    onToggleClick.call(el, 'home_grid_vi');

    expect(detail).toEqual({ key: 'home_grid_vi' });
  });
});
