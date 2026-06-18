import { LitElement, html, css, unsafeCSS, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { renderIcon } from '@/utils/render-icon';
import { MDI_ICON_PATHS } from '@/utils/mdi-icons';

const ALL_ICON_NAMES = Object.keys(MDI_ICON_PATHS);
const PRESET_COLORS = ['#42a5f5', '#43a047', '#ffa726', '#ef5350', '#ab47bc', '#26c6da', '#8d6e63', '#ec407a'];
import { getEntityStore } from '@/data/entity-store';
import type { TileConfig, TileSupportEntities } from '@/data/tiles-data';
import type { HassState } from '@/data/state-watcher';

const u = unsafeCSS;

type DialogTab = 'entity' | 'button';
type ActionType = 'toggle' | 'turn_on' | 'turn_off';

interface EntityItem {
  id: string;
  name: string;
  value: string;
  unit: string;
  icon: string;
  state: HassState;
}

@customElement('oig-tile-dialog')
export class OigTileDialog extends LitElement {
  @property({ type: Boolean, reflect: true, attribute: 'open' }) isOpen = false;
  @property({ type: Number }) tileIndex = -1;
  @property({ attribute: false }) tileSide: 'left' | 'right' = 'left';
  @property({ attribute: false }) existingConfig: TileConfig | null = null;

  @state() private currentTab: DialogTab = 'entity';
  @state() private entitySearchText = '';
  @state() private buttonSearchText = '';
  @state() private selectedEntityId = '';
  @state() private selectedButtonEntityId = '';
  @state() private label = '';
  @state() private icon = '';
  @state() private color = '#03A9F4';
  @state() private action: ActionType = 'toggle';
  @state() private supportEntity1 = '';
  @state() private supportEntity2 = '';
  @state() private supportSearch1 = '';
  @state() private supportSearch2 = '';
  @state() private showSupportList1 = false;
  @state() private showSupportList2 = false;
  @state() private iconSearch = '';

  static styles = css`
    :host {
      display: none;
      position: fixed;
      inset: 0;
      z-index: 1000;
      font-family: ${u(CSS_VARS.fontFamily)};
    }

    :host([open]) {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${u(CSS_VARS.bgPrimary)} 35%, transparent);
      backdrop-filter: blur(6px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }

    .dialog {
      width: min(460px, 100%);
      max-height: 88vh;
      background: ${u(CSS_VARS.cardBgSolid)};
      border: 1px solid ${u(CSS_VARS.divider)};
      border-radius: 16px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: translateY(6px) scale(0.99);
      transition: transform 0.2s ease;
    }

    :host([open]) .dialog {
      transform: translateY(0) scale(1);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 18px 12px;
      border-bottom: 1px solid ${u(CSS_VARS.divider)};
    }

    .title {
      font-size: 16px;
      font-weight: 700;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .close-btn {
      border: none;
      background: ${u(CSS_VARS.bgSecondary)};
      color: ${u(CSS_VARS.textPrimary)};
      width: 30px;
      height: 30px;
      border-radius: 10px;
      cursor: pointer;
      font-size: 16px;
      display: grid;
      place-items: center;
      transition: background 0.2s ease, transform 0.2s ease;
    }

    .close-btn:hover {
      background: ${u(CSS_VARS.divider)};
      transform: scale(1.05);
    }

    .tabs {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 8px;
      padding: 12px 18px;
      background: ${u(CSS_VARS.bgSecondary)};
      border-bottom: 1px solid ${u(CSS_VARS.divider)};
    }

    .tab-btn {
      border: 1px solid transparent;
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 12px;
      padding: 8px 10px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      color: ${u(CSS_VARS.textSecondary)};
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: border 0.2s ease, color 0.2s ease, transform 0.2s ease;
    }

    .tab-btn.active {
      border-color: ${u(CSS_VARS.accent)};
      color: ${u(CSS_VARS.textPrimary)};
      transform: translateY(-1px);
    }

    .content {
      padding: 16px 18px 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    /* ── type segment ── */
    .seg { display: flex; gap: 8px; }
    .seg button {
      flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px;
      padding: 9px; border-radius: 10px; border: 1px solid ${u(CSS_VARS.divider)};
      background: rgba(0,0,0,.18); color: ${u(CSS_VARS.textSecondary)};
      font-weight: 700; font-size: 13px; cursor: pointer; font-family: inherit;
    }
    .seg button.on { border-color: ${u(CSS_VARS.accent)}; background: color-mix(in srgb, ${u(CSS_VARS.accent)} 16%, transparent); color: ${u(CSS_VARS.textPrimary)}; }
    .seg .oig-mdi { width: 16px; height: 16px; }

    /* ── live preview ── */
    .pvwrap { display: flex; align-items: center; gap: 12px; background: rgba(0,0,0,.22); border: 1px dashed ${u(CSS_VARS.divider)}; border-radius: 12px; padding: 12px; }
    .pvlbl { font-size: 8px; font-weight: 800; opacity: .45; text-transform: uppercase; letter-spacing: .5px; writing-mode: vertical-rl; transform: rotate(180deg); }
    .ptile { flex: 1; background: linear-gradient(160deg, #222a40, #1a2034); border-left: 3px solid var(--pc, ${u(CSS_VARS.accent)}); border-radius: 10px; padding: 9px 11px; display: flex; align-items: center; gap: 9px; }
    .ptile .pi { width: 30px; height: 30px; border-radius: 8px; background: color-mix(in srgb, var(--pc, ${u(CSS_VARS.accent)}) 22%, transparent); display: grid; place-items: center; color: var(--pc, ${u(CSS_VARS.accent)}); font-size: 18px; }
    .ptile .pi .oig-mdi { width: 18px; height: 18px; }
    .ptile .pm { flex: 1; min-width: 0; }
    .ptile .pn { font-size: 12px; font-weight: 700; opacity: .8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .ptile .pv { font-size: 17px; font-weight: 800; }
    .ptile .pv small { font-size: 11px; opacity: .6; }

    /* ── section ── */
    .sec { display: flex; flex-direction: column; gap: 8px; }
    .sect { display: flex; align-items: center; gap: 7px; font-size: 11px; font-weight: 800; opacity: .6; text-transform: uppercase; letter-spacing: .4px; }
    .sect .n { width: 17px; height: 17px; border-radius: 50%; background: ${u(CSS_VARS.accent)}; color: #06121f; display: grid; place-items: center; font-size: 10px; }
    .sect .opt { opacity: .7; font-weight: 600; text-transform: none; letter-spacing: 0; }

    /* ── inline icon grid ── */
    .igrid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 5px; max-height: 132px; overflow: auto; background: rgba(0,0,0,.18); border: 1px solid ${u(CSS_VARS.divider)}; border-radius: 9px; padding: 7px; }
    .ig { aspect-ratio: 1; display: grid; place-items: center; border-radius: 7px; cursor: pointer; border: 1px solid transparent; background: none; color: ${u(CSS_VARS.textPrimary)}; }
    .ig:hover { background: rgba(255,255,255,.06); }
    .ig.sel { border-color: ${u(CSS_VARS.accent)}; background: color-mix(in srgb, ${u(CSS_VARS.accent)} 16%, transparent); }
    .ig .oig-mdi { width: 18px; height: 18px; }
    .igrid-empty { grid-column: 1 / -1; text-align: center; font-size: 11px; opacity: .5; padding: 10px; }

    /* ── color swatches ── */
    .sw { display: flex; gap: 7px; flex-wrap: wrap; align-items: center; }
    .sc { width: 24px; height: 24px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; padding: 0; }
    .sc.sel { border-color: #fff; }
    .sw input[type="color"] { width: 28px; height: 28px; border: none; background: none; cursor: pointer; padding: 0; }

    .oig-mdi { width: 1em; height: 1em; fill: currentColor; vertical-align: -0.125em; display: inline-block; }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    label {
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
      font-weight: 600;
    }

    .input,
    select,
    .color-input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${u(CSS_VARS.divider)};
      background: ${u(CSS_VARS.bgPrimary)};
      color: ${u(CSS_VARS.textPrimary)};
      font-size: 12px;
      outline: none;
      transition: border 0.2s ease, box-shadow 0.2s ease;
    }

    .input::placeholder {
      color: ${u(CSS_VARS.textSecondary)};
    }

    .input:focus,
    select:focus,
    .color-input:focus {
      border-color: ${u(CSS_VARS.accent)};
      box-shadow: 0 0 0 2px color-mix(in srgb, ${u(CSS_VARS.accent)} 20%, transparent);
    }

    .row {
      display: grid;
      grid-template-columns: 1fr 120px;
      gap: 12px;
      align-items: end;
    }

    .icon-input {
      display: grid;
      grid-template-columns: 46px 1fr auto;
      gap: 8px;
      align-items: center;
    }

    .oig-mdi { width: 1em; height: 1em; fill: currentColor; vertical-align: -0.125em; display: inline-block; }
    .icon-preview {
      width: 46px;
      height: 46px;
      border-radius: 12px;
      border: 1px dashed ${u(CSS_VARS.divider)};
      display: grid;
      place-items: center;
      font-size: 22px;
      cursor: pointer;
      background: ${u(CSS_VARS.bgSecondary)};
      transition: border 0.2s ease, transform 0.2s ease;
    }

    .icon-preview:hover {
      border-color: ${u(CSS_VARS.accent)};
      transform: translateY(-1px);
    }

    .icon-field {
      font-size: 11px;
    }

    .icon-btn {
      border: none;
      background: ${u(CSS_VARS.bgSecondary)};
      color: ${u(CSS_VARS.textPrimary)};
      border-radius: 10px;
      padding: 10px 12px;
      cursor: pointer;
      font-size: 12px;
      font-weight: 600;
    }

    .divider {
      height: 1px;
      background: ${u(CSS_VARS.divider)};
      margin: 6px 0;
      opacity: 0.8;
    }

    .entity-list {
      border: 1px solid ${u(CSS_VARS.divider)};
      border-radius: 12px;
      overflow: hidden;
      max-height: 200px;
      overflow-y: auto;
      background: ${u(CSS_VARS.bgPrimary)};
    }

    .entity-item {
      display: grid;
      grid-template-columns: 30px 1fr;
      gap: 10px;
      padding: 10px 12px;
      border-bottom: 1px solid ${u(CSS_VARS.divider)};
      cursor: pointer;
      align-items: center;
      transition: background 0.2s ease;
    }

    .entity-item:last-child {
      border-bottom: none;
    }

    .entity-item:hover {
      background: ${u(CSS_VARS.bgSecondary)};
    }

    .entity-item.selected {
      background: color-mix(in srgb, ${u(CSS_VARS.accent)} 16%, transparent);
      border-left: 3px solid ${u(CSS_VARS.accent)};
      padding-left: 9px;
    }

    .entity-icon {
      font-size: 20px;
      line-height: 1;
      text-align: center;
    }

    .entity-meta {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
    }

    .entity-name {
      font-size: 12px;
      color: ${u(CSS_VARS.textPrimary)};
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .entity-sub {
      font-size: 10px;
      color: ${u(CSS_VARS.textSecondary)};
      display: flex;
      justify-content: space-between;
      gap: 8px;
    }

    .support-field {
      position: relative;
    }

    .support-list {
      position: absolute;
      top: calc(100% + 6px);
      left: 0;
      right: 0;
      background: ${u(CSS_VARS.cardBg)};
      border: 1px solid ${u(CSS_VARS.divider)};
      border-radius: 12px;
      z-index: 10;
      max-height: 180px;
      overflow-y: auto;
      box-shadow: ${u(CSS_VARS.cardShadow)};
    }

    .support-item {
      padding: 10px 12px;
      border-bottom: 1px solid ${u(CSS_VARS.divider)};
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: background 0.2s ease;
    }

    .support-item:last-child {
      border-bottom: none;
    }

    .support-item:hover {
      background: ${u(CSS_VARS.bgSecondary)};
    }

    .support-name {
      font-size: 12px;
      color: ${u(CSS_VARS.textPrimary)};
      font-weight: 600;
    }

    .support-value {
      font-size: 10px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .support-empty {
      padding: 12px;
      font-size: 11px;
      color: ${u(CSS_VARS.textSecondary)};
      text-align: center;
    }

    .footer {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 14px 18px 18px;
      border-top: 1px solid ${u(CSS_VARS.divider)};
      background: ${u(CSS_VARS.bgSecondary)};
    }

    .btn {
      border: none;
      border-radius: 12px;
      padding: 10px 16px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .btn-secondary {
      background: ${u(CSS_VARS.bgPrimary)};
      color: ${u(CSS_VARS.textPrimary)};
      border: 1px solid ${u(CSS_VARS.divider)};
    }

    .btn-primary {
      background: ${u(CSS_VARS.accent)};
      color: #fff;
      box-shadow: 0 6px 14px color-mix(in srgb, ${u(CSS_VARS.accent)} 40%, transparent);
    }

    .btn:hover {
      transform: translateY(-1px);
    }

    .tab-content {
      display: none;
      flex-direction: column;
      gap: 14px;
    }

    .tab-content.active {
      display: flex;
    }
  `;

  public loadTileConfig(config: TileConfig): void {
    this.currentTab = config.type;
    if (config.type === 'entity') this.selectedEntityId = config.entity_id;
    else this.selectedButtonEntityId = config.entity_id;
    this.label = config.label || '';
    this.icon = config.icon || '';
    this.color = config.color || '#03A9F4';
    this.action = config.action || 'toggle';
    this.supportEntity1 = config.support_entities?.top_right || '';
    this.supportEntity2 = config.support_entities?.bottom_right || '';
  }

  private resetForm(): void {
    this.currentTab = 'entity';
    this.entitySearchText = '';
    this.buttonSearchText = '';
    this.selectedEntityId = '';
    this.selectedButtonEntityId = '';
    this.label = '';
    this.icon = '';
    this.color = '#03A9F4';
    this.action = 'toggle';
    this.supportEntity1 = '';
    this.supportEntity2 = '';
    this.supportSearch1 = '';
    this.supportSearch2 = '';
    this.showSupportList1 = false;
    this.showSupportList2 = false;
    this.iconSearch = '';
  }

  private handleClose(): void {
    this.isOpen = false;
    this.resetForm();
    this.dispatchEvent(new CustomEvent('close', { bubbles: true, composed: true }));
  }

  private getEntities(): Record<string, HassState> {
    const store = getEntityStore();
    return store ? store.getAll() : {};
  }

  private getEntityItems(domains: string[], searchText: string): EntityItem[] {
    const search = searchText.trim().toLowerCase();
    const entities = this.getEntities();
    const items = Object.entries(entities)
      .filter(([id]) => domains.some(domain => id.startsWith(domain)))
      .map(([id, state]) => {
        const name = this.getAttributeValue(state, 'friendly_name') || id;
        const unit = this.getAttributeValue(state, 'unit_of_measurement');
        const icon = this.getAttributeValue(state, 'icon');
        return {
          id,
          name,
          value: state.state,
          unit,
          icon,
          state,
        };
      })
      .filter(item => {
        if (!search) return true;
        const name = item.name.toLowerCase();
        return name.includes(search) || item.id.toLowerCase().includes(search);
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    return items;
  }

  private getSupportEntities(searchText: string): EntityItem[] {
    const search = searchText.trim().toLowerCase();
    if (!search) return [];

    const entities = this.getEntities();
    return Object.entries(entities)
      .map(([id, state]) => {
        const name = this.getAttributeValue(state, 'friendly_name') || id;
        const unit = this.getAttributeValue(state, 'unit_of_measurement');
        const icon = this.getAttributeValue(state, 'icon');
        return { id, name, value: state.state, unit, icon, state };
      })
      .filter(item => {
        const name = item.name.toLowerCase();
        return name.includes(search) || item.id.toLowerCase().includes(search);
      })
      .sort((a, b) => a.name.localeCompare(b.name))
      .slice(0, 20);
  }

  private getDisplayIcon(icon: string): TemplateResult | string {
    return renderIcon(icon || 'mdi:gauge');
  }

  private getColorForEntity(entityId: string): string {
    const domain = entityId.split('.')[0];
    switch (domain) {
      case 'sensor':
        return '#03A9F4';
      case 'binary_sensor':
        return '#4CAF50';
      case 'switch':
        return '#FFC107';
      case 'light':
        return '#FF9800';
      case 'fan':
        return '#00BCD4';
      case 'input_boolean':
        return '#9C27B0';
      default:
        return '#03A9F4';
    }
  }

  private applyEntityDefaults(entityId: string): void {
    if (!entityId) return;
    const entities = this.getEntities();
    const state = entities[entityId];
    if (!state) return;

    if (!this.label) {
      this.label = this.getAttributeValue(state, 'friendly_name');
    }

    const iconAttr = this.getAttributeValue(state, 'icon');
    if (!this.icon && iconAttr) {
      this.icon = iconAttr;
    }

    this.color = this.getColorForEntity(entityId);
  }

  private handleEntitySelect(entityId: string): void {
    this.selectedEntityId = entityId;
    this.applyEntityDefaults(entityId);
  }

  private handleButtonEntitySelect(entityId: string): void {
    this.selectedButtonEntityId = entityId;
    this.applyEntityDefaults(entityId);
  }

  private handleSupportInput(index: 1 | 2, value: string): void {
    const trimmed = value.trim();
    if (index === 1) {
      this.supportSearch1 = value;
      this.showSupportList1 = !!trimmed;
      if (!trimmed) this.supportEntity1 = '';
    } else {
      this.supportSearch2 = value;
      this.showSupportList2 = !!trimmed;
      if (!trimmed) this.supportEntity2 = '';
    }
  }

  private handleSupportSelect(index: 1 | 2, entity: EntityItem): void {
    const name = entity.name || entity.id;
    if (index === 1) {
      this.supportEntity1 = entity.id;
      this.supportSearch1 = name;
      this.showSupportList1 = false;
    } else {
      this.supportEntity2 = entity.id;
      this.supportSearch2 = name;
      this.showSupportList2 = false;
    }
  }

  private getSupportInputValue(searchText: string, entityId: string): string {
    if (searchText) return searchText;
    if (!entityId) return '';
    const entity = this.getEntities()[entityId];
    return entity ? this.getAttributeValue(entity, 'friendly_name') || entityId : entityId;
  }

  private getAttributeValue(state: HassState, key: string): string {
    const value = state.attributes?.[key];
    if (value === null || value === undefined) return '';
    return String(value);
  }

  private handleSave(): void {
    const selectedId = this.currentTab === 'entity'
      ? this.selectedEntityId
      : this.selectedButtonEntityId;

    if (!selectedId) {
      window.alert('Vyberte entitu');
      return;
    }

    const support_entities: TileSupportEntities = {
      top_right: this.supportEntity1 || undefined,
      bottom_right: this.supportEntity2 || undefined,
    };

    const config: TileConfig = {
      type: this.currentTab,
      entity_id: selectedId,
      label: this.label || undefined,
      icon: this.icon || undefined,
      color: this.color || undefined,
      action: this.currentTab === 'button' ? this.action : undefined,
      support_entities,
    };

    this.dispatchEvent(new CustomEvent('tile-saved', {
      detail: { index: this.tileIndex, side: this.tileSide, config },
      bubbles: true,
      composed: true,
    }));

    this.handleClose();
  }

  private renderEntityList(domains: string[], searchText: string, selectedId: string, handler: (id: string) => void) {
    const items = this.getEntityItems(domains, searchText);

    if (items.length === 0) {
      return html`<div class="support-empty">Žádné entity nenalezeny</div>`;
    }

    return html`
      ${items.map(item => html`
        <div
          class="entity-item ${selectedId === item.id ? 'selected' : ''}"
          @click=${() => handler(item.id)}
        >
          <div class="entity-icon">${this.getDisplayIcon(item.icon)}</div>
          <div class="entity-meta">
            <div class="entity-name">${item.name}</div>
            <div class="entity-sub">
              <span>${item.id}</span>
              <span>${item.value} ${item.unit}</span>
            </div>
          </div>
        </div>
      `)}
    `;
  }

  private renderSupportList(searchText: string, index: 1 | 2): unknown {
    const items = this.getSupportEntities(searchText);
    if (items.length === 0) {
      return html`<div class="support-empty">Žádné entity nenalezeny</div>`;
    }

    return html`
      ${items.map(item => html`
        <div
          class="support-item"
          @mousedown=${() => this.handleSupportSelect(index, item)}
        >
          <div class="support-name">${item.name}</div>
          <div class="support-value">${item.value} ${item.unit}</div>
        </div>
      `)}
    `;
  }

  // ── helpers for the unified form ──
  private get isButtonType(): boolean { return this.currentTab === 'button'; }
  private get selectedId(): string { return this.isButtonType ? this.selectedButtonEntityId : this.selectedEntityId; }
  private get entityDomains(): string[] {
    return this.isButtonType ? ['switch.', 'light.', 'fan.', 'input_boolean.'] : ['sensor.', 'binary_sensor.'];
  }
  private get entitySearch(): string { return this.isButtonType ? this.buttonSearchText : this.entitySearchText; }
  private setEntitySearch(v: string): void {
    if (this.isButtonType) this.buttonSearchText = v; else this.entitySearchText = v;
  }
  private selectEntity(id: string): void {
    if (this.isButtonType) this.handleButtonEntitySelect(id); else this.handleEntitySelect(id);
  }

  private renderPreview() {
    const id = this.selectedId;
    const st = id ? this.getEntities()[id] : null;
    const name = this.label || (st ? this.getAttributeValue(st, 'friendly_name') : '') || id || 'Nová dlaždice';
    const value = st ? String(st.state) : '—';
    const unit = st ? this.getAttributeValue(st, 'unit_of_measurement') : '';
    const iconRaw = this.icon || (this.isButtonType ? '⚡' : '📊');
    return html`
      <div class="pvwrap">
        <span class="pvlbl">náhled</span>
        <div class="ptile" style="--pc:${this.color}">
          <div class="pi">${renderIcon(iconRaw)}</div>
          <div class="pm">
            <div class="pn">${name}</div>
            <div class="pv">${value}${unit ? html` <small>${unit}</small>` : ''}</div>
          </div>
        </div>
      </div>
    `;
  }

  private renderIconGrid() {
    const q = this.iconSearch.trim().toLowerCase();
    const list = q ? ALL_ICON_NAMES.filter(n => n.includes(q)) : ALL_ICON_NAMES;
    return html`
      <input
        class="input"
        type="text"
        placeholder="🔍 Hledat ikonu..."
        .value=${this.iconSearch}
        @input=${(e: Event) => { this.iconSearch = (e.target as HTMLInputElement).value; }}
      />
      <div class="igrid">
        ${list.length === 0
          ? html`<div class="igrid-empty">Nic nenalezeno</div>`
          : list.map(n => html`
            <button
              class="ig ${this.icon === `mdi:${n}` ? 'sel' : ''}"
              type="button"
              title=${n}
              @click=${() => { this.icon = `mdi:${n}`; }}
            >${renderIcon(`mdi:${n}`)}</button>
          `)}
      </div>
    `;
  }

  private renderColorSwatches() {
    return html`
      <div class="sw">
        ${PRESET_COLORS.map(c => html`
          <button
            class="sc ${this.color.toLowerCase() === c ? 'sel' : ''}"
            type="button"
            style="background:${c}"
            title=${c}
            @click=${() => { this.color = c; }}
          ></button>
        `)}
        <input
          type="color"
          .value=${this.color}
          @input=${(e: Event) => { this.color = (e.target as HTMLInputElement).value; }}
        />
      </div>
    `;
  }

  render() {
    if (!this.isOpen) return null;
    const editing = this.tileIndex >= 0 || !!this.existingConfig;

    return html`
      <div class="overlay" @click=${(event: Event) => {
        if (event.target === event.currentTarget) this.handleClose();
      }}>
        <div class="dialog" @click=${(event: Event) => event.stopPropagation()}>
          <div class="header">
            <div class="title">${editing ? 'Upravit dlaždici' : 'Nová dlaždice'}</div>
            <button class="close-btn" type="button" @click=${this.handleClose} aria-label="Zavřít">×</button>
          </div>

          <div class="content">
            <div class="seg">
              <button class="${!this.isButtonType ? 'on' : ''}" type="button"
                @click=${() => { this.currentTab = 'entity'; }}>
                ${renderIcon('mdi:chart-box')} Senzor
              </button>
              <button class="${this.isButtonType ? 'on' : ''}" type="button"
                @click=${() => { this.currentTab = 'button'; if (this.color === '#03A9F4') this.color = '#FFC107'; }}>
                ${renderIcon('mdi:flash')} Tlačítko
              </button>
            </div>

            ${this.renderPreview()}

            <div class="sec">
              <div class="sect"><span class="n">1</span> Entita</div>
              ${this.isButtonType ? html`
                <select
                  .value=${this.action}
                  @change=${(e: Event) => { this.action = (e.target as HTMLSelectElement).value as ActionType; }}
                >
                  <option value="toggle">Akce: Přepnout (Toggle)</option>
                  <option value="turn_on">Akce: Zapnout</option>
                  <option value="turn_off">Akce: Vypnout</option>
                </select>
              ` : null}
              <input
                class="input"
                type="text"
                placeholder="🔍 Hledat entitu..."
                .value=${this.entitySearch}
                @input=${(e: Event) => { this.setEntitySearch((e.target as HTMLInputElement).value); }}
              />
              <div class="entity-list">
                ${this.renderEntityList(this.entityDomains, this.entitySearch, this.selectedId, (id) => this.selectEntity(id))}
              </div>
            </div>

            <div class="sec">
              <div class="sect"><span class="n">2</span> Vzhled</div>
              <div class="form-group">
                <label>Popisek (volitelné)</label>
                <input
                  class="input"
                  type="text"
                  placeholder="Např. Lednice v garáži"
                  .value=${this.label}
                  @input=${(e: Event) => { this.label = (e.target as HTMLInputElement).value; }}
                />
              </div>
              <div class="form-group">
                <label>Ikona</label>
                ${this.renderIconGrid()}
              </div>
              <div class="form-group">
                <label>Barva</label>
                ${this.renderColorSwatches()}
              </div>
            </div>

            <div class="sec">
              <div class="sect"><span class="n">3</span> Doplňky <span class="opt">(2 hodnoty v rozích, volitelné)</span></div>
              <div class="row">
                <div class="form-group support-field">
                  <label>↗ Pravý horní</label>
                  <input
                    class="input"
                    type="text"
                    placeholder="🔍 entita..."
                    .value=${this.getSupportInputValue(this.supportSearch1, this.supportEntity1)}
                    @input=${(e: Event) => { this.handleSupportInput(1, (e.target as HTMLInputElement).value); }}
                    @focus=${() => { if (this.supportSearch1.trim()) this.showSupportList1 = true; }}
                    @blur=${() => { this.showSupportList1 = false; }}
                  />
                  ${this.showSupportList1 ? html`<div class="support-list">${this.renderSupportList(this.supportSearch1, 1)}</div>` : null}
                </div>
                <div class="form-group support-field">
                  <label>↘ Pravý dolní</label>
                  <input
                    class="input"
                    type="text"
                    placeholder="🔍 entita..."
                    .value=${this.getSupportInputValue(this.supportSearch2, this.supportEntity2)}
                    @input=${(e: Event) => { this.handleSupportInput(2, (e.target as HTMLInputElement).value); }}
                    @focus=${() => { if (this.supportSearch2.trim()) this.showSupportList2 = true; }}
                    @blur=${() => { this.showSupportList2 = false; }}
                  />
                  ${this.showSupportList2 ? html`<div class="support-list">${this.renderSupportList(this.supportSearch2, 2)}</div>` : null}
                </div>
              </div>
            </div>
          </div>

          <div class="footer">
            <button class="btn btn-secondary" type="button" @click=${this.handleClose}>Zrušit</button>
            <button class="btn btn-primary" type="button" @click=${this.handleSave}>${editing ? 'Uložit změny' : 'Uložit dlaždici'}</button>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-tile-dialog': OigTileDialog;
  }
}
