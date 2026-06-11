import './boiler-svg';

import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import {
  type BoilerV2Data,
  type BoilerConfig,
} from './types';
import { t, type Lang } from '@/i18n/boiler';
import {
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
  const targetTempC = config.targetTempC ?? 0;
  const eta = estimateTimeToTargetMinutes({
    targetTempC,
    topTempC: data.status?.temperatureTop ?? null,
    temperatureTrendCPerMin: activity.temperatureTrendCPerMin,
    volumeL: config.volumeL,
    heaterPowerKw: config.heaterPowerKw,
  });
  if (eta === null) return t('boiler.eta.unavailable', lang);
  if (eta === 0) return t('boiler.eta.already_reached', lang);

  const etaStr = `na ${targetTempC.toFixed(0)} °C za ~${formatCompactTime(eta)}`;

  const deadlineTime = data.planSummary?.deadlineTime ?? config.deadlineTime;
  const comfortSatisfied = (data.status as any)?.comfortSatisfied ?? null;
  if (deadlineTime && deadlineTime !== '--:--') {
    const dl = deadlineTime.substring(0, 5);
    const checkmark = comfortSatisfied === true ? ' ✓' : '';
    return `${etaStr} · ${lang === 'cs' ? 'komfort' : 'comfort'} ${dl}${checkmark}`;
  }
  return etaStr;
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
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      padding: 16px;
      max-width: 300px;
      margin: 0 auto;
      /* mockup .bwrap: the tank sits on its own card */
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
    }

    /* Compact corner chip — mockup has no full-width banner. */
    .stale-warning {
      position: absolute;
      top: 8px;
      right: 8px;
      z-index: 2;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 2px 8px;
      border-radius: 6px;
      background: rgba(255, 152, 0, 0.15);
      border: 1px solid rgba(255, 152, 0, 0.4);
      color: #ffcc80;
      font-size: 10.5px;
      font-weight: 600;
    }

    .svg-wrapper {
      width: 100%;
    }

    .advanced-slot {
      width: 100%;
    }
  `;

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
    // Source chip reflects ACTIVE heating only — activity.source is "last
    // known source" and survives standby, which made the chip claim
    // „Nabíjí ze sítě" while nothing was heating.
    const isActivelyCharging = activity?.state?.startsWith('charging_') ?? false;
    const sourceKey = isActivelyCharging ? (activity?.source ?? null) : null;

    // Trend chip label: Czech-friendly format per mockup.
    // charging_alt (gas) uses "🔥 OHŘÍVÁ" with orange tint; others use "⚡ NABÍJÍ".
    const isAltCharging = activity?.state === 'charging_alt';
    const chargingLabel: string | null = (() => {
      if (!activity?.state?.startsWith('charging_')) return null;
      const prefix = isAltCharging ? '🔥 OHŘÍVÁ' : '⚡ NABÍJÍ';
      if (activity.temperatureTrendCPerMin != null) {
        const sign = activity.temperatureTrendCPerMin >= 0 ? '+' : '';
        const trendStr = activity.temperatureTrendCPerMin.toLocaleString('cs-CZ', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
        return `${prefix} ${sign}${trendStr} °C/min`;
      }
      return prefix;
    })();

    const lowerZoneTempC = (data?.status as any)?.lowerZoneTempC ?? null;

    // Compute ready liters: filled portion of the tank (fill_level_pct * volumeL)
    const fillFraction = activity?.fillLevelPct ?? null;
    const readyLiters = (fillFraction != null && cfg?.volumeL != null)
      ? Math.round(fillFraction * cfg.volumeL)
      : null;

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
            .fillLevelPct="${fillFraction}"
            .sourceSegments="${data?.sourceSegments ?? []}"
            .energyMix="${data?.energyToday ? {
              fve: data.energyToday.fveKwh,
              grid: data.energyToday.gridKwh,
              battery: data.energyToday.batteryKwh,
              alt: data.energyToday.altKwh,
              unattributed: data.energyToday.unattributedKwh,
            } : null}"
            .topTempC="${status?.temperatureTop ?? null}"
            .bottomTempC="${status?.temperatureBottom ?? null}"
            .lowerZoneTempC="${lowerZoneTempC}"
            .volumeL="${cfg?.volumeL ?? null}"
            .readyLiters="${readyLiters}"
            .etaText="${etaText}"
            .sourceKey="${sourceKey}"
            .chargingLabel="${chargingLabel}"
            .altCharging="${isAltCharging}"
            .sourceEstimated="${activity?.sourceEstimated === true}"
            .stale="${stale}"
            .lang="${this.lang}"
          ></oig-boiler-v2-svg>
        </div>
        <span aria-live="polite" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)">${status?.temperatureTop ?? ''}</span>

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
