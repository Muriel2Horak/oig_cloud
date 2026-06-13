"""Sensor type definitions for per-phase grid cost/earnings computed sensors.

These sensors accumulate CZK cost (import) and CZK earnings (export) per phase
each coordinator cycle using live spot prices. Totals are the arithmetical sum
of the three per-phase accumulators so CZ per-phase billing is respected.

Registration is GATED on:
  - enable_pricing = True
  - enable_battery_prediction = True

Device: Analytics & Predictions (device_mapping = "analytics").
"""

from typing import Any, Dict

from homeassistant.components.sensor import SensorDeviceClass, SensorStateClass

# CZK unit string used consistently across all grid-cost sensors.
_UNIT_CZK = "Kč"

SENSOR_TYPES_GRID_COST: Dict[str, Dict[str, Any]] = {
    # ── Per-phase import cost TODAY (6 sensors exposed) ──────────────────────
    "computed_grid_import_cost_l1_today": {
        "name": "Grid Import Cost L1 Today",
        "name_cs": "Náklady odběru fáze L1 dnes",
        "device_class": SensorDeviceClass.MONETARY,
        "unit_of_measurement": _UNIT_CZK,
        "node_id": None,
        "node_key": None,
        "state_class": SensorStateClass.TOTAL,
        "sensor_type_category": "grid_cost_computed",
        "device_mapping": "analytics",
    },
    "computed_grid_import_cost_l2_today": {
        "name": "Grid Import Cost L2 Today",
        "name_cs": "Náklady odběru fáze L2 dnes",
        "device_class": SensorDeviceClass.MONETARY,
        "unit_of_measurement": _UNIT_CZK,
        "node_id": None,
        "node_key": None,
        "state_class": SensorStateClass.TOTAL,
        "sensor_type_category": "grid_cost_computed",
        "device_mapping": "analytics",
    },
    "computed_grid_import_cost_l3_today": {
        "name": "Grid Import Cost L3 Today",
        "name_cs": "Náklady odběru fáze L3 dnes",
        "device_class": SensorDeviceClass.MONETARY,
        "unit_of_measurement": _UNIT_CZK,
        "node_id": None,
        "node_key": None,
        "state_class": SensorStateClass.TOTAL,
        "sensor_type_category": "grid_cost_computed",
        "device_mapping": "analytics",
    },
    # ── Per-phase export earnings TODAY ──────────────────────────────────────
    "computed_grid_export_earnings_l1_today": {
        "name": "Grid Export Earnings L1 Today",
        "name_cs": "Výdělek dodávky fáze L1 dnes",
        "device_class": SensorDeviceClass.MONETARY,
        "unit_of_measurement": _UNIT_CZK,
        "node_id": None,
        "node_key": None,
        "state_class": SensorStateClass.TOTAL,
        "sensor_type_category": "grid_cost_computed",
        "device_mapping": "analytics",
    },
    "computed_grid_export_earnings_l2_today": {
        "name": "Grid Export Earnings L2 Today",
        "name_cs": "Výdělek dodávky fáze L2 dnes",
        "device_class": SensorDeviceClass.MONETARY,
        "unit_of_measurement": _UNIT_CZK,
        "node_id": None,
        "node_key": None,
        "state_class": SensorStateClass.TOTAL,
        "sensor_type_category": "grid_cost_computed",
        "device_mapping": "analytics",
    },
    "computed_grid_export_earnings_l3_today": {
        "name": "Grid Export Earnings L3 Today",
        "name_cs": "Výdělek dodávky fáze L3 dnes",
        "device_class": SensorDeviceClass.MONETARY,
        "unit_of_measurement": _UNIT_CZK,
        "node_id": None,
        "node_key": None,
        "state_class": SensorStateClass.TOTAL,
        "sensor_type_category": "grid_cost_computed",
        "device_mapping": "analytics",
    },
    # ── Total import cost: today / month / year (sum of L1+L2+L3) ───────────
    "computed_grid_import_cost_today": {
        "name": "Grid Import Cost Today",
        "name_cs": "Celkové náklady odběru dnes",
        "device_class": SensorDeviceClass.MONETARY,
        "unit_of_measurement": _UNIT_CZK,
        "node_id": None,
        "node_key": None,
        "state_class": SensorStateClass.TOTAL,
        "sensor_type_category": "grid_cost_computed",
        "device_mapping": "analytics",
    },
    "computed_grid_import_cost_month": {
        "name": "Grid Import Cost This Month",
        "name_cs": "Celkové náklady odběru tento měsíc",
        "device_class": SensorDeviceClass.MONETARY,
        "unit_of_measurement": _UNIT_CZK,
        "node_id": None,
        "node_key": None,
        "state_class": SensorStateClass.TOTAL,
        "sensor_type_category": "grid_cost_computed",
        "device_mapping": "analytics",
    },
    "computed_grid_import_cost_year": {
        "name": "Grid Import Cost This Year",
        "name_cs": "Celkové náklady odběru tento rok",
        "device_class": SensorDeviceClass.MONETARY,
        "unit_of_measurement": _UNIT_CZK,
        "node_id": None,
        "node_key": None,
        "state_class": SensorStateClass.TOTAL,
        "sensor_type_category": "grid_cost_computed",
        "device_mapping": "analytics",
    },
    # ── Total export earnings: today / month / year (sum of L1+L2+L3) ───────
    "computed_grid_export_earnings_today": {
        "name": "Grid Export Earnings Today",
        "name_cs": "Celkový výdělek dodávky dnes",
        "device_class": SensorDeviceClass.MONETARY,
        "unit_of_measurement": _UNIT_CZK,
        "node_id": None,
        "node_key": None,
        "state_class": SensorStateClass.TOTAL,
        "sensor_type_category": "grid_cost_computed",
        "device_mapping": "analytics",
    },
    "computed_grid_export_earnings_month": {
        "name": "Grid Export Earnings This Month",
        "name_cs": "Celkový výdělek dodávky tento měsíc",
        "device_class": SensorDeviceClass.MONETARY,
        "unit_of_measurement": _UNIT_CZK,
        "node_id": None,
        "node_key": None,
        "state_class": SensorStateClass.TOTAL,
        "sensor_type_category": "grid_cost_computed",
        "device_mapping": "analytics",
    },
    "computed_grid_export_earnings_year": {
        "name": "Grid Export Earnings This Year",
        "name_cs": "Celkový výdělek dodávky tento rok",
        "device_class": SensorDeviceClass.MONETARY,
        "unit_of_measurement": _UNIT_CZK,
        "node_id": None,
        "node_key": None,
        "state_class": SensorStateClass.TOTAL,
        "sensor_type_category": "grid_cost_computed",
        "device_mapping": "analytics",
    },
}

__all__ = ["SENSOR_TYPES_GRID_COST"]
