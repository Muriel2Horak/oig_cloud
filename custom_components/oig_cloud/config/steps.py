import logging
from typing import TYPE_CHECKING, Any, Dict, Optional

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.const import STATE_UNAVAILABLE, STATE_UNKNOWN
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import selector

from ..const import (CONF_AUTO_MODE_SWITCH, CONF_PASSWORD, CONF_USERNAME,
                     DEFAULT_NAME, DOMAIN)
from ..core.data_source import (PROXY_BOX_ID_ENTITY_ID,
                                PROXY_LAST_DATA_ENTITY_ID)
from .schema import (CONF_SOLAR_FORECAST_API_KEY,
                     CONF_SOLAR_FORECAST_LATITUDE,
                     CONF_SOLAR_FORECAST_LONGITUDE,
                     CONF_SOLAR_FORECAST_PROVIDER, CONF_SOLCAST_API_KEY,
                     CONF_SOLAR_FORECAST_STRING1_AZIMUTH,
                     CONF_SOLAR_FORECAST_STRING1_DECLINATION,
                     CONF_SOLAR_FORECAST_STRING1_ENABLED,
                     CONF_SOLAR_FORECAST_STRING1_KWP, validate_tariff_hours)
from .validation import (CannotConnect, InvalidAuth, LiveDataNotEnabled,
                         validate_input)

if TYPE_CHECKING:  # pragma: no cover
    pass

_LOGGER = logging.getLogger(__name__)


class WizardMixin:
    """Mixin třída obsahující všechny wizard kroky.

    Sdílená mezi ConfigFlow (nová instalace) a OptionsFlow (rekonfigurace).
    Poskytuje konzistentní UX pro oba případy.
    """

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
            migrated["import_fixed_price"] = data.get(
                "fixed_commercial_price_vt", 4.50
            )

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
        migrated.setdefault("tariff_weekend_same_as_weekday", True)

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
            weekend_same = wizard_data.get("tariff_weekend_same_as_weekday", True)
            backend_data["tariff_weekend_same_as_weekday"] = bool(weekend_same)
            if weekend_same:
                backend_data["tariff_vt_start_weekend"] = backend_data[
                    "tariff_vt_start_weekday"
                ]
                backend_data["tariff_nt_start_weekend"] = backend_data[
                    "tariff_nt_start_weekday"
                ]
            else:
                backend_data["tariff_vt_start_weekend"] = wizard_data.get(
                    "tariff_vt_start_weekend",
                    backend_data["tariff_vt_start_weekday"],
                )
                backend_data["tariff_nt_start_weekend"] = wizard_data.get(
                    "tariff_nt_start_weekend",
                    backend_data["tariff_nt_start_weekday"],
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
        payload.update(self._build_auto_options(wizard_data))
        return payload

    @staticmethod
    def _build_base_options(wizard_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "standard_scan_interval": wizard_data.get("standard_scan_interval", 30),
            "extended_scan_interval": wizard_data.get("extended_scan_interval", 300),
            "data_source_mode": WizardMixin._sanitize_data_source_mode(
                wizard_data.get("data_source_mode", "cloud_only")
            ),
            "local_proxy_stale_minutes": wizard_data.get("local_proxy_stale_minutes", 10),
            "local_event_debounce_ms": wizard_data.get("local_event_debounce_ms", 300),
            "enable_statistics": wizard_data.get("enable_statistics", True),
            "enable_solar_forecast": wizard_data.get("enable_solar_forecast", False),
            "enable_battery_prediction": wizard_data.get(
                "enable_battery_prediction", False
            ),
            "enable_pricing": wizard_data.get("enable_pricing", False),
            "enable_extended_sensors": wizard_data.get("enable_extended_sensors", True),
            "enable_chmu_warnings": wizard_data.get("enable_chmu_warnings", False),
            "enable_dashboard": wizard_data.get("enable_dashboard", False),
        }

    @staticmethod
    def _build_solar_options(wizard_data: Dict[str, Any]) -> Dict[str, Any]:
        return {
            CONF_SOLAR_FORECAST_PROVIDER: wizard_data.get(
                CONF_SOLAR_FORECAST_PROVIDER, "forecast_solar"
            ),
            "solar_forecast_mode": wizard_data.get(
                "solar_forecast_mode", "daily_optimized"
            ),
            CONF_SOLAR_FORECAST_API_KEY: wizard_data.get(
                CONF_SOLAR_FORECAST_API_KEY, ""
            ),
            CONF_SOLCAST_API_KEY: wizard_data.get(CONF_SOLCAST_API_KEY, ""),
            CONF_SOLAR_FORECAST_LATITUDE: wizard_data.get(
                CONF_SOLAR_FORECAST_LATITUDE, 50.0
            ),
            CONF_SOLAR_FORECAST_LONGITUDE: wizard_data.get(
                CONF_SOLAR_FORECAST_LONGITUDE, 14.0
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
        return {
            "min_capacity_percent": wizard_data.get("min_capacity_percent", 20.0),
            "target_capacity_percent": wizard_data.get("target_capacity_percent", 80.0),
            "home_charge_rate": wizard_data.get("home_charge_rate", 2.8),
            CONF_AUTO_MODE_SWITCH: wizard_data.get(CONF_AUTO_MODE_SWITCH, False),
            "disable_planning_min_guard": wizard_data.get(
                "disable_planning_min_guard", False
            ),
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
        return {
            "enable_boiler": wizard_data.get("enable_boiler", False),
            "boiler_volume_l": wizard_data.get("boiler_volume_l", 120),
            "boiler_target_temp_c": wizard_data.get("boiler_target_temp_c", 60.0),
            "boiler_cold_inlet_temp_c": wizard_data.get(
                "boiler_cold_inlet_temp_c", 10.0
            ),
            "boiler_temp_sensor_top": wizard_data.get("boiler_temp_sensor_top", ""),
            "boiler_temp_sensor_bottom": wizard_data.get(
                "boiler_temp_sensor_bottom", ""
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
                "sensor.oig_2206237016_boiler_install_power",
            ),
            "boiler_heater_switch_entity": wizard_data.get(
                "boiler_heater_switch_entity", ""
            ),
            "boiler_alt_heater_switch_entity": wizard_data.get(
                "boiler_alt_heater_switch_entity", ""
            ),
            "boiler_has_alternative_heating": wizard_data.get(
                "boiler_has_alternative_heating", False
            ),
            "boiler_alt_cost_kwh": wizard_data.get("boiler_alt_cost_kwh", 0.0),
            "boiler_alt_energy_sensor": wizard_data.get(
                "boiler_alt_energy_sensor", ""
            ),
            "boiler_spot_price_sensor": wizard_data.get(
                "boiler_spot_price_sensor", ""
            ),
            "boiler_deadline_time": wizard_data.get("boiler_deadline_time", "20:00"),
            "boiler_planning_horizon_hours": wizard_data.get(
                "boiler_planning_horizon_hours", 36
            ),
            "boiler_plan_slot_minutes": wizard_data.get(
                "boiler_plan_slot_minutes", 30
            ),
        }

    @staticmethod
    def _build_auto_options(wizard_data: Dict[str, Any]) -> Dict[str, Any]:
        return {"enable_auto": wizard_data.get("enable_auto", False)}

    @staticmethod
    def _map_backend_to_frontend(backend_data: Dict[str, Any]) -> Dict[str, Any]:
        """Map backend attribute names back to UI-friendly frontend names.

        This is the reverse of _map_pricing_to_backend - used when loading
        existing configuration in OptionsFlow.
        """
        frontend_data: Dict[str, Any] = {}
        frontend_data.update(WizardMixin._map_import_frontend(backend_data))
        frontend_data.update(WizardMixin._map_export_frontend(backend_data))
        frontend_data.update(WizardMixin._map_distribution_frontend(backend_data))
        frontend_data["vat_rate"] = backend_data.get("vat_rate", 21.0)
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
            weekend_same = backend_data.get("tariff_weekend_same_as_weekday")
            if weekend_same is None:
                if weekend_vt is None and weekend_nt is None:
                    weekend_same = True
                else:
                    weekend_same = str(weekend_vt) == str(weekday_vt) and str(
                        weekend_nt
                    ) == str(weekday_nt)
            frontend_data["tariff_vt_start_weekday"] = weekday_vt
            frontend_data["tariff_nt_start_weekday"] = weekday_nt
            frontend_data["tariff_weekend_same_as_weekday"] = bool(weekend_same)
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
        return hasattr(self, "config_entry") and self.config_entry is not None

    def _get_defaults(self) -> Dict[str, Any]:
        """Get default values from existing config (for reconfiguration)."""
        if self._is_reconfiguration():
            # Migrovat stará data při načítání
            old_data = dict(self.config_entry.options)
            return self._migrate_old_pricing_data(old_data)
        return {}

    def _get_planner_mode_value(self, data: Optional[Dict[str, Any]] = None) -> str:
        """Return normalized planner mode name - always hybrid."""
        _ = data
        return "hybrid"

    async def _handle_back_button(self, current_step: str) -> FlowResult:
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
            summary_parts.append(f"      → Kapacita: {min_cap}% - {target_cap}%")
            summary_parts.append(f"      → Max. cena: {max_price} CZK/kWh")

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
    ) -> FlowResult:
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
    ) -> FlowResult:
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

    def _show_credentials_form(self, errors: Optional[Dict[str, str]] = None) -> FlowResult:
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
    ) -> FlowResult:
        """Wizard Step 2: Select modules to enable."""
        if user_input is not None:
            # Kontrola tlačítka "Zpět"
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_modules")

            errors = self._validate_modules_selection(user_input)
            if errors:
                return self._show_modules_form(user_input, errors)

            self._wizard_data.update(user_input)
            self._step_history.append("wizard_modules")

            # Debug log
            _LOGGER.info(
                f"🔧 Wizard modules: Updated data with {len(user_input)} fields"
            )
            _LOGGER.debug(
                f"🔧 Wizard modules: Current _wizard_data keys: {list(self._wizard_data.keys())}"
            )

            next_step = self._get_next_step("wizard_modules")
            return await getattr(self, f"async_step_{next_step}")()

        return self._show_modules_form()

    def _show_modules_form(
        self,
        defaults: Optional[Dict[str, Any]] = None,
        errors: Optional[Dict[str, str]] = None,
    ) -> FlowResult:
        return self.async_show_form(
            step_id="wizard_modules",
            data_schema=self._get_modules_schema(defaults),
            errors=errors,
            description_placeholders=self._get_step_placeholders("wizard_modules"),
        )

    def _validate_modules_selection(self, user_input: Dict[str, Any]) -> Dict[str, str]:
        errors: Dict[str, str] = {}
        if user_input.get("enable_battery_prediction"):
            if not user_input.get("enable_solar_forecast"):
                errors["enable_battery_prediction"] = "requires_solar_forecast"
            if not user_input.get("enable_extended_sensors"):
                errors["enable_extended_sensors"] = "required_for_battery"

        if user_input.get("enable_dashboard"):
            missing = self._missing_dashboard_requirements(user_input)
            if missing:
                errors["enable_dashboard"] = "dashboard_requires_all"
                self._wizard_data["_missing_for_dashboard"] = missing

        return errors

    @staticmethod
    def _missing_dashboard_requirements(user_input: Dict[str, Any]) -> list[str]:
        missing = []
        if not user_input.get("enable_statistics"):
            missing.append("Statistiky")
        if not user_input.get("enable_solar_forecast"):
            missing.append("Solární předpověď")
        if not user_input.get("enable_battery_prediction"):
            missing.append("Predikce baterie")
        if not user_input.get("enable_pricing"):
            missing.append("Cenové senzory a spotové ceny")
        if not user_input.get("enable_extended_sensors"):
            missing.append("Rozšířené senzory")
        return missing

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
                vol.Optional(
                    "enable_auto", default=defaults.get("enable_auto", False)
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
        # Detekce, zda běžíme v Options Flow
        is_options_flow = "wizard_welcome_reconfigure" in self._step_history

        # Základní kroky:
        # Config Flow: welcome, credentials, modules, intervals = 4
        # Options Flow: welcome_reconfigure, modules, intervals = 3
        total = 3 if is_options_flow else 4

        # Volitelné kroky podle zapnutých modulů:
        if self._wizard_data.get("enable_solar_forecast", False):
            total += 1  # wizard_solar
        if self._wizard_data.get("enable_battery_prediction", False):
            total += 1  # wizard_battery
        if self._wizard_data.get("enable_pricing", False):
            total += 3  # wizard_pricing (3 kroky: import, export, distribution)
        if self._wizard_data.get("enable_boiler", False):
            total += 1  # wizard_boiler

        # Summary krok (vždy na konci):
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
            return {
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
            steps.append("wizard_boiler")

        steps.append("wizard_summary")
        return steps

    def _get_step_placeholders(self, step_id: str = None, **kwargs) -> dict[str, str]:
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

    def _get_next_step(self, current_step: str) -> str:
        """Determine next step based on enabled modules."""
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
        if step == "wizard_boiler":
            return not self._wizard_data.get("enable_boiler")
        return False

    async def async_step_wizard_intervals(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
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
        return {
            "standard": user_input.get("standard_scan_interval", 30),
            "extended": user_input.get("extended_scan_interval", 300),
            "data_source_mode": self._sanitize_data_source_mode(
                user_input.get(
                    "data_source_mode",
                    self._wizard_data.get("data_source_mode", "cloud_only"),
                )
            ),
            "proxy_stale": user_input.get(
                "local_proxy_stale_minutes",
                self._wizard_data.get("local_proxy_stale_minutes", 10),
            ),
            "debounce_ms": user_input.get(
                "local_event_debounce_ms",
                self._wizard_data.get("local_event_debounce_ms", 300),
            ),
        }

    def _validate_interval_values(self, values: Dict[str, Any]) -> Dict[str, str]:
        errors: Dict[str, str] = {}
        standard = values["standard"]
        extended = values["extended"]
        proxy_stale = values["proxy_stale"]
        debounce_ms = values["debounce_ms"]
        data_source_mode = values["data_source_mode"]

        if standard < 30:
            errors["standard_scan_interval"] = "interval_too_short"
        elif standard > 300:
            errors["standard_scan_interval"] = "interval_too_long"

        if extended < 300:
            errors["extended_scan_interval"] = "extended_interval_too_short"
        elif extended > 3600:
            errors["extended_scan_interval"] = "extended_interval_too_long"

        if proxy_stale < 1:
            errors["local_proxy_stale_minutes"] = "interval_too_short"
        elif proxy_stale > 120:
            errors["local_proxy_stale_minutes"] = "interval_too_long"

        if debounce_ms < 0:
            errors["local_event_debounce_ms"] = "interval_too_short"
        elif debounce_ms > 5000:
            errors["local_event_debounce_ms"] = "interval_too_long"

        if data_source_mode == "local_only" and not self._proxy_ready():
            errors["data_source_mode"] = "local_proxy_missing"

        return errors

    def _proxy_ready(self) -> bool:
        if not self.hass:
            return False
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

    def _show_intervals_form(
        self,
        values: Optional[Dict[str, Any]] = None,
        errors: Optional[Dict[str, str]] = None,
    ) -> FlowResult:
        if values is None:
            data_source_mode = self._sanitize_data_source_mode(
                self._wizard_data.get("data_source_mode", "cloud_only")
            )
            data_schema = vol.Schema(
                {
                    vol.Optional("standard_scan_interval", default=30): int,
                    vol.Optional("extended_scan_interval", default=300): int,
                    vol.Optional(
                        "data_source_mode", default=data_source_mode
                    ): selector.SelectSelector(
                        selector.SelectSelectorConfig(
                            options=[
                                {"value": "cloud_only", "label": "☁️ Cloud only"},
                                {
                                    "value": "local_only",
                                    "label": "🏠 Local only (fallback na cloud při výpadku)",
                                },
                            ],
                            mode=selector.SelectSelectorMode.DROPDOWN,
                        )
                    ),
                    vol.Optional(
                        "local_proxy_stale_minutes",
                        default=self._wizard_data.get("local_proxy_stale_minutes", 10),
                    ): int,
                    vol.Optional(
                        "local_event_debounce_ms",
                        default=self._wizard_data.get("local_event_debounce_ms", 300),
                    ): int,
                    vol.Optional("go_back", default=False): bool,
                }
            )
        else:
            data_schema = vol.Schema(
                {
                    vol.Optional(
                        "standard_scan_interval", default=values["standard"]
                    ): int,
                    vol.Optional(
                        "extended_scan_interval", default=values["extended"]
                    ): int,
                    vol.Optional(
                        "data_source_mode", default=values["data_source_mode"]
                    ): selector.SelectSelector(
                        selector.SelectSelectorConfig(
                            options=[
                                {"value": "cloud_only", "label": "☁️ Cloud only"},
                                {
                                    "value": "local_only",
                                    "label": "🏠 Local only (fallback na cloud při výpadku)",
                                },
                            ],
                            mode=selector.SelectSelectorMode.DROPDOWN,
                        )
                    ),
                    vol.Optional(
                        "local_proxy_stale_minutes",
                        default=values["proxy_stale"],
                    ): int,
                    vol.Optional(
                        "local_event_debounce_ms",
                        default=values["debounce_ms"],
                    ): int,
                    vol.Optional("go_back", default=False): bool,
                }
            )
        return self.async_show_form(
            step_id="wizard_intervals",
            data_schema=data_schema,
            errors=errors,
            description_placeholders=self._get_step_placeholders("wizard_intervals"),
        )

    async def async_step_wizard_solar(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
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
    ) -> FlowResult:
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
        errors: Dict[str, str] = {}
        provider = user_input.get(CONF_SOLAR_FORECAST_PROVIDER, "forecast_solar")
        api_key = user_input.get(CONF_SOLAR_FORECAST_API_KEY, "").strip()
        mode = user_input.get("solar_forecast_mode", "daily_optimized")

        if provider == "forecast_solar":
            if mode in ["every_4h", "hourly"] and not api_key:
                errors["solar_forecast_mode"] = "api_key_required_for_frequent_updates"
        else:
            solcast_api_key = user_input.get(CONF_SOLCAST_API_KEY, "").strip()
            if not solcast_api_key:
                errors[CONF_SOLCAST_API_KEY] = "solcast_api_key_required"
        return errors

    def _validate_solar_coordinates(
        self, user_input: Dict[str, Any]
    ) -> Dict[str, str]:
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
        errors: Dict[str, str] = {}
        string1_enabled = user_input.get(CONF_SOLAR_FORECAST_STRING1_ENABLED, False)
        string2_enabled = user_input.get("solar_forecast_string2_enabled", False)

        if not string1_enabled and not string2_enabled:
            errors["base"] = "no_strings_enabled"

        if string1_enabled:
            errors.update(self._validate_solar_string1(user_input))
        if string2_enabled:
            errors.update(self._validate_solar_string2(user_input))
        return errors

    def _validate_solar_string1(self, user_input: Dict[str, Any]) -> Dict[str, str]:
        errors: Dict[str, str] = {}
        try:
            kwp1 = float(user_input.get(CONF_SOLAR_FORECAST_STRING1_KWP, 5.0))
            decl1 = int(user_input.get(CONF_SOLAR_FORECAST_STRING1_DECLINATION, 35))
            azim1 = int(user_input.get(CONF_SOLAR_FORECAST_STRING1_AZIMUTH, 0))

            if not (0 < kwp1 <= 15):
                errors[CONF_SOLAR_FORECAST_STRING1_KWP] = "invalid_kwp"
            if not (0 <= decl1 <= 90):
                errors[CONF_SOLAR_FORECAST_STRING1_DECLINATION] = "invalid_declination"
            if not (0 <= azim1 <= 360):
                errors[CONF_SOLAR_FORECAST_STRING1_AZIMUTH] = "invalid_azimuth"
        except (ValueError, TypeError):
            errors["base"] = "invalid_string1_params"
        return errors

    def _validate_solar_string2(self, user_input: Dict[str, Any]) -> Dict[str, str]:
        errors: Dict[str, str] = {}
        try:
            kwp2 = float(user_input.get("solar_forecast_string2_kwp", 5.0))
            decl2 = int(user_input.get("solar_forecast_string2_declination", 35))
            azim2 = int(user_input.get("solar_forecast_string2_azimuth", 180))

            if not (0 < kwp2 <= 15):
                errors["solar_forecast_string2_kwp"] = "invalid_kwp"
            if not (0 <= decl2 <= 90):
                errors["solar_forecast_string2_declination"] = "invalid_declination"
            if not (0 <= azim2 <= 360):
                errors["solar_forecast_string2_azimuth"] = "invalid_azimuth"
        except (ValueError, TypeError):
            errors["base"] = "invalid_string2_params"
        return errors

    def _get_solar_schema(
        self, defaults: Optional[Dict[str, Any]] = None
    ) -> vol.Schema:
        """Get schema for solar forecast step."""
        if defaults is None:
            defaults = self._wizard_data if self._wizard_data else {}

        # Získat GPS souřadnice z Home Assistant konfigurace jako default
        ha_latitude = self.hass.config.latitude if self.hass else 50.0
        ha_longitude = self.hass.config.longitude if self.hass else 14.0

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
            vol.Optional(
                CONF_SOLAR_FORECAST_LATITUDE,
                default=defaults.get(CONF_SOLAR_FORECAST_LATITUDE, ha_latitude),
            ): vol.Coerce(float),
            vol.Optional(
                CONF_SOLAR_FORECAST_LONGITUDE,
                default=defaults.get(CONF_SOLAR_FORECAST_LONGITUDE, ha_longitude),
            ): vol.Coerce(float),
            vol.Optional(
                CONF_SOLAR_FORECAST_STRING1_ENABLED,
                default=defaults.get(CONF_SOLAR_FORECAST_STRING1_ENABLED, True),
            ): bool,
        }

        if provider == "forecast_solar":
            schema_fields[vol.Optional(
                CONF_SOLAR_FORECAST_API_KEY,
                default=defaults.get(CONF_SOLAR_FORECAST_API_KEY, ""),
            )] = str
        else:
            schema_fields[vol.Optional(
                CONF_SOLCAST_API_KEY,
                default=defaults.get(CONF_SOLCAST_API_KEY, ""),
            )] = str

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

    async def async_step_wizard_battery(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Wizard Step 5: Battery prediction configuration."""
        if user_input is not None:
            # Kontrola tlačítka "Zpět"
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_battery")

            errors = {}

            # Validace min < target
            min_cap = user_input.get("min_capacity_percent", 20.0)
            target_cap = user_input.get("target_capacity_percent", 80.0)

            if min_cap >= target_cap:
                errors["min_capacity_percent"] = "min_must_be_less_than_target"

            # Validace max price
            max_price = user_input.get("max_ups_price_czk", 10.0)
            if max_price < 1.0 or max_price > 50.0:
                errors["max_ups_price_czk"] = "invalid_price"

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
        """Get schema for battery prediction step."""
        if defaults is None:
            defaults = self._wizard_data if self._wizard_data else {}

        schema_fields = {
            vol.Optional(
                CONF_AUTO_MODE_SWITCH,
                default=defaults.get(CONF_AUTO_MODE_SWITCH, False),
            ): bool,
            vol.Optional(
                "min_capacity_percent",
                default=defaults.get("min_capacity_percent", 20.0),
            ): vol.All(vol.Coerce(float), vol.Range(min=5.0, max=95.0)),
            vol.Optional(
                "disable_planning_min_guard",
                default=defaults.get("disable_planning_min_guard", False),
            ): selector.BooleanSelector(),
            vol.Optional(
                "target_capacity_percent",
                default=defaults.get("target_capacity_percent", 80.0),
            ): vol.All(vol.Coerce(float), vol.Range(min=10.0, max=100.0)),
            vol.Optional(
                "home_charge_rate", default=defaults.get("home_charge_rate", 2.8)
            ): vol.All(vol.Coerce(float), vol.Range(min=0.5, max=10.0)),
            # SAFETY LIMIT (applies to planner)
            vol.Optional(
                "max_ups_price_czk", default=defaults.get("max_ups_price_czk", 10.0)
            ): vol.All(vol.Coerce(float), vol.Range(min=1.0, max=50.0)),
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
    ) -> FlowResult:
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

        schema_fields = {
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
    ) -> FlowResult:
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

        schema_fields = {
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
    ) -> FlowResult:
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
    ) -> FlowResult:
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

        old_weekend_same = self._wizard_data.get(
            "tariff_weekend_same_as_weekday", True
        )
        new_weekend_same = user_input.get("tariff_weekend_same_as_weekday", True)
        return new_tariff_count == "dual" and old_weekend_same != new_weekend_same

    def _validate_pricing_distribution(self, user_input: Dict[str, Any]) -> Dict[str, str]:
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
        if not is_valid:
            errors["tariff_vt_start_weekday"] = error_key

        weekend_same = user_input.get("tariff_weekend_same_as_weekday", True)
        if not weekend_same:
            vt_weekend = user_input.get("tariff_vt_start_weekend", "")
            nt_weekend = user_input.get("tariff_nt_start_weekend", "0")
            is_valid, error_key = validate_tariff_hours(
                vt_weekend, nt_weekend, allow_single_tariff=True
            )
            if not is_valid:
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
        weekend_same_default = defaults.get("tariff_weekend_same_as_weekday")
        if weekend_same_default is None:
            if (
                "tariff_vt_start_weekend" not in defaults
                and "tariff_nt_start_weekend" not in defaults
            ):
                weekend_same_default = True
            else:
                weekend_same_default = str(weekend_vt_default) == str(
                    weekday_vt_default
                ) and str(weekend_nt_default) == str(weekday_nt_default)

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
                        "tariff_weekend_same_as_weekday",
                        default=bool(weekend_same_default),
                    ): bool,
                }
            )
            if not weekend_same_default:
                schema_fields.update(
                    {
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
    ) -> FlowResult:
        """Wizard Step: Boiler module configuration."""
        from .const import (CONF_BOILER_ALT_COST_KWH,
                            CONF_BOILER_ALT_ENERGY_SENSOR,
                            CONF_BOILER_ALT_HEATER_SWITCH_ENTITY,
                            CONF_BOILER_COLD_INLET_TEMP_C,
                            CONF_BOILER_DEADLINE_TIME,
                            CONF_BOILER_HAS_ALTERNATIVE_HEATING,
                            CONF_BOILER_HEATER_POWER_KW_ENTITY,
                            CONF_BOILER_HEATER_SWITCH_ENTITY,
                            CONF_BOILER_PLAN_SLOT_MINUTES,
                            CONF_BOILER_PLANNING_HORIZON_HOURS,
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
                            DEFAULT_BOILER_HEATER_POWER_KW_ENTITY,
                            DEFAULT_BOILER_PLAN_SLOT_MINUTES,
                            DEFAULT_BOILER_PLANNING_HORIZON_HOURS,
                            DEFAULT_BOILER_STRATIFICATION_MODE,
                            DEFAULT_BOILER_TARGET_TEMP_C,
                            DEFAULT_BOILER_TEMP_SENSOR_POSITION,
                            DEFAULT_BOILER_TWO_ZONE_SPLIT_RATIO)

        if user_input is not None:
            # Kontrola tlačítka "Zpět"
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_boiler")

            self._wizard_data.update(user_input)
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
                                {"value": "top", "label": "Přímo nahoře (100%)"},
                                {
                                    "value": "upper_quarter",
                                    "label": "Horní čtvrtina (75%)",
                                },
                                {"value": "middle", "label": "Polovina (50%)"},
                                {
                                    "value": "lower_quarter",
                                    "label": "Dolní čtvrtina (25%)",
                                },
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
                            DEFAULT_BOILER_HEATER_POWER_KW_ENTITY,
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
                    # Alternativa
                    vol.Optional(
                        CONF_BOILER_HAS_ALTERNATIVE_HEATING,
                        default=defaults.get(
                            CONF_BOILER_HAS_ALTERNATIVE_HEATING, False
                        ),
                    ): selector.BooleanSelector(),
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
                    # Number inputy místo sliderů
                    vol.Optional(
                        CONF_BOILER_PLANNING_HORIZON_HOURS,
                        default=defaults.get(
                            CONF_BOILER_PLANNING_HORIZON_HOURS,
                            DEFAULT_BOILER_PLANNING_HORIZON_HOURS,
                        ),
                    ): selector.NumberSelector(
                        selector.NumberSelectorConfig(
                            min=12, max=72, step=1, mode=selector.NumberSelectorMode.BOX
                        )
                    ),
                    vol.Optional(
                        CONF_BOILER_PLAN_SLOT_MINUTES,
                        default=defaults.get(
                            CONF_BOILER_PLAN_SLOT_MINUTES,
                            DEFAULT_BOILER_PLAN_SLOT_MINUTES,
                        ),
                    ): selector.NumberSelector(
                        selector.NumberSelectorConfig(
                            min=15,
                            max=120,
                            step=15,
                            mode=selector.NumberSelectorMode.BOX,
                        )
                    ),
                    vol.Optional("go_back", default=False): selector.BooleanSelector(),
                }
            ),
            description_placeholders=self._get_step_placeholders("wizard_boiler"),
        )

    async def async_step_wizard_summary(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Wizard Step 9: Summary and confirmation."""
        # This will be overridden in ConfigFlow and OptionsFlow
        raise NotImplementedError("Must be implemented in subclass")


class ConfigFlow(WizardMixin, config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for OIG Cloud."""

    VERSION = 1

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
    ) -> FlowResult:
        """Handle the initial step - choose setup type."""
        if user_input is not None:
            setup_type = user_input.get("setup_type", "wizard")

            if setup_type == "wizard":
                return await self.async_step_wizard_welcome()
            elif setup_type == "quick":
                return await self.async_step_quick_setup()
            else:  # import
                return await self.async_step_import_yaml()

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema(
                {
                    vol.Required("setup_type", default="wizard"): vol.In(
                        {
                            "wizard": "wizard",
                            "quick": "quick",
                            "import": "import",
                        }
                    )
                }
            ),
            description_placeholders=self._get_step_placeholders("user"),
        )

    async def async_step_quick_setup(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
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
                from .api.ote_api import OteApi

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
                    "notifications_scan_interval": 300,
                    "data_source_mode": "cloud_only",
                    "local_proxy_stale_minutes": 10,
                    "local_event_debounce_ms": 300,
                    "enable_solar_forecast": False,
                    "enable_statistics": True,
                    "enable_extended_sensors": True,
                    "enable_pricing": False,
                    "enable_battery_prediction": False,
                    "enable_dashboard": False,
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

    async def async_step_import_yaml(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Import from YAML configuration."""
        # NOTE: YAML import is not implemented yet.
        return self.async_abort(reason="not_implemented")

    async def async_step_wizard_summary(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
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

    @property
    def config_entry(self) -> config_entries.ConfigEntry:
        """Return config entry, even if hass isn't attached yet."""
        try:
            # Try native property (works after HA attaches hass)
            return super().config_entry  # type: ignore[attr-defined]
        except Exception:
            return getattr(self, "_config_entry_cache", None)

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize options flow."""
        # IMPORTANT (HA 2025.12+):
        # - `config_entries.OptionsFlow` does NOT implement `__init__`.
        # - `config_entry` property is read-only and only available after HA sets `hass`.
        # - In HA 2025.12, the config entry id is derived from `self.handler` (set by HA).
        super().__init__()
        self._config_entry_cache = config_entry

        # Předvyplnit wizard_data z existující konfigurace – robustně proti chybějícím/poškozeným datům
        try:
            backend_options = dict(config_entry.options)
        except Exception:  # pragma: no cover - defensivní logika
            _LOGGER.exception(
                "OptionsFlow init: failed to read existing options, using empty defaults"
            )
            backend_options = {}

        frontend_pricing = {}
        try:
            frontend_pricing = self._map_backend_to_frontend(backend_options)
        except Exception:  # pragma: no cover - defensivní logika
            _LOGGER.exception("OptionsFlow init: pricing mapping failed, keeping raw")

        self._wizard_data = backend_options | frontend_pricing

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
    ) -> FlowResult:
        """Entry point for options flow - redirect to wizard welcome."""
        return await self.async_step_wizard_welcome_reconfigure()

    async def async_step_wizard_welcome_reconfigure(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
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
    ) -> FlowResult:
        """Override summary step for options flow - update entry instead of creating new."""
        if user_input is not None:
            # Zkontrolovat, jestli uživatel chce jít zpět
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_summary")

            # Aktualizovat existující entry se všemi daty (stejně jako v ConfigFlow)
            new_options = self._build_options_payload(self._wizard_data)

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
                self.hass.config_entries.async_update_entry(
                    self.config_entry, options=new_options
                )
                _LOGGER.warning("🔍 async_update_entry completed")

                # Automaticky reloadnout integraci pro aplikování změn
                _LOGGER.warning("🔍 About to reload integration")
                await self.hass.config_entries.async_reload(self.config_entry.entry_id)
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
            f"- Uživatel: {self.config_entry.data.get(CONF_USERNAME, 'N/A')}",
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
