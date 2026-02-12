import { LitElement, html, css, unsafeCSS, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { Tab } from '@/ui/layout/tabs';
import { EntityStore } from '@/data/entity-store';
import { HaClient } from '@/data/ha-client';
import { oigLog } from '@/core/logger';

const u = unsafeCSS;

const DEFAULT_TABS: Tab[] = [
  { id: 'flow', label: 'Toky', icon: '⚡' },
  { id: 'pricing', label: 'Ceny', icon: '💰' },
  { id: 'boiler', label: 'Bojler', icon: '🔥' },
];

@customElement('oig-app')
export class OigApp extends LitElement {
  @property({ type: Object }) hass: any = null;
  @state() private loading = true;
  @state() private error: string | null = null;
  @state() private activeTab = 'flow';
  @state() private editMode = false;
  @state() private time = '';

  private entityStore: EntityStore | null = null;
  private timeInterval: number | null = null;

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      font-family: ${u(CSS_VARS.fontFamily)};
      color: ${u(CSS_VARS.textPrimary)};
      background: ${u(CSS_VARS.bgPrimary)};
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
      font-size: 14px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .error {
      padding: 20px;
      color: ${u(CSS_VARS.error)};
      text-align: center;
    }

    .error h2 {
      margin-bottom: 8px;
    }

    main {
      flex: 1;
      overflow: auto;
      padding: 16px;
      background: ${u(CSS_VARS.bgSecondary)};
    }

    .tab-content {
      display: none;
    }

    .tab-content.active {
      display: block;
    }

    .placeholder {
      padding: 40px;
      text-align: center;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .placeholder h3 {
      margin-bottom: 8px;
      color: ${u(CSS_VARS.textPrimary)};
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.initHass();
    this.startTimeUpdate();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.entityStore?.destroy();
    if (this.timeInterval !== null) {
      clearInterval(this.timeInterval);
    }
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has('hass') && this.hass) {
      this.entityStore = new EntityStore(this.hass);
    }
  }

  private async initHass(): Promise<void> {
    try {
      const client = new HaClient();
      const hass = await client.getHass();
      
      if (!hass) {
        throw new Error('Cannot access Home Assistant context');
      }
      
      this.hass = hass;
      this.loading = false;
      oigLog.info('App initialized', { entities: Object.keys(hass.states || {}).length });
    } catch (err) {
      this.error = (err as Error).message;
      this.loading = false;
      oigLog.error('App init failed', err as Error);
    }
  }

  private startTimeUpdate(): void {
    const updateTime = () => {
      this.time = new Date().toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' });
    };
    updateTime();
    this.timeInterval = window.setInterval(updateTime, 1000);
  }

  private onTabChange(e: CustomEvent): void {
    this.activeTab = e.detail.tabId;
  }

  private onEditClick(): void {
    this.editMode = !this.editMode;
  }

  private onResetClick(): void {
    const grid = this.shadowRoot?.querySelector('oig-grid');
    if (grid) {
      (grid as any).resetLayout();
    }
  }

  render() {
    if (this.loading) {
      return html`<div class="loading">Načítání...</div>`;
    }

    if (this.error) {
      return html`
        <div class="error">
          <h2>Chyba připojení</h2>
          <p>${this.error}</p>
        </div>
      `;
    }

    return html`
      <oig-theme-provider>
        <oig-header
          title="Energetické Toky"
          .time=${this.time}
          .showStatus=${true}
          .alertCount=${0}
          @edit-click=${this.onEditClick}
          @reset-click=${this.onResetClick}
        ></oig-header>

        <oig-tabs
          .tabs=${DEFAULT_TABS}
          .activeTab=${this.activeTab}
          @tab-change=${this.onTabChange}
        ></oig-tabs>

        <main>
          <oig-grid .editable=${this.editMode}>
            <div class="tab-content ${this.activeTab === 'flow' ? 'active' : ''}">
              <oig-flow-canvas particlesEnabled></oig-flow-canvas>
            </div>

            <div class="tab-content ${this.activeTab === 'pricing' ? 'active' : ''}">
              <oig-pricing-stats></oig-pricing-stats>
              <oig-pricing-chart></oig-pricing-chart>
            </div>

            <div class="tab-content ${this.activeTab === 'boiler' ? 'active' : ''}">
              <oig-boiler-state></oig-boiler-state>
              <oig-boiler-heatmap></oig-boiler-heatmap>
              <oig-boiler-profiles .editMode=${this.editMode}></oig-boiler-profiles>
            </div>
          </oig-grid>
        </main>
      </oig-theme-provider>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-app': OigApp;
  }
}
