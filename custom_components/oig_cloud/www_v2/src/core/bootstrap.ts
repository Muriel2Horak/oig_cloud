import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { HaClient } from '@/data/ha-client';
import { EntityStore } from '@/data/entity-store';
import { oigLog } from './logger';
import { setupErrorHandling } from './errors';

const STORAGE_PREFIX = 'oig_v2_';

interface BootstrapConfig {
  version: string;
  storagePrefix: string;
}

@customElement('oig-shell')
export class OigShell extends LitElement {
  @property({ type: Object }) hass: any = null;
  @state() private loading = true;
  @state() private error: string | null = null;
  @state() private activeTab = 'flow';
  
  private haClient: HaClient | null = null;
  private entityStore: EntityStore | null = null;

  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      width: 100%;
      font-family: var(--primary-font-family, system-ui);
      color: var(--primary-text-color, #333);
      background: var(--primary-background-color, #fff);
    }
    
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
    
    .error {
      padding: 20px;
      color: var(--error-color, #c00);
    }
    
    header {
      padding: 12px 16px;
      border-bottom: 1px solid var(--divider-color, #eee);
      display: flex;
      align-items: center;
      gap: 16px;
    }
    
    h1 {
      margin: 0;
      font-size: 18px;
      font-weight: 500;
    }
    
    .tabs {
      display: flex;
      gap: 8px;
      margin-left: auto;
    }
    
    .tab {
      padding: 8px 16px;
      border: none;
      background: transparent;
      cursor: pointer;
      border-radius: 4px;
      color: var(--primary-text-color);
      font-size: 14px;
    }
    
    .tab:hover {
      background: var(--secondary-background-color, #f5f5f5);
    }
    
    .tab.active {
      background: var(--primary-color, #03a9f4);
      color: var(--text-primary-color, #fff);
    }
    
    main {
      flex: 1;
      overflow: auto;
      padding: 16px;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.initHass();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.entityStore?.destroy();
  }

  private async initHass() {
    try {
      this.haClient = new HaClient();
      const hass = await this.haClient.getHass();
      
      if (!hass) {
        throw new Error('Cannot access Home Assistant context');
      }
      
      this.hass = hass;
      this.entityStore = new EntityStore(hass);
      
      oigLog.info('HASS connected', { 
        user: hass.user?.name,
        entities: Object.keys(hass.states || {}).length 
      });
      
      this.loading = false;
    } catch (err) {
      this.error = (err as Error).message;
      this.loading = false;
      oigLog.error('HASS init failed', err as Error);
    }
  }

  private onTabClick(tab: string) {
    this.activeTab = tab;
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
      <header>
        <h1>⚡ Energetické Toky</h1>
        <span>V2 Beta</span>
        <div class="tabs">
          <button 
            class="tab ${this.activeTab === 'flow' ? 'active' : ''}"
            @click=${() => this.onTabClick('flow')}
          >Toky</button>
          <button 
            class="tab ${this.activeTab === 'pricing' ? 'active' : ''}"
            @click=${() => this.onTabClick('pricing')}
          >Predikce a statistiky</button>
          <button 
            class="tab ${this.activeTab === 'boiler' ? 'active' : ''}"
            @click=${() => this.onTabClick('boiler')}
          >Bojler</button>
        </div>
      </header>
      <main>
        <p>Active tab: ${this.activeTab}</p>
        <p>Entities loaded: ${this.entityStore ? Object.keys(this.entityStore.getAll()).length : 0}</p>
      </main>
    `;
  }
}

export async function bootstrap(): Promise<OigShell> {
  oigLog.info('Bootstrap starting');
  
  setupErrorHandling();
  
  if (!customElements.get('oig-shell')) {
    customElements.define('oig-shell', OigShell);
  }
  
  const config: BootstrapConfig = {
    version: import.meta.env.VITE_VERSION || '2.0.0',
    storagePrefix: STORAGE_PREFIX
  };
  
  oigLog.info('Bootstrap complete', config);
  
  const shell = document.createElement('oig-shell') as OigShell;
  return shell;
}
