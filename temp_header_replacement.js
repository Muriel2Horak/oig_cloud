    renderLiveHeader(progress, eodPrediction, unifiedCostData) {
        const now = new Date();
        const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        // Get data from unified_cost_tile (v2.1)
        const today = unifiedCostData || {};
        const eod = today.eod_prediction || {};
        const completed = today.completed_so_far || {};
        const metadata = today.metadata || {};

        // Fallback to legacy progress data
        const progressPercent = today.progress_pct || progress.percent || 0;
        const eodPredicted = eod.predicted_total || eodPrediction.predicted || 0;
        const eodPlanned = eod.planned_total || today.plan_total_cost || eodPrediction.planned || 0;
        const eodSavingsPredicted = eod.predicted_savings || 0;

        const completedCost = completed.actual_cost || progress.actualCost || 0;
        const completedPlanned = completed.planned_cost || progress.plannedCost || 0;

        // Calculate deltas
        const eodDelta = eodPredicted - eodPlanned;
        const eodDeltaPct = eodPlanned > 0 ? ((eodDelta / eodPlanned) * 100) : 0;
        const eodDeltaClass = eodDelta < -0.5 ? 'positive' : eodDelta > 0.5 ? 'negative' : 'neutral';
        const eodDeltaIcon = eodDelta < -0.5 ? '✅' : eodDelta > 0.5 ? '❌' : '⚪';

        const completedDelta = completedCost - completedPlanned;
        const completedDeltaPct = completed.delta_pct || (completedPlanned > 0 ? ((completedDelta / completedPlanned) * 100) : 0);
        const completedDeltaClass = completedDelta < -0.5 ? 'positive' : completedDelta > 0.5 ? 'negative' : 'neutral';

        return `
            <div class="today-header-simple">
                <div class="header-progress">
                    <div class="progress-bar-large">
                        <div class="progress-fill" style="width: ${progressPercent}%"></div>
                        <div class="progress-label">${progressPercent.toFixed(0)}% dne • ${timeStr}</div>
                    </div>
                </div>

                <div class="header-cards">
                    <div class="card card-primary">
                        <div class="card-icon">💰</div>
                        <div class="card-content">
                            <div class="card-title">Odhad nákladů na konec dne</div>
                            <div class="card-value">${eodPredicted.toFixed(2)} Kč</div>
                            <div class="card-sub">plán: ${eodPlanned.toFixed(2)} Kč • ${eodDeltaIcon} ${eodDeltaPct > 0 ? '+' : ''}${eodDeltaPct.toFixed(1)}%</div>
                        </div>
                    </div>

                    <div class="card card-secondary">
                        <div class="card-icon">📊</div>
                        <div class="card-content">
                            <div class="card-title">Dosud skutečně</div>
                            <div class="card-value ${completedDeltaClass}">${completedCost.toFixed(2)} Kč</div>
                            <div class="card-sub">plán: ${completedPlanned.toFixed(2)} Kč • ${completedDeltaPct > 0 ? '+' : ''}${completedDeltaPct.toFixed(1)}%</div>
                        </div>
                    </div>

                    <div class="card card-accent">
                        <div class="card-icon">💎</div>
                        <div class="card-content">
                            <div class="card-title">Předpokládaná úspora</div>
                            <div class="card-value">${eodSavingsPredicted.toFixed(2)} Kč</div>
                            <div class="card-sub">vs. HOME I režim</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
