class CostComparisonTile {
    constructor(container, payload, options = {}) {
        this.container = container;
        this.data = payload || {};
        this.summary = this.data.comparison || {};
        this.onOpenHybrid = options.onOpenHybrid;
        this.onOpenAutonomy = options.onOpenAutonomy;
        this.boundContainerClick = null;
        this.render();
    }

    update(payload) {
        this.data = payload || {};
        this.summary = this.data.comparison || {};
        this.render();
    }

    render() {
        if (!this.summary || !this.summary.plans) {
            this.container.innerHTML = `
                <div class="cost-card-placeholder">
                    <span class="cost-card-title">💰 Nákladový přehled</span>
                    <span class="cost-card-loading">Čekám na data…</span>
                </div>
            `;
            return;
        }

        const plans = this.summary.plans;
        const activePlanKey = this.summary.active_plan === 'autonomy' ? 'dynamic' : 'standard';
        const secondaryPlanKey = activePlanKey === 'standard' ? 'dynamic' : 'standard';
        const activePlan = plans[activePlanKey] || {};
        const secondaryPlan = plans[secondaryPlanKey] || {};

        this.container.classList.add('cost-card', 'cost-card-square', 'cost-card-compact');
        this.container.innerHTML = `
            ${this.renderHero(activePlan, activePlanKey, secondaryPlan, secondaryPlanKey)}
            ${this.renderHistoryRows(activePlanKey)}
        `;

        this.attachEvents();
    }

    renderHero(activePlan, activePlanKey, secondaryPlan, secondaryPlanKey) {
        const total = this.formatCost(activePlan.total_cost);
        const actual = this.formatCost(activePlan.actual_cost);
        const future = this.formatCost(activePlan.future_plan_cost);
        const activePlanKeyForEvents = activePlan.plan_key || (activePlanKey === 'dynamic' ? 'autonomy' : 'hybrid');
        const secondaryPlanKeyForEvents = secondaryPlan.plan_key || (secondaryPlanKey === 'dynamic' ? 'autonomy' : 'hybrid');
        const activeLabel = this.getPlanLabel(activePlanKeyForEvents);
        const secondaryLabel = this.getPlanLabel(secondaryPlanKeyForEvents);
        const secondaryTotal = this.formatCost(secondaryPlan.total_cost);

        return `
            <div class="cost-hero-lite">
                <div class="cost-hero-main" data-plan="${activePlanKeyForEvents}">
                    <div class="cost-hero-label">Dnes · ${activeLabel}</div>
                    <div class="cost-hero-main-value">${total}</div>
                    <div class="cost-hero-breakdown">
                        <span>Utraceno ${actual}</span>
                        <span>Plán ${future}</span>
                    </div>
                </div>
                <div class="cost-hero-alt" data-plan="${secondaryPlanKeyForEvents}">
                    <div class="cost-hero-alt-label">${secondaryLabel}</div>
                    <div class="cost-hero-alt-value">${secondaryTotal}</div>
                    <div class="cost-hero-alt-note">Alternativní režim</div>
                </div>
            </div>
        `;
    }

    renderHistoryRows(activePlanKey) {
        const yesterdayCost = this.summary.yesterday?.actual_total_cost ?? this.summary.yesterday?.plan_total_cost ?? null;
        const tomorrowKey = activePlanKey === 'dynamic' ? 'dynamic' : 'standard';
        const tomorrowCost = (this.summary.tomorrow || {})[tomorrowKey] ?? null;
        const tomorrowLabel = this.getPlanLabel(tomorrowKey === 'dynamic' ? 'autonomy' : 'hybrid');
        const blocks = [
            this.renderHistoryCard('Včera', this.formatCost(yesterdayCost), 'skutečnost'),
            this.renderHistoryCard('Zítra', this.formatCost(tomorrowCost), tomorrowLabel)
        ];
        return `<div class="cost-history-grid">${blocks.join('')}</div>`;
    }

    renderHistoryCard(label, value, note) {
        return `
            <div class="cost-history-card">
                <span class="cost-history-label">${label}</span>
                <span class="cost-history-value">${value}</span>
                ${note ? `<span class="cost-history-note">${note}</span>` : ''}
            </div>
        `;
    }

    attachEvents() {
        const heroMain = this.container.querySelector('.cost-hero-main[data-plan]');
        const heroSecondary = this.container.querySelector('.cost-hero-alt[data-plan]');

        const handleOpen = (planKey) => {
            if (!planKey) {
                return;
            }
            if (planKey === 'autonomy' && typeof this.onOpenAutonomy === 'function') {
                this.onOpenAutonomy();
            } else if (typeof this.onOpenHybrid === 'function') {
                this.onOpenHybrid();
            }
        };

        if (heroMain) {
            heroMain.addEventListener('click', (event) => {
                event.stopPropagation();
                handleOpen(heroMain.dataset.plan);
            });
        }

        if (heroSecondary) {
            heroSecondary.addEventListener('click', (event) => {
                event.stopPropagation();
                handleOpen(heroSecondary.dataset.plan);
            });
        }

        if (!this.boundContainerClick) {
            this.boundContainerClick = (event) => {
                if (event.target.closest('.cost-hero-alt')) {
                    return;
                }
                const targetPlan = heroMain?.dataset?.plan || 'hybrid';
                handleOpen(targetPlan);
            };
            this.container.addEventListener('click', this.boundContainerClick);
        }
    }

    getPlanLabel(planKey) {
        const fallback = planKey === 'autonomy' ? 'Dynamický' : 'Standardní';
        const labels = window.PLAN_LABELS && window.PLAN_LABELS[planKey];
        if (!labels) {
            return fallback;
        }
        return labels.short || fallback;
    }

    formatCost(value) {
        if (value === undefined || value === null || Number.isNaN(value)) {
            return '--';
        }
        return `${Math.round(value)} Kč`;
    }
}

window.CostComparisonTile = CostComparisonTile;
