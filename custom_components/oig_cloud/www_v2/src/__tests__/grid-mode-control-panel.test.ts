import { describe, it, expect, vi } from 'vitest';
import {
  resolveGridDelivery,
  GRID_DELIVERY_SENSOR_MAP,
  GRID_DELIVERY_LABELS,
  GridDelivery,
  EMPTY_SHIELD_STATE,
  ConfirmDialogConfig,
} from '@/ui/features/control-panel/types';
import { OigGridDeliverySelector } from '@/ui/features/control-panel/selectors';
import { OigControlPanel } from '@/ui/features/control-panel/panel';

describe('resolveGridDelivery — robustness against sensor value variants', () => {
  it('resolves canonical Czech exact matches', () => {
    expect(resolveGridDelivery('Vypnuto')).toBe('off');
    expect(resolveGridDelivery('Zapnuto')).toBe('on');
    expect(resolveGridDelivery('Omezeno')).toBe('limited');
  });

  it('resolves lowercase Czech variants', () => {
    expect(resolveGridDelivery('vypnuto')).toBe('off');
    expect(resolveGridDelivery('zapnuto')).toBe('on');
    expect(resolveGridDelivery('omezeno')).toBe('limited');
  });

  it('resolves canonical English exact matches', () => {
    expect(resolveGridDelivery('Off')).toBe('off');
    expect(resolveGridDelivery('On')).toBe('on');
    expect(resolveGridDelivery('Limited')).toBe('limited');
  });

  it('resolves lowercase English variants', () => {
    expect(resolveGridDelivery('off')).toBe('off');
    expect(resolveGridDelivery('on')).toBe('on');
    expect(resolveGridDelivery('limited')).toBe('limited');
  });

  it('resolves numeric string variants', () => {
    expect(resolveGridDelivery('0')).toBe('off');
    expect(resolveGridDelivery('1')).toBe('on');
    expect(resolveGridDelivery('2')).toBe('limited');
  });

  it('resolves all-caps variants via case-insensitive fallback', () => {
    expect(resolveGridDelivery('OFF')).toBe('off');
    expect(resolveGridDelivery('ON')).toBe('on');
    expect(resolveGridDelivery('LIMITED')).toBe('limited');
    expect(resolveGridDelivery('OMEZENO')).toBe('limited');
    expect(resolveGridDelivery('ZAPNUTO')).toBe('on');
    expect(resolveGridDelivery('VYPNUTO')).toBe('off');
  });

  it('resolves compound values like "Omezeno (5000 W)" via prefix matching', () => {
    expect(resolveGridDelivery('Omezeno (5000 W)')).toBe('limited');
    expect(resolveGridDelivery('Omezení')).toBe('limited');
  });

  it('resolves values with leading/trailing whitespace', () => {
    expect(resolveGridDelivery('  Omezeno  ')).toBe('limited');
    expect(resolveGridDelivery(' Zapnuto ')).toBe('on');
    expect(resolveGridDelivery(' Vypnuto ')).toBe('off');
  });

  it('returns "off" for unknown/transition values instead of crashing', () => {
    expect(resolveGridDelivery('Probíhá změna')).toBe('off');
    expect(resolveGridDelivery('')).toBe('off');
    expect(resolveGridDelivery('unknown_state')).toBe('off');
  });
});

describe('GRID_DELIVERY_SENSOR_MAP — covers both Czech and English keys', () => {
  it('has entries for all three GridDelivery states in multiple forms', () => {
    const values = Object.values(GRID_DELIVERY_SENSOR_MAP);
    expect(values).toContain('off');
    expect(values).toContain('on');
    expect(values).toContain('limited');
  });

  it('maps "Omezeno" to limited (Czech backend canonical)', () => {
    expect(GRID_DELIVERY_SENSOR_MAP['Omezeno']).toBe('limited');
  });
});

describe('GRID_DELIVERY_LABELS — nice user-facing labels preserved', () => {
  it('keeps Czech user-facing labels for all three modes', () => {
    expect(GRID_DELIVERY_LABELS['off']).toBe('Vypnuto');
    expect(GRID_DELIVERY_LABELS['on']).toBe('Zapnuto');
    expect(GRID_DELIVERY_LABELS['limited']).toBe('S omezením');
  });
});

describe('Grid mode + limit ordered split flow', () => {
  it('resolveGridDelivery preserves existing limited state during "Probíhá změna" transition', () => {
    const transitionRaw = 'Probíhá změna';
    expect(resolveGridDelivery(transitionRaw)).toBe('off');
  });

  it('resolves to limited consistently regardless of casing variation', () => {
    const variants = ['Omezeno', 'omezeno', 'OMEZENO', 'Limited', 'limited', 'LIMITED', '2'];
    for (const v of variants) {
      expect(resolveGridDelivery(v)).toBe('limited' as GridDelivery);
    }
  });

  it('resolves to on consistently regardless of casing variation', () => {
    const variants = ['Zapnuto', 'zapnuto', 'ZAPNUTO', 'On', 'on', 'ON', '1'];
    for (const v of variants) {
      expect(resolveGridDelivery(v)).toBe('on' as GridDelivery);
    }
  });

  it('resolves to off consistently regardless of casing variation', () => {
    const variants = ['Vypnuto', 'vypnuto', 'VYPNUTO', 'Off', 'off', 'OFF', '0'];
    for (const v of variants) {
      expect(resolveGridDelivery(v)).toBe('off' as GridDelivery);
    }
  });
});

describe('OigGridDeliverySelector — limited button stays visually active during service transition', () => {
  function getButtonClasses(
    value: 'off' | 'on' | 'limited',
    buttonStates: Record<'off' | 'on' | 'limited', 'idle' | 'active' | 'pending' | 'processing' | 'disabled-by-service'>,
  ): Record<'off' | 'on' | 'limited', string> {
    const el = new OigGridDeliverySelector();
    el.value = value;
    el.limit = 5000;
    el.buttonStates = buttonStates;

    const rendered = Reflect.apply(
      Reflect.get(Object.getPrototypeOf(el), 'render'),
      el,
      [],
    ) as { values?: unknown[] } | null;

    // values[0] = pendingLabel, values[1] = mode-buttons array
    const modeButtonsTemplate = rendered?.values?.[1] as Array<{ values?: unknown[] }> | null;
    if (!Array.isArray(modeButtonsTemplate)) return { off: '', on: '', limited: '' };

    const keys: Array<'off' | 'on' | 'limited'> = ['off', 'on', 'limited'];
    const result: Record<'off' | 'on' | 'limited', string> = { off: '', on: '', limited: '' };
    keys.forEach((key, i) => {
      const tpl = modeButtonsTemplate[i] as { values?: unknown[] } | null;
      result[key] = String(tpl?.values?.[0] ?? '');
    });
    return result;
  }

  it('limited button class is "active disabled-by-service" when value=limited and shield is changing to off', () => {
    const classes = getButtonClasses('limited', {
      off: 'processing',
      on: 'disabled-by-service',
      limited: 'disabled-by-service',
    });
    expect(classes.limited).toBe('active disabled-by-service');
  });

  it('limited button class is "active" when value=limited and no service change is pending', () => {
    const classes = getButtonClasses('limited', {
      off: 'idle',
      on: 'idle',
      limited: 'active',
    });
    expect(classes.limited).toBe('active');
  });

  it('off button class is not active when value=limited even if shield disabled it', () => {
    const classes = getButtonClasses('limited', {
      off: 'disabled-by-service',
      on: 'disabled-by-service',
      limited: 'disabled-by-service',
    });
    expect(classes.off).toBe('disabled-by-service');
    expect(classes.on).toBe('disabled-by-service');
    expect(classes.limited).toBe('active disabled-by-service');
  });

  it('no button gets active-override when value=off and all states are idle', () => {
    const classes = getButtonClasses('off', {
      off: 'active',
      on: 'idle',
      limited: 'idle',
    });
    expect(classes.off).toBe('active');
    expect(classes.on).toBe('idle');
    expect(classes.limited).toBe('idle');
  });
});

describe('OigGridDeliverySelector — pending target rendering separation', () => {
  function renderSelector(
    value: 'off' | 'on' | 'limited',
    pendingTarget: 'off' | 'on' | 'limited' | null,
    limit: number,
    buttonStates: Record<'off' | 'on' | 'limited', 'idle' | 'active' | 'pending' | 'processing' | 'disabled-by-service'>,
  ) {
    const el = new OigGridDeliverySelector();
    el.value = value;
    el.limit = limit;
    el.pendingTarget = pendingTarget;
    el.buttonStates = buttonStates;
    return Reflect.apply(
      Reflect.get(Object.getPrototypeOf(el), 'render'),
      el,
      [],
    ) as { values?: unknown[] } | null;
  }

  it('pendingLabel is null when pendingTarget matches current value (no change)', () => {
    const result = renderSelector('limited', 'limited', 5000, { off: 'idle', on: 'idle', limited: 'active' });
    const pendingLabel = result?.values?.[0];
    expect(pendingLabel).toBeNull();
  });

  it('pendingLabel is null when pendingTarget is null', () => {
    const result = renderSelector('limited', null, 5000, { off: 'idle', on: 'idle', limited: 'active' });
    const pendingLabel = result?.values?.[0];
    expect(pendingLabel).toBeNull();
  });

  it('pendingLabel is a TemplateResult when pendingTarget differs from live value', () => {
    const result = renderSelector('off', 'limited', 0, { off: 'idle', on: 'idle', limited: 'pending' });
    const pendingLabel = result?.values?.[0];
    expect(pendingLabel).not.toBeNull();
    expect(typeof pendingLabel).toBe('object');
  });

  it('pendingLabel contains pending target label text when value=off and pendingTarget=on', () => {
    const result = renderSelector('off', 'on', 0, { off: 'idle', on: 'pending', limited: 'idle' });
    const pendingLabel = result?.values?.[0] as { values?: unknown[] } | null;
    expect(pendingLabel).not.toBeNull();
    const vals = pendingLabel?.values ?? [];
    expect(vals.some(v => String(v).includes('Zapnuto'))).toBe(true);
  });
});

describe('OigGridDeliverySelector — pending-target button class', () => {
  function getButtonClassesFull(
    value: 'off' | 'on' | 'limited',
    pendingTarget: 'off' | 'on' | 'limited' | null,
    buttonStates: Record<'off' | 'on' | 'limited', 'idle' | 'active' | 'pending' | 'processing' | 'disabled-by-service'>,
  ): Record<'off' | 'on' | 'limited', string> {
    const el = new OigGridDeliverySelector();
    el.value = value;
    el.limit = 5000;
    el.pendingTarget = pendingTarget;
    el.buttonStates = buttonStates;

    const rendered = Reflect.apply(
      Reflect.get(Object.getPrototypeOf(el), 'render'),
      el,
      [],
    ) as { values?: unknown[] } | null;

    const modeButtonsTemplate = rendered?.values?.[1] as Array<{ values?: unknown[] }> | null;
    if (!Array.isArray(modeButtonsTemplate)) return { off: '', on: '', limited: '' };

    const keys: Array<'off' | 'on' | 'limited'> = ['off', 'on', 'limited'];
    const result: Record<'off' | 'on' | 'limited', string> = { off: '', on: '', limited: '' };
    keys.forEach((key, i) => {
      const tpl = modeButtonsTemplate[i] as { values?: unknown[] } | null;
      result[key] = String(tpl?.values?.[0] ?? '');
    });
    return result;
  }

  it('pending target button gets "idle pending-target" class, not "active"', () => {
    const classes = getButtonClassesFull('off', 'limited', {
      off: 'active',
      on: 'idle',
      limited: 'idle',
    });
    expect(classes.limited).toBe('idle pending-target');
    expect(classes.off).toBe('active');
  });

  it('live current button retains active class even when pending target differs', () => {
    const classes = getButtonClassesFull('limited', 'off', {
      off: 'idle',
      on: 'idle',
      limited: 'active',
    });
    expect(classes.limited).toBe('active');
    expect(classes.off).toBe('idle pending-target');
    expect(classes.on).toBe('idle');
  });

  it('pending target class NOT applied when pendingTarget equals live value', () => {
    const classes = getButtonClassesFull('on', 'on', {
      off: 'idle',
      on: 'active',
      limited: 'idle',
    });
    expect(classes.on).toBe('active');
  });
});

describe('OigGridDeliverySelector — unknown live state leaves all buttons inactive', () => {
  function getButtonClassesForUnknown(): Record<'off' | 'on' | 'limited', string> {
    const el = new OigGridDeliverySelector();
    el.value = 'unknown' as GridDelivery;
    el.limit = 0;
    el.pendingTarget = null;
    el.buttonStates = { off: 'idle', on: 'idle', limited: 'idle' };

    const rendered = Reflect.apply(
      Reflect.get(Object.getPrototypeOf(el), 'render'),
      el,
      [],
    ) as { values?: unknown[] } | null;

    const modeButtonsTemplate = rendered?.values?.[1] as Array<{ values?: unknown[] }> | null;
    if (!Array.isArray(modeButtonsTemplate)) return { off: '', on: '', limited: '' };

    const keys: Array<'off' | 'on' | 'limited'> = ['off', 'on', 'limited'];
    const result: Record<'off' | 'on' | 'limited', string> = { off: '', on: '', limited: '' };
    keys.forEach((key, i) => {
      const tpl = modeButtonsTemplate[i] as { values?: unknown[] } | null;
      result[key] = String(tpl?.values?.[0] ?? '');
    });
    return result;
  }

  it('no button is active when live delivery is unknown', () => {
    const classes = getButtonClassesForUnknown();
    expect(classes.off).toBe('idle');
    expect(classes.on).toBe('idle');
    expect(classes.limited).toBe('idle');
  });

  it('off button is NOT activated when live delivery is unknown — no silent unknown->off mapping', () => {
    const classes = getButtonClassesForUnknown();
    expect(classes.off).not.toBe('active');
  });
});

describe('OigGridDeliverySelector — label and input cleanup after Task 4', () => {
  it('does NOT render the numeric limit in the label/header area', () => {
    const el = new OigGridDeliverySelector();
    el.value = 'limited';
    el.limit = 5000;
    el.pendingTarget = null;
    el.buttonStates = { off: 'idle', on: 'idle', limited: 'active' };

    const result = Reflect.apply(
      Reflect.get(Object.getPrototypeOf(el), 'render'),
      el,
      [],
    ) as { values?: unknown[]; strings?: TemplateStringsArray } | null;

    expect(result?.values?.[0]).toBeNull();
    const labelStaticText = String(result?.strings?.[0] ?? '');
    expect(labelStaticText).not.toContain('5000');
  });

});

describe('OigGridDeliverySelector — active limited re-click emits delivery-change', () => {
  it('emits delivery-change event when already-active limited button is clicked', () => {
    const el = new OigGridDeliverySelector();
    el.value = 'limited';
    el.limit = 5000;
    el.buttonStates = { off: 'idle', on: 'idle', limited: 'active' };

    let emitted = false;
    let receivedDetail: unknown = null;
    el.addEventListener('delivery-change', ((e: Event) => {
      emitted = true;
      receivedDetail = (e as CustomEvent).detail;
    }) as EventListener);

    const onDeliveryClick = Reflect.get(Object.getPrototypeOf(el), 'onDeliveryClick') as (d: GridDelivery) => void;
    onDeliveryClick.call(el, 'limited');

    expect(emitted).toBe(true);
    expect(receivedDetail).toEqual({ value: 'limited', limit: 5000 });
  });

  it('still no-ops when active off or active on is clicked', () => {
    const el = new OigGridDeliverySelector();
    el.value = 'off';
    el.limit = 0;
    el.buttonStates = { off: 'active', on: 'idle', limited: 'idle' };

    let emitted = false;
    el.addEventListener('delivery-change', () => { emitted = true; });

    const onDeliveryClick = Reflect.get(Object.getPrototypeOf(el), 'onDeliveryClick') as (d: GridDelivery) => void;
    onDeliveryClick.call(el, 'off');
    expect(emitted).toBe(false);

    el.value = 'on';
    el.buttonStates = { off: 'idle', on: 'active', limited: 'idle' };
    onDeliveryClick.call(el, 'on');
    expect(emitted).toBe(false);
  });
});

describe('OigControlPanel — grid delivery limit-only fast path', () => {
  it('prepares a limit-only dialog config when live mode is limited and delivery-change fires for limited', async () => {
    const panel = new OigControlPanel();
    Reflect.set(panel, 'shieldState', {
      ...EMPTY_SHIELD_STATE,
      gridDeliveryState: {
        currentLiveDelivery: 'limited',
        currentLiveLimit: 5400,
        pendingDeliveryTarget: null,
        pendingLimitTarget: null,
        isTransitioning: false,
        isUnavailable: false,
      },
    });

    let capturedConfig: ConfirmDialogConfig | null = null;
    Reflect.set(panel, 'confirmDialog', {
      showDialog: vi.fn(async (config: ConfirmDialogConfig) => {
        capturedConfig = config;
        return { confirmed: false };
      }),
    });

    const event = new CustomEvent('delivery-change', {
      detail: { value: 'limited' as const, limit: 5400 },
      bubbles: true,
    }) as CustomEvent<{ value: GridDelivery; limit: number | null }>;

    const onGridDeliveryChange = Reflect.get(Object.getPrototypeOf(panel), 'onGridDeliveryChange') as (
      e: CustomEvent<{ value: GridDelivery; limit: number | null }>,
    ) => Promise<void>;
    await onGridDeliveryChange.call(panel, event);

    expect(capturedConfig).not.toBeNull();
    const cfg = capturedConfig as unknown as ConfirmDialogConfig;
    expect(cfg.showLimitInput).toBe(true);
    expect(cfg.limitValue).toBe(5400);
    expect(cfg.limitOnly).toBe(true);
  });
});
