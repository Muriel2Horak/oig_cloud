import './boiler-sparkline';

import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import {
  type BoilerV2Data,
  type BoilerConfig,
  type BoilerV2PlanSlot,
} from './types';
import { t, type Lang } from '@/i18n/boiler';
import { altTypeLabel } from './boiler-energy-today';

const u = unsafeCSS;

// ============================================================================
// Helpers
// ============================================================================

/** Human-readable source label + emoji for a plan slot recommendedSource (next-action row) */
function sourceHumanLabel(source: string | null | undefined, lang: Lang): string {
  switch (source) {
    case 'fve':
    case 'overflow': return t('boiler.panel.source_overflow', lang);
    case 'grid':     return t('boiler.panel.source_grid', lang);
    case 'battery':  return t('boiler.panel.source_battery_short', lang);
    case 'alternative': return t('boiler.panel.source_alt', lang);
    default:         return source ?? '—';
  }
}

/** Window emoji for demand window label */
function windowEmoji(label: string): string {
  switch (label) {
    case 'morning':   return '🌅';
    case 'afternoon': return '☀️';
    case 'evening':   return '🌆';
    case 'night':     return '🌙';
    default:          return '💧';
  }
}

/** Window Czech/English human name — lowercase for inline use */
function windowName(label: string, lang: Lang): string {
  const key = `boiler.demand_map.window.${label}` as any;
  const v = t(key, lang);
  return v !== key ? v.toLowerCase() : label;
}

/** Format slot index (0-95, 15-min) to HH:MM */
function slotToHhmm(slotIndex: number): string {
  const totalMin = slotIndex * 15;
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Extract HH:MM from an ISO timestamp */
function isoToHhmm(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '??:??';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/**
 * Find the next future heating slot (heatingKwh > 0 or recommendedSource set
 * and heatingKwh not explicitly 0). Returns null when none found.
 */
interface NextAction {
  label: string;   // e.g. "☀️ Přetoky"
  timeStr: string; // e.g. "13:30"
  isTomorrow: boolean;
}

function findNextHeatingSlot(
  planSlots: BoilerV2PlanSlot[],
  lang: Lang,
): NextAction | null {
  const now = Date.now();
  for (const slot of planSlots) {
    const startMs = new Date(slot.start).getTime();
    if (!Number.isFinite(startMs)) continue;
    // Only future slots
    if (startMs < now - 60_000) continue;
    // Must have heating_kwh > 0 or be a heating slot (if heatingKwh null, rely on source)
    const kwh = slot.heatingKwh ?? null;
    if (kwh !== null && kwh <= 0) continue;
    const src = slot.recommendedSource;
    if (!src) continue;

    // Check if it's tomorrow (wall-clock date comparison)
    const slotDate = new Date(startMs);
    const today = new Date();
    const isTomorrow =
      slotDate.getDate() !== today.getDate() ||
      slotDate.getMonth() !== today.getMonth() ||
      slotDate.getFullYear() !== today.getFullYear();

    const label = sourceHumanLabel(src, lang);
    const timeStr = `${String(slotDate.getHours()).padStart(2, '0')}:${String(slotDate.getMinutes()).padStart(2, '0')}`;

    return { label, timeStr, isTomorrow };
  }
  return null;
}

// ============================================================================
// Component
// ============================================================================

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

    /* ── Side panel wrapper ── */
    :host { height: 100%; }

    .panel {
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      padding: 12px 14px;
      box-sizing: border-box;
      height: 100%;
    }

    /* ── Section heading: UPPERCASE muted ── */
    .panel-title {
      margin: 0 0 8px;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      opacity: 0.7;
      color: ${u(CSS_VARS.textPrimary)};
    }

    /* ── KV row: label left (muted), bold value right, dashed separator ── */
    .kv {
      display: flex;
      justify-content: space-between;
      font-size: 11.5px;
      padding: 4px 0;
      border-bottom: 1px dashed rgba(255,255,255,.1);
    }
    .kv:last-child { border-bottom: none; }
    .kv span { opacity: 0.6; }
    .kv b { font-weight: 600; }

    /* ── OK chip: green, per mockup ── */
    .okchip {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      background: rgba(76,175,80,.16);
      border: 1px solid rgba(76,175,80,.35);
      color: #9fe6a8;
      border-radius: 7px;
      padding: 3px 10px;
      margin-bottom: 8px;
    }

    /* ── Gap chip: amber ── */
    .gapcip {
      display: inline-block;
      font-size: 11px;
      font-weight: 700;
      background: rgba(255,152,0,.16);
      border: 1px solid rgba(255,152,0,.35);
      color: #ffd17c;
      border-radius: 7px;
      padding: 3px 10px;
      margin-bottom: 8px;
    }

    /* fallback panel */
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

  // ── ZDROJ & NÁKLADY ──────────────────────────────────────────────────────

  private _renderSourcePanel() {
    const data = this.data;
    const lang = this.lang;
    const energy = data?.energyToday ?? null;
    const planSummary = data?.planSummary ?? null;
    const activity = data?.activity ?? null;
    const planSlots = data?.planSlots ?? [];

    // Row 1: Cena dnes — REAL today cost (grid×all-in spot + metered gas×config),
    // not the planner's estimated FUTURE cost. Falls back to the plan estimate
    // only if the real accumulator value isn't present.
    const costCzk: number | null =
      energy?.costCzk ?? planSummary?.estimatedCostCzk ?? null;

    // Row 2: Energie dnes — energy_today.total_kwh
    const totalKwh: number | null = energy?.totalKwh ?? null;

    // Row 3: ☀️ z FVE
    const fveKwh: number | null = energy?.fveKwh ?? null;

    // Row 4: 🔌 ze sítě
    const gridKwh: number | null = energy?.gridKwh ?? null;

    // Row 5: 🔥 z plynu / alt — only when alt configured or kwh > 0
    const altKwh: number | null = energy?.altKwh ?? null;
    const showAlt = (data?.altSourceType != null) || (altKwh != null && altKwh > 0);
    // Row 5b: ⚡ nerozlišený zdroj (např. el. energie z doby před restartem)
    const unattributedKwh: number | null = energy?.unattributedKwh ?? null;
    const showUnattributed = unattributedKwh != null && unattributedKwh > 0.05;
    // F5/Task C: dynamic alt type label from data.altSourceType
    const altLabel = altTypeLabel(data?.altSourceType, lang);

    // Row 6: 🔋→🔥 z baterie — only when > 0
    const batteryKwh: number | null = energy?.batteryKwh ?? null;
    const showBattery = batteryKwh != null && batteryKwh > 0;

    // Row 7: Ušetřeno vs. plyn — REAL savings vs heating the same electric
    // energy on the alt source (gas), from the energy accumulator. Null when no
    // alt price is configured; only shown when positive.
    const savings: number | null = energy?.savingsVsAltCzk ?? null;
    const savingsLabel = (savings != null && savings >= 0)
      ? `${savings.toFixed(1).replace('.', ',')} Kč`
      : null;

    // Row 8: Aktuální zdroj — only while ACTIVELY heating. activity.source is
    // "last known source" and survives standby (showed „síť" at 0 W all day).
    const isActivelyCharging = activity?.state?.startsWith('charging_') ?? false;
    const sourceKey = isActivelyCharging ? (activity?.source ?? null) : null;
    const sourceEstimated = (activity as any)?.sourceEstimated === true;
    const currentSourceLabel: string = (() => {
      switch (sourceKey) {
        case 'fve':
        case 'overflow': return t('boiler.panel.source_overflow', lang);
        case 'grid':     return t('boiler.panel.source_grid_short', lang);
        case 'discharge': return t('boiler.panel.source_battery_short', lang);
        case 'alternative': return t('boiler.panel.source_alt', lang);
        default: return '—';
      }
    })();
    // Append "(odhad)" when source was estimated from switch state (no live power sensor)
    const currentSourceDisplay = sourceEstimated && sourceKey != null
      ? `${currentSourceLabel} (${t('boiler.tank.source_estimated_suffix', lang)})`
      : currentSourceLabel;

    // Row 9: Další akce — next future heating slot
    const nextAction = findNextHeatingSlot(planSlots, lang);

    return html`
      <div class="panel" data-testid="boiler-source-panel">
        <h3 class="panel-title">${t('boiler.panel.source_title', lang)}</h3>

        <div class="kv">
          <span>${t('boiler.panel.cost_today', lang)}</span>
          <b>${costCzk != null ? `${costCzk.toFixed(1).replace('.', ',')} Kč` : '—'}</b>
        </div>

        <div class="kv">
          <span>${t('boiler.panel.energy_today', lang)}</span>
          <b>${totalKwh != null ? `${totalKwh.toFixed(1).replace('.', ',')} kWh` : '—'}</b>
        </div>

        <div class="kv">
          <span>${t('boiler.panel.fve_label', lang)}</span>
          <b style="color:#ffd479">${fveKwh != null ? `${fveKwh.toFixed(1).replace('.', ',')} kWh` : '—'}</b>
        </div>

        <div class="kv">
          <span>${t('boiler.panel.grid_label', lang)}</span>
          <b style="color:#81d4fa">${gridKwh != null ? `${gridKwh.toFixed(1).replace('.', ',')} kWh` : '—'}</b>
        </div>

        ${showUnattributed ? html`
          <div class="kv">
            <span>${t('boiler.panel.unattributed_label', lang)}</span>
            <b style="color:#9aa6b2">${unattributedKwh!.toFixed(1).replace('.', ',')} kWh</b>
          </div>
        ` : nothing}

        ${showAlt ? html`
          <div class="kv" data-testid="boiler-alt-row">
            <span>${altLabel}</span>
            <b style="color:#ffab91">${altKwh != null ? `${altKwh.toFixed(1).replace('.', ',')} kWh` : '—'}</b>
          </div>
        ` : nothing}

        ${showBattery ? html`
          <div class="kv">
            <span>${t('boiler.panel.battery_label', lang)}</span>
            <b style="color:#ce93d8">${batteryKwh!.toFixed(1).replace('.', ',')} kWh</b>
          </div>
        ` : nothing}

        <div class="kv">
          <span>${t('boiler.panel.savings_label', lang)}</span>
          <b style="color:#9fe6a8">${savingsLabel != null ? savingsLabel : '—'}</b>
        </div>

        <div class="kv" data-testid="boiler-current-source-row">
          <span>${t('boiler.panel.current_source', lang)}</span>
          <b>${currentSourceDisplay}</b>
        </div>

        <div class="kv" data-testid="boiler-next-action">
          <span>${t('boiler.panel.next_action', lang)}</span>
          <b>${nextAction != null
            ? (nextAction.isTomorrow
                ? html`${nextAction.label} ${t('boiler.panel.tomorrow', lang)} ${nextAction.timeStr}`
                : html`${nextAction.label} ${nextAction.timeStr}`)
            : '—'
          }</b>
        </div>
      </div>
    `;
  }

  // ── KOMFORT ──────────────────────────────────────────────────────────────

  private _renderComfortPanel() {
    const data = this.data;
    const lang = this.lang;
    const comfortStatus = (data?.status as any)?.comfortSatisfied ?? null;

    // Comfort chip
    const comfortSatisfied: boolean | null = comfortStatus;

    // Demand windows (max 3)
    const demandMap = data?.demandMap ?? null;
    const windows = demandMap?.windows?.slice(0, 3) ?? [];

    // Deadline from plan_summary; fallback to config.deadlineTime
    const planSummary = data?.planSummary ?? null;
    const deadlineTime = planSummary?.deadlineTime
      ?? (this.config?.deadlineTime !== '--:--' ? this.config?.deadlineTime : null)
      ?? null;
    // target temp from config
    const targetTempC = this.config?.targetTempC ?? null;

    // Legionella
    const legionella = data?.legionella ?? null;
    const legionellaStr: string | null = (() => {
      if (!legionella) return null;
      if (!legionella.enabled) return t('boiler.panel.legionella_off', lang);
      if (legionella.scheduledStart) {
        // extract HH:MM from ISO or HH:MM string
        const raw = legionella.scheduledStart;
        const timeStr = raw.includes('T') ? isoToHhmm(raw) : raw.substring(0, 5);
        return `${t('boiler.panel.legionella_plan', lang)} ${timeStr}`;
      }
      const daysSince = legionella.daysSinceLast ?? null;
      const interval = legionella.intervalDays ?? null;
      if (daysSince !== null && interval !== null) {
        const remaining = interval - daysSince;
        if (remaining <= 0) {
          return t('boiler.panel.legionella_overdue', lang);
        }
        return `${t('boiler.panel.legionella_in', lang)} ${remaining} ${t('boiler.panel.legionella_days', lang)}`;
      }
      return t('boiler.panel.legionella_scheduled', lang);
    })();

    // Trend (same as tank chip)
    const activity = data?.activity ?? null;
    const trend = activity?.temperatureTrendCPerMin ?? null;
    const trendStr: string | null = trend != null
      ? `${trend >= 0 ? '+' : ''}${trend.toFixed(1).replace('.', ',')} °C/min`
      : null;

    // Circulation
    const circRuns = data?.circulationRuns ?? [];
    const circStr: string | null = (() => {
      if (!circRuns.length) return null;
      const first = circRuns[0];
      const timeStr = isoToHhmm(first.start);
      return `💧 ${timeStr} (${t('boiler.panel.circ_before_peak', lang)})`;
    })();

    return html`
      <div class="panel" data-testid="boiler-comfort-panel">
        <h3 class="panel-title">${t('boiler.panel.comfort_title', lang)}</h3>

        ${comfortSatisfied === true
          ? html`<span class="okchip" data-testid="boiler-comfort-chip">✓ ${t('boiler.status.comfort_satisfied', lang)}</span>`
          : comfortSatisfied === false
            ? html`<span class="gapcip" data-testid="boiler-comfort-chip">⚠ ${t('boiler.status.comfort_unsatisfied', lang)}</span>`
            : nothing}

        ${windows.map(w => {
          const emoji = windowEmoji(w.label);
          const name = windowName(w.label, lang);
          const timeStr = slotToHhmm(w.slotIndex);
          const liters = Math.round(w.liters);
          return html`
            <div class="kv" data-testid="boiler-demand-window">
              <span>${emoji} ${name} ${timeStr}</span>
              <b>≥${liters} L</b>
            </div>
          `;
        })}

        ${deadlineTime && deadlineTime !== '--:--' ? html`
          <div class="kv" data-testid="boiler-deadline-row">
            <span>${t('boiler.panel.deadline_label', lang)}</span>
            <b>${deadlineTime.substring(0, 5)}${targetTempC != null ? html` · ${targetTempC.toFixed(0)} °C` : nothing}</b>
          </div>
        ` : nothing}

        ${legionellaStr != null ? html`
          <div class="kv" data-testid="boiler-legionella-row">
            <span>${t('boiler.panel.legionella_label', lang)}</span>
            <b>${legionellaStr}</b>
          </div>
        ` : nothing}

        ${trendStr != null ? html`
          <div class="kv" data-testid="boiler-trend-row">
            <span>${t('boiler.panel.trend_label', lang)}</span>
            <b>${trendStr}</b>
          </div>
        ` : nothing}

        ${circStr != null ? html`
          <div class="kv" data-testid="boiler-circ-row">
            <span>${t('boiler.panel.circ_label', lang)}</span>
            <b>${circStr}</b>
          </div>
        ` : html`
          <div class="kv" data-testid="boiler-circ-row">
            <span>${t('boiler.panel.circ_label', lang)}</span>
            <b style="opacity:0.5">${t('boiler.panel.circ_off', lang)}</b>
          </div>
        `}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-boiler-metric-panel': OigBoilerMetricPanel;
  }
}
