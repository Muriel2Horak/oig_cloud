function updateBatteryEfficiencyBar(...args) {
    return window.DashboardAnalytics?.updateBatteryEfficiencyBar?.(...args);
}

async function updatePlannedConsumptionStats() {
    return window.DashboardPricing?.updatePlannedConsumptionStats?.();
}

async function updateWhatIfAnalysis() {
    return window.DashboardPricing?.updateWhatIfAnalysis?.();
}

async function updateModeRecommendations() {
    return window.DashboardPricing?.updateModeRecommendations?.();
}

window.updateBatteryEfficiencyBar = updateBatteryEfficiencyBar;
window.updatePlannedConsumptionStats = updatePlannedConsumptionStats;
window.updateWhatIfAnalysis = updateWhatIfAnalysis;
window.updateModeRecommendations = updateModeRecommendations;
