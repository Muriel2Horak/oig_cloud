/**
 * OIG Cloud V2 — ⚙️ Nastavení tab.
 *
 * Simple per-module wizards backed by the module_config REST endpoint:
 * module toggles, battery/planner parameters, solar-forecast setup, and
 * boiler configuration — editable from the dashboard with friendly hints,
 * no HA options flow page-walking.
 *
 * Task B additions:
 *   - Entity picker (<oig-entity-picker>) for all entity fields.
 *   - Boiler section: collapsible sub-sections with status badges.
 *   - Sticky dirty bar (Neuložené změny · Uložit · Zahodit).
 *   - entityCatalog built from hass.states (passed as property).
 */

import { LitElement, html, css, unsafeCSS, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import {
  loadModuleConfig,
  saveModuleConfig,
  waitForModuleConfigAfterReload,
  ModuleConfig,
  SettingsSection,
} from '@/data/settings-data';
import {
  loadFieldRegistry,
  fieldsFromRegistry,
  isVisible,
  FieldRegistry,
} from '@/data/registry-data';
import { oigLog } from '@/core/logger';
import {
  buildEntityCatalog,
  EntityEntry,
} from '@/ui/components/entity-picker';
import '@/ui/components/entity-picker';
import { renderFieldPresenter, fieldStyles } from '@/ui/features/field-renderer';
import { haClient } from '@/data/ha-client';
import {
  loadAiStatus,
  renderAiStatusPanel,
  type AiState,
  type AiValidationState,
} from '@/ui/features/onboarding';
import { resolveLang, type Lang } from '@/i18n/onboarding';

const u = unsafeCSS;
const INVERTER_SN = new URLSearchParams(window.location.search).get('sn')
  || new URLSearchParams(window.location.search).get('inverter_sn')
  || '';

export interface FieldDef {
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
  /** Field is optional — user may leave it blank; label shows "(volitelné)" */
  optional?: boolean;
  /** Entity picker metadata — if present, renders entity picker instead of text input */
  entity?: { domain: string };
  /** Registry-driven conditional visibility (UX-AUDIT U1). */
  showIf?: { field: string; in: unknown[] };
  /** Registry `secret` flag — replaces the endsWith('api_key') sniff at :627. */
  secret?: boolean;
}

/**
 * Sections whose POST triggers a config-entry reload on the backend.
 * After save, the GET /module_config will return 404 for a short window —
 * this is expected and must not surface as an error.
 */
export const RELOAD_SECTIONS: ReadonlySet<SettingsSection> = new Set(['boiler']);

// ============================================================================
// FIELD DEFINITIONS
// ============================================================================

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
  { key: 'battery_comfort_soc_percent', label: 'Komfortní rezerva baterie (%)', type: 'number', min: 0, max: 95, step: 5, hint: 'Baterku drží nad touto úrovní, ale jen dobíjením v nejlevnějších oknech — aby ji box sám nenatáhl na 80 % za jakoukoli cenu. 0 = vypnuto. Výchozí 50 %.' },
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

const AI_PROVIDER_OPTIONS: Array<[string, string]> = [
  ['ai_task', 'Vlastní AI v Home Assistantu (ai_task)'],
  ['groq', 'Groq'],
  ['nvidia', 'NVIDIA'],
];

const AI_FIELDS_FALLBACK: FieldDef[] = [
  { key: 'ai_provider', label: 'Poskytovatel AI', type: 'select', options: AI_PROVIDER_OPTIONS, hint: 'Volitelné; žádný poskytovatel není předvybrán ani zvýhodněn.' },
  { key: 'ai_base_url', label: 'Base URL API', type: 'text', optional: true, hint: 'Volitelná vlastní OpenAI-compatible URL.' },
  { key: 'ai_model', label: 'Model', type: 'text', optional: true, hint: 'Volitelný identifikátor modelu.' },
  { key: 'ai_api_key', label: 'API klíč', type: 'text', optional: true, secret: true, hint: 'Prázdné pole zachová dříve uložený klíč.' },
];

// Dynamic hint for alt source type based on selected value
function altSourceHint(type: string): string {
  if (type === 'gas') return 'Plyn — cena tepla včetně účinnosti kotle (např. 1,5 Kč/kWh)';
  if (type === 'heat_pump') return 'Tepelné čerpadlo — cena ≈ cena elektřiny / COP';
  if (type === 'fireplace') return 'Krb — orientační cena tepla z dřeva/pelet';
  return 'Zadej orientační cenu tepla v Kč/kWh';
}

/**
 * All boiler fields (static list used for field-key coverage tests).
 * Conditional rendering is handled in renderBoilerCard, not here.
 * Mirrors ha_rest_api._MODULE_CONFIG_FIELDS['boiler'] — keep in sync!
 */
export const BOILER_FIELDS_ALL: FieldDef[] = [
  // Nádrž a čidla
  { key: 'boiler_volume_l', label: 'Objem nádrže (l)', type: 'number', min: 30, max: 1000, step: 1, hint: 'Jmenovitý objem zásobníku v litrech' },
  { key: 'boiler_temp_sensor_top', label: 'Čidlo teploty — vrchní', type: 'text', hint: 'ID entity senzoru teploty (např. sensor.bojler_top)', entity: { domain: 'sensor' } },
  { key: 'boiler_temp_sensor_bottom', label: 'Čidlo teploty — spodní', type: 'text', hint: 'Jen pokud máš druhý teploměr (ID entity senzoru)', optional: true, entity: { domain: 'sensor' } },
  { key: 'boiler_enable_second_thermometer', label: 'Druhý teploměr aktivní', type: 'bool', hint: 'Zapni, pokud máš spodní čidlo teploty' },
  { key: 'boiler_current_power_entity', label: 'Senzor příkonu bojleru', type: 'text', hint: 'ID entity senzoru výkonu (W); upřesňuje plánovač', optional: true, entity: { domain: 'sensor' } },
  // Teplota a čas
  { key: 'boiler_target_temp_c', label: 'Cílová teplota (°C)', type: 'number', min: 40, max: 85, step: 1, hint: 'Požadovaná teplota vody před deadline' },
  { key: 'boiler_deadline_time', label: 'Deadline (HH:MM)', type: 'text', hint: 'Čas, do kdy musí být voda nahřátá (formát HH:MM, např. 07:00)' },
  // Tepelná arbitráž (fáze B)
  { key: 'boiler_thermal_arbitrage_enabled', label: '💰 Tepelná arbitráž', type: 'bool', hint: 'Přetápět levným proudem (spot pod cenou alt. zdroje) a podržet; rezerva na přetok FVE' },
  { key: 'boiler_max_temp_c', label: 'Strop arbitráže (°C)', type: 'number', min: 40, max: 85, step: 1, hint: 'Kam až smí arbitráž dotopit nad cílovou teplotu' },
  { key: 'boiler_alt_power_kw', label: 'Výkon alt. zdroje (kW)', type: 'number', min: 0, max: 50, step: 0.5, hint: 'Tepelný výkon alt. zdroje do nádrže; 0 = neznámý' },
  // Alternativní zdroj
  { key: 'boiler_has_alternative_heating', label: 'Alternativní zdroj tepla', type: 'bool', hint: 'Bojler má jiný zdroj ohřevu (plyn, TČ, krb…)' },
  { key: 'boiler_alt_source_type', label: 'Typ alternativního zdroje', type: 'select', options: [['gas', 'Plyn'], ['heat_pump', 'Tepelné čerpadlo'], ['fireplace', 'Krb'], ['other', 'Jiný']] },
  { key: 'boiler_alt_cost_kwh', label: 'Cena tepla (Kč/kWh)', type: 'number', min: 0, max: 20, step: 0.1, hint: 'Cena tepla z alternativního zdroje v Kč/kWh' },
  { key: 'boiler_alt_energy_sensor', label: 'Senzor energie alt. zdroje', type: 'text', hint: 'ID entity senzoru energie (kWh)', optional: true, entity: { domain: 'sensor' } },
  { key: 'boiler_alt_energy_daily', label: 'Denní přírůstek energie', type: 'bool', hint: 'Zapni, pokud senzor měří denní (ne celkový) přírůstek' },
  // Home 5/6 + baterie
  { key: 'box_has_home56', label: 'Box má Home 5/6', type: 'bool', hint: 'Aktivuje Home 5/6 (OIG CBB) — umožňuje 🔋→🔥 ohřev z baterie' },
  { key: 'boiler_home5_maneuver_enabled', label: '🔋→🔥 Ohřev z baterie', type: 'bool', hint: 'Plánovač může použít baterii k ohřevu (vyžaduje Home 5/6)' },
  { key: 'boiler_battery_cycle_cost_czk_kwh', label: 'Cena cyklu baterie (Kč/kWh)', type: 'number', min: 0, max: 5, step: 0.05, hint: 'Degradace baterie za kWh; plánovač porovná s cenou sítě' },
  // Cirkulace
  { key: 'boiler_circulation_enabled', label: 'Cirkulace teplé vody', type: 'bool', hint: 'Zapnutí cirkulačního čerpadla TUV' },
  { key: 'boiler_circulation_lead_minutes', label: 'Předstih cirkulace (min)', type: 'number', min: 0, max: 120, step: 5, hint: 'Jak dlouho před odběrem pustit čerpadlo' },
  { key: 'boiler_circulation_run_minutes', label: 'Délka běhu cirkulace (min)', type: 'number', min: 1, max: 60, step: 1 },
  { key: 'boiler_circulation_max_runs_per_day', label: 'Max. počet běhů/den', type: 'number', min: 1, max: 20, step: 1 },
  { key: 'boiler_circulation_min_gap_minutes', label: 'Min. pauza mezi běhy (min)', type: 'number', min: 10, max: 480, step: 10 },
  // Anti-legionella
  { key: 'boiler_legionella_interval_days', label: 'Interval ochrany (dny)', type: 'number', min: 0, max: 30, step: 1, hint: '0 = vypnuto; doporučeno 7–14 dní' },
  { key: 'boiler_legionella_target_temp_c', label: 'Teplota dezinfekce (°C)', type: 'number', min: 60, max: 75, step: 1, hint: 'Min. 60 °C pro spolehlivé usmrcení legionelly' },
];

// ============================================================================
// STATUS BADGE HELPERS — pure functions exported for unit tests
// ============================================================================

/** Alt source label short form for the section badge. */
export function altSourceLabel(type: string): string {
  if (type === 'gas') return 'plyn';
  if (type === 'heat_pump') return 'TČ';
  if (type === 'fireplace') return 'krb';
  return type || 'jiný';
}

/**
 * Build the status badge text for the "Zdroje tepla" section summary.
 * Shown when section is collapsed so user sees state without expanding.
 *
 * @param hasAlt Whether alternative heating is enabled.
 * @param altType The alt source type key.
 * @param altCostKwh The alt source cost per kWh.
 * @param hasHome56 Whether Home 5/6 is present.
 * @param home5Enabled Whether battery→heat maneuver is enabled.
 */
export function sourceSectionBadge(
  hasAlt: boolean,
  altType: string,
  altCostKwh: number | null,
  hasHome56: boolean,
  home5Enabled: boolean,
): string {
  const parts: string[] = [];
  if (hasAlt) {
    const label = altSourceLabel(altType);
    const cost = altCostKwh != null ? ` · ${Number(altCostKwh).toFixed(1).replace('.', ',')} Kč/kWh` : '';
    parts.push(`${label}${cost}`);
  }
  if (hasHome56 && home5Enabled) {
    parts.push('🔋→🔥');
  }
  if (parts.length === 0) {
    return hasHome56 ? 'Home 5/6' : 'pouze elektřina';
  }
  return parts.join(' · ');
}

/**
 * Build the status badge text for the "Cirkulace" section summary.
 */
export function circulationSectionBadge(circEnabled: boolean): string {
  return circEnabled ? 'zapnuto' : 'vypnuto';
}

/**
 * Build the status badge text for the "Ochrana proti legionelle" section summary.
 */
export function legionellaSectionBadge(intervalDays: number): string {
  if (intervalDays <= 0) return 'vypnuto';
  return `1×/${intervalDays} dní`;
}

// ============================================================================
// COMPONENT
// ============================================================================

@customElement('oig-settings')
export class OigSettings extends LitElement {
  /** hass.states catalog — passed from oig-app. Used to build entity picker catalog. */
  @property({ attribute: false }) hassStates: Record<string, any> | null = null;

  @state() private config: ModuleConfig | null = null;
  /** Registry snapshot from GET /config_registry — null while loading or on 404. */
  @state() private registry: FieldRegistry | null = null;
  @state() private loading = true;
  /** Pending (edited, unsaved) values per section. */
  @state() private pending: Record<string, Record<string, unknown>> = {};
  @state() private saving: string | null = null;
  @state() private toast: { section: string; ok: boolean; text: string } | null = null;
  @state() private aiState: AiState | null = null;
  @state() private aiValidation: AiValidationState = { kind: 'idle' };

  /** Cached entity catalog built from hassStates (rebuilt when hassStates changes). */
  private _entityCatalog: EntityEntry[] = [];
  private _lastHassStates: Record<string, any> | null = null;

  private get uiLang(): Lang {
    return resolveLang(haClient.getHassSync());
  }

  static styles = css`
    :host { display: block; }

    .onboarding-launcher {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 14px;
      padding: 12px 16px;
      border: 1px solid ${u(CSS_VARS.divider)};
      border-radius: 12px;
      background: ${u(CSS_VARS.cardBg)};
      color: ${u(CSS_VARS.textPrimary)};
      box-shadow: ${u(CSS_VARS.cardShadow)};
    }

    .onboarding-launcher span {
      font-size: 12.5px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .onboarding-launcher button {
      flex-shrink: 0;
      border: none;
      border-radius: 8px;
      padding: 7px 12px;
      background: ${u(CSS_VARS.accent)};
      color: #fff;
      font-size: 12.5px;
      font-weight: 600;
      cursor: pointer;
    }

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
      position: relative;
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

    ${fieldStyles}

    /* ---- Actions ---- */
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

    /* ---- Note box ---- */
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

    /* ---- Group label (non-boiler cards) ---- */
    .group-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: ${u(CSS_VARS.textSecondary)};
      margin: 12px 0 4px;
      padding-top: 6px;
      border-top: 1px solid ${u(CSS_VARS.divider)};
    }
    .group-label:first-of-type { border-top: none; margin-top: 0; }

    /* ---- Collapsible boiler sub-sections ---- */
    .bsec {
      border-top: 1px solid ${u(CSS_VARS.divider)};
      margin-top: 10px;
    }

    .bsec > summary {
      cursor: pointer;
      list-style: none;
      padding: 9px 0 7px;
      display: flex;
      align-items: center;
      gap: 8px;
      user-select: none;
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      color: ${u(CSS_VARS.textSecondary)};
    }
    .bsec > summary::-webkit-details-marker { display: none; }
    .bsec > summary::before {
      content: '▶';
      font-size: 8px;
      opacity: 0.5;
      transition: transform 0.15s;
      flex-shrink: 0;
    }
    .bsec[open] > summary::before {
      transform: rotate(90deg);
    }

    .bsec-badge {
      margin-left: auto;
      font-size: 10.5px;
      font-weight: 400;
      text-transform: none;
      letter-spacing: 0;
      color: ${u(CSS_VARS.textSecondary)};
      background: rgba(255,255,255,0.06);
      border-radius: 8px;
      padding: 2px 7px;
      white-space: nowrap;
      max-width: 180px;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .bsec-body {
      padding-bottom: 6px;
    }

    /* ---- Sticky dirty bar ---- */
    .dirty-bar {
      position: sticky;
      bottom: 0;
      left: 0;
      right: 0;
      background: ${u(CSS_VARS.cardBg)};
      border-top: 1px solid ${u(CSS_VARS.accent)};
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0 -16px -16px;
      border-radius: 0 0 12px 12px;
      z-index: 10;
    }

    .dirty-bar-label {
      font-size: 11.5px;
      color: ${u(CSS_VARS.textSecondary)};
      flex: 1;
    }

    button.discard {
      background: transparent;
      border: 1px solid ${u(CSS_VARS.divider)};
      color: ${u(CSS_VARS.textSecondary)};
      border-radius: 7px;
      padding: 5px 12px;
      font-size: 12px;
      cursor: pointer;
    }
    button.discard:hover { border-color: ${u(CSS_VARS.textSecondary)}; }
  `;

  private launchOnboarding(): void {
    this.dispatchEvent(new CustomEvent('launch-onboarding', {
      bubbles: true,
      composed: true,
    }));
  }

  connectedCallback(): void {
    super.connectedCallback();
    void this.refresh();
  }

  /** Build entity catalog lazily — only when hassStates reference changes. */
  private get entityCatalog(): EntityEntry[] {
    if (this.hassStates !== this._lastHassStates) {
      this._lastHassStates = this.hassStates;
      this._entityCatalog = this.hassStates ? buildEntityCatalog(this.hassStates) : [];
    }
    return this._entityCatalog;
  }

  private async refresh(): Promise<void> {
    this.loading = true;
    // Load config + registry in parallel — both endpoints may 404 in the same
    // reload window after a save on a RELOAD_SECTIONS (see
    // settings-data.ts:waitForModuleConfigAfterReload).
    const [config, registry] = await Promise.all([
      loadModuleConfig(),
      loadFieldRegistry(),
    ]);
    const aiState = await loadAiStatus(INVERTER_SN);
    if (registry === null && this.registry === null) {
      // First observed null — log once. Plan 4 drops the fallback and this
      // warning fires permanently for backends that don't expose the registry.
      oigLog.warn('[Settings] /config_registry unavailable — using static field fallback');
    } else if (registry === null && this.registry !== null) {
      // Was loaded, now missing — typical reload window. Don't spam.
      oigLog.warn('[Settings] /config_registry returned null — falling back to static fields for this render');
    }
    this.registry = registry;
    this.config = config;
    this.aiState = aiState;
    this.aiValidation = { kind: 'idle' };
    this.pending = {};
    this.loading = false;
  }

  /**
   * Resolve the field list for a section.
   *
   * Registry drives when present; falls back to the static lists (kept until
   * Plan 4 deletes them) when the backend returns null — old integration or
   * 404 during the post-save reload window.
   */
  private fieldsFor(section: SettingsSection | 'ai'): FieldDef[] {
    if (section === 'ai') {
      const registryFields = this.registry ? fieldsFromRegistry(this.registry, 'ai') : AI_FIELDS_FALLBACK.slice(0, 3);
      return [...registryFields, AI_FIELDS_FALLBACK[3]];
    }
    if (this.registry) {
      return fieldsFromRegistry(this.registry, section);
    }
    if (section === 'modules') return MODULE_FIELDS;
    if (section === 'battery') return BATTERY_FIELDS;
    if (section === 'solar') return SOLAR_FIELDS;
    return BOILER_FIELDS_ALL;  // renderBoilerCard picks fields manually; this is a safety net.
  }

  private current(section: SettingsSection | 'ai', key: string): unknown {
    const pend = this.pending[section];
    if (pend && key in pend) return pend[key];
    const sec: any = (this.config as any)?.[section];
    return sec ? sec[key] : undefined;
  }

  /**
   * Cross-section value lookup (F1 U4 R3). `current()` is section-scoped,
   * but pricing_supplier's show_if predicates reference
   * `confirmed_distribution_tariff`, which lives in the `pricing` section
   * (dual-ness derives from the tariff selected in the distribution step,
   * not from anything in pricing_supplier itself). Tries the field's own
   * section first, then searches every other loaded section.
   */
  private currentCrossSection(section: SettingsSection | 'ai', key: string): unknown {
    const own = this.current(section, key);
    if (own !== undefined) return own;
    for (const sec of Object.keys(this.pending)) {
      if (sec === section) continue;
      const pend = (this.pending as any)[sec];
      if (pend && key in pend) return pend[key];
    }
    const cfg: any = this.config;
    if (cfg) {
      for (const sec of Object.keys(cfg)) {
        if (sec === section) continue;
        if (cfg[sec] && key in cfg[sec]) return cfg[sec][key];
      }
    }
    return undefined;
  }

  /**
   * Field visibility, extended for `show_if_all` (F1 U4 R3): registry-data's
   * `isVisible` only evaluates the single-condition `show_if`; pricing_supplier's
   * NT-variant fields need a second, ANDed condition (scenario AND tariff
   * dual-ness), read straight off the raw registry spec since FieldDef has
   * no showIfAll of its own.
   */
  private isFieldVisible(section: SettingsSection | 'ai', f: FieldDef): boolean {
    const get = (k: string) => this.currentCrossSection(section, k);
    if (!isVisible(f, get)) return false;
    const spec: any = this.registry?.fields[f.key];
    const extra: { field: string; in: unknown[] }[] | undefined = spec?.show_if_all;
    if (!extra) return true;
    return extra.every((cond) => cond.in.some((v) => v === get(cond.field)));
  }

  private setPending(section: SettingsSection | 'ai', key: string, value: unknown): void {
    this.pending = {
      ...this.pending,
      [section]: { ...(this.pending[section] ?? {}), [key]: value },
    };
  }

  private isDirty(section: SettingsSection | 'ai'): boolean {
    return Object.keys(this.pending[section] ?? {}).length > 0;
  }

  private discardPending(section: SettingsSection | 'ai'): void {
    this.pending = { ...this.pending, [section]: {} };
    this.toast = null;
  }

  private async save(section: SettingsSection | 'ai'): Promise<void> {
    const values = this.pending[section];
    if (!values || this.saving) return;
    this.saving = section;
    this.toast = null;
    const res = await saveModuleConfig(section as SettingsSection, values);
    this.saving = null;

    if (!res.ok) {
      const detail = res.fields
        ? Object.entries(res.fields).map(([k, v]) => `${k}: ${v}`).join(', ')
        : 'uložení selhalo';
      this.toast = { section, ok: false, text: `✗ ${detail}` };
      return;
    }

    // Optimistic merge: treat values as saved immediately (the POST succeeded).
    if (this.config) {
      this.config = {
        ...this.config,
        [section]: { ...(this.config as any)[section], ...values },
      } as ModuleConfig;
    }
    this.pending = { ...this.pending, [section]: {} };

    if (section !== 'ai' && RELOAD_SECTIONS.has(section)) {
      this.toast = { section, ok: true, text: '✓ Uloženo — integrace se restartuje…' };
      void waitForModuleConfigAfterReload(
        (cfg) => {
          this.config = cfg;
          this.toast = { section, ok: true, text: '✓ Aplikováno' };
        },
        () => {
          this.toast = {
            section,
            ok: true,
            text: 'Integrace se restartuje déle než obvykle — obnov stránku',
          };
        },
      );
    } else {
      this.toast = { section, ok: true, text: '✓ Uloženo' };
      this.loading = true;
      const fresh = await loadModuleConfig();
      if (fresh) this.config = fresh;
      this.loading = false;
    }
  }

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================

  /** Thin wrapper over the shared presenter — secret masking + bool handling unchanged. */
  private renderField(section: SettingsSection | 'ai', f: FieldDef, disabled = false) {
    const dirty = !!(this.pending[section] && f.key in this.pending[section]);
    const isSecret = f.secret ?? f.key.endsWith('api_key');
    const secretSet = isSecret && !!this.current(section, `${f.key}_set`);
    return renderFieldPresenter(f, {
      value: this.current(section, f.key),
      dirty,
      secretSet,
      onChange: (v) => this.setPending(section, f.key, v),
      entityCatalog: this.entityCatalog,
      disabled,
    });
  }

  private async validateAiConfig(): Promise<void> {
    if (this.aiState?.status !== 'verified' || this.aiValidation.kind === 'loading') return;
    this.aiValidation = { kind: 'loading' };
    const result = await haClient.fetchOIGAPITyped<{
      ok: boolean;
      findings?: Array<{ severity: string; message: string }>;
      code?: string;
    }>(`/${INVERTER_SN}/ai/validate_config`, { method: 'POST' });
    if (!result.ok) {
      this.aiValidation = { kind: 'error', code: result.code };
      return;
    }
    if (result.data?.ok) {
      this.aiValidation = { kind: 'success', findings: result.data.findings ?? [] };
      return;
    }
    this.aiValidation = { kind: 'error', code: result.data?.code ?? 'error' };
  }

  private renderCard(section: SettingsSection | 'ai', title: string, sub: string, fields: FieldDef[]) {
    const toast = this.toast?.section === section ? this.toast : null;
    const dirty = this.isDirty(section);
    // U1: showIf filtering. `current()` prefers pending over saved, so the
    // reveal happens on the *pending* provider value the instant the select
    // changes — matches the UX-AUDIT U1 fix.
    const visible = fields.filter((f) => this.isFieldVisible(section, f));
    return html`
      <div class="card">
        <h2>${title}</h2>
        <div class="sub">${sub}</div>
        ${visible.map((f) => this.renderField(section, f))}
        ${section === 'ai'
          ? renderAiStatusPanel({
              aiState: this.aiState,
              lang: this.uiLang,
              showValidateButton: true,
              validationState: this.aiValidation,
              onValidate: () => void this.validateAiConfig(),
            })
          : nothing}
        <div class="actions">
          <button class="save" ?disabled=${!dirty || this.saving === section}
            @click=${() => this.save(section)}>
            ${this.saving === section ? 'Ukládám…' : 'Uložit'}
          </button>
          ${toast ? html`<span class="toast ${toast.ok ? 'ok' : 'err'}">${toast.text}</span>` : nothing}
        </div>
      </div>`;
  }

  /**
   * Like renderField but can disable a bool toggle with a greyed hint.
   */
  private renderFieldDisableable(section: SettingsSection, f: FieldDef, disabled: boolean) {
    if (f.type !== 'bool') return this.renderField(section, f);
    return this.renderField(section, f, disabled);
  }

  /**
   * Render the boiler card with collapsible sub-sections and status badges.
   *
   * Sub-sections:
   *   1. Nádrž a čidla — OPEN by default
   *   2. Zdroje tepla — collapsed, badge: "plyn · 1,5 Kč/kWh" / "pouze elektřina"
   *   3. Cirkulace teplé vody — collapsed, badge: "zapnuto" / "vypnuto"
   *   4. Ochrana proti legionelle — collapsed, badge: "1×/7 dní" / "vypnuto"
   */
  private renderBoilerCard() {
    const section: SettingsSection = 'boiler';
    const toast = this.toast?.section === section ? this.toast : null;

    const hasAlt = !!this.current(section, 'boiler_has_alternative_heating');
    const altType = String(this.current(section, 'boiler_alt_source_type') ?? 'gas');
    const altCostKwh = this.current(section, 'boiler_alt_cost_kwh') as number | null;
    const hasHome56 = !!this.current(section, 'box_has_home56');
    const home5Enabled = !!this.current(section, 'boiler_home5_maneuver_enabled');
    const circEnabled = !!this.current(section, 'boiler_circulation_enabled');
    const legInterval = Number(this.current(section, 'boiler_legionella_interval_days') ?? 0);
    const secondTherm = !!this.current(section, 'boiler_enable_second_thermometer');

    const dirty = this.isDirty(section);

    // Dynamic alt cost hint based on type
    const altCostField: FieldDef = {
      key: 'boiler_alt_cost_kwh',
      label: 'Cena tepla (Kč/kWh)',
      type: 'number',
      min: 0,
      max: 20,
      step: 0.1,
      hint: altSourceHint(altType),
    };

    // Home5 maneuver field — disabled when box_has_home56=false
    const home5Field: FieldDef = {
      key: 'boiler_home5_maneuver_enabled',
      label: '🔋→🔥 Ohřev z baterie',
      type: 'bool',
      hint: hasHome56
        ? 'Plánovač použije baterii (Home 5) k ohřevu, pokud je levnější než síť'
        : 'Vyžaduje aktivaci „Box má Home 5/6" výše',
    };

    // Section badges
    const sourceBadge = sourceSectionBadge(hasAlt, altType, altCostKwh, hasHome56, home5Enabled);
    const circBadge = circulationSectionBadge(circEnabled);
    const legBadge = legionellaSectionBadge(legInterval);

    return html`
      <div class="card">
        <h2>🔥 Bojler</h2>
        <div class="sub">Parametry inteligentního ohřevu vody — mirroruje průvodce v HA.</div>

        <!-- ══ Nádrž a čidla — OPEN by default ══ -->
        <details class="bsec" open>
          <summary>Nádrž a čidla</summary>
          <div class="bsec-body">
            ${this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'boiler_volume_l')!)}
            ${this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'boiler_temp_sensor_top')!)}
            ${this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'boiler_enable_second_thermometer')!)}
            ${secondTherm ? this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'boiler_temp_sensor_bottom')!) : nothing}
            ${this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'boiler_current_power_entity')!)}
            ${this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'boiler_target_temp_c')!)}
            ${this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'boiler_deadline_time')!)}
          </div>
        </details>

        <!-- ══ Zdroje tepla — collapsed ══ -->
        <details class="bsec">
          <summary>
            Zdroje tepla
            <span class="bsec-badge" data-testid="badge-sources">${sourceBadge}</span>
          </summary>
          <div class="bsec-body">
            ${this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'boiler_has_alternative_heating')!)}
            ${hasAlt ? html`
              ${this.renderField(section, { ...BOILER_FIELDS_ALL.find(f => f.key === 'boiler_alt_source_type')!, hint: undefined })}
              ${this.renderField(section, altCostField)}
              ${this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'boiler_alt_energy_sensor')!)}
              ${this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'boiler_alt_energy_daily')!)}
              ${this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'boiler_alt_power_kw')!)}
              ${this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'boiler_thermal_arbitrage_enabled')!)}
              ${this.current(section, 'boiler_thermal_arbitrage_enabled') ? this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'boiler_max_temp_c')!) : nothing}
            ` : nothing}
            ${this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'box_has_home56')!)}
            <div class="note" style="margin-top:6px;margin-bottom:2px">
              Po změně „Box má Home 5/6" a uložení nastavení je nutné obnovit stránku (F5), aby se ovládací panel správně aktualizoval.
            </div>
            ${this.renderFieldDisableable(section, home5Field, !hasHome56)}
            ${hasHome56 ? this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'boiler_battery_cycle_cost_czk_kwh')!) : nothing}
          </div>
        </details>

        <!-- ══ Cirkulace teplé vody — collapsed ══ -->
        <details class="bsec">
          <summary>
            Cirkulace teplé vody
            <span class="bsec-badge" data-testid="badge-circulation">${circBadge}</span>
          </summary>
          <div class="bsec-body">
            ${this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'boiler_circulation_enabled')!)}
            ${circEnabled ? html`
              ${this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'boiler_circulation_lead_minutes')!)}
              ${this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'boiler_circulation_run_minutes')!)}
              ${this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'boiler_circulation_max_runs_per_day')!)}
              ${this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'boiler_circulation_min_gap_minutes')!)}
            ` : nothing}
          </div>
        </details>

        <!-- ══ Ochrana proti legionelle — collapsed ══ -->
        <details class="bsec">
          <summary>
            Ochrana proti legionelle
            <span class="bsec-badge" data-testid="badge-legionella">${legBadge}</span>
          </summary>
          <div class="bsec-body">
            ${this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'boiler_legionella_interval_days')!)}
            ${legInterval > 0 ? this.renderField(section, BOILER_FIELDS_ALL.find(f => f.key === 'boiler_legionella_target_temp_c')!) : nothing}
          </div>
        </details>

        <!-- ══ Dirty bar / Actions ══ -->
        ${dirty ? html`
          <div class="dirty-bar" data-testid="boiler-dirty-bar">
            <span class="dirty-bar-label">Neuložené změny</span>
            ${toast ? html`<span class="toast ${toast.ok ? 'ok' : 'err'}">${toast.text}</span>` : nothing}
            <button class="discard" @click=${() => this.discardPending(section)}>Zahodit</button>
            <button class="save" ?disabled=${this.saving === section}
              @click=${() => this.save(section)}>
              ${this.saving === section ? 'Ukládám…' : 'Uložit'}
            </button>
          </div>
        ` : html`
          <div class="actions">
            <button class="save" disabled>Uložit</button>
            ${toast ? html`<span class="toast ${toast.ok ? 'ok' : 'err'}">${toast.text}</span>` : nothing}
          </div>
        `}
      </div>`;
  }

  render() {
    const launcher = html`
      <div class="onboarding-launcher">
        <span>Průvodce lze kdykoli znovu otevřít a upravit jednotlivé kroky.</span>
        <button
          type="button"
          data-testid="launch-onboarding"
          @click=${this.launchOnboarding}
        >Spustit průvodce nastavením</button>
      </div>
    `;

    if (this.loading) return html`${launcher}<div class="loading">Načítání nastavení…</div>`;
    if (!this.config) {
      return html`${launcher}<div class="loading">Nastavení se nepodařilo načíst (vyžaduje administrátorský účet).</div>`;
    }

    return html`
      ${launcher}
      <div class="grid">
        ${this.renderCard('modules', '🧩 Moduly', 'Zapnutí modulu přidá senzory a záložky; konfigurace níže.', this.fieldsFor('modules'))}
        ${this.renderCard('battery', '🔋 Baterie a plánovač', 'Parametry ekonomického plánovače a balancování.', this.fieldsFor('battery'))}
        ${this.renderCard('solar', '☀️ Solární předpověď', 'Poskytovatel a geometrie stringů.', this.fieldsFor('solar'))}
        ${this.renderCard('ai', '🤖 AI', 'Konfigurace asistenta a ověření stavu.', this.fieldsFor('ai'))}
        ${this.renderCard('pricing_supplier', '💳 Dodavatelské a distribuční ceny', 'Obchodní podmínky vaší smlouvy s dodavatelem a distributorem elektřiny.', this.fieldsFor('pricing_supplier'))}
        ${this.renderBoilerCard()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-settings': OigSettings;
  }
}
