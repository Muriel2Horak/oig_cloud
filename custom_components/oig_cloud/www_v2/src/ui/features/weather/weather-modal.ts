import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { renderIcon } from '@/utils/render-icon';
import {
  WeatherData,
  WeatherForecastEntry,
  EMPTY_WEATHER_DATA,
  weatherConditionIcon,
  weatherConditionLabel,
} from '@/data/weather-data';
import {
  ChmuData,
  ChmuWarningDetail,
  EMPTY_CHMU_DATA,
  getChmuIconMdi,
  SEVERITY_COLORS,
  SEVERITY_LABELS,
} from '@/data/chmu-data';

const u = unsafeCSS;

/**
 * Combined weather modal: current conditions + hourly/daily forecast
 * (from a HA weather entity) + active ČHMÚ warnings. Opened from the header
 * weather badge.
 */
@customElement('oig-weather-modal')
export class OigWeatherModal extends LitElement {
  @property({ type: Boolean, reflect: true }) open = false;
  @property({ type: Object }) weather: WeatherData = EMPTY_WEATHER_DATA;
  @property({ type: Object }) chmu: ChmuData = EMPTY_CHMU_DATA;

  static styles = css`
    :host { display: none; }
    :host([open]) {
      display: flex;
      position: fixed; inset: 0;
      background: rgba(0, 0, 0, 0.5);
      align-items: center; justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: ${u(CSS_VARS.cardBgSolid)};
      border: 1px solid ${u(CSS_VARS.divider)};
      border-radius: 16px;
      padding: 18px 20px 20px;
      width: 92vw; max-width: 560px;
      max-height: 86vh; overflow-y: auto;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.55);
    }

    .modal-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 14px;
    }
    .modal-title {
      display: flex; align-items: center; gap: 8px;
      font-size: 17px; font-weight: 700; color: ${u(CSS_VARS.textPrimary)};
    }
    .modal-title .oig-mdi { color: ${u(CSS_VARS.accent)}; }
    .close-btn {
      width: 32px; height: 32px; border: none; background: transparent;
      font-size: 18px; cursor: pointer; color: ${u(CSS_VARS.textSecondary)};
      border-radius: 50%;
    }
    .close-btn:hover { background: ${u(CSS_VARS.bgSecondary)}; }

    .oig-mdi { width: 1em; height: 1em; fill: currentColor; vertical-align: -0.125em; display: inline-block; }

    /* ── Current conditions ── */
    .now {
      display: flex; align-items: center; gap: 14px;
      padding: 12px 14px; border-radius: 12px;
      background: ${u(CSS_VARS.bgSecondary)};
      margin-bottom: 16px;
    }
    .now-icon { font-size: 46px; color: ${u(CSS_VARS.accent)}; display: inline-flex; line-height: 1; }
    .now-main { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
    .now-temp { font-size: 30px; font-weight: 800; line-height: 1; color: ${u(CSS_VARS.textPrimary)}; font-variant-numeric: tabular-nums; }
    .now-label { font-size: 13px; color: ${u(CSS_VARS.textSecondary)}; }
    .now-meta { margin-left: auto; display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: ${u(CSS_VARS.textSecondary)}; text-align: right; }
    .now-meta span { display: inline-flex; align-items: center; gap: 5px; justify-content: flex-end; }

    /* ── Section ── */
    .section-title {
      font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase;
      color: ${u(CSS_VARS.textSecondary)}; margin: 0 0 8px;
    }
    .section { margin-bottom: 18px; }
    .section:last-child { margin-bottom: 0; }

    /* ── Hourly strip ── */
    .hourly {
      display: flex; gap: 6px; overflow-x: auto; padding-bottom: 4px;
      scrollbar-width: thin;
    }
    .h-cell {
      flex: 0 0 auto; width: 56px;
      display: flex; flex-direction: column; align-items: center; gap: 4px;
      padding: 8px 4px; border-radius: 10px;
      background: ${u(CSS_VARS.bgSecondary)};
    }
    .h-time { font-size: 11px; color: ${u(CSS_VARS.textSecondary)}; font-variant-numeric: tabular-nums; }
    .h-icon { font-size: 20px; color: ${u(CSS_VARS.accent)}; display: inline-flex; }
    .h-temp { font-size: 13px; font-weight: 700; color: ${u(CSS_VARS.textPrimary)}; font-variant-numeric: tabular-nums; }
    .h-pop { font-size: 10px; color: #4aa3ff; display: inline-flex; align-items: center; gap: 1px; min-height: 13px; }

    /* ── Daily rows ── */
    .daily { display: flex; flex-direction: column; gap: 2px; }
    .d-row {
      display: grid; grid-template-columns: 42px 24px 1fr auto; align-items: center; gap: 10px;
      padding: 7px 6px; border-radius: 8px;
    }
    .d-row:nth-child(odd) { background: ${u(CSS_VARS.bgSecondary)}; }
    .d-day { font-size: 13px; font-weight: 600; color: ${u(CSS_VARS.textPrimary)}; text-transform: capitalize; }
    .d-icon { font-size: 18px; color: ${u(CSS_VARS.accent)}; display: inline-flex; }
    .d-pop { font-size: 11px; color: #4aa3ff; display: inline-flex; align-items: center; gap: 2px; }
    .d-temps { font-size: 13px; font-variant-numeric: tabular-nums; }
    .d-hi { font-weight: 700; color: ${u(CSS_VARS.textPrimary)}; }
    .d-lo { color: ${u(CSS_VARS.textSecondary)}; margin-left: 6px; }

    /* ── Warnings ── */
    .warning-item { padding: 11px 12px; border-radius: 10px; margin-bottom: 10px; color: #fff; }
    .warning-item:last-child { margin-bottom: 0; }
    .warning-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
    .warning-icon { font-size: 18px; display: inline-flex; }
    .warning-type { font-size: 14px; font-weight: 700; }
    .warning-level { font-size: 11px; padding: 2px 7px; background: rgba(255,255,255,0.22); border-radius: 5px; }
    .eta-badge { font-size: 10px; padding: 1px 6px; background: rgba(255,255,255,0.22); border-radius: 5px; margin-left: auto; }
    .warning-description { font-size: 12px; margin-bottom: 4px; }
    .warning-instruction { font-size: 11px; font-style: italic; opacity: 0.9; margin-bottom: 6px; }
    .warning-time { font-size: 11px; opacity: 0.85; }

    .no-warn { font-size: 12px; color: ${u(CSS_VARS.textSecondary)}; display: inline-flex; align-items: center; gap: 6px; }
    .no-warn .oig-mdi { color: ${u(CSS_VARS.success)}; }
    .empty-state { text-align: center; padding: 18px; color: ${u(CSS_VARS.textSecondary)}; font-size: 13px; }
  `;

  private onClose(): void {
    this.dispatchEvent(new CustomEvent('close', { bubbles: true }));
  }

  private hhmm(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
  }

  private dayName(iso: string): string {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('cs-CZ', { weekday: 'short' }).replace('.', '');
  }

  private fmtTemp(t: number | null): string {
    return t != null ? `${Math.round(t)}°` : '—';
  }

  private fmtDateTime(iso: string): string {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('cs-CZ');
  }

  private renderHour(h: WeatherForecastEntry) {
    const pop = h.precipitationProbability;
    return html`
      <div class="h-cell">
        <span class="h-time">${this.hhmm(h.datetime)}</span>
        <span class="h-icon">${renderIcon(weatherConditionIcon(h.condition))}</span>
        <span class="h-temp">${this.fmtTemp(h.temperature)}</span>
        <span class="h-pop">${pop != null && pop > 0 ? html`💧${Math.round(pop)}%` : nothing}</span>
      </div>
    `;
  }

  private renderDay(d: WeatherForecastEntry) {
    const pop = d.precipitationProbability;
    return html`
      <div class="d-row">
        <span class="d-day">${this.dayName(d.datetime)}</span>
        <span class="d-icon">${renderIcon(weatherConditionIcon(d.condition))}</span>
        <span class="d-pop">${pop != null && pop > 0 ? html`💧 ${Math.round(pop)} %` : nothing}</span>
        <span class="d-temps"><span class="d-hi">${this.fmtTemp(d.temperature)}</span><span class="d-lo">${this.fmtTemp(d.templow)}</span></span>
      </div>
    `;
  }

  private renderWarning(w: ChmuWarningDetail) {
    const color = SEVERITY_COLORS[w.severity] ?? SEVERITY_COLORS[2];
    const levelLabel = SEVERITY_LABELS[w.severity] ?? 'Neznámá';
    return html`
      <div class="warning-item" style="background: ${color}">
        <div class="warning-header">
          <span class="warning-icon">${renderIcon(getChmuIconMdi(w.event_type))}</span>
          <span class="warning-type">${w.event_type}</span>
          <span class="warning-level">${levelLabel}</span>
          ${w.eta_hours > 0 ? html`<span class="eta-badge">za ${w.eta_hours.toFixed(0)} h</span>` : nothing}
        </div>
        ${w.description ? html`<div class="warning-description">${w.description}</div>` : nothing}
        ${w.instruction ? html`<div class="warning-instruction">${w.instruction}</div>` : nothing}
        <div class="warning-time">${this.fmtDateTime(w.onset)} — ${this.fmtDateTime(w.expires)}</div>
      </div>
    `;
  }

  render() {
    const wx = this.weather;
    const warnings = this.chmu.allWarnings ?? [];
    const hasWarnings = warnings.length > 0 && this.chmu.effectiveSeverity > 0;
    const hourly = wx.hourly.slice(0, 12);
    const daily = wx.daily.slice(0, 6);

    return html`
      <div class="modal" @click=${(e: Event) => e.stopPropagation()}>
        <div class="modal-header">
          <span class="modal-title">
            ${renderIcon('mdi:weather-partly-cloudy')} Počasí a výstrahy
          </span>
          <button class="close-btn" @click=${this.onClose} aria-label="Zavřít">✕</button>
        </div>

        ${wx.available ? html`
          <div class="now">
            <span class="now-icon">${renderIcon(weatherConditionIcon(wx.condition))}</span>
            <div class="now-main">
              <span class="now-temp">${wx.temperature != null ? `${Math.round(wx.temperature)} ${wx.tempUnit}` : '—'}</span>
              <span class="now-label">${weatherConditionLabel(wx.condition)}</span>
            </div>
            <div class="now-meta">
              ${wx.apparentTemperature != null ? html`<span>${renderIcon('mdi:thermometer')} pocitově ${Math.round(wx.apparentTemperature)}°</span>` : nothing}
              ${wx.humidity != null ? html`<span>${renderIcon('mdi:water-percent')} ${Math.round(wx.humidity)} %</span>` : nothing}
              ${wx.windSpeed != null ? html`<span>${renderIcon('mdi:weather-windy')} ${Math.round(wx.windSpeed)} ${wx.windUnit}</span>` : nothing}
            </div>
          </div>

          ${hourly.length ? html`
            <div class="section">
              <div class="section-title">Po hodinách</div>
              <div class="hourly">${hourly.map(h => this.renderHour(h))}</div>
            </div>
          ` : nothing}

          ${daily.length ? html`
            <div class="section">
              <div class="section-title">Další dny</div>
              <div class="daily">${daily.map(d => this.renderDay(d))}</div>
            </div>
          ` : nothing}
        ` : html`
          <div class="empty-state">Není nakonfigurována žádná weather entita v Home Assistantu.</div>
        `}

        <div class="section">
          <div class="section-title">ČHMÚ výstrahy</div>
          ${hasWarnings
            ? warnings.map(w => this.renderWarning(w))
            : html`<div class="no-warn">${renderIcon('mdi:checkbox-marked-circle')} Žádné aktivní výstrahy</div>`}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-weather-modal': OigWeatherModal;
  }
}
