/**
 * OIG Cloud V2 — Pricing Mode Icon Plugin for Chart.js
 *
 * Custom Chart.js plugin that:
 * 1. beforeDatasetsDraw: Draws colored background rectangles per mode segment
 * 2. afterDatasetsDraw: Draws an emoji icon band below the X-axis with mode icons + short labels
 *
 * Port of V1 pricingModeIconPlugin (pricing.js lines 40-176).
 */

import type { Chart, Plugin } from 'chart.js';
import type { ModeSegment } from './types';

export interface ModeIconPluginOptions {
  segments: ModeSegment[];
  iconSize?: number;
  labelSize?: number;
  iconAlignment?: 'start' | 'center';
  iconStartOffset?: number;
  iconBaselineOffset?: number;
  iconColor?: string;
  labelColor?: string;
  backgroundOpacity?: number;
  axisBandPadding?: number;
  axisBandHeight?: number;
  axisBandColor?: string;
}

function getSegmentBounds(
  xScale: any,
  segment: ModeSegment,
): { left: number; width: number } | null {
  if (!segment?.start || !segment?.end) return null;

  const xStart = xScale.getPixelForValue(segment.start.getTime());
  const xEnd = xScale.getPixelForValue(segment.end.getTime());

  if (!Number.isFinite(xStart) || !Number.isFinite(xEnd)) return null;

  const left = Math.min(xStart, xEnd);
  const width = Math.max(Math.abs(xEnd - xStart), 2);

  if (!Number.isFinite(width) || width <= 0) return null;

  return { left, width };
}

export const pricingModeIconPlugin: Plugin<'bar'> = {
  id: 'pricingModeIcons',

  beforeDatasetsDraw(chart: Chart, _args: any, pluginOptions: any) {
    const opts = pluginOptions as ModeIconPluginOptions | undefined;
    const segments = opts?.segments;
    if (!segments?.length) return;

    const chartArea = chart.chartArea;
    const xScale = chart.scales?.x;
    if (!chartArea || !xScale) return;

    const ctx = chart.ctx;
    ctx.save();
    ctx.globalAlpha = opts?.backgroundOpacity ?? 0.12;

    for (const segment of segments) {
      const bounds = getSegmentBounds(xScale, segment);
      if (!bounds) continue;

      ctx.fillStyle = segment.color || 'rgba(255, 255, 255, 0.1)';
      ctx.fillRect(bounds.left, chartArea.top, bounds.width, chartArea.bottom - chartArea.top);
    }

    ctx.restore();
  },

  afterDatasetsDraw(chart: Chart, _args: any, pluginOptions: any) {
    const opts = pluginOptions as ModeIconPluginOptions | undefined;
    const segments = opts?.segments;
    if (!segments?.length) return;

    const xScale = chart.scales?.x;
    const chartArea = chart.chartArea;
    if (!xScale || !chartArea) return;

    const iconSize = opts?.iconSize ?? 16;
    const labelSize = opts?.labelSize ?? 9;
    const iconFont = `${iconSize}px "Inter", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
    const labelFont = `${labelSize}px "Inter", sans-serif`;
    const iconColor = opts?.iconColor || 'rgba(255, 255, 255, 0.95)';
    const labelColor = opts?.labelColor || 'rgba(255, 255, 255, 0.7)';
    const axisBandPadding = opts?.axisBandPadding ?? 10;
    const axisBandHeight = opts?.axisBandHeight ?? (iconSize + labelSize + 10);
    const axisBandColor = opts?.axisBandColor || 'rgba(6, 10, 18, 0.12)';
    const iconAlignment = opts?.iconAlignment || 'start';
    const iconStartOffset = opts?.iconStartOffset ?? 12;
    const iconBaselineOffset = opts?.iconBaselineOffset ?? 4;

    // Place band below X-axis tick labels
    const axisBandTopRaw = ((xScale as any).bottom || chartArea.bottom) + axisBandPadding;
    const axisBandTop = Math.min(axisBandTopRaw, chart.height - axisBandHeight - 2);
    const axisBandWidth = chartArea.right - chartArea.left;
    const baselineY = axisBandTop + iconBaselineOffset;

    const ctx = chart.ctx;

    // Draw band background (behind axes)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = axisBandColor;
    ctx.fillRect(chartArea.left, axisBandTop, axisBandWidth, axisBandHeight);
    ctx.restore();

    // Draw icons + labels (behind axes so we don't obscure tick labels)
    ctx.save();
    ctx.globalCompositeOperation = 'destination-over';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    for (const segment of segments) {
      const bounds = getSegmentBounds(xScale, segment);
      if (!bounds) continue;

      let iconX: number;
      if (iconAlignment === 'start') {
        iconX = bounds.left + iconStartOffset;
        const maxStart = bounds.left + bounds.width - iconSize / 2;
        if (iconX > maxStart) {
          iconX = bounds.left + bounds.width / 2;
        }
      } else {
        iconX = bounds.left + bounds.width / 2;
      }

      // Draw emoji icon
      ctx.font = iconFont;
      ctx.fillStyle = iconColor;
      ctx.fillText(segment.icon || '❓', iconX, baselineY);

      // Draw short label below icon
      if (segment.shortLabel) {
        ctx.font = labelFont;
        ctx.fillStyle = labelColor;
        ctx.fillText(segment.shortLabel, iconX, baselineY + iconSize - 2);
      }
    }

    ctx.restore();
  },
};

/**
 * Build plugin options object for the mode icon plugin.
 * Returns null if no segments (= no plugin rendering needed).
 */
export function buildModeIconPluginOptions(
  segments: ModeSegment[],
): ModeIconPluginOptions | null {
  if (!segments?.length) return null;

  return {
    segments,
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
  };
}

/**
 * Apply bottom padding to chart options so mode icon band has space.
 */
export function applyModeIconPadding(
  options: any,
  pluginOptions: ModeIconPluginOptions | null,
): void {
  if (!options) return;

  if (!options.layout) options.layout = {};
  if (!options.layout.padding) options.layout.padding = {};

  const padding = options.layout.padding;
  const axisBandPadding = pluginOptions?.axisBandPadding ?? 10;
  const axisBandHeight = pluginOptions
    ? (pluginOptions.axisBandHeight ?? ((pluginOptions.iconSize ?? 18) + (pluginOptions.labelSize ?? 10) + 6))
    : 0;
  const extra = pluginOptions ? axisBandPadding + axisBandHeight + 6 : 12;

  padding.top = padding.top ?? 12;
  padding.bottom = Math.max(padding.bottom || 0, extra);
}
