import { LitElement, html, css, svg, unsafeCSS } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { BOILER_SOURCE_COLORS, type BoilerV2SourceSegment } from './types';
import { t, sourceLabel, type Lang } from '@/i18n/boiler';
import { formatTempC, formatLiters } from './format';

const u = unsafeCSS;

const VIEWBOX_W = 320;
const VIEWBOX_H = 440;
const BODY_X = 75;
const BODY_Y = 35;
const BODY_W = 170;
const BODY_H = 370;
const BODY_RX = 30;
const TANK_X = 86;
const TANK_Y = 46;
const TANK_W = 148;
const TANK_H = 348;
const TANK_RX = 22;
const TANK_BOTTOM = TANK_Y + TANK_H;
const TANK_CX = TANK_X + TANK_W / 2;

const NEUTRAL_COLOR = '#9E9E9E';

interface AuraSeg {
  key: string | null;
  color: string;
  x: number;
  y: number;
  width: number;
  height: number;
  active: boolean;
}

function srcColor(key: string | null | undefined): string {
  if (!key) return NEUTRAL_COLOR;
  return (BOILER_SOURCE_COLORS as Record<string, string>)[key] ?? NEUTRAL_COLOR;
}

function asUnitFraction(value: number): number {
  if (!isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

function buildAuraSegments(
  fillLevelPct: number | null,
  sourceSegments: BoilerV2SourceSegment[],
): AuraSeg[] {
  const fill = asUnitFraction(fillLevelPct ?? 0);
  if (fill <= 0) return [];

  const usable = sourceSegments.filter(
    (s) => s.key !== 'discharge' && s.fillPct > 0,
  );

  if (usable.length === 0) {
    const fillH = Math.round(fill * TANK_H);
    const y = TANK_BOTTOM - fillH;
    const clampedY = Math.max(TANK_Y, y);
    const clampedH = TANK_BOTTOM - clampedY;
    return [
      {
        key: null,
        color: NEUTRAL_COLOR,
        x: TANK_X,
        y: clampedY,
        width: TANK_W,
        height: clampedH,
        active: false,
      },
    ];
  }

  const segs: AuraSeg[] = [];
  let currentBottom = TANK_BOTTOM;

  for (const seg of usable) {
    const segH = Math.round(asUnitFraction(seg.fillPct) * TANK_H);
    if (segH <= 0) continue;
    const y = currentBottom - segH;
    const clampedY = Math.max(TANK_Y, y);
    const clampedH = currentBottom - clampedY;
    if (clampedH <= 0) break;
    segs.push({
      key: seg.key,
      color: srcColor(seg.key),
      x: TANK_X,
      y: clampedY,
      width: TANK_W,
      height: clampedH,
      active: seg.active,
    });
    currentBottom = clampedY;
    if (currentBottom <= TANK_Y) break;
  }

  return segs;
}

function buildAriaLabel(
  topTempC: number | null,
  bottomTempC: number | null,
  sourceKey: string | null,
  stale: boolean,
  lang: Lang,
): string {
  const parts: string[] = [t('boiler.aria.svg_summary', lang)];
  parts.push(`${t('boiler.status.temp_top', lang)}: ${formatTempC(topTempC)}`);
  parts.push(`${t('boiler.status.temp_bottom', lang)}: ${formatTempC(bottomTempC)}`);
  const src = sourceKey
    ? sourceLabel(sourceKey, lang)
    : t('boiler.aria.source_unknown', lang);
  parts.push(src);
  if (stale) parts.push(t('boiler.aria.stale', lang));
  return parts.join('. ');
}

@customElement('oig-boiler-v2-svg')
export class OigBoilerV2Svg extends LitElement {
  @property({ type: Number }) fillLevelPct: number | null = null;
  @property({ type: Array }) sourceSegments: BoilerV2SourceSegment[] = [];
  @property({ type: Number }) topTempC: number | null = null;
  @property({ type: Number }) bottomTempC: number | null = null;
  @property({ type: Number }) lowerZoneTempC: number | null = null;
  @property({ type: Number }) volumeL: number | null = null;
  @property({ type: String }) etaText: string | null = null;
  @property({ type: String }) sourceKey: string | null = null;
  @property({ type: Boolean }) stale = false;
  @property({ type: String }) chargingLabel: string | null = null;
  @property({ type: String }) lang: Lang = 'cs';

  static styles = css`
    :host {
      display: block;
      width: 100%;
    }

    svg {
      display: block;
      width: 100%;
      height: auto;
      overflow: visible;
    }

    .boiler-body {
      fill: ${u(CSS_VARS.bgSecondary)};
      stroke: ${u(CSS_VARS.divider)};
      stroke-width: 2;
    }

    .boiler-tank-bg {
      fill: ${u(CSS_VARS.bgPrimary)};
      stroke: ${u(CSS_VARS.divider)};
      stroke-width: 1.5;
    }

    .aura-segment {
      transition: height 0.4s ease, y 0.4s ease;
    }

    .aura-segment--active {
      animation: boilerAuraShimmer 2s linear infinite;
    }

    @keyframes boilerAuraShimmer {
      0%   { opacity: 1; }
      50%  { opacity: 0.7; }
      100% { opacity: 1; }
    }

    .boiler-tank-overlay {
      fill: none;
      stroke: ${u(CSS_VARS.divider)};
      stroke-width: 1.5;
    }

    .label-shadow {
      paint-order: stroke;
      stroke: rgba(0,0,0,0.55);
      stroke-width: 3;
      stroke-linejoin: round;
    }

    .temp-label-top {
      font-size: 22px;
      font-weight: 700;
      fill: #ffffff;
      text-anchor: middle;
      dominant-baseline: middle;
    }

    .temp-label-bottom {
      font-size: 18px;
      font-weight: 600;
      fill: #ffffff;
      text-anchor: middle;
      dominant-baseline: middle;
    }

    .charging-chip-text {
      font-size: 11px;
      font-weight: 700;
      fill: #0f1419;
      text-anchor: middle;
      dominant-baseline: middle;
    }

    .volume-badge-text {
      font-size: 16px;
      font-weight: 700;
      fill: #ffffff;
      text-anchor: middle;
      dominant-baseline: middle;
    }

    .volume-badge-sub {
      font-size: 9px;
      font-weight: 600;
      fill: #60a5fa;
      text-anchor: middle;
      dominant-baseline: middle;
    }

    .volume-badge {
      font-size: 13px;
      font-weight: 500;
      fill: rgba(255,255,255,0.85);
      text-anchor: middle;
      dominant-baseline: middle;
    }

    .eta-chip {
      font-size: 13px;
      font-weight: 600;
      fill: ${u(CSS_VARS.textPrimary)};
      text-anchor: middle;
      dominant-baseline: middle;
    }

    .source-chip-text {
      font-size: 12px;
      font-weight: 500;
      fill: ${u(CSS_VARS.textSecondary)};
      text-anchor: middle;
      dominant-baseline: middle;
    }
  `;

  render() {
    try {
      return this._renderSvg();
    } catch {
      return html`<svg viewBox="0 0 ${VIEWBOX_W} ${VIEWBOX_H}" role="img" aria-label="${t('boiler.aria.svg_summary', this.lang)}" data-testid="boiler-svg"></svg>`;
    }
  }

  private _renderSvg() {
    const segments = buildAuraSegments(this.fillLevelPct, this.sourceSegments);
    const ariaLabel = buildAriaLabel(
      this.topTempC,
      this.bottomTempC,
      this.sourceKey,
      this.stale,
      this.lang,
    );
    const clipId = 'boiler-tank-clip';

    const topTempStr = formatTempC(this.topTempC);
    const volStr = this.volumeL != null ? formatLiters(this.volumeL) : null;
    const srcLabel = this.sourceKey
      ? sourceLabel(this.sourceKey, this.lang)
      : null;

    const effectiveBottomTemp = this.bottomTempC ?? this.lowerZoneTempC ?? null;
    const bottomTempStr = effectiveBottomTemp != null
      ? `${effectiveBottomTemp.toFixed(1)}°`
      : '—°';
    const bottomTempSubLabel = effectiveBottomTemp != null && this.bottomTempC == null
      ? 'DOLE (zóna)'
      : 'DOLE';

    const fillPct = this.fillLevelPct ?? null;
    const fillPctInt = fillPct != null ? Math.round(fillPct * 100) : null;
    const fillBadgeY = fillPct != null ? Math.max(TANK_Y + 10, 405 - 370 * fillPct) : null;

    return html`
      <svg
        viewBox="0 0 ${VIEWBOX_W} ${VIEWBOX_H}"
        role="img"
        aria-label="${ariaLabel}"
        data-testid="boiler-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <clipPath id="${clipId}">
            <rect
              x="${TANK_X}"
              y="${TANK_Y}"
              width="${TANK_W}"
              height="${TANK_H}"
              rx="${TANK_RX}"
              ry="${TANK_RX}"
            />
          </clipPath>
        </defs>

        <rect
          class="boiler-body"
          x="${BODY_X}"
          y="${BODY_Y}"
          width="${BODY_W}"
          height="${BODY_H}"
          rx="${BODY_RX}"
          ry="${BODY_RX}"
        />

        <rect
          class="boiler-tank-bg"
          x="${TANK_X}"
          y="${TANK_Y}"
          width="${TANK_W}"
          height="${TANK_H}"
          rx="${TANK_RX}"
          ry="${TANK_RX}"
        />

        <g clip-path="url(#${clipId})">
          ${segments.map(
            (seg) => svg`
              <rect
                class="aura-segment${seg.active ? ' aura-segment--active' : ''}"
                data-testid="boiler-aura-fill"
                data-source-key="${seg.key ?? 'unknown'}"
                x="${seg.x}"
                y="${seg.y}"
                width="${seg.width}"
                height="${seg.height}"
                fill="${seg.color}"
              />
            `,
          )}
        </g>

        <rect
          class="boiler-tank-overlay"
          x="${TANK_X}"
          y="${TANK_Y}"
          width="${TANK_W}"
          height="${TANK_H}"
          rx="${TANK_RX}"
          ry="${TANK_RX}"
        />

        ${fillBadgeY != null && fillPctInt != null ? svg`
          <line x1="${TANK_X}" y1="${fillBadgeY}" x2="${TANK_X + TANK_W}" y2="${fillBadgeY}"
            stroke="rgba(245,184,0,.6)" stroke-width="1.5" stroke-dasharray="3,3"/>
          <text x="${TANK_X + TANK_W + 7}" y="${fillBadgeY + 4}"
            font-size="9" fill="#f5b800" font-weight="600">${fillPctInt}%</text>
        ` : ''}

        <text
          class="temp-label-top label-shadow"
          data-testid="boiler-temp-top-label"
          x="${TANK_CX}"
          y="${TANK_Y + 44}"
        >${topTempStr}</text>

        <text
          class="temp-label-bottom label-shadow"
          data-testid="boiler-temp-bottom-label"
          x="${TANK_CX}"
          y="${TANK_BOTTOM - 36}"
          font-size="22"
          font-weight="700"
          fill="#fff"
          text-anchor="middle"
          style="paint-order:stroke;stroke:rgba(0,0,0,.4);stroke-width:2px"
        >${bottomTempStr}</text>
        <text
          x="${TANK_CX}"
          y="${TANK_BOTTOM - 20}"
          text-anchor="middle"
          fill="rgba(255,255,255,.85)"
          font-size="10"
          style="paint-order:stroke;stroke:rgba(0,0,0,.3);stroke-width:2px"
        >${bottomTempSubLabel}</text>

        ${volStr != null ? svg`
          <g>
            <rect
              x="${TANK_CX - 50}"
              y="${TANK_Y + TANK_H / 2 - 18}"
              width="100"
              height="36"
              rx="6"
              fill="rgba(0,0,0,0.45)"
              stroke="rgba(96,165,250,0.5)"
              stroke-width="1"
            />
            <text
              class="volume-badge-text label-shadow"
              data-testid="boiler-volume-badge"
              x="${TANK_CX}"
              y="${TANK_Y + TANK_H / 2 - 3}"
            >≈ ${volStr}</text>
            <text
              class="volume-badge-sub"
              x="${TANK_CX}"
              y="${TANK_Y + TANK_H / 2 + 11}"
            >TUV @ 40 °C</text>
          </g>
        ` : ''}

        ${this.chargingLabel != null ? svg`
          <g>
            <rect
              x="${TANK_CX - 58}"
              y="${TANK_Y + 126}"
              width="116"
              height="26"
              rx="13"
              fill="rgba(74,222,128,0.95)"
            />
            <text
              class="charging-chip-text"
              x="${TANK_CX}"
              y="${TANK_Y + 143}"
            >${this.chargingLabel}</text>
          </g>
        ` : ''}

        ${this.etaText != null ? svg`
          <g transform="translate(${TANK_CX} ${BODY_Y + BODY_H + 22})" data-testid="boiler-eta-chip">
            <rect x="-90" y="-14" width="180" height="28" rx="8"
              fill="rgba(255,122,69,.12)" stroke="rgba(255,122,69,.4)"/>
            <text x="0" y="-1" text-anchor="middle" fill="#ff7a45" font-size="12" font-weight="700">⏱ ${this.etaText}</text>
          </g>
        ` : ''}

        ${srcLabel != null ? svg`
          <text
            class="source-chip-text"
            data-testid="boiler-source-chip"
            x="${TANK_CX}"
            y="${BODY_Y + BODY_H + 40}"
          >${srcLabel}</text>
        ` : ''}

        <line x1="50" y1="85" x2="80" y2="85" stroke="#5a6472" stroke-width="3"/>
        <text x="46" y="81" text-anchor="end" font-size="9" fill="#9aa6b2">⟲ Cirk.</text>
        <line x1="240" y1="85" x2="270" y2="85" stroke="#dd5544" stroke-width="3"/>
        <text x="274" y="81" font-size="9" fill="#9aa6b2">TUV →</text>
        <line x1="50" y1="380" x2="80" y2="380" stroke="#6688a8" stroke-width="3"/>
        <text x="46" y="376" text-anchor="end" font-size="9" fill="#9aa6b2">💧 Vstup</text>
      </svg>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-boiler-v2-svg': OigBoilerV2Svg;
  }
}
