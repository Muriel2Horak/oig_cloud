import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { getIconEmoji } from '@/utils/format';
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
  @state() private iconPickerOpen = false;

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
      width: min(520px, 100%);
      max-height: 85vh;
      background: ${u(CSS_VARS.cardBg)};
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
    this.iconPickerOpen = false;
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

  private getDisplayIcon(icon: string): string {
    if (!icon) return getIconEmoji('');
    if (icon.startsWith('mdi:')) return getIconEmoji(icon);
    return icon;
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

  private onIconSelected(event: CustomEvent<{ icon: string }>): void {
    this.icon = event.detail?.icon || '';
    this.iconPickerOpen = false;
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

  private renderEntityTab() {
    return html`
      <div class="form-group">
        <label>Vyberte hlavní entitu:</label>
        <input
          class="input"
          type="text"
          placeholder="🔍 Hledat entitu..."
          .value=${this.entitySearchText}
          @input=${(event: Event) => {
            this.entitySearchText = (event.target as HTMLInputElement).value;
          }}
        />
      </div>

      <div class="entity-list">
        ${this.renderEntityList(['sensor.', 'binary_sensor.'], this.entitySearchText, this.selectedEntityId, (id) => this.handleEntitySelect(id))}
      </div>

      <div class="form-group">
        <label>Vlastní popisek (volitelné):</label>
        <input
          class="input"
          type="text"
          placeholder="Např. Lednice v garáži"
          .value=${this.label}
          @input=${(event: Event) => {
            this.label = (event.target as HTMLInputElement).value;
          }}
        />
      </div>

      <div class="row">
        <div class="form-group">
          <label>Ikona (volitelné):</label>
          <div class="icon-input">
            <button class="icon-preview" type="button" @click=${() => { this.iconPickerOpen = true; }}>
              ${this.getDisplayIcon(this.icon || '')}
            </button>
            <input
              class="input icon-field"
              type="text"
              .value=${this.icon}
              readonly
              placeholder="Klikni na ikonu..."
            />
            <button class="icon-btn" type="button" @click=${() => { this.iconPickerOpen = true; }}>📋</button>
          </div>
        </div>

        <div class="form-group">
          <label>Barva:</label>
          <input
            class="color-input"
            type="color"
            .value=${this.color}
            @input=${(event: Event) => {
              this.color = (event.target as HTMLInputElement).value;
            }}
          />
        </div>
      </div>

      <div class="divider"></div>

      <div class="form-group support-field">
        <label>🔹 Podpůrná entita 1 (pravý horní roh, volitelné):</label>
        <input
          class="input"
          type="text"
          placeholder="🔍 Hledat entitu nebo ponechat prázdné..."
          .value=${this.getSupportInputValue(this.supportSearch1, this.supportEntity1)}
          @input=${(event: Event) => {
            this.handleSupportInput(1, (event.target as HTMLInputElement).value);
          }}
          @focus=${() => { if (this.supportSearch1.trim()) this.showSupportList1 = true; }}
          @blur=${() => { this.showSupportList1 = false; }}
        />
        ${this.showSupportList1 ? html`
          <div class="support-list">
            ${this.renderSupportList(this.supportSearch1, 1)}
          </div>
        ` : null}
      </div>

      <div class="form-group support-field">
        <label>🔹 Podpůrná entita 2 (pravý dolní roh, volitelné):</label>
        <input
          class="input"
          type="text"
          placeholder="🔍 Hledat entitu nebo ponechat prázdné..."
          .value=${this.getSupportInputValue(this.supportSearch2, this.supportEntity2)}
          @input=${(event: Event) => {
            this.handleSupportInput(2, (event.target as HTMLInputElement).value);
          }}
          @focus=${() => { if (this.supportSearch2.trim()) this.showSupportList2 = true; }}
          @blur=${() => { this.showSupportList2 = false; }}
        />
        ${this.showSupportList2 ? html`
          <div class="support-list">
            ${this.renderSupportList(this.supportSearch2, 2)}
          </div>
        ` : null}
      </div>
    `;
  }

  private renderButtonTab() {
    return html`
      <div class="form-group">
        <label>Akce:</label>
        <select
          .value=${this.action}
          @change=${(event: Event) => {
            this.action = (event.target as HTMLSelectElement).value as ActionType;
          }}
        >
          <option value="toggle">Přepnout (Toggle)</option>
          <option value="turn_on">Zapnout</option>
          <option value="turn_off">Vypnout</option>
        </select>
      </div>

      <div class="form-group">
        <label>Vyberte entitu pro tlačítko:</label>
        <input
          class="input"
          type="text"
          placeholder="🔍 Hledat entitu..."
          .value=${this.buttonSearchText}
          @input=${(event: Event) => {
            this.buttonSearchText = (event.target as HTMLInputElement).value;
          }}
        />
      </div>

      <div class="entity-list">
        ${this.renderEntityList(['switch.', 'light.', 'fan.', 'input_boolean.'], this.buttonSearchText, this.selectedButtonEntityId, (id) => this.handleButtonEntitySelect(id))}
      </div>

      <div class="form-group">
        <label>Popisek:</label>
        <input
          class="input"
          type="text"
          placeholder="Světlo obývák"
          .value=${this.label}
          @input=${(event: Event) => {
            this.label = (event.target as HTMLInputElement).value;
          }}
        />
      </div>

      <div class="row">
        <div class="form-group">
          <label>Ikona:</label>
          <div class="icon-input">
            <button class="icon-preview" type="button" @click=${() => { this.iconPickerOpen = true; }}>
              ${this.getDisplayIcon(this.icon || '')}
            </button>
            <input
              class="input icon-field"
              type="text"
              .value=${this.icon}
              readonly
              placeholder="Klikni na ikonu..."
            />
            <button class="icon-btn" type="button" @click=${() => { this.iconPickerOpen = true; }}>📋</button>
          </div>
        </div>

        <div class="form-group">
          <label>Barva:</label>
          <input
            class="color-input"
            type="color"
            .value=${this.color}
            @input=${(event: Event) => {
              this.color = (event.target as HTMLInputElement).value;
            }}
          />
        </div>
      </div>

      <div class="divider"></div>

      <div class="form-group support-field">
        <label>🔹 Podpůrná entita 1 (pravý horní roh, volitelné):</label>
        <input
          class="input"
          type="text"
          placeholder="🔍 Hledat entitu nebo ponechat prázdné..."
          .value=${this.getSupportInputValue(this.supportSearch1, this.supportEntity1)}
          @input=${(event: Event) => {
            this.handleSupportInput(1, (event.target as HTMLInputElement).value);
          }}
          @focus=${() => { if (this.supportSearch1.trim()) this.showSupportList1 = true; }}
          @blur=${() => { this.showSupportList1 = false; }}
        />
        ${this.showSupportList1 ? html`
          <div class="support-list">
            ${this.renderSupportList(this.supportSearch1, 1)}
          </div>
        ` : null}
      </div>

      <div class="form-group support-field">
        <label>🔹 Podpůrná entita 2 (pravý dolní roh, volitelné):</label>
        <input
          class="input"
          type="text"
          placeholder="🔍 Hledat entitu nebo ponechat prázdné..."
          .value=${this.getSupportInputValue(this.supportSearch2, this.supportEntity2)}
          @input=${(event: Event) => {
            this.handleSupportInput(2, (event.target as HTMLInputElement).value);
          }}
          @focus=${() => { if (this.supportSearch2.trim()) this.showSupportList2 = true; }}
          @blur=${() => { this.showSupportList2 = false; }}
        />
        ${this.showSupportList2 ? html`
          <div class="support-list">
            ${this.renderSupportList(this.supportSearch2, 2)}
          </div>
        ` : null}
      </div>
    `;
  }

  render() {
    if (!this.isOpen) return null;

    return html`
      <div class="overlay" @click=${(event: Event) => {
        if (event.target === event.currentTarget) this.handleClose();
      }}>
        <div class="dialog" @click=${(event: Event) => event.stopPropagation()}>
          <div class="header">
            <div class="title">Konfigurace dlaždice</div>
            <button class="close-btn" type="button" @click=${this.handleClose} aria-label="Zavřít">×</button>
          </div>

          <div class="tabs">
            <button
              class="tab-btn ${this.currentTab === 'entity' ? 'active' : ''}"
              type="button"
              @click=${() => { this.currentTab = 'entity'; }}
            >📊 Entity</button>
            <button
              class="tab-btn ${this.currentTab === 'button' ? 'active' : ''}"
              type="button"
              @click=${() => { this.currentTab = 'button'; if (this.color === '#03A9F4') this.color = '#FFC107'; }}
            >🔘 Tlačítko</button>
          </div>

          <div class="content">
            <div class="tab-content ${this.currentTab === 'entity' ? 'active' : ''}">
              ${this.renderEntityTab()}
            </div>
            <div class="tab-content ${this.currentTab === 'button' ? 'active' : ''}">
              ${this.renderButtonTab()}
            </div>
          </div>

          <div class="footer">
            <button class="btn btn-secondary" type="button" @click=${this.handleClose}>Zrušit</button>
            <button class="btn btn-primary" type="button" @click=${this.handleSave}>Uložit</button>
          </div>
        </div>
      </div>

      <oig-icon-picker
        ?open=${this.iconPickerOpen}
        @icon-selected=${this.onIconSelected}
        @close=${() => { this.iconPickerOpen = false; }}
      ></oig-icon-picker>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-tile-dialog': OigTileDialog;
  }
}
