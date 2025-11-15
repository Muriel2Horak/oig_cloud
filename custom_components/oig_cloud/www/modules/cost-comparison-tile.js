class CostComparisonTile {
    constructor(container, hybridData, autonomyData, options = {}) {
        this.container = container;
        this.hybrid = hybridData || {};
        this.autonomy = autonomyData || {};
        this.onOpenHybrid = options.onOpenHybrid;
        this.onOpenAutonomy = options.onOpenAutonomy;
        this.boundContainerClick = null;
        this.hasData = false;
        this.render();
    }

    update(hybridData, autonomyData) {
        this.hybrid = hybridData || {};
        this.autonomy = autonomyData || {};
        this.render();
    }

    getPlanLabel(plan, variant = 'short') {
        const fallback = plan === 'autonomy' ? 'Dynamický' : 'Standardní';
        const labels = window.PLAN_LABELS && window.PLAN_LABELS[plan];
        if (!labels) {
            return fallback;
        }
        return labels[variant] || labels.short || fallback;
    }

    getDisplayCost(dayData) {
        if (!dayData) {
            return null;
        }
        if (dayData.blended_total_cost != null) {
            return dayData.blended_total_cost;
        }
        if (dayData.plan_total_cost != null) {
            return dayData.plan_total_cost;
        }
        return null;
    }

    getActualCost(dayData) {
        if (!dayData) {
            return null;
        }
        if (dayData.actual_cost_so_far != null) {
            return dayData.actual_cost_so_far;
        }
        if (dayData.actual_total_cost != null) {
            return dayData.actual_total_cost;
        }
        return null;
    }

    render() {
        if (!this.hybrid.today || !this.autonomy.today) {
            if (!this.hasData) {
                this.container.innerHTML = this.renderPlaceholder();
            }
            return;
        }

        this.hasData = true;
        this.container.classList.add('cost-card');
        this.container.innerHTML = `
            ${this.renderMainRow()}
            ${this.renderDeltaRow()}
            ${this.renderMetaRow()}
        `;

        this.attachEvents();
    }

    renderPlaceholder() {
        return `
            <div class="cost-card-placeholder">
                <span class="cost-card-title">💰 Nákladový přehled</span>
                <span class="cost-card-loading">Čekám na data…</span>
            </div>
        `;
    }

    renderMainRow() {
        const hybridToday = this.hybrid.today || {};
        const autonomyToday = this.autonomy.today || {};

        return `
            <div class="cost-main-row">
                ${this.renderMainCard('hybrid', hybridToday)}
                ${this.renderMainCard('autonomy', autonomyToday)}
            </div>
        `;
    }

    renderDeltaRow() {
        const hybridToday = this.hybrid.today || {};
        const autonomyToday = this.autonomy.today || {};

        return `
            <div class="cost-delta-container">
                ${this.renderDeltaPill(
                    this.getDisplayCost(hybridToday),
                    this.getDisplayCost(autonomyToday)
                )}
            </div>
        `;
    }

    renderMainCard(plan, dayData) {
        const label = this.getPlanLabel(plan);
        const value = this.getDisplayCost(dayData);
        const actual = this.getActualCost(dayData);
        const future = dayData?.future_plan_cost ?? null;
        const hasBreakdown = actual != null && future != null;

        return `
            <div class="cost-main-card" data-plan="${plan}">
                <div class="cost-main-label">${label}</div>
                <div class="cost-main-value">${this.formatCost(value)}</div>
                ${hasBreakdown ? `
                    <div class="cost-main-breakdown">
                        <span>${this.formatCost(actual)}</span>
                        <span class="cost-main-breakdown-divider">+</span>
                        <span>${this.formatCost(future)}</span>
                    </div>` : ''}
            </div>
        `;
    }

    renderDeltaPill(hybridCost, autonomyCost) {
        if (hybridCost == null || autonomyCost == null) {
            return `<div class="cost-delta-pill neutral">--</div>`;
        }

        const delta = Math.round(autonomyCost - hybridCost);
        const deltaClass = delta === 0 ? 'neutral' : delta > 0 ? 'negative' : 'positive';
        const icon = delta === 0 ? '≈' : delta > 0 ? '▲' : '▼';
        const label = delta === 0 ? 'Stejné náklady' : delta > 0 ? 'Dynamický dražší' : 'Dynamický levnější';

        return `
            <div class="cost-delta-pill ${deltaClass}" title="${label}">
                <span class="cost-delta-icon">${icon}</span>
                <div class="cost-delta-value">${delta > 0 ? '+' : ''}${delta} Kč</div>
                <div class="cost-delta-label">Dynamický vs Standardní</div>
            </div>
        `;
    }

    renderMetaRow() {
        const baseline = this.renderBaselineMeta();
        const plans = this.renderPlanChips();

        if (!baseline && !plans) {
            return '';
        }

        return `
            <div class="cost-meta-row">
                ${baseline || ''}
                ${plans || ''}
            </div>
        `;
    }

    renderBaselineMeta() {
        const bc = this.hybrid.today?.baseline_comparison;
        if (!bc) {
            return '';
        }

        const bestName = bc.best_baseline ? bc.best_baseline.replace('HOME_', 'HOME ') : 'HOME I';
        const bestCost = this.getBestBaselineCost(bc);
        const hybridDelta = this.hybrid.today?.plan_total_cost != null && bestCost != null
            ? this.hybrid.today.plan_total_cost - bestCost
            : null;
        const autoDelta = this.autonomy.today?.plan_total_cost != null && bestCost != null
            ? this.autonomy.today.plan_total_cost - bestCost
            : null;

        const deltaText = [
            `Std ${this.formatDelta(hybridDelta)}`,
            `Dyn ${this.formatDelta(autoDelta)}`
        ].join(' · ');

        return `
            <div class="cost-meta-block baseline">
                <div class="cost-meta-title">Nejlevnější klasický režim</div>
                <div class="cost-meta-emphasis">${bestName}</div>
                <div class="cost-meta-line">${deltaText}</div>
            </div>
        `;
    }

    renderPlanChips() {
        const tomorrowHybrid = this.hybrid.tomorrow;
        const tomorrowAuto = this.autonomy.tomorrow;
        const yesterday = this.hybrid.yesterday;

        if (!tomorrowHybrid && !tomorrowAuto && !yesterday) {
            return '';
        }

        const chips = [];

        if (yesterday) {
            const delta = yesterday.delta != null ? yesterday.delta : yesterday.delta_cost;
            const status = delta == null ? 'neutral' : delta > 0 ? 'negative' : delta < 0 ? 'positive' : 'neutral';
            const deltaLabel = delta == null ? 'vs plán' : `${delta > 0 ? '+' : ''}${Math.round(delta)} Kč vs plán`;
            chips.push(
                this.renderPlanChip('Včera', `${this.formatCost(yesterday.actual_total_cost)} (${deltaLabel})`, status)
            );
        }

        if (tomorrowHybrid || tomorrowAuto) {
            const stdCost = tomorrowHybrid?.plan_total_cost;
            const dynCost = tomorrowAuto?.plan_total_cost;
            chips.push(
                this.renderPlanChip(
                    'Zítra',
                    `Std ${this.formatCost(stdCost)} • Dyn ${this.formatCost(dynCost)}`,
                    'neutral'
                )
            );
        }

        if (!chips.length) {
            return '';
        }

        return `
            <div class="cost-plan-chips">
                ${chips.join('')}
            </div>
        `;
    }

    renderPlanChip(label, value, status = 'neutral') {
        return `
            <div class="cost-plan-chip ${status}">
                <span class="cost-plan-chip-label">${label}</span>
                <span class="cost-plan-chip-value">${value}</span>
            </div>
        `;
    }

    getBestBaselineCost(bc) {
        if (!bc) return null;
        const bestMode = bc.best_baseline;
        if (bc.rankings && Array.isArray(bc.rankings)) {
            const match = bc.rankings.find(item => item.mode === bestMode);
            if (match && typeof match.cost === 'number') {
                return match.cost;
            }
        }
        if (typeof bc.best_cost === 'number') {
            return bc.best_cost;
        }
        if (typeof bc.baseline_cost === 'number') {
            return bc.baseline_cost;
        }
        return null;
    }

    formatCost(value) {
        if (value === undefined || value === null) return '--';
        return `${Math.round(value)} Kč`;
    }

    formatDelta(delta) {
        if (delta === undefined || delta === null) return '--';
        return `${delta > 0 ? '+' : ''}${Math.round(delta)} Kč`;
    }

    attachEvents() {
        const hybridCard = this.container.querySelector('.cost-main-card[data-plan="hybrid"]');
        const autoCard = this.container.querySelector('.cost-main-card[data-plan="autonomy"]');

        if (hybridCard && typeof this.onOpenHybrid === 'function') {
            hybridCard.addEventListener('click', (event) => {
                event.stopPropagation();
                this.onOpenHybrid();
            });
        }
        if (autoCard && typeof this.onOpenAutonomy === 'function') {
            autoCard.addEventListener('click', (event) => {
                event.stopPropagation();
                this.onOpenAutonomy();
            });
        }

        if (!this.boundContainerClick && typeof this.onOpenHybrid === 'function') {
            this.boundContainerClick = (event) => {
                if (event.target.closest('.cost-main-card')) {
                    return;
                }
                this.onOpenHybrid();
            };
            this.container.addEventListener('click', this.boundContainerClick);
        }
    }
}

window.CostComparisonTile = CostComparisonTile;
