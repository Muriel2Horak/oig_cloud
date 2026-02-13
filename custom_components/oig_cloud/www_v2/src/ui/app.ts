import { LitElement, html, css, unsafeCSS, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { CSS_VARS } from '@/ui/theme';
import { Tab } from '@/ui/layout/tabs';
import { EntityStore } from '@/data/entity-store';
import { HaClient } from '@/data/ha-client';
import { extractFlowData, buildFlowNodes, buildFlowConnections } from '@/data/flow-data';
import { loadPricingData } from '@/data/pricing-data';
import { loadBoilerData } from '@/data/boiler-data';
import { FlowNode, FlowConnection, DEFAULT_NODES, DEFAULT_CONNECTIONS } from '@/ui/features/flow/types';
import { PricingData, PricingStats } from '@/ui/features/pricing/types';
import { BoilerProfile, BoilerState, BoilerHourData } from '@/ui/features/boiler/types';
import { oigLog } from '@/core/logger';

import '@/ui/components/header';
import '@/ui/components/theme-provider';
import '@/ui/layout/tabs';
import '@/ui/layout/grid';
import '@/ui/features/flow';
import '@/ui/features/pricing';
import '@/ui/features/boiler';

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
  @state() private flowNodes: FlowNode[] = DEFAULT_NODES;
  @state() private flowConnections: FlowConnection[] = DEFAULT_CONNECTIONS;
  @state() private pricingData: PricingData | null = null;
  @state() private pricingStats: PricingStats | null = null;
  @state() private boilerState: BoilerState | null = null;
  @state() private boilerProfiles: BoilerProfile[] = [];
  @state() private boilerHeatmap: BoilerHourData[] = [];
  @state() private pricingLoading = false;
  @state() private boilerLoading = false;

  private entityStore: EntityStore | null = null;
  private timeInterval: number | null = null;
  private hassUnsubscribe: (() => void) | null = null;

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
    this.hassUnsubscribe?.();
    if (this.timeInterval !== null) {
      clearInterval(this.timeInterval);
    }
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has('hass') && this.hass) {
      this.entityStore = new EntityStore(this.hass);
      this.updateFlowData();
      this.loadPricingData();
      this.loadBoilerDataAsync();
      this.subscribeToHassChanges();
    }
    if (changed.has('activeTab')) {
      if (this.activeTab === 'pricing' && !this.pricingData) {
        this.loadPricingData();
      }
      if (this.activeTab === 'boiler' && !this.boilerState) {
        this.loadBoilerDataAsync();
      }
    }
  }

  private subscribeToHassChanges(): void {
    this.hassUnsubscribe?.();
    
    if (this.hass?.connection?.subscribeEvents) {
      this.hass.connection.subscribeEvents((event: any) => {
        if (event.event_type === 'state_changed') {
          this.updateFlowData();
        }
      }, 'state_changed').then((unsub: () => void) => {
        this.hassUnsubscribe = unsub;
      }).catch((err: Error) => {
        oigLog.warn('Failed to subscribe to HA events', err);
      });
    }
  }

  private updateFlowData(): void {
    if (!this.hass) {
      oigLog.warn('updateFlowData: no hass');
      return;
    }
    
    try {
      const data = extractFlowData(this.hass);
      oigLog.info('Flow data extracted', data);
      this.flowNodes = buildFlowNodes(data);
      this.flowConnections = buildFlowConnections(data);
      oigLog.info('Flow nodes updated', { nodes: this.flowNodes.length, firstNode: this.flowNodes[0] });
    } catch (err) {
      oigLog.error('Failed to extract flow data', err as Error);
    }
  }

  private async loadPricingData(): Promise<void> {
    if (!this.hass || this.pricingLoading) return;
    
    this.pricingLoading = true;
    try {
      const data = await loadPricingData(this.hass);
      this.pricingData = data;
      this.pricingStats = data?.stats || null;
    } catch (err) {
      oigLog.error('Failed to load pricing data', err as Error);
    } finally {
      this.pricingLoading = false;
    }
  }

  private async loadBoilerDataAsync(): Promise<void> {
    if (!this.hass || this.boilerLoading) return;
    
    this.boilerLoading = true;
    try {
      const data = await loadBoilerData(this.hass);
      this.boilerState = data.state;
      this.boilerProfiles = data.profiles;
      this.boilerHeatmap = data.heatmap;
    } catch (err) {
      oigLog.error('Failed to load boiler data', err as Error);
    } finally {
      this.boilerLoading = false;
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
      
      // Trigger data loading after hass is set
      this.entityStore = new EntityStore(this.hass);
      this.updateFlowData();
      this.loadPricingData();
      this.loadBoilerDataAsync();
      this.subscribeToHassChanges();
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
    
    oigLog.info('Rendering app', { 
      flowNodesCount: this.flowNodes.length, 
      firstNodePower: this.flowNodes[0]?.power,
      activeTab: this.activeTab 
    });

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
              <oig-flow-canvas
                .nodes=${this.flowNodes}
                .connections=${this.flowConnections}
                particlesEnabled
                .active=${this.activeTab === 'flow'}
              ></oig-flow-canvas>
            </div>

            <div class="tab-content ${this.activeTab === 'pricing' ? 'active' : ''}">
              <oig-pricing-stats .stats=${this.pricingStats}></oig-pricing-stats>
              <oig-pricing-chart .data=${this.pricingData}></oig-pricing-chart>
            </div>

            <div class="tab-content ${this.activeTab === 'boiler' ? 'active' : ''}">
              <oig-boiler-state .state=${this.boilerState}></oig-boiler-state>
              <oig-boiler-heatmap .data=${this.boilerHeatmap}></oig-boiler-heatmap>
              <oig-boiler-profiles .profiles=${this.boilerProfiles} .editMode=${this.editMode}></oig-boiler-profiles>
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
