import voluptuous as vol
import logging
import asyncio
import aiohttp
from typing import Dict, Any, Optional, TYPE_CHECKING
from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResult
from homeassistant.core import callback
from homeassistant.const import STATE_UNKNOWN, STATE_UNAVAILABLE
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers import selector

if TYPE_CHECKING:
    pass
from .const import (
    DEFAULT_NAME,
    DOMAIN,
    CONF_USERNAME,
    CONF_PASSWORD,
    CONF_AUTO_MODE_SWITCH,
)
from .data_source import PROXY_LAST_DATA_ENTITY_ID
from .lib.oig_cloud_client.api.oig_cloud_api import OigCloudApi

_LOGGER = logging.getLogger(__name__)


# Exception classes
class CannotConnect(Exception):
    """Error to indicate we cannot connect."""


class InvalidAuth(Exception):
    """Error to indicate invalid authentication."""


class LiveDataNotEnabled(Exception):
    """Error to indicate live data are not enabled in OIG Cloud app."""


class InvalidSolarForecastApiKey(Exception):
    """Error to indicate invalid Solar Forecast API key."""


async def validate_input(hass, data: Dict[str, Any]) -> Dict[str, Any]:
    """Validate the user input allows us to connect."""
    api = OigCloudApi(data[CONF_USERNAME], data[CONF_PASSWORD], False)

    if not await api.authenticate():
        raise InvalidAuth

    # Test connection and check for live data
    try:
        stats = await api.get_stats()
        if not stats:
            raise CannotConnect

        # CRITICAL: Check if live data (actual) is present
        # Stats structure: { "box_id": { "actual": {...}, "settings": {...} } }
        first_device = next(iter(stats.values())) if stats else None
        if not first_device or "actual" not in first_device:
            _LOGGER.error(
                "Live data not found in API response. User must enable 'Živá data' in OIG Cloud mobile app."
            )
            raise LiveDataNotEnabled

    except LiveDataNotEnabled:
        raise
    except Exception as e:
        _LOGGER.error(f"Connection test failed: {e}")
        raise CannotConnect

    return {"title": DEFAULT_NAME}


async def validate_solar_forecast_api_key(
    api_key: str, lat: float = 50.1219800, lon: float = 13.9373742
) -> bool:
    """Validate Solar Forecast API key by making a test request.

    Args:
        api_key: The API key to validate
        lat: Latitude for test request (default: Prague)
        lon: Longitude for test request (default: Prague)

    Returns:
        True if API key is valid, False otherwise

    Raises:
        InvalidSolarForecastApiKey: If API key is invalid
    """
    if not api_key or not api_key.strip():
        # Prázdný klíč je OK - použije se veřejné API s limity
        return True

    # Test URL s API klíčem - použijeme minimální parametry
    test_url = (
        f"https://api.forecast.solar/{api_key.strip()}/estimate/{lat}/{lon}/35/0/1"
    )

    _LOGGER.debug(f"🔑 Validating Solar Forecast API key: {test_url[:50]}...")

    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(test_url, timeout=10) as response:
                if response.status == 200:
                    _LOGGER.info("🔑 Solar Forecast API key validation: SUCCESS")
                    return True
                elif response.status == 401:
                    # Unauthorized - špatný API klíč
                    _LOGGER.warning(
                        "🔑 Solar Forecast API key validation: UNAUTHORIZED (401)"
                    )
                    raise InvalidSolarForecastApiKey(
                        "API key is invalid or unauthorized"
                    )
                elif response.status == 429:
                    # Rate limit - klíč je platný, ale překročen limit
                    _LOGGER.warning(
                        "🔑 Solar Forecast API key validation: RATE LIMITED (429) - but key seems valid"
                    )
                    return True  # Klíč je OK, jen je rate limited
                else:
                    error_text = await response.text()
                    _LOGGER.error(
                        f"🔑 Solar Forecast API validation failed with status {response.status}: {error_text}"
                    )
                    raise InvalidSolarForecastApiKey(
                        f"API returned status {response.status}"
                    )
    except aiohttp.ClientError as e:
        _LOGGER.error(f"🔑 Solar Forecast API validation network error: {e}")
        raise InvalidSolarForecastApiKey(f"Network error: {e}")
    except asyncio.TimeoutError:
        _LOGGER.error("🔑 Solar Forecast API validation timeout")
        raise InvalidSolarForecastApiKey("Request timeout")


# Nové konstanty pro skenovací intervaly
CONF_STANDARD_SCAN_INTERVAL = "standard_scan_interval"
CONF_EXTENDED_SCAN_INTERVAL = "extended_scan_interval"

# Solar Forecast konstanty
CONF_SOLAR_FORECAST_ENABLED = "solar_forecast_enabled"
CONF_SOLAR_FORECAST_API_KEY = "solar_forecast_api_key"
CONF_SOLAR_FORECAST_LATITUDE = "solar_forecast_latitude"
CONF_SOLAR_FORECAST_LONGITUDE = "solar_forecast_longitude"
CONF_SOLAR_FORECAST_INTERVAL = "solar_forecast_interval"

# String 1
CONF_SOLAR_FORECAST_STRING1_ENABLED = "solar_forecast_string1_enabled"
CONF_SOLAR_FORECAST_STRING1_DECLINATION = "solar_forecast_string1_declination"
CONF_SOLAR_FORECAST_STRING1_AZIMUTH = "solar_forecast_string1_azimuth"
CONF_SOLAR_FORECAST_STRING1_KWP = "solar_forecast_string1_kwp"

# String 2
CONF_SOLAR_FORECAST_STRING2_ENABLED = "solar_forecast_string2_enabled"
CONF_SOLAR_FORECAST_STRING2_DECLINATION = "solar_forecast_string2_declination"
CONF_SOLAR_FORECAST_STRING2_AZIMUTH = "solar_forecast_string2_azimuth"
CONF_SOLAR_FORECAST_STRING2_KWP = "solar_forecast_string2_kwp"

# Statistické parametry
CONF_STATISTICS_ENABLED = "statistics_enabled"
CONF_STATISTICS_SAMPLING_SIZE = "statistics_sampling_size"
CONF_STATISTICS_MAX_AGE_DAYS = "statistics_max_age_days"
CONF_STATISTICS_RESTORE_DATA = "statistics_restore_data"
CONF_STATISTICS_MEDIAN_MINUTES = "statistics_median_minutes"

# Přidat nové konfigurace pro spotové ceny
SPOT_PRICING_SCHEMA = vol.Schema(
    {
        # Obecné nastavení
        vol.Optional("spot_trading_enabled", default=False): bool,
        vol.Optional("distribution_area", default="PRE"): vol.In(["PRE", "CEZ", "EGD"]),
        # Fixní tarif (pro ty, kdo neobchodují na spotu)
        vol.Optional("fixed_price_enabled", default=True): bool,
        vol.Optional("fixed_price_vt", default=4.50): vol.Coerce(float),
        vol.Optional("fixed_price_nt", default=3.20): vol.Coerce(float),
        vol.Optional("fixed_price_single", default=4.00): vol.Coerce(float),
        vol.Optional("tariff_type", default="dual"): vol.In(["single", "dual"]),
        # Spot nákup - fixní poplatky
        vol.Optional("spot_buy_fixed_fee", default=0.0): vol.Coerce(float),
        # Spot nákup - procentní poplatky
        vol.Optional("spot_buy_percent_positive", default=110.0): vol.Coerce(float),
        vol.Optional("spot_buy_percent_negative", default=90.0): vol.Coerce(float),
        # Spot prodej - fixní poplatky
        vol.Optional("spot_sell_fixed_fee", default=0.0): vol.Coerce(float),
        # Spot prodej - procentní poplatky
        vol.Optional("spot_sell_percent_positive", default=85.0): vol.Coerce(float),
        vol.Optional("spot_sell_percent_negative", default=100.0): vol.Coerce(float),
        # Kombinace fixních a procentních poplatků
        vol.Optional("spot_buy_combined_enabled", default=False): bool,
        vol.Optional("spot_sell_combined_enabled", default=False): bool,
    }
)

DISTRIBUTION_SCHEMA = vol.Schema(
    {
        # Základní distribuční poplatky (uživatel zadává)
        vol.Optional("breaker_size", default=25): vol.In(
            [16, 20, 25, 32, 40, 50, 63, 80, 100]
        ),
        vol.Optional("consumption_category", default="C02d"): vol.In(
            ["C01d", "C02d", "C25d", "C26d"]
        ),
        vol.Optional("monthly_consumption_kwh", default=300): vol.Coerce(int),
        vol.Optional("yearly_consumption_kwh", default=3600): vol.Coerce(int),
        # Automaticky načítané poplatky (z databáze)
        vol.Optional("auto_load_distribution_fees", default=True): bool,
    }
)

STEP_USER_DATA_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_USERNAME, description={"suggested_value": ""}): str,
        vol.Required(CONF_PASSWORD): str,
        vol.Required(
            "live_data_enabled",
            default=False,
            description="✅ POTVRZUJI: Mám v aplikaci OIG Cloud zapnutá 'Živá data'",
        ): bool,
        vol.Optional(
            "enable_solar_forecast",
            default=False,
            description="Povolit solární předpověď",
        ): bool,
        vol.Optional(
            "enable_statistics",
            default=True,
            description="Povolit statistiky a analýzy",
        ): bool,
        vol.Optional(
            "enable_pricing",
            default=False,
            description="Povolit cenové senzory a spotové ceny z OTE",
        ): bool,
        vol.Optional(
            "enable_extended_sensors",
            default=True,
            description="Povolit rozšířené senzory (napětí, proudy, teploty)",
        ): bool,
        vol.Optional(
            "enable_dashboard",
            default=False,  # OPRAVA: změna z True na False
            description="Povolit webový dashboard s grafy",
        ): bool,  # NOVÉ: dashboard option
    }
)


def _validate_tariff_hours(
    vt_starts_str: str, nt_starts_str: str
) -> tuple[bool, Optional[str]]:
    """Validate VT/NT tariff hour starts for gaps and overlaps.

    Returns:
        (is_valid, error_key) - error_key is None if valid
    """
    # Parse VT starts
    try:
        vt_starts = [int(x.strip()) for x in vt_starts_str.split(",") if x.strip()]
        if not all(0 <= h <= 23 for h in vt_starts):
            return False, "invalid_hour_range"
    except ValueError:
        return False, "invalid_hour_format"

    # Parse NT starts
    try:
        nt_starts = [int(x.strip()) for x in nt_starts_str.split(",") if x.strip()]
        if not all(0 <= h <= 23 for h in nt_starts):
            return False, "invalid_hour_range"
    except ValueError:
        return False, "invalid_hour_format"

    # Build 24-hour coverage map
    hour_map = {}  # hour -> tariff type

    # Process VT starts - každý VT start znamená VT až do dalšího NT nebo VT
    for i, vt_start in enumerate(sorted(vt_starts)):
        # Najít další start (VT nebo NT)
        all_starts = sorted(vt_starts + nt_starts)
        try:
            next_start_idx = all_starts.index(vt_start) + 1
            if next_start_idx < len(all_starts):
                next_start = all_starts[next_start_idx]
            else:
                # Wrap to first start
                next_start = all_starts[0]
        except (ValueError, IndexError):
            next_start = (vt_start + 1) % 24

        # Mark hours as VT
        h = vt_start
        while h != next_start:
            if h in hour_map:
                return False, "overlapping_tariffs"
            hour_map[h] = "VT"
            h = (h + 1) % 24
            if len(hour_map) > 24:  # Safety check
                break

    # Process NT starts similarly
    for i, nt_start in enumerate(sorted(nt_starts)):
        all_starts = sorted(vt_starts + nt_starts)
        try:
            next_start_idx = all_starts.index(nt_start) + 1
            if next_start_idx < len(all_starts):
                next_start = all_starts[next_start_idx]
            else:
                next_start = all_starts[0]
        except (ValueError, IndexError):
            next_start = (nt_start + 1) % 24

        # Mark hours as NT
        h = nt_start
        while h != next_start:
            if h in hour_map:
                return False, "overlapping_tariffs"
            hour_map[h] = "NT"
            h = (h + 1) % 24
            if len(hour_map) > 24:
                break

    # Check for gaps (all 24 hours should be covered)
    if len(hour_map) != 24:
        return False, "tariff_gaps"

    return True, None


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

        # Migrace IMPORT (nákup)
        old_model = data.get("spot_pricing_model", "percentage")
        dual_tariff = data.get("dual_tariff_enabled", False)

        if old_model == "percentage":
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
        elif old_model == "fixed":
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
        elif old_model == "fixed_prices":
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

        # Migrace EXPORT (prodej)
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
        else:  # fixed
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

        # VT/NT hodiny (pokud je dvoutarif)
        if dual_tariff:
            migrated["vt_hours_start"] = data.get("vt_hours_start", "6:00")
            migrated["vt_hours_end"] = data.get("vt_hours_end", "22:00")

        return migrated

    @staticmethod
    def _map_pricing_to_backend(wizard_data: Dict[str, Any]) -> Dict[str, Any]:
        """Map UI pricing scenarios to backend attribute names.

        This function converts user-friendly UI selections to the exact
        attribute names that backend (spot_price_sensor.py) expects.

        Returns dict with backend-compatible attribute names.
        """
        backend_data = {}

        # Import (purchase) pricing
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
            # Convert kWh to MWh (backend expects MWh)
            fee_kwh = wizard_data.get("spot_fixed_fee_kwh", 0.50)
            backend_data["spot_fixed_fee_mwh"] = fee_kwh * 1000.0
        elif import_scenario == "fix_price":
            backend_data["spot_pricing_model"] = "fixed_prices"
            backend_data["fixed_commercial_price_vt"] = wizard_data.get(
                "fixed_price_kwh", 4.50
            )
            # Pro fixed prices backend očekává vždy VT cenu

        # Export (sell) pricing
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

        # Distribution fees (tariff count determines dual/single)
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

        # VAT rate
        backend_data["vat_rate"] = wizard_data.get("vat_rate", 21.0)

        return backend_data

    @staticmethod
    def _map_backend_to_frontend(backend_data: Dict[str, Any]) -> Dict[str, Any]:
        """Map backend attribute names back to UI-friendly frontend names.

        This is the reverse of _map_pricing_to_backend - used when loading
        existing configuration in OptionsFlow.
        """
        frontend_data = {}

        # Import (purchase) pricing
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
            # Convert MWh back to kWh (backend stores MWh)
            fee_mwh = backend_data.get("spot_fixed_fee_mwh", 500.0)
            frontend_data["spot_fixed_fee_kwh"] = fee_mwh / 1000.0
        elif spot_model == "fixed_prices":
            frontend_data["import_pricing_scenario"] = "fix_price"
            frontend_data["fixed_price_kwh"] = backend_data.get(
                "fixed_commercial_price_vt", 4.50
            )

        # Export (sell) pricing
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

        # Distribution fees (tariff)
        dual_tariff = backend_data.get("dual_tariff_enabled", False)
        frontend_data["tariff_count"] = "dual" if dual_tariff else "single"

        frontend_data["distribution_fee_vt_kwh"] = backend_data.get(
            "distribution_fee_vt_kwh", 1.42
        )

        if dual_tariff:
            frontend_data["distribution_fee_nt_kwh"] = backend_data.get(
                "distribution_fee_nt_kwh", 0.91
            )
            frontend_data["tariff_vt_start_weekday"] = backend_data.get(
                "tariff_vt_start_weekday", "6"
            )
            frontend_data["tariff_nt_start_weekday"] = backend_data.get(
                "tariff_nt_start_weekday", "22,2"
            )

        # VAT rate
        frontend_data["vat_rate"] = backend_data.get("vat_rate", 21.0)

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
            max_price = self._wizard_data.get("max_price_conf", 10.0)
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

            errors = {}

            # Validace povinných polí (pouze když NEjdeme zpět)
            if not user_input.get(CONF_USERNAME, "").strip():
                errors[CONF_USERNAME] = "required"
            if not user_input.get(CONF_PASSWORD, ""):
                errors[CONF_PASSWORD] = "required"

            if not user_input.get("live_data_enabled", False):
                errors["live_data_enabled"] = "live_data_not_confirmed"

            if errors:
                return self.async_show_form(
                    step_id="wizard_credentials",
                    data_schema=self._get_credentials_schema(),
                    errors=errors,
                    description_placeholders=self._get_step_placeholders(
                        "wizard_credentials"
                    ),
                )

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

            return self.async_show_form(
                step_id="wizard_credentials",
                data_schema=self._get_credentials_schema(),
                errors=errors,
                description_placeholders=self._get_step_placeholders(
                    "wizard_credentials"
                ),
            )

        return self.async_show_form(
            step_id="wizard_credentials",
            data_schema=self._get_credentials_schema(),
            description_placeholders=self._get_step_placeholders("wizard_credentials"),
        )

    async def async_step_wizard_modules(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Wizard Step 2: Select modules to enable."""
        if user_input is not None:
            # Kontrola tlačítka "Zpět"
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_modules")

            errors = {}

            if user_input.get("enable_battery_prediction"):
                if not user_input.get("enable_solar_forecast"):
                    errors["enable_battery_prediction"] = "requires_solar_forecast"
                if not user_input.get("enable_extended_sensors"):
                    errors["enable_extended_sensors"] = "required_for_battery"

            if user_input.get("enable_dashboard"):
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

                if missing:
                    errors["enable_dashboard"] = "dashboard_requires_all"
                    self._wizard_data["_missing_for_dashboard"] = missing

            if errors:
                return self.async_show_form(
                    step_id="wizard_modules",
                    data_schema=self._get_modules_schema(user_input),
                    errors=errors,
                    description_placeholders=self._get_step_placeholders(
                        "wizard_modules"
                    ),
                )

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

        return self.async_show_form(
            step_id="wizard_modules",
            data_schema=self._get_modules_schema(),
            description_placeholders=self._get_step_placeholders("wizard_modules"),
        )

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
            total += 2  # wizard_battery + wizard_planner
        if self._wizard_data.get("enable_pricing", False):
            total += 3  # wizard_pricing (3 kroky: import, export, distribution)
        if self._wizard_data.get("enable_boiler", False):
            total += 1  # wizard_boiler

        # Summary krok (vždy na konci):
        total += 1

        return total

    def _get_current_step_number(self, step_id: str) -> int:
        """Get current step number based on step_id and enabled modules."""
        # Detekce, zda běžíme v Options Flow (má welcome_reconfigure místo credentials)
        is_options_flow = (
            "wizard_welcome_reconfigure" in self._step_history
            or step_id == "wizard_welcome_reconfigure"
        )

        # Mapování kroků na čísla
        if is_options_flow:
            # Options Flow: welcome_reconfigure, modules, intervals (bez credentials)
            step_map = {
                "wizard_welcome_reconfigure": 1,
                "wizard_modules": 2,
                "wizard_intervals": 3,
            }
            current = 4  # Začínáme od 4 (po intervals)
        else:
            # Config Flow: welcome, credentials, modules, intervals
            step_map = {
                "wizard_welcome": 1,
                "wizard_credentials": 2,
                "wizard_modules": 3,
                "wizard_intervals": 4,
            }
            current = 5  # Začínáme od 5 (po intervals)

        # Dynamické kroky - musíme spočítat podle toho, co je zapnuté
        # Solar
        if step_id == "wizard_solar":
            return current
        if self._wizard_data.get("enable_solar_forecast", False):
            current += 1

        # Battery + Planner settings
        battery_enabled = self._wizard_data.get("enable_battery_prediction", False)
        if step_id == "wizard_battery":
            return current
        if battery_enabled:
            current += 1

        if step_id == "wizard_planner":
            return current if battery_enabled else current
        if battery_enabled:
            current += 1

        # Pricing - 3 kroky (import, export, distribution)
        if step_id == "wizard_pricing_import":
            return current
        if step_id == "wizard_pricing_export":
            return (
                current + 1
                if self._wizard_data.get("enable_pricing", False)
                else current
            )
        if step_id == "wizard_pricing_distribution":
            return (
                current + 2
                if self._wizard_data.get("enable_pricing", False)
                else current
            )
        if self._wizard_data.get("enable_pricing", False):
            current += 3

        # Boiler
        if step_id == "wizard_boiler":
            return current
        if self._wizard_data.get("enable_boiler", False):
            current += 1

        # Summary
        if step_id == "wizard_summary":
            return current

        # Pro základní kroky použij pevnou mapu
        return step_map.get(step_id, 1)

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
            "wizard_planner",
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

            if step == "wizard_solar" and not self._wizard_data.get(
                "enable_solar_forecast"
            ):
                continue
            if step == "wizard_battery" and not self._wizard_data.get(
                "enable_battery_prediction"
            ):
                continue
            if step == "wizard_planner" and not self._wizard_data.get(
                "enable_battery_prediction"
            ):
                continue
            # Všechny 3 pricing kroky se přeskakují, pokud není enable_pricing
            if step in [
                "wizard_pricing_import",
                "wizard_pricing_export",
                "wizard_pricing_distribution",
            ] and not self._wizard_data.get("enable_pricing"):
                continue
            if step == "wizard_boiler" and not self._wizard_data.get("enable_boiler"):
                continue

            return step

        return "wizard_summary"

    async def async_step_wizard_intervals(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Wizard Step 3: Configure scan intervals."""
        if user_input is not None:
            # Kontrola tlačítka "Zpět"
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_intervals")

            errors = {}

            # Validace intervalů s českými zprávami
            standard = user_input.get("standard_scan_interval", 30)
            extended = user_input.get("extended_scan_interval", 300)
            data_source_mode = self._sanitize_data_source_mode(
                user_input.get(
                    "data_source_mode", self._wizard_data.get("data_source_mode", "cloud_only")
                )
            )
            proxy_stale = user_input.get(
                "local_proxy_stale_minutes",
                self._wizard_data.get("local_proxy_stale_minutes", 10),
            )
            debounce_ms = user_input.get(
                "local_event_debounce_ms",
                self._wizard_data.get("local_event_debounce_ms", 300),
            )

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

            if data_source_mode == "local_only":
                proxy_state = (
                    self.hass.states.get(PROXY_LAST_DATA_ENTITY_ID)
                    if self.hass
                    else None
                )
                if proxy_state is None or proxy_state.state in (
                    STATE_UNAVAILABLE,
                    STATE_UNKNOWN,
                ):
                    errors["data_source_mode"] = "local_proxy_missing"

            if errors:
                return self.async_show_form(
                    step_id="wizard_intervals",
                    data_schema=vol.Schema(
                        {
                            vol.Optional(
                                "standard_scan_interval", default=standard
                            ): int,
                            vol.Optional(
                                "extended_scan_interval", default=extended
                            ): int,
                            vol.Optional("data_source_mode", default=data_source_mode): selector.SelectSelector(
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
                                default=proxy_stale,
                            ): int,
                            vol.Optional(
                                "local_event_debounce_ms",
                                default=debounce_ms,
                            ): int,
                            vol.Optional("go_back", default=False): bool,
                        }
                    ),
                    errors=errors,
                    description_placeholders=self._get_step_placeholders(
                        "wizard_intervals"
                    ),
                )

            self._wizard_data.update(user_input)
            self._step_history.append("wizard_intervals")

            next_step = self._get_next_step("wizard_intervals")
            return await getattr(self, f"async_step_{next_step}")()

        data_source_mode = self._sanitize_data_source_mode(
            self._wizard_data.get("data_source_mode", "cloud_only")
        )

        return self.async_show_form(
            step_id="wizard_intervals",
            data_schema=vol.Schema(
                {
                    vol.Optional("standard_scan_interval", default=30): int,
                    vol.Optional("extended_scan_interval", default=300): int,
                    vol.Optional("data_source_mode", default=data_source_mode): selector.SelectSelector(
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
            ),
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

            # Detekce změny stavu checkboxů - pokud se změnil, znovu zobrazit formulář s rozbalenými poli
            old_string1_enabled = self._wizard_data.get(
                CONF_SOLAR_FORECAST_STRING1_ENABLED, True
            )
            old_string2_enabled = self._wizard_data.get(
                "solar_forecast_string2_enabled", False
            )
            new_string1_enabled = user_input.get(
                CONF_SOLAR_FORECAST_STRING1_ENABLED, False
            )
            new_string2_enabled = user_input.get(
                "solar_forecast_string2_enabled", False
            )

            # Pokud se změnil stav checkboxu, aktualizovat data a znovu zobrazit formulář
            if (
                old_string1_enabled != new_string1_enabled
                or old_string2_enabled != new_string2_enabled
            ):
                self._wizard_data.update(user_input)
                return self.async_show_form(
                    step_id="wizard_solar",
                    data_schema=self._get_solar_schema(user_input),
                    description_placeholders=self._get_step_placeholders(
                        "wizard_solar"
                    ),
                )

            errors = {}

            # Validace API klíče podle módu
            api_key = user_input.get(CONF_SOLAR_FORECAST_API_KEY, "").strip()
            mode = user_input.get("solar_forecast_mode", "daily_optimized")

            if mode in ["every_4h", "hourly"] and not api_key:
                errors["solar_forecast_mode"] = "api_key_required_for_frequent_updates"

            # Validace GPS souřadnic
            try:
                lat = float(user_input.get(CONF_SOLAR_FORECAST_LATITUDE, 50.0))
                lon = float(user_input.get(CONF_SOLAR_FORECAST_LONGITUDE, 14.0))
                if not (-90 <= lat <= 90):
                    errors[CONF_SOLAR_FORECAST_LATITUDE] = "invalid_latitude"
                if not (-180 <= lon <= 180):
                    errors[CONF_SOLAR_FORECAST_LONGITUDE] = "invalid_longitude"
            except (ValueError, TypeError):
                errors["base"] = "invalid_coordinates"

            # Validace stringů
            string1_enabled = user_input.get(CONF_SOLAR_FORECAST_STRING1_ENABLED, False)
            string2_enabled = user_input.get("solar_forecast_string2_enabled", False)

            if not string1_enabled and not string2_enabled:
                errors["base"] = "no_strings_enabled"

            # Validace parametrů String 1
            if string1_enabled:
                try:
                    kwp1 = float(user_input.get(CONF_SOLAR_FORECAST_STRING1_KWP, 5.0))
                    decl1 = int(
                        user_input.get(CONF_SOLAR_FORECAST_STRING1_DECLINATION, 35)
                    )
                    azim1 = int(user_input.get(CONF_SOLAR_FORECAST_STRING1_AZIMUTH, 0))

                    if not (0 < kwp1 <= 15):
                        errors[CONF_SOLAR_FORECAST_STRING1_KWP] = "invalid_kwp"
                    if not (0 <= decl1 <= 90):
                        errors[CONF_SOLAR_FORECAST_STRING1_DECLINATION] = (
                            "invalid_declination"
                        )
                    if not (0 <= azim1 <= 360):
                        errors[CONF_SOLAR_FORECAST_STRING1_AZIMUTH] = "invalid_azimuth"
                except (ValueError, TypeError):
                    errors["base"] = "invalid_string1_params"

            # Validace parametrů String 2
            if string2_enabled:
                try:
                    kwp2 = float(user_input.get("solar_forecast_string2_kwp", 5.0))
                    decl2 = int(
                        user_input.get("solar_forecast_string2_declination", 35)
                    )
                    azim2 = int(user_input.get("solar_forecast_string2_azimuth", 180))

                    if not (0 < kwp2 <= 15):
                        errors["solar_forecast_string2_kwp"] = "invalid_kwp"
                    if not (0 <= decl2 <= 90):
                        errors["solar_forecast_string2_declination"] = (
                            "invalid_declination"
                        )
                    if not (0 <= azim2 <= 360):
                        errors["solar_forecast_string2_azimuth"] = "invalid_azimuth"
                except (ValueError, TypeError):
                    errors["base"] = "invalid_string2_params"

            if errors:
                return self.async_show_form(
                    step_id="wizard_solar",
                    data_schema=self._get_solar_schema(user_input),
                    errors=errors,
                    description_placeholders=self._get_step_placeholders(
                        "wizard_solar"
                    ),
                )

            self._wizard_data.update(user_input)
            self._step_history.append("wizard_solar")

            next_step = self._get_next_step("wizard_solar")
            return await getattr(self, f"async_step_{next_step}")()

        return self.async_show_form(
            step_id="wizard_solar",
            data_schema=self._get_solar_schema(),
            description_placeholders=self._get_step_placeholders("wizard_solar"),
        )

    def _get_solar_schema(
        self, defaults: Optional[Dict[str, Any]] = None
    ) -> vol.Schema:
        """Get schema for solar forecast step."""
        if defaults is None:
            defaults = self._wizard_data if self._wizard_data else {}

        # Získat GPS souřadnice z Home Assistant konfigurace jako default
        ha_latitude = self.hass.config.latitude if self.hass else 50.0
        ha_longitude = self.hass.config.longitude if self.hass else 14.0

        schema_fields = {
            vol.Optional(
                CONF_SOLAR_FORECAST_API_KEY,
                default=defaults.get(CONF_SOLAR_FORECAST_API_KEY, ""),
            ): str,
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

    async def async_step_wizard_planner(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Wizard Step 5b: Planner-specific parameters."""

        # Pokud je planner vypnutý, přeskoč krok (obrana proti nekonzistenci)
        if not self._wizard_data.get("enable_battery_prediction", False):
            next_step = self._get_next_step("wizard_planner")
            return await getattr(self, f"async_step_{next_step}")()

        if user_input is not None:
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_planner")

            self._wizard_data.update(user_input)
            self._step_history.append("wizard_planner")

            next_step = self._get_next_step("wizard_planner")
            return await getattr(self, f"async_step_{next_step}")()

        return self.async_show_form(
            step_id="wizard_planner",
            data_schema=self._get_planner_schema(),
            description_placeholders=self._get_step_placeholders("wizard_planner"),
        )

    def _get_planner_schema(
        self, defaults: Optional[Dict[str, Any]] = None
    ) -> vol.Schema:
        """Get schema for planner-specific settings (cheap window only)."""
        if defaults is None:
            defaults = self._wizard_data if self._wizard_data else {}

        schema_fields: Dict[Any, Any] = {
            vol.Optional(
                "enable_cheap_window_ups",
                default=defaults.get("enable_cheap_window_ups", True),
            ): bool,
            vol.Optional(
                "cheap_window_percentile",
                default=defaults.get("cheap_window_percentile", 30),
            ): vol.All(vol.Coerce(float), vol.Range(min=5, max=80)),
            vol.Optional(
                "cheap_window_max_intervals",
                default=defaults.get("cheap_window_max_intervals", 20),
            ): vol.All(vol.Coerce(int), vol.Range(min=2, max=96)),
            vol.Optional(
                "cheap_window_soc_guard_kwh",
                default=defaults.get("cheap_window_soc_guard_kwh", 0.5),
            ): vol.All(vol.Coerce(float), vol.Range(min=0.0, max=5.0)),
        }

        schema_fields[vol.Optional("go_back", default=False)] = (
            selector.BooleanSelector()
        )

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
            max_price = user_input.get("max_price_conf", 10.0)
            if max_price < 1.0 or max_price > 50.0:
                errors["max_price_conf"] = "invalid_price"

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
                "target_capacity_percent",
                default=defaults.get("target_capacity_percent", 80.0),
            ): vol.All(vol.Coerce(float), vol.Range(min=10.0, max=100.0)),
            vol.Optional(
                "home_charge_rate", default=defaults.get("home_charge_rate", 2.8)
            ): vol.All(vol.Coerce(float), vol.Range(min=0.5, max=10.0)),
            # ECONOMIC CHARGING PARAMETERS
            vol.Optional(
                "enable_economic_charging",
                default=defaults.get("enable_economic_charging", True),
            ): bool,
            vol.Optional(
                "min_savings_margin", default=defaults.get("min_savings_margin", 0.30)
            ): vol.All(vol.Coerce(float), vol.Range(min=0.0, max=5.0)),
            vol.Optional(
                "safety_margin_percent",
                default=defaults.get("safety_margin_percent", 10.0),
            ): vol.All(vol.Coerce(float), vol.Range(min=0.0, max=50.0)),
            # SAFETY LIMIT (applies to ALL algorithms)
            vol.Optional(
                "max_price_conf", default=defaults.get("max_price_conf", 10.0)
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
            # Kontrola tlačítka "Zpět"
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_pricing_import")

            # Detekce změny scénáře - pokud se změnil, znovu zobrazit formulář s novými poli
            old_scenario = self._wizard_data.get(
                "import_pricing_scenario", "spot_percentage"
            )
            new_scenario = user_input.get("import_pricing_scenario", "spot_percentage")

            if old_scenario != new_scenario:
                self._wizard_data.update(user_input)
                return self.async_show_form(
                    step_id="wizard_pricing_import",
                    data_schema=self._get_pricing_import_schema(user_input),
                    description_placeholders=self._get_step_placeholders(
                        "wizard_pricing_import"
                    ),
                )

            errors = {}

            # Validace podle scénáře
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

            if errors:
                return self.async_show_form(
                    step_id="wizard_pricing_import",
                    data_schema=self._get_pricing_import_schema(user_input),
                    errors=errors,
                    description_placeholders=self._get_step_placeholders(
                        "wizard_pricing_import"
                    ),
                )

            self._wizard_data.update(user_input)
            self._step_history.append("wizard_pricing_import")

            next_step = self._get_next_step("wizard_pricing_import")
            return await getattr(self, f"async_step_{next_step}")()

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
            # Kontrola tlačítka "Zpět"
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_pricing_export")

            # Detekce změny scénáře
            old_scenario = self._wizard_data.get(
                "export_pricing_scenario", "spot_percentage"
            )
            new_scenario = user_input.get("export_pricing_scenario", "spot_percentage")

            if old_scenario != new_scenario:
                self._wizard_data.update(user_input)
                return self.async_show_form(
                    step_id="wizard_pricing_export",
                    data_schema=self._get_pricing_export_schema(user_input),
                    description_placeholders=self._get_step_placeholders(
                        "wizard_pricing_export"
                    ),
                )

            errors = {}

            # Validace podle scénáře
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

            if errors:
                return self.async_show_form(
                    step_id="wizard_pricing_export",
                    data_schema=self._get_pricing_export_schema(user_input),
                    errors=errors,
                    description_placeholders=self._get_step_placeholders(
                        "wizard_pricing_export"
                    ),
                )

            self._wizard_data.update(user_input)
            self._step_history.append("wizard_pricing_export")

            next_step = self._get_next_step("wizard_pricing_export")
            return await getattr(self, f"async_step_{next_step}")()

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

    async def async_step_wizard_pricing_distribution(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Wizard Step 6c: Distribution fees, VT/NT hours, and VAT."""
        if user_input is not None:
            # Kontrola tlačítka "Zpět"
            if user_input.get("go_back", False):
                return await self._handle_back_button("wizard_pricing_distribution")

            # Detekce změny tariff_count - pokud se změnil, znovu zobrazit formulář
            old_tariff_count = self._wizard_data.get("tariff_count", "single")
            new_tariff_count = user_input.get("tariff_count", "single")

            if old_tariff_count != new_tariff_count:
                self._wizard_data.update(user_input)
                return self.async_show_form(
                    step_id="wizard_pricing_distribution",
                    data_schema=self._get_pricing_distribution_schema(user_input),
                    description_placeholders=self._get_step_placeholders(
                        "wizard_pricing_distribution"
                    ),
                )

            errors = {}

            # Validace distribučních poplatků
            dist_vt = user_input.get("distribution_fee_vt_kwh", 1.42)
            if dist_vt < 0 or dist_vt > 10:
                errors["distribution_fee_vt_kwh"] = "invalid_distribution_fee"

            # Pokud je dual tariff, validovat NT a hodiny
            tariff_count = user_input.get("tariff_count", "single")
            if tariff_count == "dual":
                dist_nt = user_input.get("distribution_fee_nt_kwh", 0.91)
                if dist_nt < 0 or dist_nt > 10:
                    errors["distribution_fee_nt_kwh"] = "invalid_distribution_fee"

                # Validace VT/NT hodin na mezery a překryvy
                vt_starts = user_input.get("tariff_vt_start_weekday", "6")
                nt_starts = user_input.get("tariff_nt_start_weekday", "22,2")

                is_valid, error_key = _validate_tariff_hours(vt_starts, nt_starts)
                if not is_valid:
                    errors["tariff_vt_start_weekday"] = error_key

            # Validace VAT
            vat = user_input.get("vat_rate", 21.0)
            if vat < 0 or vat > 30:
                errors["vat_rate"] = "invalid_vat"

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

    def _get_pricing_distribution_schema(
        self, defaults: Optional[Dict[str, Any]] = None
    ) -> vol.Schema:
        """Get schema for distribution/VAT step."""
        if defaults is None:
            defaults = self._wizard_data if self._wizard_data else {}

        tariff_count = defaults.get("tariff_count", "single")

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
                        default=defaults.get("tariff_vt_start_weekday", "6"),
                    ): str,
                    vol.Optional(
                        "tariff_nt_start_weekday",
                        default=defaults.get("tariff_nt_start_weekday", "22,2"),
                    ): str,
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
        from .const import (
            CONF_BOILER_ALT_COST_KWH,
            CONF_BOILER_ALT_ENERGY_SENSOR,
            CONF_BOILER_ALT_HEATER_SWITCH_ENTITY,
            CONF_BOILER_COLD_INLET_TEMP_C,
            CONF_BOILER_DEADLINE_TIME,
            CONF_BOILER_HAS_ALTERNATIVE_HEATING,
            CONF_BOILER_HEATER_POWER_KW_ENTITY,
            CONF_BOILER_HEATER_SWITCH_ENTITY,
            CONF_BOILER_PLANNING_HORIZON_HOURS,
            CONF_BOILER_PLAN_SLOT_MINUTES,
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
            DEFAULT_BOILER_PLANNING_HORIZON_HOURS,
            DEFAULT_BOILER_PLAN_SLOT_MINUTES,
            DEFAULT_BOILER_STRATIFICATION_MODE,
            DEFAULT_BOILER_TARGET_TEMP_C,
            DEFAULT_BOILER_TEMP_SENSOR_POSITION,
            DEFAULT_BOILER_TWO_ZONE_SPLIT_RATIO,
        )

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
                    "local_stale_after_seconds": 30,
                    "local_sync_debounce_ms": 300,
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
        # TODO: Implementovat import z YAML
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

            # Převést UI pricing scénáře na backend atributy
            pricing_backend = self._map_pricing_to_backend(self._wizard_data)

            planner_mode_value = self._get_planner_mode_value(self._wizard_data)

            return self.async_create_entry(
                title=DEFAULT_NAME,
                data={
                    CONF_USERNAME: self._wizard_data[CONF_USERNAME],
                    CONF_PASSWORD: self._wizard_data[CONF_PASSWORD],
                },
                options={
                    # Intervaly
                    "standard_scan_interval": self._wizard_data.get(
                        "standard_scan_interval", 30
                    ),
                    "extended_scan_interval": self._wizard_data.get(
                        "extended_scan_interval", 300
                    ),
                    # Moduly
                    "enable_statistics": self._wizard_data.get(
                        "enable_statistics", True
                    ),
                    "enable_solar_forecast": self._wizard_data.get(
                        "enable_solar_forecast", False
                    ),
                    "enable_battery_prediction": self._wizard_data.get(
                        "enable_battery_prediction", False
                    ),
                    "enable_pricing": self._wizard_data.get("enable_pricing", False),
                    "enable_extended_sensors": self._wizard_data.get(
                        "enable_extended_sensors", True
                    ),
                    "enable_chmu_warnings": self._wizard_data.get(
                        "enable_chmu_warnings", False
                    ),
                    "enable_dashboard": self._wizard_data.get(
                        "enable_dashboard", False
                    ),
                    # Extended sensors (single toggle)
                    # (Per-category sub-toggles were removed; they were unused in runtime.)
                    # Solar forecast - použít všechny parametry stejně jako v OptionsFlow
                    "solar_forecast_mode": self._wizard_data.get(
                        "solar_forecast_mode", "daily_optimized"
                    ),
                    CONF_SOLAR_FORECAST_API_KEY: self._wizard_data.get(
                        CONF_SOLAR_FORECAST_API_KEY, ""
                    ),
                    CONF_SOLAR_FORECAST_LATITUDE: self._wizard_data.get(
                        CONF_SOLAR_FORECAST_LATITUDE, 50.0
                    ),
                    CONF_SOLAR_FORECAST_LONGITUDE: self._wizard_data.get(
                        CONF_SOLAR_FORECAST_LONGITUDE, 14.0
                    ),
                    # String 1
                    CONF_SOLAR_FORECAST_STRING1_ENABLED: self._wizard_data.get(
                        CONF_SOLAR_FORECAST_STRING1_ENABLED, True
                    ),
                    CONF_SOLAR_FORECAST_STRING1_DECLINATION: self._wizard_data.get(
                        CONF_SOLAR_FORECAST_STRING1_DECLINATION, 35
                    ),
                    CONF_SOLAR_FORECAST_STRING1_AZIMUTH: self._wizard_data.get(
                        CONF_SOLAR_FORECAST_STRING1_AZIMUTH, 0
                    ),
                    CONF_SOLAR_FORECAST_STRING1_KWP: self._wizard_data.get(
                        CONF_SOLAR_FORECAST_STRING1_KWP, 5.0
                    ),
                    # String 2
                    "solar_forecast_string2_enabled": self._wizard_data.get(
                        "solar_forecast_string2_enabled", False
                    ),
                    "solar_forecast_string2_declination": self._wizard_data.get(
                        "solar_forecast_string2_declination", 35
                    ),
                    "solar_forecast_string2_azimuth": self._wizard_data.get(
                        "solar_forecast_string2_azimuth", 180
                    ),
                    "solar_forecast_string2_kwp": self._wizard_data.get(
                        "solar_forecast_string2_kwp", 5.0
                    ),
                    # Battery prediction - všechny parametry
                    "min_capacity_percent": self._wizard_data.get(
                        "min_capacity_percent", 20.0
                    ),
                    "target_capacity_percent": self._wizard_data.get(
                        "target_capacity_percent", 80.0
                    ),
                    "home_charge_rate": self._wizard_data.get("home_charge_rate", 2.8),
                    CONF_AUTO_MODE_SWITCH: self._wizard_data.get(
                        CONF_AUTO_MODE_SWITCH, False
                    ),
                    # Economic charging
                    "enable_economic_charging": self._wizard_data.get(
                        "enable_economic_charging", True
                    ),
                    "min_savings_margin": self._wizard_data.get(
                        "min_savings_margin", 0.30
                    ),
                    "safety_margin_percent": self._wizard_data.get(
                        "safety_margin_percent", 10.0
                    ),
                    # Safety limit
                    "max_price_conf": self._wizard_data.get("max_price_conf", 10.0),
                    # Battery balancing
                    "balancing_enabled": self._wizard_data.get(
                        "balancing_enabled", True
                    ),
                    "balancing_interval_days": self._wizard_data.get(
                        "balancing_interval_days", 7
                    ),
                    "balancing_hold_hours": self._wizard_data.get(
                        "balancing_hold_hours", 3
                    ),
                    "balancing_opportunistic_threshold": self._wizard_data.get(
                        "balancing_opportunistic_threshold", 1.1
                    ),
                    "balancing_economic_threshold": self._wizard_data.get(
                        "balancing_economic_threshold", 2.5
                    ),
                    # Hybrid/autonomy planner settings
                    "battery_planner_mode": planner_mode_value,
                    "enable_autonomous_preview": planner_mode_value != "hybrid",
                    "enable_cheap_window_ups": self._wizard_data.get(
                        "enable_cheap_window_ups", True
                    ),
                    "cheap_window_percentile": self._wizard_data.get(
                        "cheap_window_percentile", 30
                    ),
                    "cheap_window_max_intervals": self._wizard_data.get(
                        "cheap_window_max_intervals", 20
                    ),
                    "cheap_window_soc_guard_kwh": self._wizard_data.get(
                        "cheap_window_soc_guard_kwh", 0.5
                    ),
                    "autonomy_soc_step_kwh": self._wizard_data.get(
                        "autonomy_soc_step_kwh", 0.5
                    ),
                    "autonomy_target_penalty": self._wizard_data.get(
                        "autonomy_target_penalty", 0.5
                    ),
                    "autonomy_min_penalty": self._wizard_data.get(
                        "autonomy_min_penalty", 2.0
                    ),
                    "autonomy_negative_export_penalty": self._wizard_data.get(
                        "autonomy_negative_export_penalty", 50.0
                    ),
                    # Pricing - použít mapované backend atributy
                    **pricing_backend,
                    # Boiler module
                    "enable_boiler": self._wizard_data.get("enable_boiler", False),
                    "boiler_volume_l": self._wizard_data.get("boiler_volume_l", 120),
                    "boiler_target_temp_c": self._wizard_data.get(
                        "boiler_target_temp_c", 60.0
                    ),
                    "boiler_cold_inlet_temp_c": self._wizard_data.get(
                        "boiler_cold_inlet_temp_c", 10.0
                    ),
                    "boiler_temp_sensor_top": self._wizard_data.get(
                        "boiler_temp_sensor_top", ""
                    ),
                    "boiler_temp_sensor_bottom": self._wizard_data.get(
                        "boiler_temp_sensor_bottom", ""
                    ),
                    "boiler_stratification_mode": self._wizard_data.get(
                        "boiler_stratification_mode", "simple_avg"
                    ),
                    "boiler_two_zone_split_ratio": self._wizard_data.get(
                        "boiler_two_zone_split_ratio", 0.5
                    ),
                    "boiler_heater_power_kw_entity": self._wizard_data.get(
                        "boiler_heater_power_kw_entity",
                        "sensor.oig_2206237016_boiler_install_power",
                    ),
                    "boiler_heater_switch_entity": self._wizard_data.get(
                        "boiler_heater_switch_entity", ""
                    ),
                    "boiler_alt_heater_switch_entity": self._wizard_data.get(
                        "boiler_alt_heater_switch_entity", ""
                    ),
                    "boiler_has_alternative_heating": self._wizard_data.get(
                        "boiler_has_alternative_heating", False
                    ),
                    "boiler_alt_cost_kwh": self._wizard_data.get(
                        "boiler_alt_cost_kwh", 0.0
                    ),
                    "boiler_spot_price_sensor": self._wizard_data.get(
                        "boiler_spot_price_sensor", ""
                    ),
                    "boiler_deadline_time": self._wizard_data.get(
                        "boiler_deadline_time", "20:00"
                    ),
                    "boiler_planning_horizon_hours": self._wizard_data.get(
                        "boiler_planning_horizon_hours", 36
                    ),
                    "boiler_plan_slot_minutes": self._wizard_data.get(
                        "boiler_plan_slot_minutes", 30
                    ),
                    # Auto module
                    "enable_auto": self._wizard_data.get("enable_auto", False),
                },
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
        try:
            return OigCloudOptionsFlowHandler(config_entry)
        except Exception:  # pragma: no cover - nechceme spadnout na 500
            _LOGGER.exception(
                "❌ Failed to start options flow, falling back to legacy handler"
            )
        # Hard fallback: always provide functional handler to avoid 500
        return _OigCloudOptionsFlowHandlerLegacy(config_entry)


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

            # Převést UI pricing scénáře na backend atributy (stejně jako v ConfigFlow)
            pricing_backend = self._map_pricing_to_backend(self._wizard_data)

            # Získat planner mode a aplikovat overrides (CRITICAL - bylo missing!)
            planner_mode_value = self._get_planner_mode_value(self._wizard_data)

            # Aktualizovat existující entry se všemi daty (stejně jako v ConfigFlow)
            new_options = {
                # Intervaly
                "standard_scan_interval": self._wizard_data.get(
                    "standard_scan_interval", 30
                ),
                "extended_scan_interval": self._wizard_data.get(
                    "extended_scan_interval", 300
                ),
                "data_source_mode": self._sanitize_data_source_mode(
                    self._wizard_data.get("data_source_mode", "cloud_only")
                ),
                "local_proxy_stale_minutes": self._wizard_data.get(
                    "local_proxy_stale_minutes", 10
                ),
                "local_event_debounce_ms": self._wizard_data.get(
                    "local_event_debounce_ms", 300
                ),
                # Moduly
                "enable_statistics": self._wizard_data.get("enable_statistics", True),
                "enable_solar_forecast": self._wizard_data.get(
                    "enable_solar_forecast", False
                ),
                "enable_battery_prediction": self._wizard_data.get(
                    "enable_battery_prediction", False
                ),
                "enable_pricing": self._wizard_data.get("enable_pricing", False),
                "enable_extended_sensors": self._wizard_data.get(
                    "enable_extended_sensors", True
                ),
                "enable_chmu_warnings": self._wizard_data.get(
                    "enable_chmu_warnings", False
                ),
                "enable_dashboard": self._wizard_data.get("enable_dashboard", False),
                # Extended sensors detail
                # Extended sensors (single toggle)
                # (Per-category sub-toggles were removed; they were unused in runtime.)
                # Solar forecast - použít všechny parametry stejně jako v ConfigFlow
                "solar_forecast_mode": self._wizard_data.get(
                    "solar_forecast_mode", "daily_optimized"
                ),
                CONF_SOLAR_FORECAST_API_KEY: self._wizard_data.get(
                    CONF_SOLAR_FORECAST_API_KEY, ""
                ),
                CONF_SOLAR_FORECAST_LATITUDE: self._wizard_data.get(
                    CONF_SOLAR_FORECAST_LATITUDE, 50.0
                ),
                CONF_SOLAR_FORECAST_LONGITUDE: self._wizard_data.get(
                    CONF_SOLAR_FORECAST_LONGITUDE, 14.0
                ),
                # String 1
                CONF_SOLAR_FORECAST_STRING1_ENABLED: self._wizard_data.get(
                    CONF_SOLAR_FORECAST_STRING1_ENABLED, True
                ),
                CONF_SOLAR_FORECAST_STRING1_DECLINATION: self._wizard_data.get(
                    CONF_SOLAR_FORECAST_STRING1_DECLINATION, 35
                ),
                CONF_SOLAR_FORECAST_STRING1_AZIMUTH: self._wizard_data.get(
                    CONF_SOLAR_FORECAST_STRING1_AZIMUTH, 0
                ),
                CONF_SOLAR_FORECAST_STRING1_KWP: self._wizard_data.get(
                    CONF_SOLAR_FORECAST_STRING1_KWP, 5.0
                ),
                # String 2
                "solar_forecast_string2_enabled": self._wizard_data.get(
                    "solar_forecast_string2_enabled", False
                ),
                "solar_forecast_string2_declination": self._wizard_data.get(
                    "solar_forecast_string2_declination", 35
                ),
                "solar_forecast_string2_azimuth": self._wizard_data.get(
                    "solar_forecast_string2_azimuth", 180
                ),
                "solar_forecast_string2_kwp": self._wizard_data.get(
                    "solar_forecast_string2_kwp", 5.0
                ),
                # Battery prediction - všechny parametry
                "min_capacity_percent": self._wizard_data.get(
                    "min_capacity_percent", 20.0
                ),
                "target_capacity_percent": self._wizard_data.get(
                    "target_capacity_percent", 80.0
                ),
                "home_charge_rate": self._wizard_data.get("home_charge_rate", 2.8),
                CONF_AUTO_MODE_SWITCH: self._wizard_data.get(
                    CONF_AUTO_MODE_SWITCH, False
                ),
                # Economic charging
                "enable_economic_charging": self._wizard_data.get(
                    "enable_economic_charging", True
                ),
                "min_savings_margin": self._wizard_data.get("min_savings_margin", 0.30),
                "safety_margin_percent": self._wizard_data.get(
                    "safety_margin_percent", 10.0
                ),
                # Safety limit
                "max_price_conf": self._wizard_data.get("max_price_conf", 10.0),
                # Battery balancing
                "balancing_enabled": self._wizard_data.get("balancing_enabled", True),
                "balancing_interval_days": self._wizard_data.get(
                    "balancing_interval_days", 7
                ),
                "balancing_hold_hours": self._wizard_data.get(
                    "balancing_hold_hours", 3
                ),
                "balancing_opportunistic_threshold": self._wizard_data.get(
                    "balancing_opportunistic_threshold", 1.1
                ),
                "balancing_economic_threshold": self._wizard_data.get(
                    "balancing_economic_threshold", 2.5
                ),
                # Pricing - použít mapované backend atributy
                **pricing_backend,
                # Boiler module
                "enable_boiler": self._wizard_data.get("enable_boiler", False),
                "boiler_volume_l": self._wizard_data.get("boiler_volume_l", 120),
                "boiler_target_temp_c": self._wizard_data.get(
                    "boiler_target_temp_c", 60.0
                ),
                "boiler_cold_inlet_temp_c": self._wizard_data.get(
                    "boiler_cold_inlet_temp_c", 10.0
                ),
                "boiler_temp_sensor_top": self._wizard_data.get(
                    "boiler_temp_sensor_top", ""
                ),
                "boiler_temp_sensor_bottom": self._wizard_data.get(
                    "boiler_temp_sensor_bottom", ""
                ),
                "boiler_stratification_mode": self._wizard_data.get(
                    "boiler_stratification_mode", "simple_avg"
                ),
                "boiler_two_zone_split_ratio": self._wizard_data.get(
                    "boiler_two_zone_split_ratio", 0.5
                ),
                "boiler_heater_power_kw_entity": self._wizard_data.get(
                    "boiler_heater_power_kw_entity",
                    "sensor.oig_2206237016_boiler_install_power",
                ),
                "boiler_heater_switch_entity": self._wizard_data.get(
                    "boiler_heater_switch_entity", ""
                ),
                "boiler_alt_heater_switch_entity": self._wizard_data.get(
                    "boiler_alt_heater_switch_entity", ""
                ),
                "boiler_has_alternative_heating": self._wizard_data.get(
                    "boiler_has_alternative_heating", False
                ),
                "boiler_alt_cost_kwh": self._wizard_data.get(
                    "boiler_alt_cost_kwh", 0.0
                ),
                "boiler_spot_price_sensor": self._wizard_data.get(
                    "boiler_spot_price_sensor", ""
                ),
                "boiler_deadline_time": self._wizard_data.get(
                    "boiler_deadline_time", "20:00"
                ),
                "boiler_planning_horizon_hours": self._wizard_data.get(
                    "boiler_planning_horizon_hours", 36
                ),
                "boiler_plan_slot_minutes": self._wizard_data.get(
                    "boiler_plan_slot_minutes", 30
                ),
                # Auto module
                "enable_auto": self._wizard_data.get("enable_auto", False),
                # Hybrid/autonomy planner settings (CRITICAL - bylo missing!)
                "battery_planner_mode": planner_mode_value,
                "enable_autonomous_preview": planner_mode_value != "hybrid",
            }

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


# STARÝ OPTIONS FLOW KÓD - ponechám pro zpětnou kompatibilitu, ale nebude se používat
class _OigCloudOptionsFlowHandlerLegacy(config_entries.OptionsFlow):
    """Legacy options flow handler - kept for reference."""

    @property
    def config_entry(self) -> config_entries.ConfigEntry:
        """Return config entry, even if hass isn't attached yet."""
        try:
            return super().config_entry  # type: ignore[attr-defined]
        except Exception:
            return getattr(self, "_config_entry_cache", None)

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize options flow."""
        super().__init__()
        self._config_entry_cache = config_entry

    async def async_step_init_legacy(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Manage the options - zobrazit menu s výběrem konfigurace."""
        if user_input is not None:
            # Přesměrování na vybraný krok
            return await getattr(self, f"async_step_{user_input['config_type']}")()

        # Menu pro výběr typu konfigurace
        return self.async_show_form(
            step_id="init",
            data_schema=vol.Schema(
                {
                    vol.Required("config_type"): vol.In(
                        {
                            "basic_config": "🔧 Základní konfigurace (interval, přihlášení)",
                            "extended_sensors": "⚡ Rozšířené senzory (vyžaduje nastavení)",
                            "statistics_config": "📊 Statistiky a analýzy",
                            "solar_forecast": "☀️ Solární předpověď (vyžaduje nastavení)",
                            "battery_prediction": "🔋 Predikce baterie",
                            "pricing_config": "💰 Cenové senzory a spotové ceny z OTE",
                            "dashboard_config": "📈 Webový dashboard",  # NOVÉ
                        }
                    )
                }
            ),
            description_placeholders={
                "info": "Vyberte kategorii nastavení, kterou chcete upravit"
            },
        )

    async def async_step_basic_config(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Základní konfigurace."""
        if user_input is not None:
            _LOGGER.debug(
                "🔧 Basic config - user_input: %s, current_options: %s",
                user_input,
                self.config_entry.options,
            )
            # Pokud byly změněny přihlašovací údaje, aktualizuj je v config_entry.data
            new_options = {**self.config_entry.options, **user_input}
            _LOGGER.debug("🔧 Basic config - new_options: %s", new_options)

            # Kontrola, zda se změnily přihlašovací údaje
            username_changed = user_input.get("username") and user_input.get(
                "username"
            ) != self.config_entry.data.get(CONF_USERNAME)
            password_changed = user_input.get("password") and user_input.get(
                "password"
            ) != self.config_entry.data.get(CONF_PASSWORD)

            if username_changed or password_changed:
                # Aktualizuj také data v config_entry
                new_data = dict(self.config_entry.data)
                if username_changed:
                    new_data[CONF_USERNAME] = user_input["username"]
                if password_changed:
                    new_data[CONF_PASSWORD] = user_input["password"]

                # Aktualizuj config_entry s novými daty
                self.hass.config_entries.async_update_entry(
                    self.config_entry, data=new_data, options=new_options
                )
            else:
                # I když se nezměnilo heslo/username, musíme uložit nové options (např. interval)
                self.hass.config_entries.async_update_entry(
                    self.config_entry, options=new_options
                )

            # Restart integrace pro aplikování všech změn (včetně intervalu)
            await self.hass.config_entries.async_reload(self.config_entry.entry_id)

            _LOGGER.info(
                "🔧 Basic config saved: standard_scan_interval=%s",
                new_options.get("standard_scan_interval"),
            )

            # Vrátit se zpět do menu (NESMÍME volat async_create_entry, protože by to přepsalo options!)
            return await self.async_step_init()

        current_options = self.config_entry.options
        current_data = self.config_entry.data

        schema = vol.Schema(
            {
                vol.Optional(
                    "standard_scan_interval",
                    default=current_options.get("standard_scan_interval", 30),
                    description="Jak často načítat základní data z OIG Cloud",
                ): vol.All(int, vol.Range(min=30, max=300)),
                vol.Optional(
                    "username",
                    default=current_data.get(CONF_USERNAME, ""),
                    description="E-mail nebo uživatelské jméno pro přihlášení do OIG Cloud",
                ): str,
                vol.Optional(
                    "password",
                    default="",
                    description="Heslo pro OIG Cloud (pokud necháte prázdné, heslo se nezmění)",
                ): str,
            }
        )

        return self.async_show_form(
            step_id="basic_config",
            data_schema=schema,
            description_placeholders={
                "current_username": current_data.get(CONF_USERNAME, ""),
                "info": "Změny se aplikují automaticky po uložení",
            },
        )

    async def async_step_extended_sensors(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Konfigurace rozšířených senzorů."""
        if user_input is not None:
            new_options = {**self.config_entry.options, **user_input}

            # Per-category extended toggles were removed (unused in runtime).
            # Keep only the main enable + scan interval.

            # Uložíme změny PŘED reloadem
            self.hass.config_entries.async_update_entry(
                self.config_entry, options=new_options
            )

            # Restart integrace pro aplikování nových nastavení
            await self.hass.config_entries.async_reload(self.config_entry.entry_id)

            # Vrátit se zpět do menu
            return await self.async_step_init()

        current_options = self.config_entry.options
        extended_enabled = current_options.get("enable_extended_sensors", False)

        # Keep the legacy screen minimal for maintainability.
        schema_fields = {
            vol.Optional(
                "enable_extended_sensors",
                default=extended_enabled,
                description="Povolit rozšířené senzory pro detailní monitoring systému",
            ): bool,
            vol.Optional(
                "extended_scan_interval",
                default=current_options.get("extended_scan_interval", 300),
                description=f"{'✅ Jak často načítat rozšířená data (sekund)' if extended_enabled else '⏸️ Interval načítání (aktivní po zapnutí hlavního přepínače)'}",
            ): vol.All(int, vol.Range(min=300, max=3600)),
        }

        return self.async_show_form(
            step_id="extended_sensors",
            data_schema=vol.Schema(schema_fields),
            description_placeholders={
                "current_state": "Zapnuty" if extended_enabled else "Vypnuty",
                "info": (
                    "⚠️ Rozšířené senzory jsou vypnuté"
                    if not extended_enabled
                    else "✅ Rozšířené senzory jsou zapnuté"
                ),
            },
        )

    async def async_step_statistics_config(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Configure statistics options."""
        if user_input is not None:
            # OPRAVA: Použijeme self.config_entry.options místo self.options
            new_options = {**self.config_entry.options, **user_input}

            # Uložíme změny PŘED reloadem
            self.hass.config_entries.async_update_entry(
                self.config_entry, options=new_options
            )

            # Restart integrace pro aplikování nových nastavení
            await self.hass.config_entries.async_reload(self.config_entry.entry_id)

            # Vrátit se zpět do menu
            return await self.async_step_init()

        current_options = self.config_entry.options

        schema = vol.Schema(
            {
                vol.Optional(
                    "enable_statistics",
                    default=current_options.get("enable_statistics", True),
                    description="Medián spotřeby podle času, analýzy a predikce",
                ): bool,
            }
        )

        return self.async_show_form(
            step_id="statistics_config",
            data_schema=schema,
            description_placeholders={
                "current_state": (
                    "Povoleno"
                    if current_options.get("enable_statistics", True)
                    else "Zakázáno"
                ),
                "info": "Statistiky vypočítávají medián spotřeby podle času dne a dne v týdnu pro lepší predikce",
            },
        )

    async def async_step_battery_prediction(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Konfigurace predikce baterie a optimalizace nabíjení."""
        if user_input is not None:
            new_options = {**self.config_entry.options, **user_input}

            # Always use hybrid planner
            new_options["battery_planner_mode"] = "hybrid"
            new_options["enable_autonomous_preview"] = False

            # Uložíme změny PŘED reloadem
            self.hass.config_entries.async_update_entry(
                self.config_entry, options=new_options
            )

            # Restart integrace pro aplikování nových nastavení
            await self.hass.config_entries.async_reload(self.config_entry.entry_id)

            # Vrátit se zpět do menu
            return await self.async_step_init()

        current_options = self.config_entry.options
        battery_enabled = current_options.get("enable_battery_prediction", False)

        # NOVÉ: Získat seznam dostupných weather entit
        weather_entities: Dict[str, str] = {}
        if self.hass:
            for state in self.hass.states.async_all("weather"):
                # Preferujeme entity s forecast atributem
                has_forecast = bool(state.attributes.get("forecast"))
                label = f"{state.attributes.get('friendly_name', state.entity_id)}"
                if has_forecast:
                    label += " ✅ (má forecast)"
                weather_entities[state.entity_id] = label

        # Plně funkční schema s možností úprav
        schema_fields: Dict[str, Any] = {
            vol.Optional(
                "enable_battery_prediction",
                default=battery_enabled,
                description="🔋 Povolit inteligentní optimalizaci nabíjení baterie",
            ): bool,
            vol.Optional(
                "min_capacity_percent",
                default=current_options.get("min_capacity_percent", 20.0),
                description="📉 Minimální kapacita baterie (%)",
            ): vol.All(vol.Coerce(float), vol.Range(min=5.0, max=95.0)),
            vol.Optional(
                "target_capacity_percent",
                default=current_options.get("target_capacity_percent", 80.0),
                description="🎯 Cílová kapacita baterie (%)",
            ): vol.All(vol.Coerce(float), vol.Range(min=10.0, max=100.0)),
            vol.Optional(
                "home_charge_rate",
                default=current_options.get("home_charge_rate", 2.8),
                description="⚡ Nabíjecí výkon ze sítě (kW)",
            ): vol.All(vol.Coerce(float), vol.Range(min=0.5, max=10.0)),
            vol.Optional(
                CONF_AUTO_MODE_SWITCH,
                default=current_options.get(CONF_AUTO_MODE_SWITCH, False),
                description="🤖 Automaticky volat přepnutí režimu podle plánu",
            ): bool,
            # ECONOMIC CHARGING
            vol.Optional(
                "enable_economic_charging",
                default=current_options.get("enable_economic_charging", True),
                description="💡 Ekonomické nabíjení (forward simulace)",
            ): bool,
            vol.Optional(
                "min_savings_margin",
                default=current_options.get("min_savings_margin", 0.30),
                description="� Minimální úspora pro nabíjení (Kč/kWh)",
            ): vol.All(vol.Coerce(float), vol.Range(min=0.0, max=5.0)),
            vol.Optional(
                "safety_margin_percent",
                default=current_options.get("safety_margin_percent", 10.0),
                description="🛡️ Bezpečnostní margin nad minimum (%)",
            ): vol.All(vol.Coerce(float), vol.Range(min=0.0, max=50.0)),
            # SAFETY LIMIT
            vol.Optional(
                "max_price_conf",
                default=current_options.get("max_price_conf", 10.0),
                description="⛔ Maximální cena pro nabíjení (CZK/kWh) - POJISTKA",
            ): vol.All(vol.Coerce(float), vol.Range(min=1.0, max=50.0)),
            # BATTERY BALANCING PARAMETERS
            vol.Optional(
                "balancing_enabled",
                default=current_options.get("balancing_enabled", True),
                description="🔄 Povolit automatické vyrovnání článků baterie",
            ): bool,
            vol.Optional(
                "balancing_interval_days",
                default=current_options.get("balancing_interval_days", 7),
                description="📅 Interval vyrovnání (dny)",
            ): vol.All(vol.Coerce(int), vol.Range(min=3, max=30)),
            vol.Optional(
                "balancing_hold_hours",
                default=current_options.get("balancing_hold_hours", 3),
                description="⏱️ Doba držení na 100% (hodiny)",
            ): vol.All(vol.Coerce(int), vol.Range(min=1, max=12)),
            vol.Optional(
                "balancing_opportunistic_threshold",
                default=current_options.get("balancing_opportunistic_threshold", 1.1),
                description="💰 Cena pro opportunistic balancing (CZK/kWh)",
            ): vol.All(vol.Coerce(float), vol.Range(min=0.5, max=5.0)),
            vol.Optional(
                "balancing_economic_threshold",
                default=current_options.get("balancing_economic_threshold", 2.5),
                description="📊 Cena pro economic balancing (CZK/kWh)",
            ): vol.All(vol.Coerce(float), vol.Range(min=0.5, max=10.0)),
            vol.Optional(
                "enable_cheap_window_ups",
                default=current_options.get("enable_cheap_window_ups", True),
                description="🕒 Držet HOME UPS v nejlevnějších hodinách",
            ): bool,
            vol.Optional(
                "cheap_window_percentile",
                default=current_options.get("cheap_window_percentile", 30),
                description="📉 Jaký percentil cen je považován za levný (např. 30 = spodních 30 %)",
            ): vol.All(vol.Coerce(float), vol.Range(min=5, max=80)),
            vol.Optional(
                "cheap_window_max_intervals",
                default=current_options.get("cheap_window_max_intervals", 20),
                description="⏱️ Max. počet 15min intervalů, kdy se UPS vynutí",
            ): vol.All(vol.Coerce(int), vol.Range(min=2, max=96)),
            vol.Optional(
                "cheap_window_soc_guard_kwh",
                default=current_options.get("cheap_window_soc_guard_kwh", 0.5),
                description="🛡️ Minimální odstup od plánovacího minima pro UPS (kWh)",
            ): vol.All(vol.Coerce(float), vol.Range(min=0.0, max=5.0)),
            vol.Optional(
                "autonomy_soc_step_kwh",
                default=current_options.get("autonomy_soc_step_kwh", 0.5),
                description="🔬 Velikost SOC kroku pro autonomní DP simulaci (kWh)",
            ): vol.All(vol.Coerce(float), vol.Range(min=0.25, max=3.0)),
            vol.Optional(
                "autonomy_target_penalty",
                default=current_options.get("autonomy_target_penalty", 0.5),
                description="🎯 Jak silně trestat nesplnění cílové kapacity (násobek průměrné ceny)",
            ): vol.All(vol.Coerce(float), vol.Range(min=0.1, max=10.0)),
            vol.Optional(
                "autonomy_min_penalty",
                default=current_options.get("autonomy_min_penalty", 2.0),
                description="⚠️ Penalizace za pokles pod plánovací minimum (násobek ceny)",
            ): vol.All(vol.Coerce(float), vol.Range(min=1.0, max=100.0)),
            vol.Optional(
                "autonomy_negative_export_penalty",
                default=current_options.get("autonomy_negative_export_penalty", 50.0),
                description="🚫 Penalizace za export při záporné ceně (Kč/kWh)",
            ): vol.All(vol.Coerce(float), vol.Range(min=0.0, max=200.0)),
        }

        # Vysvětlení parametrů
        min_cap = current_options.get("min_capacity_percent", 20.0)
        target_cap = current_options.get("target_capacity_percent", 80.0)
        charge_rate = current_options.get("home_charge_rate", 2.8)
        economic_enabled = current_options.get("enable_economic_charging", True)
        min_savings = current_options.get("min_savings_margin", 0.30)
        safety_margin = current_options.get("safety_margin_percent", 10.0)
        max_price = current_options.get("max_price_conf", 10.0)

        algo_name = "EKONOMICKÝ" if economic_enabled else "LEGACY (percentil)"

        info_text = (
            f"🔋 CHYTRÉ NABÍJENÍ BATERIE\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"{'✅ ZAPNUTO' if battery_enabled else '❌ VYPNUTO'}\n\n"
            f"📊 Aktuální nastavení:\n"
            f"  • Algoritmus: {algo_name}\n"
            f"  • Min. kapacita: {min_cap:.0f}%\n"
            f"  • Cílová kapacita: {target_cap:.0f}%\n"
            f"  • Nabíjecí výkon: {charge_rate:.1f} kW\n"
            f"  • Min. úspora: {min_savings:.2f} Kč/kWh\n"
            f"  • Safety margin: {safety_margin:.0f}%\n"
            f"  • Max. cena (pojistka): {max_price:.1f} CZK/kWh\n\n"
            f"❓ Jak to funguje?\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"1️⃣ Systém sleduje spotové ceny elektřiny\n"
            f"2️⃣ Forward simulace: porovná náklady s/bez nabíjení\n"
            f"3️⃣ Nabíjí JEN pokud úspora ≥ {min_savings:.2f} Kč/kWh\n"
            f"4️⃣ Death valley prevence: nabije minimum pro přežití\n"
            f"4️⃣ Preferuje nejlevnější hodiny\n"
            f"5️⃣ Nikdy nenabíjí nad max. cenu\n\n"
            f"💡 Příklad:\n"
            f"  Baterie má 30% → OK, necháme vybíjet\n"
            f"  Baterie klesne na {min_cap:.0f}% → START nabíjení\n"
            f"  Vybere 3 nejlevnější hodiny do rána\n"
            f"  Nabije zpět na {target_cap:.0f}% pro další den\n\n"
            f"⚙️ Parametry:\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"📉 Min. kapacita:\n"
            f"   Pod touto úrovní začne nabíjet ze sítě\n"
            f"   Doporučeno: 15-25%\n\n"
            f"🎯 Cílová kapacita:\n"
            f"   Optimální stav baterie\n"
            f"   Používá se při bad weather módu\n"
            f"   Doporučeno: 70-90%\n\n"
            f"⚡ Nabíjecí výkon:\n"
            f"   Max. výkon vašeho systému ze sítě\n"
            f"   Zjistěte z dokumentace invertru\n\n"
            f"📊 Percentil špičky:\n"
            f"   Ceny nad tímto percentilem = špička\n"
            f"   Doporučeno: 75-85%\n\n"
            f"💰 Max. cena:\n"
            f"   Nikdy nenabíjet dráž než tato cena\n"
            f"   Doporučeno: 8-12 CZK/kWh\n\n"
            f"🌧️ Špatné počasí:\n"
            f"   Preventivní nabití před bouřkou/vichřicí\n"
            f"   Automaticky detekuje weather entitu\n"
            f"   Nabije na cílovou kapacitu\n\n"
            f"✅ Výhody:\n"
            f"  • Nabíjení v nejlevnějších hodinách\n"
            f"  • Baterie vždy nad minimem\n"
            f"  • Automatická optimalizace\n"
            f"  • Úspora nákladů na elektřinu\n"
            f"  • Ochrana před výpadky při nepřízni\n\n"
            f"⚠️ Vyžaduje:\n"
            f"  • Zapnuté spotové ceny (OTE)\n"
            f"  • Zapnuté statistiky spotřeby\n"
            f"  • Solární předpověď (doporučeno)"
        )

        return self.async_show_form(
            step_id="battery_prediction",
            data_schema=vol.Schema(schema_fields),
            description_placeholders={
                "current_state": ("✅ Zapnuto" if battery_enabled else "❌ Vypnuto"),
                "min_capacity": min_cap,
                "target_capacity": target_cap,
                "charge_rate": charge_rate,
                "info": info_text,
            },
        )

    async def async_step_solar_forecast(  # noqa: C901
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Konfigurace solární předpovědi."""
        errors = {}

        if user_input is not None:
            # Pokud je zaškrtnuté "Načíst z HA", přepíšeme GPS souřadnice
            if user_input.get("load_gps_from_ha", False):
                hass_lat = (
                    self.hass.config.latitude
                    if self.hass.config.latitude
                    else 50.1219800
                )
                hass_lon = (
                    self.hass.config.longitude
                    if self.hass.config.longitude
                    else 13.9373742
                )
                user_input["solar_forecast_latitude"] = hass_lat
                user_input["solar_forecast_longitude"] = hass_lon
                _LOGGER.info(f"📍 GPS načteno z HA: {hass_lat}, {hass_lon}")

            # Odstraníme load_gps_from_ha z options (je to jen dočasný příznak)
            user_input.pop("load_gps_from_ha", None)

            new_options = {**self.config_entry.options, **user_input}

            # Logika pro automatické zapnutí/vypnutí stringů
            solar_enabled = user_input.get("enable_solar_forecast", False)
            current_solar_enabled = self.config_entry.options.get(
                "enable_solar_forecast", False
            )

            if solar_enabled:
                # Společné zpracování API klíče pro oba scénáře
                api_key = user_input.get("solar_forecast_api_key")
                # OPRAVA 2: Správné zpracování API klíče včetně None
                if api_key is None:
                    api_key = ""
                else:
                    api_key = str(api_key).strip()

                # VALIDACE API KLÍČE - pokud je zadaný, zkontrolujeme, zda funguje
                if api_key:  # Pouze pokud není prázdný
                    try:
                        lat = float(
                            user_input.get("solar_forecast_latitude", 50.1219800)
                        )
                        lon = float(
                            user_input.get("solar_forecast_longitude", 13.9373742)
                        )

                        _LOGGER.info("🔑 Validating Solar Forecast API key...")
                        await validate_solar_forecast_api_key(api_key, lat, lon)
                        _LOGGER.info("🔑 API key validation successful!")
                    except InvalidSolarForecastApiKey as e:
                        _LOGGER.error(f"🔑 API key validation failed: {e}")
                        errors["solar_forecast_api_key"] = "invalid_api_key"
                    except Exception as e:
                        _LOGGER.error(f"🔑 API key validation error: {e}")
                        errors["solar_forecast_api_key"] = "validation_failed"

                # VŽDY uložit API klíč (i prázdný) - ale pouze pokud prošel validací
                if "solar_forecast_api_key" not in errors:
                    new_options["solar_forecast_api_key"] = api_key

                    # Debug log pro kontrolu
                    _LOGGER.info(
                        f"🔑 Solar forecast API key saved: '{api_key[:10]}...' (empty: {not bool(api_key)})"
                        if api_key
                        else "🔑 Solar forecast API key saved: (empty)"
                    )

                mode = user_input.get("solar_forecast_mode", "daily_optimized")

                # ROZDĚLENÍ: Pokud se solar forecast právě zapíná (nebyl zapnutý), pouze základní validace
                if not current_solar_enabled:
                    # Validace pouze GPS při prvním zapnutí
                    try:
                        lat = float(
                            user_input.get("solar_forecast_latitude", 50.1219800)
                        )
                        lon = float(
                            user_input.get("solar_forecast_longitude", 13.9373742)
                        )
                        if not (-90 <= lat <= 90):
                            errors["solar_forecast_latitude"] = "invalid_latitude"
                        if not (-180 <= lon <= 180):
                            errors["solar_forecast_longitude"] = "invalid_longitude"
                    except (ValueError, TypeError):
                        errors["base"] = "invalid_coordinates"

                    # Validace módu při prvním zapnutí
                    if mode in ["every_4h", "hourly"] and not api_key:
                        errors["solar_forecast_mode"] = (
                            "api_key_required_for_frequent_updates"
                        )

                    # OPRAVA 1: Při prvním zapnutí TAKÉ validujeme stringy
                    string1_enabled = user_input.get(
                        "solar_forecast_string1_enabled", True
                    )
                    string2_enabled = user_input.get(
                        "solar_forecast_string2_enabled", False
                    )

                    if not string1_enabled and not string2_enabled:
                        errors["base"] = "no_strings_enabled"

                    # Při prvním zapnutí automaticky zapneme String 1 s default hodnoty POUZE pokud není explicitně vypnutý
                    if "solar_forecast_string1_enabled" not in user_input:
                        new_options["solar_forecast_string1_enabled"] = True
                    if "solar_forecast_string2_enabled" not in user_input:
                        new_options["solar_forecast_string2_enabled"] = False

                    _LOGGER.info("Solar forecast zapínám - nastavuji default String 1")

                else:
                    # PLNÁ validace - solar forecast už byl zapnutý, uživatel upravuje parametry
                    try:
                        lat = float(
                            user_input.get("solar_forecast_latitude", 50.1219800)
                        )
                        lon = float(
                            user_input.get("solar_forecast_longitude", 13.9373742)
                        )
                        if not (-90 <= lat <= 90):
                            errors["solar_forecast_latitude"] = "invalid_latitude"
                        if not (-180 <= lon <= 180):
                            errors["solar_forecast_longitude"] = "invalid_longitude"
                    except (ValueError, TypeError):
                        errors["base"] = "invalid_coordinates"

                    # Validace frekvence podle API klíče
                    if mode in ["every_4h", "hourly"] and not api_key:
                        errors["solar_forecast_mode"] = (
                            "api_key_required_for_frequent_updates"
                        )

                    # Ověření, že je alespoň jeden string zapnutý
                    string1_enabled = user_input.get(
                        "solar_forecast_string1_enabled", False
                    )
                    string2_enabled = user_input.get(
                        "solar_forecast_string2_enabled", False
                    )

                    if not string1_enabled and not string2_enabled:
                        errors["base"] = "no_strings_enabled"

                    # Validace String 1 parametrů (pokud je zapnutý)
                    if string1_enabled:
                        try:
                            string1_kwp = float(
                                user_input.get("solar_forecast_string1_kwp", 5.4)
                            )
                            string1_declination = int(
                                user_input.get("solar_forecast_string1_declination", 10)
                            )
                            string1_azimuth = int(
                                user_input.get("solar_forecast_string1_azimuth", 138)
                            )
                            if not (0 < string1_kwp <= 15):
                                errors["solar_forecast_string1_kwp"] = "invalid_kwp"
                            if not (0 <= string1_declination <= 90):
                                errors["solar_forecast_string1_declination"] = (
                                    "invalid_declination"
                                )
                            if not (0 <= string1_azimuth <= 360):
                                errors["solar_forecast_string1_azimuth"] = (
                                    "invalid_azimuth"
                                )
                        except (ValueError, TypeError):
                            errors["base"] = "invalid_string1_params"

                    # Validace String 2 parametrů (pokud je zapnutý)
                    if string2_enabled:
                        try:
                            string2_kwp = float(
                                user_input.get("solar_forecast_string2_kwp", 5.4)
                            )
                            string2_declination = int(
                                user_input.get("solar_forecast_string2_declination", 10)
                            )
                            string2_azimuth = int(
                                user_input.get("solar_forecast_string2_azimuth", 138)
                            )
                            if not (0 < string2_kwp <= 15):
                                errors["solar_forecast_string2_kwp"] = "invalid_kwp"
                            if not (0 <= string2_declination <= 90):
                                errors["solar_forecast_string2_declination"] = (
                                    "invalid_declination"
                                )
                            if not (0 <= string2_azimuth <= 360):
                                errors["solar_forecast_string2_azimuth"] = (
                                    "invalid_azimuth"
                                )
                        except (ValueError, TypeError):
                            errors["base"] = "invalid_string2_params"
            else:
                # Solar forecast je vypnutý, ale uložíme API klíč pro příští zapnutí
                api_key = user_input.get("solar_forecast_api_key")
                if api_key is None:
                    api_key = ""
                else:
                    api_key = str(api_key).strip()

                # VALIDACE API KLÍČE - i když je modul vypnutý, validujeme klíč pokud je zadaný
                if api_key:  # Pouze pokud není prázdný
                    try:
                        lat = float(
                            user_input.get("solar_forecast_latitude", 50.1219800)
                        )
                        lon = float(
                            user_input.get("solar_forecast_longitude", 13.9373742)
                        )

                        _LOGGER.info(
                            "🔑 Validating Solar Forecast API key (module disabled)..."
                        )
                        await validate_solar_forecast_api_key(api_key, lat, lon)
                        _LOGGER.info("🔑 API key validation successful!")
                    except InvalidSolarForecastApiKey as e:
                        _LOGGER.error(f"🔑 API key validation failed: {e}")
                        errors["solar_forecast_api_key"] = "invalid_api_key"
                    except Exception as e:
                        _LOGGER.error(f"🔑 API key validation error: {e}")
                        errors["solar_forecast_api_key"] = "validation_failed"

                # Uložíme API klíč pouze pokud prošel validací
                if "solar_forecast_api_key" not in errors:
                    new_options["solar_forecast_api_key"] = api_key

                    # Debug log pro kontrolu
                    _LOGGER.info(
                        f"🔑 Solar forecast disabled, API key saved: '{api_key[:10]}...' (empty: {not bool(api_key)})"
                        if api_key
                        else "🔑 Solar forecast disabled, API key saved: (empty)"
                    )

                # DŮLEŽITÉ: Když je solar forecast vypnutý, VŽDY vypneme všechny stringy
                # ALE ponecháme všechny parametry pro příští zapnutí
                new_options["solar_forecast_string1_enabled"] = False
                new_options["solar_forecast_string2_enabled"] = False

                _LOGGER.info(
                    "Solar forecast vypnut - vypínám stringy, ale zachovávám parametry"
                )

            if not errors:
                # Uložíme změny NEJDŘÍVE
                self.hass.config_entries.async_update_entry(
                    self.config_entry, options=new_options
                )

                # Restart integrace pro aplikování nových nastavení
                await self.hass.config_entries.async_reload(self.config_entry.entry_id)

                # Pro solar forecast - spustíme okamžitou aktualizaci dat při zapnutí/změně
                if solar_enabled:
                    # Rozlišujeme mezi prvním zapnutím a změnou už zapnutého modulu
                    if not current_solar_enabled:
                        # PRVNÍ ZAPNUTÍ - senzory se teprve vytváří
                        _LOGGER.info(
                            "🌞 Solar forecast first activation - scheduling delayed update..."
                        )

                        # Naplánujeme update s delším zpožděním přes Home Assistant scheduler
                        async def delayed_solar_update() -> None:
                            await asyncio.sleep(15)  # Delší čekání
                            try:
                                # Místo hledání entity použijeme přímý přístup k integraci
                                from homeassistant.helpers import device_registry as dr

                                # Najdeme naši integraci v device registry
                                device_registry = dr.async_get(self.hass)
                                devices = dr.async_entries_for_config_entry(
                                    device_registry, self.config_entry.entry_id
                                )

                                if devices:
                                    # Spustíme refresh všech dat integrace
                                    await self.hass.services.async_call(
                                        "homeassistant",
                                        "reload_config_entry",
                                        {"entry_id": self.config_entry.entry_id},
                                        blocking=False,
                                    )
                                    _LOGGER.info(
                                        "🌞 Triggered integration reload for solar forecast initialization"
                                    )

                                    # Po dalším kráté době zkusíme update entity
                                    await asyncio.sleep(5)

                                    # Zkusíme najít a updatovat solar forecast entity
                                    entity_registry = er.async_get(self.hass)
                                    for entity in entity_registry.entities.values():
                                        if (
                                            entity.platform == DOMAIN
                                            and entity.domain == "sensor"
                                            and "solar_forecast" in entity.entity_id
                                            and not entity.entity_id.endswith(
                                                "_string1"
                                            )
                                            and not entity.entity_id.endswith(
                                                "_string2"
                                            )
                                        ):
                                            await self.hass.services.async_call(
                                                "homeassistant",
                                                "update_entity",
                                                {"entity_id": entity.entity_id},
                                                blocking=False,
                                            )
                                            _LOGGER.info(
                                                f"🌞 Triggered delayed solar forecast update for {entity.entity_id}"
                                            )
                                            return

                                    _LOGGER.info(
                                        "🌞 Solar forecast entity still not found after reload"
                                    )
                                else:
                                    _LOGGER.warning(
                                        "🌞 No devices found for integration"
                                    )

                            except Exception as e:
                                _LOGGER.warning(
                                    f"🌞 Failed delayed solar forecast update: {e}"
                                )

                        # Spustíme task na pozadí
                        self.hass.async_create_task(delayed_solar_update())

                    else:
                        # ZMĚNA EXISTUJÍCÍHO MODULU - senzory už existují, ale po reloadu potřebujeme chvíli počkat
                        _LOGGER.info(
                            "🌞 Solar forecast configuration update - scheduling delayed update after reload..."
                        )

                        # Spustíme update s krátkým zpožděním na pozadí, aby měl reload čas dokončit
                        async def delayed_config_update() -> None:
                            await asyncio.sleep(3)  # Krátké čekání po reloadu
                            try:
                                entity_registry = er.async_get(self.hass)
                                for entity in entity_registry.entities.values():
                                    if (
                                        entity.platform == DOMAIN
                                        and entity.domain == "sensor"
                                        and "solar_forecast" in entity.entity_id
                                        and not entity.entity_id.endswith("_string1")
                                        and not entity.entity_id.endswith("_string2")
                                    ):
                                        await self.hass.services.async_call(
                                            "homeassistant",
                                            "update_entity",
                                            {"entity_id": entity.entity_id},
                                            blocking=False,
                                        )
                                        _LOGGER.info(
                                            f"🌞 Triggered delayed solar forecast update for {entity.entity_id}"
                                        )
                                        return
                                _LOGGER.warning(
                                    "🌞 Solar forecast entity not found for delayed update"
                                )
                            except Exception as e:
                                _LOGGER.warning(
                                    f"🌞 Failed to trigger delayed solar forecast update: {e}"
                                )

                        self.hass.async_create_task(delayed_config_update())

                # Vrátit se zpět do menu
                return await self.async_step_init()

        current_options = self.config_entry.options
        solar_enabled = current_options.get("enable_solar_forecast", False)

        # Načtení GPS z Home Assistant nastavení
        hass_latitude = (
            self.hass.config.latitude if self.hass.config.latitude else 50.1219800
        )
        hass_longitude = (
            self.hass.config.longitude if self.hass.config.longitude else 13.9373742
        )

        # Pokus o načtení výkonu FVE ze senzoru
        default_kwp = 5.4
        try:
            # Hledáme senzor s installed_fve_power_wp
            entity_registry = er.async_get(self.hass)
            for entity in entity_registry.entities.values():
                if entity.entity_id.endswith("installed_fve_power_wp"):
                    state = self.hass.states.get(entity.entity_id)
                    if state and state.state not in ("unknown", "unavailable"):
                        # Převod z Wp na kWp, max 15 kWp na string
                        fve_power_wp = float(state.state)
                        total_kwp = round(fve_power_wp / 1000, 1)
                        default_kwp = min(total_kwp, 15.0)  # Max 15 kWp na string
                        break
        except (ValueError, TypeError, AttributeError):
            # Pokud se nepodaří načíst, použije se defaultní hodnota
            pass

        # VŽDY zobrazit všechny parametry, ale výchozí hodnoty podle stavu
        schema_fields = {
            vol.Optional(
                "enable_solar_forecast",
                default=solar_enabled,
                description="Povolit solární předpověď pro optimalizaci baterie a predikce výroby",
            ): bool,
        }

        # VŽDY přidáme všechna pole, ale s defaulty podle stavu
        # Kontrola API klíče pro podmíněné zobrazení režimů
        current_api_key = current_options.get("solar_forecast_api_key", "").strip()
        has_api_key = bool(current_api_key)

        # Dostupné režimy podle API klíče
        if has_api_key:
            mode_options = {
                "manual": "🔧 Pouze na vyžádání",
                "daily_optimized": "3x denně (6:00, 12:00, 16:00) - DOPORUČENO",
                "daily": "Jednou denně (6:00)",
                "every_4h": "Každé 4 hodiny (vyžaduje API klíč)",
                "hourly": "Každou hodinu (vyžaduje API klíč)",
            }
        else:
            mode_options = {
                "manual": "🔧 Pouze na vyžádání",
                "daily_optimized": "3x denně (6:00, 12:00, 16:00) - DOPORUČENO",
                "daily": "Jednou denně (6:00)",
                "every_4h": "Každé 4 hodiny (vyžaduje API klíč) - NEDOSTUPNÉ",
                "hourly": "Každou hodinu (vyžaduje API klíč) - NEDOSTUPNÉ",
            }

        schema_fields.update(
            {
                vol.Optional(
                    "solar_forecast_api_key",
                    default=current_options.get("solar_forecast_api_key", ""),
                    description="API klíč pro forecast.solar (volitelné, umožní častější aktualizace)",
                ): str,
                vol.Optional(
                    "solar_forecast_mode",
                    default=current_options.get(
                        "solar_forecast_mode", "daily_optimized"
                    ),
                    description=f"Jak často aktualizovat předpověď {('(pro častější režimy zadejte API klíč)' if not has_api_key else '')}",
                ): vol.In(mode_options),
                vol.Optional(
                    "load_gps_from_ha",
                    default=False,
                    description=f"📍 Načíst GPS z HA (aktuální: {hass_latitude:.4f}, {hass_longitude:.4f})",
                ): bool,
                vol.Optional(
                    "solar_forecast_latitude",
                    default=current_options.get(
                        "solar_forecast_latitude", hass_latitude
                    ),
                    description="GPS zeměpisná šířka vaší FVE (-90 až 90)",
                ): vol.Coerce(float),
                vol.Optional(
                    "solar_forecast_longitude",
                    default=current_options.get(
                        "solar_forecast_longitude", hass_longitude
                    ),
                    description="GPS zeměpisná délka vaší FVE (-180 až 180)",
                ): vol.Coerce(float),
                vol.Optional(
                    "solar_forecast_string1_enabled",
                    default=current_options.get(
                        "solar_forecast_string1_enabled",
                        True,  # Default True - string je dostupný
                    ),
                    description="Zapnout první string panelů (musí být alespoň jeden zapnutý)",
                ): bool,
                vol.Optional(
                    "solar_forecast_string1_kwp",
                    default=current_options.get(
                        "solar_forecast_string1_kwp", default_kwp
                    ),
                    description="Instalovaný výkon 1. stringu v kWp (max 15 kWp)",
                ): vol.Coerce(float),
                vol.Optional(
                    "solar_forecast_string1_declination",
                    default=current_options.get(
                        "solar_forecast_string1_declination", 10
                    ),
                    description="Sklon panelů 1. stringu od horizontály (0-90°)",
                ): vol.Coerce(int),
                vol.Optional(
                    "solar_forecast_string1_azimuth",
                    default=current_options.get("solar_forecast_string1_azimuth", 138),
                    description="Orientace panelů 1. stringu (0-sever, 90-východ, 180-jih, 270-západ)",
                ): vol.Coerce(int),
                vol.Optional(
                    "solar_forecast_string2_enabled",
                    default=current_options.get(
                        "solar_forecast_string2_enabled", False
                    ),
                    description="Zapnout druhý string panelů (volitelné)",
                ): bool,
                vol.Optional(
                    "solar_forecast_string2_kwp",
                    default=current_options.get(
                        "solar_forecast_string2_kwp", default_kwp
                    ),
                    description="Instalovaný výkon 2. stringu v kWp (max 15 kWp)",
                ): vol.Coerce(float),
                vol.Optional(
                    "solar_forecast_string2_declination",
                    default=current_options.get(
                        "solar_forecast_string2_declination", 10
                    ),
                    description="Sklon panelů 2. stringu od horizontály (0-90°)",
                ): vol.Coerce(int),
                vol.Optional(
                    "solar_forecast_string2_azimuth",
                    default=current_options.get("solar_forecast_string2_azimuth", 138),
                    description="Orientace panelů 2. stringu (0-sever, 90-východ, 180-jih, 270-západ)",
                ): vol.Coerce(int),
            }
        )

        return self.async_show_form(
            step_id="solar_forecast",
            data_schema=vol.Schema(schema_fields),
            errors=errors,
            description_placeholders={
                "current_state": "Povolen" if solar_enabled else "Zakázáno",
                "current_mode": (
                    current_options.get("solar_forecast_mode", "daily_optimized")
                    if solar_enabled
                    else "N/A"
                ),
                "info": (
                    "⚠️ Solar forecast je vypnutý - zapněte jej pro zobrazení dalších možností"
                    if not solar_enabled
                    else f"✅ Solar forecast je zapnutý - nastavte parametry (GPS: {hass_latitude:.4f}, {hass_longitude:.4f}, detekováno: {default_kwp} kWp)"
                ),
            },
        )

    async def async_step_pricing_config(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Main pricing configuration menu."""
        if user_input is not None:
            # Uložit změnu enable_pricing pokud byla provedena
            if "enable_pricing" in user_input:
                new_options = {**self.config_entry.options, **user_input}
                self.hass.config_entries.async_update_entry(
                    self.config_entry, options=new_options
                )

            # Přesměrování na vybraný podkrok
            if user_input.get("pricing_submenu"):
                return await getattr(
                    self, f"async_step_{user_input['pricing_submenu']}"
                )()

            # Návrat do hlavního menu
            return await self.async_step_init()

        current_options = self.config_entry.options
        spot_enabled = current_options.get("enable_pricing", False)

        # Hlavní menu pro pricing
        schema_fields: Dict[str, Any] = {
            vol.Required(
                "enable_pricing",
                default=spot_enabled,
                description="💰 Povolit cenové senzory a spotové ceny elektřiny z OTE",
            ): bool,
        }

        # Pokud jsou spotové ceny zapnuté, zobrazit submenu
        if spot_enabled:
            schema_fields[vol.Required("pricing_submenu")] = vol.In(
                {
                    "pricing_import": "📥 Nákupní cena - jak počítat cenu za odebranou elektřinu",
                    "pricing_export": "📤 Výkupní cena - kolik dostanete za prodej do sítě",
                    "pricing_distribution": "🔌 Distribuce & DPH - pevné poplatky",
                    "pricing_tariffs": "⏰ Tarifní pásma - kdy platí VT a NT",
                }
            )

        # Výpočet ukázkové ceny pro help
        if spot_enabled:
            model = current_options.get("spot_pricing_model", "percentage")
            spot_price = 3.00

            if model == "percentage":
                fee = current_options.get("spot_positive_fee_percent", 15.0)
                commercial = spot_price * (1 + fee / 100)
            elif model == "fixed":
                fee_mwh = current_options.get("spot_fixed_fee_mwh", 500.0)
                commercial = spot_price + (fee_mwh / 1000)
            else:  # fixed_prices
                commercial = current_options.get("fixed_commercial_price_vt", 4.50)

            dist_vt = current_options.get("distribution_fee_vt_kwh", 1.42)
            vat = current_options.get("vat_rate", 21.0)
            final_price = (commercial + dist_vt) * (1 + vat / 100)

            # Export price
            export_model = current_options.get("export_pricing_model", "percentage")
            if export_model == "percentage":
                export_fee = current_options.get("export_fee_percent", 15.0)
                export_price = spot_price * (1 - export_fee / 100)
            else:
                export_fee_czk = current_options.get("export_fixed_fee_czk", 0.20)
                export_price = spot_price - export_fee_czk

            info_text = (
                f"✅ Spotové ceny jsou ZAPNUTÉ\n\n"
                f"📊 Rychlý přehled aktuálního nastavení:\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                f"📥 NÁKUP (import ze sítě):\n"
                f"  • Model: {model}\n"
                f"  • Příklad: {final_price:.2f} CZK/kWh s DPH\n"
                f"    (spot {spot_price:.2f} + obchod + dist {dist_vt:.2f} + DPH {vat:.0f}%)\n\n"
                f"📤 PRODEJ (export do sítě):\n"
                f"  • Model: {export_model}\n"
                f"  • Příklad: {export_price:.2f} CZK/kWh bez DPH\n"
                f"    (spot {spot_price:.2f} - poplatek)\n\n"
                f"🔌 Distribuce:\n"
                f"  • VT: {dist_vt:.2f} CZK/kWh\n"
                f"  • NT: {current_options.get('distribution_fee_nt_kwh', 0.91):.2f} CZK/kWh\n"
                f"  • Tarif: {('Dvoutarifní' if current_options.get('dual_tariff_enabled', True) else 'Jednotarifní')}\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                f"💡 TIP: Vyberte sekci pro detailní nastavení"
            )
        else:
            info_text = (
                "❌ Spotové ceny jsou VYPNUTÉ\n\n"
                "❓ Co jsou spotové ceny?\n"
                "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
                "Spotové ceny elektřiny se mění každých 15 minut\n"
                "podle aktuální nabídky a poptávky na burze.\n\n"
                "✅ Výhody:\n"
                "  • Nižší ceny v noci a o víkendech\n"
                "  • Možnost optimalizace baterie\n"
                "  • Reálná cena elektřiny v reálném čase\n"
                "  • Automatické aktualizace každý den\n\n"
                "📊 Co budete potřebovat:\n"
                "  1. Smlouvu se spotovými cenami (např. Nano Energies)\n"
                "  2. Znát své distribuční poplatky\n"
                "  3. Znát obchodní přirážku dodavatele\n\n"
                "💡 TIP: Zapněte spotové ceny pro přístup k nastavení"
            )

        return self.async_show_form(
            step_id="pricing_config",
            data_schema=vol.Schema(schema_fields),
            description_placeholders={
                "current_state": "✅ Povolen" if spot_enabled else "❌ Zakázáno",
                "info": info_text,
            },
        )

    async def async_step_pricing_import(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Configure import (buy) pricing."""
        if user_input is not None:
            new_options = {**self.config_entry.options, **user_input}
            self.hass.config_entries.async_update_entry(
                self.config_entry, options=new_options
            )
            await self.hass.config_entries.async_reload(self.config_entry.entry_id)
            return await self.async_step_pricing_config()

        current_options = self.config_entry.options
        current_model = current_options.get("spot_pricing_model", "percentage")

        schema_fields: Dict[str, Any] = {
            vol.Required(
                "spot_pricing_model",
                default=current_model,
                description="📊 Jak se počítá obchodní cena",
            ): vol.In(
                {
                    "percentage": "% Procentní přirážka (doporučeno pro většinu)",
                    "fixed": "💵 Fixní poplatek v CZK/MWh",
                    "fixed_prices": "🔒 Fixní ceny VT/NT (ignoruje spot)",
                }
            ),
        }

        if current_model == "percentage":
            schema_fields.update(
                {
                    vol.Required(
                        "spot_positive_fee_percent",
                        default=current_options.get("spot_positive_fee_percent", 15.0),
                        description="💚 Přirážka při kladné ceně (%)",
                    ): vol.All(vol.Coerce(float), vol.Range(min=0.1, max=100.0)),
                    vol.Required(
                        "spot_negative_fee_percent",
                        default=current_options.get("spot_negative_fee_percent", 9.0),
                        description="💙 Přirážka při záporné ceně (%)",
                    ): vol.All(vol.Coerce(float), vol.Range(min=0.1, max=100.0)),
                }
            )
        elif current_model == "fixed":
            schema_fields.update(
                {
                    vol.Required(
                        "spot_fixed_fee_mwh",
                        default=current_options.get("spot_fixed_fee_mwh", 500.0),
                        description="💵 Fixní poplatek (CZK/MWh)",
                    ): vol.All(vol.Coerce(float), vol.Range(min=0.1)),
                }
            )
        else:  # fixed_prices
            schema_fields.update(
                {
                    vol.Required(
                        "fixed_commercial_price_vt",
                        default=current_options.get("fixed_commercial_price_vt", 4.50),
                        description="☀️ Fixní cena VT (CZK/kWh bez DPH)",
                    ): vol.All(vol.Coerce(float), vol.Range(min=0.0, max=20.0)),
                    vol.Required(
                        "fixed_commercial_price_nt",
                        default=current_options.get("fixed_commercial_price_nt", 3.20),
                        description="🌙 Fixní cena NT (CZK/kWh bez DPH)",
                    ): vol.All(vol.Coerce(float), vol.Range(min=0.0, max=20.0)),
                }
            )

        # Příklad výpočtu s vysvětlením
        if current_model == "percentage":
            pos_fee = current_options.get("spot_positive_fee_percent", 15.0)
            neg_fee = current_options.get("spot_negative_fee_percent", 9.0)
            example = (
                f"📝 Jak to funguje (PROCENTNÍ model):\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                f"💚 Když je spotová cena KLADNÁ (+):\n"
                f"  Vzorec: spot × (1 + {pos_fee}% / 100)\n"
                f"  Příklad:\n"
                f"    Spot:  3.00 CZK/kWh\n"
                f"    →      3.00 × 1.{int(pos_fee):02d}\n"
                f"    =      {3.00 * (1 + pos_fee / 100):.2f} CZK/kWh\n\n"
                f"💙 Když je spotová cena ZÁPORNÁ (-):\n"
                f"  Vzorec: spot × (1 - {neg_fee}% / 100)\n"
                f"  Příklad:\n"
                f"    Spot: -1.00 CZK/kWh\n"
                f"    →     -1.00 × 0.{int(100 - neg_fee):02d}\n"
                f"    =     {-1.00 * (1 - neg_fee / 100):.2f} CZK/kWh\n"
                f"    💰 DOSTANETE peníze za spotřebu!\n\n"
                f"❓ Co znamenají záporné ceny?\n"
                f"  V době přebytku elektřiny (víkend, slunečno)\n"
                f"  vám dodavatel PLATÍ za to, že spotřebujete.\n"
                f"  Ideální čas pro nabíjení baterie!"
            )
        elif current_model == "fixed":
            fee_mwh = current_options.get("spot_fixed_fee_mwh", 500.0)
            fee_kwh = fee_mwh / 1000
            example = (
                f"📝 Jak to funguje (FIXNÍ model):\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                f"Vzorec: spot + {fee_mwh:.0f} CZK/MWh\n"
                f"        = spot + {fee_kwh:.3f} CZK/kWh\n\n"
                f"Příklad:\n"
                f"  Spot:      3.000 CZK/kWh\n"
                f"  Poplatek: +{fee_kwh:.3f} CZK/kWh\n"
                f"  ═════════════════════════\n"
                f"  Celkem:    {3.000 + fee_kwh:.3f} CZK/kWh\n\n"
                f"💡 Tento model je jednodušší, ale méně\n"
                f"   flexibilní než procentní."
            )
        else:
            vt = current_options.get("fixed_commercial_price_vt", 4.50)
            nt = current_options.get("fixed_commercial_price_nt", 3.20)
            example = (
                f"📝 Jak to funguje (FIXNÍ ceny):\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                f"Spotové ceny jsou IGNOROVÁNY.\n"
                f"Používají se pouze vaše fixní ceny:\n\n"
                f"☀️ VT (vysoký tarif): {vt:.2f} CZK/kWh\n"
                f"🌙 NT (nízký tarif):  {nt:.2f} CZK/kWh\n\n"
                f"❓ Kdy použít tento model?\n"
                f"  • Máte fixní smlouvu bez spotů\n"
                f"  • Chcete stabilní předvídatelné ceny\n"
                f"  • Neobchodujete na spotovém trhu\n\n"
                f"⚠️ POZOR: Všechny ceny zadávejte BEZ DPH!"
            )

        return self.async_show_form(
            step_id="pricing_import",
            data_schema=vol.Schema(schema_fields),
            description_placeholders={
                "info": f"📥 NÁKUPNÍ CENA (import ze sítě)\n{example}",
            },
        )

    async def async_step_pricing_export(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Configure export (sell) pricing."""
        if user_input is not None:
            new_options = {**self.config_entry.options, **user_input}
            self.hass.config_entries.async_update_entry(
                self.config_entry, options=new_options
            )
            await self.hass.config_entries.async_reload(self.config_entry.entry_id)
            return await self.async_step_pricing_config()

        current_options = self.config_entry.options
        export_model = current_options.get("export_pricing_model", "percentage")

        schema_fields: Dict[str, Any] = {
            vol.Required(
                "export_pricing_model",
                default=export_model,
                description="📊 Jak se počítá výkupní cena",
            ): vol.In(
                {
                    "percentage": "% Procentní srážka (doporučeno)",
                    "fixed": "💵 Fixní poplatek v CZK/kWh",
                }
            ),
        }

        if export_model == "percentage":
            schema_fields.update(
                {
                    vol.Required(
                        "export_fee_percent",
                        default=current_options.get("export_fee_percent", 15.0),
                        description="📉 Poplatek za prodej (%)",
                    ): vol.All(vol.Coerce(float), vol.Range(min=0.0, max=100.0)),
                }
            )
            spot_price = 3.00
            fee = current_options.get("export_fee_percent", 15.0)
            final_price = spot_price * (1 - fee / 100)
            example = (
                f"📝 Jak to funguje (PROCENTNÍ srážka):\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                f"Vzorec: spot × (1 - {fee}% / 100)\n"
                f"      = spot × {(1 - fee / 100):.2f}\n\n"
                f"Příklad:\n"
                f"  Spot:      {spot_price:.2f} CZK/kWh\n"
                f"  Poplatek: -{fee:.0f}%\n"
                f"  ═════════════════════════\n"
                f"  Dostanete: {final_price:.2f} CZK/kWh\n"
                f"            ({100 - fee:.0f}% ze spotové ceny)\n\n"
                f"✅ BEZ DPH (vy neplatíte DPH z výkupu)\n"
                f"✅ BEZ distribuce (to platí odběratel)\n\n"
                f"💡 Typické poplatky: 10-20%"
            )
        else:  # fixed
            schema_fields.update(
                {
                    vol.Required(
                        "export_fixed_fee_czk",
                        default=current_options.get("export_fixed_fee_czk", 0.20),
                        description="💵 Fixní poplatek (CZK/kWh)",
                    ): vol.All(vol.Coerce(float), vol.Range(min=0.0, max=5.0)),
                }
            )
            spot_price = 3.00
            fee = current_options.get("export_fixed_fee_czk", 0.20)
            final_price = spot_price - fee
            example = (
                f"📝 Jak to funguje (FIXNÍ poplatek):\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                f"Vzorec: spot - {fee:.2f} CZK/kWh\n\n"
                f"Příklad:\n"
                f"  Spot:      {spot_price:.2f} CZK/kWh\n"
                f"  Poplatek: -{fee:.2f} CZK/kWh\n"
                f"  ═════════════════════════\n"
                f"  Dostanete: {final_price:.2f} CZK/kWh\n\n"
                f"✅ BEZ DPH (vy neplatíte DPH z výkupu)\n"
                f"✅ BEZ distribuce (to platí odběratel)\n\n"
                f"💡 Typický poplatek: 0.10-0.30 CZK/kWh"
            )

        return self.async_show_form(
            step_id="pricing_export",
            data_schema=vol.Schema(schema_fields),
            description_placeholders={
                "info": f"📤 VÝKUPNÍ CENA (export do sítě)\n{example}",
            },
        )

    async def async_step_pricing_distribution(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Configure distribution fees and VAT."""
        if user_input is not None:
            new_options = {**self.config_entry.options, **user_input}
            self.hass.config_entries.async_update_entry(
                self.config_entry, options=new_options
            )
            await self.hass.config_entries.async_reload(self.config_entry.entry_id)
            return await self.async_step_pricing_config()

        current_options = self.config_entry.options
        dual_tariff = current_options.get("dual_tariff_enabled", True)

        schema_fields: Dict[str, Any] = {
            vol.Required(
                "dual_tariff_enabled",
                default=dual_tariff,
                description="⚡ Dvoutarifní sazba (VT/NT)?",
            ): bool,
            vol.Required(
                "distribution_fee_vt",
                default=current_options.get("distribution_fee_vt_kwh", 1.42),
                description="☀️ Distribuce VT (CZK/kWh bez DPH)",
            ): vol.All(vol.Coerce(float), vol.Range(min=0.0)),
            vol.Required(
                "vat_rate",
                default=current_options.get("vat_rate", 21.0),
                description="💰 Sazba DPH (%)",
            ): vol.All(vol.Coerce(float), vol.Range(min=0.0, max=50.0)),
        }

        if dual_tariff:
            schema_fields.update(
                {
                    vol.Required(
                        "distribution_fee_nt",
                        default=current_options.get("distribution_fee_nt_kwh", 0.91106),
                        description="🌙 Distribuce NT (CZK/kWh bez DPH)",
                    ): vol.All(vol.Coerce(float), vol.Range(min=0.0)),
                }
            )

        # Příklad celkové ceny s detailním rozpisem
        spot = 3.00
        dist_vt = current_options.get("distribution_fee_vt_kwh", 1.42)
        dist_nt = current_options.get("distribution_fee_nt_kwh", 0.91106)
        vat = current_options.get("vat_rate", 21.0)

        # Výpočet pro VT
        total_vt_bez_dph = spot + dist_vt
        total_vt_s_dph = total_vt_bez_dph * (1 + vat / 100)
        dph_vt = total_vt_s_dph - total_vt_bez_dph

        if dual_tariff:
            total_nt_bez_dph = spot + dist_nt
            total_nt_s_dph = total_nt_bez_dph * (1 + vat / 100)
            dph_nt = total_nt_s_dph - total_nt_bez_dph

            example = (
                f"📝 Výpočet FINÁLNÍ ceny s DPH:\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                f"☀️ VYSOKÝ TARIF (VT):\n"
                f"  Spot:        {spot:.2f} CZK/kWh\n"
                f"  + Distribuce: {dist_vt:.2f} CZK/kWh\n"
                f"  ─────────────────────────\n"
                f"  Bez DPH:     {total_vt_bez_dph:.2f} CZK/kWh\n"
                f"  + DPH {vat:.0f}%:   {dph_vt:.2f} CZK/kWh\n"
                f"  ═════════════════════════\n"
                f"  S DPH:       {total_vt_s_dph:.2f} CZK/kWh\n\n"
                f"🌙 NÍZKÝ TARIF (NT):\n"
                f"  Spot:        {spot:.2f} CZK/kWh\n"
                f"  + Distribuce: {dist_nt:.2f} CZK/kWh\n"
                f"  ─────────────────────────\n"
                f"  Bez DPH:     {total_nt_bez_dph:.2f} CZK/kWh\n"
                f"  + DPH {vat:.0f}%:   {dph_nt:.2f} CZK/kWh\n"
                f"  ═════════════════════════\n"
                f"  S DPH:       {total_nt_s_dph:.2f} CZK/kWh\n\n"
                f"💰 ÚSPORA NT: {total_vt_s_dph - total_nt_s_dph:.2f} CZK/kWh\n\n"
                f"❓ Kde najdu své distribuční poplatky?\n"
                f"  • Ve smlouvě s distributorem (PRE, ČEZ, EG.D)\n"
                f"  • Na vyúčtování elektřiny\n"
                f"  • Na webu distributora\n\n"
                f"⚠️ POZOR: Zadávejte ceny BEZ DPH!\n"
                f"  DPH se připočítá automaticky."
            )
        else:
            example = (
                f"📝 Výpočet FINÁLNÍ ceny s DPH:\n"
                f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
                f"⚡ JEDNOTNÁ SAZBA:\n"
                f"  Spot:        {spot:.2f} CZK/kWh\n"
                f"  + Distribuce: {dist_vt:.2f} CZK/kWh\n"
                f"  ─────────────────────────\n"
                f"  Bez DPH:     {total_vt_bez_dph:.2f} CZK/kWh\n"
                f"  + DPH {vat:.0f}%:   {dph_vt:.2f} CZK/kWh\n"
                f"  ═════════════════════════\n"
                f"  S DPH:       {total_vt_s_dph:.2f} CZK/kWh\n\n"
                f"💡 Jednotná sazba = jedna cena 24/7\n"
                f"   (žádné rozlišení VT/NT)\n\n"
                f"⚠️ POZOR: Zadávejte ceny BEZ DPH!\n"
                f"  DPH se připočítá automaticky."
            )

        return self.async_show_form(
            step_id="pricing_distribution",
            data_schema=vol.Schema(schema_fields),
            description_placeholders={
                "info": f"🔌 DISTRIBUCE & DPH\n{example}",
            },
        )

    async def async_step_pricing_tariffs(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Configure tariff time periods."""
        if user_input is not None:
            new_options = {**self.config_entry.options, **user_input}
            self.hass.config_entries.async_update_entry(
                self.config_entry, options=new_options
            )
            await self.hass.config_entries.async_reload(self.config_entry.entry_id)
            return await self.async_step_pricing_config()

        current_options = self.config_entry.options

        schema_fields: Dict[str, Any] = {
            vol.Required(
                "tariff_nt_start_weekday",
                default=current_options.get("tariff_nt_start_weekday", "9,13,16,20"),
                description="🌙 NT začátky - PRACOVNÍ DNY (Po-Pá)",
            ): str,
            vol.Required(
                "tariff_vt_start_weekday",
                default=current_options.get("tariff_vt_start_weekday", "8,12,15,19"),
                description="☀️ VT začátky - PRACOVNÍ DNY (Po-Pá)",
            ): str,
            vol.Required(
                "tariff_nt_start_weekend",
                default=current_options.get("tariff_nt_start_weekend", "0"),
                description="🌙 NT začátky - VÍKEND (So-Ne)",
            ): str,
            vol.Required(
                "tariff_vt_start_weekend",
                default=current_options.get("tariff_vt_start_weekend", ""),
                description="☀️ VT začátky - VÍKEND (So-Ne)",
            ): str,
        }

        # Vizualizace tarifních pásem
        nt_weekday = current_options.get("tariff_nt_start_weekday", "9,13,16,20")
        vt_weekday = current_options.get("tariff_vt_start_weekday", "8,12,15,19")
        nt_weekend = current_options.get("tariff_nt_start_weekend", "0")
        vt_weekend = current_options.get("tariff_vt_start_weekend", "")

        example = (
            f"⏰ TARIFNÍ PÁSMA VT/NT\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"📅 PRACOVNÍ DNY (pondělí - pátek):\n"
            f"  🌙 NT začíná: {nt_weekday}\n"
            f"  ☀️ VT začíná: {vt_weekday}\n\n"
            f"📅 VÍKEND (sobota - neděle):\n"
            f"  🌙 NT začíná: {nt_weekend if nt_weekend else '(celý víkend)'}\n"
            f"  ☀️ VT začíná: {vt_weekend if vt_weekend else '(žádný VT)'}\n\n"
            f"❓ Jak to zadat?\n"
            f"  • Hodiny oddělujte čárkou\n"
            f"  • Použijte 24hodinový formát (0-23)\n"
            f"  • Např: '22,2' = NT od 22:00 a od 2:00\n\n"
            f"💡 Příklad typického d25:\n"
            f"  Pracovní dny:\n"
            f"    NT: 9,13,16,20 (4 pásma)\n"
            f"    VT: 8,12,15,19\n"
            f"  Víkend:\n"
            f"    NT: 0 (celý den)\n"
            f"    VT: (prázdné)\n\n"
            f"❓ Kde najdu svoje pásma?\n"
            f"  • Ve smlouvě s distributorem\n"
            f"  • Na webu PRE/ČEZ/EG.D\n"
            f"  • Zákaznická linka distributora\n\n"
            f"⚠️ POZOR: Každý distributor má jiné časy!"
        )

        return self.async_show_form(
            step_id="pricing_tariffs",
            data_schema=vol.Schema(schema_fields),
            description_placeholders={
                "info": example,
            },
        )

    async def async_step_dashboard_config(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Konfigurace webového dashboardu."""
        if user_input is not None:
            # Aktualizovat options
            new_options = {**self.config_entry.options, **user_input}

            # Uložíme změny PŘED reloadem
            self.hass.config_entries.async_update_entry(
                self.config_entry, options=new_options
            )

            # Restart integrace pro aplikování změn (dashboard se musí zaregistrovat/odregistrovat)
            await self.hass.config_entries.async_reload(self.config_entry.entry_id)

            # Vrátit se zpět do menu
            return await self.async_step_init()

        current_options = self.config_entry.options
        dashboard_enabled = current_options.get("enable_dashboard", False)

        # Konfigurace dashboardu
        schema = vol.Schema(
            {
                vol.Required(
                    "enable_dashboard",
                    default=dashboard_enabled,
                    description="Povolit energetický dashboard s grafy (ApexCharts)",
                ): bool,
            }
        )

        return self.async_show_form(
            step_id="dashboard_config",
            data_schema=schema,
            description_placeholders={
                "info": (
                    "📊 Energetický dashboard zobrazuje:\n"
                    "• Graf kapacity baterie (48h předpověď)\n"
                    "• Solární výrobu a spotřebu\n"
                    "• Spotové ceny elektřiny\n"
                    "• Doporučené nabíjecí hodiny\n"
                    "• Control signály pro automatizace\n\n"
                    "Dashboard najdete v: Boční panel → OIG Dashboard\n"
                    "Custom card: oig-battery-forecast-card"
                )
            },
        )
