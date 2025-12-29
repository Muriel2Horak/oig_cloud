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
        const performance = this.getPerformanceMeta(today);
        const baseline = this.getBaselineMeta(today);
        const footer = this.getFooterMeta(today, yesterday, tomorrow);

        return this.buildTileMarkup(today, performance, baseline, footer);
    }

    getPerformanceMeta(today) {
        const predictedTotal = today.eod_prediction?.predicted_total || today.plan_total_cost;
        return {
            performanceClass: today.performance_class || 'on_plan',
            performanceIcon: today.performance_icon || '⚪',
            progressPct: Math.round(today.progress_pct || 0),
            predictedTotal,
        };
    }

    getBaselineMeta(today) {
        const bc = today.baseline_comparison;
        const savings = bc ? Math.round(bc.savings) : 0;
        const baselineName = bc ? bc.best_baseline.replace('HOME_', 'H') : '';
        const savingsClass = savings > 0 ? 'positive' : (savings < 0 ? 'negative' : 'neutral');
        const savingsIcon = savings > 0 ? '💚' : '⚠️';
        const savingsPrefix = savings > 0 ? '+' : '';

        return {
            savings,
            savingsClass,
            baselineName,
            savingsIcon,
            savingsPrefix,
        };
    }

    getFooterMeta(today, yesterday, tomorrow) {
        const yesterdayContext = this.buildContextValue(yesterday, { preferActual: true, planLabel: 'plán' });
        const tomorrowContext = this.buildContextValue(tomorrow, { preferActual: false, planLabel: '' });

        return {
            yesterdayContext,
            tomorrowContext,
            hasYesterday: yesterdayContext !== null,
            hasTomorrow: tomorrowContext !== null,
            todayTooltip: today.tooltips?.today || '',
            yesterdayTooltip: today.tooltips?.yesterday || '',
            tomorrowTooltip: today.tooltips?.tomorrow || '',
        };
    }

    buildTileMarkup(today, performance, baseline, footer) {
        const footerHtml = footer.hasYesterday || footer.hasTomorrow
            ? `
                <div class="uct-footer">
                    ${footer.hasYesterday ? `<span data-tooltip="${this.escapeHtml(footer.yesterdayTooltip)}">Včera ${footer.yesterdayContext}</span>` : '<span>—</span>'}
                    ${footer.hasTomorrow ? `<span data-tooltip="${this.escapeHtml(footer.tomorrowTooltip)}">Zítra ${footer.tomorrowContext}</span>` : '<span>—</span>'}
                </div>
            `
            : '';

        return `
            <div class="unified-cost-tile-compact ${performance.performanceClass}" data-clickable="true" data-tooltip="${this.escapeHtml(footer.todayTooltip)}">
                <div class="uct-header-compact">
                    <span class="uct-label-inline">💰 DNES</span>
                    <span class="uct-cost-inline">${this.formatCostCompact(performance.predictedTotal)}</span>
                    <div class="uct-progress-inline">
                        <div class="uct-progress-bar" style="width: ${performance.progressPct}%"></div>
                    </div>
                    <span class="uct-progress-text">${performance.progressPct}%</span>
                    <span class="uct-status">${performance.performanceIcon}</span>
                </div>

                ${this.renderSpotPriceMinigraph(today.spot_prices_today)}

                <div class="uct-info-row">
                    <div class="uct-savings ${baseline.savingsClass}">
                        ${baseline.savingsIcon} ${baseline.savingsPrefix}${baseline.savings} Kč vs ${baseline.baselineName}
                    </div>
                    <div class="uct-delta ${performance.performanceClass}">
                        ${this.formatCostCompact(today.plan_total_cost)} → ${this.formatCostCompact(today.actual_total_cost)} → ${this.formatCostCompact(performance.predictedTotal)} (${this.formatDeltaCompact(today.eod_prediction?.vs_plan || 0, today.plan_total_cost)})
                    </div>
                </div>

                ${footerHtml}
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

    asNumber(value) {
        if (value === undefined || value === null) {
            return null;
        }
        const parsed = Number(value);
        return Number.isNaN(parsed) ? null : parsed;
    }

    /**
     * Build context value for footer rows (yesterday/tomorrow)
     */
    buildContextValue(dayData, { preferActual = true, planLabel = '' } = {}) {
        if (!dayData) {
            return null;
        }

        const actual = this.asNumber(dayData.actual_total_cost);
        const plan = this.asNumber(dayData.plan_total_cost);

        if (preferActual && actual !== null) {
            if (plan !== null && Math.round(plan) !== Math.round(actual)) {
                return `${this.formatCostCompact(actual)} (${this.formatCostCompact(plan)} ${planLabel || 'plán'})`;
            }
            return this.formatCostCompact(actual);
        }

        if (plan !== null) {
            return `${this.formatCostCompact(plan)}${planLabel ? ` ${planLabel}` : ''}`;
        }

        if (!preferActual && actual !== null) {
            return this.formatCostCompact(actual);
        }

        return null;
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

        // Custom tooltip handlers
        this.attachTooltipListeners();
    }

    /**
     * Attach custom tooltip event listeners
     */
    attachTooltipListeners() {
        const elementsWithTooltip = this.container.querySelectorAll('[data-tooltip]');

        elementsWithTooltip.forEach(element => {
            element.addEventListener('mouseenter', (e) => this.showTooltip(e));
            element.addEventListener('mouseleave', () => this.hideTooltip());
            element.addEventListener('mousemove', (e) => this.moveTooltip(e));
        });
    }

    /**
     * Show custom tooltip
     */
    showTooltip(event) {
        const text = event.currentTarget.getAttribute('data-tooltip');
        if (!text) return;

        // Remove existing tooltip if any
        this.hideTooltip();

        // Create tooltip element
        const tooltip = document.createElement('div');
        tooltip.className = 'uct-custom-tooltip';
        tooltip.textContent = text;
        tooltip.id = 'uct-tooltip';
        document.body.appendChild(tooltip);

        // Position tooltip
        this.moveTooltip(event);

        // Show with animation
        setTimeout(() => tooltip.classList.add('visible'), 10);
    }

    /**
     * Move tooltip to follow cursor
     */
    moveTooltip(event) {
        const tooltip = document.getElementById('uct-tooltip');
        if (!tooltip) return;

        const offset = 15;
        let x = event.clientX + offset;
        let y = event.clientY + offset;

        // Keep tooltip within viewport
        const rect = tooltip.getBoundingClientRect();
        if (x + rect.width > window.innerWidth) {
            x = event.clientX - rect.width - offset;
        }
        if (y + rect.height > window.innerHeight) {
            y = event.clientY - rect.height - offset;
        }

        tooltip.style.left = `${x}px`;
        tooltip.style.top = `${y}px`;
    }

    /**
     * Hide custom tooltip
     */
    hideTooltip() {
        const tooltip = document.getElementById('uct-tooltip');
        if (tooltip) {
            tooltip.remove();
        }
    }

    /**
     * Escape HTML for safe insertion
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

window.UnifiedCostTile = UnifiedCostTile;
