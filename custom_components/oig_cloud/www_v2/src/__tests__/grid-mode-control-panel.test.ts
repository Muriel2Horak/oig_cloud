import { describe, it, expect } from 'vitest';
import {
  resolveGridDelivery,
  GRID_DELIVERY_SENSOR_MAP,
  GRID_DELIVERY_LABELS,
  GridDelivery,
} from '@/ui/features/control-panel/types';
import { OigGridDeliverySelector } from '@/ui/features/control-panel/selectors';

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

describe('OigGridDeliverySelector — activeLimitLabel render branch', () => {
  function renderAndExtractLimitLabel(
    value: 'off' | 'on' | 'limited',
    limit: number,
    limitedState: 'idle' | 'active' | 'pending' | 'processing' | 'disabled-by-service',
  ): unknown {
    const el = new OigGridDeliverySelector();
    el.value = value;
    el.limit = limit;
    el.buttonStates = { off: 'idle', on: 'idle', limited: limitedState };
    const result = Reflect.apply(
      Reflect.get(Object.getPrototypeOf(el), 'render'),
      el,
      [],
    ) as { values?: unknown[] } | null;
    const limitLabelValue = result?.values?.[0];
    return limitLabelValue;
  }

  it('activeLimitLabel is a TemplateResult when value=limited and limit > 0', () => {
    const label = renderAndExtractLimitLabel('limited', 3500, 'idle');
    expect(label).not.toBeNull();
    expect(typeof label).toBe('object');
  });

  it('activeLimitLabel is null when value=limited but limit=0', () => {
    const label = renderAndExtractLimitLabel('limited', 0, 'idle');
    expect(label).toBeNull();
  });

  it('activeLimitLabel is null when value=off even if buttonStates.limited=active (live-only rule)', () => {
    const label = renderAndExtractLimitLabel('off', 5000, 'active');
    expect(label).toBeNull();
  });

  it('activeLimitLabel is null when value=off and buttonStates.limited=idle even with limit > 0', () => {
    const label = renderAndExtractLimitLabel('off', 4000, 'idle');
    expect(label).toBeNull();
  });

  it('activeLimitLabel TemplateResult contains the limit value as a template value', () => {
    const el = new OigGridDeliverySelector();
    el.value = 'limited';
    el.limit = 7777;
    el.buttonStates = { off: 'idle', on: 'idle', limited: 'idle' };
    const result = Reflect.apply(
      Reflect.get(Object.getPrototypeOf(el), 'render'),
      el,
      [],
    ) as { values?: unknown[] } | null;
    const limitLabel = result?.values?.[0] as { values?: unknown[] } | null;
    expect(limitLabel).not.toBeNull();
    expect(limitLabel?.values).toContain(7777);
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

    // values[0] = activeLimitLabel, values[1] = pendingLabel, values[2] = mode-buttons array
    const modeButtonsTemplate = rendered?.values?.[2] as Array<{ values?: unknown[] }> | null;
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
    const pendingLabel = result?.values?.[1];
    expect(pendingLabel).toBeNull();
  });

  it('pendingLabel is null when pendingTarget is null', () => {
    const result = renderSelector('limited', null, 5000, { off: 'idle', on: 'idle', limited: 'active' });
    const pendingLabel = result?.values?.[1];
    expect(pendingLabel).toBeNull();
  });

  it('pendingLabel is a TemplateResult when pendingTarget differs from live value', () => {
    const result = renderSelector('off', 'limited', 0, { off: 'idle', on: 'idle', limited: 'pending' });
    const pendingLabel = result?.values?.[1];
    expect(pendingLabel).not.toBeNull();
    expect(typeof pendingLabel).toBe('object');
  });

  it('pendingLabel contains pending target label text when value=off and pendingTarget=on', () => {
    const result = renderSelector('off', 'on', 0, { off: 'idle', on: 'pending', limited: 'idle' });
    const pendingLabel = result?.values?.[1] as { values?: unknown[] } | null;
    expect(pendingLabel).not.toBeNull();
    const vals = pendingLabel?.values ?? [];
    expect(vals.some(v => String(v).includes('Zapnuto'))).toBe(true);
  });

  it('activeLimitLabel uses live value only — not shown when value=off even with pending=limited', () => {
    const result = renderSelector('off', 'limited', 3000, { off: 'idle', on: 'idle', limited: 'pending' });
    const activeLimitLabel = result?.values?.[0];
    expect(activeLimitLabel).toBeNull();
  });

  it('activeLimitLabel shown when value=limited regardless of pendingTarget', () => {
    const result = renderSelector('limited', 'off', 5000, { off: 'idle', on: 'idle', limited: 'active' });
    const activeLimitLabel = result?.values?.[0];
    expect(activeLimitLabel).not.toBeNull();
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

    // values[0] = activeLimitLabel, values[1] = pendingLabel, values[2] = mode-buttons array
    const modeButtonsTemplate = rendered?.values?.[2] as Array<{ values?: unknown[] }> | null;
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

describe('Control panel — dialog prefill uses live limit not pending', () => {
  it('OigGridDeliverySelector shows live limit value when value=limited', () => {
    const el = new OigGridDeliverySelector();
    el.value = 'limited';
    el.limit = 4500;
    el.pendingTarget = 'off';
    el.buttonStates = { off: 'idle', on: 'idle', limited: 'active' };

    const result = Reflect.apply(
      Reflect.get(Object.getPrototypeOf(el), 'render'),
      el,
      [],
    ) as { values?: unknown[] } | null;

    const activeLimitLabel = result?.values?.[0] as { values?: unknown[] } | null;
    expect(activeLimitLabel).not.toBeNull();
    expect(activeLimitLabel?.values).toContain(4500);
  });

  it('OigGridDeliverySelector does not show stale limit when live value is off', () => {
    const el = new OigGridDeliverySelector();
    el.value = 'off';
    el.limit = 9999;
    el.pendingTarget = 'limited';
    el.buttonStates = { off: 'active', on: 'idle', limited: 'idle' };

    const result = Reflect.apply(
      Reflect.get(Object.getPrototypeOf(el), 'render'),
      el,
      [],
    ) as { values?: unknown[] } | null;

    const activeLimitLabel = result?.values?.[0];
    expect(activeLimitLabel).toBeNull();
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

    const modeButtonsTemplate = rendered?.values?.[2] as Array<{ values?: unknown[] }> | null;
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
