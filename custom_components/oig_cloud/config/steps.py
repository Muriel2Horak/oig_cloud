import logging
from typing import TYPE_CHECKING, Any, Dict, Optional

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.config_entries import ConfigFlowResult
from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import callback
from homeassistant.helpers import selector

from ..ai.key_store import AiKeyStore
from ..boiler.const import BATTERY_CYCLE_COST_CZK_PER_KWH
from ..config_merge import merge_entry_options
from ..config_registry import FIELD_REGISTRY, fields_for_section
from .modules_validation import missing_dashboard_requirements, validate_modules_selection
from .solar_key_store import SOLAR_PRIVATE_FIELDS, SolarKeyStore
from .solar_rules import normalize_azimuth, validate_solar_effective
from ..const import (
    CONF_AUTO_MODE_SWITCH,
    CONF_CHARGE_RATE_KW,
    CONF_PASSWORD,
    CONF_USERNAME,
    DEFAULT_BOILER_PLAN_SLOT_MINUTES,
    DEFAULT_CHARGE_RATE_KW,
    DEFAULT_NAME,
    DEFAULT_PLANNING_MIN_PERCENT,
    DOMAIN,
)
from .boiler_steps import (
    get_boiler_simple_1_schema,
    get_boiler_simple_2_schema,
    get_boiler_simple_3_schema,
    get_boiler_simple_4_schema,
    get_boiler_simple_5_schema,
    get_boiler_simple_6_schema,
    get_boiler_simple_7_schema,
    get_boiler_simple_8_schema,
    validate_boiler_simple_1,
    validate_boiler_simple_2,
    validate_boiler_simple_3,
    validate_boiler_simple_4,
    validate_boiler_simple_5,
    validate_boiler_simple_6,
    validate_boiler_simple_7,
    validate_boiler_simple_8,
)
from ..core.data_source import PROXY_BOX_ID_ENTITY_ID, PROXY_LAST_DATA_ENTITY_ID
from .schema import (
    CONF_SOLAR_FORECAST_API_KEY,
    CONF_SOLAR_FORECAST_LATITUDE,
    CONF_SOLAR_FORECAST_LONGITUDE,
    CONF_SOLAR_FORECAST_PROVIDER,
    CONF_SOLCAST_API_KEY,
    CONF_SOLCAST_SITE_ID,
    CONF_SOLAR_FORECAST_STRING1_AZIMUTH,
    CONF_SOLAR_FORECAST_STRING1_DECLINATION,
    CONF_SOLAR_FORECAST_STRING1_ENABLED,
    CONF_SOLAR_FORECAST_STRING1_KWP,
    validate_tariff_hours,
)
from .validation import CannotConnect, InvalidAuth, LiveDataNotEnabled, validate_input

if TYPE_CHECKING:  # pragma: no cover
    from homeassistant.core import HomeAssistant

_LOGGER = logging.getLogger(__name__)


class WizardMixin:
    """Mixin třída obsahující všechny wizard kroky.

    Sdílená mezi ConfigFlow (nová instalace) a OptionsFlow (rekonfigurace).
    Poskytuje konzistentní UX pro oba případy.
    """

    if TYPE_CHECKING:  # pragma: no cover
        hass: HomeAssistant
        # Provided by OigCloudOptionsFlowHandler; declared here so the shared
        # modules-section routing helpers type-check. They are only reached when
        # _section == "modules", which only the options flow ever sets (M13).
        _STEP_MODULE: dict

        def _newly_enabled_modules(self) -> set: ...

    # Methods below are provided by ConfigFlow/OptionsFlow parent classes
    async_show_form: Any
    async_create_entry: Any
    async_abort: Any

    @staticmethod
    def _sanitize_data_source_mode(mode: Optional[str]) -> str:
        """Map legacy/alias values to supported ones."""
        if mode == "hybrid":
            return "local_only"
        return mode or "cloud_only"

    @staticmethod
    def _migrate_old_pricing_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """Migrate old pricing configuration to new format.

        Converts old single-step pricing data to new 3-step format.
        This ensures backward compatibility with existing configurations.
        """
        if not data:
            return data

        # Pokud už má nová data, nic nedělej
        if "import_pricing_scenario" in data:
            return data

        migrated = dict(data)
        dual_tariff = data.get("dual_tariff_enabled", False)
        WizardMixin._migrate_import_pricing(data, migrated, dual_tariff)
        WizardMixin._migrate_export_pricing(data, migrated, dual_tariff)
        if dual_tariff:
            WizardMixin._apply_dual_tariff_defaults(migrated, data)

        return migrated

    @staticmethod
    def _migrate_import_pricing(
        data: Dict[str, Any], migrated: Dict[str, Any], dual_tariff: bool
    ) -> None:
        old_model = data.get("spot_pricing_model", "percentage")
        migration_map = {
            "percentage": WizardMixin._migrate_import_percentage,
            "fixed": WizardMixin._migrate_import_fixed,
            "fixed_prices": WizardMixin._migrate_import_fixed_prices,
        }
        handler = migration_map.get(old_model)
        if handler:
            handler(data, migrated, dual_tariff)

    @staticmethod
    def _migrate_import_percentage(
        data: Dict[str, Any], migrated: Dict[str, Any], dual_tariff: bool
    ) -> None:
        scenario = (
            "spot_percentage_2tariff" if dual_tariff else "spot_percentage_1tariff"
        )
        migrated["import_pricing_scenario"] = scenario
        if dual_tariff:
            migrated["import_spot_positive_fee_percent_vt"] = data.get(
                "spot_positive_fee_percent", 15.0
            )
            migrated["import_spot_negative_fee_percent_vt"] = data.get(
                "spot_negative_fee_percent", 9.0
            )
            migrated["import_spot_positive_fee_percent_nt"] = data.get(
                "spot_positive_fee_percent", 13.0
            )
            migrated["import_spot_negative_fee_percent_nt"] = data.get(
                "spot_negative_fee_percent", 7.0
            )
        else:
            migrated["import_spot_positive_fee_percent"] = data.get(
                "spot_positive_fee_percent", 15.0
            )
            migrated["import_spot_negative_fee_percent"] = data.get(
                "spot_negative_fee_percent", 9.0
            )

    @staticmethod
    def _migrate_import_fixed(
        data: Dict[str, Any], migrated: Dict[str, Any], dual_tariff: bool
    ) -> None:
        scenario = "spot_fixed_2tariff" if dual_tariff else "spot_fixed_1tariff"
        migrated["import_pricing_scenario"] = scenario
        if dual_tariff:
            migrated["import_spot_fixed_fee_mwh_vt"] = data.get(
                "spot_fixed_fee_mwh", 500.0
            )
            migrated["import_spot_fixed_fee_mwh_nt"] = data.get(
                "spot_fixed_fee_mwh", 400.0
            )
        else:
            migrated["import_spot_fixed_fee_mwh"] = data.get(
                "spot_fixed_fee_mwh", 500.0
            )

    @staticmethod
    def _migrate_import_fixed_prices(
        data: Dict[str, Any], migrated: Dict[str, Any], dual_tariff: bool
    ) -> None:
        scenario = "fix_2tariff" if dual_tariff else "fix_1tariff"
        migrated["import_pricing_scenario"] = scenario
        if dual_tariff:
            migrated["import_fixed_price_vt"] = data.get(
                "fixed_commercial_price_vt", 4.50
            )
            migrated["import_fixed_price_nt"] = data.get(
                "fixed_commercial_price_nt", 3.20
            )
        else:
            migrated["import_fixed_price"] = data.get("fixed_commercial_price_vt", 4.50)

    @staticmethod
    def _migrate_export_pricing(
        data: Dict[str, Any], migrated: Dict[str, Any], dual_tariff: bool
    ) -> None:
        old_export_model = data.get("export_pricing_model", "percentage")
        if old_export_model == "percentage":
            scenario = (
                "spot_percentage_2tariff" if dual_tariff else "spot_percentage_1tariff"
            )
            migrated["export_pricing_scenario"] = scenario
            if dual_tariff:
                migrated["export_spot_fee_percent_vt"] = data.get(
                    "export_fee_percent", 15.0
                )
                migrated["export_spot_fee_percent_nt"] = data.get(
                    "export_fee_percent", 13.0
                )
            else:
                migrated["export_spot_fee_percent"] = data.get(
                    "export_fee_percent", 15.0
                )
            return
        scenario = "spot_fixed_2tariff" if dual_tariff else "spot_fixed_1tariff"
        migrated["export_pricing_scenario"] = scenario
        if dual_tariff:
            migrated["export_spot_fixed_fee_czk_vt"] = data.get(
                "export_fixed_fee_czk", 0.20
            )
            migrated["export_spot_fixed_fee_czk_nt"] = data.get(
                "export_fixed_fee_czk", 0.15
            )
        else:
            migrated["export_spot_fixed_fee_czk"] = data.get(
                "export_fixed_fee_czk", 0.20
            )

    @staticmethod
    def _apply_dual_tariff_defaults(
        migrated: Dict[str, Any], source: Dict[str, Any]
    ) -> None:
        migrated["vt_hours_start"] = source.get("vt_hours_start", "6:00")
        migrated["vt_hours_end"] = source.get("vt_hours_end", "22:00")
        weekday_vt = source.get(
            "tariff_vt_start_weekday", source.get("vt_hours_start", "6")
        )
        weekday_nt = source.get("tariff_nt_start_weekday", "22,2")
        migrated.setdefault("tariff_vt_start_weekday", weekday_vt)
        migrated.setdefault("tariff_nt_start_weekday", weekday_nt)
        migrated.setdefault("tariff_vt_start_weekend", weekday_vt)
        migrated.setdefault("tariff_nt_start_weekend", weekday_nt)

    @staticmethod
    def _map_pricing_to_backend(wizard_data: Dict[str, Any]) -> Dict[str, Any]:
        """Map UI pricing scenarios to backend attribute names.

        This function converts user-friendly UI selections to the exact
        attribute names that backend (spot_price_sensor.py) expects.

        Returns dict with backend-compatible attribute names.
        """
        backend_data: Dict[str, Any] = {}
        backend_data.update(WizardMixin._map_import_pricing(wizard_data))
        backend_data.update(WizardMixin._map_export_pricing(wizard_data))
        backend_data.update(WizardMixin._map_distribution_fees(wizard_data))
        backend_data["vat_rate"] = wizard_data.get("vat_rate", 21.0)
        return backend_data

    @staticmethod
    def _map_import_pricing(wizard_data: Dict[str, Any]) -> Dict[str, Any]:
        backend_data: Dict[str, Any] = {}
        import_scenario = wizard_data.get("import_pricing_scenario", "spot_percentage")

        if import_scenario == "spot_percentage":
            backend_data["spot_pricing_model"] = "percentage"
            backend_data["spot_positive_fee_percent"] = wizard_data.get(
                "spot_positive_fee_percent", 15.0
            )
            backend_data["spot_negative_fee_percent"] = wizard_data.get(
                "spot_negative_fee_percent", 9.0
            )
        elif import_scenario == "spot_fixed":
            backend_data["spot_pricing_model"] = "fixed"
            fee_kwh = wizard_data.get("spot_fixed_fee_kwh", 0.50)
            backend_data["spot_fixed_fee_mwh"] = fee_kwh * 1000.0
        elif import_scenario == "fix_price":
            backend_data["spot_pricing_model"] = "fixed_prices"
            fixed_price_vt = wizard_data.get(
                "fixed_price_vt_kwh", wizard_data.get("fixed_price_kwh", 4.50)
            )
            fixed_price_nt = wizard_data.get("fixed_price_nt_kwh", fixed_price_vt)
            backend_data["fixed_commercial_price_vt"] = fixed_price_vt
            backend_data["fixed_commercial_price_nt"] = fixed_price_nt

        return backend_data

    @staticmethod
    def _map_export_pricing(wizard_data: Dict[str, Any]) -> Dict[str, Any]:
        backend_data: Dict[str, Any] = {}
        export_scenario = wizard_data.get("export_pricing_scenario", "spot_percentage")

        if export_scenario == "spot_percentage":
            backend_data["export_pricing_model"] = "percentage"
            backend_data["export_fee_percent"] = wizard_data.get(
                "export_fee_percent", 15.0
            )
        elif export_scenario == "spot_fixed":
            backend_data["export_pricing_model"] = "fixed"
            backend_data["export_fixed_fee_czk"] = wizard_data.get(
                "export_fixed_fee_czk", 0.20
            )
        elif export_scenario == "fix_price":
            backend_data["export_pricing_model"] = "fixed_prices"
            backend_data["export_fixed_price"] = wizard_data.get(
                "export_fixed_price_kwh", 2.50
            )

        return backend_data

    @staticmethod
    def _map_distribution_fees(wizard_data: Dict[str, Any]) -> Dict[str, Any]:
        backend_data: Dict[str, Any] = {}
        tariff_count = wizard_data.get("tariff_count", "single")
        backend_data["dual_tariff_enabled"] = tariff_count == "dual"
        backend_data["distribution_fee_vt_kwh"] = wizard_data.get(
            "distribution_fee_vt_kwh", 1.42
        )
        if tariff_count == "dual":
            backend_data["distribution_fee_nt_kwh"] = wizard_data.get(
                "distribution_fee_nt_kwh", 0.91
            )
            backend_data["tariff_vt_start_weekday"] = wizard_data.get(
                "tariff_vt_start_weekday", "6"
            )
            backend_data["tariff_nt_start_weekday"] = wizard_data.get(
                "tariff_nt_start_weekday", "22,2"
            )
            backend_data["tariff_vt_start_weekend"] = wizard_data.get(
                "tariff_vt_start_weekend", backend_data["tariff_vt_start_weekday"]
            )
            backend_data["tariff_nt_start_weekend"] = wizard_data.get(
                "tariff_nt_start_weekend", backend_data["tariff_nt_start_weekday"]
            )
        return backend_data

    def _build_options_payload(self, wizard_data: Dict[str, Any]) -> Dict[str, Any]:
        """Build shared options payload for config and options flows."""
        payload: Dict[str, Any] = {}
        payload.update(self._build_base_options(wizard_data))
        payload.update(self._build_solar_options(wizard_data))
        payload.update(self._build_battery_options(wizard_data))
        payload.update(self._map_pricing_to_backend(wizard_data))
        payload.update(self._build_boiler_options(wizard_data))
        return payload

    @staticmethod
    def _build_base_options(wizard_data: Dict[str, Any]) -> Dict[str, Any]:
        """Build basic options from FIELD_REGISTRY.

        All defaults are read from the registry — never hard-coded here — so a
        change to a field's default in `config_registry.py` flows through to
        emitted payloads, GET responses, and the options UI in lockstep.

        `enable_boiler` is a registered `modules` field that this helper
        deliberately does NOT emit: a save that wrote it would change the
        payload shape. Boiler is handled by `_build_boiler_options`.
        """
        basic = fields_for_section("basic")
        modules = fields_for_section("modules")

        options: Dict[str, Any] = {}
        for key, field in basic.items():
            value = wizard_data.get(key, field.default)
            if key == "data_source_mode":
                value = WizardMixin._sanitize_data_source_mode(value)
            options[key] = value

        for key in (
            "enable_solar_forecast",
            "enable_battery_prediction",
            "enable_pricing",
            "enable_chmu_warnings",
            "enable_statistics",
            "enable_extended_sensors",
        ):
            options[key] = wizard_data.get(key, modules[key].default)

        return options

    def _build_solar_options(self, wizard_data: Dict[str, Any]) -> Dict[str, Any]:
        # RCA-R4: same order as the schema default (option -> hass.config ->
        # None) -- this is the payload actually persisted to entry.options,
        # so a fabricated Prague fallback here is the live bug, not just a
        # form pre-fill. Downstream (solar_forecast_sensor.py) already
        # treats a missing/None GPS as "not configured" and surfaces a repair.
        ha_latitude, ha_longitude = self._get_hass_gps()
        return {
            CONF_SOLAR_FORECAST_PROVIDER: wizard_data.get(
                CONF_SOLAR_FORECAST_PROVIDER, "forecast_solar"
            ),
            "solar_forecast_mode": wizard_data.get(
                "solar_forecast_mode", "daily_optimized"
            ),
            CONF_SOLAR_FORECAST_LATITUDE: wizard_data.get(
                CONF_SOLAR_FORECAST_LATITUDE, ha_latitude
            ),
            CONF_SOLAR_FORECAST_LONGITUDE: wizard_data.get(
                CONF_SOLAR_FORECAST_LONGITUDE, ha_longitude
            ),
            CONF_SOLAR_FORECAST_STRING1_ENABLED: wizard_data.get(
                CONF_SOLAR_FORECAST_STRING1_ENABLED, True
            ),
            CONF_SOLAR_FORECAST_STRING1_DECLINATION: wizard_data.get(
                CONF_SOLAR_FORECAST_STRING1_DECLINATION, 35
            ),
            CONF_SOLAR_FORECAST_STRING1_AZIMUTH: wizard_data.get(
                CONF_SOLAR_FORECAST_STRING1_AZIMUTH, 0
            ),
            CONF_SOLAR_FORECAST_STRING1_KWP: wizard_data.get(
                CONF_SOLAR_FORECAST_STRING1_KWP, 5.0
            ),
            "solar_forecast_string2_enabled": wizard_data.get(
                "solar_forecast_string2_enabled", False
            ),
            "solar_forecast_string2_declination": wizard_data.get(
                "solar_forecast_string2_declination", 35
            ),
            "solar_forecast_string2_azimuth": wizard_data.get(
                "solar_forecast_string2_azimuth", 180
            ),
            "solar_forecast_string2_kwp": wizard_data.get(
                "solar_forecast_string2_kwp", 5.0
            ),
        }

    @staticmethod
    def _build_battery_options(wizard_data: Dict[str, Any]) -> Dict[str, Any]:
        # charge_rate_kw / home_charge_rate are ONE logical field (registry mirror
        # pair). If both aliases are present and DISAGREE, the registered canonical
        # key wins: it is the key the REST API and the registry validate and write,
        # so it is the authoritative one. The legacy alias is not read as a
        # separate value here, which is what lets the Options Flow resolve a single
        # logical baseline; a later save self-heals the pair, because the delta
        # carries only charge_rate_kw and merge_entry_options mirrors it back onto
        # home_charge_rate. Falling back to the legacy alias only when the
        # canonical key is absent keeps legacy-only entries working.
        charge_rate_kw = wizard_data.get(
            CONF_CHARGE_RATE_KW,
            wizard_data.get("home_charge_rate", DEFAULT_CHARGE_RATE_KW),
        )
        expensive_pct = wizard_data.get("expensive_percentile_pct")
        if expensive_pct is None:
            expensive_fraction = float(wizard_data.get("expensive_percentile", 0.70))
        else:
            expensive_fraction = float(expensive_pct) / 100.0
        return {
            "expensive_percentile": round(expensive_fraction, 2),
            "min_capacity_percent": wizard_data.get("min_capacity_percent", 20.0),
            "target_capacity_percent": wizard_data.get("target_capacity_percent", 80.0),
            # Comfort SoC buffer kept above the hard floor via cheap windows only,
            # so the box never force-charges to ~80% at any price (0 disables).
            "battery_comfort_soc_percent": wizard_data.get(
                "battery_comfort_soc_percent", 50.0
            ),
            "home_charge_rate": charge_rate_kw,
            CONF_CHARGE_RATE_KW: charge_rate_kw,
            CONF_AUTO_MODE_SWITCH: wizard_data.get(CONF_AUTO_MODE_SWITCH, False),
            "max_ups_price_czk": wizard_data.get("max_ups_price_czk", 10.0),
            "balancing_enabled": wizard_data.get("balancing_enabled", True),
            "balancing_interval_days": wizard_data.get("balancing_interval_days", 7),
            "balancing_hold_hours": wizard_data.get("balancing_hold_hours", 3),
            "balancing_opportunistic_threshold": wizard_data.get(
                "balancing_opportunistic_threshold", 1.1
            ),
            "balancing_economic_threshold": wizard_data.get(
                "balancing_economic_threshold", 2.5
            ),
            "cheap_window_percentile": wizard_data.get("cheap_window_percentile", 30),
        }

    @staticmethod
    def _build_boiler_options(wizard_data: Dict[str, Any]) -> Dict[str, Any]:
        enable_boiler = wizard_data.get("enable_boiler", False)
        if wizard_data.get("boiler_module_selected") and not wizard_data.get(
            "boiler_setup_complete"
        ):
            enable_boiler = False

        return {
            "enable_boiler": enable_boiler,
            "boiler_setup_complete": wizard_data.get("boiler_setup_complete", False),
            "boiler_setup_mode": wizard_data.get("boiler_setup_mode", "simple"),
            "boiler_box_id": wizard_data.get("boiler_box_id", ""),
            "boiler_volume_l": wizard_data.get("boiler_volume_l", 120),
            "boiler_target_temp_c": wizard_data.get("boiler_target_temp_c", 60.0),
            "boiler_cold_inlet_temp_c": wizard_data.get(
                "boiler_cold_inlet_temp_c", 10.0
            ),
            "boiler_temp_sensor_top": wizard_data.get("boiler_temp_sensor_top", ""),
            "boiler_temp_sensor_bottom": wizard_data.get(
                "boiler_temp_sensor_bottom", ""
            ),
            "boiler_enable_second_thermometer": wizard_data.get(
                "boiler_enable_second_thermometer", False
            ),
            "boiler_temp_sensor_position": wizard_data.get(
                "boiler_temp_sensor_position", "top"
            ),
            "boiler_stratification_mode": wizard_data.get(
                "boiler_stratification_mode", "simple_avg"
            ),
            "boiler_two_zone_split_ratio": wizard_data.get(
                "boiler_two_zone_split_ratio", 0.5
            ),
            "boiler_heater_power_kw_entity": wizard_data.get(
                "boiler_heater_power_kw_entity",
                "",
            ),
            "boiler_heater_switch_entity": wizard_data.get(
                "boiler_heater_switch_entity", ""
            ),
            "boiler_effective_power_w": wizard_data.get(
                "boiler_effective_power_w", 2000
            ),
            "boiler_alt_heater_switch_entity": wizard_data.get(
                "boiler_alt_heater_switch_entity", ""
            ),
            "boiler_circulation_pump_switch_entity": wizard_data.get(
                "boiler_circulation_pump_switch_entity", ""
            ),
            "boiler_has_alternative_heating": wizard_data.get(
                "boiler_has_alternative_heating", False
            ),
            "boiler_alt_cost_kwh": wizard_data.get("boiler_alt_cost_kwh", 0.0),
            "boiler_alt_energy_sensor": wizard_data.get("boiler_alt_energy_sensor", ""),
            "boiler_spot_price_sensor": wizard_data.get("boiler_spot_price_sensor", ""),
            "boiler_deadline_time": wizard_data.get("boiler_deadline_time", "20:00"),
            "boiler_plan_slot_minutes": DEFAULT_BOILER_PLAN_SLOT_MINUTES,
            # F5 new keys (steps 6–8)
            "boiler_alt_source_type": wizard_data.get(
                "boiler_alt_source_type", "gas"
            ),
            "boiler_battery_cycle_cost_czk_kwh": wizard_data.get(
                "boiler_battery_cycle_cost_czk_kwh", BATTERY_CYCLE_COST_CZK_PER_KWH
            ),
            "box_has_home56": wizard_data.get("box_has_home56", False),
            "boiler_home5_maneuver_enabled": wizard_data.get(
                "boiler_home5_maneuver_enabled", False
            ),
            "boiler_circulation_enabled": wizard_data.get(
                "boiler_circulation_enabled", False
            ),
            "boiler_circulation_lead_minutes": wizard_data.get(
                "boiler_circulation_lead_minutes", 15
            ),
            "boiler_circulation_run_minutes": wizard_data.get(
                "boiler_circulation_run_minutes", 10
            ),
            "boiler_circulation_max_runs_per_day": wizard_data.get(
                "boiler_circulation_max_runs_per_day", 3
            ),
            "boiler_circulation_min_gap_minutes": wizard_data.get(
                "boiler_circulation_min_gap_minutes", 120
            ),
            "boiler_legionella_interval_days": wizard_data.get(
                "boiler_legionella_interval_days", 0
            ),
            "boiler_legionella_target_temp_c": wizard_data.get(
                "boiler_legionella_target_temp_c", 60.0
            ),
            "boiler_current_power_entity": wizard_data.get(
                "boiler_current_power_entity", ""
            ),
            "boiler_alt_energy_daily": wizard_data.get(
                "boiler_alt_energy_daily", True
            ),
        }

    @staticmethod
    def _map_backend_to_frontend(backend_data: Dict[str, Any]) -> Dict[str, Any]:
        """Map backend attribute names back to UI-friendly frontend names.

        This is the reverse of _map_pricing_to_backend - used when loading
        existing configuration in OptionsFlow.

        Each section mapper runs independently (RCA-R2): a malformed value in
        one section (missing key, explicit None, wrong type - e.g. a legacy
        `spot_fixed_fee_mwh` stored as a string) must not blank out the other
        sections by raising out of the whole function.
        """
        if not isinstance(backend_data, dict):
            backend_data = {}
        frontend_data: Dict[str, Any] = {}
        for section_name, mapper in (
            ("import", WizardMixin._map_import_frontend),
            ("export", WizardMixin._map_export_frontend),
            ("distribution", WizardMixin._map_distribution_frontend),
        ):
            try:
                frontend_data.update(mapper(backend_data))
            except Exception:  # pragma: no cover - defensivní logika
                _LOGGER.exception(
                    "OptionsFlow init: %s pricing mapping failed, section skipped",
                    section_name,
                )
        try:
            frontend_data["vat_rate"] = float(backend_data.get("vat_rate", 21.0))
        except (TypeError, ValueError):
            frontend_data["vat_rate"] = 21.0
        return frontend_data

    @staticmethod
    def _map_import_frontend(backend_data: Dict[str, Any]) -> Dict[str, Any]:
        frontend_data: Dict[str, Any] = {}
        spot_model = backend_data.get("spot_pricing_model", "percentage")
        if spot_model == "percentage":
            frontend_data["import_pricing_scenario"] = "spot_percentage"
            frontend_data["spot_positive_fee_percent"] = backend_data.get(
                "spot_positive_fee_percent", 15.0
            )
            frontend_data["spot_negative_fee_percent"] = backend_data.get(
                "spot_negative_fee_percent", 9.0
            )
        elif spot_model == "fixed":
            frontend_data["import_pricing_scenario"] = "spot_fixed"
            fee_mwh = backend_data.get("spot_fixed_fee_mwh", 500.0)
            frontend_data["spot_fixed_fee_kwh"] = fee_mwh / 1000.0
        elif spot_model == "fixed_prices":
            frontend_data["import_pricing_scenario"] = "fix_price"
            frontend_data["fixed_price_kwh"] = backend_data.get(
                "fixed_commercial_price_vt", 4.50
            )
            frontend_data["fixed_price_vt_kwh"] = backend_data.get(
                "fixed_commercial_price_vt", frontend_data["fixed_price_kwh"]
            )
            frontend_data["fixed_price_nt_kwh"] = backend_data.get(
                "fixed_commercial_price_nt", frontend_data["fixed_price_kwh"]
            )
        return frontend_data

    @staticmethod
    def _map_export_frontend(backend_data: Dict[str, Any]) -> Dict[str, Any]:
        frontend_data: Dict[str, Any] = {}
        export_model = backend_data.get("export_pricing_model", "percentage")
        if export_model == "percentage":
            frontend_data["export_pricing_scenario"] = "spot_percentage"
            frontend_data["export_fee_percent"] = backend_data.get(
                "export_fee_percent", 15.0
            )
        elif export_model == "fixed":
            frontend_data["export_pricing_scenario"] = "spot_fixed"
            frontend_data["export_fixed_fee_czk"] = backend_data.get(
                "export_fixed_fee_czk", 0.20
            )
        elif export_model == "fixed_prices":
            frontend_data["export_pricing_scenario"] = "fix_price"
            frontend_data["export_fixed_price_kwh"] = backend_data.get(
                "export_fixed_price", 2.50
            )
        return frontend_data

    @staticmethod
    def _map_distribution_frontend(backend_data: Dict[str, Any]) -> Dict[str, Any]:
        frontend_data: Dict[str, Any] = {}
        dual_tariff = backend_data.get("dual_tariff_enabled", False)
        frontend_data["tariff_count"] = "dual" if dual_tariff else "single"
        frontend_data["distribution_fee_vt_kwh"] = backend_data.get(
            "distribution_fee_vt_kwh", 1.42
        )
        if dual_tariff:
            frontend_data["distribution_fee_nt_kwh"] = backend_data.get(
                "distribution_fee_nt_kwh", 0.91
            )
            weekday_vt = backend_data.get("tariff_vt_start_weekday", "6")
            weekday_nt = backend_data.get("tariff_nt_start_weekday", "22,2")
            weekend_vt = backend_data.get("tariff_vt_start_weekend")
            weekend_nt = backend_data.get("tariff_nt_start_weekend")
            frontend_data["tariff_vt_start_weekday"] = weekday_vt
            frontend_data["tariff_nt_start_weekday"] = weekday_nt
            frontend_data["tariff_vt_start_weekend"] = (
                weekend_vt if weekend_vt is not None else weekday_vt
            )
            frontend_data["tariff_nt_start_weekend"] = (
                weekend_nt if weekend_nt is not None else weekday_nt
            )
        return frontend_data

    def __init__(self) -> None:
        """Initialize wizard data."""
        super().__init__()
        self._wizard_data: Dict[str, Any] = {}
        self._step_history: list[str] = []

    def _is_reconfiguration(self) -> bool:
        """Check if this is a reconfiguration (Options Flow)."""
        return hasattr(self, "config_entry") and getattr(self, "config_entry") is not None

    def _get_defaults(self) -> Dict[str, Any]:
        """Get default values from existing config (for reconfiguration)."""
        if self._is_reconfiguration():
            # Migrovat stará data při načítání
            entry = getattr(self, "config_entry")
            if entry is not None:
                old_data = dict(entry.options)
                return self._migrate_old_pricing_data(old_data)
        return {}

    def _get_planner_mode_value(self, data: Optional[Dict[str, Any]] = None) -> str:
        """Return normalized planner mode name - always hybrid."""
        _ = data
        return "hybrid"

    async def _handle_back_button(self, current_step: str) -> ConfigFlowResult:
        """Handle back button - return to previous step."""
        if len(self._step_history) > 0:
            # Odebrat současný krok z historie
            if self._step_history[-1] == current_step:
                self._step_history.pop()

            # Vrátit se o krok zpět
            if len(self._step_history) > 0:
                previous_step = self._step_history.pop()
                return await getattr(self, f"async_step_{previous_step}")()

        # Pokud není historie, vrátit se na začátek
        return await self.async_step_wizard_welcome()

    def _generate_summary(self) -> str:
        """Generate configuration summary for review."""
        summary_parts = []

        # Přihlášení
        summary_parts.append("👤 **Přihlášení:**")
        summary_parts.append(
            f"   • Uživatel: {self._wizard_data.get(CONF_USERNAME, 'N/A')}"
        )
        summary_parts.append("")

        # Intervaly
        summary_parts.append("⏱️ **Intervaly načítání:**")
        summary_parts.append(
            f"   • Základní data: {self._wizard_data.get('standard_scan_interval', 30)}s"
        )
        summary_parts.append(
            f"   • Rozšířená data: {self._wizard_data.get('extended_scan_interval', 300)}s"
        )
        summary_parts.append("")

        # Zapnuté moduly
        summary_parts.append("📦 **Zapnuté moduly:**")
        if self._wizard_data.get("enable_statistics", True):
            summary_parts.append("   ✅ Statistiky a analýzy")
        if self._wizard_data.get("enable_solar_forecast", False):
            summary_parts.append("   ✅ Solární předpověď")
            mode = self._wizard_data.get("solar_forecast_mode", "daily_optimized")
            mode_names = {
                "daily_optimized": "Denní optimalizovaný",
                "every_4h": "Každé 4 hodiny",
                "hourly": "Každou hodinu",
            }
            summary_parts.append(f"      → Režim: {mode_names.get(mode, mode)}")
            if self._wizard_data.get(CONF_SOLAR_FORECAST_STRING1_ENABLED, False):
                kwp1 = self._wizard_data.get(CONF_SOLAR_FORECAST_STRING1_KWP, 0)
                summary_parts.append(f"      → String 1: {kwp1} kWp")
            if self._wizard_data.get("solar_forecast_string2_enabled", False):
                kwp2 = self._wizard_data.get("solar_forecast_string2_kwp", 0)
                summary_parts.append(f"      → String 2: {kwp2} kWp")

        if self._wizard_data.get("enable_battery_prediction", False):
            summary_parts.append("   ✅ Predikce baterie")
            min_cap = self._wizard_data.get("min_capacity_percent", 20)
            target_cap = self._wizard_data.get("target_capacity_percent", 80)
            max_price = self._wizard_data.get("max_ups_price_czk", 10.0)
            hysteresis = self._wizard_data.get("price_hysteresis_czk", 0.01)
            hw_min_hold = self._wizard_data.get("hw_min_hold_hours", 6.0)
            summary_parts.append(f"      → Kapacita: {min_cap}% - {target_cap}%")
            summary_parts.append(f"      → Max. cena: {max_price} CZK/kWh")
            summary_parts.append(
                f"      → Hystereze: {hysteresis} CZK/kWh, HW min hold: {hw_min_hold} h"
            )

        if self._wizard_data.get("enable_pricing", False):
            summary_parts.append("   ✅ Cenové senzory a spotové ceny")
            model = self._wizard_data.get("spot_pricing_model", "percentage")
            model_names = {
                "percentage": "Procentní přirážka",
                "fixed": "Fixní poplatek",
                "fixed_prices": "Fixní ceny",
            }
            summary_parts.append(f"      → Model: {model_names.get(model, model)}")
            vat = self._wizard_data.get("vat_rate", 21.0)
            summary_parts.append(f"      → DPH: {vat}%")

        if self._wizard_data.get("enable_extended_sensors", True):
            summary_parts.append("   ✅ Rozšířené senzory")

        if self._wizard_data.get("enable_dashboard", False):
            summary_parts.append("   ✅ Interaktivní dashboard")

        summary_parts.append("")
        summary_parts.append(
            "💡 **Tip:** Můžete se vrátit zpět a změnit jakékoli nastavení."
        )

        return "\n".join(summary_parts)

    # === WIZARD METHODS - Shared by ConfigFlow and OptionsFlow ===

    async def async_step_wizard_welcome(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Wizard: Welcome screen with overview."""
        if user_input is not None:
            return await self.async_step_wizard_credentials()

        return self.async_show_form(
            step_id="wizard_welcome",
            data_schema=vol.Schema({}),
            description_placeholders={
                "info": """
🎯 Vítejte v průvodci nastavením OIG Cloud!

Tento průvodce vás krok za krokem provede nastavením integrace.
Můžete se kdykoli vrátit zpět a změnit předchozí nastavení.

**Co budeme konfigurovat:**
1. Přihlašovací údaje
2. Výběr funkcí a modulů
3. Podrobné nastavení vybraných modulů
4. Kontrola a dokončení

Kliknutím na "Odeslat" spustíte průvodce.
                """.strip()
            },
        )

    async def async_step_wizard_credentials(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Wizard Step 1: Credentials."""
        if user_input is not None:
            # Kontrola tlačítka "Zpět" - musí být PRVNÍ, bez validace
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_credentials")

            errors = self._validate_credentials_input(user_input)
            if errors:
                return self._show_credentials_form(errors)

            try:
                await validate_input(self.hass, user_input)
                self._wizard_data.update(user_input)
                self._step_history.append("wizard_credentials")
                return await self.async_step_wizard_modules()

            except LiveDataNotEnabled:
                errors["base"] = "live_data_not_enabled"
            except CannotConnect:
                errors["base"] = "cannot_connect"
            except InvalidAuth:
                errors["base"] = "invalid_auth"
            except Exception:
                _LOGGER.exception("Unexpected exception")
                errors["base"] = "unknown"

            return self._show_credentials_form(errors)

        return self._show_credentials_form()

    def _show_credentials_form(
        self, errors: Optional[Dict[str, str]] = None
    ) -> ConfigFlowResult:
        return self.async_show_form(
            step_id="wizard_credentials",
            data_schema=self._get_credentials_schema(),
            errors=errors,
            description_placeholders=self._get_step_placeholders("wizard_credentials"),
        )

    @staticmethod
    def _validate_credentials_input(user_input: Dict[str, Any]) -> Dict[str, str]:
        errors: Dict[str, str] = {}
        if not user_input.get(CONF_USERNAME, "").strip():
            errors[CONF_USERNAME] = "required"
        if not user_input.get(CONF_PASSWORD, ""):
            errors[CONF_PASSWORD] = "required"
        if not user_input.get("live_data_enabled", False):
            errors["live_data_enabled"] = "live_data_not_confirmed"
        return errors

    async def async_step_wizard_modules(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Wizard Step 2: Select modules to enable."""
        if user_input is not None:
            # Kontrola tlačítka "Zpět"
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_modules")

            errors = self._validate_modules_selection(user_input)
            if errors:
                return self._show_modules_form(user_input, errors)

            self._wizard_data.update(user_input)
            if user_input.get("enable_boiler"):
                self._wizard_data["boiler_module_selected"] = True
            self._step_history.append("wizard_modules")

            next_step = self._get_next_step("wizard_modules")
            return await getattr(self, f"async_step_{next_step}")()

        return self._show_modules_form()

    def _show_modules_form(
        self,
        defaults: Optional[Dict[str, Any]] = None,
        errors: Optional[Dict[str, str]] = None,
    ) -> ConfigFlowResult:
        return self.async_show_form(
            step_id="wizard_modules",
            data_schema=self._get_modules_schema(defaults),
            errors=errors,
            description_placeholders=self._get_step_placeholders("wizard_modules"),
        )

    def _validate_modules_selection(self, user_input: Dict[str, Any]) -> Dict[str, str]:
        errors = validate_modules_selection(user_input)
        if "enable_dashboard" in errors:
            self._wizard_data["_missing_for_dashboard"] = missing_dashboard_requirements(
                user_input
            )
        return errors

    @staticmethod
    def _validate_boiler_topology(user_input: Dict[str, Any]) -> Dict[str, str]:
        """Validate boiler temperature sensor topology and cross-box bindings.

        Enforces the supported topology matrix:
        - top-only: supported
        - top+bottom: supported
        - bottom-only: rejected
        - duplicate sensor: rejected
        - 3+ thermometers: unsupported
        - cross-box entity sharing: rejected
        """
        from ..boiler import models as _boiler_models
        StratificationMode = _boiler_models.StratificationMode

        errors: Dict[str, str] = {}

        # Validate stratification mode
        strat_mode = user_input.get("boiler_stratification_mode", "")
        try:
            StratificationMode(strat_mode)
        except ValueError:
            errors["boiler_stratification_mode"] = "invalid_stratification_mode"
            return errors

        top_sensor = user_input.get("boiler_temp_sensor_top", "")
        bottom_sensor = user_input.get("boiler_temp_sensor_bottom", "")

        # Count thermometers
        sensors = [s for s in [top_sensor, bottom_sensor] if s]
        middle_sensor = user_input.get("boiler_temp_sensor_middle", "")
        if middle_sensor:
            sensors.append(middle_sensor)

        if len(sensors) >= 3:
            errors["base"] = "too_many_thermometers"
            return errors

        # Check duplicate sensors
        if top_sensor and bottom_sensor and top_sensor == bottom_sensor:
            errors["boiler_temp_sensor_bottom"] = "duplicate_sensor"
            return errors

        # Determine topology and validate
        if top_sensor and bottom_sensor:
            pass  # TOP_BOTTOM topology
        elif top_sensor and not bottom_sensor:
            pass  # TOP_ONLY topology
        elif not top_sensor and bottom_sensor:
            errors["boiler_temp_sensor_bottom"] = "bottom_only"
            return errors
        else:
            errors["base"] = "no_temperature_sensors"
            return errors

        # Cross-box sharing rejection
        def _extract_box_id(entity_id: str):
            parts = entity_id.split(".")
            if len(parts) == 2:
                entity_parts = parts[1].split("_")
                for i, part in enumerate(entity_parts):
                    if part == "oig" and i + 1 < len(entity_parts):
                        return entity_parts[i + 1]
            return None

        # Cross-box rejection compares only entities that resolve to a REAL OIG
        # box id. Boiler temperature probes are commonly third-party (ESPHome,
        # e.g. sensor.bojler_top) → _extract_box_id returns None; such entities
        # must NOT participate in the comparison, otherwise a valid single-box
        # setup with a non-OIG sensor is wrongly rejected as cross_box_sharing.
        candidates = [
            ("boiler_temp_sensor_top", top_sensor),
            ("boiler_temp_sensor_bottom", bottom_sensor),
            ("boiler_heater_switch_entity", user_input.get("boiler_heater_switch_entity", "")),
            ("boiler_alt_heater_switch_entity", user_input.get("boiler_alt_heater_switch_entity", "")),
            ("boiler_circulation_pump_switch_entity", user_input.get("boiler_circulation_pump_switch_entity", "")),
        ]
        resolved = [(field, _extract_box_id(val)) for field, val in candidates if val]
        resolved = [(field, bid) for field, bid in resolved if bid is not None]
        distinct_ids = {bid for _field, bid in resolved}
        if len(distinct_ids) > 1:
            # Genuine multi-box mix: reference = most common box id, flag the odd ones.
            from collections import Counter
            reference = Counter(bid for _f, bid in resolved).most_common(1)[0][0]
            for field, bid in resolved:
                if bid != reference:
                    errors[field] = "cross_box_sharing"
                    break

        return errors

    def _get_modules_schema(
        self, defaults: Optional[Dict[str, Any]] = None
    ) -> vol.Schema:
        """Get schema for modules selection with defaults."""
        if defaults is None:
            defaults = self._wizard_data if self._wizard_data else {}

        return vol.Schema(
            {
                vol.Optional(
                    "enable_statistics", default=defaults.get("enable_statistics", True)
                ): bool,
                vol.Optional(
                    "enable_solar_forecast",
                    default=defaults.get("enable_solar_forecast", False),
                ): bool,
                vol.Optional(
                    "enable_battery_prediction",
                    default=defaults.get("enable_battery_prediction", False),
                ): bool,
                vol.Optional(
                    "enable_pricing", default=defaults.get("enable_pricing", False)
                ): bool,
                vol.Optional(
                    "enable_extended_sensors",
                    default=defaults.get("enable_extended_sensors", True),
                ): bool,
                vol.Optional(
                    "enable_chmu_warnings",
                    default=defaults.get("enable_chmu_warnings", False),
                ): bool,
                vol.Optional(
                    "enable_dashboard", default=defaults.get("enable_dashboard", False)
                ): bool,
                vol.Optional(
                    "enable_boiler", default=defaults.get("enable_boiler", False)
                ): bool,
                vol.Optional("go_back", default=False): bool,
            }
        )

    def _get_credentials_schema(self) -> vol.Schema:
        """Get schema for credentials step."""
        return vol.Schema(
            {
                vol.Optional(
                    CONF_USERNAME,
                    default=self._wizard_data.get(CONF_USERNAME, ""),
                    description={
                        "suggested_value": self._wizard_data.get(CONF_USERNAME, "")
                    },
                ): str,
                vol.Optional(
                    CONF_PASSWORD, default="", description={"suggested_value": ""}
                ): str,
                vol.Optional(
                    "live_data_enabled",
                    default=False,
                ): bool,
                vol.Optional("go_back", default=False): bool,
            }
        )

    def _get_total_steps(self) -> int:
        """Calculate total number of steps based on enabled modules."""
        is_options_flow = "wizard_welcome_reconfigure" in self._step_history

        total = 3 if is_options_flow else 4

        if self._wizard_data.get("enable_solar_forecast", False):
            total += 1
        if self._wizard_data.get("enable_battery_prediction", False):
            total += 1
        if self._wizard_data.get("enable_pricing", False):
            total += 3
        if self._wizard_data.get("enable_boiler", False):
            if self._wizard_data.get("boiler_setup_mode") == "expert":
                total += 1
            else:
                total += 8

        total += 1

        return total

    def _get_current_step_number(self, step_id: str) -> int:
        """Get current step number based on step_id and enabled modules."""
        is_options_flow = self._is_options_flow(step_id)
        steps = self._build_step_sequence(is_options_flow)
        if step_id in steps:
            return steps.index(step_id) + 1

        return self._base_step_map(is_options_flow).get(step_id, 1)

    def _is_options_flow(self, step_id: str) -> bool:
        """Return True when running inside Options Flow."""
        return (
            "wizard_welcome_reconfigure" in self._step_history
            or step_id == "wizard_welcome_reconfigure"
        )

    def _base_step_map(self, is_options_flow: bool) -> dict[str, int]:
        """Return step mapping for base flow."""
        if is_options_flow:
            return {  # pragma: no cover
                "wizard_welcome_reconfigure": 1,
                "wizard_modules": 2,
                "wizard_intervals": 3,
            }
        return {
            "wizard_welcome": 1,
            "wizard_credentials": 2,
            "wizard_modules": 3,
            "wizard_intervals": 4,
        }

    def _build_step_sequence(self, is_options_flow: bool) -> list[str]:
        """Build ordered list of steps for progress calculation."""
        if is_options_flow:
            steps = [
                "wizard_welcome_reconfigure",
                "wizard_modules",
                "wizard_intervals",
            ]
        else:
            steps = [
                "wizard_welcome",
                "wizard_credentials",
                "wizard_modules",
                "wizard_intervals",
            ]

        if self._wizard_data.get("enable_solar_forecast", False):
            steps.append("wizard_solar")
        if self._wizard_data.get("enable_battery_prediction", False):
            steps.append("wizard_battery")
        if self._wizard_data.get("enable_pricing", False):
            steps.extend(
                [
                    "wizard_pricing_import",
                    "wizard_pricing_export",
                    "wizard_pricing_distribution",
                ]
            )
        if self._wizard_data.get("enable_boiler", False):
            if self._wizard_data.get("boiler_setup_mode") == "expert":
                steps.append("wizard_boiler")
            else:
                steps.extend(
                    [
                        "wizard_boiler_simple_1",
                        "wizard_boiler_simple_2",
                        "wizard_boiler_simple_3",
                        "wizard_boiler_simple_4",
                        "wizard_boiler_simple_5",
                        "wizard_boiler_simple_6",
                        "wizard_boiler_simple_7",
                        "wizard_boiler_simple_8",
                    ]
                )

        steps.append("wizard_summary")
        return steps

    def _get_step_placeholders(self, step_id: Optional[str] = None, **kwargs) -> Dict[str, str]:
        """Get placeholders for step description.

        Args:
            step_id: ID of current step (e.g. 'wizard_solar')
            **kwargs: Additional placeholders
        """
        if step_id:
            current = self._get_current_step_number(step_id)
            total = self._get_total_steps()
        else:
            # Fallback pro staré volání
            current = kwargs.pop("current", 1)
            total = kwargs.pop("total", 5)

        progress_bar = "▓" * current + "░" * (total - current)
        placeholders = {
            "step": f"Krok {current} z {total}",
            "progress": progress_bar,
            # Some translations use "{info}" in step descriptions. Provide a safe default.
            "info": "",
        }

        # Přidat další placeholders podle potřeby
        placeholders.update(kwargs)
        return placeholders

    # Last step of each options-flow section; after it we jump straight to
    # the summary (save) instead of walking the whole wizard.
    _SECTION_LAST_STEP = {
        "modules": "wizard_modules",
        "intervals": "wizard_intervals",
        "solar": "wizard_solar",
        "battery": "wizard_battery",
        "pricing": "wizard_pricing_distribution",
        # boiler chains already end right before the summary
    }

    def _get_next_step(self, current_step: str) -> str:
        """Determine next step based on enabled modules."""
        section = getattr(self, "_section", None)
        # M13: in the "modules" section, enabling a previously-off module must
        # route through that module's config before summary; if nothing new was
        # enabled, jump straight to summary as before.
        if section == "modules" and current_step == "wizard_modules":
            if not self._newly_enabled_modules():
                return "wizard_summary"
            # fall through to the chain — _should_skip_step keeps only the
            # newly-enabled modules' config steps.
        elif section and current_step == self._SECTION_LAST_STEP.get(section):
            return "wizard_summary"

        all_steps = [
            "wizard_welcome",
            "wizard_credentials",
            "wizard_modules",
            "wizard_intervals",
            "wizard_solar",
            "wizard_battery",
            "wizard_pricing_import",
            "wizard_pricing_export",
            "wizard_pricing_distribution",
            "wizard_boiler_simple_1",
            "wizard_boiler_simple_2",
            "wizard_boiler_simple_3",
            "wizard_boiler_simple_4",
            "wizard_boiler_simple_5",
            "wizard_boiler_simple_6",
            "wizard_boiler_simple_7",
            "wizard_boiler_simple_8",
            "wizard_boiler",
            "wizard_summary",
        ]

        try:
            current_idx = all_steps.index(current_step)
        except ValueError:
            return "wizard_summary"

        for step in all_steps[current_idx + 1 :]:
            if step == "wizard_summary":
                return step
            if self._should_skip_step(step):
                continue

            return step

        return "wizard_summary"

    def _should_skip_step(self, step: str) -> bool:
        # M13: when editing only the "modules" section, walk the config of
        # NEWLY-enabled modules only — skip everything else (intervals, already-
        # enabled modules) so the user isn't dragged through the whole wizard.
        if getattr(self, "_section", None) == "modules":
            mod = self._STEP_MODULE.get(step)
            if mod is None:
                return True  # non-module step (e.g. intervals) — skip in this section
            if mod not in self._newly_enabled_modules():
                return True  # already-enabled or disabled module — skip
            # newly enabled → fall through to the per-module skip rules below
        if step == "wizard_solar":
            return not self._wizard_data.get("enable_solar_forecast")
        if step == "wizard_battery":
            return not self._wizard_data.get("enable_battery_prediction")
        if step in {
            "wizard_pricing_import",
            "wizard_pricing_export",
            "wizard_pricing_distribution",
        }:
            return not self._wizard_data.get("enable_pricing")
        if step in {
            "wizard_boiler_simple_1",
            "wizard_boiler_simple_2",
            "wizard_boiler_simple_3",
            "wizard_boiler_simple_4",
            "wizard_boiler_simple_5",
            "wizard_boiler_simple_6",
            "wizard_boiler_simple_7",
            "wizard_boiler_simple_8",
        }:
            return not self._wizard_data.get("enable_boiler") or self._wizard_data.get("boiler_setup_mode") == "expert"
        if step == "wizard_boiler":
            return not self._wizard_data.get("enable_boiler") or self._wizard_data.get("boiler_setup_mode") != "expert"
        return False

    async def async_step_wizard_intervals(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Wizard Step 3: Configure scan intervals."""
        if user_input is not None:
            # Kontrola tlačítka "Zpět"
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_intervals")

            values = self._collect_interval_values(user_input)
            errors = self._validate_interval_values(values)
            if errors:
                return self._show_intervals_form(values, errors)

            self._wizard_data.update(user_input)
            self._step_history.append("wizard_intervals")

            next_step = self._get_next_step("wizard_intervals")
            return await getattr(self, f"async_step_{next_step}")()

        return self._show_intervals_form()

    def _collect_interval_values(self, user_input: Dict[str, Any]) -> Dict[str, Any]:
        """Collect the intervals step's values, keyed by registry field name.

        Returns field-name keys (not short aliases) so the value dict speaks the
        same dialect as the form, the registry and ``_wizard_data``. This lets the
        error path re-render the user's typed values instead of registry defaults.
        """
        basic = fields_for_section("basic")
        values = {
            key: user_input.get(key, self._wizard_data.get(key, basic[key].default))
            for key in (
                "standard_scan_interval",
                "extended_scan_interval",
                "local_proxy_stale_minutes",
                "local_event_debounce_ms",
            )
        }
        values["data_source_mode"] = self._sanitize_data_source_mode(
            user_input.get(
                "data_source_mode",
                self._wizard_data.get(
                    "data_source_mode", basic["data_source_mode"].default
                ),
            )
        )
        return values

    def _validate_interval_values(self, values: Dict[str, Any]) -> Dict[str, str]:
        errors: Dict[str, str] = {}
        basic = fields_for_section("basic")

        # (field, error-key-below, error-key-above) — the i18n dialect is preserved
        # verbatim: extended_scan_interval keeps its own extended_interval_* pair
        # while the other three share interval_too_short/interval_too_long (OQ-7).
        checks = (
            ("standard_scan_interval", "interval_too_short", "interval_too_long"),
            ("extended_scan_interval", "extended_interval_too_short", "extended_interval_too_long"),
            ("local_proxy_stale_minutes", "interval_too_short", "interval_too_long"),
            ("local_event_debounce_ms", "interval_too_short", "interval_too_long"),
        )
        for key, too_low, too_high in checks:
            field = basic[key]
            if field.min is not None and values[key] < field.min:
                errors[key] = too_low
            elif field.max is not None and values[key] > field.max:
                errors[key] = too_high

        if values["data_source_mode"] == "local_only" and not self._proxy_ready():
            errors["data_source_mode"] = "local_proxy_missing"

        return errors

    def _proxy_ready(self) -> bool:
        if not self.hass:
            return False  # pragma: no cover
        proxy_state = self.hass.states.get(PROXY_LAST_DATA_ENTITY_ID)
        if proxy_state is None or proxy_state.state in (
            STATE_UNAVAILABLE,
            STATE_UNKNOWN,
        ):
            return False
        proxy_box = self.hass.states.get(PROXY_BOX_ID_ENTITY_ID)
        return bool(
            proxy_box is not None
            and isinstance(proxy_box.state, str)
            and proxy_box.state.isdigit()
        )

    @staticmethod
    def _get_intervals_schema(defaults: Dict[str, Any]) -> vol.Schema:
        """Build the wizard_intervals schema from the basic FIELD_REGISTRY.

        Field types are kept (``int`` for the numeric fields, a SelectSelector for
        ``data_source_mode``) so the UI is unchanged — only the defaults and the enum
        options are sourced from the registry. ``defaults`` is field-name-keyed (see
        the key-dialect trap): its values win, falling back to the registry default.
        """
        basic = fields_for_section("basic")

        data_mode = basic["data_source_mode"]
        current_mode = WizardMixin._sanitize_data_source_mode(
            defaults.get("data_source_mode", data_mode.default)
        )
        # zip against exactly two labels so the UI never offers legacy "hybrid",
        # even though the registered enum carries it for REST round-tripping (OQ-6).
        assert data_mode.enum is not None  # data_source_mode always registers an enum
        mode_options = [
            selector.SelectOptionDict(value=value, label=label)
            for value, label in zip(
                data_mode.enum,
                (
                    "☁️ Cloud only",
                    "🏠 Local only (fallback na cloud při výpadku)",
                ),
            )
        ]

        return vol.Schema(
            {
                vol.Optional(
                    "standard_scan_interval",
                    default=defaults.get(
                        "standard_scan_interval",
                        basic["standard_scan_interval"].default,
                    ),
                ): int,
                vol.Optional(
                    "extended_scan_interval",
                    default=defaults.get(
                        "extended_scan_interval",
                        basic["extended_scan_interval"].default,
                    ),
                ): int,
                vol.Optional(
                    "data_source_mode", default=current_mode
                ): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=mode_options,
                        mode=selector.SelectSelectorMode.DROPDOWN,
                    )
                ),
                vol.Optional(
                    "local_proxy_stale_minutes",
                    default=defaults.get(
                        "local_proxy_stale_minutes",
                        basic["local_proxy_stale_minutes"].default,
                    ),
                ): int,
                vol.Optional(
                    "local_event_debounce_ms",
                    default=defaults.get(
                        "local_event_debounce_ms",
                        basic["local_event_debounce_ms"].default,
                    ),
                ): int,
                vol.Optional("go_back", default=False): bool,
            }
        )

    def _show_intervals_form(
        self,
        values: Optional[Dict[str, Any]] = None,
        errors: Optional[Dict[str, str]] = None,
    ) -> ConfigFlowResult:
        return self.async_show_form(
            step_id="wizard_intervals",
            data_schema=self._get_intervals_schema(values or self._wizard_data or {}),
            errors=errors,
            description_placeholders=self._get_step_placeholders("wizard_intervals"),
        )

    async def async_step_wizard_solar(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Wizard Step 4: Solar forecast configuration."""
        if user_input is not None:
            # Kontrola tlačítka "Zpět"
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_solar")

            if self._should_refresh_solar_form(user_input):
                return self._show_solar_form(user_input)

            errors = {}
            errors.update(self._validate_solar_provider(user_input))
            errors.update(self._validate_solar_coordinates(user_input))
            errors.update(self._validate_solar_strings(user_input))

            if errors:
                return self._show_solar_form(user_input, errors=errors)

            self._wizard_data.update(user_input)
            self._step_history.append("wizard_solar")

            next_step = self._get_next_step("wizard_solar")
            return await getattr(self, f"async_step_{next_step}")()

        return self.async_show_form(
            step_id="wizard_solar",
            data_schema=self._get_solar_schema(),
            description_placeholders=self._get_step_placeholders("wizard_solar"),
        )

    def _show_solar_form(
        self,
        user_input: Optional[Dict[str, Any]] = None,
        *,
        errors: Optional[Dict[str, str]] = None,
    ) -> ConfigFlowResult:
        return self.async_show_form(
            step_id="wizard_solar",
            data_schema=self._get_solar_schema(user_input),
            errors=errors,
            description_placeholders=self._get_step_placeholders("wizard_solar"),
        )

    def _should_refresh_solar_form(self, user_input: Dict[str, Any]) -> bool:
        old_string1_enabled = self._wizard_data.get(
            CONF_SOLAR_FORECAST_STRING1_ENABLED, True
        )
        old_string2_enabled = self._wizard_data.get(
            "solar_forecast_string2_enabled", False
        )
        new_string1_enabled = user_input.get(CONF_SOLAR_FORECAST_STRING1_ENABLED, False)
        new_string2_enabled = user_input.get("solar_forecast_string2_enabled", False)

        if (
            old_string1_enabled != new_string1_enabled
            or old_string2_enabled != new_string2_enabled
        ):
            self._wizard_data.update(user_input)
            return True
        return False

    def _validate_solar_provider(self, user_input: Dict[str, Any]) -> Dict[str, str]:
        # provider/mode/key AND no_strings_enabled now come from the single
        # shared rule set, so this surface can never drift from the REST POST
        # (U3). See config/solar_rules.py.
        return validate_solar_effective(user_input)

    def _validate_solar_coordinates(self, user_input: Dict[str, Any]) -> Dict[str, str]:
        errors: Dict[str, str] = {}
        try:
            lat = float(user_input.get(CONF_SOLAR_FORECAST_LATITUDE, 50.0))
            lon = float(user_input.get(CONF_SOLAR_FORECAST_LONGITUDE, 14.0))
            if not (-90 <= lat <= 90):
                errors[CONF_SOLAR_FORECAST_LATITUDE] = "invalid_latitude"
            if not (-180 <= lon <= 180):
                errors[CONF_SOLAR_FORECAST_LONGITUDE] = "invalid_longitude"
        except (ValueError, TypeError):
            errors["base"] = "invalid_coordinates"
        return errors

    def _validate_solar_strings(self, user_input: Dict[str, Any]) -> Dict[str, str]:
        # no_strings_enabled now comes from validate_solar_effective (via
        # _validate_solar_provider, called first at :1570). Only per-string
        # geometry stays here.
        errors: Dict[str, str] = {}
        if user_input.get(CONF_SOLAR_FORECAST_STRING1_ENABLED):
            errors.update(self._validate_solar_string1(user_input))
        if user_input.get("solar_forecast_string2_enabled"):
            errors.update(self._validate_solar_string2(user_input))
        return errors

    def _validate_solar_string1(self, user_input: Dict[str, Any]) -> Dict[str, str]:
        errors: Dict[str, str] = {}
        try:
            kwp1 = float(user_input.get(CONF_SOLAR_FORECAST_STRING1_KWP, 5.0))
            decl1 = int(user_input.get(CONF_SOLAR_FORECAST_STRING1_DECLINATION, 35))
            azim1 = normalize_azimuth(user_input.get(CONF_SOLAR_FORECAST_STRING1_AZIMUTH, 0))
            # Persist the normalised, signed azimuth so it matches the registry
            # bounds (-180..180) that REST and the schema enforce (U6).
            user_input[CONF_SOLAR_FORECAST_STRING1_AZIMUTH] = azim1

            if not (0 < kwp1 <= 15):
                errors[CONF_SOLAR_FORECAST_STRING1_KWP] = "invalid_kwp"
            if not (0 <= decl1 <= 90):
                errors[CONF_SOLAR_FORECAST_STRING1_DECLINATION] = "invalid_declination"
        except (ValueError, TypeError):
            errors["base"] = "invalid_string1_params"
        return errors

    def _validate_solar_string2(self, user_input: Dict[str, Any]) -> Dict[str, str]:
        errors: Dict[str, str] = {}
        try:
            kwp2 = float(user_input.get("solar_forecast_string2_kwp", 5.0))
            decl2 = int(user_input.get("solar_forecast_string2_declination", 35))
            azim2 = normalize_azimuth(user_input.get("solar_forecast_string2_azimuth", 180))
            # Persist the normalised, signed azimuth so it matches the registry
            # bounds (-180..180) that REST and the schema enforce (U6).
            user_input["solar_forecast_string2_azimuth"] = azim2

            if not (0 < kwp2 <= 15):
                errors["solar_forecast_string2_kwp"] = "invalid_kwp"
            if not (0 <= decl2 <= 90):
                errors["solar_forecast_string2_declination"] = "invalid_declination"
        except (ValueError, TypeError):
            errors["base"] = "invalid_string2_params"
        return errors

    def _get_hass_gps(self) -> tuple[Optional[float], Optional[float]]:
        """Read (latitude, longitude) from `hass.config`, or (None, None).

        Defensive against `self.hass` being unset or a minimal test double
        without `.config` -- both are real states (RCA-R4), not just test
        artifacts, so this must return empty rather than raise.
        """
        config = getattr(self.hass, "config", None)
        return getattr(config, "latitude", None), getattr(config, "longitude", None)

    @staticmethod
    def _gps_marker(key: str, default_value: Optional[float], suggested: Optional[float]) -> vol.Marker:
        """Build a GPS field marker: default only when a real value exists.

        Never fabricate a default (RCA-R4) -- an unresolved default renders
        the field genuinely empty instead of a plausible-looking coordinate.
        `suggested` is exposed separately via `description.suggested_value`
        so the FE can offer an explicit "Prevzit z Home Assistanta" action
        (UX-SPEC step-3) independent of which default won.
        """
        kwargs: Dict[str, Any] = {}
        if default_value is not None:
            kwargs["default"] = default_value
        if suggested is not None:
            kwargs["description"] = {"suggested_value": suggested}
        return vol.Optional(key, **kwargs)

    def _get_solar_schema(
        self, defaults: Optional[Dict[str, Any]] = None
    ) -> vol.Schema:
        """Get schema for solar forecast step."""
        if defaults is None:
            defaults = self._wizard_data if self._wizard_data else {}

        # RCA-R4: hass.config GPS is a fallback *default* (option -> hass ->
        # empty), never a fabricated Prague value -- and it is ALSO exposed
        # via description.suggested_value regardless of which default wins,
        # so the FE can offer an explicit "Prevzit z Home Assistanta" action
        # (UX-SPEC step-3) without ever silently overwriting a saved value.
        ha_latitude, ha_longitude = self._get_hass_gps()

        provider = defaults.get(CONF_SOLAR_FORECAST_PROVIDER, "forecast_solar")

        schema_fields = {
            vol.Optional(
                CONF_SOLAR_FORECAST_PROVIDER,
                default=provider,
            ): vol.In(
                {
                    "forecast_solar": "Forecast.Solar",
                    "solcast": "Solcast",
                }
            ),
            vol.Optional(
                "solar_forecast_mode",
                default=defaults.get("solar_forecast_mode", "daily_optimized"),
            ): vol.In(
                {
                    "daily_optimized": "🎯 Optimalizovaný (3× denně, ZDARMA)",
                    "daily": "🌅 Denní (1× denně, ZDARMA)",
                    "every_4h": "🕐 Každé 4 hodiny (vyžaduje API klíč)",
                    "hourly": "⚡ Každou hodinu (vyžaduje API klíč)",
                }
            ),
            self._gps_marker(
                CONF_SOLAR_FORECAST_LATITUDE,
                defaults.get(CONF_SOLAR_FORECAST_LATITUDE, ha_latitude),
                ha_latitude,
            ): vol.Coerce(float),
            self._gps_marker(
                CONF_SOLAR_FORECAST_LONGITUDE,
                defaults.get(CONF_SOLAR_FORECAST_LONGITUDE, ha_longitude),
                ha_longitude,
            ): vol.Coerce(float),
            vol.Optional(
                CONF_SOLAR_FORECAST_STRING1_ENABLED,
                default=defaults.get(CONF_SOLAR_FORECAST_STRING1_ENABLED, True),
            ): bool,
        }

        if provider == "forecast_solar":
            schema_fields[
                vol.Optional(
                    CONF_SOLAR_FORECAST_API_KEY,
                    default=defaults.get(CONF_SOLAR_FORECAST_API_KEY, ""),
                )
            ] = str
        else:
            schema_fields[
                vol.Optional(
                    CONF_SOLCAST_API_KEY,
                    default=defaults.get(CONF_SOLCAST_API_KEY, ""),
                )
            ] = str
            schema_fields[
                vol.Optional(
                    CONF_SOLCAST_SITE_ID,
                    default=defaults.get(CONF_SOLCAST_SITE_ID, ""),
                )
            ] = str

        # String 1 parametry - zobrazit jen když je povolen
        if defaults.get(CONF_SOLAR_FORECAST_STRING1_ENABLED, True):
            schema_fields.update(
                {
                    vol.Optional(
                        CONF_SOLAR_FORECAST_STRING1_KWP,
                        default=defaults.get(CONF_SOLAR_FORECAST_STRING1_KWP, 5.0),
                    ): vol.Coerce(float),
                    vol.Optional(
                        CONF_SOLAR_FORECAST_STRING1_DECLINATION,
                        default=defaults.get(
                            CONF_SOLAR_FORECAST_STRING1_DECLINATION, 35
                        ),
                    ): vol.Coerce(int),
                    vol.Optional(
                        CONF_SOLAR_FORECAST_STRING1_AZIMUTH,
                        default=defaults.get(CONF_SOLAR_FORECAST_STRING1_AZIMUTH, 0),
                    ): vol.Coerce(int),
                }
            )

        # String 2 checkbox
        schema_fields[
            vol.Optional(
                "solar_forecast_string2_enabled",
                default=defaults.get("solar_forecast_string2_enabled", False),
            )
        ] = bool

        # String 2 parametry - zobrazit jen když je povolen
        if defaults.get("solar_forecast_string2_enabled", False):
            schema_fields.update(
                {
                    vol.Optional(
                        "solar_forecast_string2_kwp",
                        default=defaults.get("solar_forecast_string2_kwp", 5.0),
                    ): vol.Coerce(float),
                    vol.Optional(
                        "solar_forecast_string2_declination",
                        default=defaults.get("solar_forecast_string2_declination", 35),
                    ): vol.Coerce(int),
                    vol.Optional(
                        "solar_forecast_string2_azimuth",
                        default=defaults.get("solar_forecast_string2_azimuth", 180),
                    ): vol.Coerce(int),
                }
            )

        # Přidat go_back na konec
        schema_fields[vol.Optional("go_back", default=False)] = bool

        return vol.Schema(schema_fields)

    def _validate_battery_config(self, user_input: Dict[str, Any]) -> Dict[str, str]:
        """Validate battery configuration inputs (slimmed form)."""
        errors: Dict[str, str] = {}

        charge_rate_kw = user_input.get(CONF_CHARGE_RATE_KW, DEFAULT_CHARGE_RATE_KW)
        if charge_rate_kw < 0.5 or charge_rate_kw > 10.0:
            errors[CONF_CHARGE_RATE_KW] = "invalid_charge_rate_kw"

        pct = user_input.get("expensive_percentile_pct", 70)
        try:
            pct = float(pct)
        except (TypeError, ValueError):
            pct = 70.0
        if pct < 50 or pct > 95:
            errors["expensive_percentile_pct"] = "invalid_percentile"

        return errors

    async def async_step_wizard_battery(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Wizard Step 5: Battery prediction configuration."""
        if user_input is not None:
            # Kontrola tlačítka "Zpět"
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_battery")

            errors = self._validate_battery_config(user_input)

            if errors:
                return self.async_show_form(
                    step_id="wizard_battery",
                    data_schema=self._get_battery_schema(user_input),
                    errors=errors,
                    description_placeholders=self._get_step_placeholders(
                        "wizard_battery"
                    ),
                )

            self._wizard_data.update(user_input)
            self._step_history.append("wizard_battery")

            next_step = self._get_next_step("wizard_battery")
            return await getattr(self, f"async_step_{next_step}")()

        return self.async_show_form(
            step_id="wizard_battery",
            data_schema=self._get_battery_schema(),
            description_placeholders=self._get_step_placeholders("wizard_battery"),
        )

    def _get_battery_schema(
        self, defaults: Optional[Dict[str, Any]] = None
    ) -> vol.Schema:
        """Schema for the battery planner step.

        Slimmed to the parameters the live planner actually reads. Legacy
        fields (min/target capacity, planning-min guard, max UPS price,
        hysteresis, hw-min hold) were dead after the 2026-06 planner redesign
        (hard 20% HW floor + dynamic target + cost-gated displacement) and
        only confused users; their option keys keep defaults for back-compat.
        """
        if defaults is None:
            defaults = self._wizard_data if self._wizard_data else {}

        schema_fields = {
            vol.Optional(
                CONF_AUTO_MODE_SWITCH,
                default=defaults.get(CONF_AUTO_MODE_SWITCH, False),
            ): bool,
            vol.Optional(
                CONF_CHARGE_RATE_KW,
                default=defaults.get(
                    CONF_CHARGE_RATE_KW,
                    defaults.get("home_charge_rate", DEFAULT_CHARGE_RATE_KW),
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0.5,
                    max=10.0,
                    step=0.1,
                    mode=selector.NumberSelectorMode.BOX,
                )
            ),
            # Displacement threshold: imports priced above this per-day
            # percentile are candidates for cheap pre-charging.
            vol.Optional(
                "expensive_percentile_pct",
                default=int(
                    round(float(defaults.get("expensive_percentile", 0.70)) * 100)
                ),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=50, max=95, step=5, mode=selector.NumberSelectorMode.SLIDER
                )
            ),
            # BATTERY BALANCING PARAMETERS
            vol.Optional(
                "balancing_enabled",
                default=defaults.get("balancing_enabled", True),
            ): selector.BooleanSelector(),
            vol.Optional(
                "balancing_interval_days",
                default=defaults.get("balancing_interval_days", 7),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=3, max=30, step=1, mode=selector.NumberSelectorMode.BOX
                )
            ),
            vol.Optional(
                "balancing_hold_hours",
                default=defaults.get("balancing_hold_hours", 3),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=1, max=12, step=1, mode=selector.NumberSelectorMode.BOX
                )
            ),
            vol.Optional(
                "balancing_opportunistic_threshold",
                default=defaults.get("balancing_opportunistic_threshold", 1.1),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0.5, max=5.0, step=0.1, mode=selector.NumberSelectorMode.BOX
                )
            ),
            vol.Optional(
                "balancing_economic_threshold",
                default=defaults.get("balancing_economic_threshold", 2.5),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=0.5, max=10.0, step=0.1, mode=selector.NumberSelectorMode.BOX
                )
            ),
            # Used by balancer window selection
            vol.Optional(
                "cheap_window_percentile",
                default=defaults.get("cheap_window_percentile", 30),
            ): selector.NumberSelector(
                selector.NumberSelectorConfig(
                    min=5, max=80, step=1, mode=selector.NumberSelectorMode.BOX
                )
            ),
        }

        # Přidat go_back na konec
        schema_fields[vol.Optional("go_back", default=False)] = (
            selector.BooleanSelector()
        )

        return vol.Schema(schema_fields)

    async def async_step_wizard_pricing_import(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Wizard Step 6a: Import (purchase) pricing configuration."""
        if user_input is not None:
            return await self._handle_pricing_flow(
                user_input,
                step_id="wizard_pricing_import",
                scenario_key="import_pricing_scenario",
                schema_builder=self._get_pricing_import_schema,
                validator=self._validate_import_pricing,
                default_scenario="spot_percentage",
            )

        return self.async_show_form(
            step_id="wizard_pricing_import",
            data_schema=self._get_pricing_import_schema(),
            description_placeholders=self._get_step_placeholders(
                "wizard_pricing_import"
            ),
        )

    def _get_pricing_import_schema(
        self, defaults: Optional[Dict[str, Any]] = None
    ) -> vol.Schema:
        """Get schema for import pricing step."""
        if defaults is None:
            defaults = self._wizard_data if self._wizard_data else {}

        scenario = defaults.get("import_pricing_scenario", "spot_percentage")

        schema_fields: Dict[vol.Optional, Any] = {
            vol.Optional("import_pricing_scenario", default=scenario): vol.In(
                {
                    "spot_percentage": "💰 SPOT + procento",
                    "spot_fixed": "💵 SPOT + fixní poplatek",
                    "fix_price": "🔒 FIX cena",
                }
            ),
        }

        # Conditional fields based on scenario
        if scenario == "spot_percentage":
            schema_fields[
                vol.Optional(
                    "spot_positive_fee_percent",
                    default=defaults.get("spot_positive_fee_percent", 15.0),
                )
            ] = vol.All(vol.Coerce(float), vol.Range(min=0.1, max=100.0))
            schema_fields[
                vol.Optional(
                    "spot_negative_fee_percent",
                    default=defaults.get("spot_negative_fee_percent", 9.0),
                )
            ] = vol.All(vol.Coerce(float), vol.Range(min=0.1, max=100.0))
        elif scenario == "spot_fixed":
            schema_fields[
                vol.Optional(
                    "spot_fixed_fee_kwh",
                    default=defaults.get("spot_fixed_fee_kwh", 0.50),
                )
            ] = vol.All(vol.Coerce(float), vol.Range(min=0.01, max=10.0))
        elif scenario == "fix_price":
            schema_fields[
                vol.Optional(
                    "fixed_price_kwh",
                    default=defaults.get("fixed_price_kwh", 4.50),
                )
            ] = vol.All(vol.Coerce(float), vol.Range(min=0.1, max=20.0))

        schema_fields[vol.Optional("go_back", default=False)] = bool

        return vol.Schema(schema_fields)

    async def async_step_wizard_pricing_export(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Wizard Step 6b: Export (sell) pricing configuration."""
        if user_input is not None:
            return await self._handle_pricing_flow(
                user_input,
                step_id="wizard_pricing_export",
                scenario_key="export_pricing_scenario",
                schema_builder=self._get_pricing_export_schema,
                validator=self._validate_export_pricing,
                default_scenario="spot_percentage",
            )

        return self.async_show_form(
            step_id="wizard_pricing_export",
            data_schema=self._get_pricing_export_schema(),
            description_placeholders=self._get_step_placeholders(
                "wizard_pricing_export"
            ),
        )

    def _get_pricing_export_schema(
        self, defaults: Optional[Dict[str, Any]] = None
    ) -> vol.Schema:
        """Get schema for export pricing step."""
        if defaults is None:
            defaults = self._wizard_data if self._wizard_data else {}

        scenario = defaults.get("export_pricing_scenario", "spot_percentage")

        schema_fields: Dict[vol.Optional, Any] = {
            vol.Optional("export_pricing_scenario", default=scenario): vol.In(
                {
                    "spot_percentage": "💰 SPOT - procento",
                    "spot_fixed": "💵 SPOT - fixní srážka",
                    "fix_price": "🔒 FIX cena",
                }
            ),
        }

        # Conditional fields based on scenario
        if scenario == "spot_percentage":
            schema_fields[
                vol.Optional(
                    "export_fee_percent",
                    default=defaults.get("export_fee_percent", 15.0),
                )
            ] = vol.All(vol.Coerce(float), vol.Range(min=0.0, max=50.0))
        elif scenario == "spot_fixed":
            schema_fields[
                vol.Optional(
                    "export_fixed_fee_czk",
                    default=defaults.get("export_fixed_fee_czk", 0.20),
                )
            ] = vol.All(vol.Coerce(float), vol.Range(min=0.0, max=5.0))
        elif scenario == "fix_price":
            schema_fields[
                vol.Optional(
                    "export_fixed_price_kwh",
                    default=defaults.get("export_fixed_price_kwh", 2.50),
                )
            ] = vol.All(vol.Coerce(float), vol.Range(min=0.0, max=10.0))

        schema_fields[vol.Optional("go_back", default=False)] = bool

        return vol.Schema(schema_fields)

    async def _handle_pricing_flow(
        self,
        user_input: Dict[str, Any],
        *,
        step_id: str,
        scenario_key: str,
        schema_builder,
        validator,
        default_scenario: str,
    ) -> ConfigFlowResult:
        if user_input.get("go_back", False):
            return await self._handle_back_button(step_id)

        old_scenario = self._wizard_data.get(scenario_key, default_scenario)
        new_scenario = user_input.get(scenario_key, default_scenario)

        if old_scenario != new_scenario:
            self._wizard_data.update(user_input)
            return self.async_show_form(
                step_id=step_id,
                data_schema=schema_builder(user_input),
                description_placeholders=self._get_step_placeholders(step_id),
            )

        errors = validator(user_input)
        if errors:
            return self.async_show_form(
                step_id=step_id,
                data_schema=schema_builder(user_input),
                errors=errors,
                description_placeholders=self._get_step_placeholders(step_id),
            )

        self._wizard_data.update(user_input)
        self._step_history.append(step_id)
        next_step = self._get_next_step(step_id)
        return await getattr(self, f"async_step_{next_step}")()

    @staticmethod
    def _validate_import_pricing(user_input: Dict[str, Any]) -> Dict[str, str]:
        errors: Dict[str, str] = {}
        scenario = user_input.get("import_pricing_scenario", "spot_percentage")

        if scenario == "spot_percentage":
            pos_fee = user_input.get("spot_positive_fee_percent", 15.0)
            neg_fee = user_input.get("spot_negative_fee_percent", 9.0)
            if pos_fee < 0.1 or pos_fee > 100:
                errors["spot_positive_fee_percent"] = "invalid_percentage"
            if neg_fee < 0.1 or neg_fee > 100:
                errors["spot_negative_fee_percent"] = "invalid_percentage"
        elif scenario == "spot_fixed":
            fee = user_input.get("spot_fixed_fee_kwh", 0.50)
            if fee < 0.01 or fee > 10:
                errors["spot_fixed_fee_kwh"] = "invalid_fee"
        elif scenario == "fix_price":
            price = user_input.get("fixed_price_kwh", 4.50)
            if price < 0.1 or price > 20:
                errors["fixed_price_kwh"] = "invalid_price"

        return errors

    @staticmethod
    def _validate_export_pricing(user_input: Dict[str, Any]) -> Dict[str, str]:
        errors: Dict[str, str] = {}
        scenario = user_input.get("export_pricing_scenario", "spot_percentage")

        if scenario == "spot_percentage":
            fee = user_input.get("export_fee_percent", 15.0)
            if fee < 0 or fee > 50:
                errors["export_fee_percent"] = "invalid_percentage"
        elif scenario == "spot_fixed":
            fee = user_input.get("export_fixed_fee_czk", 0.20)
            if fee < 0 or fee > 5:
                errors["export_fixed_fee_czk"] = "invalid_fee"
        elif scenario == "fix_price":
            price = user_input.get("export_fixed_price_kwh", 2.50)
            if price < 0 or price > 10:
                errors["export_fixed_price_kwh"] = "invalid_price"

        return errors

    async def async_step_wizard_pricing_distribution(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Wizard Step 6c: Distribution fees, VT/NT hours, and VAT."""
        if user_input is not None:
            # Kontrola tlačítka "Zpět"
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_pricing_distribution")

            if self._should_refresh_distribution_form(user_input):
                self._wizard_data.update(user_input)
                return self.async_show_form(
                    step_id="wizard_pricing_distribution",
                    data_schema=self._get_pricing_distribution_schema(user_input),
                    description_placeholders=self._get_step_placeholders(
                        "wizard_pricing_distribution"
                    ),
                )

            errors = self._validate_pricing_distribution(user_input)
            if errors:
                return self.async_show_form(
                    step_id="wizard_pricing_distribution",
                    data_schema=self._get_pricing_distribution_schema(user_input),
                    errors=errors,
                    description_placeholders=self._get_step_placeholders(
                        "wizard_pricing_distribution"
                    ),
                )

            self._wizard_data.update(user_input)
            self._step_history.append("wizard_pricing_distribution")

            next_step = self._get_next_step("wizard_pricing_distribution")
            return await getattr(self, f"async_step_{next_step}")()

        return self.async_show_form(
            step_id="wizard_pricing_distribution",
            data_schema=self._get_pricing_distribution_schema(),
            description_placeholders=self._get_step_placeholders(
                "wizard_pricing_distribution"
            ),
        )

    def _should_refresh_distribution_form(self, user_input: Dict[str, Any]) -> bool:
        old_tariff_count = self._wizard_data.get("tariff_count", "single")
        new_tariff_count = user_input.get("tariff_count", "single")
        if old_tariff_count != new_tariff_count:
            return True

        return False

    def _validate_pricing_distribution(
        self, user_input: Dict[str, Any]
    ) -> Dict[str, str]:
        errors: Dict[str, str] = {}

        dist_vt = user_input.get("distribution_fee_vt_kwh", 1.42)
        if dist_vt < 0 or dist_vt > 10:
            errors["distribution_fee_vt_kwh"] = "invalid_distribution_fee"

        tariff_count = user_input.get("tariff_count", "single")
        if tariff_count == "dual":
            self._validate_dual_tariff_distribution(user_input, errors)

        vat = user_input.get("vat_rate", 21.0)
        if vat < 0 or vat > 30:
            errors["vat_rate"] = "invalid_vat"

        return errors

    def _validate_dual_tariff_distribution(
        self, user_input: Dict[str, Any], errors: Dict[str, str]
    ) -> None:
        dist_nt = user_input.get("distribution_fee_nt_kwh", 0.91)
        if dist_nt < 0 or dist_nt > 10:
            errors["distribution_fee_nt_kwh"] = "invalid_distribution_fee"

        if self._wizard_data.get("import_pricing_scenario") == "fix_price":
            fixed_vt = user_input.get(
                "fixed_price_vt_kwh", self._wizard_data.get("fixed_price_kwh")
            )
            fixed_nt = user_input.get(
                "fixed_price_nt_kwh", self._wizard_data.get("fixed_price_kwh")
            )
            if fixed_vt is None or fixed_vt < 0.1 or fixed_vt > 20:
                errors["fixed_price_vt_kwh"] = "invalid_price"
            if fixed_nt is None or fixed_nt < 0.1 or fixed_nt > 20:
                errors["fixed_price_nt_kwh"] = "invalid_price"

        vt_starts = user_input.get("tariff_vt_start_weekday", "6")
        nt_starts = user_input.get("tariff_nt_start_weekday", "22,2")
        is_valid, error_key = validate_tariff_hours(vt_starts, nt_starts)
        if not is_valid and error_key is not None:
            errors["tariff_vt_start_weekday"] = error_key

        vt_weekend = user_input.get("tariff_vt_start_weekend", vt_starts)
        nt_weekend = user_input.get("tariff_nt_start_weekend", nt_starts)
        is_valid, error_key = validate_tariff_hours(
            vt_weekend, nt_weekend, allow_single_tariff=True
        )
        if not is_valid and error_key is not None:
            errors["tariff_vt_start_weekend"] = error_key

    def _get_pricing_distribution_schema(
        self, defaults: Optional[Dict[str, Any]] = None
    ) -> vol.Schema:
        """Get schema for distribution/VAT step."""
        if defaults is None:
            defaults = self._wizard_data if self._wizard_data else {}

        tariff_count = defaults.get("tariff_count", "single")
        weekday_vt_default = defaults.get("tariff_vt_start_weekday", "6")
        weekday_nt_default = defaults.get("tariff_nt_start_weekday", "22,2")
        weekend_vt_default = defaults.get("tariff_vt_start_weekend", weekday_vt_default)
        weekend_nt_default = defaults.get("tariff_nt_start_weekend", weekday_nt_default)

        schema_fields = {
            vol.Optional("tariff_count", default=tariff_count): vol.In(
                {
                    "single": "📊 Jeden tarif (VT)",
                    "dual": "📊 Dva tarify (VT + NT)",
                }
            ),
            vol.Optional(
                "distribution_fee_vt_kwh",
                default=defaults.get("distribution_fee_vt_kwh", 1.42),
            ): vol.All(vol.Coerce(float), vol.Range(min=0.0, max=10.0)),
        }

        # Pokud dual tariff, přidat NT poplatek a hodiny
        if tariff_count == "dual":
            schema_fields.update(
                {
                    vol.Optional(
                        "distribution_fee_nt_kwh",
                        default=defaults.get("distribution_fee_nt_kwh", 0.91),
                    ): vol.All(vol.Coerce(float), vol.Range(min=0.0, max=10.0)),
                    vol.Optional(
                        "tariff_vt_start_weekday",
                        default=weekday_vt_default,
                    ): str,
                    vol.Optional(
                        "tariff_nt_start_weekday",
                        default=weekday_nt_default,
                    ): str,
                    vol.Optional(
                        "tariff_vt_start_weekend",
                        default=weekend_vt_default,
                    ): str,
                    vol.Optional(
                        "tariff_nt_start_weekend",
                        default=weekend_nt_default,
                    ): str,
                }
            )
            if defaults.get("import_pricing_scenario") == "fix_price":
                default_fixed_price = defaults.get("fixed_price_kwh", 4.50)
                schema_fields.update(
                    {
                        vol.Optional(
                            "fixed_price_vt_kwh",
                            default=defaults.get(
                                "fixed_price_vt_kwh", default_fixed_price
                            ),
                        ): vol.All(vol.Coerce(float), vol.Range(min=0.1, max=20.0)),
                        vol.Optional(
                            "fixed_price_nt_kwh",
                            default=defaults.get(
                                "fixed_price_nt_kwh", default_fixed_price
                            ),
                        ): vol.All(vol.Coerce(float), vol.Range(min=0.1, max=20.0)),
                    }
                )

        schema_fields.update(
            {
                vol.Optional(
                    "vat_rate", default=defaults.get("vat_rate", 21.0)
                ): vol.All(vol.Coerce(float), vol.Range(min=0.0, max=30.0)),
                vol.Optional("go_back", default=False): bool,
            }
        )

        return vol.Schema(schema_fields)

    async def async_step_wizard_boiler(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Wizard Step: Boiler module configuration."""
        from ..const import (
            CONF_BOILER_ALT_COST_KWH,
            CONF_BOILER_ALT_ENERGY_SENSOR,
            CONF_BOILER_ALT_HEATER_SWITCH_ENTITY,
            CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
            CONF_BOILER_COLD_INLET_TEMP_C,
            CONF_BOILER_DEADLINE_TIME,
            CONF_BOILER_HEATER_POWER_KW_ENTITY,
            CONF_BOILER_HEATER_SWITCH_ENTITY,
            CONF_BOILER_SPOT_PRICE_SENSOR,
            CONF_BOILER_STRATIFICATION_MODE,
            CONF_BOILER_TARGET_TEMP_C,
            CONF_BOILER_TEMP_SENSOR_BOTTOM,
            CONF_BOILER_TEMP_SENSOR_POSITION,
            CONF_BOILER_TEMP_SENSOR_TOP,
            CONF_BOILER_TWO_ZONE_SPLIT_RATIO,
            CONF_BOILER_VOLUME_L,
            DEFAULT_BOILER_COLD_INLET_TEMP_C,
            DEFAULT_BOILER_DEADLINE_TIME,
            DEFAULT_BOILER_STRATIFICATION_MODE,
            DEFAULT_BOILER_TARGET_TEMP_C,
            DEFAULT_BOILER_TEMP_SENSOR_POSITION,
            DEFAULT_BOILER_TWO_ZONE_SPLIT_RATIO,
        )

        if user_input is not None:
            # Kontrola tlačítka "Zpět"
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_boiler")

            errors = self._validate_boiler_topology(user_input)
            if errors:
                defaults = self._wizard_data if self._wizard_data else {}
                return self.async_show_form(
                    step_id="wizard_boiler",
                    data_schema=vol.Schema(
                        {
                            vol.Required(
                                CONF_BOILER_VOLUME_L,
                                default=defaults.get(CONF_BOILER_VOLUME_L, 120),
                            ): selector.NumberSelector(
                                selector.NumberSelectorConfig(
                                    min=10, max=500, step=1, mode=selector.NumberSelectorMode.BOX
                                )
                            ),
                            vol.Optional(
                                CONF_BOILER_TARGET_TEMP_C,
                                default=defaults.get(
                                    CONF_BOILER_TARGET_TEMP_C, DEFAULT_BOILER_TARGET_TEMP_C
                                ),
                            ): selector.NumberSelector(
                                selector.NumberSelectorConfig(
                                    min=30, max=90, step=1, mode=selector.NumberSelectorMode.BOX
                                )
                            ),
                            vol.Optional(
                                CONF_BOILER_COLD_INLET_TEMP_C,
                                default=defaults.get(
                                    CONF_BOILER_COLD_INLET_TEMP_C,
                                    DEFAULT_BOILER_COLD_INLET_TEMP_C,
                                ),
                            ): selector.NumberSelector(
                                selector.NumberSelectorConfig(
                                    min=0, max=30, step=1, mode=selector.NumberSelectorMode.BOX
                                )
                            ),
                            vol.Optional(
                                CONF_BOILER_TEMP_SENSOR_TOP,
                                default=defaults.get(CONF_BOILER_TEMP_SENSOR_TOP, ""),
                            ): selector.EntitySelector(
                                selector.EntitySelectorConfig(
                                    domain="sensor", device_class="temperature"
                                )
                            ),
                            vol.Optional(
                                CONF_BOILER_TEMP_SENSOR_BOTTOM,
                                default=defaults.get(CONF_BOILER_TEMP_SENSOR_BOTTOM, ""),
                            ): selector.EntitySelector(
                                selector.EntitySelectorConfig(
                                    domain="sensor", device_class="temperature"
                                )
                            ),
                            vol.Optional(
                                CONF_BOILER_TEMP_SENSOR_POSITION,
                                default=defaults.get(
                                    CONF_BOILER_TEMP_SENSOR_POSITION,
                                    DEFAULT_BOILER_TEMP_SENSOR_POSITION,
                                ),
                            ): selector.SelectSelector(
                                selector.SelectSelectorConfig(
                                    options=[
                                        selector.SelectOptionDict(
                                            value="top", label="Přímo nahoře (100%)"
                                        ),
                                        selector.SelectOptionDict(
                                            value="upper_quarter",
                                            label="Horní čtvrtina (75%)",
                                        ),
                                        selector.SelectOptionDict(
                                            value="middle", label="Polovina (50%)"
                                        ),
                                        selector.SelectOptionDict(
                                            value="lower_quarter",
                                            label="Dolní čtvrtina (25%)",
                                        ),
                                    ],
                                    mode=selector.SelectSelectorMode.DROPDOWN,
                                )
                            ),
                            vol.Optional(
                                CONF_BOILER_STRATIFICATION_MODE,
                                default=defaults.get(
                                    CONF_BOILER_STRATIFICATION_MODE,
                                    DEFAULT_BOILER_STRATIFICATION_MODE,
                                ),
                            ): selector.SelectSelector(
                                selector.SelectSelectorConfig(
                                    options=["simple_avg", "two_zone"],
                                    mode=selector.SelectSelectorMode.DROPDOWN,
                                )
                            ),
                            vol.Optional(
                                CONF_BOILER_TWO_ZONE_SPLIT_RATIO,
                                default=defaults.get(
                                    CONF_BOILER_TWO_ZONE_SPLIT_RATIO,
                                    DEFAULT_BOILER_TWO_ZONE_SPLIT_RATIO,
                                ),
                            ): selector.NumberSelector(
                                selector.NumberSelectorConfig(
                                    min=0.1,
                                    max=0.9,
                                    step=0.1,
                                    mode=selector.NumberSelectorMode.BOX,
                                )
                            ),
                            vol.Optional(
                                CONF_BOILER_HEATER_POWER_KW_ENTITY,
                                default=defaults.get(
                                    CONF_BOILER_HEATER_POWER_KW_ENTITY,
                                    "",
                                ),
                            ): selector.EntitySelector(
                                selector.EntitySelectorConfig(domain="sensor")
                            ),
                            vol.Optional(
                                CONF_BOILER_HEATER_SWITCH_ENTITY,
                                default=defaults.get(CONF_BOILER_HEATER_SWITCH_ENTITY, ""),
                            ): selector.EntitySelector(
                                selector.EntitySelectorConfig(domain="switch")
                            ),
                            vol.Optional(
                                CONF_BOILER_ALT_HEATER_SWITCH_ENTITY,
                                default=defaults.get(CONF_BOILER_ALT_HEATER_SWITCH_ENTITY, ""),
                            ): selector.EntitySelector(
                                selector.EntitySelectorConfig(domain="switch")
                            ),
                            vol.Optional(
                                CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
                                default=defaults.get(
                                    CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY, ""
                                ),
                            ): selector.EntitySelector(
                                selector.EntitySelectorConfig(domain="switch")
                            ),
                            vol.Optional(
                                CONF_BOILER_ALT_COST_KWH,
                                default=defaults.get(CONF_BOILER_ALT_COST_KWH, 0.0),
                            ): selector.NumberSelector(
                                selector.NumberSelectorConfig(
                                    min=0,
                                    max=50,
                                    step=0.1,
                                    mode=selector.NumberSelectorMode.BOX,
                                )
                            ),
                            vol.Optional(
                                CONF_BOILER_ALT_ENERGY_SENSOR,
                                default=defaults.get(CONF_BOILER_ALT_ENERGY_SENSOR, ""),
                            ): selector.EntitySelector(
                                selector.EntitySelectorConfig(
                                    domain="sensor", device_class="energy"
                                )
                            ),
                            vol.Optional(
                                CONF_BOILER_SPOT_PRICE_SENSOR,
                                default=defaults.get(CONF_BOILER_SPOT_PRICE_SENSOR, ""),
                            ): selector.EntitySelector(
                                selector.EntitySelectorConfig(domain="sensor")
                            ),
                            vol.Optional(
                                CONF_BOILER_DEADLINE_TIME,
                                default=defaults.get(
                                    CONF_BOILER_DEADLINE_TIME, DEFAULT_BOILER_DEADLINE_TIME
                                ),
                            ): selector.TimeSelector(),
                            vol.Optional("go_back", default=False): selector.BooleanSelector(),
                        }
                    ),
                    errors=errors,
                    description_placeholders=self._get_step_placeholders("wizard_boiler"),
                )

            self._wizard_data.update(user_input)
            self._wizard_data["boiler_setup_complete"] = True
            self._step_history.append("wizard_boiler")

            next_step = self._get_next_step("wizard_boiler")
            return await getattr(self, f"async_step_{next_step}")()

        # Defaults from wizard_data or constants
        defaults = self._wizard_data if self._wizard_data else {}

        return self.async_show_form(
            step_id="wizard_boiler",
            data_schema=vol.Schema(
                {
                    # Nádrž - number inputy místo sliderů
                    vol.Required(
                        CONF_BOILER_VOLUME_L,
                        default=defaults.get(CONF_BOILER_VOLUME_L, 120),
                    ): selector.NumberSelector(
                        selector.NumberSelectorConfig(
                            min=10,
                            max=500,
                            step=1,
                            mode=selector.NumberSelectorMode.BOX,
                        )
                    ),
                    vol.Optional(
                        CONF_BOILER_TARGET_TEMP_C,
                        default=defaults.get(
                            CONF_BOILER_TARGET_TEMP_C, DEFAULT_BOILER_TARGET_TEMP_C
                        ),
                    ): selector.NumberSelector(
                        selector.NumberSelectorConfig(
                            min=30, max=90, step=1, mode=selector.NumberSelectorMode.BOX
                        )
                    ),
                    vol.Optional(
                        CONF_BOILER_COLD_INLET_TEMP_C,
                        default=defaults.get(
                            CONF_BOILER_COLD_INLET_TEMP_C,
                            DEFAULT_BOILER_COLD_INLET_TEMP_C,
                        ),
                    ): selector.NumberSelector(
                        selector.NumberSelectorConfig(
                            min=0, max=30, step=1, mode=selector.NumberSelectorMode.BOX
                        )
                    ),
                    # Teplotní senzory - entity selector s filtrem pro temperature
                    vol.Optional(
                        CONF_BOILER_TEMP_SENSOR_TOP,
                        default=defaults.get(CONF_BOILER_TEMP_SENSOR_TOP, ""),
                    ): selector.EntitySelector(
                        selector.EntitySelectorConfig(
                            domain="sensor", device_class="temperature"
                        )
                    ),
                    vol.Optional(
                        CONF_BOILER_TEMP_SENSOR_BOTTOM,
                        default=defaults.get(CONF_BOILER_TEMP_SENSOR_BOTTOM, ""),
                    ): selector.EntitySelector(
                        selector.EntitySelectorConfig(
                            domain="sensor", device_class="temperature"
                        )
                    ),
                    # NEW: Pozice senzoru (jen když nemá dolní senzor)
                    vol.Optional(
                        CONF_BOILER_TEMP_SENSOR_POSITION,
                        default=defaults.get(
                            CONF_BOILER_TEMP_SENSOR_POSITION,
                            DEFAULT_BOILER_TEMP_SENSOR_POSITION,
                        ),
                    ): selector.SelectSelector(
                        selector.SelectSelectorConfig(
                            options=[
                                selector.SelectOptionDict(
                                    value="top", label="Přímo nahoře (100%)"
                                ),
                                selector.SelectOptionDict(
                                    value="upper_quarter",
                                    label="Horní čtvrtina (75%)",
                                ),
                                selector.SelectOptionDict(
                                    value="middle", label="Polovina (50%)"
                                ),
                                selector.SelectOptionDict(
                                    value="lower_quarter",
                                    label="Dolní čtvrtina (25%)",
                                ),
                            ],
                            mode=selector.SelectSelectorMode.DROPDOWN,
                        )
                    ),
                    vol.Optional(
                        CONF_BOILER_STRATIFICATION_MODE,
                        default=defaults.get(
                            CONF_BOILER_STRATIFICATION_MODE,
                            DEFAULT_BOILER_STRATIFICATION_MODE,
                        ),
                    ): selector.SelectSelector(
                        selector.SelectSelectorConfig(
                            options=["simple_avg", "two_zone"],
                            mode=selector.SelectSelectorMode.DROPDOWN,
                        )
                    ),
                    vol.Optional(
                        CONF_BOILER_TWO_ZONE_SPLIT_RATIO,
                        default=defaults.get(
                            CONF_BOILER_TWO_ZONE_SPLIT_RATIO,
                            DEFAULT_BOILER_TWO_ZONE_SPLIT_RATIO,
                        ),
                    ): selector.NumberSelector(
                        selector.NumberSelectorConfig(
                            min=0.1,
                            max=0.9,
                            step=0.1,
                            mode=selector.NumberSelectorMode.BOX,
                        )
                    ),
                    # Výkon a řízení - entity selektory
                    vol.Optional(
                        CONF_BOILER_HEATER_POWER_KW_ENTITY,
                        default=defaults.get(
                            CONF_BOILER_HEATER_POWER_KW_ENTITY,
                            "",
                        ),
                    ): selector.EntitySelector(
                        selector.EntitySelectorConfig(domain="sensor")
                    ),
                    vol.Optional(
                        CONF_BOILER_HEATER_SWITCH_ENTITY,
                        default=defaults.get(CONF_BOILER_HEATER_SWITCH_ENTITY, ""),
                    ): selector.EntitySelector(
                        selector.EntitySelectorConfig(domain="switch")
                    ),
                    vol.Optional(
                        CONF_BOILER_ALT_HEATER_SWITCH_ENTITY,
                        default=defaults.get(CONF_BOILER_ALT_HEATER_SWITCH_ENTITY, ""),
                    ): selector.EntitySelector(
                        selector.EntitySelectorConfig(domain="switch")
                    ),
                    vol.Optional(
                        CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY,
                        default=defaults.get(
                            CONF_BOILER_CIRCULATION_PUMP_SWITCH_ENTITY, ""
                        ),
                    ): selector.EntitySelector(
                        selector.EntitySelectorConfig(domain="switch")
                    ),
                    vol.Optional(
                        CONF_BOILER_ALT_COST_KWH,
                        default=defaults.get(CONF_BOILER_ALT_COST_KWH, 0.0),
                    ): selector.NumberSelector(
                        selector.NumberSelectorConfig(
                            min=0,
                            max=50,
                            step=0.1,
                            mode=selector.NumberSelectorMode.BOX,
                        )
                    ),
                    # NEW: Senzor pro měření alternativní energie
                    vol.Optional(
                        CONF_BOILER_ALT_ENERGY_SENSOR,
                        default=defaults.get(CONF_BOILER_ALT_ENERGY_SENSOR, ""),
                    ): selector.EntitySelector(
                        selector.EntitySelectorConfig(
                            domain="sensor", device_class="energy"
                        )
                    ),
                    # Cenový senzor - auto-discovery pro OIG spot price
                    vol.Optional(
                        CONF_BOILER_SPOT_PRICE_SENSOR,
                        default=defaults.get(CONF_BOILER_SPOT_PRICE_SENSOR, ""),
                    ): selector.EntitySelector(
                        selector.EntitySelectorConfig(domain="sensor")
                    ),
                    vol.Optional(
                        CONF_BOILER_DEADLINE_TIME,
                        default=defaults.get(
                            CONF_BOILER_DEADLINE_TIME, DEFAULT_BOILER_DEADLINE_TIME
                        ),
                    ): selector.TimeSelector(),
                    vol.Optional("go_back", default=False): selector.BooleanSelector(),
                }
            ),
            description_placeholders=self._get_step_placeholders("wizard_boiler"),
        )

    async def async_step_wizard_boiler_simple_1(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_boiler_simple_1")
            errors = validate_boiler_simple_1(user_input)
            if errors:
                return self.async_show_form(
                    step_id="wizard_boiler_simple_1",
                    data_schema=get_boiler_simple_1_schema(user_input),
                    errors=errors,
                    description_placeholders=self._get_step_placeholders(
                        "wizard_boiler_simple_1"
                    ),
                )
            self._wizard_data.update(user_input)
            if "boiler_setup_mode" not in self._wizard_data:
                self._wizard_data["boiler_setup_mode"] = "simple"
            self._step_history.append("wizard_boiler_simple_1")
            if self._wizard_data.get("boiler_setup_mode") == "expert":
                return await self.async_step_wizard_boiler()
            return await self.async_step_wizard_boiler_simple_2()

        return self.async_show_form(
            step_id="wizard_boiler_simple_1",
            data_schema=get_boiler_simple_1_schema(self._wizard_data),
            description_placeholders=self._get_step_placeholders(
                "wizard_boiler_simple_1"
            ),
        )

    async def async_step_wizard_boiler_simple_2(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_boiler_simple_2")
            errors = validate_boiler_simple_2(user_input)
            if errors:
                return self.async_show_form(
                    step_id="wizard_boiler_simple_2",
                    data_schema=get_boiler_simple_2_schema(user_input),
                    errors=errors,
                    description_placeholders=self._get_step_placeholders(
                        "wizard_boiler_simple_2"
                    ),
                )
            self._wizard_data.update(user_input)
            if not user_input.get("boiler_enable_second_thermometer", False):
                self._wizard_data["boiler_temp_sensor_bottom"] = ""
            self._step_history.append("wizard_boiler_simple_2")
            return await self.async_step_wizard_boiler_simple_3()

        return self.async_show_form(
            step_id="wizard_boiler_simple_2",
            data_schema=get_boiler_simple_2_schema(self._wizard_data),
            description_placeholders=self._get_step_placeholders(
                "wizard_boiler_simple_2"
            ),
        )

    async def async_step_wizard_boiler_simple_3(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_boiler_simple_3")
            errors = validate_boiler_simple_3(user_input)
            if errors:
                return self.async_show_form(
                    step_id="wizard_boiler_simple_3",
                    data_schema=get_boiler_simple_3_schema(user_input),
                    errors=errors,
                    description_placeholders=self._get_step_placeholders(
                        "wizard_boiler_simple_3"
                    ),
                )
            self._wizard_data.update(user_input)
            self._step_history.append("wizard_boiler_simple_3")
            return await self.async_step_wizard_boiler_simple_4()

        return self.async_show_form(
            step_id="wizard_boiler_simple_3",
            data_schema=get_boiler_simple_3_schema(self._wizard_data),
            description_placeholders=self._get_step_placeholders(
                "wizard_boiler_simple_3"
            ),
        )

    async def async_step_wizard_boiler_simple_4(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_boiler_simple_4")
            errors = validate_boiler_simple_4(user_input)
            if errors:
                return self.async_show_form(
                    step_id="wizard_boiler_simple_4",
                    data_schema=get_boiler_simple_4_schema(user_input),
                    errors=errors,
                    description_placeholders=self._get_step_placeholders(
                        "wizard_boiler_simple_4"
                    ),
                )
            self._wizard_data.update(user_input)
            self._step_history.append("wizard_boiler_simple_4")
            return await self.async_step_wizard_boiler_simple_5()

        return self.async_show_form(
            step_id="wizard_boiler_simple_4",
            data_schema=get_boiler_simple_4_schema(self._wizard_data),
            description_placeholders=self._get_step_placeholders(
                "wizard_boiler_simple_4"
            ),
        )

    async def async_step_wizard_boiler_simple_5(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        if user_input is not None:
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_boiler_simple_5")
            errors = validate_boiler_simple_5(user_input)
            if errors:
                return self.async_show_form(
                    step_id="wizard_boiler_simple_5",
                    data_schema=get_boiler_simple_5_schema(user_input),
                    errors=errors,
                    description_placeholders=self._get_step_placeholders(
                        "wizard_boiler_simple_5"
                    ),
                )
            self._wizard_data.update(user_input)
            self._step_history.append("wizard_boiler_simple_5")
            return await self.async_step_wizard_boiler_simple_6()

        return self.async_show_form(
            step_id="wizard_boiler_simple_5",
            data_schema=get_boiler_simple_5_schema(self._wizard_data),
            description_placeholders=self._get_step_placeholders(
                "wizard_boiler_simple_5"
            ),
        )

    async def async_step_wizard_boiler_simple_6(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Krok 6 — Zdroje ohřevu (alternativní zdroj + Home 5)."""
        if user_input is not None:
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_boiler_simple_6")
            errors = validate_boiler_simple_6(user_input)
            if errors:
                return self.async_show_form(
                    step_id="wizard_boiler_simple_6",
                    data_schema=get_boiler_simple_6_schema(user_input),
                    errors=errors,
                    description_placeholders=self._get_step_placeholders(
                        "wizard_boiler_simple_6"
                    ),
                )
            self._wizard_data.update(user_input)
            self._step_history.append("wizard_boiler_simple_6")
            return await self.async_step_wizard_boiler_simple_7()

        return self.async_show_form(
            step_id="wizard_boiler_simple_6",
            data_schema=get_boiler_simple_6_schema(self._wizard_data),
            description_placeholders=self._get_step_placeholders(
                "wizard_boiler_simple_6"
            ),
        )

    async def async_step_wizard_boiler_simple_7(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Krok 7 — Komfort + hygiena (cirkulace + legionella)."""
        if user_input is not None:
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_boiler_simple_7")
            errors = validate_boiler_simple_7(user_input)
            if errors:
                return self.async_show_form(
                    step_id="wizard_boiler_simple_7",
                    data_schema=get_boiler_simple_7_schema(user_input),
                    errors=errors,
                    description_placeholders=self._get_step_placeholders(
                        "wizard_boiler_simple_7"
                    ),
                )
            self._wizard_data.update(user_input)
            self._step_history.append("wizard_boiler_simple_7")
            return await self.async_step_wizard_boiler_simple_8()

        return self.async_show_form(
            step_id="wizard_boiler_simple_7",
            data_schema=get_boiler_simple_7_schema(self._wizard_data),
            description_placeholders=self._get_step_placeholders(
                "wizard_boiler_simple_7"
            ),
        )

    async def async_step_wizard_boiler_simple_8(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Krok 8 — Pokročilé (měřiče výkonu a alternativní energie)."""
        if user_input is not None:
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_boiler_simple_8")
            errors = validate_boiler_simple_8(user_input)
            if errors:
                return self.async_show_form(
                    step_id="wizard_boiler_simple_8",
                    data_schema=get_boiler_simple_8_schema(user_input),
                    errors=errors,
                    description_placeholders=self._get_step_placeholders(
                        "wizard_boiler_simple_8"
                    ),
                )
            self._wizard_data.update(user_input)
            self._wizard_data["boiler_setup_complete"] = True
            self._step_history.append("wizard_boiler_simple_8")
            return await self.async_step_wizard_summary()

        return self.async_show_form(
            step_id="wizard_boiler_simple_8",
            data_schema=get_boiler_simple_8_schema(self._wizard_data),
            description_placeholders=self._get_step_placeholders(
                "wizard_boiler_simple_8"
            ),
        )

    async def async_step_wizard_summary(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Wizard Step 9: Summary and confirmation."""
        # This will be overridden in ConfigFlow and OptionsFlow
        raise NotImplementedError("Must be implemented in subclass")


class ConfigFlow(WizardMixin, config_entries.ConfigFlow):
    """Handle a config flow for OIG Cloud."""

    VERSION = 1
    domain = DOMAIN

    def __init__(self) -> None:
        """Initialize the config flow."""
        super().__init__()

    @staticmethod
    def _sanitize_data_source_mode(mode: Optional[str]) -> str:
        """Map legacy values to supported ones."""
        if mode == "hybrid":
            return "local_only"
        return mode or "cloud_only"

    async def async_step_user(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Handle the initial step - choose setup type."""
        if user_input is not None:
            setup_type = user_input.get("setup_type", "wizard")

            if setup_type == "wizard":
                return await self.async_step_wizard_welcome()
            if setup_type == "quick":
                return await self.async_step_quick_setup()
            return await self.async_step_wizard_welcome()

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required("setup_type", default="wizard"): vol.In(
                        {
                            "wizard": "wizard",
                            "quick": "quick",
                        }
                    )
                }
            ),
            description_placeholders=self._get_step_placeholders("user"),
        )

    async def async_step_reauth(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        return await self.async_step_reauth_confirm(user_input)

    async def async_step_reauth_confirm(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        reauth_entry_id = self.context.get("entry_id")
        existing_entry = (
            self.hass.config_entries.async_get_entry(reauth_entry_id)
            if reauth_entry_id
            else None
        )

        if existing_entry is None:
            return self.async_abort(reason="unknown")

        if user_input is None:
            return self.async_show_form(
                step_id="reauth_confirm",
                data_schema=vol.Schema(
                    {
                        vol.Required(
                            CONF_USERNAME,
                            default=existing_entry.data.get(CONF_USERNAME, ""),
                        ): str,
                        vol.Required(CONF_PASSWORD): str,
                    }
                ),
            )

        errors: Dict[str, str] = {}
        try:
            await validate_input(self.hass, user_input)
        except LiveDataNotEnabled:
            errors["base"] = "live_data_not_enabled"
        except CannotConnect:
            errors["base"] = "cannot_connect"
        except InvalidAuth:
            errors["base"] = "invalid_auth"
        except Exception:
            _LOGGER.exception("Unexpected exception during reauth")
            errors["base"] = "unknown"

        if errors:
            return self.async_show_form(
                step_id="reauth_confirm",
                data_schema=vol.Schema(
                    {
                        vol.Required(
                            CONF_USERNAME,
                            default=user_input.get(CONF_USERNAME, ""),
                        ): str,
                        vol.Required(CONF_PASSWORD): str,
                    }
                ),
                errors=errors,
            )

        updated_data = dict(existing_entry.data)
        updated_data[CONF_USERNAME] = user_input[CONF_USERNAME]
        updated_data[CONF_PASSWORD] = user_input[CONF_PASSWORD]

        self.hass.config_entries.async_update_entry(existing_entry, data=updated_data)
        await self.hass.config_entries.async_reload(existing_entry.entry_id)
        return self.async_abort(reason="reauth_successful")

    async def async_step_quick_setup(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Quick setup - just credentials and defaults."""
        if user_input is None:
            return self.async_show_form(
                step_id="quick_setup",
                data_schema=vol.Schema(
                    {
                        vol.Required(CONF_USERNAME): str,
                        vol.Required(CONF_PASSWORD): str,
                        vol.Required("live_data_enabled", default=False): bool,
                    }
                ),
            )

        errors = {}

        # Check if user confirmed live data is enabled
        if not user_input.get("live_data_enabled", False):
            errors["live_data_enabled"] = "live_data_not_confirmed"
            return self.async_show_form(
                step_id="quick_setup",
                data_schema=vol.Schema(
                    {
                        vol.Required(
                            CONF_USERNAME, default=user_input.get(CONF_USERNAME, "")
                        ): str,
                        vol.Required(CONF_PASSWORD): str,
                        vol.Required("live_data_enabled", default=False): bool,
                    }
                ),
                errors=errors,
            )

        try:
            info = await validate_input(self.hass, user_input)

            # Test OTE API
            try:
                from ..api.ote_api import OteApi

                ote_api = OteApi()
                test_data = await ote_api.get_spot_prices()
                if not test_data:
                    _LOGGER.warning("OTE API test failed, but continuing")
            except Exception as e:
                _LOGGER.warning(f"OTE API test failed: {e}")

        except LiveDataNotEnabled:
            errors["base"] = "live_data_not_enabled"
        except CannotConnect:
            errors["base"] = "cannot_connect"
        except InvalidAuth:
            errors["base"] = "invalid_auth"
        except Exception:
            _LOGGER.exception("Unexpected exception")
            errors["base"] = "unknown"
        else:
            return self.async_create_entry(
                title=info["title"],
                data={
                    CONF_USERNAME: user_input[CONF_USERNAME],
                    CONF_PASSWORD: user_input[CONF_PASSWORD],
                },
                options={
                    "standard_scan_interval": 30,
                    "extended_scan_interval": 300,
                    "enable_cloud_notifications": True,
                    "data_source_mode": "cloud_only",
                    "local_proxy_stale_minutes": 10,
                    "local_event_debounce_ms": 300,
                    "enable_solar_forecast": False,
                    "enable_statistics": True,
                    "enable_extended_sensors": True,
                    "enable_pricing": False,
                    "enable_battery_prediction": False,
                    "enable_dashboard": False,
                    "min_capacity_percent": DEFAULT_PLANNING_MIN_PERCENT,
                    "home_charge_rate": DEFAULT_CHARGE_RATE_KW,
                    CONF_CHARGE_RATE_KW: DEFAULT_CHARGE_RATE_KW,
                },
            )

        return self.async_show_form(
            step_id="quick_setup",
            data_schema=vol.Schema(
                {
                    vol.Required(
                        CONF_USERNAME, default=user_input.get(CONF_USERNAME, "")
                    ): str,
                    vol.Required(CONF_PASSWORD): str,
                    vol.Required("live_data_enabled", default=False): bool,
                }
            ),
            errors=errors,
        )

    async def async_step_wizard_summary(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Wizard Step 9: Summary and confirmation - ConfigFlow implementation."""
        if user_input is not None:
            # Zkontrolovat, jestli uživatel chce jít zpět
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_summary")

            # Vytvořit entry s nakonfigurovanými daty
            return self.async_create_entry(
                title=DEFAULT_NAME,
                data={
                    CONF_USERNAME: self._wizard_data[CONF_USERNAME],
                    CONF_PASSWORD: self._wizard_data[CONF_PASSWORD],
                },
                options=self._build_options_payload(self._wizard_data),
            )

        # Vygenerovat detailní shrnutí konfigurace
        summary_text = self._generate_summary()

        # Přidat tlačítko zpět pomocí boolean pole
        return self.async_show_form(
            step_id="wizard_summary",
            data_schema=vol.Schema(
                {
                    vol.Optional("go_back", default=False): bool,
                }
            ),
            description_placeholders={
                "step": f"Krok {self._get_current_step_number('wizard_summary')} z {self._get_total_steps()} - Souhrn",
                "progress": "▓" * self._get_current_step_number("wizard_summary")
                + "░"
                * (
                    self._get_total_steps()
                    - self._get_current_step_number("wizard_summary")
                ),
                "summary": summary_text,
            },
        )

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> "OigCloudOptionsFlowHandler":
        """Get options flow handler."""
        return OigCloudOptionsFlowHandler(config_entry)


class OigCloudOptionsFlowHandler(WizardMixin, config_entries.OptionsFlow):
    """Handle options flow for OIG Cloud - uses wizard for better UX."""

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize options flow."""
        # IMPORTANT (HA 2025.12+):
        # - `config_entries.OptionsFlow` does NOT implement `__init__`.
        # - `config_entry` property is read-only and only available after HA sets `hass`.
        # - In HA 2025.12, the config entry id is derived from `self.handler` (set by HA).
        super().__init__()
        self._config_entry_cache = config_entry

        # Předvyplnit wizard_data z existující konfigurace – robustně proti chybějícím/poškozeným datům
        self._options_read_ok = True
        try:
            backend_options = dict(config_entry.options)
        except Exception:  # pragma: no cover - defensivní logika
            _LOGGER.exception(
                "OptionsFlow init: failed to read existing options"
            )
            self._options_read_ok = False
            backend_options = {}

        # Pre-seed basic keys into the snapshot so that registry defaults are not
        # treated as user deltas for keys that predate the registry. Without this,
        # a save after a concurrent REST write that introduced a basic key would
        # overwrite the new value with the registry default. (Plan 2 Task 6 — only
        # the basic section is protected here; battery/min_capacity mirror pairs
        # remain for Plan 3/4.)
        basic_fields = fields_for_section("basic")
        for key, field in basic_fields.items():
            backend_options.setdefault(key, field.default)

        frontend_pricing = {}
        try:
            frontend_pricing = self._map_backend_to_frontend(backend_options)
        except Exception:  # pragma: no cover - defensivní logika
            _LOGGER.exception("OptionsFlow init: pricing mapping failed, keeping raw")
            # Best-effort: raw backend keys still land in _wizard_data below, so
            # pricing fields show SOME prior value instead of silently reverting
            # to hardcoded step defaults (RCA-R2 minimal fix).
            frontend_pricing = dict(backend_options)

        self._wizard_data = backend_options | frontend_pricing
        for legacy_telemetry_key in (
            "no_telemetry",
            "telemetry_mqtt_enabled",
            "telemetry_mqtt_host",
            "telemetry_mqtt_port",
            "telemetry_mqtt_prefix",
        ):
            self._wizard_data.pop(legacy_telemetry_key, None)

        # The payload the serializer would produce from the wizard data as seeded
        # at open. The save delta is this payload diffed against the one built
        # from the wizard data as it stands at save, so it contains EXACTLY the
        # fields the user submitted a new value for during this flow session.
        #
        # Diffing payload-against-payload (rather than payload-against-raw-stored-
        # options) is what makes the delta submitted-fields-only: the serializer's
        # normalization — e.g. the expensive_percentile rounding in
        # _build_battery_options — is applied identically to both sides, so it
        # cancels out and can never be mistaken for a user edit. An untouched
        # field is therefore always absent from the delta, and a concurrent REST
        # or dashboard write to it survives this flow's save untouched.
        self._options_payload_at_open = self._build_options_payload(self._wizard_data)

        # Přidat přihlašovací údaje z data (bez hesla)
        self._wizard_data[CONF_USERNAME] = config_entry.data.get(CONF_USERNAME)

        _LOGGER.info(
            "🔧 OptionsFlow: Initialized with %s existing options",
            len(self._wizard_data),
        )
        _LOGGER.debug(
            "🔧 OptionsFlow: Existing options keys: %s",
            list(self._wizard_data.keys()),
        )
        _LOGGER.debug("🔧 OptionsFlow: Frontend pricing data: %s", frontend_pricing)

    async def async_step_init(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Entry point: section menu — jump straight to what you want to change.

        Previously this re-ran the WHOLE wizard (up to ~12 steps) even for a
        single value change. Each section now ends at the summary (save).
        """
        menu = ["section_modules", "section_intervals"]
        if self._wizard_data.get("enable_solar_forecast"):
            menu.append("section_solar")
        if self._wizard_data.get("enable_battery_prediction"):
            menu.append("section_battery")
        if self._wizard_data.get("enable_pricing"):
            menu.append("section_pricing")
        if self._wizard_data.get("enable_boiler") or self._wizard_data.get(
            "boiler_setup_complete"
        ):
            menu.append("section_boiler")
        menu.append("section_ai")
        menu.append("section_all")
        return self.async_show_menu(step_id="init", menu_options=menu)

    # Maps each per-module wizard step to the enable flag that gates it.
    _STEP_MODULE = {
        "wizard_solar": "enable_solar_forecast",
        "wizard_battery": "enable_battery_prediction",
        "wizard_pricing_import": "enable_pricing",
        "wizard_pricing_export": "enable_pricing",
        "wizard_pricing_distribution": "enable_pricing",
        "wizard_boiler_simple_1": "enable_boiler",
        "wizard_boiler_simple_2": "enable_boiler",
        "wizard_boiler_simple_3": "enable_boiler",
        "wizard_boiler_simple_4": "enable_boiler",
        "wizard_boiler_simple_5": "enable_boiler",
        "wizard_boiler_simple_6": "enable_boiler",
        "wizard_boiler_simple_7": "enable_boiler",
        "wizard_boiler_simple_8": "enable_boiler",
        "wizard_boiler": "enable_boiler",
    }
    _MODULE_FLAGS = ("enable_solar_forecast", "enable_battery_prediction", "enable_pricing", "enable_boiler")

    def _newly_enabled_modules(self) -> set:
        """Module flags that are ON now but were OFF when the section was entered."""
        baseline = getattr(self, "_modules_enabled_at_entry", None)
        if baseline is None:
            return set()
        return {
            flag for flag in self._MODULE_FLAGS
            if self._wizard_data.get(flag) and flag not in baseline
        }

    async def _enter_section(self, section: str, first_step: str) -> ConfigFlowResult:
        self._section: Optional[str] = section
        self._step_history = ["init"]
        # M13: snapshot which modules were enabled on entry so that enabling a new
        # one in the "modules" section routes into ITS config instead of silently
        # saving defaults.
        self._modules_enabled_at_entry = {
            flag for flag in self._MODULE_FLAGS if self._wizard_data.get(flag)
        }
        return await getattr(self, f"async_step_{first_step}")()

    async def async_step_section_modules(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        return await self._enter_section("modules", "wizard_modules")

    async def async_step_section_intervals(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        return await self._enter_section("intervals", "wizard_intervals")

    async def async_step_section_solar(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        return await self._enter_section("solar", "wizard_solar")

    async def async_step_section_battery(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        return await self._enter_section("battery", "wizard_battery")

    async def async_step_section_ai(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Open the optional AI provider configuration."""
        return await self.async_step_ai(user_input)

    def _get_ai_schema(self, defaults: Dict[str, Any]) -> vol.Schema:
        """Build the optional AI form from the registry fields."""
        ai = fields_for_section("ai")
        provider = ai["ai_provider"]
        assert provider.enum is not None

        return vol.Schema(
            {
                vol.Optional(
                    "ai_provider", default=defaults.get("ai_provider", provider.default)
                ): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=[
                            selector.SelectOptionDict(value="", label="—"),
                            selector.SelectOptionDict(value="ai_task", label="HA AI Task"),
                            selector.SelectOptionDict(value="groq", label="Groq"),
                            selector.SelectOptionDict(value="nvidia", label="NVIDIA"),
                        ],
                        mode=selector.SelectSelectorMode.DROPDOWN,
                    )
                ),
                vol.Optional(
                    "ai_base_url", default=defaults.get("ai_base_url", "")
                ): selector.TextSelector(
                    selector.TextSelectorConfig(type=selector.TextSelectorType.URL)
                ),
                vol.Optional(
                    "ai_model", default=defaults.get("ai_model", "")
                ): selector.TextSelector(
                    selector.TextSelectorConfig(type=selector.TextSelectorType.TEXT)
                ),
                vol.Optional("ai_api_key", default=""): selector.TextSelector(
                    selector.TextSelectorConfig(
                        type=selector.TextSelectorType.PASSWORD,
                        autocomplete="off",
                    )
                ),
                vol.Optional("ai_fallback_provider", default=""): selector.SelectSelector(
                    selector.SelectSelectorConfig(
                        options=[
                            selector.SelectOptionDict(value="", label="—"),
                            selector.SelectOptionDict(value="groq", label="Groq"),
                            selector.SelectOptionDict(value="nvidia", label="NVIDIA"),
                        ],
                        mode=selector.SelectSelectorMode.DROPDOWN,
                    )
                ),
                vol.Optional("ai_fallback_api_key", default=""): selector.TextSelector(
                    selector.TextSelectorConfig(
                        type=selector.TextSelectorType.PASSWORD,
                        autocomplete="off",
                    )
                ),
                vol.Optional(
                    "ai_consent_cross_provider_fallback",
                    default=defaults.get("ai_consent_cross_provider_fallback", False),
                ): bool,
            }
        )

    async def async_step_ai(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Configure optional AI settings and route the key to private storage."""
        entry: Optional[config_entries.ConfigEntry] = getattr(
            self, "_config_entry_cache", None
        )
        if entry is None:
            return self.async_abort(reason="no_entry")

        current = dict(entry.options)
        if user_input is not None:
            values = dict(user_input)
            api_key = values.pop("ai_api_key", "")
            api_key = api_key.strip() if isinstance(api_key, str) else ""
            fallback_provider = values.pop("ai_fallback_provider", "") or ""
            fallback_api_key = values.pop("ai_fallback_api_key", "")
            fallback_api_key = (
                fallback_api_key.strip() if isinstance(fallback_api_key, str) else ""
            )
            ai_fields = fields_for_section("ai")
            updates = {
                key: values.get(key, field.default)
                for key, field in ai_fields.items()
            }
            current_provider = current.get("ai_provider", "")
            selected_provider = updates["ai_provider"]
            store = AiKeyStore(self.hass, entry.entry_id)

            if api_key:
                await store.async_set_key(selected_provider, api_key)
            elif current_provider and selected_provider != current_provider:
                await store.async_clear()

            # Fallback is an OPTIONAL second provider (F1 fallback setter):
            # only stored when BOTH a provider and a key are supplied, so a
            # half-filled form never overwrites a previously stored fallback
            # with a broken pair.
            if fallback_provider and fallback_api_key:
                await store.async_set_fallback(fallback_provider, fallback_api_key)

            current.update(updates)
            self.hass.config_entries.async_update_entry(entry, options=current)

        return self.async_show_form(
            step_id="ai",
            data_schema=self._get_ai_schema(current),
            description_placeholders={
                "groq_console_url": "https://console.groq.com",
                "groq_keys_url": "https://console.groq.com/keys",
                "nvidia_build_url": "https://build.nvidia.com",
                "nvidia_keys_url": "https://build.nvidia.com/settings/api-keys",
            },
        )

    async def async_step_section_pricing(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        return await self._enter_section("pricing", "wizard_pricing_import")

    async def async_step_section_boiler(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        first = (
            "wizard_boiler"
            if self._wizard_data.get("boiler_setup_mode") == "expert"
            else "wizard_boiler_simple_1"
        )
        return await self._enter_section("boiler", first)

    async def async_step_section_all(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        self._section = None
        return await self.async_step_wizard_welcome_reconfigure()

    async def async_step_wizard_welcome_reconfigure(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Welcome screen for reconfiguration - replaces wizard_welcome."""
        if user_input is not None:
            # Přeskočit credentials a jít přímo na moduly
            self._step_history.append("wizard_welcome_reconfigure")
            return await self.async_step_wizard_modules()

        return self.async_show_form(
            step_id="wizard_welcome_reconfigure",
            data_schema=vol.Schema({}),
        )

    async def async_step_wizard_summary(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> ConfigFlowResult:
        """Override summary step for options flow - update entry instead of creating new."""
        # Use _config_entry_cache to avoid triggering HA property machinery
        # that requires hass.config_entries.async_get_known_entry (unavailable in tests)
        entry: Optional[config_entries.ConfigEntry] = getattr(
            self, "_config_entry_cache", None
        )
        if entry is None:
            return self.async_abort(reason="no_entry")

        if user_input is not None:
            # Zkontrolovat, jestli uživatel chce jít zpět
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_summary")

            # If the opening snapshot could not be read we cannot compute a safe
            # delta; abort the save and ask the user to reopen the flow rather
            # than degrading to a full-payload overwrite.
            if not self._options_read_ok:
                return self.async_show_form(
                    step_id="wizard_summary",
                    data_schema=vol.Schema({}),
                    errors={"base": "options_read_failed"},
                    description_placeholders={
                        "step": "Rekonfigurace - Souhrn změn",
                        "progress": "▓▓▓▓▓",
                        "summary": "Nepodařilo se načíst stávající nastavení. "
                        "Zavřete tento dialog a otevřete nastavení znovu.",
                    },
                )

            # Aktualizovat existující entry se všemi daty (stejně jako v ConfigFlow)
            payload = self._build_options_payload(self._wizard_data)
            new_options = dict(entry.options)
            new_options.update(payload)
            solar_private_updates = {
                key: self._wizard_data.get(key)
                for key in SOLAR_PRIVATE_FIELDS
                if isinstance(self._wizard_data.get(key), str)
                and self._wizard_data.get(key).strip()
            }

            # Submitted-fields-only delta: exactly those keys whose serialized
            # value differs from the one this flow would have written at open.
            # Both sides come from the same serializer, so only a value the user
            # actually submitted can make a key differ; everything the user did
            # not touch is absent, and a concurrent REST/dashboard write to it
            # survives. A save with no user edits yields an EMPTY delta and
            # therefore no merge write at all.
            delta: Dict[str, Any] = {
                key: value
                for key, value in payload.items()
                if value != self._options_payload_at_open.get(key)
            }

            # A mirror pair (charge_rate_kw / home_charge_rate) is ONE logical
            # field. The serializer writes the same value to both aliases, so a
            # real edit surfaces both keys here; emit only the registered
            # canonical key and let merge_entry_options mirror it, so the legacy
            # alias never travels through the delta on its own.
            for field in FIELD_REGISTRY.values():
                if field.mirror and field.mirror in delta:
                    if field.key not in delta and field.key in payload:
                        delta[field.key] = payload[field.key]
                    del delta[field.mirror]

            # Přidat debug log
            _LOGGER.warning(
                f"🔧 OptionsFlow wizard_summary: Updating config entry with {len(new_options)} options"
            )
            _LOGGER.debug(
                f"🔧 OptionsFlow: New options keys: {list(new_options.keys())}"
            )

            try:
                # Aktualizovat entry
                _LOGGER.warning("🔍 About to call async_update_entry")
                if getattr(self, "_section", None) == "solar" and (
                    solar_private_updates or CONF_SOLAR_FORECAST_PROVIDER in delta
                ):
                    solar_store = SolarKeyStore(self.hass, entry.entry_id)
                    provider = payload.get(
                        CONF_SOLAR_FORECAST_PROVIDER,
                        entry.options.get(CONF_SOLAR_FORECAST_PROVIDER, "forecast_solar"),
                    )
                    if CONF_SOLAR_FORECAST_PROVIDER in delta:
                        await solar_store.async_clear_inactive(str(provider))
                    if CONF_SOLAR_FORECAST_API_KEY in solar_private_updates:
                        await solar_store.async_set_candidate(
                            "forecast_solar",
                            {
                                CONF_SOLAR_FORECAST_API_KEY: solar_private_updates[
                                    CONF_SOLAR_FORECAST_API_KEY
                                ]
                            },
                        )
                    solcast_updates = {
                        key: solar_private_updates[key]
                        for key in (CONF_SOLCAST_API_KEY, CONF_SOLCAST_SITE_ID)
                        if key in solar_private_updates
                    }
                    if solcast_updates:
                        await solar_store.async_set_candidate("solcast", solcast_updates)
                did_write = merge_entry_options(
                    self.hass, entry, delta, suppress_reload=True
                )
                _LOGGER.warning("🔍 async_update_entry completed")

                if did_write:
                    # Use post-merge entry options for the boiler command payload,
                    # preserving concurrent REST updates for untouched fields.
                    merged_options = dict(entry.options)
                    merged_options.update(delta)

                    try:
                        from ..boiler.runtime import get_boiler_runtime
                        from ..boiler.actuator import (
                            ActuatorCommand,
                            ActuatorCommandPriority,
                            ActuatorCommandType,
                            SourceIntent,
                        )

                        box_id = merged_options.get("boiler_box_id", "")
                        if merged_options.get("enable_boiler") and box_id:
                            runtime = get_boiler_runtime(
                                self.hass, entry.entry_id, box_id
                            )
                            if runtime is not None and runtime._serializer is not None:
                                latest_cv = getattr(
                                    runtime._serializer, "_latest_config_version", 0
                                )
                                cmd = ActuatorCommand(
                                    entry_id=entry.entry_id,
                                    box_id=box_id,
                                    command_type=ActuatorCommandType("config_update"),
                                    plan_version=0,
                                    config_version=latest_cv + 1,
                                    priority=ActuatorCommandPriority.CONFIG,
                                    source_intent=SourceIntent.NONE,
                                    payload={"new_options": merged_options},
                                )
                                await runtime._serializer.enqueue(cmd)
                                _LOGGER.debug(
                                    "Enqueued CONFIG_UPDATE for %s/%s",
                                    entry.entry_id,
                                    box_id,
                                )
                    except Exception as exc:
                        _LOGGER.debug(
                            "Config update enqueue failed (non-critical): %s", exc
                        )

                # Automaticky reloadnout integraci pro aplikování změn
                _LOGGER.warning("🔍 About to reload integration")
                await self.hass.config_entries.async_reload(entry.entry_id)
                _LOGGER.warning("🔍 Integration reload completed")

                # CRITICAL: V OptionsFlow NESMÍME volat async_create_entry,
                # protože by to přepsalo options! Místo toho ukončit flow.
                _LOGGER.warning(
                    "🔍 OptionsFlow wizard completed - showing success message"
                )
                return self.async_abort(reason="reconfigure_successful")
            except Exception as e:
                _LOGGER.exception("❌ OptionsFlow wizard_summary FAILED: %s", e)
                raise

        # Zobrazit summary se stejnou logikou jako v ConfigFlow
        summary_lines = [
            "**Přihlášení:**",
            f"- Uživatel: {entry.data.get(CONF_USERNAME, 'N/A')}",
            "",
            "**Zapnuté moduly:**",
        ]

        if self._wizard_data.get("enable_statistics"):
            summary_lines.append("✅ Statistiky a analýzy")
        if self._wizard_data.get("enable_solar_forecast"):
            summary_lines.append("✅ Solární předpověď")
        if self._wizard_data.get("enable_battery_prediction"):
            summary_lines.append("✅ Predikce baterie")
        if self._wizard_data.get("enable_pricing"):
            summary_lines.append("✅ Cenové senzory a spotové ceny")
        if self._wizard_data.get("enable_extended_sensors"):
            summary_lines.append("✅ Rozšířené senzory")
        if self._wizard_data.get("enable_dashboard"):
            summary_lines.append("✅ Webový dashboard")

        summary_lines.extend(
            [
                "",
                "**Intervaly načítání:**",
                f"- Základní data: {self._wizard_data.get('standard_scan_interval', 30)}s",
                f"- Rozšířená data: {self._wizard_data.get('extended_scan_interval', 300)}s",
                "",
                "✅ **Po uložení se integrace automaticky znovu načte.**",
                "",
                "Kliknutím na 'Odeslat' uložíte změny.",
            ]
        )

        return self.async_show_form(
            step_id="wizard_summary",
            data_schema=vol.Schema({}),
            description_placeholders={
                "step": "Rekonfigurace - Souhrn změn",
                "progress": "▓▓▓▓▓",
                "summary": "\n".join(summary_lines),
            },
        )
