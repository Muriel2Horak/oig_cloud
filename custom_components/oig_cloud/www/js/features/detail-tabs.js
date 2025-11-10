/**
 * OIG Cloud - Detail Tabs Dashboard Component
 *
 * FÁZE 6: Frontend integrace pro Detail Tabs API
 *
 * Purpose:
 * - Zobrazení mode-agregovaných dat pro Včera/Dnes/Zítra
 * - Mode match detection (plán vs. realita)
 * - Adherence % tracking
 * - Tab navigation
 *
 * API: /api/oig_cloud/battery_forecast/{box_id}/detail_tabs
 *
 * @author OIG Cloud Team
 * @version 1.0.0
 * @date 2025-11-06
 */

// Mode configuration (inherited from dashboard-timeline.js)
const DETAIL_TABS_MODE_CONFIG = {
    'HOME I': { icon: '🏠', color: 'rgba(76, 175, 80, 0.7)', label: 'HOME I' },
    'HOME II': { icon: '⚡', color: 'rgba(33, 150, 243, 0.7)', label: 'HOME II' },
    'HOME III': { icon: '🔋', color: 'rgba(156, 39, 176, 0.7)', label: 'HOME III' },
    'HOME UPS': { icon: '🛡️', color: 'rgba(255, 152, 0, 0.7)', label: 'HOME UPS' },
    'FULL HOME UPS': { icon: '🛡️', color: 'rgba(255, 152, 0, 0.7)', label: 'FULL HOME UPS' },
    'DO NOTHING': { icon: '⏸️', color: 'rgba(158, 158, 158, 0.7)', label: 'DO NOTHING' },
    'Unknown': { icon: '❓', color: 'rgba(158, 158, 158, 0.5)', label: 'Unknown' }
};

/**
 * DetailTabsDialog Class - manages the detail tabs popup dialog
 * Shows mode-aggregated data with adherence tracking
 */
class DetailTabsDialog {
    constructor(boxId) {
        this.boxId = boxId;
        this.dialogElement = null;
        this.isOpen = false;
        this.activeTab = 'today'; // Default tab - DNES
        this.cache = {
            yesterday: null,
            today: null,
            tomorrow: null,
            lastUpdate: null
        };
        this.updateInterval = null;
    }

    /**
     * Initialize dialog - called once on page load
     */
    init() {
        this.dialogElement = document.getElementById('detail-tabs-dialog');
        if (!this.dialogElement) {
            console.error('[DetailTabs] Dialog element not found');
            return;
        }

        // Setup close button
        const closeBtn = this.dialogElement.querySelector('.close-dialog');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Setup tab buttons
        const tabBtns = this.dialogElement.querySelectorAll('.tab-btn');
        tabBtns.forEach((btn) => {
            btn.addEventListener('click', (e) => {
                const target = e.target;
                const tab = target.dataset.tab;
                if (tab) {
                    this.switchTab(tab);
                }
            });
        });

        console.log('[DetailTabs] Dialog initialized');
    }

    /**
     * Open dialog with specific tab
     */
    async open(tab = 'today') {
        if (!this.dialogElement) {
            console.error('[DetailTabs] Dialog not initialized');
            return;
        }

        this.isOpen = true;
        this.activeTab = tab;
        this.dialogElement.style.display = 'block';

        // Fetch data
        await this.fetchData();

        // Render active tab
        this.switchTab(this.activeTab);

        // Start auto-refresh for today/tomorrow tabs (60s interval matches cache TTL)
        if (this.activeTab === 'today' || this.activeTab === 'tomorrow') {
            this.startAutoRefresh();
        }

        console.log(`[DetailTabs] Dialog opened with ${tab} tab`);
    }

    /**
     * Close dialog
     */
    close() {
        if (this.dialogElement) {
            this.dialogElement.style.display = 'none';
        }
        this.isOpen = false;
        this.stopAutoRefresh();
        console.log('[DetailTabs] Dialog closed');
    }

    /**
     * Switch to specific tab
     */
    switchTab(tab) {
        this.activeTab = tab;

        // Update tab buttons
        const tabBtns = this.dialogElement?.querySelectorAll('.tab-btn');
        tabBtns?.forEach((btn) => {
            if (btn.dataset.tab === tab) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Render tab content
        this.renderTab(tab);

        // Auto-refresh strategy
        this.stopAutoRefresh();
        if (tab === 'today' || tab === 'tomorrow') {
            this.startAutoRefresh();
        }

        console.log(`[DetailTabs] Switched to ${tab} tab`);
    }

    /**
     * Fetch data from Detail Tabs API
     */
    async fetchData() {
        try {
            const apiUrl = `/api/oig_cloud/battery_forecast/${this.boxId}/detail_tabs`;
            console.log(`[DetailTabs] Fetching data from ${apiUrl}`);

            const response = await fetch(apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            // Store in cache
            this.cache.yesterday = data.yesterday || null;
            this.cache.today = data.today || null;
            this.cache.tomorrow = data.tomorrow || null;
            this.cache.lastUpdate = new Date();

            console.log('[DetailTabs] Data fetched:', {
                yesterday: this.cache.yesterday?.mode_blocks?.length || 0,
                today: this.cache.today?.mode_blocks?.length || 0,
                tomorrow: this.cache.tomorrow?.mode_blocks?.length || 0
            });
        } catch (error) {
            console.error('[DetailTabs] Failed to fetch data:', error);
        }
    }

    /**
     * Render specific tab
     */
    renderTab(tab) {
        const container = document.getElementById(`${tab}-detail-container`);
        if (!container) {
            console.error(`[DetailTabs] Container for ${tab} not found`);
            return;
        }

        const tabData = this.cache[tab];
        if (!tabData || !tabData.mode_blocks || tabData.mode_blocks.length === 0) {
            container.innerHTML = this.renderNoData(tab);
            return;
        }

        // Render summary + mode blocks
        container.innerHTML = this.renderTabContent(tabData, tab);

        console.log(`[DetailTabs] Rendered ${tab} tab with ${tabData.mode_blocks.length} mode blocks`);
    }

    /**
     * Render tab content: summary + mode blocks
     */
    renderTabContent(tabData, tabName) {
        const { date, mode_blocks, summary } = tabData;

        const summaryHtml = this.renderSummary(summary, tabName);

        // Pro DNES tab: rozdělit na sekce podle statusu
        let blocksHtml = '';
        if (tabName === 'today') {
            const completedBlocks = mode_blocks.filter(b => b.status === 'completed');
            const currentBlocks = mode_blocks.filter(b => b.status === 'current');
            const plannedBlocks = mode_blocks.filter(b => b.status === 'planned');

            blocksHtml = `
                ${completedBlocks.length > 0 ? `
                    <div class="mode-section">
                        <h3 class="section-header">⏮️ Uplynulé</h3>
                        <div class="mode-blocks-container">
                            ${completedBlocks.map((block, index) => this.renderModeBlock(block, index)).join('')}
                        </div>
                    </div>
                ` : ''}

                ${currentBlocks.length > 0 ? `
                    <div class="mode-section current-section">
                        <h3 class="section-header">▶️ Aktuální</h3>
                        <div class="mode-blocks-container">
                            ${currentBlocks.map((block, index) => this.renderModeBlock(block, index)).join('')}
                        </div>
                    </div>
                ` : ''}

                ${plannedBlocks.length > 0 ? `
                    <div class="mode-section">
                        <h3 class="section-header">⏭️ Plán</h3>
                        <div class="mode-blocks-container">
                            ${plannedBlocks.map((block, index) => this.renderModeBlock(block, index)).join('')}
                        </div>
                    </div>
                ` : ''}
            `;
        } else {
            // VČERA/ZÍTRA: flat list
            blocksHtml = `
                <div class="mode-blocks-container">
                    ${mode_blocks.map((block, index) => this.renderModeBlock(block, index)).join('')}
                </div>
            `;
        }

        return `
            <div class="detail-tab-content">
                <!-- Summary Tiles -->
                ${summaryHtml}

                <!-- Mode Blocks -->
                ${blocksHtml}

                <!-- Date Footer -->
                <div class="tab-footer">
                    <span class="tab-date">📅 ${this.formatDate(date)}</span>
                </div>
            </div>
        `;
    }

    /**
     * Render summary tiles at top of tab
     */
    renderSummary(summary, tabName) {
        const { total_cost, overall_adherence, mode_switches } = summary;

        // Adherence color coding
        let adherenceColor = '#888'; // Gray for planned-only
        let adherenceIcon = '📊';
        if (overall_adherence !== null) {
            if (overall_adherence >= 80) {
                adherenceColor = '#4CAF50'; // Green
                adherenceIcon = '✅';
            } else if (overall_adherence >= 50) {
                adherenceColor = '#FF9800'; // Orange
                adherenceIcon = '⚠️';
            } else {
                adherenceColor = '#F44336'; // Red
                adherenceIcon = '❌';
            }
        }

        return `
            <div class="summary-tiles">
                <!-- Total Cost -->
                <div class="summary-tile">
                    <div class="tile-icon">💰</div>
                    <div class="tile-value">${total_cost?.toFixed(2) || '0.00'} Kč</div>
                    <div class="tile-label">Celková cena</div>
                </div>

                <!-- Adherence % -->
                <div class="summary-tile" style="border-left: 4px solid ${adherenceColor};">
                    <div class="tile-icon">${adherenceIcon}</div>
                    <div class="tile-value">
                        ${overall_adherence !== null ? overall_adherence.toFixed(1) : 'N/A'}%
                    </div>
                    <div class="tile-label">Dodržení plánu</div>
                </div>

                <!-- Mode Switches -->
                <div class="summary-tile">
                    <div class="tile-icon">🔄</div>
                    <div class="tile-value">${mode_switches || 0}</div>
                    <div class="tile-label">Přepnutí módu</div>
                </div>
            </div>
        `;
    }

    /**
     * Render single mode block
     */
    renderModeBlock(block, index) {
        const {
            mode_historical,
            mode_planned,
            mode_match,
            status,
            start_time,
            end_time,
            duration_hours,
            cost_historical,
            cost_planned,
            cost_delta,
            adherence_pct,
            solar_total_kwh,
            consumption_total_kwh,
            grid_import_total_kwh,
            grid_export_total_kwh
        } = block;

        // Get mode config
        const historicalMode = DETAIL_TABS_MODE_CONFIG[mode_historical] || DETAIL_TABS_MODE_CONFIG['Unknown'];
        const plannedMode = DETAIL_TABS_MODE_CONFIG[mode_planned] || DETAIL_TABS_MODE_CONFIG['Unknown'];

        // Status icon
        const statusIcons = {
            completed: '✅',
            current: '▶️',
            planned: '📅'
        };
        const statusIcon = statusIcons[status] || '❓';

        // Match indicator
        const matchClass = mode_match ? 'match-yes' : 'match-no';
        const matchIcon = mode_match ? '✅' : '❌';
        const matchLabel = mode_match ? 'Shoda' : 'Odchylka';

        // Cost delta indicator
        let costDeltaHtml = '';
        if (cost_delta !== null && cost_delta !== undefined) {
            const deltaClass = cost_delta > 0 ? 'cost-higher' : cost_delta < 0 ? 'cost-lower' : 'cost-equal';
            const deltaIcon = cost_delta > 0 ? '⬆️' : cost_delta < 0 ? '⬇️' : '➡️';
            costDeltaHtml = `
                <span class="cost-delta ${deltaClass}">
                    ${deltaIcon} ${cost_delta > 0 ? '+' : ''}${cost_delta.toFixed(2)} Kč
                </span>
            `;
        }

        // Build compact single-line layout
        const modeCompare = mode_planned !== 'Unknown'
            ? `<span class="mode-badge" style="background: ${historicalMode.color};">${historicalMode.icon} ${historicalMode.label}</span>
               <span class="mode-arrow">→</span>
               <span class="mode-badge mode-planned" style="background: ${plannedMode.color};">${plannedMode.icon} ${plannedMode.label}</span>`
            : `<span class="mode-badge" style="background: ${historicalMode.color};">${historicalMode.icon} ${historicalMode.label}</span>`;

        const costCompare = cost_planned !== null && cost_planned !== undefined
            ? `<span class="cost-actual">${cost_historical?.toFixed(2) || 'N/A'} Kč</span>
               <span class="cost-arrow">→</span>
               <span class="cost-planned">${cost_planned.toFixed(2)} Kč</span>
               ${costDeltaHtml}`
            : `<span class="cost-actual">${cost_historical?.toFixed(2) || 'N/A'} Kč</span>`;

        return `
            <div class="mode-block ${matchClass}" data-index="${index}">
                <div class="block-header">
                    <div class="block-time">
                        ${statusIcon} <strong>${start_time} - ${end_time}</strong>
                        <span class="block-duration">(${duration_hours?.toFixed(1)}h)</span>
                    </div>
                    <div class="block-match ${matchClass}">
                        ${matchIcon} ${matchLabel}
                    </div>
                </div>

                <div class="block-content-row">
                    <!-- Režim -->
                    <div class="block-item">
                        <span class="item-label">Skutečnost/Plán:</span>
                        <div class="item-value">${modeCompare}</div>
                    </div>

                    <!-- Náklady -->
                    <div class="block-item">
                        <span class="item-label">Cena (skutečná/plán):</span>
                        <div class="item-value">${costCompare}</div>
                    </div>

                    <!-- Solár -->
                    <div class="block-item">
                        <span class="item-label">☀️ Solár:</span>
                        <div class="item-value">${solar_total_kwh?.toFixed(2) || '0.00'} kWh</div>
                    </div>

                    <!-- Spotřeba -->
                    <div class="block-item">
                        <span class="item-label">🏠 Spotřeba:</span>
                        <div class="item-value">${consumption_total_kwh?.toFixed(2) || '0.00'} kWh</div>
                    </div>

                    <!-- Import -->
                    <div class="block-item">
                        <span class="item-label">⬇️ Import:</span>
                        <div class="item-value">${grid_import_total_kwh?.toFixed(2) || '0.00'} kWh</div>
                    </div>

                    <!-- Export -->
                    <div class="block-item">
                        <span class="item-label">⬆️ Export:</span>
                        <div class="item-value">${grid_export_total_kwh?.toFixed(2) || '0.00'} kWh</div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Render "No Data" message
     */
    renderNoData(tab) {
        const messages = {
            yesterday: 'Včerejší data nejsou k dispozici',
            today: 'Dnešní data nejsou k dispozici',
            tomorrow: 'Plán pro zítřek ještě není k dispozici (OTE ceny přijdou po 13:00)'
        };

        return `
            <div class="no-data">
                <div class="no-data-icon">📊</div>
                <h3>${messages[tab] || 'Data nejsou k dispozici'}</h3>
            </div>
        `;
    }

    /**
     * Format date for display
     */
    formatDate(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('cs-CZ', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Start auto-refresh timer
     */
    startAutoRefresh() {
        this.stopAutoRefresh();
        // Refresh every 60s to match cache TTL
        this.updateInterval = setInterval(async () => {
            if (this.isOpen) {
                console.log('[DetailTabs] Auto-refreshing data...');
                await this.fetchData();
                this.renderTab(this.activeTab);
            }
        }, 60000); // 60s
    }

    /**
     * Stop auto-refresh timer
     */
    stopAutoRefresh() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    /**
     * Destroy dialog and cleanup
     */
    destroy() {
        this.close();
        this.cache = {
            yesterday: null,
            today: null,
            tomorrow: null,
            lastUpdate: null
        };
        console.log('[DetailTabs] Dialog destroyed');
    }
}

// Global instance
window.DetailTabsDialog = null;

/**
 * Initialize Detail Tabs Dialog
 */
function initDetailTabsDialog(boxId) {
    if (!window.DetailTabsDialog) {
        window.DetailTabsDialog = new DetailTabsDialog(boxId);
        window.DetailTabsDialog.init();
        console.log('[DetailTabs] Global instance created');
    }
}

/**
 * Open Detail Tabs Dialog
 */
function openDetailTabsDialog(tab = 'today') {
    if (window.DetailTabsDialog) {
        window.DetailTabsDialog.open(tab);
    } else {
        console.error('[DetailTabs] Dialog not initialized. Call initDetailTabsDialog() first.');
    }
}

// Export for global access
window.initDetailTabsDialog = initDetailTabsDialog;
window.openDetailTabsDialog = openDetailTabsDialog;
