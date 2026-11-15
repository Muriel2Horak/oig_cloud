/**
 * Forecast prices (not yet published by OTE) are marked `estimated` on the
 * planner timeline; the price lines draw those stretches dashed.
 */

export interface MaybeEstimated {
  estimated?: boolean;
}

/** Chart.js `segment` option: dash the segment that ends on an estimated point. */
export function estimatedSegment(timeline: MaybeEstimated[], dash: number[]) {
  return {
    borderDash: (ctx: { p1DataIndex: number }) =>
      timeline[ctx.p1DataIndex]?.estimated ? dash : undefined,
  };
}
