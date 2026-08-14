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
  legacyAdoptionsForChanges,
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
import '@/ui/components/reload-overlay';
import { renderFieldPresenter, fieldStyles } from '@/ui/features/field-renderer';
import { ergoStyles } from '@/ui/features/onboarding/ergo-styles';
import { haClient } from '@/data/ha-client';
import {
  loadAiStatus,
  renderAiStatusPanel,
  type AiState,
  type AiValidationState,
} from '@/ui/features/onboarding';
import { resolveLang, t, type Lang } from '@/i18n/onboarding';

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
  /** Additional registry conditions; every condition is ANDed. */
  showIfAll?: { field: string; in: unknown[] }[];
  /** Registry `secret` flag — replaces the endsWith('api_key') sniff at :627. */
  secret?: boolean;
}

/**
 * Sections whose POST triggers a config-entry reload on the backend.
 * After save, the GET /module_config will return 404 for a short window —
 * this is expected and must not surface as an error.
 */
export const RELOAD_SECTIONS: ReadonlySet<SettingsSection> = new Set(['boiler', 'modules']);

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

const BOILER_TANK_KEYS = [
  'boiler_volume_l',
  'boiler_temp_sensor_top',
  'boiler_enable_second_thermometer',
  'boiler_temp_sensor_bottom',
  'boiler_current_power_entity',
  'boiler_target_temp_c',
  'boiler_deadline_time',
] as const;

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
  /** True while a RELOAD_SECTIONS save waits out the backend's config-entry reload (fix D). */
  @state() private reloading = false;

  /** Cached entity catalog built from hassStates (rebuilt when hassStates changes). */
  private _entityCatalog: EntityEntry[] = [];
  private _lastHassStates: Record<string, any> | null = null;

  private get uiLang(): Lang {
    return resolveLang(haClient.getHassSync());
  }

  /** Isolated so tests can stub the untestable jsdom navigation call (mirrors onboarding's reloadPanel). */
  private reloadPanel(): void {
    window.location.reload();
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
    ${ergoStyles}

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

    .error {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-top: 10px;
      padding: 10px 12px;
      border: 1px solid rgba(255, 128, 128, 0.35);
      border-radius: 10px;
      background: rgba(255, 128, 128, 0.08);
    }

    .error p {
      margin: 0;
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
      line-height: 1.45;
    }

    .error button {
      border: none;
      border-radius: 8px;
      padding: 7px 12px;
      background: ${u(CSS_VARS.accent)};
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      flex-shrink: 0;
    }

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
    const [config, registry] = await Promise.all([
      loadModuleConfig(),
      loadFieldRegistry(),
    ]);
    const aiState = await loadAiStatus(INVERTER_SN);
    if (registry === null) {
      oigLog.warn('[Settings] /config_registry unavailable');
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
   */
  private fieldsFor(section: SettingsSection | 'ai'): FieldDef[] {
    if (section === 'ai') {
      const registryFields = this.registry ? fieldsFromRegistry(this.registry, 'ai') : AI_FIELDS_FALLBACK.slice(0, 3);
      return [...registryFields, AI_FIELDS_FALLBACK[3]];
    }
    return this.registry ? fieldsFromRegistry(this.registry, section) : [];
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

  /** Evaluate the canonical generic registry visibility predicate. */
  private isFieldVisible(section: SettingsSection | 'ai', f: FieldDef): boolean {
    const get = (k: string) => this.currentCrossSection(section, k);
    return isVisible(f, get);
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
    const adoptions = section === 'solar'
      ? legacyAdoptionsForChanges(this.config?._meta?.legacy_fields, values)
      : [];
    const res = adoptions.length > 0
      ? await saveModuleConfig(section as SettingsSection, values, adoptions)
      : await saveModuleConfig(section as SettingsSection, values);
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
      this.reloading = true;
      void waitForModuleConfigAfterReload(
        () => {
          this.reloadPanel();
        },
        () => {
          this.reloading = false;
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
    const field = renderFieldPresenter(f, {
      value: this.current(section, f.key),
      dirty,
      secretSet,
      onChange: (v) => this.setPending(section, f.key, v),
      entityCatalog: this.entityCatalog,
      disabled,
    });
    const legacy = section === 'solar'
      ? this.config?._meta?.legacy_fields?.[f.key]
      : undefined;
    if (legacy?.invalid_legacy_value) {
      return [
        html`<p class="hint" role="status" data-testid=${`legacy-warning-${f.key}`}>
          ${t('onboarding.solar.legacy_invalid', this.uiLang, {
            stored: String(legacy.stored_value),
          })}
        </p>`,
        field,
      ];
    }
    if (!legacy?.requires_adoption) return field;
    return [
      html`<p class="hint" role="status" data-testid=${`legacy-warning-${f.key}`}>
        ${t('onboarding.solar.legacy_adoption', this.uiLang, {
          stored: String(legacy.stored_value),
          display: String(legacy.display_value),
        })}
      </p>`,
      field,
    ];
  }

  private renderRegistryUnavailable(section: SettingsSection, title: string, sub: string) {
    return html`
      <div class="card">
        <h2>${title}</h2>
        <div class="sub">${sub}</div>
        <div class="error" role="alert" data-testid=${`registry-error-${section}`}>
          <p>Registry polí se nepodařilo načíst.</p>
          <button type="button" @click=${() => void this.refresh()}>Zkusit znovu</button>
        </div>
      </div>
    `;
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
    if (!this.registry && section !== 'ai') {
      return this.renderRegistryUnavailable(section, title, sub);
    }
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
    if (!this.registry) {
      return this.renderRegistryUnavailable(section, '🔥 Bojler', 'Parametry inteligentního ohřevu vody — mirroruje průvodce v HA.');
    }

    const toast = this.toast?.section === section ? this.toast : null;
    const fields = this.fieldsFor(section);
    const byKey = new Map(fields.map((f) => [f.key, f]));
    const field = (key: string): FieldDef | undefined => byKey.get(key);
    const renderBoilerField = (key: string, disabled = false) => {
      const f = field(key);
      if (!f) return nothing;
      return disabled ? this.renderFieldDisableable(section, f, true) : this.renderField(section, f);
    };

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
    const altCostField = field('boiler_alt_cost_kwh');
    const altCostFieldWithHint = altCostField ? { ...altCostField, hint: altSourceHint(altType) } : undefined;

    // Home5 maneuver field — disabled when box_has_home56=false
    const home5Field = field('boiler_home5_maneuver_enabled');
    const home5FieldWithHint = home5Field ? {
      ...home5Field,
      hint: hasHome56
        ? 'Plánovač použije baterii (Home 5) k ohřevu, pokud je levnější než síť'
        : 'Vyžaduje aktivaci „Box má Home 5/6" výše',
    } : undefined;

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
            ${BOILER_TANK_KEYS.map((key) => {
              if (key === 'boiler_temp_sensor_bottom' && !secondTherm) return nothing;
              return renderBoilerField(key);
            })}
          </div>
        </details>

        <!-- ══ Zdroje tepla — collapsed ══ -->
        <details class="bsec">
          <summary>
            Zdroje tepla
            <span class="bsec-badge" data-testid="badge-sources">${sourceBadge}</span>
          </summary>
          <div class="bsec-body">
            ${renderBoilerField('boiler_has_alternative_heating')}
            ${hasAlt ? html`
              ${field('boiler_alt_source_type') ? this.renderField(section, { ...field('boiler_alt_source_type')!, hint: undefined }) : nothing}
              ${altCostFieldWithHint ? this.renderField(section, altCostFieldWithHint) : nothing}
              ${renderBoilerField('boiler_alt_energy_sensor')}
              ${renderBoilerField('boiler_alt_energy_daily')}
              ${renderBoilerField('boiler_alt_power_kw')}
              ${renderBoilerField('boiler_thermal_arbitrage_enabled')}
              ${this.current(section, 'boiler_thermal_arbitrage_enabled') ? renderBoilerField('boiler_max_temp_c') : nothing}
            ` : nothing}
            ${renderBoilerField('box_has_home56')}
            <div class="note" style="margin-top:6px;margin-bottom:2px">
              Po změně „Box má Home 5/6" a uložení nastavení je nutné obnovit stránku (F5), aby se ovládací panel správně aktualizoval.
            </div>
            ${home5FieldWithHint ? this.renderFieldDisableable(section, home5FieldWithHint, !hasHome56) : nothing}
            ${hasHome56 ? renderBoilerField('boiler_battery_cycle_cost_czk_kwh') : nothing}
          </div>
        </details>

        <!-- ══ Cirkulace teplé vody — collapsed ══ -->
        <details class="bsec">
          <summary>
            Cirkulace teplé vody
            <span class="bsec-badge" data-testid="badge-circulation">${circBadge}</span>
          </summary>
          <div class="bsec-body">
            ${renderBoilerField('boiler_circulation_enabled')}
            ${circEnabled ? html`
              ${renderBoilerField('boiler_circulation_lead_minutes')}
              ${renderBoilerField('boiler_circulation_run_minutes')}
              ${renderBoilerField('boiler_circulation_max_runs_per_day')}
              ${renderBoilerField('boiler_circulation_min_gap_minutes')}
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
            ${renderBoilerField('boiler_legionella_interval_days')}
            ${legInterval > 0 ? renderBoilerField('boiler_legionella_target_temp_c') : nothing}
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

  private renderAiCard() {
    const section = 'ai' as const;
    const fields = this.fieldsFor(section);
    const visible = fields.filter((f) => this.isFieldVisible(section, f));
    const toast = this.toast?.section === section ? this.toast : null;
    const dirty = this.isDirty(section);
    const PROVIDER_META: Record<string, { ic: string; tag: string }> = {
      ai_task: { ic: '🏠', tag: 'Nic neopouští váš Home Assistant.' },
      groq: { ic: '⚡', tag: 'Zdarma, rychlé, smluvně netrénuje na vstupech.' },
      nvidia: { ic: '🟩', tag: 'Zdarma (trial), velký katalog modelů.' },
    };
    const currentProvider = String(this.current(section, 'ai_provider') ?? '');
    const nonProviderFields = visible.filter((f) => f.key !== 'ai_provider');
    return html`
      <div class="card" style="--sc: var(--c-ai, #9d7bff)">
        <h2>🤖 AI</h2>
        <div class="sub">Konfigurace asistenta a ověření stavu.</div>
        <div class="oneliner">
          Posíláme <b>jen anonymní čísla</b> — nikdy polohu, jméno či e-mail.
          <details class="inline"><summary>více</summary>
            <p>AI Task entita vznikne ve vaší HA instanci. Dashboard i výpočty fungují stejně i bez AI.</p>
          </details>
        </div>
        <div class="ptiles">
          ${AI_PROVIDER_OPTIONS.map(([value, label]) => {
            const meta = PROVIDER_META[value] ?? { ic: '🤖', tag: '' };
            return html`
              <button
                type="button"
                class="ptile ${currentProvider === value ? 'on' : ''}"
                data-provider-tile=${value}
                @click=${() => this.setPending(section, 'ai_provider', value)}
              >
                <span class="pic">${meta.ic}</span>
                <b>${label}</b>
                <i>${meta.tag}</i>
              </button>
            `;
          })}
        </div>
        ${nonProviderFields.map((f) => this.renderField(section, f))}
        ${renderAiStatusPanel({
          aiState: this.aiState,
          lang: this.uiLang,
          showValidateButton: true,
          validationState: this.aiValidation,
          onValidate: () => void this.validateAiConfig(),
        })}
        <div class="actions">
          <button class="save" ?disabled=${!dirty || this.saving === section}
            @click=${() => this.save(section)}>
            ${this.saving === section ? 'Ukládám…' : 'Uložit'}
          </button>
          ${toast ? html`<span class="toast ${toast.ok ? 'ok' : 'err'}">${toast.text}</span>` : nothing}
        </div>
      </div>`;
  }

  render() {
    if (this.reloading) {
      return html`
        <oig-reload-overlay
          .message=${t('onboarding.reload.message', this.uiLang)}
        ></oig-reload-overlay>
      `;
    }

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
        ${this.renderAiCard()}
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
