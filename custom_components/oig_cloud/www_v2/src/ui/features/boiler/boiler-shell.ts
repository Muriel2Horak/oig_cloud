import './boiler-svg';

import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import {
  type BoilerV2Data,
  type BoilerConfig,
} from './types';
import { t, sourceLabel, type Lang } from '@/i18n/boiler';
import {
  formatTempC,
  formatCompactTime,
  estimateTimeToTargetMinutes,
} from './format';

const u = unsafeCSS;

const STALE_INDICATOR_FLAGS = new Set([
  'temperature_unavailable',
  'temperature_stale',
  'source_stale',
  'activity_stale',
  'source_invalid',
  'power_sign_mismatch_charge',
  'power_sign_mismatch_discharge',
  'runtime_cache_empty',
  'config_profile_unavailable',
]);

function isStale(data: BoilerV2Data): boolean {
  if (data.status?.degraded) return true;
  for (const f of data.status?.degradedFlags ?? []) {
    if (STALE_INDICATOR_FLAGS.has(f)) return true;
  }
  for (const f of data.activity?.staleFlags ?? []) {
    if (STALE_INDICATOR_FLAGS.has(f)) return true;
  }
  for (const f of data.explanation?.degradedReasons ?? []) {
    if (STALE_INDICATOR_FLAGS.has(f)) return true;
  }
  return false;
}

function computeEtaText(
  data: BoilerV2Data,
  config: BoilerConfig,
  lang: Lang,
): string | null {
  const activity = data.activity;
  if (!activity) return null;
  const eta = estimateTimeToTargetMinutes({
    targetTempC: config.targetTempC ?? 0,
    topTempC: data.status?.temperatureTop ?? null,
    temperatureTrendCPerMin: activity.temperatureTrendCPerMin,
    volumeL: config.volumeL,
    heaterPowerKw: config.heaterPowerKw,
  });
  if (eta === null) return t('boiler.eta.unavailable', lang);
  if (eta === 0) return t('boiler.eta.already_reached', lang);
  return formatCompactTime(eta);
}

@customElement('oig-boiler-v2-shell')
export class OigBoilerV2Shell extends LitElement {
  @property({ type: Object }) data: BoilerV2Data | null = null;
  @property({ type: Object }) config: BoilerConfig | null = null;
  @property({ type: String }) lang: Lang = 'cs';

  static styles = css`
    :host {
      display: block;
      font-family: ${u(CSS_VARS.fontFamily)};
    }

    .shell {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 16px;
      max-width: 380px;
      margin: 0 auto;
    }

    .stale-warning {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 12px;
      border-radius: 8px;
      background: ${u(CSS_VARS.warning)};
      color: #fff;
      font-size: 13px;
      font-weight: 500;
      width: 100%;
      box-sizing: border-box;
    }

    .svg-wrapper {
      width: 100%;
    }

    .aura-percent {
      font-size: 11px;
      color: #9aa6b2;
      margin-top: 4px;
      font-weight: 500;
      text-align: center;
    }

    .aura-percent strong {
      color: #e6edf3;
      font-weight: 700;
    }

    .aura-legend {
      display: flex;
      gap: 12px;
      margin-top: 8px;
      font-size: 10px;
      flex-wrap: wrap;
      justify-content: center;
    }

    .aura-legend-item {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #9aa6b2;
    }

    .aura-legend-item .dot {
      width: 10px;
      height: 10px;
      border-radius: 2px;
      flex-shrink: 0;
    }

    .source-chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px;
      border-radius: 999px;
      background: rgba(124,134,148,.18);
      border: 1.5px solid rgba(124,134,148,.5);
      color: ${u(CSS_VARS.textPrimary)};
      font-weight: 600;
      font-size: 13px;
      margin-bottom: 8px;
    }

    .source-secondary {
      font-size: 11px;
      color: #9aa6b2;
      text-align: center;
    }

    .advanced-slot {
      width: 100%;
    }
  `;

  private _renderAuraLegend() {
    const data = this.data;
    const segs = data?.sourceSegments ?? [];
    const activity = data?.activity ?? null;
    const fillPct = activity?.fillLevelPct ?? null;
    const auraMaxTempC = activity?.auraMaxTempC ?? this.config?.auraMaxTempC ?? null;
    const topTempC = data?.status?.temperatureTop ?? null;

    const bySource: Record<string, number> = {};
    for (const seg of segs) {
      if (seg.key) {
        bySource[seg.key] = (bySource[seg.key] ?? 0) + (seg.energyKwh ?? 0) / 1000;
      }
    }

    const fillPctStr = fillPct != null ? `${Math.round(fillPct * 100)} %` : null;
    const fillSummary = fillPctStr != null
      ? html`<div class="aura-percent">Náplň aury: <strong>${fillPctStr}</strong>${topTempC != null && auraMaxTempC != null ? ` (${formatTempC(topTempC)} / ${formatTempC(auraMaxTempC)} max)` : ''}</div>`
      : nothing;

    const LEGEND_KEYS: Array<{ key: string; color: string }> = [
      { key: 'fve', color: '#f5b800' },
      { key: 'overflow', color: '#4ade80' },
      { key: 'grid', color: '#7c8694' },
    ];

    const legend = html`
      <div class="aura-legend">
        ${LEGEND_KEYS.map(({ key, color }) => {
          const kwh = bySource[key] ?? 0;
          return html`
            <div class="aura-legend-item">
              <span class="dot" style="background:${color}"></span>
              ${sourceLabel(key, this.lang)} ${kwh.toFixed(1)}
            </div>
          `;
        })}
      </div>
    `;

    return html`${fillSummary}${legend}`;
  }

  private _renderSourceChip() {
    const activity = this.data?.activity ?? null;
    const sourceKey = activity?.source ?? null;
    if (!sourceKey) return nothing;

    const sourceNames: Record<string, string> = {
      grid: 'SÍŤ',
      fve: 'FVE',
      overflow: 'PŘETOK',
      discharge: 'VÝBOJ',
    };
    const icons: Record<string, string> = {
      grid: '⚡',
      fve: '☀️',
      overflow: '🌊',
      discharge: '🔋',
    };
    const name = sourceNames[sourceKey] ?? sourceKey.toUpperCase();
    const icon = icons[sourceKey] ?? '⚡';
    const powerKw = (activity as any)?.powerKw ?? null;

    return html`
      <div class="source-chip">
        <span>${icon}</span>${name}<span>→</span>${powerKw != null ? `${powerKw.toFixed(1)} kW` : ''}
      </div>
    `;
  }

  private _renderRecommendation() {
    const data = this.data;
    const planSlots = data?.planSlots ?? [];
    const recSourceKey = planSlots[0]?.recommendedSource ?? null;
    const activeSourceKey = data?.activity?.source ?? null;
    const reasonCodes = data?.explanation?.reasonCodes ?? [];

    if (!recSourceKey) return nothing;

    const sourceNames: Record<string, string> = {
      grid: '⚡ Síť',
      fve: '☀️ FVE',
      overflow: '🌊 Přetok',
      discharge: '🔋 Výboj',
    };
    const recLabel = sourceNames[recSourceKey] ?? recSourceKey;

    const reasonMap: Record<string, string> = {
      no_fve: 'FVE žádné',
      fve_available: 'FVE dostupné',
      cheap_grid: 'levná síť',
      overflow_available: 'přetok dostupný',
    };
    const reasonText = reasonCodes.length > 0
      ? reasonCodes.map(r => reasonMap[r] ?? r).join(', ')
      : null;

    const sameAsActive = recSourceKey === activeSourceKey;

    return html`
      <div class="source-secondary">
        Doporučeno: <span style="color:#e6edf3;font-weight:600">${recLabel}${reasonText ? ` (${reasonText})` : ''}</span>
        ${sameAsActive ? html` · stejně jako aktivní` : ''}
      </div>
    `;
  }

  render() {
    try {
      return this._renderShell();
    } catch {
      return html`
        <div class="shell" data-testid="boiler-v2-shell">
          <div class="stale-warning" data-testid="boiler-stale-warning" role="alert">
            ${t('boiler.aria.stale', this.lang)}
          </div>
        </div>
      `;
    }
  }

  private _renderShell() {
    const data = this.data;
    const stale = data ? isStale(data) : false;
    const activity = data?.activity ?? null;
    const status = data?.status ?? null;
    const cfg = this.config;

    const etaText = data && cfg ? computeEtaText(data, cfg, this.lang) : null;
    const sourceKey = activity?.source ?? null;

    const chargingLabel: string | null =
      activity?.state?.startsWith('charging_') && activity.temperatureTrendCPerMin != null
        ? `↑ NABÍJÍ ${activity.temperatureTrendCPerMin >= 0 ? '+' : ''}${activity.temperatureTrendCPerMin.toFixed(1)}°C/min`
        : activity?.state?.startsWith('charging_')
          ? '↑ NABÍJÍ'
          : null;

    const lowerZoneTempC = (data?.status as any)?.lowerZoneTempC ?? null;

    return html`
      <div class="shell" data-testid="boiler-v2-shell">
        ${stale
          ? html`
              <div class="stale-warning" data-testid="boiler-stale-warning" role="alert">
                ${t('boiler.aria.stale', this.lang)}
              </div>
            `
          : nothing}

        <div class="svg-wrapper">
          <oig-boiler-v2-svg
            .fillLevelPct="${activity?.fillLevelPct ?? null}"
            .sourceSegments="${data?.sourceSegments ?? []}"
            .topTempC="${status?.temperatureTop ?? null}"
            .bottomTempC="${status?.temperatureBottom ?? null}"
            .lowerZoneTempC="${lowerZoneTempC}"
            .volumeL="${cfg?.volumeL ?? null}"
            .etaText="${etaText}"
            .sourceKey="${sourceKey}"
            .chargingLabel="${chargingLabel}"
            .stale="${stale}"
            .lang="${this.lang}"
          ></oig-boiler-v2-svg>
        </div>
        <span aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">${status?.temperatureTop ?? ''}</span>

        ${this._renderAuraLegend()}
        ${etaText != null ? html`<div class="eta-row" style="font-size:11px;color:#9aa6b2;text-align:center">${t('boiler.eta.label', this.lang)}: <span aria-live="polite" style="font-weight:600;color:#e6edf3">${etaText}</span></div>` : ''}
        ${this._renderSourceChip()}
        ${this._renderRecommendation()}

        <div class="advanced-slot" data-testid="boiler-advanced-slot">
          <slot name="advanced"></slot>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-boiler-v2-shell': OigBoilerV2Shell;
  }
}
