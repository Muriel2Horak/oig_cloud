#!/bin/bash

echo "=== CHECKING REMOVED FUNCTIONS ==="
echo ""

# Funkce smazané v cleanup4 (analytics/pricing)
echo "1. updateBatteryEfficiencyBar:"
grep -q "updateBatteryEfficiencyBar" dashboard-analytics.js && echo "  ✓ Found in analytics" || echo "  ✗ MISSING!"

echo "2. updatePlannedConsumptionStats:"
grep -q "function updatePlannedConsumptionStats" dashboard-pricing.js && echo "  ✓ Found in pricing" || echo "  ✗ MISSING!"

echo "3. updateWhatIfAnalysis:"
grep -q "function updateWhatIfAnalysis" dashboard-pricing.js && echo "  ✓ Found in pricing" || echo "  ✗ MISSING!"

echo "4. updateModeRecommendations:"
grep -q "function updateModeRecommendations" dashboard-pricing.js && echo "  ✓ Found in pricing" || echo "  ✗ MISSING!"

# Funkce smazané v cleanup2 a cleanup3 (tiles)
echo ""
echo "5. initCustomTiles:"
grep -q "initCustomTiles" dashboard-tiles.js && echo "  ✓ Found in tiles" || echo "  ✗ MISSING!"

echo "6. renderAllTiles:"
grep -q "renderAllTiles" dashboard-tiles.js && echo "  ✓ Found in tiles" || echo "  ✗ MISSING!"

echo "7. renderEntityTile:"
grep -q "renderEntityTile" dashboard-tiles.js && echo "  ✓ Found in tiles" || echo "  ✗ MISSING!"

echo "8. renderButtonTile:"
grep -q "renderButtonTile" dashboard-tiles.js && echo "  ✓ Found in tiles" || echo "  ✗ MISSING!"

# Layout funkce smazané v cleanup1
echo ""
echo "9. getCurrentBreakpoint:"
grep -q "getCurrentBreakpoint" dashboard-layout.js && echo "  ✓ Found in layout" || echo "  ✗ MISSING!"

echo "10. toggleEditMode:"
grep -q "toggleEditMode" dashboard-layout.js && echo "  ✓ Found in layout" || echo "  ✗ MISSING!"

