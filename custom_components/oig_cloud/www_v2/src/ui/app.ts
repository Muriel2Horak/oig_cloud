import { LitElement, html, css, nothing, unsafeCSS, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { OigGridChargingDialog } from '@/ui/features/flow/grid-charging-dialog';
import { CSS_VARS } from '@/ui/theme';
import { Tab } from '@/ui/layout/tabs';
import { createEntityStore, EntityStore } from '@/data/entity-store';
import { stateWatcher } from '@/data/state-watcher';
import { haClient } from '@/data/ha-client';
import { extractFlowData } from '@/data/flow-data';
import { loadPricingData } from '@/data/pricing-data';
import { loadBoilerData } from '@/data/boiler-data';
import { loadAnalyticsData, type AnalyticsData, EMPTY_ANALYTICS } from '@/data/analytics-data';
import { extractChmuData, type ChmuData, EMPTY_CHMU_DATA } from '@/data/chmu-data';
import { loadTimelineTab, type TimelineDayData, type TimelineTab } from '@/data/timeline-data';
import { loadTilesConfig, saveTilesConfig, resolveTiles, type TilesConfig, type TileConfig, type ResolvedTile } from '@/data/tiles-data';
import { FlowData, EMPTY_FLOW_DATA } from '@/ui/features/flow/types';
import { PricingData } from '@/ui/features/pricing/types';
import {
  BoilerState,
  BoilerPlan, BoilerEnergyBreakdown, BoilerPredictedUsage,
  BoilerConfig, BoilerHeatmapRow, BoilerProfilingData,
} from '@/ui/features/boiler/types';
import { oigLog } from '@/core/logger';
import { throttle, withRetry } from '@/utils/format';
import { shieldController } from '@/data/shield-controller';

import '@/ui/components/header';
import '@/ui/components/theme-provider';
import '@/ui/layout/tabs';
import '@/ui/layout/grid';
import '@/ui/features/flow';
import '@/ui/features/flow/grid-charging-dialog';
import '@/ui/features/pricing';
import '@/ui/features/boiler';
import '@/ui/features/control-panel';
import '@/ui/features/analytics';
import '@/ui/features/chmu';
import '@/ui/features/timeline';
import '@/ui/features/tiles';
import '@/ui/features/tiles/icon-picker';
import '@/ui/features/tiles/tile-dialog';

const u = unsafeCSS;

/** OIG sensor prefix for this inverter */
const params = new URLSearchParams(window.location.search);
const INVERTER_SN = params.get('sn') || params.get('inverter_sn') || '2206237016';
const OIG_SENSOR_PREFIX = `sensor.oig_${INVERTER_SN}_`;

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
  @state() private leftPanelCollapsed = false;
  @state() private rightPanelCollapsed = false;

  // Flow
  @state() private flowData: FlowData = EMPTY_FLOW_DATA;

  // Pricing
  @state() private pricingData: PricingData | null = null;
  @state() private pricingLoading = false;

  // Boiler
  @state() private boilerState: BoilerState | null = null;
  @state() private boilerLoading = false;
  @state() private boilerPlan: BoilerPlan | null = null;
  @state() private boilerEnergyBreakdown: BoilerEnergyBreakdown | null = null;
  @state() private boilerPredictedUsage: BoilerPredictedUsage | null = null;
  @state() private boilerConfig: BoilerConfig | null = null;
  @state() private boilerHeatmap7x24: BoilerHeatmapRow[] = [];
  @state() private boilerProfiling: BoilerProfilingData | null = null;
  @state() private boilerCurrentCategory = '';
  @state() private boilerAvailableCategories: string[] = [];
  @state() private boilerForecastWindows: { fve: string; grid: string } = { fve: '--', grid: '--' };
  private boilerRefreshTimer: number | null = null;

  // Analytics
  @state() private analyticsData: AnalyticsData = EMPTY_ANALYTICS;

  // ČHMÚ
  @state() private chmuData: ChmuData = EMPTY_CHMU_DATA;
  @state() private chmuModalOpen = false;

  // Timeline
  @state() private timelineTab: TimelineTab = 'today';
  @state() private timelineData: TimelineDayData | null = null;

  // Tiles
  @state() private tilesConfig: TilesConfig | null = null;
  @state() private tilesLeft: ResolvedTile[] = [];
  @state() private tilesRight: ResolvedTile[] = [];

  @state() private tileDialogOpen = false;
  @state() private editingTileIndex = -1;
  @state() private editingTileSide: 'left' | 'right' = 'left';
  @state() private editingTileConfig: TileConfig | null = null;


  private entityStore: EntityStore | null = null;
  private timeInterval: number | null = null;
  private stateWatcherUnsub: (() => void) | null = null;
  private tileEntityUnsubs: Array<() => void> = [];

  /** Throttled flow update — max once per 500ms to avoid jank from rapid state changes */
  private throttledUpdateFlow = throttle(() => this.updateFlowData(), 500);
  /** Throttled ČHMÚ + tiles update — these rely on entity store */
  private throttledUpdateSensors = throttle(() => this.updateSensorData(), 1000);

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

    /* ---- Loading & Error ---- */
    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 12px;
      font-size: 14px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .spinner {
      display: inline-block;
      width: 24px;
      height: 24px;
      border: 3px solid ${u(CSS_VARS.divider)};
      border-top-color: ${u(CSS_VARS.accent)};
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    .spinner--small {
      width: 14px;
      height: 14px;
      border-width: 2px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .error {
      padding: 20px;
      color: ${u(CSS_VARS.error)};
      text-align: center;
      animation: fadeIn 0.3s ease;
    }

    .error h2 {
      margin-bottom: 8px;
    }

    .error button {
      margin-top: 12px;
      padding: 8px 16px;
      background: ${u(CSS_VARS.accent)};
      color: #fff;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 13px;
    }

    .error button:hover { opacity: 0.9; }

    /* ---- Main layout ---- */
    main {
      flex: 1;
      overflow: auto;
      padding: 16px;
      background: ${u(CSS_VARS.bgSecondary)};
    }

    .tab-content {
      display: none;
      grid-column: 1 / -1;
    }

    .tab-content.active {
      display: block;
      animation: fadeIn 0.25s ease;
    }

    .tab-content.boiler-layout.active {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    /* ---- Flow tab layout: tiles | canvas | control ---- */
    .flow-layout {
      display: grid;
      grid-template-columns: 200px 1fr 300px;
      grid-template-areas: 'tiles canvas control';
      gap: 12px;
      width: 100%;
      align-items: start;
    }

    .flow-tiles-stack {
      grid-area: tiles;
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 0;
      overflow: hidden;
    }

    .flow-center {
      grid-area: canvas;
      min-width: 0;
    }

    .flow-control {
      grid-area: control;
      min-width: 0;
    }

    /* ---- Pricing tab layout ---- */
    .pricing-layout {
      display: flex;
      flex-direction: column;
      gap: 16px;
      position: relative;
    }

    .tab-loading-overlay {
      position: absolute;
      top: 8px;
      right: 8px;
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 4px 10px;
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.12);
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
      z-index: 10;
      animation: fadeIn 0.2s ease;
    }

    .analytics-row {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 12px;
    }

    .below-chart-pair {
      display: grid;
      grid-template-columns: 1fr 2fr;
      gap: 12px;
    }

    /* ---- Animations ---- */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(4px); }
      to { opacity: 1; transform: translateY(0); }
    }

    /* ---- Reduced motion ---- */
    @media (prefers-reduced-motion: reduce) {
      *, *::before, *::after {
        animation-duration: 0.01ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.01ms !important;
      }
    }

    /* ---- Responsive ---- */
    /* Tablet 768–1200: canvas + control, tiles skryté nebo nahoře */
    @media (max-width: 1200px) {
      .flow-layout {
        grid-template-columns: 160px 1fr 260px;
        gap: 8px;
      }
    }

    /* Mobile <768: Single column */
    @media (max-width: 768px) {
      .flow-layout {
        grid-template-columns: 1fr;
        grid-template-areas:
          'canvas'
          'control'
          'tiles';
        gap: 8px;
      }
      .analytics-row {
        grid-template-columns: 1fr;
      }
      .below-chart-pair {
        grid-template-columns: 1fr;
      }
      .boiler-visual-grid {
        grid-template-columns: 1fr !important;
      }
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    this.initApp();
    this.startTimeUpdate();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    this.cleanup();
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has('activeTab')) {
      if (this.activeTab === 'pricing' && !this.pricingData) {
        this.loadPricingData();
      }
      if (this.activeTab === 'pricing' && this.analyticsData === EMPTY_ANALYTICS) {
        this.loadAnalyticsAsync();
      }
      if (this.activeTab === 'pricing' && !this.timelineData) {
        this.loadTimelineTabData(this.timelineTab);
      }
      if (this.activeTab === 'boiler' && !this.boilerState) {
        this.loadBoilerDataAsync();
      }
    }
  }

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  private async initApp(): Promise<void> {
    try {
      const hass = await haClient.getHass();

      if (!hass) {
        throw new Error('Cannot access Home Assistant context');
      }

      this.hass = hass;

      // Create entity store singleton
      this.entityStore = createEntityStore(hass, INVERTER_SN);

      // Start state watcher — watches all OIG sensors via prefix
      await stateWatcher.start({
        getHass: () => haClient.getHassSync(),
        prefixes: [OIG_SENSOR_PREFIX],
      });

      // Subscribe to entity changes for reactive updates
      this.stateWatcherUnsub = stateWatcher.onEntityChange((_entityId, _newState) => {
        this.throttledUpdateFlow();
        this.throttledUpdateSensors();
      });

      // Start shield controller (reactive queue / service state)
      shieldController.start();

      // Initial data load
      this.updateFlowData();
      this.updateSensorData();
      this.loadPricingData();
      this.loadBoilerDataAsync();
      this.loadAnalyticsAsync();
      this.loadTilesAsync();

      this.loading = false;
      oigLog.info('App initialized', {
        entities: Object.keys(hass.states || {}).length,
        inverterSn: INVERTER_SN,
      });
    } catch (err) {
      this.error = (err as Error).message;
      this.loading = false;
      oigLog.error('App init failed', err as Error);
    }
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  private cleanup(): void {
    this.stateWatcherUnsub?.();
    this.stateWatcherUnsub = null;

    stateWatcher.stop();
    shieldController.stop();

    this.tileEntityUnsubs.forEach(fn => fn());
    this.tileEntityUnsubs = [];

    this.entityStore?.destroy();
    this.entityStore = null;

    if (this.timeInterval !== null) {
      clearInterval(this.timeInterval);
      this.timeInterval = null;
    }

    if (this.boilerRefreshTimer !== null) {
      clearInterval(this.boilerRefreshTimer);
      this.boilerRefreshTimer = null;
    }
  }

  // ==========================================================================
  // DATA LOADING
  // ==========================================================================

  private updateFlowData(): void {
    if (!this.hass) return;

    try {
      this.flowData = extractFlowData(this.hass);
    } catch (err) {
      oigLog.error('Failed to extract flow data', err as Error);
    }
  }

  /** Update sensor-driven data: ČHMÚ + tiles */
  private updateSensorData(): void {
    // ČHMÚ
    this.chmuData = extractChmuData(INVERTER_SN);

    // Tiles
    if (this.tilesConfig) {
      const resolved = resolveTiles(this.tilesConfig);
      this.tilesLeft = resolved.left;
      this.tilesRight = resolved.right;
    }
  }

  /** Immediate (no throttle) tile re-resolution — called from entity store subscriptions */
  private updateTilesImmediate(): void {
    if (!this.tilesConfig) return;
    const resolved = resolveTiles(this.tilesConfig);
    this.tilesLeft = resolved.left;
    this.tilesRight = resolved.right;
  }

  /** Subscribe to all tile entity IDs via entity store — ensures live updates for any entity domain */
  private subscribeTileEntities(): void {
    this.tileEntityUnsubs.forEach(fn => fn());
    this.tileEntityUnsubs = [];

    if (!this.tilesConfig || !this.entityStore) return;

    const entityIds = new Set<string>();
    [...this.tilesConfig.tiles_left, ...this.tilesConfig.tiles_right].forEach(t => {
      if (!t) return;
      entityIds.add(t.entity_id);
      if (t.support_entities?.top_right) entityIds.add(t.support_entities.top_right);
      if (t.support_entities?.bottom_right) entityIds.add(t.support_entities.bottom_right);
    });

    for (const entityId of entityIds) {
      const unsub = this.entityStore.subscribe(entityId, () => {
        this.updateTilesImmediate();
      });
      this.tileEntityUnsubs.push(unsub);
    }
  }

  private async loadPricingData(): Promise<void> {
    if (!this.hass || this.pricingLoading) return;

    this.pricingLoading = true;
    try {
      const data = await withRetry(() => loadPricingData(this.hass));
      this.pricingData = data;
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
      const data = await withRetry(() => loadBoilerData(this.hass));
      this.boilerState = data.state;
      this.boilerPlan = data.plan;
      this.boilerEnergyBreakdown = data.energyBreakdown;
      this.boilerPredictedUsage = data.predictedUsage;
      this.boilerConfig = data.config;
      this.boilerHeatmap7x24 = data.heatmap7x24;
      this.boilerProfiling = data.profiling;
      this.boilerCurrentCategory = data.currentCategory;
      this.boilerAvailableCategories = data.availableCategories;
      this.boilerForecastWindows = data.forecastWindows;

      // Start auto-refresh timer (5 min, like V1)
      if (!this.boilerRefreshTimer) {
        this.boilerRefreshTimer = window.setInterval(() => this.loadBoilerDataAsync(), 5 * 60 * 1000);
      }
    } catch (err) {
      oigLog.error('Failed to load boiler data', err as Error);
    } finally {
      this.boilerLoading = false;
    }
  }

  private async loadAnalyticsAsync(): Promise<void> {
    try {
      this.analyticsData = await withRetry(() => loadAnalyticsData(INVERTER_SN));
    } catch (err) {
      oigLog.error('Failed to load analytics', err as Error);
    }
  }

  private async loadTilesAsync(): Promise<void> {
    try {
      this.tilesConfig = await withRetry(() => loadTilesConfig());
      const resolved = resolveTiles(this.tilesConfig);
      this.tilesLeft = resolved.left;
      this.tilesRight = resolved.right;
      this.subscribeTileEntities();
    } catch (err) {
      oigLog.error('Failed to load tiles config', err as Error);
    }
  }

  private async loadTimelineTabData(tab: TimelineTab): Promise<void> {
    try {
      this.timelineData = await withRetry(() => loadTimelineTab(INVERTER_SN, tab));
    } catch (err) {
      oigLog.error(`Failed to load timeline tab: ${tab}`, err as Error);
    }
  }

  // ==========================================================================
  // UI EVENT HANDLERS
  // ==========================================================================

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

  private onGridChargingOpen(): void {
    const dialog = this.shadowRoot?.querySelector('oig-grid-charging-dialog') as OigGridChargingDialog | null;
    dialog?.show();
  }

  private onEditClick(): void {
    this.editMode = !this.editMode;
  }

  private onResetClick(): void {
    // Reset flow node positions
    const canvas = this.shadowRoot?.querySelector('oig-flow-canvas') as any;
    if (canvas?.resetLayout) canvas.resetLayout();
    // Reset grid layout
    const grid = this.shadowRoot?.querySelector('oig-grid');
    if (grid) {
      (grid as any).resetLayout();
    }
  }

  protected onToggleLeftPanel(): void {
    this.leftPanelCollapsed = !this.leftPanelCollapsed;
  }

  protected onToggleRightPanel(): void {
    this.rightPanelCollapsed = !this.rightPanelCollapsed;
  }

  // ČHMÚ events
  private onChmuBadgeClick(): void {
    this.chmuModalOpen = true;
  }

  private onChmuModalClose(): void {
    this.chmuModalOpen = false;
  }

  // Timeline events
  private onTimelineTabChange(e: CustomEvent): void {
    this.timelineTab = e.detail.tab;
    this.loadTimelineTabData(e.detail.tab);
  }

  private onTimelineRefresh(): void {
    this.loadTimelineTabData(this.timelineTab);
  }

  // Boiler events
  private onBoilerCategoryChange(e: CustomEvent): void {
    const category = e.detail.category;
    this.boilerCurrentCategory = category;
    // Recompute category-dependent data without refetching API
    // For now, just trigger a full reload
    this.loadBoilerDataAsync();
  }

  private onEditTile(e: CustomEvent): void {
    const { entityId } = e.detail;
    let foundIndex = -1;
    let foundSide: 'left' | 'right' = 'left';
    let foundConfig: TileConfig | null = null;

    if (this.tilesConfig) {
      const leftIdx = this.tilesConfig.tiles_left.findIndex(
        (t) => t && t.entity_id === entityId
      );
      if (leftIdx >= 0) {
        foundIndex = leftIdx;
        foundSide = 'left';
        foundConfig = this.tilesConfig.tiles_left[leftIdx];
      } else {
        const rightIdx = this.tilesConfig.tiles_right.findIndex(
          (t) => t && t.entity_id === entityId
        );
        if (rightIdx >= 0) {
          foundIndex = rightIdx;
          foundSide = 'right';
          foundConfig = this.tilesConfig.tiles_right[rightIdx];
        }
      }
    }

    this.editingTileIndex = foundIndex;
    this.editingTileSide = foundSide;
    this.editingTileConfig = foundConfig;
    this.tileDialogOpen = true;

    if (foundConfig) {
      requestAnimationFrame(() => {
        const dialog = this.shadowRoot?.querySelector('oig-tile-dialog') as any;
        dialog?.loadTileConfig(foundConfig!);
      });
    }
  }

  private onDeleteTile(e: CustomEvent): void {
    const { entityId } = e.detail;
    if (!this.tilesConfig || !entityId) return;

    const config = { ...this.tilesConfig };
    config.tiles_left = config.tiles_left.map((t) =>
      t && t.entity_id === entityId ? null : t
    );
    config.tiles_right = config.tiles_right.map((t) =>
      t && t.entity_id === entityId ? null : t
    );

    this.tilesConfig = config;
    const resolved = resolveTiles(config);
    this.tilesLeft = resolved.left;
    this.tilesRight = resolved.right;
    saveTilesConfig(config);
    this.subscribeTileEntities();
  }

  private onTileSaved(e: CustomEvent): void {
    const { index, side, config: tileConfig } = e.detail as {
      index: number;
      side: 'left' | 'right';
      config: TileConfig;
    };
    if (!this.tilesConfig) return;

    const updated = { ...this.tilesConfig };
    const arr = side === 'left' ? [...updated.tiles_left] : [...updated.tiles_right];

    if (index >= 0 && index < arr.length) {
      arr[index] = tileConfig;
    } else {
      const nullIdx = arr.findIndex((t) => t === null);
      if (nullIdx >= 0) {
        arr[nullIdx] = tileConfig;
      } else {
        arr.push(tileConfig);
      }
    }

    if (side === 'left') {
      updated.tiles_left = arr;
    } else {
      updated.tiles_right = arr;
    }

    this.tilesConfig = updated;
    const resolved = resolveTiles(updated);
    this.tilesLeft = resolved.left;
    this.tilesRight = resolved.right;
    saveTilesConfig(updated);
    this.subscribeTileEntities();
  }

  private onTileDialogClose(): void {
    this.tileDialogOpen = false;
    this.editingTileConfig = null;
    this.editingTileIndex = -1;
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================

  render() {
    if (this.loading) {
      return html`<div class="loading"><div class="spinner"></div><span>Načítání...</span></div>`;
    }

    if (this.error) {
      return html`
        <div class="error">
          <h2>Chyba připojení</h2>
          <p>${this.error}</p>
          <button @click=${() => { this.error = null; this.loading = true; this.initApp(); }}>Zkusit znovu</button>
        </div>
      `;
    }

    const chmuAlertCount = this.chmuData.effectiveSeverity > 0 ? this.chmuData.warningsCount : 0;

    return html`
      <oig-theme-provider>
        <oig-header
          title="Energetické Toky"
          .time=${this.time}
          .showStatus=${true}
          .alertCount=${chmuAlertCount}
          .leftPanelCollapsed=${this.leftPanelCollapsed}
          .rightPanelCollapsed=${this.rightPanelCollapsed}
          @edit-click=${this.onEditClick}
          @reset-click=${this.onResetClick}
          @status-click=${this.onChmuBadgeClick}
          @toggle-left-panel=${this.onToggleLeftPanel}
          @toggle-right-panel=${this.onToggleRightPanel}
        >
        </oig-header>

        <oig-tabs
          .tabs=${DEFAULT_TABS}
          .activeTab=${this.activeTab}
          @tab-change=${this.onTabChange}
        ></oig-tabs>

        <main>
          <oig-grid .editable=${this.editMode}>
            <!-- ===== FLOW TAB ===== -->
            <div class="tab-content ${this.activeTab === 'flow' ? 'active' : ''}">
              <div class="flow-layout">
                <!-- Tiles: sloupec vlevo -->
                <div class="flow-tiles-stack">
                  <oig-tiles-container
                    .tiles=${[...this.tilesLeft, ...this.tilesRight]}
                    .editMode=${this.editMode}
                    @edit-tile=${this.onEditTile}
                    @delete-tile=${this.onDeleteTile}
                  ></oig-tiles-container>
                </div>

                <!-- Canvas: střed -->
                <div class="flow-center">
                  <oig-flow-canvas
                    .data=${this.flowData}
                    particlesEnabled
                    .active=${this.activeTab === 'flow'}
                    .editMode=${this.editMode}
                    @oig-grid-charging-open=${this.onGridChargingOpen}
                  ></oig-flow-canvas>
                </div>

                <!-- Ovládací panel: pravý sloupec -->
                <div class="flow-control">
                  <oig-control-panel></oig-control-panel>
                </div>
              </div>
            </div>

            <!-- ===== PRICING TAB ===== -->
            <div class="tab-content ${this.activeTab === 'pricing' ? 'active' : ''}">
              <div class="pricing-layout">
                ${this.pricingLoading ? html`
                  <div class="tab-loading-overlay">
                    <div class="spinner spinner--small"></div>
                    <span>Načítání cen...</span>
                  </div>
                ` : nothing}
                <oig-pricing-stats ?topOnly=${true} .data=${this.pricingData}></oig-pricing-stats>
                <oig-pricing-chart .data=${this.pricingData}></oig-pricing-chart>

                <div class="below-chart-pair">
                  <oig-pricing-stats .data=${this.pricingData}></oig-pricing-stats>
                  <oig-timeline-tile
                    .data=${this.timelineData}
                    .activeTab=${this.timelineTab}
                    @tab-change=${this.onTimelineTabChange}
                    @refresh=${this.onTimelineRefresh}
                  ></oig-timeline-tile>
                </div>

                <div class="analytics-row">
                  <oig-analytics-block title="Účinnost baterie" icon="⚡">
                    <oig-battery-efficiency .data=${this.analyticsData.efficiency}></oig-battery-efficiency>
                  </oig-analytics-block>

                  <oig-battery-health .data=${this.analyticsData.health}></oig-battery-health>

                  <oig-battery-balancing .data=${this.analyticsData.balancing}></oig-battery-balancing>

                  <oig-cost-comparison .data=${this.analyticsData.costComparison}></oig-cost-comparison>
                </div>
              </div>
            </div>

            <!-- ===== BOILER TAB ===== -->
            <div class="tab-content boiler-layout ${this.activeTab === 'boiler' ? 'active' : ''}" style="position:relative">
              ${this.boilerLoading ? html`
                <div class="tab-loading-overlay">
                  <div class="spinner spinner--small"></div>
                  <span>Načítání bojleru...</span>
                </div>
              ` : nothing}

              <!-- State header (current temp + heating dot) -->
              <oig-boiler-state .state=${this.boilerState}></oig-boiler-state>

              <!-- Status grid (7 cards) -->
              <oig-boiler-status-grid .data=${this.boilerState}></oig-boiler-status-grid>

              <!-- Energy breakdown + ratio bar -->
              <oig-boiler-energy-breakdown .data=${this.boilerEnergyBreakdown}></oig-boiler-energy-breakdown>

              <!-- Predicted usage (5 items) -->
              <oig-boiler-predicted-usage .data=${this.boilerPredictedUsage}></oig-boiler-predicted-usage>

              <!-- Plan info (9 rows) -->
              <oig-boiler-plan-info
                .plan=${this.boilerPlan}
                .forecastWindows=${this.boilerForecastWindows}
              ></oig-boiler-plan-info>

              <!-- Visual section: Tank + Profiling side by side -->
              <div class="boiler-visual-grid" style="display:grid; grid-template-columns: 1fr 2fr; gap:16px;">
                <!-- Tank thermometer -->
                <oig-boiler-tank
                  .boilerState=${this.boilerState}
                  .targetTemp=${this.boilerConfig?.targetTempC ?? 60}
                ></oig-boiler-tank>

                <div>
                  <!-- Category selector -->
                  <oig-boiler-category-select
                    .current=${this.boilerCurrentCategory}
                    .available=${this.boilerAvailableCategories}
                    @category-change=${this.onBoilerCategoryChange}
                  ></oig-boiler-category-select>

                  <!-- Profiling (CSS bar chart + stats) -->
                  <oig-boiler-profiling .data=${this.boilerProfiling}></oig-boiler-profiling>
                </div>
              </div>

              <!-- 7x24 heatmap grid -->
              <oig-boiler-heatmap-grid .data=${this.boilerHeatmap7x24}></oig-boiler-heatmap-grid>

              <!-- Stats cards (4 large) -->
              <oig-boiler-stats-cards .plan=${this.boilerPlan}></oig-boiler-stats-cards>

              <!-- Config section (6 cards) -->
              <oig-boiler-config-section .config=${this.boilerConfig}></oig-boiler-config-section>
            </div>
          </oig-grid>
        </main>

        <!-- ===== GLOBAL OVERLAYS ===== -->
        <oig-chmu-modal
          ?open=${this.chmuModalOpen}
          .data=${this.chmuData}
          @close=${this.onChmuModalClose}
        ></oig-chmu-modal>

        <oig-tile-dialog
          ?open=${this.tileDialogOpen}
          .tileIndex=${this.editingTileIndex}
          .tileSide=${this.editingTileSide}
          .existingConfig=${this.editingTileConfig}
          @tile-saved=${this.onTileSaved}
          @close=${this.onTileDialogClose}
        ></oig-tile-dialog>

        <oig-grid-charging-dialog
          .data=${this.flowData.gridChargingPlan}
        ></oig-grid-charging-dialog>
      </oig-theme-provider>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-app': OigApp;
  }
}
