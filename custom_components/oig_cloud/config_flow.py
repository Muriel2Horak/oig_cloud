import voluptuous as vol
import logging
import asyncio
from typing import Dict, Any, Optional
from homeassistant import config_entries
from homeassistant.config_entries import FlowResult
from homeassistant.core import callback
from homeassistant.helpers import entity_registry as er
from .const import (
    CONF_NO_TELEMETRY,
    DEFAULT_NAME,
    DOMAIN,
    CONF_USERNAME,
    CONF_PASSWORD,
)
from .lib.oig_cloud_client.api.oig_cloud_api import OigCloudApi

_LOGGER = logging.getLogger(__name__)


# Exception classes
class CannotConnect(Exception):
    """Error to indicate we cannot connect."""


class InvalidAuth(Exception):
    """Error to indicate invalid authentication."""


class LiveDataNotEnabled(Exception):
    """Error to indicate live data are not enabled in OIG Cloud app."""


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


class WizardMixin:
    """Mixin třída obsahující všechny wizard kroky.
    
    Sdílená mezi ConfigFlow (nová instalace) a OptionsFlow (rekonfigurace).
    Poskytuje konzistentní UX pro oba případy.
    """

    def __init__(self) -> None:
        """Initialize wizard data."""
        super().__init__()
        self._wizard_data: Dict[str, Any] = {}
        self._step_history: list[str] = []
        
    def _is_reconfiguration(self) -> bool:
        """Check if this is a reconfiguration (Options Flow)."""
        return hasattr(self, 'config_entry') and self.config_entry is not None
    
    def _get_defaults(self) -> Dict[str, Any]:
        """Get default values from existing config (for reconfiguration)."""
        if self._is_reconfiguration():
            return dict(self.config_entry.options)
        return {}


class ConfigFlow(WizardMixin, config_entries.ConfigFlow, domain=DOMAIN):
    """Handle a config flow for OIG Cloud."""

    VERSION = 1

    def __init__(self) -> None:
        """Initialize the config flow."""
        super().__init__()

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
                            "wizard": "🧙‍♂️ Průvodce nastavením (doporučeno)",
                            "quick": "⚡ Rychlé nastavení (jen přihlášení)",
                            "import": "📥 Import z YAML konfigurace",
                        }
                    )
                }
            ),
            description_placeholders={
                "info": "Vyberte způsob nastavení integrace OIG Cloud"
            },
        )

    async def async_step_wizard_welcome(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Wizard: Welcome screen with overview."""
        if user_input is not None:
            return await self.async_step_wizard_credentials()

        return self.async_show_form(
            step_id="wizard_welcome",
            data_schema=vol.Schema({}),  # Jen informační stránka
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
            # Validace přihlášení
            errors = {}

            # Check if user confirmed live data is enabled
            if not user_input.get("live_data_enabled", False):
                errors["live_data_enabled"] = "live_data_not_confirmed"
                return self.async_show_form(
                    step_id="wizard_credentials",
                    data_schema=self._get_credentials_schema(),
                    errors=errors,
                    description_placeholders=self._get_step_placeholders(1, 5),
                )

            try:
                await validate_input(self.hass, user_input)

                # Uložit data
                self._wizard_data.update(user_input)
                self._step_history.append("wizard_credentials")

                # Pokračovat na další krok
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
                description_placeholders=self._get_step_placeholders(1, 5),
            )

        return self.async_show_form(
            step_id="wizard_credentials",
            data_schema=self._get_credentials_schema(),
            description_placeholders=self._get_step_placeholders(1, 5),
        )

    async def async_step_wizard_modules(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Wizard Step 2: Select modules to enable."""
        if user_input is not None:
            # Validace závislostí
            errors = {}
            warnings = []

            # Kontrola závislostí pro Battery Prediction
            if user_input.get("enable_battery_prediction"):
                if not user_input.get("enable_solar_forecast"):
                    errors["enable_battery_prediction"] = "requires_solar_forecast"
                if not user_input.get("enable_extended_sensors"):
                    errors["enable_extended_sensors"] = "required_for_battery"

            # Kontrola závislostí pro Dashboard
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
                    # Uložit seznam chybějících pro zobrazení
                    self._wizard_data["_missing_for_dashboard"] = missing

            if errors:
                return self.async_show_form(
                    step_id="wizard_modules",
                    data_schema=self._get_modules_schema(user_input),
                    errors=errors,
                    description_placeholders=self._get_step_placeholders(2, 5),
                )

            # Uložit výběr modulů
            self._wizard_data.update(user_input)
            self._step_history.append("wizard_modules")

            # Určit další krok podle vybraných modulů
            next_step = self._get_next_step("wizard_modules")
            return await getattr(self, f"async_step_{next_step}")()

        return self.async_show_form(
            step_id="wizard_modules",
            data_schema=self._get_modules_schema(),
            description_placeholders=self._get_step_placeholders(2, 5),
        )

    def _get_modules_schema(
        self, defaults: Optional[Dict[str, Any]] = None
    ) -> vol.Schema:
        """Get schema for modules selection with defaults."""
        if defaults is None:
            defaults = {}

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
                    "enable_dashboard", default=defaults.get("enable_dashboard", False)
                ): bool,
            }
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
                    "enable_solar_forecast": False,
                    "enable_statistics": True,
                    "enable_extended_sensors": True,
                    "enable_pricing": False,
                    "enable_extended_battery_sensors": True,
                    "enable_extended_fve_sensors": True,
                    "enable_extended_grid_sensors": True,
                    "disable_extended_stats_api": False,
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

    def _get_credentials_schema(self) -> vol.Schema:
        """Get schema for credentials step."""
        return vol.Schema(
            {
                vol.Required(
                    CONF_USERNAME, default=self._wizard_data.get(CONF_USERNAME, "")
                ): str,
                vol.Required(CONF_PASSWORD): str,
                vol.Required(
                    "live_data_enabled",
                    default=False,
                    description="✅ POTVRZUJI: Mám v aplikaci OIG Cloud zapnutá 'Živá data'",
                ): bool,
            }
        )

    def _get_step_placeholders(self, current: int, total: int) -> dict[str, str]:
        """Get placeholders for step description."""
        progress_bar = "▓" * current + "░" * (total - current)
        return {
            "step": f"Krok {current} z {total}",
            "progress": progress_bar,
            "back_hint": (
                "💡 Tip: Můžete se vrátit zpět pomocí tlačítka zpět v prohlížeči"
                if self._step_history
                else ""
            ),
        }

    def _get_next_step(self, current_step: str) -> str:
        """Determine next step based on enabled modules."""
        # Definice všech kroků wizardu
        all_steps = [
            "wizard_welcome",
            "wizard_credentials",
            "wizard_modules",
            "wizard_intervals",
            "wizard_solar",  # conditional
            "wizard_battery",  # conditional
            "wizard_pricing",  # conditional
            "wizard_extended",  # conditional
            "wizard_dashboard",  # conditional
            "wizard_summary",
        ]

        try:
            current_idx = all_steps.index(current_step)
        except ValueError:
            return "wizard_summary"

        # Projít zbývající kroky a najít další platný
        for step in all_steps[current_idx + 1 :]:
            # Vždy skončit summary
            if step == "wizard_summary":
                return step

            # Podmíněné kroky - přeskočit pokud není modul zapnutý
            if step == "wizard_solar" and not self._wizard_data.get(
                "enable_solar_forecast"
            ):
                continue
            if step == "wizard_battery" and not self._wizard_data.get(
                "enable_battery_prediction"
            ):
                continue
            if step == "wizard_pricing" and not self._wizard_data.get("enable_pricing"):
                continue
            if step == "wizard_extended" and not self._wizard_data.get(
                "enable_extended_sensors"
            ):
                continue
            if step == "wizard_dashboard" and not self._wizard_data.get(
                "enable_dashboard"
            ):
                continue

            return step

        return "wizard_summary"

    async def async_step_wizard_intervals(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Wizard Step 3: Configure scan intervals."""
        if user_input is not None:
            self._wizard_data.update(user_input)
            self._step_history.append("wizard_intervals")

            next_step = self._get_next_step("wizard_intervals")
            return await getattr(self, f"async_step_{next_step}")()

        return self.async_show_form(
            step_id="wizard_intervals",
            data_schema=vol.Schema(
                {
                    vol.Optional("standard_scan_interval", default=30): vol.All(
                        int, vol.Range(min=30, max=300)
                    ),
                    vol.Optional("extended_scan_interval", default=300): vol.All(
                        int, vol.Range(min=300, max=3600)
                    ),
                }
            ),
            description_placeholders=self._get_step_placeholders(3, 5),
        )

    async def async_step_wizard_solar(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Wizard Step 4: Solar forecast configuration."""
        if user_input is not None:
            self._wizard_data.update(user_input)
            self._step_history.append("wizard_solar")

            next_step = self._get_next_step("wizard_solar")
            return await getattr(self, f"async_step_{next_step}")()

        return self.async_show_form(
            step_id="wizard_solar",
            data_schema=vol.Schema(
                {
                    vol.Required(CONF_SOLAR_FORECAST_API_KEY): str,
                    vol.Optional(
                        CONF_SOLAR_FORECAST_LATITUDE, default=50.0
                    ): vol.Coerce(float),
                    vol.Optional(
                        CONF_SOLAR_FORECAST_LONGITUDE, default=14.0
                    ): vol.Coerce(float),
                    vol.Optional(
                        CONF_SOLAR_FORECAST_STRING1_ENABLED, default=True
                    ): bool,
                    vol.Optional(
                        CONF_SOLAR_FORECAST_STRING1_DECLINATION, default=35
                    ): vol.All(int, vol.Range(min=0, max=90)),
                    vol.Optional(
                        CONF_SOLAR_FORECAST_STRING1_AZIMUTH, default=0
                    ): vol.All(int, vol.Range(min=-180, max=180)),
                    vol.Optional(
                        CONF_SOLAR_FORECAST_STRING1_KWP, default=5.0
                    ): vol.Coerce(float),
                }
            ),
            description_placeholders=self._get_step_placeholders(4, 5),
        )

    async def async_step_wizard_battery(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Wizard Step 5: Battery prediction configuration."""
        if user_input is not None:
            self._wizard_data.update(user_input)
            self._step_history.append("wizard_battery")

            next_step = self._get_next_step("wizard_battery")
            return await getattr(self, f"async_step_{next_step}")()

        return self.async_show_form(
            step_id="wizard_battery",
            data_schema=vol.Schema(
                {
                    vol.Optional("min_capacity_percent", default=20.0): vol.All(
                        vol.Coerce(float), vol.Range(min=5.0, max=50.0)
                    ),
                    vol.Optional("target_capacity_percent", default=80.0): vol.All(
                        vol.Coerce(float), vol.Range(min=50.0, max=100.0)
                    ),
                    vol.Optional("home_charge_rate", default=2.8): vol.All(
                        vol.Coerce(float), vol.Range(min=0.5, max=10.0)
                    ),
                }
            ),
            description_placeholders=self._get_step_placeholders(4, 5),
        )

    async def async_step_wizard_pricing(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Wizard Step 6: Pricing configuration."""
        if user_input is not None:
            self._wizard_data.update(user_input)
            self._step_history.append("wizard_pricing")

            next_step = self._get_next_step("wizard_pricing")
            return await getattr(self, f"async_step_{next_step}")()

        return self.async_show_form(
            step_id="wizard_pricing",
            data_schema=vol.Schema(
                {
                    vol.Optional("spot_trading_enabled", default=False): bool,
                    vol.Optional("distribution_area", default="PRE"): vol.In(
                        ["PRE", "CEZ", "EGD"]
                    ),
                    vol.Optional("fixed_price_vt", default=4.50): vol.Coerce(float),
                    vol.Optional("fixed_price_nt", default=3.20): vol.Coerce(float),
                }
            ),
            description_placeholders=self._get_step_placeholders(4, 5),
        )

    async def async_step_wizard_extended(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Wizard Step 7: Extended sensors configuration."""
        if user_input is not None:
            self._wizard_data.update(user_input)
            self._step_history.append("wizard_extended")

            next_step = self._get_next_step("wizard_extended")
            return await getattr(self, f"async_step_{next_step}")()

        return self.async_show_form(
            step_id="wizard_extended",
            data_schema=vol.Schema(
                {
                    vol.Optional("enable_extended_battery_sensors", default=True): bool,
                    vol.Optional("enable_extended_fve_sensors", default=True): bool,
                    vol.Optional("enable_extended_grid_sensors", default=True): bool,
                }
            ),
            description_placeholders=self._get_step_placeholders(4, 5),
        )

    async def async_step_wizard_dashboard(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Wizard Step 8: Dashboard configuration."""
        if user_input is not None:
            self._wizard_data.update(user_input)
            self._step_history.append("wizard_dashboard")

            next_step = self._get_next_step("wizard_dashboard")
            return await getattr(self, f"async_step_{next_step}")()

        return self.async_show_form(
            step_id="wizard_dashboard",
            data_schema=vol.Schema(
                {
                    vol.Optional("dashboard_refresh_interval", default=5): vol.All(
                        int, vol.Range(min=1, max=60)
                    ),
                }
            ),
            description_placeholders=self._get_step_placeholders(4, 5),
        )

    async def async_step_wizard_summary(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Wizard Step 9: Summary and confirmation."""
        if user_input is not None:
            # Vytvořit entry s nakonfigurovanými daty
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
                    "enable_dashboard": self._wizard_data.get(
                        "enable_dashboard", False
                    ),
                    # Extended sensors detail
                    "enable_extended_battery_sensors": self._wizard_data.get(
                        "enable_extended_battery_sensors", True
                    ),
                    "enable_extended_fve_sensors": self._wizard_data.get(
                        "enable_extended_fve_sensors", True
                    ),
                    "enable_extended_grid_sensors": self._wizard_data.get(
                        "enable_extended_grid_sensors", True
                    ),
                    "disable_extended_stats_api": False,
                    # Solar forecast
                    **{
                        k: v
                        for k, v in self._wizard_data.items()
                        if k.startswith("solar_forecast_")
                    },
                    # Battery prediction
                    "min_capacity_percent": self._wizard_data.get(
                        "min_capacity_percent", 20.0
                    ),
                    "target_capacity_percent": self._wizard_data.get(
                        "target_capacity_percent", 80.0
                    ),
                    "home_charge_rate": self._wizard_data.get("home_charge_rate", 2.8),
                    # Pricing
                    "spot_trading_enabled": self._wizard_data.get(
                        "spot_trading_enabled", False
                    ),
                    "distribution_area": self._wizard_data.get(
                        "distribution_area", "PRE"
                    ),
                    "fixed_price_vt": self._wizard_data.get("fixed_price_vt", 4.50),
                    "fixed_price_nt": self._wizard_data.get("fixed_price_nt", 3.20),
                    # Dashboard
                    "dashboard_refresh_interval": self._wizard_data.get(
                        "dashboard_refresh_interval", 5
                    ),
                },
            )

        # Připravit souhrn konfigurace
        summary_lines = [
            "**Přihlášení:**",
            f"- Uživatel: {self._wizard_data.get(CONF_USERNAME, 'N/A')}",
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
                "Kliknutím na 'Odeslat' dokončíte nastavení.",
            ]
        )

        return self.async_show_form(
            step_id="wizard_summary",
            data_schema=vol.Schema({}),
            description_placeholders={
                "step": "Krok 5 z 5 - Souhrn",
                "progress": "▓▓▓▓▓",
                "summary": "\n".join(summary_lines),
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
        super().__init__()
        self.config_entry = config_entry
        
        # Předvyplnit wizard_data z existující konfigurace
        self._wizard_data = dict(config_entry.options)
        self._wizard_data[CONF_USERNAME] = config_entry.data.get(CONF_USERNAME)
        # Password nečteme z bezpečnostních důvodů

    async def async_step_init(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Entry point for options flow - redirect to wizard welcome."""
        # Při rekonfiguraci rovnou začneme na výběru modulů (credentials už máme)
        return await self.async_step_wizard_modules()
    
    async def async_step_wizard_summary(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Override summary step for options flow - update entry instead of creating new."""
        if user_input is not None:
            # Aktualizovat existující entry místo vytvoření nového
            new_options = {
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
                "enable_dashboard": self._wizard_data.get(
                    "enable_dashboard", False
                ),
                # Extended sensors detail
                "enable_extended_battery_sensors": self._wizard_data.get(
                    "enable_extended_battery_sensors", True
                ),
                "enable_extended_fve_sensors": self._wizard_data.get(
                    "enable_extended_fve_sensors", True
                ),
                "enable_extended_grid_sensors": self._wizard_data.get(
                    "enable_extended_grid_sensors", True
                ),
                "disable_extended_stats_api": False,
                # Solar forecast
                **{
                    k: v
                    for k, v in self._wizard_data.items()
                    if k.startswith("solar_forecast_")
                },
                # Battery prediction
                "min_capacity_percent": self._wizard_data.get(
                    "min_capacity_percent", 20.0
                ),
                "target_capacity_percent": self._wizard_data.get(
                    "target_capacity_percent", 80.0
                ),
                "home_charge_rate": self._wizard_data.get("home_charge_rate", 2.8),
                # Pricing
                "spot_trading_enabled": self._wizard_data.get(
                    "spot_trading_enabled", False
                ),
                "distribution_area": self._wizard_data.get(
                    "distribution_area", "PRE"
                ),
                "fixed_price_vt": self._wizard_data.get("fixed_price_vt", 4.50),
                "fixed_price_nt": self._wizard_data.get("fixed_price_nt", 3.20),
                # Dashboard
                "dashboard_refresh_interval": self._wizard_data.get(
                    "dashboard_refresh_interval", 5
                ),
            }
            
            # Aktualizovat entry
            self.hass.config_entries.async_update_entry(
                self.config_entry, options=new_options
            )
            
            # NOVÉ: Informace o nutnosti reloadu
            return self.async_create_entry(
                title="",
                data={
                    "info": "⚠️ Změny byly uloženy. Pro aktivaci změn prosím restartujte Home Assistant nebo reloadněte integraci OIG Cloud."
                }
            )
        
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
                "⚠️ **Důležité:** Po uložení změn prosím restartujte Home Assistant!",
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

    def __init__(self, config_entry: config_entries.ConfigEntry) -> None:
        """Initialize options flow."""
        super().__init__()
        self.config_entry = config_entry

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
            # Pokud byly změněny přihlašovací údaje, aktualizuj je v config_entry.data
            new_options = {**self.config_entry.options, **user_input}

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

            # Restart integrace pro aplikování všech změn (včetně intervalu)
            await self.hass.config_entries.async_reload(self.config_entry.entry_id)

            return self.async_create_entry(title="", data=new_options)

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

            # Logika pro automatické zapnutí/vypnutí sub-modulů
            extended_enabled = user_input.get("enable_extended_sensors", False)
            current_extended_enabled = self.config_entry.options.get(
                "enable_extended_sensors", False
            )

            _LOGGER.info(
                f"Extended sensors: current={current_extended_enabled}, new={extended_enabled}"
            )
            _LOGGER.info(f"User input: {user_input}")

            if extended_enabled:
                if not current_extended_enabled:
                    # Pokud se main modul právě zapnul, zapneme všechny sub-moduly
                    new_options["enable_extended_battery_sensors"] = True
                    new_options["enable_extended_fve_sensors"] = True
                    new_options["enable_extended_grid_sensors"] = True
                    _LOGGER.info("Main modul zapnut - zapínám všechny sub-moduly")
                else:
                    # Pokud je main modul už zapnutý, kontrolujeme sub-moduly
                    battery_enabled = user_input.get(
                        "enable_extended_battery_sensors", True
                    )
                    fve_enabled = user_input.get("enable_extended_fve_sensors", True)
                    grid_enabled = user_input.get("enable_extended_grid_sensors", True)

                    # Pokud není žádný zapnutý, zapneme všechny
                    if not (battery_enabled or fve_enabled or grid_enabled):
                        new_options["enable_extended_battery_sensors"] = True
                        new_options["enable_extended_fve_sensors"] = True
                        new_options["enable_extended_grid_sensors"] = True
                        _LOGGER.info("Žádný sub-modul nebyl zapnutý - zapínám všechny")
            else:
                # DŮLEŽITÉ: Když je main modul vypnutý, VŽDY vypneme všechny sub-moduly
                new_options["enable_extended_battery_sensors"] = False
                new_options["enable_extended_fve_sensors"] = False
                new_options["enable_extended_grid_sensors"] = False
                _LOGGER.info("Main modul vypnut - FORCE vypínám všechny sub-moduly")

            _LOGGER.info(f"New options after: {new_options}")

            # Uložíme změny PŘED reloadem
            self.hass.config_entries.async_update_entry(
                self.config_entry, options=new_options
            )

            # Restart integrace pro aplikování nových nastavení
            await self.hass.config_entries.async_reload(self.config_entry.entry_id)

            return self.async_create_entry(title="", data=new_options)

        current_options = self.config_entry.options
        extended_enabled = current_options.get("enable_extended_sensors", False)

        # Zobrazujeme VŠECHNY parametry vždy (i sub-moduly), ale s různými popisky
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
            vol.Optional(
                "enable_extended_battery_sensors",
                default=current_options.get("enable_extended_battery_sensors", True),
                description=f"{'✅ Napětí článků, proudy, teplota baterie' if extended_enabled else '⏸️ Senzory baterie (aktivní po zapnutí hlavního přepínače)'}",
            ): bool,
            vol.Optional(
                "enable_extended_fve_sensors",
                default=current_options.get("enable_extended_fve_sensors", True),
                description=f"{'✅ Výkon a proudy stringů fotovoltaiky' if extended_enabled else '⏸️ Senzory FVE (aktivní po zapnutí hlavního přepínače)'}",
            ): bool,
            vol.Optional(
                "enable_extended_grid_sensors",
                default=current_options.get("enable_extended_grid_sensors", True),
                description=f"{'✅ Napětí L1/L2/L3, frekvence sítě' if extended_enabled else '⏸️ Senzory sítě (aktivní po zapnutí hlavního přepínače)'}",
            ): bool,
        }

        return self.async_show_form(
            step_id="extended_sensors",
            data_schema=vol.Schema(schema_fields),
            description_placeholders={
                "current_state": "Zapnuty" if extended_enabled else "Vypnuty",
                "info": (
                    "⚠️ Rozšířené senzory jsou vypnuté - všechny sub-moduly se automaticky aktivují po zapnutí hlavního přepínače"
                    if not extended_enabled
                    else "✅ Rozšířené senzory jsou zapnuté - můžete si vybrat, které konkrétní typy chcete sledovat"
                ),
            },
        )

    async def async_step_statistics_config(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Configure statistics options."""
        if user_input is not None:
            # Použijeme self.options místo self.config_entry.options
            new_options = {**self.options, **user_input}

            # Restart integrace pro aplikování nových nastavení
            await self.hass.config_entries.async_reload(self.config_entry.entry_id)

            return self.async_create_entry(title="", data=new_options)

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

            # Restart integrace pro aplikování nových nastavení
            self.hass.config_entries.async_update_entry(
                self.config_entry, options=new_options
            )
            await self.hass.config_entries.async_reload(self.config_entry.entry_id)

            return self.async_create_entry(title="", data=new_options)

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
            ): vol.All(vol.Coerce(float), vol.Range(min=5.0, max=50.0)),
            vol.Optional(
                "target_capacity_percent",
                default=current_options.get("target_capacity_percent", 80.0),
                description="🎯 Cílová kapacita baterie (%)",
            ): vol.All(vol.Coerce(float), vol.Range(min=50.0, max=100.0)),
            vol.Optional(
                "home_charge_rate",
                default=current_options.get("home_charge_rate", 2.8),
                description="⚡ Nabíjecí výkon ze sítě (kW)",
            ): vol.All(vol.Coerce(float), vol.Range(min=0.5, max=10.0)),
            vol.Optional(
                "percentile_conf",
                default=current_options.get("percentile_conf", 75.0),
                description="📊 Percentil pro detekci špičky (%)",
            ): vol.All(vol.Coerce(float), vol.Range(min=50.0, max=95.0)),
            vol.Optional(
                "max_price_conf",
                default=current_options.get("max_price_conf", 10.0),
                description="💰 Maximální cena pro nabíjení (CZK/kWh)",
            ): vol.All(vol.Coerce(float), vol.Range(min=1.0, max=50.0)),
        }

        # NOVÉ: Přidat weather monitoring pokud je battery prediction zapnutý
        if battery_enabled and weather_entities:
            schema_fields.update(
                {
                    vol.Optional(
                        "charge_on_bad_weather",
                        default=current_options.get("charge_on_bad_weather", False),
                        description="🌧️ Nabíjet preventivně při špatném počasí",
                    ): bool,
                }
            )

            # Pokud je zapnutý bad weather mode, nabídnout výběr entity
            if current_options.get("charge_on_bad_weather", False):
                # Přidat "auto" možnost jako první
                weather_options = {"": "🤖 Automaticky (první dostupná)"}
                weather_options.update(weather_entities)

                schema_fields.update(
                    {
                        vol.Optional(
                            "weather_entity",
                            default=current_options.get("weather_entity", ""),
                            description="🌦️ Weather entita pro předpověď (volitelné)",
                        ): vol.In(weather_options),
                    }
                )

        # Vysvětlení parametrů
        min_cap = current_options.get("min_capacity_percent", 20.0)
        target_cap = current_options.get("target_capacity_percent", 80.0)
        charge_rate = current_options.get("home_charge_rate", 2.8)
        percentile = current_options.get("percentile_conf", 75.0)
        max_price = current_options.get("max_price_conf", 10.0)
        bad_weather = current_options.get("charge_on_bad_weather", False)

        info_text = (
            f"🔋 CHYTRÉ NABÍJENÍ BATERIE\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n"
            f"{'✅ ZAPNUTO' if battery_enabled else '❌ VYPNUTO'}\n\n"
            f"📊 Aktuální nastavení:\n"
            f"  • Min. kapacita: {min_cap:.0f}%\n"
            f"  • Cílová kapacita: {target_cap:.0f}%\n"
            f"  • Nabíjecí výkon: {charge_rate:.1f} kW\n"
            f"  • Percentil špičky: {percentile:.0f}%\n"
            f"  • Max. cena: {max_price:.1f} CZK/kWh\n"
            f"  • Špatné počasí: {'✅ Zapnuto' if bad_weather else '❌ Vypnuto'}\n\n"
            f"❓ Jak to funguje?\n"
            f"━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n"
            f"1️⃣ Systém sleduje spotové ceny elektřiny\n"
            f"2️⃣ Identifikuje levné off-peak hodiny\n"
            f"3️⃣ Plánuje nabíjení tak, aby baterie\n"
            f"   neklesla pod minimální kapacitu\n"
            f"4️⃣ Preferuje nejlevnější hodiny\n"
            f"5️⃣ Nikdy nenabíjí nad max. cenu\n"
            f"6️⃣ NOVÉ: Preventivní nabití před bouřkou\n\n"
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
            f"  • Solární předpověď (doporučeno)\n"
            f"  • Weather entitu (pro bad weather)"
        )

        return self.async_show_form(
            step_id="battery_prediction",
            data_schema=vol.Schema(schema_fields),
            description_placeholders={
                "current_state": ("✅ Zapnuto" if battery_enabled else "❌ Vypnuto"),
                "min_capacity": min_cap,
                "target_capacity": target_cap,
                "charge_rate": charge_rate,
                "bad_weather": ("✅ Ano" if bad_weather else "❌ Ne"),
                "info": info_text,
            },
        )

    async def async_step_solar_forecast(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Konfigurace solární předpovědi."""
        errors = {}

        if user_input is not None:
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

                # VŽDY uložit API klíč (i prázdný)
                new_options["solar_forecast_api_key"] = api_key

                # Debug log pro kontrolu
                _LOGGER.info(
                    f"🔑 Solar forecast API key saved: '{api_key}' (empty: {not bool(api_key)})"
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
                # OPRAVA 2: API klíč explicitně uložíme i když je modul vypnutý
                api_key = user_input.get("solar_forecast_api_key")
                if api_key is None:
                    api_key = ""
                else:
                    api_key = str(api_key).strip()
                new_options["solar_forecast_api_key"] = api_key

                # Debug log pro kontrolu
                _LOGGER.info(
                    f"🔑 Solar forecast disabled, API key saved: '{api_key}' (empty: {not bool(api_key)})"
                )

                # DŮLEŽITÉ: Když je solar forecast vypnutý, VŽDY vypneme všechny stringy
                # ALE ponecháme všechny parametry pro příští zapnutí
                new_options["solar_forecast_string1_enabled"] = False
                new_options["solar_forecast_string2_enabled"] = False

                _LOGGER.info(
                    "Solar forecast vypnut - vypínám stringy, ale zachovávám parametry"
                )

            if not errors:
                # Restart integrace pro aplikování nových nastavení
                await self.hass.config_entries.async_reload(self.config_entry.entry_id)

                # Pro solar forecast - spustíme okamžitou aktualizaci dat při zapnutí
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
                        # ZMĚNA EXISTUJÍCÍHO MODULU - senzory už existují, žádné čekání
                        _LOGGER.info(
                            "🌞 Solar forecast configuration update - triggering immediate update..."
                        )

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
                                        f"🌞 Triggered immediate solar forecast update for {entity.entity_id}"
                                    )
                                    break
                            else:
                                _LOGGER.warning(
                                    "🌞 Solar forecast entity not found for immediate update"
                                )
                        except Exception as e:
                            _LOGGER.warning(
                                f"🌞 Failed to trigger immediate solar forecast update: {e}"
                            )

                return self.async_create_entry(title="", data=new_options)

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
                    description="Orientace panelů 1. stringu (0°=sever, 90°=východ, 180°=jih, 270°=západ)",
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
                    description="Orientace panelů 2. stringu (0°=sever, 90°=východ, 180°=jih, 270°=západ)",
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
                f"    =      {3.00 * (1 + pos_fee/100):.2f} CZK/kWh\n\n"
                f"💙 Když je spotová cena ZÁPORNÁ (-):\n"
                f"  Vzorec: spot × (1 - {neg_fee}% / 100)\n"
                f"  Příklad:\n"
                f"    Spot: -1.00 CZK/kWh\n"
                f"    →     -1.00 × 0.{int(100-neg_fee):02d}\n"
                f"    =     {-1.00 * (1 - neg_fee/100):.2f} CZK/kWh\n"
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
                f"      = spot × {(1 - fee/100):.2f}\n\n"
                f"Příklad:\n"
                f"  Spot:      {spot_price:.2f} CZK/kWh\n"
                f"  Poplatek: -{fee:.0f}%\n"
                f"  ═════════════════════════\n"
                f"  Dostanete: {final_price:.2f} CZK/kWh\n"
                f"            ({100-fee:.0f}% ze spotové ceny)\n\n"
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

            # Restart integrace pro aplikování změn (dashboard se musí zaregistrovat/odregistrovat)
            await self.hass.config_entries.async_reload(self.config_entry.entry_id)

            return self.async_create_entry(title="", data=new_options)

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
