import { LitElement, html, css, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { type BoilerV2SourceSegment } from './types';
import { t, sourceLabel, type Lang } from '@/i18n/boiler';
import { formatTempC } from './format';

const NEUTRAL_COLOR = '#9E9E9E';

// Source gradient CSS for each segment key — matches mockup palette
const SOURCE_GRADIENTS: Record<string, string> = {
  fve:      'linear-gradient(180deg,rgba(255,213,79,.85),rgba(255,167,38,.8))',
  overflow: 'linear-gradient(180deg,rgba(255,213,79,.85),rgba(255,167,38,.8))',
  grid:     'linear-gradient(180deg,rgba(79,195,247,.8),rgba(33,150,243,.75))',
  battery:  'linear-gradient(180deg,rgba(179,157,219,.85),rgba(126,87,194,.8))',
  discharge:'linear-gradient(180deg,rgba(179,157,219,.85),rgba(126,87,194,.8))',
  alternative:'linear-gradient(180deg,rgba(255,138,101,.85),rgba(230,74,25,.8))',
};

function srcGradient(key: string | null | undefined): string {
  if (!key) return `linear-gradient(180deg,${NEUTRAL_COLOR},${NEUTRAL_COLOR})`;
  return SOURCE_GRADIENTS[key] ?? `linear-gradient(180deg,${NEUTRAL_COLOR},${NEUTRAL_COLOR})`;
}

function asUnitFraction(value: number): number {
  if (!isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

interface AuraLayer {
  key: string | null;
  background: string;
  heightPct: number;
  active: boolean;
}

/**
 * Build aura layers (bottom-up) as percentage heights.
 * Each layer is expressed as a percentage of the total tank height.
 * The first element in the returned array is the bottommost layer.
 */
function buildAuraLayers(
  fillLevelPct: number | null,
  sourceSegments: BoilerV2SourceSegment[],
): AuraLayer[] {
  const fill = asUnitFraction(fillLevelPct ?? 0);
  if (fill <= 0) return [];

  const usable = sourceSegments.filter(
    (s) => s.key !== 'discharge' && s.fillPct > 0,
  );

  if (usable.length === 0) {
    return [
      {
        key: null,
        background: `linear-gradient(180deg,${NEUTRAL_COLOR},${NEUTRAL_COLOR})`,
        heightPct: fill * 100,
        active: false,
      },
    ];
  }

  const layers: AuraLayer[] = [];
  let remaining = fill;

  for (const seg of usable) {
    const segFill = asUnitFraction(seg.fillPct);
    if (segFill <= 0) continue;
    const layerFill = Math.min(segFill, remaining);
    if (layerFill <= 0) break;
    layers.push({
      key: seg.key,
      background: srcGradient(seg.key),
      heightPct: layerFill * 100,
      active: seg.active,
    });
    remaining -= layerFill;
    if (remaining <= 0) break;
  }

  return layers;
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
  @property({ type: Number }) readyLiters: number | null = null;
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

    /* ── tank wrapper (mockup .bwrap) ── */
    .bwrap {
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    /* ── tank container (mockup .tank) ── */
    .tank {
      position: relative;
      width: 150px;
      height: 300px;
    }

    /* ── outer shell ── */
    .shell {
      position: absolute;
      inset: 0;
      border-radius: 42px;
      background: #0d1526;
      border: 2px solid rgba(255,255,255,.16);
      overflow: hidden;
      box-shadow: inset 0 0 26px rgba(0,0,0,.6), 0 10px 26px rgba(0,0,0,.5);
    }

    /* ── aura fill (total, bottom-anchored) ── */
    .aura {
      position: absolute;
      left: 0;
      right: 0;
      bottom: 0;
      /* height is set inline = fill_level_pct% */
    }

    /* ── individual source layers ── */
    .seg {
      position: absolute;
      left: 0;
      right: 0;
      /* bottom + height set inline */
    }

    /* ── glossy surf ellipse on top of aura ── */
    .surf {
      position: absolute;
      left: 0;
      right: 0;
      top: -6px;
      height: 12px;
      border-radius: 50%;
      background: rgba(255,255,255,.5);
      box-shadow: 0 0 12px rgba(255,255,255,.4);
    }

    /* ── surf pulse when charging ── */
    .surf--charging {
      animation: surfPulse 1.8s ease-in-out infinite;
    }

    @keyframes surfPulse {
      0%, 100% { opacity: 1; transform: scaleX(1); }
      50% { opacity: 0.6; transform: scaleX(0.92); }
    }

    /* ── trend chip top-center ── */
    .trend {
      position: absolute;
      top: 8px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 9.5px;
      font-weight: 700;
      background: rgba(76,175,80,.2);
      border: 1px solid rgba(76,175,80,.45);
      color: #b8f0bf;
      border-radius: 6px;
      padding: 2px 8px;
      white-space: nowrap;
      z-index: 2;
    }

    .trend--idle {
      background: rgba(120,130,150,.18);
      border-color: rgba(120,130,150,.35);
      color: #9aa6b2;
    }

    .trend--cooling {
      background: rgba(33,150,243,.15);
      border-color: rgba(33,150,243,.35);
      color: #81d4fa;
    }

    /* ── top temperature ── */
    .ttop {
      position: absolute;
      top: 34px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 24px;
      font-weight: 800;
      text-shadow: 0 2px 5px rgba(0,0,0,.85);
      color: #fff;
      z-index: 2;
    }

    /* ── bottom temperature ── */
    .tbot {
      position: absolute;
      bottom: 30px;
      left: 0;
      right: 0;
      text-align: center;
      font-size: 14px;
      font-weight: 600;
      opacity: .9;
      text-shadow: 0 2px 4px rgba(0,0,0,.85);
      color: #fff;
      z-index: 2;
    }

    /* ── volume pill (center) ── */
    .vol {
      position: absolute;
      top: 46%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(13,21,38,.85);
      border: 1px solid rgba(255,255,255,.25);
      border-radius: 9px;
      padding: 5px 12px;
      font-size: 15px;
      font-weight: 800;
      color: #fff;
      text-align: center;
      white-space: nowrap;
      z-index: 2;
    }

    .vol-caption {
      display: block;
      font-size: 8.5px;
      font-weight: 600;
      opacity: .6;
      text-align: center;
      text-decoration: none;
    }

    /* ── below-tank elements ── */
    .srcchip {
      margin-top: 10px;
      font-size: 11px;
      font-weight: 700;
      background: rgba(255,167,38,.16);
      border: 1px solid rgba(255,167,38,.4);
      color: #ffd479;
      border-radius: 7px;
      padding: 4px 12px;
      text-align: center;
    }

    .srcchip--grid {
      background: rgba(79,195,247,.13);
      border-color: rgba(79,195,247,.35);
      color: #81d4fa;
    }

    .srcchip--battery {
      background: rgba(179,157,219,.16);
      border-color: rgba(179,157,219,.4);
      color: #ce93d8;
    }

    .srcchip--alt {
      background: rgba(255,138,101,.16);
      border-color: rgba(255,138,101,.4);
      color: #ffab91;
    }

    .srcchip--idle {
      background: rgba(120,130,150,.12);
      border-color: rgba(120,130,150,.3);
      color: #9aa6b2;
    }

    .eta {
      margin-top: 6px;
      font-size: 10.5px;
      opacity: .7;
      color: #eef4fb;
      text-align: center;
    }
  `;

  render() {
    try {
      return this._renderTank();
    } catch {
      return html`
        <div class="bwrap" data-testid="boiler-svg" role="img"
             aria-label="${t('boiler.aria.svg_summary', this.lang)}">
        </div>
      `;
    }
  }

  private _renderTank() {
    const layers = buildAuraLayers(this.fillLevelPct, this.sourceSegments);
    const ariaLabel = buildAriaLabel(
      this.topTempC,
      this.bottomTempC,
      this.sourceKey,
      this.stale,
      this.lang,
    );

    const fill = this.fillLevelPct ?? null;
    const fillPct = fill != null ? Math.max(0, Math.min(100, fill * 100)) : 0;

    const topTempStr = this.topTempC != null
      ? `${this.topTempC.toFixed(1)} °C`
      : '— °C';

    const effectiveBottomTemp = this.bottomTempC ?? this.lowerZoneTempC ?? null;
    const bottomTempStr = effectiveBottomTemp != null
      ? `dole ${effectiveBottomTemp.toFixed(1)} °C`
      : null;

    // Ready liters pill — use readyLiters prop; fall back to fill*volume
    const computedReady = this.readyLiters ??
      (fill != null && this.volumeL != null ? Math.round(fill * this.volumeL) : null);
    const volPill = computedReady != null ? computedReady : null;

    // Trend chip
    const trendChip = this._renderTrendChip();

    // Top layer gets surf + pulse class
    const isCharging = this.chargingLabel != null;
    const topLayerIdx = layers.length - 1; // last layer is topmost

    // Stacked layers: layers[0]=bottom ... layers[n-1]=top
    // We need to lay them out bottom→up. Each layer sits on top of the previous.
    // Use bottom=0 for layer[0], bottom=layer[0].heightPct% for layer[1], etc.
    let cumulativeBottom = 0;
    const layerEls = layers.map((layer, i) => {
      const bottom = cumulativeBottom;
      cumulativeBottom += layer.heightPct;
      const isTop = i === topLayerIdx;
      return html`
        <div
          class="seg"
          data-testid="boiler-aura-fill"
          data-source-key="${layer.key ?? 'unknown'}"
          style="bottom:${bottom.toFixed(2)}%;height:${layer.heightPct.toFixed(2)}%;background:${layer.background};"
        >
          ${isTop ? html`<div class="surf ${isCharging ? 'surf--charging' : ''}"></div>` : nothing}
        </div>
      `;
    });

    // Source chip text below tank
    const srcChipContent = this._renderSourceChipBelow();

    return html`
      <div class="bwrap" data-testid="boiler-svg" role="img" aria-label="${ariaLabel}">
        <div class="tank">
          <div class="shell">
            <div class="aura" style="height:${fillPct.toFixed(2)}%">
              ${layerEls}
            </div>
          </div>

          ${trendChip}

          <div
            class="ttop"
            data-testid="boiler-temp-top-label"
          >${topTempStr}</div>

          ${volPill != null ? html`
            <div class="vol" data-testid="boiler-volume-badge">
              ${volPill} L
              <s class="vol-caption">${t('boiler.tank.ready_caption', this.lang)}</s>
            </div>
          ` : nothing}

          ${effectiveBottomTemp != null ? html`
            <div class="tbot" data-testid="boiler-temp-bottom-label">${bottomTempStr}</div>
          ` : nothing}
        </div>

        ${srcChipContent}

        ${this.etaText != null ? html`
          <div class="eta" data-testid="boiler-eta-chip">${this.etaText}</div>
        ` : nothing}
      </div>
    `;
  }

  private _renderTrendChip() {
    const label = this.chargingLabel;

    if (label != null) {
      // Charging: green tint
      // Rewrite the label to friendly format: "⚡ NABÍJÍ +0,4 °C/min"
      return html`
        <div class="trend" data-testid="boiler-trend-chip">${label}</div>
      `;
    }

    // No charging label = idle/cooling — per mockup the chip only appears
    // while charging; an empty grey pill is just visual noise.
    return nothing;
  }

  private _renderSourceChipBelow() {
    const sourceKey = this.sourceKey;
    if (sourceKey == null) {
      return html`
        <div class="srcchip srcchip--idle" data-testid="boiler-source-chip">
          ${t('boiler.tank.source_idle', this.lang)}
        </div>
      `;
    }

    const labels: Record<string, string> = {
      fve:        t('boiler.tank.source_fve', this.lang),
      overflow:   t('boiler.tank.source_fve', this.lang),
      grid:       t('boiler.tank.source_grid', this.lang),
      battery:    t('boiler.tank.source_battery', this.lang),
      discharge:  t('boiler.tank.source_battery', this.lang),
      alternative:t('boiler.tank.source_alt', this.lang),
    };
    const chipClasses: Record<string, string> = {
      fve:        'srcchip',
      overflow:   'srcchip',
      grid:       'srcchip srcchip--grid',
      battery:    'srcchip srcchip--battery',
      discharge:  'srcchip srcchip--battery',
      alternative:'srcchip srcchip--alt',
    };

    const label = labels[sourceKey] ?? sourceLabel(sourceKey, this.lang);
    const cls = chipClasses[sourceKey] ?? 'srcchip';

    return html`
      <div class="${cls}" data-testid="boiler-source-chip">${label}</div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-boiler-v2-svg': OigBoilerV2Svg;
  }
}
