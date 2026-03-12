# Economic Battery Planner

## Overview

The Economic Battery Planner is an advanced optimization algorithm for ČEZ Battery Box that minimizes electricity costs while ensuring battery safety.

## How It Works

### Three-Strategy Decision Making

For each critical moment (when battery SOC drops below planning minimum), the planner evaluates three strategies:

1. **USE_BATTERY**: Continue using battery without charging
   - Cost: Grid import during deficit periods
   - Best when: Prices are low or solar will cover deficit soon

2. **CHARGE_CHEAPEST**: Charge from grid during cheapest intervals
   - Cost: Grid import for charging + round-trip efficiency losses (12%)
   - Best when: Current prices are lower than future prices

3. **WAIT_FOR_SOLAR**: Wait for solar production to cover consumption
   - Cost: Grid import until solar starts
   - Best when: Solar will start soon and prices are high now

### Decision Process

```
Baseline Simulation (HOME_I only)
    ↓
Find Critical Moments (SOC < planning_min)
    ↓
For Each Critical Moment:
    Calculate cost for all 3 strategies
    Select cheapest viable strategy
    ↓
Generate Plan with selected modes
    ↓
Validate Safety (SOC never below HW min)
```

## Configuration

### Parameters

- **planning_min_percent**: Minimum SOC for planning (default: 33%, must be >= HW min)
- **charge_rate_kw**: AC charging rate from grid (default: 2.8 kW)

### Dynamic Inputs (from sensors)

- **current_soc_kwh**: Current battery state of charge
- **max_capacity_kwh**: Battery capacity (e.g., 10.24 kWh)
- **hw_min_kwh**: Hardware minimum SOC (20% = 2.048 kWh)
- **solar_forecast**: Expected solar production per 15-min interval
- **load_forecast**: Expected consumption per 15-min interval
- **prices**: Spot electricity prices per interval

## Modes

- **HOME_I (0)**: Normal mode - solar first, then battery, then grid
- **HOME_III (2)**: Solar priority - maximize solar usage
- **HOME_UPS (3)**: Charging mode - charge battery from grid

## Safety Guarantees

- SOC never drops below hardware minimum (20%)
- Planning minimum must be >= hardware minimum
- Emergency fallback if all strategies fail

## Testing

Run tests:
```bash
pytest tests/test_economic_planner.py -v
pytest tests/test_historical_scenarios.py -v
```

Compare with old planner:
```bash
PYTHONPATH="." python3 tests/compare_planners.py
```

## Files

- `economic_planner.py`: Core algorithm
- `economic_planner_types.py`: Type definitions
- `economic_planner_integration.py`: Home Assistant integration
- `tests/test_economic_planner.py`: Unit tests
- `tests/test_historical_scenarios.py`: Scenario tests
- `tests/data/historical_scenarios.json`: 30 test scenarios
