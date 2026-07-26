import { LitElement, html, css, nothing, unsafeCSS, type PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { fieldHint, fieldLabel } from '@/i18n/fields';
import {
  SIMULATOR_TOKENS,
  renderBatteryModeBandSvg,
  renderBatteryPriceSvg,
  renderBatterySocSvg,
  renderBoilerDrawSvg,
  renderBoilerModeBandSvg,
  renderBoilerTempSvg,
} from './simulator-charts';
import {
  defaultFetcher,
  getBatteryPresetPrices,
  getBoilerPresetDraws,
  type Domain,
  type SimRequest,
  type SimResponse,
  type BatteryInterval,
  type BoilerInterval,
} from './simulator-fetcher';

const u = unsafeCSS;

interface BootstrapPayload {
  capacity_kwh?: number;
  hw_min_soc_percent?: number;
  top_temp_c?: number;
  bottom_temp_c?: number;
  cold_inlet_c?: number;
}

interface PresetItem {
  id: string;
  label: string;
}

function numberFrom(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function formatNumber(value: number, digits = 0): string {
  return value.toLocaleString('cs-CZ', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

@customElement('oig-simulator')
export class OigSimulator extends LitElement {
  @property({ type: String }) domain: Domain = 'battery';
  @property({ attribute: false }) draft: Record<string, unknown> = {};
  @property({ attribute: false }) presets: ReadonlyArray<PresetItem> = [];
  @property({ type: String }) activePresetId = '';
  @property({ attribute: false }) configOverrides: Record<string, unknown> = {};
  @property({ attribute: false }) bootstrapPayload: BootstrapPayload | null = null;
  @property({ type: Number }) debounceMs = 250;
  @property({ attribute: false }) fetcher: (req: SimRequest) => Promise<SimResponse> = defaultFetcher;

  @state() private loading = true;
  @state() private error: string | null = null;
  @state() private response: SimResponse | null = null;
  @state() private chargeRateKw = 2.6;
  @state() private reserveSocPercent = 50;
  @state() private expensivePercentile = 70;
  @state() private boilerTargetTempC = 60;
  @state() private boilerMinTempC = 45;

  private initialized = false;
  private initialPropsSettled = false;
  private pendingTimer: number | null = null;
  private pendingFetchPromise: Promise<void> | null = null;
  private requestSeq = 0;
  private lastRequest: SimRequest | null = null;
  private warnedBootstrapSignature = '';

  static styles = css`
    :host {
      display: block;
      --bg: ${u(SIMULATOR_TOKENS.bg)};
      --panel: ${u(SIMULATOR_TOKENS.panel)};
      --card: ${u(SIMULATOR_TOKENS.card)};
      --line: ${u(SIMULATOR_TOKENS.line)};
      --txt: ${u(SIMULATOR_TOKENS.txt)};
      --mut: ${u(SIMULATOR_TOKENS.mut)};
      --acc: ${u(SIMULATOR_TOKENS.acc)};
      --batt: ${u(SIMULATOR_TOKENS.batt)};
      --boil: ${u(SIMULATOR_TOKENS.boil)};
      --price: ${u(SIMULATOR_TOKENS.price)};
      --ups: ${u(SIMULATOR_TOKENS.ups)};
      --home: ${u(SIMULATOR_TOKENS.home)};
      --tc: var(--batt);
      color: var(--txt);
      font: 14px/1.5 -apple-system, 'Segoe UI', Roboto, sans-serif;
    }

    .shell {
      max-width: 1080px;
      margin: 0 auto;
      padding: 18px;
      background: radial-gradient(1100px 500px at 75% -10%, #16234a, var(--bg) 55%);
      border-radius: 18px;
      box-sizing: border-box;
    }

    .wrap {
      display: grid;
      grid-template-columns: 340px 1fr;
      gap: 14px;
    }

    @media (max-width: 900px) {
      .wrap {
        grid-template-columns: 1fr;
      }
    }

    .col {
      display: flex;
      flex-direction: column;
      gap: 12px;
      min-width: 0;
    }

    .card {
      background: var(--card);
      border: 1px solid var(--line);
      border-left: 3px solid color-mix(in srgb, var(--tc) 55%, transparent);
      border-radius: 14px;
      padding: 14px 16px;
      box-sizing: border-box;
    }

    .card h3 {
      font-size: 11.5px;
      text-transform: uppercase;
      letter-spacing: .8px;
      color: var(--tc);
      margin: 0 0 10px;
      font-weight: 700;
    }

    .simhead {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 10px;
    }

    .presets {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
    }

    .presets button {
      background: var(--panel);
      border: 1px solid var(--line);
      color: var(--mut);
      border-radius: 99px;
      padding: 6px 13px;
      cursor: pointer;
      font-size: 12.5px;
      transition: background .15s ease, color .15s ease, border-color .15s ease;
    }

    .presets button.on {
      border-color: var(--tc);
      color: var(--txt);
      background: color-mix(in srgb, var(--tc) 14%, transparent);
    }

    .presets button:focus-visible,
    input[type="range"]:focus-visible,
    .retry:focus-visible {
      outline: 2px solid color-mix(in srgb, var(--tc) 72%, white);
      outline-offset: 2px;
    }

    .tiles {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
      gap: 10px;
      margin: 12px 0 4px;
    }

    .tile {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 12px;
      padding: 10px 13px;
    }

    .tile b {
      display: block;
      font-size: 10.5px;
      text-transform: uppercase;
      letter-spacing: .6px;
      color: var(--mut);
      font-weight: 600;
    }

    .tile .n {
      font-size: 20px;
      font-weight: 700;
      font-variant-numeric: tabular-nums;
      margin-top: 2px;
    }

    .tile .n small {
      font-size: 11px;
      color: var(--mut);
      font-weight: 400;
    }

    .tile .n.price,
    .tile .n.ups {
      color: var(--price);
    }

    .tile .n.ups {
      color: var(--ups);
    }

    .chart {
      margin-top: 8px;
    }

    .chart h4 {
      font-size: 12px;
      color: var(--mut);
      font-weight: 500;
      margin: 0 0 4px;
      display: flex;
      gap: 12px;
      align-items: center;
      flex-wrap: wrap;
    }

    .chart h4 .key {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-size: 11px;
      white-space: nowrap;
    }

    .chart h4 .sw {
      width: 11px;
      height: 11px;
      border-radius: 3px;
      display: inline-block;
      flex: 0 0 auto;
    }

    .chart-body :global(svg) {
      width: 100%;
      display: block;
    }

    .chart-body svg {
      width: 100%;
      display: block;
    }

    .chart-axis {
      margin-top: -2px;
    }

    .axis-svg {
      display: block;
      width: 100%;
      margin-top: -1px;
    }

    .row {
      padding: 8px 0;
      border-bottom: 1px dashed rgba(36, 51, 87, .7);
    }

    .row:last-child {
      border-bottom: 0;
    }

    .row .l {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      margin-bottom: 5px;
    }

    .row b {
      font-size: 13.5px;
      font-weight: 600;
    }

    .row .exp {
      color: var(--mut);
      font-size: 12px;
      line-height: 1.45;
      margin-top: 2px;
    }

    input[type="range"] {
      width: 130px;
      accent-color: var(--tc);
    }

    .val {
      font-variant-numeric: tabular-nums;
      font-weight: 700;
      min-width: 66px;
      text-align: right;
    }

    .boxchip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      background: rgba(63, 209, 139, .1);
      border: 1px solid rgba(63, 209, 139, .4);
      color: #9fe8c6;
      border-radius: 99px;
      padding: 1px 9px;
      font-size: 11px;
      white-space: nowrap;
    }

    .boxchip.missing {
      background: rgba(143, 161, 196, .08);
      border-color: rgba(143, 161, 196, .25);
      color: #b6c2d9;
    }

    .empty-state {
      text-align: center;
      padding: 20px 0 10px;
      color: var(--mut);
      font-size: 13px;
    }

    .error-shell .sim-card {
      border-color: var(--boil);
      border-left-color: var(--boil);
    }

    .error-inline {
      display: flex;
      flex-direction: column;
      gap: 8px;
      color: var(--txt);
    }

    .error-inline small {
      color: var(--mut);
      line-height: 1.45;
    }

    .retry {
      align-self: flex-start;
      background: color-mix(in srgb, var(--boil) 18%, transparent);
      color: var(--txt);
      border: 1px solid color-mix(in srgb, var(--boil) 48%, transparent);
      border-radius: 10px;
      padding: 7px 12px;
      cursor: pointer;
      font-size: 12.5px;
    }

    .skeleton {
      position: relative;
      overflow: hidden;
      background: rgba(255, 255, 255, .06);
      border-radius: 8px;
      animation: skeleton 1.4s ease-in-out infinite;
    }

    @keyframes skeleton {
      0% { opacity: .6; }
      50% { opacity: .3; }
      100% { opacity: .6; }
    }

    .skeleton-stack {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .skeleton-line {
      height: 12px;
      width: 70%;
    }

    .skeleton-slider {
      height: 38px;
      width: 100%;
      border-radius: 12px;
    }

    .skeleton-chip {
      height: 28px;
      width: 96px;
      border-radius: 99px;
    }

    .skeleton-tile {
      height: 72px;
      border-radius: 12px;
    }

    .skeleton-chart {
      height: 130px;
      border-radius: 12px;
    }

    .skeleton-chart.tall {
      height: 170px;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.syncThemeToken();
  }

  protected firstUpdated(): void {
    this.initialized = true;
    this.syncThemeToken();
    this.checkBootstrapPayload();
    queueMicrotask(() => {
      this.initialPropsSettled = true;
    });
    this.scheduleFetch(true);
  }

  protected updated(changed: PropertyValues<Record<string, unknown>>): void {
    if (!this.initialized || !this.initialPropsSettled) return;

    if (changed.has('domain')) {
      this.syncThemeToken();
      this.checkBootstrapPayload();
    }

    if (changed.has('bootstrapPayload')) {
      this.checkBootstrapPayload();
    }

    if (changed.has('activePresetId') || changed.has('draft') || changed.has('configOverrides')) {
      this.scheduleFetch(true);
      return;
    }

    if (
      changed.has('chargeRateKw') ||
      changed.has('reserveSocPercent') ||
      changed.has('expensivePercentile') ||
      changed.has('boilerTargetTempC') ||
      changed.has('boilerMinTempC')
    ) {
      this.scheduleFetch(false);
    }
  }

  protected override async getUpdateComplete(): Promise<boolean> {
    let complete = await super.getUpdateComplete();

    while (this.pendingFetchPromise) {
      const pending = this.pendingFetchPromise;
      await pending;
      complete = await super.getUpdateComplete();
    }

    return complete;
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this.pendingTimer !== null) {
      window.clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }
  }

  private syncThemeToken(): void {
    this.style.setProperty('--tc', this.domain === 'boiler' ? 'var(--boil)' : 'var(--batt)');
  }

  private buildControlOverrides(): Record<string, unknown> {
    if (this.domain === 'battery') {
      return {
        charge_rate_kw: this.chargeRateKw,
        battery_comfort_soc_percent: this.reserveSocPercent,
        expensive_percentile: this.expensivePercentile,
      };
    }

    return {
      target_temp_c: this.boilerTargetTempC,
      min_temp_c: this.boilerMinTempC,
    };
  }

  private buildRequestDraft(): Record<string, unknown> {
    const merged: Record<string, unknown> = {
      ...this.draft,
      ...this.configOverrides,
      ...this.buildControlOverrides(),
    };

    if (this.domain === 'battery') {
      const socStart = numberFrom(
        merged.soc_start ?? merged.battery_start ?? merged.battery_soc,
      );
      if (socStart != null) merged.soc_start = socStart;
    }

    return merged;
  }

  private buildRequest(): SimRequest {
    return {
      kind: this.domain,
      presetId: this.activePresetId || this.presets[0]?.id || undefined,
      draft: this.buildRequestDraft(),
    };
  }

  private scheduleFetch(immediate = false): void {
    const request = this.buildRequest();
    this.lastRequest = request;

    if (this.pendingTimer !== null) {
      window.clearTimeout(this.pendingTimer);
      this.pendingTimer = null;
    }

    if (immediate || this.debounceMs <= 0) {
      const pending = this.performFetch(request);
      this.pendingFetchPromise = pending;
      void pending.finally(() => {
        if (this.pendingFetchPromise === pending) {
          this.pendingFetchPromise = null;
        }
      });
      return;
    }

    this.pendingTimer = window.setTimeout(() => {
      this.pendingTimer = null;
      const pending = this.performFetch(request);
      this.pendingFetchPromise = pending;
      void pending.finally(() => {
        if (this.pendingFetchPromise === pending) {
          this.pendingFetchPromise = null;
        }
      });
    }, this.debounceMs);
  }

  private async performFetch(request: SimRequest): Promise<void> {
    const seq = ++this.requestSeq;
    this.loading = true;
    this.error = null;

    try {
      const response = await this.fetcher(request);
      if (seq !== this.requestSeq) return;
      this.response = response;
      this.loading = false;
      this.dispatchEvent(
        new CustomEvent('simulate-done', {
          detail: { request, response },
          bubbles: true,
          composed: true,
        }),
      );
    } catch (error) {
      if (seq !== this.requestSeq) return;
      this.response = null;
      this.loading = false;
      this.error = error instanceof Error ? error.message : 'Simulation failed';
    }
  }

  private retry(): void {
    const request = this.lastRequest ?? this.buildRequest();
    const pending = this.performFetch(request);
    this.pendingFetchPromise = pending;
    void pending.finally(() => {
      if (this.pendingFetchPromise === pending) {
        this.pendingFetchPromise = null;
      }
    });
  }

  private changePreset(presetId: string): void {
    if (this.activePresetId === presetId) return;
    this.loading = true;
    this.activePresetId = presetId;
    this.dispatchEvent(
      new CustomEvent('preset-changed', {
        detail: { presetId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  private checkBootstrapPayload(): void {
    const required = this.domain === 'battery'
      ? ['capacity_kwh', 'hw_min_soc_percent']
      : ['top_temp_c', 'bottom_temp_c', 'cold_inlet_c'];
    const missing = required.filter((key) => numberFrom((this.bootstrapPayload ?? {})[key as keyof BootstrapPayload]) == null);
    const signature = `${this.domain}:${missing.join(',')}`;
    if (missing.length === 0 || signature === this.warnedBootstrapSignature) return;
    this.warnedBootstrapSignature = signature;
    console.warn('[oig-simulator] missing bootstrap fields', {
      domain: this.domain,
      missing,
    });
  }

  private handleBatteryChargeInput(event: Event): void {
    this.chargeRateKw = Number((event.currentTarget as HTMLInputElement).value);
  }

  private handleBatteryReserveInput(event: Event): void {
    this.reserveSocPercent = Number((event.currentTarget as HTMLInputElement).value);
  }

  private handleBatteryExpensiveInput(event: Event): void {
    this.expensivePercentile = Number((event.currentTarget as HTMLInputElement).value);
  }

  private handleBoilerTargetInput(event: Event): void {
    this.boilerTargetTempC = Number((event.currentTarget as HTMLInputElement).value);
  }

  private handleBoilerMinInput(event: Event): void {
    this.boilerMinTempC = Number((event.currentTarget as HTMLInputElement).value);
  }

  private renderPresetChips(): unknown {
    return html`
      <div class="presets" data-testid="preset-list">
        ${this.presets.map(
          (preset) => html`
            <button
              id=${`preset-${preset.id}`}
              data-testid=${`preset-${preset.id}`}
              class=${preset.id === (this.activePresetId || this.presets[0]?.id) ? 'on' : ''}
              type="button"
              aria-pressed=${preset.id === (this.activePresetId || this.presets[0]?.id) ? 'true' : 'false'}
              @click=${() => this.changePreset(preset.id)}
            >
              ${preset.label}
            </button>
          `,
        )}
      </div>
    `;
  }

  private renderBatteryControlCard(): unknown {
    return html`
      <section class="card" data-testid="simulator-settings">
        <h3>${fieldLabel('settings', 'simulator.card.settings.label')}</h3>

        <div class="row">
          <div class="l">
            <b>${fieldLabel('charge_rate_kw', 'simulator.battery.charge_rate_kw.label')}</b>
            <span class="val">${formatNumber(this.chargeRateKw, 1)} kW</span>
          </div>
          <input
            data-testid="slider-charge-rate"
            type="range"
            min="1"
            max="7"
            step="0.1"
            .value=${String(this.chargeRateKw)}
            @input=${this.handleBatteryChargeInput}
          />
          <div class="exp">${fieldHint('charge_rate_kw', 'simulator.battery.charge_rate_kw.hint') ?? ''}</div>
        </div>

        <div class="row">
          <div class="l">
            <b>${fieldLabel('battery_comfort_soc_percent', 'simulator.battery.reserve.label')}</b>
            <span class="val">${formatNumber(this.reserveSocPercent, 0)} %</span>
          </div>
          <input
            data-testid="slider-reserve"
            type="range"
            min="0"
            max="80"
            step="5"
            .value=${String(this.reserveSocPercent)}
            @input=${this.handleBatteryReserveInput}
          />
          <div class="exp">${fieldHint('battery_comfort_soc_percent', 'simulator.battery.reserve.hint') ?? ''}</div>
        </div>

        <div class="row">
          <div class="l">
            <b>${fieldLabel('expensive_percentile', 'simulator.battery.expensive_percentile.label')}</b>
            <span class="val">${formatNumber(this.expensivePercentile, 0)} %</span>
          </div>
          <input
            data-testid="slider-expensive-percentile"
            type="range"
            min="40"
            max="95"
            step="5"
            .value=${String(this.expensivePercentile)}
            @input=${this.handleBatteryExpensiveInput}
          />
          <div class="exp">${fieldHint('expensive_percentile', 'simulator.battery.expensive_percentile.hint') ?? ''}</div>
        </div>
      </section>
    `;
  }

  private renderBoilerControlCard(): unknown {
    return html`
      <section class="card" data-testid="simulator-settings">
        <h3>${fieldLabel('settings', 'simulator.card.settings.label')}</h3>

        <div class="row">
          <div class="l">
            <b>${fieldLabel('target_temp_c', 'simulator.boiler.target_temp_c.label')}</b>
            <span class="val">${formatNumber(this.boilerTargetTempC, 0)} °C</span>
          </div>
          <input
            data-testid="slider-target-temp"
            type="range"
            min="45"
            max="70"
            step="1"
            .value=${String(this.boilerTargetTempC)}
            @input=${this.handleBoilerTargetInput}
          />
          <div class="exp">${fieldHint('target_temp_c', 'simulator.boiler.target_temp_c.hint') ?? ''}</div>
        </div>

        <div class="row">
          <div class="l">
            <b>${fieldLabel('min_temp_c', 'simulator.boiler.min_temp_c.label')}</b>
            <span class="val">${formatNumber(this.boilerMinTempC, 0)} °C</span>
          </div>
          <input
            data-testid="slider-min-temp"
            type="range"
            min="35"
            max="55"
            step="1"
            .value=${String(this.boilerMinTempC)}
            @input=${this.handleBoilerMinInput}
          />
          <div class="exp">${fieldHint('min_temp_c', 'simulator.boiler.min_temp_c.hint') ?? ''}</div>
        </div>
      </section>
    `;
  }

  private renderBatteryBoxCard(): unknown {
    const payload = this.bootstrapPayload ?? {};
    return html`
      <section class="card" data-testid="simulator-box">
        <h3>${fieldLabel('readonly', 'simulator.card.readonly.label')}</h3>
        ${this.renderBoxRow('box-capacity', 'capacity_kwh', 'simulator.box.capacity_kwh.label', 'kWh', payload.capacity_kwh, 1)}
        ${this.renderBoxRow('box-hw-min', 'hw_min_soc_percent', 'simulator.box.hw_min_soc_percent.label', '%', payload.hw_min_soc_percent, 0)}
      </section>
    `;
  }

  private renderBoilerBoxCard(): unknown {
    const payload = this.bootstrapPayload ?? {};
    return html`
      <section class="card" data-testid="simulator-box">
        <h3>${fieldLabel('readonly', 'simulator.card.readonly.label')}</h3>
        ${this.renderBoxRow('box-top-temp', 'top_temp_c', 'simulator.box.top_temp_c.label', '°C', payload.top_temp_c, 1)}
        ${this.renderBoxRow('box-bottom-temp', 'bottom_temp_c', 'simulator.box.bottom_temp_c.label', '°C', payload.bottom_temp_c, 1)}
        ${this.renderBoxRow('box-cold-inlet', 'cold_inlet_c', 'simulator.box.cold_inlet_c.label', '°C', payload.cold_inlet_c, 0)}
      </section>
    `;
  }

  private renderBoxRow(
    testId: string,
    key: keyof BootstrapPayload,
    labelKey: string,
    unit: string,
    value: number | undefined,
    digits = 0,
  ): unknown {
    const available = numberFrom(value);
    const unavailable = fieldLabel('unavailable', 'simulator.common.unavailable.label');
    return html`
      <div class="row">
        <div class="l">
          <b>${fieldLabel(String(key), labelKey)}</b>
          ${available == null
            ? html`<span class="boxchip missing" data-testid=${testId} aria-label=${unavailable}>${unavailable}</span>`
            : html`<span class="boxchip" data-testid=${testId}>${formatNumber(available, digits)} ${unit}</span>`}
        </div>
      </div>
    `;
  }

  private renderBatteryTiles(summary: { cost: number; base_cost: number; ups_hours: number }): unknown {
    const savings = summary.base_cost - summary.cost;
    const savingsLabel = savings > 0 ? '−' : '';
    return html`
      <div class="tiles">
        <div class="tile" data-testid="kpi-day-cost">
          <b>${fieldLabel('day_cost', 'simulator.kpi.day_cost.label')}</b>
          <div class="n">${formatNumber(summary.cost, 0)} <small>Kč</small></div>
        </div>
        <div class="tile" data-testid="kpi-base-cost">
          <b>${fieldLabel('base_cost', 'simulator.kpi.base_cost.label')}</b>
          <div class="n">${formatNumber(summary.base_cost, 0)} <small>Kč</small></div>
        </div>
        <div class="tile" data-testid="kpi-savings">
          <b>${fieldLabel('savings', 'simulator.kpi.savings.label')}</b>
          <div class="n price">${savingsLabel}${formatNumber(Math.abs(savings), 0)} <small>Kč</small></div>
        </div>
        <div class="tile" data-testid="kpi-ups-hours">
          <b>${fieldLabel('ups_hours', 'simulator.kpi.ups_hours.label')}</b>
          <div class="n">${formatNumber(summary.ups_hours, 0)} <small>h</small></div>
        </div>
      </div>
    `;
  }

  private renderBoilerTiles(summary: { kwh: number; cost: number; solar_share: number }): unknown {
    return html`
      <div class="tiles">
        <div class="tile" data-testid="kpi-energy-day">
          <b>${fieldLabel('energy_today', 'simulator.kpi.energy_today.label')}</b>
          <div class="n">${formatNumber(summary.kwh, 1)} <small>kWh</small></div>
        </div>
        <div class="tile" data-testid="kpi-cost">
          <b>${fieldLabel('day_cost', 'simulator.kpi.day_cost.label')}</b>
          <div class="n">${formatNumber(summary.cost, 0)} <small>Kč</small></div>
        </div>
        <div class="tile" data-testid="kpi-solar-share">
          <b>${fieldLabel('solar_share', 'simulator.kpi.solar_share.label')}</b>
          <div class="n ups">${formatNumber(summary.solar_share * 100, 0)} <small>%</small></div>
        </div>
      </div>
    `;
  }

  private renderBatteryCharts(intervals: BatteryInterval[]): unknown {
    const presetId = this.activePresetId || this.presets[0]?.id || 'zima';
    const prices = getBatteryPresetPrices(presetId);
    return html`
      <div class="chart" data-testid="chart-mode">
        <h4>
          ${fieldLabel('mode', 'simulator.chart.mode.label')}
          <span class="key"><span class="sw" style="background:var(--home)"></span>Home 1</span>
          <span class="key"><span class="sw" style="background:var(--ups)"></span>Home UPS — nabíjení ze sítě</span>
        </h4>
        <div class="chart-body">${unsafeHTML(renderBatteryModeBandSvg(intervals))}</div>
      </div>

      <div class="chart" data-testid="chart-soc">
        <h4>
          ${fieldLabel('soc', 'simulator.chart.soc.label')}
          <span class="key"><span class="sw" style="background:var(--batt)"></span>SoC %</span>
          <span class="key" style="color:var(--mut)">··· komfortní rezerva ${formatNumber(this.reserveSocPercent, 0)} %</span>
        </h4>
        <div class="chart-body">${unsafeHTML(renderBatterySocSvg(intervals, this.reserveSocPercent))}</div>
      </div>

      <div class="chart" data-testid="chart-price">
        <h4>
          ${fieldLabel('price', 'simulator.chart.price.label')}
          <span class="key"><span class="sw" style="background:#31406b"></span>Kč/kWh</span>
          <span class="key"><span class="sw" style="background:var(--price)"></span>záporná cena</span>
        </h4>
        <div class="chart-body">${unsafeHTML(renderBatteryPriceSvg(prices))}</div>
      </div>
    `;
  }

  private renderBoilerCharts(intervals: BoilerInterval[]): unknown {
    const presetId = this.activePresetId || this.presets[0]?.id || 'vsedni';
    const draws = getBoilerPresetDraws(presetId);
    return html`
      <div class="chart" data-testid="chart-heating">
        <h4>
          ${fieldLabel('heating_windows', 'simulator.chart.heating_windows.label')}
          <span class="key"><span class="sw" style="background:var(--ups)"></span>solární přebytek</span>
          <span class="key"><span class="sw" style="background:var(--boil)"></span>síť (levné okno)</span>
        </h4>
        <div class="chart-body">${unsafeHTML(renderBoilerModeBandSvg(intervals))}</div>
      </div>

      <div class="chart" data-testid="chart-temp">
        <h4>
          ${fieldLabel('water_temp', 'simulator.chart.water_temp.label')}
          <span class="key"><span class="sw" style="background:var(--boil)"></span>°C</span>
          <span class="key" style="color:var(--mut)">··· minimum ${formatNumber(this.boilerMinTempC, 0)} °C · cíl ${formatNumber(this.boilerTargetTempC, 0)} °C</span>
        </h4>
        <div class="chart-body">${unsafeHTML(renderBoilerTempSvg(intervals, this.boilerMinTempC))}</div>
      </div>

      <div class="chart" data-testid="chart-draw">
        <h4>
          ${fieldLabel('draw', 'simulator.chart.draw.label')}
          <span class="key"><span class="sw" style="background:#31406b"></span>litry</span>
        </h4>
        <div class="chart-body">${unsafeHTML(renderBoilerDrawSvg(draws))}</div>
      </div>
    `;
  }

  private renderSimulationPanel(): unknown {
    if (!this.response) {
      return nothing;
    }

    if (this.response.kind === 'battery') {
      return html`
        <section class="card sim-card" aria-busy=${this.loading ? 'true' : 'false'}>
          <div class="simhead">
            ${this.renderPresetChips()}
          </div>
          ${this.renderBatteryTiles(this.response.summary)}
          ${this.renderBatteryCharts(this.response.intervals)}
        </section>
      `;
    }

    return html`
      <section class="card sim-card" aria-busy=${this.loading ? 'true' : 'false'}>
        <div class="simhead">
          ${this.renderPresetChips()}
        </div>
        ${this.renderBoilerTiles(this.response.summary)}
        ${this.renderBoilerCharts(this.response.intervals)}
      </section>
    `;
  }

  private renderLoadingPanel(): unknown {
    return html`
      <section class="card sim-card" aria-busy="true">
        <div class="simhead">
          <div class="skeleton skeleton-chip" style="width: 260px;"></div>
        </div>
        <div class="tiles">
          <div class="skeleton skeleton-tile"></div>
          <div class="skeleton skeleton-tile"></div>
          <div class="skeleton skeleton-tile"></div>
          ${this.domain === 'battery' ? html`<div class="skeleton skeleton-tile"></div>` : nothing}
        </div>
        <div class="chart">
          <div class="skeleton skeleton-line" style="width: 38%; height: 11px; margin-bottom: 8px;"></div>
          <div class="skeleton skeleton-chart tall"></div>
        </div>
        <div class="chart">
          <div class="skeleton skeleton-line" style="width: 32%; height: 11px; margin-bottom: 8px;"></div>
          <div class="skeleton skeleton-chart"></div>
        </div>
        <div class="chart">
          <div class="skeleton skeleton-line" style="width: 28%; height: 11px; margin-bottom: 8px;"></div>
          <div class="skeleton skeleton-chart"></div>
        </div>
      </section>
    `;
  }

  private renderErrorPanel(): unknown {
    return html`
      <section class="card sim-card error-inline" data-testid="simulator-error">
        <small>${this.error ?? 'Simulation failed'}</small>
        <button class="retry" data-testid="simulator-retry" type="button" @click=${() => this.retry()}>
          ${fieldLabel('retry', 'simulator.common.retry.label')}
        </button>
      </section>
    `;
  }

  render() {
    const isLoadingInitial = this.loading && !this.response && !this.error;
    const rootClass = this.error ? 'shell error-shell' : 'shell';

    return html`
      <div class=${rootClass}>
        <div class="wrap">
          <div class="col">
            ${this.domain === 'battery' ? this.renderBatteryControlCard() : this.renderBoilerControlCard()}
            ${this.domain === 'battery' ? this.renderBatteryBoxCard() : this.renderBoilerBoxCard()}
          </div>

          <div class="col">
            ${isLoadingInitial
              ? this.renderLoadingPanel()
              : this.error
                ? this.renderErrorPanel()
                : this.renderSimulationPanel()}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-simulator': OigSimulator;
  }
}
