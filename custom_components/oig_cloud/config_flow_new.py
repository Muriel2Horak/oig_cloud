"""Config flow pro OIG Cloud integraci - Nový wizard-based design.

Tento soubor obsahuje kompletně přepracovaný config flow s průvodcem
pro snadnou konfiguraci i pro laiky.
"""

from __future__ import annotations

import logging
from typing import Any, Dict, Optional

import voluptuous as vol
from homeassistant import config_entries
from homeassistant.core import callback
from homeassistant.data_entry_flow import FlowResult
from homeassistant.helpers import config_validation as cv

from .const import CONF_PASSWORD, CONF_USERNAME, DEFAULT_NAME, DOMAIN

_LOGGER = logging.getLogger(__name__)


# ============================================================================
# KONSTANTY PRO WIZARD
# ============================================================================

# Výchozí hodnoty
DEFAULT_POLLING_INTERVAL = 300  # 5 minut
DEFAULT_ENABLE_SHIELD = True
DEFAULT_ENABLE_SOLAR_FORECAST = False
DEFAULT_ENABLE_PRICING = False
DEFAULT_ENABLE_DASHBOARD = True

# Kroky průvodce
STEP_WELCOME = "welcome"
STEP_AUTH = "auth"
STEP_BASIC = "basic"
STEP_FEATURES = "features"
STEP_SHIELD = "shield"
STEP_SOLAR = "solar"
STEP_PRICING = "pricing"
STEP_SUMMARY = "summary"


# ============================================================================
# HELPER FUNKCE
# ============================================================================


def _format_description(text: str) -> str:
    """Formátuje popis pro lepší čitelnost."""
    return text.strip()


def _get_help_text(key: str) -> str:
    """Vrací nápovědu pro dané pole."""
    help_texts = {
        "username": (
            "📧 Váš e-mail pro přihlášení do OIG Cloud portálu.\n"
            "Najdete v: https://portal.oig.cz"
        ),
        "password": (
            "🔑 Heslo k vašemu OIG Cloud účtu.\n"
            "Pokud jste heslo zapomněli, resetujte ho na portálu."
        ),
        "polling_interval": (
            "⏱️ Jak často se mají data aktualizovat (v sekundách).\n\n"
            "💡 Doporučení:\n"
            "• 60s - Pro rychlé změny (více zátěž)\n"
            "• 300s - Vyvážené (doporučeno)\n"
            "• 600s - Úspora dat, pomalejší reakce"
        ),
        "enable_shield": (
            "🛡️ ServiceShield chrání před nechtěnými změnami.\n\n"
            "✨ Funkce:\n"
            "• Fronta změn - vidíte co se děje\n"
            "• Validace - kontrola před provedením\n"
            "• Historie - přehled všech změn\n\n"
            "💡 Doporučeno: Zapnout"
        ),
        "enable_solar_forecast": (
            "☀️ Předpověď solární výroby z Forecast.solar.\n\n"
            "📊 Co získáte:\n"
            "• Odhad výroby na dnes a zítra\n"
            "• Graf předpovědi\n"
            "• Optimalizace nabíjení baterie\n\n"
            "⚠️ Vyžaduje: Bezplatný API klíč"
        ),
        "enable_pricing": (
            "💰 Spot ceny elektřiny z OTE (burza).\n\n"
            "📈 Co získáte:\n"
            "• Aktuální ceny za 15min intervaly\n"
            "• Graf vývoje cen\n"
            "• Predikce úspor\n\n"
            "💡 Užitečné pro: Optimalizaci nabíjení"
        ),
        "enable_dashboard": (
            "📊 Webový dashboard s energetickými grafy.\n\n"
            "✨ Obsahuje:\n"
            "• Flow diagram (tok energie)\n"
            "• Grafy výroby a spotřeby\n"
            "• Ovládací panel (režimy)\n"
            "• ServiceShield fronta\n\n"
            "📍 Najdete: Boční panel → OIG Dashboard"
        ),
    }
    return help_texts.get(key, "")


# ============================================================================
# CONFIG FLOW
# ============================================================================


class OigCloudConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Průvodce konfigurací OIG Cloud integrace."""

    VERSION = 2
    MINOR_VERSION = 0

    def __init__(self):
        """Inicializace config flow."""
        self._data: Dict[str, Any] = {}
        self._errors: Dict[str, str] = {}

    async def async_step_user(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Vstupní bod - zobrazí uvítací obrazovku."""
        return await self.async_step_welcome(user_input)

    async def async_step_welcome(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Krok 1: Uvítací obrazovka s vysvětlením."""
        if user_input is not None:
            # Přejdeme na přihlášení
            return await self.async_step_auth()

        return self.async_show_form(
            step_id=STEP_WELCOME,
            data_schema=vol.Schema({}),
            description_placeholders={
                "info": _format_description(
                    "🎉 Vítejte v průvodci nastavením OIG Cloud!\n\n"
                    "Tato integrace propojí váš OIG Box s Home Assistant a přidá:\n\n"
                    "⚡ Monitorování energie v reálném čase\n"
                    "🔧 Ovládání režimů (box, grid delivery, boiler)\n"
                    "🛡️ ServiceShield - ochrana před nechtěnými změnami\n"
                    "📊 Interaktivní dashboard s grafy\n"
                    "💰 Spot ceny elektřiny z burzy\n"
                    "☀️ Předpověď solární výroby\n\n"
                    "📝 Co budete potřebovat:\n"
                    "• E-mail a heslo k OIG Cloud účtu\n"
                    "• (Volitelně) API klíč pro solární předpověď\n\n"
                    "⏱️ Průvodce zabere ~2-3 minuty.\n"
                    "Pojďme na to!"
                )
            },
        )

    async def async_step_auth(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Krok 2: Přihlašovací údaje."""
        errors = {}

        if user_input is not None:
            # Validace přihlašovacích údajů
            username = user_input.get("username", "").strip()
            password = user_input.get("password", "").strip()

            if not username or "@" not in username:
                errors["username"] = "invalid_email"
            if not password or len(password) < 6:
                errors["password"] = "invalid_password"

            if not errors:
                # Test připojení
                try:
                    from .lib.oig_cloud_client.api.oig_cloud_api import OigCloudApi

                    api = OigCloudApi(username, password, False)
                    if not await api.authenticate():
                        raise Exception("Authentication failed")

                    # Úspěch - uložíme data
                    self._data[CONF_USERNAME] = username
                    self._data[CONF_PASSWORD] = password

                    # Přejdeme na základní nastavení
                    return await self.async_step_basic()

                except Exception as ex:
                    _LOGGER.error(f"Auth failed: {ex}")
                    errors["base"] = "auth_failed"

        # Schema pro přihlášení
        data_schema = vol.Schema(
            {
                vol.Required("username"): str,
                vol.Required("password"): str,
            }
        )

        return self.async_show_form(
            step_id=STEP_AUTH,
            data_schema=data_schema,
            errors=errors,
            description_placeholders={
                "username_help": _get_help_text("username"),
                "password_help": _get_help_text("password"),
            },
        )

    async def async_step_basic(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Krok 3: Základní nastavení."""
        errors = {}

        if user_input is not None:
            polling = user_input.get("polling_interval", DEFAULT_POLLING_INTERVAL)

            # Validace
            if polling < 30 or polling > 3600:
                errors["polling_interval"] = "invalid_interval"

            if not errors:
                self._data["polling_interval"] = polling
                # Přejdeme na výběr funkcí
                return await self.async_step_features()

        data_schema = vol.Schema(
            {
                vol.Required(
                    "polling_interval",
                    default=DEFAULT_POLLING_INTERVAL,
                    description={
                        "suggested_value": DEFAULT_POLLING_INTERVAL,
                    },
                ): vol.All(vol.Coerce(int), vol.Range(min=30, max=3600)),
            }
        )

        return self.async_show_form(
            step_id=STEP_BASIC,
            data_schema=data_schema,
            errors=errors,
            description_placeholders={
                "info": _format_description(
                    "⚙️ Základní nastavení integrace\n\n"
                    "Zde nastavíte, jak často se mají data aktualizovat.\n"
                    "Ostatní funkce nastavíte v dalších krocích."
                ),
                "polling_help": _get_help_text("polling_interval"),
            },
        )

    async def async_step_features(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Krok 4: Výběr funkcí."""
        if user_input is not None:
            # Uložíme výběr funkcí
            self._data["enable_shield"] = user_input.get(
                "enable_shield", DEFAULT_ENABLE_SHIELD
            )
            self._data["enable_solar_forecast"] = user_input.get(
                "enable_solar_forecast", DEFAULT_ENABLE_SOLAR_FORECAST
            )
            self._data["enable_pricing"] = user_input.get(
                "enable_pricing", DEFAULT_ENABLE_PRICING
            )
            self._data["enable_dashboard"] = user_input.get(
                "enable_dashboard", DEFAULT_ENABLE_DASHBOARD
            )

            # Pokud je ServiceShield zapnutý, přejdeme na jeho konfiguraci
            if self._data["enable_shield"]:
                return await self.async_step_shield()

            # Pokud je solární předpověď zapnutá, přejdeme na její konfiguraci
            if self._data["enable_solar_forecast"]:
                return await self.async_step_solar()

            # Pokud jsou tarify zapnuté, přejdeme na jejich konfiguraci
            if self._data["enable_pricing"]:
                return await self.async_step_pricing()

            # Jinak přeskočíme na souhrn
            return await self.async_step_summary()

        data_schema = vol.Schema(
            {
                vol.Optional(
                    "enable_shield",
                    default=DEFAULT_ENABLE_SHIELD,
                    description="🛡️ ServiceShield - ochrana před změnami",
                ): bool,
                vol.Optional(
                    "enable_solar_forecast",
                    default=DEFAULT_ENABLE_SOLAR_FORECAST,
                    description="☀️ Solární předpověď (Forecast.solar)",
                ): bool,
                vol.Optional(
                    "enable_pricing",
                    default=DEFAULT_ENABLE_PRICING,
                    description="💰 Spot ceny elektřiny (OTE)",
                ): bool,
                vol.Optional(
                    "enable_dashboard",
                    default=DEFAULT_ENABLE_DASHBOARD,
                    description="📊 Webový energetický dashboard",
                ): bool,
            }
        )

        return self.async_show_form(
            step_id=STEP_FEATURES,
            data_schema=data_schema,
            description_placeholders={
                "info": _format_description(
                    "✨ Volitelné funkce\n\n"
                    "Vyberte, které funkce chcete použít.\n"
                    "Všechny můžete změnit později v nastavení.\n\n"
                    "💡 Tip: Začněte se základním nastavením,\n"
                    "další funkce můžete přidat postupně."
                ),
                "shield_help": _get_help_text("enable_shield"),
                "solar_help": _get_help_text("enable_solar_forecast"),
                "pricing_help": _get_help_text("enable_pricing"),
                "dashboard_help": _get_help_text("enable_dashboard"),
            },
        )

    async def async_step_shield(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Krok 5: ServiceShield konfigurace (volitelný)."""
        if user_input is not None:
            # Uložíme ServiceShield nastavení
            self._data["shield_timeout"] = user_input.get("shield_timeout", 900)
            self._data["shield_check_interval"] = user_input.get(
                "shield_check_interval", 15
            )

            # Přejdeme na další funkci nebo souhrn
            if self._data.get("enable_solar_forecast"):
                return await self.async_step_solar()
            if self._data.get("enable_pricing"):
                return await self.async_step_pricing()
            return await self.async_step_summary()

        data_schema = vol.Schema(
            {
                vol.Optional(
                    "shield_timeout",
                    default=900,
                    description="Timeout pro dokončení změny (sekundy)",
                ): vol.All(vol.Coerce(int), vol.Range(min=60, max=3600)),
                vol.Optional(
                    "shield_check_interval",
                    default=15,
                    description="Interval kontroly stavu (sekundy)",
                ): vol.All(vol.Coerce(int), vol.Range(min=5, max=60)),
            }
        )

        return self.async_show_form(
            step_id=STEP_SHIELD,
            data_schema=data_schema,
            description_placeholders={
                "info": _format_description(
                    "🛡️ Pokročilé nastavení ServiceShield\n\n"
                    "ServiceShield monitoruje změny a chrání před\n"
                    "nechtěnými stavovými změnami.\n\n"
                    "💡 Výchozí hodnoty jsou vhodné pro většinu případů."
                ),
            },
        )

    async def async_step_solar(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Krok 6: Solární předpověď (volitelný)."""
        errors = {}

        if user_input is not None:
            api_key = user_input.get("solar_api_key", "").strip()
            latitude = user_input.get("latitude")
            longitude = user_input.get("longitude")

            # Validace
            if not api_key:
                errors["solar_api_key"] = "api_key_required"

            if not errors:
                self._data["solar_api_key"] = api_key
                self._data["latitude"] = latitude
                self._data["longitude"] = longitude

                # Přejdeme na další funkci nebo souhrn
                if self._data.get("enable_pricing"):
                    return await self.async_step_pricing()
                return await self.async_step_summary()

        # Získáme výchozí souřadnice z HA
        latitude = self.hass.config.latitude
        longitude = self.hass.config.longitude

        data_schema = vol.Schema(
            {
                vol.Required("solar_api_key"): str,
                vol.Optional(
                    "latitude",
                    default=latitude,
                    description="Zeměpisná šířka",
                ): cv.latitude,
                vol.Optional(
                    "longitude",
                    default=longitude,
                    description="Zeměpisná délka",
                ): cv.longitude,
            }
        )

        return self.async_show_form(
            step_id=STEP_SOLAR,
            data_schema=data_schema,
            errors=errors,
            description_placeholders={
                "info": _format_description(
                    "☀️ Nastavení solární předpovědi\n\n"
                    "Pro předpověď výroby potřebujete API klíč.\n\n"
                    "📝 Jak získat API klíč:\n"
                    "1. Navštivte: https://forecast.solar\n"
                    "2. Vytvořte bezplatný účet\n"
                    "3. Zkopírujte API klíč\n\n"
                    "📍 Souřadnice se použijí z Home Assistant,\n"
                    "    můžete je ale upravit."
                ),
            },
        )

    async def async_step_pricing(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Krok 7: Tarify a ceny (volitelný)."""
        if user_input is not None:
            # Uložíme nastavení tarifů
            self._data["distributor"] = user_input.get("distributor")
            self._data["supplier"] = user_input.get("supplier")

            # Přejdeme na souhrn
            return await self.async_step_summary()

        data_schema = vol.Schema(
            {
                vol.Optional(
                    "distributor",
                    description="Distributor elektřiny (např. ČEZ Distribuce)",
                ): str,
                vol.Optional(
                    "supplier",
                    description="Dodavatel elektřiny (např. ČEZ Prodej)",
                ): str,
            }
        )

        return self.async_show_form(
            step_id=STEP_PRICING,
            data_schema=data_schema,
            description_placeholders={
                "info": _format_description(
                    "💰 Nastavení tarifů a cen\n\n"
                    "Pro přesný výpočet nákladů můžete zadat\n"
                    "svého distributora a dodavatele.\n\n"
                    "💡 Toto je volitelné - spot ceny budou\n"
                    "    fungovat i bez těchto údajů."
                ),
            },
        )

    async def async_step_summary(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Krok 8: Souhrn a dokončení."""
        if user_input is not None:
            # Vytvoříme config entry
            return self.async_create_entry(
                title=f"{DEFAULT_NAME} ({self._data[CONF_USERNAME]})",
                data={
                    CONF_USERNAME: self._data[CONF_USERNAME],
                    CONF_PASSWORD: self._data[CONF_PASSWORD],
                },
                options={
                    "polling_interval": self._data.get(
                        "polling_interval", DEFAULT_POLLING_INTERVAL
                    ),
                    "enable_shield": self._data.get(
                        "enable_shield", DEFAULT_ENABLE_SHIELD
                    ),
                    "enable_solar_forecast": self._data.get(
                        "enable_solar_forecast", DEFAULT_ENABLE_SOLAR_FORECAST
                    ),
                    "enable_pricing": self._data.get(
                        "enable_pricing", DEFAULT_ENABLE_PRICING
                    ),
                    "enable_dashboard": self._data.get(
                        "enable_dashboard", DEFAULT_ENABLE_DASHBOARD
                    ),
                    # ServiceShield
                    "shield_timeout": self._data.get("shield_timeout", 900),
                    "shield_check_interval": self._data.get(
                        "shield_check_interval", 15
                    ),
                    # Solární předpověď
                    "solar_api_key": self._data.get("solar_api_key"),
                    "latitude": self._data.get("latitude"),
                    "longitude": self._data.get("longitude"),
                    # Tarify
                    "distributor": self._data.get("distributor"),
                    "supplier": self._data.get("supplier"),
                },
            )

        # Vytvoříme souhrn konfigurace
        summary_parts = []
        summary_parts.append(f"👤 Účet: {self._data[CONF_USERNAME]}")
        summary_parts.append(
            f"⏱️ Aktualizace: každých {self._data.get('polling_interval', 300)}s"
        )
        summary_parts.append("")
        summary_parts.append("✨ Zapnuté funkce:")

        if self._data.get("enable_shield"):
            summary_parts.append("  🛡️ ServiceShield")
        if self._data.get("enable_solar_forecast"):
            summary_parts.append("  ☀️ Solární předpověď")
        if self._data.get("enable_pricing"):
            summary_parts.append("  💰 Spot ceny")
        if self._data.get("enable_dashboard"):
            summary_parts.append("  📊 Webový dashboard")

        summary_parts.append("")
        summary_parts.append("📋 Další kroky:")
        summary_parts.append("  1. Integrace se připojí k OIG Cloud")
        summary_parts.append("  2. Entity se objeví v zařízení 'OIG Box'")
        if self._data.get("enable_dashboard"):
            summary_parts.append("  3. Dashboard: Boční panel → OIG Dashboard")
        summary_parts.append("")
        summary_parts.append("💡 Všechno můžete změnit později v nastavení!")

        summary = "\n".join(summary_parts)

        return self.async_show_form(
            step_id=STEP_SUMMARY,
            data_schema=vol.Schema({}),
            description_placeholders={
                "summary": summary,
            },
        )

    @staticmethod
    @callback
    def async_get_options_flow(
        config_entry: config_entries.ConfigEntry,
    ) -> OigCloudOptionsFlow:
        """Vytvoří options flow."""
        return OigCloudOptionsFlow(config_entry)


# ============================================================================
# OPTIONS FLOW
# ============================================================================


class OigCloudOptionsFlow(config_entries.OptionsFlow):
    """Options flow pro změnu nastavení."""

    def __init__(self, config_entry: config_entries.ConfigEntry):
        """Inicializace options flow."""
        self.config_entry = config_entry

    async def async_step_init(
        self, user_input: Optional[Dict[str, Any]] = None
    ) -> FlowResult:
        """Hlavní menu pro změnu nastavení."""
        if user_input is not None:
            # Uložíme změny
            return self.async_create_entry(title="", data=user_input)

        current_options = self.config_entry.options

        data_schema = vol.Schema(
            {
                vol.Optional(
                    "polling_interval",
                    default=current_options.get("polling_interval", 300),
                    description="Interval aktualizace (sekundy)",
                ): vol.All(vol.Coerce(int), vol.Range(min=30, max=3600)),
                vol.Optional(
                    "enable_shield",
                    default=current_options.get("enable_shield", True),
                    description="🛡️ ServiceShield",
                ): bool,
                vol.Optional(
                    "enable_solar_forecast",
                    default=current_options.get("enable_solar_forecast", False),
                    description="☀️ Solární předpověď",
                ): bool,
                vol.Optional(
                    "enable_pricing",
                    default=current_options.get("enable_pricing", False),
                    description="💰 Spot ceny",
                ): bool,
                vol.Optional(
                    "enable_chmu_warnings",
                    default=current_options.get("enable_chmu_warnings", False),
                    description="🌦️ Varování ČHMÚ",
                ): bool,
                vol.Optional(
                    "enable_dashboard",
                    default=current_options.get("enable_dashboard", True),
                    description="📊 Webový dashboard",
                ): bool,
            }
        )

        return self.async_show_form(
            step_id="init",
            data_schema=data_schema,
            description_placeholders={
                "info": "⚙️ Změna nastavení integrace\n\n"
                "Po uložení se integrace restartuje."
            },
        )
