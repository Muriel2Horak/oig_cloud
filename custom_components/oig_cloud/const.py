"""Constants for the OIG Cloud integration."""

DOMAIN = "oig_cloud"

# Configuration constants
CONF_ENABLE_STATISTICS = "enable_statistics"
CONF_ENABLE_PRICING = "enable_pricing"  # Sjednoceno: pricing + spotové ceny
CONF_ENABLE_CHMU_WARNINGS = "enable_chmu_warnings"  # ČHMÚ meteorologická varování
CONF_SPOT_PRICES_UPDATE_INTERVAL = "spot_prices_update_interval"
OTE_SPOT_PRICE_CACHE_FILE = "oig_ote_spot_prices.json"
CONF_UPDATE_INTERVAL = "update_interval"
CONF_USERNAME = "username"
CONF_PASSWORD = "password"
CONF_NO_TELEMETRY = "no_telemetry"  # Legacy only; ignored at runtime.
CONF_TELEMETRY_MQTT_ENABLED = "telemetry_mqtt_enabled"  # Legacy only.
CONF_TELEMETRY_MQTT_HOST = "telemetry_mqtt_host"  # Legacy only.
CONF_TELEMETRY_MQTT_PORT = "telemetry_mqtt_port"  # Legacy only.
CONF_TELEMETRY_MQTT_PREFIX = "telemetry_mqtt_prefix"  # Legacy only.
CONF_STANDARD_SCAN_INTERVAL = "standard_scan_interval"
CONF_EXTENDED_SCAN_INTERVAL = "extended_scan_interval"
CONF_LOG_LEVEL = "log_level"
CONF_TIMEOUT = "timeout"

# Boiler Module constants
CONF_ENABLE_BOILER = "enable_boiler"
CONF_BOILER_VOLUME_L = "boiler_volume_l"
CONF_BOILER_TARGET_TEMP_C = "boiler_target_temp_c"
CONF_BOILER_COLD_INLET_TEMP_C = "boiler_cold_inlet_temp_c"
CONF_BOILER_TEMP_SENSOR_TOP = "boiler_temp_sensor_top"
CONF_BOILER_TEMP_SENSOR_BOTTOM = "boiler_temp_sensor_bottom"
CONF_BOILER_TEMP_SENSOR_POSITION = (
    "boiler_temp_sensor_position"  # NEW: Pozice při 1 teploměru
)
CONF_BOILER_STRATIFICATION_MODE = "boiler_stratification_mode"
CONF_BOILER_TWO_ZONE_SPLIT_RATIO = "boiler_two_zone_split_ratio"
CONF_BOILER_HEATER_POWER_KW_ENTITY = "boiler_heater_power_kw_entity"
CONF_BOILER_HEATER_SWITCH_ENTITY = "boiler_heater_switch_entity"
CONF_BOILER_ALT_HEATER_SWITCH_ENTITY = "boiler_alt_heater_switch_entity"
CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY = "boiler_circulation_pump_switch_entity"
CONF_BOILER_HAS_ALTERNATIVE_HEATING = "boiler_has_alternative_heating"
CONF_BOILER_ALT_COST_KWH = "boiler_alt_cost_kwh"
CONF_BOILER_ALT_ENERGY_SENSOR = "boiler_alt_energy_sensor"  # NEW: Měřič alternativy
# Task B: direct CBB→boiler power entity (auto-resolves to sensor.oig_{box_id}_boiler_current_cbb_w)
CONF_BOILER_CURRENT_POWER_ENTITY = "boiler_current_power_entity"
# Task B: daily-reset semantics for the alt energy meter (True = counter resets at midnight)
CONF_BOILER_ALT_ENERGY_DAILY = "boiler_alt_energy_daily"
CONF_BOILER_SPOT_PRICE_SENSOR = "boiler_spot_price_sensor"
CONF_BOILER_DEADLINE_TIME = "boiler_deadline_time"
# TODO: phase D2 — sim-backend wave
CONF_BOILER_PLANNING_HORIZON_HOURS = "boiler_planning_horizon_hours"
CONF_BOILER_PLAN_SLOT_MINUTES = "boiler_plan_slot_minutes"

CONF_BOILER_SETUP_MODE = "boiler_setup_mode"
CONF_BOILER_BOX_ID = "boiler_box_id"
CONF_BOILER_EFFECTIVE_POWER_W = "boiler_effective_power_w"
# TODO: phase D2 — sim-backend wave
CONF_BOILER_RECOVERY_RATE_C_PER_HOUR = "boiler_recovery_rate_c_per_hour"
CONF_BOILER_ENABLE_SECOND_THERMOMETER = "boiler_enable_second_thermometer"
# TODO: phase D2 — sim-backend wave
CONF_BOILER_ALT_SOURCE_MODE = "boiler_alt_source_mode"
# TODO: phase D2 — sim-backend wave
CONF_BOILER_COMFORT_PROFILE_MODE = "boiler_comfort_profile_mode"
CONF_BOILER_SETUP_COMPLETE = "boiler_setup_complete"
CONF_BOILER_MODULE_SELECTED = "boiler_module_selected"
# R9: Anti-legionella obligation (default ON with 7-day interval, 60 °C target)
CONF_BOILER_LEGIONELLA_INTERVAL_DAYS = "boiler_legionella_interval_days"  # 0 = disabled
CONF_BOILER_LEGIONELLA_TARGET_TEMP_C = "boiler_legionella_target_temp_c"
# R5: Circulation pre-peak independent scheduling (default OFF)
CONF_BOILER_CIRCULATION_ENABLED = "boiler_circulation_enabled"  # False = disabled
CONF_BOILER_CIRCULATION_LEAD_MINUTES = "boiler_circulation_lead_minutes"
CONF_BOILER_CIRCULATION_RUN_MINUTES = "boiler_circulation_run_minutes"
CONF_BOILER_CIRCULATION_MAX_RUNS_PER_DAY = "boiler_circulation_max_runs_per_day"
CONF_BOILER_CIRCULATION_MIN_GAP_MINUTES = "boiler_circulation_min_gap_minutes"
# R3/R7: Home 5 maneuver (battery-discharge boiler heating)
# Box-level capability flag — also gates control-panel buttons (F5).
CONF_BOX_HAS_HOME56 = "box_has_home56"  # default False
# Boiler-planner opt-in — requires CONF_BOX_HAS_HOME56 AND this flag.
CONF_BOILER_HOME5_MANEUVER_ENABLED = "boiler_home5_maneuver_enabled"  # default False

# Auto Module constants
CONF_AUTO_MODE_SWITCH = "auto_mode_switch_enabled"
# Backward-compatible option key used by older config flows/tests.
CONF_AUTO_MODE_PLAN = "auto_mode_plan"

# Battery Planning constants (BR-0.2)
CONF_THRESHOLD_CHEAP_CZK = "threshold_cheap_czk"  # Threshold for "cheap" electricity
CONF_PLANNING_MIN_PERCENT = "planning_min_percent"  # Legacy migration compatibility
CONF_CHARGE_RATE_KW = "charge_rate_kw"

# Default values
DEFAULT_UPDATE_INTERVAL = 20
DEFAULT_NAME = "ČEZ Battery Box"
DEFAULT_STANDARD_SCAN_INTERVAL = 30
DEFAULT_EXTENDED_SCAN_INTERVAL = 300
DEFAULT_THRESHOLD_CHEAP_CZK = 1.5  # Default 1.5 CZK/kWh
DEFAULT_HW_MIN_PERCENT = 20.0
DEFAULT_PLANNING_MIN_PERCENT = 33.0
DEFAULT_CHARGE_RATE_KW = 2.8

# Boiler defaults
DEFAULT_BOILER_TARGET_TEMP_C = 60.0
DEFAULT_BOILER_COLD_INLET_TEMP_C = 10.0
DEFAULT_BOILER_TEMP_SENSOR_POSITION = (
    "top"  # top | upper_quarter | middle | lower_quarter
)
DEFAULT_BOILER_STRATIFICATION_MODE = "two_zone"  # Changed from simple_avg
DEFAULT_BOILER_TWO_ZONE_SPLIT_RATIO = 0.5
DEFAULT_BOILER_DEADLINE_TIME = "20:00"
DEFAULT_BOILER_PLANNING_HORIZON_HOURS = 36
DEFAULT_BOILER_PLAN_SLOT_MINUTES = 15  # Changed from 30 to 15min intervals
DEFAULT_BOILER_LEGIONELLA_INTERVAL_DAYS = 0   # 0 = disabled (opt-in via config flow)
DEFAULT_BOILER_LEGIONELLA_TARGET_TEMP_C = 60.0
# R5: Circulation scheduling defaults
DEFAULT_BOILER_CIRCULATION_ENABLED = False
DEFAULT_BOILER_CIRCULATION_LEAD_MINUTES = 15
DEFAULT_BOILER_CIRCULATION_RUN_MINUTES = 10
DEFAULT_BOILER_CIRCULATION_MAX_RUNS_PER_DAY = 3
DEFAULT_BOILER_CIRCULATION_MIN_GAP_MINUTES = 120
# R3/R7: Home 5 maneuver defaults
DEFAULT_BOX_HAS_HOME56 = False
DEFAULT_BOILER_HOME5_MANEUVER_ENABLED = False
# R1/R8: Alt source type (drives labels/hints only, NOT COP math — cost entered directly)
CONF_BOILER_ALT_SOURCE_TYPE = "boiler_alt_source_type"  # gas|heat_pump|fireplace|other
DEFAULT_BOILER_ALT_SOURCE_TYPE = "gas"
# F5: Configurable battery cycle cost for Home 5 arbitrage (replaces hardcoded const)
CONF_BOILER_BATTERY_CYCLE_COST = "boiler_battery_cycle_cost_czk_kwh"
DEFAULT_BOILER_BATTERY_CYCLE_COST = 0.50
# Task B: current power entity resolves automatically; alt energy meter defaults to daily-reset
DEFAULT_BOILER_CURRENT_POWER_ENTITY = ""  # empty = auto-resolve from box_id
DEFAULT_BOILER_ALT_ENERGY_DAILY = True  # daily-reset counter (resets at midnight)
# Phase B: thermal arbitrage — over-heat on cheap grid (spot < alt cost) and hold
# to displace pricier alternative heating, while reserving headroom for FVE overflow.
CONF_BOILER_THERMAL_ARBITRAGE_ENABLED = "boiler_thermal_arbitrage_enabled"  # opt-in
DEFAULT_BOILER_THERMAL_ARBITRAGE_ENABLED = False
CONF_BOILER_MAX_TEMP_C = "boiler_max_temp_c"  # arbitrage over-heat ceiling
DEFAULT_BOILER_MAX_TEMP_C = 65.0
CONF_BOILER_ALT_POWER_KW = "boiler_alt_power_kw"  # alt thermal power into tank (lead-time)
DEFAULT_BOILER_ALT_POWER_KW = 0.0  # 0 = unknown → alt not actively pre-scheduled

# Boiler wired to the box's backup output (the battery can feed it). The
# reference install has it on the non-backup circuit (the heating estimator
# reads its power from acinb), so by default its heat is a grid-side load.
CONF_BOILER_ON_BACKUP_CIRCUIT = "boiler_on_backup_circuit"
DEFAULT_BOILER_ON_BACKUP_CIRCUIT = False

# Electric car (ev/): charging planned like the home battery's UPS slots.
CONF_ENABLE_EV = "enable_ev"
CONF_EV_SOC_ENTITY = "ev_soc_entity"
CONF_EV_PLUGGED_ENTITY = "ev_plugged_entity"  # optional; unset = always plugged
CONF_EV_CHARGE_LIMIT_ENTITY = "ev_charge_limit_entity"  # optional number/sensor (%)
CONF_EV_CHARGE_LIMIT_PCT = "ev_charge_limit_pct"
DEFAULT_EV_CHARGE_LIMIT_PCT = 100.0
CONF_EV_CHARGER_POWER_ENTITY = "ev_charger_power_entity"  # optional (kW or W)
CONF_EV_CAPACITY_KWH = "ev_capacity_kwh"  # charger kWh per 100 %; 0 = learn
DEFAULT_EV_CAPACITY_KWH = 0.0
CONF_EV_MAX_POWER_KW = "ev_max_power_kw"
DEFAULT_EV_MAX_POWER_KW = 11.0  # three-phase 16 A wallbox
CONF_EV_MIN_POWER_KW = "ev_min_power_kw"
DEFAULT_EV_MIN_POWER_KW = 4.14  # IEC 61851 minimum 6 A x 3 phases x 230 V
# What the car is charged to before the predicted departure: "limit" = its
# charge limit (backtest 5-11/2026 on the reference PHEV: 22 kWh driven on
# fuel in six months against 215 kWh with the p80 need, since unused charge
# carries over to the next day); "need" = the typical day's use (p80).
CONF_EV_TARGET_MODE = "ev_target_mode"
DEFAULT_EV_TARGET_MODE = "limit"
CONF_EV_PHASES = "ev_phases"
DEFAULT_EV_PHASES = 3
KEY_EV_RUNTIME = "ev_runtime"
# Calendar: Czech public holidays count as a Sunday; a trip without a time
# leaves at this hour.
CONF_EV_HOLIDAYS = "ev_holidays"
DEFAULT_EV_HOLIDAYS = True
CONF_EV_TRIP_DEPARTURE = "ev_trip_departure"
DEFAULT_EV_TRIP_DEPARTURE = "07:00"
# Control: what switches the charging. "none" = the plan only (an automation
# acts on the plan sensor), "wallbox" = the wallbox's pause/resume switch
# (local), "car" = the car's charging switch (vendor cloud).
CONF_EV_CONTROL_MODE = "ev_control_mode"
DEFAULT_EV_CONTROL_MODE = "none"
EV_CONTROL_MODES = ("none", "wallbox", "car")
CONF_EV_SWITCH_ENTITY = "ev_switch_entity"  # switch or input_boolean
# Some chargers expose "pause" (on = paused) instead of "charge" (on = charging).
CONF_EV_SWITCH_INVERTED = "ev_switch_inverted"
DEFAULT_EV_SWITCH_INVERTED = False
CONF_EV_CURRENT_ENTITY = "ev_current_entity"  # optional number (A)
CONF_EV_CURRENT_CONTROL = "ev_current_control"
DEFAULT_EV_CURRENT_CONTROL = False
CONF_EV_RAISE_LIMIT_FOR_TRIP = "ev_raise_limit_for_trip"
DEFAULT_EV_RAISE_LIMIT_FOR_TRIP = False
# Heating the car before departure.
CONF_EV_CLIMATE_ENTITY = "ev_climate_entity"
CONF_EV_CLIMATE_WHEN = "ev_climate_when"  # off|cold|always|calendar
DEFAULT_EV_CLIMATE_WHEN = "off"
CONF_EV_CLIMATE_TEMP_C = "ev_climate_temp_c"
DEFAULT_EV_CLIMATE_TEMP_C = 22.0
CONF_EV_CLIMATE_MINUTES = "ev_climate_minutes"
DEFAULT_EV_CLIMATE_MINUTES = 20
CONF_EV_CLIMATE_COLD_C = "ev_climate_cold_c"
DEFAULT_EV_CLIMATE_COLD_C = 5.0
CONF_EV_OUTSIDE_TEMP_ENTITY = "ev_outside_temp_entity"  # sensor or weather
CONF_EV_CLIMATE_PLUGGED_ONLY = "ev_climate_plugged_only"
DEFAULT_EV_CLIMATE_PLUGGED_ONLY = True
CONF_EV_WINDOW_HEATING_ENTITY = "ev_window_heating_entity"  # optional switch
SIGNAL_EV_PLAN_UPDATED = "oig_cloud_ev_plan_updated_{entry_id}"

# Main breaker shared by the car, the boiler and the battery's grid charging.
CONF_GRID_BREAKER_A = "grid_breaker_a"
DEFAULT_GRID_BREAKER_A = 25.0  # the most common Czech main breaker (3 x 25 A)
CONF_GRID_RESERVE_A = "grid_reserve_a"
DEFAULT_GRID_RESERVE_A = 2.0  # 15-min averages hide short peaks of the house
CONF_GRID_PHASES = "grid_phases"
DEFAULT_GRID_PHASES = 3
# Who gets the breaker first (planning.flex_loads); comma-separated.
CONF_FLEX_PRIORITY = "flex_priority"
DEFAULT_FLEX_PRIORITY = "ev,boiler,battery"
# PV surplus goes to the battery before the non-backup circuit, as the box
# does in Home 1/2/UPS. Off = the priority above also orders the surplus.
CONF_FLEX_PV_BATTERY_FIRST = "flex_pv_battery_first"
DEFAULT_FLEX_PV_BATTERY_FIRST = True

# Live backup load in the near-term forecast and a replan when it jumps
# (battery_forecast/planning/live_load.py). Off by default: replayed on the
# reference box's real data 7.-15. 11. 2026 it changed the money by +0.9 CZK
# (worse) over nine days, so it stays opt-in until it shows a gain.
CONF_LIVE_LOAD_REPLAN = "live_load_replan"
DEFAULT_LIVE_LOAD_REPLAN = False

# Spot price forecast beyond the published day-ahead prices
# (battery_forecast/data/price_forecast.py). Shadow scores it without using it.
CONF_PRICE_FORECAST_ENTITY = "price_forecast_entity"
CONF_PRICE_FORECAST_MODE = "price_forecast_mode"
DEFAULT_PRICE_FORECAST_MODE = "off"
PRICE_FORECAST_MODES = ("off", "shadow", "on")

KEY_BOILER_RUNTIMES = "boiler_runtimes"
ATTR_CONFIG_ENTRY_ID = "entry_id"
STORAGE_KEY_BOILER_SCHEDULE = "boiler_schedule"
UNKNOWN_BOX_ID = "unknown"
DEFAULT_BOILER_HEATER_POWER_ENTITY_ID_PATTERN = "sensor.oig_{box_id}_boiler_install_power"

# Energetic constant for water heating (kWh per liter per °C)
BOILER_ENERGY_CONSTANT_KWH_L_C = 0.001163  # ≈ 4.186 kJ/kg/°C / 3600

# Performance settings - VYPNUTÍ STATISTICKÝCH SENSORŮ
DISABLE_STATISTICS_SENSORS = True  # Vypnout statistické senzory kvůli výkonu

# Platforms
PLATFORMS = ["sensor", "switch"]

# Device info
MANUFACTURER = "OIG"
MODEL = "Battery Box"

# Error messages
ERROR_AUTH_FAILED = "Authentication failed"
ERROR_CANNOT_CONNECT = "Cannot connect"
ERROR_UNKNOWN = "Unknown error"

# Service names
SERVICE_FORCE_UPDATE = "force_update"
SERVICE_RESET_STATISTICS = "reset_statistics"
SERVICE_PLAN_BOILER_HEATING = "plan_boiler_heating"
SERVICE_APPLY_BOILER_PLAN = "apply_boiler_plan"
SERVICE_CANCEL_BOILER_PLAN = "cancel_boiler_plan"

# Cloud telemetry constants
TELEMETRY_MQTT_HOST = "telemetry.muriel-cz.cz"
TELEMETRY_MQTT_PORT = 1883
TELEMETRY_MQTT_PREFIX = "oig/cloud-telemetry"
# Anonymous energy slots (shared/energy_telemetry.py): consent only, TLS only.
TELEMETRY_ENERGY_PORT = 8883
TELEMETRY_ENERGY_PREFIX = "oig/energy"
CONF_SHARE_ENERGY_DATA = "share_energy_data"
DEFAULT_SHARE_ENERGY_DATA = False

# CBB Modes (Battery Box Control Modes) per BR-1
HOME_I = 0  # Grid priority (normal operation)
HOME_II = 1  # Battery savings (grid import, no battery discharge)
HOME_III = 2  # Solar priority (FVE to battery first)
HOME_UPS = 3  # UPS mode (grid charging enabled)

CBB_MODE_NAMES = {
    HOME_I: "HOME I",
    HOME_II: "HOME II",
    HOME_III: "HOME III",
    HOME_UPS: "UPS",
}
