import { LitElement, html, css, unsafeCSS } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { getIconEmoji } from '@/utils/format';

const u = unsafeCSS;

type IconCategory = Record<string, string[]>;

const ICON_CATEGORIES: IconCategory = {
  Spotrebice: [
    'fridge', 'fridge-outline', 'dishwasher', 'washing-machine', 'tumble-dryer', 'stove',
    'microwave', 'coffee-maker', 'kettle', 'toaster', 'blender', 'food-processor',
    'rice-cooker', 'slow-cooker', 'pressure-cooker', 'air-fryer', 'oven', 'range-hood',
  ],
  Osvetleni: [
    'lightbulb', 'lightbulb-outline', 'lamp', 'ceiling-light', 'floor-lamp', 'led-strip',
    'led-strip-variant', 'wall-sconce', 'chandelier', 'desk-lamp', 'spotlight',
    'light-switch',
  ],
  'Vytapeni & Chlazeni': [
    'thermometer', 'thermostat', 'radiator', 'radiator-disabled', 'heat-pump',
    'air-conditioner', 'fan', 'hvac', 'fire', 'snowflake', 'fireplace', 'heating-coil',
  ],
  'Energie & Baterie': [
    'lightning-bolt', 'flash', 'battery', 'battery-charging', 'battery-50', 'battery-10',
    'solar-panel', 'solar-power', 'meter-electric', 'power-plug', 'power-socket',
    'ev-plug', 'transmission-tower', 'current-ac', 'current-dc',
  ],
  'Auto & Doprava': [
    'car', 'car-electric', 'car-battery', 'ev-station', 'ev-plug-type2', 'garage',
    'garage-open', 'motorcycle', 'bicycle', 'scooter', 'bus', 'train', 'airplane',
  ],
  Zabezpeceni: [
    'door', 'door-open', 'lock', 'lock-open', 'shield-home', 'cctv', 'camera',
    'motion-sensor', 'alarm-light', 'bell', 'eye', 'key', 'fingerprint', 'shield-check',
  ],
  'Okna & Stineni': [
    'window-closed', 'window-open', 'blinds', 'blinds-open', 'curtains', 'roller-shade',
    'window-shutter', 'balcony', 'door-sliding',
  ],
  'Media & Zabava': [
    'television', 'speaker', 'speaker-wireless', 'music', 'volume-high', 'cast',
    'chromecast', 'radio', 'headphones', 'microphone', 'gamepad', 'movie', 'spotify',
  ],
  'Sit & IT': [
    'router-wireless', 'wifi', 'access-point', 'lan', 'network', 'home-assistant',
    'server', 'nas', 'cloud', 'ethernet', 'bluetooth', 'cellphone', 'tablet', 'laptop',
  ],
  'Voda & Koupelna': [
    'water', 'water-percent', 'water-boiler', 'water-pump', 'shower', 'toilet',
    'faucet', 'pipe', 'bathtub', 'sink', 'water-heater', 'pool',
  ],
  Pocasi: [
    'weather-sunny', 'weather-cloudy', 'weather-night', 'weather-rainy', 'weather-snowy',
    'weather-windy', 'weather-fog', 'weather-lightning', 'weather-hail', 'temperature',
    'humidity', 'barometer',
  ],
  'Ventilace & Kvalita vzduchu': [
    'fan', 'air-filter', 'air-purifier', 'smoke-detector', 'co2', 'wind-turbine',
  ],
  'Zahrada & Venku': [
    'flower', 'tree', 'sprinkler', 'grass', 'garden-light', 'outdoor-lamp', 'grill',
    'pool', 'hot-tub', 'umbrella', 'thermometer-lines',
  ],
  Domacnost: ['iron', 'vacuum', 'broom', 'mop', 'washing', 'basket', 'hanger', 'scissors'],
  'Notifikace & Stav': [
    'information', 'help-circle', 'alert-circle', 'checkbox-marked-circle', 'check', 'close',
    'minus', 'plus', 'arrow-up', 'arrow-down', 'refresh', 'sync', 'bell-ring',
  ],
  Ovladani: [
    'toggle-switch', 'power', 'play', 'pause', 'stop', 'skip-next', 'skip-previous',
    'volume-up', 'volume-down', 'brightness-up', 'brightness-down',
  ],
  'Cas & Planovani': ['clock', 'timer', 'alarm', 'calendar', 'calendar-clock', 'schedule', 'history'],
  Ostatni: [
    'home', 'cog', 'tools', 'wrench', 'hammer', 'chart-line', 'gauge', 'dots-vertical',
    'menu', 'settings', 'account', 'logout',
  ],
};

@customElement('oig-icon-picker')
export class OigIconPicker extends LitElement {
  @property({ type: Boolean, reflect: true, attribute: 'open' }) isOpen = false;
  @state() private searchQuery = '';

  static styles = css`
    :host {
      display: block;
    }

    .overlay {
      position: fixed;
      inset: 0;
      background: color-mix(in srgb, ${u(CSS_VARS.bgPrimary)} 35%, transparent);
      backdrop-filter: blur(6px);
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s ease;
    }

    :host([open]) .overlay {
      opacity: 1;
      pointer-events: auto;
    }

    .modal {
      width: min(720px, 100%);
      max-height: 80vh;
      background: ${u(CSS_VARS.cardBg)};
      box-shadow: ${u(CSS_VARS.cardShadow)};
      border-radius: 14px;
      border: 1px solid ${u(CSS_VARS.divider)};
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: translateY(8px) scale(0.98);
      transition: transform 0.2s ease;
    }

    :host([open]) .modal {
      transform: translateY(0) scale(1);
    }

    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16px 18px 10px;
      border-bottom: 1px solid ${u(CSS_VARS.divider)};
      gap: 12px;
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
      width: 28px;
      height: 28px;
      border-radius: 8px;
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

    .search {
      padding: 12px 18px;
      border-bottom: 1px solid ${u(CSS_VARS.divider)};
      background: ${u(CSS_VARS.bgSecondary)};
    }

    .search input {
      width: 100%;
      padding: 10px 12px;
      border-radius: 10px;
      border: 1px solid ${u(CSS_VARS.divider)};
      background: ${u(CSS_VARS.bgPrimary)};
      color: ${u(CSS_VARS.textPrimary)};
      font-size: 13px;
      outline: none;
    }

    .search input::placeholder {
      color: ${u(CSS_VARS.textSecondary)};
    }

    .content {
      padding: 16px 18px 20px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }

    .category {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .category-title {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .icon-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
      gap: 10px;
    }

    .icon-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 8px 6px;
      border-radius: 10px;
      border: 1px solid transparent;
      background: ${u(CSS_VARS.bgSecondary)};
      cursor: pointer;
      transition: transform 0.15s ease, border 0.2s ease, background 0.2s ease;
      text-align: center;
      font-size: 10px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .icon-item:hover {
      background: ${u(CSS_VARS.bgPrimary)};
      border-color: ${u(CSS_VARS.accent)};
      transform: translateY(-2px);
      color: ${u(CSS_VARS.textPrimary)};
    }

    .icon-emoji {
      font-size: 22px;
      line-height: 1;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .icon-name {
      width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .empty {
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
      text-align: center;
      padding: 24px 0 12px;
    }
  `;

  private get filteredCategories(): IconCategory {
    const query = this.searchQuery.trim().toLowerCase();
    if (!query) return ICON_CATEGORIES;

    const entries = Object.entries(ICON_CATEGORIES)
      .map(([category, icons]) => {
        const filtered = icons.filter(icon => icon.toLowerCase().includes(query));
        return [category, filtered] as [string, string[]];
      })
      .filter(([, icons]) => icons.length > 0);

    return Object.fromEntries(entries);
  }

  public open(): void {
    this.isOpen = true;
  }

  close(): void {
    this.isOpen = false;
    this.searchQuery = '';
  }

  private onOverlayClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.close();
    }
  }

  private onSearchInput(event: Event): void {
    const target = event.target as HTMLInputElement | null;
    this.searchQuery = target?.value ?? '';
  }

  private onIconClick(icon: string): void {
    this.dispatchEvent(new CustomEvent('icon-selected', {
      detail: { icon: `mdi:${icon}` },
      bubbles: true,
      composed: true,
    }));
    this.close();
  }

  render() {
    if (!this.isOpen) return null;
    const categories = this.filteredCategories;
    const entries = Object.entries(categories);

    return html`
      <div class="overlay" @click=${this.onOverlayClick}>
        <div class="modal" @click=${(event: Event) => event.stopPropagation()}>
          <div class="header">
            <div class="title">Vyberte ikonu</div>
            <button class="close-btn" type="button" @click=${this.close} aria-label="Zavřít">×</button>
          </div>
          <div class="search">
            <input
              type="text"
              .value=${this.searchQuery}
              @input=${this.onSearchInput}
              placeholder="Hledejte ikonu..."
            />
          </div>
          <div class="content">
            ${entries.length === 0 ? html`
              <div class="empty">Žádné ikony nenalezeny</div>
            ` : entries.map(([category, icons]) => html`
              <div class="category">
                <div class="category-title">${category}</div>
                <div class="icon-grid">
                  ${icons.map(icon => html`
                    <button class="icon-item" type="button" @click=${() => this.onIconClick(icon)}>
                      <span class="icon-emoji">${getIconEmoji(icon)}</span>
                      <span class="icon-name">${icon}</span>
                    </button>
                  `)}
                </div>
              </div>
            `)}
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-icon-picker': OigIconPicker;
  }
}
