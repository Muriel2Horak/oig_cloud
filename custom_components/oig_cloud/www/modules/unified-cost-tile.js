/**
 * Unified Cost Tile - Phase V2
 * PLAN_VS_ACTUAL_UX_REDESIGN_V2.md - Fáze 1 (UCT-FE-001 až UCT-FE-007)
 *
 * Consolidates 2 cost tiles into one with today/yesterday/tomorrow context.
 */

class UnifiedCostTile {
    /**
     * @param {HTMLElement} container - Container element for the tile
     * @param {object} data - unified_cost_tile data from sensor attributes
     * @param {function} onClick - Click handler (opens DNES tab)
     */
    constructor(container, data, onClick) {
        this.container = container;
        this.data = data;
        this.onClick = onClick;

        this.render();
    }

    /**
     * Update tile with new data
     */
    update(data) {
        this.data = data;
        this.render();
    }

    /**
     * Render the tile
     */
    render() {
        if (!this.data) {
            this.container.innerHTML = this.renderError('Žádná data k dispozici');
            return;
        }

        const { today, yesterday, tomorrow } = this.data;

        if (!today) {
            this.container.innerHTML = this.renderError('Chybí data pro dnešek');
            return;
        }

        this.container.innerHTML = this.renderTileHTML(today, yesterday, tomorrow);
        this.attachEventListeners();
    }

    /**
     * Render error state
     */
    renderError(message) {
        return `
            <div class="unified-cost-tile error">
                <div class="tile-header">
                    <span class="tile-title">💰 Náklady</span>
                </div>
                <div class="tile-error">
                    <p>${message}</p>
                </div>
            </div>
        `;
    }

    /**
     * Render main tile HTML - COMPACT VERSION with visual elements
     * Now uses BE-calculated data (FÁZE 1-3 migration)
     */
    renderTileHTML(today, yesterday, tomorrow) {
        // FÁZE 1: Use BE performance metrics
        const performanceClass = today.performance_class || 'on_plan';
        const performanceIcon = today.performance_icon || '⚪';
        const progressPct = Math.round(today.progress_pct || 0);

        // EOD prediction from BE
        const predictedTotal = today.eod_prediction?.predicted_total || today.plan_total_cost;

        // Včera comparison
        const hasYesterday = yesterday && yesterday.actual_total_cost > 0;
        const yIcon = hasYesterday ? this.getPerformanceIcon(yesterday.delta, yesterday.plan_total_cost) : '○';

        // Zítra comparison
        const hasTomorrow = tomorrow && tomorrow.plan_total_cost > 0;
        const tDelta = hasTomorrow ? tomorrow.plan_total_cost - today.plan_total_cost : 0;
        const tIcon = tDelta < 0 ? '▼' : (tDelta > 0 ? '▲' : '○');

        return `
            <div class="unified-cost-tile-compact ${performanceClass}" data-clickable="true">
                <!-- Header with progress -->
                <div class="uct-header">
                    <div class="uct-label">💰 DNES <span class="uct-progress">${progressPct}%</span></div>
                    <div class="uct-status">${performanceIcon}</div>
                </div>

                <!-- Main cost number -->
                <div class="uct-main ${performanceClass}">
                    ${this.formatCostCompact(predictedTotal)}
                </div>

                <!-- Progress bar -->
                <div class="uct-bar">
                    <div class="uct-bar-fill" style="width: ${progressPct}%"></div>
                </div>

                <!-- Compact stats -->
                <div class="uct-stats">
                    <div class="uct-stat">
                        <span class="uct-stat-icon">✓</span>
                        <span class="uct-stat-value">${this.formatCostCompact(today.actual_total_cost)}</span>
                    </div>
                    <div class="uct-stat">
                        <span class="uct-stat-icon">→</span>
                        <span class="uct-stat-value">${this.formatCostCompact(today.remaining_to_eod || 0)}</span>
                    </div>
                    <div class="uct-stat ${performanceClass}">
                        <span class="uct-stat-icon">△</span>
                        <span class="uct-stat-value">${this.formatDeltaCompact(today.eod_prediction?.vs_plan || 0, today.plan_total_cost)}</span>
                    </div>
                </div>

                <!-- Context row -->
                <div class="uct-context">
                    ${hasYesterday
                        ? `<span class="uct-ctx">${yIcon} ${this.formatCostCompact(yesterday.actual_total_cost)}</span>`
                        : '<span class="uct-ctx muted">○ --</span>'}
                    ${hasTomorrow
                        ? `<span class="uct-ctx">${tIcon} ${this.formatCostCompact(tomorrow.plan_total_cost)}</span>`
                        : '<span class="uct-ctx muted">○ --</span>'}
                </div>
            </div>
        `;
    }

    /**
     * Format cost value - compact version (integers)
     */
    formatCostCompact(value) {
        if (value === undefined || value === null) return '--';
        return `${Math.round(value)} Kč`;
    }

    /**
     * Format delta as percentage - compact
     */
    formatDeltaCompact(delta, total) {
        if (!total || total === 0) return '0%';
        const pct = Math.round((delta / total) * 100);
        return `${pct > 0 ? '+' : ''}${pct}%`;
    }

    /**
     * Get performance class
     */
    getPerformanceClass(delta, total) {
        if (!total || total === 0) return 'cost-on-plan';
        const pct = (delta / total) * 100;
        if (pct <= -2) return 'cost-better';
        if (pct >= 2) return 'cost-worse';
        return 'cost-on-plan';
    }

    /**
     * Get performance icon
     */
    getPerformanceIcon(delta, total) {
        if (!total || total === 0) return '⚪';
        const pct = (delta / total) * 100;
        if (pct <= -2) return '✅';
        if (pct >= 2) return '❌';
        return '⚪';
    }

    /**
     * Attach event listeners
     */
    attachEventListeners() {
        const tile = this.container.querySelector('[data-clickable="true"]');
        if (tile && this.onClick) {
            tile.style.cursor = 'pointer';
            tile.addEventListener('click', this.onClick);
        }
    }
}
