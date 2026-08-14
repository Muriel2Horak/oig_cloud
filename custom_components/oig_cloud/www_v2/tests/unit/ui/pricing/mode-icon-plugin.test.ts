import { describe, it, expect } from 'vitest';

import {
  pricingModeIconPlugin,
  buildModeIconPluginOptions,
  applyModeIconPadding,
} from '@/ui/features/pricing/mode-icon-plugin';
import type { ModeSegment } from '@/ui/features/pricing/types';

// ---------------------------------------------------------------------------
// Fake CanvasRenderingContext2D — records every method call with its arguments
// so the test can assert on DRAW INTENT, not pixel output.
// ---------------------------------------------------------------------------

interface RecordedCall {
  method: string;
  args: unknown[];
}

function createRecordingContext(): {
  ctx: CanvasRenderingContext2D;
  calls: RecordedCall[];
  state: {
    fillStyle: string | CanvasGradient | CanvasPattern;
    font: string;
    textAlign: CanvasTextAlign;
    textBaseline: CanvasTextBaseline;
    globalAlpha: number;
    globalCompositeOperation: GlobalCompositeOperation;
  };
  findCalls: (method: string) => RecordedCall[];
  fillRectCalls: () => RecordedCall[];
  fillTextCalls: () => RecordedCall[];
  saveRestorePairs: () => { saveIndices: number[]; restoreIndices: number[] };
} {
  const calls: RecordedCall[] = [];
  const state = {
    fillStyle: '#000' as string | CanvasGradient | CanvasPattern,
    font: '10px sans-serif',
    textAlign: 'start' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    globalAlpha: 1,
    globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
  };

  // Recording proxy:
  //   - property reads return the current value tracked in `state`
  //   - property writes are recorded as `<prop>=` method calls with the value
  //     as args[0], AND update `state` so subsequent reads see the new value
  //   - method invocations are recorded with `prop` as the method name and
  //     args as args[]. We only model the subset the plugin actually uses.
  const trackedProps = new Set([
    'fillStyle',
    'font',
    'textAlign',
    'textBaseline',
    'globalAlpha',
    'globalCompositeOperation',
  ]);
  const trackedMethods = new Set(['save', 'restore', 'fillRect', 'fillText']);
  const ctx = new Proxy({} as any, {
    get(_target, prop: string | symbol) {
      if (typeof prop !== 'string') return undefined;
      if (prop === 'fillStyle') return state.fillStyle;
      if (prop === 'font') return state.font;
      if (prop === 'textAlign') return state.textAlign;
      if (prop === 'textBaseline') return state.textBaseline;
      if (prop === 'globalAlpha') return state.globalAlpha;
      if (prop === 'globalCompositeOperation') return state.globalCompositeOperation;
      if (trackedMethods.has(prop)) {
        return (...args: unknown[]) => {
          calls.push({ method: prop, args });
        };
      }
      throw new Error(`Unexpected canvas context property: ${prop}`);
    },
    set(_target, prop: string | symbol, value: unknown) {
      if (typeof prop !== 'string') {
        throw new Error('Unexpected symbol canvas context property');
      }
      if (prop === 'fillStyle') state.fillStyle = value as string;
      else if (prop === 'font') state.font = value as string;
      else if (prop === 'textAlign') state.textAlign = value as CanvasTextAlign;
      else if (prop === 'textBaseline') state.textBaseline = value as CanvasTextBaseline;
      else if (prop === 'globalAlpha') state.globalAlpha = value as number;
      else if (prop === 'globalCompositeOperation')
        state.globalCompositeOperation = value as GlobalCompositeOperation;
      else {
        throw new Error(`Unexpected canvas context assignment: ${prop}`);
      }
      if (trackedProps.has(prop)) calls.push({ method: prop, args: [value] });
      return true;
    },
  }) as CanvasRenderingContext2D;

  return {
    ctx,
    calls,
    state,
    findCalls: (method: string) => calls.filter((c) => c.method === method),
    fillRectCalls: () => calls.filter((c) => c.method === 'fillRect'),
    fillTextCalls: () => calls.filter((c) => c.method === 'fillText'),
    saveRestorePairs: () => {
      const saveIndices = calls
        .map((c, i) => (c.method === 'save' ? i : -1))
        .filter((i) => i >= 0);
      const restoreIndices = calls
        .map((c, i) => (c.method === 'restore' ? i : -1))
        .filter((i) => i >= 0);
      return { saveIndices, restoreIndices };
    },
  };
}

// ---------------------------------------------------------------------------
// Fake chart — minimal surface required by the plugin's two hooks.
// ---------------------------------------------------------------------------

interface FakeChartOpts {
  area?: { top: number; bottom: number; left: number; right: number };
  height?: number;
  xScaleBottom?: number;
  xScaleMissing?: boolean;
  areaMissing?: boolean;
  pixelMap?: Map<number, number>;
  defaultPixel?: number;
}

function createFakeChart(opts: FakeChartOpts = {}) {
  const recording = createRecordingContext();
  const area = opts.areaMissing
    ? undefined
    : (opts.area ?? { top: 40, bottom: 220, left: 60, right: 500 });
  const height = opts.height ?? 320;
  const pixelMap = opts.pixelMap ?? new Map<number, number>();

  const xScale: any = {
    bottom: opts.xScaleBottom,
    getPixelForValue: (v: number) => {
      if (pixelMap.has(v)) return pixelMap.get(v)!;
      if (opts.defaultPixel !== undefined) return opts.defaultPixel;
      // Out-of-range / undefined → Chart.js returns NaN for things outside axis.
      return Number.NaN;
    },
  };

  const chart: any = {
    ctx: recording.ctx,
    chartArea: area,
    height,
  };
  if (opts.xScaleMissing) {
    chart.scales = {};
  } else {
    chart.scales = { x: xScale };
  }

  return { chart, recording, xScale };
}

function buildSegments(): ModeSegment[] {
  return [
    {
      mode: 'HOME I',
      start: new Date('2026-01-15T00:00:00Z'),
      end: new Date('2026-01-15T06:00:00Z'),
      icon: '🏠',
      color: 'rgba(76, 175, 80, 0.16)',
      label: 'HOME I',
      shortLabel: 'I',
    },
    {
      mode: 'HOME II',
      start: new Date('2026-01-15T06:00:00Z'),
      end: new Date('2026-01-15T12:00:00Z'),
      icon: '⚡',
      color: 'rgba(33, 150, 243, 0.16)',
      label: 'HOME II',
      shortLabel: 'II',
    },
  ];
}

// =========================================================================
// pricingModeIconPlugin.beforeDatasetsDraw
// =========================================================================

describe('pricingModeIconPlugin.beforeDatasetsDraw', () => {
  it('returns silently when segments are missing (no fillRect calls)', () => {
    const { chart, recording } = createFakeChart();
    const beforeDraw = pricingModeIconPlugin.beforeDatasetsDraw!;
    beforeDraw(chart, {} as any, undefined as any);
    expect(recording.fillRectCalls()).toHaveLength(0);
    expect(recording.findCalls('save')).toHaveLength(0);
    expect(recording.findCalls('restore')).toHaveLength(0);
  });

  it('returns silently when segments array is empty', () => {
    const { chart, recording } = createFakeChart();
    const beforeDraw = pricingModeIconPlugin.beforeDatasetsDraw!;
    beforeDraw(chart, {} as any, { segments: [] });
    expect(recording.fillRectCalls()).toHaveLength(0);
  });

  it('returns silently when chartArea is missing', () => {
    const { chart, recording } = createFakeChart({ areaMissing: true });
    const beforeDraw = pricingModeIconPlugin.beforeDatasetsDraw!;
    beforeDraw(chart, {} as any, { segments: buildSegments() });
    expect(recording.fillRectCalls()).toHaveLength(0);
  });

  it('returns silently when x scale is missing', () => {
    const { chart, recording } = createFakeChart({ xScaleMissing: true });
    const beforeDraw = pricingModeIconPlugin.beforeDatasetsDraw!;
    beforeDraw(chart, {} as any, { segments: buildSegments() });
    expect(recording.fillRectCalls()).toHaveLength(0);
  });

  it('draws one fillRect per segment, wrapped in save/restore, with globalAlpha from options', () => {
    const segments = buildSegments();
    const t0 = segments[0].start.getTime();
    const t0end = segments[0].end.getTime();
    const t1 = segments[1].start.getTime();
    const t1end = segments[1].end.getTime();
    const { chart, recording } = createFakeChart({
      pixelMap: new Map([
        [t0, 100],
        [t0end, 250],
        [t1, 250],
        [t1end, 400],
      ]),
    });
    const beforeDraw = pricingModeIconPlugin.beforeDatasetsDraw!;

    beforeDraw(chart, {} as any, {
      segments,
      backgroundOpacity: 0.42,
    });

    const fillRects = recording.fillRectCalls();
    expect(fillRects).toHaveLength(2);
    // first segment: left=100, width=max(|250-100|, 2)=150, top=40, height=180
    expect(fillRects[0].args).toEqual([100, 40, 150, 180]);
    // second segment: left=250, width=max(|400-250|, 2)=150
    expect(fillRects[1].args).toEqual([250, 40, 150, 180]);

    expect(recording.state.globalAlpha).toBe(0.42);

    const { saveIndices, restoreIndices } = recording.saveRestorePairs();
    expect(saveIndices).toHaveLength(1);
    expect(restoreIndices).toHaveLength(1);
    expect(restoreIndices[0]).toBeGreaterThan(saveIndices[0]);
    // every fillRect falls between save and restore
    expect(saveIndices[0]).toBe(0);
    expect(restoreIndices[0]).toBeGreaterThan(
      recording.calls.findIndex((c) => c.method === 'fillRect'),
    );
  });

  it('falls back to the default 0.12 backgroundOpacity when not provided', () => {
    const segments = buildSegments();
    const t0 = segments[0].start.getTime();
    const t0end = segments[0].end.getTime();
    const t1 = segments[1].start.getTime();
    const t1end = segments[1].end.getTime();
    const { chart, recording } = createFakeChart({
      pixelMap: new Map([
        [t0, 100],
        [t0end, 250],
        [t1, 250],
        [t1end, 400],
      ]),
    });
    pricingModeIconPlugin.beforeDatasetsDraw!(chart, {} as any, { segments });
    expect(recording.state.globalAlpha).toBe(0.12);
  });

  it('uses each segment.color when provided', () => {
    const segments = buildSegments();
    const t0 = segments[0].start.getTime();
    const t0end = segments[0].end.getTime();
    const t1 = segments[1].start.getTime();
    const t1end = segments[1].end.getTime();
    const { chart, recording } = createFakeChart({
      pixelMap: new Map([
        [t0, 100],
        [t0end, 250],
        [t1, 250],
        [t1end, 400],
      ]),
    });
    pricingModeIconPlugin.beforeDatasetsDraw!(chart, {} as any, { segments });

    // Walk fillStyle assignments — value at the moment of the i-th fillRect
    // is the fillStyle that was set immediately before.
    const fills: string[] = [];
    let current = '';
    for (const c of recording.calls) {
      if (c.method === 'fillRect') fills.push(current);
      if (c.method === 'fillStyle') current = c.args[0] as string;
    }
    expect(fills).toEqual([
      'rgba(76, 175, 80, 0.16)',
      'rgba(33, 150, 243, 0.16)',
    ]);
  });

  it('falls back to the default translucent white when segment.color is missing', () => {
    const seg: ModeSegment = {
      mode: 'Mode 7',
      start: new Date('2026-01-15T00:00:00Z'),
      end: new Date('2026-01-15T06:00:00Z'),
      icon: '❓',
      // color omitted on purpose — plugin should substitute
      color: '' as unknown as string,
      label: 'X',
      shortLabel: 'X',
    };
    const { chart, recording } = createFakeChart({
      pixelMap: new Map([
        [seg.start.getTime(), 50],
        [seg.end.getTime(), 200],
      ]),
    });
    pricingModeIconPlugin.beforeDatasetsDraw!(chart, {} as any, { segments: [seg] });

    let fillStyleSeen = '';
    for (const c of recording.calls) {
      if (c.method === 'fillRect') break;
      if (c.method === 'fillStyle') fillStyleSeen = c.args[0] as string;
    }
    expect(fillStyleSeen).toBe('rgba(255, 255, 255, 0.1)');
  });

  it('skips segments whose bounds resolve to null (NaN pixel) without dropping siblings', () => {
    const good = buildSegments()[0];
    const bad: ModeSegment = {
      mode: 'Bad',
      start: new Date('2099-01-01T00:00:00Z'),
      end: new Date('2099-01-01T01:00:00Z'),
      icon: '⚠',
      color: 'rgba(255,0,0,0.2)',
      label: 'Bad',
      shortLabel: 'B',
    };
    const { chart, recording } = createFakeChart({
      pixelMap: new Map([
        [good.start.getTime(), 60],
        [good.end.getTime(), 220],
      ]),
      // bad segment's pixels fall off the axis → NaN
    });
    pricingModeIconPlugin.beforeDatasetsDraw!(chart, {} as any, {
      segments: [bad, good],
    });
    expect(recording.fillRectCalls()).toHaveLength(1);
    expect(recording.fillRectCalls()[0].args[0]).toBe(60);
  });

  it('skips segments whose start or end is missing', () => {
    const good = buildSegments()[0];
    const brokenStart = { ...good, start: undefined as unknown as Date };
    const brokenEnd = { ...good, end: undefined as unknown as Date };
    const { chart, recording } = createFakeChart({
      pixelMap: new Map([
        [good.start.getTime(), 60],
        [good.end.getTime(), 220],
      ]),
    });
    pricingModeIconPlugin.beforeDatasetsDraw!(chart, {} as any, {
      segments: [brokenStart, brokenEnd, good],
    });
    expect(recording.fillRectCalls()).toHaveLength(1);
  });

  it('clamps the segment width to at least 2 pixels for zero-width ranges', () => {
    const t = new Date('2026-01-15T00:00:00Z').getTime();
    const seg: ModeSegment = {
      mode: 'Zero',
      start: new Date(t),
      end: new Date(t),
      icon: '·',
      color: 'rgba(0,0,0,0.1)',
      label: 'Z',
      shortLabel: 'Z',
    };
    const { chart, recording } = createFakeChart({
      pixelMap: new Map([[t, 100]]),
    });
    pricingModeIconPlugin.beforeDatasetsDraw!(chart, {} as any, { segments: [seg] });
    expect(recording.fillRectCalls()).toHaveLength(1);
    // width = max(|100-100|, 2) = 2
    expect(recording.fillRectCalls()[0].args[2]).toBe(2);
  });
});

// =========================================================================
// pricingModeIconPlugin.afterDatasetsDraw
// =========================================================================

describe('pricingModeIconPlugin.afterDatasetsDraw', () => {
  function bandChart(extra: Partial<FakeChartOpts> = {}) {
    const segments = buildSegments();
    const t0 = segments[0].start.getTime();
    const t1 = segments[1].start.getTime();
    const t1end = segments[1].end.getTime();
    return createFakeChart({
      pixelMap: new Map([
        [t0, 60],
        [t1, 250],
        [t1end, 460],
      ]),
      xScaleBottom: 240,
      ...extra,
    });
  }

  it('returns silently when segments array is empty', () => {
    const { chart, recording } = createFakeChart();
    pricingModeIconPlugin.afterDatasetsDraw!(chart, {} as any, { segments: [] }, false);
    expect(recording.findCalls('fillText')).toHaveLength(0);
    expect(recording.findCalls('fillRect')).toHaveLength(0);
  });

  it('returns silently when plugin options are missing', () => {
    const { chart, recording } = createFakeChart();
    pricingModeIconPlugin.afterDatasetsDraw!(chart, {} as any, undefined as any, false);
    expect(recording.findCalls('fillText')).toHaveLength(0);
    expect(recording.findCalls('fillRect')).toHaveLength(0);
    expect(recording.findCalls('save')).toHaveLength(0);
  });

  it('returns silently when x scale is missing', () => {
    const { chart, recording } = createFakeChart({ xScaleMissing: true });
    pricingModeIconPlugin.afterDatasetsDraw!(chart, {} as any, { segments: buildSegments() }, false);
    expect(recording.findCalls('fillText')).toHaveLength(0);
  });

  it('returns silently when chartArea is missing', () => {
    const { chart, recording } = createFakeChart({ areaMissing: true });
    pricingModeIconPlugin.afterDatasetsDraw!(chart, {} as any, { segments: buildSegments() }, false);
    expect(recording.findCalls('fillText')).toHaveLength(0);
  });

  it('draws the axis band background then icons/labels wrapped in destination-over', () => {
    const { chart, recording } = bandChart();
    pricingModeIconPlugin.afterDatasetsDraw!(chart, {} as any, {
      segments: buildSegments(),
    }, false);

    // One fillRect for the band + one fillText per segment for icon, plus label.
    // Each segment without shortLabel? In our fixtures every segment has one.
    const rects = recording.fillRectCalls();
    expect(rects).toHaveLength(1);

    const texts = recording.fillTextCalls();
    // 2 segments * (icon + shortLabel) = 4 fillText calls
    expect(texts).toHaveLength(4);

    // axisBandTop = min((xScale.bottom=240) + padding 10, height 320 - height 35 - 2) = min(250, 283)
    // axisBandHeight default = (16+9+10) = 35
    // band width = chartArea.right(500) - chartArea.left(60) = 440
    expect(rects[0].args).toEqual([60, 250, 440, 35]);

    // destination-over used both for the band and for the icons block
    const composites = recording.findCalls('globalCompositeOperation').map(
      (c) => c.args[0],
    );
    expect(composites.filter((c) => c === 'destination-over')).toHaveLength(2);

    // Icons come first, labels second (font swap implies label rendering)
    expect(texts[0].args).toEqual(['🏠', 60 + 12, 250 + 4]); // iconX = left + startOffset
    expect(texts[1].args[0]).toEqual('I');
    expect(texts[2].args).toEqual(['⚡', 250 + 12, 254]);
    expect(texts[3].args[0]).toEqual('II');
  });

  it('uses the default ❓ glyph when segment.icon is missing', () => {
    const seg: ModeSegment = {
      mode: 'NoIcon',
      start: new Date('2026-01-15T00:00:00Z'),
      end: new Date('2026-01-15T06:00:00Z'),
      icon: '' as unknown as string,
      color: 'rgba(0,0,0,0.1)',
      label: 'NoIcon',
      shortLabel: 'N',
    };
    const { chart, recording } = createFakeChart({
      pixelMap: new Map([
        [seg.start.getTime(), 60],
        [seg.end.getTime(), 220],
      ]),
      xScaleBottom: 240,
    });
    pricingModeIconPlugin.afterDatasetsDraw!(chart, {} as any, { segments: [seg] }, false);
    const iconCall = recording.fillTextCalls().find((c) => c.args[0] === '❓');
    expect(iconCall).toBeDefined();
  });

  it('skips the label fillText when segment.shortLabel is empty', () => {
    const seg: ModeSegment = {
      mode: 'NoLabel',
      start: new Date('2026-01-15T00:00:00Z'),
      end: new Date('2026-01-15T06:00:00Z'),
      icon: '🏷',
      color: 'rgba(0,0,0,0.1)',
      label: 'NoLabel',
      shortLabel: '',
    };
    const { chart, recording } = createFakeChart({
      pixelMap: new Map([
        [seg.start.getTime(), 60],
        [seg.end.getTime(), 220],
      ]),
      xScaleBottom: 240,
    });
    pricingModeIconPlugin.afterDatasetsDraw!(chart, {} as any, { segments: [seg] }, false);
    const texts = recording.fillTextCalls();
    // Only the icon, no label
    expect(texts).toHaveLength(1);
    expect(texts[0].args[0]).toBe('🏷');
  });

  it('honours iconAlignment "center" by anchoring iconX to segment midpoint', () => {
    const seg = buildSegments()[0];
    const { chart, recording } = createFakeChart({
      pixelMap: new Map([
        [seg.start.getTime(), 60],
        [seg.end.getTime(), 220],
      ]),
      xScaleBottom: 240,
    });
    pricingModeIconPlugin.afterDatasetsDraw!(chart, {} as any, {
      segments: [seg],
      iconAlignment: 'center',
      iconStartOffset: 999, // would push iconX out of bounds if alignment were 'start'
    }, false);
    const iconCall = recording.fillTextCalls()[0];
    // midpoint = 60 + (220-60)/2 = 140, the startOffset is ignored
    expect(iconCall.args[0]).toBe('🏠');
    expect(iconCall.args[1]).toBe(140);
  });

  it('keeps start alignment at the exact icon half-width boundary', () => {
    const seg = buildSegments()[0];
    const { chart, recording } = createFakeChart({
      pixelMap: new Map([
        [seg.start.getTime(), 60],
        [seg.end.getTime(), 220],
      ]),
      xScaleBottom: 240,
    });
    pricingModeIconPlugin.afterDatasetsDraw!(chart, {} as any, {
      segments: [seg],
      iconAlignment: 'start',
      iconSize: 16,
      iconStartOffset: 152,
    }, false);
    const iconCall = recording.fillTextCalls()[0];
    expect(iconCall.args[1]).toBe(212);
  });

  it('falls back from start offset to segment midpoint when the start position would overflow', () => {
    const seg = buildSegments()[0];
    // bounds: width = max(|220-60|, 2) = 160. iconSize = 16.
    // iconX at 'start' = 60 + 999 (iconStartOffset) = 1059
    // maxStart = 60 + 160 - 16/2 = 212 → 1059 > 212 → fallback to midpoint 140
    const { chart, recording } = createFakeChart({
      pixelMap: new Map([
        [seg.start.getTime(), 60],
        [seg.end.getTime(), 220],
      ]),
      xScaleBottom: 240,
    });
    pricingModeIconPlugin.afterDatasetsDraw!(chart, {} as any, {
      segments: [seg],
      iconAlignment: 'start',
      iconStartOffset: 999,
    }, false);
    const iconCall = recording.fillTextCalls()[0];
    expect(iconCall.args[1]).toBe(140);
  });

  it('clamps axisBandTop when xScale.bottom + padding would exceed chart bottom', () => {
    const segments = buildSegments();
    const t0 = segments[0].start.getTime();
    const t1 = segments[1].start.getTime();
    const t1end = segments[1].end.getTime();
    // Make the chart very short so axisBandTopRaw exceeds height - bandHeight - 2
    const { chart, recording } = createFakeChart({
      height: 260, // small chart
      xScaleBottom: 240, // bottom = 240 + padding 10 = 250, axisBandHeight default 35 → raw = 250
      pixelMap: new Map([
        [t0, 60],
        [t1, 250],
        [t1end, 460],
      ]),
    });
    pricingModeIconPlugin.afterDatasetsDraw!(chart, {} as any, { segments }, false);

    // 250 vs 260 - 35 - 2 = 223 → clamp to 223
    const rect = recording.fillRectCalls()[0];
    expect(rect.args[1]).toBe(223);
  });

  it('uses chartArea.bottom in place of xScale.bottom when the scale exposes none', () => {
    const segments = buildSegments();
    const t0 = segments[0].start.getTime();
    const t1 = segments[1].start.getTime();
    const t1end = segments[1].end.getTime();
    const { chart, recording } = createFakeChart({
      // xScaleBottom intentionally undefined
      pixelMap: new Map([
        [t0, 60],
        [t1, 250],
        [t1end, 460],
      ]),
    });
    pricingModeIconPlugin.afterDatasetsDraw!(chart, {} as any, { segments }, false);
    // chartArea.bottom = 220 → axisBandTopRaw = 220 + 10 = 230 → band starts at y=230
    const rect = recording.fillRectCalls()[0];
    expect(rect.args[1]).toBe(230);
  });

  it('uses the supplied iconSize / labelSize / iconColor / labelColor in the recorded font and fillStyle', () => {
    const seg = buildSegments()[0];
    const { chart, recording } = createFakeChart({
      pixelMap: new Map([
        [seg.start.getTime(), 60],
        [seg.end.getTime(), 220],
      ]),
      xScaleBottom: 240,
    });
    pricingModeIconPlugin.afterDatasetsDraw!(chart, {} as any, {
      segments: [seg],
      iconSize: 24,
      labelSize: 12,
      iconColor: '#abcdef',
      labelColor: '#fedcba',
    }, false);
    const fonts = recording.findCalls('font').map((c) => c.args[0] as string);
    expect(fonts).toContain('24px "Inter", "Segoe UI Emoji", "Noto Color Emoji", sans-serif');
    expect(fonts).toContain('12px "Inter", sans-serif');

    const fills: string[] = [];
    let current = '';
    for (const c of recording.calls) {
      if (c.method === 'fillText') fills.push(current);
      if (c.method === 'fillStyle') current = c.args[0] as string;
    }
    // 2 fillTexts → icon, label
    expect(fills.slice(0, 2)).toEqual(['#abcdef', '#fedcba']);
  });

  it('skips segments that resolve to null bounds (NaN pixel)', () => {
    const good = buildSegments()[0];
    const bad: ModeSegment = {
      mode: 'Bad',
      start: new Date('2099-01-01T00:00:00Z'),
      end: new Date('2099-01-01T01:00:00Z'),
      icon: '⚠',
      color: 'rgba(255,0,0,0.2)',
      label: 'Bad',
      shortLabel: 'B',
    };
    const { chart, recording } = createFakeChart({
      pixelMap: new Map([
        [good.start.getTime(), 60],
        [good.end.getTime(), 220],
      ]),
      xScaleBottom: 240,
    });
    pricingModeIconPlugin.afterDatasetsDraw!(chart, {} as any, {
      segments: [bad, good],
    }, false);
    // One segment worth of fills: icon + label
    expect(recording.fillTextCalls()).toHaveLength(2);
  });
});

// =========================================================================
// buildModeIconPluginOptions
// =========================================================================

describe('buildModeIconPluginOptions', () => {
  it('returns null for an empty segments array', () => {
    expect(buildModeIconPluginOptions([])).toBeNull();
  });

  it('returns the canonical defaults object when given at least one segment', () => {
    const result = buildModeIconPluginOptions(buildSegments());
    expect(result).toEqual({
      segments: expect.any(Array),
      iconSize: 18,
      labelSize: 10,
      iconAlignment: 'start',
      iconStartOffset: 14,
      iconBaselineOffset: 6,
      iconColor: 'rgba(255, 255, 255, 0.95)',
      labelColor: 'rgba(255, 255, 255, 0.7)',
      backgroundOpacity: 0.14,
      axisBandPadding: 10,
      axisBandHeight: 28,
      axisBandColor: 'rgba(6, 10, 18, 0.12)',
    });
    expect(result?.segments).toHaveLength(2);
  });
});

// =========================================================================
// applyModeIconPadding
// =========================================================================

describe('applyModeIconPadding', () => {
  it('is a no-op when options is null', () => {
    expect(() => applyModeIconPadding(null as any, null)).not.toThrow();
    expect(() => applyModeIconPadding(undefined as any, null)).not.toThrow();
  });

  it('creates layout and padding when missing, applies axisBand default of 10', () => {
    const opts: any = {};
    applyModeIconPadding(opts, null);
    // pluginOptions null → extra = 12
    expect(opts.layout.padding.bottom).toBe(12);
    expect(opts.layout.padding.top).toBe(12);
  });

  it('preserves a padding.bottom larger than the computed extra', () => {
    const opts: any = { layout: { padding: { bottom: 999 } } };
    applyModeIconPadding(opts, null);
    expect(opts.layout.padding.bottom).toBe(999);
  });

  it('fills padding.top with 12 only when undefined', () => {
    const opts: any = { layout: { padding: { top: 0 } } };
    applyModeIconPadding(opts, null);
    expect(opts.layout.padding.top).toBe(0);
  });

  it('uses pluginOptions.axisBandHeight when supplied', () => {
    const opts: any = {};
    const pluginOptions = {
      segments: buildSegments(),
      axisBandPadding: 20,
      axisBandHeight: 40,
    };
    applyModeIconPadding(opts, pluginOptions);
    // extra = 20 + 40 + 6 = 66
    expect(opts.layout.padding.bottom).toBe(66);
  });

  it('falls back to iconSize + labelSize + 6 when axisBandHeight is omitted', () => {
    const opts: any = {};
    const pluginOptions = {
      segments: buildSegments(),
      iconSize: 18,
      labelSize: 10,
      axisBandPadding: 5,
      // axisBandHeight omitted
    };
    applyModeIconPadding(opts, pluginOptions);
    // axisBandHeight = 18 + 10 + 6 = 34, extra = 5 + 34 + 6 = 45
    expect(opts.layout.padding.bottom).toBe(45);
  });

  it('uses default iconSize / labelSize of 18 / 10 when pluginOptions does not pin them', () => {
    const opts: any = {};
    const pluginOptions = {
      segments: buildSegments(),
      axisBandPadding: 5,
      // iconSize / labelSize / axisBandHeight omitted
    };
    applyModeIconPadding(opts, pluginOptions);
    // 18 + 10 + 6 = 34, extra = 5 + 34 + 6 = 45
    expect(opts.layout.padding.bottom).toBe(45);
  });

  it('does not destroy pre-existing layout.padding.top when re-running', () => {
    const opts: any = { layout: { padding: { top: 7, bottom: 3 } } };
    applyModeIconPadding(opts, null);
    // top stays at 7 (not undefined → not overridden)
    expect(opts.layout.padding.top).toBe(7);
    // bottom becomes max(3, 12) = 12
    expect(opts.layout.padding.bottom).toBe(12);
  });
});

// =========================================================================
// pricingModeIconPlugin identity
// =========================================================================

describe('pricingModeIconPlugin identity', () => {
  it('declares id "pricingModeIcons"', () => {
    expect(pricingModeIconPlugin.id).toBe('pricingModeIcons');
  });

  it('exposes beforeDatasetsDraw and afterDatasetsDraw hooks', () => {
    expect(typeof pricingModeIconPlugin.beforeDatasetsDraw).toBe('function');
    expect(typeof pricingModeIconPlugin.afterDatasetsDraw).toBe('function');
  });
});
