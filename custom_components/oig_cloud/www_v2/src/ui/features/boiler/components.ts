// ============================================================================
// Boiler Tab — Components (Full V1 Feature Parity)
// ============================================================================
//
// Sections (matching V1 boiler-tab.html + boiler.js):
//   1. Status Grid          (7 cards: SOC%, temps, energy, cost, next, source)
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
import { customElement, property } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import {
  BoilerState, BoilerPlan, BoilerEnergyBreakdown, BoilerPredictedUsage,
  BoilerConfig, BoilerHeatmapRow, BoilerProfilingData,
  BoilerProfile, BoilerHourData,
  CATEGORY_LABELS,
} from './types';

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
// 1. STATUS GRID  (7 cards)
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

    .sections {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .section {
      padding: 8px 0 4px;
    }

    .section + .section {
      border-top: 1px solid ${u(CSS_VARS.divider)};
      padding-top: 10px;
      margin-top: 4px;
    }

    .section-label {
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: ${u(CSS_VARS.accent)};
      margin-bottom: 6px;
      opacity: 0.85;
    }

    .rows {
      display: flex;
      flex-direction: column;
      gap: 0;
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 4px 0;
      font-size: 13px;
    }

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
      <div class="sections">

        <!-- Základní info -->
        <div class="section">
          <div class="section-label">Základní info</div>
          <div class="rows">
            <div class="row">
              <span class="row-label">Mix zdrojů:</span>
              <span class="row-value">${v(p?.sourceDigest)}</span>
            </div>
            <div class="row">
              <span class="row-label">Slotů:</span>
              <span class="row-value">${p?.slots?.length ?? '--'}</span>
            </div>
            <div class="row">
              <span class="row-label">Topení aktivní:</span>
              <span class="row-value">${v(p?.activeSlotCount)}</span>
            </div>
          </div>
        </div>

        <!-- Cenové info -->
        <div class="section">
          <div class="section-label">Cenové info</div>
          <div class="rows">
            <div class="row">
              <span class="row-label">Nejlevnější spot:</span>
              <span class="row-value">${v(p?.cheapestSpot)}</span>
            </div>
            <div class="row">
              <span class="row-label">Nejdražší spot:</span>
              <span class="row-value">${v(p?.mostExpensiveSpot)}</span>
            </div>
          </div>
        </div>

        <!-- Forecast info -->
        <div class="section">
          <div class="section-label">Forecast info</div>
          <div class="rows">
            <div class="row">
              <span class="row-label">FVE okna:</span>
              <span class="row-value">${fw.fve}</span>
            </div>
            <div class="row">
              <span class="row-label">Grid okna:</span>
              <span class="row-value">${fw.grid}</span>
            </div>
          </div>
        </div>

        <!-- Časové info -->
        <div class="section">
          <div class="section-label">Časové info</div>
          <div class="rows">
            <div class="row">
              <span class="row-label">Od:</span>
              <span class="row-value">${v(p?.planStart)}</span>
            </div>
            <div class="row">
              <span class="row-label">Do:</span>
              <span class="row-value">${v(p?.planEnd)}</span>
            </div>
          </div>
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

    const configModeLabel = c.configMode === 'advanced' ? 'Pokrocily' : 'Jednoduchy';
    return html`
      <h3>Profil bojleru</h3>
      <div class="grid">
 <div class="card">
        <div class="card-label">Rezim</div>
        <div class="card-value">${configModeLabel}</div>
 </div>
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
// 12. LEGACY WRAPPERS (keep old tag names working for backwards compat)
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
        <div class="current-temp">${this.state.currentTemp}°C</div>
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

// ============================================================================
// TAG NAME DECLARATIONS
// ============================================================================

declare global {
  interface HTMLElementTagNameMap {
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
  }
}
