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

  it('activeLimitLabel is a TemplateResult when buttonStates.limited=active and limit > 0', () => {
    const label = renderAndExtractLimitLabel('off', 5000, 'active');
    expect(label).not.toBeNull();
    expect(typeof label).toBe('object');
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
