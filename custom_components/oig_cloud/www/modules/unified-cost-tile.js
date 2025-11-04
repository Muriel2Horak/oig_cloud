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
     * Render main tile HTML - COMPACT & INFO-RICH
     * Maximum info density in minimal space
     */
    renderTileHTML(today, yesterday, tomorrow) {
        const performanceClass = today.performance_class || 'on_plan';
        const performanceIcon = today.performance_icon || '⚪';
        const progressPct = Math.round(today.progress_pct || 0);
        const predictedTotal = today.eod_prediction?.predicted_total || today.plan_total_cost;

        // Baseline comparison
        const bc = today.baseline_comparison;
        const savings = bc ? Math.round(bc.savings) : 0;  // DON'T negate!
        const savingsPct = bc ? Math.round(bc.savings_pct) : 0;  // DON'T negate!
        const baselineName = bc ? bc.best_baseline.replace('HOME_', 'H') : '';
        const savingsClass = savings > 0 ? 'positive' : (savings < 0 ? 'negative' : 'neutral');

        // Yesterday/tomorrow context
        const hasYesterday = yesterday && yesterday.actual_total_cost > 0;
        const hasTomorrow = tomorrow && tomorrow.plan_total_cost > 0;

        return `
            <div class="unified-cost-tile-compact ${performanceClass}" data-clickable="true">
                <!-- Compact header: DNES 51 Kč  [progress] 3% ✅ -->
                <div class="uct-header-compact">
                    <span class="uct-label-inline">💰 DNES</span>
                    <span class="uct-cost-inline">${this.formatCostCompact(predictedTotal)}</span>
                    <div class="uct-progress-inline">
                        <div class="uct-progress-bar" style="width: ${progressPct}%"></div>
                    </div>
                    <span class="uct-progress-text">${progressPct}%</span>
                    <span class="uct-status">${performanceIcon}</span>
                </div>

                <!-- Minigraph -->
                ${this.renderSpotPriceMinigraph(today.spot_prices_today)}

                <!-- Savings + Plan vs Actual in ONE row -->
                <div class="uct-info-row">
                    <div class="uct-savings ${savingsClass}">
                        ${savings > 0 ? '💚' : '⚠️'} ${savings > 0 ? '+' : ''}${savings} Kč vs ${baselineName}
                    </div>
                    <div class="uct-delta ${performanceClass}">
                        ${this.formatCostCompact(today.actual_total_cost)} → ${this.formatCostCompact(predictedTotal)} (${this.formatDeltaCompact(today.eod_prediction?.vs_plan || 0, today.plan_total_cost)})
                    </div>
                </div>

                <!-- Context footer: Včera | Zítra -->
                ${(hasYesterday || hasTomorrow) ? `
                <div class="uct-footer">
                    ${hasYesterday ? `<span>Včera ${this.formatCostCompact(yesterday.actual_total_cost)}</span>` : '<span>—</span>'}
                    ${hasTomorrow ? `<span>Zítra ${this.formatCostCompact(tomorrow.plan_total_cost)}</span>` : '<span>—</span>'}
                </div>
                ` : ''}
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
     * Render spot price minigraph - ASCII sparkline
     * Shows today's spot price trend visually
     */
    renderSpotPriceMinigraph(spotPrices) {
        if (!spotPrices || spotPrices.length === 0) {
            return ''; // No data
        }

        // Get price values and normalize to 0-7 scale for characters
        const prices = spotPrices.map(sp => sp.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const range = maxPrice - minPrice;

        if (range === 0) {
            return `<div class="uct-minigraph">━━━━━━━━━━━━━━━━━━━━</div>`;
        }

        // Sparkline characters from lowest to highest
        const chars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];

        // Sample every 4th interval to fit ~24 chars (96 intervals / 4 = 24)
        const step = Math.ceil(prices.length / 24);
        const sampledPrices = prices.filter((_, i) => i % step === 0);

        const sparkline = sampledPrices.map(price => {
            const normalized = (price - minPrice) / range;
            const charIndex = Math.min(Math.floor(normalized * 8), 7);
            return chars[charIndex];
        }).join('');

        return `
            <div class="uct-minigraph" title="Spotové ceny dnes (${minPrice.toFixed(2)} - ${maxPrice.toFixed(2)} Kč/kWh)">
                ${sparkline}
            </div>
        `;
    }

    /**
     * Render savings highlight - BIG & GREEN
     * Main value proposition of HYBRID optimization
     */
    renderSavingsHighlight(baselineComp) {
        if (!baselineComp || !baselineComp.best_baseline) {
            return ''; // No baseline data
        }

        const { best_baseline, savings, savings_pct } = baselineComp;

        // Savings shown as negative (intuitive: -15 = saved 15)
        const savingsAmount = -Math.round(savings);
        const savingsPct = -Math.round(savings_pct);

        // Color class
        const savingsClass = savingsAmount < 0 ? 'savings-positive' : (savingsAmount > 0 ? 'savings-negative' : 'savings-neutral');

        // Format baseline name
        const baselineName = best_baseline.replace('HOME_', 'H');

        // Show different format based on savings magnitude
        if (Math.abs(savingsAmount) >= 10) {
            // BIG savings - emphasize with larger font
            return `
                <div class="uct-savings-big">
                    <div class="uct-savings-amount ${savingsClass}">
                        💚 ${savingsAmount < 0 ? '' : '+'}${savingsAmount} Kč
                    </div>
                    <div class="uct-savings-label">
                        vs ${baselineName} (${savingsPct < 0 ? '' : '+'}${savingsPct}%)
                    </div>
                </div>
            `;
        } else {
            // Small savings - compact format
            return `
                <div class="uct-savings-compact">
                    📊 <span class="${savingsClass}">${savingsAmount < 0 ? '' : '+'}${savingsAmount} Kč</span> vs ${baselineName} (${savingsPct < 0 ? '' : '+'}${savingsPct}%)
                </div>
            `;
        }
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
     * Render baseline comparison section - ultra compact
     * Shows savings vs best fixed mode in one line
     */
    renderBaselineComparison(baselineComp) {
        if (!baselineComp || !baselineComp.best_baseline) {
            return ''; // No baseline data available
        }

        const { best_baseline, savings, savings_pct } = baselineComp;

        // Savings are shown as negative (less cost = savings)
        const savingsAmount = -Math.round(savings);
        const savingsPct = -Math.round(savings_pct);

        // Determine color class (negative = we saved money = good)
        const savingsClass = savingsAmount < 0 ? 'savings-positive' : (savingsAmount > 0 ? 'savings-negative' : 'savings-neutral');

        // Format baseline name for display
        const baselineName = best_baseline.replace('HOME_', 'H');

        return `
            <!-- Baseline comparison - compact -->
            <div class="uct-baseline-compact">
                📊 <span class="uct-baseline-value ${savingsClass}">${savingsAmount > 0 ? '+' : ''}${savingsAmount} Kč</span> vs ${baselineName} (${savingsPct > 0 ? '+' : ''}${savingsPct}%)
            </div>
        `;
    }    /**
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
