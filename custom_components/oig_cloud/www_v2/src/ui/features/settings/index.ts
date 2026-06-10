/**
 * OIG Cloud V2 — ⚙️ Nastavení tab.
 *
 * Simple per-module wizards backed by the module_config REST endpoint:
 * module toggles, battery/planner parameters and solar-forecast setup —
 * editable from the dashboard with friendly hints, no HA options flow
 * page-walking. Pricing/boiler (multi-step) stay in the HA wizard.
 */

import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import {
  loadModuleConfig,
  saveModuleConfig,
  ModuleConfig,
  SettingsSection,
} from '@/data/settings-data';

const u = unsafeCSS;

interface FieldDef {
  key: string;
  label: string;
  hint?: string;
  type: 'bool' | 'number' | 'text' | 'select';
  min?: number;
  max?: number;
  step?: number;
  options?: Array<[string, string]>;
  /** Display multiplier (e.g. fraction stored, % shown) */
  scale?: number;
}

const MODULE_FIELDS: FieldDef[] = [
  { key: 'enable_battery_prediction', label: 'Predikce baterie a plánovač', type: 'bool', hint: 'Ekonomické plánování nabíjení, timeline, úspory' },
  { key: 'enable_solar_forecast', label: 'Solární předpověď', type: 'bool', hint: 'Předpověď výroby FVE (forecast.solar / Solcast)' },
  { key: 'enable_pricing', label: 'Ceny energie', type: 'bool', hint: 'Spotové ceny OTE, výkup, distribuce' },
  { key: 'enable_boiler', label: 'Bojler', type: 'bool', hint: 'Inteligentní ohřev vody' },
  { key: 'enable_statistics', label: 'Statistiky', type: 'bool' },
  { key: 'enable_extended_sensors', label: 'Rozšířené senzory', type: 'bool' },
  { key: 'enable_chmu_warnings', label: 'Výstrahy ČHMÚ', type: 'bool' },
];

const BATTERY_FIELDS: FieldDef[] = [
  { key: 'auto_mode_switch_enabled', label: 'Automatické přepínání režimů', type: 'bool', hint: 'Plánovač sám přepíná Home 1 / Home UPS podle plánu' },
  { key: 'charge_rate_kw', label: 'Nabíjecí výkon ze sítě (kW)', type: 'number', min: 0.5, max: 10, step: 0.1, hint: 'Kolik kW box bere při nabíjení ze sítě (UPS)' },
  { key: 'expensive_percentile', label: 'Práh drahých hodin (%)', type: 'number', min: 50, max: 95, step: 5, scale: 100, hint: 'Importy nad tímto denním percentilem cen se plánovač snaží pokrýt levným přednabitím. Výchozí 70 %.' },
  { key: 'balancing_enabled', label: 'Balancování článků', type: 'bool', hint: 'Pravidelné nabití na 100 % kvůli vyrovnání článků' },
  { key: 'balancing_interval_days', label: 'Interval balancování (dny)', type: 'number', min: 3, max: 30, step: 1 },
  { key: 'balancing_hold_hours', label: 'Držení 100 % (hodiny)', type: 'number', min: 1, max: 12, step: 1 },
  { key: 'cheap_window_percentile', label: 'Levné okno pro balancování (%)', type: 'number', min: 5, max: 80, step: 5, hint: 'Balancování se plánuje do hodin pod tímto cenovým percentilem' },
];

const SOLAR_FIELDS: FieldDef[] = [
  { key: 'solar_forecast_provider', label: 'Poskytovatel', type: 'select', options: [['forecast_solar', 'forecast.solar'], ['solcast', 'Solcast']] },
  { key: 'solcast_site_id', label: 'Solcast site ID', type: 'text', hint: 'Jen pro Solcast (z rooftop site URL)' },
  { key: 'solcast_api_key', label: 'Solcast API klíč', type: 'text', hint: 'Nech prázdné = beze změny' },
  { key: 'solar_forecast_latitude', label: 'Zeměpisná šířka', type: 'number', min: -90, max: 90, step: 0.0001 },
  { key: 'solar_forecast_longitude', label: 'Zeměpisná délka', type: 'number', min: -180, max: 180, step: 0.0001 },
  { key: 'solar_forecast_string1_enabled', label: 'String 1 aktivní', type: 'bool' },
  { key: 'solar_forecast_string1_kwp', label: 'String 1 výkon (kWp)', type: 'number', min: 0.1, max: 50, step: 0.1 },
  { key: 'solar_forecast_string1_declination', label: 'String 1 sklon (°)', type: 'number', min: 0, max: 90, step: 1 },
  { key: 'solar_forecast_string1_azimuth', label: 'String 1 azimut (°)', type: 'number', min: -180, max: 180, step: 1, hint: '0 = jih, −90 = východ, 90 = západ' },
  { key: 'solar_forecast_string2_enabled', label: 'String 2 aktivní', type: 'bool' },
  { key: 'solar_forecast_string2_kwp', label: 'String 2 výkon (kWp)', type: 'number', min: 0.1, max: 50, step: 0.1 },
  { key: 'solar_forecast_string2_declination', label: 'String 2 sklon (°)', type: 'number', min: 0, max: 90, step: 1 },
  { key: 'solar_forecast_string2_azimuth', label: 'String 2 azimut (°)', type: 'number', min: -180, max: 180, step: 1 },
];

@customElement('oig-settings')
export class OigSettings extends LitElement {
  @state() private config: ModuleConfig | null = null;
  @state() private loading = true;
  /** Pending (edited, unsaved) values per section. */
  @state() private pending: Record<string, Record<string, unknown>> = {};
  @state() private saving: string | null = null;
  @state() private toast: { section: string; ok: boolean; text: string } | null = null;

  static styles = css`
    :host { display: block; }

    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
      gap: 14px;
      align-items: start;
    }

    .card {
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      padding: 16px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
    }

    .card h2 {
      margin: 0 0 4px;
      font-size: 15px;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .card .sub {
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      margin-bottom: 12px;
    }

    .row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      padding: 7px 0;
      border-bottom: 1px dashed ${u(CSS_VARS.divider)};
    }
    .row:last-of-type { border-bottom: none; }

    .lab { font-size: 12.5px; color: ${u(CSS_VARS.textPrimary)}; }
    .hint { display: block; font-size: 10.5px; color: ${u(CSS_VARS.textSecondary)}; margin-top: 1px; max-width: 270px; }

    input[type='number'], input[type='text'], select {
      background: ${u(CSS_VARS.bgSecondary)};
      color: ${u(CSS_VARS.textPrimary)};
      border: 1px solid ${u(CSS_VARS.divider)};
      border-radius: 7px;
      padding: 5px 8px;
      font-size: 12.5px;
      width: 130px;
    }
    input[type='text'] { width: 170px; }
    input.dirty, select.dirty { border-color: ${u(CSS_VARS.accent)}; }

    /* toggle */
    .switch { position: relative; width: 40px; height: 22px; flex-shrink: 0; }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider {
      position: absolute; inset: 0; cursor: pointer; border-radius: 11px;
      background: rgba(255,255,255,0.15); transition: 0.2s;
    }
    .slider:before {
      content: ''; position: absolute; width: 16px; height: 16px;
      left: 3px; top: 3px; border-radius: 50%; background: #fff; transition: 0.2s;
    }
    .switch input:checked + .slider { background: ${u(CSS_VARS.accent)}; }
    .switch input:checked + .slider:before { transform: translateX(18px); }

    .actions { display: flex; align-items: center; gap: 10px; margin-top: 12px; }
    button.save {
      background: ${u(CSS_VARS.accent)};
      color: #fff; border: none; border-radius: 8px;
      padding: 7px 16px; font-size: 13px; font-weight: 600; cursor: pointer;
    }
    button.save:disabled { opacity: 0.45; cursor: default; }
    .toast { font-size: 12px; }
    .toast.ok { color: #9fe6a8; }
    .toast.err { color: #ff9d93; }

    .note {
      font-size: 11.5px;
      color: ${u(CSS_VARS.textSecondary)};
      background: rgba(120,160,255,0.08);
      border: 1px solid rgba(120,160,255,0.2);
      border-radius: 8px;
      padding: 8px 10px;
      margin-top: 12px;
      line-height: 1.45;
    }

    .loading { padding: 30px; text-align: center; color: ${u(CSS_VARS.textSecondary)}; }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    void this.refresh();
  }

  private async refresh(): Promise<void> {
    this.loading = true;
    this.config = await loadModuleConfig();
    this.pending = {};
    this.loading = false;
  }

  private current(section: SettingsSection, key: string): unknown {
    const pend = this.pending[section];
    if (pend && key in pend) return pend[key];
    const sec: any = this.config?.[section];
    return sec ? sec[key] : undefined;
  }

  private setPending(section: SettingsSection, key: string, value: unknown): void {
    this.pending = {
      ...this.pending,
      [section]: { ...(this.pending[section] ?? {}), [key]: value },
    };
  }

  private isDirty(section: SettingsSection): boolean {
    return Object.keys(this.pending[section] ?? {}).length > 0;
  }

  private async save(section: SettingsSection): Promise<void> {
    const values = this.pending[section];
    if (!values || this.saving) return;
    this.saving = section;
    this.toast = null;
    const res = await saveModuleConfig(section, values);
    this.saving = null;
    if (res.ok) {
      this.toast = { section, ok: true, text: '✓ Uloženo — integrace se aplikuje během chvilky' };
      await this.refresh();
    } else {
      const detail = res.fields
        ? Object.entries(res.fields).map(([k, v]) => `${k}: ${v}`).join(', ')
        : 'uložení selhalo';
      this.toast = { section, ok: false, text: `✗ ${detail}` };
    }
  }

  private renderField(section: SettingsSection, f: FieldDef) {
    const raw = this.current(section, f.key);
    const dirty = !!(this.pending[section] && f.key in this.pending[section]);

    if (f.type === 'bool') {
      const checked = !!raw;
      return html`
        <div class="row">
          <span class="lab">${f.label}${f.hint ? html`<span class="hint">${f.hint}</span>` : nothing}</span>
          <label class="switch">
            <input type="checkbox" .checked=${checked}
              @change=${(e: Event) => this.setPending(section, f.key, (e.target as HTMLInputElement).checked)} />
            <span class="slider"></span>
          </label>
        </div>`;
    }

    if (f.type === 'select') {
      const val = String(raw ?? '');
      return html`
        <div class="row">
          <span class="lab">${f.label}${f.hint ? html`<span class="hint">${f.hint}</span>` : nothing}</span>
          <select class=${dirty ? 'dirty' : ''}
            @change=${(e: Event) => this.setPending(section, f.key, (e.target as HTMLSelectElement).value)}>
            ${(f.options ?? []).map(([v, l]) => html`<option value=${v} ?selected=${v === val}>${l}</option>`)}
          </select>
        </div>`;
    }

    if (f.type === 'number') {
      const scale = f.scale ?? 1;
      const shown = raw == null || raw === '' ? '' : String(Math.round((Number(raw) * scale + Number.EPSILON) * 10000) / 10000);
      return html`
        <div class="row">
          <span class="lab">${f.label}${f.hint ? html`<span class="hint">${f.hint}</span>` : nothing}</span>
          <input type="number" class=${dirty ? 'dirty' : ''} .value=${shown}
            min=${f.min ?? nothing} max=${f.max ?? nothing} step=${f.step ?? nothing}
            @change=${(e: Event) => {
              const v = (e.target as HTMLInputElement).value;
              if (v === '') return;
              this.setPending(section, f.key, Number(v) / scale);
            }} />
        </div>`;
    }

    // text — secrets come back as <key>_set booleans; show placeholder
    const isSecret = f.key.endsWith('api_key');
    const secretSet = isSecret && !!this.current(section, `${f.key}_set`);
    const val = isSecret ? '' : String(raw ?? '');
    return html`
      <div class="row">
        <span class="lab">${f.label}${f.hint ? html`<span class="hint">${f.hint}</span>` : nothing}</span>
        <input type="text" class=${dirty ? 'dirty' : ''} .value=${val}
          placeholder=${isSecret ? (secretSet ? '••••• (nastaveno)' : 'nenastaveno') : ''}
          @change=${(e: Event) => this.setPending(section, f.key, (e.target as HTMLInputElement).value)} />
      </div>`;
  }

  private renderCard(section: SettingsSection, title: string, sub: string, fields: FieldDef[]) {
    const toast = this.toast?.section === section ? this.toast : null;
    return html`
      <div class="card">
        <h2>${title}</h2>
        <div class="sub">${sub}</div>
        ${fields.map((f) => this.renderField(section, f))}
        <div class="actions">
          <button class="save" ?disabled=${!this.isDirty(section) || this.saving === section}
            @click=${() => this.save(section)}>
            ${this.saving === section ? 'Ukládám…' : 'Uložit'}
          </button>
          ${toast ? html`<span class="toast ${toast.ok ? 'ok' : 'err'}">${toast.text}</span>` : nothing}
        </div>
      </div>`;
  }

  render() {
    if (this.loading) return html`<div class="loading">Načítání nastavení…</div>`;
    if (!this.config) {
      return html`<div class="loading">Nastavení se nepodařilo načíst (vyžaduje administrátorský účet).</div>`;
    }

    return html`
      <div class="grid">
        ${this.renderCard('modules', '🧩 Moduly', 'Zapnutí modulu přidá senzory a záložky; konfigurace níže.', MODULE_FIELDS)}
        ${this.renderCard('battery', '🔋 Baterie a plánovač', 'Parametry ekonomického plánovače a balancování.', BATTERY_FIELDS)}
        ${this.renderCard('solar', '☀️ Solární předpověď', 'Poskytovatel a geometrie stringů.', SOLAR_FIELDS)}
      </div>
      <div class="note">
        💰 Ceny energie a 🔥 Bojler mají vícekrokové průvodce — najdeš je v
        <b>HA → Nastavení → Zařízení a služby → OIG Cloud → Konfigurovat</b>
        (menu skočí rovnou na sekci).
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-settings': OigSettings;
  }
}
