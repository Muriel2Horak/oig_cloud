/**
 * Autonomy Cost Tile - parallel preview of autonomous planner.
 */
class AutonomyCostTile {
    constructor(container, data, onClick) {
        this.container = container;
        this.data = data;
        this.onClick = onClick;
        this.render();
    }

    update(data) {
        this.data = data;
        this.render();
    }

    render() {
        if (!this.data) {
            this.container.innerHTML = this.renderSkeleton('Čekám na data…');
            return;
        }

        const { today, yesterday, tomorrow } = this.data;
        this.container.innerHTML = `
            <div class="unified-cost-tile-compact autonomy-mode" data-clickable="true">
                ${this.renderHeader(today)}
                ${this.renderDeltaRow(today)}
                <div class="autonomy-day-row">
                    ${this.renderDayCard('DNES', today)}
                    ${this.renderDayCard('ZÍTRA', tomorrow)}
                    ${this.renderDayCard('VČERA', yesterday)}
                </div>
                <div class="autonomy-footnote-row">
                    <span>Simulace – neřídí HW</span>
                    <span>${today?.date || '--'}</span>
                </div>
            </div>
        `;
        this.attachEvents();
    }

    renderSkeleton(message) {
        return `
            <div class="unified-cost-tile-compact autonomy-mode">
                <div class="cost-card-placeholder">
                    <span class="cost-card-title">🤖 Autonomní plán</span>
                    <span class="cost-card-loading">${message}</span>
                </div>
            </div>
        `;
    }

    renderHeader(today) {
        return `
            <div class="uct-header-compact">
                <span class="uct-label-inline">🤖 Autonomní plán</span>
                <span class="uct-cost-inline">${this.formatCost(today?.plan_total_cost)}</span>
                <span class="uct-status">${today?.date || '--'}</span>
            </div>
        `;
    }

    renderDeltaRow(today) {
        if (!today || today.delta_vs_hybrid === undefined) {
            return `
                <div class="autonomy-delta-row">
                    <span>Δ vůči hybridu:</span>
                    <span class="autonomy-delta-pill neutral">--</span>
                </div>
            `;
        }
        const delta = this.formatDelta(today.delta_vs_hybrid);
        return `
            <div class="autonomy-delta-row">
                <span>Δ vůči hybridu:</span>
                <span class="autonomy-delta-pill ${delta.className}">${delta.text}</span>
            </div>
        `;
    }

    renderDayCard(label, entry) {
        if (!entry || entry.plan_total_cost === null || entry.plan_total_cost === undefined) {
            return `
                <div class="autonomy-day-card">
                    <div class="autonomy-day-label">${label}</div>
                    <div class="autonomy-day-value">--</div>
                    <div class="autonomy-day-delta muted">Žádná data</div>
                </div>
            `;
        }

        const delta = this.formatDelta(entry.delta_vs_hybrid);
        return `
            <div class="autonomy-day-card">
                <div class="autonomy-day-label">${label}</div>
                <div class="autonomy-day-value">${this.formatCost(entry.plan_total_cost)}</div>
                <div class="autonomy-day-delta ${delta.className}">${delta.text}</div>
            </div>
        `;
    }

    formatCost(value) {
        if (value === undefined || value === null) {
            return '--';
        }
        return `${Math.round(value)} Kč`;
    }

    formatDelta(value) {
        if (value === undefined || value === null) {
            return { text: '--', className: 'muted' };
        }
        const rounded = Math.round(value);
        if (rounded > 0) {
            return { text: `+${rounded} Kč`, className: 'negative' };
        }
        if (rounded < 0) {
            return { text: `${rounded} Kč`, className: 'positive' };
        }
        return { text: '0 Kč', className: 'neutral' };
    }

    attachEvents() {
        const root = this.container.querySelector('.autonomy-mode');
        if (root && typeof this.onClick === 'function') {
            root.addEventListener('click', () => this.onClick());
        }
    }
}

window.AutonomyCostTile = AutonomyCostTile;
