import './boiler-sparkline';

import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import {
  BOILER_SOURCE_COLORS,
  type BoilerV2Data,
  type BoilerConfig,
} from './types';
import { t, sourceLabel, type Lang } from '@/i18n/boiler';
import {
  formatTempC,
  formatKwh,
  formatCzk,
} from './format';

const u = unsafeCSS;

function srcColor(key: string | null | undefined): string {
  if (!key) return '#9E9E9E';
  return (BOILER_SOURCE_COLORS as Record<string, string>)[key] ?? '#9E9E9E';
}

@customElement('oig-boiler-metric-panel')
export class OigBoilerMetricPanel extends LitElement {
  @property({ type: Object }) data: BoilerV2Data | null = null;
  @property({ type: Object }) config: BoilerConfig | null = null;
  @property({ type: String }) lang: Lang = 'cs';
  @property({ type: String }) panelType: 'source' | 'comfort' = 'source';

  static styles = css`
    :host {
      display: block;
      font-family: ${u(CSS_VARS.fontFamily)};
    }

    .panel {
      background: ${u(CSS_VARS.cardBg)};
      border: 1px solid ${u(CSS_VARS.divider)};
      border-radius: 12px;
      padding: 18px;
      box-sizing: border-box;
    }

    .panel-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${u(CSS_VARS.textSecondary)};
      margin: 0 0 14px;
    }

    .section-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: ${u(CSS_VARS.textSecondary)};
      margin: 18px 0 0;
      padding-bottom: 6px;
    }

    /* stat-row: label | sparkline | value */
    .stat-row {
      display: grid;
      grid-template-columns: 1fr 60px auto;
      align-items: center;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid ${u(CSS_VARS.divider)};
    }

    .stat-row:last-child {
      border-bottom: none;
    }

    .stat-row.no-spark {
      grid-template-columns: 1fr auto;
    }

    .stat-row.sub {
      padding: 5px 0;
    }

    .stat-row.sub .stat-label,
    .stat-row.sub .stat-value {
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .stat-label {
      color: ${u(CSS_VARS.textSecondary)};
      font-size: 12px;
    }

    .stat-value {
      font-size: 15px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
      text-align: right;
      white-space: nowrap;
    }

    .stat-value.lg {
      font-size: 22px;
    }

    .stat-unit {
      color: ${u(CSS_VARS.textSecondary)};
      font-size: 12px;
      margin-left: 3px;
      font-weight: 400;
    }

    .stat-spark {
      width: 60px;
      height: 18px;
      opacity: 0.85;
    }

    /* Komfort banner */
    .komfort-banner {
      display: flex;
      align-items: center;
      gap: 14px;
      padding: 14px;
      border-radius: 10px;
      margin-bottom: 14px;
    }

    .komfort-banner.ok {
      background: rgba(76, 175, 80, 0.08);
      border: 1px solid rgba(76, 175, 80, 0.25);
    }

    .komfort-banner.gap {
      background: rgba(255, 152, 0, 0.08);
      border: 1px solid rgba(255, 152, 0, 0.25);
    }

    .komfort-banner.unknown {
      background: rgba(158, 158, 158, 0.08);
      border: 1px solid rgba(158, 158, 158, 0.25);
    }

    .komfort-circle {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
      font-weight: 800;
      flex-shrink: 0;
    }

    .komfort-circle.ok {
      background: #4CAF50;
      color: #fff;
    }

    .komfort-circle.gap {
      background: #FF9800;
      color: #fff;
    }

    .komfort-circle.unknown {
      background: #9E9E9E;
      color: #fff;
    }

    .komfort-text-main {
      font-size: 15px;
      font-weight: 700;
    }

    .komfort-text-main.ok { color: #4CAF50; }
    .komfort-text-main.gap { color: #FF9800; }
    .komfort-text-main.unknown { color: #9E9E9E; }

    .komfort-text-sub {
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-top: 2px;
    }

    /* Source dot */
    .source-dot {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
      margin-right: 4px;
    }

    .source-value {
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 0;
    }

    .empty-panel {
      color: ${u(CSS_VARS.textSecondary)};
      font-size: 12px;
      font-style: italic;
      padding: 4px 0;
    }
  `;

  render() {
    try {
      if (this.panelType === 'source') {
        return this._renderSourcePanel();
      }
      return this._renderComfortPanel();
    } catch {
      return html`
        <div class="panel">
          <div class="empty-panel">—</div>
        </div>
      `;
    }
  }

  private _renderSourcePanel() {
    const data = this.data;
    const activity = data?.activity ?? null;
    const status = data?.status ?? null;
    const planSlots = data?.planSlots ?? [];
    const sourceSegments = data?.sourceSegments ?? [];
    const sparkPower = data?.sparkline?.power ?? [];

    const activeSourceKey = activity?.source ?? status?.selectedSource ?? null;
    const recSourceKey = planSlots[0]?.recommendedSource ?? null;

    const totalEnergyKwh = (status as any)?.energyTracking?.totalKwh
      ?? sourceSegments.reduce((s, seg) => s + (seg.energyKwh ?? 0), 0) / 1000;

    const bySource: Record<string, number> = {};
    for (const seg of sourceSegments) {
      if (seg.key) {
        bySource[seg.key] = (bySource[seg.key] ?? 0) + (seg.energyKwh ?? 0) / 1000;
      }
    }

    const costTodayCzk: number | null = (data as any)?.costTodayCzk ?? null;
    const savingsTodayCzk: number | null = (data as any)?.savingsTodayCzk ?? null;
    const pvShare7dPct: number | null = (data as any)?.pvShare7dPct ?? null;

    const fveKwh = bySource['fve'] ?? null;
    const overflowKwh = bySource['overflow'] ?? null;
    const gridKwh = bySource['grid'] ?? null;

    const hasSpark = sparkPower.length > 0;

    return html`
      <div class="panel" data-testid="boiler-source-panel">
        <div class="panel-title">Zdroj &amp; náklady</div>

        <div class="stat-row ${hasSpark ? '' : 'no-spark'}">
          <span class="stat-label">Cena dnes</span>
          ${hasSpark ? html`<oig-boiler-sparkline class="stat-spark" .values=${sparkPower} color="#f5b800" .sparkWidth=${60} .sparkHeight=${18}></oig-boiler-sparkline>` : ''}
          <span class="stat-value">${costTodayCzk != null ? formatCzk(costTodayCzk) : '—'}<span class="stat-unit">Kč</span></span>
        </div>

        <div class="stat-row ${hasSpark ? '' : 'no-spark'}">
          <span class="stat-label">Energie dnes</span>
          ${hasSpark ? html`<oig-boiler-sparkline class="stat-spark" .values=${sparkPower} color="#60a5fa" .sparkWidth=${60} .sparkHeight=${18}></oig-boiler-sparkline>` : ''}
          <span class="stat-value">${totalEnergyKwh > 0 ? formatKwh(totalEnergyKwh) : '—'}</span>
        </div>

        ${fveKwh != null ? html`
          <div class="stat-row sub no-spark">
            <span class="stat-label">Z FVE</span>
            <span class="stat-value" style="color:${srcColor('fve')}">${formatKwh(fveKwh)}</span>
          </div>
        ` : nothing}

        ${overflowKwh != null ? html`
          <div class="stat-row sub no-spark">
            <span class="stat-label">Z přetoku</span>
            <span class="stat-value" style="color:${srcColor('overflow')}">${formatKwh(overflowKwh)}</span>
          </div>
        ` : nothing}

        ${gridKwh != null ? html`
          <div class="stat-row sub no-spark">
            <span class="stat-label">Ze sítě</span>
            <span class="stat-value" style="color:${srcColor('grid')}">${formatKwh(gridKwh)}</span>
          </div>
        ` : nothing}

        <div class="stat-row no-spark">
          <span class="stat-label">Ušetřeno vs. neoptim.</span>
          <span class="stat-value">${savingsTodayCzk != null ? `~${formatCzk(savingsTodayCzk)}` : '—'}<span class="stat-unit">${savingsTodayCzk != null ? 'Kč' : ''}</span></span>
        </div>

        <div class="stat-row no-spark">
          <span class="stat-label">FVE podíl (7d)</span>
          <span class="stat-value">${pvShare7dPct != null ? `${Math.round(pvShare7dPct)} %` : '—'}</span>
        </div>

        <div class="stat-row no-spark">
          <span class="stat-label">Aktivní zdroj</span>
          <span class="stat-value source-value">
            ${activeSourceKey
              ? html`<span class="source-dot" style="background:${srcColor(activeSourceKey)}"></span>${sourceLabel(activeSourceKey, this.lang)}`
              : '—'}
          </span>
        </div>

        <div class="stat-row no-spark">
          <span class="stat-label">Doporučený zdroj</span>
          <span class="stat-value source-value">
            ${recSourceKey
              ? html`<span class="source-dot" style="background:${srcColor(recSourceKey)}"></span>${sourceLabel(recSourceKey, this.lang)}`
              : '—'}
          </span>
        </div>
      </div>
    `;
  }

  private _renderComfortPanel() {
    const data = this.data;
    const status = data?.status ?? null;
    const explanation = data?.explanation ?? null;
    const cfg = this.config;
    const activity = data?.activity ?? null;
    const sparkTemp = data?.sparkline?.temperature ?? [];

    const comfortOk = status?.comfortSatisfied;
    const cls = comfortOk === true ? 'ok' : comfortOk === false ? 'gap' : 'unknown';
    const comfortLabel =
      comfortOk === true
        ? t('boiler.status.comfort_satisfied', this.lang)
        : comfortOk === false
          ? t('boiler.status.comfort_unsatisfied', this.lang)
          : t('boiler.status.comfort_unknown', this.lang);

    const gapC = explanation?.unsatisfiedComfortGapC ?? null;
    const targetTempC = cfg?.targetTempC ?? null;
    const subText =
      gapC != null && targetTempC != null
        ? `Mezera do cíle: ${gapC.toFixed(1)} °C · cíl ${targetTempC.toFixed(0)} °C`
        : targetTempC != null
          ? `Cíl: ${targetTempC.toFixed(0)} °C`
          : '';

    const topTempC = status?.temperatureTop ?? null;
    const bottomTempC = status?.temperatureBottom ?? null;
    const stratDeltaC =
      topTempC != null && bottomTempC != null ? topTempC - bottomTempC : null;

    const trendCPerMin = activity?.temperatureTrendCPerMin ?? null;
    const trendText = trendCPerMin != null
      ? `${trendCPerMin >= 0 ? '+' : ''}${trendCPerMin.toFixed(1)} °C/min`
      : null;

    const hasSpark = sparkTemp.length > 0;

    return html`
      <div class="panel" data-testid="boiler-comfort-panel">
        <div class="panel-title">Komfort</div>

        <div class="komfort-banner ${cls}">
          <div class="komfort-circle ${cls}">${comfortOk === true ? '✓' : comfortOk === false ? '!' : '?'}</div>
          <div>
            <div class="komfort-text-main ${cls}">${comfortLabel}</div>
            ${subText ? html`<div class="komfort-text-sub">${subText}</div>` : nothing}
          </div>
        </div>

        ${cfg?.deadlineTime && cfg.deadlineTime !== '--:--'
          ? html`
            <div class="stat-row no-spark">
              <span class="stat-label">${t('boiler.config.deadline', this.lang)}</span>
              <span class="stat-value">${cfg.deadlineTime}</span>
            </div>
          `
          : nothing}

        <div class="stat-row ${hasSpark ? '' : 'no-spark'}">
          <span class="stat-label">${t('boiler.status.temp_top', this.lang)}</span>
          ${hasSpark ? html`<oig-boiler-sparkline class="stat-spark" .values=${sparkTemp} color="#ff7a45" .sparkWidth=${60} .sparkHeight=${18}></oig-boiler-sparkline>` : ''}
          <span class="stat-value">${formatTempC(topTempC)}</span>
        </div>

        ${bottomTempC != null
          ? html`
            <div class="stat-row ${hasSpark ? '' : 'no-spark'}">
              <span class="stat-label">${t('boiler.status.temp_bottom', this.lang)}</span>
              ${hasSpark ? html`<oig-boiler-sparkline class="stat-spark" .values=${sparkTemp} color="#6688a8" .sparkWidth=${60} .sparkHeight=${18}></oig-boiler-sparkline>` : ''}
              <span class="stat-value">${formatTempC(bottomTempC)}</span>
            </div>
          `
          : html`
            <div class="stat-row no-spark">
              <span class="stat-label">${t('boiler.status.temp_bottom', this.lang)}</span>
              <span class="stat-value">—</span>
            </div>
          `}

        ${stratDeltaC != null
          ? html`
            <div class="stat-row ${hasSpark ? '' : 'no-spark'}">
              <span class="stat-label">Stratifikace ΔT</span>
              ${hasSpark ? html`<oig-boiler-sparkline class="stat-spark" .values=${sparkTemp} color="#a78bfa" .sparkWidth=${60} .sparkHeight=${18}></oig-boiler-sparkline>` : ''}
              <span class="stat-value">${stratDeltaC.toFixed(1)}<span class="stat-unit">°C</span></span>
            </div>
          `
          : nothing}

        ${trendText != null
          ? html`
            <div class="stat-row no-spark">
              <span class="stat-label">Trend</span>
              <span class="stat-value">${trendText}</span>
            </div>
          `
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-boiler-metric-panel': OigBoilerMetricPanel;
  }
}
