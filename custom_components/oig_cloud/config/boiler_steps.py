import logging
from typing import Any, Dict, Optional

import voluptuous as vol
from homeassistant.helpers import selector

from ..const import (
    CONF_BOILER_ALT_COST_KWH,
    CONF_BOILER_ALT_HEATER_SWITCH_ENTITY,
    CONF_BOILER_ALT_SOURCE_TYPE,
    CONF_BOILER_BATTERY_CYCLE_COST,
    CONF_BOILER_CIRCULATION_ENABLED,
    CONF_BOILER_CIRCULATION_LEAD_MINUTES,
    CONF_BOILER_CIRCULATION_MAX_RUNS_PER_DAY,
    CONF_BOILER_CIRCULATION_MIN_GAP_MINUTES,
    CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
    CONF_BOILER_CIRCULATION_RUN_MINUTES,
    CONF_BOILER_DEADLINE_TIME,
    CONF_BOILER_HEATER_SWITCH_ENTITY,
    CONF_BOILER_HAS_ALTERNATIVE_HEATING,
    CONF_BOILER_HOME5_MANEUVER_ENABLED,
    CONF_BOILER_LEGIONELLA_INTERVAL_DAYS,
    CONF_BOILER_LEGIONELLA_TARGET_TEMP_C,
    CONF_BOILER_TEMP_SENSOR_BOTTOM,
    CONF_BOILER_TEMP_SENSOR_TOP,
    CONF_BOILER_TARGET_TEMP_C,
    CONF_BOILER_VOLUME_L,
    CONF_BOX_HAS_HOME56,
    DEFAULT_BOILER_ALT_SOURCE_TYPE,
    DEFAULT_BOILER_BATTERY_CYCLE_COST,
    DEFAULT_BOILER_CIRCULATION_ENABLED,
    DEFAULT_BOILER_CIRCULATION_LEAD_MINUTES,
    DEFAULT_BOILER_CIRCULATION_MAX_RUNS_PER_DAY,
    DEFAULT_BOILER_CIRCULATION_MIN_GAP_MINUTES,
    DEFAULT_BOILER_CIRCULATION_RUN_MINUTES,
    DEFAULT_BOILER_DEADLINE_TIME,
    DEFAULT_BOILER_HOME5_MANEUVER_ENABLED,
    DEFAULT_BOILER_LEGIONELLA_INTERVAL_DAYS,
    DEFAULT_BOILER_LEGIONELLA_TARGET_TEMP_C,
    DEFAULT_BOILER_TARGET_TEMP_C,
    DEFAULT_BOX_HAS_HOME56,
)

_LOGGER = logging.getLogger(__name__)


def validate_boiler_simple_1(user_input: Dict[str, Any]) -> Dict[str, str]:
    errors: Dict[str, str] = {}
    volume = user_input.get("boiler_volume_l", 120)
    if volume < 30 or volume > 1000:
        errors["boiler_volume_l"] = "invalid_volume"
    box_id = user_input.get("boiler_box_id", "")
    if not box_id or not str(box_id).strip():
        errors["boiler_box_id"] = "required"
    return errors


def get_boiler_simple_1_schema(
    defaults: Optional[Dict[str, Any]] = None,
) -> vol.Schema:
    if defaults is None:
        defaults = {}
    return vol.Schema(
        {
            vol.Required(
                "boiler_box_id",
                default=defaults.get("boiler_box_id", ""),
            ): str,
            vol.Required(
                CONF_BOILER_VOLUME_L,
                default=defaults.get(CONF_BOILER_VOLUME_L, 120),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=30, max=1000, step=1, mode=selector.NumberSelectorMode.BOX
                )
            ),
            vol.Optional(
                "boiler_setup_mode",
                default=defaults.get("boiler_setup_mode", "simple"),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=[
                        selector.SelectOptionDict(
                            value="simple", label="Simple (5 steps)"
                        ),
                        selector.SelectOptionDict(
                            value="expert", label="Expert (advanced)"
                        ),
                    ],
                    mode=selector.SelectSelectorMode.DROPDOWN,
                )
            ),
            vol.Optional("go_back", default=False): selector.BooleanSelector(),
        }
    )


def validate_boiler_simple_2(user_input: Dict[str, Any]) -> Dict[str, str]:
    errors: Dict[str, str] = {}
    top = user_input.get(CONF_BOILER_TEMP_SENSOR_TOP, "")
    if not top:
        errors[CONF_BOILER_TEMP_SENSOR_TOP] = "required"
    if user_input.get("boiler_enable_second_thermometer", False):
        bottom = user_input.get(CONF_BOILER_TEMP_SENSOR_BOTTOM, "")
        if not bottom:
            errors[CONF_BOILER_TEMP_SENSOR_BOTTOM] = "required"
        elif bottom == top:
            errors[CONF_BOILER_TEMP_SENSOR_BOTTOM] = "duplicate_sensor"
    return errors


def get_boiler_simple_2_schema(
    defaults: Optional[Dict[str, Any]] = None,
) -> vol.Schema:
    if defaults is None:
        defaults = {}
    schema_fields: Dict[Any, Any] = {
        vol.Required(
            CONF_BOILER_TEMP_SENSOR_TOP,
            default=defaults.get(CONF_BOILER_TEMP_SENSOR_TOP, ""),
        ): selector.EntitySelector(
            selector.EntitySelectorConfig(
                domain="sensor", device_class="temperature"
            )
        ),
        vol.Optional(
            "boiler_enable_second_thermometer",
            default=defaults.get("boiler_enable_second_thermometer", False),
        ): selector.BooleanSelector(),
    }
    if defaults.get("boiler_enable_second_thermometer", False):
        schema_fields[
            vol.Optional(
                CONF_BOILER_TEMP_SENSOR_BOTTOM,
                default=defaults.get(CONF_BOILER_TEMP_SENSOR_BOTTOM, ""),
            )
        ] = selector.EntitySelector(
            selector.EntitySelectorConfig(
                domain="sensor", device_class="temperature"
            )
        )
    schema_fields[vol.Optional("go_back", default=False)] = (
        selector.BooleanSelector()
    )
    return vol.Schema(schema_fields)


def validate_boiler_simple_3(user_input: Dict[str, Any]) -> Dict[str, str]:
    errors: Dict[str, str] = {}
    if not user_input.get(CONF_BOILER_HEATER_SWITCH_ENTITY, ""):
        errors[CONF_BOILER_HEATER_SWITCH_ENTITY] = "required"
    mode = user_input.get("boiler_heating_capacity_mode", "effective_power_w")
    if mode == "effective_power_w":
        power = user_input.get("boiler_effective_power_w", 0)
        if power < 100 or power > 12000:
            errors["boiler_effective_power_w"] = "invalid_power"
    elif mode == "recovery_rate_c_per_hour":
        rate = user_input.get("boiler_recovery_rate_c_per_hour", 0)
        if rate < 0.1 or rate > 30:
            errors["boiler_recovery_rate_c_per_hour"] = "invalid_rate"
    return errors


def get_boiler_simple_3_schema(
    defaults: Optional[Dict[str, Any]] = None,
) -> vol.Schema:
    if defaults is None:
        defaults = {}
    return vol.Schema(
        {
            vol.Required(
                CONF_BOILER_HEATER_SWITCH_ENTITY,
                default=defaults.get(CONF_BOILER_HEATER_SWITCH_ENTITY, ""),
            ): selector.EntitySelector(
                selector.EntitySelectorConfig(domain="switch")
            ),
            vol.Required(
                "boiler_heating_capacity_mode",
                default=defaults.get(
                    "boiler_heating_capacity_mode", "effective_power_w"
                ),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=[
                        selector.SelectOptionDict(
                            value="effective_power_w", label="Effective power (W)"
                        ),
                        selector.SelectOptionDict(
                            value="recovery_rate_c_per_hour",
                            label="Recovery rate (°C/hour)",
                        ),
                    ],
                    mode=selector.SelectSelectorMode.DROPDOWN,
                )
            ),
            vol.Optional(
                "boiler_effective_power_w",
                default=defaults.get("boiler_effective_power_w", 2000),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=100, max=12000, step=100, mode=selector.NumberSelectorMode.BOX
                )
            ),
            vol.Optional(
                "boiler_recovery_rate_c_per_hour",
                default=defaults.get("boiler_recovery_rate_c_per_hour", 5.0),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0.1,
                    max=30.0,
                    step=0.1,
                    mode=selector.NumberSelectorMode.BOX,
                )
            ),
            vol.Optional(
                CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
                default=defaults.get(CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY, ""),
            ): selector.EntitySelector(
                selector.EntitySelectorConfig(domain="switch")
            ),
            vol.Optional("go_back", default=False): selector.BooleanSelector(),
        }
    )


def validate_boiler_simple_4(user_input: Dict[str, Any]) -> Dict[str, str]:
    errors: Dict[str, str] = {}
    mode = user_input.get("boiler_alt_source_mode", "disabled")
    if mode == "controllable":
        if not user_input.get(CONF_BOILER_ALT_HEATER_SWITCH_ENTITY, ""):
            errors[CONF_BOILER_ALT_HEATER_SWITCH_ENTITY] = "required"
    return errors


def get_boiler_simple_4_schema(
    defaults: Optional[Dict[str, Any]] = None,
) -> vol.Schema:
    if defaults is None:
        defaults = {}
    schema_fields: Dict[Any, Any] = {
        vol.Required(
            "boiler_alt_source_mode",
            default=defaults.get("boiler_alt_source_mode", "disabled"),
        ): selector.SelectSelector(
            selector.SelectSelectorConfig(
                options=[
                    selector.SelectOptionDict(value="disabled", label="Disabled"),
                    selector.SelectOptionDict(
                        value="benchmark_only", label="Benchmark only"
                    ),
                    selector.SelectOptionDict(
                        value="controllable", label="Controllable"
                    ),
                ],
                mode=selector.SelectSelectorMode.DROPDOWN,
            )
        ),
    }
    mode = defaults.get("boiler_alt_source_mode", "disabled")
    if mode in ("benchmark_only", "controllable"):
        schema_fields[
            vol.Optional(
                CONF_BOILER_ALT_COST_KWH,
                default=defaults.get(CONF_BOILER_ALT_COST_KWH, 0.0),
            )
        ] = selector.NumberSelector(
            selector.NumberSelectorConfig(
                min=0, max=20, step=0.1, mode=selector.NumberSelectorMode.BOX
            )
        )
    if mode == "controllable":
        schema_fields[
            vol.Required(
                CONF_BOILER_ALT_HEATER_SWITCH_ENTITY,
                default=defaults.get(CONF_BOILER_ALT_HEATER_SWITCH_ENTITY, ""),
            )
        ] = selector.EntitySelector(
            selector.EntitySelectorConfig(domain="switch")
        )
    schema_fields[vol.Optional("go_back", default=False)] = (
        selector.BooleanSelector()
    )
    return vol.Schema(schema_fields)


def validate_boiler_simple_5(user_input: Dict[str, Any]) -> Dict[str, str]:
    errors: Dict[str, str] = {}
    target = user_input.get(CONF_BOILER_TARGET_TEMP_C, DEFAULT_BOILER_TARGET_TEMP_C)
    if target < 40 or target > 85:
        errors[CONF_BOILER_TARGET_TEMP_C] = "invalid_target"
    return errors


def get_boiler_simple_5_schema(
    defaults: Optional[Dict[str, Any]] = None,
) -> vol.Schema:
    if defaults is None:
        defaults = {}
    return vol.Schema(
        {
            vol.Required(
                "boiler_comfort_profile_mode",
                default=defaults.get("boiler_comfort_profile_mode", "history_driven"),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=[
                        selector.SelectOptionDict(
                            value="history_driven", label="History driven"
                        ),
                        selector.SelectOptionDict(
                            value="manual", label="Manual"
                        ),
                        selector.SelectOptionDict(
                            value="default", label="Default"
                        ),
                    ],
                    mode=selector.SelectSelectorMode.DROPDOWN,
                )
            ),
            vol.Optional(
                CONF_BOILER_TARGET_TEMP_C,
                default=defaults.get(
                    CONF_BOILER_TARGET_TEMP_C, DEFAULT_BOILER_TARGET_TEMP_C
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=40, max=85, step=1, mode=selector.NumberSelectorMode.BOX
                )
            ),
            vol.Optional(
                CONF_BOILER_DEADLINE_TIME,
                default=defaults.get(
                    CONF_BOILER_DEADLINE_TIME, DEFAULT_BOILER_DEADLINE_TIME
                ),
            ): selector.TimeSelector(),
            vol.Optional("go_back", default=False): selector.BooleanSelector(),
        }
    )


# ---------------------------------------------------------------------------
# Step 6: Zdroje — alt source type, cost, has_alternative, Home 5/6
# ---------------------------------------------------------------------------


def validate_boiler_simple_6(user_input: Dict[str, Any]) -> Dict[str, str]:
    errors: Dict[str, str] = {}
    alt_cost = user_input.get(CONF_BOILER_ALT_COST_KWH, 0.0)
    if alt_cost < 0 or alt_cost > 20:
        errors[CONF_BOILER_ALT_COST_KWH] = "invalid_cost"
    batt_cost = user_input.get(CONF_BOILER_BATTERY_CYCLE_COST, DEFAULT_BOILER_BATTERY_CYCLE_COST)
    if batt_cost < 0 or batt_cost > 5:
        errors[CONF_BOILER_BATTERY_CYCLE_COST] = "invalid_cost"
    return errors


def get_boiler_simple_6_schema(
    defaults: Optional[Dict[str, Any]] = None,
) -> vol.Schema:
    """Krok 6 — Zdroje ohřevu (alternativní zdroj + Home 5 manévr)."""
    if defaults is None:
        defaults = {}
    return vol.Schema(
        {
            # Alternativní zdroj — typ (ovlivňuje pouze štítky, ne výpočty)
            vol.Optional(
                CONF_BOILER_HAS_ALTERNATIVE_HEATING,
                default=defaults.get(CONF_BOILER_HAS_ALTERNATIVE_HEATING, False),
            ): selector.BooleanSelector(),
            vol.Optional(
                CONF_BOILER_ALT_SOURCE_TYPE,
                default=defaults.get(CONF_BOILER_ALT_SOURCE_TYPE, DEFAULT_BOILER_ALT_SOURCE_TYPE),
            ): selector.SelectSelector(
                selector.SelectSelectorConfig(
                    options=[
                        selector.SelectOptionDict(value="gas", label="Plyn"),
                        selector.SelectOptionDict(value="heat_pump", label="Tepelné čerpadlo"),
                        selector.SelectOptionDict(value="fireplace", label="Krb"),
                        selector.SelectOptionDict(value="other", label="Jiný"),
                    ],
                    mode=selector.SelectSelectorMode.DROPDOWN,
                )
            ),
            # Cena tepla v Kč/kWh — u plynu včetně účinnosti kotle, u TČ ≈ cena elektřiny / COP
            vol.Optional(
                CONF_BOILER_ALT_COST_KWH,
                default=defaults.get(CONF_BOILER_ALT_COST_KWH, 0.0),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0.0, max=20.0, step=0.1, mode=selector.NumberSelectorMode.BOX
                )
            ),
            # Box má Home 5/6 (aktivuje ovládání z dashboardu)
            vol.Optional(
                CONF_BOX_HAS_HOME56,
                default=defaults.get(CONF_BOX_HAS_HOME56, DEFAULT_BOX_HAS_HOME56),
            ): selector.BooleanSelector(),
            # 🔋→🔥 Ohřev z baterie — opt-in pro plánovač (vyžaduje Home 5/6)
            vol.Optional(
                CONF_BOILER_HOME5_MANEUVER_ENABLED,
                default=defaults.get(
                    CONF_BOILER_HOME5_MANEUVER_ENABLED, DEFAULT_BOILER_HOME5_MANEUVER_ENABLED
                ),
            ): selector.BooleanSelector(),
            # Cena cyklu baterie (Kč/kWh) pro Home 5 arbitráž
            vol.Optional(
                CONF_BOILER_BATTERY_CYCLE_COST,
                default=defaults.get(
                    CONF_BOILER_BATTERY_CYCLE_COST, DEFAULT_BOILER_BATTERY_CYCLE_COST
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0.0, max=5.0, step=0.05, mode=selector.NumberSelectorMode.BOX
                )
            ),
            vol.Optional("go_back", default=False): selector.BooleanSelector(),
        }
    )


# ---------------------------------------------------------------------------
# Step 7: Komfort + hygiena — cirkulace + legionella
# ---------------------------------------------------------------------------


def validate_boiler_simple_7(user_input: Dict[str, Any]) -> Dict[str, str]:
    errors: Dict[str, str] = {}
    lead = user_input.get(CONF_BOILER_CIRCULATION_LEAD_MINUTES, DEFAULT_BOILER_CIRCULATION_LEAD_MINUTES)
    if lead < 0 or lead > 120:
        errors[CONF_BOILER_CIRCULATION_LEAD_MINUTES] = "invalid_minutes"
    run = user_input.get(CONF_BOILER_CIRCULATION_RUN_MINUTES, DEFAULT_BOILER_CIRCULATION_RUN_MINUTES)
    if run < 1 or run > 60:
        errors[CONF_BOILER_CIRCULATION_RUN_MINUTES] = "invalid_minutes"
    max_runs = user_input.get(
        CONF_BOILER_CIRCULATION_MAX_RUNS_PER_DAY, DEFAULT_BOILER_CIRCULATION_MAX_RUNS_PER_DAY
    )
    if max_runs < 1 or max_runs > 20:
        errors[CONF_BOILER_CIRCULATION_MAX_RUNS_PER_DAY] = "invalid_count"
    min_gap = user_input.get(
        CONF_BOILER_CIRCULATION_MIN_GAP_MINUTES, DEFAULT_BOILER_CIRCULATION_MIN_GAP_MINUTES
    )
    if min_gap < 10 or min_gap > 480:
        errors[CONF_BOILER_CIRCULATION_MIN_GAP_MINUTES] = "invalid_minutes"
    interval = user_input.get(CONF_BOILER_LEGIONELLA_INTERVAL_DAYS, DEFAULT_BOILER_LEGIONELLA_INTERVAL_DAYS)
    if interval < 0 or interval > 30:
        errors[CONF_BOILER_LEGIONELLA_INTERVAL_DAYS] = "invalid_days"
    target = user_input.get(CONF_BOILER_LEGIONELLA_TARGET_TEMP_C, DEFAULT_BOILER_LEGIONELLA_TARGET_TEMP_C)
    if target < 60 or target > 75:
        errors[CONF_BOILER_LEGIONELLA_TARGET_TEMP_C] = "invalid_target"
    return errors


def get_boiler_simple_7_schema(
    defaults: Optional[Dict[str, Any]] = None,
) -> vol.Schema:
    """Krok 7 — Komfort + hygiena (cirkulace + legionella)."""
    if defaults is None:
        defaults = {}
    return vol.Schema(
        {
            # Cirkulace
            vol.Optional(
                CONF_BOILER_CIRCULATION_ENABLED,
                default=defaults.get(CONF_BOILER_CIRCULATION_ENABLED, DEFAULT_BOILER_CIRCULATION_ENABLED),
            ): selector.BooleanSelector(),
            vol.Optional(
                CONF_BOILER_CIRCULATION_LEAD_MINUTES,
                default=defaults.get(
                    CONF_BOILER_CIRCULATION_LEAD_MINUTES, DEFAULT_BOILER_CIRCULATION_LEAD_MINUTES
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0, max=120, step=5, mode=selector.NumberSelectorMode.BOX
                )
            ),
            vol.Optional(
                CONF_BOILER_CIRCULATION_RUN_MINUTES,
                default=defaults.get(
                    CONF_BOILER_CIRCULATION_RUN_MINUTES, DEFAULT_BOILER_CIRCULATION_RUN_MINUTES
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=1, max=60, step=1, mode=selector.NumberSelectorMode.BOX
                )
            ),
            vol.Optional(
                CONF_BOILER_CIRCULATION_MAX_RUNS_PER_DAY,
                default=defaults.get(
                    CONF_BOILER_CIRCULATION_MAX_RUNS_PER_DAY,
                    DEFAULT_BOILER_CIRCULATION_MAX_RUNS_PER_DAY,
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=1, max=20, step=1, mode=selector.NumberSelectorMode.BOX
                )
            ),
            vol.Optional(
                CONF_BOILER_CIRCULATION_MIN_GAP_MINUTES,
                default=defaults.get(
                    CONF_BOILER_CIRCULATION_MIN_GAP_MINUTES,
                    DEFAULT_BOILER_CIRCULATION_MIN_GAP_MINUTES,
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=10, max=480, step=10, mode=selector.NumberSelectorMode.BOX
                )
            ),
            # Anti-legionella (0 = vypnuto)
            vol.Optional(
                CONF_BOILER_LEGIONELLA_INTERVAL_DAYS,
                default=defaults.get(
                    CONF_BOILER_LEGIONELLA_INTERVAL_DAYS, DEFAULT_BOILER_LEGIONELLA_INTERVAL_DAYS
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0, max=30, step=1, mode=selector.NumberSelectorMode.BOX
                )
            ),
            vol.Optional(
                CONF_BOILER_LEGIONELLA_TARGET_TEMP_C,
                default=defaults.get(
                    CONF_BOILER_LEGIONELLA_TARGET_TEMP_C, DEFAULT_BOILER_LEGIONELLA_TARGET_TEMP_C
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=60, max=75, step=1, mode=selector.NumberSelectorMode.BOX
                )
            ),
            vol.Optional("go_back", default=False): selector.BooleanSelector(),
        }
    )


# ---------------------------------------------------------------------------
# Step 8: Pokročilé — current power entity, alt energy daily
# ---------------------------------------------------------------------------


def validate_boiler_simple_8(user_input: Dict[str, Any]) -> Dict[str, str]:
    # No required fields in advanced step
    return {}


def get_boiler_simple_8_schema(
    defaults: Optional[Dict[str, Any]] = None,
) -> vol.Schema:
    """Krok 8 — Pokročilé (měřiče výkonu a alternativní energie)."""
    if defaults is None:
        defaults = {}
    return vol.Schema(
        {
            vol.Optional(
                "boiler_current_power_entity",
                default=defaults.get("boiler_current_power_entity", ""),
            ): selector.EntitySelector(
                selector.EntitySelectorConfig(domain="sensor")
            ),
            vol.Optional(
                "boiler_alt_energy_sensor",
                default=defaults.get("boiler_alt_energy_sensor", ""),
            ): selector.EntitySelector(
                selector.EntitySelectorConfig(domain="sensor")
            ),
            vol.Optional(
                "boiler_alt_energy_daily",
                default=defaults.get("boiler_alt_energy_daily", True),
            ): selector.BooleanSelector(),
            vol.Optional("go_back", default=False): selector.BooleanSelector(),
        }
    )
