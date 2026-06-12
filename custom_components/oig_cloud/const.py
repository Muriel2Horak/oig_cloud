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
CONF_BOILER_PLANNING_HORIZON_HOURS = "boiler_planning_horizon_hours"
CONF_BOILER_PLAN_SLOT_MINUTES = "boiler_plan_slot_minutes"

CONF_BOILER_SETUP_MODE = "boiler_setup_mode"
CONF_BOILER_BOX_ID = "boiler_box_id"
CONF_BOILER_EFFECTIVE_POWER_W = "boiler_effective_power_w"
CONF_BOILER_RECOVERY_RATE_C_PER_HOUR = "boiler_recovery_rate_c_per_hour"
CONF_BOILER_ENABLE_SECOND_THERMOMETER = "boiler_enable_second_thermometer"
CONF_BOILER_ALT_SOURCE_MODE = "boiler_alt_source_mode"
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
CONF_ENABLE_AUTO = "enable_auto"
CONF_AUTO_MODE_SWITCH = "auto_mode_switch_enabled"
# Backward-compatible option key used by older config flows/tests.
CONF_AUTO_MODE_PLAN = "auto_mode_plan"

# Battery Planning constants (BR-0.2)
CONF_THRESHOLD_CHEAP_CZK = "threshold_cheap_czk"  # Threshold for "cheap" electricity
CONF_PLANNING_MIN_PERCENT = "planning_min_percent"
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
