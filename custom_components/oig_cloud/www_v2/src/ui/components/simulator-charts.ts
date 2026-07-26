import type { BatteryInterval, BoilerInterval } from './simulator-fetcher';

export const SIMULATOR_TOKENS = {
  bg: '#0a1124',
  panel: '#101a33',
  card: '#15213f',
  line: '#243357',
  txt: '#eaf0fb',
  mut: '#8fa1c4',
  acc: '#5b8cff',
  batt: '#3ec6dc',
  boil: '#ff7a59',
  price: '#3fd18b',
  ups: '#ffb547',
  home: '#5b8cff',
} as const;

const CHART_W = 680;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, value));
}

function hourFromIso(iso: string): number {
  const date = new Date(iso);
  return Number.isFinite(date.getTime()) ? date.getUTCHours() : 0;
}

function hourLabel(hour: number): string {
  return `${hour}:00`;
}

function axisSvg(labels: number[]): string {
  const step = CHART_W / 24;
  return `
    <svg viewBox="0 0 ${CHART_W} 16" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      ${labels
        .map(
          (hour) => `<text x="${(hour * step).toFixed(1)}" y="12" fill="${SIMULATOR_TOKENS.mut}" font-size="9" text-anchor="middle">${hour}</text>`,
        )
        .join('')}
    </svg>
  `;
}

function gridSvg(width: number, height: number, rows = 4): string {
  const rowStep = height / rows;
  const colStep = width / 4;
  let svg = '';
  for (let row = 0; row <= rows; row += 1) {
    const y = (rowStep * row).toFixed(1);
    svg += `<line x1="0" y1="${y}" x2="${width}" y2="${y}" stroke="${SIMULATOR_TOKENS.line}" stroke-width="1" opacity=".5" aria-hidden="true" focusable="false"/>`;
  }
  for (let col = 0; col <= 4; col += 1) {
    const x = (colStep * col).toFixed(1);
    svg += `<line x1="${x}" y1="0" x2="${x}" y2="${height}" stroke="${SIMULATOR_TOKENS.line}" stroke-width="1" opacity=".35" aria-hidden="true" focusable="false"/>`;
  }
  return svg;
}

function renderModeBand(
  intervals: Array<{ t: string; title: string; fill: string; ariaLabel: string }>,
): string {
  const barW = CHART_W / Math.max(1, intervals.length);
  return `
    <svg viewBox="0 0 ${CHART_W} 22" preserveAspectRatio="none" aria-label="band" focusable="false">
      ${intervals
        .map((interval, index) => {
          const x = (index * barW).toFixed(1);
          const w = Math.max(1.5, barW - 2).toFixed(1);
          return `
            <rect
              x="${x}"
              y="0"
              width="${w}"
              height="20"
              rx="4"
              fill="${interval.fill}"
              tabindex="0"
              aria-label="${interval.ariaLabel}"
            >
              <title>${interval.title}</title>
            </rect>
          `;
        })
        .join('')}
    </svg>
  `;
}

function renderLineChart(
  values: number[],
  options: {
    min: number;
    max: number;
    lineColor: string;
    threshold: number;
    thresholdLabel: string;
    topLabel: string;
    bottomLabel: string;
    seriesLabel: string;
  },
): string {
  const W = CHART_W;
  const H = 110;
  const padL = 40;
  const padR = 34;
  const padT = 14;
  const padB = 18;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;
  const pointCount = Math.max(1, values.length);
  const xFor = (index: number): number => padL + (pointCount === 1 ? plotW / 2 : (index / (pointCount - 1)) * plotW);
  const yFor = (value: number): number => {
    const range = options.max - options.min || 1;
    const clamped = clamp(value, options.min, options.max);
    return padT + plotH - ((clamped - options.min) / range) * plotH;
  };
  const thresholdY = yFor(options.threshold);
  const points = values.map((value, index) => `${xFor(index).toFixed(1)},${yFor(value).toFixed(1)}`).join(' ');
  const firstX = xFor(0).toFixed(1);
  const lastX = xFor(pointCount - 1).toFixed(1);
  const area = `M${firstX} ${padT + plotH} ${values.map((value, index) => `L${xFor(index).toFixed(1)} ${yFor(value).toFixed(1)}`).join(' ')} L${lastX} ${padT + plotH} Z`;

  return `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="${options.seriesLabel}" focusable="false">
      ${gridSvg(plotW, plotH)}
      <line
        x1="${padL}"
        y1="${thresholdY.toFixed(1)}"
        x2="${padL + plotW}"
        y2="${thresholdY.toFixed(1)}"
        stroke="${options.lineColor}"
        stroke-width="1"
        stroke-dasharray="3 4"
        opacity=".55"
        tabindex="0"
        aria-label="${options.thresholdLabel}"
      >
        <title>${options.thresholdLabel}</title>
      </line>
      <path d="${area}" fill="${options.lineColor}" fill-opacity=".14" aria-hidden="true" focusable="false"></path>
      <polyline
        points="${points}"
        fill="none"
        stroke="${options.lineColor}"
        stroke-width="2.6"
        stroke-linejoin="round"
        aria-label="${options.seriesLabel}"
        tabindex="0"
      >
        <title>${options.seriesLabel}</title>
      </polyline>
      ${values
        .map((value, index) => {
          const x = xFor(index);
          const y = yFor(value);
          const label = `${hourLabel(index)} — ${value.toFixed(1)} ${options.seriesLabel}`;
          return `
            <circle
              data-sim-point="${index}"
              cx="${x.toFixed(1)}"
              cy="${y.toFixed(1)}"
              r="6"
              fill="transparent"
              stroke="transparent"
              tabindex="0"
              aria-label="${label}"
            >
              <title>${label}</title>
            </circle>
          `;
        })
        .join('')}
      <text x="${padL - 4}" y="${padT + 4}" fill="${SIMULATOR_TOKENS.mut}" font-size="8" text-anchor="end">${options.topLabel}</text>
      <text x="${padL - 4}" y="${padT + plotH}" fill="${SIMULATOR_TOKENS.mut}" font-size="8" text-anchor="end">${options.bottomLabel}</text>
    </svg>
    ${axisSvg([0, 6, 12, 18, 24])}
  `;
}

function renderBarChart(
  values: number[],
  options: {
    colors: (value: number) => string;
    seriesLabel: string;
    valueLabel: (value: number, hour: number) => string;
    minHeight?: number;
  },
): string {
  const W = CHART_W;
  const H = 62;
  const baselineY = 46;
  const barW = W / Math.max(1, values.length);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const range = max - min || 1;
  const barHeight = (value: number): number => Math.max(options.minHeight ?? 1.5, (Math.abs(value) / range) * 46);
  const barY = (value: number): number => (value >= 0 ? baselineY - barHeight(value) : baselineY);

  return `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-label="${options.seriesLabel}" focusable="false">
      ${gridSvg(W, baselineY, 4)}
      ${values
        .map((value, index) => {
          const x = (index * barW).toFixed(1);
          const w = Math.max(1.5, barW - 2).toFixed(1);
          const h = barHeight(value).toFixed(1);
          const y = barY(value).toFixed(1);
          const label = options.valueLabel(value, index);
          return `
            <rect
              x="${x}"
              y="${y}"
              width="${w}"
              height="${h}"
              rx="3"
              fill="${options.colors(value)}"
              tabindex="0"
              aria-label="${label}"
            >
              <title>${label}</title>
            </rect>
          `;
        })
        .join('')}
      <line x1="0" x2="${W}" y1="${baselineY}" y2="${baselineY}" stroke="${SIMULATOR_TOKENS.line}" aria-hidden="true" focusable="false"/>
    </svg>
    ${axisSvg([0, 6, 12, 18, 24])}
  `;
}

export function renderBatteryModeBandSvg(intervals: BatteryInterval[]): string {
  return renderModeBand(
    intervals.map((interval) => ({
      t: interval.t,
      fill: interval.mode === 'ups' ? 'var(--ups)' : 'var(--home)',
      title: `${hourLabel(hourFromIso(interval.t))} — ${interval.mode === 'ups' ? 'Home UPS — nabíjení ze sítě' : 'Home 1'}`,
      ariaLabel: `${hourLabel(hourFromIso(interval.t))} — ${interval.mode === 'ups' ? 'Home UPS — nabíjení ze sítě' : 'Home 1'}`,
    })),
  );
}

export function renderBoilerModeBandSvg(intervals: BoilerInterval[]): string {
  return renderModeBand(
    intervals.map((interval) => ({
      t: interval.t,
      fill: interval.heating ? (interval.source === 'solar' ? 'var(--ups)' : 'var(--boil)') : '#1b264a',
      title: `${hourLabel(hourFromIso(interval.t))} — ${interval.heating ? (interval.source === 'solar' ? 'ohřev ze solárního přebytku' : 'ohřev z levného okna') : 'neohřívá'}`,
      ariaLabel: `${hourLabel(hourFromIso(interval.t))} — ${interval.heating ? (interval.source === 'solar' ? 'ohřev ze solárního přebytku' : 'ohřev z levného okna') : 'neohřívá'}`,
    })),
  );
}

export function renderBatterySocSvg(intervals: BatteryInterval[], reservePercent: number): string {
  return renderLineChart(intervals.map((interval) => interval.soc), {
    min: 0,
    max: 100,
    lineColor: 'var(--batt)',
    threshold: reservePercent,
    thresholdLabel: `komfortní rezerva ${reservePercent} %`,
    topLabel: '100 %',
    bottomLabel: '0 %',
    seriesLabel: 'SoC %',
  });
}

export function renderBoilerTempSvg(intervals: BoilerInterval[], minTempC: number): string {
  return renderLineChart(intervals.map((interval) => interval.temp), {
    min: 30,
    max: 75,
    lineColor: 'var(--boil)',
    threshold: minTempC,
    thresholdLabel: `minimum ${minTempC} °C`,
    topLabel: '75 °C',
    bottomLabel: '30 °C',
    seriesLabel: '°C',
  });
}

export function renderBatteryPriceSvg(prices: number[]): string {
  return renderBarChart(prices, {
    colors: (value) => (value < 0 ? 'var(--price)' : '#31406b'),
    seriesLabel: 'Kč/kWh',
    valueLabel: (value, hour) => `${hourLabel(hour)} — ${value.toFixed(2)} Kč/kWh`,
  });
}

export function renderBoilerDrawSvg(draws: number[]): string {
  return renderBarChart(draws, {
    colors: () => '#31406b',
    seriesLabel: 'litry',
    valueLabel: (value, hour) => `${hourLabel(hour)} — odběr ${Math.round(value)} l`,
  });
}

