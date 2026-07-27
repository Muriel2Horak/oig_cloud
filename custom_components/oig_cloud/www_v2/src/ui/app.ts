import { LitElement, html, css, nothing, unsafeCSS, PropertyValues } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import type { OigGridChargingDialog } from '@/ui/features/flow/grid-charging-dialog';
import { CSS_VARS } from '@/ui/theme';
import { Tab } from '@/ui/layout/tabs';
import { createEntityStore, EntityStore } from '@/data/entity-store';
import { stateWatcher } from '@/data/state-watcher';
import { haClient } from '@/data/ha-client';
import { extractFlowData } from '@/data/flow-data';
import { invalidateTimelineCache, loadPricingData } from '@/data/pricing-data';
import { loadBoilerData } from '@/data/boiler-data';
import { resolveLang } from '@/i18n/boiler';
import { loadModuleConfig } from '@/data/settings-data';
import { extractAnalyticsSensors, loadAnalyticsData, type AnalyticsData, EMPTY_ANALYTICS } from '@/data/analytics-data';
import { extractChmuData, type ChmuData, EMPTY_CHMU_DATA } from '@/data/chmu-data';
import { loadWeatherData, type WeatherData, EMPTY_WEATHER_DATA } from '@/data/weather-data';
import { loadTimelineTab, type TimelineDayData, type TimelineTab } from '@/data/timeline-data';
import {
  filterDashboardTiles,
  ensureTileModule,
  loadTilesConfig,
  saveTilesConfig,
  resolveTiles,
  type ModuleTileFlags,
  type TilesConfig,
  type TileConfig,
  type ResolvedTile,
} from '@/data/tiles-data';
import { FlowData, EMPTY_FLOW_DATA } from '@/ui/features/flow/types';
import { PricingData } from '@/ui/features/pricing/types';
import {
  BoilerState,
  BoilerV2Data,
  BoilerConfig,
} from '@/ui/features/boiler/types';
import { oigLog } from '@/core/logger';
import { throttle, withRetry } from '@/utils/format';
import { shieldController } from '@/data/shield-controller';
import { dismissOnboardingBanner, loadOnboardingState } from '@/ui/features/onboarding/onboarding-data';
import { fetchSimulatorPresets, type Domain, type PresetListItem } from '@/ui/components/simulator-fetcher';

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
import '@/ui/features/weather';
import '@/ui/features/settings';
import '@/ui/features/timeline';
import '@/ui/features/tiles';
import '@/ui/features/tiles/icon-picker';
import '@/ui/features/tiles/tile-dialog';
import '@/ui/features/onboarding/banner';
import '@/ui/features/onboarding';  // registers oig-onboarding-wizard + oig-onboarding-step-ai
import '@/ui/components/oig-simulator';

const u = unsafeCSS;

/** OIG sensor prefix for this inverter */
const params = new URLSearchParams(window.location.search);
const INVERTER_SN = params.get('sn') || params.get('inverter_sn') || '';
const OIG_SENSOR_PREFIX = `sensor.oig_${INVERTER_SN}_`;

const DEFAULT_TABS: Tab[] = [
  { id: 'flow', label: 'Toky', icon: 'mdi:lightning-bolt' },
  { id: 'pricing', label: 'Ceny', icon: 'mdi:cash' },
  { id: 'boiler', label: 'Bojler', icon: 'mdi:water-boiler' },
  { id: 'settings', label: 'Nastavení', icon: 'mdi:cog' },
];

@customElement('oig-app')
export class OigApp extends LitElement {
  @property({ type: Object }) hass: any = null;
  @property({ attribute: false }) onboarding: any = null;
  @state() private loading = true;
  @state() private error: string | null = null;
  @state() private activeTab = 'flow';
  @state() private editMode = false;
  @state() private time = '';

  // Flow
  @state() private flowData: FlowData = EMPTY_FLOW_DATA;

  // Pricing
  @state() private pricingData: PricingData | null = null;
  @state() private pricingLoading = false;

  // Boiler
  @state() private boilerState: BoilerState | null = null;
  @state() private boilerLoading = false;
  @state() private boilerV2Data: BoilerV2Data | null = null;
  @state() private boilerConfig: BoilerConfig | null = null;
  private boilerRefreshTimer: number | null = null;

  // R7: box_has_home56 flag — loaded from module_config boiler section.
  // Default false = Home 5/6 toggles hidden until user enables in Nastavení.
  @state() private boxHasHome56 = false;

  // Unit A-FE: module enable flags — loaded from module_config `modules` section.
  // Default true so tabs stay visible until the flags are known (avoids a
  // flash-hide before the first module_config response lands).
  @state() private enablePricing = true;
  @state() private enableBoiler = true;
  @state() private enableStatistics = true;
  @state() private enablePrediction = true;

  private get boilerLang() {
    return resolveLang(this.hass);
  }

  /** Unit A-FE: tabs filtered by module enable flags (Toky/Nastavení are core, always shown). */
  private get visibleTabs(): Tab[] {
    return DEFAULT_TABS.filter((tab) => {
      if (tab.id === 'pricing') return this.enablePricing;
      if (tab.id === 'boiler') return this.enableBoiler;
      return true;
    });
  }

  private get visibleDashboardTiles(): ResolvedTile[] {
    const flags: ModuleTileFlags = {
      enablePricing: this.enablePricing,
      enableBoiler: this.enableBoiler,
      enableStatistics: this.enableStatistics,
      enablePrediction: this.enablePrediction,
    };
    const tiles = [...(this.tilesLeft ?? []), ...(this.tilesRight ?? [])];
    return filterDashboardTiles(tiles, flags) ?? [];
  }

  private _altShort(type: string | null | undefined): string {
    switch (type) {
      case 'heat_pump': return 'TČ';
      case 'fireplace': return 'Krb';
      case 'other': return 'Alt';
      default: return 'Plyn';
    }
  }

  // Analytics
  @state() private analyticsData: AnalyticsData = EMPTY_ANALYTICS;

  // Počasí (weather entity) + ČHMÚ výstrahy — sdílejí jeden modal/badge
  @state() private chmuData: ChmuData = EMPTY_CHMU_DATA;
  @state() private weatherData: WeatherData = EMPTY_WEATHER_DATA;
  @state() private chmuModalOpen = false;
  private weatherRefreshTimer: number | null = null;

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

  // Onboarding wizard (Plan 3.5 item 4) — opened by `launch-onboarding`
  // CustomEvents from the banner (app.ts:1325) or Settings launcher
  // (features/settings/index.ts:498). Soft (#6): the dashboard keeps
  // rendering behind the modal — no lock, no gate.
  @state() private onboardingWizardOpen = false;

  // Simulator overlay (fe/fix): 'oig-simulator-open' is dispatched by the
  // wizard's battery/boiler steps (features/onboarding/index.ts:2130,3133)
  // with bubbles+composed. Mounted/listened at the app shell — via
  // `@oig-simulator-open` on <oig-theme-provider>, the common ancestor of
  // both the wizard and the settings tab — rather than inside the wizard, so
  // the same wiring picks up a future Settings launcher (`oig-settings` is
  // already a sibling in this tree) without adding a second listener there.
  // <oig-simulator> itself has no chrome of its own (no backdrop, no close
  // button, no open()/close() API — just props), so the host owns all of
  // that here, the same way it already owns the onboarding wizard's overlay.
  @state() private simulatorOpen = false;
  @state() private simulatorDomain: Domain = 'battery';
  @state() private simulatorDraft: Record<string, unknown> = {};
  // fe/fix: presets are fetched on open and passed down so the overlay's chips
  // populate and the initial simulate carries a preset id. The BE POST 400s
  // with "'prices' required when no preset given" when presetId is blank, and
  // <oig-simulator>.firstUpdated fires the initial simulate immediately on
  // mount — so the component is NOT mounted until these resolve. Loading/error
  // live here (in the host) to keep that fetch out of the component and to gate
  // the mount on a known preset id.
  @state() private simulatorPresets: PresetListItem[] = [];
  @state() private simulatorActivePresetId: string | undefined = undefined;
  @state() private simulatorPresetsLoading = false;
  @state() private simulatorPresetsError: string | null = null;

  private entityStore: EntityStore | null = null;
  private timeInterval: number | null = null;
  private stateWatcherUnsub: (() => void) | null = null;
  private tileEntityUnsubs: Array<() => void> = [];
  private pricingDirty = false;
  private timelineDirty = false;
  private analyticsDirty = false;
  private boilerDirty = false;
  private reconnecting = false;

  /** Throttled flow update — max once per 500ms to avoid jank from rapid state changes */
  private throttledUpdateFlow = throttle(() => this.updateFlowData(), 500);
  /** Throttled ČHMÚ + tiles update — these rely on entity store */
  private throttledUpdateSensors = throttle(() => this.updateSensorData(), 1000);
  private throttledRefreshDerivedData = throttle(() => this.refreshDerivedData(), 5000);

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

    /* ── Redesigned boiler tab (2026-06): model+map, slim strip, SoC, plan ── */
    .boiler-model-row {
      display: grid;
      /* Model and draw map share the row equally (half and half). */
      grid-template-columns: 1fr 1fr;
      gap: 14px;
      margin-bottom: 14px;
      align-items: start;
    }
    .boiler-model-row > oig-boiler-model,
    .boiler-model-row > oig-boiler-draw-map { min-width: 0; }
    oig-boiler-soc-chart, oig-boiler-plan { display: block; margin-bottom: 14px; }
    .boiler-slim {
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 12px;
      margin-bottom: 14px;
    }
    .boiler-slim .slim-tile {
      background: ${unsafeCSS(CSS_VARS.cardBg)};
      border-radius: 12px;
      box-shadow: ${unsafeCSS(CSS_VARS.cardShadow)};
      padding: 11px 13px;
      display: flex; flex-direction: column; gap: 4px;
    }
    .boiler-slim .k { font-size: 11px; color: ${unsafeCSS(CSS_VARS.textSecondary)}; }
    .boiler-slim .v { font-size: 16px; font-weight: 650; color: ${unsafeCSS(CSS_VARS.textPrimary)}; }
    .boiler-slim .slim-chip { font-size: 12px; padding: 2px 8px; border-radius: 999px; font-weight: 600; background: rgba(255,179,0,0.16); color: #c98a00; }
    .boiler-slim .slim-chip.on { background: rgba(94,234,212,0.16); color: #2e9c89; }
    .boiler-slim .slim-chip.off { background: rgba(255,255,255,0.07); color: ${unsafeCSS(CSS_VARS.textSecondary)}; }
    @media (max-width: 900px) {
      .boiler-model-row { grid-template-columns: 1fr; }
      .boiler-slim { grid-template-columns: repeat(2, 1fr); }
    }

    .boiler-stage {
      display: grid;
      grid-template-areas: 'source shell comfort';
      grid-template-columns: 1fr 300px 1fr;
      gap: 12px;
      /* mockup: all three cards share the tank card's height */
      align-items: stretch;
    }

    .boiler-stage > oig-boiler-metric-panel,
    .boiler-stage > oig-boiler-v2-shell {
      height: 100%;
    }

    @media (max-width: 1023px) {
      .boiler-stage {
        grid-template-areas:
          'source'
          'shell'
          'comfort';
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 599px) {
      .boiler-stage {
        grid-template-areas:
          'source'
          'shell'
          'comfort';
        grid-template-columns: 1fr;
      }
    }

    .boiler-header {
      margin-bottom: 8px;
    }

    .boiler-header h1 {
      margin: 0 0 6px;
      font-size: 20px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
    }

    .boiler-badge {
      font-size: 11px;
      padding: 4px 10px;
      border-radius: 12px;
      background: rgba(35,43,53,1);
      color: #4ade80;
      font-weight: 500;
    }

    .boiler-badge.degr {
      background: rgba(245,184,0,.15);
      color: #f5b800;
    }

    .boiler-badge.boiler-badge--age {
      background: rgba(255,255,255,.06);
      color: #9aa6b2;
      font-weight: 400;
    }

    .boiler-status-chip-row {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 6px;
    }

    .boiler-controls-section {
      margin-top: 4px;
    }

    .boiler-controls-section > summary {
      cursor: pointer;
      font-size: 13px;
      font-weight: 600;
      color: #9aa6b2;
      padding: 8px 0;
      list-style: none;
      user-select: none;
    }

    .boiler-controls-section > summary::-webkit-details-marker {
      display: none;
    }

    .boiler-controls-section > summary::before {
      content: '▶ ';
      font-size: 9px;
      opacity: 0.6;
    }

    .boiler-controls-section[open] > summary::before {
      content: '▼ ';
    }

    .boiler-controls-body {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding-top: 8px;
    }

    /* ---- Flow tab layout: dlaždice | canvas | systém ---- */
    .flow-layout {
      display: grid;
      grid-template-columns: 212px 1fr 300px;
      grid-template-areas: 'tiles canvas control';
      gap: 12px;
      width: 100%;
      align-items: start;
    }

    .flow-tiles-stack {
      grid-area: tiles;
      min-width: 0;
    }

    .flow-center {
      grid-area: canvas;
      min-width: 0;
    }

    .flow-control {
      grid-area: control;
      min-width: 0;
    }

    /* ---- Unified "Ovládání" card: Systém OIG + Moje dlaždice ---- */
    .control-stack {
      background: ${u(CSS_VARS.cardBg)};
      border-radius: 16px;
      box-shadow: ${u(CSS_VARS.cardShadow)};
      overflow: hidden;
    }

    .control-stack__head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      padding: 13px 16px 11px;
      border-bottom: 1px solid ${u(CSS_VARS.divider)};
      font-size: 12px;
      font-weight: 700;
      letter-spacing: 0.06em;
      text-transform: uppercase;
      color: ${u(CSS_VARS.textPrimary)};
    }

    .control-stack__block {
      padding: 12px 14px;
    }

    .control-stack__add {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 24px;
      height: 24px;
      border: 1px solid color-mix(in srgb, ${u(CSS_VARS.accent)} 45%, transparent);
      background: color-mix(in srgb, ${u(CSS_VARS.accent)} 12%, transparent);
      color: ${u(CSS_VARS.accent)};
      border-radius: 8px;
      font-size: 16px;
      line-height: 1;
      cursor: pointer;
      transition: background 0.15s ease, transform 0.15s ease;
    }

    .control-stack__add:hover {
      background: color-mix(in srgb, ${u(CSS_VARS.accent)} 22%, transparent);
      transform: translateY(-1px);
    }

    .control-stack__tiles-empty {
      font-size: 12px;
      color: ${u(CSS_VARS.textSecondary)};
      opacity: 0.6;
      text-align: center;
      padding: 6px 0 2px;
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
      /* Same 4-column track + gap as .analytics-row below, so the tile edges
         line up: planned tile spans 1 column, the mode-plan tile spans 3. */
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
      align-items: start;
    }

    .below-chart-pair > :first-child { grid-column: span 1; }
    .below-chart-pair > :last-child { grid-column: span 3; }

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

    .boiler-setup-guide {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 16px;
      background: ${u(CSS_VARS.cardBg)};
      border: 1px solid ${u(CSS_VARS.divider)};
      border-radius: 8px;
      font-size: 13px;
      color: ${u(CSS_VARS.textSecondary)};
    }

    .boiler-setup-guide__icon {
      font-size: 20px;
      line-height: 1;
      flex-shrink: 0;
    }

    .boiler-setup-guide__text strong {
      display: block;
      color: ${u(CSS_VARS.textPrimary)};
      margin-bottom: 2px;
    }

    .boiler-setup-guide__text p {
      margin: 0;
    }

    /* ---- Responsive ---- */
    /* Tablet 768–1200: užší dlaždice + systém kolem pentagonu */
    @media (max-width: 1200px) {
      .flow-layout {
        grid-template-columns: 168px 1fr 248px;
        gap: 8px;
      }
    }

    /* Mobile <768: Single column — pentagon, dlaždice (hned vidět), systém */
    @media (max-width: 768px) {
      .flow-layout {
        grid-template-columns: 1fr;
        grid-template-areas:
          'canvas'
          'tiles'
          'control';
        gap: 8px;
      }
      .analytics-row {
        grid-template-columns: 1fr;
      }
      .below-chart-pair {
        grid-template-columns: 1fr;
      }
    }

    /* Landscape kiosk (Google Nest Hub ~768×543): pentagon + Systém OIG vedle
       sebe, dlaždice skryté (sekundární), panel scrolluje uvnitř. */
    @media (orientation: landscape) and (max-height: 600px) {
      main { padding: 6px 10px; }
      .flow-layout {
        grid-template-columns: 1fr 252px;
        grid-template-areas: 'canvas control';
        gap: 8px;
        align-items: start;
      }
      .flow-tiles-stack { display: none; }
      .flow-center { grid-area: canvas; }
      .flow-control {
        grid-area: control;
        max-height: calc(100vh - 78px);
        overflow-y: auto;
      }
    }

    /* ---- Simulator overlay (fe/fix) ----
       z-index above the onboarding overlay (1000): the trigger buttons live
       inside wizard steps, so this must stack on top of it. */
    .simulator-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.55);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1100;
      animation: fadeIn 0.12s ease-out;
      padding: 16px;
      box-sizing: border-box;
    }

    .simulator-modal {
      position: relative;
      width: min(1120px, 100%);
      max-height: calc(100vh - 32px);
      overflow: auto;
      border-radius: 18px;
      box-shadow: 0 18px 48px rgba(0, 0, 0, 0.45);
    }

    .simulator-modal-close {
      position: absolute;
      top: 10px;
      right: 10px;
      z-index: 1;
      background: rgba(15, 20, 34, 0.55);
      border: 1px solid rgba(255, 255, 255, 0.18);
      color: #fff;
      border-radius: 8px;
      width: 30px;
      height: 30px;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
    }
  `;

  connectedCallback(): void {
    super.connectedCallback();
    window.addEventListener('pageshow', this.onPageShow);
    document.addEventListener('visibilitychange', this.onDocumentVisibilityChange);
    window.addEventListener('keydown', this.onSimulatorKeydown);
    this.initApp();
    this.startTimeUpdate();
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    window.removeEventListener('pageshow', this.onPageShow);
    document.removeEventListener('visibilitychange', this.onDocumentVisibilityChange);
    window.removeEventListener('keydown', this.onSimulatorKeydown);
    this.cleanup();
  }

  protected updated(changed: PropertyValues): void {
    if (changed.has('hass') && !changed.has('loading')) {
      void this.rebindHassContext();
    }
    if (changed.has('enablePricing') || changed.has('enableBoiler')) {
      if (!this.visibleTabs.some((tab) => tab.id === this.activeTab)) {
        this.activeTab = this.visibleTabs[0]?.id ?? 'flow';
      }
    }
    if (changed.has('activeTab')) {
      if (this.activeTab === 'pricing' && (!this.pricingData || this.pricingDirty)) {
        this.loadPricingData();
      }
      if (this.activeTab === 'pricing' && (this.analyticsData === EMPTY_ANALYTICS || this.analyticsDirty)) {
        this.loadAnalyticsAsync();
      }
      if (this.activeTab === 'pricing' && (!this.timelineData || this.timelineDirty)) {
        this.loadTimelineTabData(this.timelineTab);
      }
      if (this.activeTab === 'boiler' && (!this.boilerState || this.boilerDirty)) {
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
      this.stateWatcherUnsub = stateWatcher.onEntityChange((entityId, newState) => {
        this.syncHassState(entityId, newState);
        this.throttledUpdateFlow();
        this.throttledUpdateSensors();
        this.throttledRefreshDerivedData();
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
      void this.loadOnboarding();
      // R7 + Unit A-FE: load box_has_home56 + pricing/boiler/statistics enable flags (best-effort, no throw)
      this.loadBoxHasHome56();

      // Weather forecast (current + hourly/daily) — refreshed periodically
      void this.loadWeather();
      this.weatherRefreshTimer = window.setInterval(() => {
        if (document.visibilityState !== 'hidden') void this.loadWeather();
      }, 15 * 60 * 1000);

      // Boiler tab live refresh: the canonical DTO changes server-side every
      // coordinator cycle without any entity-state event, so poll it while
      // the tab is visible (the state-watcher throttle alone left the tab
      // looking frozen).
      this.boilerRefreshTimer = window.setInterval(() => {
        if (this.activeTab === 'boiler' && document.visibilityState !== 'hidden') {
          void this.loadBoilerDataAsync();
        }
      }, 30_000);

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
    if (this.weatherRefreshTimer !== null) {
      clearInterval(this.weatherRefreshTimer);
      this.weatherRefreshTimer = null;
    }
  }

  private onPageShow = (): void => {
    void this.rebindHassContext();
  };

  private onDocumentVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      void this.rebindHassContext();
    }
  };

  private async rebindHassContext(): Promise<void> {
    if (this.reconnecting) return;
    this.reconnecting = true;

    try {
      const hass = await haClient.refreshHass();
      if (!hass) return;

      this.hass = hass;
      this.entityStore?.updateHass(hass);

      await stateWatcher.start({
        getHass: () => haClient.getHassSync(),
        prefixes: [OIG_SENSOR_PREFIX],
      });

      this.updateFlowData();
      this.updateSensorData();
    } catch (err) {
      oigLog.error('Failed to rebind hass context', err as Error);
    } finally {
      this.reconnecting = false;
    }
  }

  // ==========================================================================
  // DATA LOADING
  // ==========================================================================

  private updateFlowData(): void {
    if (!this.hass) return;

    try {
      const liveStates = this.entityStore?.getAll() ?? this.hass;
      this.flowData = extractFlowData(liveStates, INVERTER_SN);
    } catch (err) {
      oigLog.error('Failed to extract flow data', err as Error);
    }
  }

  /** Update sensor-driven data: ČHMÚ + tiles */
  private updateSensorData(): void {
    // ČHMÚ
    this.chmuData = extractChmuData(INVERTER_SN);

    if (this.activeTab === 'pricing') {
      this.analyticsData = {
        ...this.analyticsData,
        ...extractAnalyticsSensors(INVERTER_SN),
      };
    }

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
      this.pricingDirty = false;
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
      this.boilerV2Data = data.v2Data;
      this.boilerConfig = data.config;
      this.boilerDirty = false;

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
      this.analyticsDirty = false;
    } catch (err) {
      oigLog.error('Failed to load analytics', err as Error);
    }
  }

  private async loadOnboarding(): Promise<void> {
    try {
      this.onboarding = await loadOnboardingState(INVERTER_SN);
    } catch {
      this.onboarding = null;
    }
  }

  /**
   * R7 + Unit A-FE: load box_has_home56 (boiler section) and the pricing/
   * boiler/statistics/battery_prediction module enable flags (modules section)
   * from module_config in one fetch (best-effort).
   */
  private async loadBoxHasHome56(): Promise<void> {
    try {
      const cfg = await loadModuleConfig();
      this.boxHasHome56 = cfg?.boiler?.box_has_home56 === true;
      if (cfg?.modules) {
        this.enablePricing = cfg.modules.enable_pricing !== false;
        this.enableBoiler = cfg.modules.enable_boiler !== false;
        this.enableStatistics = cfg.modules.enable_statistics !== false;
        this.enablePrediction = cfg.modules.enable_battery_prediction !== false;
      }
    } catch {
      // silently ignore — defaults (Home 5/6 hidden, tabs visible) are safe
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
      this.timelineDirty = false;
    } catch (err) {
      oigLog.error(`Failed to load timeline tab: ${tab}`, err as Error);
    }
  }

  private syncHassState(entityId: string, newState: any): void {
    if (!this.hass) return;

    if (!this.hass.states) {
      this.hass.states = {};
    }

    if (newState) {
      this.hass.states[entityId] = newState;
      return;
    }

    delete this.hass.states[entityId];
  }

  private refreshDerivedData(): void {
    this.pricingDirty = true;
    this.timelineDirty = true;
    this.analyticsDirty = true;
    this.boilerDirty = true;

    if (this.activeTab === 'pricing') {
      invalidateTimelineCache();
      void this.loadPricingData();
      void this.loadTimelineTabData(this.timelineTab);
      void this.loadAnalyticsAsync();
      return;
    }

    if (this.activeTab === 'boiler') {
      void this.loadBoilerDataAsync();
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

  private onLaunchOnboarding(e: Event): void {
    // Plan 3.5 item 4: the previous stub merely re-dispatched the event upward
    // (no production consumer). Open the wizard shell; the dashboard keeps
    // rendering behind it (#6 — soft, no lock).
    e.stopPropagation();
    this.onboardingWizardOpen = true;
  }

  private onWizardClose(): void {
    this.onboardingWizardOpen = false;
    // Refresh banner visibility — the user may have completed/skipped steps.
    void this.loadOnboarding();
  }

  private async onSimulatorOpen(e: CustomEvent<{ domain?: Domain; box?: string; draft?: Record<string, unknown> }>): Promise<void> {
    e.stopPropagation();
    const { domain, box, draft } = e.detail ?? {};
    this.simulatorDomain = domain ?? 'battery';
    // simulator-fetcher.ts resolves the box id from draft.box_id/boxId/
    // inverter_sn/sn, falling back to the URL's ?sn= otherwise — merge
    // `box` in so the simulator resolves it from the detail it was given.
    this.simulatorDraft = box ? { ...draft, box_id: box } : { ...draft };
    // Open the overlay (shows the loading state) before resolving presets so
    // <oig-simulator> mounts only once a preset id is known — its firstUpdated
    // fires the initial simulate immediately, and a blank preset 400s upstream.
    this.simulatorOpen = true;
    await this.loadSimulatorPresets(this.simulatorDomain, this.simulatorDraft);
  }

  private async loadSimulatorPresets(domain: Domain, draft: Record<string, unknown>): Promise<void> {
    this.simulatorPresetsLoading = true;
    this.simulatorPresetsError = null;
    try {
      const presets = await fetchSimulatorPresets(domain, draft);
      this.simulatorPresets = presets;
      // Default-select the first preset so the initial simulate (fired by the
      // component's firstUpdated on mount) carries a preset id, not a blank.
      this.simulatorActivePresetId = presets[0]?.id;
    } catch (err) {
      this.simulatorPresets = [];
      this.simulatorActivePresetId = undefined;
      this.simulatorPresetsError = err instanceof Error ? err.message : String(err);
    } finally {
      this.simulatorPresetsLoading = false;
    }
  }

  private onSimulatorPresetsRetry = (): void => {
    void this.loadSimulatorPresets(this.simulatorDomain, this.simulatorDraft);
  };

  private onSimulatorClose(): void {
    this.simulatorOpen = false;
  }

  private onSimulatorKeydown = (e: KeyboardEvent): void => {
    if (e.key === 'Escape' && this.simulatorOpen) this.onSimulatorClose();
  };

  private onDismissOnboardingBanner(e: Event): void {
    // Grandfathered-only (banner.ts gates the event on .grandfathered): persist
    // the dismissal so it survives a reload (D11), then re-sync local state.
    e.stopPropagation();
    void this.persistBannerDismissal();
  }

  private async persistBannerDismissal(): Promise<void> {
    try {
      await dismissOnboardingBanner(INVERTER_SN);
    } catch {
      // best-effort — the banner already hid itself locally (banner.ts)
    }
    void this.loadOnboarding();
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

  // ČHMÚ events
  private async loadWeather(): Promise<void> {
    try {
      this.weatherData = await loadWeatherData();
    } catch {
      /* weather entity may be absent — badge falls back to warnings-only */
    }
  }

  private onChmuBadgeClick(): void {
    void this.loadWeather();
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

  private onAddTile(): void {
    // New tile: index -1 lets onTileSaved drop it into the first free slot.
    this.editingTileIndex = -1;
    this.editingTileSide = 'left';
    this.editingTileConfig = null;
    this.tileDialogOpen = true;
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

    const normalizedTile = ensureTileModule(tileConfig);
    const updated = { ...this.tilesConfig };
    const arr = side === 'left' ? [...updated.tiles_left] : [...updated.tiles_right];

    if (index >= 0 && index < arr.length) {
      arr[index] = normalizedTile;
    } else {
      const nullIdx = arr.findIndex((t) => t === null);
      if (nullIdx >= 0) {
        arr[nullIdx] = normalizedTile;
      } else {
        arr.push(normalizedTile);
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
  // BOILER TAB RENDER HELPERS
  // ==========================================================================

  private _renderBoilerTabSafe() {
    try {
      return this._buildBoilerTabContent();
    } catch (err) {
      oigLog.error('Boiler tab render failed', err as Error);
      return html`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="error" .message=${'render_failed'}></oig-boiler-unavailable-state>`;
    }
  }

  private _buildBoilerTabContent() {
    const v2 = this.boilerV2Data;

    if (this.boilerLoading && !v2) {
      return html`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="loading" message=""></oig-boiler-unavailable-state>`;
    }

    if (v2?.loadError) {
      return html`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="error" .message=${v2.loadError}></oig-boiler-unavailable-state>`;
    }

    const realDegradedReasons = (v2?.explanation?.degradedReasons ?? []).filter(r => r !== 'config_profile_unavailable');
    if (v2 && v2.status === null && realDegradedReasons.length > 0) {
      return html`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="degraded" .message=${realDegradedReasons.join(', ')}></oig-boiler-unavailable-state>`;
    }

    if (!v2) {
      return html`<oig-boiler-unavailable-state .lang=${this.boilerLang} reason="unavailable" message="Data bojleru nejsou k dispozici"></oig-boiler-unavailable-state>`;
    }

    // Compact status chip — only when something is actually wrong (stale data
    // or degraded plan). Mockup has a clean tab; the chip appears on demand.
    const dataAgeSecs = v2.explanation?.dataAgeSecs ?? null;
    const isStale = dataAgeSecs !== null && dataAgeSecs > 600;
    const isDegraded = (v2.status?.degraded ?? false) && realDegradedReasons.length > 0;
    const staleChip = isStale || isDegraded
      ? html`<div class="boiler-status-chip-row">
          <span class="boiler-badge boiler-badge--age" data-testid="boiler-stale-chip">
            ${isDegraded ? '⚠ Plán v degradovaném režimu' : `⚠ Data stará ${Math.round((dataAgeSecs ?? 0) / 60)} min`}
          </span>
        </div>`
      : nothing;

    // ── derive model + slim-strip props from live state ──────────────────
    const activity = v2.activity;
    const cfg = this.boilerConfig;
    const volume = cfg?.volumeL ?? 200;
    const fillFrac = activity?.fillLevelPct ?? null;
    const readyLiters = fillFrac != null ? fillFrac * volume : null;
    const st = activity?.state ?? 'unknown';
    const heatMode: 'ele' | 'alt' | 'idle' =
      st === 'charging_alt' ? 'alt' : (st.startsWith('charging_') ? 'ele' : 'idle');
    const src = activity?.source;
    const electricSource: 'fve' | 'grid' | 'battery' =
      (src === 'fve' || src === 'overflow') ? 'fve' : (src === 'discharge' ? 'battery' : 'grid');
    const e = v2.energyToday;
    const elementKwh = e ? (e.fveKwh + e.gridKwh + e.batteryKwh) : null;
    const altKwh = e ? e.altKwh : null;
    const nowMs = Date.now();
    const circRuns = v2.circulationRuns ?? [];
    const circEnabled = circRuns.length > 0;
    const circActive = circRuns.some(r => new Date(r.start).getTime() <= nowMs && nowMs < new Date(r.end).getTime());
    const drivesPlan = v2.demandMap?.drivesPlan ?? true;
    const trend = activity?.temperatureTrendCPerMin ?? null;
    const lang = this.boilerLang;
    const comfort = v2.status?.comfortSatisfied ?? null;
    const deadline = (v2.planSummary?.deadlineTime ?? cfg?.deadlineTime ?? '').slice(0, 5);
    const cost = v2.energyToday?.costCzk;
    const modeChip = heatMode === 'alt'
      ? `🔥 ${this._altShort(v2.altSourceType)}`
      : heatMode === 'ele' ? '🔌 ELE' : '⏸ —';
    const trendArrow = trend != null && Math.abs(trend) >= 0.05 ? (trend > 0 ? '↑' : '↓') : '';

    return html`
      ${staleChip}
      <div class="boiler-model-row">
        <oig-boiler-model
          .topTempC=${v2.status?.temperatureTop ?? null}
          .bottomTempC=${v2.status?.temperatureBottom ?? null}
          .readyLiters=${readyLiters}
          .readyFraction=${fillFrac}
          .volumeL=${volume}
          .coldInletTempC=${cfg?.coldInletTempC ?? 16}
          .heatMode=${heatMode}
          .electricSource=${electricSource}
          .altSourceType=${v2.altSourceType ?? 'gas'}
          .elementKwhToday=${elementKwh}
          .altKwhToday=${altKwh}
          .circulationEnabled=${circEnabled}
          .circulationActive=${circActive}
          .trendCPerMin=${trend}
          .lang=${lang}
        ></oig-boiler-model>
        <oig-boiler-draw-map .data=${v2.drawMap ?? null} .lang=${lang}></oig-boiler-draw-map>
      </div>

      <div class="boiler-slim">
        <div class="slim-tile"><span class="k">⚡ Režim</span><span class="v"><span class="slim-chip">${modeChip}</span></span></div>
        <div class="slim-tile"><span class="k">💧 Připraveno</span><span class="v">${readyLiters != null ? Math.round(readyLiters) : '—'} L ${trendArrow}</span></div>
        <div class="slim-tile"><span class="k">💰 Cena dnes</span><span class="v">${cost != null ? `${cost.toFixed(2)} Kč` : '—'}</span></div>
        <div class="slim-tile"><span class="k">🔁 Cirkulace</span><span class="v"><span class="slim-chip ${circActive ? 'on' : 'off'}">${circEnabled ? (circActive ? 'běží' : 'stojí') : '—'}</span></span></div>
        <div class="slim-tile"><span class="k">🎯 Komfort do</span><span class="v">${deadline || '—'} ${comfort === true ? '✓' : comfort === false ? '⚠' : ''}</span></div>
      </div>

      <oig-boiler-soc-chart
        .planSlots=${v2.planSlots}
        .capacityLiters=${volume}
        .nowLiters=${readyLiters}
        .drivesPlan=${drivesPlan}
        .lang=${lang}
      ></oig-boiler-soc-chart>

      <oig-boiler-plan
        .planSlots=${v2.planSlots}
        .planSummary=${v2.planSummary ?? null}
        .legionella=${v2.legionella ?? null}
        .circulationRuns=${circRuns}
        .status=${v2.status ?? null}
        .altSourceType=${v2.altSourceType ?? null}
        .lang=${lang}
      ></oig-boiler-plan>

      <details class="boiler-controls-section" data-testid="boiler-controls-section">
        <summary>⚙️ Ovládání a nastavení</summary>
        <div class="boiler-controls-body">
          <oig-boiler-override-panel
            .lang=${this.boilerLang}
            .identity=${v2.identity ?? { entryId: null, boxId: null, available: false }}
            .currentOverride=${v2.manualOverride ?? null}
          ></oig-boiler-override-panel>
          <div data-testid="boiler-setup-guide" class="boiler-setup-guide">
            <span class="boiler-setup-guide__icon">🧙</span>
            <div class="boiler-setup-guide__text">
              <strong>Průvodce nastavením bojleru</strong>
              <p>Bojler konfigurujte v Nastavení → Zařízení a služby → OIG Cloud → Konfigurovat.</p>
            </div>
          </div>
        </div>
      </details>
    `;
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
    // D11: a grandfathered entry gets the banner too (review-config invitation,
    // never a wall) — shown until its own dismissal is persisted. A
    // non-grandfathered, incomplete-setup entry keeps its prior behavior.
    const showOnboardingBanner = this.onboarding && (this.onboarding.grandfathered
      ? !this.onboarding.banner_dismissed
      : Object.values(this.onboarding.steps).some((step) => step !== 'done'));
    const dashboardTiles = this.visibleDashboardTiles;

    return html`
      <oig-theme-provider @oig-simulator-open=${this.onSimulatorOpen}>
        <oig-header
          title="Energetické Toky"
          .time=${this.time}
          .showStatus=${true}
          .alertCount=${chmuAlertCount}
          .weatherAvailable=${this.weatherData.available}
          .weatherCondition=${this.weatherData.condition}
          .weatherTemp=${this.weatherData.temperature}
          @edit-click=${this.onEditClick}
          @reset-click=${this.onResetClick}
          @status-click=${this.onChmuBadgeClick}
        >
        </oig-header>

        <oig-tabs
          .tabs=${this.visibleTabs}
          .activeTab=${this.activeTab}
          @tab-change=${this.onTabChange}
        ></oig-tabs>

        <main>
          ${showOnboardingBanner ? html`
            <oig-onboarding-banner
              role="status"
              .grandfathered=${!!this.onboarding.grandfathered}
              .lang=${this.boilerLang}
              @launch-onboarding=${this.onLaunchOnboarding}
              @dismiss-onboarding-banner=${this.onDismissOnboardingBanner}
            ></oig-onboarding-banner>
          ` : nothing}
          <oig-grid .editable=${this.editMode}>
            <!-- ===== FLOW TAB ===== -->
            <div class="tab-content ${this.activeTab === 'flow' ? 'active' : ''}">
              <div class="flow-layout">
                <!-- Dlaždice: levý sloupec (sjednocený styl Ovládání) -->
                <div class="flow-tiles-stack">
                  <div class="control-stack">
                    <div class="control-stack__head">
                      <span>🔌 Moje dlaždice</span>
                      <button class="control-stack__add" type="button"
                        title="Přidat dlaždici" @click=${this.onAddTile}>+</button>
                    </div>
                    <div class="control-stack__block">
                      ${dashboardTiles.length > 0 ? html`
                        <oig-tiles-container
                          .tiles=${dashboardTiles}
                          .editMode=${this.editMode}
                          @edit-tile=${this.onEditTile}
                          @delete-tile=${this.onDeleteTile}
                        ></oig-tiles-container>
                      ` : html`
                        <div class="control-stack__tiles-empty">Zatím žádné dlaždice — přidej tlačítkem +</div>
                      `}
                    </div>
                  </div>
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

                <!-- Systém OIG: pravý sloupec (stejný styl) -->
                <div class="flow-control">
                  <div class="control-stack">
                    <div class="control-stack__head">🛡️ Systém OIG</div>
                    <div class="control-stack__block">
                      <oig-control-panel embedded .boxHasHome56=${this.boxHasHome56}></oig-control-panel>
                    </div>
                  </div>
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

                <oig-timeline-tile
                  .data=${this.timelineData}
                  .activeTab=${this.timelineTab}
                  @tab-change=${this.onTimelineTabChange}
                  @refresh=${this.onTimelineRefresh}
                ></oig-timeline-tile>

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
               ${this.boilerLoading && this.boilerV2Data ? html`
                 <div class="tab-loading-overlay">
                   <div class="spinner spinner--small"></div>
                   <span>Načítání bojleru...</span>
                 </div>
               ` : nothing}
               ${this._renderBoilerTabSafe()}
             </div>

             <!-- ===== SETTINGS TAB ===== -->
             <div class="tab-content ${this.activeTab === 'settings' ? 'active' : ''}">
               ${this.activeTab === 'settings' ? html`
                 <oig-settings
                   .hassStates=${this.hass?.states ?? null}
                   @launch-onboarding=${this.onLaunchOnboarding}
                 ></oig-settings>
               ` : nothing}
             </div>
          </oig-grid>
        </main>

        <!-- ===== GLOBAL OVERLAYS ===== -->
        <oig-weather-modal
          ?open=${this.chmuModalOpen}
          .weather=${this.weatherData}
          .chmu=${this.chmuData}
          @close=${this.onChmuModalClose}
        ></oig-weather-modal>

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

        <!-- Plan 3.5 item 4: wizard mounted as a real production consumer of
             the launch-onboarding event. Drawn as an overlay; the dashboard
             stays interactive behind it (#6 — soft guide). -->
        <oig-onboarding-wizard
          ?open=${this.onboardingWizardOpen}
          .inverterSn=${INVERTER_SN}
          .hass=${this.hass}
          @close=${this.onWizardClose}
        ></oig-onboarding-wizard>

        <!-- fe/fix: 'oig-simulator-open' seam — see the simulatorOpen field
             comment for why this lives at the shell instead of inside the
             wizard. oig-simulator has no backdrop/close of its own, so this
             overlay supplies both, same pattern as above. -->
        ${this.simulatorOpen ? html`
          <div class="simulator-overlay" data-testid="simulator-overlay" @click=${this.onSimulatorClose}>
            <div class="simulator-modal" @click=${(e: Event) => e.stopPropagation()}>
              <button
                class="simulator-modal-close"
                type="button"
                aria-label="Zavřít"
                data-testid="simulator-close"
                @click=${this.onSimulatorClose}
              >×</button>
              ${this.simulatorPresetsLoading
                ? html`<div class="simulator-presets-loading" data-testid="simulator-presets-loading">Načítání scénářů…</div>`
                : this.simulatorPresetsError
                  ? html`<div class="simulator-presets-error" data-testid="simulator-presets-error">
                      <p>Scénáře se nepodařilo načíst.</p>
                      <button
                        type="button"
                        data-testid="simulator-presets-retry"
                        @click=${this.onSimulatorPresetsRetry}
                      >Zkusit znovu</button>
                    </div>`
                  : html`<oig-simulator
                      .domain=${this.simulatorDomain}
                      .draft=${this.simulatorDraft}
                      .presets=${this.simulatorPresets}
                      .activePresetId=${this.simulatorActivePresetId}
                    ></oig-simulator>`}
            </div>
          </div>
        ` : nothing}
      </oig-theme-provider>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'oig-app': OigApp;
  }
}
