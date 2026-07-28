// ============================================================================
// Boiler Tab — Components (Full V1 Feature Parity)
// ============================================================================
//
// Sections (matching V1 boiler-tab.html + boiler.js):
//   1. Debug Control Panel  (collapsible, Plan/Apply/Cancel)
//   2. Status Grid          (7 cards: SOC%, temps, energy, cost, next, source)
//   3. Energy Breakdown     (3 cards + ratio bar)
//   4. Predicted Usage      (5 items)
//   5. Plan Info            (9 rows)
//   6. Tank Thermometer     (SVG visualization)
//   7. Category Selector    (dropdown for 8 season/day categories)
//   8. Heatmap Grid         (7x24 DOM grid)
//   9. Stats Cards          (4 large: total/FVE/grid consumption, cost)
//  10. Profiling Stats      (24-hour bar chart + 4 stat items)
//  11. Config               (6 profile cards)
//  12. Legacy wrapper exports (oig-boiler-state, oig-boiler-heatmap, oig-boiler-profiles)
// ============================================================================

import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import {
  BoilerProfile, BoilerState, BoilerHourData, BoilerPlan,
  BoilerEnergyBreakdown, BoilerPredictedUsage, BoilerConfig,
  BoilerHeatmapRow, BoilerProfilingData, CATEGORY_LABELS,
  BoilerV2Status, BoilerV2PlanSlot, BoilerV2Explanation,
  BoilerV2Identity, DemandMapData, OVERRIDE_TTL_DEFAULT_MINUTES,
} from './types';
import { planBoilerHeating, applyBoilerPlan, cancelBoilerPlan } from '@/data/boiler-data';
import { haClient } from '@/data/ha-client';
import { t, sourceLabel, reasonLabel, type Lang } from '@/i18n/boiler';
import { formatTempC, formatKwh, formatCzk, formatPercent, formatTimeRange, formatDataAge } from '@/ui/features/boiler/format';

const u = unsafeCSS;

// ============================================================================
// Shared card styles
// ============================================================================

const cardBase = css`
  background: ${u(CSS_VARS.cardBg)};
  border-radius: 12px;
  padding: 16px;
  box-shadow: ${u(CSS_VARS.cardShadow)};
`;

const sectionTitle = css`
  font-size: 15px;
  font-weight: 600;
  color: ${u(CSS_VARS.textPrimary)};
  margin: 0 0 12px 0;
`;

// Clamp helper (same as V1)
function clampPercent(val: number): number {
  return Math.max(0, Math.min(100, val));
}

function tempToColor(temp: number): string {
  const minT = 10, maxT = 70;
  const ratio = Math.max(0, Math.min(1, (temp - minT) / (maxT - minT)));
  const cold = { r: 33, g: 150, b: 243 };
  const hot = { r: 255, g: 87, b: 34 };
  const mix = (a: number, b: number) => Math.round(a + (b - a) * ratio);
  return `rgb(${mix(cold.r, hot.r)}, ${mix(cold.g, hot.g)}, ${mix(cold.b, hot.b)})`;
}

// ============================================================================
// 1. DEBUG CONTROL PANEL
// ============================================================================

@customElement('oig-boiler-debug-panel')
export class OigBoilerDebugPanel extends LitElement {
  @state() private collapsed = true;
  @state() private busy = false;

  static styles = css`
    :host { display: block; }

    .panel {
      ${cardBase};
      overflow: hidden;
    }

    .panel-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      cursor: pointer;
      user-select: none;
      padding: 0;
      background: none;
      border: none;
      width: 100%;
      text-align: left;
      color: ${u(CSS_VARS.textPrimary)};
      font: inherit;
    }

    .panel-header:hover { opacity: 0.85; }

    .panel-title {
      font-size: 14px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .info-bubble {
      position: relative;
      cursor: help;
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .info-bubble .tooltip {
      display: none;
      position: absolute;
      left: 0;
      top: 24px;
      width: 280px;
      padding: 10px;
      background: ${u(CSS_VARS.cardBg)};
      border: 1px solid ${u(CSS_VARS.divider)};
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.15);
      font-size: 11px;
      line-height: 1.5;
      color: ${u(CSS_VARS.textSecondary)};
      z-index: 100;
      white-space: normal;
    }

    .info-bubble:hover .tooltip { display: block; }

    .toggle-icon {
      font-size: 18px;
      font-weight: bold;
      color: ${u(CSS_VARS.textSecondary)};
      transition: transform 0.2s;
    }

    .panel-content {
      display: none;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid ${u(CSS_VARS.divider)};
    }

    .panel-content.open { display: block; }

    .section-label {
      font-size: 12px;
      font-weight: 600;
      color: ${u(CSS_VARS.textSecondary)};
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .button-group {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .action-btn {
      padding: 8px 14px;
      border: 1px solid ${u(CSS_VARS.divider)};
      border-radius: 8px;
      background: ${u(CSS_VARS.bgSecondary)};
      color: ${u(CSS_VARS.textPrimary)};
      font-size: 12px;
      cursor: pointer;
      transition: background 0.15s, opacity 0.15s;
      white-space: nowrap;
    }

    .action-btn:hover { background: ${u(CSS_VARS.divider)}; }
    .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  `;

  private toggle() { this.collapsed = !this.collapsed; }

  private async doAction(action: () => Promise<boolean>, label: string) {
    this.busy = true;
    try {
      const ok = await action();
      this.dispatchEvent(new CustomEvent('action-done', {
        detail: { success: ok, label },
        bubbles: true, composed: true,
      }));
    } finally {
      this.busy = false;
    }
  }

  render() {
    return html`
      <div class="panel">
        <button class="panel-header" @click=${this.toggle}>
          <span class="panel-title">
            Pokrocile ovladani (Debug)
            <span class="info-bubble">?
              <span class="tooltip">
                <strong>Automaticky rezim</strong><br/>
                Bojler funguje plne automaticky! System automaticky planuje ohrev kazdych 5 minut,
                optimalizuje podle spotovych cen a profilu spotreby.<br/><br/>
                <strong>Tlacitka nize jsou jen pro debug/override.</strong>
              </span>
            </span>
          </span>
          <span class="toggle-icon">${this.collapsed ? '+' : '\u2212'}</span>
        </button>

        <div class="panel-content ${this.collapsed ? '' : 'open'}">
          <div class="section-label">Manualni akce (override)</div>
          <div class="button-group">
            <button class="action-btn" ?disabled=${this.busy}
              @click=${() => this.doAction(planBoilerHeating, 'plan')}>
              Preplanovat (debug)
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${() => this.doAction(applyBoilerPlan, 'apply')}>
              Aplikovat rucne
            </button>
            <button class="action-btn" ?disabled=${this.busy}
              @click=${() => this.doAction(cancelBoilerPlan, 'cancel')}>
              Zrusit plan
            </button>
          </div>
        </div>
      </div>
    `;
  }
}

// ============================================================================
// 2. STATUS GRID  (7 cards)
// ============================================================================

@customElement('oig-boiler-status-grid')
export class OigBoilerStatusGrid extends LitElement {
  @property({ type: Object }) data: BoilerState | null = null;

  static styles = css`
    :host { display: block; }

    h3 { ${sectionTitle}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
      gap: 10px;
    }

    .card {
      ${cardBase};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 18px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .card-value.small {
      font-size: 13px;
      font-weight: 500;
    }
  `;

  render() {
    const s = this.data;
    if (!s) return html`<div>Nacitani stavu...</div>`;

    const fmt = (v: number | null, unit: string, dec = 1) =>
      v !== null && v !== undefined ? `${v.toFixed(dec)} ${unit}` : `-- ${unit}`;

    return html`
      <h3>Stav bojleru</h3>
      <div class="grid">
        <div class="card">
          <div class="card-label">Nahrato</div>
          <div class="card-value">${fmt(s.heatingPercent, '%', 0)}</div>
        </div>
        <div class="card">
          <div class="card-label">Teplota horni</div>
          <div class="card-value">${fmt(s.tempTop, '°C')}</div>
        </div>
        ${s.tempBottom !== null ? html`
          <div class="card">
            <div class="card-label">Teplota spodni</div>
            <div class="card-value">${fmt(s.tempBottom, '°C')}</div>
          </div>
        ` : nothing}
        <div class="card">
          <div class="card-label">Energie potrebna</div>
          <div class="card-value">${fmt(s.energyNeeded, 'kWh', 2)}</div>
        </div>
        <div class="card">
          <div class="card-label">Naklady planu</div>
          <div class="card-value">${fmt(s.planCost, 'Kc', 2)}</div>
        </div>
        <div class="card">
          <div class="card-label">Dalsi ohrev</div>
          <div class="card-value small">${s.nextHeating}</div>
        </div>
        <div class="card">
          <div class="card-label">Doporuceny zdroj</div>
          <div class="card-value small">${s.recommendedSource}</div>
        </div>
      </div>
    `;
  }
}

// ============================================================================
// 3. ENERGY BREAKDOWN + RATIO BAR
// ============================================================================

@customElement('oig-boiler-energy-breakdown')
export class OigBoilerEnergyBreakdown extends LitElement {
  @property({ type: Object }) data: BoilerEnergyBreakdown | null = null;

  static styles = css`
    :host { display: block; }

    h3 { ${sectionTitle}; }

    .cards {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-bottom: 12px;
    }

    .card {
      ${cardBase};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 600;
    }

    .fve { color: #4CAF50; }
    .grid-c { color: #FF9800; }
    .alt { color: #2196F3; }

    .ratio-bar {
      display: flex;
      height: 14px;
      border-radius: 7px;
      overflow: hidden;
      background: ${u(CSS_VARS.bgSecondary)};
    }

    .ratio-fve { background: #4CAF50; }
    .ratio-grid { background: #FF9800; }
    .ratio-alt { background: #2196F3; }

    .ratio-labels {
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
    }
  `;

  render() {
    const d = this.data;
    if (!d) return nothing;

    const fmtKwh = (v: number) => `${v.toFixed(2)} kWh`;

    return html`
      <h3>Rozpad energie</h3>
      <div class="cards">
        <div class="card">
          <div class="card-label">Z FVE</div>
          <div class="card-value fve">${fmtKwh(d.fveKwh)}</div>
        </div>
        <div class="card">
          <div class="card-label">Ze site</div>
          <div class="card-value grid-c">${fmtKwh(d.gridKwh)}</div>
        </div>
        <div class="card">
          <div class="card-label">Alternativa</div>
          <div class="card-value alt">${fmtKwh(d.altKwh)}</div>
        </div>
      </div>

      <div class="ratio-bar">
        <div class="ratio-fve" style="width:${d.fvePercent.toFixed(1)}%"></div>
        <div class="ratio-grid" style="width:${d.gridPercent.toFixed(1)}%"></div>
        <div class="ratio-alt" style="width:${d.altPercent.toFixed(1)}%"></div>
      </div>
      <div class="ratio-labels">
        <span>${d.fvePercent.toFixed(0)}% FVE</span>
        <span>${d.gridPercent.toFixed(0)}% sit</span>
        <span>${d.altPercent.toFixed(0)}% alternativa</span>
      </div>
    `;
  }
}

// ============================================================================
// 4. PREDICTED USAGE
// ============================================================================

@customElement('oig-boiler-predicted-usage')
export class OigBoilerPredictedUsage extends LitElement {
  @property({ type: Object }) data: BoilerPredictedUsage | null = null;

  static styles = css`
    :host { display: block; }

    h3 { ${sectionTitle}; }

    .list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0;
      border-bottom: 1px solid ${u(CSS_VARS.divider)};
      font-size: 13px;
    }

    .item:last-child { border-bottom: none; }

    .label { color: ${u(CSS_VARS.textSecondary)}; }

    .value {
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .value.active { color: #4CAF50; }
    .value.idle { color: ${u(CSS_VARS.textSecondary)}; }
  `;

  render() {
    const d = this.data;
    if (!d) return nothing;

    const peaksStr = d.peakHours.length ? d.peakHours.map(h => `${h}h`).join(', ') : '--';
    const waterStr = d.waterLiters40c !== null ? `${d.waterLiters40c.toFixed(0)} L` : '-- L';
    const isActive = d.circulationNow.startsWith('ANO');

    return html`
      <h3>Planovane odbery</h3>
      <div class="list">
        <div class="item">
          <span class="label">Predpokladana spotreba:</span>
          <span class="value">${d.predictedTodayKwh.toFixed(2)} kWh</span>
        </div>
        <div class="item">
          <span class="label">Piky spotreby:</span>
          <span class="value">${peaksStr}</span>
        </div>
        <div class="item">
          <span class="label">Objem vody (40°C):</span>
          <span class="value">${waterStr}</span>
        </div>
        <div class="item">
          <span class="label">Doporucena cirkulace:</span>
          <span class="value">${d.circulationWindows}</span>
        </div>
        <div class="item">
          <span class="label">Cirkulace prave ted:</span>
          <span class="value ${isActive ? 'active' : 'idle'}">${d.circulationNow}</span>
        </div>
      </div>
    `;
  }
}

// ============================================================================
// 5. PLAN INFO  (9 rows)
// ============================================================================

@customElement('oig-boiler-plan-info')
export class OigBoilerPlanInfo extends LitElement {
  @property({ type: Object }) plan: BoilerPlan | null = null;
  @property({ type: Object }) forecastWindows: { fve: string; grid: string } = { fve: '--', grid: '--' };

  static styles = css`
    :host { display: block; }

    h3 { ${sectionTitle}; }

    .rows {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 5px 0;
      border-bottom: 1px solid ${u(CSS_VARS.divider)};
      font-size: 13px;
    }

    .row:last-child { border-bottom: none; }

    .row-label { color: ${u(CSS_VARS.textSecondary)}; }
    .row-value {
      font-weight: 500;
      color: ${u(CSS_VARS.textPrimary)};
      text-align: right;
      max-width: 60%;
      word-break: break-word;
    }
  `;

  render() {
    const p = this.plan;
    const fw = this.forecastWindows;

    const v = (s: string | number | null | undefined) => s ?? '--';

    return html`
      <h3>Informace o planu</h3>
      <div class="rows">
        <div class="row">
          <span class="row-label">Mix zdroju:</span>
          <span class="row-value">${v(p?.sourceDigest)}</span>
        </div>
        <div class="row">
          <span class="row-label">Slotu:</span>
          <span class="row-value">${p?.slots?.length ?? '--'}</span>
        </div>
        <div class="row">
          <span class="row-label">Topeni aktivni:</span>
          <span class="row-value">${v(p?.activeSlotCount)}</span>
        </div>
        <div class="row">
          <span class="row-label">Nejlevnejsi spot:</span>
          <span class="row-value">${v(p?.cheapestSpot)}</span>
        </div>
        <div class="row">
          <span class="row-label">Nejdrazsi spot:</span>
          <span class="row-value">${v(p?.mostExpensiveSpot)}</span>
        </div>
        <div class="row">
          <span class="row-label">FVE okna (forecast):</span>
          <span class="row-value">${fw.fve}</span>
        </div>
        <div class="row">
          <span class="row-label">Grid okna (forecast):</span>
          <span class="row-value">${fw.grid}</span>
        </div>
        <div class="row">
          <span class="row-label">Od:</span>
          <span class="row-value">${v(p?.planStart)}</span>
        </div>
        <div class="row">
          <span class="row-label">Do:</span>
          <span class="row-value">${v(p?.planEnd)}</span>
        </div>
      </div>
    `;
  }
}

// ============================================================================
// 6. TANK / GRADE THERMOMETER
// ============================================================================

@customElement('oig-boiler-tank')
export class OigBoilerTank extends LitElement {
  @property({ type: Object }) boilerState: BoilerState | null = null;
  @property({ type: Number }) targetTemp = 60;

  static styles = css`
    :host { display: block; }

    h3 { ${sectionTitle}; }

    .tank-wrapper {
      display: flex;
      align-items: stretch;
      gap: 8px;
      height: 280px;
      max-width: 200px;
      margin: 0 auto;
    }

    /* Temperature scale */
    .temp-scale {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      width: 36px;
      font-size: 10px;
      color: ${u(CSS_VARS.textSecondary)};
      text-align: right;
      padding: 2px 0;
    }

    /* Tank body */
    .tank {
      flex: 1;
      position: relative;
      border: 2px solid ${u(CSS_VARS.divider)};
      border-radius: 12px;
      overflow: hidden;
      background: ${u(CSS_VARS.bgSecondary)};
    }

    /* Water fill */
    .water {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      transition: height 0.6s ease, background 0.4s ease;
      border-radius: 0 0 10px 10px;
    }

    /* Target line */
    .target-line {
      position: absolute;
      left: 0;
      right: 0;
      height: 2px;
      background: rgba(255,255,255,0.8);
      border-top: 2px dashed ${u(CSS_VARS.accent)};
      z-index: 3;
    }

    .target-label {
      position: absolute;
      right: 4px;
      top: -14px;
      font-size: 9px;
      color: ${u(CSS_VARS.accent)};
      font-weight: 600;
    }

    /* Sensor markers */
    .sensor {
      position: absolute;
      left: 4px;
      right: 4px;
      height: 2px;
      z-index: 4;
      display: flex;
      align-items: center;
    }

    .sensor-line {
      flex: 1;
      height: 1px;
      background: rgba(255,255,255,0.6);
    }

    .sensor-label {
      font-size: 9px;
      font-weight: 600;
      color: #fff;
      background: rgba(0,0,0,0.45);
      padding: 1px 4px;
      border-radius: 3px;
      white-space: nowrap;
    }

    .sensor.top .sensor-label { color: #fff3e0; }
    .sensor.bottom .sensor-label { color: #e3f2fd; }

    /* Grade label */
    .grade-label {
      text-align: center;
      margin-top: 8px;
      font-size: 14px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }
  `;

  render() {
    const s = this.boilerState;
    if (!s) return html`<div>Nacitani...</div>`;

    const minT = 10, maxT = 70;
    const mapPct = (temp: number) => clampPercent(((temp - minT) / (maxT - minT)) * 100);

    const waterHeight = s.heatingPercent ?? 0;
    const topPct = s.tempTop !== null ? mapPct(s.tempTop) : null;
    const bottomPct = s.tempBottom !== null ? mapPct(s.tempBottom) : null;
    const targetPct = mapPct(this.targetTemp);

    const topColor = tempToColor(s.tempTop ?? this.targetTemp);
    const bottomColor = tempToColor(s.tempBottom ?? 10);
    const waterBg = `linear-gradient(180deg, ${topColor} 0%, ${bottomColor} 100%)`;

    const gradeText = s.heatingPercent !== null
      ? `${s.heatingPercent.toFixed(0)}% nahrato`
      : '-- % nahrato';

    const scaleMarks = [70, 60, 50, 40, 30, 20, 10];

    return html`
      <h3>Vizualizace bojleru</h3>

      <div class="tank-wrapper">
        <div class="temp-scale">
          ${scaleMarks.map(t => html`<span>${t}°C</span>`)}
        </div>

        <div class="tank">
          <div class="water" style="height:${waterHeight}%; background:${waterBg}"></div>

          <div class="target-line" style="bottom:${targetPct}%">
            <span class="target-label">Cil</span>
          </div>

          ${topPct !== null ? html`
            <div class="sensor top" style="bottom:${topPct}%">
              <span class="sensor-label">${s.tempTop!.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          ` : nothing}

          ${bottomPct !== null ? html`
            <div class="sensor bottom" style="bottom:${bottomPct}%">
              <span class="sensor-label">${s.tempBottom!.toFixed(1)}°C</span>
              <span class="sensor-line"></span>
            </div>
          ` : nothing}
        </div>
      </div>

      <div class="grade-label">${gradeText}</div>
    `;
  }
}

// ============================================================================
// 7. CATEGORY SELECTOR
// ============================================================================

@customElement('oig-boiler-category-select')
export class OigBoilerCategorySelect extends LitElement {
  @property({ type: String }) current = '';
  @property({ type: Array }) available: string[] = [];

  static styles = css`
    :host { display: block; margin: 12px 0; }

    .row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    label {
      font-size: 13px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }

    select {
      padding: 6px 10px;
      font-size: 13px;
      border: 1px solid ${u(CSS_VARS.divider)};
      border-radius: 6px;
      background: ${u(CSS_VARS.cardBg)};
      color: ${u(CSS_VARS.textPrimary)};
      cursor: pointer;
    }
  `;

  private onChange(e: Event) {
    const val = (e.target as HTMLSelectElement).value;
    this.dispatchEvent(new CustomEvent('category-change', {
      detail: { category: val },
      bubbles: true, composed: true,
    }));
  }

  render() {
    const options = this.available.length
      ? this.available
      : Object.keys(CATEGORY_LABELS);

    return html`
      <div class="row">
        <label>Profil:</label>
        <select @change=${this.onChange}>
          ${options.map(cat => html`
            <option value=${cat} ?selected=${cat === this.current}>
              ${CATEGORY_LABELS[cat] || cat}
            </option>
          `)}
        </select>
      </div>
    `;
  }
}

// ============================================================================
// 8. HEATMAP GRID (7x24 DOM)
// ============================================================================

@customElement('oig-boiler-heatmap-grid')
export class OigBoilerHeatmapGrid extends LitElement {
  @property({ type: Array }) data: BoilerHeatmapRow[] = [];

  static styles = css`
    :host { display: block; }

    h3 { ${sectionTitle}; }

    .wrapper {
      ${cardBase};
      overflow-x: auto;
    }

    .grid {
      display: grid;
      grid-template-columns: 32px repeat(24, 1fr);
      gap: 2px;
      min-width: 500px;
    }

    .hour-header {
      font-size: 9px;
      color: ${u(CSS_VARS.textSecondary)};
      text-align: center;
      padding: 2px 0;
    }

    .day-label {
      font-size: 10px;
      font-weight: 600;
      color: ${u(CSS_VARS.textSecondary)};
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .cell {
      height: 18px;
      border-radius: 2px;
      cursor: default;
      transition: opacity 0.15s;
    }
    .cell:hover { opacity: 0.75; }

    .cell.none   { background: ${u(CSS_VARS.bgSecondary)}; }
    .cell.low    { background: #c8e6c9; }
    .cell.medium { background: #ff9800; }
    .cell.high   { background: #f44336; }

    .legend {
      display: flex;
      gap: 14px;
      margin-top: 10px;
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .legend-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .legend-dot {
      width: 12px;
      height: 12px;
      border-radius: 2px;
    }
  `;

  render() {
    if (!this.data.length) return nothing;

    // Calculate thresholds
    const allVals = this.data.flatMap(r => r.hours);
    const maxVal = Math.max(...allVals, 0.1);
    const lowT = maxVal * 0.3;
    const highT = maxVal * 0.7;

    const hours = Array.from({ length: 24 }, (_, i) => i);

    const cellClass = (val: number) => {
      if (val === 0) return 'none';
      if (val < lowT) return 'low';
      if (val < highT) return 'medium';
      return 'high';
    };

    return html`
      <h3>Mapa spotreby (7 dni)</h3>
      <div class="wrapper">
        <div class="grid">
          <!-- Header row -->
          <div></div>
          ${hours.map(h => html`<div class="hour-header">${h}</div>`)}

          <!-- Day rows -->
          ${this.data.map(row => html`
            <div class="day-label">${row.day}</div>
            ${row.hours.map((val, h) => html`
              <div class="cell ${cellClass(val)}"
                   title="${row.day} ${h}h: ${val.toFixed(2)} kWh"></div>
            `)}
          `)}
        </div>

        <div class="legend">
          <span class="legend-item"><span class="legend-dot" style="background:#c8e6c9"></span> Nizka</span>
          <span class="legend-item"><span class="legend-dot" style="background:#ff9800"></span> Stredni</span>
          <span class="legend-item"><span class="legend-dot" style="background:#f44336"></span> Vysoka</span>
        </div>
      </div>
    `;
  }
}

// ============================================================================
// 9. STATS CARDS (4 large)
// ============================================================================

@customElement('oig-boiler-stats-cards')
export class OigBoilerStatsCards extends LitElement {
  @property({ type: Object }) plan: BoilerPlan | null = null;

  static styles = css`
    :host { display: block; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
      gap: 12px;
    }

    .card {
      ${cardBase};
      padding: 14px;
    }

    .card-title {
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-bottom: 6px;
    }

    .card-value {
      font-size: 22px;
      font-weight: 700;
    }

    .total { color: ${u(CSS_VARS.textPrimary)}; }
    .fve { color: #4CAF50; }
    .grid-c { color: #FF9800; }
    .cost { color: #2196F3; }
  `;

  render() {
    const p = this.plan;
    const fmt = (v: number | undefined, dec = 2) =>
      v !== undefined && v !== null ? v.toFixed(dec) : '-';

    return html`
      <div class="grid">
        <div class="card">
          <div class="card-title">Celkova spotreba dnes</div>
          <div class="card-value total">${fmt(p?.totalConsumptionKwh)} kWh</div>
        </div>
        <div class="card">
          <div class="card-title">Z FVE</div>
          <div class="card-value fve">${fmt(p?.fveKwh)} kWh</div>
        </div>
        <div class="card">
          <div class="card-title">Ze site</div>
          <div class="card-value grid-c">${fmt(p?.gridKwh)} kWh</div>
        </div>
        <div class="card">
          <div class="card-title">Odhadovana cena</div>
          <div class="card-value cost">${fmt(p?.estimatedCostCzk)} Kc</div>
        </div>
      </div>
    `;
  }
}

// ============================================================================
// 10. PROFILING STATS  (CSS bar chart + 4 stat items)
// ============================================================================

@customElement('oig-boiler-profiling')
export class OigBoilerProfiling extends LitElement {
  @property({ type: Object }) data: BoilerProfilingData | null = null;

  static styles = css`
    :host { display: block; }

    h3 { ${sectionTitle}; }

    .wrapper {
      ${cardBase};
    }

    /* CSS-only bar chart */
    .chart {
      display: flex;
      align-items: flex-end;
      gap: 2px;
      height: 120px;
      padding: 0 2px;
      margin-bottom: 10px;
    }

    .bar-col {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      height: 100%;
      justify-content: flex-end;
    }

    .bar {
      width: 100%;
      min-width: 4px;
      max-width: 18px;
      border-radius: 3px 3px 0 0;
      transition: height 0.4s ease;
    }

    .bar.normal { background: rgba(33, 150, 243, 0.6); }
    .bar.peak { background: rgba(244, 67, 54, 0.6); }

    .bar-label {
      font-size: 8px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-top: 3px;
    }

    /* Stats row */
    .stats {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
      padding-top: 10px;
      border-top: 1px solid ${u(CSS_VARS.divider)};
    }

    .stat-item {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
    }

    .stat-label { color: ${u(CSS_VARS.textSecondary)}; }
    .stat-value { font-weight: 600; color: ${u(CSS_VARS.textPrimary)}; }
  `;

  render() {
    const d = this.data;
    if (!d) return nothing;

    const maxVal = Math.max(...d.hourlyAvg, 0.01);
    const peakSet = new Set(d.peakHours);
    const peaksStr = d.peakHours.length ? d.peakHours.map(h => `${h}h`).join(', ') : '--';
    const confStr = d.confidence !== null ? `${Math.round(d.confidence * 100)} %` : '-- %';

    return html`
      <h3>Profil spotreby (tyden)</h3>
      <div class="wrapper">
        <div class="chart">
          ${d.hourlyAvg.map((val, i) => {
            const heightPct = maxVal > 0 ? (val / maxVal) * 100 : 0;
            const isPeak = peakSet.has(i);
            return html`
              <div class="bar-col" title="${i}h: ${val.toFixed(3)} kWh">
                <div class="bar ${isPeak ? 'peak' : 'normal'}"
                     style="height:${heightPct}%"></div>
                <span class="bar-label">${i}</span>
              </div>
            `;
          })}
        </div>

        <div class="stats">
          <div class="stat-item">
            <span class="stat-label">Dnes:</span>
            <span class="stat-value">${d.predictedTotalKwh.toFixed(2)} kWh</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Piky:</span>
            <span class="stat-value">${peaksStr}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Spolehlivost:</span>
            <span class="stat-value">${confStr}</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Sledovano:</span>
            <span class="stat-value">${d.daysTracked} dni</span>
          </div>
        </div>
      </div>
    `;
  }
}

// ============================================================================
// 11. CONFIG (6 profile cards)
// ============================================================================

@customElement('oig-boiler-config-section')
export class OigBoilerConfigSection extends LitElement {
  @property({ type: Object }) config: BoilerConfig | null = null;

  static styles = css`
    :host { display: block; }

    h3 { ${sectionTitle}; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }

    .card {
      ${cardBase};
      padding: 12px;
      text-align: center;
    }

    .card-label {
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-bottom: 4px;
    }

    .card-value {
      font-size: 16px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }
  `;

  render() {
    const c = this.config;
    if (!c) return nothing;

    const v = (val: string | number | null | undefined, unit = '') =>
      val !== null && val !== undefined ? `${val}${unit ? ' ' + unit : ''}` : `--${unit ? ' ' + unit : ''}`;

    return html`
      <h3>Profil bojleru</h3>
      <div class="grid">
        <div class="card">
          <div class="card-label">Objem</div>
          <div class="card-value">${v(c.volumeL, 'L')}</div>
        </div>
        <div class="card">
          <div class="card-label">Vykon topeni</div>
          <div class="card-value">${v(c.heaterPowerW, 'W')}</div>
        </div>
        <div class="card">
          <div class="card-label">Cilova teplota</div>
          <div class="card-value">${v(c.targetTempC, '°C')}</div>
        </div>
        <div class="card">
          <div class="card-label">Deadline</div>
          <div class="card-value">${c.deadlineTime}</div>
        </div>
        <div class="card">
          <div class="card-label">Stratifikace</div>
          <div class="card-value">${c.stratificationMode}</div>
        </div>
        <div class="card">
          <div class="card-label">Koeficient K</div>
          <div class="card-value">${c.kCoefficient}</div>
        </div>
      </div>
    `;
  }
}

// ============================================================================
// 12. DEMAND MAP (Mapa odběrů) — F2
// ============================================================================

/** Convert slot index (0-95) to HH:MM display string */
function slotToHhmm(slotIndex: number, slotDurationMin: number): string {
  const totalMin = slotIndex * slotDurationMin;
  const h = Math.floor(totalMin / 60) % 24;
  const m = totalMin % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Emoji for window label */
function windowEmoji(label: string): string {
  switch (label) {
    case 'morning': return '🌅';
    case 'afternoon': return '☀️';
    case 'evening': return '🌆';
    case 'night': return '🌙';
    default: return '💧';
  }
}

@customElement('oig-boiler-demand-map')
export class OigBoilerDemandMap extends LitElement {
  @property({ attribute: false }) data: DemandMapData | null = null;
  @property({ type: String }) lang: Lang = 'cs';

  static styles = css`
    :host { display: block; }

    .card {
      ${cardBase};
      padding: 16px;
    }

    .heading {
      ${sectionTitle};
      margin-bottom: 14px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    /* Empty / collecting state */
    .empty-state {
      text-align: center;
      padding: 24px 0;
      color: ${u(CSS_VARS.textSecondary)};
      font-size: 13px;
    }

    /* Heatmap: 48 columns (2 slots aggregated per column) */
    .heatmap-wrap {
      overflow-x: auto;
    }

    /* Mockup .heat: row of equal-height rounded cells, red intensity ramp */
    .heatmap {
      display: grid;
      grid-template-columns: repeat(48, 1fr);
      gap: 1.5px;
      height: 30px;
      min-width: 280px;
      margin-bottom: 5px;
    }

    .heatmap-col {
      display: flex;
      height: 100%;
    }

    .heatmap-bar {
      width: 100%;
      height: 100%;
      border-radius: 2px;
      transition: opacity 0.15s;
    }

    .heatmap-bar:hover { opacity: 0.75; }

    /* Mockup .hl: five labels spread across the strip */
    .hour-axis {
      display: flex;
      justify-content: space-between;
      min-width: 280px;
      margin-bottom: 8px;
    }

    .hour-label {
      font-size: 9px;
      color: ${u(CSS_VARS.textSecondary)};
      opacity: 0.7;
    }

    /* Readiness chips */
    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 10px;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 10px;
      border-radius: 999px;
      background: rgba(33,150,243,0.12);
      color: ${u(CSS_VARS.textPrimary)};
      font-size: 12px;
      font-weight: 500;
      white-space: nowrap;
    }

    .chip-time {
      font-weight: 700;
      color: ${u(CSS_VARS.accent)};
    }

    /* Meta line — now inline in heading */
    .meta-inline {
      font-size: 10.5px;
      opacity: 0.55;
      font-weight: 400;
      margin-left: auto;
    }

    /* Legacy meta block (kept for backwards compat if still used elsewhere) */
    .meta {
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
    }

    .confidence-badge {
      display: inline-block;
      padding: 1px 7px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
      background: rgba(76,175,80,0.15);
      color: #2e7d32;
    }

    .confidence-badge.low {
      background: rgba(255,152,0,0.18);
      color: #b75d00;
    }

    .plan-badge {
      display: inline-block;
      padding: 1px 7px;
      border-radius: 6px;
      font-size: 10px;
      font-weight: 600;
      background: rgba(76,175,80,0.15);
      color: #2e7d32;
    }

    .plan-badge.learning {
      background: rgba(255,152,0,0.18);
      color: #b75d00;
    }

    .fallback-notice {
      display: inline-block;
      padding: 1px 7px;
      border-radius: 6px;
      font-size: 10px;
      background: rgba(255,152,0,0.12);
      color: #b75d00;
    }
  `;

  render() {
    const lang = this.lang;
    const heading = t('boiler.demand_map.heading', lang);

    if (!this.data) {
      return html`
        <div class="card" data-testid="boiler-demand-map">
          <div class="heading">💧 ${heading}</div>
          <div class="empty-state">${t('boiler.demand_map.empty', lang)}</div>
        </div>
      `;
    }

    const dm = this.data;
    const slotDur = dm.slotDurationMin || 15;

    // Aggregate 96 slots → 48 columns (pair of slots per column)
    const numCols = 48;
    const slotsPerCol = Math.ceil(dm.slotsP80.length / numCols);
    const colsP80: number[] = [];
    const colsP50: number[] = [];
    for (let c = 0; c < numCols; c++) {
      let sumP80 = 0;
      let sumP50 = 0;
      for (let s = 0; s < slotsPerCol; s++) {
        const idx = c * slotsPerCol + s;
        sumP80 += dm.slotsP80[idx] ?? 0;
        sumP50 += dm.slotsP50[idx] ?? 0;
      }
      colsP80.push(sumP80);
      colsP50.push(sumP50);
    }

    const maxVal = Math.max(...colsP80, 0.001);

    // Mockup color ramp: red-orange intensity, faint grey baseline for ~zero.
    const colColor = (val: number) => {
      const v = Math.min(1, val / maxVal);
      if (v < 0.08) return 'rgba(255,255,255,.05)';
      const r = Math.round(120 + 135 * v);
      const g = Math.round(60 + 50 * (1 - v));
      return `rgba(${r}, ${g}, 60, ${(0.12 + 0.85 * v).toFixed(2)})`;
    };

    const metaStr = (t('boiler.demand_map.meta', lang) as string)
      .replace('{n}', String(dm.profile.daysUsed))
      .replace('{cat}', CATEGORY_LABELS[dm.profile.category] || dm.profile.label);
    const confidenceStr = `${t('boiler.demand_map.confidence', lang)} ${Math.round(dm.confidence * 100)} %`;
    const planBadge = dm.drivesPlan
      ? html`<span class="plan-badge" data-testid="demand-plan-badge" title="${t('boiler.demand_map.confidence', lang)} ≥ ${Math.round(dm.minConfidence * 100)} %">${t('boiler.demand_map.drives_plan', lang)}</span>`
      : html`<span class="plan-badge learning" data-testid="demand-plan-badge" title="${t('boiler.demand_map.confidence', lang)} &lt; ${Math.round(dm.minConfidence * 100)} %">${t('boiler.demand_map.learning', lang)}</span>`;

    return html`
      <div class="card" data-testid="boiler-demand-map">
        <div class="heading">
          💧 ${heading}
          ${planBadge}
          <span class="meta-inline">${metaStr} · ${confidenceStr}${dm.profile.fallbackUsed ? html` · <span class="fallback-notice">${t('boiler.demand_map.fallback_notice', lang)}</span>` : nothing}</span>
        </div>

        <div class="heatmap-wrap">
          <div class="heatmap">
            ${colsP80.map((val, ci) => {
              const tipTime = slotToHhmm(ci * slotsPerCol, slotDur);
              const tipKwh = val.toFixed(2);
              return html`
                <div class="heatmap-col" title="${tipTime}: ${tipKwh} kWh">
                  <div class="heatmap-bar" style="background:${colColor(val)};"></div>
                </div>
              `;
            })}
          </div>

          <div class="hour-axis">
            ${['00:00', '06:00', '12:00', '18:00', '24:00'].map(
              lbl => html`<span class="hour-label">${lbl}</span>`,
            )}
          </div>
        </div>

        ${dm.windows.length > 0 ? html`
          <div class="chips">
            ${dm.windows.slice(0, 3).map(w => {
              const timeStr = slotToHhmm(w.slotIndex, slotDur);
              const emoji = windowEmoji(w.label);
              const litersRounded = Math.round(w.liters);
              const kwhFmt = w.p80Kwh.toFixed(1);
              return html`
                <span class="chip">
                  ${emoji}
                  <span class="chip-time">${timeStr}</span>
                  &ge; <b>${litersRounded} L</b> (${kwhFmt} kWh)
                </span>
              `;
            })}
          </div>
        ` : nothing}
      </div>
    `;
  }
}

// ============================================================================
// 13. LEGACY WRAPPERS (keep old tag names working for backwards compat)
// ============================================================================

@customElement('oig-boiler-state')
export class OigBoilerState extends LitElement {
  @property({ type: Object }) state: BoilerState | null = null;

  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
    }

    .temp-display { text-align: center; }

    .current-temp {
      font-size: 36px;
      font-weight: 600;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .target-temp {
      font-size: 14px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .status-indicator {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .status-dot {
      width: 12px;
      height: 12px;
      border-radius: 50%;
    }

    .status-dot.heating {
      background: #f44336;
      animation: pulse 1s infinite;
    }

    .status-dot.idle { background: #4caf50; }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }

    .next-info {
      margin-left: auto;
      text-align: right;
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
    }
  `;

  render() {
    if (!this.state) return html`<div>Nacitani...</div>`;

    return html`
      <div class="temp-display">
        <div class="current-temp">${this.state.currentTemp != null ? `${this.state.currentTemp}°C` : '--'}</div>
        <div class="target-temp">Cil: ${this.state.targetTemp}°C</div>
      </div>

      <div class="status-indicator">
        <div class="status-dot ${this.state.heating ? 'heating' : 'idle'}"></div>
        <span>${this.state.heating ? 'Topi' : 'Necinny'}</span>
      </div>

      ${this.state.nextProfile ? html`
        <div class="next-info">
          <div>Dalsi: ${this.state.nextProfile}</div>
          <div>${this.state.nextStart}</div>
        </div>
      ` : null}
    `;
  }
}

@customElement('oig-boiler-heatmap')
export class OigBoilerHeatmap extends LitElement {
  @property({ type: Array }) data: BoilerHourData[] = [];

  static styles = css`
    :host { display: block; }
  `;

  render() {
    // Legacy: kept for backwards compat, but the full grid is now oig-boiler-heatmap-grid
    return nothing;
  }
}

@customElement('oig-boiler-profiles')
export class OigBoilerProfiles extends LitElement {
  @property({ type: Array }) profiles: BoilerProfile[] = [];
  @property({ type: Boolean }) editMode = false;

  static styles = css`
    :host { display: block; }
  `;

  render() {
    // Legacy: kept for backwards compat, profiles are now shown inline in the full tab
    return nothing;
  }
}

@customElement('oig-boiler-status-panel')
// TODO: legacy cleanup after boiler redesign consumers are removed
export class OigBoilerStatusPanel extends LitElement {
  @property({ attribute: false }) data: BoilerV2Status | null = null;
  @property({ type: String }) lang: Lang = 'cs';

  static styles = css`
    :host { display: block; }
    .panel { display: grid; gap: 12px; padding: 16px; border-radius: 12px; background: var(--card-background-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .heading { font-size: 1.05rem; font-weight: 600; color: var(--primary-text-color, #222); }
    .pill { padding: 2px 10px; border-radius: 999px; font-size: 0.85rem; font-weight: 600; }
    .pill.heating { background: rgba(255,152,0,0.15); color: #b75d00; }
    .pill.idle { background: rgba(76,175,80,0.15); color: #2e7d32; }
    .pill.unknown { background: rgba(120,120,120,0.15); color: #555; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
    .field { display: flex; flex-direction: column; gap: 2px; }
    .field label { font-size: 0.75rem; color: var(--secondary-text-color, #666); text-transform: uppercase; letter-spacing: 0.04em; }
    .field span { font-size: 1.05rem; color: var(--primary-text-color, #111); font-variant-numeric: tabular-nums; }
    .comfort { display: inline-flex; align-items: center; gap: 6px; font-weight: 600; }
    .comfort.ok { color: #2e7d32; }
    .comfort.bad { color: #c62828; }
    .comfort.unknown { color: #777; }
    .degraded-list { display: flex; flex-wrap: wrap; gap: 6px; }
    .degraded-tag { padding: 2px 8px; border-radius: 6px; background: rgba(244,67,54,0.12); color: #b71c1c; font-size: 0.8rem; }
    .degraded-banner { padding: 6px 10px; border-radius: 8px; background: rgba(244,67,54,0.15); color: #b71c1c; font-weight: 600; font-size: 0.85rem; }
  `;

  render() {
    const d = this.data;
    const lang = this.lang;
    const stateKey = (d?.currentState ?? 'unknown') as 'heating' | 'idle' | 'unknown';
    const stateLabel = t(`boiler.status.${stateKey}` as any, lang);
    const comfortLabel = d?.comfortSatisfied === true
      ? t('boiler.status.comfort_satisfied', lang)
      : d?.comfortSatisfied === false
        ? t('boiler.status.comfort_unsatisfied', lang)
        : t('boiler.status.comfort_unknown', lang);
    const comfortClass = d?.comfortSatisfied === true ? 'ok' : d?.comfortSatisfied === false ? 'bad' : 'unknown';
    const flags = d?.degradedFlags ?? [];

    return html`
      <div data-testid="boiler-status-panel" class="panel">
        <div class="row">
          <div class="heading">${t('boiler.status.heading', lang)}</div>
          <span data-testid="boiler-status-current-state" class="pill ${stateKey}">${stateLabel}</span>
        </div>
        <div class="degraded-banner" ?hidden=${!d?.degraded}>${t('boiler.status.degraded', lang)}</div>
        <div class="grid">
          <div class="field"><label>${t('boiler.status.temp_top', lang)}</label><span>${formatTempC(d?.temperatureTop ?? null)}</span></div>
          <div class="field"><label>${t('boiler.status.temp_bottom', lang)}</label><span>${formatTempC(d?.temperatureBottom ?? null)}</span></div>
          <div class="field"><label>${t('boiler.status.selected_source', lang)}</label><span data-testid="boiler-status-selected-source">${sourceLabel(d?.selectedSource ?? null, lang)}</span></div>
          <div class="field"><label>${t('boiler.status.actuated_source', lang)}</label><span data-testid="boiler-status-actuated-source">${sourceLabel(d?.actuatedSource ?? null, lang)}</span></div>
          <div class="field"><label>${t('boiler.status.energy_needed', lang)}</label><span>${formatKwh(d?.energyNeededKwh ?? null)}</span></div>
          <div class="field"><label>${t('boiler.status.last_update', lang)}</label><span>${d?.lastUpdate ?? '—'}</span></div>
        </div>
        <div data-testid="boiler-status-comfort" class="comfort ${comfortClass}">${comfortLabel}</div>
        ${flags.length
          ? html`<div data-testid="boiler-status-degraded-flags" class="degraded-list">${flags.map((f) => html`<span class="degraded-tag">${reasonLabel(f, lang)}</span>`)}</div>`
          : ''}
      </div>
    `;
  }
}

@customElement('oig-boiler-plan-timeline')
// TODO: legacy cleanup after boiler redesign consumers are removed
export class OigBoilerPlanTimeline extends LitElement {
  @property({ attribute: false }) slots: BoilerV2PlanSlot[] = [];
  @property({ type: String }) lang: 'cs' | 'en' = 'cs';

  static styles = css`
    :host { display: block; }
    .wrap { padding: 16px; border-radius: 12px; background: var(--card-background-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.08); }
    .heading { font-size: 1.05rem; font-weight: 600; margin-bottom: 12px; }
    .empty { color: var(--secondary-text-color, #666); padding: 24px 0; text-align: center; }
    table { width: 100%; border-collapse: collapse; font-variant-numeric: tabular-nums; }
    th, td { padding: 6px 8px; text-align: left; border-bottom: 1px solid var(--divider-color, #eee); font-size: 0.9rem; }
    th { font-size: 0.7rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--secondary-text-color, #666); font-weight: 600; }
    .src { display: inline-block; padding: 2px 8px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; }
    .src.fve { background: rgba(76,175,80,0.15); color: #2e7d32; }
    .src.grid { background: rgba(255,152,0,0.15); color: #b75d00; }
    .src.alternative { background: rgba(33,150,243,0.15); color: #0d47a1; }
    .src.other { background: rgba(120,120,120,0.15); color: #555; }
    .badge { padding: 1px 6px; border-radius: 4px; font-size: 0.75rem; }
    .badge.ok { background: rgba(76,175,80,0.15); color: #2e7d32; }
    .badge.bad { background: rgba(244,67,54,0.15); color: #b71c1c; }
  `;

  private srcClass(s: string | null): string {
    if (!s) return 'other';
    return ['fve', 'grid', 'alternative', 'overflow', 'discharge'].includes(s) ? s : 'other';
  }

  render() {
    const lang = this.lang;
    if (!this.slots || this.slots.length === 0) {
      return html`<div data-testid="boiler-plan-timeline" class="wrap"><div class="heading">${t('boiler.timeline.heading', lang)}</div><div class="empty">${t('boiler.timeline.empty', lang)}</div></div>`;
    }
    return html`
      <div data-testid="boiler-plan-timeline" class="wrap">
        <div class="heading">${t('boiler.timeline.heading', lang)}</div>
        <table>
          <thead>
            <tr>
              <th>${t('boiler.timeline.col_time', lang)}</th>
              <th>${t('boiler.timeline.col_source', lang)}</th>
              <th>${t('boiler.timeline.col_temp', lang)}</th>
              <th>${t('boiler.timeline.col_kwh', lang)}</th>
              <th>${t('boiler.timeline.col_cost', lang)}</th>
              <th>${t('boiler.timeline.col_pv', lang)}</th>
            </tr>
          </thead>
          <tbody>
            ${this.slots.map((s) => {
              const comfortBadge = s.comfortSatisfied === true
                ? html`<span class="badge ok">${t('boiler.timeline.comfort_ok', lang)}</span>`
                : s.comfortSatisfied === false
                  ? html`<span class="badge bad">${t('boiler.timeline.comfort_gap', lang)}</span>`
                  : '';
              return html`
                <tr>
                  <td>${formatTimeRange(s.start, s.end)}</td>
                  <td><span class="src ${this.srcClass(s.recommendedSource)}">${sourceLabel(s.recommendedSource, lang)}</span></td>
                  <td>${formatTempC(s.expectedTempTopC ?? null)} ${comfortBadge}</td>
                  <td>${formatKwh(s.consumptionKwh)}</td>
                  <td>${formatCzk(s.estimatedCostCzk ?? null)}</td>
                  <td>${formatPercent(s.pvShare ?? null)}</td>
                </tr>
              `;
            })}
          </tbody>
        </table>
      </div>
    `;
  }
}

const FRESHNESS_REASONS = new Set([
  'input_stale_price',
  'input_stale_pv',
  'input_stale_temperature',
  'input_missing_recorder',
  'input_adapter_error',
]);

@customElement('oig-boiler-source-explanation')
// TODO: legacy cleanup after boiler redesign consumers are removed
export class OigBoilerSourceExplanation extends LitElement {
  @property({ attribute: false }) explanation: BoilerV2Explanation | null = null;
  @property({ type: String }) lang: 'cs' | 'en' = 'cs';

  static styles = css`
    :host { display: block; }
    .wrap { padding: 16px; border-radius: 12px; background: var(--card-background-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.08); display: grid; gap: 12px; }
    .heading { font-size: 1.05rem; font-weight: 600; }
    .section { display: flex; flex-direction: column; gap: 6px; }
    .section h4 { margin: 0; font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.04em; color: var(--secondary-text-color, #666); font-weight: 600; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chip { padding: 2px 8px; border-radius: 6px; font-size: 0.8rem; background: rgba(33,150,243,0.12); color: #0d47a1; }
    .chip.fresh { background: rgba(76,175,80,0.15); color: #2e7d32; }
    .chip.stale { background: rgba(255,152,0,0.18); color: #b75d00; }
    .chip.degraded { background: rgba(244,67,54,0.15); color: #b71c1c; }
    .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 8px; }
    .meta { display: flex; flex-direction: column; }
    .meta label { font-size: 0.72rem; text-transform: uppercase; color: var(--secondary-text-color, #666); }
    .meta span { font-size: 0.95rem; font-variant-numeric: tabular-nums; }
    .empty { color: var(--secondary-text-color, #666); }
  `;

  render() {
    const e = this.explanation;
    const lang = this.lang;
    if (!e) {
      return html`<div data-testid="boiler-source-explanation" class="wrap"><div class="heading">${t('boiler.explanation.heading', lang)}</div><div class="empty">${t('boiler.explanation.empty', lang)}</div></div>`;
    }
    const reasonCodes = e.reasonCodes ?? [];
    const freshnessFromReasons = reasonCodes.filter((c) => FRESHNESS_REASONS.has(c));
    const otherReasons = reasonCodes.filter((c) => !FRESHNESS_REASONS.has(c));
    const degraded = e.degradedReasons ?? [];

    return html`
      <div data-testid="boiler-source-explanation" class="wrap">
        <div class="heading">${t('boiler.explanation.heading', lang)}</div>

        <div class="section" data-testid="boiler-explanation-freshness">
          <h4>${t('boiler.explanation.freshness_heading', lang)}</h4>
          ${freshnessFromReasons.length === 0
            ? html`<div class="chips"><span class="chip fresh">${t('boiler.explanation.freshness_fresh', lang)}</span></div>`
            : html`<div class="chips">${freshnessFromReasons.map((c) => html`<span class="chip stale">${reasonLabel(c, lang)}</span>`)}</div>`}
        </div>

        <div class="section" data-testid="boiler-explanation-degraded">
          <h4>${t('boiler.explanation.degraded_heading', lang)}</h4>
          ${degraded.length === 0
            ? html`<div class="empty">—</div>`
            : html`<div class="chips">${degraded.map((c) => html`<span class="chip degraded">${reasonLabel(c, lang)}</span>`)}</div>`}
        </div>

        ${otherReasons.length
          ? html`<div class="section" data-testid="boiler-explanation-reasons"><h4>Reason codes</h4><div class="chips">${otherReasons.map((c) => html`<span class="chip">${reasonLabel(c, lang)}</span>`)}</div></div>`
          : ''}

        <div class="meta-grid" data-testid="boiler-explanation-meta">
          ${e.planCreatedAt ? html`<div class="meta"><label>${t('boiler.explanation.plan_created', lang)}</label><span>${e.planCreatedAt}</span></div>` : ''}
          ${e.planValidUntil ? html`<div class="meta"><label>${t('boiler.explanation.plan_valid_until', lang)}</label><span>${e.planValidUntil}</span></div>` : ''}
          ${e.dataAgeSecs != null ? html`<div class="meta"><label>${t('boiler.explanation.data_age', lang)}</label><span>${formatDataAge(e.dataAgeSecs)}</span></div>` : ''}
          ${e.unsatisfiedComfortGapC != null ? html`<div class="meta"><label>${t('boiler.explanation.unsatisfied_gap', lang)}</label><span>${e.unsatisfiedComfortGapC} °C</span></div>` : ''}
          ${e.temperatureAtDeadlineC != null ? html`<div class="meta"><label>${t('boiler.explanation.temp_at_deadline', lang)}</label><span>${formatTempC(e.temperatureAtDeadlineC)}</span></div>` : ''}
        </div>
      </div>
    `;
  }
}

// CONTRACT (parent brief, BE side): ttl_minutes int 15-720, reason str<=200.
// NOTE: the pre-existing `OVERRIDE_TTL_MAX_MINUTES` constant (types.ts) still
// says 1440 — out of this unit's file scope, left as-is (see report). The
// `<input max>` below is fixed to 720 to match the CONTRACT bound enforced
// in `validate()`.
const OVERRIDE_CONTRACT_TTL_MIN = 15;
const OVERRIDE_CONTRACT_TTL_MAX = 720;
const OVERRIDE_CONTRACT_REASON_MAX_LEN = 200;

@customElement('oig-boiler-override-panel')
export class OigBoilerOverridePanel extends LitElement {
  @property({ attribute: false }) identity: BoilerV2Identity = { entryId: null, boxId: null, available: false };
  @property({ attribute: false }) currentOverride: { active: boolean; ttlMinutes: number; reason: string; capabilityAvailable: boolean } | null = null;
  @property({ type: String }) lang: 'cs' | 'en' = 'cs';

  @state() private effectiveOverride: { active: boolean; ttlMinutes: number; reason: string; capabilityAvailable: boolean } | null = null;
  @state() private ttlMinutes: number = OVERRIDE_TTL_DEFAULT_MINUTES;
  @state() private reasonText = '';
  @state() private validationError: string | null = null;
  @state() private requestError: string | null = null;
  @state() private submitting = false;
  /** True only once a mutate call itself 404s — a truly-absent capability, never set for a transient failure. */
  @state() private endpointMissing = false;
  @state() private overrideUntil: string | null = null;

  willUpdate(changed: Map<string, unknown>) {
    // A fresh prop from the parent poll wins over any local optimistic update.
    if (changed.has('currentOverride')) {
      this.effectiveOverride = null;
      // BoilerV2ManualOverride carries no `until` field, so the poll can't refresh
      // this — only drop it once the poll confirms the override is no longer active.
      if (!this.currentOverride?.active) {
        this.overrideUntil = null;
      }
    }
  }

  static styles = css`
    :host { display: block; }
    .wrap { padding: 16px; border-radius: 12px; background: var(--card-background-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.08); display: grid; gap: 10px; opacity: 0.95; }
    .heading { font-size: 1rem; font-weight: 600; }
    .subtitle { font-size: 0.85rem; color: var(--secondary-text-color, #666); }
    label { display: flex; flex-direction: column; gap: 4px; font-size: 0.85rem; }
    input, textarea { font: inherit; padding: 6px 8px; border: 1px solid var(--divider-color, #ccc); border-radius: 6px; background: var(--secondary-background-color, #fafafa); color: var(--primary-text-color); }
    button { padding: 8px 14px; border-radius: 6px; border: 1px solid var(--divider-color, #ccc); background: var(--primary-color, #1976d2); color: #fff; font-weight: 600; cursor: pointer; }
    button[disabled] { opacity: 0.5; cursor: not-allowed; }
    button.cancel { background: var(--secondary-background-color, #fafafa); color: var(--primary-text-color); }
    .notice { padding: 6px 10px; border-radius: 6px; background: rgba(244,67,54,0.12); color: #b71c1c; font-size: 0.85rem; }
    .active-badge { display: inline-block; padding: 2px 8px; border-radius: 999px; background: rgba(255,152,0,0.2); color: #b75d00; font-weight: 600; font-size: 0.85rem; width: max-content; }
    .active-meta { font-size: 0.85rem; color: var(--secondary-text-color, #666); }
  `;

  private onTtlInput(e: Event): void {
    this.ttlMinutes = Number((e.target as HTMLInputElement).value);
  }

  private onReasonInput(e: Event): void {
    this.reasonText = (e.target as HTMLTextAreaElement).value;
  }

  private validate(): string | null {
    const lang = this.lang;
    if (!Number.isFinite(this.ttlMinutes) || this.ttlMinutes < OVERRIDE_CONTRACT_TTL_MIN || this.ttlMinutes > OVERRIDE_CONTRACT_TTL_MAX) {
      return t('boiler.override.validation_ttl', lang);
    }
    if (this.reasonText.length > OVERRIDE_CONTRACT_REASON_MAX_LEN) {
      return t('boiler.override.validation_reason', lang);
    }
    return null;
  }

  private endpointPath(): string {
    return `/boiler/${this.identity.entryId}/${this.identity.boxId}/override`;
  }

  private async onSubmit(): Promise<void> {
    const validationError = this.validate();
    if (validationError) {
      this.validationError = validationError;
      return;
    }
    this.validationError = null;
    this.requestError = null;
    this.submitting = true;
    const result = await haClient.fetchOIGAPITyped<{ override: { active: boolean; until: string; reason: string } }>(
      this.endpointPath(),
      { method: 'POST', body: JSON.stringify({ ttl_minutes: this.ttlMinutes, reason: this.reasonText }) },
    );
    this.submitting = false;
    if (result.ok) {
      const ov = result.data.override;
      this.overrideUntil = ov.until ?? null;
      this.effectiveOverride = { active: ov.active, ttlMinutes: this.ttlMinutes, reason: ov.reason ?? this.reasonText, capabilityAvailable: true };
      return;
    }
    if (result.status === 404) {
      this.endpointMissing = true;
      return;
    }
    this.requestError = t('boiler.override.request_error', this.lang);
  }

  private async onCancel(): Promise<void> {
    this.requestError = null;
    this.submitting = true;
    const result = await haClient.fetchOIGAPITyped<{ override: { active: boolean } }>(
      this.endpointPath(),
      { method: 'DELETE' },
    );
    this.submitting = false;
    if (result.ok) {
      this.overrideUntil = null;
      this.effectiveOverride = { active: result.data.override.active, ttlMinutes: this.ttlMinutes, reason: '', capabilityAvailable: true };
      return;
    }
    if (result.status === 404) {
      this.endpointMissing = true;
      return;
    }
    this.requestError = t('boiler.override.request_error', this.lang);
  }

  render() {
    const lang = this.lang;
    // Local optimistic result (post/delete just returned) wins; otherwise the parent's prop is authoritative.
    const ov = this.effectiveOverride ?? this.currentOverride;
    const identityOk = this.identity.available;
    const capabilityOk = (ov?.capabilityAvailable ?? false) && !this.endpointMissing;
    const canSubmit = identityOk && capabilityOk && !this.submitting;
    const active = ov?.active === true;
    return html`
      <div data-testid="boiler-override-panel" class="wrap">
        <div class="heading">${t('boiler.override.heading', lang)}</div>
        <div class="subtitle">${t('boiler.override.subtitle', lang)}</div>
        ${active ? html`<span class="active-badge">${t('boiler.override.active', lang)}</span>` : ''}
        ${active && this.overrideUntil ? html`<div class="active-meta" data-testid="override-active-meta">${t('boiler.override.until', lang)} ${this.overrideUntil} — ${ov?.reason ?? ''}</div>` : ''}
        <div class="notice" ?hidden=${identityOk}>${t('boiler.override.identity_unavailable', lang)}</div>
        <div class="notice capability-notice" ?hidden=${!identityOk || capabilityOk}>${t('boiler.override.capability_unavailable', lang)}</div>
        <div class="notice" data-testid="override-validation-error" ?hidden=${!this.validationError}>${this.validationError ?? ''}</div>
        <div class="notice" data-testid="override-request-error" ?hidden=${!this.requestError}>${this.requestError ?? ''}</div>
        <label>
          ${t('boiler.override.ttl_label', lang)}
          <input data-testid="override-ttl-input" type="number" min="15" max="720" step="15" value="120" ?disabled=${!canSubmit} @input=${this.onTtlInput} />
        </label>
        <label>
          ${t('boiler.override.reason_label', lang)}
          <textarea data-testid="override-reason-input" required ?disabled=${!canSubmit} @input=${this.onReasonInput}></textarea>
        </label>
        <button data-testid="override-submit-btn" ?disabled=${!canSubmit} @click=${this.onSubmit}>${t('boiler.override.submit', lang)}</button>
        ${active ? html`<button class="cancel" data-testid="override-cancel-btn" ?disabled=${!canSubmit} @click=${this.onCancel}>${t('boiler.override.cancel', lang)}</button>` : ''}
      </div>
    `;
  }
}

@customElement('oig-boiler-unavailable-state')
export class OigBoilerUnavailableState extends LitElement {
  @property({ type: String }) reason: 'loading' | 'error' | 'degraded' | 'unavailable' = 'unavailable';
  @property({ type: String }) message: string = '';
  @property({ type: String }) lang: 'cs' | 'en' = 'cs';

  static styles = css`
    :host { display: block; }
    .wrap { padding: 24px; border-radius: 12px; background: var(--card-background-color, #fff); box-shadow: 0 1px 3px rgba(0,0,0,0.08); text-align: center; display: flex; flex-direction: column; gap: 8px; align-items: center; }
    .icon { font-size: 1.6rem; }
    .headline { font-size: 1rem; font-weight: 600; }
    .message { color: var(--secondary-text-color, #666); font-size: 0.9rem; }
  `;

  render() {
    const lang = this.lang;
    const icon = this.reason === 'loading' ? '⏳' : this.reason === 'error' ? '⚠️' : this.reason === 'degraded' ? '🟠' : 'ℹ️';
    return html`
      <div data-testid="boiler-unavailable-state" class="wrap">
        <span class="icon">${icon}</span>
        <div class="headline loading-notice" ?hidden=${this.reason !== 'loading'}>${t('boiler.unavailable.loading', lang)}</div>
        <div class="headline error-notice" ?hidden=${this.reason !== 'error'}>${t('boiler.unavailable.error', lang)}</div>
        <div class="headline degraded-notice" ?hidden=${this.reason !== 'degraded'}>${t('boiler.unavailable.degraded', lang)}</div>
        <div class="headline unavailable-notice" ?hidden=${this.reason !== 'unavailable'}>${t('boiler.unavailable.unavailable', lang)}</div>
        ${this.message ? html`<div class="message">${this.message}</div>` : ''}
      </div>
    `;
  }
}

// ============================================================================
// TAG NAME DECLARATIONS
// ============================================================================

declare global {
  interface HTMLElementTagNameMap {
    'oig-boiler-debug-panel': OigBoilerDebugPanel;
    'oig-boiler-status-grid': OigBoilerStatusGrid;
    'oig-boiler-energy-breakdown': OigBoilerEnergyBreakdown;
    'oig-boiler-predicted-usage': OigBoilerPredictedUsage;
    'oig-boiler-plan-info': OigBoilerPlanInfo;
    'oig-boiler-tank': OigBoilerTank;
    'oig-boiler-category-select': OigBoilerCategorySelect;
    'oig-boiler-heatmap-grid': OigBoilerHeatmapGrid;
    'oig-boiler-stats-cards': OigBoilerStatsCards;
    'oig-boiler-profiling': OigBoilerProfiling;
    'oig-boiler-config-section': OigBoilerConfigSection;
    'oig-boiler-state': OigBoilerState;
    'oig-boiler-heatmap': OigBoilerHeatmap;
    'oig-boiler-profiles': OigBoilerProfiles;
    'oig-boiler-status-panel': OigBoilerStatusPanel;
    'oig-boiler-plan-timeline': OigBoilerPlanTimeline;
    'oig-boiler-source-explanation': OigBoilerSourceExplanation;
    'oig-boiler-override-panel': OigBoilerOverridePanel;
    'oig-boiler-unavailable-state': OigBoilerUnavailableState;
    'oig-boiler-demand-map': OigBoilerDemandMap;
  }
}
